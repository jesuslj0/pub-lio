import { useEffect, useState, type CSSProperties } from "react";
import { Trophy, Heart, Crown, BarChart3, Medal } from "lucide-react";
import { supabase, getCurrentWeek } from "../lib/supabase";
import type { Foto } from "../lib/database.types";

type Variante = "actual" | "resultados";

interface LeaderboardProps {
  semana?: string;
  /**
   * "actual": clasificación en vivo de la semana en curso (estilo original).
   * "resultados": podio cerrado de la semana pasada (estética diferenciada).
   */
  variante?: Variante;
}

const RANK_COLORS = ["var(--accent)", "var(--accent3)", "var(--accent2)"];
// En la variante de resultados desplazamos el acento a cian/menta para que se
// lea como algo "cerrado/histórico" y no se confunda con la votación en vivo.
const RANK_COLORS_RESULTADOS = ["var(--accent3)", "var(--accent2)", "var(--muted)"];

export default function Leaderboard({
  semana = getCurrentWeek(),
  variante = "actual",
}: LeaderboardProps) {
  const esResultados = variante === "resultados";
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
        <BarChart3
          size={26}
          strokeWidth={1.5}
          color={esResultados ? "var(--accent3)" : "var(--accent)"}
        />
        <span style={styles.emptySub}>
          {esResultados
            ? "Sin resultados de la semana anterior."
            : "Aún no hay votos esta semana · ¡sé el primero!"}
        </span>
      </div>
    );
  }

  // ─── Variante "resultados": podio cerrado de la semana pasada ───
  if (esResultados) {
    // Puesto por votos (1º..3º). Si hay ganadora, se muestra destacada arriba y
    // se excluye del podio pequeño para no duplicarla.
    const restantesPodio = podio
      .map((foto, i) => ({ foto, rank: i + 1 }))
      .filter(({ foto }) => !(ganadora && ganadora.id === foto.id));

    // Item de podio pequeño (2º/3º). Se reutiliza con y sin ganadora.
    const podioItem = ({ foto, rank }: { foto: Foto; rank: number }) => (
      <li key={foto.id} style={styles.podiumItem}>
        <div style={styles.podiumThumbWrap}>
          <img
            src={foto.cloudinary_url}
            alt={foto.nombre_autor ?? `Puesto ${rank}`}
            style={styles.podiumThumb}
            loading="lazy"
          />
          <span
            style={{
              ...styles.podiumRank,
              color: RANK_COLORS_RESULTADOS[rank - 1] ?? "var(--muted)",
            }}
          >
            {rank}º
          </span>
        </div>
        <span style={styles.podiumName}>{foto.nombre_autor || "Anónimo"}</span>
        <span style={styles.podiumVotes}>
          <Heart size={12} strokeWidth={2} fill="var(--accent3)" style={iconStyle} />
          {foto.votos_count}
        </span>
      </li>
    );

    const ganadoraCard = ganadora && (
      <div className="lio-lb-result-winner" style={styles.winnerResult}>
        <div className="lio-lb-result-img" style={styles.winnerImgWrapResult}>
          <img
            src={ganadora.cloudinary_url}
            alt={ganadora.nombre_autor ?? "Foto ganadora"}
            style={styles.img}
            loading="lazy"
          />
          <span style={styles.crownResult}>
            <Crown size={14} strokeWidth={2} style={iconStyle} />
            Ganadora
          </span>
        </div>
        <div style={styles.winnerContent}>
          <span style={styles.winnerLabel}>Ganadora de la semana pasada</span>
          <h3 style={styles.winnerName}>{ganadora.nombre_autor || "Anónimo"}</h3>
          <span style={{ ...styles.winnerVotes, color: "var(--accent3)" }}>
            <Heart size={16} strokeWidth={2} fill="var(--accent3)" style={iconStyle} />
            {ganadora.votos_count} {ganadora.votos_count === 1 ? "voto" : "votos"}
          </span>
        </div>
      </div>
    );

    return (
      <div style={styles.wrap}>
        <style>{responsive}</style>
        <span style={{ ...styles.eyebrow, color: "var(--accent3)" }}>
          <Medal size={13} strokeWidth={2} style={iconStyle} />
          Resultados · Semana pasada
        </span>

        {ganadora ? (
          // Con ganadora: a la izquierda (grande) y 2º/3º en fila a la derecha,
          // más pequeñas. En móvil se apila en una sola columna.
          <div className="lio-lb-resultados-row" style={styles.resultadosRow}>
            <div style={styles.resultadosWinnerCol}>{ganadoraCard}</div>
            {restantesPodio.length > 0 && (
              <ol
                className="lio-lb-podium"
                style={{
                  ...styles.podium,
                  ...styles.podiumSide,
                  gridTemplateColumns: `repeat(${restantesPodio.length}, 1fr)`,
                }}
              >
                {restantesPodio.map(podioItem)}
              </ol>
            )}
          </div>
        ) : (
          // Sin ganadora: el top-3 por igual, a lo ancho.
          <ol
            className="lio-lb-podium"
            style={{
              ...styles.podium,
              gridTemplateColumns: `repeat(${restantesPodio.length}, 1fr)`,
            }}
          >
            {restantesPodio.map(podioItem)}
          </ol>
        )}
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
    /* Variante "actual" */
    .lio-lb-winner { flex-direction: column !important; }
    .lio-lb-winner .lio-lb-winner-img {
      width: 100% !important;
      min-width: 0 !important;
      aspect-ratio: 16 / 10;
    }
    /* Variante "resultados": ganadora a pantalla completa, imagen más grande */
    .lio-lb-resultados-row {
      flex-direction: column !important;
      align-items: stretch !important;
    }
    .lio-lb-result-winner { flex-direction: column !important; }
    .lio-lb-result-img {
      width: 100% !important;
      min-width: 0 !important;
      aspect-ratio: 4 / 5;
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
  // Fila de resultados: ganadora grande a la izquierda, 2º/3º a la derecha.
  resultadosRow: {
    display: "flex",
    gap: "16px",
    alignItems: "flex-start",
  },
  resultadosWinnerCol: {
    flex: "1.4 1 0",
    minWidth: 0,
    display: "flex",
  },
  podiumSide: {
    flex: "1 1 0",
    minWidth: 0,
  },
  // Ganadora destacada en la variante de resultados (acento cian, borde frío).
  winnerResult: {
    position: "relative",
    width: "100%",
    display: "flex",
    flexDirection: "row",
    background: "var(--surface)",
    border: "1px solid color-mix(in srgb, var(--accent3) 35%, var(--border))",
    overflow: "hidden",
    minHeight: "200px",
  },
  winnerImgWrap: {
    position: "relative",
    flexShrink: 0,
    width: "55%",
    minWidth: "200px",
  },
  // Imagen de la ganadora en resultados: proporción más vertical (3/4, como
  // las fotos subidas) para que se vea a tamaño más real y no tan recortada.
  winnerImgWrapResult: {
    position: "relative",
    flexShrink: 0,
    width: "45%",
    minWidth: "220px",
    aspectRatio: "3 / 4",
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
  crownResult: {
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
    background: "var(--accent3)",
    color: "var(--bg)",
    padding: "5px 10px",
  },
  // --- Podio compacto horizontal (variante resultados) ---
  podium: {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  },
  podiumItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    padding: "12px 10px",
    textAlign: "center",
  },
  podiumThumbWrap: {
    position: "relative",
    width: "100%",
    aspectRatio: "1 / 1",
  },
  podiumThumb: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    border: "1px solid var(--border)",
  },
  podiumRank: {
    position: "absolute",
    bottom: "-6px",
    left: "-6px",
    fontFamily: "var(--font-display)",
    fontSize: "1.5rem",
    lineHeight: 1,
    background: "var(--bg)",
    border: "1px solid var(--border)",
    padding: "2px 7px",
  },
  podiumName: {
    fontFamily: "var(--font-body)",
    fontSize: "0.82rem",
    color: "var(--text)",
    fontWeight: 500,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "100%",
  },
  podiumVotes: {
    display: "inline-flex",
    alignItems: "center",
    gap: "5px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.78rem",
    color: "var(--accent3)",
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
