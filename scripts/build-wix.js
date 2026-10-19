/* Builds the Wix-hosted version of the site into dist-wix/ (and release/ngwisa-wix.zip), from the regular build in
   dist/. Wix's headless hosting serves files only, so instead of api/page.js every address is prebuilt as its own
   folder/index.html with its title, description, share image and structured data:
     /  /the-loop  /shop  /heritage  /founders-voice  /journal  /thank-you  /studio  /shop/<every piece>
   plus sitemap.xml, robots.txt and a 404.html that is the site itself, so a piece added in Wix after the build still
   opens in the browser. The Studio saves through the same api/studio.js, running on Vercel (NG_STUDIO_API).

   Usage: npm run build && node scripts/build-wix.js [snapshot.json]
     snapshot.json  the catalogue from /api/snapshot (default data/wix-snapshot.json). Without it, only the pages
                    and the design's built-in pieces are prebuilt.
   Settings: NG_SITE_URL (the Wix site address), NG_STUDIO_API (the Studio API on Vercel). */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const { render, seedFrom, PAGES } = require('../lib/seo.js');
const ROOT = path.join(__dirname, '..'), DIST = path.join(ROOT, 'dist'), OUT = path.join(ROOT, 'dist-wix');
const SITE = (process.env.NG_SITE_URL || 'https://ngwisa-gong-gallery-sjkgracee-1309.wix-site-host.com').replace(/\/+$/, '');
const STUDIO_API = process.env.NG_STUDIO_API || 'https://ngwisa-studio.vercel.app/api/studio';
const SNAP_FILE = process.argv.slice(2).find(a => !a.startsWith('--')) || path.join(ROOT, 'data', 'wix-snapshot.json');

