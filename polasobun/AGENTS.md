# polasobun.com — portfolio fotograficzne

## Stack
Astro 7 (static), React islands, Tailwind 4, Motion. Deploy: Cloudflare Pages.
Node >= 22.12.0 (wymagane przez Astro 7).

## Twarde reguły
- Animujemy WYŁĄCZNIE transform i opacity. Nigdy width/height/blur/box-shadow/background.
- Zdjęcia zawsze przez astro:assets, nigdy surowy <img src>.
- Zdjęcia dynamiczne (ze slugu) — WYŁĄCZNIE przez import.meta.glob z eager: true.
  Ścieżka jako string NIE zostanie zoptymalizowana i wysypie się na produkcji.
- Każda animacja respektuje prefers-reduced-motion.
- Zero zależności poza: astro, react, tailwind, motion. Pytaj przed dodaniem czegokolwiek.
- Brak zaokrągleń, cieni i gradientów.
- Zero animacji, dopóki siatka statyczna nie zostanie zaakceptowana.
- Zero hex-ów w komponentach. Wszystkie wartości z tokenów.

## Tailwind 4
Konfiguracja przez @theme w src/styles/global.css.
Nie twórz tailwind.config.* — v4 go nie używa.

Tokeny z przestrzenią nazw generują utility:
--color-*, --font-*, --text-*, --tracking-*, --leading-*, --spacing-*,
--ease-*, --perspective-*, --aspect-*.

Czasy trwania NIE mają przestrzeni nazw w Tailwind 4. Leżą jako zwykłe
zmienne CSS w :root i używa się ich przez arbitrary value:
  duration-[var(--duration-fast)]   150ms
  duration-[var(--duration-base)]   250ms
  duration-[var(--duration-flip)]   350ms

Easingi mają własne nazwy, żeby nie nadpisywać wbudowanych:
  ease-enter  wejścia    cubic-bezier(0.16, 1, 0.3, 1)
  ease-exit   wyjścia    cubic-bezier(0.7, 0, 0.84, 0)
  ease-move   ruch A→B   cubic-bezier(0.65, 0, 0.35, 1)

Przestrzenie --radius-*, --shadow-*, --inset-shadow-*, --drop-shadow-*
są wykasowane (: initial) — brak zaokrągleń i cieni jest wymuszony na
poziomie tokenów, nie tylko umową.

## Astro 7 — pułapki
- Kompilator w Rust jest ścisły, nie naprawia niepoprawnego HTML
  (np. <div> w <p>). Pilnuj poprawnego zagnieżdżania.
- Nie używaj Astro DB (@astrojs/db usunięte w 7).
- compressHTML domyślnie 'jsx' (nie true) — białe znaki są zbijane
  regułami JSX. Jeśli spacja między elementami inline zniknie, to stąd.
- Domyślny procesor Markdown to Sätteri, nie remark/rehype. Wtyczki
  remark/rehype wymagają doinstalowania @astrojs/markdown-remark.

## Astro 6 — zmiany, które nas dotyczą
- Domyślny serwis obrazów PRZYCINA domyślnie, bez podawania `fit`.
  Przy aspect-ratio 4/5 kadr poleci sam — sprawdzaj kadrowanie okładek.
- Serwis obrazów NIGDY nie skaluje w górę. Zdjęcie mniejsze niż żądany
  rozmiar zostanie w swoim rozmiarze. Pilnuj rozdzielczości źródeł.
- getImage() rzuca błędem po stronie klienta — tylko w kodzie serwerowym.
- Style responsywne obrazów idą przez klasy z hashem i atrybuty data-*,
  nie inline style (zgodność z CSP).
- Astro.glob() usunięte — tylko import.meta.glob().
- getStaticPaths() nie może zwracać params typu number. Slug zawsze string.
- W getStaticPaths() nie ma obiektu Astro. Zamiast Astro.site →
  import.meta.env.SITE.
- Stare (legacy) content collections usunięte. Używamy zwykłego JSON-a,
  więc nas to nie dotyczy — ale nie wracaj do entry.slug.

## Model danych
src/content/projects.json — jeden wpis = jedna kampania.
src/content/projects.ts — typ Project + eksport `projects`.
src/assets/photos/<slug>/ — zdjęcia projektu. 01.jpg to zawsze okładka.
Nazwa folderu MUSI odpowiadać slugowi.

## Kolejność prac — nie wyprzedzaj
1. siatka statyczna
2. wejście kafli (stagger)
3. hover flip
4. przejścia filtrów
5. review-animations

## Zasady pracy
- Jedno zadanie na raz. Nie dokładaj funkcji, o które nie prosiłem.
- Po każdym etapie: npm run build musi przechodzić.
