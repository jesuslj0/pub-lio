import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../lib/supabaseAdmin";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { fotoId, fingerprint } = (await request.json()) as {
      fotoId?: string;
      fingerprint?: string;
    };

    if (!fotoId || !fingerprint) {
      return jsonResponse(
        { success: false, reason: "Faltan datos obligatorios" },
        400,
      );
    }

    // El unique constraint (foto_id, fingerprint) impide votos duplicados.
    const { error: insertError } = await supabaseAdmin
      .from("votos")
      .insert({ foto_id: fotoId, fingerprint });

    if (insertError) {
      // 23505 = unique_violation en Postgres → ya había votado.
      if (insertError.code === "23505") {
        return jsonResponse({ success: false, reason: "Ya has votado" }, 409);
      }
      throw insertError;
    }

    // Incrementa el contador de forma atómica vía función de Supabase.
    const { data: newCount, error: rpcError } = await supabaseAdmin.rpc(
      "incrementar_voto",
      { foto_id: fotoId },
    );

    if (rpcError) throw rpcError;

    return jsonResponse({ success: true, newCount: newCount ?? undefined });
  } catch (err) {
    console.error("[vote]", err);
    return jsonResponse({ success: false, reason: "Error interno" }, 500);
  }
};

// Quitar un voto/like previamente emitido por este fingerprint.
export const DELETE: APIRoute = async ({ request }) => {
  try {
    const { fotoId, fingerprint } = (await request.json()) as {
      fotoId?: string;
      fingerprint?: string;
    };

    if (!fotoId || !fingerprint) {
      return jsonResponse(
        { success: false, reason: "Faltan datos obligatorios" },
        400,
      );
    }

    // Borra el voto de este fingerprint sobre la foto (si existe).
    const { data: borrados, error: deleteError } = await supabaseAdmin
      .from("votos")
      .delete()
      .eq("foto_id", fotoId)
      .eq("fingerprint", fingerprint)
      .select("id");

    if (deleteError) throw deleteError;

    // Si no había voto, no tocamos el contador.
    if (!borrados || borrados.length === 0) {
      return jsonResponse({ success: false, reason: "No había voto" }, 409);
    }

    // Decrementa el contador de forma atómica (no baja de 0).
    const { data: newCount, error: rpcError } = await supabaseAdmin.rpc(
      "decrementar_voto",
      { foto_id: fotoId },
    );

    if (rpcError) throw rpcError;

    return jsonResponse({ success: true, newCount: newCount ?? undefined });
  } catch (err) {
    console.error("[vote DELETE]", err);
    return jsonResponse({ success: false, reason: "Error interno" }, 500);
  }
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
