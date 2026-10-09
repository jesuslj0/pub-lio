# Prompt para Claude Code: liopub.com, SEO, eventos, miniblog y sorteo del premio semanal

> Abre Claude Code en `pub-lio` y dile: "Lee `prompt-lio-seo-eventos-blog.md` y ejecútalo".

---

## Contexto

Este repositorio es **liopub.com**, la web del **Lío Music Pub**, un disco pub en la Plaza Mayor, 6, de El Bonillo (Albacete), 02610. Abre los viernes y sábados por la noche. Su Instagram es @lioelbonillo. Sigue las reglas de `CLAUDE.md`: Tailwind para lo nuevo, Lucide, tokens de marca, UI en español y no commitear ni hacer push salvo que se pida.

Situación según Search Console:

- **Solo hay una página indexada, la portada.**
- La versión canónica es `https://www.liopub.com/`, con www, y ya está bien configurada.
- **"Lío" es una palabra corriente.** Búsquedas como "el lio", "lio pub" o "pub lio" no tienen ni un clic. **"El Bonillo" tiene que ir siempre junto al nombre.** El nombre en la ficha de Google es **"Lío Music Pub"**.
- **No toques** robots.txt, `/admin` ni las APIs, salvo lo que pidan expresamente las tareas de abajo.

## Paso 0: sincronizar y analizar (obligatorio)

1. **Esta copia del repositorio puede estar desactualizada.** El último commit local es del 7 de septiembre, pero la web en producción ya tiene la página `/fotos/` ("Salón de la fama"), que aquí no aparece en `src/pages`. Haz `git status` y `git pull`. Si `/fotos` sigue sin aparecer, o hay conflictos, **para y avísame** antes de seguir. No trabajes sobre una copia antigua.
2. Revisa cómo se gestionan los **carteles**: la tabla `carteles` de Supabase y `/api/admin/cartel`, con los campos `titulo`, `subtitulo`, `imagen_url`, `media_tipo`, `fecha_inicio`, `fecha_fin` y `activo`. Revisa también el **concurso de fotos**: `fotos.ganadora`, `/api/admin/set-winner`, `Leaderboard.tsx`, `ComoParticipar.astro`, `/fotos`, `scripts/story-semana.mjs` y el panel `/admin`.
3. Enséñame un **plan breve** con los archivos que vas a crear o modificar **antes de escribir código**.

## Tarea 1: el H1 y los títulos

- Al leer la web desde fuera, el H1 aparece como **"te vasa liar — Lío, disco pub en El Bonillo (Albacete)"**. Comprueba en el código si es un problema de espacios o una errata. El texto que lean Google y los lectores de pantalla debe ser **"Te vas a liar — Lío Music Pub, disco pub en El Bonillo (Albacete)"**, **sin cambiar el aspecto visual**.
- Cada página debe tener un `<title>` y una meta description propios que incluyan **"Lío Music Pub"** y **"El Bonillo"**. Revisa también `/fotos`, que ahora se titula "Salón de la fama · Lío El Bonillo".
- Canonical con `https://www.liopub.com` en todas las páginas, Open Graph y Twitter card.
- **JSON-LD en la portada:** `BarOrPub` con `name` "Lío Music Pub", la dirección completa, `url` y `sameAs` con el Instagram. **No incluyas el horario**: está pendiente de que lo confirme el cliente.

## Tarea 2: página de eventos (/eventos)

**Objetivo:** que Google, y la gente de fuera de la zona, encuentre los eventos del Lío. La gente del pueblo los sigue viendo en los carteles de la portada.

- **Se accede solo desde el footer** con el enlace "Eventos". **No va en el menú principal.**
- **Fuente de datos:** la misma tabla `carteles` que alimenta la sección de carteles de la portada. **No se crea ningún sistema nuevo ni campos nuevos:** lo que se sube en el admin para la portada aparece automáticamente en `/eventos`.
- **Rutas:**
  - `/eventos`: listado con **Próximos** (carteles activos con fecha de fin, o de inicio si no hay fin, posterior a hoy) y **Pasados** (carteles con fecha ya pasada, activos o no).
  - `/eventos/[slug]`: una página por cartel. El slug se forma con el título y la fecha, más un sufijo corto del id para que no se repita. Los carteles **sin `fecha_inicio`** no generan página propia ni JSON-LD.
- **Diseño más trabajado que la sección de la portada**, pero siguiendo la línea de la web: fondo oscuro, rosa de acento, Anton en los titulares, Space Mono en las etiquetas. Por ejemplo:
  - El cartel grande, con un efecto de brillo neón sutil.
  - Fecha y hora en formato "ticket".
  - Cuenta atrás en los próximos eventos.
  - Botones de "Cómo llegar" e Instagram.
  - Galería de eventos pasados.
  - Respeta `prefers-reduced-motion`.
  - Si `media_tipo` es `video`, muestra el vídeo con un póster. Para el JSON-LD y el Open Graph, usa una imagen fija: un fotograma de Cloudinary, por ejemplo.
