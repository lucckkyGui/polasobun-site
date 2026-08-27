# Zakładka CONTACT — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Podstrona `/contact` z bio, portretem i danymi kontaktowymi klientki, dostępna z paska nawigacji siatki.

**Architecture:** Statyczna strona Astro z własnym nagłówkiem (czysty HTML, zero JS). Nagłówek siatki w `Gallery.tsx` dostaje jeden odnośnik — bez zmiany stanu ani logiki. Portret pobrany z CDN-u Formatu i zacommitowany jako lokalny zasób.

**Tech Stack:** Astro 7 (static), Tailwind 4 (tokeny w `global.css`), TypeScript strict, `astro:assets`.

## Global Constraints

- **Zero nowych zależności.** Jeśli czegoś brakuje — zapytaj, nie instaluj.
- **W projekcie nie ma frameworku testowego.** Rolę testu pełni `npm run build` (`astro check && astro build`) oraz asercje w przeglądarce. Każdy krok ma jawny warunek „przechodzi / nie przechodzi".
- **Zero wartości szesnastkowych** — wyłącznie tokeny z `src/styles/global.css`.
- **Komentarze po polsku**, wyjaśniają *dlaczego*, nie *co*.
- **Każde polecenie `git` poprzedzaj `LC_ALL=C LANG=C`** — pod polską lokalizacją git wywala się z `BUG: strbuf.c:400: your vsnprintf is broken`.
- **Nigdy `git stash` bez `-m`** (stos współdzielony między drzewami roboczymi).
- Wszystkie polecenia uruchamiaj z `polasobun/`, nie z korzenia repozytorium.
- **Nie uruchamiaj serwerów przez Bash** — od tego jest `mcp__Claude_Browser__preview_start`.

## Tokeny, których użyjesz

Wszystkie są już zdefiniowane w `src/styles/global.css`. Nie dodawaj nowych.

| Token | Wartość | Do czego |
|---|---|---|
| `text-display` / `text-display-lg` | 56 / 64 px | nagłówek „Contact Me" |
| `text-title` | 26 px | ten sam nagłówek na telefonie |
| `text-lead` | 20 px | nazwisko nad akapitami |
| `text-body-sm` | 16 px | akapity bio, dane kontaktowe |
| `text-label` | 11 px | nawigacja, etykiety danych, stopka |
| `text-wordmark` | 15 px | wordmark |
| `tracking-display` / `tracking-title` / `tracking-nav` / `tracking-wordmark` | −0.035em / −0.02em / 0.3em / 0.24em | jw. |
| `leading-prose` / `leading-caps` / `leading-none` | 1.62 / 1.5 / 1 | akapity, dane, nagłówki |
| `text-text` / `text-muted` | `#111110` / `#8a8a84` | kolory |
| `px-gutter`, `py-header`, `pt-topbar`, `pb-section`, `pb-page-end`, `mt-rule`, `pt-rule` | 26 / 22 / 34 / 60 / 120 / 70 / 70 px | odstępy pionowe i boczne |
| `gap-stack`, `gap-tight`, `gap-card`, `gap-gutter`, `gap-section`, `gap-block` | 9 / 10 / 24 / 26 / 60 / 90 px | odstępy w układach |
| `ml-topbar` | 34 px | separacja CONTACT od filtrów |

**PUŁAPKA NAZW — przeczytaj, zanim napiszesz `text-body`.**
`--color-body` i `--text-body` generują **tę samą klasę `text-body`**: jedna
z przestrzeni kolorów, druga z rozmiarów. Cały projekt dotąd tej klasy
unikał — używa `text-body-sm` na rozmiar oraz `text-text` / `text-muted`
na kolor. Nie pisz `text-body`, bo nie wiadomo, którą właściwość dostaniesz.

Kolor tekstu bio zapisz jawnie jako `text-[color:var(--color-body)]` — to
nadal token z `global.css`, nie wartość szesnastkowa, więc zasada „zero
hex" jest spełniona.

## Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `src/assets/portret-pola-sobun.jpg` (nowy) | portret 379×379 |
| `src/components/NaglowekKontakt.astro` (nowy) | statyczny pasek dla `/contact` |
| `src/pages/contact.astro` (nowy) | treść strony |
| `src/components/Gallery.tsx` (zmiana) | jeden odnośnik CONTACT |

