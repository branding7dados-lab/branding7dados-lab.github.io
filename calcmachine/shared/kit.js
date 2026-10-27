// Calc Machine Connect reels (Ensino Plus): shared kit. Every function paints from t alone (seconds);
// the four films (v1..v4/film.js) are timelines that place these pieces on their own words.
import * as M from './motion.js';

const { W, H, E, prog, lerp, clamp, spring, SPRING, wobble, font, layout, text, rrect, noise1 } = M;
export { M };

// Calc Machine identity: deep green, cream, one orange accent.
export const C = {
  bg: '#0E1B16', bg2: '#132620', panel: '#182D25', cream: '#F2F0E8', orange: '#E9552C',
  mute: '#8DA197', line: 'rgba(242,240,232,0.12)', ink: '#101E1A',
};
export const D = 'Display', UI = 'UI';
export const sp = (t, t0, cfg = SPRING.snappy) => spring(t - t0, cfg);
export const CARD = { x: 70, y: 830, w: 940, h: 900, r: 44 };

// ------------------------------------------------------------------ words + timeline helpers
export const STATE = { words: [], chunks: [], edit: null, clip: '' };
// film time of the n-th word whose text starts with str (case/punctuation insensitive)
export function at(str, n = 0) {
  const norm = (x) => x.toLowerCase().replace(/[,.?!]/g, '');
  const k = norm(str);
  const hits = STATE.words.filter((w) => norm(w.w).startsWith(k));
  if (!hits[n]) throw new Error(`word "${str}" #${n} not found`);
  return hits[n].t0;
}
// Panel life: spring in from a, exit over [b - 0.32, b]
export function life(t, a, b, cfg = SPRING.snappy) {
  const k = sp(t, a, cfg);
  const out = b == null ? 0 : E.inCubic(prog(t, b - 0.32, b));
  return { k, out, alpha: clamp(Math.min(k * 2, 1 - out)), on: t >= a - 0.05 && (b == null || t < b) };
}

// ------------------------------------------------------------------ video frames
const CACHE = new Map(), READY = new Map();
function frameSrc(t) {
  const n = Math.round(STATE.edit.talk * 30);
  const i = clamp(Math.floor(t * 30) + 1, 1, n);
  return `media/frames/${String(i).padStart(4, '0')}.jpg`;
}
async function load(src) {
  if (CACHE.has(src)) return CACHE.get(src);
  const im = new Image(); im.src = src;
  const p = im.decode().then(() => im, () => null);
  CACHE.set(src, p);
  if (CACHE.size > 48) CACHE.delete(CACHE.keys().next().value);
  return p;
}
export async function prepare(a, b) {
  for (const t of [a, (a + b) / 2, b]) {
    if (t > STATE.edit.talk + 0.6) continue;
    const s = frameSrc(t);
    READY.set(s, await load(s));
  }
  if (READY.size > 12) for (const k of [...READY.keys()].slice(0, READY.size - 12)) READY.delete(k);
}
const frameAt = (t) => READY.get(frameSrc(t));

