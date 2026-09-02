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
   * Pełna lista zdjęć kampanii, w kolejności ustalonej przez klientkę
   * przeciąganiem w panelu. Kolejność jest częścią danych — przestała
   * być pochodną nazw plików.
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
for (const [plik, mod] of Object.entries(wpisy)) {
  /*
   * Parametr typu przy import.meta.glob to TWIERDZENIE, nie walidacja —
   * Vite niczego nie sprawdza, a JSON z panelu nie przechodzi przez
   * kompilator. Wpis bez pola `photos` wywaliłby się dopiero w index.astro
   * jako "Cannot read properties of undefined (reading 'includes')", bez
   * wskazania pliku. Sprawdzamy tutaj, póki wiemy, skąd wpis pochodzi.
   *
   * `tags` jest w tej bramce z dokładnie tego samego powodu, co `photos`:
   * kampania zapisana bez zaznaczonej ani jednej zakładki wywraca się na
   * `project.tags.filter(...)` w index.astro (dwa miejsca) i na
   * `project.tags.map(...)` w work/[slug].astro — znowu bez wskazania
   * pliku. Panel zatrzymuje to wcześniej (`required: true` na polu
   * `tags` w `.pages.yml`), ale wpis może powstać także poza panelem.
   *
   * UWAGA NA BRZMIENIE TEGO KOMENTARZA — nazwy metod trzymaj tu SKLEJONE
   * Z NAWIASEM, w formie `nazwa(...)`. `global.css` każe Tailwindowi
   * skanować `src/**` (`@source`), a skan nie odróżnia kodu od komentarza
   * ani prozy: nazwa metody napisana w zdaniu jako samotny wyraz też do
   * niego trafia. Część nazw metod tablicowych pokrywa się z nazwami
   * własności CSS, więc Tailwind generuje wtedy odpowiadające im utility
   * wraz z całym zestawem @property. Zmierzone przy pisaniu tej bramki:
   * jedno takie słowo w komentarzu dokleiło 1205 bajtów do KAŻDEJ z 19
   * stron (CSS idzie inline, `inlineStylesheets: 'always'`) i wywaliło
   * dowód identyczności `dist`. Ta sama pułapka dotyczy `index.astro`.
   */
  const wpis = mod.default as Partial<Project> | undefined;
  if (
    typeof wpis?.slug !== 'string' ||
    typeof wpis.cover !== 'string' ||
    !Array.isArray(wpis.photos) ||
    !Array.isArray(wpis.tags)
  ) {
    throw new Error(
      `Niepoprawny wpis kampanii w ${plik}: wymagane slug (string), ` +
        `cover (string), photos (tablica) i tags (tablica).`,
    );
  }
  /*
   * Typ Project obiecuje `year: number | null` i `client: string | null` —
   * czyli te dwa pola mają być ZAWSZE obecne, nigdy `undefined`. To jednak
   * obietnica typu, nie walidacja w runtime: JSON z panelu Pages CMS (albo
   * ręczna edycja, albo skrypt migracyjny) nie przechodzi przez kompilator
   * i nie musi jej dotrzymać — wystarczy, że pominie klucz zamiast zapisać
   * go jako null. [slug].astro sprawdza `!== null`, licząc na tę obietnicę:
   * `undefined !== null` jest prawdą, więc taki wpis przeszedłby przez
   * warunek, a `String(undefined)` wydrukowałby na stronie kampanii widoczny
   * napis "undefined". Normalizujemy tutaj, w jedynym wejściu do danych, więc
   * każdy dzisiejszy i przyszły konsument dostaje już tylko `number | null`
   * i `string | null`, zgodnie z typem. `??`, nie `||`: `year: 0` i
   * `client: ''` to prawdziwe wartości, nie brak danych — nie wolno ich tu
   * zgubić. `legacyPath` i `collection` NIE są normalizowane: typ deklaruje
   * je jako opcjonalne (`?`), więc ich brak to poprawny, zamierzony stan.
   */
  const znormalizowany: Project = {
    ...(wpis as Project),
    year: wpis.year ?? null,
    client: wpis.client ?? null,
  };
  wgSlugu.set(znormalizowany.slug, znormalizowany);
}

/**
 * Kolejność kampanii pochodzi z order.json, nie z nazw plików.
 * Steruje dwiema rzeczami naraz: kolejnością kafli w COMMERCIAL
 * i rundami round-robina w ALL.
 */
const kolejnosc = order.kolejnosc as string[];

/*
 * Zdublowany slug renderowałby kampanię dwa razy — dwa identyczne kafle
 * w COMMERCIAL. Sprawdzamy to OSOBNO, bo poprzednia bramka porównywała
 * liczności i dało się ją oszukać: duplikat w order.json plus jeden nowy
 * plik wpisu dają równe liczby, więc wyjątek nie padał, nowa kampania
 * była niewidoczna, a zdublowana szła dwa razy.
 */
const powtorzone = [...new Set(kolejnosc.filter((slug, i) => kolejnosc.indexOf(slug) !== i))];
if (powtorzone.length) {
  throw new Error(`Powtórzone slugi w order.json: ${powtorzone.join(', ')}`);
}

export const projects: Project[] = kolejnosc.map((slug) => {
  const wpis = wgSlugu.get(slug);
  if (!wpis) throw new Error(`order.json wskazuje nieistniejącą kampanię "${slug}"`);
  return wpis;
});

/*
 * Kampania spoza order.json byłaby niewidoczna na stronie głównej, ale
 * nadal generowałaby /work/<slug> i wpis w sitemapie. Cicha rozbieżność
 * jest gorsza niż zerwany build — dlatego rzucamy. Porównujemy ZBIORY,
 * nie liczności: tylko to wyłapie brakujący wpis niezależnie od tego, czy
 * order.json ma gdzie indziej duplikat.
 */
const wKolejnosci = new Set(kolejnosc);
const pozaKolejnoscia = [...wgSlugu.keys()].filter((slug) => !wKolejnosci.has(slug));
if (pozaKolejnoscia.length) {
  throw new Error(
    `Kampanie mają plik wpisu, ale nie ma ich w order.json: ${pozaKolejnoscia.join(', ')}`,
  );
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
