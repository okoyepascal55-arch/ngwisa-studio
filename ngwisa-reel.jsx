// Ngwisa — homepage hero reel. One tree, keyed to T.
const { useComposition, CompositionStage, Shot, Easing, animate } = window;

const C = { bg: '#0A0807', ivory: '#FBF8F2', red: '#D81219', mute: '#B9AFA6' };
const DISPLAY = "'Bricolage Grotesque', sans-serif";
const MONO = "'DM Mono', monospace";
const NG_WX = {"02542":"840628_630ac86f25494f9ea6f6ebe587021156~mv2.jpg","02571":"840628_230182ddf73c4ffe9dbf48066ee60f18~mv2.jpg","02604":"840628_503f1526a78a4099afb7de42fd82f6bb~mv2.jpg","02693":"840628_ce68efda824a4c859b6d81ef90c9cc0e~mv2.jpg","02706":"840628_f4d7988af81645298f3e2c4e89acb8ec~mv2.jpg","02759":"840628_b18b05eb2f1b4f72b151cc55306e47fa~mv2.jpg","02794":"840628_ae64187efca040b8ac8eb3d2ac452a69~mv2.jpg","02838":"840628_ed66fddacf46464b9e6a7d6285e2126f~mv2.jpg","03127":"840628_60e70b9ac6434ba8b453ec395525e404~mv2.jpg","03382":"840628_d7b311a630e94c7dba251927ff1184b0~mv2.jpg","03402":"840628_030e07a4c35b4ed985585037739476a6~mv2.jpg","03412":"840628_0edea388c81e4fb096e125a724ec7be2~mv2.jpg","03456":"840628_3cbbb96af3f340d4a0ab3670a1ff0b70~mv2.jpg","03462":"840628_581a9cebe1be40aaa1ebb22d76abeda3~mv2.jpg","03603":"840628_ea5058a857164b2484c07452aeadb27a~mv2.jpg","03604":"840628_a6dd7b2f0e2f42409ed3ec858ea24811~mv2.jpg","03607":"840628_72e447a2ca20484fbd6c2ab60764c0b6~mv2.jpg","03621":"840628_1194b99ba10d443584f3d4ee467f24c3~mv2.jpg","03622":"840628_3d8be738c2ca47d9b44641cfa45c7052~mv2.jpg","03947":"840628_539e209a11c9440db477a62ae68a8a34~mv2.jpg","04060":"840628_ad72189a69d741a89dc97b94866b6d63~mv2.jpg","04086":"840628_ddf699cfc3ca41d39c554dfc53080182~mv2.jpg","04258":"840628_ee068eb48b174058b1191e59587ddc21~mv2.jpg","04363":"840628_d99660942e8e45eb8f967b9d9abf11f8~mv2.jpg","04453":"840628_2d11be200ba84d80bd4e7e6498481328~mv2.jpg","04456":"840628_ab022e367ac94486903ea73420b7087e~mv2.jpg","04510":"840628_7c0a62e2a4794632a112d35a85d4469f~mv2.jpg","04659":"840628_4d9b09cbfd934cc4bcb503972373d550~mv2.jpg"};
const WXR = (n) => { const k = String(n).replace(/^A67/, ''); return NG_WX[k] ? 'https://static.wixstatic.com/media/' + NG_WX[k] + '/v1/fit/w_1920,h_1920,q_85,enc_auto/' + n + '.jpg' : 'uploads/Photos-1-001/' + n + '_Export_Green.jpg'; };
const P = (n) => WXR(n);
const MARK = 'assets/gong-mark.png';
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='260' height='260'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .6 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

const MOTION = {
  enter: (T, s, e, f = 0, t = 1) => animate({ from: f, to: t, start: s, end: e, ease: Easing.easeOutCubic })(T),
  glide: (T, s, e, f = 0, t = 1) => animate({ from: f, to: t, start: s, end: e, ease: Easing.easeInOutCubic })(T),
  drift: (T, s, e, f = 0, t = 1) => animate({ from: f, to: t, start: s, end: e, ease: Easing.linear })(T),
};
const ring = (T, at) => (T < at ? 0 : Math.exp(-(T - at) * 4.5) * Math.sin((T - at) * 26));
const abs = { position: 'absolute' };
const full = { position: 'absolute', inset: 0 };

