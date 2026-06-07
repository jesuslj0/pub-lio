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
      id,
      titulo,
      descripcion,
      imagen_url,
      valido_hasta,
      activo,
    } = (await request.json()) as {
      id?: string;
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

    // Solo puede haber un premio activo: desactiva el resto primero
    // (excepto el que se está editando).
    if (activo) {
      let query = supabaseAdmin
        .from("premios")
        .update({ activo: false })
        .eq("activo", true);
      if (id) query = query.neq("id", id);
      const { error: deactivateError } = await query;
      if (deactivateError) throw deactivateError;
    }

    const datos = {
      titulo: titulo.trim(),
      descripcion: descripcion?.trim() || null,
      imagen_url: imagen_url?.trim() || null,
      valido_hasta: valido_hasta || null,
      activo: Boolean(activo),
    };

    const { error } = id
      ? await supabaseAdmin.from("premios").update(datos).eq("id", id)
      : await supabaseAdmin.from("premios").insert(datos);

    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[admin/premio]", err);
    return jsonResponse({ success: false, error: "Error interno" }, 500);
  }
};

// Activar un premio existente (desactiva el resto).
export const PATCH: APIRoute = async ({ request, cookies }) => {
  try {
    if (!isAdmin(cookies)) {
      return jsonResponse({ success: false, error: "No autorizado" }, 401);
    }
    const { id } = (await request.json()) as { id?: string };
    if (!id) {
      return jsonResponse({ success: false, error: "Falta el id" }, 400);
    }

    const { error: deactivateError } = await supabaseAdmin
      .from("premios")
      .update({ activo: false })
      .eq("activo", true)
      .neq("id", id);
    if (deactivateError) throw deactivateError;

    const { error } = await supabaseAdmin
      .from("premios")
      .update({ activo: true })
      .eq("id", id);
    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[admin/premio PATCH]", err);
    return jsonResponse({ success: false, error: "Error interno" }, 500);
  }
};

// Eliminar un premio.
export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    if (!isAdmin(cookies)) {
      return jsonResponse({ success: false, error: "No autorizado" }, 401);
    }
    const { id } = (await request.json()) as { id?: string };
    if (!id) {
      return jsonResponse({ success: false, error: "Falta el id" }, 400);
    }

    const { error } = await supabaseAdmin
      .from("premios")
      .delete()
      .eq("id", id);
    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[admin/premio DELETE]", err);
    return jsonResponse({ success: false, error: "Error interno" }, 500);
  }
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