- **SEO de cada evento:**
  - H1: "{título} · Lío Music Pub, El Bonillo".
  - Title y meta description propios.
  - **JSON-LD `Event`** con `name`, `startDate` y `endDate` (con zona horaria Europe/Madrid), `eventStatus` EventScheduled, `eventAttendanceMode` OfflineEventAttendanceMode, `location` (Place con la dirección completa), `image`, `description` (el subtítulo) y `organizer` (Lío Music Pub). No incluyas `offers`.
  - `BreadcrumbList`.
- **Eventos pasados:** si un cartel se borra en el admin, su página desaparece. Añade en el formulario de carteles del admin un aviso corto del tipo: *"Consejo: no borres los carteles pasados, desactívalos. Así siguen en /eventos y ayudan a que Google encuentre el Lío."* **No cambies la lógica del admin.**
- **Las páginas son SSR**, y `@astrojs/sitemap` no incluye rutas dinámicas. Resuélvelo (ver la Tarea 5).

## Tarea 3: miniblog

Diseño **sencillo** y coherente con la web. Es contenido sobre todo para Google.

- Usa Content Collections con Markdown, con este frontmatter: `title`, `description`, `pubDate`, `updatedDate?`, `heroImage?`, `heroAlt?`, `tags[]` y `draft`. **Los borradores no se generan** ni entran en el sitemap.
- Rutas `/blog` y `/blog/[slug]`, con **"Blog" en el footer**, breadcrumbs, fecha y JSON-LD `BlogPosting` + `BreadcrumbList`. Cada artículo enlaza a `/eventos`.

### Artículos

| Slug | Enfoque | Estado |
|---|---|---|
| `canas-a-1-euro-viernes-el-bonillo` | **Las cañas a 1 € de los viernes hasta las 22:00.** Es el reclamo fuerte del Lío y los viernes se llena. Cuenta el plan de viernes en la Plaza Mayor | **PUBLICAR** |
| `nochevieja-el-bonillo-casino-lio` | **Nochevieja en El Bonillo:** casi todo el pueblo acaba en la Plaza Mayor, y el Casino y el Lío suelen abrir juntos, con más de 500 personas. Enfoque: dónde celebrar Nochevieja en El Bonillo | borrador (se publica a mediados de noviembre). `TODO`: confirmar si este año abren juntos, horario, entradas o cotillón y precio |
| `noches-del-cristo-el-bonillo` | **Las noches del Cristo de los Milagros:** el 14 de septiembre, tradición documentada desde 1623, y la celebración de marzo, por el sudor del crucifijo documentado el 4 de marzo de 1640. Enfoque: el ambiente de esas noches en la plaza y en el Lío | borrador (se publica a principios de febrero). `TODO`: qué hace el Lío esos días |
| `feria-tradiciones-el-bonillo-noche` | **La Feria de Tradiciones y Artesanía**, un fin de semana de la segunda quincena de junio en que la Plaza Mayor se llena hasta arriba. Enfoque: la noche de la feria | borrador (se publica a mediados de mayo). `TODO`: fechas del año y qué hace el Lío |
| `feria-fiestas-agosto-el-bonillo-noche` | **Feria y fiestas de agosto**, hacia el 10-15 de agosto. Enfoque: dónde salir de noche en la feria | borrador (se publica a principios de julio). `TODO`: fechas exactas y programa del Lío |

**Reglas de contenido:**

- **No inventes** horarios, precios, entradas, DJs, aforos, promociones ni servicios. El dato de "más de 500 personas" en Nochevieja sí se puede usar. Si falta algo, pon `TODO: confirmar con el cliente`: en los borradores, visible en el texto; en los publicados, como comentario HTML.
- Entre 500 y 800 palabras, tono cercano y local. **Cada artículo distinto de verdad.**
- Siempre "Lío Music Pub" y "El Bonillo" en el title y el H1.
- **Enlaces al Casino** (`https://www.casinoelbonillo.com/`) donde tenga sentido: cenar antes, Nochevieja juntos, ferias. Si encajan, enlaza también a sus artículos `/blog/plan-sabado-el-bonillo-lio-music-pub/`, `/blog/previa-lio-music-pub-el-bonillo/` y `/blog/feria-tradiciones-artesania-el-bonillo/`. Usa un texto de enlace descriptivo.

## Tarea 4: enlace al Casino

En la portada o en el footer, añade un bloque o enlace del tipo **"¿Cenamos antes? El Casino, en la misma Plaza Mayor"** que lleve a `https://www.casinoelbonillo.com/`.

## Tarea 5: sitemap

- El sitemap debe incluir: `/`, `/fotos/` si existe, `/eventos`, **cada página de evento**, `/blog` y los artículos publicados.
- Excluye `/admin`, `/api`, `/foto/[id]` (ya se excluye ahora) y los borradores.
- Como las páginas de eventos son SSR y se leen de Supabase, `@astrojs/sitemap` no las ve. Opciones: un endpoint propio `src/pages/sitemap-eventos.xml.ts` añadido al índice, o reemplazar el sitemap por un endpoint que lo genere todo. **Explícame la opción que elijas.** Mantén `https://www.liopub.com/sitemap-index.xml` como URL principal, porque es la que está enviada en Search Console.

