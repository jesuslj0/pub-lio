// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';


import vercel from '@astrojs/vercel';


export default defineConfig({
  // Dominio público del sitio. Necesario para URLs canónicas, Open Graph y sitemap.
  // www es el dominio real: el apex (sin www) redirige aquí (301). Si `site`
  // apuntara al apex, cada página se autodeclararía canónica hacia una URL
  // que a su vez redirige, contradicción que Search Console reporta como
  // "Página con redirección" (visto primero en casinoelbonillo.com el 05/09/2026).
  site: 'https://www.liopub.com',
  output: 'server',
  integrations: [
    react(),
    sitemap({
      // Fuera: panel de administración, API, fotos sueltas (/foto/[id]) y 404.
      // /fotos/ (el historial) sí entra: '/foto/' no casa con '/fotos/'.
      // Los borradores del blog no se generan, así que tampoco aparecen.
      filter: (page) =>
        !page.includes('/admin') &&
        !page.includes('/api/') &&
        !page.includes('/foto/') &&
        !page.includes('/404'),
      // Las fichas de evento son SSR (salen de Supabase) y la integración no
      // las ve: las sirve un endpoint propio que se añade al índice.
      customSitemaps: ['https://www.liopub.com/sitemap-eventos.xml'],
    }),
  ],

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel(),
});
