/* Builds the site visitors get into dist/. The source files stay as Claude Design writes them; this only prepares the
   served copy:
   - JSX (animations, reel, hero film) is compiled here, so visitors no longer download Babel (~3 MB) and compile in
     their browser on every visit;
   - React is served from this site (/vendor) instead of unpkg;
   - scripts are minified and versioned (?v=<hash>), so browsers can cache them for a year and still get every update;
   - Claude Design's 360 KB file-browser thumbnail is left out of the page;
   - the page shell (dist/app.html) carries a slot for each page's title, description and share data (api/page.js).
   Run: npm run build  (Vercel runs it on every deploy, see vercel.json). */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const esbuild = require('esbuild');
const { ROOT, ENTRY_SRC, STUDIO_SRC, transformEntry, transformComponent } = require('../lib/shell.js');
const DIST = path.join(ROOT, 'dist');

const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const out = (f, data) => { const p = path.join(DIST, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, data); return p; };
const hash = data => crypto.createHash('sha1').update(data).digest('hex').slice(0, 10);
const kb = n => (n / 1024).toFixed(1) + ' KB';

async function main() {
  fs.rmSync(DIST, { recursive: true, force: true });
  fs.mkdirSync(DIST, { recursive: true });
  const version = {}, report = [];
  const emit = (name, data, from) => { out(name, data); version[name] = hash(data); report.push([name, from || '', Buffer.byteLength(data)]); };

  // Plain scripts: minified, kept as classic scripts (they set window globals the pages use).
  for (const f of ['support.js', 'ngwisa-wix.js', 'ngwisa-parts.js']) {
    const src = read(f), r = await esbuild.transform(src, { loader: 'js', minify: true, target: 'es2019', legalComments: 'none' });
    emit(f, r.code, kb(src.length));
  }
  // JSX modules: compiled ahead of time. The runtime hands each module `React`, so classic createElement is right.
  for (const f of fs.readdirSync(ROOT).filter(f => /\.jsx$/.test(f))) {
    const src = read(f), r = await esbuild.transform(src, { loader: 'tsx', jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment', minify: true, target: 'es2019', legalComments: 'none' });
    emit(f.replace(/\.jsx$/, '.js'), r.code, kb(src.length) + ' jsx');
  }
  // React, served from the site.
  for (const [f, from] of [['vendor/react.production.min.js', 'react/umd/react.production.min.js'], ['vendor/react-dom.production.min.js', 'react-dom/umd/react-dom.production.min.js']]) {
    const pkg = path.dirname(require.resolve(from.split('/')[0] + '/package.json'));
    emit(f, fs.readFileSync(path.join(pkg, from.split('/').slice(1).join('/'))), 'npm');
  }
  // Static assets.
  for (const f of fs.readdirSync(path.join(ROOT, 'assets'))) { const b = fs.readFileSync(path.join(ROOT, 'assets', f)); out('assets/' + f, b); report.push(['assets/' + f, '', b.length]); }

  // Pages.
  const opts = { version, compiled: true, vendor: true };
  const entry = read(ENTRY_SRC), app = transformEntry(entry, opts);
  out('app.html', app); report.push(['app.html', kb(entry.length) + ' source', Buffer.byteLength(app)]);
  const studio = read(STUDIO_SRC), studioOut = transformComponent(studio, opts);
  out(STUDIO_SRC, studioOut); report.push([STUDIO_SRC, kb(studio.length) + ' source', Buffer.byteLength(studioOut)]);
  out('404.html', '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Not found — Ngwisa</title>'
    + '<style>html,body{margin:0;height:100%;background:#141110;color:#FBF8F2;font-family:system-ui,sans-serif}main{min-height:100%;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;gap:18px;padding:0 8vw}h1{margin:0;font-size:clamp(40px,7vw,88px);letter-spacing:-.04em}a{color:#FBF8F2;background:#D81219;padding:14px 24px;border-radius:999px;text-decoration:none;font:500 12px/1 monospace;letter-spacing:.16em}</style></head>'
    + '<body><main><img src="/assets/gong-mark.png" alt="" height="52"><h1>This page isn’t here.</h1><a href="/">BACK TO NGWISA →</a></main></body></html>');
  // Sanity: nothing in the served pages may still point at a .jsx file or unpkg.
  for (const [n, h] of [['app.html', app], [STUDIO_SRC, studioOut]]) {
    const bad = (h.match(/from="[^"]*\.jsx[^"]*"/g) || []).concat(h.match(/unpkg\.com/g) || []);
    if (bad.length) throw new Error(n + ' still references ' + bad.join(', '));
  }
  const w = Math.max(...report.map(r => r[0].length));
  console.log(report.map(r => '  ' + r[0].padEnd(w) + '  ' + kb(r[2]).padStart(10) + (r[1] ? '   (from ' + r[1] + ')' : '')).join('\n'));
  console.log('Built dist/ (' + Object.keys(version).length + ' versioned files).');
}
main().catch(e => { console.error(e); process.exit(1); });
