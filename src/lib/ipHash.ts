import { createHash } from "node:crypto";

// ⚠️ SOLO SERVIDOR. Convierte una IP en un hash estable con sal secreta.
//
// Sirve para agrupar votos que salen de la misma conexión sin llegar a guardar
// la IP (dato personal). La sal es imprescindible: sin ella el espacio IPv4 son
// 4.300 millones de valores y cualquiera revierte el hash por fuerza bruta en
// segundos. Por eso, si falta VOTE_IP_SALT no se hashea nada y se guarda null:
// preferimos quedarnos sin señal antes que dar una falsa sensación de anonimato.
const SALT = import.meta.env.VOTE_IP_SALT;

let avisoDado = false;

/** Hash SHA-256 de la IP con sal. `null` si no hay IP o no hay sal configurada. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;

  if (!SALT) {
    if (!avisoDado) {
      console.warn(
        "[ipHash] Falta VOTE_IP_SALT: los votos se guardarán sin ip_hash. " +
          "Configúrala en .env.local y en el dashboard de Vercel.",
      );
      avisoDado = true;
    }
    return null;
  }

  return createHash("sha256").update(`${SALT}:${ip}`).digest("hex");
}
