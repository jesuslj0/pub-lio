import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// Miniblog (/blog). Un Markdown por artículo en src/content/blog/; el nombre del
// archivo es el slug. Con `draft: true` el artículo no se genera ni entra en el
// sitemap.
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    // Regla SEO: el nombre siempre junto al pueblo ("Lío" a secas no posiciona).
    title: z
      .string()
      .refine((t) => t.includes("Lío Music Pub") && t.includes("El Bonillo"), {
        message: 'El título debe incluir "Lío Music Pub" y "El Bonillo"',
      }),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    /** Ruta en /public (p. ej. "/img/barra.jpeg"). */
    heroImage: z.string().optional(),
    heroAlt: z.string().optional(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
