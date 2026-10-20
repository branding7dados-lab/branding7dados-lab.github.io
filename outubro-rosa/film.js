// Ensino Plus · Outubro Rosa: pure function of time. window.seek(t) paints frame t (see lib/motion.js).
// The edit is cut to the speech, so scenes are timed in seconds (t); HITS are converted to beats.
// docs/shotlist.md is the approved plan; edit.json places the clips; words.json times the captions.
import * as M from './lib/motion.js';

const { W, H, E, prog, lerp, clamp, spring, SPRING, wobble, font, layout, text, fill, rrect, mix, noise1, kf } = M;

// Brand: Ensino Plus identity board. Red is the one accent; the ribbon pink is Outubro Rosa's own.
const C = { red: '#E50003', ink: '#050A12', rose: '#FCEAEC', white: '#FFFFFF', pink: '#EC4E8C', mute: '#8A8F98', line: '#F3C9CE' };
const D = 'Display', UI = 'UI';
const sp = (t, t0, cfg = SPRING.snappy) => spring(t - t0, cfg);       // spring in seconds

// ------------------------------------------------------------------ timeline (seconds)
const CARD = { x: 70, y: 830, w: 940, h: 900, r: 46 };
const T = {
  shrink: 1.45, c2: 7.5, c3: 24.4, c4: 34.7, wipe1: 41.35, c5: 41.35, wipe2: 47.5, end: 47.5,
};
// [seconds, label, sfx, opts]: converted to beats in init() so sfx.mjs voices every accent
const HITS_S = [
  [0.0, 'open', 'blip', { pitch: 'C6' }],
  [1.45, 'card shrinks', 'whoosh', { len: 0.45, from: 400, to: 2200 }],
  [2.54, 'CÂNCER DE MAMA', 'pop', { pitch: 'A5' }],
  [4.12, 'briefcase', 'pop', { pitch: 'E5' }],
  [5.5, 'link line', 'tick'],
  [6.74, 'question mark', 'boing', { pitch: 'C5', to: 'G5' }],
  [7.3, 'card exits', 'whoosh', { len: 0.5, from: 2400, to: 500 }],
  [8.14, 'node diagnostico', 'tick'],
  [9.19, 'node tratamento', 'tick'],
  [11.3, 'afastamento card', 'whoosh', { len: 0.35, from: 600, to: 2600 }],
  [12.44, 'INSS stamp', 'thud', { pitch: 'C3' }],
  [14.3, 'calendar', 'whoosh', { len: 0.35, from: 2600, to: 700 }],
  [15.18, 'chip consultas', 'blip', { pitch: 'E6' }],
  [16.13, 'chip exames', 'blip', { pitch: 'G6' }],
  [17.15, 'shield', 'pop', { pitch: 'D5' }],
  [17.8, 'check 1', 'click'], [18.1, 'check 2', 'click'], [18.4, 'check 3', 'click'],
  [19.3, 'rotina + verbas', 'whoosh', { len: 0.35, from: 700, to: 2600 }],
  [22.85, 'verbas bars', 'coins'],
  [23.4, 'summary grid', 'pop', { pitch: 'C5' }],
  [24.2, 'presenter back', 'whoosh', { len: 0.45, from: 500, to: 2200 }],
  [26.64, 'PREVENCAO', 'pop', { pitch: 'A5' }],
  [28.6, 'plus', 'tick'],
  [31.22, 'INFORMACAO', 'pop', { pitch: 'C6' }],
  [32.1, 'equals', 'tick'],
  [33.26, 'DIREITOS', 'impact'],
  [34.7, 'cut cena 4', 'whoosh', { len: 0.35, from: 2400, to: 600 }],
  [35.0, 'advogada card', 'pop', { pitch: 'E5' }],
  [36.3, 'typing', 'type', { len: 0.85, n: 9 }],
  [37.21, 'check', 'bell', { pitch: 'E6' }],
  [38.16, 'heart', 'pop', { pitch: 'G5' }],
  [40.64, 'SEUS DIREITOS', 'pop', { pitch: 'C6' }],
  [41.35, 'arc wipe', 'riser', { len: 0.6 }],
  [42.15, 'tap seguir', 'click'],
  [42.3, 'seguindo', 'bell', { pitch: 'A5' }],
  [42.93, 'chips', 'blip', { pitch: 'D6' }],
  [44.6, 'posts', 'whoosh', { len: 0.35, from: 700, to: 2400 }],
  [47.5, 'end card', 'impact'],
  [48.0, 'logo', 'bell', { pitch: 'F6' }],
];
const HITS = HITS_S.map((h) => h.slice());

// keywords painted red in the captions
const KEY = new Set(['câncer', 'mama', 'trabalho', 'inss', 'consultas', 'exames', 'benefícios', 'rotina', 'verbas', 'trabalhistas',
  'prevenção', 'outubro', 'rosa', 'informação', 'direitos', 'trabalhadora', 'advogada', 'saúde', 'ensino', 'plus', 'trabalhista']);

let WORDS = [], CHUNKS = [], CLIPS = {};

// ------------------------------------------------------------------ video frames
const FRAME_CACHE = new Map();
function clipAt(t) {
  if (t < T.c2 + 0.25) return 'cena1';
  if (t < T.c3 - 0.3) return null;
  if (t < T.c4) return 'cena3';
  if (t < T.c5) return 'cena4';
  return 'cena5';
}
function frameKey(name, t) {
  const c = CLIPS[name];
  const n = Math.round((c.out - c.in) * 30);
  const i = clamp(Math.floor((t - c.at) * 30) + 1, 1, n);
  return `media/frames/${name}/${String(i).padStart(4, '0')}.jpg`;
}
async function loadFrame(src) {
  if (FRAME_CACHE.has(src)) { const v = FRAME_CACHE.get(src); FRAME_CACHE.delete(src); FRAME_CACHE.set(src, v); return v; }
  const im = new Image(); im.src = src;
  const p = im.decode().then(() => im, () => null);
  FRAME_CACHE.set(src, p);
  if (FRAME_CACHE.size > 48) FRAME_CACHE.delete(FRAME_CACHE.keys().next().value);
  return p;
}
const READY = new Map();
async function prepare(a, b) {
  for (const t of [a, (a + b) / 2, b]) {
    const name = clipAt(t);
    if (!name) continue;
    const src = frameKey(name, t);
    READY.set(src, await loadFrame(src));
  }
  if (READY.size > 12) for (const k of [...READY.keys()].slice(0, READY.size - 12)) READY.delete(k);
}
const frameImg = (t) => { const n = clipAt(t); return n ? READY.get(frameKey(n, t)) : null; };

