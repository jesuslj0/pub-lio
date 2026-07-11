# Llevar la sección "Especial Mundial" a la web de LI@DOS (liopub.com)

**Para Opus:** replica esta sección **exactamente igual** a como está en la web del
Casino. Es un componente Astro **autónomo** (todo su CSS es `scoped`, no depende de
ningún token de marca). Pégalo tal cual. **Lo único que cambias es el FONDO de la
sección:** en el Casino es marrón/dorado tipo taberna con molinos manchegos; en **Lío
debe ser PATRIÓTICO y con rollo URBAN / GRAFFITI**, replicando la equipación de la
selección (base oscura tipo muro pintado, hombreras **granate** con vivo **amarillo**
y las 3 rayas, y el **escudo de la selección** como stencil de fondo). Ese cambio está
aislado y explicado al final, en **«EL CAMBIO: fondo urban/graffiti de la selección»**.
**No toques nada más** (marcador España–Francia, banderas ondeando, marco de la imagen,
franjas y la card-cerveza del sorteo se quedan idénticos).

---

## 1. Qué es la sección

Bloque **temporal y tematizado** que anuncia la retransmisión de la semifinal del
Mundial 2026 (España–Francia) en pantalla gigante 4×3 m en la Plaza. De arriba abajo:

1. **Fondo temático**: base oscura con brillos + rayos, silueta de **molinos con las
   aspas girando** en el horizonte, y **franjas de bandera** animadas arriba/abajo.
   *(En Lío este fondo se reemplaza por el estilo urban/equipación — ver §5; las franjas
   se quedan.)*
2. **Dos banderas de España ondeando** (3D en CSS) en las esquinas superiores.
3. **Cabecera**: pill "evento especial", competición, marcador grande
   `ESPAÑA 🇪🇸 VS 🇫🇷 FRANCIA` (banderas hechas en CSS) y subtítulo.
4. **Imagen** en marco bandera con badge "En directo" y chapa "Pantalla gigante · 4×3 m".
5. **Rejilla de datos** (Cuándo · Hora · Dónde · Montaje) con iconos.
6. **Card del sorteo** que **emula un vaso de cerveza**: cristal con vaho, ámbar,
   burbujas de carbónico subiendo y **espuma que ondea**. CTA a `liopub.com`.

Todas las animaciones son **CSS puro** (cero JS) y se congelan con
`prefers-reduced-motion`.

---

## 2. Archivos que hay que crear/copiar

1. **Componente:** `src/components/EspecialMundial.astro` → el código completo del
   apartado 4.
2. **Imagen de la afición:** copia `españitacasinolio.png` a la carpeta de estáticos de Lío.
   - En este proyecto vive en `public/images/españitacasinolio.png` y el componente la
     referencia como `src="/images/españitacasinolio.png"`.
   - ⚠️ **Verifica la ruta en Lío.** Si Lío sirve los estáticos desde `public/img/`,
     copia la imagen ahí y cambia el `src` a `/img/españitacasinolio.png`. La ruta del
     `src` debe coincidir con dónde dejes el archivo.
3. **Escudo de la selección** (solo versión Lío): necesitas un PNG/SVG **con fondo
   transparente** del escudo de la RFEF (el mismo de la camiseta). Déjalo como
   `public/images/escudo-seleccion.png`. Se usa como marca de agua del fondo (§5). Si no
   lo tienes aún, pídeselo al usuario: **no lo inventes ni dibujes uno aproximado**, el
   escudo es heráldica oficial y tiene que ser el real.

---

## 3. Inserción en la página

En la home de Lío (p. ej. `src/pages/index.astro`), importa el componente e insértalo
**justo debajo del hero** (empuja el resto hacia abajo; no cambies nada más):

```astro
---
import EspecialMundial from '../components/EspecialMundial.astro'; // TEMPORAL · Mundial 2026
// ...resto de imports
---

  <Hero />
  <EspecialMundial />   <!-- ← aquí, TEMPORAL: quitar tras el Mundial -->
  <!-- ...resto de la página -->
```

---

## 4. Componente completo — `src/components/EspecialMundial.astro`

Pega este archivo **literal**. Los datos del evento están en la constante `EVENTO`
(arriba del todo): ajusta **fecha y hora reales** antes de publicar.

