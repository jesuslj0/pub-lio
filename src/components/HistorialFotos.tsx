import { useEffect, useRef, useState } from "react";
import { Crown, Heart, ImagePlus, Loader2 } from "lucide-react";
import { miniatura } from "../lib/cloudinary";
import {
  cargarTanda,
  etiquetaSemana,
  FOTOS_POR_TANDA,
  type FiltroHistorial,
  type FotoHistorial,
} from "../lib/historial";
import { useVisorFotos } from "./VisorFotos";

interface HistorialFotosProps {
  fotosIniciales: FotoHistorial[];
  filtro: FiltroHistorial;
  /** Semana en juego (calculada en servidor): sus fotos aún se votan en la home. */
  semanaActual: string;
}

// Colores del podio, coherentes con el Leaderboard.
const COLOR_PUESTO = ["text-accent", "text-accent3", "text-accent2"];

/**
 * Tamaño de cada celda según su puesto. El podio arriba forma un bloque fijo y
 * después se rompe el ritmo con celdas grandes periódicas y las ganadoras.
 *
 *  Móvil (3 col):  #1 2×2 + #2/#3 apilados; luego una 2×2 cada 9 fotos
 *                  (alternando lado, estilo "Explorar"). Las ganadoras no se
 *                  agrandan: suelen estar arriba y romperían el ritmo.
 *  Desktop (6 col): #1 3×3, #2 2×2, #3 1×2, #4–#6 cierran el bloque; luego
 *                  una 2×2 cada 7 fotos y las ganadoras.
 */
function celda(i: number, destacar: boolean) {
  let movil = "";
  if (i === 0) movil = "col-span-2 row-span-2";
  else if (i >= 3 && i % 9 === 6)
    movil = i % 18 === 15 ? "col-span-2 row-span-2 col-start-2" : "col-span-2 row-span-2";

  let desktop = "md:col-span-1 md:row-span-1 md:col-start-auto";
  if (i === 0) desktop = "md:col-span-3 md:row-span-3";
  else if (i === 1) desktop = "md:col-span-2 md:row-span-2";
  else if (i === 2) desktop = "md:col-span-1 md:row-span-2";
  else if (i >= 6 && (i % 7 === 0 || destacar))
    desktop = "md:col-span-2 md:row-span-2 md:col-start-auto";

  return {
    clases: `${movil} ${desktop}`,
    grandeMovil: movil !== "",
    grandeDesktop: i < 3 || desktop.includes("md:row-span-2"),
  };
}

