# Panel do zdjęć — instrukcja

W panelu sama dodajesz zdjęcia, układasz ich kolejność, wskazujesz
okładki i zakładasz nowe kampanie. Nie musisz nikogo o to prosić.

Dwie rzeczy, które warto wiedzieć od razu:

- **Zapisanie zmiany to nie to samo co pokazanie jej na stronie.**
  Zapisane zmiany czekają. Na stronę trafiają dopiero po kliknięciu
  przycisku **Opublikuj stronę** — sekcja 8.
- **Nic nie psujesz.** Strona zmienia się wtedy, kiedy Ty tego chcesz,
  a każdą zmianę da się cofnąć. Jeśli coś wygląda inaczej, niż tu
  opisano — zadzwoń, zamiast zgadywać.

<!--
NOTATKA DLA WYKONAWCY — cały plik.
Wszystkie nazwy pól i przycisków pisane pogrubieniem pochodzą wprost
z `.pages.yml` w korzeniu repozytorium. Jeśli zmieniasz tam `label`,
zmień je i tutaj — inaczej instrukcja przestaje pasować do ekranu.
Notatki dla Ciebie są w tym pliku wyłącznie jako komentarze HTML
(szukaj: NOTATKA DLA WYKONAWCY). Klientka ich nie widzi.
-->

## 1. Jak się zalogować

1. Otwórz w przeglądarce adres **app.pagescms.org**.
2. Kliknij przycisk logowania przez GitHub.
3. Wpisz swój login i hasło do GitHuba, a potem przepisz kod
   z telefonu. Ten kod to dodatkowe potwierdzenie, że to Ty.
4. Po zalogowaniu zobaczysz spis miejsc, w których możesz coś zmienić:
   - **Kampanie** — jedna pozycja to jedna sesja,
   - **Kolejność kampanii** — w jakiej kolejności ustawiają się
     na stronie głównej,
   - **Strona kontaktowa** — Twój tekst o sobie, portret i dane
     kontaktowe (sekcja 7),
   - **Zdjęcia kampanii** — wszystkie pliki zdjęć, poukładane
     w foldery,
   - **Portret na stronie kontaktowej** — jeden plik z Twoim zdjęciem
     (sekcja 7).

Uwaga na powtórzoną nazwę: **Zdjęcia kampanii** to i nazwa spisu
wszystkich plików ze zdjęciami, i nazwa pola wewnątrz kampanii.
Do codziennej pracy potrzebujesz tego pola wewnątrz kampanii.

<!--
NOTATKA DLA WYKONAWCY — sekcja 1.
Dokładne brzmienie przycisku logowania (Pages CMS, element wbudowany,
nie z `.pages.yml`) nie zostało sprawdzone na ekranie. Potwierdź je
przy kroku 4 planu — przejściu pełnej ścieżki z klientką — i wpisz
tu dosłownie to, co widać.
-->

## 2. Jak dodać zdjęcia do istniejącej kampanii

1. Wejdź w **Kampanie**.
2. Kliknij nazwę kampanii, którą chcesz uzupełnić — na przykład
   PANDORA.
3. Zjedź do pola **Zdjęcia kampanii**. Widzisz w nim kafelki wszystkich
   zdjęć tej kampanii, w tej samej kolejności, w jakiej stoją na
   stronie.
4. Przeciągnij nowe pliki z pulpitu na to pole albo kliknij je
   i wskaż pliki na dysku.
5. Nowe kafelki dokładają się na końcu. Kolejność ustawisz za chwilę —
   sekcja 3.
6. Zapisz zmiany.

**Jedna ważna rzecz.** Każda kampania ma własny folder na zdjęcia.
Nazywa się dokładnie tak samo jak wartość w polu **Adres strony** tej
kampanii — dla PANDORY to `pandora`. Nowe zdjęcia muszą trafić do tego
folderu. Jeśli wylądują gdzie indziej, publikacja się zatrzyma: strona
zostanie taka, jaka była, nic się nie zepsuje, ale zmiana nie wejdzie,
dopóki plik nie znajdzie się we właściwym miejscu.

