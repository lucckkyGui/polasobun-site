// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
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

  output: 'static',

  build: {
    /*
     * Arkusz ma ~10 kB, a domyślny próg Astro to 4 kB, więc bez tego jest
     * osobnym, blokującym renderowanie żądaniem — narzędzie szacowało na
     * nim ~530 ms straty na FCP. Wstrzyknięcie go w HTML zdejmuje jedno
     * pełne okrążenie z krytycznej ścieżki.
     *
     * Kosztem jest brak współdzielonego cache'u: każda z 19 stron niesie
     * własną kopię arkusza. Przy tym rozmiarze to ~3 kB po gzipie na
     * stronę i opłaca się, bo ruch wchodzi na stronę główną.
     */
    inlineStylesheets: 'always',
  },

  integrations: [react()],

  vite: {
    plugins: [tailwindcss()],
  },
});
