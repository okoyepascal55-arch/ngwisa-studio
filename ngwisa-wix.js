/* Ngwisa ↔ Wix (gong gallery headless site). Visitor-token REST client: catalog, cart, hosted checkout.
   Shapes follow wix-headless-templates storefront/rest/cart.ts + shared/rest/client.ts. */
(function () {
  const CLIENT_ID = '74aff7bb-3656-4173-b0fb-503bcb70d7a4';
  const API = 'https://www.wixapis.com';
  const STORES_APP = '215238eb-22a5-4c36-9e7b-e7c08025e04e';
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
  async function token() {
    const t = load();
    if (t && t.expiresAt - 60000 > Date.now()) return t.accessToken;
    let f = null;
    if (t && t.refreshToken) { try { f = await mint({ grantType: 'refresh_token', refreshToken: t.refreshToken }, t.role); } catch (e) {} }
    if (!f) f = await mint({ grantType: 'anonymous' });
    save(f); return f.accessToken;
  }
  async function req(path, opts) {
    opts = opts || {};
    const r = await fetch(API + path, { method: opts.method || 'POST', headers: { Authorization: await token(), 'Content-Type': 'application/json' }, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
    if (!r.ok) { let m = ''; try { m = (await r.json()).message || ''; } catch (e) {} const err = new Error(m || ('Wix request failed (' + r.status + ')')); err.status = r.status; throw err; }
    return r.status === 204 ? null : r.json();
  }
  const img = m => {
    if (!m) return '';
    const s = typeof m === 'string' ? m : (m.url || (m.image && (m.image.url || m.image)) || '');
    const w = typeof s === 'string' && s.match(/^wix:image:\/\/v1\/([^/]+)/);
    return w ? 'https://static.wixstatic.com/media/' + w[1] : (typeof s === 'string' ? s : '');
  };
  const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  async function products() {
    const out = []; let cursor = null;
    for (let i = 0; i < 5; i++) {
      const paging = cursor ? { limit: 100, cursor } : { limit: 100 };
      const r = await req('/stores/v3/products/query', { body: { query: { cursorPaging: paging } } });
      (r.products || []).filter(p => p.visible !== false).forEach(p => {
        const media = (p.media && p.media.itemsInfo && p.media.itemsInfo.items) || [];
        const pr = p.actualPriceRange && p.actualPriceRange.minValue;
        out.push({ wixId: p.id, name: p.name, key: norm(p.name), price: pr ? Number(pr.amount) : null, img: img(p.media && p.media.main) || img(media[0]), imgs: media.map(img).filter(Boolean), desc: p.plainDescription || '' });
      });
      cursor = r.pagingMetadata && r.pagingMetadata.cursors && r.pagingMetadata.cursors.next;
      if (!cursor) break;
    }
    return out;
  }
  async function variants(productId) {
    const r = await req('/stores/v3/products/' + productId + '?fields=VARIANT_OPTION_CHOICE_NAMES', { method: 'GET' });
    const p = r.product || {};
    const vs = ((p.variantsInfo && p.variantsInfo.variants) || []).map(v => ({ id: v.id, choices: (v.choices || []).map(c => c.optionChoiceNames && c.optionChoiceNames.choiceName).filter(Boolean), inStock: !(v.inventoryStatus && v.inventoryStatus.inStock === false), qty: null }));
    vs.forEach(v => { v.label = v.choices.join(' / '); });
    try { const q = await req('/stores/v3/inventory-items/query', { body: { query: { filter: { productId: { $eq: productId } }, cursorPaging: { limit: 100 } } } });
      (q.inventoryItems || []).forEach(it => { const v = vs.find(x => x.id === it.variantId); if (!v) return; if (it.trackQuantity && it.quantity != null) { v.qty = Number(it.quantity); if (v.qty <= 0) v.inStock = false; } if (it.inStock === false) v.inStock = false; }); } catch (e) {}
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
  async function checkoutUrl(prefill) {
    const c = await cart();
    if (!c || !(c.lineItems || []).length) throw new Error('Your bag is empty.');
    const origin = location.origin.indexOf('http') === 0 ? location.origin : '';
    let checkoutId = c.id || c._id;
    if (prefill && prefill.address) { /* member: start checkout with their default address so Wix fills it in */
      const a = prefill.address, addr = { addressLine1: a.line1, addressLine2: a.line2 || undefined, city: a.city, postalCode: a.postcode, country: a.country || 'GB', subdivision: a.region || undefined };
      try { const k = await req('/ecom/v1/carts/current/create-checkout', { body: { channelType: 'WEB', email: prefill.email || undefined, shippingAddress: addr, billingAddress: addr } }); if (k && k.checkoutId) checkoutId = k.checkoutId;
        try { await req('/ecom/v1/checkouts/' + checkoutId, { method: 'PATCH', body: { checkout: { shippingInfo: { shippingDestination: { address: addr, contactDetails: { firstName: a.first, lastName: a.last, phone: a.phone || undefined } } }, billingInfo: { address: addr, contactDetails: { firstName: a.first, lastName: a.last, phone: a.phone || undefined } } } } }); } catch (e) {}
      } catch (e) {}
    }
    const r = await req('/headless/v1/redirect-session', { body: { ecomCheckout: { checkoutId }, callbacks: origin ? { postFlowUrl: origin + '/', thankYouPageUrl: origin + '/' } : {} } });
    const url = r && r.redirectSession && r.redirectSession.fullUrl;
    if (!url) throw new Error('Checkout could not start.');
    return url;
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
  window.NGR = (u, w) => {
    const m = typeof u === 'string' && u.match(/^https:\/\/static\.wixstatic\.com\/media\/([^/?#]+\.(?:jpe?g|png|webp))$/i);
    if (!m) return u;
    w = Math.min(2400, Math.max(200, Math.round(w || 1000)));
    return u + '/v1/fit/w_' + w + ',h_' + (w * 2) + ',q_80,enc_auto/' + m[1];
  };
  window.NGW = { request: req, accessToken: token, products, variants, addToCart, cart, removeLine, checkoutUrl, norm, img, login, register, verify, me, logout, isMember, orders, tracking, reorder, updateMe, myAddresses };
})();
