# CMS Pages CMS — plan implementacji

> **Dla wykonawców agentowych:** WYMAGANY PODSKILL: użyj
> superpowers:subagent-driven-development (zalecane) albo
> superpowers:executing-plans, żeby wykonać ten plan zadanie po zadaniu.
> Kroki mają składnię checkboxów (`- [ ]`) do odhaczania.

**Cel:** Dać klientce panel, w którym sama wgrywa zdjęcia, układa ich
kolejność, wskazuje okładkę, zakłada kampanie i poprawia teksty — bez
dotykania gita i bez możliwości zepsucia strony.

**Architektura:** Kolejność, okładka i wybór kadrów przenoszą się
z konwencji nazw plików do danych we wpisie kampanii. `projects.json`
rozpada się na plik per kampania plus `order.json` na kolejność
kampanii. Pages CMS (hostowany `app.pagescms.org`) edytuje te pliki
przez GitHub App, a przycisk „Opublikuj stronę" uruchamia workflow
`publikacja.yml`.

**Stack:** Astro 7, Pages CMS 2.x, GitHub Actions, sharp.

**Specyfikacja:** `docs/superpowers/specs/2026-08-28-cms-pages-cms-design.md`

**Wymaga wcześniej:** planu
`2026-08-28-hosting-cloudflare-i-domena.md` do zadania 4 włącznie —
stamtąd pochodzi `publikacja.yml`, pod który podpinamy przycisk.

## Ograniczenia globalne

Dotyczą KAŻDEGO zadania w tym planie:

- Katalog projektu Astro to `polasobun/`. Ścieżki niżej są względne
  wobec niego, chyba że napisano inaczej.
- Node >= 22.12.0. Zweryfikowane lokalnie: v22.22.0.
- `typescript` przypięty do `^6` **celowo**. Nie bumpować.
- **Zero nowych zależności w `package.json`.** `sharp` jest już obecny
  jako zależność Astro — używamy go, nie instalujemy.
- Zdjęcia zawsze przez `astro:assets`, nigdy surowy `<img src>`.
  Zdjęcia dynamiczne **wyłącznie** przez `import.meta.glob`
  z `eager: true`; ścieżka jako string NIE zostanie zoptymalizowana
  i wysypie się na produkcji.
- Po każdym zadaniu `npm run build` musi przechodzić (odpala
  `astro check`).
- **KRYTERIUM ODBIORU zadań 2-5: `dist` bajt w bajt identyczny
  z punktem odniesienia z zadania 1.** Nie „wygląda tak samo".
- **Sortowanie nazw plików to `a.localeCompare(b)` bez opcji.** Nie
  zamieniaj na sortowanie numeryczne. `_portraits` ma 114 plików
  z numeracją trzycyfrową i dzisiejsza kolejność to
  `10.jpg, 100.jpg, 101.jpg, …, 11.jpg` — zmiana kolatora przestawia
  galerię i wywala dowód identyczności.
- Komentarze w kodzie i wiadomości commitów po polsku.
- Liczby, których nie zmierzyłeś, oznaczaj jako oczekiwane.

---

### Zadanie 1: Punkt odniesienia i skrypt migracji

Skrypt generuje nowe pliki, ale **nic ich jeszcze nie czyta**. Stary
`projects.json` zostaje na miejscu. Dzięki temu zadanie jest bezpieczne
i zamyka się własnym testem.

**Pliki:**
- Utwórz: `scripts/migruj-model.mjs`
- Utwórz (przez skrypt): `src/content/projects/<slug>.json` × 17
- Utwórz (przez skrypt): `src/content/order.json`
- Utwórz (przez skrypt): `src/content/contact.json`

**Interfejsy:**
- Produkuje: 17 plików wpisów o kształcie
  `{ slug, title, client, year, tags, collection?, legacyPath?, cover, photos, featured? }`,
  gdzie `cover` i elementy `photos`/`featured` są ścieżkami postaci
  `/photos/<slug>/<plik>.jpg`. Konsumuje to zadanie 2.
- Produkuje: `order.json` o kształcie `{ "kolejnosc": string[] }`.
- Produkuje: `contact.json` o kształcie
  `{ akapity: string[], portret: string, kontakt: { etykieta, tekst, href, zewnetrzny }[] }`,
  gdzie `portret` jest ścieżką postaci `/portret/<plik>.jpg`
  (dokłada ją krok 6). Konsumuje to zadanie 5.

- [ ] **Krok 1: Zapisz punkt odniesienia `dist`**

To jest test dla zadań 2-5. Musi powstać **przed** jakąkolwiek zmianą.

```bash
cd polasobun && git status --porcelain && git log origin/main..HEAD --oneline
cd polasobun && rm -rf dist && npm run build
find dist -type f | sort | xargs shasum -a 256 > /tmp/dist-odniesienie.txt
wc -l /tmp/dist-odniesienie.txt
```

**Drzewo robocze musi być czyste, a gałąź zsynchronizowana z `main`.**
Punkt odniesienia jest ważny tylko wtedy, gdy między nim a zadaniem 5
nie wejdzie ŻADNA inna zmiana. Zadania 5, 7 i 8 planu hostingu zmieniają
`dist` (usunięcie skryptu Speed Insights, `site`, nagłówki) — muszą być
zakończone **przed** tym krokiem. Jeśli którakolwiek wejdzie w trakcie,
zapisz punkt odniesienia od nowa i powtórz porównania z zadań 2-4.

Oczekiwane: około 1360 wierszy. **Zapisz dokładną liczbę** — pojawi się
w każdym z zadań 2-5.

- [ ] **Krok 2: Napisz skrypt migracji**

Utwórz `scripts/migruj-model.mjs`:

