# polasobun.com — portfolio fotograficzne

## Stack
Astro 7 (static), React islands, Tailwind 4, Motion. Deploy: Cloudflare Pages.
Node >= 22.12.0 (wymagane przez Astro 7).

typescript jest przypięty do ^6 CELOWO. `astro check` nie działa
z natywnym kompilatorem TypeScript 7 — nie wystawia programmatic API,
którego wymaga (withastro/roadmap#1321). Nie bumpować bez sprawdzenia,
że check nadal przechodzi; inaczej build wywali się na starcie.

## Wydajność — co zmierzone i dlaczego tak
Warunki pomiaru: Slow 4G + 4x dławienie CPU, viewport 412x915.

content-visibility: auto na kaflach OD 13. w górę. Pierwsza dwunastka jest
wyłączona — to ona jest nad zgięciem, wśród niej element LCP, i to ona ma
stagger wejścia. contain-intrinsic-size z prefiksem `auto`, więc
przeglądarka zapamiętuje rzeczywisty rozmiar; wysokość dokumentu koryguje
się o ~175 px na 172 800 (0,1%), CLS pozostaje 0.00.

fetchpriority="high" na pierwszym kaflu. Narzędzie oznaczało jego brak
jako FAILED. Działa: obraz LCP kończy się pierwszy mimo równego startu
z sąsiadami.

EAGER_COUNT = 4. Przy JEDNEJ kolumnie na telefonie widac okolo dwoch
kafli, wiec osemka dobrana pod dwie kolumny byla tu czystym nadmiarem.
Pierwszy kafel ma fetchpriority="high" i mimo rownego startu wygrywa
kolejke.

JEDNA KOLUMNA NA TELEFONIE — decyzja klientki, nie wynik pomiaru.
Probowalismy dwoch (kafel 645 px urzadzenia, 87 ekranow zamiast 186)
i zostalo to cofniete swiadomie. Nie wracaj do dwoch bez pytania.

OSTRY.width = 1000 px, OSTRY.height = 1250 (dawniej TILE_WIDTH/TILE_HEIGHT —
zmienne przemianowane przy dwustopniowym ładowaniu, patrz sekcja niżej;
to teraz jeden z dwóch poziomów jakości kafla, nie jedyny wariant).
To kompromis, nie dopasowanie:
  1300 px   skalowanie 0,99x — piksel w piksel, ale start 4381 kB
            przy 23 obrazach; na Slow 4G LCP 1012 ms
  1000 px   skalowanie 1,29x W GORE, okolo 40% mniej bajtow
  800 px    skalowanie 1,61x — zdjecia widocznie miekna, NIE schodzic
Kafel na iPhone 16 Pro Max (430 pt, dpr 3) ma 1290 px urzadzenia i to
wzgledem tej liczby liczy sie kazde z powyzszych skalowan.

DOLADOWYWANIE — mechanizm zmienił się od podstaw, patrz sekcja
„Dwustopniowe ładowanie siatki" niżej. Stary opis (obserwator w
Gallery.tsx przełączający kafle w zasięgu półtora ekranu na
loading="eager") jest NIEAKTUALNY: ten obserwator już nie istnieje,
zastąpił go `useProgressiveTiles.ts`, który nie rusza atrybutu loading
w ogóle — podmienia `src` z wariantu lekkiego na ostry.

PRELOAD FONTÓW BYŁ PRÓBOWANY I ŚWIADOMIE COFNIĘTY. Nie dodawaj go
ponownie bez pomiaru. Zmierzona kolejność żądań z preloadem:
  Satoshi-Medium.woff2   start  807 ms
  Satoshi-Bold.woff2     start  810 ms
  01.webp (element LCP)  start  812 ms, koniec 2525 ms
Fonty wchodziły PRZED obrazem LCP i zjadały 53 kB pasma. Po usunięciu
preloadu i zejściu z EAGER_COUNT do 2:
  01.webp (element LCP)  start  897 ms, koniec 1964 ms   (-561 ms)
  fonty                  start 1672 ms, czyli już po nim
font-display: swap i tak pokazuje tekst od razu w foncie zastępczym.
Przy portfolio fotograficznym obraz wygrywa z tekstem.

inlineStylesheets: 'always' w astro.config. Arkusz ma ~12 kB, próg Astro
to 4 kB, więc bez tego był osobnym blokującym żądaniem. Po wstrzyknięciu:
zero żądań CSS, FCP 668-1028 ms zamiast ~1557 ms szacowanych przez
narzędzie. Koszt: 18 stron niesie własną kopię, HTML łącznie 65 -> 126 kB
po gzipie, index.html 13 -> 17 kB.

Lokalnie wyglądało to na wymianę, nie wygraną: wstrzyknięty CSS parsuje
@font-face natychmiast, więc fonty startowały w 630-970 ms zamiast
1672 ms i odbierały pasmo obrazowi LCP. ZWERYFIKOWANE NA PRODUKCJI —
NIE REPRODUKUJE SIĘ. Tam fonty startują w 660-663 ms, czyli PO obrazach
(634-635 ms), i niczego im nie odbierają. Konkurencja o pasmo była
artefaktem lokalnego serwera (HTTP/1.1, bez kompresji, jeden wątek).
Zostaje włączone.

Na stronie głównej ŻADEN widoczny tekst nie używa wagi 400, a
Satoshi-Regular.woff2 i tak się pobiera — sprawdzone, wszystkie elementy
o tej wadze to <style> i <script>. Nie udało się tego wyeliminować.
Waga 400 jest realnie używana na stronach projektów (wartości faktów),
więc deklaracji nie usuwaj.

