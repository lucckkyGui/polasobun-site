# CMS — Pages CMS i przebudowa modelu danych

Data: 2026-08-28
Status: zatwierdzony projekt, przed implementacją

## Cel

Dać klientce panel, w którym sama wgrywa zdjęcia, układa ich kolejność,
wskazuje okładkę, zakłada nowe kampanie i poprawia teksty — bez dotykania
gita, bez pomocy wykonawcy i bez możliwości zepsucia strony.

## Stan zastany (zmierzony 2026-08-28)

| Fakt | Wartość |
|---|---|
| repozytorium | `lucckkyGui/polasobun-site`, **publiczne**, 248 MB |
| zdjęcia | 359 plików, 202 MB, średnio 0,56 MB, 17 folderów |
| model danych | jeden `src/content/projects.json`, tablica 17 wpisów |
| kolejność zdjęć | wynika z nazw plików (`localeCompare`) |
| okładka kampanii | konwencja: zawsze `01.jpg` |
| wybór do ALL | pole `featured` — tablica nazw plików |
| kolejność kampanii | pozycja w tablicy `projects.json` |
| build na zimno | 6m10s – 6m48s (zmierzone 2026-08-27) |
| `dist/_astro` | 1331 plików WebP, 232 MB |
| `year` we wszystkich wpisach | `null` — czeka na dane od klientki |
| portret na `/contact` | 379×379, czeka na oryginał od klientki |

Wniosek: **kolejności, okładki ani wyboru kadrów nie da się dziś zmienić
inaczej niż przenumerowaniem plików w folderze.** Żaden CMS tego nie
obsłuży, bo to nie są dane, tylko konwencja nazewnicza.

## Decyzje klienta (2026-08-28)

1. **Pełny zakres.** Pola ma móc: dokładać i usuwać zdjęcia, układać
   kolejność, wskazywać okładkę i kadry do ALL, zakładać nowe kampanie
   oraz edytować teksty.
2. **Logowanie kontem GitHub.** Pola zakłada darmowe konto i dostaje
   zaproszenie do repozytorium. Odrzucone: wspólne konto techniczne
   (nie widać, kto co zmienił) oraz CMS-y z własnym logowaniem
   (dokładają zewnętrzną usługę, od której zależy edycja strony).
3. **Publikacja przyciskiem, nie automatem.** Pola pracuje do skutku
   i na końcu klika „Opublikuj stronę". Jeden build zamiast dwudziestu.
4. **Nocny cron jako siatka bezpieczeństwa.** Zapomniane kliknięcie
   naprawia się samo w ciągu doby.
5. **Rozbicie `projects.json` na plik per kampania.** Odrzucone:
   zostawienie jednej tablicy (całe portfolio jako jeden długi formularz,
   a dodanie kampanii nie zakłada folderu na zdjęcia).

## Zakres

W zakresie:
- `src/content/projects/<slug>.json` — 17 plików zamiast jednej tablicy,
- `src/content/order.json` — kolejność kampanii,
- `src/content/contact.json` — teksty zakładki CONTACT,
- `src/content/projects.ts` — z importu JSON-a staje się loaderem,
- `src/pages/index.astro` — grupowanie i kolejność z danych, nie z nazw,
- `src/pages/work/[slug].astro` — renderuje `photos` w kolejności z pliku,
- `src/pages/contact.astro` — teksty z `contact.json`,
- `.pages.yml` w korzeniu repozytorium,
- `.github/workflows/normalize-photos.yml`,
- `.github/workflows/publish.yml`,
- `.github/workflows/publish-nightly.yml`,
- skrypt migracji + dowód identyczności `dist`,
- README po polsku dla klientki + preset eksportu zdjęć.

Poza zakresem, bez zmian:
- round-robin po sesjach — mechanizm zostaje nietknięty, zmienia się
  wyłącznie źródło kolejności,
- `import.meta.glob` z `eager: true` — twarda reguła z AGENTS.md,
- taksonomia (ALL / COMMERCIAL / PORTRAITS / FOOD) i pole `tags`,
- animacja wejścia, przejścia filtrów, dwustopniowe ładowanie kafli,
- ochrona zdjęć (deterent),
- `sitemap.xml.ts` i `robots.txt.ts` — czytają `projects`, więc nowy
  loader je obsługuje bez zmian,
