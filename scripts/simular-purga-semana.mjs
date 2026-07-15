// ─────────────────────────────────────────────────────────────────────────────
// SIMULADOR DE PURGA · toda la semana (SOLO LECTURA)
//
// Aplica el MISMO criterio anti-fraude a TODAS las fotos de una semana y muestra
// cómo quedaría el ranking al quitar los votos sospechosos. No borra ni escribe
// nada: solo hace SELECT. Es una simulación para decidir con la misma vara para
// todos (ver scripts/votos-forense.mjs para el detalle de una sola foto).
//
// Dos criterios, de conservador a agresivo:
//   🔴 "todas nuevas": votos en ráfaga cuyo cluster es entero de huella nueva.
//   ALTA            : cualquier voto en ráfaga + de huella de un solo uso.
//
// USO (desde la raíz del proyecto, en WSL):
//   node --env-file=.env.local scripts/simular-purga-semana.mjs
//   node --env-file=.env.local scripts/simular-purga-semana.mjs --semana 2026-W28
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const URL = process.env.PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL || !KEY) {
  console.error(
    "✖ Faltan credenciales. Ejecuta con:\n" +
      "  node --env-file=.env.local scripts/simular-purga-semana.mjs",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const val = (f) => {
  const i = args.indexOf(f);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};
const VENTANA = Number(val("--ventana")) || 120; // seg. entre votos = ráfaga
const MIN_RAFAGA = Number(val("--min-rafaga")) || 3;
let SEMANA = val("--semana");

const db = createClient(URL, KEY, { auth: { persistSession: false } });
const seg = (a, b) => Math.round((new Date(b) - new Date(a)) / 1000);

// ── Traer TODOS los votos de una vez (id, foto, huella, hora) ────────────────
const { data: allV, error: eV } = await db
  .from("votos")
  .select("id, foto_id, fingerprint, created_at");
if (eV) {
  console.error("✖ Error trayendo votos:", eV.message);
  process.exit(1);
}

// Huella -> nº de fotos distintas en las que ha votado (1 = "de un solo uso")
const fotosPorHuella = new Map();
for (const v of allV) {
  if (!fotosPorHuella.has(v.fingerprint))
    fotosPorHuella.set(v.fingerprint, new Set());
  fotosPorHuella.get(v.fingerprint).add(v.foto_id);
}

// Votos agrupados por foto
const votosDe = new Map();
for (const v of allV) {
  if (!votosDe.has(v.foto_id)) votosDe.set(v.foto_id, []);
  votosDe.get(v.foto_id).push(v);
}

// ── Determinar la semana (por defecto: la de la foto más votada) ─────────────
if (!SEMANA) {
  const { data, error } = await db
    .from("fotos")
    .select("semana, votos_count")
    .order("votos_count", { ascending: false })
    .limit(1);
  if (error || !data?.length) {
    console.error("✖ No pude determinar la semana:", error?.message);
    process.exit(1);
  }
  SEMANA = data[0].semana;
}

// ── Fotos de la semana ───────────────────────────────────────────────────────
const { data: fotos, error: eF } = await db
  .from("fotos")
  .select("id, nombre_autor, votos_count, estado")
  .eq("semana", SEMANA)
  .order("votos_count", { ascending: false });
if (eF) {
  console.error("✖ Error trayendo fotos:", eF.message);
  process.exit(1);
}

// ── Analizar cada foto ───────────────────────────────────────────────────────
function analizar(fotoId) {
  const votos = (votosDe.get(fotoId) || [])
    .slice()
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  const n = votos.length;

  // Clusters temporales
  const cluster = [];
  let cid = 0;
  for (let i = 0; i < n; i++) {
    if (i === 0 || seg(votos[i - 1].created_at, votos[i].created_at) > VENTANA)
      cid++;
    cluster[i] = cid;
  }
  const tam = new Map();
  const nuevasEnCluster = new Map();
  for (let i = 0; i < n; i++) {
    tam.set(cluster[i], (tam.get(cluster[i]) || 0) + 1);
    const fantasma = (fotosPorHuella.get(votos[i].fingerprint)?.size ?? 1) === 1;
    if (fantasma)
      nuevasEnCluster.set(cluster[i], (nuevasEnCluster.get(cluster[i]) || 0) + 1);
  }

  let alta = 0; // en ráfaga + huella de un solo uso
  let rojo = 0; // en ráfaga cuyo cluster es entero de huella nueva
  for (let i = 0; i < n; i++) {
    const enRafaga = tam.get(cluster[i]) >= MIN_RAFAGA;
    if (!enRafaga) continue;
    const fantasma = (fotosPorHuella.get(votos[i].fingerprint)?.size ?? 1) === 1;
    if (fantasma) alta++;
    if (nuevasEnCluster.get(cluster[i]) === tam.get(cluster[i])) rojo++;
  }
  return { n, alta, rojo };
}

const filas = fotos
  .map((f) => {
    const { n, alta, rojo } = analizar(f.id);
    return {
      autor: f.nombre_autor ?? "—",
      estado: f.estado,
      bruto: n,
      rojo,
      alta,
      trasRojo: n - rojo,
      trasAlta: n - alta,
    };
  })
  .filter((r) => r.bruto > 0);

// ── Salida ───────────────────────────────────────────────────────────────────
const linea = (c = "─") => console.log(c.repeat(72));
linea("═");
console.log(`  SIMULACRO DE PURGA · semana ${SEMANA}  (SOLO LECTURA, no borra nada)`);
console.log(`  Ráfaga = ≥ ${MIN_RAFAGA} votos con < ${VENTANA}s entre sí`);
linea("═");

const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);
console.log(
  `  ${pad("Autor", 18)} ${pad("Estado", 10)} ${num("Bruto", 6)} ${num(
    "🔴",
    4,
  )} ${num("→Rojo", 7)} ${num("ALTA", 5)} ${num("→Alta", 7)}`,
);
linea();
for (const r of filas) {
  console.log(
    `  ${pad(r.autor, 18)} ${pad(r.estado, 10)} ${num(r.bruto, 6)} ${num(
      r.rojo,
      4,
    )} ${num(r.trasRojo, 7)} ${num(r.alta, 5)} ${num(r.trasAlta, 7)}`,
  );
}
linea();

// Rankings resultantes
const ranking = (clave) =>
  [...filas]
    .sort((a, b) => b[clave] - a[clave])
    .map((r, i) => `${i + 1}º ${r.autor} (${r[clave]})`)
    .slice(0, 4)
    .join("  ·  ");

console.log("\n  RANKING SEGÚN CRITERIO");
console.log(`   Bruto (ahora) ........ ${ranking("bruto")}`);
console.log(`   Conservador (🔴) ..... ${ranking("trasRojo")}`);
console.log(`   Agresivo (ALTA) ...... ${ranking("trasAlta")}`);
linea("═");
console.log(
  "  Heurística con huella + tiempo (sin IP): estimación, no prueba.\n" +
    "  Nada se ha modificado. Para purgar de verdad una foto concreta usa\n" +
    "  scripts/votos-forense.mjs --foto <id> --quitar --ejecutar",
);
