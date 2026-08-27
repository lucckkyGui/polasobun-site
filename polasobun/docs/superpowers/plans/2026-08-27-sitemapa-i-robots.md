# Sitemapa, robots.txt i canonical — plan implementacji

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wyszukiwarki dostają listę adresów, jednoznaczny adres kanoniczny każdej strony i blokadę indeksowania, dopóki strona żyje pod tymczasowym adresem Vercela.

**Architecture:** Jedna opcja `site` w konfiguracji Astro jest źródłem prawdy. Z niej wynikają adresy w sitemapie, adres w `canonical` i decyzja, czy `robots.txt` wpuszcza roboty. Sitemapa i robots to endpointy generowane w czasie budowania, bez nowych zależności.

**Tech Stack:** Astro 7 (static), TypeScript strict.

**Sprawdzone przed napisaniem planu:** `projects.ts` eksportuje
`export const projects: Project[]`, a `Project` ma `slug: string`
i `collection?: boolean`. Typ `APIRoute` jest eksportowany przez `astro`
(`dist/types/public/common.d.ts:96`) i destrukturyzacja `({ site })`
przechodzi `astro check` bez błędów — sprawdzone sondą, nie założone.

## Global Constraints

- **Zero nowych zależności.** W szczególności **nie instaluj `@astrojs/sitemap`** — decyzja klienta z 2026-08-27, uzasadniona w specyfikacji.
- **W projekcie nie ma frameworku testowego.** Rolę testu pełni `npm run build` (`astro check && astro build`) oraz sprawdzenie wygenerowanych plików w `dist/`. Każdy krok ma jawny warunek „przechodzi / nie przechodzi".
- **Komentarze po polsku**, wyjaśniają *dlaczego*, nie *co*.
- **Każde polecenie `git` poprzedzaj `LC_ALL=C LANG=C`** — pod polską lokalizacją git wywala się z `BUG: strbuf.c:400: your vsnprintf is broken`.
- **Nie używaj `git commit --amend`** — rób nowe commity.
- **Nigdy `git stash` bez `-m`** (stos współdzielony między drzewami roboczymi).
- Polecenia `npm` uruchamiaj z `polasobun/`; polecenia `git` z korzenia drzewa roboczego.
- **Nie uruchamiaj serwerów przez Bash** — od tego jest `mcp__Claude_Browser__preview_start`.
- **Gałąź ma włączony automerge** — po pushu commit trafia do `main` samoczynnie. Zdarza się, że nie zadziała; wtedy trzeba założyć PR ręcznie.

## Stan zastany (zmierzony 2026-08-27)

| Fakt | Wartość |
|---|---|
| `/sitemap.xml` i `/robots.txt` na produkcji | **404** |
| `astro.config.mjs` | **brak opcji `site`** |
| stron generowanych przez build | **19** |
| kampanii bez kolekcji | **15** (`projects.json` ma 17 wpisów, z czego 2 to `collection: true`) |
| `/contact` kontra `/contact/` | **oba 200, bez przekierowania** |
| stare `sitemap.xml` i `robots.txt` | w korzeniu repo, poza `polasobun/`, build ich nie widzi |

## Struktura plików

| Plik | Odpowiedzialność |
|---|---|
| `astro.config.mjs` (zmiana) | opcja `site` — jedyne źródło adresu |
| `src/layouts/Base.astro` (zmiana) | `<link rel="canonical">` dla wszystkich stron |
| `src/pages/sitemap.xml.ts` (nowy) | lista 17 adresów do zaindeksowania |
| `src/pages/robots.txt.ts` (nowy) | blokada albo zaproszenie, zależnie od `site` |
| `sitemap.xml`, `robots.txt` w korzeniu repo | **do usunięcia** |

---

### Task 1: Opcja `site` i canonical

**Files:**
- Modify: `astro.config.mjs`
- Modify: `src/layouts/Base.astro`