// ------------------------------------------------------------------ drawing helpers
function shadowed(ctx, blur, color, oy, fn) {
  ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetY = oy; fn(); ctx.restore();
}
function card(ctx, x, y, w, h, r = 34, color = C.white) {
  shadowed(ctx, 50, 'rgba(120, 20, 40, 0.16)', 18, () => { rrect(ctx, x, y, w, h, r); ctx.fillStyle = color; ctx.fill(); });
}
function centerText(ctx, str, x, y, f, color, track = 0) { text(ctx, str, x, y, f, color, 'center', track); }
// Partial polyline: draws the first p (0..1) of a sampled path's length.
function samplePath(segs, n = 40) {
  const pts = [];
  for (const [p0, p1, p2, p3] of segs) for (let i = 0; i <= n; i++) {
    const s = i / n, a = (1 - s) ** 3, b = 3 * (1 - s) ** 2 * s, c = 3 * (1 - s) * s * s, d = s ** 3;
    pts.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, len, total: len[len.length - 1] };
}
function strokePart(ctx, P, p, x, y, s, width, color) {
  if (p <= 0) return;
  const lim = P.total * clamp(p);
  ctx.save(); ctx.translate(x, y);
  ctx.beginPath();
  ctx.moveTo(P.pts[0][0] * s, P.pts[0][1] * s);
  for (let i = 1; i < P.pts.length && P.len[i - 1] < lim; i++) {
    let [px, py] = P.pts[i];
    if (P.len[i] > lim) { const k = (lim - P.len[i - 1]) / (P.len[i] - P.len[i - 1]); px = lerp(P.pts[i - 1][0], px, k); py = lerp(P.pts[i - 1][1], py, k); }
    ctx.lineTo(px * s, py * s);
  }
  ctx.lineWidth = width; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.stroke();
  ctx.restore();
}
const RIBBON = samplePath([
  [[-0.46, 1.0], [-0.2, 0.62], [0.33, 0.2], [0.3, -0.32]],
  [[0.3, -0.32], [0.27, -0.8], [-0.27, -0.8], [-0.3, -0.32]],
  [[-0.3, -0.32], [-0.33, 0.2], [0.2, 0.62], [0.46, 1.0]],
]);
function ribbon(ctx, x, y, s, p, rot = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot);
  strokePart(ctx, RIBBON, p, 0, 0, s, s * 0.2, C.pink);
  strokePart(ctx, RIBBON, p, -s * 0.02, -s * 0.02, s, s * 0.05, 'rgba(255,255,255,0.35)');
  ctx.restore();
}
function heart(ctx, x, y, s, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath(); ctx.moveTo(0, 0.35);
  ctx.bezierCurveTo(-0.9, -0.25, -0.45, -0.95, 0, -0.45);
  ctx.bezierCurveTo(0.45, -0.95, 0.9, -0.25, 0, 0.35);
  ctx.fillStyle = color; ctx.fill(); ctx.restore();
}
function check(ctx, x, y, s, p, color = C.white, w = 0.16) {
  const P = samplePath([[[-0.32, 0.02], [-0.22, 0.12], [-0.16, 0.18], [-0.1, 0.24]], [[-0.1, 0.24], [0.06, 0.06], [0.2, -0.1], [0.34, -0.24]]], 10);
  strokePart(ctx, P, p, x, y, s, s * w, color);
}
function checkBadge(ctx, x, y, r, k, color = C.red) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, M.TAU); ctx.fillStyle = color; ctx.fill();
  check(ctx, 0, 0, r * 1.5, clamp(k * 1.4 - 0.3));
  ctx.restore();
}
function briefcase(ctx, x, y, s, color = C.ink) {
  ctx.save(); ctx.translate(x, y); ctx.lineWidth = s * 0.09; ctx.strokeStyle = color; ctx.lineJoin = 'round';
  rrect(ctx, -s * 0.55, -s * 0.3, s * 1.1, s * 0.8, s * 0.12); ctx.fillStyle = C.white; ctx.fill(); ctx.stroke();
  rrect(ctx, -s * 0.2, -s * 0.48, s * 0.4, s * 0.2, s * 0.06); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * 0.55, s * 0.02); ctx.lineTo(s * 0.55, s * 0.02); ctx.stroke();
  rrect(ctx, -s * 0.09, -s * 0.04, s * 0.18, s * 0.14, s * 0.03); ctx.fillStyle = C.red; ctx.fill();
  ctx.restore();
}
function scales(ctx, x, y, s, color = C.ink, swing = 0) {
  ctx.save(); ctx.translate(x, y); ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = s * 0.07; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(0, -s * 0.55); ctx.lineTo(0, s * 0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-s * 0.3, s * 0.5); ctx.lineTo(s * 0.3, s * 0.5); ctx.stroke();
  ctx.save(); ctx.translate(0, -s * 0.42); ctx.rotate(swing);
  ctx.beginPath(); ctx.moveTo(-s * 0.55, 0); ctx.lineTo(s * 0.55, 0); ctx.stroke();
  for (const sx of [-1, 1]) {
    ctx.save(); ctx.translate(sx * s * 0.5, 0); ctx.rotate(-swing);
    ctx.lineWidth = s * 0.035;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-s * 0.17, s * 0.38); ctx.moveTo(0, 0); ctx.lineTo(s * 0.17, s * 0.38); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, s * 0.38, s * 0.2, 0, Math.PI); ctx.fillStyle = C.red; ctx.fill();
    ctx.restore();
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(0, -s * 0.58, s * 0.07, 0, M.TAU); ctx.fillStyle = color; ctx.fill();
  ctx.restore();
}
// The brand's concentric arcs (identity board): thick quarter rings in red / rose.
function arcs(ctx, cx, cy, r0, rot, alpha = 1, colors = [C.red, '#F7C6CB', C.red, '#FBDDE0']) {
  ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, cy); ctx.rotate(rot);
  colors.forEach((c, i) => {
    const r = r0 * (1 - i * 0.2);
    if (r <= 0) return;
    ctx.beginPath(); ctx.arc(0, 0, r, 0.15 * i, Math.PI * 1.25 + 0.15 * i);
    ctx.lineWidth = r0 * 0.085; ctx.lineCap = 'butt'; ctx.strokeStyle = c; ctx.stroke();
  });
  ctx.restore();
}
// Panel life: enter spring from a, exit over [b - 0.3, b]. Returns {k, out, alpha}.
function life(t, a, b, cfg = SPRING.snappy) {
  const k = sp(t, a, cfg);
  const out = b == null ? 0 : E.inCubic(prog(t, b - 0.3, b));
  return { k, out, alpha: clamp(Math.min(k * 2, 1 - out)), on: t >= a && (b == null || t < b) };
}

