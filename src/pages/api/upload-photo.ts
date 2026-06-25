import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getCurrentWeek } from "../../lib/supabase";

export const prerender = false;

const LIMIT = 3;

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const {
      cloudinaryUrl,
      nombreAutor,
      instagram,
      fingerprint,
      ip,
    } = (await request.json()) as {
      cloudinaryUrl?: string;
      nombreAutor?: string;
      instagram?: string | null;
      fingerprint?: string;
      ip?: string;
    };

    if (!cloudinaryUrl || !fingerprint) {
      return jsonResponse(
        { success: false, error: "Faltan datos obligatorios" },
        400,
      );
    }

    if (!nombreAutor?.trim()) {
      return jsonResponse(
        { success: false, error: "El nombre es obligatorio" },
        400,
      );
    }

    const semana = getCurrentWeek();

    // Doble verificación del límite en servidor.
    const { count, error: countError } = await supabaseAdmin
      .from("fotos")
      .select("id", { count: "exact", head: true })
      .eq("fingerprint", fingerprint)
      .eq("semana", semana);

    if (countError) throw countError;

    if ((count ?? 0) >= LIMIT) {
      return jsonResponse(
        { success: false, error: "Límite semanal alcanzado" },
        429,
      );
    }

    const { data, error } = await supabaseAdmin
      .from("fotos")
      .insert({
        cloudinary_url: cloudinaryUrl,
        nombre_autor: nombreAutor.trim().slice(0, 20),
        instagram: instagram?.trim().replace(/^@+/, "").slice(0, 30) || null,
        fingerprint,
        ip: ip ?? clientAddress ?? null,
        semana,
        estado: "pendiente",
      })
      .select("id")
      .single();

    if (error) throw error;

    return jsonResponse({ success: true, fotoId: data.id });
  } catch (err) {
    console.error("[upload-photo]", err);
    return jsonResponse({ success: false, error: "Error interno" }, 500);
  }
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
