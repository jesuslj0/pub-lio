// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';


import vercel from '@astrojs/vercel';


export default defineConfig({
  // Dominio público del sitio. Necesario para URLs canónicas, Open Graph y sitemap.
  // Cámbialo si el deploy de Vercel usa otro subdominio.
  site: 'https://pub-lio.vercel.app',
  output: 'server',
  integrations: [
    react(),
    sitemap({
      // No indexar el panel de administración ni las páginas dinámicas de fotos.
      filter: (page) => !page.includes('/admin') && !page.includes('/foto/'),
    }),
  ],

  vite: {
    plugins: [tailwindcss()]
  },

  adapter: vercel(),
});
