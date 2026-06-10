import { useEffect, useState, type CSSProperties } from "react";
import { Trophy, Heart, Crown, BarChart3 } from "lucide-react";
import { supabase, getCurrentWeek } from "../lib/supabase";
import type { Foto } from "../lib/database.types";

interface LeaderboardProps {
  semana?: string;
}

const RANK_COLORS = ["var(--accent)", "var(--accent3)", "var(--accent2)"];

export default function Leaderboard({
  semana = getCurrentWeek(),
}: LeaderboardProps) {
  const [podio, setPodio] = useState<Foto[]>([]);
  const [ganadora, setGanadora] = useState<Foto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;

    async function cargar() {
      // Top fotos aprobadas de la semana, ordenadas por votos.
      const { data, error } = await supabase
        .from("fotos")
        .select("*")
        .eq("semana", semana)
        .eq("estado", "aprobada")
        .order("votos_count", { ascending: false })
        .limit(6);

      if (!activo) return;
      if (error) {
        console.error(error);
        setPodio([]);
        setGanadora(null);
      } else {
        const fotos = data ?? [];
        setGanadora(fotos.find((f) => f.ganadora) ?? null);
        setPodio(fotos.slice(0, 3));
      }
      setLoading(false);
    }

    cargar();

    // Mantener la clasificación viva mientras llegan votos.
    const channel = supabase
      .channel(`leaderboard-${semana}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "fotos",
          filter: `semana=eq.${semana}`,
        },
        () => cargar(),
      )
      .subscribe();

    return () => {
      activo = false;
      supabase.removeChannel(channel);
    };
  }, [semana]);

  if (loading) {
    return (
      <div style={styles.skeleton}>
        <style>{pulse}</style>
      </div>
    );
  }

  if (podio.length === 0) {
    return (
      <div style={styles.empty}>
        <BarChart3 size={26} strokeWidth={1.5} color="var(--accent)" />
        <span style={styles.emptySub}>
          Aún no hay votos esta semana · ¡sé el primero!
        </span>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <style>{responsive}</style>
      <span style={styles.eyebrow}>
        <Trophy size={13} strokeWidth={2} style={iconStyle} />
        Clasificación · Top votos
      </span>

      {ganadora && (
        <div className="lio-lb-winner" style={styles.winner}>
          <div className="lio-lb-winner-img" style={styles.winnerImgWrap}>
            <img
              src={ganadora.cloudinary_url}
              alt={ganadora.nombre_autor ?? "Foto ganadora"}
              style={styles.img}
              loading="lazy"
            />
            <span style={styles.crown}>
              <Crown size={14} strokeWidth={2} style={iconStyle} />
              Ganadora
            </span>
          </div>
          <div style={styles.winnerContent}>
            <span style={styles.winnerLabel}>Foto ganadora de la semana</span>
            <h3 style={styles.winnerName}>
              {ganadora.nombre_autor || "Anónimo"}
            </h3>
            <span style={styles.winnerVotes}>
              <Heart size={16} strokeWidth={2} fill="var(--accent)" style={iconStyle} />
              {ganadora.votos_count} {ganadora.votos_count === 1 ? "voto" : "votos"}
            </span>
          </div>
        </div>
      )}

      <ol style={styles.list}>
        {podio.map((foto, i) => {
          const esGanadora = ganadora?.id === foto.id;
          return (
            <li
              key={foto.id}
              style={{
                ...styles.row,
                ...(i === 0 && !ganadora ? styles.rowLeader : null),
                ...(esGanadora ? styles.rowIsWinner : null),
              }}
            >
              <span
                style={{ ...styles.rank, color: RANK_COLORS[i] ?? "var(--muted)" }}
              >
                {i + 1}<span style={{ fontSize: "0.5em", verticalAlign: "super" }}>º</span>
              </span>
              <div style={styles.thumbWrap}>
                <img
                  src={foto.cloudinary_url}
                  alt={foto.nombre_autor ?? `Puesto ${i + 1}`}
                  style={styles.thumb}
                  loading="lazy"
                />
                {esGanadora && (
                  <span style={styles.thumbCrown}>
                    <Crown size={11} strokeWidth={2.5} />
                  </span>
                )}
              </div>
              <span style={styles.rowName}>{foto.nombre_autor || "Anónimo"}</span>
              <span style={styles.rowVotes}>
                <Heart
                  size={14}
                  strokeWidth={2}
                  fill={i === 0 ? "var(--accent)" : "none"}
                  color={i === 0 ? "var(--accent)" : "var(--muted)"}
                  style={iconStyle}
                />
                {foto.votos_count}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const pulse = `@keyframes lio-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`;

const iconStyle: CSSProperties = { flexShrink: 0 };

const responsive = `
  @media (max-width: 600px) {
    .lio-lb-winner { flex-direction: column !important; }
    .lio-lb-winner .lio-lb-winner-img {
      width: 100% !important;
      min-width: 0 !important;
      aspect-ratio: 16 / 10;
    }
  }
`;

const styles: Record<string, CSSProperties> = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  eyebrow: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.6rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    color: "var(--accent)",
  },
  // --- Ganadora destacada ---
  winner: {
    position: "relative",
    display: "flex",
    flexDirection: "row",
    background: "var(--surface)",
    border: "1px solid color-mix(in srgb, var(--accent) 35%, var(--border))",
    overflow: "hidden",
    minHeight: "200px",
  },
  winnerImgWrap: {
    position: "relative",
    flexShrink: 0,
    width: "55%",
    minWidth: "200px",
  },
  img: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  crown: {
    position: "absolute",
    top: "12px",
    left: "12px",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.6rem",
    letterSpacing: "0.15em",
    textTransform: "uppercase",
    fontWeight: 700,
    background: "var(--accent)",
    color: "var(--bg)",
    padding: "5px 10px",
  },
  winnerContent: {
    flex: 1,
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "10px",
  },
  winnerLabel: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.6rem",
    letterSpacing: "0.18em",
    textTransform: "uppercase",
    color: "var(--muted)",
  },
  winnerName: {
    fontFamily: "var(--font-display)",
    fontSize: "2.2rem",
    lineHeight: 1,
    color: "var(--text)",
  },
  winnerVotes: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.95rem",
    color: "var(--accent)",
    fontWeight: 700,
  },
  // --- Lista podio ---
  list: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    padding: "12px 16px",
  },
  rowLeader: {
    border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--border))",
  },
  rowIsWinner: {
    border: "1px solid color-mix(in srgb, var(--accent) 45%, var(--border))",
    background:
      "linear-gradient(90deg, color-mix(in srgb, var(--accent) 8%, var(--surface)), var(--surface))",
  },
  rank: {
    fontFamily: "var(--font-display)",
    fontSize: "1.8rem",
    lineHeight: 1,
    width: "30px",
    textAlign: "center",
    flexShrink: 0,
  },
  thumbWrap: {
    position: "relative",
    flexShrink: 0,
    width: "52px",
    height: "52px",
  },
  thumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    border: "1px solid var(--border)",
  },
  thumbCrown: {
    position: "absolute",
    top: "-7px",
    right: "-7px",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    background: "var(--accent)",
    color: "var(--bg)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  rowName: {
    flex: 1,
    fontFamily: "var(--font-body)",
    fontSize: "0.95rem",
    color: "var(--text)",
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  rowVotes: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.85rem",
    color: "var(--muted)",
    flexShrink: 0,
  },
  // --- Estados ---
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "32px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
  },
  emptySub: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--muted)",
    letterSpacing: "0.08em",
    textAlign: "center",
  },
  skeleton: {
    minHeight: "180px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    animation: "lio-pulse 1.4s ease-in-out infinite",
  },
};
