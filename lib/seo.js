/* Title, description, share image and structured data for every address on the site. The Studio can override page
   titles and descriptions (Site copy › seo<Page>T / seo<Page>D) and each product's (Products screen); Wix Stores
   supplies the product facts. Everything falls back to the wording below. */
const PAGES = {
  home: { path: '/', name: 'Home', t: 'Ngwisa — Toghu Luxury Fashion | Hand-Embroidered Cameroonian Clothing, Manchester', d: 'Ngwisa cuts Toghu, the hand-embroidered royal cloth of North-West Cameroon, into modern luxury fashion: corsets, sets, dresses and tailoring for women and men. From the Ngwisa atelier in Manchester.', slot: 'hero-poster' },
  loop: { path: '/the-loop', name: 'The Loop', t: 'The Loop — New Toghu Pieces | Ngwisa', d: 'The newest pieces from Ngwisa: Toghu embroidery in red, yellow and white on black velvet, cut into contemporary African luxury fashion.', slot: 'deck-women' },
  shop: { path: '/shop', name: 'Shop', t: 'Shop Toghu Clothing for Women & Men — Ngwisa', d: 'Shop Ngwisa: Toghu corsets, two-piece sets, dresses, blazers and waistcoats, hand-embroidered Cameroonian fabric in modern African luxury silhouettes.', slot: 'deck-women' },
  heritage: { path: '/heritage', name: 'Heritage', t: 'What Is Toghu? The Royal Cloth of Cameroon — Ngwisa', d: 'Toghu comes from the Grassfields of North-West Cameroon: black cloth embroidered by hand in red, yellow and white, once worn by kings. Its story, colours, symbols and making.', slot: 'hr-hero' },
  founders: { path: '/founders-voice', name: 'Founder’s Voice', t: 'Founder’s Voice — The Story Behind Ngwisa', d: 'Why Ngwisa exists: Cameroonian heritage, luxury and contemporary fashion in one wardrobe. The founder on the work, the project and the vision.', slot: 'fd-voice' },
  journal: { path: '/journal', name: 'Journal', t: 'Journal — Runways, Shows & Atelier Stories | Ngwisa', d: 'Runways, conferences and showcases where Ngwisa has carried Toghu and African fashion onto the stage, and stories from the Manchester atelier.', slot: 'jn-hero' },
};
const DEFAULT_IMG = 'https://static.wixstatic.com/media/840628_307b148cf73a4cb99a790031b7b8dc22~mv2.jpg';
const ORG = { name: 'Ngwisa', email: 'info.ngwisa@gmail.com', instagram: 'https://www.instagram.com/_ngwisa_/', desc: 'Ngwisa is a luxury fashion house in Manchester that cuts Toghu, the hand-embroidered royal cloth of North-West Cameroon, into modern clothing for women and men.', street: '4 Pollard Street East', city: 'Manchester', postcode: 'M40 7FS', country: 'GB' };

