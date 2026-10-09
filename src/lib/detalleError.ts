// /admin está detrás de la cookie de admin, así que los endpoints pueden
// devolver el mensaje real del fallo (Postgres, Cloudinary...) en lugar de un
// "Error interno" ciego.
export function detalleError(err: unknown): string {
  return typeof err === "object" && err && "message" in err
    ? String((err as { message: unknown }).message)
    : "Error interno";
}