export default function HistorialFotos({
  fotosIniciales,
  filtro,
  semanaActual,
}: HistorialFotosProps) {
  const [fotos, setFotos] = useState(fotosIniciales);
  const [cargando, setCargando] = useState(false);
  const [hayMas, setHayMas] = useState(fotosIniciales.length === FOTOS_POR_TANDA);
  const [error, setError] = useState(false);
  const sentinela = useRef<HTMLDivElement>(null);

  // Historial en solo lectura: sin onVote, el reels muestra los votos sin votar.
  const visor = useVisorFotos({ fotos });

  // Scroll infinito: al acercarse al final se pide la siguiente tanda.
  useEffect(() => {
    const el = sentinela.current;
    if (!el || !hayMas || cargando || error) return;

    const observer = new IntersectionObserver(
      async ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        setCargando(true);
        try {
          const tanda = await cargarTanda(filtro, fotos.length);
          setFotos((prev) => {
            const vistas = new Set(prev.map((f) => f.id));
            return [...prev, ...tanda.filter((f) => !vistas.has(f.id))];
          });
          setHayMas(tanda.length === FOTOS_POR_TANDA);
        } catch (err) {
          console.error(err);
          setError(true);
        } finally {
          setCargando(false);
        }
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fotos.length, hayMas, cargando, error, filtro]);

  if (fotos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-5 border border-border bg-bg2 px-6 py-16 text-center">
        <p className="font-mono text-sm tracking-wide text-muted">
          {filtro.soloGanadoras
            ? "Todavía no hay fotos ganadoras."
            : "No hay fotos en esta semana."}
        </p>
        <a
          href="/#subir"
          className="inline-flex items-center gap-2 bg-accent px-5 py-3 font-mono text-[0.7rem] font-bold uppercase tracking-[0.12em] text-bg"
        >
          <ImagePlus size={16} strokeWidth={2} />
          Subir foto
        </a>
      </div>
    );
  }

  // En "Ganadoras" todas lo son: no se destacan para no hacer todo grande.
  const destacarGanadoras = !filtro.soloGanadoras;

  return (
    <>
      <div className="@container">
        <ul className="lio-historial-grid grid grid-flow-row-dense grid-cols-3 gap-[3px] md:grid-cols-6">
          {fotos.map((foto, i) => {
            const puesto = i + 1;
            const { clases, grandeMovil, grandeDesktop } = celda(i, destacarGanadoras && foto.ganadora);
            const enorme = i === 0;
            const grande = grandeMovil || grandeDesktop;
            const enJuego = foto.semana === semanaActual;
            return (
              <li
                key={foto.id}
                className={`lio-historial-celda group relative overflow-hidden bg-surface ${clases}`}
                style={{ animationDelay: `${(i % FOTOS_POR_TANDA) * 35}ms` }}
              >
                <button
                  type="button"
                  onClick={() => visor.abrir(i)}
                  className="absolute inset-0 block h-full w-full cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
                  aria-label={`Ver foto ${puesto}${foto.nombre_autor ? ` de ${foto.nombre_autor}` : ""}`}
                >
                  <img
                    src={miniatura(foto.cloudinary_url, enorme ? 1100 : grande ? 800 : 480)}
                    alt=""
                    loading={i < 6 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.04]"
                  />
                </button>

                {/* Degradado + datos (no bloquea el clic) */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-[linear-gradient(to_bottom,rgba(8,8,16,0.55)_0%,transparent_30%,transparent_55%,rgba(8,8,16,0.9)_100%)] p-2 md:p-3">
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={`font-display leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.6)] ${
                        COLOR_PUESTO[i] ?? "text-text"
                      } ${
                        enorme ? "text-6xl" : grandeMovil ? "text-4xl" : "text-xl"
                      } ${
                        enorme ? "md:text-8xl" : grandeDesktop ? "md:text-5xl" : "md:text-3xl"
                      }`}
                    >
                      <span className="align-top text-[0.45em] opacity-70">#</span>
                      {puesto}
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      {foto.ganadora && (
                        <span
                          className="inline-flex items-center gap-1 bg-accent3 p-1 font-mono text-[0.55rem] font-bold uppercase tracking-[0.15em] text-bg md:px-2.5"
                          title="Ganadora de la semana"
                        >
                          <Crown size={12} strokeWidth={2} />
                          <span
                            className={`${grandeMovil ? "inline" : "hidden"} ${grandeDesktop ? "md:inline" : "md:hidden"}`}
                          >
                            Ganadora
                          </span>
                        </span>
                      )}
                      {enJuego && (
                        <span className="hidden border border-accent/60 bg-bg/60 px-2 py-1 font-mono text-[0.55rem] uppercase tracking-[0.15em] text-accent backdrop-blur-sm md:inline">
                          En juego
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <div
                      className={`min-w-0 flex-col leading-tight ${
                        grandeMovil ? "flex" : "hidden md:flex"
                      } ${
                        grandeDesktop ? "" : "md:opacity-0 md:transition-opacity md:group-hover:opacity-100"
                      }`}
                    >
                      {foto.nombre_autor && (
                        <span className="truncate font-mono text-[0.7rem] font-bold text-text">
                          {foto.nombre_autor}
                        </span>
                      )}
                      <span className="font-mono text-[0.6rem] uppercase tracking-wider text-text/55">
                        {etiquetaSemana(foto.semana)}
                      </span>
                    </div>
                    <span
                      className={`ml-auto inline-flex shrink-0 items-center gap-1 font-mono font-bold text-accent drop-shadow-[0_1px_6px_rgba(0,0,0,0.7)] ${
                        enorme ? "text-base md:text-lg" : "text-[0.65rem] md:text-xs"
                      }`}
                    >
                      <Heart size={enorme ? 16 : 12} strokeWidth={2} fill="currentColor" />
                      {foto.votos_count}
                    </span>
                  </div>
                </div>

                {/* Marco de neón: fijo en el #1, al pasar el ratón en el resto */}
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 transition-shadow duration-300 ${
                    enorme
                      ? "shadow-[inset_0_0_0_2px_var(--color-accent),inset_0_0_40px_color-mix(in_srgb,var(--color-accent)_35%,transparent)]"
                      : "group-hover:shadow-[inset_0_0_0_1px_var(--color-accent),inset_0_0_24px_color-mix(in_srgb,var(--color-accent)_30%,transparent)]"
                  }`}
                />
              </li>
            );
          })}
        </ul>
      </div>

      {/* Sentinela del scroll infinito + estados */}
      <div ref={sentinela} className="flex min-h-24 items-center justify-center py-10">
        {cargando && (
          <span className="inline-flex items-center gap-2 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted">
            <Loader2 size={14} strokeWidth={2} className="animate-spin" />
            Cargando más fotos
          </span>
        )}
        {error && (
          <button
            type="button"
            onClick={() => setError(false)}
            className="border border-accent px-5 py-3 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-accent transition-colors hover:bg-accent hover:text-bg"
          >
            No se pudieron cargar · Reintentar
          </button>
        )}
        {!hayMas && !cargando && fotos.length > FOTOS_POR_TANDA && (
          <span className="font-mono text-[0.65rem] uppercase tracking-[0.2em] text-muted">
            · Has llegado al final ·
          </span>
        )}
      </div>

      {visor.visor}

      <style>{estilos}</style>
    </>
  );
}

// Lo que Tailwind no cubre bien: filas proporcionales al ancho del contenedor
// (celdas 4:5 aunque ocupen varias filas) y la entrada escalonada.
const estilos = `
  .lio-historial-grid {
    --cols: 3;
    --gap: 3px;
    grid-auto-rows: calc((100cqw - (var(--cols) - 1) * var(--gap)) / var(--cols) * 1.25);
  }
  @media (min-width: 48rem) {
    .lio-historial-grid { --cols: 6; }
  }
  .lio-historial-celda {
    animation: lio-historial-in 0.5s ease-out both;
  }
  @keyframes lio-historial-in {
    from { opacity: 0; transform: translateY(14px); }
    to { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lio-historial-celda { animation: none; }
  }
`;
