#!/usr/bin/env node
// Bulk-adds gallery photos: copies each image into public/images/gallery
// (served on the site) and src/assets/galeria (source originals), then
// creates one src/content/gallery/*.md entry per photo with the given
// category and no title/description — fill those in later via /admin.
//
// Usage: node scripts/add-gallery-batch.mjs "<pasta-com-fotos>" "<Categoria>"

import { readdirSync, mkdirSync, copyFileSync, writeFileSync, existsSync } from "node:fs";
import { extname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";

// Keep in sync with galleryCategories in src/content.config.ts
const VALID_CATEGORIES = [
  "Alimentícia",
  "Selagem",
  "Rotomoldagem e EPS",
  "Injeção e Extrusão",
  "Gráfica",
  "Revestimento Antiaderente Industrial",
  "Revestimento Antiaderente Alimentício",
  "Texturização Industrial",
  "Revestimentos em PTFE (Teflon®)",
];

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const [, , sourceFolder, category] = process.argv;

if (!sourceFolder || !category) {
  console.error('Uso: node scripts/add-gallery-batch.mjs "<pasta-com-fotos>" "<Categoria>"');
  console.error(`Categorias válidas:\n  ${VALID_CATEGORIES.join("\n  ")}`);
  process.exit(1);
}

if (!VALID_CATEGORIES.includes(category)) {
  console.error(`Categoria inválida: "${category}"`);
  console.error(`Categorias válidas:\n  ${VALID_CATEGORIES.join("\n  ")}`);
  process.exit(1);
}

if (!existsSync(sourceFolder)) {
  console.error(`Pasta não encontrada: ${sourceFolder}`);
  process.exit(1);
}

const projectRoot = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(projectRoot, "public", "images", "gallery");
const assetsDir = join(projectRoot, "src", "assets", "galeria");
const contentDir = join(projectRoot, "src", "content", "gallery");

mkdirSync(publicDir, { recursive: true });
mkdirSync(assetsDir, { recursive: true });
mkdirSync(contentDir, { recursive: true });

function slugify(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueSlug(baseSlug, ext) {
  let slug = baseSlug;
  let n = 2;
  while (existsSync(join(contentDir, `${slug}.md`)) || existsSync(join(publicDir, `${slug}${ext}`))) {
    slug = `${baseSlug}-${n}`;
    n++;
  }
  return slug;
}

const files = readdirSync(sourceFolder).filter((f) => IMAGE_EXTENSIONS.has(extname(f).toLowerCase()));

if (files.length === 0) {
  console.error("Nenhuma imagem (.png, .jpg, .jpeg, .webp) encontrada na pasta.");
  process.exit(1);
}

let created = 0;

for (const file of files) {
  const ext = extname(file).toLowerCase();
  const baseSlug = slugify(basename(file, ext));
  const slug = uniqueSlug(baseSlug, ext);
  const fileName = `${slug}${ext}`;

  copyFileSync(join(sourceFolder, file), join(publicDir, fileName));
  copyFileSync(join(sourceFolder, file), join(assetsDir, fileName));

  const frontmatter = `---
image: "/images/gallery/${fileName}"
category: "${category}"
---
`;
  writeFileSync(join(contentDir, `${slug}.md`), frontmatter);

  console.log(`✓ ${file} → ${slug}.md`);
  created++;
}

console.log(`\n${created} foto(s) adicionada(s) na categoria "${category}".`);
console.log("Título e descrição ficaram em branco — edite cada entrada em /admin quando quiser.");
