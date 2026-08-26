import { useEffect, useRef, useState } from 'react';
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

/**
 * Bezpiecznik: gdyby któreś zdjęcie nie doszło, nie blokujemy strony
 * w nieskończoność — po tym czasie ruszamy tak czy inaczej.
 */
const MAX_PRELOAD_MS = 6000;

type Phase = 'idle' | 'playing' | 'leaving' | 'done';

interface Props {
  images: IntroImage[];
}

/**
 * Animacja wejścia: dwa zdjęcia w split-flapie, potem odsłonięcie siatki.
 *
 * Na serwerze renderuje null — dzięki temu bez JS-u strona jest od razu
 * użyteczna i nic jej nie zasłania. Przy prefers-reduced-motion animacja
 * nie startuje w ogóle (canvas chodzi na requestAnimationFrame, więc
 * globalny bezpiecznik z global.css by go nie zatrzymał).
 */
export default function Intro({ images }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [ready, setReady] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);

  const srcKey = images.map(({ src }) => src).join('|');

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('done');
      return;
    }

    const measure = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener('resize', measure);
    setPhase('playing');

    return () => window.removeEventListener('resize', measure);
  }, []);

  /**
   * Zdjęcia muszą być w cache ZANIM ruszy odliczanie. FlipImage startuje
   * swój zegar dopiero po onload, więc odmierzanie od montażu powodowało,
   * że przy wolniejszej sieci drugi kadr nie zdążył się pokazać —
   * zmierzone na produkcji: canvas znikał w 4639 ms, a pierwszy kadr
   * składał się dopiero ~3000 ms.
   */
  useEffect(() => {
    if (phase !== 'playing') return;

    let alive = true;
    let settled = 0;
    const finish = () => {
      if (alive) setReady(true);
    };
    const guard = window.setTimeout(finish, MAX_PRELOAD_MS);

    for (const { src } of images) {
      const preload = new Image();
      preload.crossOrigin = 'anonymous';
      const tick = () => {
        settled += 1;
        if (settled === images.length) {
          window.clearTimeout(guard);
          finish();
        }
      };
      preload.onload = tick;
      preload.onerror = tick;
      preload.src = src;
    }

    return () => {
      alive = false;
      window.clearTimeout(guard);
    };
  }, [phase, srcKey]);

  /**
   * Odliczanie startuje dopiero, gdy canvas NAPRAWDĘ zaczyna rysować, a nie
   * gdy skończy się preload. FlipImage nadaje płótnu wymiary w swoim build(),
   * czyli po hydratacji wyspy i dekodowaniu obrazu — ta zwłoka potrafi zjeść
   * kilkaset ms. Licząc od preloadu drugi kadr nie mieścił się w oknie
   * i animacja kończyła się na pierwszym zdjęciu.
   *
   * Zależy tylko od `ready` — dołożenie `phase` skasowałoby timer 'done'
   * w momencie przejścia w 'leaving'.
   */
  useEffect(() => {
    if (!ready) return;

    let raf = 0;
    let toLeaving = 0;
    let toDone = 0;

    const start = () => {
      toLeaving = window.setTimeout(() => setPhase('leaving'), PLAY_MS);
      toDone = window.setTimeout(() => setPhase('done'), PLAY_MS + FADE_MS);
    };

    const waitForCanvas = () => {
      const canvas = overlayRef.current?.querySelector('canvas');
      if (canvas && canvas.width > 0) {
        start();
        return;
      }
      raf = requestAnimationFrame(waitForCanvas);
    };
    raf = requestAnimationFrame(waitForCanvas);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(toLeaving);
      window.clearTimeout(toDone);
    };
  }, [ready]);

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
      className={`bg-surface fixed inset-0 z-50 grid place-items-center overflow-hidden transition-opacity ease-exit duration-[var(--duration-flip)] ${
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
