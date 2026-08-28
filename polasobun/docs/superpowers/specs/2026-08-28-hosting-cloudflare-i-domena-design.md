# Hosting na Cloudflare i wyprowadzenie domeny z Formatu

Data: 2026-08-28
Status: zatwierdzony projekt, przed implementacją

## Cel

Postawić stronę na platformie, która jest darmowa, jawnie dopuszcza
użytek komercyjny i nie limituje transferu — a przy okazji wyprowadzić
domenę z konta Format.com, zanim wygaśnie 4 października 2026.

## Stan zastany (zmierzony 2026-08-28)

| Fakt | Wartość |
|---|---|
| produkcja | Vercel, projekt `polasobun-site`, root `polasobun`, branch `main` |
| plan Vercela | Hobby |
| `astro.config.mjs` → `site` | `https://polasobun-site.vercel.app` |
| `polasobun.com` | A → 64.99.64.37 (parking Tucowsa), nie odpowiada |
| `www.polasobun.com` | CNAME → `polasobun.format.com` |
| rejestrator | Tucows Domains Inc. |
| nameservery | `ns1-3.systemdns.com` (DNS Tucowsa/OpenSRS) |
| data wygaśnięcia | **2026-10-04** |
| status domeny | `clientTransferProhibited`, `clientUpdateProhibited` |
| rekordy MX | **brak** — na tej domenie nie ma poczty |
| `dist/_astro` | 1333 pliki WebP, 232 MB (zmierzone 2026-08-28: `find polasobun/dist/_astro -type f -name '*.webp' \| wc -l`) |
| nagłówki cache / przekierowania 301 | brak plików `_headers` i `_redirects` |

Format.com sprzedaje domeny przez Tucowsa, a nameservery to DNS
Tucowsa — domena z bardzo dużym prawdopodobieństwem siedzi wewnątrz
konta Format. Wypowiedzenie abonamentu przed jej wyprowadzeniem może ją
zabrać.

Brak rekordów MX oznacza, że przenosiny **nie zepsują poczty** — nie ma
czego zepsuć.

## Powód zmiany hostingu

Regulamin Vercela, sekcja Fair Use:

> „Commercial usage is defined as any Deployment that is used for the
> purpose of financial gain of **anyone** involved in **any part of the
> production** of the project, including a paid employee or consultant
> writing the code."

Wśród wymienionych przykładów: „Advertising the sale of a product or
service" oraz „Receiving payment to create, update, or host the site".

Portfolio zawodowej fotografki spełnia oba warunki niezależnie od
siebie. Plan Hobby jest zarezerwowany dla projektów niekomercyjnych,
więc dzisiejszy stan jest naruszeniem regulaminu, nie strefą szarą.

## Decyzje klienta (2026-08-28)

1. **Budżet 0 zł na hosting.** Jedynym stałym kosztem zostaje domena.
2. **Cloudflare, nie Vercel Pro.** Odrzucone: Vercel Pro (240 USD/rok),
   Netlify Free (100 GB transferu to zły model dla strony, która JEST
   zdjęciami), pozostanie na Hobby (naruszenie regulaminu).
3. **Szybka ścieżka domenowa** — zdążyć z transferem przed 4.10 zamiast
   odnawiać u Formatu. Ryzyko zaakceptowane świadomie, z punktem
   decyzyjnym 12 września.

## Wybór platformy — uzasadnienie liczbowe

| kryterium | wartość | nasz stan |
|---|---|---|
| żądania do zasobów statycznych | „free and unlimited" | bez limitu |
| pliki na projekt (plan Free) | 20 000 | 1373, zapas ~4500 zdjęć (wobec bramki 18 000, nie limitu platformy) |
| rozmiar pliku | 25 MiB | max ~2 MB |
| buildy na miesiąc | 500 | przewidywane kilka |
| użytek komercyjny | dozwolony | — |

Ograniczenie regulaminowe Cloudflare na serwowanie „a disproportionate
percentage of pictures" dotyczy **CDN-u**, a Developer Platform (czyli
Workers i Pages), Images oraz Stream są z niego jawnie wyłączone.
Serwowanie portfolio fotograficznego przez Workers jest zgodne z umową.

**Workers Static Assets, nie Pages.** Dokumentacja Cloudflare: *„If you
are starting a new project, use Workers instead of Pages. Pages
continues to work, but new features and optimizations are focused on
Workers."*

**Budowanie w GitHub Actions, nie na Cloudflare.** Repozytorium jest
publiczne, więc minuty Actions są nielimitowane i darmowe. Ważniejsze:
`actions/cache` daje kontrolę nad cache'em obrazów Astro, którego
Cloudflare Pages nie zapewnia. Bez niego każdy build byłby zimny —
zmierzone 6m10s.

