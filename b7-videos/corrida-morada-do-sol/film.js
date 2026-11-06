// 1ª Corrida Morada do Sol · 15 s 16:9 promo. Pure function of time: window.seek(t) paints frame t.
// The whole art is laid out in "art space" (1920x1080, positions from arte-final/supere-seus-limites-16x9.png)
// and filmed by a camera; the graded runners plate sits behind it with half the camera's motion (parallax).
// Timing is in beats on the 128 bpm grid (b = s * 128 / 60). docs/shotlist.md is the plan.
import * as M from './lib/motion.js';

const { W, H, E, TAU, prog, clamp, lerp, springU, springKeys, SPRING, wobble, rrect, noise1, hash01, bump } = M;

const OR = '#FF5A00', INK = '#0B0B0D';
const b = (s) => s * 128 / 60;           // seconds -> beats
const F = (size, weight = 900, italic = true) => `${italic ? 'italic ' : ''}${weight} ${Math.round(size)}px "Barlow Condensed"`;

const HITS = [
  [0, 'flash + pinceladas', 'impact'],
  [0.1, 'pinceladas varrem', 'whoosh', { len: 0.6, from: 400, to: 3000 }],
  [3, 'medalha pousa', 'thud+crash', { len: 1.2, gain: 0.5 }],
  [3.5, 'brilho na medalha', 'blip', { pitch: 'B6', gain: 0.15 }],
  [4.0, 'câmera para o título', 'whoosh', { len: 0.4 }],
  [4.4, 'SUPERE SEUS', 'whoosh', { len: 0.35, from: 3000, to: 800 }],
  [5.5, 'LIMITES!', 'impact'],
  [7, 'CORRA', 'click'], [7.5, 'POR', 'click'], [8, 'VOCÊ,', 'click'],
  [8.5, 'CORRA', 'click'], [9, 'PELO', 'click'], [9.5, 'SOL!', 'pop', { pitch: 'E6' }],
  [9.6, 'logo traço', 'whoosh', { len: 0.6, from: 600, to: 2400, gain: 0.2 }],
  [11, 'DECK luz', 'bell', { pitch: 'E6' }],
  [12.8, 'pan premiação', 'whoosh', { len: 0.5, pan: 0.4 }],
  [13.2, 'cortina', 'whoosh', { len: 0.4, from: 2400, to: 900, gain: 0.25 }],
  [14.6, '1º lugar', 'pop', { pitch: 'E5' }], [15.2, '2º lugar', 'pop', { pitch: 'G#5' }],
  [15.8, '3º lugar', 'pop', { pitch: 'B5' }], [16.4, '4º lugar', 'pop', { pitch: 'E6' }],
  [17.0, '5º lugar', 'pop', { pitch: 'G#6' }], [18.4, 'contadores fecham', 'coins'],
  [19.4, 'faixa 8KM', 'whoosh', { len: 0.3, from: 2600, to: 700 }],
  [20.2, 'faixa 5KM', 'whoosh', { len: 0.3, from: 2600, to: 700 }],
  [21.0, 'faixa 3KM', 'whoosh', { len: 0.3, from: 2600, to: 700 }],
  [22.0, 'inscrição', 'thud+pop', { pitch: 'B5' }],
  [23.4, 'barra sobe', 'whoosh', { len: 0.4 }],
  [25.0, 'ícone medalha', 'blip', { pitch: 'E6' }], [25.5, 'ícone kit', 'blip', { pitch: 'G#6' }],
  [26.0, 'ícone cronometragem', 'blip', { pitch: 'B6' }], [26.5, 'ícone hidratação', 'blip', { pitch: 'C#7' }],
  [27.0, 'ícone segurança', 'blip', { pitch: 'E7' }],
  [27.7, 'patrocinadores', 'whoosh', { len: 0.4 }],
  [28.2, 'zoom-out + flare', 'swell', { len: 1.0 }],
  [28.6, '13/12', 'pop', { pitch: 'E6' }], [29.6, '13/12', 'pop', { pitch: 'E6' }],
  [29.9, 'arte completa', 'impact', { gain: 0.5 }],
];

