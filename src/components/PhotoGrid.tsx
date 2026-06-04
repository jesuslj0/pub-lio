import { useEffect, useState, type CSSProperties } from "react";
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
          <div key={foto.id} style={styles.card}>
            {esMasVotada && <div style={styles.badgeTop}>★ Más votada</div>}
            {mostrarGanadora && foto.ganadora && (
              <div style={styles.badgeWinner}>🏆 Ganadora</div>
            )}
            <img
              src={foto.cloudinary_url}
              alt={foto.nombre_autor ?? "Foto del finde"}
              style={styles.img}
              loading="lazy"
            />
            <div style={styles.overlay}>
              {foto.nombre_autor && (
                <span style={styles.autor}>{foto.nombre_autor}</span>
              )}
              <div style={styles.voteRow}>
                <button
                  style={{
                    ...styles.voteBtn,
                    ...(yaVotada ? styles.voteBtnDone : {}),
                  }}
                  onClick={() => handleVote(foto.id)}
                  disabled={yaVotada || voting[foto.id]}
                >
                  {yaVotada ? "♥ Votado" : "♥ Votar"}
                </button>
                <span style={styles.count}>{foto.votos_count} votos</span>
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
      "linear-gradient(to top, rgba(8,8,16,0.92) 0%, transparent 55%)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    gap: "8px",
    padding: "16px",
  },
  autor: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--text)",
    letterSpacing: "0.05em",
  },
  voteRow: {
    display: "flex",
    alignItems: "center",
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
  },
  badgeTop: {
    position: "absolute",
    top: "12px",
    left: "12px",
    zIndex: 2,
    background: "var(--accent)",
    color: "var(--bg)",
    fontFamily: "var(--font-mono)",
    fontSize: "0.55rem",
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    padding: "4px 10px",
  },
  badgeWinner: {
    position: "absolute",
    top: "12px",
    right: "12px",
    zIndex: 2,
    background: "var(--accent3)",
    color: "#fff",
    fontFamily: "var(--font-mono)",
    fontSize: "0.55rem",
    fontWeight: 700,
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    padding: "4px 10px",
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