// ------------------------------------------------------------------ stage background + chrome
function background(ctx, t) {
  fill(ctx, C.rose);
  // big arcs drift top-right / bottom-left: slow parallax under everything
  arcs(ctx, W + 170, -200, 470, 1.6 + t * 0.035, 0.9);
  arcs(ctx, -120, H + 80, 460, -1.2 - t * 0.025, 0.55, ['#F7C6CB', '#FBDDE0', '#F7C6CB']);
}
function tag(ctx, t, label, t0) {
  const k = sp(t, t0, SPRING.snappy);
  const x = 72, y = 268;
  ctx.save(); ctx.globalAlpha = clamp(k);
  ctx.beginPath(); ctx.arc(x + 8, y - 9, 8 * k, 0, M.TAU); ctx.fillStyle = C.red; ctx.fill();
  const L = layout(ctx, label, font(26, 700, UI), 5);
  text(ctx, label, x + 30 - (1 - k) * 20, y, font(26, 700, UI), C.ink, 'left', 5);
  const lx = x + 50 + L.width;
  ctx.beginPath(); ctx.moveTo(lx, y - 9); ctx.lineTo(lerp(lx, W - 200, E.outCubic(clamp(k))), y - 9);
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(5,10,18,0.18)'; ctx.stroke();
  ctx.restore();
}
function brandMark(ctx, t, IMG, a = 1) {
  if (!IMG.word) return;
  const h = 34, w = IMG.logo.width * h / IMG.logo.height;
  ctx.save(); ctx.globalAlpha = a; ctx.drawImage(IMG.logo, W - 72 - w, 268 - h + 6, w, h); ctx.restore();
}

// ------------------------------------------------------------------ presenter card
function presenter(ctx, t, rect, zoom, IMG) {
  const im = frameImg(t);
  const { x, y, w, h, r } = rect;
  shadowed(ctx, 70, 'rgba(150, 20, 40, 0.25)', 24, () => { rrect(ctx, x, y, w, h, r); ctx.fillStyle = C.white; ctx.fill(); });
  ctx.save(); rrect(ctx, x, y, w, h, r); ctx.clip();
  if (im) {
    // source focus (her face, ~y 1000 in the 1080x1920 frame) sits at 42% of the card height
    const s = Math.max(w / im.width, h / im.height) * zoom;
    const fx = 540, fy = lerp(960, 1010, clamp((1920 - h) / 1020));
    const dx = x + w / 2 - fx * s, dy = y + h * lerp(0.5, 0.42, clamp((1920 - h) / 1020)) - fy * s;
    ctx.drawImage(im, dx, Math.min(y, Math.max(dy, y + h - im.height * s)), im.width * s, im.height * s);
  } else { ctx.fillStyle = '#ddd'; ctx.fillRect(x, y, w, h); }
  // soft bottom shade so captions read
  const g = ctx.createLinearGradient(0, y + h * 0.45, 0, y + h);
  g.addColorStop(0, 'rgba(5,10,18,0)'); g.addColorStop(1, 'rgba(5,10,18,0.45)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.restore();
  rrect(ctx, x + 3, y + 3, w - 6, h - 6, r - 3); ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.stroke();
}
function cardRect(t) {
  const full = { x: 0, y: 0, w: W, h: H, r: 0 };
  let k = sp(t, T.shrink, SPRING.gentle);
  let R = { x: lerp(full.x, CARD.x, k), y: lerp(full.y, CARD.y, k), w: lerp(full.w, CARD.w, k), h: lerp(full.h, CARD.h, k), r: lerp(0, CARD.r, clamp(k)) };
  if (t >= 7.0 && t < 24.2) R = { ...CARD, y: CARD.y + E.inBack(prog(t, 7.25, 7.75), 1.3) * 1150 };
  if (t >= 24.2) R = { ...CARD, y: CARD.y + (1 - sp(t, 24.2, SPRING.snappy)) * 1150 };
  return R;
}

// ------------------------------------------------------------------ captions
function buildCaptions(words) {
  const chunks = [];
  let cur = null;
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const brk = !cur || cur.words.length >= 3 || cur.chars + w.w.length > 15 || /[,.?!]$/.test(prev.w) || w.t0 - prev.t1 > 0.3;
    if (brk) { cur = { words: [], chars: 0 }; chunks.push(cur); }
    cur.words.push(w); cur.chars += w.w.length + 1;
  });
  chunks.forEach((c, i) => {
    c.t0 = c.words[0].t0 - 0.06;
    const nxt = chunks[i + 1];
    const end = c.words[c.words.length - 1].t1 + 0.25;
    c.t1 = Math.min(nxt ? Math.min(end + 0.6, nxt.words[0].t0 - 0.06) : end + 0.4, c.words[0].end - 0.15);
  });
  return chunks;
}
function captions(ctx, t, mode) {
  const c = CHUNKS.find((c) => t >= c.t0 && t < c.t1);
  if (!c) return;
  const size = 74, f = font(size, 800, D);
  const sw = (s) => layout(ctx, s, f, -1.5).width;
  const gap = 20;
  const ws = c.words.map((w) => ({ ...w, width: sw(w.w) }));
  const total = ws.reduce((a, w) => a + w.width, 0) + gap * (ws.length - 1);
  const s = Math.min(1, 880 / total);
  const y = mode === 'stage' ? 1520 : CARD.y + CARD.h * 0.76;
  let x = W / 2 - (total * s) / 2;
  const out = E.inCubic(prog(t, c.t1 - 0.12, c.t1));
  ws.forEach((w) => {
    const k = sp(t, w.t0 - 0.04, SPRING.bouncy);
    if (k > 0) {
      const key = KEY.has(w.w.toLowerCase().replace(/[,.?!]/g, ''));
      const cx = x + (w.width * s) / 2;
      ctx.save(); ctx.translate(cx, y + (1 - k) * 26 + out * -20); ctx.scale(s * (0.7 + 0.3 * k) * (1 - out * 0.2), s * (0.7 + 0.3 * k));
      ctx.globalAlpha = clamp(k * 2) * (1 - out);
      ctx.font = f; ctx.textAlign = 'center'; ctx.letterSpacing = '-1.5px';
      if (mode === 'stage') {
        ctx.fillStyle = key ? C.red : C.ink;
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 4;
        ctx.fillStyle = key ? C.white : C.white;
        if (key) { // keyword sits on a red highlight bar
          ctx.save(); ctx.shadowColor = 'transparent';
          rrect(ctx, -w.width / 2 - 14, -size * 0.78, w.width + 28, size * 1.02, 14); ctx.fillStyle = C.red; ctx.fill(); ctx.restore();
        }
      }
      ctx.fillText(w.w, 0, 0); ctx.letterSpacing = '0px';
      ctx.restore();
    }
    x += (w.width + gap) * s;
  });
}

// ------------------------------------------------------------------ kinetic title (per glyph)
function title(ctx, t, str, x, y, size, t0, color = C.ink, align = 'left', weight = 800, stagger = 0.025) {
  const f = font(size, weight, D);
  const L = layout(ctx, str, f, -size * 0.03);
  const ox = align === 'center' ? x - L.width / 2 : x;
  L.glyphs.forEach((g, j) => {
    const k = sp(t, t0 + j * stagger, SPRING.bouncy);
    if (k <= 0) return;
    M.glyph(ctx, g.ch, ox + g.cx, y + (1 - k) * size * 0.6, f, color, 1, clamp(k));
  });
  return L.width;
}

