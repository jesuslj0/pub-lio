import { useRef, useState, type CSSProperties } from "react";
import { Camera, Images } from "lucide-react";
import FingerprintJS from "@fingerprintjs/fingerprintjs";
import { uploadToCloudinary } from "../lib/cloudinary";

type Estado =
  | "idle"
  | "previewing"
  | "uploading"
  | "success"
  | "error"
  | "limit_reached";

async function getFingerprint(): Promise<string> {
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId;
}

export default function PhotoUploader() {
  const [estado, setEstado] = useState<Estado>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [nombreAutor, setNombreAutor] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const camaraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setEstado("previewing");
  };

  const reset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl("");
    setNombreAutor("");
    setErrorMsg("");
    setEstado("idle");
    if (camaraRef.current) camaraRef.current.value = "";
    if (galeriaRef.current) galeriaRef.current.value = "";
  };

  const handleConfirm = async () => {
    if (!file) return;
    if (nombreAutor.length < 3) {
      setErrorMsg("El nombre debe tener almenos 3 letras");
      return;
    }
    setEstado("uploading");
    setErrorMsg("");

    try {
      const fingerprint = await getFingerprint();

      // 1. Comprobar límite semanal.
      const limitRes = await fetch("/api/check-limit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint }),
      });
      const limitData = (await limitRes.json()) as {
        allowed: boolean;
        count: number;
        limit: number;
      };

      if (!limitData.allowed) {
        setEstado("limit_reached");
        return;
      }

      // 2. Subir imagen a Cloudinary.
      const cloudinaryUrl = await uploadToCloudinary(file);

      // 3. Registrar la foto en el servidor.
      const uploadRes = await fetch("/api/upload-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cloudinaryUrl,
          nombreAutor: nombreAutor.trim(),
          fingerprint,
        }),
      });
      const uploadData = (await uploadRes.json()) as {
        success: boolean;
        fotoId?: string;
      };

      if (uploadRes.status === 429) {
        setEstado("limit_reached");
        return;
      }
      if (!uploadData.success) {
        throw new Error("No se pudo registrar la foto");
      }

      setEstado("success");
    } catch (err) {
      console.error(err);
      setErrorMsg("Algo salió mal. Inténtalo de nuevo.");
      setEstado("error");
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* Inputs ocultos */}
      <input
        ref={camaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        style={styles.hiddenInput}
      />
      <input
        ref={galeriaRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelected}
        style={styles.hiddenInput}
      />

      {estado === "idle" && (
        <div style={styles.buttonRow}>
          <button
            style={styles.primaryBtn}
            onClick={() => camaraRef.current?.click()}
          >
            <Camera size={28} strokeWidth={1.5} />
            Usar cámara
          </button>
          <button
            style={styles.secondaryBtn}
            onClick={() => galeriaRef.current?.click()}
          >
            <Images size={28} strokeWidth={1.5} />
            Subir de galería
          </button>
        </div>
      )}

      {estado === "previewing" && (
        <div style={styles.previewBox}>
          <img src={previewUrl} alt="Vista previa" style={styles.preview} />
          <input
            type="text"
            value={nombreAutor}
            onChange={(e) => {
              setNombreAutor(e.target.value);
              if (errorMsg) setErrorMsg("");
            }}
            placeholder="Tu nombre"
            maxLength={20}
            required
            style={styles.textInput}
          />
          {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}
          <div style={styles.buttonRow}>
            <button
              style={{
                ...styles.primaryBtn,
                ...(nombreAutor.trim() ? {} : styles.primaryBtnDisabled),
              }}
              onClick={handleConfirm}
              disabled={!nombreAutor.trim()}
            >
              Confirmar
            </button>
            <button style={styles.ghostBtn} onClick={reset}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {estado === "uploading" && (
        <div style={styles.statusBox}>
          <div style={styles.spinner} />
          <p style={styles.statusText}>Subiendo...</p>
        </div>
      )}

      {estado === "success" && (
        <div style={styles.statusBox}>
          <p style={styles.successText}>
            ¡Foto enviada! Aparecerá tras revisión
          </p>
          <button style={styles.ghostBtn} onClick={reset}>
            Subir otra
          </button>
        </div>
      )}

      {estado === "error" && (
        <div style={styles.statusBox}>
          <p style={styles.errorText}>{errorMsg || "Ha ocurrido un error"}</p>
          <button style={styles.primaryBtn} onClick={handleConfirm}>
            Reintentar
          </button>
          <button style={styles.ghostBtn} onClick={reset}>
            Empezar de nuevo
          </button>
        </div>
      )}

      {estado === "limit_reached" && (
        <div style={styles.statusBox}>
          <p style={styles.statusText}>Ya tienes 3 fotos esta semana</p>
          <button style={styles.ghostBtn} onClick={reset}>
            Cerrar
          </button>
        </div>
      )}

      <style>{`@keyframes lio-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrapper: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    padding: "28px",
    width: "100%",
    maxWidth: "440px",
    fontFamily: "var(--font-mono)",
    color: "var(--text)",
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
    border: 0,
  },
  buttonRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  primaryBtn: {
    flex: 1,
    background: "var(--accent)",
    color: "var(--bg)",
    border: "none",
    padding: "20px 18px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  primaryBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
  },
  secondaryBtn: {
    flex: 1,
    background: "transparent",
    color: "var(--text)",
    border: "1px solid var(--border)",
    padding: "20px 18px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  ghostBtn: {
    background: "transparent",
    color: "var(--muted)",
    border: "none",
    padding: "12px 16px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.7rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    cursor: "pointer",
  },
  previewBox: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  preview: {
    width: "100%",
    aspectRatio: "3 / 4",
    objectFit: "cover",
    border: "1px solid var(--border)",
  },
  textInput: {
    background: "var(--bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    padding: "12px 14px",
    fontFamily: "var(--font-mono)",
    fontSize: "0.8rem",
    width: "100%",
  },
  statusBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
    padding: "20px 0",
    textAlign: "center",
  },
  statusText: {
    color: "var(--muted)",
    fontSize: "0.8rem",
    letterSpacing: "0.05em",
  },
  successText: {
    color: "var(--accent)",
    fontSize: "0.85rem",
    letterSpacing: "0.05em",
  },
  errorText: {
    color: "var(--accent3)",
    fontSize: "0.85rem",
    letterSpacing: "0.05em",
  },
  spinner: {
    width: "32px",
    height: "32px",
    border: "3px solid var(--border)",
    borderTopColor: "var(--accent)",
    borderRadius: "50%",
    animation: "lio-spin 0.8s linear infinite",
  },
};
