import type { APIRoute } from 'astro';

const siteUrl = 'https://zowe.netlify.app';

const pages = [
  { url: '/',                       priority: '1.0', changefreq: 'weekly'  },
  { url: '/cadeau/',                priority: '0.7', changefreq: 'monthly' },
  { url: '/galerie/',               priority: '0.6', changefreq: 'monthly' },
  { url: '/preparer-ma-seance/',    priority: '0.5', changefreq: 'monthly' },
  { url: '/mentions-legales/',      priority: '0.3', changefreq: 'yearly'  },
  { url: '/confidentialite/',       priority: '0.3', changefreq: 'yearly'  },
];

export const GET: APIRoute = () => {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${siteUrl}${p.url}</loc>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