```astro
---
// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN TEMPORAL · Semifinal Mundial 2026 (España–Francia en la Plaza)
// Autónoma: todo su CSS es scoped y no depende de tokens de marca.
//
// PARA QUITARLA cuando acabe el evento, en la página borra:
//   1) import EspecialMundial from '../components/EspecialMundial.astro';
//   2) <EspecialMundial />
// (Opcional: borra este archivo y la imagen españitacasinolio.png)
// ─────────────────────────────────────────────────────────────────────────────

const EVENTO = {
  competicion: 'Semifinal · Mundial 2026',
  local: 'España',
  visitante: 'Francia',
  fecha: 'Martes 14 de julio', // ⚠️ Verificar fecha/hora reales antes de publicar
  hora: '21:00 h',
  lugar: 'Plaza Mayor · El Bonillo',
  pantalla: 'Pantalla gigante 4×3 m',
  extras: 'Escenario · Sonido en directo',
  premio: 'Cubo de botellines',
};
---

<section class="mundial" aria-label={`Retransmisión ${EVENTO.local} vs ${EVENTO.visitante}`}>
  <!-- Silueta sutil de molinos manchegos en el horizonte -->
  <svg class="mundial-molinos" viewBox="0 0 1200 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <path class="mundial-cerro" d="M0 118 C220 96 380 104 560 112 C780 122 980 98 1200 110 L1200 150 L0 150 Z" />
    <g class="mundial-molino" transform="translate(250 112) scale(0.62)">
      <path d="M-15 0 L-10 -70 L10 -70 L15 0 Z" />
      <path d="M-13 -70 L13 -70 L0 -92 Z" />
      <g class="mundial-aspas" stroke-width="5" stroke-linecap="round">
        <line x1="0" y1="-78" x2="-28" y2="-106" /><line x1="0" y1="-78" x2="28" y2="-50" />
        <line x1="0" y1="-78" x2="-28" y2="-50" /><line x1="0" y1="-78" x2="28" y2="-106" />
      </g>
      <circle cx="0" cy="-78" r="4" />
    </g>
    <g class="mundial-molino" transform="translate(620 108) scale(0.78)">
      <path d="M-15 0 L-10 -70 L10 -70 L15 0 Z" />
      <path d="M-13 -70 L13 -70 L0 -92 Z" />
      <g class="mundial-aspas" stroke-width="4.5" stroke-linecap="round">
        <line x1="0" y1="-78" x2="-30" y2="-104" /><line x1="0" y1="-78" x2="30" y2="-52" />
        <line x1="0" y1="-78" x2="-30" y2="-52" /><line x1="0" y1="-78" x2="30" y2="-104" />
      </g>
      <circle cx="0" cy="-78" r="4" />
    </g>
    <g class="mundial-molino" transform="translate(970 110) scale(0.55)">
      <path d="M-15 0 L-10 -70 L10 -70 L15 0 Z" />
      <path d="M-13 -70 L13 -70 L0 -92 Z" />
      <g class="mundial-aspas" stroke-width="5" stroke-linecap="round">
        <line x1="0" y1="-78" x2="-26" y2="-102" /><line x1="0" y1="-78" x2="26" y2="-54" />
        <line x1="0" y1="-78" x2="-26" y2="-54" /><line x1="0" y1="-78" x2="26" y2="-102" />
      </g>
      <circle cx="0" cy="-78" r="4" />
    </g>
  </svg>

  <span class="mundial-franja mundial-franja--top" aria-hidden="true"></span>

  <!-- Banderas de España ondeando (decorativas) -->
  <div class="mundial-flag mundial-flag--left" aria-hidden="true">
    <span class="mundial-flag-pole"></span>
    <span class="mundial-flag-cloth"></span>
  </div>
  <div class="mundial-flag mundial-flag--right" aria-hidden="true">
    <span class="mundial-flag-pole"></span>
    <span class="mundial-flag-cloth"></span>
  </div>

  <div class="mundial-inner">
    <!-- 1 · Cabecera -->
    <header class="mundial-head">
      <p class="mundial-pill">
        <span class="mundial-live" aria-hidden="true"></span>
        Evento especial en la plaza
      </p>
      <p class="mundial-comp">{EVENTO.competicion}</p>

      <div class="mundial-marcador" role="img"
        aria-label={`${EVENTO.local} contra ${EVENTO.visitante}`}>
        <span class="mundial-equipo">
          <span class="mundial-bandera mundial-bandera--es" aria-hidden="true"></span>
          {EVENTO.local}
        </span>
        <span class="mundial-vs">VS</span>
        <span class="mundial-equipo mundial-equipo--visita">
          <span class="mundial-bandera mundial-bandera--fr" aria-hidden="true"></span>
          {EVENTO.visitante}
        </span>
      </div>

      <p class="mundial-sub">
        Lo vemos juntos en la Plaza Mayor, en pantalla gigante. Todo el pueblo
        animando a la Roja. ¡No te pierdas ni un gol!
      </p>
    </header>

    <!-- 2 · Imagen en marco bandera -->
    <figure class="mundial-figura">
      <div class="mundial-marco">
        <span class="mundial-directo">
          <span class="mundial-live mundial-live--sm"></span> En directo
        </span>
        <img
          class="mundial-img"
          src="/images/españitacasinolio.png"
          alt="Afición viendo el partido en la pantalla gigante de la Plaza Mayor de El Bonillo"
          loading="lazy"
          decoding="async"
        />
        <span class="mundial-img-tag">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 21h8M12 18v3" />
          </svg>
          Pantalla gigante · 4 × 3 m
        </span>
      </div>
      <figcaption class="mundial-pie">Así se vive un partido en la Plaza Mayor.</figcaption>
    </figure>

    <!-- 3 · Datos del partido -->
    <ul class="mundial-info">
      <li class="mundial-dato">
        <span class="mundial-dato-ico">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </span>
        <span class="mundial-dato-k">Cuándo</span>
        <span class="mundial-dato-v">{EVENTO.fecha}</span>
      </li>
      <li class="mundial-dato">
        <span class="mundial-dato-ico">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
          </svg>
        </span>
        <span class="mundial-dato-k">Hora</span>
        <span class="mundial-dato-v">{EVENTO.hora}</span>
      </li>
      <li class="mundial-dato">
        <span class="mundial-dato-ico">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
          </svg>
        </span>
        <span class="mundial-dato-k">Dónde</span>
        <span class="mundial-dato-v">{EVENTO.lugar}</span>
      </li>
      <li class="mundial-dato">
        <span class="mundial-dato-ico">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="2" y="4" width="20" height="14" rx="2" /><path d="M8 21h8M12 18v3" />
          </svg>
        </span>
        <span class="mundial-dato-k">Montaje</span>
        <span class="mundial-dato-v">{EVENTO.pantalla} · {EVENTO.extras}</span>
      </li>
    </ul>

    <!-- 4 · Sorteo (mecánica LI@DOS) -->
    <div class="mundial-sorteo">
      <!-- Fondo cerveza: cristal + ámbar + burbujas + espuma ondeando -->
      <div class="mundial-cerveza" aria-hidden="true">
        <span class="mundial-vaho"></span>
        <span class="mundial-burbuja"></span><span class="mundial-burbuja"></span>
        <span class="mundial-burbuja"></span><span class="mundial-burbuja"></span>
        <span class="mundial-burbuja"></span><span class="mundial-burbuja"></span>
        <span class="mundial-burbuja"></span><span class="mundial-burbuja"></span>
        <span class="mundial-burbuja"></span><span class="mundial-burbuja"></span>
        <span class="mundial-superficie"></span>
      </div>

      <div class="mundial-sorteo-body">
        <span class="mundial-premio" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4Z" />
            <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
          </svg>
        </span>
        <div class="mundial-sorteo-txt">
          <p class="mundial-sorteo-tag">Sorteo entre la afición</p>
          <p class="mundial-sorteo-desc">
            Sube tu foto viendo el partido en la plaza a la red social
            <strong>LI@DOS</strong> y entra automáticamente en el sorteo de un
            <strong>{EVENTO.premio.toLowerCase()}</strong> al finalizar el partido.
          </p>
        </div>
        <a class="mundial-cta" href="https://liopub.com" target="_blank" rel="noopener">
          Ir a LI@DOS
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </a>
      </div>
    </div>
  </div>

  <span class="mundial-franja mundial-franja--bottom" aria-hidden="true"></span>
</section>

<style>
  .mundial {
    /* Paleta y fuentes fijas: no depende de los tokens del sitio. */
    --es-rojo: #d1122a;
    --es-oro: #ffc400;
    --es-oro-claro: #ffd94a;
    --tinta: #efe9dd;
    --font-tec: ui-monospace, "SF Mono", "SFMono-Regular", Menlo, Consolas, monospace;
    --font-tit: "Fraunces", Georgia, serif;

    position: relative;
    isolation: isolate;
    overflow: hidden;
    padding: 4rem 1.25rem 4.5rem;
    color: var(--tinta);
    /* 👇 En Lío este background se SUSTITUYE por el muro urban (ver §5.3) */
    background:
      radial-gradient(120% 80% at 50% -10%, rgba(255, 196, 0, 0.2), transparent 60%),
      radial-gradient(90% 70% at 50% 120%, rgba(209, 18, 42, 0.28), transparent 60%),
      linear-gradient(180deg, #171009 0%, #1e0f09 55%, #150d07 100%);
  }

  /* Rayos muy tenues (👇 en Lío se reemplaza por grano de hormigón, ver §5.3) */
  .mundial::before {
    content: ""; position: absolute; inset: -30% -10% auto 50%;
    translate: -50% 0; width: 120%; height: 120%; z-index: -1;
    background: repeating-conic-gradient(
      from 0deg at 50% 0%,
      rgba(255, 196, 0, 0.06) 0deg 6deg, transparent 6deg 15deg);
    opacity: 0.5; pointer-events: none;
  }

  /* Molinos en el horizonte (sutiles) */
  .mundial-molinos {
    position: absolute; left: 0; right: 0; bottom: 0;
    width: 100%; height: 150px; z-index: -1; opacity: 0.5;
  }
  .mundial-molino path, .mundial-molino circle { fill: #0b0705; }
  .mundial-molino line { stroke: #0b0705; }
  .mundial-cerro { fill: rgba(11, 7, 5, 0.6); }

  /* Aspas girando (el centro del bbox coincide con el eje del molino) */
  .mundial-aspas {
    transform-box: fill-box; transform-origin: center;
    animation: mundial-gira 16s linear infinite;
  }
  .mundial-molino:nth-of-type(1) .mundial-aspas { animation-duration: 15s; }
  .mundial-molino:nth-of-type(2) .mundial-aspas { animation-duration: 20s; animation-direction: reverse; }
  .mundial-molino:nth-of-type(3) .mundial-aspas { animation-duration: 12s; }
  @keyframes mundial-gira { to { transform: rotate(360deg); } }

  /* Banderas ondeando */
  .mundial-flag {
    position: absolute; top: 22px; z-index: 2;
    display: flex; align-items: flex-start;
    filter: drop-shadow(0 8px 10px rgba(0, 0, 0, 0.4));
    opacity: 0.9;
  }
  .mundial-flag--left { left: 20px; }
  .mundial-flag--right { right: 20px; transform: scaleX(-1); }
  .mundial-flag-pole {
    width: 3px; height: 66px; border-radius: 3px;
    background: linear-gradient(180deg, #d8bd82, #8a6a34);
  }
  .mundial-flag-cloth {
    position: relative; width: 52px; height: 33px; margin-top: 2px;
    background: linear-gradient(180deg, var(--es-rojo) 0 25%, var(--es-oro) 25% 75%, var(--es-rojo) 75%);
    border-radius: 0 2px 2px 0;
    transform-origin: left center; backface-visibility: hidden;
    animation: mundial-ondea 3.6s ease-in-out infinite;
  }
  /* pliegue de luz que recorre la tela para dar sensación de volumen */
  .mundial-flag-cloth::after {
    content: ""; position: absolute; inset: 0; border-radius: inherit;
    background: linear-gradient(90deg, transparent 10%, rgba(0, 0, 0, 0.22) 38%, transparent 62%);
    background-size: 220% 100%; mix-blend-mode: multiply;
    animation: mundial-pliegue 3.6s ease-in-out infinite;
  }
  .mundial-flag--right .mundial-flag-cloth { animation-delay: -1.2s; }
  @keyframes mundial-ondea {
    0%, 100% { transform: perspective(240px) rotateY(0deg) skewY(0deg); }
    25% { transform: perspective(240px) rotateY(-13deg) skewY(-1.6deg); }
    50% { transform: perspective(240px) rotateY(2deg) skewY(0.4deg); }
    75% { transform: perspective(240px) rotateY(11deg) skewY(1.4deg); }
  }
  @keyframes mundial-pliegue {
    0%, 100% { background-position: 0 0; }
    50% { background-position: 100% 0; }
  }

  /* Franjas de bandera */
  .mundial-franja {
    position: absolute; left: 0; right: 0; height: 8px; z-index: 3;
    background: repeating-linear-gradient(
      90deg, var(--es-rojo) 0 8.33%, var(--es-oro) 8.33% 16.66%);
    background-size: 200% 100%; animation: mundial-slide 7s linear infinite;
  }
  .mundial-franja--top { top: 0; }
  .mundial-franja--bottom { bottom: 0; animation-direction: reverse; }
  @keyframes mundial-slide { to { background-position: 200% 0; } }

  /* Layout */
  .mundial-inner {
    position: relative; z-index: 1; max-width: 60rem; margin: 0 auto;
    display: flex; flex-direction: column; align-items: center; gap: 2.25rem;
    text-align: center;
  }

  /* Cabecera */
  .mundial-head { display: grid; gap: 0.9rem; justify-items: center; }
  .mundial-pill {
    display: inline-flex; align-items: center; gap: 0.5rem; margin: 0;
    padding: 0.42rem 0.95rem; font-family: var(--font-tec); font-size: 0.7rem; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase; color: #1a0d08;
    background: var(--es-oro); border-radius: 999px;
    box-shadow: 0 6px 20px -8px rgba(255, 196, 0, 0.55);
  }
  .mundial-live {
    width: 9px; height: 9px; border-radius: 50%; background: var(--es-rojo);
    box-shadow: 0 0 0 0 rgba(209, 18, 42, 0.7); animation: mundial-pulse 1.6s ease-out infinite;
  }
  .mundial-live--sm { width: 7px; height: 7px; }
  @keyframes mundial-pulse {
    0% { box-shadow: 0 0 0 0 rgba(209, 18, 42, 0.7); }
    70% { box-shadow: 0 0 0 8px rgba(209, 18, 42, 0); }
    100% { box-shadow: 0 0 0 0 rgba(209, 18, 42, 0); }
  }
  .mundial-comp {
    margin: 0; font-family: var(--font-tec); font-size: 0.82rem;
    letter-spacing: 0.2em; text-transform: uppercase; color: var(--es-oro-claro);
  }
  .mundial-marcador {
    display: flex; align-items: center; justify-content: center; flex-wrap: wrap;
    gap: 0.6rem 1.2rem; font-family: var(--font-tit); font-weight: 700;
    font-size: clamp(2rem, 7.5vw, 3.5rem); line-height: 1.02;
    text-transform: uppercase; text-shadow: 0 4px 22px rgba(0, 0, 0, 0.55);
  }
  .mundial-equipo { display: inline-flex; align-items: center; gap: 0.6rem; }
  .mundial-vs {
    font-family: var(--font-tec); font-size: 0.46em; padding: 0.15em 0.55em;
    border: 2px solid var(--es-oro); border-radius: 0.5rem; color: var(--es-oro); letter-spacing: 0.1em;
  }
  .mundial-bandera {
    display: inline-block; width: 1.4em; height: 0.95em; border-radius: 3px;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.5); flex: none;
  }
  .mundial-bandera--es {
    background: linear-gradient(180deg, var(--es-rojo) 0 25%, var(--es-oro) 25% 75%, var(--es-rojo) 75%);
  }
  .mundial-bandera--fr {
    background: linear-gradient(90deg, #0055a4 0 33.3%, #fff 33.3% 66.6%, #ef4135 66.6%);
  }
  .mundial-sub {
    max-width: 40rem; margin: 0.2rem auto 0; font-family: var(--font-tit);
    font-size: 1.06rem; line-height: 1.6; color: rgba(239, 233, 221, 0.9);
  }

  /* Imagen en marco */
  .mundial-figura { margin: 0; width: 100%; max-width: 46rem; }
  .mundial-marco {
    position: relative; border-radius: 1.1rem; overflow: hidden; padding: 6px;
    background: linear-gradient(180deg, var(--es-rojo) 0 20%, var(--es-oro) 20% 80%, var(--es-rojo) 80%);
    box-shadow: 0 34px 80px -34px rgba(0, 0, 0, 0.9);
  }
  .mundial-img {
    display: block; width: 100%; height: auto; border-radius: 0.75rem;
    aspect-ratio: 16 / 9; object-fit: cover;
  }
  .mundial-directo {
    position: absolute; top: 0.9rem; left: 0.9rem; z-index: 2;
    display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.7rem;
    font-family: var(--font-tec); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.12em;
    text-transform: uppercase; color: #fff; background: rgba(209, 18, 42, 0.94); border-radius: 999px;
  }
  .mundial-img-tag {
    position: absolute; bottom: 0.9rem; left: 50%; translate: -50% 0; z-index: 2;
    display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.55rem 1rem;
    font-family: var(--font-tec); font-size: 0.82rem; font-weight: 700; letter-spacing: 0.06em;
    text-transform: uppercase; color: #1a0d08;
    background: linear-gradient(90deg, var(--es-oro), var(--es-oro-claro));
    border-radius: 0.7rem; box-shadow: 0 12px 28px -12px rgba(0, 0, 0, 0.85); white-space: nowrap;
  }
  .mundial-pie {
    margin: 0.75rem 0 0; font-family: var(--font-tec); font-size: 0.76rem;
    letter-spacing: 0.04em; color: rgba(239, 233, 221, 0.55);
  }

  /* Datos */
  .mundial-info {
    list-style: none; margin: 0; padding: 0; width: 100%;
    display: grid; grid-template-columns: 1fr; gap: 0.75rem;
  }
  .mundial-dato {
    display: grid; grid-template-columns: auto 1fr; align-items: center;
    column-gap: 0.85rem; row-gap: 0.15rem; padding: 1rem 1.15rem; text-align: left;
    background: rgba(255, 255, 255, 0.045); border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.9rem; transition: border-color 0.25s ease, transform 0.25s ease, background 0.25s ease;
  }
  .mundial-dato:hover {
    border-color: rgba(255, 196, 0, 0.4); transform: translateY(-3px);
    background: rgba(255, 255, 255, 0.06);
  }
  .mundial-dato-ico {
    grid-row: 1 / 3; display: grid; place-items: center; width: 2.6rem; height: 2.6rem;
    border-radius: 0.7rem; color: var(--es-oro);
    background: rgba(255, 196, 0, 0.12); border: 1px solid rgba(255, 196, 0, 0.25);
  }
  .mundial-dato-k {
    font-family: var(--font-tec); font-size: 0.66rem; letter-spacing: 0.16em;
    text-transform: uppercase; color: var(--es-oro-claro);
  }
  .mundial-dato-v { font-family: var(--font-tit); font-weight: 600; font-size: 1.02rem; color: #fff; }

  /* Sorteo · card que emula un vaso de cerveza */
  .mundial-sorteo {
    position: relative; isolation: isolate; overflow: hidden;
    width: 100%; padding: 3.4rem 1.6rem 1.6rem; border-radius: 1.1rem;
    border: 1px solid rgba(255, 210, 120, 0.5);
    box-shadow: 0 30px 60px -34px rgba(0, 0, 0, 0.9), inset 0 0 0 1px rgba(255, 255, 255, 0.06);
  }

  /* La cerveza (ámbar) + curvatura de cristal */
  .mundial-cerveza {
    position: absolute; inset: 0; z-index: -1; overflow: hidden;
    background:
      linear-gradient(180deg, #8a5209 0%, #c07f10 38%, #e6a71d 74%, #f6c73a 100%);
  }
  /* brillo de cristal cilíndrico (reflejo lateral) */
  .mundial-cerveza::before {
    content: ""; position: absolute; inset: 0; z-index: 2; pointer-events: none;
    background:
      linear-gradient(90deg, rgba(255, 255, 255, 0.22) 0%, transparent 14%),
      linear-gradient(90deg, transparent 78%, rgba(255, 255, 255, 0.16) 90%, rgba(255, 255, 255, 0.28) 100%);
    mix-blend-mode: screen;
  }
  /* scrim para que el texto claro se lea sobre el ámbar */
  .mundial-cerveza::after {
    content: ""; position: absolute; inset: 0; z-index: 3;
    background: linear-gradient(180deg, rgba(24, 12, 3, 0.32) 0%, rgba(24, 12, 3, 0.58) 50%, rgba(24, 12, 3, 0.78) 100%);
  }

  /* Vaho / gotas de condensación en el cristal */
  .mundial-vaho {
    position: absolute; inset: 0; z-index: 2; pointer-events: none; opacity: 0.7;
    background-image:
      radial-gradient(circle at 14% 62%, rgba(255,255,255,0.5) 0 1.4px, transparent 2.4px),
      radial-gradient(circle at 26% 78%, rgba(255,255,255,0.4) 0 1px, transparent 2px),
      radial-gradient(circle at 33% 52%, rgba(255,255,255,0.45) 0 1.8px, transparent 3px),
      radial-gradient(circle at 44% 84%, rgba(255,255,255,0.35) 0 1px, transparent 2px),
      radial-gradient(circle at 52% 66%, rgba(255,255,255,0.5) 0 1.5px, transparent 2.6px),
      radial-gradient(circle at 63% 50%, rgba(255,255,255,0.4) 0 1.2px, transparent 2.2px),
      radial-gradient(circle at 71% 80%, rgba(255,255,255,0.45) 0 1.7px, transparent 2.8px),
      radial-gradient(circle at 82% 60%, rgba(255,255,255,0.4) 0 1.1px, transparent 2px),
      radial-gradient(circle at 90% 74%, rgba(255,255,255,0.5) 0 1.5px, transparent 2.6px),
      radial-gradient(circle at 20% 44%, rgba(255,255,255,0.3) 0 0.9px, transparent 1.8px),
      radial-gradient(circle at 58% 88%, rgba(255,255,255,0.35) 0 1.2px, transparent 2.2px),
      radial-gradient(circle at 77% 46%, rgba(255,255,255,0.3) 0 1px, transparent 2px);
  }

  /* Superficie del líquido + espuma que ondea */
  .mundial-superficie {
    position: absolute; top: -6px; left: -12%; right: -12%; height: 54px; z-index: 4;
    background:
      radial-gradient(circle at 20% 60%, rgba(255,255,255,0.55) 0 2px, transparent 3px),
      radial-gradient(circle at 55% 40%, rgba(255,255,255,0.5) 0 1.6px, transparent 2.6px),
      radial-gradient(circle at 78% 66%, rgba(255,255,255,0.5) 0 2px, transparent 3px),
      linear-gradient(180deg, #fffdf6 0%, #f7eecd 60%, rgba(247,238,205,0) 100%);
    border-radius: 0 0 46% 46% / 0 0 100% 100%;
    -webkit-mask:
      radial-gradient(circle 10px at 50% 100%, transparent 9px, #000 9.6px) 0 100% / 30px 100% repeat-x;
    mask:
      radial-gradient(circle 10px at 50% 100%, transparent 9px, #000 9.6px) 0 100% / 30px 100% repeat-x;
    box-shadow: inset 0 -3px 8px rgba(255, 255, 255, 0.6);
    transform-origin: 50% 40%;
    animation: mundial-slosh 4.6s ease-in-out infinite;
  }
  @keyframes mundial-slosh {
    0%, 100% { transform: rotate(-1.6deg) translateY(0); }
    50% { transform: rotate(1.6deg) translateY(2.5px); }
  }

  /* Burbujas que suben */
  .mundial-burbuja {
    position: absolute; bottom: -14px; z-index: 1;
    width: 10px; height: 10px; border-radius: 50%;
    background: radial-gradient(circle at 35% 30%, rgba(255, 255, 255, 0.9), rgba(255, 236, 179, 0.35) 60%, transparent 70%);
    opacity: 0; animation: mundial-sube 6s linear infinite;
  }
  .mundial-burbuja:nth-child(1)  { left: 8%;  width: 7px;  height: 7px;  animation-duration: 5.5s; animation-delay: 0s; }
  .mundial-burbuja:nth-child(2)  { left: 18%; width: 12px; height: 12px; animation-duration: 7s;   animation-delay: 1.6s; }
  .mundial-burbuja:nth-child(3)  { left: 27%; width: 6px;  height: 6px;  animation-duration: 4.8s; animation-delay: 0.8s; }
  .mundial-burbuja:nth-child(4)  { left: 38%; width: 9px;  height: 9px;  animation-duration: 6.2s; animation-delay: 2.4s; }
  .mundial-burbuja:nth-child(5)  { left: 47%; width: 5px;  height: 5px;  animation-duration: 4.2s; animation-delay: 1.1s; }
  .mundial-burbuja:nth-child(6)  { left: 58%; width: 11px; height: 11px; animation-duration: 7.4s; animation-delay: 0.4s; }
  .mundial-burbuja:nth-child(7)  { left: 67%; width: 7px;  height: 7px;  animation-duration: 5.6s; animation-delay: 2.9s; }
  .mundial-burbuja:nth-child(8)  { left: 76%; width: 9px;  height: 9px;  animation-duration: 6.6s; animation-delay: 1.9s; }
  .mundial-burbuja:nth-child(9)  { left: 85%; width: 6px;  height: 6px;  animation-duration: 5s;   animation-delay: 0.2s; }
  .mundial-burbuja:nth-child(10) { left: 92%; width: 8px;  height: 8px;  animation-duration: 6.8s; animation-delay: 3.3s; }
  @keyframes mundial-sube {
    0% { transform: translateY(0) scale(0.6); opacity: 0; }
    12% { opacity: 0.75; }
    85% { opacity: 0.55; }
    100% { transform: translateY(-190px) scale(1.1); opacity: 0; }
  }

  .mundial-sorteo-body {
    position: relative; z-index: 2;
    display: flex; align-items: center; flex-wrap: wrap; gap: 1.1rem;
    text-align: left;
  }
  .mundial-premio {
    display: grid; place-items: center; flex: none; width: 3rem; height: 3rem;
    border-radius: 0.8rem; color: #1a0d08;
    background: linear-gradient(180deg, var(--es-oro-claro), var(--es-oro));
    box-shadow: 0 8px 18px -8px rgba(0, 0, 0, 0.6);
  }
  .mundial-sorteo-txt { flex: 1 1 18rem; }
  .mundial-sorteo-tag {
    display: inline-flex; align-items: center; margin: 0 0 0.6rem;
    padding: 0.4rem 0.85rem; font-family: var(--font-tec); font-size: 0.74rem; font-weight: 700;
    letter-spacing: 0.16em; text-transform: uppercase; color: #2a1607;
    background: linear-gradient(180deg, #fff3c4 0%, var(--es-oro-claro) 45%, var(--es-oro) 100%);
    border-radius: 999px;
    box-shadow: 0 6px 16px -7px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.65),
      inset 0 -1px 0 rgba(140, 90, 0, 0.4);
  }
  .mundial-sorteo-desc {
    margin: 0; font-family: var(--font-tit); font-size: 1.02rem; line-height: 1.55;
    color: #f3ecdd; text-shadow: 0 1px 6px rgba(0, 0, 0, 0.4);
  }
  .mundial-sorteo-desc strong { color: #fff; }
  .mundial-cta {
    flex: none; display: inline-flex; align-items: center; gap: 0.5rem;
    padding: 0.8rem 1.3rem; font-family: var(--font-tec); font-size: 0.8rem; font-weight: 700;
    letter-spacing: 0.06em; text-transform: uppercase; text-decoration: none; color: #1a0d08;
    background: linear-gradient(180deg, var(--es-oro-claro), var(--es-oro)); border-radius: 999px;
    box-shadow: 0 10px 24px -12px rgba(0, 0, 0, 0.75);
    transition: transform 0.2s ease, box-shadow 0.2s ease;
  }
  .mundial-cta:hover { transform: translateY(-2px); box-shadow: 0 16px 30px -12px rgba(0, 0, 0, 0.8); }
  .mundial-cta svg { transition: transform 0.2s ease; }
  .mundial-cta:hover svg { transform: translateX(3px); }

  /* Responsive */
  .mundial-flag { display: none; }
  @media (min-width: 640px) {
    .mundial-info { grid-template-columns: repeat(2, 1fr); }
  }
  @media (min-width: 780px) {
    .mundial-flag { display: flex; }
  }
  @media (min-width: 860px) {
    .mundial { padding: 5rem 2rem 5.5rem; }
    .mundial-info { grid-template-columns: repeat(4, 1fr); }
  }
  @media (min-width: 1040px) {
    .mundial-flag--left { left: 46px; }
    .mundial-flag--right { right: 46px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .mundial-franja, .mundial-live, .mundial-aspas,
    .mundial-flag-cloth, .mundial-flag-cloth::after,
    .mundial-superficie, .mundial-burbuja { animation: none; }
    .mundial-burbuja { display: none; }
  }
</style>
```

