import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date().min(new Date("2026-01-01"), "Data de publicação deve ser a partir de 2026."),
    image: z.string(),
    imageAlt: z.string(),
    tags: z.array(z.string()).default([]),
    author: z.string().default('Equipe TexFlow'),
    draft: z.boolean().default(false),
  }),
});

const galleryCategories = z.enum([
  'Alimentícia',
  'Selagem',
  'Rotomoldagem e EPS',
  'Injeção e Extrusão',
  'Gráfica',
  // Categorias das páginas de solução — usadas para puxar a galeria
  // filtrada em cada página dedicada (ex: /revestimento-antiaderente-industrial).
  'Revestimento Antiaderente Industrial',
  'Revestimento Antiaderente Alimentício',
  'Texturização Industrial',
]);

const gallery = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/gallery' }),
  schema: z.object({
    title: z.string().optional(),
    image: z.string(),
    category: galleryCategories,
    description: z.string().optional(),
    // Só itens marcados como destaque aparecem na galeria da home. Fotos
    // novas cadastradas pelo painel entram como "não destacadas" por
    // padrão, para não diluir a curadoria da home com fotos mais simples.
    featured: z.boolean().default(false),
    // A foto com homeCard=true é a única usada no preview "Todos" da
    // galeria da home (uma por categoria) — independe de featured/ordem
    // de arquivo, pra não ser deslocada quando novas fotos são adicionadas.
    homeCard: z.boolean().default(false),
  }),
});

export const collections = { blog, gallery };
