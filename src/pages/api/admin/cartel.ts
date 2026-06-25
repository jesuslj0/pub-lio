import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { isAdmin } from "../../../lib/adminAuth";
import { deleteFromCloudinary } from "../../../lib/cloudinaryAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    if (!isAdmin(cookies)) {
      return jsonResponse({ success: false, error: "No autorizado" }, 401);
    }

    const {
      id,
      titulo,
      subtitulo,
      imagen_url,
      media_tipo,
      fecha_inicio,
      fecha_fin,
      activo,
    } = (await request.json()) as {
      id?: string;
      titulo?: string;
      subtitulo?: string;
      imagen_url?: string;
      media_tipo?: string;
      fecha_inicio?: string;
      fecha_fin?: string;
      activo?: boolean;
    };

    const mediaTipo = media_tipo === "video" ? "video" : "imagen";

    if (!titulo?.trim()) {
      return jsonResponse(
        { success: false, error: "El título es obligatorio" },
        400,
      );
    }

    // Pueden mostrarse varios carteles a la vez (un finde con 2-3 carteles), así
    // que NO se desactivan los demás: `activo` se aplica solo a este cartel.
    const datos = {
      titulo: titulo.trim(),
      subtitulo: subtitulo?.trim() || null,
      imagen_url: imagen_url?.trim() || null,
      media_tipo: mediaTipo,
      fecha_inicio: fecha_inicio || null,
      fecha_fin: fecha_fin || null,
      activo: Boolean(activo),
    };

    const { error } = id
      ? await supabaseAdmin.from("carteles").update(datos).eq("id", id)
      : await supabaseAdmin.from("carteles").insert(datos);

    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[admin/cartel]", err);
    return jsonResponse({ success: false, error: "Error interno" }, 500);
  }
};

// Mostrar / ocultar un cartel (toggle de `activo`). No afecta a los demás:
// pueden mostrarse varios carteles a la vez.
export const PATCH: APIRoute = async ({ request, cookies }) => {
  try {
    if (!isAdmin(cookies)) {
      return jsonResponse({ success: false, error: "No autorizado" }, 401);
    }
    const { id, activo } = (await request.json()) as {
      id?: string;
      activo?: boolean;
    };
    if (!id) {
      return jsonResponse({ success: false, error: "Falta el id" }, 400);
    }

    const { error } = await supabaseAdmin
      .from("carteles")
      .update({ activo: Boolean(activo) })
      .eq("id", id);
    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[admin/cartel PATCH]", err);
    return jsonResponse({ success: false, error: "Error interno" }, 500);
  }
};

// Eliminar un cartel.
export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    if (!isAdmin(cookies)) {
      return jsonResponse({ success: false, error: "No autorizado" }, 401);
    }
    const { id } = (await request.json()) as { id?: string };
    if (!id) {
      return jsonResponse({ success: false, error: "Falta el id" }, 400);
    }

    const { data: cartel } = await supabaseAdmin
      .from("carteles")
      .select("imagen_url")
      .eq("id", id)
      .single();

    const { error } = await supabaseAdmin
      .from("carteles")
      .delete()
      .eq("id", id);
    if (error) throw error;

    await deleteFromCloudinary(cartel?.imagen_url);

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[admin/cartel DELETE]", err);
    return jsonResponse({ success: false, error: "Error interno" }, 500);
  }
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
