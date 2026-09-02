/**
 * Bramka spójności: public/_redirects musi zawierać dokładnie jedno
 * przekierowanie na każdy wpis kampanii z polem legacyPath.
 *
 * _redirects jest statyczny, bo Astro pomija w routingu pliki
 * zaczynające się od podkreślnika — generatora nie da się postawić
 * w src/pages. Ten skrypt zastępuje generator kontrolą.
 */
import { readdirSync, readFileSync } from 'node:fs';

const katalog = new URL('../src/content/projects/', import.meta.url);
const dane = readdirSync(katalog)
  .filter((n) => n.endsWith('.json'))
  .map((n) => JSON.parse(readFileSync(new URL(n, katalog), 'utf8')));

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

// PIERWSZEŃSTWO: Cloudflare stosuje PIERWSZE pasujące przekierowanie
// z `_redirects`, nie ostatnie. `Map.set` nadpisuje, więc sam `set`
// zapamiętałby wpis OSTATNI i bramka porównywałaby co innego, niż zobaczy
// produkcja — zły wpis wyżej, poprawny niżej i mamy zieloną kontrolę przy
// złym przekierowaniu na żywo.
//
// Zamiast odtwarzać tu pierwszeństwo Cloudflare zatrzymujemy się na
// duplikacie: zdublowana ścieżka źródłowa w `_redirects` jest zawsze
// pomyłką, nigdy zamierzonym zapasem. Nie "upraszczaj" tego z powrotem do
// samego `set` — cicha rozbieżność między bramką a produkcją wraca.
const znalezione = new Map();
for (const wiersz of wiersze) {
  const [z, na, kod] = wiersz.split(/\s+/);
  if (kod !== '301') {
    console.error(`BŁĄD: "${wiersz}" nie jest przekierowaniem 301`);
    process.exit(1);
  }
  if (znalezione.has(z)) {
    console.error(
      `DUPLIKAT: ścieżka ${z} występuje w _redirects więcej niż raz ` +
        `(cele: ${znalezione.get(z)} oraz ${na}). Cloudflare zastosuje ` +
        `pierwszy wpis — usuń nadmiarowy.`,
    );
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
