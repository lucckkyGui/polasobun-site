# Dwustopniowe ładowanie siatki

Data: 2026-08-27
Status: zatwierdzony projekt, przed implementacją

## Problem

Siatka na stronie głównej ma 275 kafli. Na wolnym łączu ładuje się długo,
a przewijanie przez 52 ekrany wyprzedza sieć i zostawia puste miejsca.

Przyczyna źródłowa jest ustalona pomiarem, nie domysłem (sesja debugowania
2026-08-26): **LCP jest ograniczone liczbą obrotów sieci, nie wagą plików.**
Profil Slow 4G to 1,6 Mb/s przy zmierzonym **576 ms RTT**. Przy takim
opóźnieniu okno TCP rośnie przez slow start ~14 → 28 → 56 → 112 kB, więc
obraz LCP o wadze 118 kB potrzebuje ~4 obrotów ≈ 2,3 s. Zmierzono 2604 ms.
Gdyby wiązało pasmo, zszedłby w 590 ms.

Cztery próby potwierdziły, że cięcie bajtów nie działa:

| Zmiana | Bajty | LCP |
|---|---|---|
| — (baseline) | 607 kB | 3564 ms |
| `EAGER_COUNT` 4→2 | 607 kB | 3504 ms |
| usunięte wszystkie fonty | 527 kB | 3716 ms |
| kafel 0 mniejszy o połowę | 548 kB | 3320 ms |
| kafle 2–4 bez obrazów | 477 kB | 3508 ms |

Zmniejszenie obrazu o połowę ścięło jeden obrót, nie połowę czasu — stąd
250 ms zamiast 1300 ms. To podpis ograniczenia opóźnieniem.

Wniosek: żeby coś zyskać, pierwszy kadr musi **zmieścić się w mniejszej
liczbie obrotów**, a nie po prostu ważyć mniej.

## Cele

1. **Przewijanie** — zero pustych kafli przy szybkim przewijaniu.
2. **LCP** — poniżej 2000 ms na stanowisku pomiarowym.

Cele odrzucone świadomie: „wrażenie szybkości" jako miara (odrzucone przez
klienta na rzecz mierzalnego LCP) oraz zużycie danych jako cel nadrzędny.

## Decyzje klienta

- Zdjęcie **może** pojawić się najpierw miękkie i doostrzyć się po chwili,
  w całej siatce, także w kaflu otwierającym.
- Wersja ostra dochodzi **dopiero po zwolnieniu przewijania**, nie
  bezwarunkowo po wejściu kafla w ekran.

## Rozważone i odrzucone

**Progresywny JPEG.** Maluje się zgrubnie od pierwszych bajtów, bez
dodatkowych żądań. Odrzucony: LCP odpala się dopiero po pełnym
zdekodowaniu, więc metryka nie drgnie, a WebP nie zna trybu progresywnego,
więc trzeba by wrócić do JPEG-a i oddać ~25% kompresji. Rozwiązuje
wrażenie szybkości, które nie jest celem.

**Obrazowy CDN** (Vercel Image Optimization, Cloudinary). Rozmiary na
żądanie, bez rozdymania builda. Odrzucony: nie rusza przyczyny — pojedyncze
zdjęcie nadal potrzebuje tylu samo obrotów — a dokłada opłatę za
transformacje i zależność od zewnętrznej usługi.

**Gotowy framework do galerii.** Nie istnieje taki, który rozwiązuje
ograniczenie obrotami. PhotoSwipe i lightGallery robią lightbox.
Wirtualizacja (react-virtuoso) ratuje DOM, nie sieć. Wzorzec „lekki kadr
najpierw, pełny potem" to dokładnie to, co robią `placeholder="blur"`
w Next.js, dawne `gatsby-image` i Nuxt Image — czyli budujemy rzecz
standardową, tylko ręcznie.

## Zakres

Projekt dotyczy **wyłącznie siatki na stronie głównej** (275 kafli).

Poza zakresem, bez zmian:
- strony projektów `/work/[slug]` — tam zdjęcia zostają jednopoziomowe,
  bo nie ma tam ani problemu z przewijaniem, ani kandydata na LCP
  konkurującego z dziesięcioma innymi żądaniami,
- obraz animacji wejścia (`INTRO`) i sama animacja,
- fonty, arkusz stylów, `inlineStylesheets`,
- dobór i kolejność zdjęć w siatce.

