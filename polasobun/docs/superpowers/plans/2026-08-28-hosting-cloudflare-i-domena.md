# Hosting na Cloudflare i wyprowadzenie domeny — plan implementacji

> **Dla wykonawców agentowych:** WYMAGANY PODSKILL: użyj
> superpowers:subagent-driven-development (zalecane) albo
> superpowers:executing-plans, żeby wykonać ten plan zadanie po zadaniu.
> Kroki mają składnię checkboxów (`- [ ]`) do odhaczania.

**Cel:** Przenieść stronę z Vercela Hobby (naruszenie regulaminu) na
Cloudflare Workers Static Assets, zbudować przyciskową ścieżkę
publikacji i wyprowadzić domenę z konta Format.com przed 4.10.2026.

**Architektura:** GitHub Actions buduje Astro z cache'em obrazów
i wysyła statyczny `dist` do Workera przez `wrangler deploy`. Jedyną
drogą na produkcję jest ręczne uruchomienie workflow'a — push do `main`
wyłącznie buduje. Nocny cron dopublikowuje, jeśli `main` odbiega od
znacznika `wydane`.

**Stack:** Astro 7 (static), Cloudflare Workers Static Assets, Wrangler,
GitHub Actions, Cloudflare DNS + Registrar.

**Specyfikacja:** `docs/superpowers/specs/2026-08-28-hosting-cloudflare-i-domena-design.md`

## Ograniczenia globalne

Dotyczą KAŻDEGO zadania w tym planie:

- Katalog projektu Astro to `polasobun/`. Wszystkie ścieżki niżej są
  względne wobec niego, chyba że napisano inaczej.
- Node >= 22.12.0. Zweryfikowane lokalnie: v22.22.0.
- `typescript` przypięty do `^6` **celowo** — `astro check` nie działa
  z natywnym kompilatorem TS 7. Nie bumpować.
- **Zero nowych zależności w `package.json`.** Dozwolone są wyłącznie:
  `astro`, `react`, `react-dom`, `@astrojs/react`, `tailwindcss`,
  `@tailwindcss/vite`, `motion`. Wrangler idzie przez `npx` w CI,
  właśnie po to, żeby nie ruszać `package.json`.
- Po każdym zadaniu `npm run build` musi przechodzić (odpala
  `astro check`).
- Komentarze w kodzie i wiadomości commitów po polsku — tak jak reszta
  repozytorium.
- **Liczby, których nie zmierzyłeś, oznaczaj jako oczekiwane.** Reguła
  z AGENTS.md: liczba przepisana z cudzego raportu nie jest liczbą
  zweryfikowaną.
- Nie ruszaj starej strony statycznej w korzeniu repozytorium
  (`index.html`, `sport.html`, `komercyjne.html`, `food.html`,
  `netlify.toml`, `_headers`, `assets/`).

---

### Zadanie 1: Tor domenowy — ustalenie faktów i przejęcie DNS

**To zadanie jest pracą człowieka w panelach, nie kodem.** Wykonuje je
właściciel projektu. Reszta planu nie czeka na nie — tory są niezależne
aż do zadania 7.

**Termin:** punkt decyzyjny **12 września 2026**. Bez odblokowanej
domeny i kodu EPP w tym terminie porzucamy szybką ścieżkę i odnawiamy
domenę u Formatu, a transfer robimy w listopadzie.

**Pliki:** brak.

**Interfejsy:**
- Produkuje: działającą strefę `polasobun.com` w Cloudflare z NS-ami
  Cloudflare — wymagana przez zadanie 6 i 7.

- [ ] **Krok 1: A1 — ustal cztery fakty w panelu Format.com**

Zaloguj się do Format.com i zapisz odpowiedzi:

1. Czy domena `polasobun.com` jest widoczna w panelu (sekcja Domains)?
2. Jaka jest cena odnowienia na rok?
3. Czy autoodnawianie jest włączone?
4. Czy jest opcja odblokowania domeny (unlock) i pobrania kodu
   autoryzacji (EPP / auth code)?

Jeśli odpowiedź na 1 brzmi „nie" — domena jest w innym miejscu,
zatrzymaj się i wróć z tą informacją. Cały plan domenowy zakłada, że
jest u Formatu.

- [ ] **Krok 2: A2 — dodaj strefę w Cloudflare i odtwórz rekordy 1:1**

W panelu Cloudflare: Add a site → `polasobun.com` → plan **Free**.

Cloudflare zaimportuje wykryte rekordy. **Porównaj je z faktycznym
stanem** i uzupełnij brakujące. Stan zmierzony 2026-08-28:

```
polasobun.com        A      64.99.64.37
www.polasobun.com    CNAME  polasobun.format.com
(brak rekordów MX — na tej domenie nie ma poczty)
```

Ustaw oba rekordy na **DNS only** (szara chmurka), nie proxied. Na tym
etapie niczego nie zmieniamy w zachowaniu — chcemy wyłącznie przejąć
obsługę DNS.