function Reveal({ T, at, dur = 0.8, children }) {
  const p = MOTION.enter(T, at, at + dur);
  return (
    <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'top', paddingBottom: '.08em' }}>
      <span style={{ display: 'inline-block', transform: `translateY(${(1 - p) * 112}%)` }}>{children}</span>
    </span>
  );
}

// Starts as a gentle crop, settles to the full uncropped photo over a textured,
// counter-drifting backdrop of the same picture.
function Framed({ src, posY = 0.3, p, W, H, ar = 2 / 3, bright, drift = 1, back = 1.12, slide = 0 }) {
  const cw = W, ch = W / ar, ct = -(ch - H) * posY;
  const fh = H * 0.94, fw = fh * ar, ft = (H - fh) / 2, fl = (W - fw) / 2;
  const L = (a, b) => a + (b - a) * p;
  return (
    <div style={{ ...full, overflow: 'hidden', background: C.bg }}>
      <img src={src} alt="" style={{ ...full, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `50% ${posY * 100}%`,
        transform: `scale(${back}) translateX(${-slide * 0.4}px)`, filter: `blur(6px) brightness(${bright * 0.62}) contrast(1.25) saturate(1.12)`, opacity: p }} />
      <div style={{ ...full, background: 'linear-gradient(90deg, rgba(10,8,7,.6), rgba(10,8,7,.05) 32%, rgba(10,8,7,.05) 68%, rgba(10,8,7,.6))', opacity: p }} />
      <div style={{ ...full, transform: `scale(${drift}) translateX(${slide}px)` }}>
        <img src={src} alt="" style={{ ...abs, left: L(0, fl), top: L(ct, ft), width: L(cw, fw), height: L(ch, fh),
          filter: `brightness(${bright}) contrast(1.14) saturate(1.06)`, boxShadow: `0 40px 120px rgba(0,0,0,${0.75 * p})` }} />
      </div>
      <div style={{ ...full, background: 'radial-gradient(ellipse 85% 80% at 50% 45%, rgba(10,8,7,0) 50%, rgba(10,8,7,.75) 100%)' }} />
    </div>
  );
}

function Graded({ src, pos = '50% 50%', scale = 1, bright }) {
  return (
    <div style={{ ...full, overflow: 'hidden' }}>
      <img src={src} alt="" style={{ ...full, width: '100%', height: '100%', objectFit: 'cover', objectPosition: pos,
        transform: `scale(${scale})`, filter: `brightness(${bright}) contrast(1.14) saturate(1.06)` }} />
      <div style={{ ...full, background: 'radial-gradient(ellipse 80% 75% at 50% 45%, rgba(10,8,7,0) 40%, rgba(10,8,7,.8) 100%)' }} />
    </div>
  );
}

// One small caption, bottom-centred.
function Caption({ T, from, to, children, sub }) {
  if (window.NG_NO_CAPTIONS) return null;
  const o = MOTION.enter(T, from, from + 0.5) * (1 - MOTION.enter(T, to - 0.4, to));
  return (
    <div style={{ ...abs, left: 0, right: 0, top: 950, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, opacity: o, zIndex: 20 }}>
      {children && <div style={{ font: `400 34px/1 ${DISPLAY}`, letterSpacing: '-.01em', color: C.ivory, whiteSpace: 'nowrap' }}>{children}</div>}
      {sub && <div style={{ font: `500 12px/1 ${MONO}`, letterSpacing: '.34em', color: C.mute, whiteSpace: 'nowrap' }}>{sub}</div>}
    </div>
  );
}

