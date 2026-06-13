import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { isAdmin } from "../../../lib/adminAuth";
import { deleteFromCloudinary } from "../../../lib/cloudinaryAdmin";

export const prerender = false;

// Eliminar una foto definitivamente (registro en BD + archivo en Cloudinary).
export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    if (!isAdmin(cookies)) {
      return jsonResponse({ success: false, error: "No autorizado" }, 401);
    }

    const { fotoId } = (await request.json()) as { fotoId?: string };
    if (!fotoId) {
      return jsonResponse({ success: false, error: "Falta el id" }, 400);
    }

    // Recupera la URL para poder borrar también el archivo en Cloudinary.
    const { data: foto } = await supabaseAdmin
      .from("fotos")
      .select("cloudinary_url")
      .eq("id", fotoId)
      .single();

    const { error } = await supabaseAdmin
      .from("fotos")
      .delete()
      .eq("id", fotoId);
    if (error) throw error;

    await deleteFromCloudinary(foto?.cloudinary_url);

    return jsonResponse({ success: true });
  } catch (err) {
    console.error("[admin/delete-photo]", err);
    return jsonResponse({ success: false, error: "Error interno" }, 500);
  }
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
