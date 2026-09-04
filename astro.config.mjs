// @ts-check
import { defineConfig, envField } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import decapCmsOauth from 'astro-decap-cms-oauth';

// https://astro.build/config
export default defineConfig({
  site: 'https://texflow-site.vercel.app',
  output: 'static',
  adapter: vercel(),
  redirects: {
    // Página antiga (herança do site anterior) que ainda ranqueia bem para
    // "revestimento antiaderente" no Search Console (200 impressões, posição
    // 1.62 nos últimos 90 dias) mas hoje retorna 404. Sem termo algum de
    // "alimentício" nas consultas — é território da página Industrial.
    '/revestimentos': '/revestimento-antiaderente-industrial',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/relatorio-performance'),
    }),
    decapCmsOauth(),
  ],
  vite: {
    plugins: [tailwindcss()]
  },
  env: {
    schema: {
      RESEND_API_KEY: envField.string({ context: 'server', access: 'secret' }),
      DASHBOARD_USER: envField.string({ context: 'server', access: 'secret' }),
      DASHBOARD_PASSWORD: envField.string({ context: 'server', access: 'secret' }),
      GOOGLE_SERVICE_ACCOUNT_KEY: envField.string({ context: 'server', access: 'secret' }),
    },
  },
});