// ------------------------------------------------------------------ primitives
export function shadowed(ctx, blur, color, oy, fn) { ctx.save(); ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.shadowOffsetY = oy; fn(); ctx.restore(); }
export function panel(ctx, x, y, w, h, r = 28, fillc = C.panel, stroke = C.line) {
  shadowed(ctx, 60, 'rgba(0,0,0,0.45)', 22, () => { rrect(ctx, x, y, w, h, r); ctx.fillStyle = fillc; ctx.fill(); });
  rrect(ctx, x + 1, y + 1, w - 2, h - 2, r); ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke();
}
export const ctext = (ctx, s, x, y, f, c, track = 0) => text(ctx, s, x, y, f, c, 'center', track);
export function check(ctx, x, y, s, p, color = C.cream, w = 0.17) {
  if (p <= 0) return;
  const pts = [[-0.32, 0.02], [-0.1, 0.24], [0.34, -0.24]];
  const L1 = Math.hypot(0.22, 0.22), L2 = Math.hypot(0.44, 0.48), lim = (L1 + L2) * clamp(p);
  ctx.save(); ctx.translate(x, y); ctx.beginPath(); ctx.moveTo(pts[0][0] * s, pts[0][1] * s);
  if (lim <= L1) ctx.lineTo(lerp(pts[0][0], pts[1][0], lim / L1) * s, lerp(pts[0][1], pts[1][1], lim / L1) * s);
  else { ctx.lineTo(pts[1][0] * s, pts[1][1] * s); const k = (lim - L1) / L2; ctx.lineTo(lerp(pts[1][0], pts[2][0], k) * s, lerp(pts[1][1], pts[2][1], k) * s); }
  ctx.lineWidth = s * w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.stroke(); ctx.restore();
}
export function badgeCheck(ctx, x, y, r, k, color = C.orange) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
  ctx.beginPath(); ctx.arc(0, 0, r, 0, M.TAU); ctx.fillStyle = color; ctx.fill();
  check(ctx, 0, 0, r * 1.5, clamp(k * 1.4 - 0.3)); ctx.restore();
}
// The Calc Machine symbol (geometry measured from the logo, unit = symbol height): a rounded C
// bracket and the orange pill that plugs into it. draw (0..1) strokes the bracket on; plug (0..1)
// slides the pill in from the right.
export function symbol(ctx, x, y, s, draw = 1, plug = 1, color = C.cream, alpha = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= alpha;
  const w = 0.19, left = -0.4 + w / 2, top = -0.5 + w / 2, bot = 0.5 - w / 2, end = 0.4 - w / 2, r = 0.33 - w / 2;
  const segs = [
    ['l', end, top, left + r, top], ['a', left + r, top + r, -Math.PI / 2, -Math.PI],
    ['l', left, top + r, left, bot - r], ['a', left + r, bot - r, Math.PI, Math.PI / 2],
    ['l', left + r, bot, end, bot],
  ];
  const len = (g) => (g[0] === 'l' ? Math.hypot(g[3] - g[1], g[4] - g[2]) : r * Math.PI / 2);
  let lim = segs.reduce((a, g) => a + len(g), 0) * clamp(draw);
  if (lim > 0) {
    ctx.beginPath(); ctx.moveTo(end, top);
    for (const g of segs) {
      if (lim <= 0) break;
      const k = clamp(lim / len(g)); lim -= len(g);
      if (g[0] === 'l') ctx.lineTo(lerp(g[1], g[3], k), lerp(g[2], g[4], k));
      else ctx.arc(g[1], g[2], r, g[3], lerp(g[3], g[4], k), true);
    }
    ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.stroke();
  }
  if (plug > 0) {
    const ph = 0.185, pw = 0.52, px = lerp(0.9, 0.13, E.outCubic(clamp(plug)));
    ctx.globalAlpha *= clamp(plug * 3);
    rrect(ctx, px, -ph / 2, pw, ph, ph / 2); ctx.fillStyle = C.orange; ctx.fill();
  }
  ctx.restore();
}

// ------------------------------------------------------------------ background
export function background(ctx, t) {
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  // warm key light up top, cool fill low: slow drift for a living frame
  const gx = 540 + 160 * Math.sin(t * 0.21), gy = 380 + 60 * Math.cos(t * 0.17);
  let g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 900);
  g.addColorStop(0, 'rgba(233,85,44,0.16)'); g.addColorStop(0.45, 'rgba(233,85,44,0.05)'); g.addColorStop(1, 'rgba(233,85,44,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createRadialGradient(540, 1900, 0, 540, 1900, 1100);
  g.addColorStop(0, 'rgba(40,90,70,0.35)'); g.addColorStop(1, 'rgba(40,90,70,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  // engineering grid, parallax-scrolling
  ctx.save(); ctx.strokeStyle = 'rgba(242,240,232,0.045)'; ctx.lineWidth = 1.5;
  const step = 90, oy = (t * 14) % step;
  for (let x = 0; x <= W; x += step) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, H); ctx.stroke(); }
  for (let y = -step; y <= H; y += step) { ctx.beginPath(); ctx.moveTo(0, y + oy); ctx.lineTo(W, y + oy); ctx.stroke(); }
  ctx.restore();
  // giant ghost symbol drifting behind everything
  symbol(ctx, 900 + 30 * Math.sin(t * 0.13), 1500 - t * 6, 1100, 1, 1, C.cream, 0.035);
}
export function tag(ctx, t, label, t0, IMG) {
  const k = sp(t, t0);
  const x = 72, y = 268;
  ctx.save(); ctx.globalAlpha = clamp(k);
  ctx.beginPath(); ctx.arc(x + 8, y - 9, 8 * k, 0, M.TAU); ctx.fillStyle = C.orange; ctx.fill();
  const f = font(26, 700, UI);
  const L = layout(ctx, label, f, 4);
  text(ctx, label, x + 30 - (1 - k) * 20, y, f, C.cream, 'left', 4);
  const lx = x + 50 + L.width, rx = W - 72 - 210;
  ctx.beginPath(); ctx.moveTo(lx, y - 9); ctx.lineTo(lerp(lx, rx, E.outCubic(clamp(k))), y - 9);
  ctx.lineWidth = 2; ctx.strokeStyle = C.line; ctx.stroke();
  if (IMG.ensino) { const h = 34, w = IMG.ensino.width * h / IMG.ensino.height; ctx.drawImage(IMG.ensino, W - 72 - w, y - h + 8, w, h); }
  ctx.restore();
}

