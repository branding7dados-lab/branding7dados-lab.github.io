// Calc Machine Connect · v5 "Você já pensou em usar o PJe-Calc dentro do Claude…" (shared/kit.js)
// A screen-recording reel: the real Claude session is the hero of the demo; the presenter moves from
// the card (hook, CTA) to a picture-in-picture while the screen plays, framed by eased camera keys.
import {
  M, C, D, UI, STATE, CARD, at, sp, life, prepare as prepareCam, presenter, background, tag, captions, buildCaptions,
  hub, statement, brandReveal, ctaButton, label, endCard, pushThrough, post, flare, panel, ctext, badgeCheck, punch, symbol,
} from '../shared/kit.js';

const { W, H, E, prog, lerp, clamp, font, layout, text, rrect, kf, SPRING } = M;
let T = {};
const HITS = [];   // filled in init(), once the words are timed

// ------------------------------------------------------------------ screen frames (the real app)
const SCACHE = new Map(), SREADY = new Map();
const scrSrc = (t) => `media/screen/${String(clamp(Math.floor(t * 30) + 1, 1, Math.round(STATE.edit.talk * 30))).padStart(4, '0')}.jpg`;
async function loadScr(src) {
  if (SCACHE.has(src)) return SCACHE.get(src);
  const im = new Image(); im.src = src;
  const p = im.decode().then(() => im, () => null);
  SCACHE.set(src, p);
  if (SCACHE.size > 40) SCACHE.delete(SCACHE.keys().next().value);
  return p;
}
async function prepare(a, b) {
  await prepareCam(a, b);
  for (const t of [a, (a + b) / 2, b]) {
    if (t > STATE.edit.talk + 0.6) continue;
    const s = scrSrc(t); SREADY.set(s, await loadScr(s));
  }
  if (SREADY.size > 12) for (const k of [...SREADY.keys()].slice(0, SREADY.size - 12)) SREADY.delete(k);
}

// ------------------------------------------------------------------ layout: 0 = card (hook, CTA), 1 = demo
const PANEL = { x: 40, y: 300, w: 1000, h: 1040, r: 34 };
const PIP = { x: 770, y: 1080, w: 250, h: 250, r: 125 };
function mode(t) { return sp(t, T.demo, SPRING.gentle) - sp(t, T.cta, SPRING.gentle); }
const mixR = (a, b, k) => ({ x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k), r: lerp(a.r, b.r, k) });
function camRect(t) {
  if (t < T.demo) {   // full frame -> card
    const k = sp(t, 1.0, SPRING.gentle);
    return mixR({ x: 0, y: 0, w: W, h: H, r: 0 }, CARD, k);
  }
  return mixR(CARD, PIP, clamp(mode(t)));
}

