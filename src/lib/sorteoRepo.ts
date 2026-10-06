// Repositorio del sorteo sobre Supabase (service role). SOLO SERVIDOR.
import { supabaseAdmin } from "./supabaseAdmin";
import { ErrorSorteo, type RepoSorteo } from "./sorteo";

/** Código de Postgres para violación de unicidad (índice sorteos_semana_valido_uniq). */
const UNIQUE_VIOLATION = "23505";

export const repoSupabase: RepoSorteo = {
  async fotosAprobadas(semana) {
    const { data, error } = await supabaseAdmin
      .from("fotos")
      .select("id, fingerprint, instagram, votos_count, created_at")
      .eq("semana", semana)
      .eq("estado", "aprobada");
    if (error) throw error;
    return data ?? [];
  },

  async sorteosDeSemana(semana) {
    const { data, error } = await supabaseAdmin
      .from("sorteos")
      .select("*")
      .eq("semana", semana)
      .order("realizado_at", { ascending: true });
    if (error) throw error;
    return data ?? [];
  },

  async insertar(sorteo) {
    const { data, error } = await supabaseAdmin.from("sorteos").insert(sorteo).select("*").single();
    if (error?.code === UNIQUE_VIOLATION) {
      throw new ErrorSorteo("ya-sorteada", "Esta semana ya tiene un sorteo válido");
    }
    if (error) throw error;
    return data;
  },

  async borrar(id) {
    const { error } = await supabaseAdmin.from("sorteos").delete().eq("id", id);
    if (error) throw error;
  },

  async marcarGanadora(semana, fotoId) {
    const { error: limpiar } = await supabaseAdmin
      .from("fotos")
      .update({ ganadora: false })
      .eq("semana", semana)
      .neq("id", fotoId);
    if (limpiar) throw limpiar;
    const { error } = await supabaseAdmin.from("fotos").update({ ganadora: true }).eq("id", fotoId);
    if (error) throw error;
  },

  async quitarGanadora(fotoId) {
    const { error } = await supabaseAdmin.from("fotos").update({ ganadora: false }).eq("id", fotoId);
    if (error) throw error;
  },

  async anular(id, motivo, fecha) {
    const { error } = await supabaseAdmin
      .from("sorteos")
      .update({ anulado: true, motivo_anulacion: motivo, anulado_at: fecha })
      .eq("id", id);
    if (error) throw error;
  },
};
