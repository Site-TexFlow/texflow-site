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
  'Texturização',
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

// Um arquivo por semana — histórico do relatório de performance oculto.
// Números ficam crus (não formatados) de propósito: o seletor de período
// (Semana/Quinzena/Mês/Trimestre) soma múltiplas semanas, e isso só é
// possível guardando number, não string já formatada em R$/%.
const reports = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/reports' }),
  schema: z.object({
    periodoLabel: z.string(),
    periodoInicio: z.coerce.date(),
    periodoFim: z.coerce.date(),
    geradoEm: z.coerce.date(),
    revisao: z.string(),

    kpis: z.object({
      investimento: z.number(),
      cliques: z.number(),
      impressoes: z.number(),
      ctr: z.number(),
      conversoes: z.number(),
      custoConversao: z.number(),
    }),

    semanas: z.array(z.object({
      label: z.string(),
      periodoLabel: z.string(),
      custo: z.number(),
      parcial: z.boolean().default(false),
    })),

    campanhas: z.array(z.object({
      nome: z.string(),
      orcamentoDiario: z.number(),
      linhas: z.array(z.object({
        semanaLabel: z.string(),
        custo: z.number(),
        cliques: z.number(),
        impressoes: z.number(),
        ctr: z.number(),
        conversoes: z.number(),
        parcial: z.boolean().default(false),
      })),
    })),

    grupos: z.array(z.object({
      campanha: z.string(),
      grupo: z.string(),
      custo: z.number(),
      cliques: z.number(),
      impressoes: z.number(),
      conversoes: z.number(),
      nota: z.string().optional(),
    })),

    destaqueGrupo: z.string().optional(),

    matchGroups: z.array(z.object({
      campanha: z.string(),
      cor: z.string().optional(),
      itens: z.array(z.object({
        tipo: z.string(),
        conversoes: z.number(),
      })),
    })).default([]),

    acoesExecutadas: z.object({
      automaticas: z.array(z.string()).default([]),
      manuais: z.array(z.string()).default([]),
      pendenteInputManual: z.boolean().default(true),
    }).default({ automaticas: [], manuais: [], pendenteInputManual: true }),

    planoProximaSemana: z.array(z.string()).default([]),
  }),
});

export const collections = { blog, gallery, reports };