Zapisanie to dopiero połowa roboty. Żeby zdjęcia pojawiły się na
stronie, przejdź do sekcji 8.

<!--
NOTATKA DLA WYKONAWCY — sekcja 2.
Dokładna ścieżka klikania w oknie wyboru plików (jak wejść do folderu
kampanii i jak w nim wgrać zdjęcie) nie została sprawdzona na ekranie.
Przejdź to z klientką przy kroku 4 planu i dopisz tu konkretne kliknięcia.
Ryzyko jest realne: `projects.ts` czyta zdjęcia globem
`../assets/photos/*/*.jpg` — dokładnie jeden poziom folderu. Plik
wgrany do korzenia `photos/` nie wejdzie do mapy, `zdjecie()` rzuci
`Brak pliku zdjęcia:` i publikacja padnie na budowaniu. Awaria jest
bezpieczna (nic nie idzie na produkcję), ale dla klientki nieczytelna.
-->

## 3. Jak zmienić kolejność zdjęć

W polu **Zdjęcia kampanii** złap kafelek i przeciągnij go w nowe
miejsce. Reszta kafelków się rozsunie i zrobi mu miejsce.

Kolejność kafelków to dokładnie kolejność zdjęć na stronie kampanii,
od góry do dołu. Co widzisz w panelu, to zobaczysz na stronie.

Tak samo przestawiasz kadry w polu **Kadry na stronę główną**
(sekcja 5) oraz całe kampanie w **Kolejność kampanii**.

Po przestawieniu zapisz zmiany.

