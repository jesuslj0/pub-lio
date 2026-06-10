// Genera variantes WebP y AVIF estáticas para las imágenes de public/img.
// Se sirven como ficheros estáticos por CDN (sin optimización en runtime ni
// coste de Vercel Image Optimization). Ejecutar tras añadir/cambiar una foto:
//   node scripts/optimize-images.mjs
import sharp from "sharp";
import { readdir, stat } from "fs/promises";
import path from "path";

const dir = "public/img";
// Excluimos el hero (ya tiene su webp) y los logos sin uso.
const skip = (f) => f.startsWith("dj-pov") || f.startsWith("logo-");

const files = (await readdir(dir)).filter(
  (f) => /\.jpe?g$/i.test(f) && !skip(f),
);

for (const f of files) {
  const src = path.join(dir, f);
  const base = f.replace(/\.jpe?g$/i, "");
  const { width, height } = await sharp(src).metadata();
  await sharp(src).webp({ quality: 80 }).toFile(path.join(dir, `${base}.webp`));
  await sharp(src).avif({ quality: 55 }).toFile(path.join(dir, `${base}.avif`));
  const kb = async (p) => Math.round((await stat(p)).size / 1024);
  console.log(
    `${base.padEnd(18)} ${width}x${height}  ` +
      `jpg ${await kb(src)}K  webp ${await kb(path.join(dir, base + ".webp"))}K  ` +
      `avif ${await kb(path.join(dir, base + ".avif"))}K`,
  );
}