/* STRIKE — the gong appears, is struck, and we fly through it. */
function Strike({ T, CUES }) {
  const end = CUES.Heritage;
  const markIn = MOTION.enter(T, 0.4, 1.0);
  const pulse = ring(T, 1.05);
  const through = MOTION.glide(T, end - 0.45, end + 0.15, 1, 8);
  const markOut = 1 - MOTION.enter(T, end - 0.15, end + 0.15);
  const glow = MOTION.enter(T, 1.05, 1.6) * (1 - MOTION.enter(T, end - 0.5, end));
  const ringP = MOTION.enter(T, 1.05, 2.4);
  const H = 220;
  return (
    <Shot from={0} to={end + 0.2}>
      <div style={{ ...full, background: 'radial-gradient(circle at 50% 50%, rgba(216,18,25,.16) 0%, rgba(10,8,7,0) 38%)', opacity: glow }} />
      <div style={{ ...abs, left: 960 - (120 + ringP * 620), top: 540 - (120 + ringP * 620), width: (120 + ringP * 620) * 2, height: (120 + ringP * 620) * 2,
        borderRadius: '50%', boxShadow: 'inset 0 0 0 1px rgba(251,248,242,.5)', opacity: T < 1.05 ? 0 : (1 - ringP) * 0.6 }} />
      <img src={MARK} alt="" style={{ ...abs, left: 960 - (H * 240 / 279) / 2, top: 540 - H / 2, height: H, width: 'auto',
        opacity: markIn * markOut, transformOrigin: '50% 8%',
        transform: `scale(${(0.9 + 0.1 * markIn) * through * (1 + 0.035 * pulse)}) rotate(${4 * pulse}deg)` }} />
      <Caption T={T} from={1.3} to={end - 0.2} sub="CAMEROONIAN CRAFT · CONTEMPORARY FORM" />
    </Shot>
  );
}

/* HERITAGE — six looks, each settling into its full frame. */
const CUTS = [
  { src: WXR('A6702571'), y: 0.7 }, { src: WXR('A6702759'), y: 0.6 }, { src: WXR('A6702693'), y: 0.5 },
  { src: WXR('A6703412'), y: 0.55 }, { src: WXR('A6702542'), y: 0.35 }, { src: WXR('A6702838'), y: 0.6 },
];
function Heritage({ T, CUES, bright }) {
  const s0 = CUES.Heritage, s1 = CUES.Modernity;
  const step = (s1 - s0) / CUTS.length;
  const toBlack = MOTION.enter(T, s1 - 0.35, s1 + 0.1);
  return (
    <Shot from={s0 - 0.15} to={s1 + 0.15}>
      {CUTS.map((c, i) => {
        const a = s0 + i * step, b = a + step;
        const inO = i === 0 ? MOTION.enter(T, s0 - 0.15, s0 + 0.2) : MOTION.enter(T, a, a + 0.3);
        const dir = i % 2 ? -1 : 1;
        return (
          <Shot key={i} from={i === 0 ? s0 - 0.15 : a} to={i === CUTS.length - 1 ? s1 + 0.15 : b + 0.3}>
            <div style={{ ...full, opacity: inO, zIndex: i }}>
              <Framed src={c.src} posY={c.y} W={1920} H={1080} bright={bright + 0.08}
                p={MOTION.glide(T, a, a + 0.85, 0.45, 1)} drift={MOTION.drift(T, a, b + 0.3, 1.05, 1)}
                back={MOTION.drift(T, a, b + 0.3, 1.1, 1.22)} slide={MOTION.drift(T, a, b + 0.3, 40 * dir, -40 * dir)} />
            </div>
          </Shot>
        );
      })}
      <div style={{ ...full, zIndex: 10, background: C.bg, opacity: toBlack }} />
      <Caption T={T} from={s0 + 0.5} to={s1} sub="HAND-EMBROIDERED TOGHU">
        <Reveal T={T} at={s0 + 0.5}>Heritage</Reveal>
      </Caption>
    </Shot>
  );
}

/* MODERNITY — three portraits rise in the gong's arch. */
const ARCHES = [
  { src: WXR('A6702604'), pos: '50% 22%', dy: 20 }, { src: WXR('A6703456'), pos: '50% 18%', dy: -20 }, { src: WXR('A6703947'), pos: '50% 20%', dy: 30 },
];
function Modernity({ T, CUES }) {
  const s = CUES.Modernity, e = CUES.Gallery;
  const W = 340, Hh = 590, G = 36, X = 960 - (W * 3 + G * 2) / 2, Y = 190;
  return (
    <Shot from={s - 0.1} to={e}>
      {ARCHES.map((a, i) => {
        const at = s + 0.2 + i * 0.16;
        const p = MOTION.enter(T, at, at + 1.1);
        const par = MOTION.drift(T, s, e, 0, -26 - i * 16);
        const out = 1 - MOTION.enter(T, e - 0.4, e - 0.05);
        return (
          <div key={i} style={{ ...abs, left: X + i * (W + G), top: Y + a.dy + (1 - p) * 180 + par, width: W, height: Hh,
            opacity: p * out, borderRadius: '170px 170px 22px 22px', overflow: 'hidden', boxShadow: '0 40px 100px rgba(0,0,0,.7)' }}>
            <Graded src={a.src} pos={a.pos} bright={0.74} scale={MOTION.drift(T, s, e, 1.05, 1)} />
          </div>
        );
      })}
      <Caption T={T} from={s + 0.6} to={e} sub="MODERN SILHOUETTES · EVERYDAY TO OCCASION">
        <Reveal T={T} at={s + 0.6}>Heritage</Reveal>&nbsp;<Reveal T={T} at={s + 0.75}>meets</Reveal>&nbsp;<Reveal T={T} at={s + 0.9}>modernity.</Reveal>
      </Caption>
    </Shot>
  );
}

