import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { ProjectTag } from '../content/projects';

type Filter = 'all' | ProjectTag;

/** Kolejność i etykiety lustrzane wobec obecnej strony klientki. */
const FILTERS: ReadonlyArray<{ key: Filter; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'portraits', label: 'Portraits' },
  { key: 'food', label: 'Food' },
];

/** Musi zgadzać się z --duration-filter-out w global.css. */
const OUT_MS = 100;

interface Props {
  wordmark: string;
  /** Kafle wyrenderowane po stronie Astro — obrazy przechodzą przez astro:assets. */
  children?: ReactNode;
}

/**
 * Pasek filtrów + siatka.
 *
 * Przełączenie filtra to krótkie przenikanie CAŁEJ siatki, nie animacja
 * pojedynczych kafli: przy 374 kaflach osobne przejścia oznaczałyby 374
 * warstwy kompozycji naraz. Tu przenika jeden element.
 *
 * Sam dobór kafli robi nadal reguła display:none po data-filter (mechanizm
 * 1:1 z makiety) — podmieniamy go w połowie przenikania, gdy siatka jest
 * niewidoczna, więc twarde cięcie nigdy nie trafia w oko.
 */
export default function Gallery({ wordmark, children }: Props) {
  /** Filtr zastosowany do siatki. */
  const [filter, setFilter] = useState<Filter>('all');
  /** Filtr wybrany, ale jeszcze niezastosowany — siatka właśnie znika. */
  const [pending, setPending] = useState<Filter | null>(null);
  const timer = useRef<number | null>(null);
  const gridRef = useRef<HTMLDivElement | null>(null);

  /** Podświetlenie w pasku reaguje NATYCHMIAST, nie po zakończeniu wyjścia. */
  const active = pending ?? filter;
  const swapping = pending !== null;

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  /**
   * Doładowywanie paczkami. Natywne loading="lazy" rusza dopiero, gdy kafel
   * jest tuż przy widoku — przy szybkim przewijaniu nie nadąża i zdjęcia
   * dochodzą w locie. Do tego kafle od 13. w górę mają content-visibility,
   * więc ich obrazy nie są renderowane i natywny mechanizm ma jeszcze mniej
   * czasu na reakcję.
   *
   * Obserwujemy KAFEL, nie obraz: kafel ma własny box nawet przy pominiętym
   * renderowaniu zawartości, obraz w środku nie. Kafle w zasięgu półtora
   * ekranu przełączamy na eager, co wymusza natychmiastowe pobranie.
   *
   * Obserwator wpinamy dopiero po zdarzeniu load, żeby nie konkurował
   * o pasmo z pierwszym ekranem i nie psuł LCP.
   */
  useEffect(() => {
    let io: IntersectionObserver | null = null;

    const uruchom = () => {
      const grid = gridRef.current;
      if (!grid) return;
      const kafle = [...grid.querySelectorAll<HTMLElement>('[data-cat]')].filter((kafel) =>
        kafel.querySelector('img[loading="lazy"]'),
      );
      if (!kafle.length) return;

      io = new IntersectionObserver(
        (wpisy) => {
          for (const wpis of wpisy) {
            if (!wpis.isIntersecting) continue;
            const img = wpis.target.querySelector<HTMLImageElement>('img[loading="lazy"]');
            if (img) img.loading = 'eager';
            io?.unobserve(wpis.target);
          }
        },
        { rootMargin: '150% 0px' },
      );
      kafle.forEach((kafel) => io?.observe(kafel));
    };

    if (document.readyState === 'complete') uruchom();
    else window.addEventListener('load', uruchom, { once: true });

    return () => {
      io?.disconnect();
      window.removeEventListener('load', uruchom);
    };
  }, []);

  const choose = useCallback(
    (next: Filter) => {
      if (next === active) return;
      // Przerywalne: kolejne kliknięcie retarguje trwające przenikanie.
      if (timer.current !== null) window.clearTimeout(timer.current);
      setPending(next);
      timer.current = window.setTimeout(() => {
        setFilter(next);
        setPending(null);
        timer.current = null;
      }, OUT_MS);
    },
    [active],
  );

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
              onClick={() => choose(key)}
              aria-pressed={active === key}
              className={`text-text text-label cursor-pointer font-medium uppercase leading-none tracking-nav transition-opacity ease-enter duration-[var(--duration-fast)] ${
                active === key ? 'opacity-100' : 'opacity-[0.38]'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <div
        ref={gridRef}
        data-filter={filter}
        className={`bg-surface grid grid-cols-2 gap-0 transition-opacity ease-enter lg:grid-cols-4 ${
          swapping
            ? 'opacity-0 duration-[var(--duration-filter-out)]'
            : 'opacity-100 duration-[var(--duration-filter-in)]'
        }`}
      >
        {children}
      </div>
    </>
  );
}