- hosting i domena — osobna specyfikacja
  (`2026-08-28-hosting-cloudflare-i-domena-design.md`).

## Architektura

### Model danych

Jeden plik na kampanię, `src/content/projects/<slug>.json`:

```json
{
  "slug": "pandora",
  "title": "PANDORA",
  "client": "Pandora",
  "year": null,
  "tags": ["commercial"],
  "legacyPath": "/pandora",
  "cover":  "/photos/pandora/01.jpg",
  "photos": ["/photos/pandora/01.jpg", "/photos/pandora/02.jpg"],
  "featured": ["/photos/pandora/02.jpg", "/photos/pandora/03.jpg"]
}
```

Trzy zmiany wobec stanu zastanego:

- **`cover` jest polem, nie konwencją.** Znika reguła „jeśli klientka
  wskaże inną okładkę, przenumeruj folder".
- **`photos` to pełna, uporządkowana lista.** Strona kampanii renderuje
  ją w tej kolejności zamiast sortować listing folderu.
- **Nazwy plików przestają cokolwiek znaczyć.** `01.jpg` traci status
  magicznej nazwy.

Ścieżki zapisane są w formie wyjściowej Pages CMS (`/photos/<slug>/…`).
Loader odwzorowuje je na klucze `import.meta.glob` przez podmianę
przedrostka `/photos` na `../assets/photos`.

### Kolejność kampanii

`src/content/order.json` — pole typu `reference` z `multiple: true`,
lista kampanii do przeciągania. Steruje dwiema rzeczami naraz:
kolejnością kafli w COMMERCIAL i rundami round-robina w ALL.

Bez tego pliku kolejność zniknęłaby przy rozbiciu tablicy na osobne
pliki — pozostałby porządek alfabetyczny nazw plików.

### Zmiany w kodzie

| plik | zmiana |
|---|---|
| `src/content/projects.ts` | `import.meta.glob('./projects/*.json', { eager: true })` + kolejność z `order.json`. Typ `Project` zyskuje `cover: string` i `photos: string[]` |
| `src/pages/index.astro` | grupowanie z `photos`, nie z regexpa na ścieżce; znika `localeCompare`; wykluczenie okładki z ALL porównuje `cover`, nie `name !== '01.jpg'` |
| `src/pages/work/[slug].astro` | renderuje `photos` zamiast listingu folderu |
| `src/pages/contact.astro` | `AKAPITY` i `KONTAKT` z `contact.json` |

Round-robin, dwa przebiegi renderowania i `data-cat` pozostają bez
zmian. Zmienia się **skąd bierze się kolejność**, nie to, jak zdjęcia
trafiają do `astro:assets`.

### Konfiguracja `.pages.yml`

Plik leży w korzeniu repozytorium; ścieżki są względne wobec repo,
więc wskazują w głąb `polasobun/`.

```yaml
media:
  - name: zdjecia
    input: polasobun/src/assets/photos
    output: /photos
    categories: [image]
    extensions: [jpg, jpeg]

content:
  - name: kampanie
    label: Kampanie
    type: collection
    path: polasobun/src/content/projects
    format: json
    filename: '{fields.slug}.json'
    fields:
      - { name: title, label: Nazwa, type: string, required: true }
      - { name: slug,  label: Adres strony, type: string, required: true,
          description: 'polasobun.com/work/TO-POLE — po opublikowaniu NIE zmieniaj' }
      - { name: client, label: Klient, type: string }
      - { name: year,   label: Rok,    type: number }
      - { name: tags,   label: Zakładki, type: select,
          options: { multiple: true, values: [commercial, portraits, food] } }
      - { name: cover,    label: Okładka, type: image,
          options: { media: zdjecia } }
      - { name: featured, label: Kadry na stronę główną, type: image,
          options: { media: zdjecia, multiple: { max: 6 }, unique: true } }
      - { name: photos,   label: Zdjęcia kampanii, type: image,
          options: { media: zdjecia, multiple: true, unique: true } }

  - name: kolejnosc     # order.json
  - name: kontakt       # contact.json

actions:
  - name: publikuj
    label: Opublikuj stronę
    workflow: publish.yml
```

