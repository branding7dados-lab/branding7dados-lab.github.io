// b7.js: Branding7 kit shared by both reels (palette, type, cards, icons, logo, CTA).
// Everything here is a pure function of its arguments: no state between frames.
import * as M from './motion.js';

const { W, H, TAU, clamp, lerp, prog, springU, SPRING, E, rrect, cover, mix, noise1, hash01 } = M;

export const C = {
  navy: '#0B0F1A', navy2: '#141A30', light: '#F5F7FA', white: '#FFFFFF',
  blue: '#1A2ACC', purple: '#6A2BD9', magenta: '#E02CA9', ink: '#0B0F1A',
  grayD: '#1B2133', grayD2: '#2A3148', grayL: '#E2E5EC', grayL2: '#CBD0DA', mute: '#8A90A6', green: '#2BD97C',
};
export const F = 'Poppins';
export const font = (size, weight = 700) => M.font(size, weight, F);
export const FONTS = [font(100, 400), font(100, 500), font(100, 600), font(100, 700), font(100, 800)];

// shared assets, loaded by M.film({ images })
export const IMAGES = {
  lampBody: '../shared/assets/lampada_corpo.png',
  lamp: '../shared/assets/lampada.png',
  word: '../shared/assets/wordmark_branco.png',
  p01: '../shared/assets/01.jpg', p02: '../shared/assets/02.jpg', p03: '../shared/assets/03.jpg',
  p04: '../shared/assets/04.jpg', p05: '../shared/assets/05.jpg', p06: '../shared/assets/06.jpg',
  p07: '../shared/assets/07.jpg',
};
// the real client reels (views as printed on each screenshot), biggest first
export const PRINTS = [
  { k: 'p04', views: 687000, label: '687 mil' },
  { k: 'p02', views: 224000, label: '224 mil' },
  { k: 'p05', views: 123000, label: '123 mil' },
  { k: 'p01', views: 29600, label: '29,6 mil' },
  { k: 'p07', views: 27800, label: '27,8 mil' },
  { k: 'p06', views: 23800, label: '23,8 mil' },
  { k: 'p03', views: 10000, label: '10 mil' },
];
// lamp dot geometry (fractions of the lamp image), from lampada_dots.json
export const LAMP = {
  aspect: 2273 / 1921,
  dots: [
    { x: 0.0367, y: 0.1611, r: 0.0361, color: '#112089' }, { x: 0.1906, y: 0.0996, r: 0.0361, color: '#112089' },
    { x: 0.3902, y: 0.0996, r: 0.0805, color: '#272088' }, { x: 0.1906, y: 0.2382, r: 0.0527, color: '#232088' },
    { x: 0.3091, y: 0.3348, r: 0.0663, color: '#3F1F87' }, { x: 0.1184, y: 0.3763, r: 0.0361, color: '#2D1F88' },
  ],
};

