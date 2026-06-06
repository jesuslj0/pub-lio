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
      descripcion,
      imagen_url,
      valido_hasta,
      activo,
    } = (await request.json()) as {
      titulo?: string;
      descripcion?: string;
      imagen_url?: string;
      valido_hasta?: string;
      activo?: boolean;
    };

    if (!titulo?.trim()) {
      return jsonResponse(
        { success: false, error: "El título es obligatorio" },
        400,
      );
    }

    // Solo puede haber un premio activo: desactiva el resto primero.
    if (activo) {
      const { error: deactivateError } = await supabaseAdmin
        .from("premios")
        .update({ activo: false })
        .eq("activo", true);

      if (deactivateError) throw deactivateError;
    }

    const { error } = await supabaseAdmin.from("premios").insert({
      titulo: titulo.trim(),
      descripcion: descripcion?.trim() || null,
      imagen_url: imagen_url?.trim() || null,
      valido_hasta: valido_hasta || null,
      activo: Boolean(activo),
    });

    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[admin/premio]", err);
    return jsonResponse({ success: false, error: "Error interno" }, 500);
  }
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