- [ ] **Krok 3: Zweryfikuj, że rekordy w Cloudflare zgadzają się ze stanem sprzed zmiany**

Zanim przestawisz nameservery, odpytaj serwery Cloudflare bezpośrednio.
Cloudflare poda Ci dwa przypisane nameservery — podstaw je za `NS1`:

```bash
dig @NS1 polasobun.com A +short
dig @NS1 www.polasobun.com CNAME +short
```

Oczekiwane: `64.99.64.37` oraz `polasobun.format.com.` — dokładnie to,
co odpowiada dziś publiczny DNS. Jeśli się różni, popraw rekordy
w panelu **zanim** przejdziesz dalej.

- [ ] **Krok 4: A3 — przestaw nameservery u Formatu**

W panelu Format zmień nameservery domeny na dwa podane przez
Cloudflare. Stara strona działa dalej — rekordy nadal wskazują Format.

- [ ] **Krok 5: Poczekaj na aktywację strefy i potwierdź propagację**

```bash
dig polasobun.com NS +short
```

Oczekiwane: dwa nameservery Cloudflare zamiast `ns1-3.systemdns.com`.
Propagacja bywa kilkugodzinna. Strefa w panelu Cloudflare musi pokazać
status **Active**.

- [ ] **Krok 6: Potwierdź, że stara strona nadal działa**

```bash
curl -sI https://www.polasobun.com/ | head -1
```

Oczekiwane: `HTTP/2 200`. Jeśli nie — cofnij nameservery u Formatu.
Ten krok jest odwracalny i o to w nim chodzi.

- [ ] **Krok 7: A4 — odblokuj domenę i pobierz kod EPP**

W panelu Format: wyłącz blokadę transferu (`clientTransferProhibited`)
i pobierz kod autoryzacji. Zapisz go w menedżerze haseł.

```bash
whois polasobun.com | grep -i "domain status"
```

Oczekiwane: znika `clientTransferProhibited`. Zmiana statusu potrafi
zająć do kilku godzin.

**Jeśli jest po 12 września, a tego kroku nie ma — zatrzymaj się**,
odnów domenę u Formatu i przenieś transfer na listopad. Reszta planu
działa bez zmian; zadanie 6 po prostu przesuwa się w czasie.

---

### Zadanie 2: Konfiguracja Workera, nagłówki i przekierowania

**Pliki:**
- Utwórz: `wrangler.jsonc`
- Utwórz: `public/_headers`
- Utwórz: `public/_redirects`
- Utwórz: `scripts/sprawdz-przekierowania.mjs`

**Interfejsy:**
- Produkuje: `dist/_headers` i `dist/_redirects` w wyniku builda —
  konsumowane przez Cloudflare w zadaniu 3.
- Produkuje: `node scripts/sprawdz-przekierowania.mjs` — kod wyjścia 0
  gdy `_redirects` zgadza się z polami `legacyPath`; używane jako bramka
  w zadaniu 4.

- [ ] **Krok 1: Napisz skrypt kontrolny przekierowań**

To jest test dla tego zadania. `_redirects` jest plikiem statycznym, bo
Astro nie wyrenderuje pliku o nazwie zaczynającej się od podkreślnika
(`src/pages/_redirects.ts` jest przez router pomijany). Skrypt pilnuje,
żeby statyczny plik nie rozjechał się z danymi.

Utwórz `scripts/sprawdz-przekierowania.mjs`:

```js
/**
 * Bramka spójności: public/_redirects musi zawierać dokładnie jedno
 * przekierowanie na każdy wpis kampanii z polem legacyPath.
 *
 * _redirects jest statyczny, bo Astro pomija w routingu pliki
 * zaczynające się od podkreślnika — generatora nie da się postawić
 * w src/pages. Ten skrypt zastępuje generator kontrolą.
 */
import { readFileSync } from 'node:fs';

const dane = JSON.parse(
  readFileSync(new URL('../src/content/projects.json', import.meta.url), 'utf8'),
);

const oczekiwane = new Map(
  dane
    .filter((p) => typeof p.legacyPath === 'string')
    .map((p) => [p.legacyPath, `/work/${p.slug}`]),
);

const wiersze = readFileSync(
  new URL('../public/_redirects', import.meta.url),
  'utf8',
)
  .split('\n')
  .map((w) => w.trim())
  .filter((w) => w && !w.startsWith('#'));

const znalezione = new Map();
for (const wiersz of wiersze) {
  const [z, na, kod] = wiersz.split(/\s+/);
  if (kod !== '301') {
    console.error(`BŁĄD: "${wiersz}" nie jest przekierowaniem 301`);
    process.exit(1);
  }
  znalezione.set(z, na);
}

let bledy = 0;
for (const [z, na] of oczekiwane) {
  if (znalezione.get(z) !== na) {
    console.error(`BRAK albo ZŁY CEL: ${z} -> oczekiwano ${na}, jest ${znalezione.get(z) ?? '(nic)'}`);
    bledy++;
  }
}
for (const z of znalezione.keys()) {
  if (!oczekiwane.has(z)) {
    console.error(`NADMIAROWE: ${z} nie ma odpowiednika w legacyPath`);
    bledy++;
  }
}

if (bledy) process.exit(1);
console.log(`OK — ${oczekiwane.size} przekierowań zgodnych z legacyPath`);
```