## Dwustopniowe ładowanie siatki
Zmierzone na stanowisku Slow 4G (RTT 576 ms), 412x915, CPU 4x, mediana
z 3 prób: LCP 3564 ms -> 1232 ms (2,9x), puste kafle na 10 ekranach
przewijania 1 -> 0, CLS bez zmian (0,00). Oba cele projektu osiągnięte.
Kod: src/pages/index.astro (stałe LEKKI/OSTRY, dwa warianty per kafel),
src/components/useProgressiveTiles.ts (podnoszenie do pełnej jakości).

LCP JEST OGRANICZONE LICZBĄ OBROTÓW SIECI, NIE WAGĄ PLIKÓW. Przy RTT
576 ms okno TCP rośnie przez slow start ~14 -> 28 -> 56 -> 112 kB, więc
obraz LCP potrzebuje kilku obrotów niezależnie od tego, jak bardzo go
przytniesz. Cztery próby cięcia bajtów jednego wariantu to potwierdziły:

  zmiana                        bajty    LCP
  — (baseline)                  607 kB   3564 ms
  EAGER_COUNT 4→2                607 kB   3504 ms
  usunięte wszystkie fonty      527 kB   3716 ms
  kafel 0 mniejszy o połowę     548 kB   3320 ms
  kafle 2–4 bez obrazów         477 kB   3508 ms

Zmniejszenie obrazu o połowę ścięło jeden obrót (250 ms), nie połowę
czasu — podpis ograniczenia opóźnieniem, nie pasmem. Stąd dwa poziomy
jakości zamiast dalszego cięcia bajtów jednego wariantu.

DWA POZIOMY JAKOŚCI KAFLA:
  lekki   440×550 WebP, mediana z 275 kafli 24,3 kB (kafel LCP 26,2 kB)
          — leci w HTML, maluje się w 1–2 obrotach
  ostry   1000×1250 WebP, kafel LCP 117,9 kB — dochodzi po zwolnieniu
          przewijania, podmieniany przez useProgressiveTiles.ts

DLACZEGO KADR LEKKI MA 440 PX, A NIE 400 — najważniejszy wpis w tej
sekcji. LCP raportuje MNIEJSZY z dwóch obszarów: naturalny albo
wyświetlany. Kafel na stanowisku zajmuje 412 px (430 px na iPhonie).
Kadr lekki 400 px liczył się jako naturalny 400×500 = 200 000, a kadr
ostry jako wyświetlany 412×515 = 212 180 — WIĘKSZY. Podmiana była przez
to większym malowaniem i wystawiała nowego, późnego kandydata LCP:
zmierzone 6288 ms zamiast 3564 ms. Po zmianie na 440 px jest jeden
rozmiar (212 180) i podmiana nie wystawia kandydata.
NIE ZMNIEJSZAJ kadru lekkiego poniżej 440 px bez sprawdzenia, że kafel
nigdzie w layoucie nie jest szerszy niż to.

OBSERWATOR (useProgressiveTiles) STARTUJE PO `load`. Wcześniejszy start
konkurowałby o pasmo z pierwszym ekranem i zjadłby cały zysk na LCP —
dokładnie to, po co mechanizm powstał.

PODMIANA CZEKA NA `decode()`. Bez tego przeglądarka najpierw czyści
kafel, potem maluje nowy obraz — mignięcie pustym miejscem dokładnie
tam, gdzie w tym momencie patrzy użytkownik.

`<Picture>` DOKŁADA FALLBACK W FORMACIE ŹRÓDŁOWYM. `formats=['webp']`
budował `<source webp>` + `<img>` w JPEG jako zapas dla przeglądarek
sprzed 2020 roku — stąd 1054 martwe pliki JPEG ważące 339 MB w buildzie,
których żadna dzisiejsza przeglądarka nie pobierała. `<Image
format="webp">` / `getImage({format:'webp'})` fallbacku nie tworzy —
`<Picture>` nie jest już nigdzie w kodzie (patrz sekcja AVIF niżej).
Bilans dist/_astro: 994 WebP + 1054 JPEG (~554 MB) -> 1331 WebP, 0 JPEG
(232 MB, suma bajtów plików; `du -sh` na tym samym katalogu raportuje
266 MB — różnica to rozmiar bloków na dysku, nie rozjazd w danych).
Wcześniej zapisane „227 MB" pochodziło sprzed zmiany kadru lekkiego
z 400 na 440 px (patrz sekcja niżej) i jest nieaktualne.

WIDTHS+SIZES NIE DA SIĘ POŁĄCZYĆ Z KADROWANIEM 4:5 PO STRONIE SERWERA.
Wiedza odzyskana z komentarza usuniętego przy przejściu z TILE_WIDTH na
LEKKI/OSTRY — zapisana tu, żeby nikt nie wchodził w tę ślepą uliczkę
drugi raz. Responsywny srcset (`widths` + `sizes`) wyklucza się
z przycinaniem: `aspectRatio` nie istnieje w tej wersji Astro, a bez
jawnych `width` + `height` serwis obrazów nie przytnie do 4:5 — poziome
źródła trzeba by rozciągać CSS-em. Jedna szerokość na wariant jest
jedynym wyjściem, dopóki nie zmieni się to ograniczenie Astro.

