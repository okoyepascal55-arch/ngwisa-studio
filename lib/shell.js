/* Turns the Claude Design source pages into what visitors are served. Used by the build (scripts/build.js) and, when
   no build exists, by server.js and api/page.js directly from the source files, so the site works either way.
   The source .dc.html files stay exactly as Claude Design writes them; only the served copy changes. */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const ENTRY_SRC = 'Ngwisa Site Deploy.dc.html', STUDIO_SRC = 'Ngwisa Studio.dc.html';
/* The served Studio file has no space in its name: Wix's file hosting doesn't serve file names with spaces. */
const STUDIO_NAME = 'ngwisa-studio', STUDIO_OUT = STUDIO_NAME + '.dc.html';

const HEAD_EXTRA = [
  '<base href="/">',
  '<title>Ngwisa</title>',
  '<!--ng:head-->',
  '<meta name="theme-color" content="#141110">',
  '<link rel="icon" type="image/png" href="/assets/gong-mark.png">',
  '<link rel="preconnect" href="https://www.wixapis.com" crossorigin>',
  '<link rel="preconnect" href="https://static.wixstatic.com">',
  '<link rel="preconnect" href="https://fonts.googleapis.com">',
  '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
].join('\n');

/* opts: { version: {file: hash} — appended as ?v= so files can be cached for a year; compiled: true — .jsx imports
   point at the prebuilt .js; vendor: true — React is served from /vendor instead of unpkg. */
/* A built file's served path carries its content hash in the name (/ngwisa-wix.3f2a1b9c0d.js): some hosts' caches
   (Wix's) ignore ?v= query strings, so only a new name guarantees visitors get the new file. */
const assetPath = (name, ver) => ver && ver[name] ? '/' + name.replace(/(\.[a-z]+)$/, '.' + ver[name] + '$1') : '';
function rewriteRefs(html, opts) {
  opts = opts || {};
  const ver = opts.version || {};
  const local = (f, q) => { let name = f.replace(/^\.?\//, ''); if (opts.compiled) name = name.replace(/\.jsx$/, '.js'); return assetPath(name, ver) || '/' + name + (q || ''); };
  // <script src="./x.js">  and  x-import from="./a.jsx ./b.jsx"
  html = html.replace(/(<script\b[^>]*\bsrc=")(\.?\/?[\w.-]+\.js)(")/g, (m, a, f, b) => a + local(f) + b);
  html = html.replace(/(<x-import\b[^>]*\bfrom=")([^"]+)(")/g, (m, a, list, b) => a + list.trim().split(/\s+/).map(f => /^(https?:)?\/\//.test(f) ? f : local(f)).join(' ') + b);
  // Claude Design's thumbnail for its file browser: ~360 KB of base64 nobody visiting the site needs.
  html = html.replace(/<dc-import name="Ngwisa Studio"/g, '<dc-import name="' + STUDIO_NAME + '"');
  html = html.replace(/<template id="__bundler_thumbnail">[\s\S]*?<\/template>\s*/g, '');
  return html;
}
function transformEntry(html, opts) {
  opts = opts || {};
  html = rewriteRefs(html, opts);
  html = html.replace(/<html>/i, '<html lang="en">');
  html = html.replace(/(<meta name="viewport"[^>]*>)/i, '$1\n' + HEAD_EXTRA);
  if (opts.vendor) {
    const v = opts.version || {}, q = f => '';
    html = html.replace(/(<script src="\/support(?:\.[0-9a-f]{10})?\.js[^"]*"><\/script>)/, '<script src="' + (assetPath('vendor/react.production.min.js', v) || '/vendor/react.production.min.js') + '"></script>\n<script src="' + (assetPath('vendor/react-dom.production.min.js', v) || '/vendor/react-dom.production.min.js') + '"></script>\n$1');
  }
  html = html.replace(/<body>/i, '<body>\n<!--ng:body-->');
  return html;
}
const transformComponent = (html, opts) => rewriteRefs(html, opts);

let cached = null;
/* The page shell visitors get: the built copy when there is one, otherwise the source transformed on the fly. */
function getShell() {
  if (cached) return cached;
  const built = [path.join(ROOT, 'dist', 'app.html'), path.join(process.cwd(), 'dist', 'app.html'), path.join(ROOT, 'app.html')].find(f => { try { return fs.statSync(f).isFile(); } catch (e) { return false; } });
  if (built) return (cached = fs.readFileSync(built, 'utf8'));
  const src = path.join(ROOT, ENTRY_SRC);
  return (cached = transformEntry(fs.readFileSync(src, 'utf8'), {}));
}
module.exports = { ROOT, ENTRY_SRC, STUDIO_SRC, STUDIO_NAME, STUDIO_OUT, assetPath, transformEntry, transformComponent, getShell };
