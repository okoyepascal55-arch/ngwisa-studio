/* Server-side read of the public store: the same visitor (anonymous) access the browser has, used to give each page
   its title, description, share image and structured data, and to build the sitemap. Nothing here needs the API key.
   Results are kept in memory for a few minutes so a burst of page views costs one set of Wix calls. */
const CAT = require('../ngwisa-wix.js');
const TTL = 5 * 60 * 1000, TIMEOUT = 4000;
let tok = null, snap = null, snapAt = 0, inflight = null;

async function wfetch(url, opts) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), TIMEOUT);
  try { return await fetch(url, Object.assign({ signal: ac.signal }, opts)); } finally { clearTimeout(t); }
}
async function token() {
  if (tok && tok.until > Date.now()) return tok.value;
  const r = await wfetch(CAT.API + '/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: CAT.CLIENT_ID, grantType: 'anonymous' }) });
  if (!r.ok) throw new Error('Wix auth failed (' + r.status + ')');
  const d = await r.json(); tok = { value: d.access_token, until: Date.now() + (d.expires_in - 120) * 1000 }; return tok.value;
}
async function request(path, opts) {
  opts = opts || {};
  const r = await wfetch(CAT.API + path, { method: opts.method || 'POST', headers: { Authorization: await token(), 'Content-Type': 'application/json' }, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  if (!r.ok) { let m = ''; try { m = (await r.json()).message || ''; } catch (e) {} const err = new Error(m || ('Wix request failed (' + r.status + ')')); err.status = r.status; throw err; }
  return r.status === 204 ? null : r.json();
}
async function collection(id) {
  const r = await request('/wix-data/v2/items/query', { body: { dataCollectionId: id, query: { cursorPaging: { limit: 1000 } } } });
  return ((r && r.dataItems) || []).map(x => Object.assign({ _id: x.id }, x.data || {}));
}
const mediaUrl = v => { if (!v) return ''; if (typeof v === 'object') v = v.url || ''; const m = String(v).match(/^wix:image:\/\/v1\/([^/#]+)/); return m ? 'https://static.wixstatic.com/media/' + m[1] : String(v); };

/* { products: [shown pieces, each with slug, name, price, imgs, desc, inStock, seo], copy: {key: text}, slots: {spot: url} } */
async function load() {
  const [wix, meta, copyRows, slotRows] = await Promise.all([
    CAT.queryProducts(request),
    collection('StudioProducts').catch(() => []),
    collection('StudioHomeCopy').catch(() => []),
    collection('StudioSiteSlots').catch(() => []),
  ]);
  const byId = new Map(wix.map(w => [w.wixId, w]));
  const products = CAT.mergeCatalog([], wix, meta).filter(p => !p.hidden).map(p => {
    const w = byId.get(p.wixId) || {};
    return { id: p.id, wixId: p.wixId, slug: p.slug, name: p.name, price: p.price, imgs: (p.imgs || []).filter(Boolean), desc: p.desc || '', hook: p.hook || '',
      cat: p.cat, inStock: !p.soldOut && w.inStock !== false && !(w.variants && w.variants.length && w.variants.every(v => !v.inStock)), seo: p.seo || {}, updated: w.updated || '' };
  });
  const copy = {}; copyRows.forEach(r => { if (r.title && typeof r.text === 'string' && r.text.trim()) copy[r.title] = r.text.trim(); });
  const slots = {}; slotRows.forEach(r => { const u = mediaUrl(r.image || r.fileUrl); if (r.title && /^https:\/\/static\.wixstatic\.com\/media\//.test(u)) slots[r.title] = u; });
  /* What the site's first render needs before it reads Studio content itself: every published photo and film spot
     with its alt text and focus point, and the published words (scripts/build-wix.js writes it into each page). */
  const boot = { copy, slots: {}, meta: {} };
  slotRows.forEach(r => { const u = mediaUrl(r.video || r.image || r.fileUrl); if (!r.title || !/^https:\/\/(static|video)\.wixstatic\.com\//.test(u)) return;
    boot.slots[r.title] = u; boot.meta[r.title] = { alt: r.alt || '', pos: r.focalX != null && r.focalY != null ? r.focalX + '% ' + r.focalY + '%' : '' }; });
  return { products, copy, slots, boot };
}
/* Never throws: if Wix is slow or down, pages still render with their built-in titles and descriptions. */
async function snapshot() {
  if (snap && Date.now() - snapAt < TTL) return snap;
  if (!inflight) inflight = load().then(s => { snap = s; snapAt = Date.now(); return s; }).catch(e => { console.warn('[ngwisa] Wix snapshot failed:', e.message); return snap || { products: [], copy: {}, slots: {}, boot: null, failed: true }; }).finally(() => { inflight = null; });
  return inflight;
}
module.exports = { snapshot, request, collection, mediaUrl };
