import { useCallback, useEffect, useRef, useState } from 'react';
import FlipImage from './originkit/image-flipper';

export interface IntroImage {
  /** URL z astro:assets (getImage) — canvas potrzebuje stringa, nie ImageMetadata. */
  src: string;
  focusY?: number;
}

/**
 * Musi zgadzać się z transition przekazanym do FlipImage.
 * Komponent Originkit cykluje w nieskończoność i nie ma callbacku końca,
 * więc moment oddania sceny siatce odmierzamy z zewnątrz.
 */
const DURATION_S = 1.2;
const DELAY_S = 1;
const PHOTOS = 2;

/** Kadr ląduje po DURATION, potem trzyma DELAY. Dwa kadry = 2 × (1,2 + 1) s. */
const PLAY_MS = PHOTOS * (DURATION_S + DELAY_S) * 1000;
/** Zgodne z --duration-flip. */
const FADE_MS = 350;

/** Gdyby zdjęcie nie doszło — nie blokujemy strony w nieskończoność. */
const MAX_PRELOAD_MS = 6000;
/** Gdyby build() nigdy nie wystartował — odliczamy mimo wszystko. */
const MAX_CANVAS_WAIT_MS = 3000;

/** Intro to zachwyt dla pierwszego kontaktu, nie podatek od każdego wejścia. */
const SESSION_KEY = 'polasobun:intro-played';

type Phase = 'idle' | 'playing' | 'leaving' | 'done';

function alreadyPlayed(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    // Tryb prywatny albo zablokowane storage — trudno, pokażemy raz więcej.
    return false;
  }
}

function markPlayed(): void {
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    // Bez znaczenia dla działania animacji.
  }
}

/**
 * Wymiary, jakie FlipImage nadaje płótnu w swoim build().
 * UWAGA: samo `canvas.width > 0` NIE jest sygnałem startu — puste płótno
 * ma domyślnie 300×150 (sprawdzone w przeglądarce), więc taki warunek
 * spełnia się już przy montażu i nic nie wykrywa.
 */
function builtCanvasSize(width: number, height: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  return { width: Math.round(width * dpr), height: Math.round(height * dpr) };
}

interface Props {
  images: IntroImage[];
}

/**
 * Animacja wejścia: dwa zdjęcia w split-flapie, potem odsłonięcie siatki.
 *
 * Na serwerze renderuje null — bez JS-u strona jest od razu użyteczna
 * i nic jej nie zasłania. Przy prefers-reduced-motion oraz przy powtórnym
 * wejściu w tej samej sesji animacja nie startuje w ogóle.
 */
export default function Intro({ images }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [ready, setReady] = useState(false);
  const [started, setStarted] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const srcKey = images.map(({ src }) => src).join('|');

  const skip = useCallback(() => {
    setPhase((current) => (current === 'playing' ? 'leaving' : current));
  }, []);

  useEffect(() => {
    if (alreadyPlayed() || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('done');
      return;
    }
    markPlayed();

    /*
     * Rozmiar mierzymy RAZ i zamrażamy. cardWidth/cardHeight są w deps
     * efektu FlipImage — reagowanie na resize restartowałoby animację od
     * zera, podczas gdy zewnętrzne odliczanie biegłoby dalej.
     */
    setSize({ w: window.innerWidth, h: window.innerHeight });
    setPhase('playing');
  }, []);

  /** Ucieczka klawiaturą. Kliknięcie w kurtynę robi to samo. */
  useEffect(() => {
    if (phase !== 'playing') return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') skip();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, skip]);

  /**
   * Zdjęcia muszą być w cache ZANIM zamontujemy FlipImage — komponent
   * startuje swój zegar dopiero po onload. Jeśli któreś nie dojdzie,
   * pomijamy animację zamiast odtwarzać zepsutą.
   */
  useEffect(() => {
    if (phase !== 'playing') return;

    let alive = true;
    let settled = 0;
    let failed = false;
    const guard = window.setTimeout(() => {
      if (alive) setReady(true);
    }, MAX_PRELOAD_MS);

    for (const { src } of images) {
      const preload = new Image();
      preload.crossOrigin = 'anonymous';
      const tick = (ok: boolean) => {
        if (!ok) failed = true;
        settled += 1;
        if (settled !== images.length) return;
        window.clearTimeout(guard);
        if (!alive) return;
        if (failed) setPhase('done');
        else setReady(true);
      };
      preload.onload = () => tick(true);
      preload.onerror = () => tick(false);
      preload.src = src;
    }

    return () => {
      alive = false;
      window.clearTimeout(guard);
    };
  }, [phase, srcKey]);

  /**
   * Odliczanie startuje dopiero, gdy FlipImage wykona build() — czyli gdy
   * płótno dostanie DOKŁADNIE wymiary wyliczone z cardWidth × dpr.
   * Porównanie z konkretną wartością, nie z zerem: puste płótno ma 300×150.
   */
  useEffect(() => {
    if (!ready || !size) return;

    const expected = builtCanvasSize(size.w, size.h);
    const deadline = performance.now() + MAX_CANVAS_WAIT_MS;
    let raf = 0;

    const check = () => {
      const canvas = overlayRef.current?.querySelector('canvas');
      const built =
        canvas && canvas.width === expected.width && canvas.height === expected.height;
      if (built || performance.now() > deadline) {
        setStarted(true);
        return;
      }
      raf = requestAnimationFrame(check);
    };
    raf = requestAnimationFrame(check);

    return () => cancelAnimationFrame(raf);
  }, [ready, size]);

  useEffect(() => {
    if (!started) return;
    const timer = window.setTimeout(
      () => setPhase((current) => (current === 'playing' ? 'leaving' : current)),
      PLAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [started]);

  useEffect(() => {
    if (phase !== 'leaving') return;
    const timer = window.setTimeout(() => setPhase('done'), FADE_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  /** Blokada przewijania tylko na czas animacji. */
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'leaving') return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [phase]);

  if (phase === 'idle' || phase === 'done' || !size) return null;

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      onClick={skip}
      className={`bg-surface fixed inset-0 z-50 grid cursor-pointer place-items-center overflow-hidden transition-opacity ease-enter duration-[var(--duration-flip)] ${
        phase === 'leaving' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {ready && (
        <FlipImage
          mode="multi"
          images={images.map(({ src, focusY }) => ({ image: src, focusY }))}
          cardWidth={size.w}
          cardHeight={size.h}
          tiles={Math.max(24, Math.round(size.w / 26))}
          angle={77}
          flip={50}
          transition={{ duration: DURATION_S, ease: 'linear', delay: DELAY_S }}
        />
      )}
    </div>
  );
}