// ------------------------------------------------------------------ presenter
export function presenter(ctx, t, R, zoom) {
  const im = frameAt(t);
  const { x, y, w, h, r } = R;
  shadowed(ctx, 90, 'rgba(0,0,0,0.6)', 30, () => { rrect(ctx, x, y, w, h, r); ctx.fillStyle = '#000'; ctx.fill(); });
  ctx.save(); rrect(ctx, x, y, w, h, r); ctx.clip();
  if (im) {
    const s = Math.max(w / im.width, h / im.height) * zoom;
    const full = clamp((1920 - h) / 1020);                 // 0 full frame .. 1 card
    const fy = lerp(960, 770, full), py = lerp(0.5, 0.4, full);      // eyes on the upper third
    const dw = im.width * s, dh = im.height * s;
    const dx = x + w / 2 - 540 * s, dy = Math.min(y, Math.max(y + h * py - fy * s, y + h - dh));
    ctx.drawImage(im, dx, dy, dw, dh);
  }
  const g = ctx.createLinearGradient(0, y + h * 0.5, 0, y + h);
  g.addColorStop(0, 'rgba(8,16,13,0)'); g.addColorStop(1, 'rgba(8,16,13,0.6)');
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  ctx.restore();
  rrect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, r); ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(242,240,232,0.22)'; ctx.stroke();
}
// card from full frame (until shrinkAt) into CARD; punch zooms on jump cuts and emphasis words
export function cardRect(t, shrinkAt) {
  const k = sp(t, shrinkAt, SPRING.gentle);
  return { x: lerp(0, CARD.x, k), y: lerp(0, CARD.y, k), w: lerp(W, CARD.w, k), h: lerp(H, CARD.h, k), r: lerp(0, CARD.r, clamp(k)) };
}
export function punch(t, times, amt = 0.1) {
  let z = 1;
  for (const c of times) z *= 1 + amt * Math.max(0, wobble(t - c, 1.1, 3.4));
  return z;
}

// ------------------------------------------------------------------ captions
export function buildCaptions(words, talkEnd) {
  const chunks = []; let cur = null;
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const brk = !cur || cur.words.length >= 3 || cur.chars + w.w.length > 16 || /[,.?!]$/.test(prev.w) || w.t0 - prev.t1 > 0.3;
    if (brk) { cur = { words: [], chars: 0 }; chunks.push(cur); }
    cur.words.push(w); cur.chars += w.w.length + 1;
  });
  chunks.forEach((c, i) => {
    c.t0 = c.words[0].t0 - 0.05;
    const nxt = chunks[i + 1], end = c.words[c.words.length - 1].t1 + 0.2;
    c.t1 = Math.min(nxt ? Math.min(end + 0.5, nxt.words[0].t0 - 0.05) : end + 0.3, talkEnd);
  });
  return chunks;
}
const KEY = /^(calc|machine|claude|chatgpt|gpt|gemini|pje-calc|\.pjc|ilimitad|automática|possível|impressionad|sensacional|impressionante|fixo|fgts|contracheque|cartão|ponto|connect|inteligência|artificial|fantástica|assinatura|agora)/;
export function captions(ctx, t, y = 1462) {
  const c = STATE.chunks.find((c) => t >= c.t0 && t < c.t1);
  if (!c) return;
  const size = 70, f = font(size, 700, D), gap = 20;
  const ws = c.words.map((w) => ({ ...w, width: layout(ctx, w.w, f, -1).width }));
  const total = ws.reduce((a, w) => a + w.width, 0) + gap * (ws.length - 1);
  const s = Math.min(1, 860 / total);
  let x = W / 2 - (total * s) / 2;
  const out = E.inCubic(prog(t, c.t1 - 0.1, c.t1));
  ws.forEach((w) => {
    const k = sp(t, w.t0 - 0.04, SPRING.bouncy);
    if (k > 0) {
      const key = KEY.test(w.w.toLowerCase());
      const cx = x + (w.width * s) / 2;
      ctx.save(); ctx.translate(cx, y + (1 - k) * 24 - out * 16); ctx.scale(s * (0.75 + 0.25 * k), s * (0.75 + 0.25 * k));
      ctx.globalAlpha = clamp(k * 2) * (1 - out);
      if (key) { rrect(ctx, -w.width / 2 - 14, -size * 0.8, w.width + 28, size * 1.04, 14); ctx.fillStyle = C.orange; ctx.fill(); }
      ctx.font = f; ctx.textAlign = 'center'; ctx.letterSpacing = '-1px';
      if (!key) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 4; }
      ctx.fillStyle = C.cream; ctx.fillText(w.w, 0, 0); ctx.letterSpacing = '0px';
      ctx.restore();
    }
    x += (w.width + gap) * s;
  });
}

