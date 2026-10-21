// V3 · Pacotes de vídeos: pure function of time. window.seek(t) paints frame t (see ../shared/motion.js).
// docs/shotlist.md is the plan. VO word times below are seconds on audio/vo.wav (the take, delayed 0.6 s
// so "Branding" lands on the drop at beat 8).
import * as M from '../shared/motion.js';
import * as B from '../shared/b7.js';

const { W, H, E, TAU, prog, clamp, lerp, springU, springKeys, SPRING, wobble, rrect } = M;
const { C, font, sec } = B;

const CARD_U = [0, 0.5, 1, 1.5, 2, 2.5, 3];
const HITS = [
  [0, 'gancho', 'impact', { gain: 0.55 }],
  ...CARD_U.map((u, i) => [u, `print ${B.PRINTS[i].label}`, 'pop', { pitch: ['A4', 'C#5', 'E5', 'A5', 'C#6', 'E6', 'A6'][i], gain: 0.28 }]),
  [3.6, 'contador fecha', 'coins'],
  [6.12, 'como esses', 'pop', { pitch: 'E6', gain: 0.25 }],
  [7.0, 'cards viram bolinhas', 'whoosh', { len: 0.5, from: 600, to: 2600 }],
  [8, 'riser para o drop', 'riser', { len: 1.5 }],
  [8, 'drop: Branding7', 'impact'],
  [8.4, 'logo', 'bell', { pitch: 'A6' }],
  [10, 'logo vira header', 'whoosh', { len: 0.4, gain: 0.2 }],
  [11.3, 'moldura de seleção', 'tick', { gain: 0.3 }],
  [12.9, 'whip claro', 'whoosh', { len: 0.5 }],
  [13.92, 'roteiro', 'blip', { pitch: 'E6' }],
  [14.56, 'gravação', 'blip', { pitch: 'A6' }],
  [15.2, 'edição', 'blip', { pitch: 'C#7' }],
  [16.6, 'iris escura', 'whoosh', { len: 0.5, from: 2400, to: 500 }],
  [17.92, 'chamar atenção', 'pop', { pitch: 'A5' }],
  [20.48, 'alcançar', 'pop', { pitch: 'E5' }],
  [21.0, 'mais pessoas 1', 'blip', { pitch: 'A6', gain: 0.15 }],
  [21.5, 'mais pessoas 2', 'blip', { pitch: 'C#7', gain: 0.15 }],
  [22.24, 'pessoas', 'pop', { pitch: 'E6' }],
  [23.7, 'whip chega', 'whoosh', { len: 0.5, pan: 0.3 }],
  [24.12, 'Chega', 'thud'],
  [27.84, 'despercebidos', 'whoosh', { len: 0.8, from: 1800, to: 300, gain: 0.2 }],
  [29.7, 'whip CTA', 'whoosh', { len: 0.5, pan: -0.3 }],
  [30.0, 'CTA', 'impact', { gain: 0.45 }],
  [31.04, 'clique no link', 'click'],
  [36, 'resolução', 'crash', { len: 2.5, gain: 0.18 }],
];

const SX = 84;

