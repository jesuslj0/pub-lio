import type { APIRoute } from "astro";
import { supabaseAdmin } from "../../lib/supabaseAdmin";
import { getCurrentWeek } from "../../lib/supabase";

export const prerender = false;

const LIMIT = 3;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { fingerprint } = (await request.json()) as {
      fingerprint?: string;
      ip?: string;
    };

    if (!fingerprint) {
      return jsonResponse({ error: "Falta el fingerprint" }, 400);
    }

    const semana = getCurrentWeek();

    const { count, error } = await supabaseAdmin
      .from("fotos")
      .select("id", { count: "exact", head: true })
      .eq("fingerprint", fingerprint)
      .eq("semana", semana);

    if (error) throw error;

    const total = count ?? 0;
    return jsonResponse({
      allowed: total < LIMIT,
      count: total,
      limit: LIMIT,
    });
  } catch (err) {
    console.error("[check-limit]", err);
    return jsonResponse({ error: "Error interno" }, 500);
  }
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
