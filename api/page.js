/* Serves every page address (/, /shop, /shop/<piece>, /heritage, …) as the site shell with that page's own title,
   description, share image and structured data, so search engines and link previews (WhatsApp, Instagram, iMessage)
   see real content. The browser then runs the site exactly as before. Responses are cached at the edge for 5 minutes. */
const { siteUrl } = require('../lib/env.js');
const { getShell } = require('../lib/shell.js');
const { render } = require('../lib/seo.js');
const { snapshot } = require('../lib/wix-server.js');

let remoteShell = null, seedCache = null;
/* The site's built-in pieces (the design's own list in the page script): pieces sold "on request" that aren't in
   Wix Stores, and the old short addresses (/shop/rahrah) of pieces that are. */
function seedFrom(html) {
  if (seedCache) return seedCache;
  const out = [], re = /^\s*\['([\w-]+)', '((?:[^'\\]|\\.)*)', (null|[\d.]+), '[^']*', '[^']*', '([^']*)', '[wmu]', '((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)'/gm;
  let m; while ((m = re.exec(html))) out.push({ slug: m[1], name: m[2].replace(/\\'/g, "'"), price: m[3] === 'null' ? null : Number(m[3]), cat: m[4], hook: m[5].replace(/\\'/g, "'"), desc: m[6].replace(/\\'/g, "'") });
  return (seedCache = out);
}
async function shell(base) {
  try { return getShell(); } catch (e) {}
  // Fallback when the built shell isn't bundled with the function: fetch it from this deployment.
  if (remoteShell) return remoteShell;
  const r = await fetch(base + '/app.html'); if (!r.ok) throw new Error('shell ' + r.status);
  return (remoteShell = await r.text());
}

module.exports = async (req, res) => {
  const u = new URL(req.url, 'http://x'), base = siteUrl(req);
  const path = (req.query && req.query.path) || u.searchParams.get('path') || u.pathname || '/';
  let html;
  try { html = await shell(base); } catch (e) { res.statusCode = 500; res.setHeader('Content-Type', 'text/plain'); return res.end('Site shell missing: run the build.'); }
  const snap = /^\/studio/i.test(path) ? null : Object.assign({}, await snapshot(), { seed: seedFrom(html) });
  const out = render(path, snap, base);
  html = html.replace(/<title>[^<]*<\/title>\s*<!--ng:head-->/, out.head).replace('<!--ng:body-->', out.body);
  res.statusCode = out.status;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', /^\/(studio|thank-you)/i.test(path) ? 'private, no-store' : 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400');
  res.end(html);
};