- [ ] **Krok 2: Uruchom skrypt i potwierdź, że NIE przechodzi**

```bash
cd polasobun && node scripts/sprawdz-przekierowania.mjs
```

Oczekiwane: błąd `ENOENT` na `public/_redirects` — plik jeszcze nie
istnieje. To jest oczekiwana porażka przed napisaniem pliku.

- [ ] **Krok 3: Napisz `public/_redirects`**

Piętnaście przekierowań ze starej witryny na Format.com. **Dwa nie
wynikają ze slugu** (`fanadise`, `mardosz`) — nie generuj ich regułą.

```
# Adresy ze starej witryny na Format.com. Bez nich tracimy pozycje
# w wyszukiwarce zbierane od 2020 roku. Pole legacyPath w danych
# kampanii istnieje wyłącznie pod ten plik.
# Spójność pilnuje scripts/sprawdz-przekierowania.mjs.
/pandora                        /work/pandora         301
/rimmel                         /work/rimmel          301
/allegro                        /work/allegro         301
/cropp                          /work/cropp           301
/wojas                          /work/wojas           301
/rko-by-rylko                   /work/rko-by-rylko    301
/henderson                      /work/henderson       301
/lech-easy                      /work/lech-easy       301
/pudliszki                      /work/pudliszki       301
/dobra-kaloria                  /work/dobra-kaloria   301
/kodano-optyk                   /work/kodano-optyk    301
/medity                         /work/medity          301
/joanna-jedrzejczyk-x-fanadise  /work/fanadise        301
/bybianco                       /work/bybianco        301
/mardosz-hair-band              /work/mardosz         301
```

- [ ] **Krok 4: Uruchom skrypt i potwierdź, że przechodzi**

```bash
cd polasobun && node scripts/sprawdz-przekierowania.mjs
```

Oczekiwane: `OK — 15 przekierowań zgodnych z legacyPath`

- [ ] **Krok 5: Napisz `public/_headers`**

```
# Zasoby z hashem treści w nazwie — 1331 plików WebP plus CSS/JS.
# Na Vercelu te nagłówki przychodziły z domyślnych ustawień platformy;
# na Cloudflare trzeba je napisać samemu, inaczej mamy regres
# wydajnościowy wobec pomiarów zapisanych w AGENTS.md.
/_astro/*
  Cache-Control: public, max-age=31536000, immutable

# Fonty NIE mają hasha w nazwie, więc immutable byłoby tu kłamstwem —
# podmiana pliku zostałaby zignorowana przez przeglądarki na rok.
# Tydzień to kompromis: fonty i tak się nie zmieniają.
/fonts/*
  Cache-Control: public, max-age=604800
```

- [ ] **Krok 6: Napisz `wrangler.jsonc`**

```jsonc
{
  // Statyczny zestaw zasobów bez skryptu Workera. Cloudflare zaleca
  // Workers Static Assets zamiast Pages dla nowych projektów: nowe
  // funkcje i optymalizacje idą do Workers, Pages jest utrzymywane.
  "name": "polasobun",
  "compatibility_date": "2026-08-28",
  "assets": {
    "directory": "./dist"
  }
}
```

- [ ] **Krok 7: Zbuduj i potwierdź, że oba pliki trafiają do `dist`**

```bash
cd polasobun && npm run build
ls -l dist/_headers dist/_redirects
find dist -type f | wc -l
```

Oczekiwane: oba pliki istnieją. Liczba plików w okolicy 1360 —
**zapisz tę wartość**, jest punktem odniesienia dla bramki w zadaniu 4.
Limit Cloudflare na planie Free to 20 000.

- [ ] **Krok 8: Commit**

```bash
git add polasobun/wrangler.jsonc polasobun/public/_headers \
        polasobun/public/_redirects polasobun/scripts/sprawdz-przekierowania.mjs
git commit -m "feat: konfiguracja Workera, nagłówki cache i przekierowania 301"
```

---

### Zadanie 3: Pierwszy deploy na workers.dev

**Pliki:** brak zmian w repozytorium — to zadanie weryfikuje zadanie 2
na żywej infrastrukturze, zanim powstanie automatyzacja.

**Interfejsy:**
- Konsumuje: `wrangler.jsonc`, `dist/_headers`, `dist/_redirects`
  z zadania 2.
- Produkuje: działający adres `polasobun.<subdomena>.workers.dev`
  oraz potwierdzoną wersję Wranglera — obie potrzebne w zadaniu 4.

- [ ] **Krok 1: Ustal wersję Wranglera do przypięcia**

