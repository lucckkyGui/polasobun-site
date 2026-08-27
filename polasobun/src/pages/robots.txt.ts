import type { APIRoute } from 'astro';

/**
 * robots.txt zależny od adresu w `site`.
 *
 * Dopóki strona żyje pod adresem Vercela, blokujemy roboty. Inaczej nowa
 * strona konkurowałaby o te same zapytania z witryną klientki na
 * www.polasobun.com — i to pod tymczasowym adresem, który za chwilę
 * zniknie, a Google mogłoby uznać go za kanoniczny.
 *
 * UWAGA: rozgałęzienie idzie po wartości `site` z konfiguracji, NIE po
 * hoście żądania — przy `output: 'static'` inaczej się nie da, bo powstaje
 * jeden plik `dist/robots.txt` wspólny dla każdego adresu, pod którym
 * odpowiada wdrożenie. Zmiana `site` na domenę docelową odblokuje więc
 * także `polasobun-site.vercel.app`, który zacznie serwować duplikat
 * z `Allow: /`. Blokada NIE znika sama — alias Vercela trzeba wtedy
 * przekierować. Pełna instrukcja na dzień przełączenia: AGENTS.md,
 * sekcja SEO. (Wdrożenia podglądowe są bezpieczne bez naszego udziału —
 * Vercel dokłada im `x-robots-tag: noindex`.)
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
