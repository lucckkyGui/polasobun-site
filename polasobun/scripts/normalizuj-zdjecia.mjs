/**
 * Normalizacja zdjęć wgranych przez panel.
 *
 * Klientka nie musi umieć eksportować „poprawnie" — ten skrypt
 * doprowadza plik do konwencji repozytorium: dłuższy bok max 2560 px,
 * JPEG q82 (mozjpeg, 4:4:4), bez EXIF-u.
 *
 * UWAGA, CZEGO TO NIE ROBI: surowy plik ZOSTAJE W HISTORII GITA na
 * zawsze. To siatka bezpieczeństwa, nie plan A — planem A jest preset
 * eksportu po stronie klientki. Nie próbuj tego naprawiać przez
 * --amend z force-pushem: panel pisze na tę samą gałąź i wyścig
 * jest realny.
 *
 * Wywołanie: node scripts/normalizuj-zdjecia.mjs <plik> [<plik> ...]
 */
import { statSync } from 'node:fs';
import { rename } from 'node:fs/promises';
import sharp from 'sharp';

const DLUZSZY_BOK = 2560;
const JAKOSC = 82;

let poprawione = 0;

for (const plik of process.argv.slice(2)) {
  let meta;
  try {
    meta = await sharp(plik).metadata();
  } catch (blad) {
    console.log(`pomijam (nie udało się odczytać jako obrazu): ${plik} — ${blad.message}`);
    continue;
  }

  // Normalizujemy WYŁĄCZNIE JPEG-i. Panel (.pages.yml) ogranicza upload
  // do [jpg, jpeg], ale ten workflow wyzwala się na ŚCIEŻCE pliku, nie na
  // źródle zmiany — commit spoza panelu w tych katalogach mógłby przemycić
  // inny format. Bez tej bramki poszlibyśmy dalej: dla formatów bez
  // podpróbkowania chrominancji (np. PNG) `chromaSubsampling` jest
  // `undefined`, więc warunek niżej (`!== '4:4:4'`) ZAWSZE wypada
  // prawdziwy — skrypt uznałby taki plik za wymagający poprawy i po cichu
  // nadpisał go bajtami JPEG pod niezmienionym, nie-.jpg rozszerzeniem.
  if (meta.format !== 'jpeg') {
    console.log(`pomijam (format ${meta.format}, nie JPEG): ${plik}`);
    continue;
  }

  const zaDuzy = Math.max(meta.width ?? 0, meta.height ?? 0) > DLUZSZY_BOK;
  const maExif = Boolean(meta.exif || meta.icc || meta.iptc || meta.xmp);
  const podprobkowany = meta.chromaSubsampling !== '4:4:4';

  if (!zaDuzy && !maExif && !podprobkowany) {
    console.log(`bez zmian: ${plik} (${meta.width}x${meta.height})`);
    continue;
  }

  const przed = statSync(plik).size;
  const tymczasowy = `${plik}.tmp`;

  await sharp(plik)
    // rotate() bez argumentu stosuje orientację z EXIF-u ZANIM go
    // zdejmiemy. Bez tego zdjęcie z telefonu położy się na bok.
    .rotate()
    .resize({
      width: DLUZSZY_BOK,
      height: DLUZSZY_BOK,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: JAKOSC, mozjpeg: true, chromaSubsampling: '4:4:4' })
    .toFile(tymczasowy);

  const po = statSync(tymczasowy).size;
  // Samo rename() na POSIX atomowo nadpisuje istniejący cel — osobny
  // unlink() przed nim jest zbędny i otwierałby okno, w którym plik
  // docelowy chwilowo nie istnieje. Przerwany przebieg w tym oknie
  // zostawiłby dziurę zamiast pliku.
  await rename(tymczasowy, plik);

  console.log(
    `poprawione: ${plik} ${meta.width}x${meta.height} ` +
      `${(przed / 1048576).toFixed(2)} MB -> ${(po / 1048576).toFixed(2)} MB`,
  );
  poprawione++;
}

console.log(`\nPoprawionych plików: ${poprawione}`);