## Tarea 6: el premio semanal pasa a ser un sorteo

**Cambio de reglas:** el premio semanal **ya no lo gana la foto más votada. Se sortea entre las personas que participan.** El podio de las más votadas se mantiene como algo divertido, pero ya no da premio.

### Arquitectura propuesta (revísala y dime si ves algún problema antes de implementarla)

1. **Base de datos:** una nueva tabla `sorteos` con estos campos:
   - `id`, `semana` (texto con el formato actual, **único**: un sorteo por semana).
   - `foto_ganadora_id` (FK a `fotos`).
   - `participantes` (número de participaciones en el bombo).
   - `participantes_hash` (SHA-256 de la lista ordenada de ids que entraron, como prueba de que no se cambió la lista).
   - `realizado_at`, `anulado` (boolean) y `motivo_anulacion`.
   - Dame el SQL de la migración para ejecutarlo en Supabase **y no lo ejecutes tú**. Actualiza `database.types.ts`.
2. **Quién entra en el bombo:** **una participación por persona** y semana, entre las fotos **aprobadas** de esa semana. La persona se identifica por `fingerprint`, y si hay varias fotos de la misma persona, entra solo una (la de más votos, por ejemplo). Así subir 3 fotos no multiplica las opciones. Deja esta regla en una constante o función clara por si el cliente prefiere "una participación por foto".
3. **El sorteo lo hace el servidor:** endpoint `POST /api/admin/sorteo` (solo admin) que:
   - Calcula los participantes.
   - Elige uno con `crypto.randomInt` (nunca `Math.random`).
   - Guarda el registro en `sorteos`.
   - Marca `fotos.ganadora = true` en esa foto, para reutilizar todo lo que ya muestra a la ganadora.
   - **Si ya hay un sorteo válido para esa semana, lo rechaza.** Para repetirlo, hay que anular el anterior indicando un motivo (por ejemplo, que el ganador no aparece o no cumple las bases). Así se evita estar sorteando hasta que salga quien uno quiera.
4. **Admin:** en lugar de "Marcar ganadora" en la semana pasada, un botón **"🎲 Sortear ganador/a"** que muestre cuántas personas entran, y una animación corta de "bombo". Una vez hecho, se ve el resultado y un botón "Anular sorteo", que pide el motivo. **Mantén el marcado manual solo como opción de emergencia**, menos visible, o elimínalo. Explícame qué haces.
5. **Parte pública:**
   - `Leaderboard.tsx`: el podio pasa a llamarse **"Las más votadas"**, sin premio. La tarjeta de la ganadora pasa a **"Ganador/a del sorteo"**: no se muestran sus votos como motivo, sino una etiqueta "🎲 Sorteo". Indica cuántas personas participaron.
   - `ComoParticipar.astro`, el texto de la sección "¿Estuviste con nosotros?" de la portada, `/fotos` y cualquier texto que diga "la más votada gana": cámbialos a la nueva mecánica. Por ejemplo: *"Sube tu foto del finde y entras en el sorteo del premio de la semana siguiente. ¡Y si es de las más votadas, sale en el podio!"*.
   - Revisa `scripts/story-semana.mjs` y `CompartirPremio.tsx`, por si dicen "más votada".
6. **Bases del sorteo:** crea una página sencilla, `/bases-sorteo`, enlazada desde el footer y desde "Cómo participar", con la mecánica tal como queda implementada:
   - Quién participa.
   - Cuándo se sortea.
   - Cómo se contacta con quien gane: por el Instagram que dejó al subir la foto.
   - Plazo para reclamar el premio.
   - Que el premio no se canjea por dinero.

   Deja marcados como `TODO: revisar por el cliente/asesor` la edad mínima (es un pub, probablemente +18), el plazo de reclamación y cualquier aspecto legal. **No redactes cláusulas legales como si fueran definitivas.**
7. **Histórico:** las semanas anteriores con "ganadora por votos" se quedan como están. El cambio aplica desde la próxima semana.

## Comprobación final

1. `git pull` hecho y la build sin errores.
2. Un solo H1 por página, y title, description, canonical y JSON-LD válidos en la portada, en `/eventos`, en un evento y en un artículo.
3. Lighthouse móvil de la portada **antes y después**: no puede empeorar.
4. La subida de fotos, el voto, `/fotos`, `/foto/[id]`, el admin (carteles, moderación y premios) y la sección del Mundial siguen funcionando.
5. Prueba el sorteo **en local con datos de prueba**: que no se pueda sortear dos veces, que la anulación funcione y que una persona con 3 fotos solo entre una vez.
6. Dame un resumen con:
   - Los archivos cambiados.
   - **El SQL de la migración**.
   - La URL del sitemap y lo que incluye.
   - **La lista de TODO para el cliente.**
   - **Las URLs a las que hay que solicitar indexación** tras el despliegue, ordenadas por prioridad.