---

## 5. EL CAMBIO: fondo urban/graffiti de la selección 🇪🇸🎨

Idea: un **muro urbano oscuro** (hormigón con grano) con la **equipación de la selección
pintada encima** — hombreras **granate** con **vivo amarillo** y las 3 rayas, y el
**escudo de la RFEF** como stencil grande de fondo. Patriótico y con rollo graffiti, y
**se mantiene oscuro a propósito** para que el texto claro y las cards se sigan leyendo
(NO pongas el fondo blanco tipo camiseta: rompería todo el contraste del contenido).

Haz **4 cosas** y nada más:

### 5.1 · Quita los molinos (son de pueblo, no urban)
- En el markup, **borra el bloque** `<svg class="mundial-molinos"> … </svg>` entero.
- En el `<style>`, borra (o deja sin usar, da igual) las reglas `.mundial-molinos`,
  `.mundial-molino`, `.mundial-cerro`, `.mundial-aspas`, `@keyframes mundial-gira` y las
  tres reglas `.mundial-molino:nth-of-type(...)`.

### 5.2 · Añade el markup del fondo urban
Justo **después** de `<section class="mundial" …>` (donde antes estaba el `<svg>` de
molinos), pega:

```astro
  <!-- Fondo URBAN/GRAFFITI · equipación de la selección -->
  <img class="mundial-escudo" src="/images/escudo-seleccion.png" alt="" aria-hidden="true" />
  <div class="mundial-jersey" aria-hidden="true">
    <span class="mundial-hombro mundial-hombro--l"></span>
    <span class="mundial-hombro mundial-hombro--r"></span>
    <span class="mundial-drip" style="left:14%; top:118px; height:40px;"></span>
    <span class="mundial-drip" style="left:23%; top:132px; height:22px;"></span>
    <span class="mundial-drip" style="right:16%; top:120px; height:34px;"></span>
    <span class="mundial-drip" style="right:27%; top:130px; height:18px;"></span>
  </div>
```