```js
/**
 * Jednorazowa migracja modelu danych.
 *
 * Z jednego projects.json robi plik per kampania plus order.json,
 * i przenosi kolejność zdjęć oraz okładkę z konwencji nazw plików
 * do danych. Po tej zmianie 01.jpg przestaje być magiczną nazwą.
 *
 * KOLEJNOŚĆ MUSI BYĆ IDENTYCZNA z tym, co robi dziś kod strony:
 * localeCompare BEZ OPCJI. Nie zamieniaj na sortowanie numeryczne —
 * _portraits ma numerację trzycyfrową i dzisiejsza kolejność to
 * 10.jpg, 100.jpg, ..., 11.jpg. Kolator numeryczny przestawiłby
 * galerię.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tu = dirname(fileURLToPath(import.meta.url));
const tresc = join(tu, '..', 'src', 'content');
const zdjecia = join(tu, '..', 'src', 'assets', 'photos');

const dane = JSON.parse(readFileSync(join(tresc, 'projects.json'), 'utf8'));

mkdirSync(join(tresc, 'projects'), { recursive: true });

const kolejnosc = [];

for (const wpis of dane) {
  const pliki = readdirSync(join(zdjecia, wpis.slug))
    .filter((n) => n.endsWith('.jpg'))
    .sort((a, b) => a.localeCompare(b));

  if (!pliki.length) throw new Error(`Folder ${wpis.slug} jest pusty`);

  const sciezka = (nazwa) => `/photos/${wpis.slug}/${nazwa}`;

  // Okładką była zawsze pierwsza nazwa alfabetycznie — dokładnie to,
  // co brał index.astro przez bySlug.get(slug)?.[0].
  const wynik = {
    slug: wpis.slug,
    title: wpis.title,
    client: wpis.client,
    year: wpis.year,
    tags: wpis.tags,
    ...(wpis.collection ? { collection: true } : {}),
    ...(wpis.legacyPath ? { legacyPath: wpis.legacyPath } : {}),
    cover: sciezka(pliki[0]),
    photos: pliki.map(sciezka),
    ...(wpis.featured ? { featured: wpis.featured.map(sciezka) } : {}),
  };

  // Featured wskazujące na nieistniejący plik było dotąd cicho
  // pomijane przez .filter(Boolean) w index.astro. Tu ma wywalić.
  for (const s of wynik.featured ?? []) {
    if (!wynik.photos.includes(s)) {
      throw new Error(`${wpis.slug}: featured wskazuje na nieistniejące ${s}`);
    }
  }

  writeFileSync(
    join(tresc, 'projects', `${wpis.slug}.json`),
    JSON.stringify(wynik, null, 2) + '\n',
  );
  kolejnosc.push(wpis.slug);
}

writeFileSync(
  join(tresc, 'order.json'),
  JSON.stringify({ kolejnosc }, null, 2) + '\n',
);

console.log(`OK — ${kolejnosc.length} kampanii, order.json zapisany`);
```

- [ ] **Krok 3: Uruchom migrację**

```bash
cd polasobun && node scripts/migruj-model.mjs
ls src/content/projects/ | wc -l
cat src/content/order.json
```

Oczekiwane: `OK — 17 kampanii`, 17 plików, `order.json` z listą
siedemnastu slugów w kolejności z `projects.json` (zaczyna się od
`pandora`, `rimmel`, `allegro`).

- [ ] **Krok 4: Sprawdź, że dane się zgadzają z oryginałem**

```bash
cd polasobun && node -e "
const fs=require('fs');
const stare=JSON.parse(fs.readFileSync('src/content/projects.json','utf8'));
let bledy=0;
for (const s of stare) {
  const n=JSON.parse(fs.readFileSync('src/content/projects/'+s.slug+'.json','utf8'));
  if (n.title!==s.title||n.client!==s.client||n.year!==s.year) { console.error(s.slug,'pola'); bledy++; }
  if (JSON.stringify(n.tags)!==JSON.stringify(s.tags)) { console.error(s.slug,'tags'); bledy++; }
  const oczF=(s.featured??[]).map(f=>'/photos/'+s.slug+'/'+f);
  if (JSON.stringify(n.featured??[])!==JSON.stringify(oczF)) { console.error(s.slug,'featured'); bledy++; }
  if (n.cover!=='/photos/'+s.slug+'/01.jpg') { console.error(s.slug,'cover',n.cover); bledy++; }
  if (!n.photos.includes(n.cover)) { console.error(s.slug,'cover spoza photos'); bledy++; }
}
console.log(bledy?'BŁĘDY: '+bledy:'OK — 17 wpisów zgodnych');
process.exit(bledy?1:0);
"```

Oczekiwane: `OK — 17 wpisów zgodnych`

- [ ] **Krok 5: Utwórz `contact.json` ręcznie**

Teksty przepisz **dokładnie** z `src/pages/contact.astro` (tablice
`AKAPITY` i `KONTAKT`). Cztery poprawki uzgodnione 2026-08-27 są już
w tych łańcuchach — nie „poprawiaj" ich drugi raz.

```json
{
  "akapity": [
    "Absolwentka Uniwersytetu Łódzkiego (nowe media i kultura cyfrowa) oraz PWSFTViT (fotografia).",
    "Fotografuje przede wszystkim ludzi (moda i reportaż), ale bliskie jej są również kompozycje foodowe/trashowe stille.",
    "Pracowała z Rimmel, Allegro, Esotiq, Robert Kupisz i Henderson, Pudliszki, Kodano Optyk, Butik Optique itd.",
    "Tworzy również dużo realizacji branded content z influencerami dla takich marek jak Zalando, LPP (Reserved, Cropp, House), CCC czy Inditex (Pull&Bear)."
  ],
  "kontakt": [
    { "etykieta": "tel", "tekst": "883 180 410", "href": "tel:+48883180410", "zewnetrzny": false },
    { "etykieta": "mail", "tekst": "polasobun@gmail.com", "href": "mailto:polasobun@gmail.com", "zewnetrzny": false },
    { "etykieta": "instagram", "tekst": "@polasobun", "href": "https://www.instagram.com/polasobun/", "zewnetrzny": true }
  ]
}
```

- [ ] **Krok 6: Przenieś portret do własnego folderu**

Klientka ma móc podmienić portret sama, a plik o dowolnej nazwie nie
przejdzie przez statyczny import. Folder plus glob to rozwiązuje.

```bash
cd polasobun && mkdir -p src/assets/portret
git mv src/assets/portret-pola-sobun.jpg src/assets/portret/portret.jpg
```

Dopisz do `contact.json` pole `"portret": "/portret/portret.jpg"`.

- [ ] **Krok 7: Zbuduj — nic jeszcze nie czyta nowych plików**

```bash
cd polasobun && npm run build
```

Oczekiwane: **błąd** — `contact.astro` importuje przeniesiony plik.
Popraw wyłącznie ścieżkę importu na
`../assets/portret/portret.jpg`, nic więcej w tym pliku.
Potem zbuduj ponownie — musi przejść.

- [ ] **Krok 8: Potwierdź, że `dist` się nie zmienił**

```bash
cd polasobun && find dist -type f | sort | xargs shasum -a 256 > /tmp/dist-po1.txt
diff /tmp/dist-odniesienie.txt /tmp/dist-po1.txt && echo "IDENTYCZNY"
```

