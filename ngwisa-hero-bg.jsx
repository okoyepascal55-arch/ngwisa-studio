window.NG_NO_CAPTIONS = true;
// Chromeless, self-clocked playback of the Ngwisa reel for use as a site background.
const NG_SCENES = '[{"name":"Strike","dur":2.6},{"name":"Heritage","dur":8.4},{"name":"Modernity","dur":4.4},{"name":"Gallery","dur":10.8},{"name":"Chorus","dur":3.6},{"name":"Lockup","dur":3}]';

function NgwisaHeroBg(props) {
  const fit = props.fit || 'cover';
  const box = React.useRef(null);
  const [sz, setSz] = React.useState({ w: 1920, h: 1080 });
  const d = React.useMemo(() => window.ccDerive(window.ssParse(window.OM_SCENES || NG_SCENES)), []);
  const [t, setT] = React.useState(+props.start || 0);
  React.useEffect(() => {
    let raf, last = performance.now(), acc = +props.start || 0, on = true;
    const io = new IntersectionObserver(es => { on = es[0].isIntersecting; }); if (box.current) io.observe(box.current);
    let ready = false;
    const markReady = new Promise(res => { const im = new Image(); im.onload = im.onerror = res; im.src = window.NGR ? window.NGR('assets/gong-mark.png') : 'assets/gong-mark.png'; });
    const pageReady = document.readyState === 'complete' ? Promise.resolve() : new Promise(res => addEventListener('load', res, { once: true }));
    Promise.all([markReady, pageReady, document.fonts ? document.fonts.ready : 0, new Promise(r => setTimeout(r, 4000)).then(() => 0)].slice(0, 3)).then(() => setTimeout(() => { ready = true; last = performance.now(); }, 250));
    setTimeout(() => { if (!ready) { ready = true; last = performance.now(); } }, 5000);
    const tick = (n) => { const dt = Math.min(0.05, (n - last) / 1000); last = n; if (ready && on && !document.hidden) { acc = (acc + dt) % d.total; setT(acc); } raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, []);
  React.useEffect(() => {
    const el = box.current; if (!el) return;
    let rq = 0; const ro = new ResizeObserver(() => { cancelAnimationFrame(rq); rq = requestAnimationFrame(() => setSz({ w: el.clientWidth, h: el.clientHeight })); });
    ro.observe(el); return () => ro.disconnect();
  }, []);
  const T = window.ccWarp(d, t);
  const value = React.useMemo(() => ({ T, CUES: d.table, time: t, duration: d.total, authoredTotal: d.authoredTotal, playing: true }), [T]);
  const s = fit === 'cover' ? Math.max(sz.w / 1920, sz.h / 1080) : Math.min(sz.w / 1920, sz.h / 1080);
  const Piece = window.NgwisaPiece;
  return (
    <div ref={box} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0A0807' }}>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1920, height: 1080, transform: `translate(-50%,-50%) scale(${s})` }}>
        <window.CompositionContext.Provider value={value}>
          <Piece grade={props.grade || 'Deep'} grain={true} />
        </window.CompositionContext.Provider>
      </div>
    </div>
  );
}
window.NgwisaHeroBg = NgwisaHeroBg;
