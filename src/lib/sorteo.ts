// Sorteo del premio semanal. El premio ya no es para la foto más votada: se
// sortea entre las personas que suben fotos aprobadas esa semana, y solo las
// semanas en que hay premio publicado en la web (no todas). El podio de votos
// se mantiene, pero solo como algo divertido.
//
// Este módulo es lógica pura + una interfaz de repositorio (RepoSorteo), sin
// dependencias de Astro ni de Supabase, para poder probarlo en local con datos
// en memoria (scripts/test-sorteo.mjs). La implementación real del repositorio
// está en lib/sorteoRepo.ts.

import { createHash, randomInt } from "node:crypto";
import type { Foto, Premio, Sorteo } from "./database.types";
import { SEMANA_INICIO_SORTEO } from "./sorteoConfig.ts";

export { SEMANA_INICIO_SORTEO };

/**
 * Quién entra en el bombo:
 * - "una-por-persona": una participación por persona y semana, aunque haya
 *   subido varias fotos (subir 3 no triplica las opciones). ← regla actual
 * - "una-por-foto": cada foto aprobada es una participación.
 */
export type ReglaParticipacion = "una-por-persona" | "una-por-foto";
export const REGLA_PARTICIPACION: ReglaParticipacion = "una-por-persona";

export type FotoCandidata = Pick<Foto, "id" | "fingerprint" | "instagram" | "votos_count" | "created_at">;

export type CodigoErrorSorteo =
  | "semana-invalida"
  | "semana-abierta"
  | "anterior-al-sorteo"
  | "ya-sorteada"
  | "sin-participantes"
  | "no-hay-sorteo"
  | "motivo-obligatorio";

export class ErrorSorteo extends Error {
  codigo: CodigoErrorSorteo;
  constructor(codigo: CodigoErrorSorteo, mensaje: string) {
    super(mensaje);
    this.name = "ErrorSorteo";
    this.codigo = codigo;
  }
}

// ─── Participantes ────────────────────────────────────────────────────────────