// camera over the screen recording: [film t, focus x, focus y, zoom] in screen px (1080 x 1104)
let SHOTS = [];
function screenCam(t) {
  const keys = SHOTS.map(([tt, x, y, z]) => [tt, [x, y, z]]);
  return M.springKeys(t, keys, { stiffness: 60, damping: 14 });
}
function screenPanel(ctx, t) {
  const k = clamp(mode(t));
  if (k <= 0.001) return null;
  const y = lerp(H + 40, PANEL.y, k), R = { ...PANEL, y };
  panel(ctx, R.x - 6, R.y - 6, R.w + 12, R.h + 12, R.r + 6, C.panel, 'rgba(242,240,232,0.18)');
  const im = SREADY.get(scrSrc(t));
  ctx.save(); rrect(ctx, R.x, R.y, R.w, R.h, R.r); ctx.clip();
  ctx.fillStyle = '#fff'; ctx.fillRect(R.x, R.y, R.w, R.h);
  let map = null;
  if (im) {
    const [fx, fy, z] = screenCam(t);
    const s = Math.max(R.w / im.width, R.h / im.height) * z;
    let dx = R.x + R.w / 2 - fx * s, dy = R.y + R.h / 2 - fy * s;
    dx = Math.min(R.x, Math.max(dx, R.x + R.w - im.width * s)); dy = Math.min(R.y, Math.max(dy, R.y + R.h - im.height * s));
    ctx.drawImage(im, dx, dy, im.width * s, im.height * s);
    map = (sx, sy) => [dx + sx * s, dy + sy * s, s];
  }
  ctx.restore();
  return map;
}
// orange ring around a real UI element, drawn on when it is named
function highlight(ctx, map, t, t0, t1, [x0, y0, x1, y1], note = null) {
  if (!map || t < t0 || t > t1) return;
  const p = E.inOutCubic(prog(t, t0, t0 + 0.45)), out = 1 - E.inCubic(prog(t, t1 - 0.25, t1));
  const [ax, ay, s] = map(x0, y0), [bx, by] = map(x1, y1);
  ctx.save(); ctx.globalAlpha = out;
  ctx.save(); rrect(ctx, PANEL.x, PANEL.y, PANEL.w, PANEL.h, PANEL.r); ctx.clip();
  ctx.fillStyle = 'rgba(14,27,22,0.28)'; ctx.fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);   // dim the rest
  ctx.restore();
  const pad = 14;
  const w = (bx - ax + 2 * pad), h = (by - ay + 2 * pad);
  ctx.save(); rrect(ctx, ax - pad, ay - pad, w, h, 14); ctx.clip(); ctx.restore();
  ctx.beginPath(); ctx.roundRect(ax - pad, ay - pad, w * p, h, 14);
  ctx.lineWidth = 6; ctx.strokeStyle = C.orange; ctx.stroke();
  if (note) {
    const k = sp(t, t0 + 0.3, SPRING.bouncy);
    if (k > 0) {
      const f = font(32, 700, D), tw = layout(ctx, note, f).width + 90;
      ctx.save(); ctx.translate(Math.min(PANEL.x + PANEL.w - tw / 2 - 16, ax - pad + tw / 2), ay - pad - 54); ctx.scale(k, k);
      rrect(ctx, -tw / 2, -34, tw, 68, 34); ctx.fillStyle = C.orange; ctx.fill();
      badgeCheck(ctx, -tw / 2 + 38, 0, 18, sp(t, t0 + 0.4, SPRING.bouncy), C.ink);
      text(ctx, note, -tw / 2 + 66, 11, f, C.cream);
      ctx.restore();
    }
  }
  ctx.restore();
}
// step pill pinned to the top-left of the panel
function step(ctx, t, n, str, t0, t1) {
  const L = life(t, t0, t1);
  if (!L.on) return;
  const f = font(30, 700, D), tw = layout(ctx, str, f).width + 110;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(PANEL.x + 24 + tw / 2 - (1 - L.k) * 40, PANEL.y + 50);
  panel(ctx, -tw / 2, -36, tw, 72, 36, C.bg, 'rgba(242,240,232,0.2)');
  ctx.beginPath(); ctx.arc(-tw / 2 + 38, 0, 22, 0, M.TAU); ctx.fillStyle = C.orange; ctx.fill();
  ctext(ctx, String(n), -tw / 2 + 38, 10, font(28, 700, D), C.cream);
  text(ctx, str, -tw / 2 + 72, 11, f, C.cream);
  ctx.restore();
}
// document chips on their names
function docChips(ctx, t, items, t1) {
  const L = life(t, items[0][1] - 0.05, t1);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha;
  let y = PANEL.y + PANEL.h - 70;
  items.slice().reverse().forEach(([lab, tc]) => {
    const k = sp(t, tc, SPRING.bouncy);
    if (k > 0) {
      const f = font(32, 700, D), tw = layout(ctx, lab, f).width + 96;
      ctx.save(); ctx.translate(PANEL.x + 30 + tw / 2, y); ctx.scale(k, k);
      panel(ctx, -tw / 2, -34, tw, 68, 18, C.cream, 'rgba(0,0,0,0)');
      rrect(ctx, -tw / 2 + 18, -18, 28, 36, 5); ctx.fillStyle = C.orange; ctx.fill();
      text(ctx, lab, -tw / 2 + 62, 11, f, C.ink);
      ctx.restore();
    }
    y -= 84;
  });
  ctx.restore();
}

