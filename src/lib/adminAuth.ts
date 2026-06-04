import type { AstroCookies } from "astro";

/** Nombre de la cookie donde se guarda el secreto de administración. */
export const ADMIN_COOKIE = "admin_secret";

/** Comprueba si la petición trae una cookie de admin válida. */
export function isAdmin(cookies: AstroCookies): boolean {
  const secret = import.meta.env.ADMIN_SECRET;
  const provided = cookies.get(ADMIN_COOKIE)?.value;
  return Boolean(secret) && provided === secret;
}
