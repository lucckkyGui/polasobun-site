# Sitemapa, robots.txt i canonical

Data: 2026-08-27
Status: zatwierdzony projekt, przed implementacją

## Cel

Dać wyszukiwarkom poprawny obraz nowej strony: listę adresów do
zaindeksowania, jednoznaczną informację, który adres jest kanoniczny,
oraz blokadę indeksowania dopóki strona żyje pod tymczasowym adresem
Vercela.

## Stan zastany (zmierzony 2026-08-27)

| Fakt | Wartość |
|---|---|
| `polasobun-site.vercel.app/sitemap.xml` | **404** |
| `polasobun-site.vercel.app/robots.txt` | **404** |
| `www.polasobun.com` | działa, serwuje **starą witrynę z Formatu** (Cloudflare) |
| `polasobun.com` bez `www` | nie odpowiada (HTTP 000) |
| `sitemap.xml` i `robots.txt` w korzeniu repo | opisują nieistniejące podstrony starego prototypu, wskazują `www.polasobun.com`, build Astro ich nie widzi |
| `astro.config.mjs` | **brak opcji `site`** |
| stron generowanych przez build | 19 |
| `/contact` kontra `/contact/` | **oba zwracają 200 bez przekierowania** |

Nowa strona żyje więc wyłącznie pod adresem Vercela, a domena klientki
nadal wskazuje Format.

## Decyzje klienta (2026-08-27)

1. **Przygotować na przełączenie domeny**, nie indeksować teraz. Dopóki
   `site` wskazuje Vercela, `robots.txt` blokuje roboty — nowa strona nie
   konkuruje o wyniki z witryną klientki.
2. **Własny plik zamiast `@astrojs/sitemap`.** Zero nowych zależności.
3. **Usunąć stare `sitemap.xml` i `robots.txt`** z korzenia repozytorium.
   Pozostałych plików starego prototypu nie ruszać.
4. **Pominąć `/work/_portraits` i `/work/_food`** — nie prowadzi do nich
   żaden odnośnik, adres zaczyna się od podkreślnika, a treść dubluje to,
   co jest w siatce pod PORTRAITS i FOOD.
5. **Dołożyć `<link rel="canonical">`** do `Base.astro`.

## Zakres

W zakresie:
- opcja `site` w `astro.config.mjs`,
- `src/pages/sitemap.xml.ts`,
- `src/pages/robots.txt.ts`,
- `<link rel="canonical">` w `src/layouts/Base.astro`,
- usunięcie `sitemap.xml` i `robots.txt` z korzenia repozytorium.

Poza zakresem, bez zmian:
- pozostałe pliki starego prototypu w korzeniu (`index.html`, `sport.html`,
  `komercyjne.html`, `food.html`, `design-reference.html`, `netlify.toml`,
  `assets/`),
- generowanie stron `/work/_portraits` i `/work/_food` — nadal powstają,
  po prostu nie trafiają do sitemapy,
- `trailingSlash` w konfiguracji Astro,
- siatka, jej mechanizmy i strony projektów.

## Architektura

### Jedno miejsce, które przełącza wszystko

`astro.config.mjs` dostaje `site: 'https://polasobun-site.vercel.app'`.
To **jedyna wartość do zmiany po przełączeniu DNS**. Wynika z niej:

- pełne adresy w sitemapie,
- adres w `<link rel="canonical">`,
- decyzja, czy `robots.txt` wpuszcza roboty.

### `src/pages/sitemap.xml.ts`

Endpoint generujący sitemapę w czasie budowania. Czyta `projects.json`,
odfiltrowuje wpisy z `collection: true` i wypisuje **17 adresów**:

- strona główna jako `<site>/` — z ukośnikiem, bo to korzeń
- `<site>/contact`
- 15 × `<site>/work/<slug>`

Wszystkie adresy **absolutne**, zbudowane z `site`. Poza stroną główną
żaden nie kończy się ukośnikiem.

Nowa kampania dopisana do `projects.json` trafia do sitemapy sama.

### `src/pages/robots.txt.ts`

Zachowanie zależne od `site`:

| Gdy host `site` | Treść |
|---|---|
| kończy się na `.vercel.app` | `User-agent: *` + `Disallow: /`, **bez linii `Sitemap:`** — nie zapraszamy do czegoś, czego zabraniamy |
| cokolwiek innego | `User-agent: *` + `Allow: /` + `Sitemap: <site>/sitemap.xml` |

Po przełączeniu DNS blokada znika sama, bez pamiętania o niej.

### `<link rel="canonical">` w `Base.astro`

Jedna linia obejmująca wszystkie 19 stron. Adres budowany z `Astro.site`
i `Astro.url.pathname`, **znormalizowany do wariantu bez ukośnika
końcowego** (poza stroną główną, która zostaje `/`).

Uwaga, żeby nie wyglądało na sprzeczność: canonical dostają **wszystkie
19 stron**, a do sitemapy trafia **17**. To celowe i niesprzeczne —
canonical mówi „jeśli już tu jesteś, to jest właściwy adres tej strony",
a sitemapa mówi „te adresy warto odwiedzić". Osierocone `/work/_portraits`
i `/work/_food` mają więc poprawny canonical, ale nie są zgłaszane.

## Sitemapa minimalna — bez `lastmod`, `changefreq` i `priority`

Wypisujemy wyłącznie `<loc>`.

`lastmod` musiałby brać datę builda, co oznaczałoby „wszystkie 17 stron
zmieniło się dzisiaj" przy każdym wdrożeniu — także takim, które dotyka
jednego pliku. To nieprawda, a Google ignoruje `lastmod`, któremu nie ufa.
`changefreq` i `priority` są ignorowane od lat.

Siedemnaście prawdziwych adresów jest warte więcej niż siedemnaście
adresów z trzema zmyślonymi atrybutami każdy.

## Ukośnik końcowy

Zmierzone: `/contact` i `/contact/` **oba zwracają 200 bez
przekierowania**, bo Astro buduje w formacie `directory`, a `trailingSlash`
ma wartość domyślną `ignore`. Dla wyszukiwarki to dwa adresy z identyczną
treścią.

Sitemapa i canonical używają **spójnie wariantu bez ukośnika**, zgodnego
z odnośnikami w kodzie (`href="/contact"`, `href="/work/<slug>"`).
Sama sitemapa tego duplikatu by nie rozwiązała — dopiero canonical mówi
wyszukiwarce, który adres jest właściwy.

## Rozważone i odrzucone

**`@astrojs/sitemap`.** Oficjalna integracja Astro, utrzymywana przez
zespół projektu, wykrywa strony automatycznie i obsługuje przypadki
brzegowe: dzielenie dużych sitemap, wiele języków, escapowanie. Odrzucona,
bo przy 17 adresach żaden z tych przypadków nie zachodzi, a projekt trzyma
zasadę zera zależności bez pytania. Własny endpoint to około trzydziestu
linii i czyta tę samą listę kampanii, co reszta strony.

**Indeksowanie adresu Vercela już teraz.** Odrzucone: nowa strona
konkurowałaby o te same zapytania z witryną klientki na
`www.polasobun.com`, i to pod tymczasowym adresem. Google mógłby uznać za
kanoniczną wersję, która za chwilę zniknie.

**Wyłączenie kolekcji z `getStaticPaths`**, żeby `/work/_portraits`
i `/work/_food` w ogóle nie powstawały. Odrzucone jako szersze niż
sitemapa — wymagałoby sprawdzenia, czy nic się do tych stron nie odwołuje.
Strony zostają, po prostu nie są zgłaszane.

## Kryteria sukcesu

- `astro check` i `astro build` przechodzą bez błędów.
- `dist/sitemap.xml` istnieje, zawiera **dokładnie 17** elementów `<loc>`,
  wszystkie zaczynające się od wartości `site`, żaden nie zawiera
  `_portraits` ani `_food`, żaden nie kończy się ukośnikiem poza stroną
  główną.
- `dist/robots.txt` istnieje i przy `site` wskazującym `.vercel.app`
  zawiera `Disallow: /`.
- Każda z 19 stron ma dokładnie jeden `<link rel="canonical">`
  z adresem absolutnym.
- `sitemap.xml` i `robots.txt` nie istnieją już w korzeniu repozytorium.
- Po wdrożeniu: `/sitemap.xml` i `/robots.txt` zwracają **200** zamiast 404.