// ------------------------------------------------------------------ kinetic type
export function title(ctx, t, str, x, y, size, t0, color = C.cream, align = 'center', weight = 700, stagger = 0.022) {
  const f = font(size, weight, D);
  const L = layout(ctx, str, f, -size * 0.035);
  const ox = align === 'center' ? x - L.width / 2 : x;
  L.glyphs.forEach((g, j) => {
    const k = sp(t, t0 + j * stagger, SPRING.bouncy);
    if (k <= 0) return;
    M.glyph(ctx, g.ch, ox + g.cx, y + (1 - k) * size * 0.55, f, color, 1, clamp(k), 0, (1 - clamp(k)) * 0.25);
  });
  return L.width;
}
export function label(ctx, t, str, y, t0, color = C.mute, size = 28) {
  const k = sp(t, t0);
  if (k <= 0) return;
  ctx.save(); ctx.globalAlpha *= clamp(k * 2);
  ctext(ctx, str, W / 2, y + (1 - k) * 16, font(size, 600, UI), color, 5);
  ctx.restore();
}
// fit a single display line to width
export function fitTitle(ctx, t, str, y, t0, max = 120, color = C.cream, width = 900) {
  const size = M.fitSize(ctx, str, 700, D, width, max, -0.035);
  return title(ctx, t, str, W / 2, y, size, t0, color);
}
export function flare(ctx, t, t0, y = 560) {
  // anamorphic streak: one horizontal light pass on a big beat
  const p = prog(t, t0 - 0.08, t0 + 0.55);
  if (p <= 0 || p >= 1) return;
  const a = Math.sin(p * Math.PI);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(0, 0, W, 0);
  const cx = lerp(-0.2, 1.2, E.outCubic(p));
  g.addColorStop(clamp(cx - 0.35), 'rgba(233,85,44,0)'); g.addColorStop(clamp(cx), `rgba(255,170,120,${0.55 * a})`); g.addColorStop(clamp(cx + 0.35), 'rgba(233,85,44,0)');
  ctx.fillStyle = g; ctx.fillRect(0, y - 3, W, 6);
  ctx.globalAlpha = 0.35 * a; ctx.fillRect(0, y - 26, W, 52);
  ctx.restore();
}

