/* Settings come from the host's environment (e.g. Vercel → Project → Settings → Environment Variables) or, when
   hosting with `node server.js`, from a .env file in the project root. Real environment variables win over .env. */
const fs = require('fs'), path = require('path');
let loaded = false;
function loadEnv() {
  if (loaded) return process.env; loaded = true;
  try {
    fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/).forEach(line => {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    });
  } catch (e) {}
  return process.env;
}
loadEnv();
const env = {
  WIX_API_KEY: process.env.WIX_API_KEY || '',
  WIX_SITE_ID: process.env.WIX_SITE_ID || '613b5fe3-6f29-414b-80fc-abe05f934d56',
  STUDIO_OWNER_IDS: (process.env.STUDIO_OWNER_IDS || '84062810-740a-4954-aac6-a5e0ae7f9dc2').split(',').map(s => s.trim()).filter(Boolean),
  SITE_URL: (process.env.SITE_URL || '').replace(/\/+$/, ''),
};
/* The public address of the site, for canonical links, sitemaps and share previews. SITE_URL wins; otherwise the
   host the request came in on. */
function siteUrl(req) {
  if (env.SITE_URL) return env.SITE_URL;
  const h = (req && req.headers) || {}, host = h['x-forwarded-host'] || h.host || 'localhost';
  const proto = h['x-forwarded-proto'] || (/^(localhost|127\.|\[::1\])/.test(host) ? 'http' : 'https');
  return proto.split(',')[0] + '://' + String(host).split(',')[0];
}
module.exports = { env, loadEnv, siteUrl };