## Architektura

### Dwa poziomy jakości

Każde zdjęcie w siatce dostaje dwa warianty zamiast obecnej pary
„WebP + fallback JPEG":

| Poziom | Rozmiar | Waga | Rola |
|---|---|---|---|
| lekki | 400×500 WebP | ~15 kB | leci w HTML, maluje się w 1–2 obrotach |
| ostry | 1000×1250 WebP | ~95 kB | dochodzi po zwolnieniu przewijania |

`<Picture>` ustępuje miejsca zwykłemu `<img src={lekki} data-pelny={ostry}>`.

### Usunięcie martwych fallbacków JPEG

Obecny build generuje **1054 pliki JPEG o łącznej wadze 339 MB** obok 994
WebP. Istnieją dla przeglądarek bez obsługi WebP, czyli sprzed 2020 roku.
Żadna używana dziś przeglądarka ich nie pobiera. Ich usunięcie płaci za
nowy poziom lekki z nawiązką.

Bilans plików w `dist`: 994 WebP + 1054 JPEG = 2048 dziś. Po zmianie
znika 1054 JPEG-ów, dochodzi 275 wariantów lekkich (po jednym na kafel
siatki) — czyli **około 1270**. Szacunek, do potwierdzenia po pierwszym
buildzie. `dist/` jest w `.gitignore`, więc repozytorium nie rośnie.

### Podział odpowiedzialności

Logika ładowania wyprowadza się z `Gallery.tsx` do własnego modułu
`useProgressiveTiles`. Dziś `Gallery.tsx` trzyma naraz stan filtrów
i obserwator doładowywania — dwie niezwiązane odpowiedzialności w jednym
pliku. Po zmianie `Gallery` odpowiada wyłącznie za filtry, moduł wyłącznie
za obrazy.

Obecny obserwator „lazy → eager" zostaje **zastąpiony**, nie dołożony obok.
Dwa równoległe mechanizmy ładowania już raz kosztowały godzinę diagnozy,
w której nie dało się powiedzieć, który co robi.

## Przepływ

1. Obserwator zaznacza kafle w widoku i w zasięgu jednego ekranu
   (`rootMargin: '100% 0px'`).
2. Detektor bezruchu: brak zdarzenia `scroll` przez 150 ms oznacza, że
   użytkownik się zatrzymał. Wartość startowa, do dostrojenia pomiarem —
   za krótka wywoła doostrzanie w trakcie przewijania, za długa opóźni je
   po zatrzymaniu.
3. Wtedy, dla zaznaczonych kafli od najbliższego: pobierz wersję ostrą
   przez `new Image()`, poczekaj na `decode()`, **dopiero potem** podmień
   `src`.
4. Kafel oznaczony jako podniesiony nigdy nie wraca do kolejki.

Czekanie na `decode()` jest konieczne: podmiana `src` bez tego daje
mignięcie pustym miejscem. Oba warianty mają identyczne proporcje 4:5,
a wymiary narzuca CSS, więc CLS zostaje zerowy.

Obserwujemy **kafel, nie obraz** — kafle od 13. w górę mają
`content-visibility: auto`, więc ich zawartość nie jest renderowana i obraz
w środku nie ma własnego boxu. Kafel ma go zawsze.

## Pierwszy ekran

Pierwsze **4 kafle** dostają wersję lekką z `loading="eager"` — przy 15 kB
za sztukę to ~60 kB, wobec ~310 kB, które te same cztery kafle ważą dziś.
Kafel otwierający dodatkowo `fetchpriority="high"`.

Dalsze kafle idą jako `loading="lazy"`. Przeglądarka i tak pobiera je do
~1250 px poniżej ekranu niezależnie od atrybutu (zmierzone 2026-08-26) —
ale przy 15 kB za sztukę przestaje to być problemem, bo o to właśnie
chodzi w tym projekcie.

## Eksperymenty warunkowe

Obie rzeczy wchodzą do projektu **tylko jeśli pomiar je potwierdzi**.

### E1 — AVIF dla poziomu lekkiego

AVIF został kiedyś odrzucony, bo zżerał ~90% czasu builda, ale to była wina
dużych plików. Kadr 400×500 koduje się szybko, a AVIF potrafi zejść z 15 kB
do ~8 kB, czyli jeden obrót zamiast dwóch.