### Workflow 1 — normalizacja zdjęć

Wyzwalacz: push do `main` w ścieżce `polasobun/src/assets/photos/**`.

Dla każdego zmienionego pliku: dłuższy bok do 2560 px, JPEG q82
(mozjpeg, 4:4:4), EXIF zdjęty. Wynik commitowany z powrotem.

Rekursji nie ma z dwóch niezależnych powodów: commity robione
`GITHUB_TOKEN`-em z definicji nie wyzwalają workflow'ów, a wiadomość
i tak niesie `[skip ci]`.

### Workflow 2 — publikacja

Wyzwalacz: `workflow_dispatch` z wejściem `payload` (wymagane przez
Pages CMS). `concurrency` z **`cancel-in-progress: false`** —
kolejkujemy, nie anulujemy. Publikacja jest ręczna i rzadka, więc kolejka
nic nie kosztuje, a anulowanie w środku wysyłki — między `wrangler
deploy` a przesunięciem znacznika `wydane` — zostawiłoby rozjazd:
Cloudflare ma już nową treść, a znacznik „co jest na żywo" nadal wskazuje
starą. Implementacja ma świadomie `false`; nie „poprawiaj" tego na `true`.

Kroki: checkout → Node 22 → `npm ci` → `actions/cache` na
`node_modules/.astro` → `npm run build` → bramki → wysyłka.

**PUŁAPKA: `actions/cache` MUSI stać ZA `npm ci`, nigdy przed.** `npm ci`
czyści całą zawartość `node_modules` przed instalacją, łącznie z wpisami
kropkowymi — a `node_modules/.astro` jest domyślnym `cacheDir` Astro.
Cache przywrócony wcześniej zostaje skasowany kilka sekund później, więc
build jest zimny za każdym razem i NIE PADA przy tym żaden błąd. Objaw
jest mylący: wygląda to jak działający cache, który się nie opłaca.
Ta specyfikacja miała wcześniej odwrotną kolejność i przeszła z nią
przegląd — złapał to dopiero osobny przegląd implementacji.

Klucz cache'u: `astro-assets-${{ github.sha }}` z
`restore-keys: astro-assets-`. Przywraca ostatni dostępny cache
niezależnie od zawartości, więc Astro przelicza tylko nowe zdjęcia.

**Gdyby kluczem był hash folderu zdjęć, każde dołożone zdjęcie
unieważniałoby całość i build byłby zimny za każdym razem.** To jest
pułapka, w którą łatwo wpaść przy „poprawianiu" tej konfiguracji.

Bramki przed wysyłką:
- liczba plików w `dist` — twardy stop przy 18 000,
- lista osieroconych zdjęć w podsumowaniu zadania.

**Jedyna droga na produkcję to ten przycisk** — także dla zmian
w kodzie robionych przez wykonawcę. Push do `main` uruchamia sam build
jako kontrolę, bez wysyłki. Dzięki temu na pytanie „co jest teraz na
żywo" zawsze jest jedna odpowiedź.

### Workflow 3 — nocny cron

04:00 czasu warszawskiego. Jeśli `main` różni się od ostatnio wysłanego
commita — publikuje.

Konsekwencja do zapisania w README dla klientki, nie do przemilczenia:
**cokolwiek zostanie zostawione niedokończone na noc, rano będzie na
stronie.**

## Kolejność prac

Numeracja wspólna ze specyfikacją hostingu — B5, B6, B8, B9 i B10 leżą
tam. Tor B nie ma terminu zewnętrznego i jest niezależny od toru
domenowego aż do B8.

```
B1   skrypt migracji modelu danych + dowód, że dist jest identyczny
B2   projects.ts / index.astro / work/[slug].astro / contact.astro
B3   .pages.yml + podpięcie Pages CMS
     + weryfikacja trzech niepewnych opcji konfiguracji
B4   workflow normalizacji zdjęć
B7   nocny cron dopublikowujący
B11  README po polsku, preset eksportu, konto GitHub dla klientki
```