// ---------------------------------------------------------------- camera (art space)
const CAM = [
  [0, [960, 540, 1.0]],
  [3.7, [1190, 330, 1.45]],     // title + logo
  [12.6, [850, 600, 1.35]],     // pan start: prize panel
  [13.4, [1000, 600, 1.35]],
  [23.2, [960, 623, 1.18]],     // info bar
  [27.9, [960, 540, 1.0]],      // the full art
];
function camera(u) {
  let [cx, cy, z] = springKeys(u, CAM, SPRING.snappy);
  // the slow lateral pan to the right while the prize panel and tracks fill in
  cx += 209 * E.inOutSine(prog(u, 13.4, 22.8)) * (1 - E.inOutCubic(prog(u, 23.2, 24.4)));
  // keep the frame inside the art
  const hw = W / 2 / z, hh = H / 2 / z;
  cx = clamp(cx, hw, 1920 - hw); cy = clamp(cy, hh, 1080 - hh);
  let sx = 0, sy = 0;
  for (const [u0, a] of [[3, 14], [5.5, 22], [22.0, 6], [29.9, 6]]) {
    if (u < u0) continue;
    const k = a * Math.exp(-(u - u0) / 0.35);
    sx += k * noise1(u * 30, u0 * 7); sy += k * noise1(u * 30, u0 * 7 + 3);
  }
  return { cx, cy, z, sx, sy };
}
const toScreen = (c, x, y) => [W / 2 + (x - c.cx) * c.z + c.sx, H / 2 + (y - c.cy) * c.z + c.sy];