const INTO_DIST = process.argv.includes('--into-dist'); // also publish the zip as dist/ngwisa-wix.zip (Vercel build)
(async () => {
if (!fs.existsSync(path.join(DIST, 'app.html'))) { console.error('Run `npm run build` first.'); process.exit(1); }
// The catalogue: a saved snapshot when given, otherwise read live from Wix (the build machine reaches Wix).
let snap = fs.existsSync(SNAP_FILE) ? JSON.parse(fs.readFileSync(SNAP_FILE, 'utf8')) : null;
if (!snap) { try { const live = await require('../lib/wix-server.js').snapshot(); if (!live.failed) snap = live; } catch (e) {} }
if (!snap) snap = { products: [], copy: {}, slots: {} };
const shell = fs.readFileSync(path.join(DIST, 'app.html'), 'utf8');
snap.seed = seedFrom(shell);

fs.rmSync(OUT, { recursive: true, force: true });
const copyDir = (from, to) => { fs.mkdirSync(to, { recursive: true }); for (const f of fs.readdirSync(from)) { const a = path.join(from, f), b = path.join(to, f);
  if (fs.statSync(a).isDirectory()) copyDir(a, b); else if (f !== 'app.html' && f !== '404.html') fs.copyFileSync(a, b); } };
copyDir(DIST, OUT);

const PREBUILT = [...new Set(snap.products.map(p => p.slug).concat(snap.seed.map(s => s.slug)))];
const BUILD = (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || new Date().toISOString();
const apiTag = '<meta name="ngwisa-build" content="' + BUILD + '">\n<script>window.NG_STUDIO_API = ' + JSON.stringify(STUDIO_API) + '; window.NG_HTML_URLS = true; window.NG_PREBUILT = ' + JSON.stringify(PREBUILT) + ';</script>';
const page = route => { const r = render(route, /^\/studio/.test(route) ? null : snap, SITE, { html: true });
  return { status: r.status, html: shell.replace(/<title>[^<]*<\/title>\s*<!--ng:head-->/, r.head + '\n' + apiTag).replace('<!--ng:body-->', r.body) }; };
// Wix's file hosting serves exact paths only, so each address is a file: /shop.html, /shop/<piece>.html.
const write = (route, html) => { const f = route === '/' ? 'index.html' : route.replace(/^\//, '') + '.html'; const p = path.join(OUT, f);
  fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, html); return f; };

const routes = Object.keys(PAGES).map(k => PAGES[k].path).concat(['/thank-you', '/studio']);
const slugs = new Set(snap.products.map(p => p.slug).concat(snap.seed.map(s => s.slug)));
let n = 0; const skipped = [];
for (const r of routes) { write(r, page(r).html); n++; }
for (const s of slugs) { const r = '/shop/' + encodeURIComponent(s), o = page(r); if (o.status !== 200) { skipped.push(s); continue; } write('/shop/' + s, o.html); n++; }
// Anything else: the site itself, marked not to be indexed; the browser routes it (a piece added after the build).
const nf = render('/__missing__', snap, SITE, { html: true });
fs.writeFileSync(path.join(OUT, '404.html'), shell.replace(/<title>[^<]*<\/title>\s*<!--ng:head-->/, nf.head + '\n' + apiTag).replace('<!--ng:body-->', ''));

// sitemap.xml and robots.txt
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const day = s => { const d = s ? new Date(s) : null; return d && !isNaN(d) ? d.toISOString().slice(0, 10) : ''; };
const H = p => p === '/' ? p : p + '.html';
const urls = Object.keys(PAGES).map(k => '<url><loc>' + esc(SITE + H(PAGES[k].path)) + '</loc><priority>' + (k === 'home' ? '1.0' : k === 'shop' ? '0.9' : '0.7') + '</priority></url>')
  .concat(snap.products.map(p => '<url><loc>' + esc(SITE + H('/shop/' + encodeURIComponent(p.slug))) + '</loc>' + (day(p.updated) ? '<lastmod>' + day(p.updated) + '</lastmod>' : '') + '<priority>0.8</priority>'
    + (p.imgs && p.imgs[0] ? '<image:image><image:loc>' + esc(p.imgs[0]) + '</image:loc></image:image>' : '') + '</url>'));
fs.writeFileSync(path.join(OUT, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' + urls.join('\n') + '\n</urlset>\n');
fs.writeFileSync(path.join(OUT, 'robots.txt'), ['User-agent: *', 'Disallow: /studio', 'Disallow: /thank-you', '', 'Sitemap: ' + SITE + '/sitemap.xml', ''].join('\n'));

// release/ngwisa-wix.zip (stored + deflated with Node's zlib; no extra dependency)
const files = []; (function walk(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) walk(p); else files.push(p); } })(OUT);
const crcT = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; return c; });
const crc32 = b => { let c = -1; for (let i = 0; i < b.length; i++) c = crcT[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const parts = [], central = []; let off = 0;
for (const f of files.sort()) {
  const name = Buffer.from(path.relative(OUT, f).split(path.sep).join('/')), raw = fs.readFileSync(f), def = zlib.deflateRawSync(raw, { level: 9 }), crc = crc32(raw);
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0, 6); lh.writeUInt16LE(8, 8); lh.writeUInt32LE(0, 10);
  lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(def.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
  parts.push(lh, name, def);
  const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0, 8); ch.writeUInt16LE(8, 10); ch.writeUInt32LE(0, 12);
  ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(def.length, 20); ch.writeUInt32LE(raw.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
  central.push(ch, name); off += 30 + name.length + def.length;
}
const cd = Buffer.concat(central), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
fs.mkdirSync(path.join(ROOT, 'release'), { recursive: true });
const zip = Buffer.concat(parts.concat([cd, end])); fs.writeFileSync(path.join(ROOT, 'release', 'ngwisa-wix.zip'), zip);
if (INTO_DIST) fs.writeFileSync(path.join(DIST, 'ngwisa-wix.zip'), zip);
const total = files.reduce((t, f) => t + fs.statSync(f).size, 0);
console.log('dist-wix: ' + files.length + ' files, ' + n + ' pages, ' + (total / 1048576).toFixed(1) + ' MB; release/ngwisa-wix.zip ' + (zip.length / 1048576).toFixed(2) + ' MB'
  + (snap.products.length ? '' : ' (no catalogue snapshot: only built-in pieces prebuilt)') + (skipped.length ? '; not prebuilt: ' + skipped.join(', ') : ''));
})().catch(e => { console.error(e); process.exit(1); });
