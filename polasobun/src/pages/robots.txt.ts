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
