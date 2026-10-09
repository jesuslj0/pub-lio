# Arreglar el panel /admin (carteles: fechas en móvil + "Error interno")

Diagnóstico ya hecho y **verificado contra la base de datos de producción**. No hace
falta volver a investigar: implementa los pasos en orden. Todo el trabajo es en
`src/pages/admin/index.astro` y `src/pages/api/admin/*.ts`.

Lee `CLAUDE.md` antes de empezar (UI en español, estética oscura con rosa de acento,
los componentes existentes se quedan en CSS normal: **este panel NO se migra a
Tailwind**, se toca solo lo necesario).

---

## Causa raíz (confirmada)

**1) "Error interno" al crear el cartel.** La tabla `carteles` de Supabase tiene
`imagen_url`, `fecha_inicio` y `fecha_fin` como **NOT NULL**, pero el endpoint manda
`null` cuando esos campos van vacíos (`src/pages/api/admin/cartel.ts:50-51`, con el
patrón `fecha_inicio || null`). Postgres devuelve error `23502` y el `catch` lo
convierte en un genérico `"Error interno"` sin pistas. Comprobado con tres inserts
reales contra producción:

```
sin imagen            -> 23502 null value in column "imagen_url" ... violates not-null
sin fecha_inicio      -> 23502 null value in column "fecha_inicio" ... violates not-null
sin fecha_fin         -> 23502 null value in column "fecha_fin" ... violates not-null
```

**2) Las fechas no se pueden seleccionar en móvil.** Los controles están **anidados
dentro de `<label>`** (`index.astro:510-517`, `631-634`, y los `input[type=file]` de
`493` y `622`). En iOS/WebKit eso provoca una doble activación del control: el
desplegable nativo de fecha se abre y se cierra en el mismo toque. Se suma que
`input[type="date"]` tiene `font-size: 0.9rem` (`index.astro:1762-1771`), por debajo
de 16px, lo que hace que iOS haga zoom al enfocar y descoloque el selector, y que no
hay altura mínima táctil.

Las dos causas se encadenan: en el móvil no se pueden poner las fechas → se envían
vacías → NOT NULL → "Error interno". De ahí la sensación de que está todo roto.

---

## Paso 1 — Desanidar los controles de los `<label>` (arregla el móvil)

En `src/pages/admin/index.astro`, en **los dos formularios** (`#cartel-form` y
`#premio-form`) y en el `<textarea>` de anulación del sorteo, cambia el patrón

```astro
<label>
  Fecha inicio
  <input name="fecha_inicio" type="date" value="" />
</label>
```

por `label` + control hermanos, con `for`/`id` emparejados:

```astro
<div class="campo">
  <label for="cartel-fecha-inicio">Fecha inicio *</label>
  <input id="cartel-fecha-inicio" name="fecha_inicio" type="date" required value="" />
</div>
```

Requisitos:

- `id` único y estable para cada control. Sugerencia de nombres:
  `cartel-titulo-input`, `cartel-subtitulo`, `cartel-imagen` (ya existe),
  `cartel-fecha-inicio`, `cartel-fecha-fin`, `cartel-activo`, y los equivalentes
  `premio-*`. **Cuidado:** ya hay un `<h3 id="cartel-titulo">` en `index.astro:468`
  y un `<h2 id="premio-titulo">` en `594`; no reutilices esos ids para los inputs.
- La casilla (`label.checkbox`) **sí puede seguir envolviendo** su `input[type=checkbox]`:
  los checkbox no abren ningún selector nativo y ahí el área de toque grande interesa.
  Si prefieres homogeneizar, usa `for`/`id` también, pero mantén el texto clicable.
- Añade una clase `.campo` con el mismo `display:flex; flex-direction:column; gap:6px`
  que hoy tiene `label` (`index.astro:1749-1755`), y deja la regla de `label` solo para
  el color/tamaño del texto. No cambies el aspecto visual del formulario.
- Revisa que el JS siga encontrando todo: usa selectores por `name`
  (`form.querySelector('[name="fecha_inicio"]')`), que es lo que ya hace
  `cargarCartelEnFormulario()` (`index.astro:1063-1095`), así que no debería romperse.
  Verifica también `resetCartelForm()` (`1043`) y el reset de premio (`1231`), que
  iteran `form.querySelectorAll("input, textarea")`: sigue funcionando.

