import data from './projects.json';

/** Kategorie kampanii. Rozszerzaj wyłącznie razem z projects.json. */
export type ProjectTag =
  | 'beauty'
  | 'fashion'
  | 'food'
  | 'lifestyle'
  | 'portrait'
  | 'sport'
  | 'still-life';

export interface Project {
  /** Musi odpowiadać nazwie folderu w src/assets/photos/. */
  slug: string;
  title: string;
  client: string;
  /** null dopóki klientka nie uzupełni danych. */
  year: number | null;
  /** null dopóki klientka nie uzupełni danych. */
  role: string | null;
  tags: ProjectTag[];
}

export const projects: Project[] = data as Project[];