<!--
NOTATKA DLA WYKONAWCY — sekcja 3.
Przeciąganie kafelków to zadanie 5 krok 4, punkty 1 i 2 —
NIEZWERYFIKOWANE na ekranie. Jeśli okaże się, że pole nie przeciąga
się (zwłaszcza `reference` w „Kolejność kampanii"), przepisz tę sekcję
na to, co panel faktycznie robi, i nie zostawiaj tu obietnicy.
-->

## 4. Jak zmienić okładkę

Okładka to kafel, którym kampania pokazuje się w zakładce COMMERCIAL —
jedno zdjęcie za całą sesję.

1. Otwórz kampanię.
2. Znajdź pole **Okładka**.
3. Wskaż zdjęcie z folderu tej kampanii.
4. Zapisz zmiany.

Możesz wybrać dowolne zdjęcie z kampanii. Nie musi być pierwsze
i nie musi być niczym szczególnym oznaczone.

Jeśli na okładkę wskażesz kadr, który masz też w polu **Kadry na
stronę główną**, ten kadr zniknie z zakładki ALL. Tak ma być: to samo
zdjęcie nie ma się pokazywać dwa razy obok siebie.

## 5. Jak wybrać kadry na stronę główną

Pole **Kadry na stronę główną** decyduje, które zdjęcia z tej kampanii
trafią do zakładki ALL na stronie głównej.

- **Najwyżej sześć** na kampanię.
- Układaj **od najmocniejszego**. Pierwszy kadr z każdej kampanii
  ląduje na pierwszym ekranie strony głównej, więc to on pracuje
  najciężej.
- Kryterium nie brzmi „ładne zdjęcie", tylko „widać je z daleka":
  mocna plama koloru, jeden czytelny bohater, kontrast. Kafel bywa
  wielkości znaczka.

Zdjęcie, którego tu nie wskażesz, nigdzie nie znika — dalej jest
na stronie swojej kampanii. Po prostu nie pokazuje się na stronie
głównej.

Po zmianie zapisz.

## 6. Jak dodać nową kampanię

Cztery kroki po kolei. O ostatnim najłatwiej zapomnieć, a bez niego
nic nie wejdzie na stronę.

### Krok 1. Przygotuj folder na zdjęcia

W spisie **Zdjęcia kampanii** załóż nowy folder i wgraj do niego
zdjęcia. Nazwij go dokładnie tak, jak za chwilę wypełnisz pole
**Adres strony**. Te dwie nazwy muszą być identyczne.

### Krok 2. Załóż kampanię

Wejdź w **Kampanie** i dodaj nową. Wypełnij:

- **Nazwa** — tytuł, który zobaczą ludzie, np. PANDORA.
- **Adres strony** — patrz krok 3, to najważniejsze pole w całym
  panelu.
- **Klient** — nazwa marki.
- **Rok** — rok realizacji, samą liczbą, np. 2024. Nie pamiętasz —
  zostaw puste.
- **Zakładki** — gdzie kampania ma się pokazywać. Do wyboru trzy
  pozycje: `commercial` (kampanie komercyjne), `portraits` (portrety),
  `food` (jedzenie). Możesz zaznaczyć więcej niż jedną.
- **Okładka** — sekcja 4.
- **Kadry na stronę główną** — sekcja 5.
- **Zdjęcia kampanii** — sekcja 2.

Dwóch pól **nie ruszaj**: **Galeria zbiorcza** (dotyczy wyłącznie
dwóch starych, zbiorczych galerii) i **Stary adres** (adresy
z poprzedniej strony; nowych się nie dodaje).

### Krok 3. Pole „Adres strony" — przeczytaj uważnie

Z tego pola powstaje adres kampanii: `polasobun.com/work/TO-POLE`.

- Same **małe litery**.
- **Bez polskich znaków** — piszesz `lodz`, nie `łódź`.
- **Bez spacji** — zamiast spacji myślnik: `dobra-kaloria`.
- Wolno: małe litery, cyfry, myślnik. Nic więcej.
- Ma się zgadzać z nazwą folderu ze zdjęciami z kroku 1.
- **Po opublikowaniu tego pola się nie zmienia.** Adres, który ktoś
  zapisał u siebie albo wysłał dalej, po zmianie przestanie działać.
  Jeśli naprawdę trzeba go poprawić — zadzwoń, zamiast poprawiać
  samodzielnie.

<!--
NOTATKA DLA WYKONAWCY — sekcja 6, krok 3.
`.pages.yml` ma na tym polu `pattern: '^[a-z0-9_-]+$'`, ale to zadanie 5
krok 4 punkt 4 — NIEZWERYFIKOWANE. Dlatego instrukcja mówi klientce,
jak ma pisać, i NIE obiecuje, że panel ją poprawi. Po sprawdzeniu:
jeśli `pattern` działa, można tu dopisać jedno zdanie, że panel nie
przyjmie złego zapisu; jeśli panel ignoruje `pattern`, usuń linię
z `.pages.yml` i zostaw tę sekcję bez zmian.
-->

### Krok 4. Dopisz kampanię do „Kolejność kampanii"

Wejdź w **Kolejność kampanii**, dodaj do listy nową kampanię
i przeciągnij ją tam, gdzie ma stać.

Bez tego kroku publikacja się zatrzyma i na stronę nie wejdzie nic —
także zmiany w innych kampaniach. To zabezpieczenie, nie awaria:
strona nie pokaże kampanii, o której nie wiadomo, w którym miejscu
ma stanąć.

## 7. Jak zmienić stronę kontaktową

Strona kontaktowa to trzy rzeczy: tekst o sobie, portret i dane
kontaktowe. Wszystkie trzy zmieniasz sama, w jednym miejscu — wejdź
w **Strona kontaktowa**.

### Tekst o sobie

Pole **Bio** to lista akapitów: **jeden wpis to jeden akapit** na
stronie. Dziś są cztery.

Nie wklejaj całego tekstu do jednego wpisu i nie rozdzielaj akapitów
pustymi wierszami — dodaj tyle wpisów, ile chcesz mieć akapitów.
Wpisy możesz poprawiać, dodawać i usuwać.

**Cztery miejsca w tym tekście są celowo poprawione** względem starej
strony. Jeśli przepiszesz akapity ze starej strony, wrócą tam błędy.
Zmienione zostały dokładnie te słowa:

- **Pudliszki** — na starej stronie stoi „Publiszki".
- **branded content** — na starej stronie „brandend content".
- **trashowe** — na starej stronie „thrashowe".
- **nawias przy LPP** — na starej stronie nawias otwarty przy LPP nigdy
  się nie zamyka i wychodzi z tego, że CCC należy do LPP. Teraz jest
  `LPP (Reserved, Cropp, House), CCC czy Inditex (Pull&Bear)`, czyli CCC
  stoi osobno — bo to osobna firma.

Poza tymi czterema miejscami tekst jest dokładnie taki, jaki był.

### Portret

Pole **Portret** wskazuje zdjęcie, które stoi obok tekstu.

1. Przygotuj plik tak samo jak zdjęcia do kampanii — sekcja 10.
2. Wgraj go i wskaż w polu **Portret**.
3. Zapisz zmiany.

**Zanim wgrasz lepszy plik, przeczytaj to.** Dzisiejszy portret jest
mały i na telefonie wychodzi miękko. Sam większy plik tego nie naprawi:
zdjęcie dalej pokaże się w tej samej wielkości co teraz, bo ta wielkość
jest dobrana pod ograniczenia obecnego pliku. **Wgraj nowy portret
i daj mi znać** — muszę wtedy poprawić jedno ustawienie po swojej
stronie. Dopiero razem to zadziała.

### Dane kontaktowe

Pole **Dane kontaktowe** to lista pozycji — dziś trzy: telefon, mail
i Instagram. Każda pozycja jest zwinięta do samej etykiety, więc widzisz
krótką listę. Kliknij pozycję, żeby ją rozwinąć.

W każdej pozycji są cztery rzeczy do wypełnienia:

- **Etykieta** — podpis z lewej strony: `tel`, `mail`, `instagram`.
  Na stronie pokazuje się WIELKIMI LITERAMI, niezależnie od tego, jak
  ją wpiszesz.
- **Widoczny tekst** — to, co ludzie przeczytają: `883 180 410`,
  `polasobun@gmail.com`, `@polasobun`.
- **Odnośnik** — co się stanie po kliknięciu. Trzy wzory, trzymaj się
  ich co do znaku:
  - telefon: `tel:` i numer z kierunkowym kraju, bez spacji —
    `tel:+48883180410`,
  - mail: `mailto:` i adres — `mailto:polasobun@gmail.com`,
  - Instagram albo inna strona: pełny adres razem z `https://` —
    `https://www.instagram.com/polasobun/`.
- **Otwiera nową kartę** — zaznacz **tylko** przy odnośnikach do innych
  stron, czyli dziś przy Instagramie. Wtedy Instagram otworzy się w nowej
  karcie, a Twoja strona zostanie w swojej — odwiedzający jej nie traci.
  **Nie zaznaczaj przy telefonie
  i mailu.** One nie otwierają żadnej strony, tylko uruchamiają telefon
  albo program pocztowy — zaznaczenie zostawiłoby po nich pustą, martwą
  kartę.

Pozycje możesz dodawać i usuwać. Kolejność na stronie jest taka sama
jak na liście.

Na koniec zapisz zmiany. Na stronie zobaczysz je dopiero po
opublikowaniu — sekcja 8.

<!--
NOTATKA DLA WYKONAWCY — sekcja 7.
1. Wygląd list („Bio" jako `text` z `list: true`, „Dane kontaktowe" jako
   `object` z `list.collapsible.summary: '{fields.etykieta}'`) opisany
   z konfiguracji, NIE ze zrzutu ekranu. Zwłaszcza zdanie „każda pozycja
   jest zwinięta do samej etykiety" wymaga potwierdzenia przy kroku 4
   planu — jeśli panel renderuje to inaczej, popraw ten akapit.
2. PORTRET, dlaczego samo wgranie nie wystarczy: `contact.astro` ma na
   sztywno `PORTRET_PX = 260` i `densities={[1, 1.45]}` (1,45 × 260 =
   377 ≤ 379 px, czyli maksimum, jakie udźwignie dzisiejszy plik).
   Po dostaniu prawdziwego oryginału wraca 331 px i trzeba przeliczyć
   `densities` — komentarz w `contact.astro` mówi to samo. Instrukcja
   celowo nie podaje klientce ani liczb, ani nazw ustawień: ma wgrać
   plik i dać znać.
3. Portret musi leżeć BEZPOŚREDNIO w `src/assets/portret/` — glob
   `zdjeciaPortretu` to `../assets/portret/*.jpg`, jeden poziom. Podfolder
   założony z panelu wywali `Brak portretu:` przy budowaniu. Ten sam
   rodzaj pułapki co przy zdjęciach kampanii (sekcja 2).
4. Stary plik portretu zostaje w folderze, tylko przestaje być wskazany.
   To nie jest problem — nie każ klientce niczego kasować.
5. Automatyczna normalizacja obejmuje też `src/assets/portret/**`, ale
   ma dolny próg `MIN_DLUZSZY_BOK = 1000`: dzisiejszy portret (379 px)
   jest przez nią POMIJANY, prawdziwy plik od klientki już nie. Powód
   progu opisuje `polasobun/AGENTS.md`, sekcja o CMS-ie.
-->

## 8. Jak opublikować

To ten moment, w którym zmiany trafiają na stronę.

1. Sprawdź, czy masz wszystko zapisane.
2. Kliknij **Opublikuj stronę**.
3. Poczekaj kilka minut. Strona składa się od nowa razem ze
   wszystkimi rozmiarami nowych zdjęć — im więcej ich wgrałaś,
   tym dłużej to trwa.
4. Odśwież swoją stronę w przeglądarce i obejrzyj zmianę.

Jeśli po kilkunastu minutach nic się nie zmieniło, nie klikaj w kółko —
zadzwoń. Publikacja umie się sama zatrzymać, kiedy coś się nie zgadza.
Wtedy strona zostaje w poprzedniej, działającej wersji i czeka, aż się
to poprawi.

Zatrzymać ją potrafi pięć rzeczy. Każda jest odwracalna i żadna niczego
nie kasuje — to zabezpieczenia, nie awarie:

- **Zdjęcie wgrane do złego folderu.** Przenieś je do folderu tej
  kampanii — sekcja 2.
- **Nowa kampania, której nie ma w „Kolejność kampanii".** Dopisz ją
  tam — sekcja 6, krok 4.
- **Skasowany plik zdjęcia, które nadal jest na liście w polu „Zdjęcia
  kampanii".** Otwórz tę kampanię i usuń z pola **Zdjęcia kampanii**
  kafelek zdjęcia, którego już nie ma. Możesz też zamiast tego wgrać
  skasowany plik z powrotem — obie drogi są dobre.
- **Skasowana kampania, która nadal jest w „Kolejność kampanii".**
  Wejdź w **Kolejność kampanii** i usuń ją z listy.
- **Skasowane zdjęcie, które napędza animację na wejściu.** Jedno
  zdjęcie z kampanii RIMMEL rozsypuje się na kafelki, kiedy ktoś wchodzi
  na stronę główną. Panel nigdzie tego nie pokazuje, więc da się je
  skasować przez przypadek. Najprościej wgrać ten plik z powrotem, pod
  tą samą nazwą. Jeśli go nie masz — zadzwoń, wskażę do animacji inne
  zdjęcie po swojej stronie.

<!--
NOTATKA DLA WYKONAWCY — sekcja 8, punkt 4.
Celowo „swoją stronę", bez adresu. Dziś `polasobun/astro.config.mjs`
ma `site: 'https://polasobun-site.vercel.app'` — adres techniczny,
tymczasowy; `www.polasobun.com` nadal serwuje starą witrynę z Formatu,
a `polasobun.com` bez www nie odpowiada (sprawdzone 2026-08-27).
Nie wpisuj tu adresu tymczasowego. Po przełączeniu DNS na domenę
klientki wstaw docelowy adres w tym punkcie ORAZ w sekcji 6 krok 3
(przykład `polasobun.com/work/TO-POLE`), jeśli miałby się różnić.
-->

## 9. Co się dzieje, jeśli zapomnisz kliknąć

Nic złego. Zmiany zostają zapisane i czekają.

Strona pokazuje wtedy nadal poprzednią wersję — dokładnie tę, którą
opublikowałaś ostatnio. Nowe zdjęcia się nie pogubią i nikt ich nie
skasuje. Po prostu nikt ich jeszcze nie widzi.

**Na stronę nie trafia nic, czego sama nie opublikujesz.** Nie ma tu
żadnego automatu, który dopchnąłby zmiany w nocy albo nad ranem.

To ma dobrą stronę: pracę możesz spokojnie zostawić w połowie, choćby
na kilka dni. Niedokończona kampania, zdjęcia przestawione do połowy,
kadry wgrane, ale jeszcze nieuporządkowane — nic z tego nie pokaże się
ludziom, dopóki nie klikniesz **Opublikuj stronę**.

I ma jedną złą: dopóki nie klikniesz, gotowa praca też nie jest
widoczna. Weź to za nawyk — skończona zmiana kończy się kliknięciem.

<!--
=========================================================================
NOTATKA DLA WYKONAWCY — sekcja 9. NAJWAŻNIEJSZA W TYM PLIKU.
=========================================================================
Ta sekcja opisuje STAN NA DZIŚ: w `.github/workflows/publikacja.yml`
wyzwalacz `schedule` (cron '0 2 * * *') jest ZAKOMENTOWANY i czeka na
sekrety Cloudflare oraz pierwszy udany wyjazd na produkcję. Dopóki tak
jest, jedyną drogą na stronę jest ręczne uruchomienie publikacji —
i tylko to tu napisano.

PO ODKOMENTOWANIU CRONA PRZEPISZ TĘ SEKCJĘ. Zmienią się obie strony
bilansu naraz:
  + zapomniane kliknięcie naprawia się samo — nocny przebieg wykryje,
    że `main` odbiega od znacznika `wydane`, i opublikuje do rana;
  - praca zostawiona na noc w połowie TEŻ pojedzie na żywo, bo nocny
    przebieg nie odróżnia „skończone" od „w trakcie".
Drugi punkt trzeba napisać klientce WPROST — dziś jest odwrotnie niż
będzie, więc nawyk „mogę zostawić w połowie" przestanie być bezpieczny.
DO PRZEPISANIA WTEDY, LISTA ZAMKNIĘTA:
  - cała sekcja 9, razem z akapitem o zostawianiu pracy w połowie;
  - wstęp, drugi punkt: „Strona zmienia się wtedy, kiedy Ty tego
    chcesz" — przestanie być prawdą;
  - wstęp, pierwszy punkt i sekcja 8: „Na stronę trafiają dopiero
    po kliknięciu" wymaga wtedy zastrzeżenia „albo w nocy".
=========================================================================
-->

## 10. Jak przygotować zdjęcia przed wgraniem

Ustaw w Lightroomie albo Capture One taki eksport i zapisz go sobie
jako gotowe ustawienie:

```
Format:        JPEG
Jakość:        82
Rozmiar:       dłuższy bok 2560 px, bez powiększania
Przestrzeń:    sRGB
Metadane:      bez danych aparatu i lokalizacji
```

**Nazwa pliku musi kończyć się na `.jpg`.** Końcówka `.jpeg` nie
zadziała — takiego pliku panel nie przyjmie. Jeśli Twój program zapisuje
zdjęcia z końcówką `.jpeg`, popraw ją w nazwie pliku przed wgraniem.

Dlaczego akurat tak: pliki prosto z aparatu ważą kilkanaście razy
więcej, a raz wgrane zostają w historii projektu na stałe — również
wtedy, gdy potem usuniesz zdjęcie ze strony.

Po wgraniu zdjęcia są jeszcze raz sprawdzane i w razie potrzeby same
doprowadzane do tych ustawień. To jednak siatka bezpieczeństwa na
pomyłkę, nie zamiennik gotowego ustawienia w Lightroomie: plik, który
wgrasz, zostaje w historii dokładnie taki, jaki był.