// ------------------------------------------------------------------ S1 hook (0 - 7.5)
function stageHook(ctx, t, IMG) {
  // ribbon + CÂNCER DE MAMA, then ribbon <-> briefcase with a question mark
  const p = E.inOutCubic(prog(t, 1.7, 2.9));
  const move = sp(t, 4.0, SPRING.gentle);
  const exit = E.inBack(prog(t, 7.15, 7.6), 1.4);
  ctx.save(); ctx.translate(0, -exit * 700);
  const rx = lerp(230, 250, move), ry = lerp(560, 600, move);
  ribbon(ctx, rx, ry, lerp(190, 150, move), p, -0.08 + 0.04 * Math.sin(t * 1.4));
  if (t > 1.6) {
    const lab = sp(t, 1.68);
    ctx.save(); ctx.globalAlpha = clamp(lab) * (1 - move);
    text(ctx, 'O DIAGNÓSTICO DE', 420, 470 - move * 60, font(30, 700, UI), C.mute, 'left', 4);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = 1 - clamp(move * 1.6);
    title(ctx, t, 'CÂNCER', 412, 575, 112, 2.5, C.ink);
    title(ctx, t, 'DE MAMA', 412, 690, 112, 2.92, C.red);
    ctx.restore();
  }
  if (move > 0) {
    const bk = sp(t, 4.12, SPRING.bouncy);
    briefcase(ctx, 830, 600, 190 * bk, C.ink);
    // link line from ribbon to briefcase, drawn on "dentro da relação"
    const lp = E.outCubic(prog(t, 5.45, 6.2));
    if (lp > 0) {
      ctx.save(); ctx.setLineDash([16, 14]); ctx.lineDashOffset = -t * 40;
      ctx.beginPath(); ctx.moveTo(370, 610); ctx.lineTo(lerp(370, 720, lp), 610);
      ctx.lineWidth = 6; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.restore();
    }
    const q = sp(t, 6.7, SPRING.bouncy);
    if (q > 0) {
      ctx.save(); ctx.translate(545, 610); ctx.scale(q, q); ctx.rotate(0.15 * wobble(t - 6.7, 2, 4));
      ctx.beginPath(); ctx.arc(0, 0, 62, 0, M.TAU); ctx.fillStyle = C.red; ctx.fill();
      centerText(ctx, '?', 0, 30, font(92, 800, D), C.white);
      ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = clamp(move * 1.5);
    centerText(ctx, 'DIAGNÓSTICO', 250, 810, font(26, 700, UI), C.ink, 3);
    centerText(ctx, 'TRABALHO', 830, 810, font(26, 700, UI), C.ink, 3);
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ S2 narration (7.5 - 24.4)
function sectionHead(ctx, t, t0, small, big, y = 420) {
  const k = sp(t, t0);
  ctx.save(); ctx.globalAlpha = clamp(k * 2);
  centerText(ctx, small, W / 2, y - 80 + (1 - k) * 20, font(28, 700, UI), C.mute, 5);
  ctx.restore();
  title(ctx, t, big, W / 2, y + 20, 96, t0 + 0.05, C.ink, 'center');
}
function timeline(ctx, t) {
  const L = life(t, 7.55, 10.25);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(0, (1 - L.k) * 60 - L.out * 200);
  sectionHead(ctx, t, 7.6, 'DURANTE O', 'PROCESSO');
  const x0 = 180, x1 = 900, y = 800;
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.strokeStyle = C.line; ctx.stroke();
  const pr = E.inOutCubic(prog(t, 7.9, 9.6));
  ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(lerp(x0, x1, pr), y); ctx.strokeStyle = C.red; ctx.stroke();
  [[x0, 8.14, 'Diagnóstico'], [x1, 9.19, 'Tratamento']].forEach(([x, t0, lab]) => {
    const k = sp(t, t0, SPRING.bouncy);
    ctx.beginPath(); ctx.arc(x, y, 34 * k, 0, M.TAU); ctx.fillStyle = C.white; ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = C.red; ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, 14 * k, 0, M.TAU); ctx.fillStyle = C.red; ctx.fill();
    ctx.save(); ctx.globalAlpha = clamp(k); centerText(ctx, lab, x, y + 100 + (1 - k) * 20, font(44, 700, D), C.ink); ctx.restore();
  });
  // ribbon rides the line
  ribbon(ctx, lerp(x0, x1, pr), y - 120, 70, 1, 0.05 * Math.sin(t * 3));
  ctx.restore();
}
function afastamento(ctx, t) {
  const L = life(t, 10.05, 14.35);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(-L.out * 900, (1 - L.k) * 80);
  sectionHead(ctx, t, 10.1, 'QUESTÕES SOBRE', 'AFASTAMENTO');
  const ck = sp(t, 11.3, SPRING.snappy);
  const cx = W / 2, cy = 900;
  ctx.save(); ctx.translate(cx, cy + (1 - ck) * 300); ctx.rotate((1 - ck) * 0.15 - 0.03);
  card(ctx, -300, -230, 600, 460, 30);
  // document lines
  for (let i = 0; i < 6; i++) {
    const w = [420, 360, 400, 300, 380, 220][i];
    rrect(ctx, -240, -160 + i * 56, w * clamp(ck * 1.3 - i * 0.08), 18, 9); ctx.fillStyle = i === 0 ? C.ink : '#E9E3E5'; ctx.fill();
  }
  // INSS stamp slams in
  const s0 = 12.44, sk = prog(t, s0 - 0.14, s0);
  if (t > s0 - 0.14) {
    const sc = t < s0 ? lerp(2.4, 1, E.inCubic(sk)) : 1 + 0.08 * wobble(t - s0, 3, 6);
    ctx.save(); ctx.translate(90, 70); ctx.rotate(-0.16); ctx.scale(sc, sc); ctx.globalAlpha *= clamp(sk * 2);
    rrect(ctx, -160, -70, 320, 140, 18); ctx.lineWidth = 12; ctx.strokeStyle = C.red; ctx.stroke();
    centerText(ctx, 'INSS', 0, 38, font(110, 800, D), C.red, 4);
    ctx.restore();
  }
  ctx.restore();
  ctx.restore();
}
function calendar(ctx, t) {
  const L = life(t, 14.25, 17.15);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate((1 - L.k) * 900, -L.out * 160); ctx.scale(1 - L.out * 0.1, 1 - L.out * 0.1);
  sectionHead(ctx, t, 14.3, 'AUSÊNCIAS PARA', 'CONSULTAS');
  const x = 200, y = 580, w = 680, h = 560;
  card(ctx, x, y, w, h, 30);
  ctx.save(); rrect(ctx, x, y, w, h, 30); ctx.clip(); ctx.fillStyle = C.red; ctx.fillRect(x, y, w, 110); ctx.restore();
  text(ctx, 'OUTUBRO', x + 40, y + 72, font(46, 800, D), C.white, 'left', 2);
  ribbon(ctx, x + w - 70, y + 52, 46, 1);
  const marks = [3, 8, 10, 15, 17, 22, 24, 29];
  for (let d = 1; d <= 31; d++) {
    const col = (d + 2) % 7, row = Math.floor((d + 2) / 7);
    const cx = x + 70 + col * 90, cy = y + 170 + row * 82;
    const mi = marks.indexOf(d);
    if (mi >= 0) {
      const k = sp(t, 14.6 + mi * 0.24, SPRING.bouncy);
      if (k > 0) { ctx.beginPath(); ctx.arc(cx, cy - 10, 32 * k, 0, M.TAU); ctx.fillStyle = mi % 2 ? C.pink : C.red; ctx.fill(); }
      centerText(ctx, String(d), cx, cy, font(30, 700, UI), k > 0.5 ? C.white : C.ink);
    } else centerText(ctx, String(d), cx, cy, font(30, 500, UI), C.ink);
  }
  [['Consultas', 15.18, 250], ['Exames', 16.13, 620]].forEach(([lab, t0, cx]) => {
    const k = sp(t, t0, SPRING.bouncy);
    if (k <= 0) return;
    ctx.save(); ctx.translate(cx + 120, y + h + 70); ctx.scale(k, k);
    const fw = layout(ctx, lab, font(40, 700, D)).width + 110;
    shadowed(ctx, 30, 'rgba(120,20,40,0.2)', 10, () => { rrect(ctx, -fw / 2, -45, fw, 90, 45); ctx.fillStyle = C.ink; ctx.fill(); });
    checkBadge(ctx, -fw / 2 + 45, 0, 22, 1);
    text(ctx, lab, -fw / 2 + 82, 14, font(40, 700, D), C.white);
    ctx.restore();
  });
  ctx.restore();
}
function shield(ctx, t) {
  const L = life(t, 17.05, 19.35);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(0, (1 - L.k) * 120 - L.out * 200);
  sectionHead(ctx, t, 17.1, 'MANUTENÇÃO DE', 'BENEFÍCIOS');
  const k = sp(t, 17.15, SPRING.bouncy);
  ctx.save(); ctx.translate(290, 860); ctx.scale(k, k);
  ctx.beginPath(); ctx.moveTo(0, -170); ctx.bezierCurveTo(80, -120, 140, -125, 150, -120); ctx.bezierCurveTo(155, 40, 100, 120, 0, 175);
  ctx.bezierCurveTo(-100, 120, -155, 40, -150, -120); ctx.bezierCurveTo(-140, -125, -80, -120, 0, -170); ctx.closePath();
  shadowed(ctx, 40, 'rgba(229,0,3,0.3)', 14, () => { ctx.fillStyle = C.red; ctx.fill(); });
  heart(ctx, 0, 0, 120, C.white);
  ctx.restore();
  for (let i = 0; i < 3; i++) {
    const t0 = 17.8 + i * 0.3, ki = sp(t, t0, SPRING.snappy);
    const y = 730 + i * 130;
    ctx.save(); ctx.globalAlpha = clamp(ki * 2); ctx.translate((1 - ki) * 80, 0);
    card(ctx, 500, y, 420, 100, 26);
    checkBadge(ctx, 552, y + 50, 26, sp(t, t0 + 0.08, SPRING.bouncy));
    rrect(ctx, 600, y + 34, [250, 200, 280][i], 14, 7); ctx.fillStyle = C.ink; ctx.fill();
    rrect(ctx, 600, y + 60, [160, 210, 130][i], 12, 6); ctx.fillStyle = '#E9E3E5'; ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}
function rotinaVerbas(ctx, t) {
  const L = life(t, 19.25, 23.5);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(0, (1 - L.k) * 100 - L.out * 120);
  sectionHead(ctx, t, 19.3, 'OS IMPACTOS', 'NA ROTINA');
  // clock
  const ck = sp(t, 19.6, SPRING.bouncy), em = 1 + 0.1 * Math.max(0, wobble(t - 22.19, 2, 4));
  ctx.save(); ctx.translate(300, 850); ctx.scale(ck * em, ck * em);
  card(ctx, -190, -230, 380, 460, 30);
  ctx.beginPath(); ctx.arc(0, -30, 120, 0, M.TAU); ctx.lineWidth = 14; ctx.strokeStyle = C.ink; ctx.stroke();
  const spin = (t - 19.6) * 2.4;
  ctx.lineCap = 'round';
  ctx.save(); ctx.translate(0, -30); ctx.rotate(spin); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -88); ctx.lineWidth = 12; ctx.strokeStyle = C.red; ctx.stroke(); ctx.restore();
  ctx.save(); ctx.translate(0, -30); ctx.rotate(spin / 12); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -58); ctx.lineWidth = 14; ctx.strokeStyle = C.ink; ctx.stroke(); ctx.restore();
  centerText(ctx, 'Rotina', 0, 170, font(46, 700, D), C.ink);
  ctx.restore();
  // chart
  const bk = sp(t, 20.0, SPRING.bouncy), em2 = 1 + 0.1 * Math.max(0, wobble(t - 22.85, 2, 4));
  ctx.save(); ctx.translate(780, 850); ctx.scale(bk * em2, bk * em2);
  card(ctx, -190, -230, 380, 460, 30);
  const hs = [0.55, 0.8, 0.45, 0.95, 0.65];
  hs.forEach((v, i) => {
    const g = sp(t, 20.2 + i * 0.08, SPRING.bouncy);
    const hh = 200 * v * g * (1 + 0.12 * noise1(t * 1.5 + i * 3, 7) * clamp(t - 22.6));
    rrect(ctx, -140 + i * 58, 80 - hh, 42, hh, 10); ctx.fillStyle = i === 3 ? C.red : C.ink; ctx.fill();
  });
  centerText(ctx, 'R$', -120, -160, font(40, 800, D), C.red);
  centerText(ctx, 'Verbas', 0, 170, font(46, 700, D), C.ink);
  ctx.restore();
  ctx.restore();
}
function summary(ctx, t) {
  const L = life(t, 23.4, 24.55);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(0, -L.out * 500);
  centerText(ctx, 'SEUS DIREITOS EM PAUTA', W / 2, 400, font(30, 700, UI), C.mute, 5);
  const items = ['Afastamento', 'Consultas', 'Benefícios', 'Verbas'];
  items.forEach((lab, i) => {
    const k = sp(t, 23.4 + i * 0.06, SPRING.bouncy);
    const cx = 300 + (i % 2) * 480, cy = 620 + Math.floor(i / 2) * 330;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(k, k);
    card(ctx, -210, -130, 420, 260, 28);
    if (i === 0) { ctx.save(); ctx.rotate(-0.16); rrect(ctx, -90, -70, 180, 80, 12); ctx.lineWidth = 8; ctx.strokeStyle = C.red; ctx.stroke(); centerText(ctx, 'INSS', 0, -12, font(56, 800, D), C.red); ctx.restore(); }
    if (i === 1) { rrect(ctx, -70, -95, 140, 110, 14); ctx.fillStyle = C.red; ctx.fill(); rrect(ctx, -70, -60, 140, 75, 0); ctx.fillStyle = C.rose; ctx.fill(); }
    if (i === 2) heart(ctx, 0, -40, 70, C.red);
    if (i === 3) [0.5, 0.8, 0.6].forEach((v, j) => { rrect(ctx, -60 + j * 44, 0 - 100 * v, 32, 100 * v, 8); ctx.fillStyle = j === 1 ? C.red : C.ink; ctx.fill(); });
    centerText(ctx, lab, 0, 95, font(40, 700, D), C.ink);
    ctx.restore();
  });
  ctx.restore();
}

// ------------------------------------------------------------------ S3 (24.4 - 34.7)
function stagePrevencao(ctx, t) {
  const exit = E.inCubic(prog(t, 34.45, 34.75));
  ctx.save(); ctx.translate(0, -exit * 800);
  // 1: ribbon + PREVENÇÃO   2: + INFORMAÇÃO   3: = DIREITOS DA TRABALHADORA
  const up = sp(t, 31.9, SPRING.gentle);
  const rk = sp(t, 24.3, SPRING.snappy);
  ribbon(ctx, lerp(540, 150, sp(t, 26.4, SPRING.gentle)), lerp(560, 420, up), lerp(150, 90, sp(t, 26.4, SPRING.gentle)) * rk, E.inOutCubic(prog(t, 24.3, 25.2)));
  if (t > 26.5) title(ctx, t, 'PREVENÇÃO', 250, lerp(470, 400, up), lerp(104, 76, up), 26.6, C.ink);
  if (t > 28.0) {
    const k = sp(t, 28.0);
    ctx.save(); ctx.globalAlpha = clamp(k * 2) * (1 - clamp(up * 3));
    text(ctx, 'OUTUBRO ROSA É MOMENTO DE', 250, 345, font(26, 700, UI), C.mute, 'left', 4);
    ctx.restore();
  }
  // plus that turns into equals
  const pk = sp(t, 28.6, SPRING.bouncy);
  if (pk > 0) {
    const turn = E.inOutCubic(prog(t, 32.0, 32.4));
    ctx.save(); ctx.translate(lerp(170, 190, up), lerp(610, 470, up)); ctx.scale(pk * lerp(1, 0.75, up), pk * lerp(1, 0.75, up));
    ctx.beginPath(); ctx.arc(0, 0, 48, 0, M.TAU); ctx.fillStyle = C.red; ctx.fill();
    ctx.fillStyle = C.white;
    // + becomes =: the vertical bar folds flat and both bars part
    ctx.save(); ctx.translate(0, -10 * turn); rrect(ctx, -24, -6, 48, 12, 6); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate(0, 10 * turn); ctx.rotate(Math.PI / 2 * (1 - turn)); rrect(ctx, -24, -6, 48, 12, 6); ctx.fill(); ctx.restore();
    ctx.restore();
  }
  if (t > 31.1) title(ctx, t, 'INFORMAÇÃO', 250, lerp(645, 500, up), lerp(104, 76, up), 31.2, C.ink);
  if (t > 33.1) {
    const k = sp(t, 33.2, SPRING.bouncy);
    ctx.save(); ctx.globalAlpha = clamp(k * 2);
    rrect(ctx, 120, 560 + (1 - k) * 40, 840, 160, 30); ctx.fillStyle = C.red; ctx.fill();
    scales(ctx, 210, 645 + (1 - k) * 40, 90, C.white, 0.12 * Math.sin((t - 33.2) * 3) * Math.exp(-(t - 33.2)));
    ctx.restore();
    title(ctx, t, 'DIREITOS DA', 300, 630, 58, 33.26, C.white, 'left', 800, 0.015);
    title(ctx, t, 'TRABALHADORA', 300, 694, 58, 33.6, C.white, 'left', 800, 0.015);
  }
  ctx.restore();
}

// ------------------------------------------------------------------ S4 (34.7 - 41.35)
function stageAdvogada(ctx, t) {
  const enter = sp(t, 34.7, SPRING.snappy);
  const swap = sp(t, 37.6, SPRING.gentle);
  ctx.save(); ctx.translate(0, (1 - enter) * 800);
  // contact + search (slides away on "Cuidar")
  ctx.save(); ctx.translate(-swap * 1100, 0);
  const ck = sp(t, 35.0, SPRING.bouncy);
  ctx.save(); ctx.translate(W / 2, 470); ctx.scale(ck, ck);
  card(ctx, -440, -120, 880, 240, 34);
  ctx.beginPath(); ctx.arc(-320, 0, 80, 0, M.TAU); ctx.fillStyle = C.rose; ctx.fill();
  scales(ctx, -320, 8, 70, C.red, 0.1 * Math.sin(t * 2));
  text(ctx, 'Sua advogada', -205, -10, font(56, 800, D), C.ink);
  text(ctx, 'Direito do Trabalho', -205, 46, font(30, 600, UI), C.mute);
  ctx.restore();
  const sk = sp(t, 35.75, SPRING.snappy);
  ctx.save(); ctx.translate(W / 2, 700 + (1 - sk) * 60); ctx.globalAlpha = clamp(sk * 2);
  card(ctx, -440, -62, 880, 124, 62);
  ctx.beginPath(); ctx.arc(-370, -6, 22, 0, M.TAU); ctx.lineWidth = 7; ctx.strokeStyle = C.mute; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-354, 10); ctx.lineTo(-338, 26); ctx.stroke();
  const q = 'meus direitos', n = Math.floor(clamp((t - 36.3) / 0.85) * q.length);
  text(ctx, q.slice(0, n), -310, 16, font(44, 600, D), C.ink);
  const cw = layout(ctx, q.slice(0, n), font(44, 600, D)).width;
  if (t < 37.21 && Math.floor(t * 3) % 2 === 0) { ctx.fillStyle = C.red; ctx.fillRect(-306 + cw, -22, 5, 50); }
  checkBadge(ctx, 380, 0, 40, sp(t, 37.21, SPRING.bouncy));
  ctx.restore();
  ctx.restore();
  // saúde = direitos
  if (swap > 0.01) {
    ctx.save(); ctx.translate((1 - swap) * 1100, 0);
    const hk = sp(t, 38.1, SPRING.bouncy), beat = 1 + 0.08 * Math.max(0, Math.sin((t - 38.1) * 7)) * Math.exp(-(t - 38.1) * 0.7);
    heart(ctx, 190, 430, 150 * hk * beat, C.pink);
    title(ctx, t, 'CUIDAR DA', 320, 410, 70, 37.81, C.mute, 'left', 800, 0.02);
    title(ctx, t, 'SAÚDE', 320, 500, 110, 38.16, C.ink);
    const ek = sp(t, 38.8, SPRING.bouncy);
    ctx.save(); ctx.translate(190, 640); ctx.scale(ek, ek);
    ctx.beginPath(); ctx.arc(0, 0, 50, 0, M.TAU); ctx.fillStyle = C.red; ctx.fill();
    ctx.fillStyle = C.white; rrect(ctx, -24, -16, 48, 12, 6); ctx.fill(); rrect(ctx, -24, 4, 48, 12, 6); ctx.fill();
    ctx.restore();
    title(ctx, t, 'CONHECER', 320, 620, 70, 39.1, C.mute, 'left', 800, 0.02);
    title(ctx, t, 'SEUS DIREITOS', 320, 715, 100, 40.0, C.red, 'left', 800, 0.02);
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ S5 (41.35 - 47.5)
function stageSiga(ctx, t, IMG) {
  const k = sp(t, 41.5, SPRING.snappy), postsK = sp(t, 44.6, SPRING.gentle);
  ctx.save(); ctx.translate(0, (1 - k) * 200 - postsK * 900); ctx.globalAlpha = clamp(k * 2);
  // profile row
  card(ctx, 90, 330, 900, 210, 36);
  ctx.beginPath(); ctx.arc(200, 435, 68, 0, M.TAU); ctx.fillStyle = C.white; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = C.pink; ctx.stroke();
  if (IMG.emblem) { const s = 96; ctx.drawImage(IMG.emblem, 200 - s / 2, 435 - s / 2, s, s * IMG.emblem.height / IMG.emblem.width); }
  text(ctx, '@ensinoplus', 300, 425, font(50, 800, D), C.ink);
  text(ctx, 'Conhecimento que vira prática.', 300, 478, font(26, 600, UI), C.mute);
  // follow button + tap
  const tap = 42.15, fol = sp(t, 42.3, SPRING.bouncy);
  const press = 1 - 0.1 * M.bump(t, tap, 0.12);
  ctx.save(); ctx.translate(W / 2, 690); ctx.scale(press, press);
  const following = t >= 42.3;
  rrect(ctx, -450, -52, 900, 104, 52);
  ctx.fillStyle = following ? C.white : C.red; ctx.fill();
  if (following) { ctx.lineWidth = 5; ctx.strokeStyle = C.ink; ctx.stroke(); }
  if (following) { checkBadge(ctx, -110, 0, 26, fol, C.red); text(ctx, 'Seguindo', -70, 15, font(42, 800, D), C.ink); }
  else centerText(ctx, 'Seguir', 0, 14, font(42, 800, D), C.white);
  ctx.restore();
  // finger tap ripple
  const rp = prog(t, tap - 0.05, tap + 0.5);
  if (rp > 0 && rp < 1) { ctx.beginPath(); ctx.arc(600, 700, 30 + rp * 110, 0, M.TAU); ctx.lineWidth = 6; ctx.strokeStyle = `rgba(229,0,3,${(1 - rp) * 0.6})`; ctx.stroke(); }
  const fk = sp(t, 41.8, SPRING.snappy) * (1 - E.inCubic(prog(t, tap + 0.25, tap + 0.6)));
  if (fk > 0) { ctx.save(); ctx.globalAlpha *= clamp(fk); ctx.beginPath(); ctx.arc(600 + (1 - fk) * 160, 705 + (1 - fk) * 200, 34, 0, M.TAU); ctx.fillStyle = 'rgba(5,10,18,0.25)'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = C.white; ctx.stroke(); ctx.restore(); }
  // topic chips
  const chips = [['Direitos', 42.93, 100, 812], ['Cálculos trabalhistas', 43.2, 0, 812], ['Área trabalhista', 43.65, 0, 812]];
  const cf = font(34, 700, D);
  chips[1][2] = 100 + layout(ctx, chips[0][0], cf).width + 80;
  chips[2][2] = chips[1][2] + layout(ctx, chips[1][0], cf).width + 80;
  const cs = Math.min(1, 880 / (chips[2][2] - 100 + layout(ctx, chips[2][0], cf).width + 60));
  chips.forEach(([lab, t0, x, y], i) => {
    const ck2 = sp(t, t0, SPRING.bouncy);
    if (ck2 <= 0) return;
    const fw = layout(ctx, lab, cf).width + 60;
    ctx.save(); ctx.translate(100 + (x - 100) * cs + fw * cs / 2, y - 20); ctx.scale(ck2 * cs, ck2 * cs);
    rrect(ctx, -fw / 2, -38, fw, 76, 38); ctx.fillStyle = i === 1 ? C.red : C.ink; ctx.fill();
    centerText(ctx, lab, 0, 12, cf, C.white);
    ctx.restore();
  });
  ctx.restore();
  // real brand posts slide in (from the identity board)
  if (postsK > 0 && IMG.postA) {
    [[IMG.postA, 300, -0.05, 0], [IMG.postB, 780, 0.05, 0.12]].forEach(([im, cx2, rot, d]) => {
      const kk = sp(t, 44.6 + d, SPRING.snappy);
      const w = 400, h = w * im.height / im.width;
      const fl = 6 * Math.sin((t + d * 10) * 1.6);
      ctx.save(); ctx.translate(cx2, 600 + (1 - kk) * 700 + fl); ctx.rotate(rot * kk);
      shadowed(ctx, 50, 'rgba(120,20,40,0.25)', 20, () => { rrect(ctx, -w / 2, -h / 2, w, h, 24); ctx.fillStyle = C.white; ctx.fill(); });
      ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, 24); ctx.clip(); ctx.drawImage(im, -w / 2, -h / 2, w, h); ctx.restore();
      ctx.restore();
    });
  }
}

// ------------------------------------------------------------------ arc wipe (two structural cuts)
function arcWipe(ctx, t, tc) {
  const a = prog(t, tc - 0.38, tc), b = prog(t, tc, tc + 0.42);
  if (a <= 0 || b >= 1) return;
  const R = Math.hypot(W, H) * 1.05;
  const cols = [C.red, '#F7C6CB', C.white, C.red];
  ctx.save();
  if (t < tc) {
    cols.forEach((c, i) => {
      const r = R * E.inCubic(clamp(a * 1.25 - i * 0.08));
      ctx.beginPath(); ctx.arc(W, 0, r, 0, M.TAU); ctx.fillStyle = c; ctx.fill();
    });
  } else {
    // rings keep expanding: an annulus that opens from the corner, revealing the new shot
    cols.slice().reverse().forEach((c, i) => {
      const inner = R * 1.1 * E.outCubic(clamp(b * 1.2 - (cols.length - 1 - i) * 0.07));
      ctx.beginPath(); ctx.arc(W, 0, R * 1.3, 0, M.TAU); ctx.arc(W, 0, Math.max(0, inner), 0, M.TAU, true);
      ctx.fillStyle = c; ctx.globalAlpha = 1; ctx.fill('evenodd');
    });
  }
  ctx.restore();
}

// ------------------------------------------------------------------ end card (47.5 - 50)
function endCard(ctx, t, IMG) {
  fill(ctx, C.rose);
  arcs(ctx, W + 160, H + 120, 620 * sp(t, 47.5, SPRING.gentle), 2.4 + (t - 47.5) * 0.08, 1);
  arcs(ctx, -120, 160, 400 * sp(t, 47.6, SPRING.gentle), -0.4 - (t - 47.5) * 0.06, 0.6, ['#F7C6CB', C.red, '#FBDDE0']);
  if (!IMG.emblem) return;
  const eh = 230, ew = eh * IMG.emblem.width / IMG.emblem.height;
  const wh = eh, ww = wh * IMG.word.width / IMG.word.height;
  const scale = 0.78, total = (ew + 24 + ww) * scale;
  const x0 = W / 2 - total / 2, y0 = 700;
  // emblem: circular reveal, the "e" draws its ring
  const ek = E.inOutCubic(prog(t, 47.55, 48.15));
  const pop = sp(t, 47.55, SPRING.bouncy);
  ctx.save(); ctx.translate(x0 + ew * scale / 2, y0 + eh * scale / 2); ctx.scale(pop, pop);
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, eh, -Math.PI / 2, -Math.PI / 2 + M.TAU * ek); ctx.closePath(); ctx.clip();
  ctx.drawImage(IMG.emblem, -ew * scale / 2, -eh * scale / 2, ew * scale, eh * scale);
  ctx.restore();
  // wordmark slides out from behind the emblem
  const wk = sp(t, 47.95, SPRING.snappy);
  ctx.save(); ctx.beginPath(); ctx.rect(x0 + ew * scale + 6, 0, W, H); ctx.clip();
  ctx.drawImage(IMG.word, x0 + ew * scale + 24 * scale - (1 - wk) * ww * scale, y0, ww * scale, wh * scale);
  ctx.restore();
  // slogan in the brand's words
  const sk = sp(t, 48.35, SPRING.snappy);
  ctx.save(); ctx.globalAlpha = clamp(sk * 2);
  const f1 = font(56, 400, D), f2 = font(56, 800, D);
  const a = 'Conhecimento que vira ', b = 'prática.';
  const wa = layout(ctx, a, f1).width, wb = layout(ctx, b, f2).width;
  const sx = W / 2 - (wa + wb) / 2, sy = 1040 + (1 - sk) * 30;
  text(ctx, a, sx, sy, f1, C.ink); text(ctx, b, sx + wa, sy, f2, C.red);
  ctx.restore();
  const hk = sp(t, 48.7, SPRING.snappy);
  ctx.save(); ctx.globalAlpha = clamp(hk * 2);
  const hw = layout(ctx, '@ensinoplus', font(40, 700, UI)).width + 90;
  rrect(ctx, W / 2 - hw / 2, 1110 + (1 - hk) * 30, hw, 84, 42); ctx.fillStyle = C.red; ctx.fill();
  centerText(ctx, '@ensinoplus', W / 2, 1166 + (1 - hk) * 30, font(40, 700, UI), C.white);
  ctx.restore();
  // ribbon signs off beside the handle
  ribbon(ctx, W / 2, 470, 80, E.inOutCubic(prog(t, 48.8, 49.6)));
}

