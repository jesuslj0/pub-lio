import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  Heart,
  Share2,
  X,
  ChevronLeft,
  ChevronRight,
  Link2,
  Check,
  Maximize2,
} from "lucide-react";
import { siWhatsapp, siInstagram } from "simple-icons";
import type { Foto } from "../lib/database.types";

/** Campos que necesitan los visores (así valen consultas con columnas reducidas). */
export type FotoVisor = Pick<
  Foto,
  "id" | "cloudinary_url" | "nombre_autor" | "votos_count" | "created_at"
>;

// ─────────────────────────────────────────────────────────────────────────────
// Visores de fotos reutilizables (galería de la home e historial):
//   · Slider a pantalla completa (escritorio).
//   · Feed vertical tipo reels (móvil/tablet).
//   · Hoja de compartir (fallback cuando no hay menú nativo).
// Se usan a través del hook `useVisorFotos`.
// ─────────────────────────────────────────────────────────────────────────────

/** `true` si este dispositivo ya ha votado la foto (flag local). */
export const haVotado = (fotoId: string) =>
  typeof window !== "undefined" && localStorage.getItem(`voted_${fotoId}`) !== null;

const fechaCorta = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} · ${d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`;
};

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

// ─── Corazón animado (doble toque estilo Instagram) ───

export function HeartBurst({ size, onEnd }: { size: number; onEnd: () => void }) {
  return (
    <span style={styles.heartBurst} onAnimationEnd={onEnd} aria-hidden="true">
      <Heart size={size} strokeWidth={1.5} fill="currentColor" />
      <style>{heartKeyframes}</style>
    </span>
  );
}

/**
 * Detecta el doble toque en táctil. Usamos onPointerUp (no onClick) porque en
 * móvil el click llega con ~300ms de retardo y rompe la detección.
 */
export function useDobleToque(onDoble: (foto: FotoVisor) => void) {
  const lastTap = useRef<{ id: string; t: number } | null>(null);
  return (e: React.PointerEvent, foto: FotoVisor) => {
    if (e.pointerType !== "touch") return;
    const now = Date.now();
    const prev = lastTap.current;
    if (prev && prev.id === foto.id && now - prev.t < 300) {
      lastTap.current = null;
      onDoble(foto);
    } else {
      lastTap.current = { id: foto.id, t: now };
    }
  };
}

// ─── Hook principal ───

interface UseVisorFotosOptions {
  fotos: FotoVisor[];
  /** Si se pasa, el reels permite votar (botón y doble toque). Si no, solo lectura. */
  onVote?: (fotoId: string) => void;
  votando?: Record<string, boolean>;
}

export function useVisorFotos({ fotos, onVote, votando = {} }: UseVisorFotosOptions) {
  // Índice de la foto abierta en el slider (null = cerrado).
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Índice donde arranca el reels (null = cerrado).
  const [reelsStart, setReelsStart] = useState<number | null>(null);
  // Foto sobre la que se ha abierto la hoja de compartir (null = cerrada).
  const [shareTarget, setShareTarget] = useState<FotoVisor | null>(null);

  const compartir = async (foto: FotoVisor) => {
    // En móvil con menú nativo lo usamos directamente (incluye WhatsApp e
    // Instagram). Si no hay, abrimos nuestra hoja con opciones.
    const ok = await compartirNativo(foto);
    if (!ok) setShareTarget(foto);
  };

  // Abre el visor adecuado al tamaño: reels en móvil/tablet, slider en escritorio.
  const abrir = (i: number) => {
    if (window.matchMedia("(max-width: 900px)").matches) setReelsStart(i);
    else setOpenIndex(i);
  };

  const visor: ReactNode = (
    <>
      {openIndex !== null && fotos[openIndex] && (
        <SliderFotos
          fotos={fotos}
          index={openIndex}
          onIndex={setOpenIndex}
          onClose={() => setOpenIndex(null)}
          onShare={compartir}
        />
      )}
      {reelsStart !== null && (
        <ReelsFotos
          fotos={fotos}
          start={reelsStart}
          onClose={() => setReelsStart(null)}
          onShare={compartir}
          onVote={onVote}
          votando={votando}
        />
      )}
      {shareTarget && (
        <HojaCompartir foto={shareTarget} onClose={() => setShareTarget(null)} />
      )}
    </>
  );

  return { abrir, abrirReels: setReelsStart, compartir, visor };
}

// ─── Compartir ───

const textoCompartir = "Mira esta foto del finde en Lío El Bonillo 🪩";

// Compartimos la página de la app (no la URL directa de Cloudinary) para
// generar tráfico. La preview en WhatsApp/Instagram sigue siendo la foto
// gracias a las etiquetas Open Graph de /foto/[id].
const urlDe = (foto: FotoVisor) => `${window.location.origin}/foto/${foto.id}`;

async function compartirNativo(foto: FotoVisor) {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      // Incluimos la URL dentro del texto (no en un campo `url` aparte): en
      // Android, WhatsApp y otras apps solo despliegan la preview Open Graph
      // cuando el enlace forma parte del cuerpo del mensaje. Si va en el campo
      // `url` separado, muchas apps no hacen el unfurl y se comparte sin foto.
      await navigator.share({
        title: "Lío El Bonillo",
        text: `${textoCompartir} ${urlDe(foto)}`,
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

function HojaCompartir({ foto, onClose }: { foto: FotoVisor; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const compartirWhatsApp = () => {
    const txt = encodeURIComponent(`${textoCompartir} ${urlDe(foto)}`);
    window.open(`https://wa.me/?text=${txt}`, "_blank", "noopener,noreferrer");
    onClose();
  };

  const copiarEnlace = async (cerrarHoja = true) => {
    try {
      await navigator.clipboard.writeText(urlDe(foto));
      setCopied(true);
      if (cerrarHoja) setTimeout(onClose, 900);
    } catch {
      /* sin portapapeles */
    }
  };

  const compartirInstagram = async () => {
    // Instagram no admite compartir un enlace por web: copiamos el enlace y
    // abrimos Instagram para que el usuario lo pegue.
    const ok = await compartirNativo(foto);
    if (!ok) {
      await copiarEnlace(false);
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
      onClose();
    }
  };

  return (
    <div style={styles.shareOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div style={styles.shareSheet} onClick={(e) => e.stopPropagation()}>
        <div style={styles.shareHead}>
          <button style={styles.shareClose} onClick={onClose} aria-label="Cerrar">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div style={styles.shareOptions}>
          <button style={styles.shareOption} onClick={compartirWhatsApp}>
            <span style={{ ...styles.shareIcon, background: `#${siWhatsapp.hex}` }}>
              <BrandIcon icon={siWhatsapp} />
            </span>
            WhatsApp
          </button>
          <button style={styles.shareOption} onClick={compartirInstagram}>
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
          <button style={styles.shareOption} onClick={() => copiarEnlace()}>
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
  );
}