// ---------------------------------------------------------------- background plate
let BG = null;   // the current frame of the graded, slowed runners plate (set by prepare)
const NFRAMES = 889;
const bgCache = new Map();
async function prepare(t) {
  const i = clamp(Math.round(t * 60), 0, NFRAMES - 1);
  if (bgCache.has(i)) { BG = bgCache.get(i); return; }
  const im = new Image(); im.src = `assets/bg/f_${String(i).padStart(4, '0')}.jpg`;
  try { await im.decode(); } catch { return; }
  bgCache.clear(); bgCache.set(i, im); BG = im;
}
function drawBackground(ctx, u, c) {
  ctx.fillStyle = '#120600'; ctx.fillRect(0, 0, W, H);
  // half the camera's motion (parallax) plus the opening push-in
  const z = 1 + (c.z - 1) * 0.45, cx = 960 + (c.cx - 960) * 0.45, cy = 540 + (c.cy - 540) * 0.45;
  const push = lerp(1.0, 1.1, E.outCubic(prog(u, 0, b(1.9))));
  if (BG) {
    // runners (video x 940) sit left of the panels, at art x 620, like the poster
    const s = 1.36 * push;
    ctx.save();
    ctx.translate(W / 2 + c.sx * 0.5, H / 2 + c.sy * 0.5); ctx.scale(z, z); ctx.translate(-cx, -cy);
    ctx.translate(620, 640); ctx.scale(s, s); ctx.translate(-940, -600);
    ctx.drawImage(BG, 0, 0, 1920, 1080);
    ctx.restore();
  }
  // push the yellows to the poster's orange (darkened yellow reads olive), then deepen the shadows
  ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = '#FF9450'; ctx.fillRect(0, 0, W, H); ctx.restore();
  ctx.fillStyle = 'rgba(10,4,0,0.16)'; ctx.fillRect(0, 0, W, H);
  const gt = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  gt.addColorStop(0, 'rgba(8,3,0,0.6)'); gt.addColorStop(1, 'rgba(8,3,0,0)');
  ctx.fillStyle = gt; ctx.fillRect(0, 0, W, H);
  // darken the right half where the panels live
  const g = ctx.createLinearGradient(0, 0, W, 0);
  const fx = toScreen(c, 860, 0)[0] / W, fx2 = toScreen(c, 1300, 0)[0] / W;
  g.addColorStop(clamp(fx), 'rgba(8,4,2,0)'); g.addColorStop(clamp(fx2, fx + 0.001, 1), 'rgba(8,4,2,0.72)'); g.addColorStop(1, 'rgba(8,4,2,0.82)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- brush strokes (seeded)
function stroke(ctx, x, y, len, thick, ang, color, alpha, seed, p = 1) {
  if (p <= 0) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.globalAlpha *= alpha; ctx.fillStyle = color;
  const L = len * p, n = 22;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const s = i / n, taper = Math.sin(Math.PI * Math.min(1, s * 1.15)) ** 0.5;
    ctx.lineTo(s * L, -thick / 2 * taper + thick * 0.18 * noise1(s * 9, seed));
  }
  for (let i = n; i >= 0; i--) {
    const s = i / n, taper = Math.sin(Math.PI * Math.min(1, s * 1.15)) ** 0.5;
    ctx.lineTo(s * L, thick / 2 * taper + thick * 0.18 * noise1(s * 9, seed + 11));
  }
  ctx.closePath(); ctx.fill();
  // dry-brush bristles
  for (let k = 0; k < 4; k++) {
    const yy = (hash01(k, seed) - 0.5) * thick * 1.3, l2 = L * (0.3 + 0.6 * hash01(k, seed + 5));
    ctx.fillRect(L * 0.1 * hash01(k, seed + 9), yy, l2, Math.max(1.5, thick * 0.05));
  }
  ctx.restore();
}
// the poster's ragged edges: dark strokes along the top and down the right, a few orange ones
function edgeBrushes(ctx, p) {
  for (let i = 0; i < 46; i++) {
    const top = i < 30;
    const x = top ? -100 + hash01(i, 3) * 2100 : 1500 + hash01(i, 4) * 520;
    const y = top ? -30 + hash01(i, 5) * 150 : hash01(i, 6) * 1080;
    const orange = i % 7 === 3;
    stroke(ctx, x, y, 300 + 600 * hash01(i, 7), 10 + 46 * hash01(i, 8), -0.32 + 0.1 * hash01(i, 9),
      orange ? OR : '#050302', orange ? 0.55 : 0.88, i * 13 + 1, clamp(p * 1.6 - hash01(i, 10) * 0.6));
  }
}
// the opening sweep, in screen space: big diagonal strokes cross the frame and leave it
function sweep(ctx, u) {
  if (u > 4) return;
  for (let i = 0; i < 14; i++) {
    const u0 = 0.05 * i, p = E.outCubic(prog(u, u0 - 0.2, u0 + 1.1));
    const out = E.inCubic(prog(u, 1.6 + 0.06 * i, 3.4 + 0.06 * i));
    if (p <= 0 || out >= 1) continue;
    const y0 = -300 + i * 140, x0 = -500 + out * 2600;
    stroke(ctx, x0, y0 + out * 900, 2400, 60 + 120 * hash01(i, 21), 0.42, i % 3 === 1 ? OR : '#050302', i % 3 === 1 ? 0.9 : 0.95, i * 7 + 3, p);
  }
}

// ---------------------------------------------------------------- particles + light
function particles(ctx, u, c, n = 70) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sp = 0.4 + hash01(i, 31);
    const x0 = hash01(i, 32) * 2400 - 240, y0 = hash01(i, 33) * 1300;
    const x = ((x0 + u * 9 * sp - (c.cx - 960) * 1.4) % 2400 + 2400) % 2400 - 240;
    const y = ((y0 - u * 22 * sp - (c.cy - 540) * 1.4) % 1300 + 1300) % 1300 - 110;
    const r = 1.2 + 3.2 * hash01(i, 34), tw = 0.5 + 0.5 * Math.sin(u * 2 + i);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
    g.addColorStop(0, `rgba(255,200,110,${0.55 * tw})`); g.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = g; ctx.fillRect(x - r * 4, y - r * 4, r * 8, r * 8);
  }
  ctx.restore();
}
function lightLeak(ctx, x, y, r, a) {
  if (a <= 0) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(255,120,30,${a})`); g.addColorStop(0.5, `rgba(255,90,0,${a * 0.35})`); g.addColorStop(1, 'rgba(255,90,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
}
function burst(ctx, x, y, u, u0, n = 26, R = 260) {
  const p = prog(u, u0, u0 + 2.2);
  if (p <= 0 || p >= 1) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = hash01(i, 41) * TAU, d = R * (0.4 + 0.6 * hash01(i, 42)) * E.outCubic(p);
    const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d + 60 * p * p;
    ctx.fillStyle = `rgba(255,${180 + 60 * hash01(i, 43)},90,${(1 - p) * 0.9})`;
    ctx.beginPath(); ctx.arc(px, py, 2 + 3 * hash01(i, 44) * (1 - p), 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- text
function txt(ctx, s, x, y, size, { w = 900, it = true, color = '#fff', align = 'left', glow = 0, shadow = true, track = 0 } = {}) {
  ctx.save();
  ctx.font = F(size, w, it); ctx.textAlign = align; ctx.letterSpacing = `${track}px`;
  if (shadow) { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = size * 0.18; ctx.shadowOffsetY = size * 0.06; }
  if (glow) { ctx.shadowColor = `rgba(255,90,0,${glow})`; ctx.shadowBlur = size * 0.35; ctx.shadowOffsetY = 0; }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
  ctx.restore();
}
const brl = (v) => Math.round(v).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

// ---------------------------------------------------------------- the medal (top-left)
function medal(ctx, u, IMG) {
  const land = 3, k = springU(u, 0.4, { stiffness: 120, damping: 11 });
  if (u < 0.4 || !IMG.medal) return;
  const fall = clamp((u - 0.4) / (land - 0.4));
  const y = u < land ? lerp(-520, 22, E.inQuad(fall)) : 22 - 18 * Math.max(0, wobble(u - land, 2.4, 5));
  const spin = u < land ? (1 - fall) * 3 * TAU : 0.25 * wobble(u - land, 1.6, 3);
  const sx = Math.cos(spin) * (u < land ? 1 : 1);
  const w = 300, h = w * IMG.medal.height / IMG.medal.width, x = 30;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2); ctx.scale(Math.abs(sx) < 0.04 ? 0.04 : sx, 1); ctx.translate(-x - w / 2, -y - h / 2);
  ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.shadowOffsetY = 14;
  ctx.drawImage(IMG.medal, x, y, w, h);
  ctx.restore();
  // metallic shine runs around the rim after it lands
  const sp = prog(u, 3.3, 4.9);
  if (sp > 0 && sp < 1 && IMG.medalShine) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.sin(Math.PI * sp);
    const cx = x + w * 0.5, cy = y + w * 0.53, a = -Math.PI / 2 + sp * TAU;
    ctx.translate(cx, cy); ctx.rotate(a);
    ctx.drawImage(IMG.medalShine, -w / 2, -w / 2, w, w);
    ctx.restore();
  }
  void k;
}

// ---------------------------------------------------------------- title block
function title(ctx, u) {
  // SUPERE SEUS slides in from the right (motion blur from the harness)
  const k1 = springU(u, 4.0, SPRING.snappy);
  if (k1 > 0) txt(ctx, 'SUPERE SEUS', 931 + (1 - k1) * 900, 112, 84, { color: '#fff' });
  // LIMITES! explodes 140% -> 100%
  const k2 = springU(u, 5.5, SPRING.bouncy);
  if (k2 > 0) {
    const s = lerp(1.4, 1, clamp(k2, 0, 1.2));
    ctx.save(); ctx.translate(925, 250); ctx.scale(s, s); ctx.globalAlpha = clamp(k2 * 3);
    txt(ctx, 'LIMITES!', 0, 0, 176, { color: OR, glow: 0.55 + 0.35 * bump(u, 5.6, 1.2) });
    ctx.restore();
  }
  // CORRA POR VOCÊ, / CORRA PELO SOL! word by word
  const lines = [[['CORRA', 7], ['POR', 7.5], ['VOCÊ,', 8]], [['CORRA', 8.5], ['PELO', 9], ['SOL!', 9.5]]];
  ctx.font = F(62, 800);
  lines.forEach((ln, li) => {
    let x = 931; const y = 316 + li * 54;
    ln.forEach(([w, u0]) => {
      const k = springU(u, u0 - 0.15, SPRING.snappy);
      const ww = (ctx.font = F(62, 800), ctx.measureText(w).width);
      if (k > 0) {
        ctx.save(); ctx.globalAlpha = clamp(k * 2); ctx.translate(x + ww / 2, y); ctx.scale(lerp(1.3, 1, clamp(k)), lerp(1.3, 1, clamp(k))); ctx.translate(-x - ww / 2, -y);
        txt(ctx, w, x, y, 62, { w: 800 }); ctx.restore();
      }
      x += ww + 14;
    });
  });
}

// ---------------------------------------------------------------- Arena Deck logo
function logo(ctx, u, IMG) {
  if (!IMG.logo || u < 9.6) return;
  const x = 1469, y = 72, w = 379, s = w / 1319, L = IMG.logo;
  // icon: drawn on with a diagonal wipe, like a pen stroke
  const pi = E.inOutCubic(prog(u, 9.6, 10.8));
  ctx.save(); ctx.beginPath();
  const d = pi * 1.8;
  ctx.moveTo(x - 10, y + 412 * s + 10); ctx.lineTo(x - 10 + w * 1.2 * d, y + 412 * s + 10); ctx.lineTo(x - 10, y + 412 * s + 10 - 412 * s * 1.6 * d); ctx.closePath();
  ctx.rect(0, 0, 0, 0); ctx.clip();
  ctx.drawImage(L, 0, 0, 1319, 412, x, y, w, 412 * s);
  ctx.restore();
  // ARENA tracks in
  const pa = E.outCubic(prog(u, 10.4, 11.2));
  if (pa > 0) { ctx.save(); ctx.globalAlpha = pa; ctx.drawImage(L, 0, 442, 1319, 86, x + (1 - pa) * 30, y + 442 * s, w, 86 * s); ctx.restore(); }
  // DECK revealed by a band of light
  const pd = prog(u, 11.0, 12.4);
  if (pd > 0) {
    const bx = x - 40 + (w + 80) * E.inOutSine(pd), dy = y + 555 * s, dh = 200 * s;
    ctx.save(); ctx.beginPath(); ctx.rect(x - 10, dy - 6, bx - x + 10, dh + 12); ctx.clip();
    ctx.drawImage(L, 0, 555, 1319, 200, x, dy, w, dh); ctx.restore();
    if (pd < 1) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createLinearGradient(bx - 50, 0, bx + 10, 0);
      g.addColorStop(0, 'rgba(255,200,140,0)'); g.addColorStop(0.8, 'rgba(255,230,190,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(bx - 50, dy - 20, 60, dh + 40); ctx.restore();
    }
  }
}

// ---------------------------------------------------------------- prize panel
const PRIZES = [1300, 800, 500, 400, 300];
function panel(ctx, u, IMG) {
  const X = 931, Y = 382, PW = 468, PH = 392;
  const open = E.inOutCubic(prog(u, 13.2, 14.0));
  if (open <= 0) return;
  ctx.save();
  // curtain: the box opens from its centre outwards
  ctx.beginPath(); ctx.rect(X + PW / 2 - (PW / 2 + 30) * open, Y - 30, (PW + 60) * open, PH + 60); ctx.clip();
  rrect(ctx, X, Y, PW, PH, 16);
  ctx.fillStyle = 'rgba(14,14,16,0.94)'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(255,90,0,0.7)'; ctx.lineWidth = 2.5; ctx.stroke();
  const kh = springU(u, 13.8, SPRING.snappy);
  if (kh > 0) { ctx.save(); ctx.globalAlpha = clamp(kh * 2); txt(ctx, 'PREMIAÇÃO EM DINHEIRO', X + PW / 2, 434 + (1 - kh) * 20, 40, { w: 800, it: false, align: 'center' }); ctx.restore(); }
  const kp = springU(u, 14.2, SPRING.bouncy);
  if (kp > 0) {
    ctx.save(); ctx.translate(X + PW / 2, 461); ctx.scale(kp, kp);
    rrect(ctx, -150, -16, 300, 32, 5); ctx.fillStyle = OR; ctx.fill();
    txt(ctx, 'SOMENTE NA MODALIDADE 8KM', 0, 9, 23, { w: 800, it: false, align: 'center', shadow: false, track: 1 });
    ctx.restore();
  }
  PRIZES.forEach((v, i) => {
    const u0 = 14.6 + i * 0.6, k = springU(u, u0 - 0.15, SPRING.snappy);
    if (k <= 0) return;
    const cy = 513 + i * 55, dx = (1 - k) * 160;
    ctx.save(); ctx.globalAlpha = clamp(k * 2); ctx.translate(dx, 0);
    if (i < 4) { ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(X + 26, cy + 27, PW - 52, 1.5); }
    const md = IMG[`m${i + 1}`];
    if (md) {   // medal spins as the row lands
      const sp = Math.cos((1 - clamp(springU(u, u0, SPRING.gentle))) * 2 * TAU);
      ctx.save(); ctx.translate(X + 50, cy - 4); ctx.scale(Math.abs(sp) < 0.05 ? 0.05 : sp, 1);
      ctx.drawImage(md, -20, -24, 40, 40 * md.height / md.width); ctx.restore();
    }
    txt(ctx, `${i + 1}º LUGAR`, X + 84, cy + 13, 36, { w: 800 });
    const val = v * E.outCubic(prog(u, u0, u0 + 1.6));
    ctx.font = F(25, 900); const cw = ctx.measureText(',00').width;
    txt(ctx, ',00', X + PW - 28, cy + 15, 25, { color: OR, align: 'right', glow: 0.3 });
    txt(ctx, `R$ ${brl(val)}`, X + PW - 30 - cw, cy + 15, 46, { color: OR, align: 'right', glow: 0.35 });
    ctx.restore();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- tracks + sign-up
const TRACKS = [
  { y: 392, fill: OR, km: '8KM', lab: 'CORRIDA', labC: '#141414', ico: 'i8', u0: 19.4 },
  { y: 500, fill: '#1E2524', km: '5KM', lab: 'CORRIDA', labC: '#fff', ico: 'i5', u0: 20.2 },
  { y: 608, fill: '#4B4B4B', km: '3KM', lab: 'CAMINHADA', labC: '#fff', ico: 'i3', u0: 21.0 },
];
function tracks(ctx, u, IMG) {
  TRACKS.forEach((t) => {
    const k = E.outExpo(prog(u, t.u0, t.u0 + 0.8));
    if (k <= 0) return;
    const x0 = 1440, x1 = 1880, h = 96;
    ctx.save();
    // the band cuts in diagonally from the right
    ctx.translate((1 - k) * 700, (1 - k) * -180);
    ctx.beginPath(); ctx.moveTo(x0, t.y); ctx.lineTo(x1, t.y); ctx.lineTo(x1 - 26, t.y + h); ctx.lineTo(x0, t.y + h); ctx.closePath();
    ctx.fillStyle = t.fill; ctx.shadowColor = 'rgba(0,0,0,0.55)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 10; ctx.fill(); ctx.shadowColor = 'transparent';
    const ic = IMG[t.ico];
    if (ic) {   // runner bobs in stride
      const bob = 4 * Math.abs(Math.sin((u - t.u0) * Math.PI * 1));
      const ih = 76, iw = ih * ic.width / ic.height;
      ctx.drawImage(ic, 1500 - iw / 2, t.y + 10 - bob, iw, ih);
    }
    txt(ctx, t.km, 1550, t.y + 64, 70, { color: '#fff' });
    txt(ctx, t.lab, 1580, t.y + 87, 24, { w: 800, it: false, color: t.labC, shadow: t.labC === '#fff' });
    ctx.restore();
  });
  // FAÇA SUA INSCRIÇÃO EM: snaps in, then pulses
  const k = springU(u, 21.9, SPRING.bouncy);
  if (k > 0) {
    const pulse = 1 + 0.035 * Math.sin(Math.PI * clamp((u - 22.6) / 0.8)) * (u > 22.6 && u < 23.4 ? 1 : 0);
    ctx.save(); ctx.translate(1660, 766); ctx.scale(k * pulse, k * pulse);
    rrect(ctx, -220, -44, 440, 89, 2); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 26; ctx.shadowOffsetY = 10; ctx.fill(); ctx.shadowColor = 'transparent';
    txt(ctx, 'FAÇA SUA INSCRIÇÃO EM:', -204, -6, 36, { w: 900, it: false, color: INK, shadow: false });
    txt(ctx, 'WWW.TICKETSPORTS.COM.BR', -204, 32, 36, { w: 900, it: false, color: INK, shadow: false });
    ctx.restore();
    // pulse rings
    for (const r0 of [22.5, 23.1]) {
      const p = prog(u, r0, r0 + 1.0);
      if (p > 0 && p < 1) {
        ctx.save(); ctx.strokeStyle = OR; ctx.globalAlpha = 1 - p; ctx.lineWidth = 4;
        rrect(ctx, 1440 - 14 * p * 3, 722 - 14 * p * 3, 440 + 28 * p * 3, 89 + 28 * p * 3, 4); ctx.stroke(); ctx.restore();
      }
    }
  }
}

// ---------------------------------------------------------------- info bar
const INFO = [
  { ico: 'clock', ix: 94, x: 131, t: 'LARGADA', v: '7:00h', lit: 24.0 },
  { ico: 'pin', ix: 305, x: 345, t: 'LOCAL', v: 'ARENA DECK', lit: 24.0 },
  { ico: 'cal', ix: 556, x: 592, t: 'DATA', v: '13/12', lit: 24.0 },
  { ico: 'med', ix: 728, x: 760, t: 'MEDALHA', s: ['PARA TODOS', 'OS CONCLUINTES'], lit: 25.0 },
  { ico: 'kit', ix: 992, x: 1025, t: 'KIT', s: ['ATLETA', 'EXCLUSIVO'], lit: 25.5 },
  { ico: 'crono', ix: 1193, x: 1229, t: 'CRONOMETRAGEM', s: ['PROFISSIONAL'], lit: 26.0 },
  { ico: 'hidra', ix: 1445, x: 1472, t: 'PONTOS DE', s: ['HIDRATAÇÃO'], lit: 26.5 },
  { ico: 'seg', ix: 1686, x: 1720, t: 'SEGURANÇA', s: ['E APOIO'], lit: 27.0 },
];
const SEPS = [271, 515, 697, 955, 1157, 1414, 1649];
function infoBar(ctx, u, IMG, dateCtx) {
  const k = springU(u, 23.4, SPRING.snappy);
  if (k <= 0) return;
  ctx.save(); ctx.translate(0, (1 - k) * 260);
  rrect(ctx, 40, 814, 1840, 88, 12); ctx.fillStyle = 'rgba(10,10,11,0.95)'; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 30; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.strokeStyle = 'rgba(255,90,0,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)'; SEPS.forEach((x) => ctx.fillRect(x, 832, 1.5, 52));
  INFO.forEach((it, i) => {
    const kt = springU(u, 23.9 + i * 0.08, SPRING.snappy);
    if (kt <= 0) return;
    const lit = clamp(springU(u, it.lit - 0.1, SPRING.bouncy), 0, 1.3);
    const ic = IMG[it.ico];
    if (ic) {
      const ih = 46, iw = ih * ic.width / ic.height;
      ctx.save(); ctx.globalAlpha = 0.25 + 0.75 * clamp(lit);
      if (lit > 0.05) { ctx.shadowColor = OR; ctx.shadowBlur = 22 * bump(u, it.lit + 0.3, 1.2) + 4; }
      const sc = 1 + 0.25 * bump(u, it.lit + 0.2, 0.6);
      ctx.translate(it.ix, 858); ctx.scale(sc, sc);
      ctx.filter = lit > 0.05 ? 'none' : 'grayscale(1)';
      ctx.drawImage(ic, -iw / 2, -ih / 2, iw, ih); ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = clamp(kt * 2);
    if (it.v) {
      txt(ctx, it.t, it.x, 848, 24, { w: 800, color: OR, shadow: false });
      if (it.v === '13/12' && dateCtx) dateCtx(it.x, 884);
      else txt(ctx, it.v, it.x, 884, 36, { w: 900, color: '#fff', shadow: false });
    } else {
      txt(ctx, it.t, it.x, it.s.length > 1 ? 840 : 852, 23, { w: 800, color: OR, shadow: false });
      it.s.forEach((s, j) => txt(ctx, s, it.x, (it.s.length > 1 ? 862 : 876) + j * 20, 18, { w: 700, it: false, color: '#fff', shadow: false }));
    }
    ctx.restore();
  });
  ctx.restore();
}

// ---------------------------------------------------------------- sponsors
function sponsors(ctx, u, IMG) {
  const k = springU(u, 27.7, SPRING.snappy);
  if (k <= 0) return;
  ctx.save(); ctx.translate(0, (1 - k) * 260);
  rrect(ctx, 40, 920, 1840, 139, 12); ctx.fillStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.strokeStyle = OR; ctx.lineWidth = 3; ctx.stroke();
  txt(ctx, 'PATROCINADORES', 333, 980, 34, { w: 900, it: false, color: INK, shadow: false });
  txt(ctx, 'OFICIAIS:', 333, 1018, 34, { w: 900, it: false, color: INK, shadow: false });
  if (IMG.sponsors) { const h = 126, w = h * IMG.sponsors.width / IMG.sponsors.height; ctx.drawImage(IMG.sponsors, 570, 926, w, h); }
  ctx.restore();
}

// ---------------------------------------------------------------- frame
function draw(ctx, u, t, IMG) {
  const c = camera(u);
  drawBackground(ctx, u, c);
  // art-space layers
  ctx.save();
  ctx.translate(W / 2 + c.sx, H / 2 + c.sy); ctx.scale(c.z, c.z); ctx.translate(-c.cx, -c.cy);
  edgeBrushes(ctx, prog(u, 0.6, 2.6));
  medal(ctx, u, IMG);
  title(ctx, u);
  logo(ctx, u, IMG);
  panel(ctx, u, IMG);
  tracks(ctx, u, IMG);
  infoBar(ctx, u, IMG, (x, y) => {
    // 13/12 pulses on the final beats
    const p = bump(u, 28.6, 0.5) + bump(u, 29.6, 0.5);
    ctx.save(); ctx.translate(x, y); ctx.scale(1 + 0.18 * p, 1 + 0.18 * p);
    txt(ctx, '13/12', 0, 0, 36, { w: 900, color: p > 0.05 ? M.mix('#ffffff', '#ffd2b0', p) : '#fff', shadow: false, glow: 0.8 * p });
    ctx.restore();
  });
  sponsors(ctx, u, IMG);
  burst(ctx, 180, 200, u, 3.0, 34, 300);
  ctx.restore();
  // screen-space layers
  particles(ctx, u, c);
  sweep(ctx, u);
  lightLeak(ctx, W * 0.25, H * 0.15, W * 0.7, 0.5 * Math.exp(-u / 1.2));               // opening flash
  lightLeak(ctx, W * (0.2 + 0.05 * noise1(u * 0.2, 5)), H * 0.55, W * 0.6, 0.06 + 0.04 * Math.sin(u * 0.5));
  lightLeak(ctx, W * 0.9, H * 0.1, W * 0.5, 0.18 * bump(u, 13, 1.5));                   // into the pan
  flare(ctx, u);
  // flash on frame 0 (one structural flash)
  const fl = Math.exp(-u / 0.35);
  if (fl > 0.02) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,120,30,${0.85 * fl})`; ctx.fillRect(0, 0, W, H); ctx.restore(); }
  // vignette (stronger at the end)
  const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, H * 1.05);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${0.45 + 0.15 * prog(u, 28, 30)})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
}
// lens flare: a sun crossing the frame on the zoom-out
function flare(ctx, u) {
  const p = prog(u, 28.2, 30.8);
  if (p <= 0 || p >= 1) return;
  const a = Math.sin(Math.PI * p);
  const x = lerp(-200, W + 200, E.inOutSine(p)), y = lerp(H * 0.35, H * 0.3, p);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, 420);
  g.addColorStop(0, `rgba(255,240,210,${0.75 * a})`); g.addColorStop(0.15, `rgba(255,160,60,${0.4 * a})`); g.addColorStop(1, 'rgba(255,90,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const s = ctx.createLinearGradient(0, y, W, y);
  s.addColorStop(0, 'rgba(255,150,60,0)'); s.addColorStop(clamp(x / W), `rgba(255,220,170,${0.55 * a})`); s.addColorStop(1, 'rgba(255,150,60,0)');
  ctx.fillStyle = s; ctx.fillRect(0, y - 3, W, 6);
  // ghosts along the axis through the centre
  [0.35, 0.6, 1.25].forEach((f, i) => {
    const gx = W / 2 + (W / 2 - x) * f, gy = H / 2 + (H / 2 - y) * f, r = [40, 70, 26][i];
    const gg = ctx.createRadialGradient(gx, gy, 0, gx, gy, r);
    gg.addColorStop(0, `rgba(255,140,40,${0.25 * a})`); gg.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = gg; ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
  });
  ctx.restore();
}

