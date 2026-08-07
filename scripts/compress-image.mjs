#!/usr/bin/env node
// Resizes/compresses images so they fit under GitHub's ~1MB Contents API
// limit — the reason large photos fail to upload (no preview) via the
// Decap CMS panel. Run this first, then upload the compressed file.
//
// Usage: node scripts/compress-image.mjs "<arquivo-ou-pasta>"
// Saída: uma subpasta "comprimidas" ao lado do(s) arquivo(s) original(is).

import sharp from "sharp";
import { readdirSync, statSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { extname, basename, dirname, join } from "node:path";

const TARGET_BYTES = 900 * 1024; // margem de segurança abaixo do limite de 1MB do GitHub
const MAX_WIDTH = 1920;
const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg"]);

const [, , input] = process.argv;

if (!input) {
  console.error('Uso: node scripts/compress-image.mjs "<arquivo-ou-pasta>"');
  process.exit(1);
}
if (!existsSync(input)) {
  console.error(`Não encontrado: ${input}`);
  process.exit(1);
}

function listImages(p) {
  if (statSync(p).isFile()) {
    return IMAGE_EXT.has(extname(p).toLowerCase()) ? [p] : [];
  }
  return readdirSync(p)
    .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()))
    .map((f) => join(p, f));
}

async function compress(filePath) {
  const dir = dirname(filePath);
  const outDir = join(dir, "comprimidas");
  mkdirSync(outDir, { recursive: true });
  const ext = extname(filePath).toLowerCase();
  const name = basename(filePath, ext);

  let quality = 85;
  let buffer;

  while (true) {
    const pipeline = sharp(filePath).resize({ width: MAX_WIDTH, withoutEnlargement: true });
    buffer =
      ext === ".png"
        ? await pipeline.png({ quality, compressionLevel: 9 }).toBuffer()
        : await pipeline.jpeg({ quality, mozjpeg: true }).toBuffer();

    if (buffer.length <= TARGET_BYTES || quality <= 40) break;
    quality -= 15;
  }

  let outPath = join(outDir, `${name}${ext}`);
  let convertedToJpeg = false;

  // PNG de foto que continua grande mesmo comprimido: converte pra JPEG,
  // que é muito mais leve pra conteúdo fotográfico (perde transparência,
  // mas fotos não usam transparência mesmo).
  if (buffer.length > TARGET_BYTES && ext === ".png") {
    convertedToJpeg = true;
    let q = 85;
    while (true) {
      buffer = await sharp(filePath)
        .resize({ width: MAX_WIDTH, withoutEnlargement: true })
        .jpeg({ quality: q, mozjpeg: true })
        .toBuffer();
      if (buffer.length <= TARGET_BYTES || q <= 40) break;
      q -= 15;
    }
    outPath = join(outDir, `${name}.jpg`);
  }

  writeFileSync(outPath, buffer);
  const kb = (buffer.length / 1024).toFixed(0);
  const tag = convertedToJpeg ? "convertida p/ .jpg" : "ok";
  const warn = buffer.length > TARGET_BYTES ? " ⚠ ainda acima de 900KB, mas é o menor possível nesse zoom" : "";
  console.log(`${basename(filePath)} → ${basename(outPath)} (${kb} KB, ${tag})${warn}`);
}

const files = listImages(input);
if (files.length === 0) {
  console.error("Nenhuma imagem (.png, .jpg, .jpeg) encontrada.");
  process.exit(1);
}

for (const f of files) {
  await compress(f);
}
console.log(`\n${files.length} imagem(ns) processada(s). Arquivos compactados na pasta "comprimidas".`);
