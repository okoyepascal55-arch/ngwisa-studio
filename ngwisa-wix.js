/* Ngwisa ↔ Wix (gong gallery headless site). Visitor-token REST client: catalog, cart, hosted checkout, members.
   Shapes follow wix-headless-templates storefront/rest/cart.ts + shared/rest/client.ts.

   One file, two homes:
   - In the browser it defines window.NGW (the client) and window.NGR (the image resizer).
   - In Node (api/*.js) `require('./ngwisa-wix.js')` returns the pure catalogue helpers (CAT), so the site, the
     Studio and the server all decide the same way which pieces are shown, how they are named and where they live. */
(function (root) {
  const CLIENT_ID = '74aff7bb-3656-4173-b0fb-503bcb70d7a4';
  const API = 'https://www.wixapis.com';
  const STORES_APP = '215238eb-22a5-4c36-9e7b-e7c08025e04e';

  /* ================= Pure catalogue helpers (browser + Node) ================= */
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const slugify = s => norm(s).replace(/ /g, '-');
  const img = m => {
    if (!m) return '';
    const s = typeof m === 'string' ? m : (m.url || (m.image && (m.image.url || m.image)) || '');
    const w = typeof s === 'string' && s.match(/^wix:image:\/\/v1\/([^/]+)/);
    return w ? 'https://static.wixstatic.com/media/' + w[1] : (typeof s === 'string' ? s : '');
  };
  /* Before the owner first publishes the Studio's Products screen, the shop shows only these Wix products (the
     list the site used to carry in code). Once StudioProducts has rows, every visible Wix product is shown unless
     the Studio hides it, so a piece added in Wix appears on the site without a code change. */
  const LEGACY_SHOWN = ['AWA CROWN', 'Rahrah corsetTOP', 'Rahrah SET', 'SHINE SET', 'LIYAH DRESS & SCARF', 'NKEH PANTS', 'MANYI SKIRT', 'TATAH Unisex Blazer', 'Lohchi DRESS', 'Beri SKIRT', 'Beri TOP', 'Ayeah SHIRT', 'Andy SHIRT', 'TANKO VEST', 'BELLA SILK SKIRT', 'Manyi TOP', 'TATAH', 'NESSI', 'LADY', 'YAYUH', 'MALIYA', "MA'FOR", "MA'YAH", "FON'EYI", "NA'FOIN", 'LINWE SKIRT', "NA'MAFOR TOP", "NA'MAFOR SKIRT", "YE'FON", 'Rahrah Set, White Fringe', 'Main Character Corset', 'Mawa Dress', 'Mimche Dress', 'Muna Set', 'Mita Dress', 'Yem Shirt Dress'];
  const LEGACY = new Set(LEGACY_SHOWN.map(norm));
  const CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Sets', 'Tailoring', 'Outerwear', 'Accessories', 'Jumpsuits', 'Collection'];
  /* Wix Stores descriptions arrive as HTML (<p>, &nbsp;, <br>): the site shows them as plain text. */
  const ENT = { nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', hellip: '…', pound: '£' };
  const htmlText = h => String(h || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d)>/gi, '\n\n').replace(/<[^>]*>/g, '')
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (ENT[e.toLowerCase()] ?? m))
    .replace(/[ \t\u00a0]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const titleCase = s => String(s || '').replace(/\w\S*/g, w => w.charAt(0) + w.slice(1).toLowerCase());
  const variantRows = vs => {
    const rows = vs.filter(v => v.label).map(v => [v.label, v.qty, null, !v.inStock]);
    return rows.length ? rows : vs.length ? [['ONE SIZE', vs[0].qty, null, !vs[0].inStock]] : null;
  };
  const parseVariants = p => ((p && p.variantsInfo && p.variantsInfo.variants) || []).map(v => {
    const choices = (v.choices || []).map(c => c.optionChoiceNames && c.optionChoiceNames.choiceName).filter(Boolean);
    return { id: v.id, choices, label: choices.join(' / '), inStock: !(v.inventoryStatus && v.inventoryStatus.inStock === false), qty: null };
  });
  /* A Wix Stores v3 product, reduced to what the site needs. */
  function normProduct(p) {
    const media = (p.media && p.media.itemsInfo && p.media.itemsInfo.items) || [];
    const pr = p.actualPriceRange && p.actualPriceRange.minValue;
    const imgs = media.map(img).filter(Boolean);
    const main = img(p.media && p.media.main) || imgs[0] || '';
    if (main && imgs.indexOf(main) < 0) imgs.unshift(main);
    const vs = parseVariants(p);
    const seo = (p.seoData && p.seoData.tags) || [];
    const tag = (type, prop) => { const t = seo.find(x => x.type === type && (!prop || (x.props && (x.props.name === prop || x.props.property === prop)))); return t ? (t.children || (t.props && t.props.content) || '') : ''; };
    return {
      wixId: p.id, slug: p.slug || slugify(p.name), name: p.name || '', key: norm(p.name), visible: p.visible !== false,
      price: pr ? Number(pr.amount) : null, img: main, imgs, desc: htmlText(p.plainDescription || ''),
      variants: vs, inStock: !(p.inventory && p.inventory.availabilityStatus === 'OUT_OF_STOCK'),
      seoTitle: tag('title'), seoDescription: tag('meta', 'description'), updated: p.updatedDate || '',
    };
  }
  /* Merge the site's built-in pieces (editorial copy, photos used by the design) with Wix Stores and the Studio's
     StudioProducts rows. Wix decides what exists, its price, photos, description, stock and URL; the Studio decides
     visibility, category, gender, hook, best-seller rank and restocking; the built-in list fills anything still blank.
     Built-in objects are updated in place so references the design holds keep working. */
  function mergeCatalog(seed, wix, metaRows) {
    seed = seed || []; wix = wix || []; metaRows = metaRows || [];
    const hasMeta = metaRows.length > 0, meta = {}; metaRows.forEach(r => { if (r && r.productId) meta[r.productId] = r; });
    const bySeedId = new Map(seed.map(p => [p.id, p])), bySeedName = new Map(seed.map(p => [norm(p.name), p]));
    const linked = new Set(), out = seed.slice(), added = [];
    wix.forEach(w => {
      if (!w || w.visible === false) return;
      const m = meta[w.wixId] || null;
      const shown = hasMeta ? !(m && m.hidden) : LEGACY.has(w.key);
      let p = (m && m.seedId && bySeedId.get(m.seedId)) || bySeedName.get(w.key) || null;
      if (p && linked.has(p.id)) p = null; // one Wix product per built-in piece
      if (!p) {
        if (!shown) return;
        p = { id: 'w-' + w.wixId, name: titleCase(w.name), price: null, img: '', alt: '', imgs: [''], cat: 'Collection', g: /unisex|shirt|vest/i.test(w.name) ? 'u' : 'w', hook: '', desc: '', sizes: [['ONE SIZE']], restock: true, best: 0, isNew: false };
        added.push(p);
      }
      linked.add(p.id);
      p.wixId = w.wixId; p.slug = w.slug || p.slug || p.id; p.hidden = !shown;
      if (w.price != null) p.price = w.price;
      if (w.imgs && w.imgs.length) { p.imgs = w.imgs.slice(0, 6); p.img = w.imgs[0]; p.alt = w.imgs[1] || w.imgs[0]; }
      if (w.desc) p.desc = w.desc;
      if (m) {
        if (typeof m.displayName === 'string' && m.displayName.trim()) p.name = m.displayName.trim();
        if (m.category) p.cat = m.category;
        if (m.gender) p.g = m.gender;
        if (typeof m.hook === 'string' && m.hook.trim()) p.hook = m.hook;
        if (m.best != null && m.best !== '') p.best = Number(m.best) || 0;
        if (typeof m.restock === 'boolean') p.restock = m.restock;
        if (m.order != null) p.order = Number(m.order);
      }
      p.seo = { title: (m && m.seoTitle) || w.seoTitle || '', description: (m && m.seoDescription) || w.seoDescription || '' };
      const rows = w.variants && w.variants.length ? variantRows(w.variants) : null;
      if (rows) { p.sizes = rows; p.wixSized = true; p.variants = w.variants; }
      else if (w.inStock === false) p.soldOut = true;
    });
    seed.forEach(p => { if (!p.slug) p.slug = p.id; });
    added.sort((a, b) => (a.order ?? 1e6) - (b.order ?? 1e6));
    return out.concat(added);
  }
  /* Every page of Wix Stores products. `request(path, {body})` is the caller's authenticated fetch. Asks Wix for
     descriptions, all photos and size names in the same call; if Wix refuses the field list, asks again without it. */
  async function queryProducts(request) {
    const FIELDS = ['PLAIN_DESCRIPTION', 'MEDIA_ITEMS_INFO', 'VARIANT_OPTION_CHOICE_NAMES'];
    let useFields = true;
    const out = []; let cursor = null;
    for (let i = 0; i < 10; i++) {
      const paging = cursor ? { limit: 100, cursor } : { limit: 100 };
      let r;
      try { r = await request('/stores/v3/products/query', { body: Object.assign({ query: { cursorPaging: paging } }, useFields ? { fields: FIELDS } : {}) }); }
      catch (e) { if (useFields && e.status === 400) { useFields = false; i--; continue; } throw e; }
      (r.products || []).forEach(p => out.push(normProduct(p)));
      cursor = r.pagingMetadata && r.pagingMetadata.cursors && r.pagingMetadata.cursors.next;
      if (!cursor) break;
    }
    return out;
  }
  /* Stock for many products in as few calls as possible: { productId: { variantId: { qty, inStock } } }. */
  async function queryInventory(request, productIds) {
    const out = {}; const ids = (productIds || []).filter(Boolean);
    for (let i = 0; i < ids.length; i += 100) {
      let cursor = null, n = 0;
      do {
        const paging = cursor ? { limit: 100, cursor } : { limit: 100 };
        const r = await request('/stores/v3/inventory-items/query', { body: { query: { filter: { productId: { $in: ids.slice(i, i + 100) } }, cursorPaging: paging } } });
        (r.inventoryItems || []).forEach(it => { const p = out[it.productId] = out[it.productId] || {};
          const qty = it.trackQuantity && it.quantity != null ? Number(it.quantity) : null;
          p[it.variantId] = { qty, inStock: !(it.inStock === false || (qty != null && qty <= 0)) }; });
        cursor = r.pagingMetadata && r.pagingMetadata.cursors && r.pagingMetadata.cursors.next;
      } while (cursor && ++n < 10);
    }
    return out;
  }
  const CAT = { CLIENT_ID, API, norm, slugify, img, htmlText, titleCase, LEGACY_SHOWN, CATEGORIES, normProduct, mergeCatalog, queryProducts, queryInventory, variantRows, parseVariants };
  if (typeof module !== 'undefined' && module.exports && typeof window === 'undefined') { module.exports = CAT; return; }
  if (!root) return;

  /* ================= Browser client ================= */
  const KEY = 'wix-visitor-' + CLIENT_ID;
  let mem = null;
  const load = () => { if (mem) return mem; try { mem = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) {} return mem; };
  const save = t => { mem = t; try { localStorage.setItem(KEY, JSON.stringify(t)); } catch (e) {} };
  async function mint(body, role) {
    const r = await fetch(API + '/oauth2/token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.assign({ clientId: CLIENT_ID }, body)) });
    if (!r.ok) throw new Error('Wix auth failed (' + r.status + ')');
    const d = await r.json();
    return { accessToken: d.access_token, refreshToken: d.refresh_token, expiresAt: Date.now() + d.expires_in * 1000, role: role || 'visitor' };
  }
  let minting = null;
  async function token() {
    const t = load();
    if (t && t.accessToken && t.expiresAt - 60000 > Date.now()) return t.accessToken;
    if (minting) return minting; // parallel first calls share one token instead of each minting a visitor
    minting = (async () => {
      let f = null;
      if (t && t.refreshToken) { try { f = await mint({ grantType: 'refresh_token', refreshToken: t.refreshToken }, t.role); } catch (e) {} }
      if (!f) f = await mint({ grantType: 'anonymous' });
      save(f); return f.accessToken;
    })();
    try { return await minting; } finally { minting = null; }
  }
  async function req(path, opts) {
    opts = opts || {};
    const r = await fetch(API + path, { method: opts.method || 'POST', headers: { Authorization: await token(), 'Content-Type': 'application/json' }, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message || ''; } catch (e) {} const err = new Error(m || ('Wix request failed (' + r.status + ')')); err.status = r.status; throw err; }
    return r.status === 204 ? null : r.json();
  }
  let productsP = null;
  /* All visible Wix Stores products (cached for the page's life; pass true to refetch). */
  function products(fresh) { if (!productsP || fresh) productsP = queryProducts(req).catch(e => { productsP = null; throw e; }); return productsP.then(l => l.filter(p => p.visible)); }
  /* Public read of a Studio CMS collection (read permission: Anyone). */
  async function studio(id) {
    const r = await req('/wix-data/v2/items/query', { body: { dataCollectionId: id, query: { cursorPaging: { limit: 1000 } } } });
    return ((r && r.dataItems) || []).map(x => Object.assign({ _id: x.id }, x.data || {}));
  }
  /* The merged catalogue: built-in pieces + Wix Stores + Studio product settings, with stock from one bulk query. */
  async function catalog(seed) {
    const [wix, meta] = await Promise.all([products(), studio('StudioProducts').catch(() => [])]);
    const list = mergeCatalog(seed, wix, meta);
    return { list, meta, wix };
  }
  /* Bulk stock: marks each linked piece's sizes in/out of stock and sets soldOut, without per-product calls. */
  async function stock(list) {
    const linked = list.filter(p => p.wixId), inv = await queryInventory(req, linked.map(p => p.wixId));
    linked.forEach(p => { const byV = inv[p.wixId]; if (!byV) return; const vals = Object.keys(byV).map(k => byV[k]);
      if (p.variants) { p.variants.forEach(v => { const s = byV[v.id]; if (s) { v.qty = s.qty; if (!s.inStock) v.inStock = false; } }); p.sizes = variantRows(p.variants) || p.sizes; }
      p.soldOut = vals.length > 0 && vals.every(s => !s.inStock); });
    return list;
  }
  async function variants(productId) {
    const r = await req('/stores/v3/products/' + productId + '?fields=VARIANT_OPTION_CHOICE_NAMES', { method: 'GET' });
    const vs = parseVariants(r.product || {});
    try { const inv = await queryInventory(req, [productId]); const byV = inv[productId] || {};
      vs.forEach(v => { const s = byV[v.id]; if (!s) return; v.qty = s.qty; if (!s.inStock) v.inStock = false; }); } catch (e) {}
    return vs;
  }
  async function addToCart(productId, size) {
    const vs = await variants(productId);
    let v = vs.length === 1 ? vs[0] : (vs.find(x => x.label === size) || vs.find(x => x.choices.indexOf(size) >= 0));
    if (!v) throw new Error('That size is not available online.');
    if (!v.inStock) throw new Error('That size is sold out.');
    const ref = { catalogItemId: productId, appId: STORES_APP };
    if (vs.length > 1 || (v.choices && v.choices.length)) ref.options = { variantId: v.id };
    const res = await req('/ecom/v2/carts/current/add-line-items', { body: { catalogItems: [{ quantity: 1, catalogReference: ref }] } });
    const lines = (res && res.cart && res.cart.lineItems) || [];
    if (!lines.some(l => l.catalogReference && l.catalogReference.catalogItemId === productId)) throw new Error('Wix could not add this piece to the bag.');
    return res.cart;
  }
  async function cart() {
    try { const r = await req('/ecom/v2/carts/current', { method: 'GET' }); return r.cart || null; } catch (e) { if (e.status === 404) return null; throw e; }
  }
  async function removeLine(lineItemId) { const r = await req('/ecom/v2/carts/current/remove-line-items', { body: { lineItemIds: [lineItemId] } }); return r.cart || null; }
  /* Hosted Wix checkout. Shoppers who leave come back to `backPath`; paid orders land on /thank-you. */
  async function checkoutUrl(prefill, backPath) {
    const c = await cart();
    if (!c || !(c.lineItems || []).length) throw new Error('Your bag is empty.');
    const origin = location.origin.indexOf('http') === 0 ? location.origin : '';
    let checkoutId = c.id || c._id;
    if (prefill && prefill.address) { /* member: start checkout with their default address so Wix fills it in */
      const a = prefill.address, addr = { addressLine1: a.line1, addressLine2: a.line2 || undefined, city: a.city, postalCode: a.postcode, country: a.country || undefined, subdivision: a.region || undefined };
      try { const k = await req('/ecom/v1/carts/current/create-checkout', { body: { channelType: 'WEB', email: prefill.email || undefined, shippingAddress: addr, billingAddress: addr } }); if (k && k.checkoutId) checkoutId = k.checkoutId;
        try { await req('/ecom/v1/checkouts/' + checkoutId, { method: 'PATCH', body: { checkout: { shippingInfo: { shippingDestination: { address: addr, contactDetails: { firstName: a.first, lastName: a.last, phone: a.phone || undefined } } }, billingInfo: { address: addr, contactDetails: { firstName: a.first, lastName: a.last, phone: a.phone || undefined } } } } }); } catch (e) {}
      } catch (e) {}
    }
    const back = origin ? origin + (backPath && backPath.charAt(0) === '/' ? backPath : '/') : '';
    try { sessionStorage.setItem('ngwisa-checkout', JSON.stringify({ checkoutId, at: Date.now() })); } catch (e) {}
    const r = await req('/headless/v1/redirect-session', { body: { ecomCheckout: { checkoutId }, callbacks: origin ? { postFlowUrl: back, thankYouPageUrl: origin + '/thank-you' } : {} } });
    const url = r && r.redirectSession && r.redirectSession.fullUrl;
    if (!url) throw new Error('Checkout could not start.');
    return url;
  }
  /* After checkout: the order Wix sent back (orderId in the URL), or the member's newest order. */
  async function confirmation(memberId) {
    const qs = new URLSearchParams(location.search), id = qs.get('orderId') || qs.get('order_id') || qs.get('orderNumber') || '';
    if (memberId) { try { const os = await orders(memberId); const o = (id && os.find(x => x.id === id || String(x.number) === id)) || os[0];
      if (o && (!id || o.id === id || String(o.number) === id || Date.now() - new Date(o.date).getTime() < 3 * 3600e3)) return o; } catch (e) {} }
    return id ? { id, number: /^\d+$/.test(id) ? id : '' } : null;
  }
  /* ---- Members (wix-headless-templates members/rest/auth.ts) ---- */
  const b64 = bytes => { let s = ''; bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const rnd = () => b64(crypto.getRandomValues(new Uint8Array(32)));
  async function pkce() { const verifier = rnd(); const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)); return { verifier, challenge: b64(new Uint8Array(d)) }; }
  function authCode(url, state) {
    return new Promise((resolve, reject) => {
      const fr = document.createElement('iframe'); fr.style.display = 'none';
      const done = () => { removeEventListener('message', on); clearTimeout(tm); fr.remove(); };
      const on = e => { const d = e.data; if (!d || d.state !== state) return; done(); if (d.error) reject(new Error('Sign-in was refused: ' + d.error)); else if (d.code) resolve(d.code); else reject(new Error('Sign-in could not finish.')); };
      const tm = setTimeout(() => { done(); reject(new Error('Sign-in could not finish on ' + location.origin + '. Add this domain to the Wix headless app’s allowed redirect domains.')); }, 20000);
      addEventListener('message', on); fr.src = url; document.body.appendChild(fr);
    });
  }
  async function memberTokens(sessionToken) {
    const { verifier, challenge } = await pkce(); const state = rnd();
    const r = await req('/headless/v1/redirect-session', { body: { auth: { authRequest: { clientId: CLIENT_ID, codeChallenge: challenge, codeChallengeMethod: 'S256', responseMode: 'web_message', responseType: 'code', scope: 'offline_access', state, sessionToken }, prompt: 'none' } } });
    const url = r && r.redirectSession && r.redirectSession.fullUrl; if (!url) throw new Error('Sign-in could not finish.');
    const code = await authCode(url, state);
    return mint({ grantType: 'authorization_code', code, codeVerifier: verifier }, 'member');
  }
  let pendingState = null;
  async function finish(raw) {
    const st = raw && raw.state;
    if (st === 'SUCCESS') { pendingState = null; if (!raw.sessionToken) throw new Error('Sign-in could not finish.'); save(await memberTokens(raw.sessionToken)); return 'SUCCESS'; }
    if (raw && raw.stateToken) pendingState = raw.stateToken;
    return st || 'FAILURE';
  }
  const authCall = async (path, body) => { try { return await finish(await req(path, { body })); } catch (e) { throw new Error(e.message || 'Something went wrong. Please try again.'); } };
  const login = (email, password) => authCall('/_api/iam/authentication/v2/login', { loginId: { email }, password });
  const register = (email, password, profile) => authCall('/_api/iam/authentication/v2/register', Object.assign({ loginId: { email }, password }, profile ? { profile } : {}));
  const verify = code => { if (!pendingState) return Promise.reject(new Error('No sign-in is waiting for a code.')); return authCall('/_api/iam/verification/v1/auth/verify', { code, stateToken: pendingState }); };
  const isMember = () => { const t = load(); return !!(t && t.role === 'member'); };
  async function me() {
    if (!isMember()) return null;
    try { const r = await req('/members/v1/members/my?fieldsets=FULL', { method: 'GET' }); const m = r && r.member; if (!m) return null;
      const c = m.contact || {}; return { id: m.id || m._id, email: m.loginEmail || '', first: c.firstName || '', last: c.lastName || '', nick: (m.profile && m.profile.nickname) || '', phone: (c.phones && c.phones[0]) || '', since: m.createdDate || m._createdDate || '' }; } catch (e) { return null; }
  }
  async function logout() {
    const back = location.origin.indexOf('http') === 0 ? location.origin + '/' : location.href;
    let url = null; try { const r = await req('/headless/v1/redirect-session', { body: { logout: { clientId: CLIENT_ID }, callbacks: { postFlowUrl: back } } }); url = r && r.redirectSession && r.redirectSession.fullUrl; } catch (e) {}
    save({ accessToken: '', refreshToken: '', expiresAt: 0 });
    if (url) (window.top || window).location.href = url;
  }
  /* ---- Member account: orders, tracking, reorder, profile, addresses ---- */
  const money = p => p ? Number(p.amount || 0) : 0;
  const txt = t => t ? (t.translated || t.original || '') : '';
  async function orders(memberId) {
    const filter = memberId ? { 'buyerInfo.memberId': { $eq: memberId } } : {};
    const r = await req('/ecom/v1/orders/search', { body: { search: { filter, sort: [{ fieldName: 'createdDate', order: 'DESC' }], cursorPaging: { limit: 50 } } } });
    return (r.orders || []).map(o => ({ id: o.id || o._id, number: o.number, date: o.createdDate || o._createdDate, status: o.status, pay: o.paymentStatus, ful: o.fulfillmentStatus, total: money(o.priceSummary && o.priceSummary.total),
      ship: (o.shippingInfo && o.shippingInfo.title) || '', to: o.recipientInfo && o.recipientInfo.address ? o.recipientInfo.address : (o.shippingInfo && o.shippingInfo.logistics && o.shippingInfo.logistics.shippingDestination && o.shippingInfo.logistics.shippingDestination.address) || null,
      lines: (o.lineItems || []).map(l => ({ name: txt(l.productName), qty: l.quantity || 1, price: money(l.price), img: img(l.image), opts: (l.descriptionLines || []).map(d => txt(d.plainText) || txt(d.colorInfo) || '').filter(Boolean).join(' · '), ref: l.catalogReference })) }));
  }
  async function tracking(orderId) {
    try { const r = await req('/ecom/v1/fulfillments/orders/' + orderId, { method: 'GET' }); const f = (r.orderWithFulfillments && r.orderWithFulfillments.fulfillments) || [];
      return f.map(x => x.trackingInfo).filter(Boolean).map(t => ({ no: t.trackingNumber || '', carrier: t.shippingProvider || '', link: t.trackingLink || '' })); } catch (e) { return []; }
  }
  async function reorder(lines) {
    const items = (lines || []).filter(l => l.ref && l.ref.catalogItemId).map(l => ({ quantity: l.qty || 1, catalogReference: l.ref }));
    if (!items.length) throw new Error('These pieces can’t be added again online.');
    const r = await req('/ecom/v2/carts/current/add-line-items', { body: { catalogItems: items } }); return r.cart;
  }
  async function updateMe(id, patch) {
    const r = await req('/members/v1/members/' + id, { method: 'PATCH', body: { member: patch } }); return r && r.member;
  }
  async function myAddresses() {
    try { const r = await req('/members/v1/members/my?fieldsets=FULL', { method: 'GET' }); const c = (r.member && r.member.contact) || {};
      return (c.addresses || []).map(a => ({ id: a.id || a._id, line1: a.addressLine || (a.streetAddress && [a.streetAddress.number, a.streetAddress.name].filter(Boolean).join(' ')) || '', line2: a.addressLine2 || '', city: a.city || '', region: a.subdivision || '', postcode: a.postalCode || '', country: a.country || '' })); } catch (e) { return []; }
  }
  /* Image resizer used across the site (ngwisa-parts.js calls it as window.NGR). Wix serves any media file at a
     requested size; enc_auto returns AVIF/WebP when the browser accepts it. Product originals run to 20 MB+. */
  root.NGR = (u, w) => {
    const m = typeof u === 'string' && u.match(/^https:\/\/static\.wixstatic\.com\/media\/([^/?#]+\.(?:jpe?g|png|webp))$/i);
    if (!m) return u;
    w = Math.min(2400, Math.max(200, Math.round(w || 1000)));
    return u + '/v1/fit/w_' + w + ',h_' + (w * 2) + ',q_80,enc_auto/' + m[1];
  };
  root.NGW = Object.assign({ request: req, accessToken: token, products, studio, catalog, stock, variants, addToCart, cart, removeLine, checkoutUrl, confirmation, login, register, verify, me, logout, isMember, orders, tracking, reorder, updateMe, myAddresses }, CAT);
})(typeof window !== 'undefined' ? window : null);