```bash
npm view wrangler version
```

**Minimum 4.34.0** — wcześniejsze wersje wymuszają stary limit 20 000
plików niezależnie od planu. Zapisz dokładną wersję; zadanie 4 przypina
ją w workflow'ie.

- [ ] **Krok 2: Zaloguj się i wyślij ręcznie**

```bash
cd polasobun && npx --yes wrangler@<WERSJA> deploy
```

Wrangler otworzy przeglądarkę do autoryzacji. Zapisz podany adres
`workers.dev`.

- [ ] **Krok 3: Sprawdź stronę główną i podstronę kampanii**

```bash
curl -sI https://polasobun.<subdomena>.workers.dev/ | head -1
curl -sI https://polasobun.<subdomena>.workers.dev/work/pandora | head -1
```

Oczekiwane: `HTTP/2 200` dla obu.

- [ ] **Krok 4: Sprawdź przekierowanie 301 — w tym oba nietypowe**

```bash
curl -sI https://polasobun.<subdomena>.workers.dev/pandora | grep -i "^HTTP\|^location"
curl -sI https://polasobun.<subdomena>.workers.dev/joanna-jedrzejczyk-x-fanadise | grep -i "^HTTP\|^location"
curl -sI https://polasobun.<subdomena>.workers.dev/mardosz-hair-band | grep -i "^HTTP\|^location"
```

Oczekiwane: `301` oraz `location: /work/pandora`, `/work/fanadise`,
`/work/mardosz`.

- [ ] **Krok 5: Sprawdź nagłówek cache na zasobie z hashem**

```bash
PLIK=$(find polasobun/dist/_astro -name '*.webp' | head -1 | sed 's|polasobun/dist||')
curl -sI "https://polasobun.<subdomena>.workers.dev$PLIK" | grep -i cache-control
```

Oczekiwane: `cache-control: public, max-age=31536000, immutable`

- [ ] **Krok 6: Obejrzyj stronę w przeglądarce**

Otwórz adres `workers.dev`. Sprawdź, że siatka się ładuje, filtry
działają, animacja wejścia rusza i strona `/contact` się otwiera.
Zrzuty ekranu nie są potrzebne — to kontrola, że nic nie jest
oczywiście zepsute.

**Nie ma tu commita** — zadanie nie zmienia repozytorium.

---

### Zadanie 4: Workflow publikacji z cache'em, bramkami i nocnym cronem

**Pliki:**
- Utwórz: `.github/workflows/publikacja.yml` (w korzeniu repozytorium,
  nie w `polasobun/`)
- Utwórz: `.github/workflows/build.yml`

**Interfejsy:**
- Konsumuje: `scripts/sprawdz-przekierowania.mjs` z zadania 2,
  wersję Wranglera z zadania 3.
- Produkuje: workflow o nazwie pliku `publikacja.yml` przyjmujący
  `workflow_dispatch` z wejściem `payload` — **plan CMS-u podpina pod tę
  nazwę przycisk „Opublikuj stronę"**.
- Produkuje: znacznik gita `wydane` wskazujący ostatnio wysłany commit.

- [ ] **Krok 1: Dodaj sekrety do repozytorium**

W ustawieniach repozytorium → Secrets and variables → Actions:

- `CLOUDFLARE_API_TOKEN` — token z uprawnieniem *Workers Scripts: Edit*
  dla właściwego konta. Utwórz go w panelu Cloudflare (My Profile →
  API Tokens → Create Token → Edit Cloudflare Workers).
- `CLOUDFLARE_ACCOUNT_ID` — z panelu Cloudflare, zakładka Workers.

**Uwaga do zapisania właścicielowi projektu:** klientka jako
współpracownik z prawem zapisu będzie mogła uruchamiać ten workflow.
To jest zamierzone — o to chodzi w przycisku „Opublikuj" — ale znaczy
też, że jej konto GitHub pośrednio dysponuje tokenem Cloudflare.
Włącz na jej koncie uwierzytelnianie dwuskładnikowe.

- [ ] **Krok 2: Napisz workflow kontrolny `build.yml`**

Push do `main` wyłącznie buduje. Wysyłki nie ma — jedyną drogą na
produkcję jest zadanie ręczne z kroku 3.

```yaml
name: Kontrola builda

on:
  push:
    branches: [main]

concurrency:
  group: kontrola-${{ github.ref }}
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: polasobun/package-lock.json

      # Klucz z SHA plus restore-keys na prefiks: przywraca OSTATNI
      # dostępny cache niezależnie od zawartości, więc Astro przelicza
      # tylko nowe zdjęcia. Gdyby kluczem był hash folderu zdjęć, każde
      # dołożone zdjęcie unieważniałoby całość i build byłby zimny
      # za każdym razem. Nie "poprawiaj" tego na hash treści.
      - uses: actions/cache@v4
        with:
          path: polasobun/node_modules/.astro
          key: astro-assets-${{ github.sha }}
          restore-keys: astro-assets-

      - run: npm ci
        working-directory: polasobun

      - run: npm run build
        working-directory: polasobun
```