---

### Task 1: Portret w repozytorium

**Files:**
- Create: `src/assets/portret-pola-sobun.jpg`

**Interfaces:**
- Consumes: nic.
- Produces: `src/assets/portret-pola-sobun.jpg`, 379×379 JPEG. Zadanie 2 importuje go przez `astro:assets`.

- [ ] **Step 1: Pobierz portret z CDN-u Formatu**

Adres jest podpisany HMAC-iem związanym z konkretnym kadrem i rozmiarem — nie zmieniaj w nim niczego, bo każda inna kombinacja zwraca 403 (sprawdzone dla 1200×1200 i 2000×2000).

```bash
cd polasobun
curl -sS -o src/assets/portret-pola-sobun.jpg \
  'https://format.creatorcdn.com/9a234d0f-c1fb-45cf-ac51-6d9c21eaaced/0/0/0/248,530,2257,2537,380,380/0-0-0/3b6be306-b3a5-49be-8805-d269bc448000/1/2/IMG_6192.JPG?fjkss=exp=2103445444~hmac=79777c3265dd2c7ac3b23fc880bfdc7e83d05fd7f8a10fba03a9a5ab190115e1'
```

- [ ] **Step 2: Sprawdź, że to naprawdę obraz 379×379**

```bash
cd polasobun
node --input-type=module -e "
import sharp from 'sharp';
const m = await sharp('src/assets/portret-pola-sobun.jpg').metadata();
console.log(m.format, m.width + 'x' + m.height, Math.round((await import('node:fs')).statSync('src/assets/portret-pola-sobun.jpg').size/1024) + ' kB');
"
```

**Warunek przejścia:** `jpeg 379x379`, waga około 26 kB.

Jeśli wyszedł plik o zerowej długości albo HTML z komunikatem błędu — adres wygasł albo został unieważniony. **Nie kombinuj z innymi parametrami** (wrócą 403). Zatrzymaj się i zgłoś, że portret trzeba pozyskać od klientki.

- [ ] **Step 3: Commit**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git add polasobun/src/assets/portret-pola-sobun.jpg
LC_ALL=C LANG=C git commit -m "feat: portret na strone kontaktowa

Jedyna wersja, jaka oddaje CDN Formatu — 379x379. Zadania o wieksze
rozmiary wracaja z 403, bo adres jest podpisany HMAC-iem zwiazanym
z konkretnym kadrem. Commitujemy lokalnie, zeby strona nie zalezala
od cudzego adresu.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Podstrona `/contact`

**Files:**
- Create: `src/components/NaglowekKontakt.astro`
- Create: `src/pages/contact.astro`

**Interfaces:**
- Consumes: `src/assets/portret-pola-sobun.jpg` z zadania 1.
- Produces: stronę pod `/contact`. Zadanie 3 dodaje do niej odnośnik z siatki.

- [ ] **Step 1: Napisz nagłówek**

Zapisz jako `src/components/NaglowekKontakt.astro`:

```astro
---
/**
 * Pasek nawigacji podstrony CONTACT.
 *
 * Wizualnie identyczny z paskiem siatki, ale statyczny: cztery kategorie
 * to odnośniki do strony głównej, nie przyciski filtrujące. Klasy są
 * świadomie zduplikowane wobec Gallery.tsx — wyciągnięcie wspólnego
 * komponentu wymagałoby przebudowy wyspy React, której zachowanie
 * potwierdziliśmy dopiero pomiarem produkcyjnym. Patrz specyfikacja,
 * sekcja „Rozważone i odrzucone".
 *
 * Kategorie prowadzą do `/` bez ustawiania filtra — siatka otwiera się
 * na ALL. Ustawianie filtra z adresu wymagałoby zmian w Gallery.tsx.
 */
const KATEGORIE = ['All', 'Commercial', 'Portraits', 'Food'];

/* Wspólne klasy pozycji nawigacji — jedno miejsce zamiast pięciu kopii. */
const POZYCJA = 'text-label font-medium uppercase leading-none tracking-nav';
---

<header
  class="bg-bg border-border sticky top-0 z-20 flex flex-col items-start gap-tight border-b px-gutter py-header sm:flex-row sm:items-center sm:justify-between sm:gap-0"
>
  <div class="flex w-full items-center justify-between sm:w-auto">
    <a
      href="/"
      class={`text-text text-wordmark whitespace-nowrap font-bold uppercase leading-none tracking-wordmark`}
    >
      Pola Sobuń
    </a>

    {/*
      Na telefonie CONTACT siedzi w wierszu wordmarku, nie w nawigacji.
      Pierwotnie zapisane „297 z 298 dostępnych pikseli, zapas 1 px" było
      błędem pomiarowym: zmierzono szerokość samego <nav>, flex o
      szerokości własnej zawartości, czyli porównano go z nim samym.
      Poprawnie: okno 412 px, padding nagłówka 2×26 px, dostępne dla
      treści 360 px; cztery kategorie zajmują ~298 px, zapas to 62 px,
      nie 1 px. Piąta pozycja i tak się nie mieści — potrzebuje ~74 px
      plus 10 px odstępu (84 px) przy wolnych 62 px. Zmierzone w wierszu
      wordmarku: 227 px wolnego przed dołożeniem CONTACT, 153 px po.
      Nagłówek jest sticky nad 53 ekranami siatki, więc nie chcemy go
      pogrubiać o drugą linię.
    */}
    <span class={`text-text ${POZYCJA} sm:hidden`} aria-current="page">Contact</span>
  </div>

  <nav class="flex items-center gap-tight sm:gap-gutter">
    {KATEGORIE.map((etykieta) => (
      <a href="/" class={`text-text ${POZYCJA} opacity-[0.38]`}>{etykieta}</a>
    ))}
    {/* Od sm CONTACT wraca na koniec paska, za odstępem większym niż
        między filtrami — sygnał, że opuszcza stronę, a nie filtruje. */}
    <span class={`text-text ${POZYCJA} hidden sm:ml-topbar sm:inline`} aria-current="page">
      Contact
    </span>
  </nav>
</header>
```

- [ ] **Step 2: Napisz stronę**

Zapisz jako `src/pages/contact.astro`:

```astro
---
import { Image } from 'astro:assets';
import Base from '../layouts/Base.astro';
import NaglowekKontakt from '../components/NaglowekKontakt.astro';
import portret from '../assets/portret-pola-sobun.jpg';

/**
 * Bio klientki, przepisane ze strony źródłowej z czterema poprawkami
 * uzgodnionymi 2026-08-27: „Publiszki" → Pudliszki, „brandend" → branded,
 * „thrashowe" → trashowe oraz domknięcie nawiasu przy LPP, które
 * przy okazji przestaje przypisywać CCC do tej grupy.
 */
const AKAPITY = [
  'Absolwentka Uniwersytetu Łódzkiego (nowe media i kultura cyfrowa) oraz PWSFTViT (fotografia).',
  'Fotografuje przede wszystkim ludzi (moda i reportaż), ale bliskie jej są również kompozycje foodowe/trashowe stille.',
  'Pracowała z Rimmel, Allegro, Esotiq, Robert Kupisz i Henderson, Pudliszki, Kodano Optyk, Butik Optique itd.',
  'Tworzy również dużo realizacji branded content z influencerami dla takich marek jak Zalando, LPP (Reserved, Cropp, House), CCC czy Inditex (Pull&Bear).',
];

/**
 * Na źródle telefon i mail są zwykłym tekstem, co na telefonie zmusza
 * do przepisywania numeru ręcznie. U nas są odnośnikami.
 */
const KONTAKT = [
  { etykieta: 'tel', tekst: '883 180 410', href: 'tel:+48883180410' },
  { etykieta: 'mail', tekst: 'polasobun@gmail.com', href: 'mailto:polasobun@gmail.com' },
  { etykieta: 'instagram', tekst: '@polasobun', href: 'https://www.instagram.com/polasobun/' },
];

/**
 * 260 px, nie 331 px jak na źródle, i to na KAŻDYM ekranie.
 * Plik ma 379 px i to jedyna wersja, jaką oddaje CDN Formatu. Pełna
 * szerokość kolumny na telefonie oznaczałaby skalowanie 2,7x w górę przy
 * dpr 3; 260 px zbija je do 2,1x. Świadomy wybór ostrości nad wiernością.
 * Gdy klientka przyśle oryginał, wraca 331 px.
 */
const PORTRET_PX = 260;
---

<Base title="Contact — Pola Sobuń">
  <NaglowekKontakt />

  <div class="pb-page-end">
    <div class="px-gutter pt-topbar pb-section">
      <h1 class="text-text text-title font-bold leading-none tracking-display sm:text-display lg:text-display-lg">
        Contact Me
      </h1>
    </div>

    <div class="flex flex-col gap-section px-gutter lg:flex-row lg:items-start lg:gap-block">
      <Image
        src={portret}
        format="webp"
        width={PORTRET_PX}
        height={PORTRET_PX}
        alt="Pola Sobuń"
        loading="eager"
        class="block shrink-0"
      />

      <div class="flex max-w-prose flex-col gap-card">
        <h2 class="text-text text-lead font-bold leading-none tracking-title">Pola Sobuń</h2>

        {AKAPITY.map((akapit) => (
          <p class="text-body-sm leading-prose text-[color:var(--color-body)]">{akapit}</p>
        ))}

        <dl class="mt-tight flex flex-col gap-stack">
          {KONTAKT.map(({ etykieta, tekst, href }) => (
            <div class="flex gap-tight">
              <dt class={`text-muted text-label font-medium uppercase leading-caps tracking-nav`}>
                {etykieta}
              </dt>
              <dd>
                <a
                  href={href}
                  rel="noopener"
                  class="text-text text-body-sm underline underline-offset-4 leading-caps"
                >
                  {tekst}
                </a>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>

    <footer class="border-border mt-rule px-gutter pt-rule">
      <p class="text-muted text-label font-normal uppercase leading-none tracking-nav">
        Copyright © All rights reserved.
      </p>
    </footer>
  </div>
</Base>
```

