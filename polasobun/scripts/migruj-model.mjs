/**
 * Jednorazowa migracja modelu danych.
 *
 * Z jednego projects.json robi plik per kampania plus order.json,
 * i przenosi kolejność zdjęć oraz okładkę z konwencji nazw plików
 * do danych. Po tej zmianie 01.jpg przestaje być magiczną nazwą.
 *
 * KOLEJNOŚĆ MUSI BYĆ IDENTYCZNA z tym, co robi dziś kod strony:
 * localeCompare BEZ OPCJI. Nie zamieniaj na sortowanie numeryczne —
 * _portraits ma numerację trzycyfrową i dzisiejsza kolejność to
 * 10.jpg, 100.jpg, ..., 11.jpg. Kolator numeryczny przestawiłby
 * galerię.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const tu = dirname(fileURLToPath(import.meta.url));
const tresc = join(tu, '..', 'src', 'content');
const zdjecia = join(tu, '..', 'src', 'assets', 'photos');

const dane = JSON.parse(readFileSync(join(tresc, 'projects.json'), 'utf8'));

mkdirSync(join(tresc, 'projects'), { recursive: true });

const kolejnosc = [];

for (const wpis of dane) {
  const pliki = readdirSync(join(zdjecia, wpis.slug))
    .filter((n) => n.endsWith('.jpg'))
    .sort((a, b) => a.localeCompare(b));

  if (!pliki.length) throw new Error(`Folder ${wpis.slug} jest pusty`);

  const sciezka = (nazwa) => `/photos/${wpis.slug}/${nazwa}`;

  // Okładką była zawsze pierwsza nazwa alfabetycznie — dokładnie to,
  // co brał index.astro przez bySlug.get(slug)?.[0].
  const wynik = {
    slug: wpis.slug,
    title: wpis.title,
    client: wpis.client,
    year: wpis.year,
    tags: wpis.tags,
    ...(wpis.collection ? { collection: true } : {}),
    ...(wpis.legacyPath ? { legacyPath: wpis.legacyPath } : {}),
    cover: sciezka(pliki[0]),
    photos: pliki.map(sciezka),
    ...(wpis.featured ? { featured: wpis.featured.map(sciezka) } : {}),
  };

  // Featured wskazujące na nieistniejący plik było dotąd cicho
  // pomijane przez .filter(Boolean) w index.astro. Tu ma wywalić.
  for (const s of wynik.featured ?? []) {
    if (!wynik.photos.includes(s)) {
      throw new Error(`${wpis.slug}: featured wskazuje na nieistniejące ${s}`);
    }
  }

  writeFileSync(
    join(tresc, 'projects', `${wpis.slug}.json`),
    JSON.stringify(wynik, null, 2) + '\n',
  );
  kolejnosc.push(wpis.slug);
}

writeFileSync(
  join(tresc, 'order.json'),
  JSON.stringify({ kolejnosc }, null, 2) + '\n',
);

console.log(`OK — ${kolejnosc.length} kampanii, order.json zapisany`);
