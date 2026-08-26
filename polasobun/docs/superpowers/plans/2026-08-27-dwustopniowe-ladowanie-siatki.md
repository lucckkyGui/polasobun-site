# Dwustopniowe ładowanie siatki — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Siatka na stronie głównej ładuje najpierw lekkie kadry (~15 kB), a pełną jakość dociąga dopiero po zwolnieniu przewijania — żeby LCP zeszło poniżej 2000 ms i zniknęły puste kafle przy szybkim przewijaniu.

**Architecture:** Każde zdjęcie siatki ma dwa warianty generowane w buildzie przez `getImage()`. HTML niesie wariant lekki w `src` i ścieżkę do ostrego w `data-pelny`. Hook `useProgressiveTiles` obserwuje kafle, wykrywa bezruch przewijania i podmienia `src` po `decode()`. Logika ładowania wychodzi z `Gallery.tsx`, który zostaje wyłącznie przy filtrach.

**Tech Stack:** Astro 7 (static), React 19 (wyspy), Tailwind 4, TypeScript strict, `astro:assets` (sharp).

## Global Constraints

- **Zero nowych zależności.** Jeśli czegoś brakuje — zapytaj, nie instaluj. Dotyczy też frameworków testowych.
- **W projekcie nie ma frameworku testowego.** Rolę testu pełni `npm run build` (czyli `astro check && astro build`) oraz asercje wykonywane w przeglądarce na stanowisku pomiarowym. Każde zadanie ma jawny warunek „przechodzi / nie przechodzi".
- **Komentarze po polsku**, w gęstości i tonie zgodnym z otoczeniem — wyjaśniają *dlaczego*, nie *co*.
- **Zero wartości szesnastkowych w komponentach** — wyłącznie tokeny z `global.css`.
- **Git pod polską lokalizacją się wywala** (`BUG: strbuf.c:400: your vsnprintf is broken`). Każde polecenie `git` poprzedzaj `LC_ALL=C LANG=C`.
- **Nigdy `git stash` bez `-m`** — stos jest współdzielony z innymi drzewami roboczymi.
- Wszystkie polecenia uruchamiaj z `polasobun/`, nie z korzenia repozytorium.

## Stanowisko pomiarowe (używane w zadaniach 0, 5, 6, 7)

Ustawienie musi być identyczne w każdym pomiarze, inaczej liczb nie da się porównać:

- podgląd lokalny `polasobun-preview` (port 4322) — **nie** `astro dev`,
- Chrome DevTools MCP: `emulate` → viewport `412x915x1,mobile,touch`, sieć `Slow 4G`, procesor `4`,
- osobny kontekst (`isolatedContext`) albo `navigate_page` z `ignoreCache: true`,
- `initScript` czyszczący `sessionStorage.removeItem('polasobun:intro-played')`, żeby intro grało jak przy pierwszym wejściu,
- 3 próby, wynik = mediana.

Metryki zbiera obserwator wpinany przez `initScript` **przed** skryptami
strony — inaczej pierwsze malowanie zdąży się wydarzyć, zanim ktokolwiek
słucha. Ten sam blok w każdym pomiarze:

```js
try { sessionStorage.removeItem('polasobun:intro-played'); } catch {}
window.__m = { lcp: 0, fcp: 0, cls: 0, historia: [] };
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) {
    window.__m.lcp = Math.round(e.startTime);
    const el = e.element;
    const r = el ? el.getBoundingClientRect() : null;
    window.__m.historia.push({
      t: Math.round(e.startTime),
      tag: el ? el.tagName : null,
      url: (e.url || '').split('/').pop() || null,
      rozmiar: e.size,
      gora: r ? Math.round(r.top) : null,
    });
  }
}).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) if (e.name === 'first-contentful-paint') window.__m.fcp = Math.round(e.startTime);
}).observe({ type: 'paint', buffered: true });
new PerformanceObserver((l) => {
  for (const e of l.getEntries()) if (!e.hadRecentInput) window.__m.cls += e.value;
}).observe({ type: 'layout-shift', buffered: true });
```

Odczyt po ~9 s od wejścia (na Slow 4G strona schodzi ~5 s):

```js
async () => {
  await new Promise((r) => setTimeout(r, 9000));
  const img = performance.getEntriesByType('resource').filter((x) => /\.(webp|avif)$/.test(x.name));
  return {
    lcp: window.__m.lcp, fcp: window.__m.fcp, cls: +window.__m.cls.toFixed(3),
    historia: window.__m.historia,
    obrazow: img.length,
    bajtowKB: Math.round(img.reduce((s, x) => s + x.encodedBodySize, 0) / 1024),
  };
}
```

**Wartości odniesienia (zmierzone 2026-08-26):** LCP 3564 ms, CLS 0,00, 607 kB, 6 obrazów.

