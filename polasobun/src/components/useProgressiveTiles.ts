import { useEffect, type RefObject } from 'react';

/** Po tylu ms bez zdarzenia scroll uznajemy, że użytkownik się zatrzymał. */
const BEZRUCH_MS = 150;

/** Zasięg obserwatora — jeden ekran w każdą stronę. */
const ZASIEG = '100% 0px';

/**
 * Ile ekranów od środka widoku jeszcze podnosimy przy opróżnianiu
 * kolejki — dalej kafel zostaje na wariancie lekkim. Patrz komentarz
 * przy `oproznij()`.
 */
const LIMIT_EKRANOW = 2;

/**
 * Podnoszenie kafli do pełnej jakości.
 *
 * HTML niesie wariant lekki, bo na łączu o dużym opóźnieniu decyduje
 * liczba obrotów sieci, a nie waga. Wersja ostra dochodzi dopiero, gdy
 * przewijanie zwolni, i tylko dla kafli w promieniu dwóch ekranów od
 * miejsca zatrzymania (LIMIT_EKRANOW) — kto przewinie dalej i się tam
 * zatrzyma, nie pobiera wersji ostrej kafli, które zostały daleko w tyle.
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

    /**
     * Najbliżej środka ekranu najpierw — tam patrzy użytkownik.
     *
     * LIMIT ODLEGŁOŚCI: przy jednym długim, ciągłym przewijaniu przez cały
     * widok ALL obserwator dosypuje do kolejki bez przerwy, a licznik
     * bezruchu (zaplanujOproznienie) wciąż się resetuje. Jedno
     * przeciągnięcie przez cały widok potrafi zakolejkować ~100 kafli —
     * bez limitu wystrzeliłyby naraz po 150 ms bezruchu: około 9,5 MB
     * równoległych żądań i tyleż równoczesnych decode() obrazów
     * 1000×1250. Kafel oddalony od środka widoku o więcej niż
     * LIMIT_EKRANOW ekranów zostaje więc na wariancie lekkim.
     *
     * Odfiltrowany kafel NIE wraca do `kolejka` — ale `data-pelny`
     * zostaje na nim, bo zdejmuje go dopiero `podnies()` przy realnym
     * podniesieniu. Obserwator go już unobserve()'ował w chwili, gdy
     * wszedł w zasięg (patrz `uruchom`), ale TYLKO jeśli wtedy nie miał
     * już nic do podniesienia — kafel z wciąż obecnym `data-pelny`
     * zostaje obserwowany dalej, więc jeśli użytkownik do niego wróci,
     * zostanie ponownie zauważony i zakolejkowany przy kolejnym
     * przewinięciu.
     *
     * Mierzymy od ŚRODKA kafla do środka widoku, nie od jego górnej
     * krawędzi. Miara po `rect.top` jest niesymetryczna o całą wysokość
     * kafla: przy ekranie 915 px i kaflu 515 px kafel tuż POD widokiem
     * wypadał na 457 px, a lustrzany kafel tuż NAD widokiem na 972 px,
     * mimo że oba są w tej samej odległości od oka. Efekt: kafle w dole
     * przechodziły filtr do ~2,3 ekranu, a te w górze były odcinane już
     * przy ~1,7 — przewijanie w górę doostrzało mniej niż w dół, i nikt
     * by tego nie zauważył poza pomiarem.
     *
     * Odległość liczymy RAZ na kafel, w osobnym kroku przed sort() —
     * rect policzony wewnątrz komparatora liczyłby się O(n log n) razy
     * zamiast O(n). Bez skutków na wynik (layout jest cache'owany do
     * najbliższej zmiany DOM), ale to myląca konstrukcja.
     */
    const oproznij = (): void => {
      const doPodniesienia = [...kolejka];
      kolejka.clear();
      const srodek = window.innerHeight / 2;
      const limit = LIMIT_EKRANOW * window.innerHeight;

      doPodniesienia
        .map((img) => {
          const prostokat = img.getBoundingClientRect();
          return {
            img,
            odleglosc: Math.abs(prostokat.top + prostokat.height / 2 - srodek),
          };
        })
        .filter(({ odleglosc }) => odleglosc <= limit)
        .sort((a, b) => a.odleglosc - b.odleglosc)
        .forEach(({ img }) => void podnies(img));
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
              // Celowo NIE unobserve() tutaj: oproznij() może ten kafel
              // odfiltrować (patrz LIMIT_EKRANOW), a wtedy `data-pelny`
              // zostaje na nim. Kafel musi zostać obserwowany, żeby
              // przewinięcie do niego z powrotem znowu go zakolejkowało.
            } else {
              // Nic już nie ma do podniesienia (podniesiony wcześniej,
              // przy innym przewinięciu) — dopiero teraz bezpiecznie
              // przestajemy obserwować.
              obserwator?.unobserve(wpis.target);
            }
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
