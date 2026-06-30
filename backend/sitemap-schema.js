const axios = require('axios');
const cheerio = require('cheerio');
const url = require('url');

async function generateSitemap(targetUrl) {
  const links = new Set();
  const baseUrl = new url.URL(targetUrl.startsWith('http') ? targetUrl : 'https://' + targetUrl);
  const maxPages = 100;
  const toVisit = [targetUrl];
  const visited = new Set();
  
  try {
    while (toVisit.length > 0 && visited.size < maxPages) {
      const currentUrl = toVisit.shift();
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);
      
      try {
        const res = await axios.get(currentUrl, { timeout: 10000, maxRedirects: 5 });
        const $ = cheerio.load(res.data);
        
        $('a[href]').each((i, el) => {
          const href = $(el).attr('href');
          if (!href) return;
          let resolved;
          try { resolved = new url.URL(href, currentUrl).href; } catch { return; }
          if (new url.URL(resolved).hostname !== baseUrl.hostname) return;
          if (!resolved.includes('#') && !visited.has(resolved)) {
            toVisit.push(resolved);
          }
        });
      } catch { /* skip broken pages */ }
    }
    
    const today = new Date().toISOString().split('T')[0];
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    Array.from(visited).forEach(u => {
      xml += '  <url>\n';
      xml += `    <loc>${u}</loc>\n`;
      xml += `    <lastmod>${today}</lastmod>\n`;
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });
    xml += '</urlset>';
    
    return { success: true, urlCount: visited.size, xml, urls: Array.from(visited) };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function validateSchema(targetUrl) {
  try {
    if (!targetUrl.startsWith('http')) targetUrl = 'https://' + targetUrl;
    const res = await axios.get(targetUrl, { timeout: 15000 });
    const $ = cheerio.load(res.data);
    const schemas = [];
    
    $('script[type="application/ld+json"]').each((i, el) => {
      const raw = $(el).html();
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw.trim());
        schemas.push({
          type: parsed['@type'] || 'Unknown',
          valid: true,
          snippet: raw.substring(0, 200),
        });
      } catch (e) {
        schemas.push({
          type: 'Invalid JSON',
          valid: false,
          error: e.message,
          snippet: raw.substring(0, 200),
        });
      }
    });
    
    const openGraph = {
      title: $('meta[property="og:title"]').attr('content'),
      description: $('meta[property="og:description"]').attr('content'),
      image: $('meta[property="og:image"]').attr('content'),
      type: $('meta[property="og:type"]').attr('content'),
    };
    
    const twitterCard = {
      title: $('meta[name="twitter:title"]').attr('content'),
      description: $('meta[name="twitter:description"]').attr('content'),
      image: $('meta[name="twitter:image"]').attr('content'),
    };
    
    return {
      success: true,
      schemas,
      openGraph,
      twitterCard,
      schemaCount: schemas.length,
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = { generateSitemap, validateSchema };