**Interfaces:**
- Consumes: nic.
- Produces: `site` w konfiguracji, dostępne w endpointach jako `({ site })` i w stronach jako `Astro.site`. Zadania 2 i 3 na tym polegają.

- [ ] **Step 1: Dodaj `site` do konfiguracji**

W `astro.config.mjs`, wewnątrz `defineConfig({ ... })`, **przed** `output: 'static'`:

```js
  /**
   * Adres, pod którym strona jest serwowana. JEDYNA wartość do zmiany
   * po przełączeniu DNS na domenę klientki — wynikają z niej adresy
   * w sitemapie, adres w <link rel="canonical"> oraz decyzja, czy
   * robots.txt wpuszcza roboty.
   *
   * Dziś Vercel, bo www.polasobun.com nadal serwuje starą witrynę
   * z Formatu, a polasobun.com bez www w ogóle nie odpowiada
   * (sprawdzone 2026-08-27).
   */
  site: 'https://polasobun-site.vercel.app',
```

- [ ] **Step 2: Dodaj canonical do `Base.astro`**

W bloku frontmattera, po `const { title } = Astro.props;`:

```ts
/**
 * Adres kanoniczny tej strony.
 *
 * Bez niego `/contact` i `/contact/` są dla wyszukiwarki dwoma adresami
 * z identyczną treścią: oba zwracają 200, a Vercel nie przekierowuje
 * między nimi (sprawdzone 2026-08-27). Astro buduje w formacie
 * `directory`, a `trailingSlash` ma domyślną wartość `ignore`.
 *
 * Normalizujemy do wariantu BEZ ukośnika końcowego, zgodnego
 * z odnośnikami w kodzie (`href="/contact"`, `href="/work/<slug>"`).
 * Wyjątkiem jest korzeń, który zostaje `/`.
 */
const sciezka = Astro.url.pathname.replace(/\/+$/, '') || '/';
const canonical = new URL(sciezka, Astro.site).href;
```

W sekcji `<head>`, bezpośrednio pod `<title>{title}</title>`:

```astro
    <link rel="canonical" href={canonical} />
```

- [ ] **Step 3: Zbuduj**

```bash
cd polasobun
npm run build 2>&1 | tail -3
```

**Warunek przejścia:** build i `astro check` bez błędów.

Jeśli `astro check` zgłosi, że `Astro.site` może być `undefined` — to znaczy, że krok 1 nie zadziałał. Wróć do niego, nie obchodź błędu rzutowaniem typu.

- [ ] **Step 4: Sprawdź canonical na wszystkich stronach**

```bash
cd polasobun
echo "stron w dist: $(find dist -name 'index.html' | wc -l | tr -d ' ')"
echo "z canonical:  $(grep -l 'rel="canonical"' $(find dist -name 'index.html') | wc -l | tr -d ' ')"
echo '--- przyklady ---'
for p in dist/index.html dist/contact/index.html dist/work/rimmel/index.html; do
  printf '  %-32s %s\n' "${p#dist}" "$(grep -o 'rel="canonical" href="[^"]*"' $p)"
done
echo '--- czy ktorakolwiek strona ma wiecej niz jeden ---'
for p in $(find dist -name 'index.html'); do
  n=$(grep -o 'rel="canonical"' $p | wc -l | tr -d ' ')
  [ "$n" -ne 1 ] && echo "  $p ma $n"
done
echo '  (brak linii wyzej = kazda strona ma dokladnie jeden)'
```

**Warunki przejścia:** liczba stron **19**, wszystkie z canonical; strona główna ma `https://polasobun-site.vercel.app/`, `/contact` ma `.../contact` **bez ukośnika**, `/work/rimmel` ma `.../work/rimmel`; żadna strona nie ma więcej niż jednego canonical.

- [ ] **Step 5: Commit**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git add polasobun/astro.config.mjs polasobun/src/layouts/Base.astro
LC_ALL=C LANG=C git commit -F - <<'MSG'
feat: adres kanoniczny na kazdej stronie

