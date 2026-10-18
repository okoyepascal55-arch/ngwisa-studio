/* /robots.txt: everything is crawlable except the Studio, the API and the internal page shell. */
const { siteUrl } = require('../lib/env.js');
module.exports = (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.end(['User-agent: *', 'Disallow: /studio', 'Disallow: /api/', 'Disallow: /app.html', 'Disallow: /thank-you', '', 'Sitemap: ' + siteUrl(req) + '/sitemap.xml', ''].join('\n'));
};
