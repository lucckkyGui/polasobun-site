# Zakładka CONTACT

Data: 2026-08-27
Status: zatwierdzony projekt, przed implementacją

## Cel

Odtworzyć zakładkę kontaktową ze strony klientki
(https://www.polasobun.com/contact) jako podstronę `/contact` w projekcie
Astro — treścią i układem wierną źródłu, wykonaniem zgodną z językiem
wizualnym naszej strony.

## Decyzje klienta (2026-08-27)

1. **Wygląd jak nasza strona**, nie 1:1 ze źródłem. Typografia Satoshi,
   nasze tokeny, nasz rytm. Ze źródła bierzemy treść i strukturę układu.
2. **CONTACT w pasku nawigacji, za większym odstępem** od czterech
   filtrów — sygnał, że robi coś innego niż one.
3. **Portret w wersji 380 px**, bez czekania na oryginał od klientki.
4. **Stopka i Instagram wyłącznie na `/contact`**, nie na całej stronie.
5. **Błędy w tekście źródłowym poprawiamy** (patrz „Treść").

## Zakres

W zakresie:
- nowa podstrona `/contact`,
- statyczny nagłówek dla tej podstrony (osobny komponent Astro),
- odnośnik CONTACT w nagłówku siatki,
- portret w `src/assets`.

Poza zakresem, bez zmian:
- **mechanizmy** siatki: stan filtrów, `useProgressiveTiles`, intro, stagger
  wejścia. `Gallery.tsx` zmienia się wyłącznie o jeden odnośnik
  w znacznikach — żadnej zmiany stanu ani logiki,
- strony projektów `/work/[slug]`,
- stopka i Instagram na innych podstronach,
- wstępne ustawianie filtra po adresie (patrz „Rozważone i odrzucone").

## Treść

Nagłówek strony: **Contact Me**
Nagłówek kolumny tekstowej: **Pola Sobuń**

Angielski nagłówek na stronie z polskim bio jest celowy: tak jest na
źródle, a nasze etykiety filtrów też są angielskie (All, Commercial,
Portraits, Food). Zmiana na „Kontakt" rozjechałaby się z paskiem.

Cztery akapity, po poprawkach:

1. Absolwentka Uniwersytetu Łódzkiego (nowe media i kultura cyfrowa) oraz
   PWSFTViT (fotografia).
2. Fotografuje przede wszystkim ludzi (moda i reportaż), ale bliskie jej są
   również kompozycje foodowe/trashowe stille.
3. Pracowała z Rimmel, Allegro, Esotiq, Robert Kupisz i Henderson,
   Pudliszki, Kodano Optyk, Butik Optique itd.
4. Tworzy również dużo realizacji branded content z influencerami dla
   takich marek jak Zalando, LPP (Reserved, Cropp, House), CCC czy Inditex
   (Pull&Bear).

Dane kontaktowe:
- tel: 883 180 410
- mail: polasobun@gmail.com
- Instagram: https://www.instagram.com/polasobun/

### Poprawione błędy źródła

Klient zdecydował, że poprawiamy. Cztery zmiany wobec oryginału:

| W źródle | Poprawione | Uzasadnienie |
|---|---|---|
| „Publiszki" | Pudliszki | Marka występuje w projekcie jako `pudliszki` — pewne |
| „brandend content" | branded content | literówka |
| „thrashowe" | trashowe | literówka |
| „LPP (Reserved, Cropp, House, CCC czy Inditex (Pull&Bear)." | „LPP (Reserved, Cropp, House), CCC czy Inditex (Pull&Bear)." | dwa nawiasy otwierające przy jednym zamykającym; do tego CCC nie należy do LPP — to osobna spółka, a błąd rzeczowy o kliencie jest widoczny dla tego klienta |

Lista marek nie zmienia się — wstawiony jest wyłącznie brakujący nawias
we właściwym miejscu.

## Układ

**Desktop:** dwie kolumny — portret po lewej, kolumna tekstowa po prawej.
**Telefon:** jedna kolumna — nagłówek, portret, nazwisko, akapity, dane.

Telefon i mail są **klikalnymi odnośnikami** `tel:` i `mailto:`. Na źródle
są zwykłym tekstem, co na telefonie zmusza do przepisywania numeru ręcznie.

Zero nowych tokenów, zero wartości szesnastkowych, zero nowych zależności.

## Nagłówek

Podstrona dostaje **własny, statyczny nagłówek w Astro** — wizualnie
identyczny z tym w siatce, ale z odnośnikami zamiast przycisków:

- wordmark „Pola Sobuń" prowadzi do `/`,
- cztery kategorie jako odnośniki do `/`,
- większy odstęp, potem CONTACT wyróżniony jako bieżąca strona, bez
  odnośnika.

Nagłówek siatki (`Gallery.tsx`) dostaje ten sam odnośnik CONTACT z tym
samym odstępem. To dodanie jednego linku w znacznikach — **bez zmiany
stanu ani logiki**.

## Stopka

Wyłącznie na `/contact`: „Copyright © All rights reserved."

Odnośnik do Instagrama trafia **do danych kontaktowych**, nie do nagłówka:
telefon, mail i Instagram to jedna grupa, a nie ozdobnik przy nazwisku.
Wyświetlany w tej samej konwencji co pozostałe pozycje:
`instagram: @polasobun`, prowadzący do
https://www.instagram.com/polasobun/ (`rel="noopener"`).

## Portret

Plik pobrany z CDN-u Formatu w jedynej dostępnej wersji **380×380** i
zacommitowany do `src/assets`, żeby strona nie zależała od podpisanego
adresu, który może wygasnąć.

Rozmiar wyświetlania: **260 px**, zamiast 331 px ze źródła — i to na
KAŻDYM ekranie, także na telefonie.

To jawne odstępstwo od układu źródła, które na telefonie pokazuje portret
na całą szerokość kolumny (~344 px). Przy pliku 380 px pełna szerokość
oznaczałaby skalowanie 2,7× w górę przy dpr 3. Ograniczenie do 260 px
zmniejsza je do 2,1× kosztem mniejszego zdjęcia — świadomy wybór ostrości
nad wiernością, zgodny z decyzją „wygląd jak nasza strona".

| Ekran | Potrzeba | Mamy | Skalowanie |
|---|---|---|---|
| Desktop, dpr 1 | 260 px | 380 px | 0,7× w dół — ostro |
| Laptop retina, dpr 2 | 520 px | 380 px | 1,4× w górę |
| Telefon, dpr 3 | 780 px | 380 px | 2,1× w górę |

**Na telefonie portret będzie miękki i nic tego nie zmieni poza
oryginalnym plikiem.** 260 px to najlepsze, co da się wycisnąć bez robienia
z niego miniatury. Gdy klientka przyśle oryginał, podmiana to jedna linia
i wtedy rozmiar wraca do 331 px.

CDN Formatu podpisuje adresy HMAC-iem związanym z konkretnymi parametrami
kadru i rozmiaru: sprawdzone 2026-08-27, żądania o 1200×1200 i 2000×2000
zwracają 403. 380×380 to jedyna dostępna wersja.

## Rozważone i odrzucone

**Wyciągnięcie nagłówka do wspólnego komponentu.** Architektonicznie
lepsze — jedno źródło prawdy zamiast dwóch miejsc z tymi samymi klasami.
Odrzucone, bo wymaga przebudowy `Gallery.tsx` tak, żeby nagłówek
przychodził z zewnątrz przez slot, a to jest plik, w którym w tej samej
sesji naprawialiśmy lukę przy zmianie filtra i którego zachowanie
potwierdziliśmy dopiero pomiarem produkcyjnym. Duplikacja dwunastu linii
jest tańsza niż regresja w mechanizmie, który dopiero co przestał być
ruchomy. Gdy pojawi się trzecia strona z tym nagłówkiem, wyciągnięcie
będzie oczywiste i zrobimy je świadomie.

**Wstępne ustawianie filtra po adresie** (`/?widok=portraits`). Cztery
kategorie na `/contact` prowadzą do `/`, a siatka otwiera się na ALL.
Ustawianie filtra z adresu wymagałoby zmian w `Gallery.tsx` — czyli
dokładnie tego, czego unika wybrany wariant.

**Formularz kontaktowy.** Źródło go nie ma (sprawdzone: zero elementów
`form`, zero pól). Nie dokładamy funkcji, której klientka nie ma dziś
i o którą nie prosiła.

## Kryteria sukcesu

- `astro check` i `astro build` przechodzą bez błędów.
- Strona renderuje się poprawnie przy 412 px i 1440 px.
- Działają: `tel:`, `mailto:`, Instagram, wordmark → `/`, oraz odnośnik
  CONTACT z siatki → `/contact`.
- CLS zero, zero komunikatów w konsoli.
- **LCP siatki bez regresji** — dotykamy jej nagłówka, więc mierzymy
  ten sam profil tą samą metodyką: Slow 4G, CPU 4×, viewport 412×915,
  zimny cache przeglądarki, wyczyszczone `sessionStorage`,
  `history.scrollRestoration = 'manual'`, mediana z 3 prób.
  Wartość odniesienia z produkcji: **2388 ms**.
