// ─────────────────────────────────────────────────────────────────────────────
// FORENSE DE VOTOS · Lío El Bonillo
//
// Herramienta de ADMIN, fuera de la web. No modifica la app. Sirve para:
//   1) INFORME (solo lectura): analizar de dónde salen los votos de una foto y
//      estimar cuántos son probablemente reales vs. inflados (auto-voto abriendo
//      la web en varios navegadores).
//   2) PURGA (opcional y BLOQUEADA): quitar votos sospechosos SI tú lo decides.
//      Por defecto solo SIMULA. No borra nada hasta que añadas --ejecutar.
//
// Datos disponibles por voto: id · fingerprint · created_at.
// (La IP NO se guardó en `votos`, así que "de dónde" es por huella + tiempo,
//  no por red. Es heurística, no una prueba.)
//
// USO (desde la raíz del proyecto, en WSL, con Node 22):
//   # Informe de la foto más votada cuyo autor contiene "amador":
//   node --env-file=.env.local scripts/votos-forense.mjs
//
//   # Informe de una foto concreta:
//   node --env-file=.env.local scripts/votos-forense.mjs --foto <UUID>
//
//   # Otro autor / ajustar sensibilidad de las ráfagas:
//   node --env-file=.env.local scripts/votos-forense.mjs --autor "amador" --ventana 120
//
//   # SIMULAR la purga de los votos marcados como muy sospechosos (no borra):
//   node --env-file=.env.local scripts/votos-forense.mjs --quitar
//
//   # SIMULAR la purga de una lista concreta de ids elegida por ti:
//   node --env-file=.env.local scripts/votos-forense.mjs --quitar --ids id1,id2,id3
//
//   # EJECUTAR de verdad la purga (borra votos y recalcula votos_count):
//   node --env-file=.env.local scripts/votos-forense.mjs --quitar --ejecutar
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

// ── Configuración / credenciales ────────────────────────────────────────────
const URL = process.env.PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !KEY) {
  console.error(
    "✖ Faltan credenciales. Ejecuta con:\n" +
      "  node --env-file=.env.local scripts/votos-forense.mjs\n" +
      "(Necesita PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local)",
  );
  process.exit(1);
}

// ── Argumentos ───────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => {
  const i = args.indexOf(f);
  return i !== -1 && args[i + 1] ? args[i + 1] : null;
};

