import { supabase, getWeekRange } from "./supabase";
import type { Foto } from "./database.types";

// Datos del historial completo de fotos (/fotos). Se usa tanto en el servidor
// (primera tanda, SSR) como en el cliente (scroll infinito).

/** Solo columnas públicas: nunca fingerprint, IP ni Instagram. */
const COLUMNAS = "id, cloudinary_url, nombre_autor, semana, votos_count, ganadora, created_at";

export type FotoHistorial = Pick<
  Foto,
  "id" | "cloudinary_url" | "nombre_autor" | "semana" | "votos_count" | "ganadora" | "created_at"
>;

export const FOTOS_POR_TANDA = 30;

export interface FiltroHistorial {
  /** Semana de concurso (`AAAA-Www`) o null para todas. */
  semana: string | null;
  soloGanadoras: boolean;
}

/** Tanda de fotos aprobadas, de más a menos votada, a partir de `desde`. */
export async function cargarTanda(
  filtro: FiltroHistorial,
  desde: number,
): Promise<FotoHistorial[]> {
  let query = supabase.from("fotos").select(COLUMNAS).eq("estado", "aprobada");
  if (filtro.semana) query = query.eq("semana", filtro.semana);
  if (filtro.soloGanadoras) query = query.eq("ganadora", true);

  // Desempates fijos para que la paginación sea estable (sin repetidas ni saltos).
  const { data, error } = await query
    .order("votos_count", { ascending: false })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(desde, desde + FOTOS_POR_TANDA - 1);

  if (error) throw error;
  return data ?? [];
}

export interface ResumenHistorial {
  totalFotos: number;
  totalVotos: number;
  /** Semanas con fotos, de la más reciente a la más antigua. */
  semanas: string[];
}

/** Totales y lista de semanas (consulta ligera: solo dos columnas). */
export async function cargarResumen(): Promise<ResumenHistorial> {
  const { data, error } = await supabase
    .from("fotos")
    .select("semana, votos_count")
    .eq("estado", "aprobada");

  if (error) throw error;
  const filas = data ?? [];
  return {
    totalFotos: filas.length,
    totalVotos: filas.reduce((acc, f) => acc + f.votos_count, 0),
    semanas: [...new Set(filas.map((f) => f.semana))].sort().reverse(),
  };
}

const fmtDia = new Intl.DateTimeFormat("es-ES", { day: "numeric", timeZone: "UTC" });
const fmtDiaMes = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/**
 * Etiqueta corta de una semana de concurso, ej: `11–17 sep` o `28 ago–3 sep`.
 * Si el identificador no es válido, se devuelve tal cual.
 */
export function etiquetaSemana(semana: string): string {
  try {
    const { inicio, fin } = getWeekRange(semana);
    const mismoMes = inicio.getUTCMonth() === fin.getUTCMonth();
    const desde = mismoMes ? fmtDia.format(inicio) : fmtDiaMes.format(inicio);
    return `${desde}–${fmtDiaMes.format(fin)}`.replace(/\./g, "");
  } catch {
    return semana;
  }
}