- [ ] **Step 3: Zbuduj**

```bash
cd polasobun
npm run build 2>&1 | tail -3
```

**Warunek przejścia:** build bez błędów, `astro check` też. Jeśli `max-w-prose` nie istnieje w tej konfiguracji Tailwinda — zastąp `max-w-[68ch]` i odnotuj to w raporcie.

- [ ] **Step 4: Sprawdź wygenerowaną stronę**

```bash
cd polasobun
test -f dist/contact/index.html && echo 'strona istnieje' || echo 'BRAK'
grep -c 'Pudliszki' dist/contact/index.html
grep -c 'Publiszki\|brandend\|thrashowe' dist/contact/index.html
grep -o 'href="tel:[^"]*"\|href="mailto:[^"]*"\|href="https://www.instagram[^"]*"' dist/contact/index.html
grep -o 'LPP ([^)]*)' dist/contact/index.html
```

**Warunki przejścia:** strona istnieje; `Pudliszki` występuje raz; **stare błędy zero razy**; trzy odnośniki `tel:`, `mailto:`, instagram; `LPP (Reserved, Cropp, House)` — nawias domknięty.

- [ ] **Step 5: Obejrzyj w przeglądarce**

Podnieś podgląd (`mcp__Claude_Browser__preview_start` z `{name: "polasobun-preview"}`, port 4322) i użyj `mcp__chrome-devtools__*` (odroczone — wczytaj jednym ToolSearch: `select:mcp__chrome-devtools__new_page,mcp__chrome-devtools__navigate_page,mcp__chrome-devtools__emulate,mcp__chrome-devtools__evaluate_script,mcp__chrome-devtools__take_screenshot,mcp__chrome-devtools__list_console_messages`).

Sprawdź **oba** układy i zrób zrzut każdego:
- `1440x900x1` — dwie kolumny, portret po lewej
- `412x915x1,mobile,touch` — jedna kolumna, CONTACT w wierszu wordmarku

Odczytaj też:

```js
() => {
  const nav = document.querySelector('header nav');
  const poz = [...nav.children].map(e => Math.round(e.getBoundingClientRect().width));
  const suma = poz.reduce((a,b) => a+b, 0);
  const img = document.querySelector('main img, img');
  return {
    szerokoscOkna: innerWidth,
    navZajete: suma,
    navDostepne: Math.round(nav.getBoundingClientRect().width),
    przepelnienie: document.documentElement.scrollWidth > innerWidth,
    portretCSS: Math.round(img.getBoundingClientRect().width),
    portretNaturalny: img.naturalWidth,
  };
}
```

**Warunki przejścia:** `przepelnienie: false` przy 412 px **i** przy 1440 px; portret 260 px CSS; zero komunikatów w konsoli.

- [ ] **Step 5b: Sprawdź CLS i działanie odnośników**

Specyfikacja wymaga zerowego CLS i działających odnośników — samo istnienie
`href` w HTML tego nie dowodzi.

CLS: wejdź na `/contact` z `initScript` wpinającym obserwator przesunięć
(blok jest w planie dwustopniowego ładowania, w sekcji „Stanowisko
pomiarowe"), odczekaj 5 s i odczytaj wartość.

**Warunek przejścia:** CLS równy 0. Jeśli większy — najczęstszą przyczyną
jest brak `width`/`height` na obrazie, sprawdź to najpierw.

Nawigacja: kliknij wordmark i sprawdź, że trafiasz na `/`; wróć i kliknij
jedną z kategorii — też ma prowadzić do `/`.

```js
() => ({ adres: location.pathname })
```

**Warunek przejścia:** po obu kliknięciach `adres` równy `/`.

- [ ] **Step 6: Commit**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git add polasobun/src/components/NaglowekKontakt.astro polasobun/src/pages/contact.astro
LC_ALL=C LANG=C git commit -m "feat: podstrona kontaktowa

Tresc i uklad ze strony zrodlowej, wykonanie w naszej typografii.
Telefon, mail i Instagram sa odnosnikami — na zrodle sa zwyklym tekstem.

Naglowek jest osobnym, statycznym komponentem: klasy zduplikowane wobec
Gallery.tsx swiadomie, zeby nie przebudowywac wyspy React.

Na telefonie CONTACT siedzi w wierszu wordmarku. Przy 412 px, po
odjeciu paddingu naglowka (2x26 px), na cztery kategorie zostaje
360 px, a zajmuja one ~298 px — piata pozycja i tak by sie nie zmiescila.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 3: Odnośnik CONTACT w nagłówku siatki

**Files:**
- Modify: `src/components/Gallery.tsx` — wyłącznie znaczniki nagłówka

**Interfaces:**
- Consumes: stronę `/contact` z zadania 2.
- Produces: nic dla dalszych zadań.

- [ ] **Step 1: Dodaj odnośnik**

W `src/components/Gallery.tsx` znajdź element `<header>`. Zmień go tak, żeby wordmark i mobilny CONTACT siedziały we wspólnym wierszu, a desktopowy CONTACT dołączył na koniec nawigacji.

Zastąp `<span>` z wordmarkiem tym blokiem:

```tsx
        <div className="flex w-full items-center justify-between sm:w-auto">
          <span className="text-text text-wordmark whitespace-nowrap font-bold uppercase leading-none tracking-wordmark">
            {wordmark}
          </span>

          {/*
            Na telefonie CONTACT siedzi w wierszu wordmarku, nie w pasku
            filtrów. Pierwotnie zapisane „297 z 298 dostępnych pikseli"
            było błędem pomiarowym — zmierzono szerokość samego <nav>,
            flex o szerokości własnej zawartości, czyli porównano go
            z nim samym. Poprawnie: okno 412 px, padding nagłówka
            2×26 px, dostępne dla treści 360 px; cztery filtry zajmują
            ~298 px, zapas to 62 px, nie 1 px. Piąta pozycja i tak się
            nie mieści: potrzebuje ~74 px plus 10 px odstępu (84 px)
            przy wolnych 62 px. Nagłówek jest sticky nad 53 ekranami
            siatki, więc druga linia też odpada.
          */}
          <a
            href="/contact"
            className="text-text text-label font-medium uppercase leading-none tracking-nav opacity-[0.38] sm:hidden"
          >
            Contact
          </a>
        </div>
```

i dopisz na końcu `<nav>`, **po** bloku `{FILTERS.map(...)}`:

```tsx
          {/* Odstęp większy niż między filtrami — sygnał, że ten element
              opuszcza stronę, a nie filtruje siatkę w miejscu. */}
          <a
            href="/contact"
            className="text-text text-label hidden font-medium uppercase leading-none tracking-nav opacity-[0.38] sm:ml-topbar sm:inline"
          >
            Contact
          </a>
```

Dodaj też `items-center` do klas `<nav>`, żeby odnośnik wyrównał się z przyciskami:

```tsx
        <nav className="flex items-center gap-tight sm:gap-gutter">
```

**Nie ruszaj niczego poza znacznikami nagłówka.** Żadnych zmian w `filter`, `pending`, `choose`, `OUT_MS`, `gridRef` ani w wywołaniu `useProgressiveTiles`.

- [ ] **Step 2: Zbuduj**

```bash
cd polasobun
npm run build 2>&1 | tail -3
```

**Warunek przejścia:** build i `astro check` bez błędów.

- [ ] **Step 3: Sprawdź, że pasek się nie rozsypał**

W przeglądarce, na stronie głównej podglądu, przy `412x915x1,mobile,touch` oraz `1440x900x1`:

```js
() => ({
  szerokoscOkna: innerWidth,
  przepelnienie: document.documentElement.scrollWidth > innerWidth,
  wysokoscNaglowka: Math.round(document.querySelector('header').getBoundingClientRect().height),
  contactWidoczny: [...document.querySelectorAll('a[href="/contact"]')]
    .filter(a => a.getBoundingClientRect().width > 0).length,
})
```

**Warunki przejścia:** `przepelnienie: false` na obu szerokościach; `contactWidoczny: 1` na obu (jedna kopia widoczna, druga schowana); wysokość nagłówka na telefonie **taka sama jak przed zmianą** — zmierz ją przed edycją i podaj obie liczby.

Kliknij następnie widoczny odnośnik CONTACT i sprawdź `location.pathname`.

**Warunek przejścia:** `/contact`. To domyka wymaganie ze specyfikacji, że
podstrona jest osiągalna z siatki — bez tego cała reszta jest niedostępna
dla odwiedzającego.

- [ ] **Step 4: Sprawdź, że filtry nadal działają**

Kliknij PORTRAITS, potem FOOD, potem ALL. Po każdym kliknięciu odczytaj:

```js
() => ({
  filtr: document.querySelector('[data-filter]').getAttribute('data-filter'),
  widocznych: [...document.querySelectorAll('[data-cat]')].filter(k => getComputedStyle(k).display !== 'none').length,
})
```

**Warunki przejścia:** `filtr` zmienia się zgodnie z klikniętym przyciskiem; liczba widocznych kafli zmienia się (ALL = 100, COMMERCIAL = 15).

- [ ] **Step 5: Zmierz LCP siatki — bramka braku regresji**

To jedyne miejsce, gdzie dotykamy strony, której wydajność mierzyliśmy. Metodyka musi się zgadzać co do joty, inaczej liczby nie znaczą nic.

- podgląd lokalny na porcie 4322, narzędzia `mcp__chrome-devtools__*`
- emulacja: viewport `412x915x1,mobile,touch`, sieć `Slow 4G`, procesor `4`
- `navigate_page` z `ignoreCache: true`, świeży `isolatedContext` albo przeładowanie
- `initScript` musi zawierać **oba**: `history.scrollRestoration = 'manual'` oraz `sessionStorage.removeItem('polasobun:intro-played')`
- odczyt po ~9 s, **trzy próby, mediana**

**PUŁAPKA:** `performance.getEntriesByType('largest-contentful-paint')` zwraca pustą tablicę Z DEFINICJI. Metryki wyłącznie przez `PerformanceObserver` z `buffered: true` wpięty przez `initScript`. Gotowy blok jest w planie dwustopniowego ładowania, w sekcji „Stanowisko pomiarowe": `docs/superpowers/plans/2026-08-27-dwustopniowe-ladowanie-siatki.md`. Przeczytaj SAMĄ tę sekcję.

**DRUGA PUŁAPKA:** przeładowanie odtwarza pozycję przewijania. Bez `history.scrollRestoration = 'manual'` zmierzysz wejście w środek siatki i dostaniesz fałszywy wynik — zdarzyło się to już raz w tym projekcie.

**Warunek przejścia:** mediana LCP **nie gorsza niż 2388 ms** (wartość produkcyjna sprzed tej zmiany, ten sam profil). Pomiar lokalny bywa szybszy od produkcyjnego — jeśli wyjdzie wyraźnie niżej, to normalne; niepokojące byłoby wyraźnie wyżej.

Podaj trzy surowe wartości i medianę.

- [ ] **Step 6: Commit**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git add polasobun/src/components/Gallery.tsx
LC_ALL=C LANG=C git commit -m "feat: odnosnik CONTACT w pasku siatki

Wylacznie znaczniki naglowka — zero zmian w stanie filtrow, hydratacji
i podnoszeniu kafli.

Na telefonie odnosnik siedzi w wierszu wordmarku, bo z 360 px dostepnych
przy 412 px (po odjeciu paddingu naglowka) cztery filtry zajmuja juz
~298 px. Od sm wraca na koniec paska, za odstepem wiekszym niz miedzy
filtrami.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Dokumentacja, push, PR

**Files:**
- Modify: `polasobun/AGENTS.md` (dowiązany jako `CLAUDE.md`)

**Interfaces:**
- Consumes: wyniki zadań 1–3.
- Produces: nic dla kodu.

- [ ] **Step 1: Dopisz sekcję do CLAUDE.md**

`CLAUDE.md` i `AGENTS.md` to **ten sam plik** (dowiązanie symboliczne) — sprawdź `ls -l`, edytuj jeden, nie commituj obu.

W stylu istniejących wpisów (fakt, liczba, przestroga) opisz:

- że pasek nawigacji istnieje w **dwóch** miejscach — `Gallery.tsx` i `NaglowekKontakt.astro` — i dlaczego świadomie, z odsyłaczem do specyfikacji,
- że przy 412 px, po odjęciu paddingu nagłówka, cztery filtry zajmują **~298 z 360 dostępnych pikseli** (zapas 62 px, nie wcześniej błędnie zmierzony 1 px), a mimo to piąta pozycja się nie mieści, więc musi iść w wiersz wordmarku, a nie w pasek,
- że portret ma 379 px, bo CDN Formatu podpisuje adresy HMAC-iem i zwraca 403 na inne rozmiary; wyświetlany w 260 px i **na telefonie pozostaje miękki** do czasu otrzymania oryginału,
- że tekst bio zawiera **cztery poprawki wobec źródła** — wypisz je z tabelki ze specyfikacji, bo bez tego ktoś kiedyś „naprawi" je z powrotem do wersji ze strony klientki.

- [ ] **Step 2: Zbuduj po raz ostatni**

```bash
cd polasobun
npm run build 2>&1 | tail -3
```

**Warunek przejścia:** bez błędów.

- [ ] **Step 3: Commit i push**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git add polasobun/AGENTS.md
LC_ALL=C LANG=C git commit -m "docs: zakladka CONTACT

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
LC_ALL=C LANG=C git push -u origin osurmo/astro-project-setup-df1cf5
```

- [ ] **Step 4: Otwórz PR**

`gh pr create --base main`. Opis ma zawierać:
- co powstało i skąd wzięta treść,
- **tabelkę czterech poprawionych błędów** — to jedyne miejsce, gdzie zmieniamy słowa klientki, i musi być widoczne przy przeglądaniu,
- pomiar LCP siatki przed i po, z metodyką,
- ograniczenie portretu (379 px, miękki na telefonie) i co je zdejmie,
- zrzuty obu układów, jeśli narzędzie pozwala je dołączyć,
- na końcu: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

**Nie mierz produkcji** — to dzieje się po scaleniu przez klienta. Napisz w raporcie, że krok pominięty świadomie.

---

## Kolejność i bramki

```
Task 1 (portret)
   └─ przy 403/pustym pliku: STOP, portret trzeba pozyskać od klientki
Task 2 (podstrona)      ─ bramka: brak przepełnienia przy 412 i 1440 px
Task 3 (odnośnik)       ─ bramka: LCP siatki nie gorsze niż 2388 ms
Task 4 (dokumentacja, PR)
```
