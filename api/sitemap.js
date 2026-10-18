/* /sitemap.xml: every page and every piece shown in the shop, straight from Wix Stores. */
const { siteUrl } = require('../lib/env.js');
const { PAGES, esc } = require('../lib/seo.js');
const { snapshot } = require('../lib/wix-server.js');

module.exports = async (req, res) => {
  const base = siteUrl(req), snap = await snapshot();
  const day = s => { const d = s ? new Date(s) : null; return d && !isNaN(d) ? d.toISOString().slice(0, 10) : ''; };
  const url = (loc, mod, pri, img) => '<url><loc>' + esc(loc) + '</loc>' + (mod ? '<lastmod>' + mod + '</lastmod>' : '') + '<priority>' + pri + '</priority>'
    + (img ? '<image:image><image:loc>' + esc(img) + '</image:loc></image:image>' : '') + '</url>';
  const rows = Object.keys(PAGES).map(k => url(base + PAGES[k].path, '', k === 'home' ? '1.0' : k === 'shop' ? '0.9' : '0.7'))
    .concat(snap.products.map(p => url(base + '/shop/' + encodeURIComponent(p.slug), day(p.updated), '0.8', p.imgs[0])));
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400');
  res.end('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' + rows.join('\n') + '\n</urlset>\n');
};
