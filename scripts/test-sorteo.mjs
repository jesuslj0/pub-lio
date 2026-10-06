// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS DEL SORTEO SEMANAL (en local, con datos de prueba en memoria)
//
// No toca Supabase: usa un repositorio en memoria que imita las restricciones
// de la tabla `sorteos` (un solo sorteo válido por semana = índice único
// parcial). Comprueba la lógica real de src/lib/sorteo.ts.
//
// USO (Node ≥ 22.18, que ejecuta TypeScript sin compilar):
//   node scripts/test-sorteo.mjs
// ─────────────────────────────────────────────────────────────────────────────

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ErrorSorteo,
  SEMANA_INICIO_SORTEO,
  anularSorteo,
  calcularParticipantes,
  estadoSorteo,
  hashParticipantes,
  normalizarInstagram,
  realizarSorteo,
} from "../src/lib/sorteo.ts";

const SEMANA = "2026-W41";
const ACTUAL = "2026-W42"; // la semana a sortear ya está cerrada

let n = 0;
const foto = (over = {}) => ({
  id: `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`,
  fingerprint: `fp-${n}`,
  instagram: null,
  votos_count: 0,
  created_at: `2026-10-0${(n % 9) + 1}T22:00:00Z`,
  semana: SEMANA,
  estado: "aprobada",
  ganadora: false,
  ...over,
});

/** Repositorio en memoria con las mismas reglas que la base de datos. */
function repoMemoria(fotos) {
  const sorteos = [];
  let seq = 0;
  return {
    fotos,
    sorteos,
    async fotosAprobadas(semana) {
      return fotos.filter((f) => f.semana === semana && f.estado === "aprobada");
    },
    async sorteosDeSemana(semana) {
      return sorteos.filter((s) => s.semana === semana).map((s) => ({ ...s }));
    },
    async insertar(nuevo) {
      // Índice único parcial: (semana) WHERE NOT anulado
      if (sorteos.some((s) => s.semana === nuevo.semana && !s.anulado)) {
        throw new ErrorSorteo("ya-sorteada", "violación de unicidad");
      }
      const fila = {
        id: `sorteo-${++seq}`,
        realizado_at: new Date().toISOString(),
        anulado: false,
        motivo_anulacion: null,
        anulado_at: null,
        ...nuevo,
      };
      sorteos.push(fila);
      return { ...fila };
    },
    async borrar(id) {
      const i = sorteos.findIndex((s) => s.id === id);
      if (i >= 0) sorteos.splice(i, 1);
    },
    async marcarGanadora(semana, fotoId) {
      for (const f of fotos) if (f.semana === semana) f.ganadora = f.id === fotoId;
    },
    async quitarGanadora(fotoId) {
      const f = fotos.find((x) => x.id === fotoId);
      if (f) f.ganadora = false;
    },
    async anular(id, motivo, fecha) {
      if (!motivo.trim()) throw new Error("CHECK sorteos_motivo_si_anulado");
      Object.assign(sorteos.find((s) => s.id === id), { anulado: true, motivo_anulacion: motivo, anulado_at: fecha });
    },
  };
}

const esError = (codigo) => (err) => err instanceof ErrorSorteo && err.codigo === codigo;

test("una persona con 3 fotos entra una sola vez (con su foto más votada)", () => {
  const ana = [
    foto({ fingerprint: "fp-ana", votos_count: 2 }),
    foto({ fingerprint: "fp-ana", votos_count: 9 }),
    foto({ fingerprint: "fp-ana", votos_count: 5 }),
  ];
  const otros = [foto(), foto(), foto()];
  const p = calcularParticipantes([...ana, ...otros]);
  assert.equal(p.length, 4, "3 de Ana + 3 personas = 4 participaciones");
  const deAna = p.filter((x) => x.fingerprint === "fp-ana");
  assert.equal(deAna.length, 1);
  assert.equal(deAna[0].votos_count, 9);
});

test("mismo Instagram desde dos móviles = una sola persona", () => {
  assert.equal(normalizarInstagram("  @Pepe_88 "), "pepe_88");
  assert.equal(normalizarInstagram("https://www.instagram.com/pepe_88/"), "pepe_88");
  const p = calcularParticipantes([
    foto({ fingerprint: "movil-1", instagram: "@Pepe_88" }),
    foto({ fingerprint: "movil-2", instagram: "instagram.com/pepe_88" }),
    foto({ fingerprint: "movil-3", instagram: "otra" }),
  ]);
  assert.equal(p.length, 2);
});

test("regla alternativa: una participación por foto", () => {
  const fotos = [foto({ fingerprint: "x" }), foto({ fingerprint: "x" }), foto()];
  assert.equal(calcularParticipantes(fotos, { regla: "una-por-foto" }).length, 3);
});

test("solo cuentan fotos aprobadas de esa semana", async () => {
  const repo = repoMemoria([
    foto(),
    foto({ estado: "pendiente" }),
    foto({ estado: "rechazada" }),
    foto({ semana: "2026-W40" }),
  ]);
  const e = await estadoSorteo(repo, SEMANA);
  assert.equal(e.participantes.length, 1);
});

