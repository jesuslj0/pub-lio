import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const rawUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!rawUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan PUBLIC_SUPABASE_URL o PUBLIC_SUPABASE_ANON_KEY en el entorno.",
  );
}

// supabase-js espera solo la URL base del proyecto; añade /rest/v1 por su cuenta.
// Recortamos un posible sufijo /rest/v1 o barras finales para evitar rutas duplicadas.
const supabaseUrl = rawUrl.replace(/\/+$/, "").replace(/\/rest\/v1$/, "");

/** Cliente Supabase tipado (anon). Seguro para usar en cliente y servidor. */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/** Zona horaria de referencia del pub. La semana cambia a su medianoche. */
const TZ_LOCAL = "Europe/Madrid";

/**
 * Devuelve el año/mes/día de una fecha tal y como se ven en `Europe/Madrid`,
 * independientemente de la zona horaria del entorno (UTC en Vercel, local en dev).
 */
function partesEnMadrid(date: Date): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_LOCAL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = fmt.format(date).split("-").map(Number);
  return { year, month, day };
}

/**
 * Devuelve la semana de concurso actual con formato `AAAA-Www`, ej: `2025-W23`.
 *
 * La semana de concurso **empieza los jueves** (el plazo para subir fotos del
 * finde anterior acaba ese día). Para reutilizar el cálculo ISO estándar
 * (semanas lunes→domingo) desplazamos la fecha 3 días hacia atrás: así el bloque
 * jueves→miércoles se agrupa igual que un bloque lunes→domingo desplazado.
 * El "día actual" se calcula en `Europe/Madrid` para que prod (UTC) y local coincidan.
 */
export function getCurrentWeek(date: Date = new Date()): string {
  // Tomamos el día tal cual se ve en Madrid y lo fijamos en UTC para operar sin
  // sustos de zona horaria.
  const { year, month, day } = partesEnMadrid(date);
  const target = new Date(Date.UTC(year, month - 1, day));
  // Desplaza 3 días atrás para que la semana arranque el jueves (jueves → lunes).
  target.setUTCDate(target.getUTCDate() - 3);
  // getUTCDay(): domingo=0 … sábado=6 → lo pasamos a lunes=1 … domingo=7.
  const dayNum = target.getUTCDay() || 7;
  // Movemos al jueves de la semana actual.
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * Devuelve la semana de concurso **anterior** a la de `date` (por defecto, la
 * actual), con el mismo formato `AAAA-Www`. Como las semanas son bloques de 7
 * días, basta con retroceder 7 días y reutilizar `getCurrentWeek`, que ya
 * resuelve correctamente el cambio de año y la zona horaria.
 */
export function getPreviousWeek(date: Date = new Date()): string {
  return getCurrentWeek(new Date(date.getTime() - 7 * 86400000));
}

/**
 * Dado un identificador de semana de concurso (`AAAA-Www`) devuelve el rango de
 * fechas [inicio (jueves 00:00 UTC), fin (miércoles siguiente 23:59:59.999 UTC)].
 * Coherente con `getCurrentWeek`: las semanas empiezan en jueves.
 */
export function getWeekRange(semana: string): { inicio: Date; fin: Date } {
  const match = /^(\d{4})-W(\d{2})$/.exec(semana);
  if (!match) {
    throw new Error(`Formato de semana inválido: ${semana}`);
  }
  const year = Number(match[1]);
  const week = Number(match[2]);

  // 4 de enero siempre cae en la semana ISO 1.
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Day = jan4.getUTCDay() || 7;
  // Lunes de la semana ISO 1.
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Day + 1);

  const inicio = new Date(week1Monday);
  inicio.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  // El cálculo ISO da el lunes; la semana de concurso empieza el jueves (+3 días).
  inicio.setUTCDate(inicio.getUTCDate() + 3);

  const fin = new Date(inicio);
  fin.setUTCDate(inicio.getUTCDate() + 6);
  fin.setUTCHours(23, 59, 59, 999);

  return { inicio, fin };
}
