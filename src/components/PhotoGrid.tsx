import { useEffect, useState, type CSSProperties } from "react";
import { Heart, Star, Trophy } from "lucide-react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { supabase, getCurrentWeek } from "../lib/supabase";
import type { Foto } from "../lib/database.types";

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

  const handleVote = async (fotoId: string) => {
    if (localStorage.getItem(`voted_${fotoId}`) || voting[fotoId]) return;
    setVoting((v) => ({ ...v, [fotoId]: true }));
    try {
      const fingerprint = await getFingerprint();
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fotoId, fingerprint }),
      });
      const data = (await res.json()) as {
        success: boolean;
        newCount?: number;
        reason?: string;
      };

      if (data.success || res.status === 409) {
        // Marcar como votado tanto si fue exitoso como si ya había votado.
        localStorage.setItem(`voted_${fotoId}`, "1");
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
      <p style={styles.empty}>No hay fotos esta semana. ¡Sé el primero!</p>
    );
  }

  return (
    <div className="lio-photo-grid" style={styles.grid}>
      {fotos.map((foto) => {
        const yaVotada =
          typeof window !== "undefined" &&
          localStorage.getItem(`voted_${foto.id}`) !== null;
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
            />
            <div style={styles.overlay}>
              {/* Arriba izquierda: nombre + fecha */}
              <div style={styles.topInfo}>
                {foto.nombre_autor && (
                  <span style={styles.autor}>{foto.nombre_autor}</span>
                )}
                <span style={styles.fecha}>
                  · {new Date(foto.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "short" })}
                </span>
              </div>
              {/* Abajo: votos izquierda, botón derecha */}
              <div style={styles.bottomRow}>
                <span style={styles.count}>
                  <Heart size={13} strokeWidth={2} fill="currentColor" />
                  {foto.votos_count}
                </span>
                <button
                  style={{
                    ...styles.voteBtn,
                    ...(yaVotada ? styles.voteBtnDone : {}),
                  }}
                  onClick={() => handleVote(foto.id)}
                  disabled={yaVotada || voting[foto.id]}
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
  },
  topInfo: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "8px",
  },
  autor: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.65rem",
    color: "var(--text)",
    letterSpacing: "0.05em",
  },
  fecha: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.6rem",
    color: "var(--text)",
    letterSpacing: "0.05em",
    opacity: 0.6,
  },
  bottomRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },
  voteBtn: {
    background: "var(--accent)",
    color: "var(--bg)",
    border: "none",
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
    background: "var(--accent2)",
    color: "#fff",
    cursor: "default",
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
  empty: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.85rem",
    color: "var(--muted)",
    letterSpacing: "0.05em",
    padding: "40px 0",
    textAlign: "center",
  },
};
