import data from './projects.json';

/**
 * Filtry na stronie: ALL / COMMERCIAL / PORTRAITS / FOOD.
 * ALL nie jest tagiem — to brak filtra.
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
  /** Adres na starej stronie (Format.com). Tylko pod przyszłe 301. */
  legacyPath?: string;
}

export const projects: Project[] = data as Project[];
