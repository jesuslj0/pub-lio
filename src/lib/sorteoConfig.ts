// Configuración del sorteo que también se usa en el navegador (sin node:crypto).

/**
 * Primera semana que se resuelve por sorteo. Las anteriores conservan su
 * "ganadora por votos" tal cual. 2026-W41 = jueves 8 → miércoles 14 oct 2026,
 * que se sortea a partir del jueves 15.
 */
export const SEMANA_INICIO_SORTEO = "2026-W41";

/** ¿Esta semana de concurso se resuelve por sorteo? */
export function semanaConSorteo(semana: string): boolean {
  return semana >= SEMANA_INICIO_SORTEO;
}