---

### Task 0: Bramka ryzyka — czy podmiana `src` wystawia nowy kandydat na LCP

Jeśli podmiana lekkiego kadru na ostry liczy się jako nowe malowanie, LCP wróci na ~3 s i **cały projekt nie da nic**. Sprawdzamy to zanim powstanie jakikolwiek kod produkcyjny.

**Files:**
- Create: `public/_sonda-lcp.html` (usuwany w kroku 6, nigdy nie commitowany)
- Create: `public/_sonda-lekki.webp`, `public/_sonda-ostry.webp` (jw.)

**Interfaces:**
- Consumes: nic.
- Produces: decyzję „idziemy dalej" albo „wracamy do klienta". Żadnego kodu.

- [ ] **Step 1: Wygeneruj dwa warianty testowe**

```bash
node --input-type=module -e "
import sharp from 'sharp';
const zrodlo = 'src/assets/photos/pandora/02.jpg';
await sharp(zrodlo).resize(400, 500, { fit: 'cover' }).webp({ quality: 62 }).toFile('public/_sonda-lekki.webp');
await sharp(zrodlo).resize(1000, 1250, { fit: 'cover' }).webp({ quality: 78 }).toFile('public/_sonda-ostry.webp');
"
ls -l public/_sonda-*.webp
```

- [ ] **Step 2: Napisz stronę sondy**

Zapisz jako `public/_sonda-lcp.html`:

```html
<!doctype html>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Sonda LCP</title>
<style>
  body { margin: 0; background: #111110; }
  img { display: block; width: 100%; aspect-ratio: 4 / 5; object-fit: cover; }
  pre { color: #f5f5f2; font: 12px monospace; padding: 8px; white-space: pre-wrap; }
</style>
<img id="kafel" src="/_sonda-lekki.webp" width="1000" height="1250" alt="">
<pre id="wynik">czekam…</pre>
<script>
  window.__kandydaci = [];
  new PerformanceObserver((lista) => {
    for (const e of lista.getEntries()) {
      window.__kandydaci.push({
        t: Math.round(e.startTime),
        rozmiar: e.size,
        url: (e.url || '').split('/').pop(),
      });
    }
  }).observe({ type: 'largest-contentful-paint', buffered: true });

  // Podmiana po 3 s — daleko poza momentem pierwszego malowania, żeby
  // ewentualny nowy kandydat był jednoznacznie rozpoznawalny po czasie.
  setTimeout(async () => {
    const kafel = document.getElementById('kafel');
    const wstepny = new Image();
    wstepny.src = '/_sonda-ostry.webp';
    await wstepny.decode();
    kafel.src = '/_sonda-ostry.webp';
    window.__podmiana = Math.round(performance.now());
  }, 3000);

  setTimeout(() => {
    document.getElementById('wynik').textContent = JSON.stringify(
      { podmianaW: window.__podmiana, kandydaci: window.__kandydaci }, null, 1);
  }, 6000);
</script>
```

- [ ] **Step 3: Uruchom sondę na stanowisku**

Podnieś `polasobun-preview`, ustaw emulację jak w sekcji „Stanowisko pomiarowe", wejdź na `http://localhost:4322/_sonda-lcp.html`.

Uwaga: `astro preview` serwuje `dist/`, więc najpierw `npm run build`, żeby pliki z `public/` trafiły do `dist/`.

- [ ] **Step 4: Odczytaj wynik**

W przeglądarce, po ponad 6 s od wejścia:

```js
() => ({ podmianaW: window.__podmiana, kandydaci: window.__kandydaci })
```

**Warunek przejścia:** lista `kandydaci` **nie** zawiera wpisu z `t` bliskim `podmianaW` (czyli ~3000 ms). Jeśli ostatni kandydat ma czas z okolic pierwszego malowania — ryzyko nie istnieje, idziemy dalej.

**Warunek odrzucenia:** pojawia się kandydat w okolicy 3000 ms. Wtedy **ZATRZYMAJ SIĘ**, nie pisz kodu produkcyjnego, wróć do klienta z wynikiem i decyzją do podjęcia.

- [ ] **Step 5: Zapisz wynik pomiaru w planie**

Dopisz odczytane liczby do tego pliku, pod tym zadaniem, żeby dało się je później odtworzyć.

- [ ] **Step 6: Posprzątaj sondę**

```bash
rm public/_sonda-lcp.html public/_sonda-lekki.webp public/_sonda-ostry.webp
LC_ALL=C LANG=C git status --short
```

Oczekiwane: `git status` pusty. Sonda nigdy nie trafia do repozytorium.

---

### Task 1: Usunięcie martwych fallbacków JPEG

