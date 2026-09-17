import { useEffect, useState, type CSSProperties } from "react";
import { Heart, Star, Trophy, Share2, Maximize2, ImagePlus, Play } from "lucide-react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { supabase, getCurrentWeek } from "../lib/supabase";
import type { Foto } from "../lib/database.types";
import {
  HeartBurst,
  haVotado,
  useDobleToque,
  useVisorFotos,
  type FotoVisor,
} from "./VisorFotos";

interface PhotoGridProps {
  semana?: string;
  mostrarGanadora?: boolean;
}

async function getFingerprint(): Promise<string> {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId;
}

export default function PhotoGrid({
  semana = getCurrentWeek(),
  mostrarGanadora = false,
}: PhotoGridProps) {
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<Record<string, boolean>>({});
  // Corazón animado (doble toque estilo Instagram): foto activa + key para
  // reiniciar la animación en taps consecutivos.
  const [heartBurst, setHeartBurst] = useState<{ id: string; key: number } | null>(
    null,
  );

  // Carga inicial + suscripción Realtime.
  useEffect(() => {
    let activo = true;

    async function cargar() {
      setLoading(true);
      const { data, error } = await supabase
        .from("fotos")
        .select("*")
        .eq("semana", semana)
        .eq("estado", "aprobada")
        .order("votos_count", { ascending: false });

      if (!activo) return;
      if (error) {
        console.error(error);
        setFotos([]);
      } else {
        setFotos(data ?? []);
      }
      setLoading(false);
    }

    cargar();

    const channel = supabase
      .channel(`fotos-${semana}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fotos",
          filter: `semana=eq.${semana}`,
        },
        (payload) => {
          const nueva = payload.new as Foto | undefined;
          setFotos((prev) => {
            let next = [...prev];
            if (payload.eventType === "DELETE") {
              const viejo = payload.old as Partial<Foto>;
              next = next.filter((f) => f.id !== viejo.id);
            } else if (nueva) {
              if (nueva.estado !== "aprobada") {
                next = next.filter((f) => f.id !== nueva.id);
              } else {
                const idx = next.findIndex((f) => f.id === nueva.id);
                if (idx >= 0) next[idx] = nueva;
                else next.push(nueva);
              }
            }
            return next.sort((a, b) => b.votos_count - a.votos_count);
          });
        },
      )
      .subscribe();

    return () => {
      activo = false;
      supabase.removeChannel(channel);
    };
  }, [semana]);

  // Vota o, si ya se había votado, quita el voto (toggle).
  const handleVote = async (fotoId: string) => {
    if (voting[fotoId]) return;
    const yaVotada = haVotado(fotoId);
    setVoting((v) => ({ ...v, [fotoId]: true }));
    try {
      const fingerprint = await getFingerprint();
      const res = await fetch("/api/vote", {
        method: yaVotada ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoId, fingerprint }),
      });
      const data = (await res.json()) as {
        success: boolean;
        newCount?: number;
        reason?: string;
      };

      // 409 = estado ya coherente con la acción (ya votado / no había voto):
      // sincronizamos el flag local igualmente.
      if (data.success || res.status === 409) {
        if (yaVotada) localStorage.removeItem(`voted_${fotoId}`);
        else localStorage.setItem(`voted_${fotoId}`, "1");
        if (data.success && typeof data.newCount === "number") {
          setFotos((prev) =>
            prev
              .map((f) =>
                f.id === fotoId ? { ...f, votos_count: data.newCount! } : f,
              )
              .sort((a, b) => b.votos_count - a.votos_count),
          );
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setVoting((v) => ({ ...v, [fotoId]: false }));
    }
  };

  // Visor (slider en escritorio / reels en móvil) + hoja de compartir.
  const visor = useVisorFotos({ fotos, onVote: handleVote, votando: voting });

  // Dispara el corazón animado y vota (si no se había votado ya).
  const meEncanta = (foto: FotoVisor) => {
    setHeartBurst({ id: foto.id, key: Date.now() });
    if (!haVotado(foto.id)) handleVote(foto.id);
  };

  // En táctil: 2 toques rápidos = me encanta; el toque simple no hace nada (el
  // visor se abre con su botón). Con ratón/lápiz el clic tampoco abre nada.
  const handleImagePointerUp = useDobleToque(meEncanta);

  const maxVotos = fotos.length
    ? Math.max(...fotos.map((f) => f.votos_count))
    : 0;

  if (loading) {
    return (
      <div className="lio-photo-grid" style={styles.grid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={styles.skeleton} />
        ))}
        <style>{pulseKeyframes}</style>
        <style>{gridResponsive}</style>
      </div>
    );
  }

  if (fotos.length === 0) {
    return (
      <div style={styles.emptyState}>
        <p style={styles.empty}>
          Aún no hay fotos esta semana. ¡Sé el primero en subir la tuya!
        </p>
        <a href="#subir" style={styles.emptyBtn}>
          <ImagePlus size={16} strokeWidth={2} />
          Subir foto
        </a>
      </div>
    );
  }

  return (
    <>
      {/* Botón para abrir el feed inmersivo (solo móvil). */}
      <button
        type="button"
        className="lio-reels-trigger"
        onClick={() => visor.abrirReels(0)}
      >
        <Play size={15} strokeWidth={2} fill="currentColor" />
        Ver en pantalla completa
      </button>

      <div className="lio-photo-grid" style={styles.grid}>
      {fotos.map((foto, i) => {
        const yaVotada = haVotado(foto.id);
        const esMasVotada = foto.votos_count === maxVotos && maxVotos > 0;
        return (
          <div key={foto.id} className="foto-card" style={styles.card}>
            <div style={styles.badges}>
              {mostrarGanadora && foto.ganadora && (
                <div style={styles.badgeWinner}>
                  <Trophy size={12} strokeWidth={2} />
                  Ganadora
                </div>
              )}
              {esMasVotada && (
                <div style={styles.badgeTop}>
                  <Star size={12} strokeWidth={2} fill="currentColor" />
                  Más votada
                </div>
              )}
            </div>
            <img
              src={foto.cloudinary_url}
              alt={foto.nombre_autor ?? "Foto del finde"}
              style={styles.img}
              loading="lazy"
              onPointerUp={(e) => handleImagePointerUp(e, foto)}
              onDoubleClick={() => meEncanta(foto)}
            />
            {heartBurst?.id === foto.id && (
              <HeartBurst
                key={heartBurst.key}
                size={96}
                onEnd={() => setHeartBurst(null)}
              />
            )}
            <div style={styles.overlay}>
              {/* Arriba izquierda: avatar + nombre + fecha (cabecera tipo post) */}
              <div style={styles.topInfo}>
                <span style={styles.avatar} aria-hidden="true">
                  {(foto.nombre_autor?.trim()?.[0] ?? "?").toUpperCase()}
                </span>
                <div style={styles.topMeta}>
                  {foto.nombre_autor && (
                    <span style={styles.autor}>{foto.nombre_autor}</span>
                  )}
                  <span style={styles.fecha}>
                    {new Date(foto.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                    {" · "}
                    {new Date(foto.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </div>
              {/* Abajo: votos + compartir a la izquierda, botón votar a la derecha */}
              <div style={styles.bottomRow}>
                <div style={styles.bottomLeft}>
                  <span style={styles.count}>
                    <Heart size={13} strokeWidth={2} fill="currentColor" />
                    {foto.votos_count}
                  </span>
                  <button
                    style={styles.shareBtn}
                    onClick={() => visor.abrir(i)}
                    aria-label="Ver foto"
                    title="Ver"
                  >
                    <Maximize2 size={14} strokeWidth={2} />
                  </button>
                  <button
                    style={styles.shareBtn}
                    onClick={() => visor.compartir(foto)}
                    aria-label="Compartir foto"
                    title="Compartir"
                  >
                    <Share2 size={14} strokeWidth={2} />
                  </button>
                </div>
                <button
                  style={{
                    ...styles.voteBtn,
                    ...(yaVotada ? styles.voteBtnDone : {}),
                  }}
                  onClick={() => handleVote(foto.id)}
                  disabled={voting[foto.id]}
                  title={yaVotada ? "Quitar voto" : "Votar"}
                >
                  <Heart size={13} strokeWidth={2} fill={yaVotada ? "currentColor" : "none"} />
                  {yaVotada ? "Votado" : "Votar"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
      <style>{pulseKeyframes}</style>
      <style>{gridResponsive}</style>
      </div>

      {visor.visor}
    </>
  );
}

const pulseKeyframes = `@keyframes lio-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`;

const gridResponsive = `
  @media (max-width: 1024px) {
    .lio-photo-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
  @media (max-width: 600px) {
    .lio-photo-grid { grid-template-columns: 1fr !important; }
  }
  .lio-photo-grid .foto-card {
    transition: box-shadow 0.25s ease;
  }
  .lio-photo-grid .foto-card:hover {
    box-shadow: 0 0 0 1px var(--accent), 0 0 24px 4px color-mix(in srgb, var(--accent) 30%, transparent);
    z-index: 1;
  }
  /* Botón del feed inmersivo: solo visible en móvil. */
  .lio-reels-trigger {
    display: none;
  }
  @media (max-width: 900px) {
    .lio-reels-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      width: 100%;
      margin-bottom: 12px;
      padding: 12px 16px;
      background: color-mix(in srgb, var(--accent) 8%, transparent);
      color: color-mix(in srgb, var(--accent) 85%, var(--text));
      border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
      border-radius: 999px;
      font-family: var(--font-mono);
      font-size: 0.68rem;
      font-weight: 500;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      cursor: pointer;
      transition: background 0.2s ease, border-color 0.2s ease;
    }
    .lio-reels-trigger:active {
      background: color-mix(in srgb, var(--accent) 16%, transparent);
      border-color: color-mix(in srgb, var(--accent) 50%, transparent);
    }
  }
`;

const styles: Record<string, CSSProperties> = {
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "2px",
    background: "var(--border)",
  },
  card: {
    position: "relative",
    background: "var(--surface)",
    aspectRatio: "3 / 4",
    overflow: "hidden",
  },
  img: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    touchAction: "manipulation",
    WebkitUserSelect: "none",
    userSelect: "none",
  },
  overlay: {
    position: "absolute",
    inset: 0,
    background:
      "linear-gradient(to bottom, rgba(8,8,16,0.7) 0%, transparent 35%, transparent 55%, rgba(8,8,16,0.88) 100%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    padding: "12px",
    // Deja pasar los clics a la imagen; los botones reactivan pointer-events.
    pointerEvents: "none",
  },
  topInfo: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "8px",
  },
  avatar: {
    flexShrink: 0,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "28px",
    height: "28px",
    borderRadius: "999px",
    background: "linear-gradient(135deg, var(--accent), var(--accent3))",
    color: "var(--bg)",
    fontFamily: "var(--font-display)",
    fontSize: "0.8rem",
    lineHeight: 1,
    letterSpacing: "0.02em",
    border: "1.5px solid color-mix(in srgb, var(--bg) 60%, transparent)",
  },
  topMeta: {
    display: "flex",
    flexDirection: "column",
    lineHeight: 1.15,
  },
  autor: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.65rem",
    fontWeight: 700,
    color: "var(--text)",
    letterSpacing: "0.05em",
  },
  fecha: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.58rem",
    color: "var(--text)",
    letterSpacing: "0.05em",
    opacity: 0.55,
  },
  bottomRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
  bottomLeft: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  shareBtn: {
    pointerEvents: "auto",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "26px",
    height: "26px",
    background: "color-mix(in srgb, var(--bg) 55%, transparent)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    borderRadius: "999px",
    cursor: "pointer",
    backdropFilter: "blur(4px)",
  },
  voteBtn: {
    pointerEvents: "auto",
    background: "transparent",
    color: "var(--accent)",
    border: "1px solid var(--accent)",
    padding: "6px 12px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.65rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    lineHeight: 1,
  },
  voteBtnDone: {
    background: "transparent",
    color: "var(--accent2)",
    border: "1px solid var(--accent2)",
  },
  count: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.65rem",
    color: "var(--accent)",
    letterSpacing: "0.05em",
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  badges: {
    position: "absolute",
    top: "12px",
    right: "12px",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "6px",
  },
  badgeTop: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    background: "var(--accent)",
    color: "var(--bg)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.55rem",
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    padding: "4px 10px",
    lineHeight: 1,
  },
  badgeWinner: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    background: "var(--accent3)",
    color: "#fff",
    fontFamily: "var(--font-mono)",
    fontSize: "0.55rem",
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    padding: "4px 10px",
    lineHeight: 1,
  },
  skeleton: {
    background: "var(--surface)",
    aspectRatio: "3 / 4",
    animation: "lio-pulse 1.4s ease-in-out infinite",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px",
    padding: "56px 24px",
    textAlign: "center",
  },
  empty: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.85rem",
    color: "var(--muted)",
    letterSpacing: "0.05em",
    margin: 0,
  },
  emptyBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    background: "var(--accent)",
    color: "var(--bg)",
    border: "none",
    padding: "12px 22px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    textDecoration: "none",
    cursor: "pointer",
    lineHeight: 1,
  },
};