export const sec = (t) => M.U(t);   // seconds (VO time) -> beats
export const fmtInt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ---------------------------------------------------------------- backgrounds
export function bgDark(ctx, u, seed = 1) {
  ctx.fillStyle = C.navy; ctx.fillRect(0, 0, W, H);
  const glow = (x, y, r, col, a) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col + Math.round(a * 255).toString(16).padStart(2, '0'));
    g.addColorStop(1, col + '00');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  };
  glow(W * (0.85 + 0.05 * noise1(u * 0.05, seed)), H * (0.12 + 0.04 * noise1(u * 0.04, seed + 3)), W * 0.9, C.purple, 0.22);
  glow(W * (0.1 + 0.05 * noise1(u * 0.05, seed + 7)), H * (0.92 + 0.03 * noise1(u * 0.04, seed + 9)), W * 0.8, C.magenta, 0.14);
  // the board's texture: thin outlined circles drifting
  ctx.save(); ctx.strokeStyle = 'rgba(160,140,255,0.07)'; ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const x = W * hash01(i, seed + 21) + 30 * noise1(u * 0.03 + i, seed);
    const y = H * hash01(i, seed + 33) + 40 * noise1(u * 0.03 + i, seed + 5);
    ctx.beginPath(); ctx.arc(x, y, 80 + 220 * hash01(i, seed + 44), 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
export function bgLight(ctx, u) {
  ctx.fillStyle = C.light; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(W * 0.8, H * 0.15, 0, W * 0.8, H * 0.15, W);
  g.addColorStop(0, 'rgba(106,43,217,0.07)'); g.addColorStop(1, 'rgba(106,43,217,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- colour helpers
export function brandGrad(ctx, x0, y0, x1, y1, stops = [C.blue, C.purple, C.magenta]) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}
// text colours: w white, k ink, m magenta, b blue, g brand gradient (purple->magenta), gb (blue->purple)
function paint(ctx, key, x, w, y, size) {
  if (key === 'g') return brandGrad(ctx, x, y - size, x + w, y, ['#8A4BFF', C.magenta]);
  if (key === 'gb') return brandGrad(ctx, x, y - size, x + w, y, ['#3646FF', '#8A4BFF']);
  return { w: C.white, k: C.ink, m: C.magenta, b: C.blue, mute: C.mute }[key] || key;
}

// ---------------------------------------------------------------- word-synced type
// lines: [{ size, weight, words: [[text, tSec, colorKey], ...], dy? }]
// Each word rises out of its line's mask when it is spoken (tSec, VO time).
// opts: x, y (first baseline), align 'left'|'center', lineGap, lead (beats the move starts early)
export function words(ctx, u, lines, { x, y, align = 'left', lineGap = 1.08, lead = 0.25, alpha = 1, strike = null } = {}) {
  let base = y;
  const out = [];
  lines.forEach((ln, li) => {
    const size = ln.size, f = font(size, ln.weight || 700);
    ctx.font = f;
    const space = ctx.measureText(' ').width;
    const ws = ln.words.map(([s]) => ctx.measureText(s).width);
    const total = ws.reduce((a, b) => a + b, 0) + space * (ws.length - 1);
    let cx = align === 'center' ? x - total / 2 : x;
    if (li > 0) base += (ln.dy ?? size * lineGap);
    ctx.save();
    ctx.beginPath(); ctx.rect(0, base - size * 1.12, W, size * 1.45); ctx.clip();
    ln.words.forEach(([s, ts, col], i) => {
      const k = springU(u, sec(ts) - lead, SPRING.snappy);
      if (k > 0) {
        ctx.globalAlpha = alpha * clamp(k * 1.6);
        ctx.font = f; ctx.textAlign = 'left';
        ctx.fillStyle = paint(ctx, col || 'w', cx, ws[i], base, size);
        ctx.fillText(s, cx, base + (1 - k) * size * 1.05);
      }
      out.push({ s, x: cx, w: ws[i], base, size });
      cx += ws[i] + space;
    });
    ctx.restore();
  });
  ctx.globalAlpha = 1;
  return out;   // word boxes, for strikes / underlines / anchors
}
// hand-drawn underline / strike under a word box, drawn on between beats a..b
export function swash(ctx, box, a, b, u, color = C.magenta, { strike = false, w = 10 } = {}) {
  const p = E.outCubic(prog(u, a, b));
  if (p <= 0) return;
  const y = strike ? box.base - box.size * 0.33 : box.base + box.size * 0.2;
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath();
  const x0 = box.x - 8, x1 = box.x + (box.w + 16) * p - 8;
  ctx.moveTo(x0, y + 4);
  ctx.quadraticCurveTo((x0 + x1) / 2, y - 10, x1, y - 2);
  ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------- icons (line icons, 1 unit = size)
export function icon(ctx, name, x, y, s, color, lw = 0.08) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const P = () => ctx.beginPath();
  switch (name) {
    case 'eye':
      P(); ctx.moveTo(-0.5, 0); ctx.quadraticCurveTo(0, -0.42, 0.5, 0); ctx.quadraticCurveTo(0, 0.42, -0.5, 0); ctx.stroke();
      P(); ctx.arc(0, 0, 0.14, 0, TAU); ctx.fill(); break;
    case 'heart':
      P(); ctx.moveTo(0, 0.38);
      ctx.bezierCurveTo(-0.55, 0.0, -0.45, -0.45, 0, -0.18);
      ctx.bezierCurveTo(0.45, -0.45, 0.55, 0.0, 0, 0.38); ctx.fill(); break;
    case 'bars':
      [[-0.32, 0.1], [-0.06, -0.1], [0.2, -0.32]].forEach(([bx, top]) => { P(); ctx.roundRect(bx, top, 0.16, 0.4 - top, 0.03); ctx.fill(); }); break;
    case 'target':
      [0.42, 0.27, 0.11].forEach((r) => { P(); ctx.arc(0, 0.04, r, 0, TAU); ctx.stroke(); });
      P(); ctx.moveTo(0, 0.04); ctx.lineTo(0.42, -0.38); ctx.stroke();
      P(); ctx.moveTo(0.42, -0.38); ctx.lineTo(0.42, -0.2); ctx.moveTo(0.42, -0.38); ctx.lineTo(0.24, -0.38); ctx.stroke(); break;
    case 'bulb':
      P(); ctx.arc(0, -0.08, 0.3, Math.PI * 0.8, Math.PI * 2.2); ctx.lineTo(0.12, 0.28); ctx.lineTo(-0.12, 0.28); ctx.closePath(); ctx.stroke();
      P(); ctx.moveTo(-0.1, 0.4); ctx.lineTo(0.1, 0.4); ctx.stroke();
      for (let i = 0; i < 5; i++) { const a = Math.PI * (1.1 + i * 0.2); P(); ctx.moveTo(Math.cos(a) * 0.42, -0.08 + Math.sin(a) * 0.42); ctx.lineTo(Math.cos(a) * 0.52, -0.08 + Math.sin(a) * 0.52); ctx.stroke(); }
      break;
    case 'rocket':
      ctx.rotate(Math.PI / 4);
      P(); ctx.moveTo(0, -0.5); ctx.quadraticCurveTo(0.2, -0.25, 0.16, 0.2); ctx.lineTo(-0.16, 0.2); ctx.quadraticCurveTo(-0.2, -0.25, 0, -0.5); ctx.stroke();
      P(); ctx.arc(0, -0.12, 0.07, 0, TAU); ctx.stroke();
      P(); ctx.moveTo(-0.16, 0.05); ctx.lineTo(-0.3, 0.25); ctx.lineTo(-0.16, 0.2); ctx.moveTo(0.16, 0.05); ctx.lineTo(0.3, 0.25); ctx.lineTo(0.16, 0.2); ctx.stroke();
      P(); ctx.moveTo(0, 0.28); ctx.lineTo(0, 0.42); ctx.stroke(); break;
    case 'people':
      P(); ctx.arc(0, -0.18, 0.13, 0, TAU); ctx.stroke();
      P(); ctx.arc(0, 0.36, 0.26, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
      P(); ctx.arc(-0.3, -0.1, 0.09, 0, TAU); ctx.arc(0.3, -0.1, 0.09, 0, TAU); ctx.stroke(); break;
    case 'camera':
      P(); ctx.roundRect(-0.42, -0.24, 0.84, 0.56, 0.1); ctx.stroke();
      P(); ctx.arc(0, 0.04, 0.15, 0, TAU); ctx.stroke();
      P(); ctx.moveTo(-0.16, -0.24); ctx.lineTo(-0.1, -0.36); ctx.lineTo(0.1, -0.36); ctx.lineTo(0.16, -0.24); ctx.stroke(); break;
    case 'clapper':
      P(); ctx.roundRect(-0.4, -0.1, 0.8, 0.5, 0.06); ctx.stroke();
      P(); ctx.moveTo(-0.4, -0.1); ctx.lineTo(-0.36, -0.36); ctx.lineTo(0.38, -0.44); ctx.lineTo(0.4, -0.18); ctx.stroke();
      for (let i = 0; i < 3; i++) { P(); ctx.moveTo(-0.2 + i * 0.22, -0.39 + i * -0.02); ctx.lineTo(-0.1 + i * 0.22, -0.12); ctx.stroke(); }
      P(); ctx.moveTo(-0.2, 0.12); ctx.lineTo(0.2, 0.12); ctx.moveTo(-0.2, 0.24); ctx.lineTo(0.1, 0.24); ctx.stroke(); break;
    case 'edit':
      P(); ctx.roundRect(-0.4, -0.3, 0.62, 0.7, 0.08); ctx.stroke();
      P(); ctx.moveTo(-0.02, 0.12); ctx.lineTo(0.38, -0.3); ctx.lineTo(0.46, -0.22); ctx.lineTo(0.06, 0.2); ctx.lineTo(-0.04, 0.22); ctx.closePath(); ctx.stroke(); break;
    case 'play':
      P(); ctx.moveTo(-0.18, -0.26); ctx.lineTo(0.28, 0); ctx.lineTo(-0.18, 0.26); ctx.closePath(); ctx.fill(); break;
    case 'arrowDown':
      P(); ctx.moveTo(0, -0.4); ctx.lineTo(0, 0.38); ctx.moveTo(-0.3, 0.1); ctx.lineTo(0, 0.4); ctx.lineTo(0.3, 0.1); ctx.stroke(); break;
    case 'up':
      P(); ctx.moveTo(0, 0.35); ctx.lineTo(0, -0.3); ctx.moveTo(-0.25, -0.08); ctx.lineTo(0, -0.33); ctx.lineTo(0.25, -0.08); ctx.stroke(); break;
    case 'chat':
      P(); ctx.roundRect(-0.45, -0.35, 0.9, 0.6, 0.16); ctx.stroke();
      P(); ctx.moveTo(-0.2, 0.25); ctx.lineTo(-0.3, 0.45); ctx.lineTo(0.02, 0.25); ctx.stroke();
      for (let i = -1; i <= 1; i++) { P(); ctx.arc(i * 0.18, -0.05, 0.045, 0, TAU); ctx.fill(); }
      break;
  }
  ctx.restore();
}

// arrow cursor, tip at (x, y); press 0..1 squashes it
export function cursor(ctx, x, y, s = 1, press = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (1 - 0.12 * press), s * (1 - 0.12 * press));
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(0, 62); ctx.lineTo(15, 48); ctx.lineTo(26, 72); ctx.lineTo(37, 67); ctx.lineTo(26, 43); ctx.lineTo(46, 43); ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
  ctx.fillStyle = C.white; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.lineWidth = 4; ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}
export function ripple(ctx, x, y, u, u0, r = 120, color = C.white) {
  const p = prog(u, u0, u0 + 1.2);
  if (p <= 0 || p >= 1) return;
  ctx.save(); ctx.strokeStyle = color; ctx.globalAlpha = 0.6 * (1 - p); ctx.lineWidth = 6 * (1 - p) + 1;
  ctx.beginPath(); ctx.arc(x, y, r * E.outCubic(p), 0, TAU); ctx.stroke(); ctx.restore();
}

// ---------------------------------------------------------------- cards
// generic gray post (a "post like everyone else's"); theme 'dark' | 'light'
export function grayPost(ctx, x, y, w, h, { theme = 'dark', alpha = 1, rot = 0, tag = null, views = null, play = true } = {}) {
  if (alpha <= 0) return;
  const bg = theme === 'dark' ? C.grayD : C.white, el = theme === 'dark' ? C.grayD2 : C.grayL, el2 = theme === 'dark' ? '#3A4260' : C.grayL2;
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
  rrect(ctx, 0, 0, w, h, w * 0.07);
  ctx.shadowColor = theme === 'dark' ? 'rgba(0,0,0,0.45)' : 'rgba(20,24,40,0.12)'; ctx.shadowBlur = w * 0.08; ctx.shadowOffsetY = w * 0.03;
  ctx.fillStyle = bg; ctx.fill(); ctx.shadowColor = 'transparent';
  const pad = w * 0.07;
  ctx.fillStyle = el2; ctx.beginPath(); ctx.arc(pad + w * 0.05, pad + w * 0.05, w * 0.05, 0, TAU); ctx.fill();
  rrect(ctx, pad + w * 0.14, pad + w * 0.025, w * 0.4, w * 0.05, w * 0.025); ctx.fill();
  const mh = h - pad * 2 - w * 0.12 - w * 0.16;
  rrect(ctx, pad, pad + w * 0.14, w - pad * 2, mh, w * 0.04); ctx.fillStyle = el; ctx.fill();
  if (play) icon(ctx, 'play', w / 2, pad + w * 0.14 + mh / 2, w * 0.3, el2);
  const fy = pad + w * 0.14 + mh + w * 0.09;
  icon(ctx, 'heart', pad + w * 0.06, fy, w * 0.12, el2);
  ctx.fillStyle = el2; rrect(ctx, pad + w * 0.16, fy - w * 0.025, w * 0.22, w * 0.05, w * 0.025); ctx.fill();
  if (tag) {
    ctx.font = font(w * 0.075, 600); const tw = ctx.measureText(tag).width;
    rrect(ctx, w - pad - tw - w * 0.08, pad - w * 0.01, tw + w * 0.08, w * 0.11, w * 0.055); ctx.fillStyle = theme === 'dark' ? '#3A4260' : C.grayL2; ctx.fill();
    ctx.fillStyle = theme === 'dark' ? '#C8CCE0' : '#5A6075'; ctx.textAlign = 'left'; ctx.fillText(tag, w - pad - tw - w * 0.04, pad + w * 0.07);
  }
  if (views) viewPill(ctx, w * 0.07, h - w * 0.2, w * 0.1, views, theme === 'dark' ? '#C8CCE0' : '#5A6075', 'transparent');
  ctx.restore();
}
// the eye + count pill used on reel cards
export function viewPill(ctx, x, y, s, label, color = C.white, bg = 'rgba(11,15,26,0.72)') {
  ctx.font = font(s, 700);
  const tw = ctx.measureText(label).width, h = s * 1.7, w = tw + s * 2.6;
  if (bg !== 'transparent') { rrect(ctx, x, y, w, h, h / 2); ctx.fillStyle = bg; ctx.fill(); }
  icon(ctx, 'eye', x + s * 1.05, y + h / 2, s * 1.1, color, 0.12);
  ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.fillText(label, x + s * 1.9, y + h / 2 + s * 0.36);
  return w;
}
// a real client reel (screenshot) as a floating card. gray 0..1 desaturates; glow 0..1 adds the brand rim.
export function reelCard(ctx, img, cx, cy, w, { rot = 0, alpha = 1, gray = 0, glow = 0, pill = null, pillS = null, scale = 1 } = {}) {
  if (!img || alpha <= 0) return;
  const h = w * (img.height / img.width);
  ctx.save(); ctx.globalAlpha *= alpha;
  ctx.translate(cx, cy); ctx.rotate(rot); ctx.scale(scale, scale);
  const x = -w / 2, y = -h / 2, r = w * 0.06;
  if (glow > 0) {
    rrect(ctx, x - 10, y - 10, w + 20, h + 20, r + 10);
    ctx.fillStyle = brandGrad(ctx, x, y, x + w, y + h); ctx.shadowColor = C.magenta; ctx.shadowBlur = 60 * glow;
    ctx.globalAlpha = alpha * glow; ctx.fill(); ctx.globalAlpha = alpha; ctx.shadowColor = 'transparent';
  }
  rrect(ctx, x, y, w, h, r);
  ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = w * 0.1; ctx.shadowOffsetY = w * 0.04;
  ctx.fillStyle = '#000'; ctx.fill(); ctx.shadowColor = 'transparent';
  if (gray > 0) ctx.filter = `grayscale(${gray}) brightness(${1 - 0.45 * gray})`;
  cover(ctx, img, x, y, w, h, { radius: r });
  ctx.filter = 'none';
  if (pill) {
    const s = pillS || w * 0.075;
    viewPill(ctx, x + w * 0.05, y + h - s * 2.4, s, pill);
  }
  ctx.restore();
}
// dashboard stat card (problem scenes; illustrative numbers)
export function statCard(ctx, x, y, w, h, { title, value, ico, alpha = 1, extra = null, theme = 'dark' } = {}) {
  if (alpha <= 0) return;
  ctx.save(); ctx.globalAlpha *= alpha;
  rrect(ctx, x, y, w, h, 28);
  ctx.fillStyle = theme === 'dark' ? 'rgba(27,33,51,0.92)' : C.white;
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(138,75,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  const tc = theme === 'dark' ? '#AEB4CC' : '#5A6075', vc = theme === 'dark' ? C.white : C.ink;
  if (ico) icon(ctx, ico, x + 64, y + h / 2, 64, ico === 'heart' ? C.magenta : '#9B7BFF', 0.1);
  const tx = x + (ico ? 124 : 36);
  ctx.textAlign = 'left'; ctx.fillStyle = tc; ctx.font = font(40, 500); ctx.fillText(title, tx, y + h * 0.42);
  ctx.fillStyle = vc; ctx.font = font(54, 700); ctx.fillText(value, tx, y + h * 0.42 + 64);
  if (extra) extra(ctx, x, y, w, h);
  ctx.restore();
}

// ---------------------------------------------------------------- logo
// The lamp assembles: its six dots fly in from `from(i)` (positions in px) with staggered springs,
// the body grows from its base. k0 = beat the assembly starts.
export function lamp(ctx, IMG, cx, cy, h, u, k0, { from = null, stagger = 0.18, alpha = 1 } = {}) {
  const w = h / LAMP.aspect, x0 = cx - w / 2, y0 = cy - h / 2;
  ctx.save(); ctx.globalAlpha *= alpha;
  const kb = springU(u, k0 + 0.6, SPRING.bouncy);
  if (kb > 0 && IMG.lampBody) {
    ctx.save();
    const bx = x0 + w * 0.6, by = y0 + h;   // grow from the screw base
    ctx.translate(bx, by); ctx.scale(kb, kb); ctx.translate(-bx, -by);
    ctx.drawImage(IMG.lampBody, x0, y0, w, h);
    ctx.restore();
  }
  LAMP.dots.forEach((d, i) => {
    const tx = x0 + d.x * w, ty = y0 + d.y * h, r = d.r * w;
    const k = springU(u, k0 + i * stagger, SPRING.snappy);
    if (k <= 0) return;
    const [fx, fy] = from ? from(i) : [tx, ty];
    const px = lerp(fx, tx, k), py = lerp(fy, ty, k);
    ctx.beginPath(); ctx.arc(px, py, r * clamp(0.4 + k * 0.6, 0, 1.3), 0, TAU);
    ctx.fillStyle = mix(C.purple, d.color, clamp(k)); ctx.fill();
  });
  ctx.restore();
  return { x: x0, y: y0, w, h };
}
// white wordmark revealed left->right
export function wordmark(ctx, IMG, x, y, w, p = 1) {
  if (!IMG.word || p <= 0) return;
  const h = w * (IMG.word.height / IMG.word.width);
  ctx.save(); ctx.beginPath(); ctx.rect(x - 4, y - 10, (w + 8) * E.outCubic(p), h + 20); ctx.clip();
  ctx.drawImage(IMG.word, x + (1 - E.outCubic(p)) * -40, y, w, h);
  ctx.restore();
  return h;
}
// a tracked caps line with brand-dot separators: ESTRATÉGIA • CRIATIVIDADE • RESULTADOS
export function tagline(ctx, cx, y, size, parts, p = 1, color = '#C8CCE0') {
  if (p <= 0) return;
  ctx.save(); ctx.globalAlpha *= clamp(p * 1.5);
  ctx.font = font(size, 500); ctx.letterSpacing = `${size * 0.32}px`;
  const ws = parts.map((s) => ctx.measureText(s).width), gap = size * 2.2;
  const total = ws.reduce((a, b) => a + b, 0) + gap * (parts.length - 1);
  let x = cx - total / 2 + (1 - E.outCubic(p)) * 30;
  parts.forEach((s, i) => {
    ctx.fillStyle = color; ctx.textAlign = 'left'; ctx.fillText(s, x, y);
    x += ws[i];
    if (i < parts.length - 1) { ctx.fillStyle = C.magenta; ctx.beginPath(); ctx.arc(x + gap / 2 - size * 0.16, y - size * 0.35, size * 0.16, 0, TAU); ctx.fill(); x += gap; }
  });
  ctx.letterSpacing = '0px'; ctx.restore();
}

// ---------------------------------------------------------------- CTA pill
export function ctaPill(ctx, cx, cy, w, h, u, label = 'CLIQUE NO LINK ABAIXO', { k = 1, press = 0, arrowBob = 0 } = {}) {
  if (k <= 0) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(k * (1 - 0.05 * press), k * (1 - 0.05 * press));
  rrect(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.fillStyle = brandGrad(ctx, -w / 2, 0, w / 2, 0);
  ctx.shadowColor = 'rgba(224,44,169,0.45)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 12; ctx.fill(); ctx.shadowColor = 'transparent';
  const fs = h * 0.3;
  ctx.font = font(fs, 700); ctx.letterSpacing = `${fs * 0.04}px`;
  const tw = ctx.measureText(label).width;
  ctx.fillStyle = C.white; ctx.textAlign = 'left';
  const ix = h * 0.5, tx = -(tw + ix + fs * 0.6) / 2;
  ctx.fillText(label, tx, fs * 0.36);
  ctx.letterSpacing = '0px';
  icon(ctx, 'arrowDown', tx + tw + fs * 0.6 + ix / 2, arrowBob * fs * 0.25, fs * 1.25, C.white, 0.1);
  ctx.restore();
}

// ---------------------------------------------------------------- transitions
// vertical whip: returns offset for the outgoing (a) and incoming (b) scene, px
export function whip(u, u0, dur = 1.0, dist = H) {
  const p = E.inOutCubic(prog(u, u0, u0 + dur));
  return { p, a: -p * dist, b: (1 - p) * dist };
}
export function withT(ctx, dx, dy, fn) { ctx.save(); ctx.translate(dx, dy); fn(); ctx.restore(); }
