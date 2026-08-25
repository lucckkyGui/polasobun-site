import { useState, type ReactNode } from 'react';
import type { ProjectTag } from '../content/projects';

type Filter = 'all' | ProjectTag;

/** Kolejność i etykiety lustrzane wobec obecnej strony klientki. */
const FILTERS: ReadonlyArray<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'portraits', label: 'Portraits' },
  { key: 'food', label: 'Food' },
];

interface Props {
  wordmark: string;
  /** Kafle wyrenderowane po stronie Astro — obrazy przechodzą przez astro:assets. */
  children?: ReactNode;
}

/**
 * Pasek filtrów + siatka. Filtrowanie po stronie klienta, bez przeładowania
 * i BEZ przejścia — wrapper ustawia data-filter, resztę robi reguła
 * display:none w global.css (mechanizm 1:1 z makiety).
 */
export default function Gallery({ wordmark, children }: Props) {
  const [filter, setFilter] = useState<Filter>('all');

  return (
    <>
      <header className="bg-bg border-border sticky top-0 z-20 flex flex-col items-start gap-tight border-b px-gutter py-header sm:flex-row sm:items-center sm:justify-between sm:gap-0">
        <span className="text-text text-wordmark whitespace-nowrap font-bold uppercase leading-none tracking-wordmark">
          {wordmark}
        </span>

        <nav className="flex gap-tight sm:gap-gutter">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              aria-pressed={filter === key}
              className={`text-text text-label cursor-pointer font-medium uppercase leading-none tracking-nav ${
                filter === key ? 'opacity-100' : 'opacity-[0.38]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div
        data-filter={filter}
        className="bg-surface grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-4"
      >
        {children}
      </div>
    </>
  );
}