// ------------------------------------------------------------------ scene pieces
export function wordmark(ctx, IMG, cx, cy, h, reveal, connect = 0) {
  if (!IMG.word) return;
  const w = IMG.word.width * h / IMG.word.height;
  ctx.save(); ctx.beginPath(); ctx.rect(cx - w / 2 - 10, cy - h, (w + 20) * clamp(reveal), h * 2.2); ctx.clip();
  ctx.drawImage(IMG.word, cx - w / 2 + (1 - E.outCubic(clamp(reveal))) * -60, cy - h / 2, w, h);
  ctx.restore();
  if (connect > 0 && IMG.connect) {
    const ch = h * 0.46, cw = IMG.connect.width * ch / IMG.connect.height;
    ctx.save(); ctx.globalAlpha *= clamp(connect * 2);
    const spread = 1 + (1 - E.outCubic(clamp(connect))) * 0.4;
    ctx.translate(cx - w / 2, cy + h * 0.95); ctx.scale(spread, 1);
    ctx.drawImage(IMG.connect, 0, 0, cw, ch); ctx.restore();
  }
}
// AI tools as plain text chips (names, not their logos) wired into the symbol
export function hub(ctx, t, { t0, t1, chips, cy = 350, sub = null, lead = null }) {
  const L = life(t, t0, t1);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(0, (1 - L.k) * 50 - L.out * 140);
  const sx = 540, sy = cy + 180;
  const sk = sp(t, t0, SPRING.bouncy);
  // optional lead line where the chips will land; it lifts away as the first chip arrives
  if (lead) { ctx.save(); ctx.globalAlpha *= 1 - clamp((t - chips[0][1] + 0.15) / 0.2); label(ctx, t, lead[0], cy + 10, lead[1], C.mute, 30); ctx.restore(); }
  const pos = [[230, cy], [540, cy], [850, cy]];
  chips.forEach(([name, tc], i) => {
    const k = sp(t, tc - 0.05, SPRING.bouncy);
    if (k <= 0) return;
    const [x, y] = pos[i];
    // cable: bezier from chip to the symbol, drawn on, with a pulse running down it
    const cp = E.inOutCubic(prog(t, tc, tc + 0.45));
    const P = (u) => {
      const a = [x, y + 46], b = [x, y + 110], c = [sx + (x - sx) * 0.25, sy - 140], d = [sx + (x - sx) * 0.12, sy - 92];
      const m = 1 - u;
      return [m ** 3 * a[0] + 3 * m * m * u * b[0] + 3 * m * u * u * c[0] + u ** 3 * d[0], m ** 3 * a[1] + 3 * m * m * u * b[1] + 3 * m * u * u * c[1] + u ** 3 * d[1]];
    };
    ctx.beginPath(); for (let j = 0; j <= 30; j++) { const [px, py] = P((j / 30) * cp); j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(242,240,232,0.28)'; ctx.stroke();
    if (cp >= 1) for (let q = 0; q < 2; q++) {
      const u = ((t - tc) * 0.9 + q * 0.5) % 1, [px, py] = P(u);
      ctx.beginPath(); ctx.arc(px, py, 7, 0, M.TAU); ctx.fillStyle = C.orange; ctx.fill();
    }
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const f = font(42, 700, D), tw = layout(ctx, name, f).width + 96;
    panel(ctx, -tw / 2, -46, tw, 92, 46, C.panel, 'rgba(242,240,232,0.2)');
    ctx.beginPath(); ctx.arc(-tw / 2 + 40, 0, 11, 0, M.TAU); ctx.fillStyle = C.orange; ctx.fill();
    text(ctx, name, -tw / 2 + 64, 13, f, C.cream);
    ctx.restore();
  });
  // the symbol: plugged in once the first cable lands
  const pl = sp(t, chips[0][1] + 0.4, SPRING.bouncy);
  ctx.save(); ctx.translate(sx, sy); const pulse = 1 + 0.05 * chips.reduce((a, [, tc]) => a + Math.max(0, wobble(t - tc - 0.45, 2, 5)), 0);
  ctx.scale(sk * pulse, sk * pulse);
  shadowed(ctx, 70, 'rgba(233,85,44,0.35)', 0, () => { rrect(ctx, -95, -95, 190, 190, 46); ctx.fillStyle = C.panel; ctx.fill(); });
  rrect(ctx, -95, -95, 190, 190, 46); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(242,240,232,0.2)'; ctx.stroke();
  symbol(ctx, -6, 0, 120, E.inOutCubic(prog(t, t0, t0 + 0.6)), pl);
  ctx.restore();
  if (sub) {
    const [str, ts] = sub, k = sp(t, ts, SPRING.snappy);
    if (k > 0) {
      ctx.save(); ctx.globalAlpha *= clamp(k * 2); ctx.translate(540, sy + 160 + (1 - k) * 20);
      const f = font(34, 700, D), tw = layout(ctx, str, f).width + 100;
      rrect(ctx, -tw / 2, -40, tw, 80, 40); ctx.fillStyle = C.orange; ctx.fill();
      badgeCheck(ctx, -tw / 2 + 42, 0, 20, sp(t, ts + 0.1, SPRING.bouncy), C.ink);
      text(ctx, str, -tw / 2 + 74, 12, f, C.cream);
      ctx.restore();
    }
  }
  ctx.restore();
}
// a document card (generic paper, not a product screen); kind picks its body
export function doc(ctx, x, y, w, h, kind, k = 1, rot = 0, scan = -1) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(k, k);
  shadowed(ctx, 50, 'rgba(0,0,0,0.5)', 20, () => { rrect(ctx, -w / 2, -h / 2, w, h, 18); ctx.fillStyle = C.cream; ctx.fill(); });
  ctx.save(); rrect(ctx, -w / 2, -h / 2, w, h, 18); ctx.clip();
  const x0 = -w / 2 + 26, y0 = -h / 2 + 30;
  ctx.fillStyle = C.ink; ctx.font = font(w * 0.1, 700, D); ctx.textAlign = 'left';
  ctx.fillText(kind.title, x0, y0 + 18);
  rrect(ctx, x0, y0 + 36, w * 0.35, 8, 4); ctx.fillStyle = C.orange; ctx.fill();
  const rows = kind.rows || 7;
  for (let i = 0; i < rows; i++) {
    const ry = y0 + 70 + i * ((h - 120) / rows);
    if (kind.grid) for (let c = 0; c < 4; c++) { rrect(ctx, x0 + c * ((w - 52) / 4), ry, (w - 52) / 4 - 10, 14, 4); ctx.fillStyle = c === 0 ? 'rgba(16,30,26,0.55)' : 'rgba(16,30,26,0.22)'; ctx.fill(); }
    else { rrect(ctx, x0, ry, (w - 52) * (0.45 + 0.3 * ((i * 37) % 7) / 7), 12, 4); ctx.fillStyle = 'rgba(16,30,26,0.25)'; ctx.fill();
      if (kind.money) { rrect(ctx, w / 2 - 26 - 70, ry, 70, 12, 4); ctx.fillStyle = 'rgba(16,30,26,0.55)'; ctx.fill(); } }
  }
  if (scan >= 0 && scan <= 1) {
    const sy = -h / 2 + h * scan;
    const g = ctx.createLinearGradient(0, sy - 60, 0, sy);
    g.addColorStop(0, 'rgba(233,85,44,0)'); g.addColorStop(1, 'rgba(233,85,44,0.35)');
    ctx.fillStyle = g; ctx.fillRect(-w / 2, sy - 60, w, 60);
    ctx.fillStyle = C.orange; ctx.fillRect(-w / 2, sy - 2, w, 4);
  }
  ctx.restore(); ctx.restore();
}
export const DOCS = {
  ponto: { title: 'Cartão de ponto', grid: true, rows: 8 },
  cheque: { title: 'Contracheque', money: true, rows: 7 },
  fgts: { title: 'Extrato FGTS', money: true, rows: 8 },
};
// the generated .PJC file landing in PJe-Calc
export function pjcFile(ctx, t, { t0, t1, tPjc, tSys, tAuto, cy = 560 }) {
  const L = life(t, t0, t1);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(0, (1 - L.k) * 60 - L.out * 160);
  const k = sp(t, t0, SPRING.bouncy), x = 420, y = cy;
  ctx.save(); ctx.translate(x, y); ctx.scale(k, k); ctx.rotate(-0.04 + 0.01 * Math.sin(t));
  shadowed(ctx, 60, 'rgba(0,0,0,0.5)', 24, () => {
    ctx.beginPath(); ctx.moveTo(-150, -200); ctx.lineTo(80, -200); ctx.lineTo(150, -130); ctx.lineTo(150, 200); ctx.lineTo(-150, 200); ctx.closePath();
    ctx.fillStyle = C.cream; ctx.fill();
  });
  ctx.beginPath(); ctx.moveTo(80, -200); ctx.lineTo(80, -130); ctx.lineTo(150, -130); ctx.closePath(); ctx.fillStyle = '#D9D5C8'; ctx.fill();
  for (let i = 0; i < 5; i++) { rrect(ctx, -110, -120 + i * 34, [190, 150, 210, 120, 170][i], 12, 5); ctx.fillStyle = 'rgba(16,30,26,0.22)'; ctx.fill(); }
  const pk = sp(t, tPjc, SPRING.bouncy);
  if (pk > 0) { ctx.save(); ctx.translate(0, 110); ctx.scale(pk, pk); rrect(ctx, -110, -48, 220, 96, 20); ctx.fillStyle = C.orange; ctx.fill(); ctext(ctx, '.PJC', 0, 18, font(56, 700, D), C.cream); ctx.restore(); }
  ctx.restore();
  // system badge + automatic progress
  const bk = sp(t, tSys, SPRING.bouncy);
  if (bk > 0) {
    ctx.save(); ctx.translate(790, y - 70); ctx.scale(bk, bk);
    panel(ctx, -170, -60, 340, 120, 30);
    ctext(ctx, 'PJe-Calc', 18, 18, font(46, 700, D), C.cream);
    ctx.restore();
    // arrow from file to system
    const ap = E.inOutCubic(prog(t, tSys, tSys + 0.5));
    ctx.beginPath(); ctx.moveTo(580, y - 70); ctx.lineTo(lerp(580, 610, ap), y - 70); ctx.lineWidth = 6; ctx.strokeStyle = C.orange; ctx.lineCap = 'round'; ctx.stroke();
  }
  if (tAuto != null) {
    const ak = sp(t, tAuto, SPRING.snappy), pr = E.inOutCubic(prog(t, tAuto, tAuto + 1.1));
    if (ak > 0) {
      ctx.save(); ctx.globalAlpha *= clamp(ak * 2); ctx.translate(790, y + 90);
      text(ctx, 'AUTOMÁTICO', -170, -20, font(24, 700, UI), C.mute, 'left', 4);
      rrect(ctx, -170, 0, 340, 22, 11); ctx.fillStyle = 'rgba(242,240,232,0.12)'; ctx.fill();
      rrect(ctx, -170, 0, 340 * pr, 22, 11); ctx.fillStyle = C.orange; ctx.fill();
      text(ctx, `${Math.round(pr * 100)}%`, 170, -20, font(24, 700, UI), C.cream, 'right');
      badgeCheck(ctx, 200, 11, 24, sp(t, tAuto + 1.1, SPRING.bouncy));
      ctx.restore();
    }
  }
  ctx.restore();
}
// lemniscate drawn on (infinity without relying on a font glyph)
export function infinity(ctx, x, y, s, p, color = C.orange, w = 0.12) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.beginPath();
  const n = 120, m = Math.floor(n * clamp(p));
  for (let i = 0; i <= m; i++) {
    const a = (i / n) * M.TAU, d = 1 + Math.sin(a) ** 2;
    const px = (s * Math.cos(a)) / d, py = (s * Math.sin(a) * Math.cos(a)) / d;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.lineWidth = s * w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.stroke(); ctx.restore();
}
export function bigWord(ctx, t, str, t0, t1, y = 560, color = C.cream) {
  const L = life(t, t0 - 0.05, t1, SPRING.bouncy);
  if (!L.on) return;
  const size = M.fitSize(ctx, str, 700, D, 960, 190, -0.04);
  ctx.save(); ctx.globalAlpha = L.alpha;
  M.shake(ctx, t, t0, 10, 5, 0.15);
  // outlined echo behind, solid in front
  const f = font(size, 700, D);
  ctx.save(); ctx.font = f; ctx.textAlign = 'center'; ctx.letterSpacing = `${-size * 0.04}px`;
  const z = 1 + 0.25 * (1 - clamp(L.k));
  ctx.translate(W / 2, y); ctx.scale(z, z);
  ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(233,85,44,0.6)';
  ctx.strokeText(str, 0, -size * 0.95); ctx.strokeText(str, 0, size * 0.95);
  ctx.fillStyle = color; ctx.fillText(str, 0, size * 0.35); ctx.letterSpacing = '0px';
  ctx.restore(); ctx.restore();
}
export function ctaButton(ctx, t, str, t0, y, tap = null) {
  const k = sp(t, t0, SPRING.bouncy);
  if (k <= 0) return;
  const press = tap ? 1 - 0.08 * M.bump(t, tap, 0.12) : 1;
  ctx.save(); ctx.translate(W / 2, y); ctx.scale(k * press, k * press);
  const f = font(44, 700, D), tw = layout(ctx, str, f).width + 140;
  shadowed(ctx, 60, 'rgba(233,85,44,0.5)', 10, () => { rrect(ctx, -tw / 2, -56, tw, 112, 56); ctx.fillStyle = C.orange; ctx.fill(); });
  ctext(ctx, str, -20, 16, f, C.cream);
  // arrow nudging right
  const ax = tw / 2 - 58 + 8 * Math.sin(t * 6);
  ctx.beginPath(); ctx.moveTo(ax - 16, -14); ctx.lineTo(ax, 0); ctx.lineTo(ax - 16, 14); ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.strokeStyle = C.cream; ctx.stroke();
  ctx.restore();
  if (tap) {
    const rp = prog(t, tap - 0.05, tap + 0.5);
    if (rp > 0 && rp < 1) { ctx.beginPath(); ctx.arc(W / 2 + 60, y + 10, 30 + rp * 120, 0, M.TAU); ctx.lineWidth = 5; ctx.strokeStyle = `rgba(242,240,232,${(1 - rp) * 0.7})`; ctx.stroke(); }
  }
}

