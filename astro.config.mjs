import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel/serverless';
import sitemap from 'astro-sitemap';

export default defineConfig({
  site: 'https://fazil.pro',
  output: 'server',
  adapter: vercel(),
  integrations: [
    tailwind(),
    sitemap({
      customPages: [
        'https://fazil.pro/',
        'https://fazil.pro/process',
        'https://fazil.pro/astro-benefits',
        'https://fazil.pro/porquefazil',
        'https://fazil.pro/CMSExplanation'
      ],
      exclude: ['/formulario', '/gracias', '/admin', '/temp'],
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date()
    })
  ]
});