/* NGWISA — approved site parts as web components.
   <ng-rack> and <ng-loop> are 1:1 ports of handoff/ngwisa-loop-rack-reference.html (Site v13 spec).
   <ng-knit> is a port of the Readdy KnitHeadline (chart type).
   Events (bubbling, composed): 'ng-open' {id}, 'ng-link' {}. */
(function () {
  const RS = p => (window.NGR ? window.NGR(p) : p);
  const fmt = n => n == null ? 'PRICE ON REQUEST' : '£' + (Number.isInteger(n) ? n : n.toFixed(2));
  const parse = s => { try { return JSON.parse(s || '[]'); } catch (e) { return []; } };
  const fire = (el, type, detail) => el.dispatchEvent(new CustomEvent(type, { detail: detail || {}, bubbles: true, composed: true }));
  const HEAD_CSS = `
  *{box-sizing:border-box}
  :host{display:block;color:#141110;font-family:'Bricolage Grotesque',sans-serif;-webkit-font-smoothing:antialiased}
  button{color:inherit}
  .page{padding:0 clamp(12px,1.6vw,24px)}
  .head{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:16px 24px;padding:96px 0 28px}
  .head-l{display:flex;flex-direction:column;gap:12px}
  .kicker{font:500 11px/1 'DM Mono',monospace;letter-spacing:.18em;color:#DA1219}
  .h2{margin:0;font:800 clamp(40px,4.4vw,68px)/.9 'Bricolage Grotesque';letter-spacing:-.035em}
  .h1{margin:0;font:800 clamp(52px,7vw,112px)/.86 'Bricolage Grotesque';letter-spacing:-.04em}
  .head-r{display:flex;align-items:center;gap:18px}
  .link{flex:none;white-space:nowrap;background:none;border:0;border-bottom:2px dashed #141110;padding:6px 0;cursor:pointer;font:500 11px/1 'DM Mono',monospace;letter-spacing:.16em}
  .arrow{flex:none;cursor:pointer;width:48px;height:48px;border-radius:50%;font:500 16px/1 'DM Mono',monospace}
  .arrow.prev{border:2px solid #141110;background:transparent}
  .arrow.next{border:0;background:#D81219;color:#FBF8F2;box-shadow:inset 0 2px 0 rgba(255,255,255,.25),inset 0 -3px 0 #6E080C}`;
  const headHTML = (kicker, heading, link, big, stitched, hs, nohead) =>
    '<div class="head"' + (nohead ? ' style="padding:0 0 16px;justify-content:flex-end"' : big ? ' style="padding:56px 0 24px"' : '') + '><div class="head-l">' + (kicker ? '<span class="kicker">' + kicker + '</span>' : '')
    + (nohead ? '' : stitched ? '<ng-stitch nowrap="1" tone="red" text="' + heading + '" size="' + (hs || (big ? 'clamp(52px,7vw,112px)' : 'clamp(40px,4.4vw,68px)')) + '"></ng-stitch>'
      : big ? '<h1 class="h1">' + heading + '</h1>' : '<h2 class="h2">' + heading + '</h2>') + '</div>'
    + '<div class="head-r">' + (link ? '<button class="link" data-act="link">' + link + '</button>' : '')
    + '<button class="arrow prev" data-act="prev" aria-label="Previous">←</button><button class="arrow next" data-act="next" aria-label="Next">→</button></div></div>';

  /* ---------------- THE RACK ---------------- */
  const TG = ['#E3A72F', '#2F6B4F', '#2B4C8C', '#D4652A'];
  const HANGER = '<svg width="236" height="74" viewBox="0 0 224 74" aria-hidden="true">'
    + '<path d="M112 34 C112 22 112 16 112 14 C112 4 124 2 126 10" fill="none" stroke="#141110" stroke-width="4" stroke-linecap="round"/>'
    + '<path d="M22 70 A90 52 0 0 1 202 70" fill="none" stroke="#6E080C" stroke-width="13" stroke-linecap="round"/>'
    + '<path d="M22 70 A90 52 0 0 1 202 70" fill="none" stroke="#D81219" stroke-width="9" stroke-linecap="round" stroke-dasharray="2 2.6"/>'
    + '<circle cx="22" cy="70" r="9" fill="#141110"/><circle cx="202" cy="70" r="9" fill="#141110"/>'
    + '<circle cx="22" cy="70" r="3.5" fill="#FBF8F2"/><circle cx="202" cy="70" r="3.5" fill="#FBF8F2"/></svg>';
  const RACK_CSS = HEAD_CSS + `
  @media (max-width:900px){.head{padding:84px 0 20px}.arrow{width:40px;height:40px}.garment{width:200px}.frame{width:184px;height:256px}.rack-track{gap:16px}}
  .rack-view{position:relative;height:500px;margin:0 calc(-1 * clamp(12px,1.6vw,24px));cursor:grab;touch-action:pan-y;user-select:none;overflow:hidden}
  .rack-rail{position:absolute;left:0;right:0;top:18px;height:14px;background:repeating-linear-gradient(90deg,#DA1219 0 2px,#A80D12 2px 3.2px);box-shadow:inset 0 4px 4px rgba(255,255,255,.35),inset 0 -4px 5px rgba(0,0,0,.4),0 8px 14px rgba(20,17,16,.12)}
  .rack-track{position:absolute;left:0;top:10px;display:flex;gap:28px;padding:0 clamp(12px,1.6vw,24px);width:max-content;will-change:transform;transition:transform .7s cubic-bezier(.6,0,.2,1)}
  .garment{position:relative;flex:none;width:236px;display:flex;flex-direction:column;align-items:center;transform-origin:50% 10px;cursor:pointer}
  .garment svg{display:block;overflow:visible}
  .frame{width:216px;height:300px;margin-top:-14px;padding:7px;border-radius:108px 108px 18px 18px;box-shadow:0 18px 30px rgba(20,17,16,.16)}
  .window{position:relative;width:100%;height:100%;border-radius:101px 101px 12px 12px;overflow:hidden;background:#F4F0EA}
  .window img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
  .window img.alt{opacity:0;transition:opacity .5s}
  .window:hover img.alt{opacity:1}
  .g-cap{margin-top:18px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
  .g-name{font:700 17px/1.1 'Bricolage Grotesque'}
  .g-price{font:500 11px/1 'DM Mono',monospace;letter-spacing:.1em;color:#6A6057}
  @media (min-width:901px){
  .fill .arrow{display:none}
  .fill .rack-view{height:auto;margin:0;cursor:default;overflow:visible;padding-bottom:8px}
  .fill .rack-track{position:relative;width:100%;justify-content:space-evenly;gap:clamp(16px,2.4vw,44px);padding:0 clamp(8px,1vw,16px);transform:none!important}
  .fill .garment{flex:1 1 0;width:auto;min-width:0;max-width:calc((100svh - 330px) * .78)}
  .fill .garment svg{width:100%;height:auto}
  .fill .frame{width:92%;height:auto;aspect-ratio:216/300;margin-top:-6%;padding:clamp(6px,.6vw,10px);border-radius:999px 999px 20px 20px}
  .fill .window{border-radius:999px 999px 14px 14px}
  .fill .g-cap{margin-top:22px;gap:8px}
  .fill .g-name{font-size:clamp(18px,1.5vw,24px)}
  .fill .g-price{font-size:12px}}`;

  class NgRack extends HTMLElement {
    static get observedAttributes() { return ['items', 'kicker', 'heading', 'link']; }
    connectedCallback() { if (!this.shadowRoot) { this.attachShadow({ mode: 'open' }); if (window.NGFB) window.NGFB(this.shadowRoot); } this.render(); this._rs = () => this.rackTo(this.rk.x); addEventListener('resize', this._rs); }
    disconnectedCallback() { removeEventListener('resize', this._rs); }
    attributeChangedCallback() { if (this.shadowRoot) this.render(); }
    render() {
      const items = parse(this.getAttribute('items'));
      const r = this.shadowRoot;
      r.innerHTML = '<style>' + RACK_CSS + '</style><div class="page"><section' + (this.hasAttribute('fill') ? ' class="fill"' : '') + '>'
        + headHTML(this.getAttribute('kicker') || '', this.getAttribute('heading') || 'New in', this.getAttribute('link') || '', false, this.hasAttribute('stitched'), this.getAttribute('headsize'))
        + '<div class="rack-view"><div class="rack-rail"></div><div class="rack-track"></div></div></section></div>';
      const rk = this.rk = { x: 0, drag: false, moved: false, sx: 0, ox: 0, els: [] };
      const view = this.view = r.querySelector('.rack-view'), track = this.track = r.querySelector('.rack-track');
      items.forEach((q, i) => {
        const el = document.createElement('div'); el.className = 'garment';
        el.innerHTML = HANGER + '<div class="frame" style="background:' + TG[i % 4] + '"><div class="window">'
          + '<img loading="lazy" decoding="async" src="' + RS(q.img) + '" alt="' + q.name + '" draggable="false"><img class="alt" loading="lazy" decoding="async" src="' + RS(q.img2 || q.img) + '" alt="" draggable="false"></div></div>'
          + '<div class="g-cap"><span class="g-name">' + q.name + '</span><span class="g-price">' + fmt(q.price) + '</span></div>';
        el.addEventListener('mouseenter', () => this.swing(i));
        el.addEventListener('click', () => { if (!rk.moved) fire(this, 'ng-open', { id: q.id }); });
        rk.els[i] = el; track.appendChild(el);
      });
      view.addEventListener('pointerdown', e => { rk.drag = true; rk.moved = false; rk.sx = e.clientX; rk.ox = rk.x; });
      view.addEventListener('pointermove', e => { if (!rk.drag) return; const d = e.clientX - rk.sx; if (Math.abs(d) > 5) rk.moved = true; this.rackTo(rk.ox + d, true); });
      ['pointerup', 'pointerleave'].forEach(t => view.addEventListener(t, () => { rk.drag = false; }));
      r.querySelector('[data-act=prev]').onclick = () => this.rackTo(rk.x + 528);
      r.querySelector('[data-act=next]').onclick = () => this.rackTo(rk.x - 528);
      if (r.querySelector('[data-act=link]')) r.querySelector('[data-act=link]').onclick = () => fire(this, 'ng-link');
    }
    rackTo(x, instant) {
      if (!this.view) return;
      const min = Math.min(0, this.view.clientWidth - this.track.scrollWidth);
      x = Math.max(min, Math.min(0, x)); this.rk.x = x;
      this.track.style.transition = instant ? 'none' : '';
      this.track.style.transform = 'translateX(' + x + 'px)';
    }
    swing(i) {
      if (this.rk.drag) return;
      [[0, 5], [1, 2.2], [-1, -2.2]].forEach(([o, m]) => {
        const el = this.rk.els[i + o]; if (!el || !el.animate) return;
        el.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + m + 'deg)' }, { transform: 'rotate(' + (-m * .6) + 'deg)' }, { transform: 'rotate(' + (m * .25) + 'deg)' }, { transform: 'rotate(0deg)' }],
          { duration: 1300, easing: 'cubic-bezier(.3,0,.2,1)' });
      });
    }
  }

  /* ---------------- THE LOOP ---------------- */
  const CORD = ['#D81219', '#6E080C', '#F0302F', '#A80D12'];
  function gongSVG(uid) {
    const sil = 'M310 420 A410 410 0 0 1 1130 420 C1130 600 1190 700 1190 850 C1190 960 1110 1000 1000 1000 C880 1000 810 975 810 900 C810 840 950 760 950 420 A230 230 0 0 0 490 420 C490 760 630 840 630 900 C630 975 560 1000 440 1000 C330 1000 250 960 250 850 C250 700 310 600 310 420 Z';
    const ov = [[455, 900], [985, 900]], rx = 150, ry = 56;
    const oval = (cx, cy, x, y) => 'M' + (cx - x) + ' ' + cy + ' A' + x + ' ' + y + ' 0 1 0 ' + (cx + x) + ' ' + cy + ' A' + x + ' ' + y + ' 0 1 0 ' + (cx - x) + ' ' + cy + ' Z';
    const eye = (cx, cy, w, h) => 'M' + (cx - w) + ' ' + cy + ' Q' + cx + ' ' + (cy - h) + ' ' + (cx + w) + ' ' + cy + ' Q' + cx + ' ' + (cy + h) + ' ' + (cx - w) + ' ' + cy + 'Z';
    const cord = (d, n, rowW, extra) => { const [b, g, hi, t] = CORD; let s = '';
      for (let i = 0; i < n; i++) { const Wd = (n - i) * 2 * rowW, off = i % 2 ? 2 : 0;
        s += '<path d="' + d + '" fill="none" ' + extra + ' stroke="' + g + '" stroke-width="' + Wd + '"/>';
        s += '<path d="' + d + '" fill="none" ' + extra + ' stroke="' + b + '" stroke-width="' + (Wd - 1.6) + '"/>';
        s += '<path d="' + d + '" fill="none" ' + extra + ' stroke="' + t + '" stroke-dasharray="1.6 2.4" stroke-dashoffset="' + off + '" opacity=".55" stroke-width="' + (Wd - 1.6) + '"/>';
        s += '<path d="' + d + '" fill="none" ' + extra + ' stroke="' + hi + '" opacity=".5" stroke-width="' + (Wd - rowW * .9) + '"/>'; }
      return s; };
    return '<svg width="1440" height="1040" viewBox="0 0 1440 1040" style="display:block">'
      + '<defs><clipPath id="silG' + uid + '"><path d="' + sil + '"/></clipPath>'
      + '<pattern id="bcG' + uid + '" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="7" height="7" fill="#141110"/>'
      + '<circle cx="1.5" cy="2" r="1.1" fill="#2c2624"/><circle cx="5" cy="5.5" r="1" fill="#262120"/><circle cx="5.5" cy="1.2" r=".6" fill="#3a3230"/></pattern></defs>'
      + '<g clip-path="url(#silG' + uid + ')"><path d="' + sil + '" fill="url(#bcG' + uid + ')"/>'
      + ov.map(([cx, cy]) => cord(oval(cx, cy, rx, ry), 4, 11, '')).join('')
      + cord(sil, 9, 11.5, 'stroke-linejoin="round"')
      + ov.map(([cx, cy]) => '<path d="' + oval(cx, cy, rx, ry) + '" fill="url(#bcG' + uid + ')"/>').join('')
      + '</g><path d="' + sil + '" fill="none" stroke="#6E080C" stroke-width="2"/>'
      + ov.map(([cx, cy]) => '<path d="' + eye(cx, cy, 78, 44) + '" fill="#FBF8F2"/><path d="' + eye(cx, cy, 78, 44) + '" fill="none" stroke="#DCD3C6" stroke-width="3" stroke-dasharray="2 3"/><path d="' + eye(cx, cy, 50, 24) + '" fill="#141110"/>').join('')
      + '</svg>';
  }
  const CX = 720, CY = 420, R = 300, LEG = 480, ARC = Math.PI * R, L = 960 + ARC, SPC = L / 10;
  function pos(s) {
    if (s < LEG) return [CX - R, CY + LEG - s];
    if (s < LEG + ARC) { const t = Math.PI - (s - LEG) / R; return [CX + R * Math.cos(t), CY - R * Math.sin(t)]; }
    return [CX + R, CY + (s - LEG - ARC)];
  }
  const LOOP_CSS = HEAD_CSS + `
  .loop-tile{position:relative;padding:clamp(16px,2vw,32px) 16px;border-radius:18px;background:#F4F0EA;display:flex;justify-content:center;align-items:center;overflow:hidden}
  .loop-stage{position:relative;touch-action:pan-y;outline:none;user-select:none;cursor:grab;clip-path:inset(-60px 0 -60px 0)}
  .loop-canvas{position:absolute;left:0;top:0;width:1440px;height:1040px;transform-origin:0 0}
  .loop-card{position:absolute;left:0;top:0;width:150px;height:190px;border-radius:75px 75px 14px 14px;overflow:hidden;background:#2A2422;cursor:pointer;transition:transform .7s cubic-bezier(.6,0,.2,1),opacity .4s}
  .loop-card img{width:100%;height:100%;object-fit:cover;pointer-events:none}
  .feat{position:absolute;left:500px;top:450px;width:440px;display:flex;flex-direction:column;align-items:center;gap:16px;text-align:center;z-index:30}
  .feat-label{font:500 15px/1.3 'DM Mono',monospace;letter-spacing:.18em;color:#DA1219}
  .feat-title{font:800 52px/.95 'Bricolage Grotesque';letter-spacing:-.03em;color:#141110;text-wrap:balance}
  .feat-price{font:500 17px/1 'DM Mono',monospace;letter-spacing:.08em;color:#3A3430}
  .feat-btn{margin-top:4px;cursor:pointer;padding:20px 32px;border-radius:999px;border:0;background:#141110;color:#FBF8F2;font:500 15px/1 'DM Mono',monospace;letter-spacing:.16em;white-space:nowrap}
  .feat-btn:hover{background:#DA1219}
  .loop-row{display:flex;flex-wrap:wrap;gap:8px;align-items:stretch}
  .loop-row .loop-tile{flex:1 1 0;min-width:0}
  .sc{flex:0 1 340px;min-width:260px;border-radius:18px;background:#F4F0EA;padding:20px;display:flex;flex-direction:column;gap:14px;overflow:hidden}
  .sc-top{display:none;justify-content:space-between;gap:10px;font:500 11px/1 'DM Mono',monospace;letter-spacing:.18em;color:#DA1219}
  .sc-count{color:#6A6057}
  .sc-main{position:relative;flex:1 1 auto;min-height:170px;margin:5px 5px 0;border-radius:200px 200px 14px 14px;overflow:hidden;background:#2A2422;box-shadow:0 0 0 5px #E3A72F,0 14px 24px -12px rgba(20,17,16,.45);cursor:pointer}
  .sc-main img,.sc-sup img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 20%;transition:opacity .4s,transform 1.2s cubic-bezier(.6,0,.2,1);pointer-events:none}
  .sc-main:hover img{transform:scale(1.04)}
  .sc-sup{display:grid;grid-template-columns:1fr 1fr;gap:14px;padding:5px;flex:none}
  .sc-sup div{position:relative;height:clamp(84px,13vh,150px);border-radius:120px 120px 12px 12px;overflow:hidden;background:#2A2422;box-shadow:0 0 0 4px #FBF8F2,0 10px 18px -12px rgba(20,17,16,.45);cursor:pointer;transition:box-shadow .35s}
  .sc-sup div:hover{box-shadow:0 0 0 4px #E3A72F,0 10px 18px -12px rgba(20,17,16,.45)}
  .sc-title{font:800 clamp(24px,2vw,32px)/.95 'Bricolage Grotesque';letter-spacing:-.03em;color:#141110;text-wrap:balance}
  .sc-meta{display:flex;justify-content:space-between;align-items:baseline;gap:12px}
  .sc-price{font:500 13px/1 'DM Mono',monospace;letter-spacing:.08em;color:#3A3430;white-space:nowrap}
  .sc-hook{font:400 14px/1.3 'Bricolage Grotesque';color:#DA1219}
  .sc-desc{margin:0;font:400 14px/1.45 'Bricolage Grotesque';color:#3A3430;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .sc-btn{align-self:flex-start;cursor:pointer;padding:14px 22px;border-radius:999px;border:0;background:#141110;color:#FBF8F2;font:500 11px/1 'DM Mono',monospace;letter-spacing:.16em;white-space:nowrap}
  .sc-btn:hover{background:#DA1219}
  @media (max-width:900px){.sc{flex:1 1 100%;min-width:0}.sc-main{flex:none;aspect-ratio:4/5;min-height:0}.sc-sup div{height:auto;aspect-ratio:3/4}.loop-tile{padding:12px 8px}.loop-row .loop-tile{flex:1 1 100%}.head{padding:84px 0 20px}.arrow{width:40px;height:40px}}`;
  let uidN = 0;
  class NgLoop extends HTMLElement {
    static get observedAttributes() { return ['items', 'kicker', 'heading', 'link', 'button']; }
    connectedCallback() { if (!this.shadowRoot) { this.attachShadow({ mode: 'open' }); if (window.NGFB) window.NGFB(this.shadowRoot); } this.uid = ++uidN; this.render(); this._rs = () => this.fit(); addEventListener('resize', this._rs); }
    disconnectedCallback() { removeEventListener('resize', this._rs); }
    attributeChangedCallback() { if (this.shadowRoot) this.render(); }
    render() {
      const LI = parse(this.getAttribute('items')); const ln = LI.length; const r = this.shadowRoot;
      const kick = (this.getAttribute('kicker') || '').replace('{n}', ln);
      const big = this.getAttribute('size') !== 'h2';
      r.innerHTML = '<style>' + LOOP_CSS + '</style><div class="page"><main>'
        + headHTML(kick, this.getAttribute('heading') || 'Every piece, on the gong', this.getAttribute('link') || '', big, this.hasAttribute('stitched'), this.getAttribute('headsize'), this.hasAttribute('noheading'))
        + (this.hasAttribute('showcase') ? '<div class="loop-row">' : '') + '<div class="loop-tile"><div class="loop-stage" tabindex="0"><div class="loop-canvas"><div style="position:absolute;inset:0">' + gongSVG(this.uid) + '</div><div class="cards"></div>'
        + '<div class="feat"><div class="feat-label" hidden></div><div class="feat-title"></div><div class="feat-price" hidden></div><button class="feat-btn">' + (this.getAttribute('button') || 'VIEW THE PIECE →') + '</button></div></div></div></div>'
        + (this.hasAttribute('showcase') ? '<aside class="sc"><div class="sc-top"><span class="sc-lab"></span><span class="sc-count"></span></div><div class="sc-main"><img alt=""></div><div class="sc-sup"><div><img alt=""></div><div><img alt=""></div></div><div class="sc-meta"><span class="sc-title"></span><span class="sc-price"></span></div><span class="sc-hook"></span><p class="sc-desc"></p><button class="sc-btn">' + (this.getAttribute('button') || 'VIEW THE PIECE →') + '</button></aside></div>' : '')
        + '</main></div>';
      if (!ln) return;
      const ls = this.ls = { a: 0, drag: 0, dragging: false, k: 1, downX: null, moved: false };
      const cardsEl = r.querySelector('.cards');
      this.tile = r.querySelector('.loop-tile'); this.stage = r.querySelector('.loop-stage'); this.canvas = r.querySelector('.loop-canvas');
      const fl = r.querySelector('.feat-label'), ft = r.querySelector('.feat-title'), fp = r.querySelector('.feat-price'), fb = r.querySelector('.feat-btn');
      const cards = LI.map((p, i) => {
        const el = document.createElement('div'); el.className = 'loop-card';
        el.innerHTML = '<img loading="lazy" decoding="async" src="' + RS(p.img) + '" alt="' + p.title + '" draggable="false">';
        el.addEventListener('click', () => { if (!ls.moved) setLoop(i); });
        cardsEl.appendChild(el); return el;
      });
      const setLoop = i => { ls.a = ((i % ln) + ln) % ln; renderLoop(); };
      const renderLoop = () => {
        LI.forEach((p, i) => {
          let d = ((i - ls.a) % ln + ln) % ln; if (d > ln / 2) d -= ln;
          const e = d - ls.drag, ae = Math.abs(e);
          const [x, y] = pos(Math.max(0, Math.min(L, L / 2 + e * SPC)));
          const el = cards[i];
          el.style.transform = 'translate(' + (x - 75) + 'px,' + (y - 95) + 'px) scale(' + (1 + .32 * Math.max(0, 1 - ae)) + ')';
          el.style.opacity = ae >= 5 ? 0 : ae > 4 ? 5 - ae : 1;
          el.style.zIndex = 20 - Math.round(ae);
          el.style.boxShadow = '0 0 0 5px ' + (ae < .5 ? '#E3A72F' : '#FBF8F2') + ',0 14px 24px -12px rgba(20,17,16,.45)';
          el.style.transition = ls.dragging ? 'none' : '';
        });
        const f = LI[ls.a];
        fl.textContent = f.label; ft.textContent = f.title; fp.textContent = f.price;
        fb.onclick = () => fire(this, 'ng-open', { id: f.id });
        if (sc) this.paintShowcase(f, ls.a, ln);
      };
      const sc = this.sc = r.querySelector('.sc');
      if (sc) {
        sc.querySelector('.sc-main').onclick = () => fire(this, 'ng-open', { id: LI[ls.a].id });
        sc.querySelector('.sc-btn').onclick = () => fire(this, 'ng-open', { id: LI[ls.a].id });
        sc.querySelectorAll('.sc-sup div').forEach((d, k) => d.onclick = () => { this.scMain = (this.scMain + k + 1) % 3; this.paintShowcase(LI[ls.a], ls.a, ln, true); });
      }
      r.querySelector('[data-act=prev]').onclick = () => setLoop(ls.a - 1);
      r.querySelector('[data-act=next]').onclick = () => setLoop(ls.a + 1);
      if (r.querySelector('[data-act=link]')) r.querySelector('[data-act=link]').onclick = () => fire(this, 'ng-link');
      const stage = this.stage;
      stage.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') { setLoop(ls.a - 1); e.preventDefault(); } if (e.key === 'ArrowRight') { setLoop(ls.a + 1); e.preventDefault(); } });
      stage.addEventListener('pointerdown', e => { if (e.button) return; ls.downX = e.clientX; ls.moved = false; });
      stage.addEventListener('pointermove', e => {
        if (ls.downX == null) return; const dx = e.clientX - ls.downX;
        if (Math.abs(dx) > 5) ls.moved = true;
        if (ls.moved) { ls.drag = -dx / (SPC * ls.k); ls.dragging = true; stage.style.cursor = 'grabbing'; renderLoop(); }
      });
      const up = () => {
        if (ls.downX == null) return; ls.downX = null;
        if (ls.moved) { const d = Math.round(ls.drag); ls.a = ((ls.a + d) % ln + ln) % ln; ls.drag = 0; ls.dragging = false; stage.style.cursor = 'grab'; renderLoop(); setTimeout(() => { ls.moved = false; }, 0); }
      };
      stage.addEventListener('pointerup', up); stage.addEventListener('pointerleave', up);
      this.fit(); renderLoop();
      requestAnimationFrame(() => this.fit());
      [300, 1200, 3000].forEach(ms => setTimeout(() => this.fit(), ms));
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => this.fit());
      addEventListener('load', () => this.fit());
    }
    paintShowcase(f, a, ln, same) {
      const sc = this.sc; if (!sc) return;
      if (!same) this.scMain = 0;
      const imgs = (f.imgs && f.imgs.length ? f.imgs : [f.img, f.img, f.img]);
      const order = [0, 1, 2].map(k => imgs[(this.scMain + k) % imgs.length]);
      const els = [sc.querySelector('.sc-main img')].concat([...sc.querySelectorAll('.sc-sup img')]);
      els.forEach(im => { im.style.opacity = 0; });
      clearTimeout(this._sct);
      this._sct = setTimeout(() => { els.forEach((im, k) => { im.src = RS(order[k]); im.onload = () => { im.style.opacity = 1; }; if (im.complete) im.style.opacity = 1; }); }, 180);
      sc.querySelector('.sc-lab').textContent = f.label;
      sc.querySelector('.sc-count').textContent = String(a + 1).padStart(2, '0') + ' / ' + String(ln).padStart(2, '0');
      sc.querySelector('.sc-title').textContent = f.title;
      sc.querySelector('.sc-price').textContent = f.price;
      sc.querySelector('.sc-hook').textContent = f.hook || '';
      sc.querySelector('.sc-desc').textContent = f.desc || '';
    }
    fit() {
      if (!this.tile || !this.ls) return;
      const row = this.sc ? this.tile.parentElement : this.tile, W = row.clientWidth || this.tile.clientWidth;
      const side = !!this.sc && innerWidth > 900, narrow = W < 700;
      const cs = getComputedStyle(this.tile), padX = parseFloat(cs.paddingLeft) || 16, padY = parseFloat(cs.paddingTop) || 0;
      const scW = side ? Math.round(Math.max(260, Math.min(420, W * .26))) : 0;
      let k = Math.min(1, (W - (side ? scW + 8 : 0) - padX * 2) / 1040);
      const off = +(this.getAttribute('vhoffset') || this.getAttribute('vh-offset') || this.vhoffset || this.vhOffset) || 0;
      if (off && !narrow) { const hd = this.shadowRoot.querySelector('.head'); let kH = (innerHeight - (hd ? hd.offsetHeight : 0) - 40 - padY * 2) / 1040;
        if (side) { const sc = this.sc, sm = sc.querySelector('.sc-main'); sc.style.flex = '0 0 ' + scW + 'px'; sc.style.minHeight = '0px'; sc.style.height = 'auto'; sc.style.alignSelf = 'flex-start';
          if (sm) sm.style.minHeight = Math.max(170, Math.round(sm.clientWidth * 1.1)) + 'px';
          const kP = (sc.offsetHeight - padY * 2) / 1040; sc.style.alignSelf = ''; kH = Math.max(kH, kP); }
        k = Math.min(k, kH); }
      k = Math.max(.22, k);
      const ft = this.canvas.querySelector('.feat'); if (ft) ft.style.display = narrow && this.sc ? 'none' : '';
      this.ls.k = k;
      this.canvas.style.transform = 'translateX(' + (-200 * k) + 'px) scale(' + k + ')';
      this.stage.style.width = Math.round(1040 * k) + 'px'; this.stage.style.height = Math.round(1040 * k) + 'px';
      if (this.sc) { const sm = this.sc.querySelector('.sc-main');
        this.sc.style.flex = side ? '0 0 ' + scW + 'px' : ''; this.sc.style.height = 'auto';
        this.sc.style.minHeight = side ? Math.round(1040 * k + padY * 2) + 'px' : '0px';
        if (sm) sm.style.minHeight = Math.max(170, Math.round(sm.clientWidth * 1.1)) + 'px'; }
    }
  }

  /* ---------------- KNIT HEADLINE (Readdy chart type) ---------------- */
  const KF = {
    A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'], B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
    C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'], D: ['11100', '10010', '10001', '10001', '10001', '10010', '11100'],
    E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'], F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
    G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'], H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
    I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'], J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
    K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'], L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
    M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'], N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'], P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
    Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'], R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
    S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'], T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
    U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'], V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
    W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'], X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
    Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'], Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
    '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'], ',': ['00000', '00000', '00000', '00000', '01100', '01100', '11000'],
    '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'], "'": ['00100', '00100', '00000', '00000', '00000', '00000', '00000'],
    '’': ['00100', '00100', '00000', '00000', '00000', '00000', '00000'], '-': ['00000', '00000', '00000', '11111', '00000', '00000', '00000'],
    '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  };
  const MASK = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Cpath d='M3 3 L10 17 L17 3' fill='none' stroke='%23000' stroke-width='4.4' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")";
  const KNIT_CSS = `
  :host{display:block}
  .knit-type{position:relative;display:inline-block;line-height:1.06;color:#D81219;cursor:pointer;outline:none;margin:0;font-weight:800}
  .knit-type.dark{color:#ff5a5a}
  .knit-word{display:inline-block;white-space:nowrap;margin-right:.26em}
  .knit-glyph{display:inline-flex;flex-direction:column;margin-right:.05em}
  .knit-row{display:flex}
  .knit-cell{display:block;width:.135em;height:.135em}
  .knit-stitch{background-color:currentColor;-webkit-mask-image:${MASK};mask-image:${MASK};-webkit-mask-size:100% 100%;mask-size:100% 100%;-webkit-mask-repeat:no-repeat;mask-repeat:no-repeat;transition:color .35s cubic-bezier(.3,0,.2,1)}
  .knit-stitch:hover{color:#141110}
  .dark .knit-stitch:hover{color:#ffffff}
  .off{opacity:0}
  .on{animation:stitchForm .36s cubic-bezier(.3,0,.2,1) both}
  @keyframes stitchForm{0%{opacity:0;transform:scale(.25)}55%{opacity:1;transform:scale(1.12)}100%{opacity:1;transform:scale(1)}}
  .knit-bed{position:absolute;left:0;right:0;top:-.2em;height:0;border-top:2px dashed currentColor;opacity:.35;pointer-events:none}
  .knit-carriage{position:absolute;top:-.44em;width:1.15em;height:.24em;border-radius:9999px;background-color:#D81219;background-image:repeating-linear-gradient(90deg,rgba(255,255,255,.16) 0 1px,transparent 1px 4px),repeating-linear-gradient(90deg,rgba(70,4,7,.32) 0 1px,transparent 1px 4px),linear-gradient(180deg,rgba(255,255,255,.2),rgba(0,0,0,.2));box-shadow:inset 0 2px 0 rgba(255,255,255,.32),inset 0 -3px 7px rgba(70,4,7,.6);pointer-events:none;animation:carriageRide 2.8s cubic-bezier(.6,0,.2,1) both}
  @keyframes carriageRide{0%{left:-8%;opacity:0}8%{opacity:1}92%{opacity:1}100%{left:104%;opacity:0}}`;
  class NgKnit extends HTMLElement {
    static get observedAttributes() { return ['text', 'size', 'dark']; }
    connectedCallback() {
      if (!this.shadowRoot) { this.attachShadow({ mode: 'open' }); if (window.NGFB) window.NGFB(this.shadowRoot); }
      this.mode = 'row'; this.started = false; this.draw();
      this.io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { this.started = true; this.draw(); this.io.disconnect(); } }), { threshold: .2 });
      this.io.observe(this);
    }
    disconnectedCallback() { if (this.io) this.io.disconnect(); }
    attributeChangedCallback() { if (this.shadowRoot) this.draw(); }
    draw() {
      const text = (this.getAttribute('text') || '').toUpperCase(), words = text.split(' ');
      let col = 0, order = 0, html = '';
      words.forEach((w, wi) => {
        html += '<span class="knit-word">';
        w.split('').forEach(ch => {
          const g = KF[ch], base = col; col += 6; if (!g) return; const my = order++;
          html += '<span class="knit-glyph">' + g.map((row, r) => '<span class="knit-row">' + row.split('').map((c, ci) => {
            if (c !== '1') return '<span class="knit-cell"></span>';
            const d = this.mode === 'letter' ? my * 150 + r * 15 : r * 70 + (base + ci) * 10;
            return '<span class="knit-cell knit-stitch ' + (this.started ? 'on' : 'off') + '" style="animation-delay:' + d + 'ms"></span>';
          }).join('') + '</span>').join('') + '</span>';
        });
        html += '</span>'; if (wi < words.length - 1) col += 3;
      });
      const total = this.mode === 'letter' ? order * 150 + 105 : 490 + col * 10;
      const dark = this.hasAttribute('dark') && this.getAttribute('dark') !== 'false';
      this.shadowRoot.innerHTML = '<style>' + KNIT_CSS + '</style><div class="knit-type' + (dark ? ' dark' : '') + '" tabindex="0" title="Click to re-knit" style="font-size:' + (this.getAttribute('size') || '60px') + '">'
        + (this.started ? '<span class="knit-carriage" style="animation-duration:' + Math.max(900, total) + 'ms"></span>' : '') + '<span class="knit-bed"></span>' + html + '</div>';
      const k = this.shadowRoot.querySelector('.knit-type');
      const re = () => { this.mode = 'letter'; this.started = false; this.draw(); requestAnimationFrame(() => { this.started = true; this.draw(); }); };
      k.onclick = re; k.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); re(); } };
    }
  }

  /* ---------------- STITCHED HEADLINE (embroidered, needle-sewn) ---------------- */
  const TONES = {
    red: { base: '#C8101A', a: '#2A0A0A', b: '#E3A72F', hi: '#F0484C', run: '#2A0A0A', dot: '#6A6057', shadow: 'rgba(70,4,7,.4)' },
    gold: { base: '#E0A23A', a: '#8A1A12', b: '#2A0A0A', hi: '#F6CB5E', run: '#3A1606', dot: '#BDB4A9', shadow: 'rgba(0,0,0,.55)' },
    ivory: { base: '#EDE4D3', a: '#C8101A', b: '#2A0A0A', hi: '#FFFFFF', run: '#6A6057', dot: '#BDB4A9', shadow: 'rgba(0,0,0,.5)' },
  };
  let sid = 0;
  const mctx = document.createElement('canvas').getContext('2d');
  class NgStitch extends HTMLElement {
    static get observedAttributes() { return ['text', 'size', 'tone']; }
    connectedCallback() {
      this.style.display = this.hasAttribute('nowrap') ? 'inline-block' : 'block';
      if (!this.shadowRoot) { this.attachShadow({ mode: 'open' }); if (window.NGFB) window.NGFB(this.shadowRoot); }
      this.uid = 'st' + (++sid); this.p = 0;
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { this.layout(); });
      this.ro = new ResizeObserver(() => requestAnimationFrame(() => { const a = this.box(); const w = a ? a.clientWidth : 0; if (Math.abs(w - (this._pw || 0)) > 2) { this._pw = w; this.layout(); } }));
      requestAnimationFrame(() => { const a = this.box(); if (a) this.ro.observe(a); });
      this.io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting && !this.done && !this.running) this.sew(); }), { threshold: .35 });
      this.io.observe(this);
      this.onclick = () => this.sew(true);
    }
    disconnectedCallback() { if (this.ro) this.ro.disconnect(); if (this.io) this.io.disconnect(); cancelAnimationFrame(this.raf); }
    attributeChangedCallback() { if (this.shadowRoot) this.layout(); }
    box() { let a = this.parentElement || (this.getRootNode() && this.getRootNode().host); while (a && !a.clientWidth) a = a.parentElement; return a; }
    layout() {
      const text = this.getAttribute('text') || '';
      const probe = document.createElement('span'); probe.style.cssText = 'position:absolute;visibility:hidden;font-size:' + (this.getAttribute('size') || '64px');
      this.shadowRoot.appendChild(probe); const px = parseFloat(getComputedStyle(probe).fontSize) || 64; probe.remove();
      const wt = this.getAttribute('weight') || '800', track = -0.035 * px, lh = +(this.getAttribute('lh') || .95);
      mctx.font = wt + ' ' + px + 'px "Bricolage Grotesque", sans-serif'; if ('letterSpacing' in mctx) mctx.letterSpacing = track + 'px';
      const meas = s => mctx.measureText(s).width;
      const bx = this.box(); const maxW = this.hasAttribute('nowrap') ? Infinity : ((bx && bx.clientWidth) || Infinity);
      const words = text.split(' '); const lines = []; let cur = '';
      words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (cur && meas(t) > maxW) { lines.push(cur); cur = w; } else cur = t; });
      if (cur) lines.push(cur);
      const T = TONES[this.getAttribute('tone')] || TONES.red, u = this.uid;
      const lw = lines.map(meas), W = Math.ceil(Math.max(1, ...lw) + px * .12), H = Math.ceil(px * lh * (lines.length - 1) + px * 1.12);
      this.lines = lines.map((l, i) => ({ w: lw[i] + px * .06, y: px * .86 + i * px * lh }));
      this.px = px; this.W = W;
      const sw = Math.max(1, px * .014), dash = (px * .045).toFixed(1) + ' ' + (px * .032).toFixed(1);
      const tx = (l, i, extra) => '<text x="' + (px * .03) + '" y="' + this.lines[i].y + '" ' + extra + '>' + l.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>';
      this.shadowRoot.innerHTML = '<style>:host{cursor:pointer}svg{display:block;overflow:visible;max-width:100%}text{font-family:"Bricolage Grotesque",sans-serif;font-weight:' + wt + ';font-size:' + px + 'px;letter-spacing:' + track + 'px}</style>'
        + '<svg role="img" aria-label="' + text.replace(/"/g, '&quot;') + '" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '"><defs>'
        + '<pattern id="sat' + u + '" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="' + T.base + '"/>'
          + '<rect x="0" y="1.5" width="10" height="1.6" fill="' + T.a + '" opacity=".55"/><rect x="1.5" y="0" width="1.6" height="10" fill="' + T.a + '" opacity=".55"/>'
          + '<rect x="0" y="6.2" width="10" height=".8" fill="' + T.b + '" opacity=".7"/><rect x="6.2" y="0" width=".8" height="10" fill="' + T.b + '" opacity=".7"/>'
          + '<rect x="0" y="4.2" width="10" height=".5" fill="' + T.hi + '" opacity=".35"/></pattern>'
        + '<linearGradient id="sh' + u + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".25"/></linearGradient>'
        + '<filter id="fb' + u + '" x="-5%" y="-10%" width="110%" height="130%"><feTurbulence type="fractalNoise" baseFrequency="1.6" numOctaves="2" seed="3" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="' + (px * .018).toFixed(2) + '" result="d"/><feDropShadow in="d" dx="0" dy="' + (px * .02).toFixed(2) + '" stdDeviation="' + (px * .012).toFixed(2) + '" flood-color="' + T.shadow + '"/></filter>'
        + '<clipPath id="cl' + u + '">' + this.lines.map((l, i) => '<rect class="cr" x="0" y="' + (l.y - px * .95) + '" width="0" height="' + (px * 1.2) + '"/>').join('') + '</clipPath></defs>'
        + '<g clip-path="url(#cl' + u + ')"><g filter="url(#fb' + u + ')">' + lines.map((l, i) => tx(l, i, 'fill="url(#sat' + u + ')"')).join('') + lines.map((l, i) => tx(l, i, 'fill="url(#sh' + u + ')"')).join('') + '</g>'
        + lines.map((l, i) => tx(l, i, 'fill="none" stroke="' + T.run + '" stroke-width="' + sw + '" stroke-dasharray="' + dash + '" stroke-linecap="round" stroke-linejoin="round" opacity=".9"')).join('')
        + this.lines.map(l => { let c = ''; const gap = px * .2; for (let x = px * .04; x < l.w; x += gap) c += '<circle cx="' + x.toFixed(1) + '" cy="' + (l.y + px * .16).toFixed(1) + '" r="' + Math.max(.9, px * .018).toFixed(2) + '" fill="' + T.dot + '" opacity=".7"/>'; return c; }).join('') + '</g>'
        + '<g class="needle" opacity="0"><path d="M0 ' + (-px * .1) + ' C ' + (-px * .5) + ' ' + (-px * .3) + ' ' + (-px * .9) + ' ' + (px * .05) + ' ' + (-px * 1.4) + ' ' + (-px * .02) + '" fill="none" stroke="' + T.run + '" stroke-width="' + Math.max(1, px * .012) + '" opacity=".85"/>'
        + '<line x1="0" y1="' + (-px * .78) + '" x2="0" y2="' + (px * .14) + '" stroke="#E4DED3" stroke-width="' + Math.max(1.6, px * .028) + '" stroke-linecap="round"/><line x1="0" y1="' + (-px * .78) + '" x2="0" y2="' + (px * .14) + '" stroke="#8C847B" stroke-width="' + Math.max(.6, px * .008) + '" stroke-linecap="round" transform="translate(' + (px * .008) + ',0)"/>'
        + '<ellipse cx="0" cy="' + (-px * .66) + '" rx="' + Math.max(.8, px * .009) + '" ry="' + (px * .045) + '" fill="#6A6057"/></g></svg>';
      this.paint(this.done ? 1 : this.p);
    }
    paint(p) {
      const r = this.shadowRoot; if (!r || !this.lines) return;
      const rects = r.querySelectorAll('.cr'), needle = r.querySelector('.needle');
      const tot = this.lines.reduce((s, l) => s + l.w, 0); let rem = p * tot, nx = 0, ny = this.lines[0].y, active = false;
      this.lines.forEach((l, i) => { const w = Math.max(0, Math.min(l.w, rem)); rem -= w; rects[i].setAttribute('width', w > 0 ? w + this.px * .06 : 0); if (w > 0 && w < l.w) { nx = w + this.px * .03; ny = l.y; active = true; } else if (w > 0 && !active) { nx = w; ny = l.y; } });
      if (needle) { const bob = Math.sin(performance.now() / 55) * this.px * .12; needle.setAttribute('transform', 'translate(' + nx + ',' + (ny - this.px * .32 + bob) + ') rotate(12)'); needle.setAttribute('opacity', p > 0 && p < 1 ? 1 : 0); }
    }
    sew(again) {
      if (again) this.done = false; this.running = true; cancelAnimationFrame(this.raf);
      const tot = (this.lines || []).reduce((s, l) => s + l.w, 0), dur = Math.max(900, Math.min(3200, tot * 2.2)), t0 = performance.now();
      const step = n => { const p = Math.min(1, (n - t0) / dur); this.p = p; this.paint(p); if (p < 1) this.raf = requestAnimationFrame(step); else { this.done = true; this.running = false; } };
      this.raf = requestAnimationFrame(step);
    }
  }
  if (!customElements.get('ng-stitch')) customElements.define('ng-stitch', NgStitch);
  if (!customElements.get('ng-rack')) customElements.define('ng-rack', NgRack);
  if (!customElements.get('ng-loop')) customElements.define('ng-loop', NgLoop);
  if (!customElements.get('ng-knit')) customElements.define('ng-knit', NgKnit);
})();