M.film({
  fonts: [font(100, 700, D), font(100, 500, D), font(40, 600, UI), font(40, 700, UI)],
  images: { word: '../shared/assets/calc_word.png', connect: '../shared/assets/calc_connect.png', ensino: '../shared/assets/ensino_logo_white.png' },
  hits: HITS,
  samples: () => 8,
  async init() {
    const [edit, words] = await Promise.all([fetch('edit.json').then((r) => r.json()), fetch('words.json').then((r) => r.json())]);
    STATE.edit = edit; STATE.words = words.words;
    STATE.chunks = buildCaptions(STATE.words, edit.talk);
    T = {
      pje: at('PJe-Calc'), claude: at('Claude'), gpt: at('GPT'), pois: at('Pois'), poss: at('possível'), calc: at('Calc'),
      demo: at('Estou') - 0.1, olha: at('Olha'), subir: at('subir'), sent: at('sentença'), cheque: at('contracheque'),
      ponto: at('cartão'), pedir: at('pedir'), liq: at('liquidar'), pjc: at('.PJC'), sera: at('Será'), olha2: at('Olha', 1),
      tres: at('três'), quero: at('quero'), clicar: at('clicar'), aguardar: at('aguardar'), aqui3: at('aqui', 4),
      arq: at('arquivo', 1), pjc2: at('.PJC', 1), imp: at('importar'), pdf: at('PDF'), cta: at('Quer', 1) - 0.1,   // #0 is 'quero'
      desc: at('descrição'), link: at('link'), incr: at('incrível'),
    };
    // camera keys over the real screen (positions read off the recording)
    SHOTS = [
      [0, 540, 552, 1.0], [T.olha, 330, 470, 1.25], [T.subir + 1.3, 380, 760, 1.5], [T.liq + 2.2, 540, 600, 1.08],
      [T.olha2 + 1.6, 360, 470, 1.55], [T.clicar, 400, 470, 1.3], [T.aqui3 - 0.2, 420, 360, 1.35],
      [T.arq, 330, 470, 1.9], [T.pdf - 0.4, 420, 260, 1.45], [T.cta, 540, 552, 1.0],
    ];
    const HS = [
      [0.0, 'open', 'blip', { pitch: 'E6' }], [1.0, 'card shrinks', 'whoosh', { len: 0.45, from: 400, to: 2400 }],
      [T.pje, 'chip pje', 'pop', { pitch: 'C5' }], [T.claude, 'chip claude', 'pop', { pitch: 'E5' }], [T.gpt, 'chip gpt', 'pop', { pitch: 'G5' }],
      [T.pois - 0.05, 'statement', 'whoosh', { len: 0.3, from: 2400, to: 700 }], [T.poss, 'POSSIVEL', 'impact'],
      [T.calc + 0.15, 'symbol plugs', 'thud', { pitch: 'C3' }], [T.calc + 0.25, 'wordmark', 'bell', { pitch: 'E6' }],
      [T.demo, 'screen rises', 'whoosh', { len: 0.5, from: 500, to: 2600 }], [T.subir, 'step 1', 'tick'],
      [T.sent, 'doc 1', 'pop', { pitch: 'C5' }], [T.cheque, 'doc 2', 'pop', { pitch: 'E5' }], [T.ponto, 'doc 3', 'pop', { pitch: 'G5' }],
      [T.pedir, 'step 2', 'tick'], [T.pjc, '.PJC target', 'pop', { pitch: 'A5' }], [T.quero, 'prompt', 'type', { len: 0.9, n: 9 }],
      [T.clicar, 'step 3', 'click'], [T.aqui3 - 0.2, 'result', 'whoosh', { len: 0.35, from: 600, to: 2400 }],
      [T.arq, 'download link', 'bell', { pitch: 'A6' }], [T.pdf, 'PDF', 'pop', { pitch: 'D6' }],
      [T.cta, 'presenter back', 'whoosh', { len: 0.45, from: 2400, to: 500 }], [T.desc - 0.1, 'button', 'pop', { pitch: 'D5' }], [T.link, 'tap', 'click'],
      [STATE.edit.end_card - 0.42, 'push through', 'riser', { len: 0.45 }], [STATE.edit.end_card, 'end card', 'impact'],
      [STATE.edit.end_card + 0.55, 'pill clicks', 'click'], [STATE.edit.end_card + 0.7, 'logo', 'bell', { pitch: 'E6' }],
    ];
    HS.forEach(([s, ...r]) => HITS.push([M.U(s), ...r]));
  },
  prepare,
  post,
  draw(ctx, u, t, IMG) {
    const end = STATE.edit.end_card;
    if (t >= end) { endCard(ctx, t, end, IMG, 'LINK NA DESCRIÇÃO'); pushThrough(ctx, t, end); return; }
    background(ctx, t);
    const k = clamp(mode(t));
    // hook + CTA stage (card mode), slides away as the screen rises
    ctx.save(); ctx.globalAlpha = 1 - k; ctx.translate(540, 310); ctx.scale(1.1, 1.1); ctx.translate(-540, -310);
    if (t < T.demo + 0.8) {
      hub(ctx, t, { t0: T.pje - 0.3, t1: T.pois - 0.1, chips: [['PJe-Calc', T.pje], ['Claude', T.claude], ['GPT', T.gpt]] });
      statement(ctx, t, { t0: T.pois - 0.05, t1: T.calc - 0.35, small: 'POIS É, ISSO AGORA É', tSmall: T.pois, big: 'POSSÍVEL', tBig: T.poss, flareAt: T.poss + 0.1, cy: 560 });
      brandReveal(ctx, t, IMG, { t0: T.calc - 0.35, t1: null, tName: T.calc, labelText: 'COM O', tLabel: T.calc - 0.3, connect: true, cy: 500 });
    }
    if (t > T.cta - 0.6) {
      label(ctx, t, 'QUER APRENDER COMO FAZER ISSO?', 360, T.cta + 0.1, C.mute, 30);
      symbol(ctx, 540, 500, 120, E.inOutCubic(prog(t, T.cta, T.cta + 0.6)), sp(t, T.cta + 0.5, SPRING.bouncy));
      ctaButton(ctx, t, 'LINK NA DESCRIÇÃO', T.desc - 0.1, 690, T.link);
    }
    ctx.restore();
    // demo: the real screen
    const map = screenPanel(ctx, t);
    if (k > 0.01) {
      step(ctx, t, 1, 'Suba os documentos', T.subir, T.pedir - 0.1);
      docChips(ctx, t, [['Sentença', T.sent], ['Contracheque', T.cheque], ['Cartão de ponto', T.ponto]], T.pedir - 0.1);
      step(ctx, t, 2, 'Peça a liquidação em .PJC', T.pedir, T.sera - 0.1);
      step(ctx, t, 3, 'Envie e aguarde', T.clicar, T.aqui3 - 0.3);
      highlight(ctx, map, t, T.quero, T.clicar - 0.1, [40, 590, 520, 655], null);
      highlight(ctx, map, t, T.arq, T.pdf - 0.5, [40, 421, 520, 458], 'Arquivo .PJC pronto');
      highlight(ctx, map, t, T.pdf - 0.1, T.cta - 0.2, [40, 200, 700, 230], 'Também gera o PDF');
    }
    // presenter: full -> card -> picture-in-picture -> card
    const R = camRect(t);
    const z = (t < 1.0 ? 1 + 0.05 * t : 1.02 + 0.025 * Math.sin(t * 0.4)) * punch(t, [...STATE.edit.cuts_film.filter((c) => mode(c) < 0.5), T.poss]);
    presenter(ctx, t, R, z);
    tag(ctx, t, t < T.demo ? 'CALC MACHINE CONNECT' : t < T.cta ? 'NA PRÁTICA · DENTRO DO CLAUDE' : 'CALC MACHINE CONNECT', -1, IMG);
    const capY = t < T.demo ? lerp(1462, CARD.y - 44, clamp(sp(t, 1.0, SPRING.gentle))) : lerp(CARD.y - 44, 1440, k);
    captions(ctx, t, capY);
    pushThrough(ctx, t, end);
  },
});
