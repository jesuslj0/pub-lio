import { useEffect, useState, type CSSProperties } from "react";
import { Gift, CalendarClock, Hourglass } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { Premio } from "../lib/database.types";

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

export default function PremioSemanal() {
  const [premio, setPremio] = useState<Premio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;
    async function cargar() {
      const { data, error } = await supabase
        .from("premios")
        .select("*")
        .eq("activo", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!activo) return;
      if (error) console.error(error);
      setPremio(data ?? null);
      setLoading(false);
    }
    cargar();
    return () => {
      activo = false;
    };
  }, []);

  if (loading) {
    return (
      <div style={{ ...styles.card, ...styles.skeleton }}>
        <style>{pulse}</style>
      </div>
    );
  }

  if (!premio) {
    return (
      <div style={styles.placeholder}>
        <Gift size={32} strokeWidth={1.5} color="var(--accent)" />
        <span style={styles.placeholderSub}>
          <CalendarClock size={14} strokeWidth={2} />
          Premio de la semana · Próximamente
        </span>
      </div>
    );
  }

  const valido = formatearFecha(premio.valido_hasta);

  return (
    <div style={styles.card}>
      {premio.imagen_url && (
        <div style={styles.imgWrap}>
          <img src={premio.imagen_url} alt={premio.titulo} style={styles.img} />
        </div>
      )}
      <div style={styles.content}>
        <span style={styles.badge}>
          <Gift size={13} strokeWidth={2} />
          Premio de la semana
        </span>
        <h3 style={styles.titulo}>{premio.titulo}</h3>
        {premio.descripcion && (
          <p style={styles.descripcion}>{premio.descripcion}</p>
        )}
        {valido && (
          <p style={styles.valido}>
            <Hourglass size={14} strokeWidth={2} />
            Válido hasta el {valido}
          </p>
        )}
      </div>
    </div>
  );
}

const pulse = `@keyframes lio-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`;

const styles: Record<string, CSSProperties> = {
  card: {
    position: "relative",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    display: "flex",
    flexDirection: "row",
    overflow: "hidden",
    minHeight: "220px",
  },
  imgWrap: {
    position: "relative",
    flexShrink: 0,
    width: "40%",
    minWidth: "180px",
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
    flex: 1,
    padding: "32px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
    width: "fit-content",
    fontFamily: "var(--font-mono)",
    fontSize: "0.6rem",
    letterSpacing: "0.2em",
    textTransform: "uppercase",
    background: "var(--accent)",
    color: "var(--bg)",
    padding: "5px 12px",
    fontWeight: 700,
    marginBottom: "14px",
  },
  titulo: {
    fontFamily: "var(--font-display)",
    fontSize: "2.5rem",
    lineHeight: 1,
    color: "var(--text)",
  },
  descripcion: {
    fontFamily: "var(--font-body)",
    fontSize: "0.95rem",
    color: "var(--muted)",
    marginTop: "12px",
    fontWeight: 300,
    maxWidth: "440px",
  },
  valido: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--accent)",
    letterSpacing: "0.1em",
    marginTop: "16px",
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },
  placeholder: {
    position: "relative",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    minHeight: "220px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    backgroundImage:
      "repeating-linear-gradient(45deg, transparent, transparent 30px, color-mix(in srgb, var(--accent) 2%, transparent) 30px, color-mix(in srgb, var(--accent) 2%, transparent) 31px)",
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