**Kryterium przyjęcia:** mniejsze pliki **i** czas builda nie dłuższy niż
dziś. Jeśli którykolwiek warunek padnie — zostaje WebP.

### E2 — wstrzyknięcie pierwszego kafla w HTML jako `data:`

Zdjęłoby z pierwszego kafla cały obrót, tak jak `inlineStylesheets: 'always'`
zdjęło go z arkusza stylów. Ale base64 puchnie o 33% i nie kompresuje się
dalej: 15 kB obrazu to ~20 kB w dokumencie, który dziś waży 16 kB po gzipie
i mieści się w ~2 obrotach. Po dołożeniu może potrzebować trzech — czyli
oddalibyśmy FCP, żeby kupić LCP.

**Kryterium przyjęcia:** LCP w dół **i** FCP nie w górę. Jeśli którykolwiek
warunek padnie — E2 wypada z projektu.

## Ryzyka

### Podmiana może wystawić nowy kandydat na LCP

Główne ryzyko całego pomysłu. Przewijanie **nie** zamyka pomiaru LCP (robi
to dopiero pierwsze kliknięcie lub klawisz), więc gdyby doostrzenie
w 3. sekundzie liczyło się jako nowe malowanie, LCP wskoczyłoby z powrotem
na ~3 s i projekt nie dałby nic.

Oczekiwanie: przeglądarka zgłasza nowego kandydata tylko wtedy, gdy jest
**większy**, a oba warianty mają identyczny rozmiar na ekranie.

To jest oczekiwanie, nie wiedza. **Sprawdzane jako pierwszy krok
implementacji, przed zbudowaniem reszty.** Jeśli okaże się fałszywe —
wracamy do klienta z decyzją, nie z obejściem.

### Próg entropii

Chrome ignoruje przy LCP obrazy poniżej 0,05 bita na piksel, żeby nikt nie
oszukiwał metryki zaślepką. Nasz lekki kadr to ~0,6 bita na piksel
(15 kB × 8 ÷ 200 000 px) — dwanaście razy powyżej progu. Ryzyko niskie,
odnotowane, bo to typowa pułapka przy LQIP.

### Dobre łącze zobaczy miękki kadr

Dziś ktoś na biurowym wi-fi dostaje ostre zdjęcie po ~1,1 s. Po zmianie
dostanie miękkie po ~0,6 s i ostre po ~1,5 s. Metryka zyska, ale klient
fotografki przez sekundę zobaczy jej pracę zmiękczoną. Świadomy koszt
decyzji „tak, w całej siatce".

### Transfer

Rośnie o ~16% dla kafli faktycznie oglądanych — 15 kB lekkiego to odpad,
gdy dojdzie ostry. Kto przewija na wylot, pobiera znacznie mniej niż dziś.

### Brak JS-u

Siatka działa w całości, zostaje miękka. Tyle samo sprawności bez skryptów,
co obecnie.

## Kryteria sukcesu

Stanowisko pomiarowe (zbudowane i powtarzalne): podgląd lokalny, Slow 4G
(576 ms RTT), 4× spowolnienie procesora, viewport 412×915, zimny cache
przeglądarki, wyczyszczone `sessionStorage`, 3 próby, mediana.

| Miara | Dziś | Cel |
|---|---|---|
| LCP (stanowisko) | 3564 ms | < 2000 ms |
| Puste kafle na 10 ekranach szybkiego przewijania | 1 | 0 |
| CLS | 0,00 | bez zmian |
| LCP na Fast 4G (produkcja) | ~1104 ms | nie gorzej |
| Czas builda | 1m24s na zimno | nie gorzej |

Po scaleniu ten sam pomiar na produkcji: ciepły CDN, zimny cache
przeglądarki, prawdziwe pierwsze wejście (wyczyszczone `sessionStorage`,
żeby intro grało). Metodyka musi się zgadzać z tą z 2026-08-26, inaczej
liczb nie da się porównać.

## Uwaga metodyczna

Pomiary produkcyjne sprzed 2026-08-26 były robione bez kontroli cache'u
przeglądarki i mierzyły **powrót na stronę, nie pierwsze wejście**. Były
przez to zbyt optymistyczne (LCP ~1012 ms wobec ~4066 ms przy zimnym
cache'u). Każde porównanie „przed/po" musi używać metodyki opisanej wyżej.