- [ ] **Krok 3: Napisz workflow publikacji `publikacja.yml`**

Podstaw dokładną wersję Wranglera ustaloną w zadaniu 3 za `<WERSJA>`.

```yaml
name: Publikacja

on:
  workflow_dispatch:
    inputs:
      payload:
        description: Pages CMS payload as JSON
        required: false
        type: string
  # 02:00 UTC = 04:00 czasu warszawskiego latem, 03:00 zimą.
  # GitHub nie przyjmuje stref czasowych w cronie.
  schedule:
    - cron: '0 2 * * *'

concurrency:
  group: publikacja
  cancel-in-progress: true

jobs:
  publikuj:
    runs-on: ubuntu-latest
    permissions:
      contents: write        # do przesunięcia znacznika `wydane`
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0     # potrzebne, żeby zobaczyć znacznik `wydane`

      # Nocne uruchomienie publikuje TYLKO wtedy, gdy main odbiega
      # od ostatnio wysłanego commita. Uruchomienie ręczne publikuje
      # zawsze — przycisk ma działać także przy powtórce.
      - id: sprawdz
        run: |
          WYDANE=$(git rev-parse --verify --quiet refs/tags/wydane || echo "")
          GLOWA=$(git rev-parse HEAD)
          if [ "${{ github.event_name }}" = "schedule" ] && [ "$WYDANE" = "$GLOWA" ]; then
            echo "Nic nowego od ostatniej publikacji ($GLOWA). Pomijam."
            echo "publikowac=nie" >> "$GITHUB_OUTPUT"
          else
            echo "publikowac=tak" >> "$GITHUB_OUTPUT"
          fi

      - uses: actions/setup-node@v4
        if: steps.sprawdz.outputs.publikowac == 'tak'
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: polasobun/package-lock.json

      - uses: actions/cache@v4
        if: steps.sprawdz.outputs.publikowac == 'tak'
        with:
          path: polasobun/node_modules/.astro
          key: astro-assets-${{ github.sha }}
          restore-keys: astro-assets-

      - run: npm ci
        if: steps.sprawdz.outputs.publikowac == 'tak'
        working-directory: polasobun

      # Bramka 1 — przekierowania zgodne z danymi kampanii.
      - run: node scripts/sprawdz-przekierowania.mjs
        if: steps.sprawdz.outputs.publikowac == 'tak'
        working-directory: polasobun

      - run: npm run build
        if: steps.sprawdz.outputs.publikowac == 'tak'
        working-directory: polasobun

      # Bramka 2 — limit plików Cloudflare na planie Free to 20 000.
      # Zatrzymujemy się na 18 000, żeby zdążyć zareagować.
      - name: Bramka liczby plików
        if: steps.sprawdz.outputs.publikowac == 'tak'
        working-directory: polasobun
        run: |
          LICZBA=$(find dist -type f | wc -l)
          echo "Plików w dist: $LICZBA" >> "$GITHUB_STEP_SUMMARY"
          if [ "$LICZBA" -gt 18000 ]; then
            echo "STOP: $LICZBA plików, limit Cloudflare Free to 20 000." >&2
            exit 1
          fi

      - name: Wysyłka do Cloudflare
        if: steps.sprawdz.outputs.publikowac == 'tak'
        working-directory: polasobun
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: npx --yes wrangler@<WERSJA> deploy

      # Znacznik `wydane` jest jedyną odpowiedzią na pytanie
      # "co jest teraz na żywo". Sprawdzasz go przez `git log wydane -1`.
      - name: Przesuń znacznik wydane
        if: steps.sprawdz.outputs.publikowac == 'tak'
        run: |
          git tag -f wydane
          git push -f origin wydane
```

- [ ] **Krok 4: Commit i push — sprawdź, że kontrola builda rusza**

```bash
git add .github/workflows/build.yml .github/workflows/publikacja.yml
git commit -m "feat: workflow kontroli builda i przyciskowej publikacji"
git push
gh run list --workflow=build.yml --limit 1
```

Oczekiwane: uruchomienie „Kontrola builda" ze statusem `completed`
i wynikiem `success`.

- [ ] **Krok 5: Zmierz czas ZIMNEGO builda w Actions**

To pierwsze uruchomienie nie miało cache'u. Odczytaj czas kroku
`npm run build`:

```bash
gh run view --workflow=build.yml --log | grep -i "npm run build" | head
```

Zapisz wartość. Odniesienie lokalne z AGENTS.md: **6m10s**.

- [ ] **Krok 6: Uruchom publikację ręcznie i sprawdź, że wysyła**

```bash
gh workflow run publikacja.yml
gh run watch
```

Oczekiwane: wszystkie kroki zielone, w podsumowaniu linia
`Plików w dist: ~1360`, znacznik `wydane` utworzony.