WYNIK BRAMKI RYZYKA (task 0) I BŁĄD JEJ SONDY. Werdykt: PRZECHODZI —
podmiana `src` na już wyrenderowanym `<img>` po `decode()` nie wystawia
nowego kandydata LCP. Ale metoda sondy, która dała ten werdykt, miała
błąd: podmieniała obraz na TEN SAM plik z dopisanym cache-bustem
w query stringu, czyli na obraz RÓWNY rozmiarem naturalnym oryginałowi.
Rozmiar się nie zmieniał, więc sonda w zasadzie nie mogła wykryć
problemu, który miała wykryć — werdykt był fałszywym przejściem. Realny
problem (mniejszy kadr startowy -> większy kandydat LCP przy podmianie)
ujawnił się dopiero później, przy kadrze 400 px (patrz wyżej).
PRZESTROGA: w takiej sondzie wariant startowy MUSI mieć mniejszy
naturalny rozmiar niż wariant docelowy, inaczej test niczego nie
sprawdza.

METODYKA POMIARU: ciepły CDN (rozgrzany osobnym przebiegiem przed
pomiarem), zimny cache przeglądarki, wyczyszczone `sessionStorage`.
Pomiary sprzed 2026-08-26 mierzyły POWRÓT na stronę, nie pierwsze
wejście, i były przez to zbyt optymistyczne — nie porównuj ich wprost
z nowszymi liczbami.

PUŁAPKA: `performance.getEntriesByType('largest-contentful-paint')`
zwraca PUSTĄ TABLICĘ Z DEFINICJI, w każdej przeglądarce, zawsze — Chrome
nie wystawia wpisów LCP tą drogą. Jedyna droga to
`PerformanceObserver({type: 'largest-contentful-paint', buffered: true})`.
Pusta tablica z `getEntriesByType` NIE jest dowodem, że środowisko nie
raportuje LCP — ten błąd kosztował jeden pełny przebieg bramki ryzyka
(task 0, pierwszy przebieg).

CZAS BUILDA NA ZIMNO — PRAWDZIWA WARTOŚĆ ODNIESIENIA. Zmierzone
2026-08-27, `/usr/bin/time -p`, `dist` i `node_modules/.astro` usunięte,
bez innych obciążeń: 6m48s przed projektem (kod c37f003), 6m10s po.
Build jest 38 s szybszy — nie prawie 5x szybszy, jak sugerowała stara
wartość „1m24s" zapisana wcześniej w tym pliku (nieodtwarzalna, patrz
sekcja AVIF). Dominuje dekodowanie 202 MB źródeł, nie liczba wariantów.

EKSPERYMENTY WARUNKOWE — oba odrzucone:
  E1 AVIF dla kadru lekkiego: ODRZUCONY. Build na zimno przekroczył
  10 minut wobec ~6-7 minut dla WebP — kryterium czasu builda padło
  jednoznacznie.
  E2 wstrzyknięcie pierwszego kafla jako `data:` URI w HTML: ODRZUCONY.
  Po zrównaniu jakości kodowania (26,2 kB, identyczne bajt po bajcie
  z wariantem z getImage): LCP 808 ms (poprawa, kryterium spełnione),
  ale FCP 708 ms wobec 680 ms — kryterium „FCP nie wyższa" padło o 28 ms.
  HTML po gzipie rósł z 16 097 B do 44 112 B (+175%). Cofnięte przez
  `git revert` (7bea07e).
  Pierwszy przebieg E2 dał fałszywe „przyjęty", bo wstrzykiwany kadr był
  zakodowany jawnym quality:62 (17,4 kB) zamiast domyślną jakością
  reszty siatki (26,2 kB) — eksperyment zmieniał wtedy dwie zmienne
  naraz, a kafel otwierający portfolio wypadłby gorszej jakości niż
  sąsiedzi.

WNIOSEK PROCESOWY: liczba podana przez wykonawcę i „potwierdzona" przez
recenzenta na podstawie TEGO SAMEGO raportu nie jest zweryfikowana — jest
przepisana. W tym projekcie zdarzyło się to dwa razy: „~15 kB" kadr
lekki w commicie 810d9bd (było 21 kB przy 400 px, 24,3 kB przy 440 px)
i „build 1m22s" w raporcie zadania 1. Weryfikuje dopiero niezależny
pomiar, nie drugie czytanie tego samego liczbowego zapisu.

## Pomiary produkcyjne — stan końcowy
Zmierzone na polasobun-site.vercel.app po zmergowaniu wszystkich zmian.
Baseline = ten sam pomiar przed jakąkolwiek optymalizacją.

Warunki A — mobile 412x915, Slow 4G, 4x CPU (te same co baseline):

  metryka                    baseline        teraz
  LCP, pierwsze wejście      1004 ms         860 / 680 ms
  LCP, powtórne wejście      1364 ms         704 ms
  FCP                        —               860 / 680 / 704 ms
  CLS                        0.00            0.00
  żądań CSS                  1 blokujące     0
  węzłów w układzie          1241            324
  obraz intro                525 kB          128 kB
  czas trwania intro         4400 ms         2200 ms

Warunki B — iPhone 16 Pro Max 430x932 dpr 3, Fast 4G, 4x CPU
(HISTORYCZNE — zmierzone przy układzie DWUKOLUMNOWYM, cofniętym na jedną
kolumnę w commicie 0a9ac49. Dziś na telefonie jest jedna kolumna, więc
wiersze „kolumny", „kafli na ekranie" i „ekranów do przewinięcia" NIE
opisują obecnego stanu. Zostawione dla śladu decyzji, nie jako
obowiązujący opis architektury):

  metryka                    na starcie      wtedy (2 kolumny)
  LCP                        —               572 ms
  CLS                        —               0.00
  kolumny                    1               2 x 215 px
  skalowanie obrazu          1,61x W GÓRĘ    0,81x w dół
  kafli na ekranie           2               8
  ekranów do przewinięcia    186             16
  kafli w DOM                374             280
  kafli w widoku ALL         359             101

