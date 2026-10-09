# Prompt para Claude Code: completar las bases del sorteo del Lío

> Abre Claude Code en `pub-lio` (desde WSL) y dile: "Lee `prompt-lio-bases-sorteo.md` y ejecútalo".

---

## Contexto

La página `/bases-sorteo/` está en producción con varios apartados marcados como **"Pendiente de revisión"**: edad mínima, plazo, condiciones de canje y protección de datos. El sorteo empieza en la semana `2026-W41`, del 8 al 14 de octubre, así que **hoy mismo tiene que quedar sin ningún texto pendiente a la vista**. Sigue las reglas de `CLAUDE.md`.

**Nueva regla que hay que reflejar:** el sorteo **no se hace todas las semanas.** Solo hay sorteo las semanas en que hay premio, normalmente las semanas con DJ, aunque no todas. **La forma de saberlo es sencilla: si el premio aparece publicado en la web (la sección del premio semanal), esa semana hay sorteo.** También se puede preguntar a los camareros.

## Tarea 1: completar `/bases-sorteo/`

Sustituye todos los apartados "Pendiente de revisión" por texto definitivo. Contenido:

1. **Organizador:** "Lío Music Pub, disco pub situado en la Plaza Mayor, 6, de El Bonillo (Albacete), organiza un sorteo entre quienes suben fotos a la galería de esta web **las semanas en que hay premio**."
2. **Qué semanas hay sorteo:** solo las semanas en que el premio aparece publicado en la web, en la sección "Premio semanal". Normalmente coincide con las semanas con DJ, aunque no todas. Si una semana no aparece ningún premio, esa semana no hay sorteo. También se puede preguntar al personal del Lío.
3. **Quién puede participar:** **mayores de 18 años.** Pon solo eso, sin mencionar la edad de entrada al local. La organización puede pedir que se acredite la edad al entregar el premio.
4. **Cómo se participa:** subiendo al menos una foto del fin de semana a la galería, siguiendo las condiciones de subida que ya tiene la web. **Una participación por persona**, aunque suba varias fotos, como ya está implementado.
5. **Cuándo se sortea:** al cerrar la semana del concurso, desde el panel de administración, con un sistema aleatorio. Las fotos más votadas siguen saliendo en el podio, pero los votos no influyen en el sorteo.
6. **Cómo se contacta a quien gana:** por mensaje privado al Instagram que dejó al subir la foto. El resultado se publica también en la web.
7. **Plazo:** quien gane tiene **7 días** desde que se le contacta para responder y **7 días más** para canjear el premio en el Lío. Si no responde o no lo canjea a tiempo, el premio se considera desierto o se repite el sorteo de esa semana, a criterio de la organización.
8. **Condiciones del premio:** se canjea en el Lío Music Pub, en su horario de apertura. Es **personal e intransferible** y **no se puede cambiar por dinero.** Si el premio incluye bebidas alcohólicas, solo se entrega a mayores de 18 años.
9. **Exclusiones:** quedan fuera las fotos rechazadas en la moderación y las que incumplan las normas de subida que ya están en la web (contenido ofensivo, fotos de otras personas sin su consentimiento, etc.).
10. **Protección de datos:** un texto breve y claro, sin TODO visibles:
    - **Responsable:** Lío Music Pub (Plaza Mayor, 6, El Bonillo, Albacete).
    - **Datos:** la foto, el nombre y el usuario de Instagram que se facilitan al participar.
    - **Finalidad:** gestionar el concurso y el sorteo, publicar las fotos en la galería y contactar con quien gane.
    - **Base legal:** el consentimiento de la persona al subir la foto.
    - **Conservación:** mientras la foto esté publicada en la galería o hasta que se solicite su retirada.
    - **Derechos:** acceder a sus datos, rectificarlos, suprimirlos o retirar la foto escribiendo por mensaje privado a @lioelbonillo en Instagram.

    **Deja un comentario HTML (no visible)** que diga: `<!-- Completar con la razón social y el NIF del titular del Lío cuando el cliente los facilite -->`.
11. **Aceptación:** participar implica aceptar estas bases. La organización puede modificarlas avisando en la web.

Mantén el estilo de la página. Sin jerga legal innecesaria: claro y cercano, como el resto de la web.

## Tarea 2: que la web refleje que el sorteo no es todas las semanas

- **Textos públicos** (`ComoParticipar.astro`, el texto de "¿Estuviste con nosotros?" de la portada, `Leaderboard.tsx` y `/fotos` si lo menciona): donde diga que el premio se sortea cada semana, matiza que se sortea **"las semanas con premio"** o **"cuando hay premio publicado"**. Hazlo de forma natural, por ejemplo: *"Las semanas con premio, entras en el sorteo solo por subir tu foto."*
- **Admin, sección del sorteo:** revisa si había un premio activo en la tabla `premios` para la semana que se va a sortear, usando `activo` y `valido_hasta` como ya los use la web. **Si no lo había, muestra un aviso** del tipo: *"Esta semana no había premio publicado. ¿Seguro que quieres sortear?"*. Debe ser una confirmación, no un bloqueo, y no hace falta tocar la base de datos.

## Tarea 3: comprobar la portada en producción

En producción, la portada parece estar sirviendo una versión antigua: el H1 sigue leyéndose "te vasa liar" y el footer no tiene los enlaces a Eventos, Blog, Bases ni Propus. En cambio, `/eventos/` sí está actualizada. Comprueba:

1. Que `main` incluye los cambios de la portada (`Hero.astro`, `Footer.astro`, `index.astro`).
2. Si la portada envía cabeceras de caché (`Cache-Control`, `s-maxage`) que puedan hacer que Vercel sirva una versión antigua.

**Explícame qué encuentras y propón la solución antes de aplicarla.**

## Comprobación final

1. `npm run build` sin errores.
2. Busca en el HTML generado de `/bases-sorteo/` las palabras "Pendiente", "TODO" y "revisión": no puede quedar ninguna visible.
3. Dame un resumen de los cambios y **pregúntame antes de hacer commit y push**.