Oczekiwane: `IDENTYCZNY`. Przeniesienie pliku nie zmienia jego treści,
więc hash wariantów WebP musi zostać ten sam. Jeśli się różni —
zatrzymaj się, bo cały dowód dla zadań 2-5 właśnie przestał działać.

- [ ] **Krok 9: Commit**

```bash
git add polasobun/scripts/migruj-model.mjs polasobun/src/content/ \
        polasobun/src/assets/portret/ polasobun/src/pages/contact.astro
git commit -m "feat: migracja modelu danych na plik per kampania"
```

---

### Zadanie 2: `projects.ts` czyta nowe pliki

Konsumenci **nie zmieniają się** — nadal sortują po nazwach. Zmienia
się wyłącznie źródło danych, więc `dist` musi wyjść identyczny.

**Pliki:**
- Modyfikuj: `src/content/projects.ts` (cały plik)
- Modyfikuj: `scripts/sprawdz-przekierowania.mjs`
- Usuń: `src/content/projects.json`

**Interfejsy:**
- Konsumuje: pliki wpisów i `order.json` z zadania 1.
- Produkuje: `projects: Project[]` — ta sama nazwa i kolejność co dziś,
  typ rozszerzony o `cover: string` i `photos: string[]`.
- Produkuje: `zdjecie(sciezka: string): ImageMetadata` — zamienia
  ścieżkę `/photos/<slug>/<plik>.jpg` na metadane obrazu. Używają tego
  zadania 3, 4 i 5.
- Produkuje: `zdjeciaPortretu: Map<string, ImageMetadata>` — analogicznie
  dla `/portret/<plik>.jpg`. Używa tego zadanie 5.

- [ ] **Krok 1: Napisz nowy `src/content/projects.ts`**

```ts
import type { ImageMetadata } from 'astro';
import order from './order.json';

/**
 * Filtry na stronie: ALL / COMMERCIAL / PORTRAITS / FOOD.
 * ALL nie jest tagiem — to pełnoprawny widok, nie brak filtra.
 * Projekt może mieć więcej niż jeden tag (np. Pudliszki: commercial + food).
 */
export type ProjectTag = 'commercial' | 'portraits' | 'food';

export interface Project {
  /** Musi odpowiadać nazwie folderu w src/assets/photos/. */
  slug: string;
  title: string;
  /** null dla zbiorczych galerii — nie mają jednego klienta. */
  client: string | null;
  /** null dopóki klientka nie poda roku. Nigdy nie zgadujemy. */
  year: number | null;
  tags: ProjectTag[];
  /** true = zbiorcza galeria (_portraits, _food), nie pojedyncza kampania. */
  collection?: boolean;
  /** Adres na starej stronie (Format.com). Pod przekierowania 301. */
  legacyPath?: string;
  /**
   * Okładka kampanii — kafel w COMMERCIAL. Ścieżka w formie zapisywanej
   * przez CMS: /photos/<slug>/<plik>.jpg. To POLE, nie konwencja:
   * 01.jpg przestało być magiczną nazwą przy migracji na CMS.
   */
  cover: string;
  /**
   * Wszystkie zdjęcia kampanii, W KOLEJNOŚCI WYŚWIETLANIA. Strona
   * /work/<slug> renderuje dokładnie tę listę, w tej kolejności.
   * Klientka układa ją przeciąganiem w panelu.
   */
  photos: string[];
  /**
   * Kadry wybrane do widoku ALL, od najmocniejszego. Wybrane ręcznie
   * z arkuszy stykowych; kryterium to czytelność z kafla wielkości
   * znaczka: mocna plama koloru, jeden czytelny bohater, kontrast.
   * Bez tego pola kampania nie pokazuje się w ALL wcale.
   */
  featured?: string[];
}

/**
 * Wpisy kampanii. import.meta.glob z eager: true — wzorzec musi zostać
 * literałem, inaczej Vite nie zbierze plików w czasie budowania.
 */
const wpisy = import.meta.glob<{ default: Project }>('./projects/*.json', {
  eager: true,
});

const wgSlugu = new Map<string, Project>();
for (const mod of Object.values(wpisy)) {
  wgSlugu.set(mod.default.slug, mod.default);
}

/**
 * Kolejność kampanii pochodzi z order.json, nie z nazw plików.
 * Steruje dwiema rzeczami naraz: kolejnością kafli w COMMERCIAL
 * i rundami round-robina w ALL.
 */
export const projects: Project[] = (order.kolejnosc as string[]).map((slug) => {
  const wpis = wgSlugu.get(slug);
  if (!wpis) throw new Error(`order.json wskazuje nieistniejącą kampanię "${slug}"`);
  return wpis;
});

/*
 * Kampania spoza order.json byłaby niewidoczna na stronie głównej, ale
 * nadal generowałaby /work/<slug> i wpis w sitemapie. Cicha rozbieżność
 * jest gorsza niż zerwany build — dlatego rzucamy.
 */
if (projects.length !== wgSlugu.size) {
  const brakujace = [...wgSlugu.keys()].filter(
    (slug) => !(order.kolejnosc as string[]).includes(slug),
  );
  throw new Error(`Kampanie spoza order.json: ${brakujace.join(', ')}`);
}

/**
 * Wszystkie zdjęcia, kluczowane ścieżką w formie zapisywanej przez CMS.
 * import.meta.glob z eager: true — ścieżka jako string NIE zostałaby
 * zoptymalizowana i wysypałaby się na produkcji.
 */
const pliki = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/photos/*/*.jpg',
  { eager: true },
);

const wgSciezki = new Map<string, ImageMetadata>();
for (const [sciezka, mod] of Object.entries(pliki)) {
  // Klucze globa są względne wobec TEGO pliku (../assets/photos/...).
  // Ucięcie od "/photos/" daje formę, którą zapisuje CMS.
  const i = sciezka.indexOf('/photos/');
  if (i !== -1) wgSciezki.set(sciezka.slice(i), mod.default);
}

/** Zamienia ścieżkę z danych na metadane obrazu. Rzuca, gdy pliku brak. */
export function zdjecie(sciezka: string): ImageMetadata {
  const img = wgSciezki.get(sciezka);
  if (!img) throw new Error(`Brak pliku zdjęcia: ${sciezka}`);
  return img;
}

/** Portret na /contact — osobny folder, żeby klientka mogła go podmienić. */
const plikiPortretu = import.meta.glob<{ default: ImageMetadata }>(
  '../assets/portret/*.jpg',
  { eager: true },
);

export const zdjeciaPortretu = new Map<string, ImageMetadata>();
for (const [sciezka, mod] of Object.entries(plikiPortretu)) {
  const i = sciezka.indexOf('/portret/');
  if (i !== -1) zdjeciaPortretu.set(sciezka.slice(i), mod.default);
}
```

