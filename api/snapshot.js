/* /api/snapshot: the public catalogue and page settings as JSON (what any visitor can already read from Wix).
   The Wix-hosting build (scripts/build-wix.js) prebuilds every page from it, with its own title and share data. */
const { snapshot } = require('../lib/wix-server.js');
module.exports = async (req, res) => {
  const s = await snapshot();
  res.statusCode = s.failed ? 503 : 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300');
  res.end(JSON.stringify({ at: new Date().toISOString(), products: s.products, copy: Object.fromEntries(Object.entries(s.copy || {}).filter(([k]) => /^seo/.test(k))), slots: s.slots }));
};