```bash
git fetch --tags --force && git log wydane -1 --oneline
```

- [ ] **Krok 7: Zmierz czas CIEPŁEGO builda**

Uruchom publikację drugi raz, bez żadnych zmian w repozytorium.
Odczytaj czas kroku `npm run build`.

**W specyfikacji zapisano oczekiwane 1-2 minuty. To jest liczba
nieznana, nie obietnica.** Zapisz zmierzoną wartość razem z czasem
przywracania i zapisu cache'u (~232 MB) — dopiero suma tych trzech
mówi, czy cache się opłaca. Jeśli nie — udokumentuj to i zgłoś, zamiast
przepisywać liczbę ze specyfikacji.

- [ ] **Krok 8: Zaktualizuj AGENTS.md o zmierzone wartości**

W sekcji „Deploy" zastąp opis Vercela stanem faktycznym: Cloudflare
Workers, budowanie w Actions, jedyna droga na produkcję to
`publikacja.yml`, znacznik `wydane`. Wpisz **zmierzone** czasy builda
zimnego i ciepłego z kroków 5 i 7.

```bash
git add polasobun/AGENTS.md && git commit -m "docs: deploy na Cloudflare, zmierzone czasy builda"
```

---

### Zadanie 5: Zdjęcie @vercel/speed-insights

**Pliki:**
- Modyfikuj: `package.json`
- Modyfikuj: `src/layouts/Base.astro`
- Modyfikuj: `AGENTS.md`

**Interfejsy:**
- Produkuje: `package.json` z siedmioma zależnościami zamiast ośmiu —
  twarda reguła „zero zależności poza wymienionymi" z AGENTS.md
  zacieśnia się o jedną pozycję.

- [ ] **Krok 1: Znajdź wszystkie miejsca użycia**

```bash
cd polasobun && grep -rn "speed-insights\|SpeedInsights" src/ package.json astro.config.mjs
```

Zapisz listę trafień — usuwasz dokładnie te miejsca, nic więcej.

- [ ] **Krok 2: Usuń import i komponent z `Base.astro`**

Usuń linię importu oraz znacznik komponentu. Nie ruszaj niczego innego
w tym pliku — `<link rel="canonical">` i `<title>` zostają.

- [ ] **Krok 3: Usuń zależność**

```bash
cd polasobun && npm uninstall @vercel/speed-insights
```

- [ ] **Krok 4: Potwierdź, że nic nie zostało**

```bash
cd polasobun && grep -rn "speed-insights\|SpeedInsights" src/ package.json astro.config.mjs
```

Oczekiwane: brak trafień (kod wyjścia 1).

- [ ] **Krok 5: Zbuduj**

```bash
cd polasobun && npm run build
```

Oczekiwane: przechodzi, 19 stron.

- [ ] **Krok 6: Popraw listę zależności w AGENTS.md**

W sekcji „Twarde reguły" wykreśl `@vercel/speed-insights` z listy
dozwolonych zależności. Dopisz jednym zdaniem, że analitykę przejmuje
Cloudflare Web Analytics wstrzykiwany na brzegu sieci, więc nie wraca
do `package.json`.

- [ ] **Krok 7: Commit**

```bash
git add polasobun/package.json polasobun/package-lock.json \
        polasobun/src/layouts/Base.astro polasobun/AGENTS.md
git commit -m "chore: zdjęcie @vercel/speed-insights przed przenosinami na Cloudflare"
```

---

### Zadanie 6: Transfer rejestracji do Cloudflare

**To zadanie jest pracą człowieka w panelach.** Wymaga zadania 1
zakończonego w całości, łącznie z krokiem 7 (kod EPP).

**Pliki:** brak.

- [ ] **Krok 1: Sprawdź warunki wstępne**

```bash
dig polasobun.com NS +short
whois polasobun.com | grep -i "domain status\|expiry"
```

Oczekiwane: nameservery Cloudflare, brak `clientTransferProhibited`.
Jeśli do daty wygaśnięcia zostało **mniej niż 14 dni** — nie inicjuj
transferu. Odnów u Formatu i wróć tu po odnowieniu.

- [ ] **Krok 2: Zainicjuj transfer w Cloudflare**

Panel Cloudflare → Domain Registration → Transfer Domains. Wybierz
`polasobun.com`, podaj kod EPP, opłać. Koszt sprawdzony 2026-08-28:
**10,46 USD** — to przedpłacony rok doliczany do daty ważności, nie
opłata za transfer.

- [ ] **Krok 3: Zatwierdź transfer po stronie Formatu**

Format/Tucows wyśle mail z prośbą o potwierdzenie. Zatwierdzenie
skraca transfer z pięciu dni do kilku godzin. Bez niego transfer
i tak przejdzie po upływie okresu ICANN.

- [ ] **Krok 4: Potwierdź, że rejestrator się zmienił**

```bash
whois polasobun.com | grep -i "registrar:\|expiry"
```