- [ ] **Krok 2: Sprawdź typ `ImageMetadata`**

```bash
cd polasobun && npm run check
```

Jeśli `astro check` zgłasza, że `astro` nie eksportuje `ImageMetadata`
— usuń linię `import type { ImageMetadata } from 'astro';`. Ten typ
jest wtedy globalny, dostarczany przez `.astro/types.d.ts`, które
`tsconfig.json` już włącza. Nie instaluj niczego, żeby to obejść.

- [ ] **Krok 3: Usuń `projects.json` i zbuduj**

```bash
cd polasobun && git rm src/content/projects.json && npm run build
```

Oczekiwane: build przechodzi, 19 stron.

- [ ] **Krok 4: Potwierdź identyczność `dist` — to jest test tego zadania**

```bash
cd polasobun && find dist -type f | sort | xargs shasum -a 256 > /tmp/dist-po2.txt
diff /tmp/dist-odniesienie.txt /tmp/dist-po2.txt && echo "IDENTYCZNY"
```

Oczekiwane: `IDENTYCZNY`. Jakakolwiek różnica znaczy, że kolejność
kampanii albo dane wpisów rozjechały się z oryginałem — zatrzymaj się.

- [ ] **Krok 5: Zaktualizuj bramkę przekierowań**

`scripts/sprawdz-przekierowania.mjs` z planu hostingu czyta usunięty
`projects.json`. Podmień wczytywanie danych na odczyt katalogu wpisów;
reszta skryptu zostaje bez zmian:

```js
import { readdirSync, readFileSync } from 'node:fs';

const katalog = new URL('../src/content/projects/', import.meta.url);
const dane = readdirSync(katalog)
  .filter((n) => n.endsWith('.json'))
  .map((n) => JSON.parse(readFileSync(new URL(n, katalog), 'utf8')));
```

- [ ] **Krok 6: Uruchom bramkę**

```bash
cd polasobun && node scripts/sprawdz-przekierowania.mjs
```

Oczekiwane: `OK — 15 przekierowań zgodnych z legacyPath`

- [ ] **Krok 7: Commit**

```bash
git add polasobun/src/content/projects.ts polasobun/src/content/projects.json \
        polasobun/scripts/sprawdz-przekierowania.mjs
git commit -m "feat: projects.ts czyta plik per kampania i order.json"
```

---

### Zadanie 3: `index.astro` na `cover` i `photos`

**Pliki:**
- Modyfikuj: `src/pages/index.astro` — wyłącznie blok frontmatter
  (linie 1-~200). **Znaczników pod `---` nie ruszaj.**

**Interfejsy:**
- Konsumuje: `projects`, `zdjecie()` z zadania 2.
- Produkuje: tablice `tiles` i `warianty` o niezmienionym kształcie
  i niezmienionej kolejności — znaczniki sięgają po indeks, więc obie
  muszą pozostać równoległe.

- [ ] **Krok 1: Podmień import i usuń budowanie mapy z globa**

Zamień:

```ts
import { projects } from '../content/projects';
```

na:

```ts
import { projects, zdjecie } from '../content/projects';
```

Usuń cały blok od `const files = import.meta.glob…` do pętli
sortującej `for (const list of bySlug.values()) list.sort(…)`.
Glob przeniósł się do `projects.ts` w zadaniu 2.

- [ ] **Krok 2: Przepisz budowanie kolejek na dane**

Zamień blok `const kolejki = projects.map(…)` na:

```ts
const kolejki = projects.map((project) => {
  const wybrane = (project.featured ?? []).filter((s) => project.photos.includes(s));
  const wybraneZbior = new Set(wybrane);
  // Okładka nie wchodzi do ALL: pokazuje ją kafel kampanii w COMMERCIAL,
  // więc w ALL witałaby drugi raz. Kolekcje (_portraits, _food) nie mają
  // kafla kampanii, więc u nich okładka zostaje.
  const reszta = project.photos.filter(
    (s) => !wybraneZbior.has(s) && (project.collection || s !== project.cover),
  );
  return { project, wybrane, reszta };
});
```

- [ ] **Krok 3: Przepisz oba przebiegi**

W przebiegu a) i b) zmienna `zdjecie` z pętli nazywa się teraz tak samo
jak zaimportowana funkcja — **przemianuj ją na `sciezka`**, inaczej
przesłoni import. W obu pętlach:

```ts
    const sciezka = wybrane[runda];        // w przebiegu b): reszta[runda]
    if (!sciezka) continue;
    const widoki: string[] = ['all', ...project.tags.filter((tag) => tag !== 'commercial')];
    tiles.push({
      key: sciezka,
      img: zdjecie(sciezka),
      cats: widoki.join(' '),
      alt: project.title,
    });
```

W przebiegu b) `widoki` liczy się bez `'all'`, dokładnie jak dziś:
`const widoki: string[] = project.tags.filter((tag) => tag !== 'commercial');`
oraz `if (!widoki.length) continue;`.

Także `najwiecejWybranych` i `najdluzszaReszta` liczą się tak jak dziś,
bo `wybrane` i `reszta` nadal są tablicami.

- [ ] **Krok 4: Przepisz kafel kampanii**

```ts
for (const project of projects) {
  if (project.collection) continue;
  tiles.push({
    key: `cover/${project.slug}`,
    img: zdjecie(project.cover),
    cats: 'commercial',
    alt: project.title,
    href: `/work/${project.slug}`,
    caption: project.title,
  });
}
```

`zdjecie()` rzuca sam, gdy pliku brak — dotychczasowy jawny `throw`
na `!cover` jest już zbędny.

- [ ] **Krok 5: Przepisz kadr animacji wejścia**

```ts
/**
 * Animacja wejścia — JEDEN kadr. Mocno graficzny i wysokokontrastowy:
 * split-flap rozbija zdjęcie na kafelki, więc czytelna plama koloru
 * działa lepiej niż subtelny portret.
 */
const INTRO = { sciezka: '/photos/rimmel/01.jpg', focusY: 30 };

const introEntry = zdjecie(INTRO.sciezka);
```

Dalej `getImage({ src: introEntry, … })` — bez `.img`, bo `zdjecie()`
zwraca już `ImageMetadata`.

- [ ] **Krok 6: Zbuduj**

```bash
cd polasobun && npm run build
```