B1 przed B2: migracja musi dać identyczny `dist` na **starym** kodzie,
zanim kod zacznie się zmieniać. Odwrotna kolejność miesza dwie zmienne
naraz i dowód przestaje cokolwiek dowodzić.

B3 przed B4: dopóki nie wiadomo, czy trzy niepewne opcje konfiguracji
działają, kształt danych nie jest przesądzony, a workflow normalizacji
pisze do tych danych.

## Migracja

Skrypt jednorazowy: czyta `projects.json`, listuje foldery zdjęć,
generuje 17 plików wpisów oraz `order.json`. `cover` = dzisiejsze
`01.jpg`. `photos` = listing folderu posortowany dokładnie tak jak dziś.

**Kryterium odbioru migracji: `dist` przed i po jest identyczny.**
Weryfikacja przez porównanie sum kontrolnych, nie przez obejrzenie
strony. Migracja, która „wygląda tak samo", nie jest zweryfikowana.

## Ryzyka i czego nie obiecujemy

**Historia gita puchnie nieodwracalnie.** Normalizacja naprawia plik na
dysku, ale surowy plik zostaje w historii na zawsze. Przy `.git`
ważącym już 247 MB jedna kampania wgrana prosto z Lightrooma
(20 × 15 MB) dokłada ~300 MB historii zamiast ~10 MB. Dlatego klientka
dostaje **preset eksportu** (2560 px, JPEG 82) — workflow jest siatką
bezpieczeństwa, nie planem A. Nie stosujemy `--amend` z force-pushem
na `main`: CMS pisze na tę samą gałąź, więc wyścig jest realny.

**Panel nie pokaże niewysłanych zmian.** Pages CMS nie ma takiego
wskaźnika i nie da się go dorobić bez własnego hostowania CMS-a. Stąd
nocny cron.

**Zdjęcie poza `photos` znika ze strony kampanii.** Dziś nie mogło
zniknąć, bo źródłem prawdy był listing folderu. W praktyce luki nie ma —
wgranie w Pages CMS idzie *przez* pole `photos`, więc plik trafia na
dysk i na listę jednym ruchem. Bramka wypisuje sieroty na wszelki
wypadek.

**Zmiana `slug` po opublikowaniu psuje odnośniki.** Pole ma ostrzeżenie
w opisie, ale CMS tego nie zablokuje.

## Do zweryfikowania przy wdrożeniu

Poniższe są **oczekiwane, nie zmierzone** — zgodnie z regułą z AGENTS.md
o liczbach przepisanych zamiast zweryfikowanych:

1. czy pole `reference` z `multiple: true` da się przeciągać
   (`@dnd-kit/sortable` jest w zależnościach Pages CMS, ale użycie
   akurat w tym polu nie jest udokumentowane),
2. czy `pattern` działa na polu typu `string`,
3. czy `value: '{fields.slug}'` w polu `reference` zapisze sam slug,
4. **czas ciepłego builda z cache'em** — oczekiwany 1-2 min wobec
   zmierzonych 6m10s na zimno; do zmierzenia na pierwszym uruchomieniu,
5. narzut pobrania i zapisu cache'u ~232 MB w GitHub Actions,
6. czy szablon `filename` slugifikując `{fields.slug}` nie zjada
   podkreślnika w `_portraits` i `_food`. Skutek byłby kosmetyczny —
   szablon nazywa wyłącznie **nowe** wpisy, a pliki z migracji zachowują
   swoje nazwy — ale przy okazji trzeba potwierdzić rzecz istotną:
   routing `/work/<slug>` i mapowanie na folder zdjęć idą z **pola**
   `slug` wewnątrz JSON-a, nie z nazwy pliku.

## Efekt uboczny wart odnotowania

CMS zamyka trzy pozycje z listy „czekamy na materiał od klientki":
lata realizacji (dziś wszystkie `null`), oryginał portretu na `/contact`
oraz teksty bio. Klientka zrobi je sama.

Uwaga: gdy wgra portret w rozdzielczości wyższej niż 379 px, trzeba
poprawić `PORTRET_PX` i `densities` w `contact.astro` — dzisiejsze
`densities={[1, 1.45]}` są dobrane pod ograniczenie pliku 379 px.
