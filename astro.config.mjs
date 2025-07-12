import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://fazil.pro',
  output: 'server',
  adapter: vercel(),
  integrations: [
    tailwind()
  ]
});