/** `@Pepe_88`, `instagram.com/pepe_88/` → `pepe_88`. */
export function normalizarInstagram(ig: string | null | undefined): string | null {
  if (!ig) return null;
  const limpio = ig
    .trim()
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?instagram\.com\//, "")
    .replace(/^@+/, "")
    .replace(/[/?#].*$/, "");
  return limpio || null;
}

/**
 * Agrupa las fotos por persona. Dos fotos son de la misma persona si
 * comparten `fingerprint` (mismo dispositivo) **o** el mismo Instagram
 * (normalizado): así alguien que sube desde dos móviles no entra dos veces.
 */
export function agruparPorPersona(fotos: FotoCandidata[]): FotoCandidata[][] {
  const padre = fotos.map((_, i) => i);
  const raiz = (i: number): number => (padre[i] === i ? i : (padre[i] = raiz(padre[i])));
  const unir = (a: number, b: number) => {
    padre[raiz(a)] = raiz(b);
  };

  const primeraPorClave = new Map<string, number>();
  fotos.forEach((f, i) => {
    const claves = [`fp:${f.fingerprint}`];
    const ig = normalizarInstagram(f.instagram);
    if (ig) claves.push(`ig:${ig}`);
    for (const clave of claves) {
      const previa = primeraPorClave.get(clave);
      if (previa === undefined) primeraPorClave.set(clave, i);
      else unir(i, previa);
    }
  });

  const grupos = new Map<number, FotoCandidata[]>();
  fotos.forEach((f, i) => {
    const r = raiz(i);
    if (!grupos.has(r)) grupos.set(r, []);
    grupos.get(r)!.push(f);
  });
  return [...grupos.values()];
}

/** La foto que representa a una persona: la más votada (luego la más antigua). */
function representante(grupo: FotoCandidata[]): FotoCandidata {
  return [...grupo].sort(
    (a, b) =>
      b.votos_count - a.votos_count ||
      a.created_at.localeCompare(b.created_at) ||
      a.id.localeCompare(b.id),
  )[0];
}

/**
 * Participaciones del bombo, ordenadas por id (orden estable para el hash).
 * `excluirFotoIds`: ganadoras de sorteos anulados esa semana; se excluye a
 * la **persona** entera, no solo esa foto.
 */
export function calcularParticipantes(
  fotos: FotoCandidata[],
  opciones: { regla?: ReglaParticipacion; excluirFotoIds?: string[] } = {},
): FotoCandidata[] {
  const regla = opciones.regla ?? REGLA_PARTICIPACION;
  const excluir = new Set(opciones.excluirFotoIds ?? []);
  const grupos = agruparPorPersona(fotos).filter((g) => !g.some((f) => excluir.has(f.id)));
  const entradas = regla === "una-por-persona" ? grupos.map(representante) : grupos.flat();
  return entradas.sort((a, b) => a.id.localeCompare(b.id));
}

/** SHA-256 (hex) de los ids, ordenados y unidos por "\n". Reproducible a mano. */
export function hashParticipantes(ids: string[]): string {
  return createHash("sha256").update([...ids].sort().join("\n")).digest("hex");
}

/** Elige una participación con `crypto.randomInt` (nunca Math.random). */
export function elegirGanador<T>(participantes: T[], aleatorio: (max: number) => number = randomInt): T {
  if (participantes.length === 0) throw new ErrorSorteo("sin-participantes", "No hay participantes");
  return participantes[aleatorio(participantes.length)];
}

// ─── ¿Había premio esa semana? ────────────────────────────────────────────────

export type PremioCandidato = Pick<Premio, "id" | "titulo" | "activo" | "valido_hasta" | "created_at">;

/**
 * El premio que la web estaba mostrando durante una semana, o null si no había.
 *
 * La tabla no guarda un histórico de qué premio estuvo activo y cuándo, así que
 * se deduce igual que lo muestra la web (el premio activo más reciente; activar
 * uno nuevo desactiva los demás):
 * - Se toma el último premio creado antes de que acabe la semana que siga
 *   activo o que fuera sustituido después por otro más nuevo. Uno desactivado
 *   y no sustituido se retiró a mano: no cuenta.
 * - Si su `valido_hasta` es anterior al inicio de la semana, ya había caducado.
 *
 * Es una aproximación: sirve para avisar en el admin, no para bloquear.
 */
export function premioPublicadoEnSemana(
  premios: PremioCandidato[],
  rango: { inicio: Date; fin: Date },
): PremioCandidato | null {
  // created_at llega como "2026-10-09T12:00:00.123456+00:00": se compara como fecha.
  const t = (p: PremioCandidato) => Date.parse(p.created_at);
  const porFecha = [...premios].sort((a, b) => t(a) - t(b));
  const previos = porFecha.filter((p) => t(p) <= rango.fin.getTime());
  const sustituido = (p: PremioCandidato) => porFecha.some((o) => t(o) > t(p));
  const candidato = [...previos].reverse().find((p) => p.activo || sustituido(p)) ?? null;
  if (!candidato) return null;
  const inicioDia = rango.inicio.toISOString().slice(0, 10);
  if (candidato.valido_hasta && candidato.valido_hasta < inicioDia) return null;
  return candidato;
}

// ─── Reglas de semana ─────────────────────────────────────────────────────────

/** ¿Se puede sortear esta semana? Solo semanas cerradas y desde el inicio. */
export function comprobarSemana(semana: string, semanaActual: string): void {
  if (!/^\d{4}-W\d{2}$/.test(semana)) {
    throw new ErrorSorteo("semana-invalida", "Formato de semana inválido");
  }
  if (semana < SEMANA_INICIO_SORTEO) {
    throw new ErrorSorteo(
      "anterior-al-sorteo",
      `Las semanas anteriores a ${SEMANA_INICIO_SORTEO} se resolvieron por votos`,
    );
  }
  if (semana >= semanaActual) {
    throw new ErrorSorteo("semana-abierta", "La semana sigue abierta: se sortea cuando termine");
  }
}

// ─── Operaciones (sobre un repositorio) ───────────────────────────────────────

export interface NuevoSorteo {
  semana: string;
  foto_ganadora_id: string;
  participantes: number;
  participantes_hash: string;
}

export interface RepoSorteo {
  fotosAprobadas(semana: string): Promise<FotoCandidata[]>;
  sorteosDeSemana(semana: string): Promise<Sorteo[]>;
  /** Debe lanzar ErrorSorteo("ya-sorteada") si ya hay uno válido (índice único). */
  insertar(sorteo: NuevoSorteo): Promise<Sorteo>;
  borrar(id: string): Promise<void>;
  /** Deja `ganadora = true` solo en esta foto dentro de su semana. */
  marcarGanadora(semana: string, fotoId: string): Promise<void>;
  quitarGanadora(fotoId: string): Promise<void>;
  anular(id: string, motivo: string, fecha: string): Promise<void>;
}

export interface EstadoSorteo {
  semana: string;
  vigente: Sorteo | null;
  anulados: Sorteo[];
  participantes: FotoCandidata[];
  totalFotos: number;
}

export async function estadoSorteo(repo: RepoSorteo, semana: string): Promise<EstadoSorteo> {
  const [sorteos, fotos] = await Promise.all([repo.sorteosDeSemana(semana), repo.fotosAprobadas(semana)]);
  const anulados = sorteos.filter((s) => s.anulado);
  return {
    semana,
    vigente: sorteos.find((s) => !s.anulado) ?? null,
    anulados,
    participantes: calcularParticipantes(fotos, {
      excluirFotoIds: anulados.map((s) => s.foto_ganadora_id).filter((id): id is string => !!id),
    }),
    totalFotos: fotos.length,
  };
}

export interface ResultadoSorteo {
  sorteo: Sorteo;
  ganadora: FotoCandidata;
  participantes: number;
}

/**
 * Hace el sorteo de una semana cerrada. Rechaza si ya hay uno válido: para
 * repetirlo hay que anular el anterior con un motivo.
 */
export async function realizarSorteo(
  repo: RepoSorteo,
  semana: string,
  semanaActual: string,
  aleatorio: (max: number) => number = randomInt,
): Promise<ResultadoSorteo> {
  comprobarSemana(semana, semanaActual);

  const estado = await estadoSorteo(repo, semana);
  if (estado.vigente) {
    throw new ErrorSorteo("ya-sorteada", "Esta semana ya tiene un sorteo válido. Anúlalo antes de repetir.");
  }
  if (estado.participantes.length === 0) {
    throw new ErrorSorteo("sin-participantes", "No hay fotos aprobadas que puedan entrar en el sorteo");
  }

  const ganadora = elegirGanador(estado.participantes, aleatorio);
  const sorteo = await repo.insertar({
    semana,
    foto_ganadora_id: ganadora.id,
    participantes: estado.participantes.length,
    participantes_hash: hashParticipantes(estado.participantes.map((p) => p.id)),
  });

  // Se reutiliza fotos.ganadora para que la web muestre la ganadora como hasta
  // ahora. Si falla, se deshace el registro para no dejar un sorteo a medias.
  try {
    await repo.marcarGanadora(semana, ganadora.id);
  } catch (err) {
    await repo.borrar(sorteo.id).catch(() => {});
    throw err;
  }

  return { sorteo, ganadora, participantes: estado.participantes.length };
}

/** Anula el sorteo válido de la semana (queda en el histórico con su motivo). */
export async function anularSorteo(repo: RepoSorteo, semana: string, motivo: string): Promise<Sorteo> {
  const texto = motivo.trim();
  if (texto.length < 3) {
    throw new ErrorSorteo("motivo-obligatorio", "Indica el motivo de la anulación");
  }
  const vigente = (await repo.sorteosDeSemana(semana)).find((s) => !s.anulado);
  if (!vigente) throw new ErrorSorteo("no-hay-sorteo", "No hay ningún sorteo válido que anular esa semana");

  await repo.anular(vigente.id, texto, new Date().toISOString());
  if (vigente.foto_ganadora_id) await repo.quitarGanadora(vigente.foto_ganadora_id);
  return vigente;
}
