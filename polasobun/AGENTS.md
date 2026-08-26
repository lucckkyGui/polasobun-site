# polasobun.com — portfolio fotograficzne

## Stack
Astro 7 (static), React islands, Tailwind 4, Motion. Deploy: Cloudflare Pages.
Node >= 22.12.0 (wymagane przez Astro 7).

typescript jest przypięty do ^6 CELOWO. `astro check` nie działa
z natywnym kompilatorem TypeScript 7 — nie wystawia programmatic API,
którego wymaga (withastro/roadmap#1321). Nie bumpować bez sprawdzenia,
że check nadal przechodzi; inaczej build wywali się na starcie.

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

## Tailwind 4 — kaskada warstw
Reguły filtrowania siatki (display:none po data-filter) leżą w global.css
POZA @layer. To celowe: styl bez warstwy wygrywa w kaskadzie z każdą
warstwą Tailwinda. W @layer components przegrywały z utility `block`
z warstwy utilities i filtrowanie po cichu nie działało — data-filter
się przełączał, a kafle zostawały widoczne.

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
- Okładki siatki: Astro 6+ przycina domyślnie i NIGDY nie skaluje w górę.
  Nie używaj miniatur jako źródła. Po wygenerowaniu sprawdź kadrowanie
  okładek — przy aspect-ratio 4/5 kadr powstaje automatycznie.
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
src/assets/photos/_portraits/ i _food/ — zdjęcia spoza nazwanych kampanii.

Źródłem prawdy dla zdjęć jest ~/Documents/pola sobun.com/KLIENCI/<slug>/.
Do repo trafiają wersje pod web: dłuższy bok max 2560 px, JPEG q82
(mozjpeg, 4:4:4), przenumerowane na 01.jpg…NN.jpg wg kolejności nazw
w źródle. 1370 MB oryginałów → 202 MB w repo. Nie commituj oryginałów.
Okładką jest 01.jpg, czyli pierwszy plik alfabetycznie ze źródła —
jeśli klientka wskaże inną, przenumeruj folder, nie zmieniaj konwencji.

year pochodzi wyłącznie od klientki lub z jej istniejącej strony.
Nigdy nie uzupełniaj danymi z makiety ani wnioskowaniem.
Lata w Portfolio.dc.html to placeholdery narzędzia do makiet — nie dane.
Sprawdzone 2026-08-25: polasobun.com nie podaje nigdzie roku realizacji,
więc wszystkie year są null.

## Taksonomia — decyzja ostateczna
Filtry: ALL / COMMERCIAL / PORTRAITS / FOOD.
Pole tags przyjmuje wyłącznie: commercial | portraits | food.

ALL NIE jest brakiem filtra — to pełnoprawny widok. Cztery zakładki
pokazują dwa różne rodzaje kafli:
  ALL         wszystkie pojedyncze zdjęcia, BEZ podpisów i bez linków
  COMMERCIAL  okładki kampanii (01.jpg), Z podpisem i linkiem /work/<slug>
  PORTRAITS   zdjęcia z folderów tagowanych portraits, bez podpisów
  FOOD        zdjęcia z folderów tagowanych food, bez podpisów

Kafel zdjęcia dostaje data-cat="all [portraits] [food]" — `commercial`
jest z niego celowo odfiltrowane, bo COMMERCIAL pokazuje okładki,
nie pojedyncze zdjęcia. Kafel kampanii dostaje data-cat="commercial".
Projekt może mieć więcej niż jeden tag (np. Pudliszki: commercial + food).
Tagi beauty/fashion/lifestyle/sport/still-life zostały usunięte — nie wracaj
do nich i nie migruj ich do pola pomocniczego.
Wygląd, typografia i zachowanie paska filtrów: dokładnie z makiety Design.
Zmieniamy wyłącznie etykiety i logikę filtrowania.

## Kolejność prac — nie wyprzedzaj
1. siatka statyczna
2. wejście kafli (stagger)
3. hover flip
4. przejścia filtrów
5. review-animations

## Zasady pracy
- Jedno zadanie na raz. Nie dokładaj funkcji, o które nie prosiłem.
- Po każdym etapie: npm run build musi przechodzić (odpala astro check).