Niezależna wartość: build i `dist` chudną o połowę, zanim dotkniemy dwustopniowości.

**Odstępstwo od specyfikacji, do świadomego przyjęcia:** sekcja „Zakres" mówi, że strony projektów zostają bez zmian, ale liczba 1054 JPEG-ów obejmuje właśnie je. Zdjęcie fallbacku ze stron projektów **nie** czyni ich dwupoziomowymi — zostają jednopoziomowe, tracą tylko plik, którego żadna dzisiejsza przeglądarka nie pobiera.

**Files:**
- Modify: `src/pages/work/[slug].astro:2` (import), `:83-91` (markup)
- Modify: `src/pages/index.astro:2` (import), `:182-188` (markup)

**Interfaces:**
- Consumes: nic.
- Produces: `dist/_astro/` bez plików `.jpg`. Zadanie 2 zakłada, że siatka używa już `<Image>`, nie `<Picture>`.

- [ ] **Step 1: Zapisz stan wyjściowy do porównania**

```bash
cd polasobun
ls dist/_astro/*.jpg 2>/dev/null | wc -l
ls dist/_astro/*.webp 2>/dev/null | wc -l
```

Oczekiwane dziś: 1054 jpg, 994 webp.

- [ ] **Step 2: Zamień `Picture` na `Image` na stronie projektu**

W `src/pages/work/[slug].astro` zmień import w linii 2:

```astro
import { Image } from 'astro:assets';
```

i markup (linie 83–91):

```astro
          <Image
            src={img}
            format="webp"
            widths={WIDTHS}
            sizes={SIZES}
            alt={`${project.title} — ${name}`}
            loading={index === 0 ? 'eager' : 'lazy'}
            class="block w-full"
          />
```

Różnica jest w jednym: `<Picture formats={['webp']}>` buduje `<picture>` z `<source>` w WebP i `<img>` w formacie ŹRÓDŁOWYM, czyli generuje komplet JPEG-ów jako zapasowy. `<Image format="webp">` daje samo `<img>` w WebP, bez zapasu. WebP obsługuje każda przeglądarka od 2020 roku.

- [ ] **Step 3: To samo w siatce**

W `src/pages/index.astro` zmień import w linii 2 na:

```astro
import { Image, getImage } from 'astro:assets';
```

i markup (linie 182–188):

```astro
          <Image
            src={tile.img}
            format="webp"
            width={TILE_WIDTH}
            height={TILE_HEIGHT}
            alt={tile.alt}
            loading={index < EAGER_COUNT ? 'eager' : 'lazy'}
            fetchpriority={index === 0 ? 'high' : undefined}
            class="aspect-tile block w-full object-cover"
          />
```

- [ ] **Step 4: Zbuduj i sprawdź, że JPEG-i zniknęły**

```bash
cd polasobun
rm -rf dist node_modules/.astro
time npm run build 2>&1 | tail -3
ls dist/_astro/*.jpg 2>/dev/null | wc -l
ls dist/_astro/*.webp 2>/dev/null | wc -l
```

**Warunek przejścia:** 0 plików `.jpg`, liczba `.webp` bez zmian (~994), build kończy się bez błędu, czas builda **krótszy** niż dotychczasowe 1m24s.

- [ ] **Step 5: Sprawdź, że strony nadal renderują obrazy**

```bash
cd polasobun
grep -c '<img' dist/index.html
grep -o '<picture' dist/index.html | wc -l
```

**Warunek przejścia:** liczba `<img>` co najmniej 275, liczba `<picture>` równa 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git add polasobun/src/pages/index.astro polasobun/src/pages/work/
LC_ALL=C LANG=C git commit -m "perf: koniec z martwymi fallbackami JPEG

Picture z formats=['webp'] budowal <source> w WebP i <img> w formacie
zrodlowym, czyli komplet 1054 JPEG-ow wazacych 339 MB jako zapas dla
przegladarek sprzed 2020 roku. Zadna dzisiejsza ich nie pobierala.

Image z format='webp' daje samo <img>, bez zapasu.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 2: Dwa warianty na kafel siatki

**Files:**
- Modify: `src/pages/index.astro` — frontmatter (dodanie generowania wariantów) i markup siatki

**Interfaces:**
- Consumes: `getImage` z `astro:assets`, tablicę `tiles` z frontmattera.
- Produces: w HTML każdy obraz siatki ma `src` z wariantem lekkim i atrybut `data-pelny` ze ścieżką do ostrego. Zadanie 3 czyta wyłącznie `data-pelny`.

- [ ] **Step 1: Dodaj stałe i generowanie wariantów**

W `src/pages/index.astro`, obok istniejących `TILE_WIDTH` / `TILE_HEIGHT`, zastąp je parą poziomów:

```ts
/**
 * Dwa poziomy jakości. Powód jest w pomiarze, nie w wadze: na łączu
 * o opóźnieniu 576 ms transfer ogranicza LICZBA OBROTÓW, nie bajty.
 * Kafel 1000 px potrzebuje ~4 obrotów (~2,3 s), kafel 400 px mieści się
 * w jednym–dwóch. Dlatego HTML niesie lekki, a ostry dochodzi później.
 *
 * Proporcja obu musi być identyczna (4:5), inaczej podmiana przesunie
 * układ i CLS przestanie być zerowy.
 */
const LEKKI = { width: 400, height: 500 };
const OSTRY = { width: 1000, height: 1250 };

/**
 * Warianty liczone raz, w kolejności zgodnej z `tiles` — markup sięga
 * po indeks, więc obie tablice muszą pozostać równoległe.
 */
const warianty = await Promise.all(
  tiles.map(async (tile) => {
    const [lekki, ostry] = await Promise.all([
      getImage({ src: tile.img, ...LEKKI, format: 'webp' }),
      getImage({ src: tile.img, ...OSTRY, format: 'webp' }),
    ]);
    return { lekki: lekki.src, ostry: ostry.src };
  }),
);
```

- [ ] **Step 2: Podmień markup na zwykły `<img>`**

Zastąp `<Image>` z zadania 1 (linie ~182–190) treścią:

```astro
          <img
            src={warianty[index].lekki}
            data-pelny={warianty[index].ostry}
            width={OSTRY.width}
            height={OSTRY.height}
            alt={tile.alt}
            loading={index < EAGER_COUNT ? 'eager' : 'lazy'}
            fetchpriority={index === 0 ? 'high' : undefined}
            class="aspect-tile block w-full object-cover"
          />
```

Atrybuty `width`/`height` opisują wariant OSTRY, nie ten w `src`. To celowe: podają przeglądarce proporcję 4:5, która jest wspólna obu wariantom, a docelowym stanem kafla jest wersja ostra. Rozmiar na ekranie i tak narzuca CSS (`aspect-tile` + `w-full`).

Usuń import `Image` z linii 2, jeśli nic go już nie używa — zostaje `getImage`.

- [ ] **Step 3: Zbuduj**

```bash
cd polasobun
npm run build 2>&1 | tail -3
```

**Warunek przejścia:** build bez błędu.

- [ ] **Step 4: Sprawdź, że HTML niesie oba warianty**

```bash
cd polasobun
grep -c 'data-pelny' dist/index.html
node --input-type=module -e "
import fs from 'node:fs'; import sharp from 'sharp'; import path from 'node:path';
const h = fs.readFileSync('dist/index.html','utf8');
const m = [...h.matchAll(/<img[^>]*src=\"([^\"]+)\"[^>]*data-pelny=\"([^\"]+)\"/g)];
console.log('kafli z dwoma wariantami:', m.length);
const [ , lekki, ostry ] = m[0];
for (const [nazwa, p] of [['lekki', lekki], ['ostry', ostry]]) {
  const { width, height } = await sharp(path.join('dist', p.replace(/^\//,''))).metadata();
  const kB = Math.round(fs.statSync(path.join('dist', p.replace(/^\//,''))).size / 1024);
  console.log(' ', nazwa, width + 'x' + height, kB + ' kB');
}
"
```

**Warunek przejścia:** 275 kafli z `data-pelny`; wariant lekki to 400×500 i **waży poniżej 25 kB**; ostry to 1000×1250.

Jeśli lekki przekracza 25 kB, obniż jakość w wywołaniu `getImage` (`quality: 62`) i powtórz krok — waga poniżej ~15 kB jest celem, bo to ona decyduje o liczbie obrotów.

- [ ] **Step 5: Commit**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git add polasobun/src/pages/index.astro
LC_ALL=C LANG=C git commit -m "feat: dwa warianty jakosci na kafel siatki

HTML niesie wariant lekki (400x500, ~15 kB) w src i sciezke do ostrego
(1000x1250) w data-pelny. Podmiany jeszcze nie ma — to zadanie 3.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

Po tym commicie siatka jest w całości miękka. To stan przejściowy, oczekiwany.

---

### Task 3: `useProgressiveTiles` — podmiana po zwolnieniu przewijania

**Files:**
- Create: `src/components/useProgressiveTiles.ts`
- Modify: `src/components/Gallery.tsx` — usunięcie obecnego obserwatora (linie 53–99), wpięcie hooka

**Interfaces:**
- Consumes: `data-pelny` z zadania 2; `gridRef` z `Gallery.tsx`.
- Produces: `useProgressiveTiles(gridRef: RefObject<HTMLDivElement | null>): void` — jedyny eksport, bez wartości zwracanej.

