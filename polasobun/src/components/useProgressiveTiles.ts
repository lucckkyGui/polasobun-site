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

    /** Odracza opróżnienie o BEZRUCH_MS, licząc od ostatniego sygnału. */
    const zaplanujOproznienie = (): void => {
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
            if (img) {
              kolejka.add(img);
              // Bez tego kolejkę opróżniałoby wyłącznie zdarzenie scroll,
              // a kliknięcie zakładki go nie generuje — kafle odsłonięte
              // zmianą filtra (display:none -> block) utykałyby na wersji
              // lekkiej, bo obserwator już je unobserve()'ował i nie
              // odpali się dla nich ponownie. Podczas przewijania obserwator
              // i tak strzela seriami, więc licznik resetuje się dokładnie
              // tak jak wcześniej.
              zaplanujOproznienie();
            }
            obserwator?.unobserve(wpis.target);
          }
        },
        { rootMargin: ZASIEG },
      );
      for (const kafel of grid.querySelectorAll<HTMLElement>('[data-cat]')) {
        obserwator.observe(kafel);
      }

      window.addEventListener('scroll', zaplanujOproznienie, { passive: true });
      // Pierwsze opróżnienie bez czekania na scroll — użytkownik może
      // w ogóle nie ruszyć strony, a pierwszy ekran ma się doostrzyć.
      zaplanujOproznienie();
    };

    if (document.readyState === 'complete') uruchom();
    else window.addEventListener('load', uruchom, { once: true });

    return () => {
      zywy = false;
      obserwator?.disconnect();
      window.removeEventListener('load', uruchom);
      window.removeEventListener('scroll', zaplanujOproznienie);
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [gridRef]);
}
