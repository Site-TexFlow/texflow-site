import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
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
  // Categorias das páginas de solução — usadas para puxar a galeria
  // filtrada em cada página dedicada (ex: /revestimento-antiaderente-industrial).
  'Revestimento Antiaderente Industrial',
  'Revestimento Antiaderente Alimentício',
  'Texturização Industrial',
  'Revestimentos em PTFE (Teflon®)',
]);

const gallery = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/gallery' }),
  schema: z.object({
    title: z.string(),
    image: z.string(),
    category: galleryCategories,
    description: z.string().optional(),
    // Só itens marcados como destaque aparecem na galeria da home. Fotos
    // novas cadastradas pelo painel entram como "não destacadas" por
    // padrão, para não diluir a curadoria da home com fotos mais simples.
    featured: z.boolean().default(false),
  }),
});

export const collections = { blog, gallery };
