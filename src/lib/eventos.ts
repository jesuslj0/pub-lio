// Eventos públicos (/eventos) a partir de la tabla `carteles`, la misma que
// alimenta "Cartel del finde" en la portada. No hay campos ni sistema nuevos:
// lo que se sube en el admin aparece aquí solo.
//
// SOLO SERVIDOR: lee con la service role para ver también los carteles
// desactivados (los eventos pasados), pero únicamente columnas públicas.

import { supabaseAdmin } from "./supabaseAdmin";
import type { Cartel } from "./database.types";

const COLUMNAS =
  "id, titulo, subtitulo, imagen_url, media_tipo, fecha_inicio, fecha_fin, activo, created_at";

const TZ = "Europe/Madrid";

/**
 * Horas del evento. `fecha_inicio`/`fecha_fin` son de tipo `date` (sin hora) y
 * el horario está pendiente de confirmar, así que por ahora no se inventa:
 * con `null` el JSON-LD usa solo la fecha y la cuenta atrás va por días.
 * TODO: confirmar con el cliente (p. ej. HORA_APERTURA = "22:00", HORA_CIERRE = "04:00").
 */
export const HORA_APERTURA: string | null = null;
export const HORA_CIERRE: string | null = null;

export type EstadoEvento = "proximo" | "en-curso" | "pasado" | "sin-fecha";

export interface Evento {
  id: string;
  titulo: string;
  subtitulo: string | null;
  /** URL original del medio (imagen o vídeo). */
  mediaUrl: string | null;
  esVideo: boolean;
  /**
   * URL de la que sacar una imagen fija con `imagenCloudinary()`: la imagen, o
   * el vídeo (de Cloudinary) del que se extrae un fotograma. null si no hay.
   */
  imagenFija: string | null;
  fechaInicio: string | null;
  /** `fecha_fin` o, si no hay, `fecha_inicio`. */
  fechaFin: string | null;
  activo: boolean;
  estado: EstadoEvento;
  /** Solo los carteles con `fecha_inicio` tienen página propia. */
  slug: string | null;
  ruta: string | null;
  creadoEn: string;
}

// ─── Fechas ───────────────────────────────────────────────────────────────────

/** Fecha de hoy (`AAAA-MM-DD`) tal y como se ve en Madrid. */
export function hoyEnMadrid(ahora: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora);
}

/** Desfase horario de Madrid ese día a esa hora, p. ej. `+02:00` (verano). */
export function offsetMadrid(fecha: string, hora = "12:00"): string {
  const aprox = new Date(`${fecha}T${hora}:00Z`);
  const nombre = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    timeZoneName: "longOffset",
  })
    .formatToParts(aprox)
    .find((p) => p.type === "timeZoneName")?.value;
  const m = /GMT([+-]\d{2}:\d{2})/.exec(nombre ?? "");
  return m ? m[1] : "+00:00";
}

/** `AAAA-MM-DD` + `HH:MM` → ISO 8601 con el desfase de Madrid. */
export function fechaHoraMadrid(fecha: string, hora: string): string {
  return `${fecha}T${hora}:00${offsetMadrid(fecha, hora)}`;
}

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** startDate/endDate para el JSON-LD (fecha sola mientras no haya horario). */
export function fechasJsonLd(e: Evento): { startDate: string; endDate: string } | null {
  if (!e.fechaInicio || !e.fechaFin) return null;
  const startDate = HORA_APERTURA ? fechaHoraMadrid(e.fechaInicio, HORA_APERTURA) : e.fechaInicio;
  // El cierre es de madrugada: cae el día siguiente a la fecha de fin.
  const endDate = HORA_CIERRE
    ? fechaHoraMadrid(sumarDias(e.fechaFin, 1), HORA_CIERRE)
    : e.fechaFin;
  return { startDate, endDate };
}

/** Momento de inicio (ISO con desfase) para la cuenta atrás. */
export function inicioCuentaAtras(e: Evento): string | null {
  if (!e.fechaInicio) return null;
  return fechaHoraMadrid(e.fechaInicio, HORA_APERTURA ?? "00:00");
}