// ------------------------------------------------------------- S1 gancho: resultados reais (u 0..8.2)
function slot(i) {
  const top = i < 4, j = top ? i : i - 4, n = top ? 4 : 3, w = 226;
  return { x: 540 + (j - (n - 1) / 2) * (w + 16), y: top ? 960 : 1310, w };
}
function s1(ctx, u, IMG, bg = true) {
  if (bg) B.bgDark(ctx, u, 21);
  const out = E.inCubic(prog(u, 7.0, 7.6));
  ctx.save(); ctx.globalAlpha = 1 - out;
  B.words(ctx, u, [
    { size: 74, weight: 700, words: [['Quer', 0.60], ['que', 0.76], ['os', 0.90], ['vídeos', 1.04]] },
    { size: 74, weight: 700, words: [['da', 1.28], ['sua', 1.46], ['empresa', 1.62], ['tenham', 1.98]] },
    { size: 74, weight: 800, words: [['resultados', 2.28, 'g'], ['como', 2.70, 'g'], ['esses?', 3.06, 'g']] },
  ], { x: SX, y: 340, lineGap: 1.14 });
  let v = 0;
  B.PRINTS.forEach((p, i) => { v += p.views * springU(u, CARD_U[i], SPRING.gentle); });
  ctx.textAlign = 'left';
  ctx.font = font(96, 800); ctx.fillStyle = C.white;
  ctx.fillText(B.fmtInt(Math.round(Math.min(v, 1125200) / 100) * 100), SX, 660);
  ctx.font = font(40, 500); ctx.fillStyle = '#C8CCE0';
  ctx.fillText('visualizações em 7 vídeos de clientes', SX, 722);
  ctx.restore();
  const pulse = M.bump(u, 6.3, 0.5);
  B.PRINTS.forEach((pr, i) => {
    const S = slot(i);
    const k = springU(u, CARD_U[i] - 0.3, SPRING.bouncy);
    if (k <= 0) return;
    const c = E.inBack(prog(u, 7.0 + i * 0.03, 7.6 + i * 0.03), 1.2);
    B.reelCard(ctx, IMG[pr.k], S.x, S.y - (1 - k) * 260, S.w, {
      scale: clamp(k, 0, 1.2) * (1 + 0.06 * pulse) * (1 - c), alpha: clamp(k * 3) * (1 - clamp(c * 1.3 - 0.3)),
      rot: 0.05 * wobble(u - CARD_U[i], 2, 4) * (i % 2 ? 1 : -1), pill: pr.label, pillS: 21, glow: 0.6 * pulse,
    });
  });
}

