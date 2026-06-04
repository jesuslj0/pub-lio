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

/**
 * Devuelve la semana ISO 8601 actual con formato `AAAA-Www`, ej: `2025-W23`.
 * Las semanas ISO empiezan en lunes; la semana 1 es la que contiene el primer jueves del año.
 */
export function getCurrentWeek(date: Date = new Date()): string {
  // Copia en UTC para evitar problemas de zona horaria.
  const target = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
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
 * Dado un identificador de semana ISO (`AAAA-Www`) devuelve el rango de fechas
 * [inicio (lunes 00:00 UTC), fin (domingo 23:59:59.999 UTC)].
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

  const fin = new Date(inicio);
  fin.setUTCDate(inicio.getUTCDate() + 6);
  fin.setUTCHours(23, 59, 59, 999);

  return { inicio, fin };
}