// ------------------------------------------------------------------ frame
function draw(ctx, u, t, IMG) {
  if (t >= T.end) { endCard(ctx, t, IMG); arcWipe(ctx, t, T.wipe2); return; }
  background(ctx, t);
  const narr = t >= 7.45 && t < 24.45;
  // section tag + brand mark
  const tags = [[0, 'OUTUBRO ROSA'], [7.5, 'SEUS DIREITOS'], [24.4, 'PREVENÇÃO'], [34.7, 'ORIENTAÇÃO'], [41.35, 'SIGA']];
  const cur = tags.filter(([a]) => t >= a).pop();
  // stage content
  if (t < 7.7) stageHook(ctx, t, IMG);
  if (narr) {
    // the narration owns the whole frame: its panels play 15% larger, anchored under the tag
    ctx.save(); ctx.translate(540, 300); ctx.scale(1.15, 1.15); ctx.translate(-540, -300);
    timeline(ctx, t); afastamento(ctx, t); calendar(ctx, t); shield(ctx, t); rotinaVerbas(ctx, t); summary(ctx, t);
    ctx.restore();
  }
  if (t >= 24.4 && t < 34.75) stagePrevencao(ctx, t);
  if (t >= 34.7 && t < 41.35) stageAdvogada(ctx, t);
  if (t >= 41.35) stageSiga(ctx, t, IMG);
  // presenter
  const R = cardRect(t);
  if (R.y < H) {
    let z = 1.0 + 0.03 * Math.sin(t * 0.35);                         // slow breathing push
    if (t < T.shrink) z = 1 + 0.06 * (t / T.shrink);                     // hook push-in
    z *= 1 + 0.06 * Math.max(0, wobble(t - 34.7, 1.2, 4)) + 0.05 * Math.max(0, wobble(t - 24.4, 1.2, 4));
    if (t >= 41.35) z *= 1 + 0.08 * E.inOutCubic(prog(t, 41.4, 47.4));
    presenter(ctx, t, R, z * 1.12, IMG);
  }
  tag(ctx, t, cur[1], cur[0] + (cur[0] === 0 ? -1 : 0.05));
  brandMark(ctx, t, IMG, clamp(sp(t, 0.2)));
  captions(ctx, t, narr && !(t < 7.75 || t > 24.2) ? 'stage' : 'card');
  arcWipe(ctx, t, T.wipe1);
  if (t > T.wipe2 - 0.4) arcWipe(ctx, t, T.wipe2);
}

