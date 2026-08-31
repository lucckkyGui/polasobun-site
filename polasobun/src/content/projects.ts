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