## Zakres

W zakresie:
- `polasobun/wrangler.jsonc`,
- `polasobun/public/_headers` — cache dla `/_astro/*`,
- `polasobun/public/_redirects` — 15 przekierowań 301 z pola
  `legacyPath`,
- sekrety `CLOUDFLARE_API_TOKEN` i `CLOUDFLARE_ACCOUNT_ID`,
- usunięcie `@vercel/speed-insights` z `package.json` i z kodu,
- Cloudflare Web Analytics,
- zmiana `site` w `astro.config.mjs`,
- strefa DNS w Cloudflare i transfer rejestracji,
- powtórzenie pomiarów wydajności metodyką z AGENTS.md.

Poza zakresem, bez zmian:
- stara strona statyczna w korzeniu repozytorium i `netlify.toml`,
- nagłówki bezpieczeństwa dla nowej strony — dziś ich nie ma, ich
  dodanie to osobne zadanie z osobnym testowaniem CSP,
- prywatność repozytorium — publiczne repo wystawia zdjęcia w 2560 px,
  wyżej niż serwuje strona; osobna decyzja,
- CMS — osobna specyfikacja
  (`2026-08-28-cms-pages-cms-design.md`).

## Architektura

### Konfiguracja Workera

```jsonc
{
  "name": "polasobun",
  "compatibility_date": "2026-08-28",
  // do przestawienia na false po podpięciu domeny własnej
  "workers_dev": true,
  "assets": {
    "directory": "./dist",
    "html_handling": "drop-trailing-slash"
  }
}
```

Bez skryptu Workera — czysto statyczny zestaw zasobów. Pełne uzasadnienie
obu ustawień jest w komentarzach `wrangler.jsonc`; w skrócie:

- `html_handling: "drop-trailing-slash"` — Astro buduje
  `dist/work/pandora/index.html`, a domyślne `auto-trailing-slash`
  serwowałoby pliki indeksowe katalogów Z ukośnikiem. Canonical
  i wszystkie adresy w sitemapie są BEZ ukośnika, więc bez tej wartości
  każdy `<loc>` wskazywałby adres, który się przekierowuje.
- `workers_dev: true` — dziś potrzebne, bo pod tym adresem stoi pierwszy
  deploy. **MUSI zejść na `false` po podpięciu domeny**, inaczej strona
  odpowiada pod dwoma adresami naraz i `workers.dev` serwuje duplikat
  treści konkurujący z domeną klientki.

### `public/_headers`

Na Vercelu nagłówki cache'u dla zasobów z hashem w nazwie przychodziły
z domyślnych ustawień platformy. Na Cloudflare trzeba je napisać
samemu; ich brak byłby regresem wydajnościowym na 1333 plikach.

Limity: 100 reguł, 2000 znaków na regułę — z ogromnym zapasem.

### `public/_redirects`

Pole `legacyPath` w danych kampanii istnieje wyłącznie pod te 301:
`/pandora` → `/work/pandora` i czternaście analogicznych. Limit
Cloudflare to 2000 przekierowań statycznych.

**Bez tego pliku tracimy pozycje w wyszukiwarce**, które stara strona
zbierała od 2020 roku. To jedyny nieodwracalny koszt złego przełączenia.

### Analityka

`@vercel/speed-insights` wypada — zależności schodzą z pięciu do
czterech, więc twarda reguła z AGENTS.md robi się jeszcze twardsza.

Wchodzi Cloudflare Web Analytics: darmowy, bez ciasteczek, z Core Web
Vitals. Przy domenie proxowanej przez Cloudflare beacon jest
**wstrzykiwany na brzegu sieci**, więc w naszym HTML-u nie przybywa ani
jeden bajt.

## Plan domenowy

Cloudflare Registrar ma nieoczywisty warunek: **żeby przenieść
rejestrację, domena musi już mieć DNS na Cloudflare.** Kolejność jest
wymuszona, nie dowolna.

| # | krok | odwracalne? |
|---|---|---|
| A1 | Ustalić w panelu Format: czy domena tam jest, cena odnowienia, stan autoodnawiania, czy da się pobrać kod EPP | tak |
| A2 | Dodać `polasobun.com` jako strefę w Cloudflare, **odtworzyć obecne rekordy 1:1** | tak |
| A3 | Przestawić nameservery u Formatu na Cloudflare — stara strona działa dalej | tak |
| A4 | Odblokowanie domeny + kod EPP | tak |
| A5 | Transfer rejestracji do Cloudflare Registrar (5-7 dni) | tak |
| A6 | Wypowiedzenie Formatu | **NIE** |

Krok A2/A3 jest kluczowy: nameservery idą na Cloudflare, ale rekordy
nadal wskazują Format. Stara strona żyje, a my mamy kontrolę nad DNS.
Przełączenie na nową stronę to osobny, późniejszy krok — jedna zmiana
rekordu, cofalna w minutę.

