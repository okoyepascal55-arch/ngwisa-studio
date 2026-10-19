/* Hosts the site without Vercel: `npm run build` then `node server.js` (Node 18+). Mirrors vercel.json:
   static files from dist/ (or straight from the source files if there is no build), every page address through
   api/page.js, /api/studio, /sitemap.xml and /robots.txt. Settings come from the environment or a .env file. */
const http = require('http'), fs = require('fs'), path = require('path');
const { env } = require('./lib/env.js');
const studio = require('./api/studio.js'), page = require('./api/page.js'), sitemap = require('./api/sitemap.js'), robots = require('./api/robots.js');
const DIST = path.join(__dirname, 'dist'), BUILT = fs.existsSync(path.join(DIST, 'app.html'));
const ROOT = BUILT ? DIST : __dirname, PORT = Number(process.env.PORT) || 3000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jsx': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8' };
// Server-side and build files that must never be served.
const PRIVATE = /(^|\/)(\.|api\/|lib\/|scripts\/|node_modules\/|dist\/|server\.js$|package(-lock)?\.json$|.*\.md$)/;
const PAGE = /^\/(|the-loop|loop|shop|shop\/[^/.]+|heritage|founders-voice|founders|journal|thank-you|studio)$/;

http.createServer((req, res) => {
  let u; try { u = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (u === '/api/studio') return studio(req, res);
  if (u === '/sitemap.xml') return sitemap(req, res);
  if (u === '/robots.txt') return robots(req, res);
  if (/^\/studio\/./.test(u)) { res.writeHead(307, { Location: '/studio' }); return res.end(); }
  if (/^\/Ngwisa Site Deploy\.dc\.html$/.test(u)) { res.writeHead(301, { Location: '/' }); return res.end(); }
  const clean = u.length > 1 ? u.replace(/\/+$/, '') : u;
  if (PAGE.test(clean)) { req.query = { path: clean }; return page(req, res); }
  if (!BUILT && u === '/ngwisa-studio.dc.html') u = '/Ngwisa Studio.dc.html'; // served name of the Studio source
  const f = path.join(ROOT, u), rel = path.relative(ROOT, f).split(path.sep).join('/');
  if (rel.startsWith('..') || PRIVATE.test(rel) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { req.query = { path: u }; return page(req, res); }
  const versioned = /[?&]v=/.test(req.url);
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'Cache-Control': versioned ? 'public, max-age=31536000, immutable' : /\.html$/.test(f) ? 'no-cache' : 'public, max-age=3600' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('Ngwisa site on http://localhost:' + PORT + (BUILT ? ' (built)' : ' (source, run `npm run build` for the optimised site)') + (env.WIX_API_KEY ? '' : ' · Studio saving is off until WIX_API_KEY is set')));