// ------------------------------------------------------------------ transition into the end card
// The symbol flies through the lens: it grows from the stage and its counter fills the frame.
export function pushThrough(ctx, t, tc) {
  const a = prog(t, tc - 0.42, tc), b = prog(t, tc, tc + 0.35);
  if (a <= 0 || b >= 1) return;
  ctx.save();
  if (t < tc) {
    const s = 200 * (40 ** E.inCubic(a));
    symbol(ctx, 540, 960, s, 1, 1, C.cream);
    ctx.globalAlpha = E.inQuad(clamp((a - 0.6) / 0.4)); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
  } else { ctx.globalAlpha = 1 - E.outCubic(b); ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H); }
  ctx.restore();
}
export function endCard(ctx, t, t0, IMG, line) {
  background(ctx, t);
  const lt = t - t0;
  // symbol draws, then the pill plugs in with a click
  const sx = 540, sy = 680;
  symbol(ctx, sx, sy, 300, E.inOutCubic(clamp(lt / 0.6)), sp(t, t0 + 0.55, SPRING.bouncy));
  flare(ctx, t, t0 + 0.6, sy);
  wordmark(ctx, IMG, 540, 1010, 100, E.inOutCubic(clamp((lt - 0.7) / 0.5)), clamp((lt - 1.0) / 0.4));
  const k = sp(t, t0 + 1.25);
  if (k > 0) {
    ctx.save(); ctx.globalAlpha = clamp(k * 2);
    ctext(ctx, line, 540, 1265 + (1 - k) * 20, font(34, 700, UI), C.orange, 6);
    ctx.restore();
  }
  const ek = sp(t, t0 + 1.5);
  if (ek > 0 && IMG.ensino) {
    ctx.save(); ctx.globalAlpha = clamp(ek * 2);
    ctext(ctx, 'APRESENTADO POR', 540, 1420, font(26, 600, UI), C.mute, 6);
    const h = 96, w = IMG.ensino.width * h / IMG.ensino.height;
    ctx.drawImage(IMG.ensino, 540 - w / 2, 1450 + (1 - ek) * 20, w, h);
    ctx.restore();
  }
}

