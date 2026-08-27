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
 *
 * Escapowanie znaków XML: slug pochodzi z pliku edytowanego ręcznie
 * (projects.json) i TypeScript nie wymusza żadnego wzoru na `slug: string`.
 * `new URL()` koduje procentowo większość problemów w ścieżce, ale nie
 * ampersandę — znakiem legalnym w adresach. Jeden `&` w slugu przechodzi
 * przez `new URL()` nietknięty i produkuje niepoprawny XML, którego parser
 * całkowicie odrzuca (nie wyłącza pojedynczego wpisu, lecz cały dokument).
 * Sitemapa przestaje działać w całości, cicho — bez błędu przy buildzie
 * i bez sygnału na stronie. Cztery linijki escapowania to tani koszt
 * eliminacji takiej awarii.
 */
function escapujXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

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
${adresy.map((adres) => `  <url><loc>${escapujXml(adres)}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