### Punkt decyzyjny: 12 września 2026

Jeśli do 12 września nie będzie w ręku **odblokowanej domeny i kodu
EPP**, porzucamy szybką ścieżkę i odnawiamy domenę u Formatu
(spodziewane ~20-25 USD przez Tucowsa, cena do potwierdzenia w A1),
a transfer robimy spokojnie w listopadzie. Odnowienie i transfer sumują
lata, więc nic nie przepada.

12 września zostawia 22 dni zapasu na transfer, który trwa 5-7.

### Kanoniczny adres

Zostaje `www` — tak działa dzisiejsza strona klientki i tak wskazują
przekierowania z `legacyPath`. Adres bez `www` przekierowuje na `www`.

Po przełączeniu `site` w `astro.config.mjs` przestaje wskazywać Vercela,
co automatycznie: przestawia adresy w sitemapie, zmienia `canonical`
i **odblokowuje `robots.txt`** dla robotów. To jedna wartość, zgodnie
z komentarzem w konfiguracji.

## Kolejność prac

Dwa niezależne tory. Tor A ma termin zewnętrzny, tor B nie ma żadnego.

```
Tor A — domena (termin 4.10, start natychmiast)
  A1  fakty z panelu Format
  A2  strefa w Cloudflare + odtworzenie rekordów 1:1
  A3  nameservery na Cloudflare
  A4  odblokowanie + kod EPP        ◄── punkt decyzyjny 12.09
  A5  transfer rejestracji
  A6  wypowiedzenie Formatu

Tor B — hosting (bez terminu)
  B5  wrangler.jsonc + _headers + _redirects
      + pierwszy deploy na workers.dev
  B6  workflow publikacji z cache'em i bramkami
  B8  przełączenie site: + rekordy DNS na Workera   ◄── wymaga A3
  B9  powtórzenie pomiarów wydajności
  B10 Cloudflare Web Analytics
```

Numeracja B jest wspólna ze specyfikacją CMS-u — B1-B4, B7 i B11 leżą
tam.

**Pierwszy deploy idzie na `workers.dev`, nie na domenę.** Cały tor B da
się skończyć i sprawdzić, zanim ktokolwiek zobaczy zmianę.

## Rachunek

Koszty stałe, rocznie:

| pozycja | koszt |
|---|---|
| Hosting (Workers Static Assets, Free) | 0 USD |
| DNS + Web Analytics (Cloudflare Free) | 0 USD |
| Budowanie (GitHub Actions, repo publiczne) | 0 USD |
| CMS (`app.pagescms.org`) | 0 USD |
| Domena `.com` (Cloudflare Registrar) | 10,46 USD |
| **razem** | **10,46 USD/rok** |

Cena domeny sprawdzona 2026-08-28. Kwota złotowa zależy od kursu i nie
jest tu podana jako fakt — przy 3,65 zł/USD wychodzi około 38 zł rocznie.

Koszty jednorazowe przy przejściu:
- transfer domeny 10,46 USD — to nie opłata za transfer, tylko
  przedpłacony rok doliczany do daty ważności,
- abonament Format utrzymywany do zakończenia transferu — **cennika nie
  znamy, to zadanie A1**.

Progi, przy których przestaje być darmowo:
- 20 000 plików w `dist` — dziś ~1360, zapas około 5400 zdjęć,
- 25 MiB na plik — dziś maksimum ~2 MB,
- 500 buildów miesięcznie — dziś zero,
- transfer — bez limitu.

Czego nie płacimy: Vercel Pro 240 USD/rok, Netlify 55 USD za każde
100 GB ponad darmowy limit.

## Czego nie obiecujemy

**Pomiary z AGENTS.md nie przenoszą się.** Wartości produkcyjne
(LCP 808 ms, FCP 680 ms, cache CDN 22/22 HIT) zostały zebrane na
Vercelu. Inny CDN to inne zachowanie cache'u. AGENTS.md ma na to własną
regułę — liczba przepisana nie jest liczbą zweryfikowaną — więc
powtórzenie pomiarów tą samą metodyką (Slow 4G, 4x dławienie CPU,
viewport 412×915, zimny cache przeglądarki, rozgrzany CDN) wchodzi do
planu jako zadanie B9, a nie jako założenie.

**Nie wiemy, ile potrwa pierwsza wysyłka 232 MB do Cloudflare.**
Kolejne są przyrostowe, ale pierwszej nie zmierzyliśmy.

**Nie potwierdziliśmy w panelu Formatu, że domena tam jest.** To
wniosek z rejestratora i nameserwerów, mocny, ale pośredni. Zadanie A1
istnieje właśnie po to.