const AUTOR = (val("--autor") || "amador").toLowerCase();
const FOTO_ID = val("--foto");
const VENTANA = Number(val("--ventana")) || 120; // seg. entre votos para "ráfaga"
const MIN_RAFAGA = Number(val("--min-rafaga")) || 3; // votos seguidos = ráfaga
const QUITAR = has("--quitar");
const EJECUTAR = has("--ejecutar");
const IDS = (val("--ids") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const db = createClient(URL, KEY, { auth: { persistSession: false } });

// ── Helpers de formato ───────────────────────────────────────────────────────
const hhmm = (iso) =>
  new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const seg = (a, b) => Math.round((new Date(b) - new Date(a)) / 1000);
const linea = (c = "─") => console.log(c.repeat(64));

// ─────────────────────────────────────────────────────────────────────────────
// 1 · Localizar la foto objetivo
// ─────────────────────────────────────────────────────────────────────────────
let foto;
if (FOTO_ID) {
  const { data, error } = await db
    .from("fotos")
    .select("id, nombre_autor, semana, votos_count, ganadora, estado")
    .eq("id", FOTO_ID)
    .single();
  if (error) {
    console.error("✖ No encuentro esa foto:", error.message);
    process.exit(1);
  }
  foto = data;
} else {
  const { data, error } = await db
    .from("fotos")
    .select("id, nombre_autor, semana, votos_count, ganadora, estado")
    .ilike("nombre_autor", `%${AUTOR}%`)
    .order("votos_count", { ascending: false });
  if (error) {
    console.error("✖ Error consultando fotos:", error.message);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.error(`✖ No hay ninguna foto con autor que contenga "${AUTOR}".`);
    process.exit(1);
  }
  foto = data[0];
  if (data.length > 1) {
    console.log(
      `ℹ Hay ${data.length} fotos con autor "${AUTOR}". Analizo la más votada.\n` +
        `  (Para otra, usa --foto <id>. Ids: ${data
          .map((f) => `${f.id.slice(0, 8)}…=${f.votos_count}v`)
          .join(", ")})\n`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 · Traer los votos de la foto + el reparto global de huellas
// ─────────────────────────────────────────────────────────────────────────────
const { data: votos, error: eV } = await db
  .from("votos")
  .select("id, fingerprint, created_at")
  .eq("foto_id", foto.id)
  .order("created_at", { ascending: true });
if (eV) {
  console.error("✖ Error trayendo votos:", eV.message);
  process.exit(1);
}

// Todos los votos (solo huella + foto) para saber qué huellas votan en varias
// fotos (votante "habitual", más probablemente real) vs. de un solo uso.
const { data: todos, error: eT } = await db
  .from("votos")
  .select("fingerprint, foto_id");
if (eT) {
  console.error("✖ Error trayendo el global de votos:", eT.message);
  process.exit(1);
}
const fotosPorHuella = new Map(); // fingerprint -> Set(foto_id)
const votosPorHuella = new Map(); // fingerprint -> nº total de votos
for (const v of todos) {
  if (!fotosPorHuella.has(v.fingerprint))
    fotosPorHuella.set(v.fingerprint, new Set());
  fotosPorHuella.get(v.fingerprint).add(v.foto_id);
  votosPorHuella.set(
    v.fingerprint,
    (votosPorHuella.get(v.fingerprint) || 0) + 1,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Detección de ráfagas (votos encadenados en poco tiempo)
// ─────────────────────────────────────────────────────────────────────────────
// Cada foto arranca un "cluster" nuevo cuando el hueco con el voto anterior
// supera VENTANA seg. Los clusters con >= MIN_RAFAGA votos son ráfagas.
const cluster = [];
let cid = 0;
for (let i = 0; i < votos.length; i++) {
  if (i === 0 || seg(votos[i - 1].created_at, votos[i].created_at) > VENTANA)
    cid++;
  cluster[i] = cid;
}
const tamCluster = new Map();
for (const c of cluster) tamCluster.set(c, (tamCluster.get(c) || 0) + 1);

// ─────────────────────────────────────────────────────────────────────────────
// 4 · Clasificar cada voto
// ─────────────────────────────────────────────────────────────────────────────
// enRafaga : forma parte de un cluster >= MIN_RAFAGA (encadenado, poco natural)
// fantasma : su huella SOLO ha votado en esta foto (no es votante habitual)
// alta     : enRafaga Y fantasma  → auto-voto multi-navegador casi seguro
const clasificados = votos.map((v, i) => {
  const enRafaga = tamCluster.get(cluster[i]) >= MIN_RAFAGA;
  const fotosDeEstaHuella = fotosPorHuella.get(v.fingerprint)?.size ?? 1;
  const fantasma = fotosDeEstaHuella === 1;
  return {
    ...v,
    idx: i,
    cluster: cluster[i],
    enRafaga,
    fantasma,
    alta: enRafaga && fantasma,
  };
});

const n = clasificados.length;
const nRafaga = clasificados.filter((v) => v.enRafaga).length;
const nFantasma = clasificados.filter((v) => v.fantasma).length;
const nAlta = clasificados.filter((v) => v.alta).length;
const nGris = clasificados.filter((v) => !v.alta && (v.enRafaga || v.fantasma))
  .length;

// ─────────────────────────────────────────────────────────────────────────────
// 5 · INFORME (solo lectura)
// ─────────────────────────────────────────────────────────────────────────────
linea("═");
console.log(`  FORENSE DE VOTOS · foto de "${foto.nombre_autor ?? "—"}"`);
linea("═");
console.log(`  Semana:        ${foto.semana}`);
console.log(`  Estado:        ${foto.estado}${foto.ganadora ? " · GANADORA" : ""}`);
console.log(`  votos_count:   ${foto.votos_count}`);
console.log(`  Votos leídos:  ${n}${
  n !== foto.votos_count ? `  ⚠ no coincide con votos_count` : ""
}`);
console.log(`  Foto id:       ${foto.id}`);

// Reparto por hora del día (una raya por voto) para ver la "forma"
console.log("\n  Reparto por hora del día (hora local):");
const porHora = new Array(24).fill(0);
for (const v of clasificados) porHora[new Date(v.created_at).getHours()]++;
const maxH = Math.max(1, ...porHora);
for (let h = 0; h < 24; h++) {
  if (porHora[h] === 0) continue;
  const barra = "█".repeat(Math.round((porHora[h] / maxH) * 32));
  console.log(
    `   ${String(h).padStart(2, "0")}h │ ${barra} ${porHora[h]}`,
  );
}

// Ráfagas detectadas
const rafagas = [...tamCluster.entries()]
  .filter(([, size]) => size >= MIN_RAFAGA)
  .map(([c]) => clasificados.filter((v) => v.cluster === c));
console.log(
  `\n  Ráfagas (≥ ${MIN_RAFAGA} votos con < ${VENTANA}s entre sí): ${rafagas.length}`,
);
for (const grupo of rafagas) {
  const ini = grupo[0].created_at;
  const fin = grupo[grupo.length - 1].created_at;
  const dur = seg(ini, fin);
  const fant = grupo.filter((v) => v.fantasma).length;
  console.log(
    `   • ${grupo.length} votos en ${dur}s  (${hhmm(ini)} → ${hhmm(
      fin,
    )})  · ${fant} de huella nueva`,
  );
}

// Resumen y estimación
linea();
console.log("  RESUMEN");
console.log(`   Total de votos ............... ${n}`);
console.log(`   En ráfaga .................... ${nRafaga}`);
console.log(`   De huella de un solo uso ..... ${nFantasma}`);
console.log(`   Sospecha ALTA (ráfaga+nueva) . ${nAlta}`);
console.log(`   Zona gris (una sola señal) ... ${nGris}`);
linea();
console.log(
  `  ESTIMACIÓN  ·  probablemente reales ≈ ${n - nAlta}` +
    `  |  probablemente inflados ≈ ${nAlta}  (±${nGris} dudosos)`,
);
console.log(
  "  (Heurística con huella + tiempo; sin IP no es prueba. Ajusta con\n" +
    "   --ventana y --min-rafaga si crees que marca de más o de menos.)",
);

// Comparativa rápida con el resto de fotos de la misma semana
const { data: hermanas } = await db
  .from("fotos")
  .select("id, nombre_autor, votos_count")
  .eq("semana", foto.semana)
  .order("votos_count", { ascending: false })
  .limit(8);
if (hermanas && hermanas.length > 1) {
  console.log(`\n  Contexto · fotos de la semana ${foto.semana}:`);
  for (const h of hermanas) {
    const marca = h.id === foto.id ? " ←" : "";
    console.log(
      `   ${String(h.votos_count).padStart(4)}v  ${(
        h.nombre_autor ?? "—"
      ).padEnd(18)}${marca}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6 · PURGA (opcional, bloqueada por defecto)
// ─────────────────────────────────────────────────────────────────────────────
// Selección a quitar: si pasas --ids usa esa lista exacta (la eliges tú);
// si no, usa los votos de sospecha ALTA.
const objetivo = IDS.length
  ? clasificados.filter((v) => IDS.includes(v.id))
  : clasificados.filter((v) => v.alta);

console.log("");
linea("═");
if (!QUITAR) {
  console.log(
    `  Para QUITAR votos, añade --quitar. Marcaría ${
      IDS.length ? IDS.length + " (tu lista)" : nAlta + " (sospecha ALTA)"
    } votos.\n` +
      "  --quitar            → SIMULA, no borra nada.\n" +
      "  --quitar --ejecutar → borra de verdad y recalcula el contador.",
  );
  linea("═");
  process.exit(0);
}

if (objetivo.length === 0) {
  console.log("  No hay votos que coincidan con la selección. Nada que quitar.");
  linea("═");
  process.exit(0);
}

const idsQuitar = objetivo.map((v) => v.id);
const restante = foto.votos_count - idsQuitar.length;

console.log(
  `  ${EJECUTAR ? "PURGA REAL" : "SIMULACRO (no se borra nada)"} · foto de "${
    foto.nombre_autor ?? "—"
  }"`,
);
console.log(`  Votos a quitar: ${idsQuitar.length}`);
for (const v of objetivo.slice(0, 30)) {
  console.log(
    `   − ${v.id}  ${hhmm(v.created_at)}  ${
      v.enRafaga ? "[ráfaga]" : ""
    }${v.fantasma ? "[huella nueva]" : ""}`,
  );
}
if (objetivo.length > 30) console.log(`   … y ${objetivo.length - 30} más`);
console.log(`  votos_count: ${foto.votos_count} → ${restante}`);

if (!EJECUTAR) {
  console.log(
    "\n  Esto ha sido solo un SIMULACRO. No se ha tocado nada.\n" +
      "  Si estás seguro, repite el comando añadiendo --ejecutar.",
  );
  linea("═");
  process.exit(0);
}

// --- Borrado real -----------------------------------------------------------
const { error: eDel } = await db.from("votos").delete().in("id", idsQuitar);
if (eDel) {
  console.error("\n✖ Error borrando votos:", eDel.message);
  process.exit(1);
}
// Recalcular el contador desde la realidad (cuenta de votos que quedan).
const { count, error: eCount } = await db
  .from("votos")
  .select("id", { count: "exact", head: true })
  .eq("foto_id", foto.id);
if (eCount) {
  console.error(
    "\n⚠ Votos borrados, pero no pude recontar. Revisa votos_count a mano:",
    eCount.message,
  );
  process.exit(1);
}
const { error: eUpd } = await db
  .from("fotos")
  .update({ votos_count: count ?? 0 })
  .eq("id", foto.id);
if (eUpd) {
  console.error(
    "\n⚠ Votos borrados y recontados, pero no pude actualizar votos_count:",
    eUpd.message,
  );
  process.exit(1);
}
console.log(
  `\n  ✔ Hecho. Borrados ${idsQuitar.length} votos. votos_count = ${count}.`,
);
linea("═");
