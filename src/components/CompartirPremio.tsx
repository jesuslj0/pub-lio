import { useEffect, useRef, useState } from "react";
import { Share2, Check, MessageCircle, Send, Link2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import { imagenCompartir } from "../lib/cloudinary";
import type { Premio } from "../lib/database.types";

/**
 * Mini botón "Compartir premio" (píldora rosa) para promocionar el premio
 * semanal por WhatsApp, Telegram o copiando el enlace.
 *
 * En móvil usa la Web Share API adjuntando **la propia foto del premio** como
 * archivo, así en el chat sale la imagen (con el texto de pie). Si el navegador
 * no admite compartir archivos, cae a compartir texto + enlace, y en escritorio
 * despliega un menú con los canales principales.
 */
export default function CompartirPremio() {
  const [premio, setPremio] = useState<Premio | null>(null);
  const [abierto, setAbierto] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let activo = true;
    supabase
      .from("premios")
      .select("*")
      .eq("activo", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (activo) setPremio((data as Premio | null) ?? null);
      });
    return () => {
      activo = false;
    };
  }, []);

  // Cerrar el menú al hacer clic fuera o pulsar Escape.
  useEffect(() => {
    if (!abierto) return;
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setAbierto(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [abierto]);

  // Sin premio activo no mostramos el botón: no hay nada que compartir.
  if (!premio) return null;

  const url = typeof window !== "undefined" ? window.location.origin : "";

  const mensaje =
    `🎁🔥 ¡Mira el pedazo de premio semanal que hay en Lío El Bonillo este finde! ` +
    `Sube tu mejor foto del finde, consigue votos y llévatelo. 🪩🍸 ` +
    `¡Tenemos que participar! 👇`;

  const textoCompleto = url ? `${mensaje}\n${url}` : mensaje;

  // Intenta descargar la foto del premio como archivo para adjuntarla al compartir.
  async function cargarFoto(): Promise<File | null> {
    if (!premio?.imagen_url) return null;
    try {
      const res = await fetch(imagenCompartir(premio.imagen_url));
      if (!res.ok) return null;
      const blob = await res.blob();
      return new File([blob], "premio-lio-el-bonillo.jpg", {
        type: blob.type || "image/jpeg",
      });
    } catch {
      return null;
    }
  }

  async function compartir() {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;

    // 1) Móvil moderno: compartir la foto real + texto (sale la imagen en el chat).
    if (nav?.share && nav?.canShare) {
      const foto = await cargarFoto();
      if (foto && nav.canShare({ files: [foto] })) {
        try {
          await nav.share({ files: [foto], text: textoCompleto });
          return;
        } catch {
          return; // el usuario canceló
        }
      }
    }

    // 2) Web Share sin archivos: compartir texto + enlace.
    if (nav?.share) {
      try {
        await nav.share({
          title: "Premio semanal · Lío El Bonillo",
          text: mensaje,
          url,
        });
        return;
      } catch {
        return;
      }
    }

    // 3) Escritorio sin Web Share: menú de canales.
    setAbierto((v) => !v);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(textoCompleto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* sin portapapeles disponible */
    }
    setAbierto(false);
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(textoCompleto)}`;
  const telegramHref = `https://t.me/share/url?url=${encodeURIComponent(
    url,
  )}&text=${encodeURIComponent(mensaje)}`;

  return (
    <div className="lio-share" ref={wrapRef}>
      <style>{estilos}</style>
      <button
        type="button"
        className="lio-share-btn"
        onClick={compartir}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label="Compartir el premio semanal"
      >
        <Share2 size={15} strokeWidth={2} />
        <span>Compartir premio</span>
      </button>

      {abierto && (
        <div className="lio-share-menu" role="menu">
          <a
            className="lio-share-item"
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setAbierto(false)}
          >
            <MessageCircle size={16} strokeWidth={2} />
            WhatsApp
          </a>
          <a
            className="lio-share-item"
            href={telegramHref}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setAbierto(false)}
          >
            <Send size={16} strokeWidth={2} />
            Telegram
          </a>
          <button
            type="button"
            className="lio-share-item"
            role="menuitem"
            onClick={copiar}
          >
            {copiado ? (
              <Check size={16} strokeWidth={2} />
            ) : (
              <Link2 size={16} strokeWidth={2} />
            )}
            {copiado ? "¡Enlace copiado!" : "Copiar enlace"}
          </button>
        </div>
      )}
    </div>
  );
}

const estilos = `
  .lio-share {
    position: relative;
    display: inline-flex;
  }
  .lio-share-btn {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 7px 14px;
    border: none;
    border-radius: 999px;
    background: var(--accent);
    color: var(--bg);
    font-family: var(--font-mono);
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    white-space: nowrap;
    line-height: 1;
    cursor: pointer;
    box-shadow: 0 0 16px color-mix(in srgb, var(--accent) 45%, transparent);
    transition: transform 0.15s ease, box-shadow 0.2s ease;
    -webkit-tap-highlight-color: transparent;
  }
  .lio-share-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 0 22px color-mix(in srgb, var(--accent) 60%, transparent);
  }
  .lio-share-btn:active {
    transform: scale(0.96);
  }
  .lio-share-btn svg {
    flex-shrink: 0;
  }

  .lio-share-menu {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    z-index: 20;
    min-width: 200px;
    display: flex;
    flex-direction: column;
    padding: 6px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
    animation: lio-share-in 0.14s ease;
  }
  @keyframes lio-share-in {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .lio-share-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 10px 12px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--text);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    letter-spacing: 0.04em;
    text-align: left;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
  }
  .lio-share-item:hover {
    background: color-mix(in srgb, var(--accent) 14%, transparent);
    color: var(--accent);
  }
  .lio-share-item svg {
    flex-shrink: 0;
    color: var(--accent);
  }
`;
