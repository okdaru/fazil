// src/pages/sitemap.xml.ts - Versión actualizada y optimizada
import type { APIRoute } from 'astro';

// Configuración de páginas del sitio - Solo páginas que existen
const pages = [
  // PÁGINA PRINCIPAL
  {
    url: '',
    priority: 1.0,
    changefreq: 'weekly',
    lastmod: new Date().toISOString().split('T')[0]
  },
  // FORMULARIO DE PROYECTO
  {
    url: '/formulario',
    priority: 0.9,
    changefreq: 'monthly',
    lastmod: new Date().toISOString().split('T')[0]
  }
];

export const GET: APIRoute = async () => {
  const baseUrl = 'https://fazil.pro';
  const currentDate = new Date().toISOString().split('T')[0];
  
  try {
    // Generar XML del sitemap optimizado
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600', // Cache 1 hora
        'X-Robots-Tag': 'noindex', // El sitemap no debe indexarse
        'Last-Modified': new Date().toUTCString(),
      }
    });
    
  } catch (error) {
    console.error('Error generating sitemap:', error);
    
    // Sitemap básico en caso de error
    const fallbackSitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/formulario</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/servicios</loc>
    <lastmod>${currentDate}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
</urlset>`;

    return new Response(fallbackSitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // Cache más corto si hay error
      }
    });
  }
};