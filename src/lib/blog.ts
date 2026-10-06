import { getCollection, type CollectionEntry } from "astro:content";

export type Articulo = CollectionEntry<"blog">;

/**
 * Artículos visibles: en producción solo los publicados. En `npm run dev`
 * también los borradores (con aviso y noindex) para poder revisarlos.
 */
export async function articulosVisibles(): Promise<Articulo[]> {
  const todos = await getCollection("blog", ({ data }) => import.meta.env.DEV || !data.draft);
  return todos.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

const fmtFecha = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

export function fechaLarga(d: Date): string {
  return fmtFecha.format(d);
}

export function fechaIso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Variantes AVIF/WebP de una imagen de /public/img (existen junto al .jpeg). */
export function variantesImagen(ruta: string) {
  const base = ruta.replace(/\.(jpe?g|png)$/i, "");
  return { avif: `${base}.avif`, webp: `${base}.webp`, original: ruta };
}
