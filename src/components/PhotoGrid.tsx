import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Heart,
  Star,
  Trophy,
  Share2,
  X,
  ChevronLeft,
  ChevronRight,
  Link2,
  Check,
  Maximize2,
} from "lucide-react";
import { siWhatsapp, siInstagram } from "simple-icons";

// Renderiza un logo de marca (simple-icons) a partir de su path SVG.
function BrandIcon({
  icon,
  size = 20,
  color = "#fff",
}: {
  icon: { path: string; title: string };
  size?: number;
  color?: string;
}) {
  return (
    <svg
      role="img"
      aria-label={icon.title}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
    >
      <path d={icon.path} />
    </svg>
  );
}
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
  // Índice de la foto abierta en el visor a pantalla completa (null = cerrado).
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Foto sobre la que se ha abierto la hoja de compartir (null = cerrada).
  const [shareTarget, setShareTarget] = useState<Foto | null>(null);
  const [copied, setCopied] = useState(false);
  const touchX = useRef<number | null>(null);

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

  // ─── Visor / slider ───
  const cerrar = () => setOpenIndex(null);
  const irA = (i: number) =>
    setOpenIndex((prev) =>
      prev === null ? prev : (i + fotos.length) % fotos.length,
    );
  const anterior = () => openIndex !== null && irA(openIndex - 1);
  const siguiente = () => openIndex !== null && irA(openIndex + 1);

  // Teclado: flechas para navegar, Esc para cerrar. Bloquea scroll de fondo.
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") cerrar();
      else if (e.key === "ArrowLeft") anterior();
      else if (e.key === "ArrowRight") siguiente();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex, fotos.length]);

  // Swipe en táctil dentro del visor.
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (Math.abs(dx) > 50) (dx > 0 ? anterior : siguiente)();
    touchX.current = null;
  };

  const verPantallaCompleta = () => {
    const el = document.getElementById("lio-visor-img");
    if (el?.requestFullscreen) el.requestFullscreen().catch(() => {});
  };

  // ─── Compartir ───
  const textoCompartir = "Mira esta foto del finde en Lío El Bonillo 🪩";
  // Compartimos la página de la app (no la URL directa de Cloudinary) para
  // generar tráfico. La preview en WhatsApp/Instagram sigue siendo la foto
  // gracias a las etiquetas Open Graph de /foto/[id].
  const urlDe = (foto: Foto) =>
    typeof window !== "undefined"
      ? `${window.location.origin}/foto/${foto.id}`
      : `/foto/${foto.id}`;

  const compartirNativo = async (foto: Foto) => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Lío El Bonillo",
          text: textoCompartir,
          url: urlDe(foto),
        });
        return true;
      } catch {
        return false;
      }
    }
    return false;
  };

  const abrirCompartir = async (foto: Foto) => {
    // En móvil con menú nativo lo usamos directamente (incluye WhatsApp e
    // Instagram). Si no hay, abrimos nuestra hoja con opciones.
    const ok = await compartirNativo(foto);
    if (!ok) {
      setCopied(false);
      setShareTarget(foto);
    }
  };

  const compartirWhatsApp = (foto: Foto) => {
    const txt = encodeURIComponent(`${textoCompartir} ${urlDe(foto)}`);
    window.open(`https://wa.me/?text=${txt}`, "_blank", "noopener,noreferrer");
    setShareTarget(null);
  };

  const compartirInstagram = async (foto: Foto) => {
    // Instagram no admite compartir un enlace por web: copiamos el enlace y
    // abrimos Instagram para que el usuario lo pegue.
    const ok = await compartirNativo(foto);
    if (!ok) {
      await copiarEnlace(foto, false);
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      setShareTarget(null);
    }
  };

  const copiarEnlace = async (foto: Foto, cerrarHoja = true) => {
    try {
      await navigator.clipboard.writeText(urlDe(foto));
      setCopied(true);
      if (cerrarHoja) setTimeout(() => setShareTarget(null), 900);
    } catch {
      /* sin portapapeles */
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
      {fotos.map((foto, i) => {
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
              onClick={() => setOpenIndex(i)}
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
              {/* Abajo: votos + compartir a la izquierda, botón votar a la derecha */}
              <div style={styles.bottomRow}>
                <div style={styles.bottomLeft}>
                  <span style={styles.count}>
                    <Heart size={13} strokeWidth={2} fill="currentColor" />
                    {foto.votos_count}
                  </span>
                  <button
                    style={styles.shareBtn}
                    onClick={() => abrirCompartir(foto)}
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

      {/* ─── Visor a pantalla completa / slider ─── */}
      {openIndex !== null && fotos[openIndex] && (
        <div
          style={styles.modalOverlay}
          onClick={cerrar}
          role="dialog"
          aria-modal="true"
        >
          <button
            style={{ ...styles.modalBtn, ...styles.modalClose }}
            onClick={cerrar}
            aria-label="Cerrar"
          >
            <X size={22} strokeWidth={2} />
          </button>

          {fotos.length > 1 && (
            <button
              style={{ ...styles.modalBtn, ...styles.modalPrev }}
              onClick={(e) => {
                e.stopPropagation();
                anterior();
              }}
              aria-label="Anterior"
            >
              <ChevronLeft size={28} strokeWidth={2} />
            </button>
          )}

          <figure
            style={styles.modalFigure}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <img
              id="lio-visor-img"
              src={fotos[openIndex].cloudinary_url}
              alt={fotos[openIndex].nombre_autor ?? "Foto del finde"}
              style={styles.modalImg}
            />
            <figcaption style={styles.modalCaption}>
              <div style={styles.modalInfo}>
                {fotos[openIndex].nombre_autor && (
                  <span style={styles.modalAutor}>
                    {fotos[openIndex].nombre_autor}
                  </span>
                )}
                <span style={styles.count}>
                  <Heart size={13} strokeWidth={2} fill="currentColor" />
                  {fotos[openIndex].votos_count}
                </span>
                <span style={styles.modalContador}>
                  {openIndex + 1} / {fotos.length}
                </span>
              </div>
              <div style={styles.modalActions}>
                <button
                  style={styles.modalActionBtn}
                  onClick={verPantallaCompleta}
                  aria-label="Pantalla completa"
                  title="Pantalla completa"
                >
                  <Maximize2 size={16} strokeWidth={2} />
                </button>
                <button
                  style={styles.modalActionBtn}
                  onClick={() => abrirCompartir(fotos[openIndex])}
                  aria-label="Compartir"
                  title="Compartir"
                >
                  <Share2 size={16} strokeWidth={2} />
                </button>
              </div>
            </figcaption>
          </figure>

          {fotos.length > 1 && (
            <button
              style={{ ...styles.modalBtn, ...styles.modalNext }}
              onClick={(e) => {
                e.stopPropagation();
                siguiente();
              }}
              aria-label="Siguiente"
            >
              <ChevronRight size={28} strokeWidth={2} />
            </button>
          )}
        </div>
      )}

      {/* ─── Hoja de compartir (fallback sin menú nativo) ─── */}
      {shareTarget && (
        <div
          style={styles.shareOverlay}
          onClick={() => setShareTarget(null)}
          role="dialog"
          aria-modal="true"
        >
          <div style={styles.shareSheet} onClick={(e) => e.stopPropagation()}>
            <div style={styles.shareHead}>
              <span style={styles.shareTitle}>Compartir</span>
              <button
                style={styles.shareClose}
                onClick={() => setShareTarget(null)}
                aria-label="Cerrar"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>
            <div style={styles.shareOptions}>
              <button
                style={styles.shareOption}
                onClick={() => compartirWhatsApp(shareTarget)}
              >
                <span style={{ ...styles.shareIcon, background: `#${siWhatsapp.hex}` }}>
                  <BrandIcon icon={siWhatsapp} />
                </span>
                WhatsApp
              </button>
              <button
                style={styles.shareOption}
                onClick={() => compartirInstagram(shareTarget)}
              >
                <span
                  style={{
                    ...styles.shareIcon,
                    background:
                      "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
                  }}
                >
                  <BrandIcon icon={siInstagram} />
                </span>
                Instagram
              </button>
              <button
                style={styles.shareOption}
                onClick={() => copiarEnlace(shareTarget)}
              >
                <span style={{ ...styles.shareIcon, background: "var(--surface)" }}>
                  {copied ? (
                    <Check size={20} strokeWidth={2} color="var(--accent)" />
                  ) : (
                    <Link2 size={20} strokeWidth={2} color="var(--text)" />
                  )}
                </span>
                {copied ? "¡Copiado!" : "Copiar enlace"}
              </button>
            </div>
          </div>
        </div>
      )}

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
    cursor: "pointer",
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
  // ─── Visor / slider ───
  modalOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9990,
    background: "rgba(4, 4, 10, 0.92)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
  },
  modalFigure: {
    position: "relative",
    margin: 0,
    maxWidth: "min(92vw, 700px)",
    maxHeight: "88vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  modalImg: {
    maxWidth: "100%",
    maxHeight: "78vh",
    objectFit: "contain",
    display: "block",
    border: "1px solid var(--border)",
  },
  modalCaption: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    padding: "12px 4px 0",
  },
  modalInfo: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    flexWrap: "wrap",
  },
  modalAutor: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    color: "var(--text)",
    letterSpacing: "0.05em",
  },
  modalContador: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    color: "var(--muted)",
    letterSpacing: "0.1em",
  },
  modalActions: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  modalActionBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "38px",
    height: "38px",
    background: "var(--surface)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    cursor: "pointer",
    borderRadius: "999px",
  },
  modalBtn: {
    position: "absolute",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "44px",
    height: "44px",
    background: "color-mix(in srgb, var(--surface) 80%, transparent)",
    border: "1px solid var(--border)",
    color: "var(--text)",
    cursor: "pointer",
    borderRadius: "999px",
    zIndex: 9991,
  },
  modalClose: {
    top: "20px",
    right: "20px",
  },
  modalPrev: {
    left: "16px",
    top: "50%",
    transform: "translateY(-50%)",
  },
  modalNext: {
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
  },
  // ─── Hoja de compartir ───
  shareOverlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9995,
    background: "rgba(4, 4, 10, 0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  shareSheet: {
    width: "100%",
    maxWidth: "420px",
    background: "var(--bg2)",
    border: "1px solid var(--border)",
    borderBottom: "none",
    borderRadius: "20px 20px 0 0",
    padding: "20px 20px 28px",
  },
  shareHead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "18px",
  },
  shareTitle: {
    fontFamily: "var(--font-display)",
    fontSize: "1.6rem",
    letterSpacing: "0.03em",
    color: "var(--text)",
  },
  shareClose: {
    display: "inline-flex",
    background: "transparent",
    border: "none",
    color: "var(--muted)",
    cursor: "pointer",
  },
  shareOptions: {
    display: "flex",
    justifyContent: "space-around",
    gap: "12px",
  },
  shareOption: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    background: "transparent",
    border: "none",
    color: "var(--text)",
    cursor: "pointer",
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    letterSpacing: "0.03em",
  },
  shareIcon: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "56px",
    height: "56px",
    borderRadius: "999px",
    border: "1px solid var(--border)",
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