Oczekiwane: przechodzi, 19 stron.

- [ ] **Krok 7: Potwierdź identyczność `dist` — test tego zadania**

```bash
cd polasobun && find dist -type f | sort | xargs shasum -a 256 > /tmp/dist-po3.txt
diff /tmp/dist-odniesienie.txt /tmp/dist-po3.txt && echo "IDENTYCZNY"
```

Oczekiwane: `IDENTYCZNY`. Różnica w `index.html` znaczy, że kolejność
kafli się przestawiła — najczęstsza przyczyna to zmiana kolatora przy
sortowaniu albo pominięcie warunku z okładką.

- [ ] **Krok 8: Commit**

```bash
git add polasobun/src/pages/index.astro
git commit -m "feat: siatka czyta kolejność i okładkę z danych, nie z nazw plików"
```

---

### Zadanie 4: `work/[slug].astro` na `photos`

**Pliki:**
- Modyfikuj: `src/pages/work/[slug].astro` — wyłącznie frontmatter.

**Interfejsy:**
- Konsumuje: `projects`, `zdjecie()`, typ `Project` z zadania 2.

- [ ] **Krok 1: Podmień import**

```ts
import { projects, zdjecie, type Project } from '../../content/projects';
```

- [ ] **Krok 2: Usuń glob i zastąp odczytem z danych**

Usuń cały blok `const files = import.meta.glob…` wraz z łańcuchem
`Object.entries(files).map(…).filter(…).sort(…)` i wstaw:

```ts
/**
 * Zdjęcia w kolejności ustawionej przez klientkę w panelu. Wcześniej
 * kolejność brała się z sortowania nazw plików; teraz jest danymi.
 */
const photos = project.photos.map((sciezka) => ({
  name: sciezka.slice(sciezka.lastIndexOf('/') + 1),
  img: zdjecie(sciezka),
}));
```

`name` musi zostać samą nazwą pliku — wchodzi do `alt` jako
`${project.title} — ${name}`, a `dist` ma wyjść identyczny.

- [ ] **Krok 3: Zbuduj i potwierdź identyczność — test tego zadania**

```bash
cd polasobun && npm run build
find dist -type f | sort | xargs shasum -a 256 > /tmp/dist-po4.txt
diff /tmp/dist-odniesienie.txt /tmp/dist-po4.txt && echo "IDENTYCZNY"
```

Oczekiwane: `IDENTYCZNY`.

- [ ] **Krok 4: Commit**

```bash
git add "polasobun/src/pages/work/[slug].astro"
git commit -m "feat: strona kampanii renderuje photos w kolejności z danych"
```

---

### Zadanie 5: `contact.astro` na `contact.json`

**Pliki:**
- Modyfikuj: `src/pages/contact.astro` — wyłącznie frontmatter
  i podmiana `src` w `<Image>`.

**Interfejsy:**
- Konsumuje: `contact.json` z zadania 1, `zdjeciaPortretu` z zadania 2.

- [ ] **Krok 1: Podmień źródło tekstów**

Usuń tablice `AKAPITY` i `KONTAKT` wraz z ich obecnymi komentarzami
i wstaw:

```ts
import kontaktDane from '../content/contact.json';
import { zdjeciaPortretu } from '../content/projects';

/**
 * Bio i dane kontaktowe pochodzą z src/content/contact.json, żeby
 * klientka mogła je poprawić w panelu bez dotykania kodu.
 *
 * `zewnetrzny` steruje target/rel: tylko Instagram wyprowadza
 * odwiedzającego z portfolio, więc tylko on dostaje nową kartę.
 * `tel:` i `mailto:` są ŚWIADOMIE wyłączone z tej reguły — to
 * protokoły przekazywane systemowi, nie nawigacja w przeglądarce,
 * więc target="_blank" zostawiłby po nich pustą, martwą kartę.
 * Nie „ujednolicaj" tego z powrotem na wszystkie odnośniki.
 */
const AKAPITY = kontaktDane.akapity;
const KONTAKT = kontaktDane.kontakt;

const portret = zdjeciaPortretu.get(kontaktDane.portret);
if (!portret) throw new Error(`Brak portretu: ${kontaktDane.portret}`);
```

Usuń poprzedni statyczny import portretu.

- [ ] **Krok 2: Zbuduj i potwierdź identyczność — test tego zadania**

```bash
cd polasobun && npm run build
find dist -type f | sort | xargs shasum -a 256 > /tmp/dist-po5.txt
diff /tmp/dist-odniesienie.txt /tmp/dist-po5.txt && echo "IDENTYCZNY"
```

Oczekiwane: `IDENTYCZNY`. Różnica w `contact/index.html` znaczy, że
któryś łańcuch został przy przepisywaniu zmieniony — porównaj znak po
znaku, nie „na oko".

- [ ] **Krok 3: Commit**

```bash
git add polasobun/src/pages/contact.astro
git commit -m "feat: teksty zakładki CONTACT z contact.json"
```

- [ ] **Krok 4: Opublikuj i sprawdź na żywo**

```bash
git push && gh workflow run publikacja.yml && gh run watch
```

Migracja modelu jest zakończona. Strona jest w tym momencie dokładnie
taka sama jak przed nią — a dane są gotowe pod panel.

---

### Zadanie 6: Konfiguracja Pages CMS i podłączenie panelu

**Pliki:**
- Utwórz: `.pages.yml` (w **korzeniu repozytorium**, nie w `polasobun/`)

**Interfejsy:**
- Konsumuje: kształt danych z zadań 1-5, `publikacja.yml` z zadania 4
  planu hostingu.

- [ ] **Krok 1: Napisz `.pages.yml`**