Oczekiwane: `Cloudflare` jako rejestrator, data ważności przesunięta
o rok wobec `2026-10-04`.

**NIE wypowiadaj jeszcze Formatu** — to zadanie 9.

---

### Zadanie 7: Przełączenie strony na domenę

To jest moment, w którym świat widzi nową stronę. Wymaga zadania 4
(działająca publikacja) i zadania 1 kroku 5 (strefa aktywna).
Zadanie 6 **nie** jest wymagane — transfer rejestracji jest niezależny
od tego, gdzie wskazują rekordy.

**Pliki:**
- Modyfikuj: `astro.config.mjs`

**Interfejsy:**
- Konsumuje: adres Workera z zadania 3, strefę DNS z zadania 1.
- Produkuje: `site` wskazujący domenę — z niego wynikają adresy
  w sitemapie, `<link rel="canonical">` i decyzja `robots.txt`.

- [ ] **Krok 1: Podepnij domenę do Workera**

Panel Cloudflare → Workers & Pages → `polasobun` → Settings → Domains
& Routes → Add custom domain: `www.polasobun.com`.

Cloudflare sam utworzy rekord i wystawi certyfikat. Poczekaj na status
**Active**.

- [ ] **Krok 2: Ustaw przekierowanie z adresu bez www**

Panel Cloudflare → Rules → Redirect Rules. Reguła: żądania o hoście
`polasobun.com` → `https://www.polasobun.com${1}`, kod **301**,
z zachowaniem ścieżki i parametrów.

Kanoniczny jest `www` — tak działa dzisiejsza strona klientki i tak
wskazują przekierowania z `legacyPath`.

- [ ] **Krok 3: Zmień `site` w `astro.config.mjs`**

Podmień wartość i **przepisz komentarz nad nią** — obecny opisuje stan
sprzed przełączenia i po tej zmianie byłby nieprawdą:

```js
  /**
   * Adres, pod którym strona jest serwowana. JEDYNA wartość do zmiany
   * przy przenosinach — wynikają z niej adresy w sitemapie, adres
   * w <link rel="canonical"> oraz decyzja, czy robots.txt wpuszcza
   * roboty.
   *
   * Od <DATA PRZEŁĄCZENIA> domena klientki, obsługiwana przez
   * Cloudflare Workers. Wcześniej polasobun-site.vercel.app.
   */
  site: 'https://www.polasobun.com',
```

- [ ] **Krok 4: Zbuduj i sprawdź, że robots.txt się odblokował**

```bash
cd polasobun && npm run build
cat dist/robots.txt
grep -c "www.polasobun.com" dist/sitemap.xml
grep -o 'rel="canonical" href="[^"]*"' dist/index.html
```

Oczekiwane: `robots.txt` **wpuszcza** roboty (nie `Disallow: /`),
sitemapa ma **17** adresów na nowej domenie, canonical wskazuje
`https://www.polasobun.com/`.

- [ ] **Krok 5: Commit i publikacja**

```bash
git add polasobun/astro.config.mjs
git commit -m "feat: przełączenie site na www.polasobun.com"
git push
gh workflow run publikacja.yml && gh run watch
```

- [ ] **Krok 6: Sprawdź żywą domenę**

```bash
curl -sI https://www.polasobun.com/ | head -1
curl -sI https://polasobun.com/ | grep -i "^HTTP\|^location"
curl -sI https://www.polasobun.com/pandora | grep -i "^HTTP\|^location"
curl -s  https://www.polasobun.com/robots.txt
```

Oczekiwane: `200` na www, `301` na `https://www.polasobun.com/` z gołej
domeny, `301` na `/work/pandora`, robots wpuszczający roboty.

- [ ] **Krok 7: Zgłoś sitemapę do Google Search Console**

Dodaj własność `https://www.polasobun.com/` i zgłoś
`https://www.polasobun.com/sitemap.xml`. Bez tego 301-ki działają, ale
Google dowiaduje się o nich dopiero przy własnym przeszukiwaniu.

---

### Zadanie 8: Pomiary produkcyjne i Cloudflare Web Analytics

**Pliki:**
- Modyfikuj: `AGENTS.md`

**Interfejsy:**
- Konsumuje: działającą stronę pod `www.polasobun.com` z zadania 7.

- [ ] **Krok 1: Włącz Web Analytics ze wstrzykiwaniem na brzegu**

Panel Cloudflare → Web Analytics → dodaj `www.polasobun.com`. Ponieważ
domena jest obsługiwana przez Cloudflare, użyj **automatycznego
wstrzykiwania** (one-click setup), nie ręcznego snippetu.

Efekt: w naszym HTML-u nie przybywa ani jeden bajt, a Core Web Vitals
zbierają się bez ciasteczek.

- [ ] **Krok 2: Potwierdź, że beacon NIE jest w źródłach**

```bash
cd polasobun && grep -rn "cloudflareinsights\|beacon" src/ dist/index.html
```