Test przewijania, 10 ekranów po kolei, liczba pustych kafli w widoku:
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0
Ani jednego, przy przewijaniu skokami po całym ekranie — ostrzej niż
realnym przesuwaniem palcem. Przed round-robinem i limitem wychodziło
0,0,1,0,0,0,0,0 przy 8 ekranach.

Skrócenie ze 186 ekranów na 16 było wtedy głównie zasługą ograniczenia
widoku ALL do wybranych kadrów, nie samych optymalizacji technicznych:
ALL pokazywało 101 kafli zamiast 359. (W dzisiejszym kodzie nie ma
stałej o nazwie MAX_W_ALL — sprawdzone: `grep -rn 'MAX_W_ALL' src/` nic
nie zwraca. Ograniczenie działa dziś inaczej: ALL renderuje sumę pól
`featured` z projects.json, bez osobnego limitu, co daje 100 kafli —
patrz sekcja „Kolejność zdjęć w siatce" niżej.)

Spadek węzłów wymagających układu z 1241 na 324 to bezpośredni dowód,
że content-visibility działa — to własność dokumentu, nie pomiaru.
FCP równa się LCP we wszystkich próbkach: strona maluje się raz, od razu
z treścią, bez pośredniego stanu „sam tekst".

ZIMNY CACHE CDN — NIE MIERZ ZARAZ PO DEPLOYU. Pierwsza próbka na świeżo
zbudowanym deploymencie dała LCP 6532 ms. Druga na tym samym adresie
952 ms, trzecia 680 ms. Przy 359 zdjęciach krawędź musi je najpierw
ściągnąć z origin, a pierwszy odwiedzający po każdym wdrożeniu ten koszt
realnie płaci. Zanim zmierzysz: załaduj stronę raz na odstrzał, dopiero
potem zbieraj próbki. Inaczej wyciągniesz wniosek o regresji, której
nie ma — mnie się to zdarzyło.

OSTRZEŻENIE METODOLOGICZNE: lokalny `npm run preview` to hałaśliwe
stanowisko — dla tej samej wersji render delay wychodził 57, 90 i 386 ms,
a LCP 1293 i 2409 ms. Nie przypisuj zmian pojedynczym przebiegom.
Wiarygodna jest kolejność i czasy żądań (waterfall), bo są
deterministyczne. LCP mierz na produkcji, gdzie jest CDN, h2 i brotli.

PUŁAPKA: elementem LCP jest pierwszy kafel siatki, który przy pierwszym
wejściu jest ZASŁONIĘTY kurtyną intro przez 4,4 s. Chrome nie sprawdza
przesłonięcia, więc metryka pokazuje ~1 s, a człowiek widzi zdjęcia po
czterech i pół. Nie optymalizuj pod metrykę, której nikt nie ogląda.

## Pomiar wydajności
@vercel/speed-insights wpięty w Base.astro, więc siedzi na wszystkich
18 stronach. Świadomy wyjątek od reguły „zero zależności".

Zbiera dane wyłącznie na Vercelu — a skoro produkcja tam stoi, jest to
bez znaczenia. Na localhoście skrypt daje 404 na
/_vercel/speed-insights/script.js i to jest normalne, nie błąd.

## Deploy
PRODUKCJA STOI NA VERCELU. Cloudflare Pages zostało odłożone decyzją
właściciela projektu — nie planuj pod nie niczego, dopóki nie wróci temat.
Praktyczna konsekwencja: @vercel/speed-insights działa i zbiera dane,
więc nie ma powodu go usuwać.

Projekt `polasobun-site` podpięty do repo lucckkyGui/polasobun-site,
root directory `polasobun`, production branch `main`. Podgląd jest
publiczny (Vercel Authentication wyłączone) — świadoma decyzja, żeby dało
się wysłać link klientce.

Root directory MUSI zostać `polasobun` — projekt Astro siedzi
w podkatalogu, obok starej strony statycznej w roocie repo.

## Twarde reguły
- Animujemy WYŁĄCZNIE transform i opacity. Nigdy width/height/blur/box-shadow/background.
- Zdjęcia zawsze przez astro:assets, nigdy surowy <img src>.
- Zdjęcia dynamiczne (ze slugu) — WYŁĄCZNIE przez import.meta.glob z eager: true.
  Ścieżka jako string NIE zostanie zoptymalizowana i wysypie się na produkcji.
- Każda animacja respektuje prefers-reduced-motion. Bezpiecznik w global.css
  nadpisuje TYLKO transition-property, nigdy transition-duration: domyślne
  transition-duration to 0s, więc elementy bez własnych przejść pozostają
  nietknięte. Nadpisanie duration dokładałoby przejścia tam, gdzie ich nie
  było. Ruch znika, przejścia opacity i koloru zostają.
- Zero zależności poza: astro, react, tailwind, motion, @vercel/speed-insights.
  Pytaj przed dodaniem czegokolwiek.
- Brak zaokrągleń, cieni i gradientów.
- Animacja wejścia jest zaakceptowana i wdrożona (patrz niżej). Poza nią
  nadal zero animacji bez wyraźnej zgody.
- Zero hex-ów w komponentach. Wszystkie wartości z tokenów.

## Tailwind 4
Konfiguracja przez @theme w src/styles/global.css.
Nie twórz tailwind.config.* — v4 go nie używa.

Tokeny z przestrzenią nazw generują utility:
--color-*, --font-*, --text-*, --tracking-*, --leading-*, --spacing-*,
--ease-*, --perspective-*, --aspect-*.

Czasy trwania NIE mają przestrzeni nazw w Tailwind 4. Leżą jako zwykłe
zmienne CSS w :root i używa się ich przez arbitrary value:
  duration-[var(--duration-fast)]   150ms
  duration-[var(--duration-base)]   250ms
  duration-[var(--duration-flip)]   350ms

Easingi mają własne nazwy, żeby nie nadpisywać wbudowanych:
  ease-enter  wejścia    cubic-bezier(0.16, 1, 0.3, 1)
  ease-exit   wyjścia    cubic-bezier(0.7, 0, 0.84, 0)
  ease-move   ruch A→B   cubic-bezier(0.65, 0, 0.35, 1)

--ease-exit NIE NADAJE SIĘ NA UI. To czysty ease-in: startuje wolno
dokładnie w momencie, w którym użytkownik patrzy. Zarezerwowany wyłącznie
pod ruch fizycznie opuszczający ekran. Wchodzące I wychodzące elementy
interfejsu biorą ease-enter.

Przestrzenie --radius-*, --shadow-*, --inset-shadow-*, --drop-shadow-*
są wykasowane (: initial) — brak zaokrągleń i cieni jest wymuszony na
poziomie tokenów, nie tylko umową.

## Tailwind 4 — kaskada warstw
Reguły filtrowania siatki (display:none po data-filter) leżą w global.css
POZA @layer. To celowe: styl bez warstwy wygrywa w kaskadzie z każdą
warstwą Tailwinda. W @layer components przegrywały z utility `block`
z warstwy utilities i filtrowanie po cichu nie działało — data-filter
się przełączał, a kafle zostawały widoczne.

## Astro 7 — pułapki
- Kompilator w Rust jest ścisły, nie naprawia niepoprawnego HTML
  (np. <div> w <p>). Pilnuj poprawnego zagnieżdżania.
- Nie używaj Astro DB (@astrojs/db usunięte w 7).
- compressHTML domyślnie 'jsx' (nie true) — białe znaki są zbijane
  regułami JSX. Jeśli spacja między elementami inline zniknie, to stąd.
- Domyślny procesor Markdown to Sätteri, nie remark/rehype. Wtyczki
  remark/rehype wymagają doinstalowania @astrojs/markdown-remark.

## Formaty obrazów — AVIF świadomie WYŁĄCZONY
`<Picture>` NIE jest już nigdzie w kodzie — usunięty przy pracy nad
dwustopniowym ładowaniem (patrz sekcja niżej), bo dokładał fallback JPEG.
Siatka i strony projektów idą przez `getImage()` / `<Image>` z
`format: 'webp'`, bez fallbacku.

AVIF został zdjęty, bo jego kodowanie zjada większość czasu builda:
przy dwustopniowym ładowaniu próba AVIF-u dla samego wariantu lekkiego
(eksperyment E1) przekroczyła 10 minut na zimno wobec ~6-7 minut dla
WebP na tym samym materiale. Zysk wagowo jest realny, ale nie wart
ryzyka, że deploy nie zmieści się w limicie czasu.

Zapisane tu wcześniej „12m07s z AVIF kontra 1m24s bez" — wartość 1m24s
była NIEODTWARZALNA i błędna. Zmierzone niezależnie 2026-08-27
(`/usr/bin/time -p`, `dist` i `node_modules/.astro` usunięte, bez innych
obciążeń): zimny build trwa 6m48s do 6m10s zależnie od stanu kodu,
niezależnie od AVIF-u — dominuje dekodowanie 202 MB źródeł, nie
kodowanie wariantów. Nie dodawaj AVIF z powrotem — ani dla pełnych
zdjęć, ani dla samego kadru lekkiego — bez zmierzenia builda na
docelowej platformie.

## Astro 6 — zmiany, które nas dotyczą
- Domyślny serwis obrazów PRZYCINA domyślnie, bez podawania `fit`.
  Przy aspect-ratio 4/5 kadr poleci sam — sprawdzaj kadrowanie okładek.
- Serwis obrazów NIGDY nie skaluje w górę. Zdjęcie mniejsze niż żądany
  rozmiar zostanie w swoim rozmiarze. Pilnuj rozdzielczości źródeł.
- getImage() rzuca błędem po stronie klienta — tylko w kodzie serwerowym.
- Style responsywne obrazów idą przez klasy z hashem i atrybuty data-*,
  nie inline style (zgodność z CSP).
- Okładki siatki: Astro 6+ przycina domyślnie i NIGDY nie skaluje w górę.
  Nie używaj miniatur jako źródła. Po wygenerowaniu sprawdź kadrowanie
  okładek — przy aspect-ratio 4/5 kadr powstaje automatycznie.
- Astro.glob() usunięte — tylko import.meta.glob().
- getStaticPaths() nie może zwracać params typu number. Slug zawsze string.
- W getStaticPaths() nie ma obiektu Astro. Zamiast Astro.site →
  import.meta.env.SITE.
- Stare (legacy) content collections usunięte. Używamy zwykłego JSON-a,
  więc nas to nie dotyczy — ale nie wracaj do entry.slug.

## Model danych
src/content/projects.json — jeden wpis = jedna kampania.
src/content/projects.ts — typ Project + eksport `projects`.
src/assets/photos/<slug>/ — zdjęcia projektu. 01.jpg to zawsze okładka.
Nazwa folderu MUSI odpowiadać slugowi.
src/assets/photos/_portraits/ i _food/ — zdjęcia spoza nazwanych kampanii.

Źródłem prawdy dla zdjęć jest ~/Documents/pola sobun.com/KLIENCI/<slug>/.
Do repo trafiają wersje pod web: dłuższy bok max 2560 px, JPEG q82
(mozjpeg, 4:4:4), przenumerowane na 01.jpg…NN.jpg wg kolejności nazw
w źródle. 1370 MB oryginałów → 202 MB w repo. Nie commituj oryginałów.
Okładką jest 01.jpg, czyli pierwszy plik alfabetycznie ze źródła —
jeśli klientka wskaże inną, przenumeruj folder, nie zmieniaj konwencji.

year pochodzi wyłącznie od klientki lub z jej istniejącej strony.
Nigdy nie uzupełniaj danymi z makiety ani wnioskowaniem.
Lata w Portfolio.dc.html to placeholdery narzędzia do makiet — nie dane.
Sprawdzone 2026-08-25: polasobun.com nie podaje nigdzie roku realizacji,
więc wszystkie year są null.

## Kolejność zdjęć w siatce
ROUND-ROBIN po sesjach: najpierw pierwsze zdjęcie z każdej sesji, potem
drugie z każdej, i tak dalej. Wcześniej szło folder po folderze i w ALL
wychodziło po kilkanaście kadrów z rzędu z tej samej kampanii.
Zweryfikowane po zmianie: w widoku ALL ZERO sąsiadujących kafli z tej
samej sesji.

O tym, co trafia do ALL, decyduje pole `featured` w projects.json —
lista nazw plików w kolejności od najmocniejszego kadru. Wybrane RĘCZNIE
z arkuszy stykowych (skrypt generujący je: patrz historia gita), po
sześć na sesję poza allegro, które ma tylko cztery kadry poza okładką.
Kryterium: czytelność z kafla wielkości znaczka — mocna plama koloru,
jeden czytelny bohater, kontrast. Nie „ładne zdjęcie", tylko „widać je
z daleka".

Kolejność renderowania to DWA przebiegi:
  a) featured, round-robinem po sesjach. Runda zerowa to najmocniejszy
     kadr KAŻDEJ z 17 sesji, więc pierwszy ekran ALL to same petardy,
     każda z innej sesji. To one dostają eager i stagger wejścia.
  b) reszta zdjęć, bez tagu `all` — niewidoczne w ALL, ale nadal obecne
     w PORTRAITS i FOOD.