```yaml
# Konfiguracja panelu na app.pagescms.org. Plik MUSI leżeć w korzeniu
# repozytorium; ścieżki są względne wobec repo, więc wskazują w głąb
# polasobun/.

media:
  - name: zdjecia
    label: Zdjęcia kampanii
    input: polasobun/src/assets/photos
    output: /photos
    categories: [image]
    extensions: [jpg, jpeg]
  - name: portret
    label: Portret na stronie kontaktowej
    input: polasobun/src/assets/portret
    output: /portret
    categories: [image]
    extensions: [jpg, jpeg]

content:
  - name: kampanie
    label: Kampanie
    type: collection
    path: polasobun/src/content/projects
    format: json
    filename: '{fields.slug}.json'
    view:
      primary: title
      fields: [title, client, tags]
    fields:
      - name: title
        label: Nazwa
        type: string
        required: true
      - name: slug
        label: Adres strony
        type: string
        required: true
        # Bez wzorca literówka w slugu tworzy kampanię wskazującą
        # nieistniejący folder zdjęć i wywala build dopiero przy
        # publikacji. Jeśli panel odrzuci `pattern` jako nieznaną opcję,
        # usuń tę linię i zapisz to w AGENTS.md — sam opis niżej zostaje.
        pattern: '^[a-z0-9_-]+$'
        description: >-
          polasobun.com/work/TO-POLE. Małe litery, bez polskich znaków
          i spacji. Po opublikowaniu NIE zmieniaj — zepsuje odnośniki.
      - name: client
        label: Klient
        type: string
      - name: year
        label: Rok
        type: number
      - name: tags
        label: Zakładki
        type: select
        options:
          multiple: true
          values: [commercial, portraits, food]
      - name: cover
        label: Okładka
        type: image
        options:
          media: zdjecia
      - name: featured
        label: Kadry na stronę główną
        type: image
        description: >-
          Od najmocniejszego. Kryterium to czytelność z kafla wielkości
          znaczka: mocna plama koloru, jeden bohater, kontrast.
        options:
          media: zdjecia
          multiple: { max: 6 }
          unique: true
      - name: photos
        label: Zdjęcia kampanii
        type: image
        description: Kolejność jak na stronie kampanii. Przeciągaj, żeby zmienić.
        options:
          media: zdjecia
          multiple: true
          unique: true
      - name: collection
        label: Galeria zbiorcza
        type: boolean
        description: Zaznaczone tylko dla _portraits i _food. Nie ruszaj.
      - name: legacyPath
        label: Stary adres
        type: string
        description: Adres na dawnej stronie. Nie dodawaj nowych.

  - name: kolejnosc
    label: Kolejność kampanii
    type: file
    path: polasobun/src/content/order.json
    format: json
    fields:
      - name: kolejnosc
        label: Kolejność
        type: reference
        options:
          collection: kampanie
          multiple: true
          value: '{fields.slug}'
          label: '{fields.title}'

  - name: kontakt
    label: Strona kontaktowa
    type: file
    path: polasobun/src/content/contact.json
    format: json
    fields:
      - name: akapity
        label: Bio
        type: text
        list: true
      - name: portret
        label: Portret
        type: image
        options:
          media: portret
      - name: kontakt
        label: Dane kontaktowe
        type: object
        list:
          collapsible:
            summary: '{fields.etykieta}'
        fields:
          - { name: etykieta, label: Etykieta, type: string }
          - { name: tekst, label: Widoczny tekst, type: string }
          - { name: href, label: Odnośnik, type: string }
          - { name: zewnetrzny, label: Otwiera nową kartę, type: boolean }

actions:
  - name: publikuj
    label: Opublikuj stronę
    workflow: publikacja.yml
    ref: current
```

- [ ] **Krok 2: Commit i push**

```bash
git add .pages.yml
git commit -m "feat: konfiguracja panelu Pages CMS"
git push
```

- [ ] **Krok 3: Zainstaluj aplikację GitHub i otwórz repozytorium**

Wejdź na `app.pagescms.org`, zaloguj się kontem GitHub, zainstaluj
aplikację na koncie `lucckkyGui` z dostępem do `polasobun-site`.
Otwórz repozytorium w panelu.

- [ ] **Krok 4: Zweryfikuj pięć niepewnych opcji konfiguracji**

W specyfikacji są **oczekiwane, nie zmierzone**. Sprawdź je teraz,
zanim ktokolwiek na nich polegnie. Zapisz wynik każdej:

1. **Czy `photos` da się przeciągać?** Otwórz kampanię `pandora`,
   spróbuj przestawić dwa zdjęcia myszką, zapisz, obejrzyj plik
   `src/content/projects/pandora.json` w gicie.
2. **Czy `kolejnosc` (pole `reference`) da się przeciągać?** To samo
   na `order.json`.
3. **Czy `value: '{fields.slug}'` zapisuje sam slug?** Sprawdź, czy
   `order.json` nadal ma `["pandora", "rimmel", …]`, a nie ścieżki
   plików. **Jeśli zapisuje ścieżki — `projects.ts` przestanie
   działać.** Wtedy albo zmień szablon, albo dopasuj `projects.ts`
   do tego, co CMS faktycznie zapisuje.
4. **Czy `pattern` działa na polu `string`?** Spróbuj zapisać
   kampanię ze slugiem `Wielkie Litery`. Jeśli panel przyjmie —
   opcja jest ignorowana; usuń ją z konfiguracji i odnotuj.
5. **Czy `_portraits` i `_food` otwierają się poprawnie?** Szablon
   `filename` slugifikuje wartość, ale nazywa wyłącznie NOWE wpisy —
   istniejące pliki zachowują nazwy. Potwierdź, że edycja i zapis
   nie przemianowują ich na `portraits.json`.

- [ ] **Krok 5: Cofnij zmiany testowe**

```bash
git fetch && git reset --hard origin/main
```

Jeśli test z kroku 4 zostawił przestawione zdjęcia — cofnij commity
z panelu, żeby `dist` pozostał porównywalny.

- [ ] **Krok 6: Sprawdź przycisk publikacji**

W panelu kliknij **Opublikuj stronę**. Potwierdź w GitHubie, że
uruchomił się workflow `Publikacja`:

```bash
gh run list --workflow=publikacja.yml --limit 1
```

Oczekiwane: uruchomienie ze zdarzeniem `workflow_dispatch`, status
`success`.

- [ ] **Krok 7: Jeśli któraś opcja nie zadziałała — udokumentuj i popraw**

Nie obchodź problemu instalowaniem czegokolwiek. Jeśli `reference` nie
przeciąga się, kolejność kampanii zostaje polem tekstowym z listą
slugów — brzydko, ale działa i nie kłamie. Zapisz decyzję w AGENTS.md.

---

### Zadanie 7: Workflow normalizacji zdjęć

**Pliki:**
- Utwórz: `polasobun/scripts/normalizuj-zdjecia.mjs`
- Utwórz: `.github/workflows/normalizacja.yml`

**Interfejsy:**
- Produkuje: automatyczne poprawianie zdjęć wgranych przez panel —
  dłuższy bok do 2560 px, JPEG q82 mozjpeg 4:4:4, EXIF zdjęty.

- [ ] **Krok 1: Potwierdź, że `sharp` się rozwiązuje**

`sharp` przychodzi z Astro jako domyślna usługa obrazów. Nie instaluj
go osobno — to naruszyłoby regułę zerowych zależności.

