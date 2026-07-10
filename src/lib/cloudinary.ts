// La subida se hace desde el navegador con un "unsigned upload preset".
// Tanto el cloud name como el preset son públicos por diseño, por lo que en
// Astro deben llevar el prefijo PUBLIC_ para estar disponibles en el cliente.
const CLOUD_NAME = import.meta.env.PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.PUBLIC_CLOUDINARY_UPLOAD_PRESET;

/**
 * Sube un archivo de imagen a Cloudinary mediante un upload preset sin firmar
 * y devuelve la `secure_url` resultante.
 */
export async function uploadToCloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Faltan PUBLIC_CLOUDINARY_CLOUD_NAME o PUBLIC_CLOUDINARY_UPLOAD_PRESET.",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) {
    throw new Error(`Error subiendo a Cloudinary (${res.status})`);
  }

  const data: { secure_url?: string } = await res.json();
  if (!data.secure_url) {
    throw new Error("Cloudinary no devolvió una secure_url.");
  }

  return data.secure_url;
}

/**
 * A partir de una `secure_url` de Cloudinary devuelve una variante JPG de tamaño
 * contenido (máx. 1080px, sin recortar) pensada para **compartir la foto** por
 * WhatsApp/redes como archivo adjunto: buena calidad y peso ligero.
 *
 * Si la URL no es una de subida de Cloudinary (`/upload/`), se devuelve tal cual.
 */
export function imagenCompartir(url: string): string {
  const marca = "/upload/";
  const i = url.indexOf(marca);
  if (i === -1) return url;
  const transformacion = "c_limit,w_1080,h_1080,f_jpg,q_auto/";
  return url.slice(0, i + marca.length) + transformacion + url.slice(i + marca.length);
}