Zdjęcie bez `featured` i bez tagu portraits/food nie trafiłoby do żadnej
zakładki — jest POMIJANE w renderowaniu siatki.
Zostaje widoczne na stronie swojej kampanii /work/<slug>, która pokazuje
cały folder. Dzięki temu w DOM trafia 275 kafli (100 featured + 160
reszty w PORTRAITS/FOOD + 15 okładek kampanii w COMMERCIAL), nie
wszystkie 359 zdjęć.

PORTRAITS i FOOD nadal pokazują wszystko (122 i 78). Mają sąsiadujące
kafle z tej samej sesji i to jest nieuniknione — te zakładki są
zdominowane przez zbiorcze galerie _portraits (114) i _food (50), które
Z DEFINICJI są jedną sesją. Nie próbuj tego "naprawiać".

## Ochrona zdjęć — DETERENT, nie zabezpieczenie
Nazywaj to po imieniu i nie obiecuj klientce więcej, niż to daje.

Co robi: blokuje długie przytrzymanie na iOS (arkusz „Zapisz zdjęcie"),
przeciąganie obrazu na pulpit, zaznaczanie i menu kontekstowe na <img>.
Reguła CSS w global.css plus jeden listener w Base.astro.

Czego NIE robi: nie chroni przed zrzutem ekranu, narzędziami
deweloperskimi, zakładką Sieć ani skopiowaniem adresu z kodu strony.

WATERMARK „TYLKO PRZY KRADZIEŻY" JEST NIEWYKONALNY — nie próbuj go
implementować. Przeglądarka wyświetlająca zdjęcie i narzędzie je
zapisujące wysyłają TO SAMO żądanie HTTP po ten sam plik. Serwer nie ma
sygnału, który pozwoliłby je odróżnić. Cokolwiek serwujemy, dostaje to
jedno i drugie.

Rozważone i ODRZUCONE decyzją właściciela projektu:
  - obniżenie maksymalnej rozdzielczości na stronach projektów (2000 px)
  - watermark wypalany we wszystkie zdjęcia przy budowaniu
  - watermark tylko na stronach projektów
Zostaje sam deterent. Zdjęcia są serwowane w pełnej jakości.

## Taksonomia — decyzja ostateczna
Filtry: ALL / COMMERCIAL / PORTRAITS / FOOD.
Pole tags przyjmuje wyłącznie: commercial | portraits | food.

ALL NIE jest brakiem filtra — to pełnoprawny widok. Cztery zakładki
pokazują dwa różne rodzaje kafli:
  ALL         wszystkie pojedyncze zdjęcia, BEZ podpisów i bez linków
  COMMERCIAL  okładki kampanii (01.jpg), Z podpisem i linkiem /work/<slug>
  PORTRAITS   zdjęcia z folderów tagowanych portraits, bez podpisów
  FOOD        zdjęcia z folderów tagowanych food, bez podpisów

Kafel zdjęcia dostaje data-cat="all [portraits] [food]" — `commercial`
jest z niego celowo odfiltrowane, bo COMMERCIAL pokazuje okładki,
nie pojedyncze zdjęcia. Kafel kampanii dostaje data-cat="commercial".
Projekt może mieć więcej niż jeden tag (np. Pudliszki: commercial + food).
Tagi beauty/fashion/lifestyle/sport/still-life zostały usunięte — nie wracaj
do nich i nie migruj ich do pola pomocniczego.
Wygląd, typografia i zachowanie paska filtrów: dokładnie z makiety Design.
Zmieniamy wyłącznie etykiety i logikę filtrowania.

## Strona projektu — odstępstwa od makiety
Górny pasek, tytuł i siatka faktów są 1:1 z Portfolio.dc.html.
Cztery rzeczy różnią się celowo:

1. Zdjęcia idą jedno pod drugim, na pełną szerokość, w oryginalnych
   proporcjach. Makieta ma siatkę 4-kolumnową z kadrem 4/5 — zmiana
   na wyraźne polecenie ("wszystkie zdjęcia z folderu, w kolejności
   nazw, jedno pod drugim").
2. Metryczka w prawym górnym rogu pokazuje same kategorie ("Commercial",
   "Commercial · Food"). Makieta ma tam "Pandora · 2023 · commercial",
   ale w naszych danych title JUŻ jest nazwą klienta, więc client
   dublowałby tytuł.
3. Makieta ma cztery pola faktów: Klient, Rok, Rola, Zakres. Zostają
   dwa — `role` zostało usunięte z modelu danych, `scope` nigdy nie
   istniało. Pola bez wartości nie renderują się w ogóle; żadnych
   pustych etykiet ani "null". Przy year = null dla wszystkich wpisów
   w praktyce widać tylko Klient.
4. Tytuł jest responsywny: 26px / 56px od sm / 64px od lg. Makieta ma
   sztywne 64px, przy którym "JOANNA JĘDRZEJCZYK × FANADISE" nie
   mieści się na 375px.

Kolekcje (_portraits, _food) pokazują sam tytuł — bez metryczki
i bez siatki faktów.

## Animacja wejścia — Originkit Image Flipper
src/components/originkit/image-flipper.tsx to kod DOSTARCZONY przez
Originkit MCP (`originkit: get image-flipper`, stack react + tailwind + ts).
NIE przepisuj go i nie "poprawiaj". Żeby go zaktualizować, pobierz
ponownie z MCP. Zostawiony jest w nim nieużywany prop `animate` —
to jedyny hint z astro check i pochodzi z oryginału.

src/components/Intro.tsx to NASZA warstwa spinająca. Intro pokazuje JEDEN
kadr w trybie FlipImage `mode="single"` — komponent wtedy nie cykluje,
tylko ląduje i zostaje. Odpada przez to cała klasa problemów z odmierzaniem
cudzego zegara przez wiele przejść. Czas: (duration + delay) = 2200 ms,
po czym kurtyna schodzi TWARDYM CIĘCIEM — bez wygaszania.
Zmierzone od zbudowania canvasu do zniknięcia kurtyny: 2172-2200 ms.
350 ms zaniku po 4,4 s split-flapa nic nie wnosiło, a dokładało easing
i przekroczenie budżetu 300 ms na UI. Zmierzone po zmianie: ostatnia
klatka z kurtyną przy opacity 1, następna bez niej, zero klatek
pośrednich. Cięcie pasuje do reszty: bez zaokrągleń, cieni i gradientów.
Stałe DURATION_S/DELAY_S
w Intro.tsx MUSZĄ zgadzać się z transition przekazanym do FlipImage —
rozjadą się i przejście utnie animację w połowie.

CZTERY punkty zaczepienia, każdy wywalczony bólem — nie upraszczaj ich:
1. Zdjęcia są preloadowane PRZED montażem FlipImage. Komponent startuje
   swój zegar dopiero po onload, więc bez preloadu sieć zjadała budżet.
2. Odliczanie startuje dopiero, gdy płótno dostanie DOKŁADNIE wymiary
   cardWidth × dpr, czyli gdy FlipImage wykonał build(). Nie porównuj
   z zerem — puste płótno ma domyślnie 300×150, więc `canvas.width > 0`
   spełnia się już przy montażu i NICZEGO nie wykrywa. Ten błąd był tu
   przez jedną iterację i dawał złudzenie naprawy.
3. Bezpiecznik czekania na canvas MUSI być na setTimeout, nie wewnątrz
   pętli rAF. requestAnimationFrame NIE CHODZI w ukrytej karcie, więc
   warunek sprawdzany w jego wnętrzu nigdy się nie wykona i kurtyna wisi
   w tle w nieskończoność. Wykryte przypadkiem — panel przeglądarki był
   ukryty i intro zawisło na stałe.
4. Rozmiar mierzymy raz i zamrażamy. cardWidth/cardHeight są w deps
   efektu FlipImage — reagowanie na resize restartuje animację od zera,
   podczas gdy zewnętrzne odliczanie biegnie dalej.
Objaw wszystkich trzech błędów jest ten sam i mylący: animacja wygląda
dobrze, tylko kończy się na pierwszym zdjęciu. Po każdej zmianie w tym
pliku sprawdź zrzutami co sekundę, że OBA kadry są widoczne przed
odsłonięciem siatki.

Intro odtwarza się RAZ NA SESJĘ (sessionStorage `polasobun:intro-played`).
Pomijanie: kliknięcie w kurtynę albo Escape. Jeśli któreś zdjęcie się nie
załaduje, animacja jest pomijana w całości zamiast odtwarzana zepsuta.

Liczba kafli jest ograniczona budżetem MAX_TILES = 900 na klatkę.
FlipImage przyjmuje liczbę KOLUMN i sam wylicza wiersze z proporcji
płótna, więc łączna liczba kafli ≈ kolumny² × (wysokość / szerokość) —
stąd pierwiastek w tileColumns(). Bez tego limitu przy 2560×1440 i DPR 2
wychodziło 5390 wywołań drawImage na klatkę, na głównym wątku, dokładnie
gdy strona pobiera zdjęcia siatki. Po limicie: 880. Nie podnoś MAX_TILES
bez sprawdzenia na dwurdzeniowej maszynie.

Treść pod kurtyną dostaje `inert` na czas animacji — bez tego Tab wchodzi
w przyciski filtrów schowane pod nieprzezroczystą nakładką. Wyłączane jest
rodzeństwo nakładki w <body>, nigdy ona sama ani jej przodkowie.

Trzy świadome wyjątki od twardych reguł:
1. Animacja jest rysowana na canvasie, nie na transform/opacity.
   Split-flapa nie da się zrobić inaczej. Poza canvasem nie ma tu
   już ŻADNEGO przejścia CSS — kurtyna schodzi twardym cięciem.
2. Canvas potrzebuje URL-a, nie ImageMetadata, więc zdjęcia idą przez
   getImage() z astro:assets i dopiero jego `.src` trafia do komponentu.
   Zdjęcie nadal jest optymalizowane — nie omijamy astro:assets.
3. prefers-reduced-motion obsługiwane jawnie w Intro.tsx. Globalny
   bezpiecznik z global.css tnie tylko transition/animation, a canvas
   chodzi na requestAnimationFrame i by go zignorował.

Intro renderuje null na serwerze — bez JS-u strona jest od razu
użyteczna i nic jej nie zasłania. Kosztem jest mgnienie siatki przed
pojawieniem się nakładki.

Zdjęcie wybrane w index.astro (stała INTRO): rimmel/01 — mocno graficzne,
wysokokontrastowe. Split-flap rozbija kadr na kafelki, więc czytelna plama
koloru działa lepiej niż subtelny portret. Zmiana to podmiana slugu.

Generowane są DWA warianty: 900 px i 1800 px, wybierane po
szerokość_okna × dpr z progiem 1100. Wcześniej szło jedno 1920 px ważące
525 kB — największy pojedynczy zasób strony, serwowany także na ekran
412 px. Po zmianie na telefonie schodzi 128 kB, czyli o 76% mniej.

## Wejście kafli — stagger
Odpalane atrybutem `data-enter`, który Intro ustawia na `[data-filter]`
po zejściu kurtyny. Bez tego stagger przeleciałby niewidoczny pod
nieprzezroczystą nakładką — zmierzone: kurtyna znika w 4361 ms,
data-enter pojawia się w 4377 ms, zero klatek nakładania.

Animowane są TYLKO pierwsze 12 kafli. Przy 359 kaflach i 50 ms opóźnienia
pełny stagger trwałby 18 sekund. Dwanaście pokrywa to, co widać nad
zgięciem na desktopie; reszta jest na miejscu od razu i nikt nie zdąży
doscrollować, zanim wejście się skończy. Nie zwiększaj tej liczby bez
policzenia, ile to sekund.

Skalujemy OBRAZ wewnątrz kafla (`[data-cat] img`), nie sam kafel.
Kafel ma overflow-hidden, tak jak w makiecie, więc komórka stoi
nieruchomo i w siatce stykającej się bez odstępów nie otwierają się
szczeliny. Zweryfikowane: prostokąty kafli identyczne w trakcie
animacji i po niej.

Całe wejście jest w `@media (prefers-reduced-motion: no-preference)`,
więc przy reduced-motion nie istnieje — nie polegamy na globalnym
bezpieczniku, który i tak nie tyka animation-delay.

Bez JS-u atrybut nie powstaje i kafle są po prostu widoczne.

## Przejścia filtrów
Przenika CAŁA siatka, nie pojedyncze kafle. Przy 275 kaflach osobne
przejścia oznaczałyby 275 warstw kompozycji naraz; tu przenika jeden
element. Sam dobór kafli robi nadal reguła display:none po data-filter
(mechanizm 1:1 z makiety) — podmieniamy atrybut w połowie przenikania,
gdy siatka ma opacity 0, więc twarde cięcie nigdy nie trafia w oko.

Wyjście 100 ms, wejście 180 ms (--duration-filter-out / -in). Asymetria
celowa: po kliknięciu stara zawartość jest już nieistotna, nowa
potrzebuje chwili na odczytanie. Razem 280 ms, pod budżetem 300 ms.

Podświetlenie w pasku reaguje NATYCHMIAST — stan `pending` trzyma wybór
zanim trafi on do siatki. Bez tego kontrolka spóźniałaby się o 100 ms
względem kliknięcia.

Przerywalne: kolejne kliknięcie kasuje oczekujący timeout i retarguje
trwające przenikanie. Zmierzone — trzy kliknięcia w 80 ms dają JEDNĄ
podmianę zawartości, od razu na finalny wybór.

data-enter jest zdejmowany po zakończeniu staggeru (patrz Intro.tsx).
Element wracający z display:none restartuje animację CSS, więc bez tego
każdy powrót do ALL odtwarzałby wejście kafli równocześnie z przejściem
filtrów. Zweryfikowane: po powrocie do ALL zero animacji na kaflach.

Przenikanie zostaje przy prefers-reduced-motion — opacity jest na białej
liście globalnego bezpiecznika i zgodnie ze standardem przejścia
pomagające zrozumieć zmianę stanu mają zostać. Ruchu tu nie ma.

## Kolejność prac — nie wyprzedzaj
1. siatka statyczna ✔
2. wejście kafli (stagger) ✔
3. hover flip — POMINIĘTY świadomą decyzją. Wymagałby powrotu do rewersu
   kafla z makiety, którego przy siatce statycznej nie budowaliśmy.
4. przejścia filtrów ✔
5. review-animations ✔ (przeprowadzone, wszystkie uwagi zamknięte)

## Zasady pracy
- Jedno zadanie na raz. Nie dokładaj funkcji, o które nie prosiłem.
- Po każdym etapie: npm run build musi przechodzić (odpala astro check).
