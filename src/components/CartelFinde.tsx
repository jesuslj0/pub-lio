import { useEffect, useState, type CSSProperties } from "react";
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
      <div style={{ ...styles.card, ...styles.skeleton }}>
        <style>{pulse}</style>
      </div>
    );
  }

  if (!cartel) {
    return (
      <div style={styles.placeholder}>
        <div style={styles.placeholderText}>
          CARTEL
          <br />
          FINDE
        </div>
        <span style={styles.placeholderSub}>
          // Próximamente · Pdte. confirmar
        </span>
      </div>
    );
  }

  const rango = [formatearFecha(cartel.fecha_inicio), formatearFecha(cartel.fecha_fin)]
    .filter(Boolean)
    .join(" — ");

  return (
    <div style={styles.card}>
      {cartel.imagen_url && (
        <img src={cartel.imagen_url} alt={cartel.titulo} style={styles.img} />
      )}
      <div style={styles.content}>
        <span style={styles.badge}>Esta semana</span>
        <h3 style={styles.titulo}>{cartel.titulo}</h3>
        {cartel.subtitulo && <p style={styles.subtitulo}>{cartel.subtitulo}</p>}
        {rango && <p style={styles.fecha}>// {rango}</p>}
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
    minHeight: "520px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    overflow: "hidden",
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
  },
  fecha: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--muted)",
    letterSpacing: "0.1em",
    marginTop: "8px",
  },
  placeholder: {
    position: "relative",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    minHeight: "520px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    backgroundImage:
      "repeating-linear-gradient(45deg, transparent, transparent 30px, rgba(200,240,38,0.02) 30px, rgba(200,240,38,0.02) 31px)",
  },
  placeholderText: {
    fontFamily: "var(--font-display)",
    fontSize: "5rem",
    color: "rgba(200,240,38,0.06)",
    letterSpacing: "0.1em",
    textAlign: "center",
    lineHeight: 0.9,
  },
  placeholderSub: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--muted)",
    letterSpacing: "0.1em",
  },
  skeleton: {
    animation: "lio-pulse 1.4s ease-in-out infinite",
  },
};
