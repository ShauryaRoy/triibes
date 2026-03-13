import type { Express } from 'express';
import { storage } from './storage';
import { format } from 'date-fns';

/**
 * Generate XML sitemap for search engines
 */
export async function generateSitemap(app: Express) {
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = process.env.APP_URL || 'https://triibes.in';
      
      // Get public events
      const publicEvents = await storage.getPublicEvents();
      
      // Build sitemap XML
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
      
      // Homepage
      xml += '  <url>\n';
      xml += `    <loc>${baseUrl}</loc>\n`;
      xml += '    <changefreq>daily</changefreq>\n';
      xml += '    <priority>1.0</priority>\n';
      xml += '  </url>\n';
      
      // Event pages
      for (const event of publicEvents) {
        xml += '  <url>\n';
        const eventSlugOrId = event.slug || event.id;
        xml += `    <loc>${baseUrl}/events/${eventSlugOrId}</loc>\n`;
        if (event.updatedAt) {
          xml += `    <lastmod>${format(new Date(event.updatedAt), 'yyyy-MM-dd')}</lastmod>\n`;
        }
        xml += '    <changefreq>weekly</changefreq>\n';
        xml += '    <priority>0.8</priority>\n';
        xml += '  </url>\n';
      }
      
      xml += '</urlset>';
      
      res.header('Content-Type', 'application/xml');
      res.send(xml);
    } catch (error) {
      console.error('[Sitemap] Error generating sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  });
}

/**
 * Generate robots.txt for search engine crawlers
 */
export function generateRobotsTxt(app: Express) {
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || 'https://triibes.in';
    
    const robotsTxt = `# Triibes - Social Event Planning Platform
# Allow all search engines to index public content

User-agent: *
Allow: /
Allow: /events/
Allow: /groups/
Disallow: /api/
Disallow: /admin/
Disallow: /login
Disallow: /register

# Sitemap location
Sitemap: ${baseUrl}/sitemap.xml

# Crawl delay (be nice to our servers)
Crawl-delay: 1
`;
    
    res.header('Content-Type', 'text/plain');
    res.send(robotsTxt);
  });
}