/contact i /contact/ oba zwracaly 200 bez przekierowania, wiec dla
wyszukiwarki byly dwoma adresami z identyczna trescia. Canonical
wskazuje wariant bez ukosnika, zgodny z odnosnikami w kodzie.

Opcja `site` w konfiguracji jest odtad jedynym miejscem, ktore trzeba
zmienic po przelaczeniu DNS na domene klientki.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 2: Sitemapa

**Files:**
- Create: `src/pages/sitemap.xml.ts`

**Interfaces:**
- Consumes: `site` z zadania 1; `projects` z `src/content/projects.ts` (tablica obiektów `Project` z polami `slug: string` i opcjonalnym `collection?: boolean`).
- Produces: `dist/sitemap.xml`. Zadanie 3 odwołuje się do tego adresu w `robots.txt`.

- [ ] **Step 1: Napisz endpoint**

Zapisz jako `src/pages/sitemap.xml.ts`:

```ts
import type { APIRoute } from 'astro';
import { projects } from '../content/projects';

/**
 * Sitemapa budowana w czasie kompilacji.
 *
 * Wypisujemy WYŁĄCZNIE <loc>. `lastmod` musiałby brać datę builda, czyli
 * twierdzić, że wszystkie strony zmieniły się dzisiaj — także przy
 * wdrożeniu dotykającym jednego pliku. Google ignoruje `lastmod`, któremu
 * nie ufa, a `changefreq` i `priority` są ignorowane od lat. Siedemnaście
 * prawdziwych adresów jest warte więcej niż siedemnaście adresów
 * z trzema zmyślonymi atrybutami każdy.
 *
 * Kolekcje (_portraits, _food) są pomijane: nie prowadzi do nich żaden
 * odnośnik, adres zaczyna się od podkreślnika, a treść dubluje to, co
 * jest w siatce pod PORTRAITS i FOOD. Strony nadal powstają — po prostu
 * ich nie zgłaszamy.
 *
 * Poza korzeniem żaden adres nie kończy się ukośnikiem, spójnie
 * z <link rel="canonical"> i z odnośnikami w kodzie.
 */
export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error('Brak `site` w astro.config.mjs — sitemapa wymaga adresu absolutnego');
  }

  const sciezki = [
    '/',
    '/contact',
    ...projects.filter((projekt) => !projekt.collection).map((projekt) => `/work/${projekt.slug}`),
  ];

  const adresy = sciezki.map((sciezka) => new URL(sciezka, site).href);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${adresy.map((adres) => `  <url><loc>${adres}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
