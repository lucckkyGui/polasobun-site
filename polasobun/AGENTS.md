# polasobun.com — portfolio fotograficzne

## Stack
Astro 7 (static), React islands, Tailwind 4, Motion. Deploy: Cloudflare Pages.
Node >= 22.12.0 (wymagane przez Astro 7).

typescript jest przypięty do ^6 CELOWO. `astro check` nie działa
z natywnym kompilatorem TypeScript 7 — nie wystawia programmatic API,
którego wymaga (withastro/roadmap#1321). Nie bumpować bez sprawdzenia,
że check nadal przechodzi; inaczej build wywali się na starcie.

## Deploy
Docelowa produkcja: Cloudflare Pages (bez zmian).

Środowisko do weryfikacji stoi na Vercelu — projekt `polasobun-site`
podpięty do repo lucckkyGui/polasobun-site, root directory `polasobun`,
production branch `main`. Podgląd jest publiczny (Vercel Authentication
wyłączone) — świadoma decyzja, żeby dało się wysłać link klientce.

Root directory MUSI zostać `polasobun` — projekt Astro siedzi
w podkatalogu, obok starej strony statycznej w roocie repo.
Na `main` nie ma jeszcze katalogu polasobun/, więc build produkcyjny
przejdzie dopiero po zmergowaniu PR-a.

## Twarde reguły
- Animujemy WYŁĄCZNIE transform i opacity. Nigdy width/height/blur/box-shadow/background.
- Zdjęcia zawsze przez astro:assets, nigdy surowy <img src>.
- Zdjęcia dynamiczne (ze slugu) — WYŁĄCZNIE przez import.meta.glob z eager: true.
  Ścieżka jako string NIE zostanie zoptymalizowana i wysypie się na produkcji.
- Każda animacja respektuje prefers-reduced-motion. Bezpiecznik w global.css
  nadpisuje TYLKO transition-property, nigdy transition-duration: domyślne
  transition-duration to 0s, więc elementy bez własnych przejść pozostają
  nietknięte. Nadpisanie duration dokładałoby przejścia tam, gdzie ich nie
  było. Ruch znika, przejścia opacity i koloru zostają.
- Zero zależności poza: astro, react, tailwind, motion. Pytaj przed dodaniem czegokolwiek.
- Brak zaokrągleń, cieni i gradientów.
- Animacja wejścia jest zaakceptowana i wdrożona (patrz niżej). Poza nią
  nadal zero animacji bez wyraźnej zgody.
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

--ease-exit NIE NADAJE SIĘ NA UI. To czysty ease-in: startuje wolno
dokładnie w momencie, w którym użytkownik patrzy. Zarezerwowany wyłącznie
pod ruch fizycznie opuszczający ekran. Wchodzące I wychodzące elementy
interfejsu biorą ease-enter.

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

## Formaty obrazów — AVIF świadomie WYŁĄCZONY
<Picture> generuje tylko WebP + JPEG (fallback). AVIF został zdjęty,
bo jego kodowanie odpowiadało za ~90% czasu builda: 12m07s z AVIF
kontra 1m24s bez, przy tym samym materiale. Zysk był realny, ale mały —
AVIF 106 MB kontra WebP 202 MB — i nie wart ryzyka, że deploy nie
zmieści się w limicie czasu. Nie dodawaj go z powrotem bez zmierzenia
builda na docelowej platformie.

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

## Strona projektu — odstępstwa od makiety
Górny pasek, tytuł i siatka faktów są 1:1 z Portfolio.dc.html.
Cztery rzeczy różnią się celowo:

1. Zdjęcia idą jedno pod drugim, na pełną szerokość, w oryginalnych
   proporcjach. Makieta ma siatkę 4-kolumnową z kadrem 4/5 — zmiana
   na wyraźne polecenie ("wszystkie zdjęcia z folderu, w kolejności
   nazw, jedno pod drugim").
2. Metryczka w prawym górnym rogu pokazuje same kategorie ("Commercial",
   "Commercial · Food"). Makieta ma tam "Pandora · 2023 · commercial",
   ale w naszych danych title JUŻ jest nazwą klienta, więc client
   dublowałby tytuł.
3. Makieta ma cztery pola faktów: Klient, Rok, Rola, Zakres. Zostają
   dwa — `role` zostało usunięte z modelu danych, `scope` nigdy nie
   istniało. Pola bez wartości nie renderują się w ogóle; żadnych
   pustych etykiet ani "null". Przy year = null dla wszystkich wpisów
   w praktyce widać tylko Klient.
4. Tytuł jest responsywny: 26px / 56px od sm / 64px od lg. Makieta ma
   sztywne 64px, przy którym "JOANNA JĘDRZEJCZYK × FANADISE" nie
   mieści się na 375px.

Kolekcje (_portraits, _food) pokazują sam tytuł — bez metryczki
i bez siatki faktów.

## Animacja wejścia — Originkit Image Flipper
src/components/originkit/image-flipper.tsx to kod DOSTARCZONY przez
Originkit MCP (`originkit: get image-flipper`, stack react + tailwind + ts).
NIE przepisuj go i nie "poprawiaj". Żeby go zaktualizować, pobierz
ponownie z MCP. Zostawiony jest w nim nieużywany prop `animate` —
to jedyny hint z astro check i pochodzi z oryginału.

src/components/Intro.tsx to NASZA warstwa spinająca. Komponent Originkit
cykluje w nieskończoność i nie ma callbacku końca, więc moment oddania
sceny siatce odmierzamy z zewnątrz: dwa kadry = 2 × (duration + delay)
= 4400 ms, po czym kurtyna schodzi TWARDYM CIĘCIEM — bez wygaszania.
350 ms zaniku po 4,4 s split-flapa nic nie wnosiło, a dokładało easing
i przekroczenie budżetu 300 ms na UI. Zmierzone po zmianie: ostatnia
klatka z kurtyną przy opacity 1, następna bez niej, zero klatek
pośrednich. Cięcie pasuje do reszty: bez zaokrągleń, cieni i gradientów.
Stałe DURATION_S/DELAY_S
w Intro.tsx MUSZĄ zgadzać się z transition przekazanym do FlipImage —
rozjadą się i przejście utnie animację w połowie.

TRZY punkty zaczepienia, każdy wywalczony bólem — nie upraszczaj ich:
1. Zdjęcia są preloadowane PRZED montażem FlipImage. Komponent startuje
   swój zegar dopiero po onload, więc bez preloadu sieć zjadała budżet.
2. Odliczanie startuje dopiero, gdy płótno dostanie DOKŁADNIE wymiary
   cardWidth × dpr, czyli gdy FlipImage wykonał build(). Nie porównuj
   z zerem — puste płótno ma domyślnie 300×150, więc `canvas.width > 0`
   spełnia się już przy montażu i NICZEGO nie wykrywa. Ten błąd był tu
   przez jedną iterację i dawał złudzenie naprawy.
3. Rozmiar mierzymy raz i zamrażamy. cardWidth/cardHeight są w deps
   efektu FlipImage — reagowanie na resize restartuje animację od zera,
   podczas gdy zewnętrzne odliczanie biegnie dalej.
Objaw wszystkich trzech błędów jest ten sam i mylący: animacja wygląda
dobrze, tylko kończy się na pierwszym zdjęciu. Po każdej zmianie w tym
pliku sprawdź zrzutami co sekundę, że OBA kadry są widoczne przed
odsłonięciem siatki.

Intro odtwarza się RAZ NA SESJĘ (sessionStorage `polasobun:intro-played`).
Pomijanie: kliknięcie w kurtynę albo Escape. Jeśli któreś zdjęcie się nie
załaduje, animacja jest pomijana w całości zamiast odtwarzana zepsuta.

Liczba kafli jest ograniczona budżetem MAX_TILES = 900 na klatkę.
FlipImage przyjmuje liczbę KOLUMN i sam wylicza wiersze z proporcji
płótna, więc łączna liczba kafli ≈ kolumny² × (wysokość / szerokość) —
stąd pierwiastek w tileColumns(). Bez tego limitu przy 2560×1440 i DPR 2
wychodziło 5390 wywołań drawImage na klatkę, na głównym wątku, dokładnie
gdy strona pobiera zdjęcia siatki. Po limicie: 880. Nie podnoś MAX_TILES
bez sprawdzenia na dwurdzeniowej maszynie.

Treść pod kurtyną dostaje `inert` na czas animacji — bez tego Tab wchodzi
w przyciski filtrów schowane pod nieprzezroczystą nakładką. Wyłączane jest
rodzeństwo nakładki w <body>, nigdy ona sama ani jej przodkowie.

Trzy świadome wyjątki od twardych reguł:
1. Animacja jest rysowana na canvasie, nie na transform/opacity.
   Split-flapa nie da się zrobić inaczej. Poza canvasem nie ma tu
   już ŻADNEGO przejścia CSS — kurtyna schodzi twardym cięciem.
2. Canvas potrzebuje URL-a, nie ImageMetadata, więc zdjęcia idą przez
   getImage() z astro:assets i dopiero jego `.src` trafia do komponentu.
   Zdjęcie nadal jest optymalizowane — nie omijamy astro:assets.
3. prefers-reduced-motion obsługiwane jawnie w Intro.tsx. Globalny
   bezpiecznik z global.css tnie tylko transition/animation, a canvas
   chodzi na requestAnimationFrame i by go zignorował.

Intro renderuje null na serwerze — bez JS-u strona jest od razu
użyteczna i nic jej nie zasłania. Kosztem jest mgnienie siatki przed
pojawieniem się nakładki.

Zdjęcia do animacji wybrane w index.astro (stała INTRO): rimmel/01
i allegro/01 — mocno graficzne, wysokokontrastowe. Split-flap rozbija
kadr na kafelki, więc czytelna plama koloru działa lepiej niż subtelny
portret. Zmiana to podmiana slugu w INTRO.

## Wejście kafli — stagger
Odpalane atrybutem `data-enter`, który Intro ustawia na `[data-filter]`
po zejściu kurtyny. Bez tego stagger przeleciałby niewidoczny pod
nieprzezroczystą nakładką — zmierzone: kurtyna znika w 4361 ms,
data-enter pojawia się w 4377 ms, zero klatek nakładania.

Animowane są TYLKO pierwsze 12 kafli. Przy 359 kaflach i 50 ms opóźnienia
pełny stagger trwałby 18 sekund. Dwanaście pokrywa to, co widać nad
zgięciem na desktopie; reszta jest na miejscu od razu i nikt nie zdąży
doscrollować, zanim wejście się skończy. Nie zwiększaj tej liczby bez
policzenia, ile to sekund.

Skalujemy OBRAZ wewnątrz kafla (`[data-cat] img`), nie sam kafel.
Kafel ma overflow-hidden, tak jak w makiecie, więc komórka stoi
nieruchomo i w siatce stykającej się bez odstępów nie otwierają się
szczeliny. Zweryfikowane: prostokąty kafli identyczne w trakcie
animacji i po niej.

Całe wejście jest w `@media (prefers-reduced-motion: no-preference)`,
więc przy reduced-motion nie istnieje — nie polegamy na globalnym
bezpieczniku, który i tak nie tyka animation-delay.

Bez JS-u atrybut nie powstaje i kafle są po prostu widoczne.

## Przejścia filtrów
Przenika CAŁA siatka, nie pojedyncze kafle. Przy 374 kaflach osobne
przejścia oznaczałyby 374 warstwy kompozycji naraz; tu przenika jeden
element. Sam dobór kafli robi nadal reguła display:none po data-filter
(mechanizm 1:1 z makiety) — podmieniamy atrybut w połowie przenikania,
gdy siatka ma opacity 0, więc twarde cięcie nigdy nie trafia w oko.

Wyjście 100 ms, wejście 180 ms (--duration-filter-out / -in). Asymetria
celowa: po kliknięciu stara zawartość jest już nieistotna, nowa
potrzebuje chwili na odczytanie. Razem 280 ms, pod budżetem 300 ms.

Podświetlenie w pasku reaguje NATYCHMIAST — stan `pending` trzyma wybór
zanim trafi on do siatki. Bez tego kontrolka spóźniałaby się o 100 ms
względem kliknięcia.

Przerywalne: kolejne kliknięcie kasuje oczekujący timeout i retarguje
trwające przenikanie. Zmierzone — trzy kliknięcia w 80 ms dają JEDNĄ
podmianę zawartości, od razu na finalny wybór.

data-enter jest zdejmowany po zakończeniu staggeru (patrz Intro.tsx).
Element wracający z display:none restartuje animację CSS, więc bez tego
każdy powrót do ALL odtwarzałby wejście kafli równocześnie z przejściem
filtrów. Zweryfikowane: po powrocie do ALL zero animacji na kaflach.

Przenikanie zostaje przy prefers-reduced-motion — opacity jest na białej
liście globalnego bezpiecznika i zgodnie ze standardem przejścia
pomagające zrozumieć zmianę stanu mają zostać. Ruchu tu nie ma.

## Kolejność prac — nie wyprzedzaj
1. siatka statyczna ✔
2. wejście kafli (stagger) ✔
3. hover flip — POMINIĘTY świadomą decyzją. Wymagałby powrotu do rewersu
   kafla z makiety, którego przy siatce statycznej nie budowaliśmy.
4. przejścia filtrów ✔
5. review-animations ✔ (przeprowadzone, wszystkie uwagi zamknięte)

## Zasady pracy
- Jedno zadanie na raz. Nie dokładaj funkcji, o które nie prosiłem.
- Po każdym etapie: npm run build musi przechodzić (odpala astro check).