```bash
cd polasobun && node -e "import('sharp').then(m=>console.log('sharp', m.default.versions.sharp))"
```

Oczekiwane: numer wersji. Jeśli moduł się nie rozwiązuje — zatrzymaj
się i zgłoś, zamiast dodawać zależność.

- [ ] **Krok 2: Napisz skrypt normalizacji**

```js
/**
 * Normalizacja zdjęć wgranych przez panel.
 *
 * Klientka nie musi umieć eksportować „poprawnie" — ten skrypt
 * doprowadza plik do konwencji repozytorium: dłuższy bok max 2560 px,
 * JPEG q82 (mozjpeg, 4:4:4), bez EXIF-u.
 *
 * UWAGA, CZEGO TO NIE ROBI: surowy plik ZOSTAJE W HISTORII GITA na
 * zawsze. To siatka bezpieczeństwa, nie plan A — planem A jest preset
 * eksportu po stronie klientki. Nie próbuj tego naprawiać przez
 * --amend z force-pushem: panel pisze na tę samą gałąź i wyścig
 * jest realny.
 *
 * Wywołanie: node scripts/normalizuj-zdjecia.mjs <plik> [<plik> ...]
 */
import { statSync } from 'node:fs';
import { rename, unlink } from 'node:fs/promises';
import sharp from 'sharp';

const DLUZSZY_BOK = 2560;
const JAKOSC = 82;

let poprawione = 0;

for (const plik of process.argv.slice(2)) {
  let meta;
  try {
    meta = await sharp(plik).metadata();
  } catch {
    console.log(`pomijam (nie obraz): ${plik}`);
    continue;
  }

  const zaDuzy = Math.max(meta.width ?? 0, meta.height ?? 0) > DLUZSZY_BOK;
  const maExif = Boolean(meta.exif || meta.icc || meta.iptc || meta.xmp);
  const podprobkowany = meta.chromaSubsampling !== '4:4:4';

  if (!zaDuzy && !maExif && !podprobkowany) {
    console.log(`bez zmian: ${plik} (${meta.width}x${meta.height})`);
    continue;
  }

  const przed = statSync(plik).size;
  const tymczasowy = `${plik}.tmp`;

  await sharp(plik)
    // rotate() bez argumentu stosuje orientację z EXIF-u ZANIM go
    // zdejmiemy. Bez tego zdjęcie z telefonu położy się na bok.
    .rotate()
    .resize({
      width: DLUZSZY_BOK,
      height: DLUZSZY_BOK,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JAKOSC, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(tymczasowy);

  const po = statSync(tymczasowy).size;
  await unlink(plik);
  await rename(tymczasowy, plik);

  console.log(
    `poprawione: ${plik} ${meta.width}x${meta.height} ` +
      `${(przed / 1048576).toFixed(2)} MB -> ${(po / 1048576).toFixed(2)} MB`,
  );
  poprawione++;
}

console.log(`\nPoprawionych plików: ${poprawione}`);
```

- [ ] **Krok 3: Przetestuj skrypt lokalnie na kopii**

```bash
cd polasobun && cp src/assets/photos/pandora/02.jpg /tmp/proba.jpg
node -e "
const sharp=require('sharp');
sharp('/tmp/proba.jpg').resize({width:4000}).jpeg({quality:98}).toFile('/tmp/proba-duza.jpg').then(()=>console.log('gotowe'));
"
ls -lh /tmp/proba-duza.jpg
node scripts/normalizuj-zdjecia.mjs /tmp/proba-duza.jpg
node -e "require('sharp')('/tmp/proba-duza.jpg').metadata().then(m=>console.log(m.width,'x',m.height,m.chromaSubsampling))"
```

Oczekiwane: skrypt raportuje `poprawione`, plik po zmianie ma dłuższy
bok **2560** i podpróbkowanie **4:4:4**, waga wyraźnie spada.

- [ ] **Krok 4: Napisz workflow**

```yaml
name: Normalizacja zdjęć

on:
  push:
    branches: [main]
    paths:
      - 'polasobun/src/assets/photos/**'
      - 'polasobun/src/assets/portret/**'

concurrency:
  group: normalizacja
  cancel-in-progress: false

jobs:
  normalizuj:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: polasobun/package-lock.json

      - run: npm ci
        working-directory: polasobun

      - id: zmienione
        run: |
          # github.event.before bywa zerowe przy pierwszym pushu gałęzi.
          PRZED='${{ github.event.before }}'
          if [ -z "$PRZED" ] || [ "$PRZED" = "0000000000000000000000000000000000000000" ]; then
            PRZED=$(git rev-parse HEAD^ 2>/dev/null || echo "")
          fi
          if [ -z "$PRZED" ]; then
            echo "Brak punktu odniesienia, pomijam." && echo "pliki=" >> "$GITHUB_OUTPUT" && exit 0
          fi
          git diff --name-only --diff-filter=AM "$PRZED" '${{ github.sha }}' \
            -- 'polasobun/src/assets/photos/**' 'polasobun/src/assets/portret/**' \
            > /tmp/zmienione.txt
          echo "Zmienione pliki:" && cat /tmp/zmienione.txt
          echo "pliki=$(wc -l < /tmp/zmienione.txt)" >> "$GITHUB_OUTPUT"

      - name: Normalizuj
        if: steps.zmienione.outputs.pliki != '' && steps.zmienione.outputs.pliki != '0'
        run: |
          cd polasobun
          sed 's|^polasobun/||' /tmp/zmienione.txt | tr '\n' '\0' \
            | xargs -0 --no-run-if-empty node scripts/normalizuj-zdjecia.mjs \
            | tee -a "$GITHUB_STEP_SUMMARY"

      # Commit robiony GITHUB_TOKEN-em z definicji NIE wyzwala kolejnych
      # workflow'ów, a [skip ci] jest drugim, niezależnym bezpiecznikiem.
      # Rekursji nie ma z dwóch powodów naraz — to celowe.
      - name: Zacommituj poprawki
        run: |
          if [ -z "$(git status --porcelain)" ]; then
            echo "Nic do poprawienia." && exit 0
          fi
          git config user.name  'github-actions[bot]'
          git config user.email 'github-actions[bot]@users.noreply.github.com'
          git add -A
          git commit -m "chore: normalizacja wgranych zdjęć [skip ci]"
          git push
```

- [ ] **Krok 5: Commit, push i test integracyjny**

To jest test tego zadania — celowo za duże zdjęcie musi zostać
poprawione bez Twojego udziału.

