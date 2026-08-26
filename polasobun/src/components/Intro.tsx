import { useEffect, useState } from 'react';
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

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPhase('done');
      return;
    }

    const measure = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener('resize', measure);
    setPhase('playing');

    const toLeaving = window.setTimeout(() => setPhase('leaving'), PLAY_MS);
    const toDone = window.setTimeout(() => setPhase('done'), PLAY_MS + FADE_MS);

    return () => {
      window.removeEventListener('resize', measure);
      window.clearTimeout(toLeaving);
      window.clearTimeout(toDone);
    };
  }, []);

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
      aria-hidden="true"
      className={`bg-surface fixed inset-0 z-50 grid place-items-center overflow-hidden transition-opacity ease-exit duration-[var(--duration-flip)] ${
        phase === 'leaving' ? 'opacity-0' : 'opacity-100'
      }`}
    >
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
    </div>
  );
}
