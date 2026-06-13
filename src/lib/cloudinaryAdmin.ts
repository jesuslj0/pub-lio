// Borrado de archivos en Cloudinary (operación firmada, solo servidor).
// Requiere credenciales privadas; nunca exponer en el cliente.
import crypto from "node:crypto";

const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
const API_KEY = import.meta.env.CLOUDINARY_API_KEY;
const API_SECRET = import.meta.env.CLOUDINARY_API_SECRET;

/**
 * Extrae el `public_id` y el `resource_type` de una secure_url de Cloudinary.
 * Ej: https://res.cloudinary.com/demo/image/upload/v172.../carpeta/abc.jpg
 *  -> { publicId: "carpeta/abc", resourceType: "image" }
 * Devuelve null si la URL no parece de Cloudinary.
 */
export function parseCloudinaryUrl(
  url: string,
): { publicId: string; resourceType: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("res.cloudinary.com")) return null;
    // /<cloud>/<resource_type>/<delivery_type>/[v123/]<public_id>.<ext>
    const parts = u.pathname.split("/").filter(Boolean);
    const uploadIdx = parts.indexOf("upload");
    if (uploadIdx < 1) return null;
    const resourceType = parts[uploadIdx - 1]; // image | video
    let rest = parts.slice(uploadIdx + 1);
    // Quita el segmento de versión (v1234567890) si está presente.
    if (rest[0] && /^v\d+$/.test(rest[0])) rest = rest.slice(1);
    if (rest.length === 0) return null;
    const last = rest[rest.length - 1].replace(/\.[^.]+$/, ""); // sin extensión
    const publicId = [...rest.slice(0, -1), last].join("/");
    return { publicId, resourceType };
  } catch {
    return null;
  }
}

/**
 * Borra un archivo de Cloudinary a partir de su secure_url.
 * Si faltan credenciales o la URL no es válida, no lanza: devuelve false
 * para no bloquear el borrado del registro en la base de datos.
 */
export async function deleteFromCloudinary(
  url: string | null | undefined,
): Promise<boolean> {
  if (!url) return false;
  if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
    console.warn(
      "[cloudinaryAdmin] Faltan credenciales; se omite el borrado en Cloudinary.",
    );
    return false;
  }
  const parsed = parseCloudinaryUrl(url);
  if (!parsed) return false;

  const timestamp = Math.floor(Date.now() / 1000);
  // La firma se calcula sobre los parámetros (sin api_key) ordenados alfabéticamente.
  const toSign = `public_id=${parsed.publicId}&timestamp=${timestamp}`;
  const signature = crypto
    .createHash("sha1")
    .update(toSign + API_SECRET)
    .digest("hex");

  const body = new FormData();
  body.append("public_id", parsed.publicId);
  body.append("timestamp", String(timestamp));
  body.append("api_key", API_KEY);
  body.append("signature", signature);

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${parsed.resourceType}/destroy`,
      { method: "POST", body },
    );
    const data = (await res.json()) as { result?: string };
    if (data.result !== "ok" && data.result !== "not found") {
      console.warn("[cloudinaryAdmin] destroy:", data.result);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[cloudinaryAdmin] error al borrar:", err);
    return false;
  }
}