// ------------------------------------------------------------- S2 Branding7 + criamos (u 7.0..13.4)
function s2(ctx, u, IMG, bg = true) {
  if (bg) B.bgDark(ctx, u, 22);
  const [lx, ly, ls] = springKeys(u, [[6, [540, 760, 1]], [10.0, [150, 330, 0.3]]], SPRING.gentle);
  const lh = 520 * ls;
  const L = B.lamp(ctx, IMG, lx, ly, lh, u, 7.3, { from: (i) => { const S = slot(i); return [S.x, S.y]; }, stagger: 0.08 });
  const dk = E.inOutCubic(prog(u, 10.0, 10.9));
  const ww = lerp(720, 330, dk);
  B.wordmark(ctx, IMG, lerp(540 - 360, L.x + L.w + 26, dk), lerp(1100, ly - 40, dk), ww, prog(u, 8.0, 8.9));
  if (u < 10.1) return;
  B.words(ctx, u, [
    { size: 112, weight: 800, words: [['criamos', 4.80, 'gb'], ['vídeos', 5.36, 'gb']] },
    { size: 112, weight: 800, words: [['profissionais', 5.64, 'g']] },
  ], { x: SX, y: 600, lineGap: 1.06, lead: 0.4 });
  const kc = springU(u, 10.5, SPRING.snappy);
  if (kc <= 0) return;
  const cx = 540, cy = 1160, w = 560, h = 400;
  ctx.save(); ctx.globalAlpha = clamp(kc * 2); ctx.translate(0, (1 - kc) * 300);
  const ap = E.outCubic(prog(u, 11.4, 12.6));
  if (ap > 0) {
    ctx.save(); ctx.strokeStyle = B.brandGrad(ctx, 140, 1450, 980, 860, [C.blue, C.purple]); ctx.lineWidth = 26; ctx.lineCap = 'round';
    const x1 = lerp(140, 960, ap), y1 = lerp(1460, 880, ap);
    ctx.beginPath(); ctx.moveTo(140, 1460); ctx.lineTo(x1, y1); ctx.stroke();
    ctx.translate(x1, y1); ctx.rotate(Math.atan2(880 - 1460, 960 - 140)); ctx.fillStyle = '#5560FF';
    ctx.beginPath(); ctx.moveTo(50, 0); ctx.lineTo(-20, -44); ctx.lineTo(-20, 44); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  rrect(ctx, cx - w / 2, cy - h / 2, w, h, 26);
  const g = ctx.createLinearGradient(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2);
  g.addColorStop(0, '#1D2547'); g.addColorStop(1, '#0F1428');
  ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 50; ctx.fill(); ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(138,75,255,0.35)'; ctx.lineWidth = 2; ctx.stroke();
  B.icon(ctx, 'play', cx + 10, cy, 170, C.white);
  const sp = E.outCubic(prog(u, 11.1, 11.9));
  if (sp > 0) {
    const m = 18, X = cx - w / 2 - m, Y = cy - h / 2 - m, SW = w + m * 2, SH = h + m * 2;
    ctx.save(); ctx.strokeStyle = '#3FD0FF'; ctx.lineWidth = 4; ctx.setLineDash([16, 10]);
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + SW * sp, Y);
    if (sp > 0.5) { ctx.moveTo(X + SW, Y + SH); ctx.lineTo(X + SW - SW * (sp - 0.5) * 2, Y + SH); }
    ctx.moveTo(X, Y); ctx.lineTo(X, Y + SH * sp); ctx.moveTo(X + SW, Y); ctx.lineTo(X + SW, Y + SH * sp);
    ctx.stroke(); ctx.setLineDash([]);
    [[X, Y], [X + SW, Y], [X, Y + SH], [X + SW, Y + SH]].forEach(([hx, hy], i) => {
      const kh = springU(u, 11.4 + i * 0.1, SPRING.bouncy);
      if (kh <= 0) return;
      ctx.fillStyle = C.white; ctx.fillRect(hx - 13 * kh, hy - 13 * kh, 26 * kh, 26 * kh);
      ctx.strokeStyle = '#3FD0FF'; ctx.strokeRect(hx - 13 * kh, hy - 13 * kh, 26 * kh, 26 * kh);
    });
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------- S3 do roteiro à edição (light) (u 12.6..17.2)
const STEPS = [['edit', 'ROTEIRO', 13.92], ['camera', 'GRAVAÇÃO', 14.56], ['clapper', 'EDIÇÃO', 15.2]];
const STEP = { w: 292, h: 330, gap: 20, y: 960 };
function s3(ctx, u) {
  B.bgLight(ctx, u);
  B.words(ctx, u, [
    { size: 124, weight: 800, words: [['do', 6.66, 'k'], ['roteiro', 6.96, 'b']] },
    { size: 124, weight: 800, words: [['à', 7.48, 'k'], ['edição', 7.60, 'm']] },
  ], { x: SX, y: 480, lineGap: 1.06 });
  const { w, h, gap, y } = STEP, x0 = (W - (w * 3 + gap * 2)) / 2;
  const lp = E.inOutCubic(prog(u, 13.92, 15.4));
  if (lp > 0) {
    ctx.save(); ctx.strokeStyle = B.brandGrad(ctx, x0, 0, x0 + w * 3, 0); ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(x0 + w / 2, y + h / 2); ctx.lineTo(x0 + w / 2 + (w + gap) * 2 * lp, y + h / 2); ctx.stroke(); ctx.restore();
  }
  STEPS.forEach(([ic, lab, uOn], i) => {
    const k = springU(u, 13.0 + i * 0.25, SPRING.snappy);
    if (k <= 0) return;
    const on = springU(u, uOn - 0.1, SPRING.bouncy);
    const x = x0 + i * (w + gap), yy = y + (1 - k) * 200;
    ctx.save(); ctx.globalAlpha = clamp(k * 2);
    const s = 1 + 0.06 * clamp(on) * Math.exp(-Math.max(0, u - uOn) * 1.5);
    ctx.translate(x + w / 2, yy + h / 2); ctx.scale(s, s); ctx.translate(-x - w / 2, -yy - h / 2);
    rrect(ctx, x, yy, w, h, 28);
    ctx.fillStyle = on > 0.05 ? B.brandGrad(ctx, x, yy, x + w, yy + h, [C.purple, C.magenta]) : C.white;
    ctx.shadowColor = 'rgba(20,24,60,0.18)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14; ctx.fill(); ctx.shadowColor = 'transparent';
    const fg = on > 0.05 ? C.white : '#8A90A6';
    B.icon(ctx, ic, x + w / 2, yy + 135, 120, fg, 0.075);
    ctx.fillStyle = fg; ctx.font = font(32, 700); ctx.textAlign = 'center';
    ctx.letterSpacing = '2px'; ctx.fillText(lab, x + w / 2, yy + 280); ctx.letterSpacing = '0px';
    ctx.restore();
  });
}

// ------------------------------------------------------------- S4 alcançar mais pessoas (u 16.6..24)
function s4(ctx, u, IMG, bg = true) {
  if (bg) B.bgDark(ctx, u, 23);
  B.words(ctx, u, [
    { size: 80, weight: 700, words: [['para', 8.06], ['sua', 8.48], ['marca', 8.68]] },
    { size: 98, weight: 800, words: [['chamar', 8.96, 'g'], ['atenção', 9.48, 'g']] },
    { size: 80, weight: 700, words: [['e', 9.84], ['alcançar', 10.24]] },
    { size: 80, weight: 800, words: [['mais', 10.76, 'm'], ['pessoas.', 11.12, 'm']] },
  ], { x: SX, y: 330, lineGap: 1.1 });
  const cx = 540, cy = 1170;
  // reach rings pulse on every beat from "chamar"
  for (let b = 18; b <= Math.floor(u); b++) {
    const p = prog(u, b, b + 2.2);
    if (p <= 0 || p >= 1) continue;
    ctx.save(); ctx.strokeStyle = b % 2 ? C.magenta : '#8A4BFF'; ctx.globalAlpha = 0.5 * (1 - p); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(cx, cy, 200 + 360 * E.outCubic(p), (200 + 360 * E.outCubic(p)) * 0.86, 0, 0, TAU); ctx.stroke(); ctx.restore();
  }
  // people appear in two rings from "alcançar"
  const rings = [[8, 330, 20.4], [12, 450, 21.2]];
  rings.forEach(([n, r, u0], ri) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + ri * 0.26 - Math.PI / 2;
      const k = springU(u, u0 + i * 0.07, SPRING.bouncy);
      if (k <= 0) continue;
      const x = cx + Math.cos(a) * r * clamp(k, 0, 1.1), y = cy + Math.sin(a) * r * 0.86 * clamp(k, 0, 1.1);
      ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
      ctx.beginPath(); ctx.arc(0, 0, 40, 0, TAU);
      ctx.fillStyle = ri ? 'rgba(224,44,169,0.22)' : 'rgba(106,43,217,0.3)'; ctx.fill();
      B.icon(ctx, 'people', 0, 2, 56, ri ? '#FFB8E6' : '#E2D4FF', 0.1);
      ctx.restore();
    }
  });
  const k = springU(u, 16.9, SPRING.snappy);
  const zoom = 1 + 0.06 * prog(u, 17, 23.6);
  B.reelCard(ctx, IMG[B.PRINTS[0].k], cx, cy + (1 - k) * 500, 300, { scale: zoom, glow: 0.9, pill: B.PRINTS[0].label, pillS: 24, alpha: clamp(k * 2) });
}