// ─── Slider a pantalla completa (escritorio) ───

function SliderFotos({
  fotos,
  index,
  onIndex,
  onClose,
  onShare,
}: {
  fotos: FotoVisor[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
  onShare: (foto: FotoVisor) => void;
}) {
  const touchX = useRef<number | null>(null);
  const foto = fotos[index];
  const anterior = () => onIndex((index - 1 + fotos.length) % fotos.length);
  const siguiente = () => onIndex((index + 1) % fotos.length);

  // Teclado: flechas para navegar, Esc para cerrar. Bloquea scroll de fondo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
  }, [index, fotos.length]);

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

  return (
    <div style={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <button
        style={{ ...styles.modalBtn, ...styles.modalClose }}
        onClick={onClose}
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
          src={foto.cloudinary_url}
          alt={foto.nombre_autor ?? "Foto del finde"}
          style={styles.modalImg}
        />
        <figcaption style={styles.modalCaption}>
          <div style={styles.modalInfo}>
            {foto.nombre_autor && <span style={styles.modalAutor}>{foto.nombre_autor}</span>}
            <span style={styles.count}>
              <Heart size={13} strokeWidth={2} fill="currentColor" />
              {foto.votos_count}
            </span>
            <span style={styles.modalContador}>
              {index + 1} / {fotos.length}
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
              onClick={() => onShare(foto)}
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
  );
}

// ─── Feed inmersivo tipo reels (scroll vertical con snap) ───

