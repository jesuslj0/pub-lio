# CLAUDE.md

Guía para trabajar en este repositorio. Responde siempre en **español**.

## Qué es el proyecto

Web de **Lío El Bonillo** (disco pub en El Bonillo, Albacete). Landing de una sola
página con:

- **Hero** + carteles del finde.
- **Galería de fotos** que sube el público (sin registro) y se **vota**; la más
  votada gana el premio de la semana siguiente.
- **Panel de administración** (`/admin`) protegido por contraseña para moderar
  fotos, marcar ganadora y publicar el cartel.

## Stack

- **Astro 6** con `output: 'server'` y adaptador **`@astrojs/vercel`** (SSR en Vercel).
- **React 19** para islas interactivas (`client:load`).
- **TailwindCSS v4** (vía `@tailwindcss/vite`, importado en `src/styles/global.css`).
- **Supabase** (Postgres) para datos y **Cloudinary** para alojar imágenes subidas.
- **Lucide** para iconos.
- Node **22.x** (fijado en `engines`; obligatorio que sea `22.x`, no un rango, por Vercel).

## Comandos

```bash
npm run dev      # desarrollo
npm run build    # build de producción (genera .vercel/output)
npm run preview  # previsualizar el build
```

## Estructura

```
src/
  components/     # .astro (estáticos) y .tsx (islas React interactivas)
  layouts/Base.astro   # layout raíz: tokens CSS (:root), cursor custom, fuentes
  lib/            # supabase.ts (cliente público), supabaseAdmin.ts (service role),
                  # cloudinary.ts, adminAuth.ts, database.types.ts
  pages/
    index.astro   # única página pública
    admin/        # panel de administración
    api/          # endpoints SSR (upload-photo, vote, check-limit, admin/*)
  styles/global.css
public/img/       # imágenes estáticas (referenciar como /img/...)
```

## Variables de entorno

Definidas en `.env.local` (no se versiona). **Deben configurarse también en el
dashboard de Vercel** o las funciones SSR fallan en runtime:

```
PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
PUBLIC_CLOUDINARY_CLOUD_NAME
PUBLIC_CLOUDINARY_UPLOAD_PRESET
ADMIN_SECRET
```

Las que empiezan por `PUBLIC_` son accesibles en cliente; el resto **solo en servidor**
(nunca exponer `SUPABASE_SERVICE_ROLE_KEY` ni `ADMIN_SECRET` en componentes de cliente).
Acceder siempre con `import.meta.env.X`.

## Sistema de diseño (tokens)

Definidos como variables CSS en `:root` dentro de `src/layouts/Base.astro`:

| Token        | Valor       | Uso                        |
| ------------ | ----------- | -------------------------- |
| `--bg`       | `#080810`   | fondo principal            |
| `--surface`  | `#13131f`   | superficies/tarjetas       |
| `--border`   | blanco 7%   | bordes                     |
| `--accent`   | `#48f026`   | verde de marca (principal) |
| `--accent2`  | `#7b2fff`   | violeta                    |
| `--accent3`  | `#ff2d6e`   | rosa                       |
| `--text`     | `#e8e8f0`   | texto                      |
| `--muted`    | `#6b6b80`   | texto secundario           |

Fuentes: `--font-display` (Bebas Neue, titulares), `--font-body` (DM Sans),
`--font-mono` (Space Mono, etiquetas/eyebrows).

> Hay un **cursor personalizado** (`cursor: none` global + elementos `.cursor`).
> El efecto hover del cursor se activa sobre `a, button, .foto-card, .cartel-side`.

## Reglas a seguir

### Estilos — usar TailwindCSS

- **Componentes nuevos**: usar **clases de utilidad de Tailwind** para layout y
  estilos, y `<style>` scoped (CSS normal) **solo** para lo que Tailwind no cubra
  bien (animaciones/keyframes, efectos puntuales).
- **Componentes ya existentes**: dejarlos **tal cual están en CSS normal**; no
  migrarlos a Tailwind salvo que se pida explícitamente.
- Los tokens de marca ya están expuestos en `@theme` (`src/styles/global.css`), así
  que hay utilidades disponibles: `bg-bg`, `bg-surface`, `text-accent`, `text-muted`,
  `border-border`, `font-display`, `font-mono`, etc.
- Mantener la **estética actual**: fondo oscuro, verde de acento, tipografía
  display grande, toques mono en etiquetas. No introducir estilos genéricos.

### Iconos — usar Lucide

- En componentes **React (`.tsx`)** usar `lucide-react`:

  ```tsx
  import { Camera } from "lucide-react";
  <Camera size={18} strokeWidth={1.5} />;
  ```

- En componentes **Astro (`.astro`)** usar `@lucide/astro`:

  ```astro
  ---
  import { Camera } from "@lucide/astro";
  ---
  <Camera size={18} stroke-width={1.5} />
  ```

- Importar **solo los iconos que se usen** (tree-shaking). Tamaño/trazo finos y
  coherentes con el diseño minimalista.

> Pendiente de instalar: `npm i lucide-react @lucide/astro`.

### Generales

- **UI siempre en español** (textos de cara al usuario).
- Componentes interactivos = islas React con `client:load`; el resto, `.astro` estático.
- Para enlaces internos a secciones usar anclas (`#subir`, `#fotos`, ...); el scroll
  suave ya está activo globalmente.
- Validar y verificar con `npm run build` antes de dar por terminado un cambio.
- No commitear ni hacer push salvo que se pida explícitamente.