// ------------------------------------------------------------- S5 chega (light) (u 23.4..30)
function s5(ctx, u) {
  B.bgLight(ctx, u);
  const gone = E.inOutCubic(prog(u, 27.8, 29.0));
  const n = 8, w = 280, h = 400, gap = 30, span = n * (w + gap);
  const off = ((u - 23) * 55) % span;
  for (let j = -1; j < n + 1; j++) {
    const x = 120 + j * (w + gap) - off;
    if (x < -w || x > W + w) continue;
    const views = ['12', '8', '31', '5', '19', '3', '27', '9'][((j % n) + n) % n];
    B.grayPost(ctx, x - w / 2, 1000 + 18 * Math.sin(j * 1.7) + gone * 60, w, h, { theme: 'light', alpha: 1 - gone * 0.8, views, rot: 0.02 * Math.sin(j * 2.3) });
  }
  // "Chega" lands as a stamp, then the rest of the line
  B.words(ctx, u, [
    { size: 140, weight: 800, words: [['Chega', 12.06, 'b']] },
    { size: 90, weight: 700, words: [['de', 12.68, 'k'], ['postar', 12.78, 'k'], ['vídeos', 13.14, 'k']] },
    { size: 90, weight: 700, words: [['que', 13.42, 'k'], ['passam', 13.60, 'k']] },
    { size: 90, weight: 800, words: [['despercebidos!', 13.92, 'm']] },
  ], { x: SX, y: 400, lineGap: 1.12, lead: 0.15 });
}