Oczekiwane: brak trafień w `src/` i w zbudowanym HTML-u. Beacon
dokłada się dopiero po drodze, na brzegu sieci.

- [ ] **Krok 3: Rozgrzej CDN przed pomiarem**

Reguła z AGENTS.md: **nie mierz zaraz po deployu.** Pierwsza próbka na
świeżym wdrożeniu trafia w zimny cache i nie jest porównywalna.

Odśwież stronę główną kilkanaście razy i potwierdź, że zasoby
odpowiadają z cache'u:

```bash
curl -sI https://www.polasobun.com/ | grep -i "cf-cache-status"
```

- [ ] **Krok 4: Powtórz pomiary metodyką z AGENTS.md**

Warunki **dokładnie te same**, inaczej porównanie jest bezwartościowe:
Slow 4G, czterokrotne dławienie CPU, viewport 412×915, **zimny cache
przeglądarki** przy każdej próbie (`ignoreCache`), wyczyszczony
`sessionStorage`, rozgrzany CDN.

Zmierz LCP, FCP i CLS na stronie głównej. Odniesienie z Vercela:
LCP 808 ms, FCP 680 ms, CLS 0.00.

- [ ] **Krok 5: Zapisz wyniki w AGENTS.md**

W sekcji „Pomiary produkcyjne — stan końcowy" dopisz kolumnę albo
podsekcję z wynikami na Cloudflare. **Zostaw wartości z Vercela** jako
punkt odniesienia i podpisz, na jakiej platformie każda powstała.

Jeśli któraś metryka pogorszyła się o więcej niż 10% — zatrzymaj się
i zgłoś, zamiast wpisywać liczbę i iść dalej. Najbardziej prawdopodobna
przyczyna to nagłówki cache z zadania 2.

```bash
git add polasobun/AGENTS.md
git commit -m "docs: pomiary produkcyjne na Cloudflare"
```

---

### Zadanie 9: Zamknięcie — wypowiedzenie Formatu i wyłączenie Vercela

**Pierwszy krok tego zadania jest nieodwracalny.** Nie zaczynaj bez
odhaczonych warunków wstępnych.

**Pliki:** brak.

- [ ] **Krok 1: Sprawdź wszystkie warunki wstępne**

```bash
whois polasobun.com | grep -i "registrar:"
curl -sI https://www.polasobun.com/ | head -1
curl -sI https://www.polasobun.com/pandora | grep -i "^location"
git fetch --tags --force && git log wydane -1 --oneline
```

Wszystkie muszą być prawdziwe naraz:
- rejestratorem jest **Cloudflare** (zadanie 6 zakończone),
- `www.polasobun.com` zwraca 200 i serwuje NOWĄ stronę,
- przekierowania 301 działają,
- znacznik `wydane` wskazuje aktualny `main`.

- [ ] **Krok 2: Wypowiedz abonament Format.com**

Dopiero teraz. Domena jest już poza ich kontem, więc wypowiedzenie
nie może jej zabrać.

- [ ] **Krok 3: Wyłącz projekt na Vercelu**

Usuń projekt `polasobun-site` albo odłącz go od repozytorium, żeby nie
budował się dalej z każdego pusha. Konto Hobby może zostać — przestaje
serwować cokolwiek komercyjnego.

- [ ] **Krok 4: Sprawdź, że stara witryna nie odpowiada z dwóch miejsc naraz**

```bash
curl -s https://www.polasobun.com/ | grep -c "format.com" || echo "brak śladów Formatu"
curl -sI https://polasobun-site.vercel.app/ | head -1
```

Oczekiwane: brak śladów Formatu w treści; adres Vercela zwraca 404
albo przestaje istnieć.

- [ ] **Krok 5: Zapisz stan końcowy w AGENTS.md**

Sekcja „Deploy" ma opisywać wyłącznie stan faktyczny: Cloudflare
Workers, domena `www.polasobun.com`, publikacja przez
`publikacja.yml`, znacznik `wydane`. Usuń wzmianki o Vercelu jako
o produkcji — zostaw je najwyżej jako notkę historyczną przy pomiarach.

```bash
git add polasobun/AGENTS.md
git commit -m "docs: stan końcowy po przenosinach na Cloudflare"
```

---

## Czego ten plan nie robi

- **Nie dodaje nagłówków bezpieczeństwa.** Nowa strona ich nie ma;
  stara ma je w `netlify.toml`. To osobne zadanie, bo CSP wymaga
  testowania wobec stylów inline generowanych przez Astro.
- **Nie zmienia widoczności repozytorium.** Publiczne repo wystawia
  zdjęcia w 2560 px, wyżej niż serwuje strona. Osobna decyzja
  właściciela — zmiana na prywatne kosztuje darmowe minuty Actions
  (2000/mies. zamiast bez limitu).
- **Nie dotyka CMS-u.** Plan
  `2026-08-28-cms-pages-cms.md` podpina przycisk pod
  `publikacja.yml` powstały w zadaniu 4.
