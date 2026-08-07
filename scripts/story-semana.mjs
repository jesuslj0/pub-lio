// ─────────────────────────────────────────────────────────────────────────────
// STORY DEL PODIO · Lío El Bonillo   (Instagram Story 1080×1920, un comando)
//
// Genera el PNG del podio semanal (top 3 del concurso) a partir de la plantilla
// tools/story-ganadora.html, rellenando los datos automáticamente desde Supabase.
// Ya no hay que editar el bloque CONFIG a mano.
//
// QUÉ HACE:
//   1) Consulta la tabla `fotos` (estado='aprobada') de la semana indicada.
//   2) Elige ganadora (fila con ganadora=true, o la más votada si no hay) y
//      2º/3º por votos.
//   3) Inyecta esos datos en la plantilla y renderiza un PNG 1080×1920 con Edge
//      headless. El render se hace en el %TEMP% de Windows (Edge no sabe escribir
//      en rutas \\wsl.localhost) y luego copia el PNG al repo.
//
// USO (desde la raíz del proyecto, en WSL, con Node 22):
//   npm run story                     # semana pasada (la que celebra el Story)
//   npm run story -- 2026-W30         # una semana concreta
//   npm run story -- --actual         # la semana en curso (usa el top de votos)
//   npm run story -- 2026-W30 --out podio.png   # otro nombre de salida
//   npm run story -- --no-render      # solo genera el HTML, no renderiza
//   npm run story -- --keep-html      # conserva el HTML generado en el repo
//
//   (equivale a: node --env-file=.env.local scripts/story-semana.mjs …)
//
// Credenciales en .env.local: PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
// (o, en su defecto, PUBLIC_SUPABASE_ANON_KEY).
// El render usa Microsoft Edge; si está en otra ruta, pásala con --edge o EDGE_PATH.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";
import { readFile, writeFile, unlink, access, copyFile, rm } from "node:fs/promises";
import { spawn, execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const RAIZ = resolve(__dirname, "..");
const PLANTILLA = resolve(RAIZ, "tools", "story-ganadora.html");

// ── Credenciales ─────────────────────────────────────────────────────────────
const URL = process.env.PUBLIC_SUPABASE_URL;
const KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.error(
    "✖ Faltan credenciales. Ejecuta con:\n" +
      "  node --env-file=.env.local scripts/story-semana.mjs\n" +
      "(Necesita PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY —o ANON_KEY— en .env.local)",
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
const SEMANA_ARG = args.find((a) => /^\d{4}-W\d{2}$/.test(a));
const USAR_ACTUAL = has("--actual");
const NO_RENDER = has("--no-render");
const KEEP_HTML = has("--keep-html");
const EDGE_ARG = val("--edge") || process.env.EDGE_PATH;

// ── Cálculo de semana (portado de src/lib/supabase.ts; jueves→miércoles) ──────
const TZ_LOCAL = "Europe/Madrid";
function partesEnMadrid(date) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ_LOCAL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = fmt.format(date).split("-").map(Number);
  return { year, month, day };
}
function getCurrentWeek(date = new Date()) {
  const { year, month, day } = partesEnMadrid(date);
  const target = new Date(Date.UTC(year, month - 1, day));
  target.setUTCDate(target.getUTCDate() - 3); // la semana arranca el jueves
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${target.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
function getPreviousWeek(date = new Date()) {
  return getCurrentWeek(new Date(date.getTime() - 7 * 86400000));
}

const SEMANA = SEMANA_ARG || (USAR_ACTUAL ? getCurrentWeek() : getPreviousWeek());
const OUT = val("--out")
  ? resolve(RAIZ, val("--out"))
  : resolve(RAIZ, `story-${SEMANA}.png`);

// ── 1 · Traer el top de la semana ─────────────────────────────────────────────
const db = createClient(URL, KEY, { auth: { persistSession: false } });

const { data: fotos, error } = await db
  .from("fotos")
  .select("id, nombre_autor, instagram, votos_count, ganadora, cloudinary_url")
  .eq("semana", SEMANA)
  .eq("estado", "aprobada")
  .order("votos_count", { ascending: false })
  .limit(12);

if (error) {
  console.error("✖ Error consultando fotos:", error.message);
  process.exit(1);
}
if (!fotos || fotos.length === 0) {
  console.error(
    `✖ No hay fotos aprobadas en la semana ${SEMANA}.\n` +
      "  Revisa la semana (formato AAAA-Www) o usa --actual / pásala como argumento.",
  );
  process.exit(1);
}

// Ganadora: la marcada (ganadora=true) o, si no hay, la más votada.
const ganadora = fotos.find((f) => f.ganadora) || fotos[0];
const resto = fotos.filter((f) => f.id !== ganadora.id); // ya vienen por votos desc
const podio = [ganadora, resto[0], resto[1]]; // [1º, 2º, 3º] (2º/3º pueden faltar)

if (!resto[0] || !resto[1]) {
  console.warn(
    `⚠ Solo hay ${fotos.length} foto(s) en ${SEMANA}; el podio saldrá incompleto.`,
  );
}

// ── 2 · Construir el bloque CONFIG y rellenar la plantilla ─────────────────────
const limpiaIg = (ig) => {
  if (!ig) return "@lioelbonillo";
  const s = String(ig)
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@+/, "")
    .replace(/\/+$/, "");
  return "@" + s;
};
const entrada = (f) => ({
  img: f?.cloudinary_url || "",
  name: f?.nombre_autor || "—",
  votes: f?.votos_count ?? 0,
});
const w = entrada(podio[0]);
const s = entrada(podio[1]);
const t = entrada(podio[2]);
const J = (v) => JSON.stringify(v); // escapa comillas de nombres

const CONFIG_JS = `const CONFIG = {
    mention: ${J(limpiaIg(ganadora.instagram))},

    winner: {
      img:   ${J(w.img)},
      name:  ${J(w.name)},
      votes: ${w.votes},
    },
    second: {
      img:   ${J(s.img)},
      name:  ${J(s.name)},
      votes: ${s.votes},
    },
    third: {
      img:   ${J(t.img)},
      name:  ${J(t.name)},
      votes: ${t.votes},
    },
  };`;

let html;
try {
  html = await readFile(PLANTILLA, "utf8");
} catch {
  console.error(`✖ No encuentro la plantilla: ${PLANTILLA}`);
  process.exit(1);
}
const reConfig = /const CONFIG = \{[\s\S]*?\n  \};/;
if (!reConfig.test(html)) {
  console.error(
    "✖ No he sabido localizar el bloque CONFIG en la plantilla.\n" +
      "  (¿Cambió tools/story-ganadora.html? Debe contener 'const CONFIG = { … };')",
  );
  process.exit(1);
}
html = html.replace(reConfig, CONFIG_JS);

// ── Resumen por consola ────────────────────────────────────────────────────────
console.log(`\n  STORY · semana ${SEMANA}`);
console.log(
  `  1º  ${w.name.padEnd(18)} ${String(w.votes).padStart(4)}v   ${limpiaIg(ganadora.instagram)}`,
);
if (podio[1]) console.log(`  2º  ${s.name.padEnd(18)} ${String(s.votes).padStart(4)}v`);
if (podio[2]) console.log(`  3º  ${t.name.padEnd(18)} ${String(t.votes).padStart(4)}v`);
console.log("");

// ── 3 · Helpers de rutas WSL↔Windows ───────────────────────────────────────────
async function existe(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}
async function aRutaWindows(rutaLinux) {
  const { stdout } = await execFileP("wslpath", ["-w", rutaLinux]);
  return stdout.trim();
}
// Directorio %TEMP% de Windows visto desde WSL (/mnt/c/...). Edge sí sabe
// escribir aquí (no en \\wsl.localhost). Si algo falla, cae a null.
async function tempWindowsEnWSL() {
  try {
    const { stdout } = await execFileP(
      "/mnt/c/Windows/System32/cmd.exe",
      ["/c", "echo %TEMP%"],
      { windowsHide: true },
    );
    const win = stdout.trim().replace(/\r$/, "");
    if (!win) return null;
    const { stdout: lx } = await execFileP("wslpath", ["-u", win]);
    const p = lx.trim();
    return (await existe(p)) ? p : null;
  } catch {
    return null;
  }
}

const esWSL = await existe("/mnt/c");

// Fallback: no renderizamos (modo pedido, o no es WSL). Dejamos el HTML en el repo.
async function guardarHtmlYFin(motivo) {
  const htmlRepo = resolve(RAIZ, `.story-${SEMANA}.tmp.html`);
  await writeFile(htmlRepo, html, "utf8");
  console.log(`  HTML generado: ${htmlRepo}`);
  if (motivo) console.log(`  ${motivo}`);
  process.exit(0);
}

if (NO_RENDER) {
  await guardarHtmlYFin("(--no-render: no se ha renderizado.)");
}

// ── 4 · Localizar Edge y el temp de Windows ────────────────────────────────────
const CANDIDATOS_EDGE = [
  EDGE_ARG,
  "/mnt/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "/mnt/c/Program Files/Microsoft/Edge/Application/msedge.exe",
  "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
  "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
].filter(Boolean);

let edge = null;
for (const c of CANDIDATOS_EDGE) {
  if (await existe(c)) {
    edge = c;
    break;
  }
}
const tmpWin = esWSL ? await tempWindowsEnWSL() : null;

if (!esWSL || !edge || !tmpWin) {
  const htmlRepo = resolve(RAIZ, `.story-${SEMANA}.tmp.html`);
  await writeFile(htmlRepo, html, "utf8");
  const causa = !esWSL
    ? "no parece un entorno WSL"
    : !edge
      ? "no encuentro msedge.exe/chrome.exe (usa --edge <ruta>)"
      : "no he podido resolver el %TEMP% de Windows";
  console.log(`  HTML generado: ${htmlRepo}`);
  console.log(
    `\n  ⚠ No he podido renderizar automáticamente (${causa}).\n` +
      "  Ábrelo en el navegador y haz la captura, o renderiza con Edge headless\n" +
      "  apuntando a una ruta de C: (no \\\\wsl.localhost).",
  );
  process.exit(1);
}

// ── 5 · Render en el temp de Windows y copia al repo ───────────────────────────
const baseTmp = `${tmpWin}/story-${SEMANA}`;
const htmlTmp = `${baseTmp}.tmp.html`;
const pngTmp = `${baseTmp}.png`;
const perfilTmp = `${baseTmp}.edge-profile`;

await writeFile(htmlTmp, html, "utf8");
await rm(pngTmp, { force: true });

const winHtml = await aRutaWindows(htmlTmp);
const winPng = await aRutaWindows(pngTmp);
const winPerfil = await aRutaWindows(perfilTmp);
const fileUrl = "file:///" + winHtml.replace(/\\/g, "/");

console.log(`  Renderizando con Edge headless → ${OUT}`);
await new Promise((res, rej) => {
  const p = spawn(
    edge,
    [
      "--headless=new",
      "--window-size=1080,1920",
      "--force-device-scale-factor=1",
      "--hide-scrollbars",
      "--virtual-time-budget=12000",
      `--user-data-dir=${winPerfil}`,
      `--screenshot=${winPng}`,
      fileUrl,
    ],
    { stdio: "ignore", windowsHide: true },
  );
  p.on("error", rej);
  // Edge headless a veces sale con código != 0 aunque la captura salga bien;
  // lo que manda es si el PNG existe (se comprueba justo después).
  p.on("exit", () => res());
});

// ── 6 · Comprobar, copiar al repo y limpiar ────────────────────────────────────
if (!(await existe(pngTmp))) {
  console.error(
    "\n✖ Edge no ha generado el PNG. Prueba con --edge <ruta a msedge.exe> " +
      "o --no-render para renderizar a mano.",
  );
  await Promise.all([
    unlink(htmlTmp).catch(() => {}),
    rm(perfilTmp, { recursive: true, force: true }).catch(() => {}),
  ]);
  process.exit(1);
}

await copyFile(pngTmp, OUT);
console.log(`\n  ✔ Story listo: ${OUT}`);

if (KEEP_HTML) {
  const htmlRepo = resolve(RAIZ, `.story-${SEMANA}.tmp.html`);
  await copyFile(htmlTmp, htmlRepo);
  console.log(`  HTML conservado: ${htmlRepo}`);
}

// Limpieza de temporales de Windows.
await Promise.all([
  unlink(htmlTmp).catch(() => {}),
  unlink(pngTmp).catch(() => {}),
  rm(perfilTmp, { recursive: true, force: true }).catch(() => {}),
]);
console.log("");