M.film({
  fonts: [F(100, 900), F(100, 800), F(100, 900, false), F(100, 800, false), F(100, 700, false)],
  images: {
    medal: 'assets/el/medalha.png', logo: 'assets/el/logo-arena-deck.png', sponsors: 'assets/el/patrocinadores_logos.png',
    m1: 'assets/el/medalha-1o-lugar.png', m2: 'assets/el/medalha-2o-lugar.png', m3: 'assets/el/medalha-3o-lugar.png',
    m4: 'assets/el/medalha-4o-lugar.png', m5: 'assets/el/medalha-5o-lugar.png',
    i8: 'assets/el/icone-8km-corrida.png', i5: 'assets/el/icone-5km-corrida.png', i3: 'assets/el/icone-3km-caminhada.png',
    clock: 'assets/el/icone-largada.png', pin: 'assets/el/icone-local.png', cal: 'assets/el/icone-data.png',
    med: 'assets/el/icone-medalha.png', kit: 'assets/el/icone-kit.png', crono: 'assets/el/icone-cronometragem.png',
    hidra: 'assets/el/icone-hidratacao.png', seg: 'assets/el/icone-seguranca.png',
  },
  init(ctx, IMG) {
    // a soft light band, used as the medal's travelling shine (clipped to its round face)
    const S = 300, cv = document.createElement('canvas'); cv.width = S; cv.height = S;
    const c = cv.getContext('2d');
    c.beginPath(); c.arc(S / 2, S / 2, S * 0.47, 0, TAU); c.arc(S / 2, S / 2, S * 0.38, 0, TAU, true); c.clip();
    const g = c.createRadialGradient(S / 2, 6, 0, S / 2, 6, S * 0.35);
    g.addColorStop(0, 'rgba(255,240,200,0.95)'); g.addColorStop(1, 'rgba(255,170,60,0)');
    c.fillStyle = g; c.fillRect(0, 0, S, S);
    IMG.medalShine = cv;
  },
  prepare,
  hits: HITS,
  draw,
});