## Paso 2 — CSS táctil para inputs y fechas

En el `<style>` de `index.astro` (bloque de `input[type="text"] … textarea`,
línea ~1762):

- `font-size: 16px` en todos los inputs y textareas del panel (evita el zoom de iOS).
  No uses `rem` aquí: hace falta el valor absoluto.
- `width: 100%; box-sizing: border-box;` para que nunca desborden.
- `min-height: 44px` en `input[type="text"]`, `input[type="date"]` y los botones del
  formulario (área táctil mínima).
- Para `input[type="date"]` añade además:
  `-webkit-appearance: none; appearance: none; min-height: 44px;` y
  `::-webkit-date-and-time-value { text-align: left; }` para que el valor no quede
  descolocado verticalmente en iOS.
- En `.row label` / `.row .campo` añade `min-width: 0` (hoy solo hay `flex: 1`,
  `index.astro:1780`) para que en pantallas estrechas el campo pueda encogerse en
  lugar de desbordar.
- Comprueba que el bloque `@media (max-width: 680px)` de la línea ~1978 sigue
  poniendo `.row { flex-direction: column }`; si renombras `.row`, actualízalo.

## Paso 3 — Que el cartel se pueda guardar siempre (sin tocar la base de datos)

Esta es la parte que desbloquea hoy mismo, **sin** depender de ejecutar SQL en
Supabase. Hay que dejar de mandar `null` a esas tres columnas.

En `src/pages/api/admin/cartel.ts`, dentro del `POST`:

- Valida y responde con 400 y mensaje claro (en español) **antes** de tocar la base:
  - `titulo` obligatorio (ya está, `cartel.ts:36`).
  - `imagen_url` obligatorio: `"Falta la imagen o el vídeo del cartel"`.
  - `fecha_inicio` obligatorio: `"Falta la fecha de inicio (sin ella el cartel no
    tiene página propia en /eventos)"`.
  - Formato de fecha: acepta solo `/^\d{4}-\d{2}-\d{2}$/`; si no, 400
    `"Fecha con formato inválido"`.
- `fecha_fin`: si viene vacía, **usa `fecha_inicio`** (un cartel de un solo día).
  `src/lib/eventos.ts:207` ya hace `c.fecha_fin ?? c.fecha_inicio`, así que esto es
  coherente con cómo se pinta.
- Si `fecha_fin < fecha_inicio`, 400 `"La fecha de fin es anterior a la de inicio"`.
- En **edición** (`id` presente) no exijas imagen nueva: el cliente ya reenvía
  `imagen_url` actual desde `form.dataset.imagenUrl` (`index.astro:983`). Pero si al
  final `imagen_url` queda vacío, falla igual con el 400 de arriba.

En `index.astro`, en el `submit` de `#cartel-form` (línea ~976):

- Marca "Título *", "Imagen o vídeo del cartel *" y "Fecha inicio *" como
  obligatorios en el texto y con el atributo `required` donde se pueda.
- Antes de subir a Cloudinary, si es un cartel **nuevo** y no hay archivo
  seleccionado, muestra en `#cartel-msg` `"Elige una imagen o un vídeo para el
  cartel"` y no envíes nada.
- Actualiza el aviso de `index.astro:460-465`: la fecha de inicio ya no es un consejo,
  es obligatoria. Ajusta el texto.

## Paso 4 — Dejar de esconder los errores reales

Hoy cualquier fallo se convierte en `"Error interno"` o `"Error de red"`, que es
por lo que este bug ha costado encontrarlo. `/admin` está detrás de cookie de admin,
así que se puede ser explícito.

- En `src/pages/api/admin/cartel.ts`, `premio.ts`, `moderate.ts`, `set-winner.ts` y
  `delete-photo.ts`: en el `catch`, además de `console.error`, devuelve el mensaje
  real. Por ejemplo:
  ```ts
  const detalle =
    typeof err === "object" && err && "message" in err
      ? String((err as { message: unknown }).message)
      : "Error interno";
  return jsonResponse({ success: false, error: detalle }, 500);
  ```
  Mantén el `console.error` con su etiqueta. **No** cambies `sorteo.ts`, que ya tiene
  su propio mapeo de errores con `ErrorSorteo` y códigos HTTP.