/* CALL & ANSWER — pairs of full portraits, wiping in from opposite edges. */
const PAIRS = [
  [WXR('A6704453'), WXR('A6704659')], [WXR('A6704086'), WXR('A6704060')], [WXR('A6702794'), WXR('A6704363')],
  [WXR('A6703382'), WXR('A6703402')], [WXR('A6703462'), WXR('A6704510')], [WXR('A6703127'), WXR('A6704258')],
];
function Gallery({ T, CUES, bright }) {
  const s = CUES.Gallery, e = CUES.Chorus;
  const step = (e - s) / PAIRS.length;
  return (
    <Shot from={s - 0.05} to={e + 0.05}>
      {PAIRS.map((pair, i) => {
        const a = s + i * step, b = a + step;
        return (
          <Shot key={i} from={a} to={i === PAIRS.length - 1 ? e + 0.05 : b + 0.6}>
            <div style={{ ...full, zIndex: i }}>
              {pair.map((src, j) => {
                const at = a + j * 0.18;
                const w = MOTION.glide(T, at, at + 0.6);
                const clip = j === 0 ? `inset(0 0 ${(1 - w) * 100}% 0)` : `inset(${(1 - w) * 100}% 0 0 0)`;
                return (
                  <div key={j} style={{ ...abs, top: 0, bottom: 0, left: j === 0 ? 0 : 960, width: 960, overflow: 'hidden', clipPath: clip, background: C.bg }}>
                    <Framed src={src} posY={0.3} W={960} H={1080} bright={bright + 0.12}
                      p={MOTION.glide(T, at + 0.1, at + 0.85, 0.5, 1)} drift={MOTION.drift(T, a, b + 0.6, 1.04, 1)}
                      back={MOTION.drift(T, a, b + 0.6, 1.08, 1.2)} slide={MOTION.drift(T, a, b + 0.6, j ? -24 : 24, j ? 24 : -24)} />
                  </div>
                );
              })}
            </div>
          </Shot>
        );
      })}
    </Shot>
  );
}

/* THE CHORUS — tight on the real double gong, pull back to everyone. */
const GROUP = { src: WXR('A6703622'), w: 1920, h: 1920 * 1568 / 2353, gx: 1920 * 0.453, gy: (1920 * 1568 / 2353) * 0.957 };
function Chorus({ T, CUES, bright }) {
  const s = CUES.Chorus, e = CUES.Lockup;
  const p = MOTION.glide(T, s, e + 0.2);
  const s0 = 3.4, sc = s0 + (1 - s0) * p;
  const tx0 = 960 - s0 * GROUP.gx, ty0 = 900 - s0 * GROUP.gy;
  const tx = tx0 * (1 - p), ty = ty0 + (1080 - GROUP.h - ty0) * p;
  return (
    <Shot from={s} to={e + 0.9}>
      <div style={{ ...full, overflow: 'hidden' }}>
        <img src={GROUP.src} alt="" style={{ ...abs, left: 0, top: 0, width: GROUP.w, height: GROUP.h, transformOrigin: '0 0',
          transform: `translate(${tx}px, ${ty}px) scale(${sc})`, filter: `brightness(${bright + 0.05}) contrast(1.14) saturate(1.06)` }} />
        <div style={{ ...full, background: 'radial-gradient(ellipse 85% 80% at 50% 42%, rgba(10,8,7,0) 40%, rgba(10,8,7,.85) 100%)' }} />
        <div style={{ ...full, background: 'linear-gradient(0deg, rgba(10,8,7,.75) 0%, rgba(10,8,7,0) 28%)' }} />
      </div>
      <Caption T={T} from={s + 0.8} to={e + 0.1}>
        <Reveal T={T} at={s + 0.8}>Not just worn —</Reveal>&nbsp;<Reveal T={T} at={s + 1.1}>embodied.</Reveal>
      </Caption>
    </Shot>
  );
}

