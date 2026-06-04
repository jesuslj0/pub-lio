import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { isAdmin } from "../../../lib/adminAuth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    if (!isAdmin(cookies)) {
      return jsonResponse({ success: false, error: "No autorizado" }, 401);
    }

    const { fotoId, accion } = (await request.json()) as {
      fotoId?: string;
      accion?: "aprobar" | "rechazar";
    };

    if (!fotoId || (accion !== "aprobar" && accion !== "rechazar")) {
      return jsonResponse({ success: false, error: "Datos inválidos" }, 400);
    }

    const estado = accion === "aprobar" ? "aprobada" : "rechazada";

    const { error } = await supabaseAdmin
      .from("fotos")
      .update({ estado })
      .eq("id", fotoId);

    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[admin/moderate]", err);
    return jsonResponse({ success: false, error: "Error interno" }, 500);
  }
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
