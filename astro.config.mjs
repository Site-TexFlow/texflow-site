// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import decapCmsOauth from 'astro-decap-cms-oauth';

// https://astro.build/config
export default defineConfig({
  site: 'https://texflow-site.vercel.app',
  output: 'server',
  adapter: vercel(),
  integrations: [sitemap(), decapCmsOauth()],
  vite: {
    plugins: [tailwindcss()]
  }
});