// ------------------------------------------------------------------ grain + letterbox breath
export function post(ctx, u, t) {
  const f = Math.floor(t * 60);
  ctx.save(); ctx.globalAlpha = 0.05; ctx.globalCompositeOperation = 'overlay';
  for (let i = 0; i < 1100; i++) {
    const x = M.hash01(i, f) * W, y = M.hash01(i + 7000, f) * H;
    ctx.fillStyle = M.hash01(i + 9000, f) > 0.5 ? '#fff' : '#000'; ctx.fillRect(x, y, 3, 3);
  }
  ctx.restore();
  // soft vignette
  const g = ctx.createRadialGradient(540, 960, 500, 540, 960, 1250);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.38)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ------------------------------------------------------------------ film runner
// spec: { tag, shrinkAt, stage(ctx,t,IMG), punches:[t], endLine, hits:[[s,label,sfx,opts]] }
export function run(spec) {
  const HITS = spec.hits.map((h) => h.slice());
  M.film({
    fonts: [font(100, 700, D), font(100, 500, D), font(40, 600, UI), font(40, 700, UI)],
    images: { word: '../shared/assets/calc_word.png', connect: '../shared/assets/calc_connect.png', ensino: '../shared/assets/ensino_logo_dark.png' },
    hits: HITS,
    samples: () => 8,
    async init() {
      const [edit, words] = await Promise.all([fetch('edit.json').then((r) => r.json()), fetch('words.json').then((r) => r.json())]);
      STATE.edit = edit; STATE.words = words.words;
      STATE.chunks = buildCaptions(STATE.words, edit.talk);
      spec.init?.();
      const hs = spec.hits;
      hs.forEach((h, i) => { HITS[i][0] = M.U(typeof h[0] === 'function' ? h[0]() : h[0]); });
    },
    prepare,
    post,
    draw(ctx, u, t, IMG) {
      const end = STATE.edit.end_card;
      if (t >= end) { endCard(ctx, t, end, IMG, spec.endLine); pushThrough(ctx, t, end); return; }
      background(ctx, t);
      // stage plays 18% larger, anchored under the tag
      ctx.save(); ctx.translate(540, 310); ctx.scale(1.18, 1.18); ctx.translate(-540, -310);
      spec.stage(ctx, t, IMG);
      ctx.restore();
      const R = cardRect(t, spec.shrinkAt);
      let z = (t < spec.shrinkAt ? 1 + 0.05 * (t / spec.shrinkAt) : 1.02 + 0.025 * Math.sin(t * 0.4)) * punch(t, [...STATE.edit.cuts_film, ...(spec.punches || [])]);
      presenter(ctx, t, R, z);
      spec.over?.(ctx, t, IMG);
      tag(ctx, t, spec.tagAt(t), -1, IMG);
      captions(ctx, t);
      pushThrough(ctx, t, end);
    },
  });
}