### 5.3 · Sustituye el fondo base y los rayos
Reemplaza el `background` de `.mundial` (el ámbar/rojo) por el **muro** y usa `::before`
como **capa de grano de hormigón**:

```css
/* .mundial → background (muro urbano oscuro + luz cenital amarilla + halo granate) */
background:
  radial-gradient(60% 42% at 50% 0%, rgba(245, 197, 24, 0.10), transparent 70%),
  radial-gradient(130% 95% at 50% -12%, rgba(122, 31, 43, 0.45), transparent 60%),
  linear-gradient(180deg, #221b17 0%, #17110e 58%, #0d0908 100%);

/* .mundial::before → grano/textura de hormigón (sustituye a los rayos dorados) */
.mundial::before {
  content: ""; position: absolute; inset: 0; z-index: -1; pointer-events: none;
  opacity: 0.5; mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}
```

### 5.4 · Añade el CSS de la equipación (pégalo dentro del `<style>`)

```css
/* Escudo de la selección · stencil de fondo */
.mundial-escudo {
  position: absolute; top: 46%; left: 50%; translate: -50% -50%;
  width: min(72vw, 540px); height: auto; z-index: -1;
  opacity: 0.11; mix-blend-mode: luminosity;
  filter: saturate(0.25) brightness(1.5) contrast(1.05)
          drop-shadow(0 0 1px rgba(0, 0, 0, 0.4));
  pointer-events: none;
}

/* Hombreras estilo camiseta: granate + vivo amarillo + 3 rayas */
.mundial-jersey {
  position: absolute; top: 0; left: 0; right: 0; height: 240px;
  z-index: -1; overflow: hidden; pointer-events: none;
}
.mundial-hombro {
  position: absolute; top: -66px; width: 64%; height: 150px; opacity: 0.94;
  background:
    /* trazos claros (las 3 rayas) + vivo amarillo, sobre el granate */
    linear-gradient(180deg,
      transparent 0 56%, #f4c518 56% 62%, transparent 62% 70%,
      #efe7da 70% 73%, transparent 73% 79%,
      #efe7da 79% 82%, transparent 82% 88%,
      #efe7da 88% 91%, transparent 91%),
    linear-gradient(180deg, #8a2233 0%, #611620 100%);
  box-shadow: 0 14px 34px -14px rgba(0, 0, 0, 0.7);
}
.mundial-hombro--l { left: -8%; transform: rotate(-15deg); transform-origin: top left; }
.mundial-hombro--r { right: -8%; transform: rotate(15deg); transform-origin: top right; }

/* Goteo de pintura (graffiti) bajo las hombreras */
.mundial-drip {
  position: absolute; width: 5px; border-radius: 0 0 4px 4px;
  background: linear-gradient(180deg, #8a2233, #611620);
  z-index: -1; opacity: 0.8;
}
.mundial-drip::after {
  content: ""; position: absolute; left: -1px; bottom: -4px;
  width: 7px; height: 7px; border-radius: 50%;
  background: #611620;
}
```