```bash
git add polasobun/scripts/normalizuj-zdjecia.mjs .github/workflows/normalizacja.yml
git commit -m "feat: automatyczna normalizacja zdjęć wgranych przez panel"
git push

cp /tmp/proba-duza.jpg polasobun/src/assets/photos/pandora/99.jpg
git add polasobun/src/assets/photos/pandora/99.jpg
git commit -m "test: celowo za duże zdjęcie do sprawdzenia normalizacji"
git push
gh run watch
```

- [ ] **Krok 6: Potwierdź, że plik został poprawiony w repozytorium**

```bash
git pull
cd polasobun && node -e "require('sharp')('src/assets/photos/pandora/99.jpg').metadata().then(m=>console.log(m.width,'x',m.height,m.chromaSubsampling))"
git log --oneline -2
```

Oczekiwane: dłuższy bok 2560, podpróbkowanie `4:4:4`, w historii commit
`chore: normalizacja wgranych zdjęć [skip ci]` od `github-actions[bot]`.

- [ ] **Krok 7: Potwierdź, że NIE poszła rekursja**

```bash
gh run list --workflow=normalizacja.yml --limit 5
```

Oczekiwane: **jedno** uruchomienie, nie dwa. Commit bota nie wywołał
kolejnego przebiegu.

- [ ] **Krok 8: Usuń plik testowy**

```bash
git rm polasobun/src/assets/photos/pandora/99.jpg
git commit -m "test: usunięcie zdjęcia testowego"
git push
```

`99.jpg` nie było w `photos` żadnej kampanii, więc nigdy nie trafiło na
stronę — to zamierzone i dowodzi, że lista w danych rządzi, nie folder.

---

### Zadanie 8: Instrukcja dla klientki i onboarding

**Pliki:**
- Utwórz: `INSTRUKCJA.md` (w korzeniu repozytorium)
- Modyfikuj: `polasobun/AGENTS.md`

- [ ] **Krok 1: Napisz `INSTRUKCJA.md` po polsku, bez żargonu**

Odbiorcą jest osoba nietechniczna. Zero słów „commit", „repozytorium",
„build". Ma zawierać dokładnie te sekcje:

1. **Jak się zalogować** — `app.pagescms.org`, przycisk logowania
   GitHubem.
2. **Jak dodać zdjęcia do istniejącej kampanii** — otwórz kampanię,
   pole „Zdjęcia kampanii", przeciągnij pliki.
3. **Jak zmienić kolejność** — przeciąganie kafelków w polu.
4. **Jak zmienić okładkę** — pole „Okładka".
5. **Jak wybrać kadry na stronę główną** — pole „Kadry na stronę
   główną", maksimum sześć, od najmocniejszego.
6. **Jak dodać nową kampanię** — z naciskiem na pole „Adres strony":
   małe litery, bez polskich znaków, po opublikowaniu się go nie zmienia.
7. **Jak opublikować** — przycisk „Opublikuj stronę", zmiana widoczna
   po kilku minutach.
8. **Co się dzieje, jeśli zapomnisz kliknąć** — w nocy około czwartej
   strona i tak się zaktualizuje. **Napisz wprost: cokolwiek zostawisz
   niedokończone na noc, rano będzie widoczne.**
9. **Jak przygotować zdjęcia przed wgraniem** — preset eksportu
   z kroku 2.

- [ ] **Krok 2: Opisz preset eksportu**

W sekcji 9 podaj wartości do ustawienia w Lightroomie albo Capture One:

```
Format:        JPEG
Jakość:        82
Rozmiar:       dłuższy bok 2560 px, bez powiększania
Przestrzeń:    sRGB
Metadane:      bez danych aparatu i lokalizacji
```

Napisz, dlaczego to ważne, w jednym zdaniu bez straszenia: pliki prosto
z aparatu ważą kilkanaście razy więcej i zostają w historii projektu na
stałe, nawet po usunięciu ze strony.

- [ ] **Krok 3: Załóż klientce dostęp**

1. Klientka zakłada darmowe konto na `github.com`.
2. **Włącz jej uwierzytelnianie dwuskładnikowe** — to konto ma prawo
   zapisu do publicznego repozytorium i może uruchamiać publikację.
3. Zaproś ją do repozytorium z rolą **Write**.
4. Poproś o zalogowanie na `app.pagescms.org` i potwierdzenie, że widzi
   kampanie.

- [ ] **Krok 4: Przejdź z nią jedną pełną ścieżkę**

Niech sama, bez Twojej klawiatury: doda zdjęcie do kampanii, przestawi
kolejność, kliknie „Opublikuj stronę" i zobaczy zmianę na
`www.polasobun.com`. Dopiero to jest odbiorem tego planu — nie
działający panel, tylko klientka, która przeszła całą drogę.

- [ ] **Krok 5: Dopisz sekcję o CMS-ie do AGENTS.md**

Krótko, dla przyszłych wykonawców:
- gdzie jest konfiguracja (`.pages.yml` w korzeniu),
- że kolejność, okładka i wybór do ALL są **danymi**, nie konwencją
  nazw — i że `01.jpg` przestało cokolwiek znaczyć,
- że sortowanie nazw to `localeCompare` bez opcji i nie wolno go
  zmieniać na numeryczne,
- że jedyną drogą na produkcję jest `publikacja.yml`, a znacznik
  `wydane` mówi, co jest na żywo,
- **wyniki weryfikacji pięciu niepewnych opcji z zadania 6** —
  zmierzone, nie oczekiwane.

- [ ] **Krok 6: Commit**

```bash
git add INSTRUKCJA.md polasobun/AGENTS.md
git commit -m "docs: instrukcja panelu dla klientki i notatki o CMS-ie"
git push
```

---

## Czego ten plan nie robi

- **Nie poprawia `densities` portretu.** Dzisiejsze
  `densities={[1, 1.45]}` i `PORTRET_PX = 260` są dobrane pod
  ograniczenie pliku źródłowego 379 px. Gdy klientka wgra przez panel
  oryginał w wyższej rozdzielczości, te wartości trzeba przeliczyć —
  osobne zadanie, bo to kod, nie treść.
- **Nie usuwa historii gita.** Repozytorium będzie rosnąć. Preset
  eksportu i normalizacja ograniczają tempo, nie odwracają skutku.
- **Nie buduje wskaźnika niewysłanych zmian.** Pages CMS go nie ma,
  a dorobienie wymagałoby własnego hostowania panelu. Zastępuje go
  nocny cron z planu hostingu.
