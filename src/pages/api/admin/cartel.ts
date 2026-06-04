import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { isAdmin } from "../../../lib/adminAuth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    if (!isAdmin(cookies)) {
      return jsonResponse({ success: false, error: "No autorizado" }, 401);
    }

    const {
      titulo,
      subtitulo,
      imagen_url,
      fecha_inicio,
      fecha_fin,
      activo,
    } = (await request.json()) as {
      titulo?: string;
      subtitulo?: string;
      imagen_url?: string;
      fecha_inicio?: string;
      fecha_fin?: string;
      activo?: boolean;
    };

    if (!titulo?.trim()) {
      return jsonResponse(
        { success: false, error: "El título es obligatorio" },
        400,
      );
    }

    // Solo puede haber un cartel activo: desactiva el resto primero.
    if (activo) {
      const { error: deactivateError } = await supabaseAdmin
        .from("carteles")
        .update({ activo: false })
        .eq("activo", true);

      if (deactivateError) throw deactivateError;
    }

    const { error } = await supabaseAdmin.from("carteles").insert({
      titulo: titulo.trim(),
      subtitulo: subtitulo?.trim() || null,
      imagen_url: imagen_url?.trim() || null,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      activo: Boolean(activo),
    });

    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[admin/cartel]", err);
    return jsonResponse({ success: false, error: "Error interno" }, 500);
  }
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
