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

// Categorias combinam as 4 Soluções e os 8 segmentos de Aplicações
// exibidos no site (mesmos rótulos usados em Solutions.astro,
// Applications.astro e no select do formulário de orçamento).
const galleryCategories = z.enum([
  'Revestimento Antiaderente Industrial',
  'Revestimento Antiaderente Alimentício',
  'Texturização Industrial',
  'A Confirmar',
  'Alimentícia',
  'Automobilística',
  'Têxtil',
  'Plástica',
  'Borracha',
  'Gráfica',
  'Agrícola',
  'Outro',
]);

const gallery = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/gallery' }),
  schema: z.object({
    title: z.string(),
    image: z.string(),
    category: galleryCategories,
    description: z.string().optional(),
  }),
});

export const collections = { blog, gallery };