/* LOCKUP — welcome, the gong and the name. */
function Lockup({ T, CUES, total }) {
  const s = CUES.Lockup;
  const black = MOTION.enter(T, s - 0.1, s + 0.5);
  const seam = MOTION.glide(T, total - 0.45, total);
  const G = 120, type = G / 1.6, gap = G / 3;
  const markIn = MOTION.enter(T, s + 0.3, s + 0.85);
  const pulse = ring(T, s + 0.85);
  return (
    <Shot from={s - 0.1} to={total + 0.01}>
      <div style={{ ...full, background: C.bg, opacity: black, zIndex: 30 }} />
      <div style={{ ...full, zIndex: 31 }}>
        <div style={{ ...abs, left: 0, right: 0, top: 540 - G / 2 - 70, textAlign: 'center', font: `500 12px/1 ${MONO}`, letterSpacing: '.5em',
          color: C.mute, opacity: MOTION.enter(T, s + 0.15, s + 0.7) }}>WELCOME</div>
        <div style={{ ...abs, left: 0, right: 0, top: 540 - G / 2, height: G, display: 'flex', alignItems: 'center', justifyContent: 'center', gap }}>
          <img src={MARK} alt="" style={{ height: G, width: 'auto', opacity: markIn, transformOrigin: '50% 8%',
            transform: `translateY(${(1 - markIn) * 20}px) rotate(${3.5 * pulse}deg)` }} />
          <div style={{ display: 'flex', font: `800 ${type}px/1 ${DISPLAY}`, letterSpacing: '.16em', color: C.ivory, marginRight: '-.16em' }}>
            {'NGWISA'.split('').map((ch, i) => <Reveal key={i} T={T} at={s + 0.45 + i * 0.06} dur={0.7}>{ch}</Reveal>)}
          </div>
        </div>
        <Caption T={T} from={s + 1.0} to={total + 1} sub="NGWISA.COM">Where heritage meets modernity.</Caption>
        <div style={{ ...full, background: C.bg, opacity: seam }} />
      </div>
    </Shot>
  );
}

function Grain({ T }) {
  const f = Math.floor(T * 24);
  return <div style={{ ...abs, inset: -60, zIndex: 40, pointerEvents: 'none', backgroundImage: GRAIN, opacity: 0.07, mixBlendMode: 'screen',
    transform: `translate(${(f * 37) % 60 - 30}px, ${(f * 53) % 60 - 30}px)` }} />;
}

function Piece({ grade, grain }) {
  const { T, CUES, authoredTotal } = useComposition();
  const bright = grade === 'Dusk' ? 0.62 : grade === 'Night' ? 0.4 : 0.5;
  return (
    <div data-screen-label={`t=${Math.floor(T)}s`} style={{ ...full, background: C.bg, overflow: 'hidden' }}>
      <Strike T={T} CUES={CUES} />
      <Heritage T={T} CUES={CUES} bright={bright} />
      <Modernity T={T} CUES={CUES} />
      <Gallery T={T} CUES={CUES} bright={bright} />
      <Chorus T={T} CUES={CUES} bright={bright} />
      <Lockup T={T} CUES={CUES} total={authoredTotal} />
      {grain && <Grain T={T} />}
    </div>
  );
}

function NgwisaReel() {
  const [t, setTweak] = window.useTweaks(window.NGWISA_TWEAKS);
  return (
    <>
      <CompositionStage width={1920} height={1080} bg={C.bg} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK}>
        <Piece grade={t.grade} grain={t.grain !== false} />
      </CompositionStage>
      <window.TweaksPanel>
        <window.TweakSection label="Reel" />
        <window.TweakRadio label="Photo grade" value={t.grade} options={['Dusk', 'Deep', 'Night']} onChange={(v) => setTweak('grade', v)} />
        <window.TweakToggle label="Film grain" value={t.grain !== false} onChange={(v) => setTweak('grain', v)} />
        <window.TweakToggle label="Motion editor" value={t.motionEditor} onChange={(v) => setTweak('motionEditor', v)} />
      </window.TweaksPanel>
    </>
  );
}
window.NgwisaReel = NgwisaReel;
window.NgwisaPiece = Piece;