### 5.5 · Añade las nuevas capas a `prefers-reduced-motion` (no hace falta)
Estas capas **no animan**, así que no tienes que tocar el bloque de `reduced-motion`.
El resto de animaciones (banderas, franjas, burbujas, espuma) se quedan igual.

**Resultado:** muro oscuro con grano, halo granate arriba y luz amarilla cenital,
hombreras granate con vivo amarillo cruzando las esquinas superiores (con goteos de
pintura), y el escudo de la selección como stencil grande y tenue detrás del contenido.
Todo lo demás (marcador, banderas, imagen, franjas, card-cerveza) intacto.

> **Nota de contraste:** todo esto es oscuro a propósito. Si el usuario quisiera el look
> literal de camiseta blanca, habría que reestilar TODO el texto y las cards a oscuro
> (cambio grande, no solo el fondo) — avísale antes de hacerlo.
>
> **Escudo:** si aún no tienes el PNG del escudo, deja `.mundial-escudo` fuera (o su
> `src` vacío) hasta que el usuario lo aporte. **No dibujes un escudo aproximado.**

---

## 6. Cómo quitarla cuando acabe el evento

En la página donde la insertaste, borra **estas 2 líneas**:

1. `import EspecialMundial from '../components/EspecialMundial.astro';`
2. `<EspecialMundial />`

(Opcional: borra `src/components/EspecialMundial.astro` y la imagen). Nada más del
sitio depende de ello.

---

## 7. Checklist para Opus

- [ ] Copiado `EspecialMundial.astro` **literal** en `src/components/`.
- [ ] Copiada la imagen `españitacasinolio.png` a estáticos y ajustado el `src` a su ruta real.
- [ ] Conseguido el PNG transparente del **escudo de la selección** → `escudo-seleccion.png`.
- [ ] Importado e insertado `<EspecialMundial />` justo debajo del hero.
- [ ] Aplicado el **fondo urban/graffiti** del apartado 5 (borrar molinos, añadir markup del muro + escudo + hombreras, sustituir `.mundial` background y `.mundial::before`, añadir CSS de la equipación).
- [ ] Verificada **fecha y hora reales** del partido en la constante `EVENTO`.
- [ ] Comprobado que el CTA del sorteo apunta a `https://liopub.com`.
- [ ] **Nada más modificado** (marcador, banderas, imagen, franjas y card-cerveza intactos).
```