const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s; };
/* A Wix media URL at share-card size (1200×630). */
const ogImg = u => /^https:\/\/static\.wixstatic\.com\/media\/[^/?#]+$/.test(u || '') ? u + '/v1/fill/w_1200,h_630,q_80,enc_jpg/' + (u.split('/').pop().replace(/[^\w.~-]/g, '') || 'og.jpg') : (u || '');
const json = o => JSON.stringify(o).replace(/</g, '\\u003c');

function route(p) {
  p = String(p || '/').split('?')[0].replace(/\/index\.html$/, '').replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  if (/^\/studio(\/|$)/i.test(p)) return { kind: 'studio' };
  if (p === '/thank-you') return { kind: 'thanks' };
  const m = p.match(/^\/shop\/([^/]+)$/); if (m) { let slug = m[1]; try { slug = decodeURIComponent(slug); } catch (e) {} return { kind: 'product', slug }; }
  if (p === '/loop') return { kind: 'page', page: 'loop', alias: true };
  if (p === '/founders') return { kind: 'page', page: 'founders', alias: true };
  const page = Object.keys(PAGES).find(k => PAGES[k].path === p);
  return page ? { kind: 'page', page } : { kind: 'missing' };
}

/* -> { status, head (HTML for <head>), body (crawler-readable HTML for <noscript>) } */
/* opts.html: addresses end in .html (Wix's file hosting serves exact file paths only). */
function render(path, snap, base, opts) {
  const H = p => opts && opts.html && p !== '/' ? p + '.html' : p;
  const r = route(path), copy = (snap && snap.copy) || {}, slots = (snap && snap.slots) || {}, products = (snap && snap.products) || [];
  const cap = k => k.charAt(0).toUpperCase() + k.slice(1);
  const pageMeta = k => ({ t: copy['seo' + cap(k) + 'T'] || PAGES[k].t, d: copy['seo' + cap(k) + 'D'] || PAGES[k].d, img: slots[PAGES[k].slot] || slots['hero-poster'] || DEFAULT_IMG, url: base + H(PAGES[k].path) });
  const navLinks = Object.keys(PAGES).map(k => '<a href="' + H(PAGES[k].path) + '">' + esc(PAGES[k].name) + '</a>').join(' · ');
  const org = { '@type': ['ClothingStore', 'Organization'], '@id': base + '/#org', name: ORG.name, alternateName: 'Ngwisa Toghu', url: base + '/', logo: { '@type': 'ImageObject', url: base + '/assets/gong-mark.png' },
    image: DEFAULT_IMG, description: ORG.desc, email: ORG.email, sameAs: [ORG.instagram], priceRange: '££',
    knowsAbout: ['Toghu', 'Cameroonian fashion', 'African luxury fashion', 'Hand embroidery', 'Grassfields textiles'],
    address: { '@type': 'PostalAddress', streetAddress: ORG.street, addressLocality: ORG.city, postalCode: ORG.postcode, addressCountry: ORG.country } };
  const site = { '@type': 'WebSite', '@id': base + '/#site', name: 'Ngwisa', url: base + '/', inLanguage: 'en-GB', publisher: { '@id': base + '/#org' } };
  const crumbs = list => ({ '@type': 'BreadcrumbList', itemListElement: [{ name: 'Ngwisa', item: base + '/' }].concat(list).map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: x.item })) });
  let status = 200, robots = 'index,follow', m, type = 'website', ld = [], body = '';

  if (r.kind === 'product') {
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const sd = !products.some(x => x.slug === r.slug) && ((snap && snap.seed) || []).find(x => x.slug === r.slug);
    // An old short address of a piece that is in Wix: same page, canonical to the Wix address.
    const p = products.find(x => x.slug === r.slug) || (sd && products.find(x => norm(x.name) === norm(sd.name)))
      || (sd && { slug: sd.slug, name: sd.name, price: sd.price, imgs: [], desc: sd.desc, hook: sd.hook, cat: sd.cat, inStock: true, seo: {}, onRequest: sd.price == null });
    if (p) {
      const img = p.imgs[0] || DEFAULT_IMG, url = base + H('/shop/' + encodeURIComponent(p.slug));
            m = { t: (p.seo.title || p.name) + ' | Ngwisa Luxury African Fashion', d: clip(p.seo.description || p.desc || p.hook || PAGES.shop.d, 158), img, url, price: p.price != null && !p.onRequest ? Number(p.price).toFixed(2) : null };
      type = 'product';
      const offer = p.price != null && !p.onRequest ? { '@type': 'Offer', url, priceCurrency: 'GBP', price: Number(p.price).toFixed(2), availability: 'https://schema.org/' + (p.inStock ? 'InStock' : 'OutOfStock'), itemCondition: 'https://schema.org/NewCondition', seller: { '@id': base + '/#org' } } : undefined;
      ld.push({ '@type': 'Product', name: p.name, description: clip(p.desc || p.hook, 600) || undefined, image: p.imgs.slice(0, 6), sku: p.wixId || undefined, url, brand: { '@type': 'Brand', name: 'Ngwisa' }, category: p.cat || undefined, material: /toghu/i.test((p.name || '') + ' ' + (p.desc || '') + ' ' + (p.hook || '')) ? 'Toghu (hand-embroidered Cameroonian cloth)' : undefined,
        audience: p.gender === 'm' ? { '@type': 'PeopleAudience', suggestedGender: 'male' } : p.gender === 'w' ? { '@type': 'PeopleAudience', suggestedGender: 'female' } : undefined, offers: offer });
      ld.push(crumbs([{ name: 'Shop', item: base + H('/shop') }, { name: p.name, item: url }]), org, site);
      body = '<h1>' + esc(p.name) + '</h1>' + (p.price != null ? '<p>£' + esc(Number(p.price).toFixed(2)) + (p.inStock ? '' : ' · Sold out') + '</p>' : '') + '<p>' + esc(p.desc || p.hook) + '</p>' + (p.imgs[0] ? '<img src="' + esc(p.imgs[0]) + '" alt="' + esc(p.name) + '">' : '');
    } else {
      status = snap && !snap.failed ? 404 : 200; robots = 'noindex,follow';
      m = Object.assign(pageMeta('shop'), { t: 'Not found — Ngwisa', url: base + H('/shop') });
      body = '<h1>This piece isn’t in the shop right now.</h1><p><a href="' + H('/shop') + '">See everything in the shop</a></p>';
    }
  } else if (r.kind === 'page') {
    m = pageMeta(r.page);
    ld.push(org, site);
    if (r.page !== 'home') ld.push(crumbs([{ name: PAGES[r.page].name, item: m.url }]), { '@type': r.page === 'founders' ? 'AboutPage' : 'WebPage', name: m.t, description: m.d, url: m.url, isPartOf: { '@id': base + '/#site' }, primaryImageOfPage: ogImg(m.img) || undefined });
    if (r.page === 'shop' || r.page === 'loop') ld.push({ '@type': 'CollectionPage', name: m.t, url: m.url, mainEntity: { '@type': 'ItemList', itemListElement: products.slice(0, 50).map((p, i) => ({ '@type': 'ListItem', position: i + 1, url: base + H('/shop/' + encodeURIComponent(p.slug)), name: p.name })) } });
    body = '<h1>' + esc(r.page === 'home' ? 'Ngwisa — Toghu luxury fashion from Manchester' : PAGES[r.page].name) + '</h1><p>' + esc(m.d) + '</p>' + (r.page === 'home' ? '<p>' + esc(ORG.desc) + '</p>' : '');
  } else if (r.kind === 'thanks') {
    m = Object.assign(pageMeta('shop'), { t: 'Thank you — Ngwisa', url: base + H('/thank-you') }); robots = 'noindex,nofollow';
  } else if (r.kind === 'studio') {
    m = { t: 'Ngwisa Studio', d: 'Owner sign-in.', img: DEFAULT_IMG, url: base + H('/studio') }; robots = 'noindex,nofollow';
  } else {
    status = 404; robots = 'noindex,follow'; m = Object.assign(pageMeta('home'), { t: 'Not found — Ngwisa' });
    body = '<h1>Page not found</h1>';
  }
  if (r.kind === 'page' || r.kind === 'product') body += '<nav>' + navLinks + '</nav>' + (products.length && (r.kind === 'product' || r.page === 'shop' || r.page === 'loop' || r.page === 'home') ? '<ul>' + products.map(p => '<li><a href="' + esc(H('/shop/' + encodeURIComponent(p.slug))) + '">' + esc(p.name) + '</a></li>').join('') + '</ul>' : '');

  const img = ogImg(m.img);
  const head = [
    '<title>' + esc(m.t) + '</title>',
    '<meta name="description" content="' + esc(clip(m.d, 158)) + '">',
    '<meta name="robots" content="' + robots + '">',
    status === 200 && robots.indexOf('noindex') < 0 ? '<link rel="canonical" href="' + esc(r.kind === 'page' && r.alias ? base + H(PAGES[r.page].path) : m.url) + '">' : '',
    '<meta property="og:site_name" content="Ngwisa">',
    '<meta property="og:type" content="' + type + '">',
    type === 'product' && m.price != null ? '<meta property="product:price:amount" content="' + esc(m.price) + '"><meta property="product:price:currency" content="GBP">' : '',
    '<meta property="og:title" content="' + esc(m.t) + '">',
    '<meta property="og:description" content="' + esc(clip(m.d, 200)) + '">',
    '<meta property="og:url" content="' + esc(m.url) + '">',
    img ? '<meta property="og:image" content="' + esc(img) + '"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">' : '',
    '<meta property="og:locale" content="en_GB">',
    img ? '<meta property="og:image:alt" content="' + esc(m.t) + '">' : '',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + esc(m.t) + '">',
    '<meta name="twitter:description" content="' + esc(clip(m.d, 200)) + '">',
    img ? '<meta name="twitter:image" content="' + esc(img) + '">' : '',
    status === 200 && robots.indexOf('noindex') < 0 ? '<link rel="alternate" hreflang="en-GB" href="' + esc(m.url) + '"><link rel="alternate" hreflang="x-default" href="' + esc(m.url) + '">' : '',
    '<meta name="theme-color" content="#141110">',
    ld.length ? '<script type="application/ld+json">' + json({ '@context': 'https://schema.org', '@graph': ld }) + '</script>' : '',
  ].filter(Boolean).join('\n');
  return { status, head, body: body ? '<noscript><div style="padding:24px;font-family:sans-serif;color:#FBF8F2;background:#141110">' + body + '</div></noscript>' : '' };
}
/* The design's built-in pieces, read from the page script: pieces sold "on request" that aren't in Wix Stores,
   and the old short addresses (/shop/rahrah) of pieces that are. */
let seedCache = null;
function seedFrom(html) {
  if (seedCache) return seedCache;
  const out = [], re = /^\s*\['([\w-]+)', '((?:[^'\\]|\\.)*)', (null|[\d.]+), '[^']*', '[^']*', '([^']*)', '[wmu]', '((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)'/gm;
  let m; while ((m = re.exec(html))) out.push({ slug: m[1], name: m[2].replace(/\\'/g, "'"), price: m[3] === 'null' ? null : Number(m[3]), cat: m[4], hook: m[5].replace(/\\'/g, "'"), desc: m[6].replace(/\\'/g, "'") });
  return (seedCache = out);
}
module.exports = { PAGES, route, render, seedFrom, esc, ogImg, DEFAULT_IMG };