- En los dos `catch {}` del cliente (`index.astro:1036` y `1224`), captura el error
  (`catch (err)`) y pinta su mensaje en vez de un `"Error de red"` ciego.
- La subida a Cloudinary (`index.astro:999` y `1193`) hace
  `if (!up.ok) throw new Error("cloudinary")`. Lee el cuerpo del error de Cloudinary
  (`(await up.json()).error?.message`) y propágalo: `"Cloudinary: <mensaje>"`. Así se
  ve si el fallo es el preset, el tamaño del vídeo o la cuota.

## Paso 5 — Quitar el `alert("Error: Datos inválidos")` del historial de carteles

Bug confirmado por lectura de código. El handler de moderación de fotos
(`index.astro:761-791`) usa el selector
`".foto-row:not(.winner-row):not(.hist-row)"`, que **también casa con las filas
`.hist-cartel`** del historial de carteles (`index.astro:542`: son `.foto-row` y no
llevan `.winner-row` ni `.hist-row`). Resultado: cada clic en "Editar", "Mostrar",
"Quitar" o "Eliminar" de un cartel dispara además un `POST /api/admin/moderate` con
`fotoId` vacío, que responde 400 `"Datos inválidos"` (`moderate.ts:18-20`) y suelta
un `alert` encima de la acción buena.

Arréglalo dándole a las filas de fotos pendientes una clase propia, p. ej.
`.pending-row` en `index.astro:198`, y cambiando el selector a `".pending-row"`.
Es más robusto que seguir añadiendo `:not(...)`. Comprueba que ninguna otra regla CSS
ni otro handler dependa del selector antiguo.

## Paso 6 — Revisión de que no queda nada roto en el panel

Repasa y deja funcionando, probando cada botón:

- Login / cerrar sesión.
- Fotos pendientes: aprobar y rechazar.
- Marcar / quitar ganadora (semana actual y la sección de emergencia).
- Sorteo: botón de sortear, bombo, anular con motivo. No cambies la lógica de
  `src/lib/sorteo.ts`.
- Carteles: crear, editar, mostrar, quitar, eliminar.
- Premios: crear, editar, activar desde el historial, eliminar.
- Historial de fotos: borrar, aprobar y rechazar desde la rejilla.
- Modal de confirmación: cancelar, confirmar, clic en el fondo.

Y comprueba el panel entero a **360px de ancho**: sin scroll horizontal, los botones
no se salen de las filas, el formulario de cartel se ve completo y las dos fechas se
pueden abrir y elegir.

## Paso 7 — (Opcional, para después) migración que hace nullables esas columnas

El código de la web **ya está escrito para que esas tres columnas puedan ser nulas**:
`eventos.ts:198` (`if (!c.fecha_inicio) return null`), `eventos.ts:207`
(`c.fecha_fin ?? c.fecha_inicio`), `CartelFinde.tsx:166-194` y el `thumb-empty` del
propio admin. El `NOT NULL` de la base es el que va desfasado.

Crea `supabase/migrations/20261009_carteles_nullable.sql`:

```sql
-- Las columnas de carteles se crearon NOT NULL, pero la web ya trata
-- imagen_url/fecha_inicio/fecha_fin como opcionales. Alinear el esquema.
alter table public.carteles alter column imagen_url   drop not null;
alter table public.carteles alter column fecha_inicio drop not null;
alter table public.carteles alter column fecha_fin    drop not null;
```

**No se puede ejecutar desde el código**: es DDL y hay que lanzarla a mano en el SQL
Editor de Supabase. Déjala creada y avisa de que está pendiente. Con los pasos 1-5 el
panel funciona sin ejecutarla.

---

## Reglas de cierre

- UI en español, estética actual intacta (fondo oscuro, rosa `--accent`, sin
  redondeos nuevos ni estilos genéricos).
- No commitear ni hacer push.
- **El build va por WSL** (`node_modules` tiene binarios Linux):
  ```
  wsl -e bash -lc "cd '/mnt/c/Users/Usuario/Desktop/UniversoClaudePropus/pub-lio'; npm run build"
  ```
  Tiene que terminar sin errores antes de dar el trabajo por hecho.
- Al acabar, resume: qué archivos tocaste, qué arregla cada cambio y qué queda
  pendiente de ejecutar a mano (la migración del paso 7).