/** Fin de la noche del último día (madrugada siguiente) para la cuenta atrás. */
export function finCuentaAtras(e: Evento): string | null {
  if (!e.fechaFin) return null;
  return fechaHoraMadrid(sumarDias(e.fechaFin, 1), HORA_CIERRE ?? "06:00");
}

const fmtDiaSemana = new Intl.DateTimeFormat("es-ES", { weekday: "short", timeZone: "UTC" });
const fmtDia = new Intl.DateTimeFormat("es-ES", { day: "numeric", timeZone: "UTC" });
const fmtMes = new Intl.DateTimeFormat("es-ES", { month: "short", timeZone: "UTC" });
const fmtAnio = new Intl.DateTimeFormat("es-ES", { year: "numeric", timeZone: "UTC" });
const fmtLarga = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** Piezas de una fecha `AAAA-MM-DD` para el formato "ticket". */
export function piezasFecha(fecha: string) {
  const d = new Date(`${fecha}T00:00:00Z`);
  const limpia = (s: string) => s.replace(/\./g, "").toUpperCase();
  return {
    diaSemana: limpia(fmtDiaSemana.format(d)),
    dia: fmtDia.format(d),
    mes: limpia(fmtMes.format(d)),
    anio: fmtAnio.format(d),
    larga: fmtLarga.format(d),
  };
}

/** Texto corto del rango, p. ej. "10 oct" o "10–11 oct 2026". */
export function rangoCorto(e: Evento, conAnio = false): string {
  if (!e.fechaInicio) return "Fecha por confirmar";
  const a = piezasFecha(e.fechaInicio);
  const anio = conAnio ? ` ${a.anio}` : "";
  if (!e.fechaFin || e.fechaFin === e.fechaInicio) return `${a.dia} ${a.mes.toLowerCase()}${anio}`;
  const b = piezasFecha(e.fechaFin);
  const desde = a.mes === b.mes ? a.dia : `${a.dia} ${a.mes.toLowerCase()}`;
  return `${desde}–${b.dia} ${b.mes.toLowerCase()}${anio}`;
}

// ─── Medios (Cloudinary) ──────────────────────────────────────────────────────

export function esVideoCartel(c: Pick<Cartel, "media_tipo" | "imagen_url">): boolean {
  return (
    c.media_tipo === "video" ||
    (!!c.imagen_url && /\/video\/|\.(mp4|webm|mov|m4v)(\?|$)/i.test(c.imagen_url))
  );
}

function insertarTransformacion(url: string, marca: string, t: string): string | null {
  const i = url.indexOf(marca);
  if (i === -1) return null;
  return url.slice(0, i + marca.length) + t + "/" + url.slice(i + marca.length);
}

/** Fotograma inicial de un vídeo de Cloudinary como JPG (póster y OG). */
export function fotogramaVideo(url: string, ancho = 1200): string | null {
  const con = insertarTransformacion(url, "/video/upload/", `so_0,c_limit,w_${ancho},h_${ancho},f_jpg,q_auto`);
  return con ? con.replace(/\.(mp4|webm|mov|m4v)(\?.*)?$/i, ".jpg") : null;
}

/**
 * Imagen fija limitada a `ancho` px: la imagen redimensionada o, si es un vídeo
 * de Cloudinary, su primer fotograma en JPG. `formato` "auto" para la web,
 * "jpg" para Open Graph y JSON-LD. Si no es de Cloudinary, se devuelve tal cual.
 */
export function imagenCloudinary(url: string, ancho: number, formato: "auto" | "jpg" = "auto"): string {
  if (url.includes("/video/upload/")) return fotogramaVideo(url, ancho) ?? url;
  return insertarTransformacion(url, "/image/upload/", `c_limit,w_${ancho},f_${formato},q_auto`) ?? url;
}

/** ¿Se puede obtener una imagen fija de este medio? (un vídeo fuera de Cloudinary, no). */
function tieneImagenFija(url: string, esVideo: boolean): boolean {
  return !esVideo || fotogramaVideo(url) !== null;
}

// ─── Slugs ────────────────────────────────────────────────────────────────────

const LONGITUD_SUFIJO = 6;