- [ ] **Step 1: Napisz hook**

Zapisz jako `src/components/useProgressiveTiles.ts`:

```ts
import { useEffect, type RefObject } from 'react';

/** Po tylu ms bez zdarzenia scroll uznajemy, że użytkownik się zatrzymał. */
const BEZRUCH_MS = 150;

/** Zasięg obserwatora — jeden ekran w każdą stronę. */
const ZASIEG = '100% 0px';

/**
 * Podnoszenie kafli do pełnej jakości.
 *
 * HTML niesie wariant lekki, bo na łączu o dużym opóźnieniu decyduje
 * liczba obrotów sieci, a nie waga. Wersja ostra dochodzi dopiero, gdy
 * przewijanie zwolni — kto przewija na wylot, nie pobiera jej wcale.
 *
 * Startujemy dopiero po zdarzeniu load. Wcześniej podnoszenie
 * konkurowałoby o pasmo z pierwszym ekranem i zjadło cały zysk na LCP,
 * czyli dokładnie to, po co ten mechanizm powstał.
 */
export function useProgressiveTiles(gridRef: RefObject<HTMLDivElement | null>): void {
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const kolejka = new Set<HTMLImageElement>();
    let obserwator: IntersectionObserver | null = null;
    let timer: number | null = null;
    let zywy = true;

    /**
     * Czekamy na decode() przed podmianą src. Bez tego przeglądarka
     * najpierw czyści kafel, a potem maluje nowy obraz — czyli mignięcie
     * pustym miejscem dokładnie tam, gdzie użytkownik patrzy.
     */
    const podnies = async (img: HTMLImageElement): Promise<void> => {
      const pelny = img.dataset.pelny;
      if (!pelny) return;
      // Zdejmujemy atrybut od razu: kafel nigdy nie wraca do kolejki,
      // nawet jeśli ponownie wejdzie w widok.
      delete img.dataset.pelny;

      const wstepny = new Image();
      wstepny.src = pelny;
      try {
        await wstepny.decode();
      } catch {
        // Nie doszło — zostaje wersja lekka. Lepsza niż pusty kafel.
        return;
      }
      if (zywy) img.src = pelny;
    };

    /** Najbliżej środka ekranu najpierw — tam patrzy użytkownik. */
    const oproznij = (): void => {
      const doPodniesienia = [...kolejka];
      kolejka.clear();
      const srodek = window.innerHeight / 2;
      doPodniesienia
        .sort((a, b) => {
          const da = Math.abs(a.getBoundingClientRect().top - srodek);
          const db = Math.abs(b.getBoundingClientRect().top - srodek);
          return da - db;
        })
        .forEach((img) => void podnies(img));
    };

    const naScroll = (): void => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(oproznij, BEZRUCH_MS);
    };

    const uruchom = (): void => {
      if (!zywy) return;

      /*
       * Obserwujemy KAFEL, nie obraz. Kafle od 13. w górę mają
       * content-visibility: auto, więc ich zawartość nie jest renderowana
       * i obraz w środku nie ma własnego boxu. Kafel ma go zawsze.
       */
      obserwator = new IntersectionObserver(
        (wpisy) => {
          for (const wpis of wpisy) {
            if (!wpis.isIntersecting) continue;
            const img = wpis.target.querySelector<HTMLImageElement>('img[data-pelny]');
            if (img) kolejka.add(img);
            obserwator?.unobserve(wpis.target);
          }
        },
        { rootMargin: ZASIEG },
      );
      for (const kafel of grid.querySelectorAll<HTMLElement>('[data-cat]')) {
        obserwator.observe(kafel);
      }

      window.addEventListener('scroll', naScroll, { passive: true });
      // Pierwsze opróżnienie bez czekania na scroll — użytkownik może
      // w ogóle nie ruszyć strony, a pierwszy ekran ma się doostrzyć.
      timer = window.setTimeout(oproznij, BEZRUCH_MS);
    };

    if (document.readyState === 'complete') uruchom();
    else window.addEventListener('load', uruchom, { once: true });

    return () => {
      zywy = false;
      obserwator?.disconnect();
      window.removeEventListener('load', uruchom);
      window.removeEventListener('scroll', naScroll);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [gridRef]);
}
```

- [ ] **Step 2: Wypnij stary obserwator z `Gallery.tsx`**