test("sorteo correcto: guarda registro, hash verificable y marca ganadora", async () => {
  const repo = repoMemoria([foto({ fingerprint: "a" }), foto({ fingerprint: "a" }), foto(), foto()]);
  const r = await realizarSorteo(repo, SEMANA, ACTUAL);
  assert.equal(r.participantes, 3);
  assert.equal(repo.sorteos.length, 1);
  const ids = calcularParticipantes(repo.fotos).map((f) => f.id);
  assert.equal(r.sorteo.participantes_hash, hashParticipantes(ids));
  assert.match(r.sorteo.participantes_hash, /^[0-9a-f]{64}$/);
  const ganadoras = repo.fotos.filter((f) => f.ganadora);
  assert.deepEqual(ganadoras.map((f) => f.id), [r.ganadora.id]);
});

test("no se puede sortear dos veces la misma semana", async () => {
  const repo = repoMemoria([foto(), foto(), foto()]);
  await realizarSorteo(repo, SEMANA, ACTUAL);
  await assert.rejects(realizarSorteo(repo, SEMANA, ACTUAL), esError("ya-sorteada"));
  assert.equal(repo.sorteos.length, 1);
});

test("dos sorteos a la vez: solo uno gana la carrera (índice único)", async () => {
  const repo = repoMemoria([foto(), foto(), foto()]);
  const res = await Promise.allSettled([realizarSorteo(repo, SEMANA, ACTUAL), realizarSorteo(repo, SEMANA, ACTUAL)]);
  assert.equal(res.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(repo.sorteos.filter((s) => !s.anulado).length, 1);
});

test("anulación: pide motivo, quita la ganadora y permite repetir sin la persona anulada", async () => {
  const fotos = [foto({ fingerprint: "a" }), foto({ fingerprint: "a" }), foto({ fingerprint: "b" }), foto({ fingerprint: "c" })];
  const repo = repoMemoria(fotos);
  // Forzamos que salga la primera participación para que el test sea determinista.
  const r1 = await realizarSorteo(repo, SEMANA, ACTUAL, () => 0);
  const personaAnulada = r1.ganadora.fingerprint;

  await assert.rejects(anularSorteo(repo, SEMANA, "  "), esError("motivo-obligatorio"));
  await anularSorteo(repo, SEMANA, "No responde por Instagram en el plazo");

  assert.equal(repo.sorteos[0].anulado, true);
  assert.equal(repo.sorteos[0].motivo_anulacion, "No responde por Instagram en el plazo");
  assert.ok(repo.fotos.every((f) => !f.ganadora), "ya no hay ganadora marcada");

  const r2 = await realizarSorteo(repo, SEMANA, ACTUAL, () => 0);
  assert.notEqual(r2.ganadora.fingerprint, personaAnulada, "quien ganó el anulado no vuelve a entrar");
  assert.equal(r2.participantes, 2);
  assert.equal(repo.sorteos.length, 2, "el anulado se conserva como histórico");
  await assert.rejects(realizarSorteo(repo, SEMANA, ACTUAL), esError("ya-sorteada"));
});

test("no hay nada que anular si no hay sorteo válido", async () => {
  const repo = repoMemoria([foto()]);
  await assert.rejects(anularSorteo(repo, SEMANA, "motivo"), esError("no-hay-sorteo"));
});

test("semanas no sorteables: abierta, anteriores al cambio y formato", async () => {
  const repo = repoMemoria([foto()]);
  await assert.rejects(realizarSorteo(repo, SEMANA, SEMANA), esError("semana-abierta"));
  await assert.rejects(realizarSorteo(repo, "2026-W40", ACTUAL), esError("anterior-al-sorteo"));
  await assert.rejects(realizarSorteo(repo, "2026-41", ACTUAL), esError("semana-invalida"));
  assert.equal(SEMANA_INICIO_SORTEO, "2026-W41");
});

test("sin fotos aprobadas no hay sorteo", async () => {
  const repo = repoMemoria([foto({ estado: "pendiente" })]);
  await assert.rejects(realizarSorteo(repo, SEMANA, ACTUAL), esError("sin-participantes"));
  assert.equal(repo.sorteos.length, 0);
});

test("si falla el marcado de ganadora, no queda un sorteo a medias", async () => {
  const repo = repoMemoria([foto(), foto()]);
  repo.marcarGanadora = async () => {
    throw new Error("fallo de red");
  };
  await assert.rejects(realizarSorteo(repo, SEMANA, ACTUAL));
  assert.equal(repo.sorteos.length, 0);
});

test("el azar es crypto.randomInt y reparte entre todos", async () => {
  const cuentas = new Map();
  for (let i = 0; i < 3000; i++) {
    const repo = repoMemoria([foto({ id: "a" }), foto({ id: "b" }), foto({ id: "c" })]);
    const r = await realizarSorteo(repo, SEMANA, ACTUAL);
    cuentas.set(r.ganadora.id, (cuentas.get(r.ganadora.id) ?? 0) + 1);
  }
  for (const id of ["a", "b", "c"]) {
    const c = cuentas.get(id) ?? 0;
    assert.ok(c > 850 && c < 1150, `${id} salió ${c} veces de 3000 (esperado ~1000)`);
  }
});
