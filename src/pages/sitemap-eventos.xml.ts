import type { APIRoute } from "astro";
import { eventosConPagina } from "../lib/eventos";
import { urlCanonica } from "../lib/seo";

// Sitemap de las fichas de evento (/eventos/[slug]/). Son SSR y salen de
// Supabase, así que @astrojs/sitemap no las ve en la build: este endpoint las
// lista en cada petición y astro.config.mjs lo añade a sitemap-index.xml
// (opción `customSitemaps`). Los carteles borrados desaparecen de aquí solos.

export const prerender = false;

const escapar = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export const GET: APIRoute = async () => {
  let urls = "";
  try {
    const eventos = await eventosConPagina();
    urls = eventos
      .map((e) => `<url><loc>${escapar(urlCanonica(e.ruta!))}</loc><lastmod>${e.creadoEn.slice(0, 10)}</lastmod></url>`)
      .join("");
  } catch (err) {
    // Mejor un sitemap vacío que un 500: Search Console lo reintenta.
    console.error("[sitemap-eventos]", err);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
};
