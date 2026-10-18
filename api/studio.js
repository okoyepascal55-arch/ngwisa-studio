/* Ngwisa Studio server. The browser never holds admin rights: it sends the signed-in member's token,
   this function checks that member is on the Studio allow-list, then makes the call with the site's
   Wix API key. Only Studio collections and the Media Manager calls the Studio uses are allowed.
   Settings: WIX_API_KEY (required), WIX_SITE_ID, STUDIO_OWNER_IDS (comma-separated member ids).
   They come from the host's environment (e.g. Vercel), or from a .env file in the project root (lib/env.js).
   StudioProducts (the Products screen) is a Studio* collection, so it is covered by the same rule. */
const { env } = require('../lib/env.js');
const API = 'https://www.wixapis.com';
const SITE_ID = env.WIX_SITE_ID;
const OWNERS = env.STUDIO_OWNER_IDS;

const DATA = /^\/wix-data\/v2\/(items\/query|items|bulk\/items\/save|bulk\/items\/remove)$/;
const MEDIA = [
  ['GET', /^\/site-media\/v1\/folders\?[\w.=&%-]*$/],
  ['POST', /^\/site-media\/v1\/folders$/],
  ['POST', /^\/site-media\/v1\/files\/search$/],
  ['POST', /^\/site-media\/v1\/files\/generate-upload-url$/],
  ['PATCH', /^\/site-media\/v1\/files\/[\w~.-]+$/],
  ['POST', /^\/site-media\/v1\/bulk\/files\/delete$/],
];

const seen = new Map(); // member token -> { id, until }
async function memberId(token) {
  const hit = seen.get(token);
  if (hit && hit.until > Date.now()) return hit.id;
  const r = await fetch(API + '/members/v1/members/my', { headers: { Authorization: token } });
  if (!r.ok) return null;
  const d = await r.json().catch(() => ({}));
  const id = d.member && (d.member.id || d.member._id);
  if (id) { if (seen.size > 200) seen.clear(); seen.set(token, { id, until: Date.now() + 5 * 60000 }); }
  return id || null;
}

function allowed(method, path, body) {
  if (DATA.test(path)) return method === 'POST' && body && /^Studio[A-Za-z]+$/.test(String(body.dataCollectionId || ''));
  return MEDIA.some(([m, re]) => m === method && re.test(path));
}

module.exports = async (req, res) => {
  const send = (status, obj) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(obj)); };
  const key = env.WIX_API_KEY;
  if (req.method === 'GET') return send(200, { ok: true, configured: !!key });
  if (req.method !== 'POST') return send(405, { message: 'Method not allowed' });
  if (!key) return send(503, { message: 'Studio server is not set up: add WIX_API_KEY in Vercel.' });

  let b = req.body; // Vercel parses JSON bodies; a plain Node server leaves the stream unread.
  if (b === undefined) b = await new Promise(ok => { let d = ''; req.on('data', c => { d += c; if (d.length > 4e6) { d = ''; req.destroy(); } }); req.on('end', () => ok(d)); req.on('error', () => ok('')); });
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
  if (!b || typeof b.path !== 'string') return send(400, { message: 'Bad request' });
  const method = String(b.method || 'POST').toUpperCase(), path = b.path;
  if (!allowed(method, path, b.body)) return send(403, { message: 'The Studio can’t make that call.' });

  const token = req.headers['x-member-token'];
  if (!token) return send(401, { message: 'Sign in to use the Studio.' });
  const id = await memberId(String(token)).catch(() => null);
  if (!id) return send(401, { message: 'Your sign-in has expired. Sign in again.' });
  if (!OWNERS.includes(id)) return send(403, { message: 'This account can’t edit the Studio.' });

  try {
    const r = await fetch(API + path, {
      method,
      headers: { Authorization: key, 'wix-site-id': SITE_ID, 'Content-Type': 'application/json' },
      body: method === 'GET' ? undefined : JSON.stringify(b.body || {}),
    });
    const text = await r.text();
    let data = {}; try { data = text ? JSON.parse(text) : {}; } catch (e) { data = { message: text.slice(0, 200) }; }
    if (!r.ok && !data.message) data.message = 'Wix request failed (' + r.status + ')';
    return send(r.status, data);
  } catch (e) {
    return send(502, { message: 'Could not reach Wix: ' + (e.message || e) });
  }
};