// ------------------------------------------------------------------ composed scenes used by several films
// symbol + "calc machine" wordmark, revealed on the brand's name
export function brandReveal(ctx, t, IMG, { t0, t1, tName, cy = 560, labelText = null, tLabel = null, connect = false }) {
  const L = life(t, t0, t1);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(0, (1 - L.k) * 40 - L.out * 140);
  if (labelText) label(ctx, t, labelText, cy - 180, tLabel ?? t0);
  const d = E.inOutCubic(prog(t, tName - 0.35, tName + 0.25)), pl = sp(t, tName + 0.15, SPRING.bouncy);
  symbol(ctx, 540, cy - 20, 170, d, pl);
  flare(ctx, t, tName + 0.2, cy - 20);
  wordmark(ctx, IMG, 540, cy + 150, 92, E.inOutCubic(prog(t, tName, tName + 0.45)), connect ? clamp((t - tName - 0.4) / 0.4) : 0);
  ctx.restore();
}
// label + one big line (+ optional accent line)
export function statement(ctx, t, { t0, t1, small, tSmall, big, tBig, accent = null, tAccent = null, cy = 560, flareAt = null }) {
  const L = life(t, t0, t1);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(0, (1 - L.k) * 40 - L.out * 140);
  if (small) label(ctx, t, small, cy - 150, tSmall ?? t0);
  if (big && t >= tBig - 0.1) fitTitle(ctx, t, big, cy, tBig, 130, C.cream);
  if (accent && t >= tAccent - 0.1) fitTitle(ctx, t, accent, cy + 140, tAccent, 150, C.orange);
  if (flareAt != null) flare(ctx, t, flareAt, accent ? cy + 100 : cy - 40);
  ctx.restore();
}