function ReelsFotos({
  fotos,
  start,
  onClose,
  onShare,
  onVote,
  votando,
}: {
  fotos: FotoVisor[];
  start: number;
  onClose: () => void;
  onShare: (foto: FotoVisor) => void;
  onVote?: (fotoId: string) => void;
  votando: Record<string, boolean>;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [heartBurst, setHeartBurst] = useState<{ id: string; key: number } | null>(null);

  // Doble toque = me encanta (solo si se puede votar).
  const onPointerUp = useDobleToque((foto) => {
    if (!onVote) return;
    setHeartBurst({ id: foto.id, key: Date.now() });
    if (!haVotado(foto.id)) onVote(foto.id);
  });

  // Salta a la foto de inicio, bloquea el scroll de fondo y cierra con Esc.
  useEffect(() => {
    const track = trackRef.current;
    if (track) track.scrollTop = start * track.clientHeight;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start]);

  return (
    <div className="lio-reels" role="dialog" aria-modal="true">
      <button type="button" className="lio-reels-close" onClick={onClose} aria-label="Cerrar">
        <X size={24} strokeWidth={2} />
      </button>

      <div className="lio-reels-track" ref={trackRef}>
        {fotos.map((foto) => {
          const yaVotada = haVotado(foto.id);
          return (
            <div key={foto.id} className="lio-reels-slide">
              <img
                src={foto.cloudinary_url}
                alt={foto.nombre_autor ?? "Foto del finde"}
                className="lio-reels-img"
                loading="lazy"
                onPointerUp={(e) => onPointerUp(e, foto)}
                onDoubleClick={() => {
                  if (!onVote) return;
                  setHeartBurst({ id: foto.id, key: Date.now() });
                  if (!yaVotada) onVote(foto.id);
                }}
              />
              {heartBurst?.id === foto.id && (
                <HeartBurst key={heartBurst.key} size={110} onEnd={() => setHeartBurst(null)} />
              )}

              {/* Columna de acciones a la derecha (estilo reels) */}
              <div className="lio-reels-actions">
                {onVote ? (
                  <button
                    type="button"
                    className="lio-reels-action"
                    onClick={() => onVote(foto.id)}
                    disabled={votando[foto.id]}
                    aria-label={yaVotada ? "Quitar voto" : "Votar"}
                  >
                    <Heart
                      size={30}
                      strokeWidth={2}
                      fill={yaVotada ? "var(--accent)" : "none"}
                      color={yaVotada ? "var(--accent)" : "#fff"}
                    />
                    <span>{foto.votos_count}</span>
                  </button>
                ) : (
                  // Solo lectura (historial): se muestran los votos sin poder votar.
                  <span className="lio-reels-action" aria-label={`${foto.votos_count} votos`}>
                    <Heart size={30} strokeWidth={2} fill="var(--accent)" color="var(--accent)" />
                    <span>{foto.votos_count}</span>
                  </span>
                )}
                <button
                  type="button"
                  className="lio-reels-action"
                  onClick={() => onShare(foto)}
                  aria-label="Compartir"
                >
                  <Share2 size={28} strokeWidth={2} />
                </button>
              </div>

              {/* Info del autor abajo a la izquierda */}
              <div className="lio-reels-info">
                <span className="lio-reels-avatar" aria-hidden="true">
                  {(foto.nombre_autor?.trim()?.[0] ?? "?").toUpperCase()}
                </span>
                <div className="lio-reels-meta">
                  {foto.nombre_autor && (
                    <span className="lio-reels-autor">{foto.nombre_autor}</span>
                  )}
                  <span className="lio-reels-fecha">{fechaCorta(foto.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <style>{reelsStyles}</style>
    </div>
  );
}

const heartKeyframes = `@keyframes lio-heart-burst {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.3); }
  15%  { opacity: 1; transform: translate(-50%, -50%) scale(1.15); }
  30%  { transform: translate(-50%, -50%) scale(0.95); }
  45%  { transform: translate(-50%, -50%) scale(1); }
  70%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.1); }
}`;

// Estilos del overlay "reels" (scroll vertical a pantalla completa).
const reelsStyles = `
  .lio-reels {
    position: fixed;
    inset: 0;
    z-index: 9994;
    background: #000;
  }
  .lio-reels-close {
    position: absolute;
    top: max(14px, env(safe-area-inset-top));
    right: 14px;
    z-index: 2;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: rgba(8, 8, 16, 0.55);
    backdrop-filter: blur(6px);
    color: #fff;
    cursor: pointer;
  }
  .lio-reels-track {
    height: 100%;
    overflow-y: scroll;
    overflow-x: hidden;
    scroll-snap-type: y mandatory;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .lio-reels-track::-webkit-scrollbar { width: 0; height: 0; display: none; }
  .lio-reels-slide {
    position: relative;
    height: 100%;
    width: 100%;
    scroll-snap-align: start;
    scroll-snap-stop: always;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .lio-reels-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #000;
    user-select: none;
    -webkit-user-select: none;
    touch-action: manipulation;
  }
  .lio-reels-actions {
    position: absolute;
    right: 14px;
    bottom: calc(28px + env(safe-area-inset-bottom));
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 22px;
  }
  .lio-reels-action {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    background: transparent;
    border: none;
    color: #fff;
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 0.62rem;
    letter-spacing: 0.05em;
    filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.6));
  }
  span.lio-reels-action,
  .lio-reels-action:disabled { cursor: default; }
  .lio-reels-info {
    position: absolute;
    left: 16px;
    right: 78px;
    bottom: calc(28px + env(safe-area-inset-bottom));
    z-index: 2;
    display: flex;
    align-items: center;
    gap: 10px;
    filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.7));
  }
  .lio-reels-avatar {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 999px;
    background: linear-gradient(135deg, var(--accent), var(--accent3));
    color: var(--bg);
    font-family: var(--font-display);
    font-size: 1rem;
    border: 1.5px solid rgba(255, 255, 255, 0.25);
  }
  .lio-reels-meta {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
    min-width: 0;
  }
  .lio-reels-autor {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    font-weight: 700;
    color: #fff;
  }
  .lio-reels-fecha {
    font-family: var(--font-mono);
    font-size: 0.62rem;
    color: rgba(255, 255, 255, 0.7);
  }
`;

const styles: Record<string, CSSProperties> = {
  heartBurst: {
    position: "absolute",
    top: "50%",
    left: "50%",
    color: "#fff",
    pointerEvents: "none",
    zIndex: 3,
    filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.45))",
    animation: "lio-heart-burst 0.9s ease-out forwards",
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
  // ─── Slider ───
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
};