// ------------------------------------------------------------- S6 end card (u 29.6..40)
function s6(ctx, u, IMG) {
  B.bgDark(ctx, u, 24);
  const lh = 250, lw = lh / B.LAMP.aspect, ww = 560, gap = 34;
  const x0 = (W - (lw + gap + ww)) / 2, cy = 600;
  B.lamp(ctx, IMG, x0 + lw / 2, cy, lh, u, 29.7, { from: (i) => [540 + (i - 3) * 60, 1150], stagger: 0.1 });
  const wh = IMG.word ? ww * IMG.word.height / IMG.word.width : 0;
  B.wordmark(ctx, IMG, x0 + lw + gap, cy - wh / 2 + 20, ww, prog(u, 30.1, 30.9));
  B.tagline(ctx, 540, 840, 28, ['ESTRATÉGIA', 'CRIATIVIDADE', 'RESULTADOS'], prog(u, 30.8, 31.6));
  const k = springU(u, sec(15.02) - 0.3, SPRING.bouncy);
  const press = Math.max(0, Math.sin(Math.PI * prog(u, 30.9, 31.3)));
  const bob = -Math.abs(Math.sin(Math.PI * u));
  B.ctaPill(ctx, 540, 1120, 960, 172, u, 'CLIQUE NO LINK ABAIXO', { k, press, arrowBob: u > 31.4 ? bob : 0 });
  const ks = springU(u, sec(16.36) - 0.3, SPRING.snappy);
  if (ks > 0) {
    ctx.save(); ctx.globalAlpha = clamp(ks * 2); ctx.textAlign = 'center';
    ctx.font = font(54, 500); ctx.fillStyle = '#D9DCEB';
    ctx.fillText('e conheça nossos', 540, 1300 + (1 - ks) * 30);
    ctx.font = font(54, 700); ctx.fillStyle = C.white;
    ctx.fillText('pacotes de vídeos!', 540, 1370 + (1 - ks) * 30);
    ctx.restore();
  }
  const cp = springKeys(u, [[29.9, [1100, 1700]], [30.3, [700, 1150]]], SPRING.gentle);
  const out = E.inCubic(prog(u, 32.2, 33.0));
  if (u > 29.9) {
    B.ripple(ctx, 700, 1150, u, 31.04, 140);
    B.cursor(ctx, cp[0] + out * 500, cp[1] + out * 600, 1.4, press);
  }
}

M.film({
  fonts: B.FONTS,
  images: B.IMAGES,
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 7.0) return s1(ctx, u, IMG);
    if (u < 7.8) { s1(ctx, u, IMG); s2(ctx, u, IMG, false); return; }   // cards collapse into the lamp's dots
    if (u < 12.6) return s2(ctx, u, IMG);
    if (u < 13.4) { const w = B.whip(u, 12.6, 0.8); B.withT(ctx, 0, w.a, () => s2(ctx, u, IMG)); B.withT(ctx, 0, w.b, () => s3(ctx, u)); return; }
    if (u < 16.4) return s3(ctx, u);
    if (u < 17.1) {   // iris out of the lit "EDIÇÃO" card
      s3(ctx, u);
      const { w, h, gap, y } = STEP, x = (W - (w * 3 + gap * 2)) / 2 + 2 * (w + gap) + w / 2;
      const r = Math.hypot(W, H) * E.inExpo(prog(u, 16.4, 17.1));
      ctx.save(); ctx.beginPath(); ctx.arc(x, y + h / 2, Math.max(1, r), 0, TAU); ctx.clip(); s4(ctx, u, IMG); ctx.restore();
      return;
    }
    if (u < 23.4) return s4(ctx, u, IMG);
    if (u < 24.0) { const p = E.inOutCubic(prog(u, 23.4, 24.0)); B.withT(ctx, -p * W, 0, () => s4(ctx, u, IMG)); B.withT(ctx, (1 - p) * W, 0, () => s5(ctx, u)); return; }
    if (u < 29.4) return s5(ctx, u);
    if (u < 30.0) { const p = E.inOutCubic(prog(u, 29.4, 30.0)); B.withT(ctx, -p * W, 0, () => s5(ctx, u)); B.withT(ctx, (1 - p) * W, 0, () => s6(ctx, u, IMG)); return; }
    return s6(ctx, u, IMG);
  },
});
