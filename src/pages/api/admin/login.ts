import type { APIRoute } from "astro";
import { ADMIN_COOKIE } from "../../../lib/adminAuth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const adminSecret = import.meta.env.ADMIN_SECRET;
  const form = await request.formData();
  const secret = String(form.get("secret") ?? "");

  if (!adminSecret || secret !== adminSecret) {
    return redirect("/admin?error=1", 303);
  }

  cookies.set(ADMIN_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: import.meta.env.PROD,
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  return redirect("/admin", 303);
};
