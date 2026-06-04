import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { isAdmin } from "../../../lib/adminAuth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    if (!isAdmin(cookies)) {
      return jsonResponse({ success: false, error: "No autorizado" }, 401);
    }

    const { fotoId, ganadora = true } = (await request.json()) as {
      fotoId?: string;
      ganadora?: boolean;
    };
    if (!fotoId) {
      return jsonResponse({ success: false, error: "Falta fotoId" }, 400);
    }

    if (!ganadora) {
      // Desmarcar: simplemente quita la marca de esta foto.
      const { error } = await supabaseAdmin
        .from("fotos")
        .update({ ganadora: false })
        .eq("id", fotoId);
      if (error) throw error;
      return jsonResponse({ success: true, ganadora: false });
    }

    // Marcar: localiza la semana de la foto elegida.
    const { data: foto, error: findError } = await supabaseAdmin
      .from("fotos")
      .select("semana")
      .eq("id", fotoId)
      .single();
    if (findError) throw findError;

    // Solo puede haber una ganadora por semana: limpia las demás primero.
    const { error: clearError } = await supabaseAdmin
      .from("fotos")
      .update({ ganadora: false })
      .eq("semana", foto.semana);
    if (clearError) throw clearError;

    const { error: setError } = await supabaseAdmin
      .from("fotos")
      .update({ ganadora: true })
      .eq("id", fotoId);
    if (setError) throw setError;

    return jsonResponse({ success: true, ganadora: true });
  } catch (err) {
    console.error("[admin/set-winner]", err);
    return jsonResponse({ success: false, error: "Error interno" }, 500);
  }
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