Usuń w całości `useEffect` z liniami 67–99 (blok z komentarzem „Doładowywanie paczkami" i obserwatorem przełączającym `loading` na `eager`). Zostaje jeden mechanizm ładowania, nie dwa.

- [ ] **Step 3: Wepnij hook**

W `src/components/Gallery.tsx` dodaj import:

```tsx
import { useProgressiveTiles } from './useProgressiveTiles';
```

i wywołanie w ciele komponentu, obok pozostałych hooków:

```tsx
  useProgressiveTiles(gridRef);
```

- [ ] **Step 4: Zbuduj**

```bash
cd polasobun
npm run build 2>&1 | tail -3
```

**Warunek przejścia:** build bez błędu. `astro check` musi przejść — typ `RefObject<HTMLDivElement | null>` ma się zgadzać z tym, co tworzy `Gallery.tsx`.

- [ ] **Step 5: Sprawdź podmianę w przeglądarce**

Na stanowisku pomiarowym, po wejściu i odczekaniu 3 s:

```js
() => {
  const grid = document.querySelector('[data-filter]');
  const obrazy = [...grid.querySelectorAll('img')].slice(0, 6);
  return obrazy.map((img) => ({
    naturalny: img.naturalWidth + 'x' + img.naturalHeight,
    maDataPelny: img.hasAttribute('data-pelny'),
  }));
}
```

**Warunek przejścia:** pierwsze kafle mają `naturalny` równy `1000x1250` i `maDataPelny: false` — czyli zostały podniesione. Kafle daleko w dole zachowują `400x500`.

- [ ] **Step 6: Sprawdź, że CLS został zerowy**

Na stanowisku, z obserwatorem CLS z sekcji „Stanowisko pomiarowe", przewiń stronę o kilka ekranów i odczytaj wartość.

**Warunek przejścia:** CLS równy 0,00. Jeśli wzrósł — proporcje wariantów się rozjechały; sprawdź, czy oba są dokładnie 4:5.

- [ ] **Step 7: Commit**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git add polasobun/src/components/useProgressiveTiles.ts polasobun/src/components/Gallery.tsx
LC_ALL=C LANG=C git commit -m "feat: podnoszenie kafli do pelnej jakosci po zwolnieniu przewijania

Logika ladowania wychodzi z Gallery.tsx do wlasnego modulu — Gallery
odpowiada teraz wylacznie za filtry. Stary obserwator lazy->eager
zostaje ZASTAPIONY, nie dolozony obok.

Podmiana czeka na decode(), zeby nie mignac pustym kaflem.
Start dopiero po load, zeby nie konkurowac o pasmo z pierwszym ekranem.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 4: Pomiar kontrolny — czy cel został osiągnięty

Zanim wejdą eksperymenty warunkowe, trzeba wiedzieć, ile dał sam rdzeń.

**Files:** żadnych zmian w kodzie.

**Interfaces:**
- Consumes: stan po zadaniu 3.
- Produces: liczby, od których zadania 5 i 6 liczą swój zysk.

- [ ] **Step 1: Zmierz LCP, CLS i bajty**

Trzy próby na stanowisku pomiarowym, dokładnie wg sekcji na górze planu.

- [ ] **Step 2: Zmierz przewijanie**

Przewiń przez 10 ekranów, po każdym licząc kafle w widoku bez namalowanego obrazu:

```js
() => {
  const w = innerHeight;
  return [...document.querySelectorAll('[data-cat]')]
    .filter((k) => { const r = k.getBoundingClientRect(); return r.bottom > 0 && r.top < w; })
    .filter((k) => { const i = k.querySelector('img'); return !i || !i.complete || i.naturalWidth === 0; })
    .length;
}
```

- [ ] **Step 3: Sprawdź, że elementem LCP jest kafel, a nie napis**

Specyfikacja wymienia ryzyko progu entropii: Chrome pomija przy LCP obrazy
poniżej 0,05 bita na piksel, żeby nikt nie oszukiwał metryki zaślepką.
Nasz lekki kadr powinien mieć ~0,6 bita, ale to trzeba zobaczyć, a nie
policzyć — jeśli kafel zostanie pominięty, LCP pokaże wordmark i metryka
skłamie w drugą stronę.

Z obserwatorem zapisującym `entry.element`:

```js
() => window.__m.historia.map((k) => ({ t: k.t, tag: k.tag, url: k.url }))
```

**Warunek przejścia:** ostatni kandydat ma `tag: "IMG"` i `url` wskazujący
wariant lekki. Jeśli ostatnim kandydatem jest `SPAN` z wordmarkiem — kafel
został odrzucony przez próg entropii; podnieś jakość wariantu lekkiego
(`quality: 70`) i powtórz pomiar.

- [ ] **Step 4: Porównaj z celami**

| Miara | Odniesienie | Cel |
|---|---|---|
| LCP (mediana z 3) | 3564 ms | < 2000 ms |
| Puste kafle na 10 ekranach | 1 | 0 |
| CLS | 0,00 | 0,00 |

- [ ] **Step 5: Dopisz wyniki do planu**

Wpisz zmierzone liczby pod tym zadaniem. Jeśli cel LCP nie został osiągnięty, **nie przechodź automatycznie do zadania 5** — zgłoś to klientowi razem z liczbami; eksperymenty warunkowe mają dołożyć ostatnie setki milisekund, nie uratować projekt.

---

### Task 5: E1 — AVIF dla poziomu lekkiego (warunkowe)

Wchodzi **tylko** jeśli spełni oba kryteria. Inaczej zostaje WebP.

**Files:**
- Modify: `src/pages/index.astro` — jedno wywołanie `getImage`

**Interfaces:**
- Consumes: `LEKKI` i `warianty` z zadania 2.
- Produces: nic nowego — zmienia się wyłącznie format pliku pod tym samym `src`.

- [ ] **Step 1: Zmierz czas builda przed zmianą**

```bash
cd polasobun
rm -rf dist node_modules/.astro
time npm run build 2>&1 | tail -3
```

Zapisz czas.

- [ ] **Step 2: Przełącz wariant lekki na AVIF**

W `src/pages/index.astro`, w generowaniu wariantów:

```ts
      getImage({ src: tile.img, ...LEKKI, format: 'avif' }),
```

- [ ] **Step 3: Zbuduj na zimno i porównaj**

```bash
cd polasobun
rm -rf dist node_modules/.astro
time npm run build 2>&1 | tail -3
node --input-type=module -e "
import fs from 'node:fs';
const h = fs.readFileSync('dist/index.html','utf8');
const m = [...h.matchAll(/<img[^>]*src=\"([^\"]+)\"[^>]*data-pelny=/g)].map(x => x[1].replace(/^\//,''));
const wagi = m.map(p => fs.statSync('dist/' + p).size).sort((a,b) => a-b);
console.log('kafli:', wagi.length, ' mediana lekkiego:', Math.round(wagi[wagi.length>>1]/1024) + ' kB');
"
```

- [ ] **Step 4: Rozstrzygnij**

**Przyjmij AVIF**, jeśli mediana wariantu lekkiego jest mniejsza niż w WebP **oraz** czas builda nie jest dłuższy niż zmierzony w kroku 1.

**Odrzuć i cofnij zmianę**, jeśli którykolwiek warunek padnie:

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git checkout -- polasobun/src/pages/index.astro
```

- [ ] **Step 5: Commit (tylko przy przyjęciu)**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git add polasobun/src/pages/index.astro
LC_ALL=C LANG=C git commit -m "perf: AVIF dla poziomu lekkiego

Mediana kafla lekkiego <PRZED> kB -> <PO> kB, build <PRZED> -> <PO>.
AVIF byl kiedys odrzucony przez czas kodowania, ale to byla wina duzych
plikow — kadr 400x500 koduje sie szybko.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

Wstaw prawdziwe liczby w miejsce `<PRZED>` i `<PO>`.

---

### Task 6: E2 — wstrzyknięcie pierwszego kafla jako `data:` (warunkowe)

**Files:**
- Modify: `src/pages/index.astro` — frontmatter i markup pierwszego kafla

**Interfaces:**
- Consumes: `warianty[0]` z zadania 2.
- Produces: nic dla innych zadań.

- [ ] **Step 1: Zapisz LCP i FCP sprzed zmiany**

Z zadania 4 (albo 5, jeśli AVIF został przyjęty). Potrzebne obie liczby, nie tylko LCP.

- [ ] **Step 2: Wczytaj pierwszy kafel do `data:` URI**

W `src/pages/index.astro`, po wyliczeniu `warianty`:

**Nie da się tu odczytać pliku z `dist`** — `getImage()` zwraca URL od razu,
ale plik powstaje dopiero na końcu builda, więc w chwili renderowania strony
jeszcze go nie ma. Bufor trzeba zrobić samodzielnie, tym samym `sharp`,
którego używa `astro:assets`.

Na górze frontmattera:

```ts
import sharp from 'sharp';
```

Po wyliczeniu `warianty`:

```ts
/**
 * Pierwszy kafel wprost w dokumencie. Ten sam zabieg, co
 * inlineStylesheets: 'always' — zdejmuje z niego cały obrót sieci.
 *
 * Kosztem jest grubszy dokument, który sam leży na ścieżce krytycznej,
 * a base64 puchnie o 33% i nie kompresuje się dalej. Zabieg zostaje
 * TYLKO dlatego, że pomiar potwierdził zysk na LCP bez straty na FCP.
 *
 * Kodujemy własnym sharpem, bo plik z getImage() powstaje dopiero na
 * końcu builda i tutaj jeszcze nie istnieje. Parametry muszą zgadzać się
 * z wariantem lekkim, inaczej dokument niósłby inny kadr niż reszta siatki.
 */
const bufor = await sharp(tiles[0].img.fsPath)
  .resize(LEKKI.width, LEKKI.height, { fit: 'cover' })
  .webp({ quality: 62 })
  .toBuffer();
const pierwszyKafelData = `data:image/webp;base64,${bufor.toString('base64')}`;
```

`tiles[0].img` to `ImageMetadata` z `import.meta.glob`; ścieżkę do pliku
źródłowego niesie pole `fsPath`. Jeśli w tej wersji Astro pole nazywa się
inaczej, sprawdź je przez `console.log(tiles[0].img)` podczas builda —
nie zgaduj.

- [ ] **Step 3: Użyj go w markupie**

```astro
            src={index === 0 ? pierwszyKafelData : warianty[index].lekki}
```

- [ ] **Step 4: Zmierz LCP i FCP**

Trzy próby na stanowisku pomiarowym.

- [ ] **Step 5: Rozstrzygnij**

**Przyjmij**, jeśli mediana LCP spadła **oraz** mediana FCP nie wzrosła.

**Odrzuć i cofnij**, jeśli którykolwiek warunek padnie:

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git checkout -- polasobun/src/pages/index.astro
```

Odrzucenie jest tu **prawdopodobnym wynikiem** i nie jest porażką — po to była mierzona.

- [ ] **Step 6: Commit (tylko przy przyjęciu)**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git add polasobun/src/pages/index.astro
LC_ALL=C LANG=C git commit -m "perf: pierwszy kafel wstrzykniety w HTML

LCP <PRZED> -> <PO> ms, FCP <PRZED> -> <PO> ms.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
```

---

### Task 7: Dokumentacja i weryfikacja na produkcji

**Files:**
- Modify: `CLAUDE.md` (dowiązanie do `AGENTS.md`)

**Interfaces:**
- Consumes: wyniki zadań 4, 5, 6.
- Produces: nic dla kodu.

- [ ] **Step 1: Dopisz do `CLAUDE.md` sekcję o dwustopniowym ładowaniu**

Musi zawierać, w stylu pozostałych wpisów (fakt, liczba, przestroga):

- że LCP jest ograniczone obrotami sieci, nie wagą — z liczbami z tabeli czterech nieudanych prób,
- dlaczego kafle mają dwa poziomy i jaka jest waga każdego,
- że obserwator startuje **po** `load` i dlaczego wcześniejszy start zabiłby zysk,
- że podmiana czeka na `decode()` i dlaczego,
- że `<Picture>` dokłada fallback w formacie źródłowym — stąd 1054 martwe JPEG-i,
- wynik bramki ryzyka z zadania 0,
- metodykę pomiaru (ciepły CDN, zimny cache przeglądarki, czyszczone `sessionStorage`) z ostrzeżeniem, że pomiary sprzed 2026-08-26 mierzyły powrót, nie pierwsze wejście.

- [ ] **Step 2: Popraw nieaktualne wpisy**

Sekcja o `EAGER_COUNT` i doładowywaniu paczkami opisuje mechanizm, którego już nie ma. Zaktualizuj albo usuń — nieaktualna dokumentacja jest gorsza niż jej brak.

- [ ] **Step 3: Commit i push**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git add polasobun/CLAUDE.md polasobun/AGENTS.md
LC_ALL=C LANG=C git commit -m "docs: dwustopniowe ladowanie siatki i metodyka pomiaru

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>"
LC_ALL=C LANG=C git push -u origin osurmo/astro-project-setup-df1cf5
```

- [ ] **Step 4: Otwórz PR z liczbami**

Opis musi zawierać tabelę przed/po dla LCP, CLS, pustych kafli i czasu builda oraz rozstrzygnięcie obu eksperymentów warunkowych — także tych odrzuconych, z powodem.

- [ ] **Step 5: Po scaleniu — pomiar produkcyjny**

Rozgrzej CDN (dwa przebiegi `fetch` po obrazach pierwszego ekranu, aż `x-vercel-cache` pokaże same `HIT`), potem zmierz przy zimnym cache przeglądarki i wyczyszczonym `sessionStorage`. Dwa profile: Fast 4G i Slow 4G.

**Warunek przejścia:** LCP na Fast 4G nie gorsze niż dotychczasowe ~1104 ms.

---

## Kolejność i bramki

```
Task 0 (bramka ryzyka)
   └─ przy odrzuceniu: STOP, wróć do klienta
Task 1 (JPEG-i)  ─ niezależne, można scalić samo
Task 2 (warianty)
Task 3 (podmiana)
Task 4 (pomiar)  ─ bramka: cel LCP osiągnięty?
   ├─ Task 5 (AVIF)      warunkowe
   └─ Task 6 (data: URI) warunkowe
Task 7 (dokumentacja, PR, produkcja)
```