```

- [ ] **Step 2: Zbuduj**

```bash
cd polasobun
npm run build 2>&1 | tail -3
```

**Warunek przejścia:** build i `astro check` bez błędów.

- [ ] **Step 3: Sprawdź zawartość sitemapy**

```bash
cd polasobun
test -f dist/sitemap.xml && echo 'plik istnieje' || echo 'BRAK'
echo "adresow: $(grep -c '<loc>' dist/sitemap.xml)"
echo "spoza site: $(grep -o '<loc>[^<]*' dist/sitemap.xml | grep -cv 'https://polasobun-site.vercel.app')"
echo "z kolekcjami: $(grep -c '_portraits\|_food' dist/sitemap.xml || true)"
echo "z ukosnikiem na koncu (poza korzeniem): $(grep -o '<loc>[^<]*/</loc>' dist/sitemap.xml | grep -vc 'vercel.app/</loc>' || true)"
echo '--- pierwsze trzy ---'
grep -o '<loc>[^<]*</loc>' dist/sitemap.xml | head -3 | sed 's/^/  /'
```

**Warunki przejścia:** plik istnieje; **17** adresów; **0** spoza `site`; **0** z kolekcjami; **0** kończących się ukośnikiem poza korzeniem; pierwsze trzy to strona główna, `/contact` i pierwsza kampania.

- [ ] **Step 4: Sprawdź, że XML jest poprawny**

```bash
cd polasobun
python3 -c "
import xml.etree.ElementTree as ET
d = ET.parse('dist/sitemap.xml').getroot()
ns = '{http://www.sitemaps.org/schemas/sitemap/0.9}'
loc = d.findall(f'{ns}url/{ns}loc')
print(f'  parsuje sie poprawnie, {len(loc)} adresow')
print(f'  namespace: {d.tag}')
"
```

**Warunek przejścia:** parsuje się bez wyjątku, 17 adresów, tag korzenia to `{http://www.sitemaps.org/schemas/sitemap/0.9}urlset`.

- [ ] **Step 5: Commit**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git add polasobun/src/pages/sitemap.xml.ts
LC_ALL=C LANG=C git commit -F - <<'MSG'
feat: sitemapa generowana z listy kampanii

Siedemnascie adresow: strona glowna, /contact i pietnascie kampanii.
Kolekcje _portraits i _food pomijane — nie prowadzi do nich zaden
odnosnik, a ich tresc dubluje siatke.

Same <loc>, bez lastmod, changefreq i priority. lastmod musialby brac
date builda, czyli twierdzic, ze wszystkie strony zmienily sie dzisiaj.

Bez @astrojs/sitemap — przy 17 adresach integracja nie robi nic, czego
nie robi ten plik.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 3: robots.txt

**Files:**
- Create: `src/pages/robots.txt.ts`

**Interfaces:**
- Consumes: `site` z zadania 1; adres `/sitemap.xml` z zadania 2.
- Produces: `dist/robots.txt`.

- [ ] **Step 1: Napisz endpoint**

Zapisz jako `src/pages/robots.txt.ts`:

```ts
import type { APIRoute } from 'astro';

/**
 * robots.txt zależny od adresu w `site`.
 *
 * Dopóki strona żyje pod adresem Vercela, blokujemy roboty. Inaczej nowa
 * strona konkurowałaby o te same zapytania z witryną klientki na
 * www.polasobun.com — i to pod tymczasowym adresem, który za chwilę
 * zniknie, a Google mogłoby uznać go za kanoniczny. Po przełączeniu DNS
 * wystarczy zmienić `site` w konfiguracji i blokada znika sama, bez
 * pamiętania o niej.
 *
 * Wariant blokujący NIE zawiera linii `Sitemap:` — zapraszanie do mapy
 * strony, której jednocześnie zabraniamy odwiedzać, byłoby sprzecznym
 * sygnałem.
 */
export const GET: APIRoute = ({ site }) => {
  if (!site) {
    throw new Error('Brak `site` w astro.config.mjs — robots.txt wymaga adresu absolutnego');
  }

  const adresTymczasowy = new URL(site).hostname.endsWith('.vercel.app');

  const tresc = adresTymczasowy
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\n\nSitemap: ${new URL('/sitemap.xml', site).href}\n`;

  return new Response(tresc, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
```

- [ ] **Step 2: Zbuduj**

```bash
cd polasobun
npm run build 2>&1 | tail -3
```

**Warunek przejścia:** build i `astro check` bez błędów.

- [ ] **Step 3: Sprawdź wariant blokujący**

```bash
cd polasobun
test -f dist/robots.txt && echo 'plik istnieje' || echo 'BRAK'
echo '--- tresc ---'
sed 's/^/  /' dist/robots.txt
echo '--- kontrola ---'
grep -q 'Disallow: /' dist/robots.txt && echo '  blokada: JEST' || echo '  blokada: BRAK'
grep -q 'Sitemap:' dist/robots.txt && echo '  linia Sitemap: JEST (NIE POWINNO BYC)' || echo '  linia Sitemap: brak, poprawnie'
```

**Warunki przejścia:** plik istnieje; zawiera `Disallow: /`; **nie** zawiera linii `Sitemap:`.

- [ ] **Step 4: Sprawdź wariant po przełączeniu domeny**

Nie zmieniaj konfiguracji na stałe — sprawdź tymczasowo i cofnij.

```bash
cd polasobun
cp astro.config.mjs /tmp/astro.config.mjs.bak
sed -i '' "s|site: 'https://polasobun-site.vercel.app'|site: 'https://polasobun.com'|" astro.config.mjs
npm run build >/dev/null 2>&1
echo '--- tresc przy domenie docelowej ---'
sed 's/^/  /' dist/robots.txt
cp /tmp/astro.config.mjs.bak astro.config.mjs
npm run build >/dev/null 2>&1
echo '--- po cofnieciu ---'
grep -o "site: '[^']*'" astro.config.mjs | sed 's/^/  /'
```

**Warunki przejścia:** przy `polasobun.com` plik zawiera `Allow: /` **oraz** `Sitemap: https://polasobun.com/sitemap.xml`; po cofnięciu konfiguracja wraca do adresu Vercela.

To jest jedyny sposób, żeby sprawdzić drugą gałąź warunku przed przełączeniem DNS. Bez tego kroku dowiemy się, czy działa, dopiero w dniu przeprowadzki.

- [ ] **Step 5: Commit**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git status --short
LC_ALL=C LANG=C git add polasobun/src/pages/robots.txt.ts
LC_ALL=C LANG=C git commit -F - <<'MSG'
feat: robots.txt zalezny od adresu w konfiguracji

Dopoki `site` wskazuje vercel.app, blokujemy roboty — nowa strona nie
konkuruje o zapytania z witryna klientki na www.polasobun.com. Po
przelaczeniu DNS blokada znika sama, bez pamietania o niej.

Wariant blokujacy nie ma linii Sitemap: zapraszanie do mapy strony,
ktorej jednoczesnie zabraniamy odwiedzac, byloby sprzecznym sygnalem.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

**Uwaga:** `git status --short` w pierwszej linii jest celowy — upewnij się, że `astro.config.mjs` **nie** figuruje jako zmieniony. Jeśli figuruje, krok 4 nie cofnął zmiany i nie wolno commitować.

---

### Task 4: Usunięcie starych plików, dokumentacja, PR

**Files:**
- Delete: `sitemap.xml`, `robots.txt` (korzeń drzewa roboczego, **nie** `polasobun/`)
- Modify: `polasobun/AGENTS.md` (dowiązany jako `CLAUDE.md`)

**Interfaces:**
- Consumes: wyniki zadań 1–3.
- Produces: nic dla kodu.

- [ ] **Step 1: Usuń stare pliki**

Leżą w korzeniu drzewa roboczego, poza katalogiem `polasobun/`, więc build Astro ich nie widzi i nikt ich nie serwuje. Opisują podstrony starego prototypu (`sport`, `komercyjne`, `food`), których w nowej stronie nie ma, i wskazują `www.polasobun.com`.

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git rm sitemap.xml robots.txt
LC_ALL=C LANG=C git status --short
```

**Warunek przejścia:** usunięte dokładnie te dwa pliki. `index.html`, `sport.html`, `komercyjne.html`, `food.html`, `design-reference.html`, `netlify.toml` i katalog `assets/` **zostają nietknięte** — to reszta starego prototypu, poza zakresem.

- [ ] **Step 2: Dopisz sekcję do CLAUDE.md**

`CLAUDE.md` i `AGENTS.md` to **ten sam plik** (dowiązanie symboliczne) — sprawdź `ls -l`, edytuj jeden, nie commituj obu.

W stylu istniejących wpisów (fakt, liczba, przestroga) opisz:

- że **`site` w `astro.config.mjs` jest jedyną wartością do zmiany po przełączeniu DNS**, i co z niej wynika: adresy w sitemapie, adres w `canonical`, decyzja robots.txt,
- że **`robots.txt` blokuje wszystko, dopóki host kończy się na `.vercel.app`** — to celowe, chroni pozycję klientki, ale oznacza, że nowa strona nie pojawi się w Google do dnia przeprowadzki,
- że **`/contact` i `/contact/` oba zwracają 200 bez przekierowania** (zmierzone 2026-08-27), bo Astro buduje w formacie `directory` przy `trailingSlash: ignore` — stąd canonical, bez niego byłby duplikat,
- że **sitemapa celowo nie ma `lastmod`, `changefreq` ani `priority`**, z uzasadnieniem: `lastmod` z daty builda twierdziłby, że wszystkie strony zmieniły się dzisiaj,
- że **kolekcje `_portraits` i `_food` mają strony, ale nie są w sitemapie** — nie prowadzi do nich żaden odnośnik.

- [ ] **Step 3: Zbuduj po raz ostatni**

```bash
cd polasobun
npm run build 2>&1 | tail -3
```

**Warunek przejścia:** bez błędów.

- [ ] **Step 4: Commit i push**

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git add -A polasobun/AGENTS.md sitemap.xml robots.txt
LC_ALL=C LANG=C git commit -F - <<'MSG'
docs: sitemapa, robots.txt i canonical

Usuniete stare sitemap.xml i robots.txt z korzenia repozytorium —
opisywaly podstrony starego prototypu i wskazywaly domene serwujaca
stara witryne. Build Astro ich nie widzial, wiec nikt ich nie serwowal.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
LC_ALL=C LANG=C git push origin osurmo/astro-project-setup-df1cf5
```

- [ ] **Step 5: Otwórz PR albo potwierdź automerge**

Gałąź ma automerge, więc commity mogą trafić do `main` same. Sprawdź:

```bash
cd /Users/bartlomiejsurma/Developer/polasobun-site/.claude/worktrees/astro-project-setup-df1cf5
LC_ALL=C LANG=C git fetch -q origin main
LC_ALL=C LANG=C git log --oneline origin/main..HEAD
```

Jeśli lista jest pusta — automerge zadziałał. Jeśli nie, załóż PR przez `gh pr create --base main`; opis ma zawierać:
- co powstało i po co,
- **wyraźne ostrzeżenie, że `robots.txt` blokuje indeksowanie do czasu przełączenia DNS** — to najważniejsza informacja dla czytającego,
- co dokładnie trzeba zmienić w dniu przeprowadzki (jedna wartość `site`),
- listę 17 adresów w sitemapie i powód pominięcia kolekcji,
- na końcu: `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 6: Po wdrożeniu sprawdź produkcję**

```bash
for p in /sitemap.xml /robots.txt; do
  printf '  %-14s HTTP %s\n' "$p" "$(curl -s -o /dev/null -w '%{http_code}' https://polasobun-site.vercel.app$p)"
done
curl -s https://polasobun-site.vercel.app/robots.txt | sed 's/^/  /'
curl -s https://polasobun-site.vercel.app/sitemap.xml | grep -c '<loc>' | xargs echo '  adresow w sitemapie:'
curl -s https://polasobun-site.vercel.app/contact | grep -o 'rel="canonical" href="[^"]*"' | sed 's/^/  /'
```

**Warunki przejścia:** oba pliki zwracają **200** zamiast 404; `robots.txt` zawiera `Disallow: /`; sitemapa ma 17 adresów; `/contact` ma canonical bez ukośnika.

---

## Kolejność i bramki

```
Task 1 (site + canonical)   ─ bramka: 19 stron, każda z dokładnie jednym canonical
Task 2 (sitemapa)           ─ bramka: 17 adresów, zero kolekcji, poprawny XML
Task 3 (robots.txt)         ─ bramka: obie gałęzie warunku sprawdzone, konfiguracja cofnięta
Task 4 (sprzątanie, PR)     ─ bramka: oba pliki zwracają 200 na produkcji
```