function slugificar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** `titulo-AAAA-MM-DD-abc123` (sufijo = inicio del id, para que no se repita). */
export function slugEvento(c: Pick<Cartel, "id" | "titulo" | "fecha_inicio">): string | null {
  if (!c.fecha_inicio) return null;
  const base = slugificar(c.titulo) || "evento";
  return `${base}-${c.fecha_inicio}-${c.id.replace(/-/g, "").slice(0, LONGITUD_SUFIJO)}`;
}

// ─── Carga ────────────────────────────────────────────────────────────────────

function aEvento(c: Cartel, hoy: string): Evento {
  const esVideo = esVideoCartel(c);
  const fechaFin = c.fecha_fin ?? c.fecha_inicio;
  let estado: EstadoEvento = "sin-fecha";
  if (c.fecha_inicio && fechaFin) {
    if (fechaFin < hoy) estado = "pasado";
    else if (c.fecha_inicio <= hoy) estado = "en-curso";
    else estado = "proximo";
  }
  const slug = slugEvento(c);
  return {
    id: c.id,
    titulo: c.titulo,
    subtitulo: c.subtitulo,
    mediaUrl: c.imagen_url,
    esVideo,
    imagenFija: c.imagen_url && tieneImagenFija(c.imagen_url, esVideo) ? c.imagen_url : null,
    fechaInicio: c.fecha_inicio,
    fechaFin,
    activo: c.activo,
    estado,
    slug,
    ruta: slug ? `/eventos/${slug}/` : null,
    creadoEn: c.created_at,
  };
}

/**
 * ¿Tiene página pública? Con fecha y, además, activo o ya pasado. Un cartel
 * futuro desactivado se considera retirado/no publicado.
 */
export function tienePagina(e: Evento): boolean {
  return !!e.slug && (e.activo || e.estado === "pasado");
}

async function cargarTodos(): Promise<Evento[]> {
  const { data, error } = await supabaseAdmin
    .from("carteles")
    .select(COLUMNAS)
    .order("fecha_inicio", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  const hoy = hoyEnMadrid();
  return (data ?? []).map((c) => aEvento(c as Cartel, hoy));
}

export interface ListadoEventos {
  /** Activos de hoy en adelante (los sin fecha, al final y sin página). */
  proximos: Evento[];
  /** Fecha ya pasada, activos o no; del más reciente al más antiguo. */
  pasados: Evento[];
}

export async function cargarEventos(): Promise<ListadoEventos> {
  const todos = await cargarTodos();
  const proximos = todos
    .filter((e) => e.activo && (e.estado === "proximo" || e.estado === "en-curso"))
    .sort((a, b) => (a.fechaInicio! < b.fechaInicio! ? -1 : 1));
  const sinFecha = todos.filter((e) => e.activo && e.estado === "sin-fecha");
  const pasados = todos.filter((e) => e.estado === "pasado");
  return { proximos: [...proximos, ...sinFecha], pasados };
}

/** Todos los eventos con página propia (para el sitemap). */
export async function eventosConPagina(): Promise<Evento[]> {
  return (await cargarTodos()).filter(tienePagina);
}

/**
 * Busca un evento por slug. Se identifica por el sufijo del id, así que si el
 * título o la fecha cambian, el slug viejo sigue encontrándolo (y la página
 * redirige al slug actual).
 */
export async function buscarEvento(slug: string): Promise<Evento | null> {
  const m = new RegExp(`-([0-9a-f]{${LONGITUD_SUFIJO}})$`).exec(slug);
  if (!m) return null;
  const sufijo = m[1];
  const candidatos = (await cargarTodos()).filter(
    (e) => tienePagina(e) && e.id.replace(/-/g, "").startsWith(sufijo),
  );
  return candidatos.find((e) => e.slug === slug) ?? candidatos[0] ?? null;
}

/** Otros eventos para "Más en el Lío" en la ficha de un evento. */
export async function otrosEventos(excluirId: string, max = 4): Promise<Evento[]> {
  const { proximos, pasados } = await cargarEventos();
  return [...proximos, ...pasados]
    .filter((e) => e.id !== excluirId && tienePagina(e))
    .slice(0, max);
}
