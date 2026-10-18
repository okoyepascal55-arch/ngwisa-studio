/* Serves every page address (/, /shop, /shop/<piece>, /heritage, …) as the site shell with that page's own title,
   description, share image and structured data, so search engines and link previews (WhatsApp, Instagram, iMessage)
   see real content. The browser then runs the site exactly as before. Responses are cached at the edge for 5 minutes. */
const { siteUrl } = require('../lib/env.js');
const { getShell } = require('../lib/shell.js');
const { render, seedFrom } = require('../lib/seo.js');
const { snapshot } = require('../lib/wix-server.js');

let remoteShell = null;
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