function post(ctx, u, t) {
  // fine film grain, seeded per frame (survives the motion-blur average because it runs after it)
  const f = Math.floor(t * 60);
  ctx.save(); ctx.globalAlpha = 0.035; ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 900; i++) {
    const x = M.hash01(i, f) * W, y = M.hash01(i + 7000, f) * H;
    ctx.fillStyle = M.hash01(i + 9000, f) > 0.5 ? '#fff' : '#000'; ctx.fillRect(x, y, 3, 3);
  }
  ctx.restore();
}

M.film({
  fonts: [font(100, 800, D), font(100, 400, D), font(40, 700, UI), font(40, 500, UI)],
  images: {
    logo: 'assets/logo.png', emblem: 'assets/logo_emblem.png', word: 'assets/logo_word.png',
    postA: 'assets/post_calculos.png', postB: 'assets/post_teoria.png',
  },
  hits: HITS,
  samples: (t) => 8,
  async init() {
    const [edit, words] = await Promise.all([fetch('edit.json').then((r) => r.json()), fetch('words.json').then((r) => r.json())]);
    CLIPS = edit.clips;
    WORDS = [];
    for (const [name, c] of Object.entries(CLIPS)) {
      for (const w of words[name].words) {
        const t0 = w.t0 - c.in + c.at, t1 = w.t1 - c.in + c.at;
        WORDS.push({ w: w.w, t0, t1, end: c.at + (c.out - c.in) });
      }
    }
    CHUNKS = buildCaptions(WORDS);
    HITS.forEach((h, i) => { h[0] = M.U(HITS_S[i][0]); });
  },
  prepare,
  post,
  draw,
});
