import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  CalendarClock,
  CalendarRange,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Cartel } from "../lib/database.types";

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  });
}

// Un cartel se considera vídeo si su media_tipo lo indica o si la URL apunta a
// un recurso de vídeo en Cloudinary.
function esVideoCartel(cartel: Cartel): boolean {
  return (
    cartel.media_tipo === "video" ||
    (!!cartel.imagen_url &&
      /\/video\/|\.(mp4|webm|mov|m4v)(\?|$)/i.test(cartel.imagen_url))
  );
}

export default function CartelFinde() {
  // Pueden mostrarse varios carteles a la vez (un finde con 2-3 carteles).
  const [carteles, setCarteles] = useState<Cartel[]>([]);
  const [loading, setLoading] = useState(true);
  // Estado de silencio por cartel (clave = id). Por defecto, silenciado.
  const [muted, setMuted] = useState<Record<string, boolean>>({});
  // Índice del cartel visible en el carrusel (móvil).
  const [index, setIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    let activo = true;
    async function cargar() {
      const { data, error } = await supabase
        .from("carteles")
        .select("*")
        .eq("activo", true)
        // Orden por fecha de creación: el primero creado se muestra primero.
        .order("created_at", { ascending: true });

      if (!activo) return;
      if (error) console.error(error);
      setCarteles(data ?? []);
      setLoading(false);
    }
    cargar();
    return () => {
      activo = false;
    };
  }, []);

  function toggleMute(id: string) {
    const v = videoRefs.current[id];
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    if (!next && v.paused) v.play().catch(() => {});
    setMuted((m) => ({ ...m, [id]: next }));
  }

  // ─── Carrusel (móvil) ───
  const irA = (i: number) => {
    const track = trackRef.current;
    if (!track) return;
    const clamped = Math.max(0, Math.min(i, carteles.length - 1));
    const slide = track.children[clamped] as HTMLElement | undefined;
    if (slide) {
      track.scrollTo({
        left: slide.offsetLeft - track.offsetLeft,
        behavior: "smooth",
      });
    }
    setIndex(clamped);
  };

  // Detecta el cartel más centrado al deslizar para sincronizar flechas/puntos.
  const onScroll = () => {
    const track = trackRef.current;
    if (!track) return;
    const centro = track.scrollLeft + track.clientWidth / 2;
    let mejor = 0;
    let mejorDist = Infinity;
    Array.from(track.children).forEach((c, i) => {
      const el = c as HTMLElement;
      const elCentro = el.offsetLeft - track.offsetLeft + el.clientWidth / 2;
      const d = Math.abs(elCentro - centro);
      if (d < mejorDist) {
        mejorDist = d;
        mejor = i;
      }
    });
    setIndex(mejor);
  };

  if (loading) {
    return (
      <div className="lio-carteles is-single">
        <div className="lio-carteles-track">
          <div className="lio-cartel-slide">
            <div className="lio-cartel-media lio-cartel-skeleton" />
          </div>
        </div>
        <style>{pulse}</style>
        <style>{carruselStyles}</style>
      </div>
    );
  }

  if (carteles.length === 0) {
    return (
      <div className="lio-carteles is-single">
        <div className="lio-carteles-track">
          <div className="lio-cartel-slide">
            <div className="lio-cartel-media lio-cartel-placeholder">
              <div className="lio-cartel-placeholder-text">
                CARTEL
                <br />
                FINDE
              </div>
              <span className="lio-cartel-placeholder-sub">
                <CalendarClock size={14} strokeWidth={2} />
                Próximamente · Pdte. confirmar
              </span>
            </div>
          </div>
        </div>
        <style>{carruselStyles}</style>
      </div>
    );
  }

  const multiple = carteles.length > 1;

  return (
    <div className={`lio-carteles ${multiple ? "is-multiple" : "is-single"}`}>
      <style>{neonGlow}</style>
      <style>{carruselStyles}</style>

      <div className="lio-carteles-track" ref={trackRef} onScroll={onScroll}>
        {carteles.map((cartel) => {
          const esVid = esVideoCartel(cartel);
          const rango = [
            formatearFecha(cartel.fecha_inicio),
            formatearFecha(cartel.fecha_fin),
          ]
            .filter(Boolean)
            .join(" — ");
          const m = muted[cartel.id] ?? true;

          return (
            <article key={cartel.id} className="lio-cartel-slide">
              <div className="lio-cartel-card lio-cartel-media">
                {esVid && cartel.imagen_url ? (
                  <>
                    <video
                      ref={(el) => {
                        videoRefs.current[cartel.id] = el;
                      }}
                      src={cartel.imagen_url}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                      aria-label={cartel.titulo}
                    />
                    <button
                      type="button"
                      className="lio-cartel-mute"
                      onClick={() => toggleMute(cartel.id)}
                      aria-label={m ? "Activar sonido" : "Silenciar"}
                    >
                      {m ? (
                        <VolumeX size={18} strokeWidth={2} />
                      ) : (
                        <Volume2 size={18} strokeWidth={2} />
                      )}
                    </button>
                  </>
                ) : cartel.imagen_url ? (
                  <img src={cartel.imagen_url} alt={cartel.titulo} />
                ) : (
                  <div className="lio-cartel-empty">Sin medio</div>
                )}
              </div>

              <div className="lio-cartel-caption">
                <span className="lio-cartel-badge">Esta semana</span>
                <h3 className="lio-cartel-titulo">{cartel.titulo}</h3>
                {cartel.subtitulo && (
                  <p className="lio-cartel-sub">{cartel.subtitulo}</p>
                )}
                {rango && (
                  <p className="lio-cartel-fecha">
                    <CalendarRange size={14} strokeWidth={2} />
                    {rango}
                  </p>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {multiple && (
        <>
          <button
            type="button"
            className="lio-cartel-arrow lio-cartel-arrow-prev"
            onClick={() => irA(index - 1)}
            disabled={index === 0}
            aria-label="Cartel anterior"
          >
            <ChevronLeft size={24} strokeWidth={2} />
          </button>
          <button
            type="button"
            className="lio-cartel-arrow lio-cartel-arrow-next"
            onClick={() => irA(index + 1)}
            disabled={index === carteles.length - 1}
            aria-label="Cartel siguiente"
          >
            <ChevronRight size={24} strokeWidth={2} />
          </button>
          <div className="lio-cartel-dots">
            {carteles.map((c, i) => (
              <button
                key={c.id}
                type="button"
                className={`lio-cartel-dot ${i === index ? "is-active" : ""}`}
                onClick={() => irA(i)}
                aria-label={`Ir al cartel ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const pulse = `@keyframes lio-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`;

// Borde animado tipo neón con el rosa de acento (idéntico al original).
const neonGlow = `
  @property --lio-neon-angle {
    syntax: "<angle>";
    inherits: false;
    initial-value: 0deg;
  }
  .lio-cartel-card {
    position: relative;
    isolation: isolate;
  }
  .lio-cartel-card::before {
    content: "";
    position: absolute;
    inset: -1.5px;
    z-index: -1;
    border-radius: inherit;
    padding: 1.5px;
    background: conic-gradient(
      from var(--lio-neon-angle),
      transparent 0deg,
      var(--accent) 60deg,
      color-mix(in srgb, var(--accent) 55%, transparent) 130deg,
      transparent 190deg,
      var(--accent) 320deg,
      transparent 360deg
    );
    -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
    mask-composite: exclude;
    filter: drop-shadow(0 0 10px color-mix(in srgb, var(--accent) 75%, transparent))
      drop-shadow(0 0 22px color-mix(in srgb, var(--accent) 45%, transparent));
    animation: lio-neon-spin 5s linear infinite, lio-neon-breath 3s ease-in-out infinite;
  }
  @keyframes lio-neon-spin {
    to { --lio-neon-angle: 360deg; }
  }
  @keyframes lio-neon-breath {
    0%, 100% { opacity: 0.85; }
    50% { opacity: 1; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lio-cartel-card::before {
      animation: none;
      background: linear-gradient(135deg, var(--accent), transparent 70%);
    }
  }
`;

// Carrusel deslizable en móvil; fila alineada en escritorio (varios carteles).
const carruselStyles = `
  .lio-carteles {
    position: relative;
  }
  .lio-carteles-track {
    display: flex;
    gap: 20px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
    padding-bottom: 4px;
  }
  .lio-carteles-track::-webkit-scrollbar { width: 0; height: 0; display: none; }

  .lio-cartel-slide {
    flex: 0 0 100%;
    min-width: 0;
    scroll-snap-align: center;
    display: flex;
    flex-direction: column;
    gap: 18px;
    margin: 0;
  }

  .lio-cartel-media {
    position: relative;
    width: 100%;
    max-width: 380px;
    margin: 0 auto;
    aspect-ratio: 9 / 16;
    background: var(--surface);
    border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
    overflow: hidden;
  }
  .lio-cartel-media img,
  .lio-cartel-media video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .lio-cartel-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--muted);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .lio-cartel-skeleton {
    border: 1px solid var(--border);
    animation: lio-pulse 1.4s ease-in-out infinite;
  }

  .lio-cartel-mute {
    position: absolute;
    bottom: 14px;
    right: 14px;
    z-index: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border: 1px solid color-mix(in srgb, var(--accent) 40%, transparent);
    background: rgba(8, 8, 16, 0.6);
    backdrop-filter: blur(6px);
    color: var(--accent);
    cursor: pointer;
    transition: background 0.2s ease, color 0.2s ease, box-shadow 0.2s ease;
  }
  .lio-cartel-mute:hover {
    background: var(--accent);
    color: var(--bg);
    box-shadow: 0 0 18px color-mix(in srgb, var(--accent) 40%, transparent);
  }

  .lio-cartel-caption {
    width: 100%;
    max-width: 380px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
  }
  .lio-cartel-badge {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    background: var(--accent);
    color: var(--bg);
    padding: 5px 12px;
    font-weight: 700;
    margin-bottom: 12px;
  }
  .lio-cartel-titulo {
    font-family: var(--font-display);
    font-size: 2.5rem;
    line-height: 1;
    color: var(--text);
  }
  .lio-cartel-sub {
    font-family: var(--font-body);
    font-size: 0.95rem;
    color: var(--muted);
    margin-top: 8px;
    font-weight: 300;
    white-space: pre-line;
  }
  .lio-cartel-fecha {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--accent);
    letter-spacing: 0.1em;
    margin-top: 12px;
    display: inline-flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
    padding: 7px 12px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
    background: color-mix(in srgb, var(--accent) 10%, transparent);
    line-height: 1.3;
    max-width: 100%;
    text-shadow: 0 0 12px color-mix(in srgb, var(--accent) 45%, transparent);
  }

  .lio-cartel-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    border: 1px solid var(--border);
    background-image:
      repeating-linear-gradient(45deg, transparent, transparent 30px, color-mix(in srgb, var(--accent) 2%, transparent) 30px, color-mix(in srgb, var(--accent) 2%, transparent) 31px);
  }
  .lio-cartel-placeholder-text {
    font-family: var(--font-display);
    font-size: 5rem;
    color: color-mix(in srgb, var(--accent) 6%, transparent);
    letter-spacing: 0.1em;
    text-align: center;
    line-height: 0.9;
  }
  .lio-cartel-placeholder-sub {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--muted);
    letter-spacing: 0.1em;
    display: flex;
    align-items: center;
    gap: 7px;
  }

  /* ── Flechas laterales (móvil, varios carteles) ── */
  .lio-cartel-arrow {
    position: absolute;
    top: 38%;
    transform: translateY(-50%);
    z-index: 3;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: rgba(8, 8, 16, 0.6);
    backdrop-filter: blur(6px);
    color: var(--text);
    cursor: pointer;
    transition: background 0.2s ease, opacity 0.2s ease;
  }
  .lio-cartel-arrow:hover {
    background: rgba(8, 8, 16, 0.85);
  }
  .lio-cartel-arrow:disabled {
    opacity: 0.25;
    cursor: default;
  }
  .lio-cartel-arrow-prev { left: 2px; }
  .lio-cartel-arrow-next { right: 2px; }

  /* ── Puntos indicadores ── */
  .lio-cartel-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 22px;
  }
  .lio-cartel-dot {
    width: 8px;
    height: 8px;
    padding: 0;
    border: none;
    border-radius: 999px;
    background: color-mix(in srgb, var(--text) 25%, transparent);
    cursor: pointer;
    transition: background 0.2s ease, width 0.2s ease;
  }
  .lio-cartel-dot.is-active {
    background: var(--accent);
    width: 22px;
  }

  /* ── Escritorio: fila alineada con la descripción debajo de cada cartel ── */
  @media (min-width: 769px) {
    .lio-carteles.is-multiple .lio-carteles-track {
      overflow: visible;
      flex-wrap: wrap;
      justify-content: center;
      gap: 32px;
    }
    .lio-carteles.is-multiple .lio-cartel-slide {
      flex: 0 1 300px;
    }
    .lio-carteles .lio-cartel-arrow,
    .lio-carteles .lio-cartel-dots {
      display: none;
    }
  }
`;
