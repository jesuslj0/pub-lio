import { useEffect, useRef, useState, type CSSProperties } from "react";
import { CalendarClock, CalendarRange, Volume2, VolumeX } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Cartel } from "../lib/database.types";

function formatearFecha(fecha: string | null): string {
  if (!fecha) return "";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function CartelFinde() {
  const [cartel, setCartel] = useState<Cartel | null>(null);
  const [loading, setLoading] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    if (!next && v.paused) v.play().catch(() => {});
    setMuted(next);
  }

  useEffect(() => {
    let activo = true;
    async function cargar() {
      const { data, error } = await supabase
        .from("carteles")
        .select("*")
        .eq("activo", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activo) return;
      if (error) console.error(error);
      setCartel(data ?? null);
      setLoading(false);
    }
    cargar();
    return () => {
      activo = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={styles.imageWrap}>
        <div style={{ ...styles.card, ...styles.skeleton }}>
          <style>{pulse}</style>
        </div>
      </div>
    );
  }

  if (!cartel) {
    return (
      <div style={styles.imageWrap}>
        <div style={styles.placeholder}>
          <div style={styles.placeholderText}>
            CARTEL
            <br />
            FINDE
          </div>
          <span style={styles.placeholderSub}>
            <CalendarClock size={14} strokeWidth={2} />
            Próximamente · Pdte. confirmar
          </span>
        </div>
      </div>
    );
  }

  const rango = [formatearFecha(cartel.fecha_inicio), formatearFecha(cartel.fecha_fin)]
    .filter(Boolean)
    .join(" — ");

  const esVideo =
    cartel.media_tipo === "video" ||
    (!!cartel.imagen_url &&
      /\/video\/|\.(mp4|webm|mov|m4v)(\?|$)/i.test(cartel.imagen_url));

  // ─── VÍDEO: vídeo limpio + texto fuera (desktop a la derecha, móvil debajo) ───
  if (esVideo && cartel.imagen_url) {
    return (
      <div className="lio-cartel-video">
        <style>{neonGlow}</style>
        <style>{videoLayout}</style>
        <div className="lio-cartel-card lio-cartel-videocard">
          <video
            ref={videoRef}
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
            onClick={toggleMute}
            aria-label={muted ? "Activar sonido" : "Silenciar"}
          >
            {muted ? <VolumeX size={18} strokeWidth={2} /> : <Volume2 size={18} strokeWidth={2} />}
          </button>
        </div>
        <div className="lio-cartel-card lio-cartel-text">
          <span style={styles.badge}>Esta semana</span>
          <h3 style={styles.titulo}>{cartel.titulo}</h3>
          {cartel.subtitulo && <p style={styles.subtitulo}>{cartel.subtitulo}</p>}
          {rango && (
            <p style={styles.fecha}>
              <CalendarRange size={14} strokeWidth={2} />
              {rango}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── IMAGEN: texto superpuesto sobre la imagen (tarjeta vertical) ───
  return (
    <div style={styles.imageWrap}>
      <div className="lio-cartel-card" style={styles.card}>
        <style>{neonGlow}</style>
        {cartel.imagen_url && (
          <img src={cartel.imagen_url} alt={cartel.titulo} style={styles.img} />
        )}
        <div style={styles.content}>
          <span style={styles.badge}>Esta semana</span>
          <h3 style={styles.titulo}>{cartel.titulo}</h3>
          {cartel.subtitulo && <p style={styles.subtitulo}>{cartel.subtitulo}</p>}
          {rango && (
            <p style={styles.fecha}>
              <CalendarRange size={14} strokeWidth={2} />
              {rango}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Layout del caso vídeo: una columna en móvil (vídeo arriba, texto debajo) y dos
// columnas en desktop (vídeo izquierda, texto derecha, centrado verticalmente).
const videoLayout = `
  .lio-cartel-video {
    display: grid;
    grid-template-columns: 1fr;
    gap: 28px;
  }
  .lio-cartel-videocard {
    position: relative;
    background: var(--surface);
    border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
    aspect-ratio: 9 / 16;
    max-width: 380px;
    margin: 0 auto;
    width: 100%;
    overflow: hidden;
  }
  .lio-cartel-videocard video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
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
    transition: background 0.2s ease, color 0.2s ease;
  }
  .lio-cartel-mute:hover {
    background: var(--accent);
    color: var(--bg);
  }
  .lio-cartel-text {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    background: var(--surface);
    border: 1px solid var(--border);
    padding: 32px;
  }
  @media (min-width: 769px) {
    .lio-cartel-video {
      grid-template-columns: 380px 1fr;
      gap: 48px;
      align-items: stretch;
    }
    .lio-cartel-videocard {
      margin: 0;
    }
    .lio-cartel-text {
      justify-content: center;
      padding: 40px;
    }
  }
`;

const pulse = `@keyframes lio-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`;

// Borde animado tipo neón con el verde de acento: un conic-gradient que gira
// detrás de la tarjeta + un glow exterior que respira.
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
    inset: -3px;
    z-index: -1;
    border-radius: inherit;
    padding: 3px;
    background: conic-gradient(
      from var(--lio-neon-angle),
      transparent 0deg,
      var(--accent) 60deg,
      color-mix(in srgb, var(--accent) 55%, transparent) 130deg,
      transparent 190deg,
      var(--accent) 320deg,
      transparent 360deg
    );
    /* Recorta el centro para que solo quede el anillo (borde real). */
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

const styles: Record<string, CSSProperties> = {
  imageWrap: {
    maxWidth: "380px",
    margin: "0 auto",
  },
  card: {
    position: "relative",
    background: "var(--surface)",
    border: "1px solid color-mix(in srgb, var(--accent) 25%, var(--border))",
    aspectRatio: "9 / 16",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  img: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  content: {
    position: "relative",
    padding: "32px",
    background: "linear-gradient(to top, rgba(8,8,16,0.92) 0%, transparent 80%)",
  },
  badge: {
    display: "inline-block",
    fontFamily: "var(--font-mono)",
    fontSize: "0.6rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    background: "var(--accent)",
    color: "var(--bg)",
    padding: "5px 12px",
    fontWeight: 700,
    marginBottom: "12px",
  },
  titulo: {
    fontFamily: "var(--font-display)",
    fontSize: "2.5rem",
    lineHeight: 1,
    color: "var(--text)",
  },
  subtitulo: {
    fontFamily: "var(--font-body)",
    fontSize: "0.95rem",
    color: "var(--muted)",
    marginTop: "8px",
    fontWeight: 300,
    whiteSpace: "pre-line",
  },
  fecha: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--accent)",
    letterSpacing: "0.1em",
    marginTop: "8px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    textShadow: "0 0 12px color-mix(in srgb, var(--accent) 45%, transparent)",
  },
  placeholder: {
    position: "relative",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    aspectRatio: "9 / 16",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    backgroundImage:
      "repeating-linear-gradient(45deg, transparent, transparent 30px, color-mix(in srgb, var(--accent) 2%, transparent) 30px, color-mix(in srgb, var(--accent) 2%, transparent) 31px)",
  },
  placeholderText: {
    fontFamily: "var(--font-display)",
    fontSize: "5rem",
    color: "color-mix(in srgb, var(--accent) 6%, transparent)",
    letterSpacing: "0.1em",
    textAlign: "center",
    lineHeight: 0.9,
  },
  placeholderSub: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--muted)",
    letterSpacing: "0.1em",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },
  skeleton: {
    animation: "lio-pulse 1.4s ease-in-out infinite",
  },
};
