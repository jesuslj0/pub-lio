import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { isAdmin } from "../../../lib/adminAuth";
import { detalleError } from "../../../lib/detalleError";
import { deleteFromCloudinary } from "../../../lib/cloudinaryAdmin";

export const prerender = false;

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

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

    const imagenUrl = imagen_url?.trim() ?? "";
    if (!imagenUrl) {
      return jsonResponse(
        { success: false, error: "Falta la imagen o el vídeo del cartel" },
        400,
      );
    }

    const fechaInicio = fecha_inicio?.trim() ?? "";
    if (!fechaInicio) {
      return jsonResponse(
        {
          success: false,
          error:
            "Falta la fecha de inicio (sin ella el cartel no tiene página propia en /eventos)",
        },
        400,
      );
    }

    // Un cartel de un solo día: si no viene fecha de fin, se usa la de inicio.
    const fechaFin = fecha_fin?.trim() || fechaInicio;

    if (!FECHA_RE.test(fechaInicio) || !FECHA_RE.test(fechaFin)) {
      return jsonResponse(
        { success: false, error: "Fecha con formato inválido" },
        400,
      );
    }

    // YYYY-MM-DD se compara bien como cadena.
    if (fechaFin < fechaInicio) {
      return jsonResponse(
        { success: false, error: "La fecha de fin es anterior a la de inicio" },
        400,
      );
    }

    // Pueden mostrarse varios carteles a la vez (un finde con 2-3 carteles), así
    // que NO se desactivan los demás: `activo` se aplica solo a este cartel.
    const datos = {
      titulo: titulo.trim(),
      subtitulo: subtitulo?.trim() || null,
      imagen_url: imagenUrl,
      media_tipo: mediaTipo,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      activo: Boolean(activo),
    };

    const { error } = id
      ? await supabaseAdmin.from("carteles").update(datos).eq("id", id)
      : await supabaseAdmin.from("carteles").insert(datos);

    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[admin/cartel]", err);
    return jsonResponse({ success: false, error: detalleError(err) }, 500);
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
    return jsonResponse({ success: false, error: detalleError(err) }, 500);
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
    return jsonResponse({ success: false, error: detalleError(err) }, 500);
  }
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
