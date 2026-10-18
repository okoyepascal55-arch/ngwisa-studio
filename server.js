/* Hosts the site without Vercel: `node server.js` (Node 18+). Serves the static files with the same
   routes as vercel.json and runs api/studio.js, which reads its settings from .env. */
const http = require('http'), fs = require('fs'), path = require('path');
const studio = require('./api/studio.js'); // loads .env into process.env
const ROOT = __dirname, PORT = Number(process.env.PORT) || 3000, ENTRY = '/Ngwisa Site Deploy.dc.html';
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jsx': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.css': 'text/css' };
// Server-side files that must never be served.
const PRIVATE = /(^|\/)(\.|api\/|server\.js$|node_modules\/)/;

http.createServer((req, res) => {
  let u; try { u = decodeURIComponent(req.url.split('?')[0]); } catch (e) { res.writeHead(400); return res.end(); }
  if (u === '/api/studio') return studio(req, res);
  if (/^\/studio\/./.test(u)) { res.writeHead(307, { Location: '/studio' }); return res.end(); }
  if (u === '/' || u === '/studio') u = ENTRY;
  const f = path.join(ROOT, u), rel = path.relative(ROOT, f).split(path.sep).join('/');
  if (rel.startsWith('..') || PRIVATE.test(rel) || !fs.existsSync(f) || !fs.statSync(f).isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, () => console.log('Ngwisa site on http://localhost:' + PORT));
