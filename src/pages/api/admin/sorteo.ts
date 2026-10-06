import type { APIRoute } from "astro";
import { isAdmin } from "../../../lib/adminAuth";
import { getCurrentWeek } from "../../../lib/supabase";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";
import { ErrorSorteo, anularSorteo, realizarSorteo, type CodigoErrorSorteo } from "../../../lib/sorteo";
import { repoSupabase } from "../../../lib/sorteoRepo";

export const prerender = false;

const ESTADO_HTTP: Record<CodigoErrorSorteo, number> = {
  "semana-invalida": 400,
  "semana-abierta": 400,
  "anterior-al-sorteo": 400,
  "motivo-obligatorio": 400,
  "no-hay-sorteo": 404,
  "ya-sorteada": 409,
  "sin-participantes": 422,
};

// Sortear: elige ganador/a en el servidor (crypto.randomInt) entre las
// personas con foto aprobada de una semana ya cerrada.
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdmin(cookies)) return jsonResponse({ success: false, error: "No autorizado" }, 401);
  try {
    const { semana } = (await request.json()) as { semana?: string };
    const resultado = await realizarSorteo(repoSupabase, String(semana ?? ""), getCurrentWeek());

    // Datos para mostrar el resultado en el panel (incluye Instagram: es admin).
    const { data: foto } = await supabaseAdmin
      .from("fotos")
      .select("id, nombre_autor, instagram, cloudinary_url, votos_count")
      .eq("id", resultado.ganadora.id)
      .single();

    return jsonResponse({
      success: true,
      sorteo: resultado.sorteo,
      participantes: resultado.participantes,
      ganadora: foto,
    });
  } catch (err) {
    return manejarError(err, "[admin/sorteo POST]");
  }
};

// Anular el sorteo válido de una semana (con motivo). Después se puede repetir.
export const PATCH: APIRoute = async ({ request, cookies }) => {
  if (!isAdmin(cookies)) return jsonResponse({ success: false, error: "No autorizado" }, 401);
  try {
    const { semana, motivo } = (await request.json()) as { semana?: string; motivo?: string };
    const anulado = await anularSorteo(repoSupabase, String(semana ?? ""), String(motivo ?? ""));
    return jsonResponse({ success: true, anulado: anulado.id });
  } catch (err) {
    return manejarError(err, "[admin/sorteo PATCH]");
  }
};

function manejarError(err: unknown, etiqueta: string): Response {
  if (err instanceof ErrorSorteo) {
    return jsonResponse({ success: false, error: err.message, codigo: err.codigo }, ESTADO_HTTP[err.codigo]);
  }
  console.error(etiqueta, err);
  return jsonResponse({ success: false, error: "Error interno" }, 500);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
