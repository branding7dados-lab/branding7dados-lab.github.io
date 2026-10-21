// V1 · Estratégia: pure function of time. window.seek(t) paints frame t (see ../shared/motion.js).
// docs/shotlist.md is the plan. VO word times (seconds) come from audio/vo/words.json; sec() maps them to beats.
import * as M from '../shared/motion.js';
import * as B from '../shared/b7.js';

const { W, H, E, TAU, prog, clamp, lerp, springU, springKeys, SPRING, wobble, rrect, fitSize } = M;
const { C, font, sec } = B;

// [beat, label, sfx, opts]
const HITS = [
  [0, 'gancho', 'impact', { gain: 0.55 }],
  [0.1, 'texto digitando', 'type', { len: 0.9, n: 7, gain: 0.12 }],
    [2.5, 'card investimento', 'pop', { pitch: 'E5' }],
  [5.2, 'card alcance', 'pop', { pitch: 'A5' }],
  [6.4, 'card curtidas', 'pop', { pitch: 'C#6' }],
  [7.7, 'não sai do lugar', 'boing', { pitch: 300, to: 180, gain: 0.25 }],
  [10.1, 'whip para postar', 'whoosh', { len: 0.5 }],
  [10.6, 'card postar', 'click'],
  [12.36, 'card anunciar', 'click', { pitch: 1.2 }],
  [15, 'multidão de cards', 'whoosh', { len: 1.6, from: 2400, to: 500, gain: 0.2 }],
  [15.64, 'só mais um', 'thud', { gain: 0.35 }],
  [18.3, 'whip para o feed', 'whoosh', { len: 0.5 }],
  [21.9, 'risco em conteúdo', 'tick', { gain: 0.3 }],
  [22.7, 'cards caem', 'whoosh', { len: 0.4, from: 1800, to: 400 }],
  [22.8, 'É', 'thud'],
  [24, 'drop: estratégia', 'impact'],
  [24, 'swell para o drop', 'swell', { len: 1.6 }],
  [24.6, 'chip planejamento', 'blip', { pitch: 'E6' }],
  [25.0, 'chip posicionamento', 'blip', { pitch: 'A6' }],
  [25.4, 'chip resultados', 'blip', { pitch: 'C#7' }],
  [26.4, 'whip para resultados', 'whoosh', { len: 0.5 }],
  [27.4, 'print 687 mil', 'pop', { pitch: 'A4' }],
  [28.4, 'print 224 mil', 'pop', { pitch: 'C#5' }],
  [29.4, 'print 123 mil', 'pop', { pitch: 'E5' }],
  [30, 'print 29,6 mil', 'pop', { pitch: 'A5' }],
  [30.6, 'print 27,8 mil', 'pop', { pitch: 'C#6' }],
  [31.2, 'print 23,8 mil', 'pop', { pitch: 'E6' }],
  [31.8, 'print 10 mil', 'pop', { pitch: 'A6' }],
  [32.2, 'olha só', 'boing', { pitch: 420, to: 640, gain: 0.22 }],
  [32.6, 'contador fecha', 'coins'],
  [33.3, 'cards viram bolinhas', 'whoosh', { len: 0.5, from: 600, to: 2600 }],
  [34.3, 'logo Branding7', 'bell', { pitch: 'A6' }],
  [36.4, 'logo sai', 'whoosh', { len: 0.5 }],
  [37.12, 'estratégia', 'pop', { pitch: 'E5' }],
  [39.24, 'criatividade', 'pop', { pitch: 'A5' }],
  [41.44, 'execução', 'pop', { pitch: 'C#6' }],
  [42.9, 'whip para destacar', 'whoosh', { len: 0.5, pan: 0.3 }],
  [45.5, 'se destacar', 'thud+bell', { pitch: 'E6' }],
  [48, 'CTA', 'impact', { gain: 0.45 }],
  [49.12, 'clique no link', 'click'],
  [52, 'resolução', 'crash', { len: 2.5, gain: 0.18 }],
];

const SX = 84;   // left text margin

// ------------------------------------------------------------- S1 hook (u 0..10.6)
function s1(ctx, u, IMG) {
  B.bgDark(ctx, u, 1);
  // the brand dot drops into frame on frame 0 and lands behind the first word
  const kd = springU(u, -0.5, SPRING.bouncy);
  ctx.fillStyle = C.magenta;
  ctx.beginPath(); ctx.arc(SX + 22, lerp(-80, 236, kd), 20 * (1 + 0.25 * wobble(u - 0.2, 2.4, 6)), 0, TAU); ctx.fill();
  const lines = [
    { size: 118, weight: 800, words: [['Você', 0.0], ['tá', 0.24]] },
    { size: 118, weight: 800, words: [['cansado', 0.40], ['de', 1.08]] },
    { size: 118, weight: 800, words: [['investir', 1.24, 'g'], ['em', 1.56, 'g']] },
    { size: 118, weight: 800, words: [['marketing', 1.76, 'g']] },
    { size: 64, weight: 500, dy: 112, words: [['e', 2.34], ['sentir', 2.62], ['que', 2.86], ['sua', 3.02], ['marca', 3.20]] },
    { size: 64, weight: 600, dy: 80, words: [['não', 3.52, 'm'], ['sai', 3.84, 'm'], ['do', 4.18, 'm'], ['lugar?', 4.32, 'm']] },
  ];
  B.words(ctx, u, lines, { x: SX, y: 400, lineGap: 1.02 });
  // illustrative dashboard: money goes in, numbers don't move
  const stuck = u > 7.68 ? 0.03 * wobble(u - 7.68, 3, 4) : 0;
  const cards = [
    { u0: 2.5, title: 'Investimento', value: 'R$ 1.258,00', ico: 'bars' },
    { u0: 5.2, title: 'Alcance', value: '1.432', ico: 'eye' },
    { u0: 6.4, title: 'Curtidas', value: '87', ico: 'heart' },
  ];
  cards.forEach((c, i) => {
    const k = springU(u, c.u0 - 0.15, SPRING.snappy);
    if (k <= 0) return;
    const x = 290 + i * 40, y = 1030 + i * 158, w = 680, h = 140;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2); ctx.rotate(stuck * (i % 2 ? -1 : 1)); ctx.translate(-x - w / 2, -y - h / 2);
    B.statCard(ctx, x + (1 - k) * 500, y, w, h, {
      ...c, alpha: clamp(k * 2),
      extra: (cx, X, Y, Wd, Hd) => {
        if (i === 0) {   // investment bars keep rising
          for (let b = 0; b < 6; b++) {
            const kb = springU(u, c.u0 + 0.3 + b * 0.25, SPRING.snappy);
            const bh = (24 + b * 13) * kb;
            rrect(cx, X + Wd - 250 + b * 34, Y + Hd - 34 - bh, 22, bh, 5);
            cx.fillStyle = B.brandGrad(cx, 0, Y + Hd, 0, Y + 20, [C.purple, C.magenta]); cx.fill();
          }
        } else {          // "+0%" pops on "não sai do lugar"
          const kp = springU(u, 7.68 + (i - 1) * 0.15, SPRING.bouncy);
          if (kp > 0) {
            cx.save(); cx.translate(X + Wd - 110, Y + Hd / 2); cx.scale(kp, kp);
            rrect(cx, -70, -32, 140, 64, 32); cx.fillStyle = 'rgba(224,44,169,0.18)'; cx.fill();
            cx.fillStyle = C.magenta; cx.font = font(34, 700); cx.textAlign = 'center'; cx.fillText('+0%', 0, 12);
            cx.restore();
          }
        }
      },
    });
    ctx.restore();
  });
}

// ------------------------------------------------------------- S2 só mais um (u 9.8..18.7)
function s2(ctx, u) {
  B.bgDark(ctx, u, 2);
  // camera: dolly back from "continuar" (log-space zoom)
  const p = E.inOutCubic(prog(u, 14.0, 17.4));
  const z = 1.45 * (0.36 / 1.45) ** p;
  const cx = 540, cy = 1180, cw = 300, ch = 430;
  ctx.save();
  ctx.translate(cx, cy); ctx.scale(z, z);
  for (let r = -4; r <= 4; r++) for (const c of [-5, -3, -1, 1, 3, 5]) {
    const isA = r === 0 && c === -1, isB = r === 0 && c === 1;
    const X = c * 170, Y = r * 470, d = Math.hypot(c / 2, r);
    let a;
    if (isA) a = springU(u, sec(5.32) - 0.2, SPRING.snappy);
    else if (isB) a = springU(u, sec(6.18) - 0.2, SPRING.snappy);
    else a = clamp((p * 7 - d * 1.1) * 0.8);
    if (a <= 0) continue;
    B.grayPost(ctx, X - cw / 2, Y - ch / 2 - (1 - clamp(a)) * 160, cw, ch, { theme: 'dark', alpha: clamp(a), tag: isB ? 'Patrocinado' : null });
  }
  ctx.restore();
  // keep the type readable over the crowd
  const g = ctx.createLinearGradient(0, 200, 0, 900);
  g.addColorStop(0, 'rgba(11,15,26,0.95)'); g.addColorStop(0.75, 'rgba(11,15,26,0.85)'); g.addColorStop(1, 'rgba(11,15,26,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, 900);
  B.words(ctx, u, [
    { size: 104, weight: 800, words: [['De', 5.20], ['postar,', 5.32]] },
    { size: 104, weight: 800, words: [['anunciar', 6.18], ['e', 6.90]] },
    { size: 104, weight: 800, words: [['continuar', 7.04], ['sendo', 7.50]] },
    { size: 124, weight: 800, dy: 136, words: [['só', 7.82, 'g'], ['mais', 8.24, 'g'], ['um?', 8.52, 'g']] },
  ], { x: SX, y: 380, lineGap: 1.04 });
}

// ------------------------------------------------------------- S3 feed + "É ESTRATÉGIA!" (u 17.9..24.8)
function headline3(ctx, u, dark) {
  const ink = dark ? 'w' : 'k';
  const boxes = B.words(ctx, u, [
    { size: 92, weight: 700, words: [['O', 9.20, ink], ['que', 9.34, ink], ['falta', 9.42, ink]] },
    { size: 92, weight: 700, words: [['não', 9.82, ink], ['é', 10.30, ink], ['conteúdo,', 10.60, ink]] },
  ], { x: SX, y: 380, lineGap: 1.1 });
  B.swash(ctx, boxes[5], 21.8, 22.5, u, C.magenta, { strike: true, w: 12 });
  // the slam
  const size = Math.min(150, fitSize(ctx, 'É ESTRATÉGIA!', 800, B.F, W - SX * 2));
  const k = springU(u, 22.75, SPRING.bouncy);
  if (k > 0) {
    ctx.save();
    const y = 640;
    ctx.translate(SX, y); ctx.scale(lerp(1.35, 1, clamp(k)), k); ctx.translate(-SX, -y);
    ctx.font = font(size, 800); ctx.textAlign = 'left';
    const tw = ctx.measureText('É ESTRATÉGIA!').width;
    ctx.fillStyle = B.brandGrad(ctx, SX, 0, SX + tw, 0, ['#8A4BFF', C.magenta]);
    ctx.fillText('É ESTRATÉGIA!', SX, y);
    ctx.restore();
  }
}
function s3(ctx, u) {
  B.bgLight(ctx, u);
  const scroll = -(u - 17.9) * 26;
  const fall = E.inBack(prog(u, 22.4, 23.2), 1.6);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
    const i = r * 3 + c;
    const k = springU(u, 18.2 + i * 0.12, SPRING.snappy);
    const w = 296, h = 410, x = 72 + c * (w + 24), y = 660 + r * (h + 24) + scroll + (1 - k) * 120 + fall * (H + 200) * (0.8 + 0.2 * ((i * 7) % 3));
    B.grayPost(ctx, x, y, w, h, { theme: 'light', alpha: clamp(k * 1.5), rot: fall * 0.2 * ((i % 2) * 2 - 1) });
  }
  headline3(ctx, u, false);
}
// ------------------------------------------------------------- S4 growth chart (u 24..26.8)
function s4(ctx, u) {
  B.bgDark(ctx, u, 3);
  headline3(ctx, u, true);
  const x0 = SX, base = 1400, bw = 92, gap = 28;
  const hs = [120, 190, 280, 380, 500];
  hs.forEach((h, i) => {
    const k = springU(u, 23.9 + i * 0.22, SPRING.bouncy);
    const bh = h * k, x = x0 + i * (bw + gap);
    rrect(ctx, x, base - bh, bw, bh, 10);
    ctx.fillStyle = B.brandGrad(ctx, 0, base, 0, base - 500, [C.blue, C.purple, C.magenta]);
    ctx.shadowColor = 'rgba(138,75,255,0.6)'; ctx.shadowBlur = 30; ctx.fill(); ctx.shadowColor = 'transparent';
  });
  // the arrow line draws across the bar tops and shoots up
  const p = E.outCubic(prog(u, 24.3, 25.5));
  if (p > 0) {
    const pts = hs.map((h, i) => [x0 + i * (bw + gap) + bw / 2, base - h - 70]);
    pts.push([x0 + 5 * (bw + gap) + 10, base - 720]);
    const n = (pts.length - 1) * p, j = Math.floor(n), f = n - j;
    ctx.save(); ctx.strokeStyle = '#B98CFF'; ctx.lineWidth = 12; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.shadowColor = C.magenta; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.moveTo(...pts[0]);
    for (let i = 1; i <= j; i++) ctx.lineTo(...pts[i]);
    let tip = pts[j], ang = 0;
    if (j < pts.length - 1) { tip = [lerp(pts[j][0], pts[j + 1][0], f), lerp(pts[j][1], pts[j + 1][1], f)]; ctx.lineTo(...tip); ang = Math.atan2(pts[j + 1][1] - pts[j][1], pts[j + 1][0] - pts[j][0]); }
    else ang = Math.atan2(pts[j][1] - pts[j - 1][1], pts[j][0] - pts[j - 1][0]);
    ctx.stroke();
    ctx.translate(...tip); ctx.rotate(ang); ctx.fillStyle = '#E9D8FF';
    ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(-16, -24); ctx.lineTo(-16, 24); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  // three pillar chips on the right
  [['target', 'PLANEJAMENTO'], ['people', 'POSICIONAMENTO'], ['bars', 'RESULTADOS']].forEach(([ic, lab], i) => {
    const k = springU(u, 24.45 + i * 0.4, SPRING.snappy);
    if (k <= 0) return;
    const w = 300, h = 150, x = W - SX - w + (1 - k) * 300, y = 860 + i * 172;
    ctx.save(); ctx.globalAlpha = clamp(k * 2);
    rrect(ctx, x, y, w, h, 24); ctx.fillStyle = 'rgba(20,26,48,0.95)'; ctx.fill();
    ctx.strokeStyle = B.brandGrad(ctx, x, y, x + w, y + h); ctx.lineWidth = 3; ctx.stroke();
    B.icon(ctx, ic, x + w / 2, y + 56, 64, '#E9D8FF', 0.09);
    ctx.fillStyle = C.white; ctx.font = font(28, 600); ctx.textAlign = 'center'; ctx.fillText(lab, x + w / 2, y + 122);
    ctx.restore();
  });
}

// ------------------------------------------------------------- S5 results (u 26..34)
const CARD_U = [27.4, 28.4, 29.4, 30, 30.6, 31.2, 31.8];
function cardPose(u, i) {
  // cover-flow: the newest landed card sits in front
  let a = 0;
  CARD_U.forEach((cu, j) => { if (j > 0) a += springU(u, cu, SPRING.snappy); });
  const d = i - a;
  return { x: 540 + d * 250, y: 990 + Math.abs(d) * 30, s: Math.max(0.45, 1 - 0.2 * Math.abs(d)), rot: d * 0.07, d };
}
function s5(ctx, u, IMG) {
  B.bgDark(ctx, u, 4);
  const titleOut = E.inCubic(prog(u, 33.2, 33.9));
  ctx.save(); ctx.globalAlpha = 1 - titleOut;
  B.words(ctx, u, [
    { size: 80, weight: 700, words: [['E', 13.06], ['os', 13.14], ['resultados', 13.24, 'g']] },
    { size: 80, weight: 700, words: [['dos', 13.68], ['nossos', 14.00], ['clientes', 14.18]] },
    { size: 80, weight: 700, words: [['mostram', 14.86], ['isso.', 15.40]] },
  ], { x: SX, y: 340, lineGap: 1.12 });
  ctx.restore();
  // cards, back to front
  const order = B.PRINTS.map((p, i) => i).sort((i, j) => Math.abs(cardPose(u, j).d) - Math.abs(cardPose(u, i).d));
  order.forEach((i) => {
    const k = springU(u, CARD_U[i] - 0.2, SPRING.snappy);
    if (k <= 0) return;
    const P = cardPose(u, i), pr = B.PRINTS[i];
    const c = E.inBack(prog(u, 33.2 + i * 0.04, 33.8 + i * 0.04), 1.2);
    const front = clamp(1 - Math.abs(P.d));
    B.reelCard(ctx, IMG[pr.k], P.x + (1 - k) * 700, P.y + (1 - k) * 200, 380, {
      scale: P.s * (1 - clamp(c)), rot: P.rot + (1 - k) * 0.3, gray: clamp(Math.abs(P.d) * 0.7), alpha: clamp(k * 2) * (1 - clamp(c * 1.2 - 0.2)),
      pill: pr.label, pillS: 30, glow: front * 0.8,
    });
  });
  // the sum of real views, as each card lands
  let v = 0;
  B.PRINTS.forEach((p, i) => { v += p.views * springU(u, CARD_U[i], SPRING.gentle); });
  const kc = springU(u, 27.0, SPRING.snappy);
  if (kc > 0) {
    ctx.save(); ctx.globalAlpha = clamp(kc * 2) * (1 - titleOut);
    ctx.textAlign = 'center';
    ctx.font = font(112, 800); ctx.fillStyle = B.brandGrad(ctx, 240, 0, 840, 0, ['#8A4BFF', C.magenta]);
    ctx.fillText(B.fmtInt(Math.round(Math.min(v, 1125200) / 100) * 100), 540, 1400 + (1 - kc) * 60);
    ctx.font = font(44, 500); ctx.fillStyle = '#C8CCE0';
    ctx.fillText('visualizações em 7 vídeos de clientes', 540, 1462 + (1 - kc) * 60);
    ctx.restore();
  }
  // "Olha só!" sticker
  const ko = springU(u, sec(16.10) - 0.2, SPRING.bouncy);
  if (ko > 0) {
    ctx.save(); ctx.globalAlpha = 1 - titleOut;
    ctx.translate(800, 640); ctx.rotate(-0.1); ctx.scale(ko, ko);
    rrect(ctx, -190, -64, 380, 128, 64); ctx.fillStyle = B.brandGrad(ctx, -190, 0, 190, 0); ctx.fill();
    ctx.fillStyle = C.white; ctx.font = font(66, 800); ctx.textAlign = 'center'; ctx.fillText('Olha só!', 0, 23);
    ctx.restore();
  }
}

// ------------------------------------------------------------- S6 logo (u 33.2..37.2)
function s6(ctx, u, IMG, bg = true) {
  if (bg) B.bgDark(ctx, u, 4);
  const out = E.inCubic(prog(u, 36.3, 37.0));
  ctx.save(); ctx.translate(0, -out * 900); ctx.globalAlpha = 1 - out;
  // dots fly in from where the client cards were
  const from = (i) => { const P = cardPose(33.2, Math.min(i, 6)); return [P.x, P.y]; };
  B.lamp(ctx, IMG, 540, 760, 560, u, 33.5, { from, stagger: 0.12 });
  B.wordmark(ctx, IMG, 540 - 380, 1110, 760, prog(u, sec(17.16), sec(17.16) + 0.9));
  ctx.restore();
}

// ------------------------------------------------------------- S7 pillars (u 36.3..43.4)
function s7(ctx, u) {
  B.bgDark(ctx, u, 5);
  B.words(ctx, u, [
    { size: 58, weight: 600, words: [['Na', 17.6], ['Branding7,', 17.6], ['unimos', 18.24]] },
    { size: 112, weight: 800, dy: 136, words: [['estratégia,', 18.56, 'gb']] },
    { size: 112, weight: 800, words: [['criatividade', 19.62, 'g']] },
    { size: 112, weight: 800, words: [['e', 20.40], ['execução', 20.72, 'g']] },
  ], { x: SX, y: 360, lineGap: 1.06 });
  const items = [['target', 'ESTRATÉGIA', 18.56], ['bulb', 'CRIATIVIDADE', 19.62], ['rocket', 'EXECUÇÃO', 20.72]];
  const w = 292, h = 330, gap = 20, x0 = (W - (w * 3 + gap * 2)) / 2, y = 960;
  // connecting line
  const lp = E.inOutCubic(prog(u, sec(18.56), sec(20.9)));
  if (lp > 0) {
    ctx.save(); ctx.strokeStyle = B.brandGrad(ctx, x0, 0, x0 + w * 3, 0); ctx.lineWidth = 6; ctx.shadowColor = C.magenta; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.moveTo(x0 + w / 2, y + h / 2); ctx.lineTo(x0 + w / 2 + (w + gap) * 2 * lp, y + h / 2); ctx.stroke(); ctx.restore();
  }
  items.forEach(([ic, lab, ts], i) => {
    const k = springU(u, 36.6 + i * 0.3, SPRING.snappy);
    if (k <= 0) return;
    const on = springU(u, sec(ts) - 0.1, SPRING.bouncy);
    const x = x0 + i * (w + gap), yy = y + (1 - k) * 200;
    ctx.save(); ctx.globalAlpha = clamp(k * 2);
    ctx.translate(x + w / 2, yy + h / 2); ctx.scale(1 + 0.06 * Math.max(0, on - 0) * (1 - clamp(on - 1)), 1 + 0.06 * Math.max(0, on) * (1 - clamp(on - 1))); ctx.translate(-x - w / 2, -yy - h / 2);
    rrect(ctx, x, yy, w, h, 28); ctx.fillStyle = 'rgba(20,26,48,0.96)';
    ctx.shadowColor = `rgba(224,44,169,${0.55 * clamp(on)})`; ctx.shadowBlur = 50; ctx.fill(); ctx.shadowColor = 'transparent';
    ctx.lineWidth = 4; ctx.strokeStyle = on > 0.05 ? B.brandGrad(ctx, x, yy, x + w, yy + h) : 'rgba(138,75,255,0.3)'; ctx.stroke();
    B.icon(ctx, ic, x + w / 2, yy + 135, 120, M.mix('#5A6080', '#F2E6FF', clamp(on)), 0.075);
    ctx.fillStyle = M.mix('#8A90A6', '#FFFFFF', clamp(on)); ctx.font = font(30, 600); ctx.textAlign = 'center';
    ctx.letterSpacing = '2px'; ctx.fillText(lab, x + w / 2, yy + 278); ctx.letterSpacing = '0px';
    ctx.restore();
  });
}

// ------------------------------------------------------------- S8 se destacar (u 42.6..48.6)
const HERO = 0;   // CNH, 687 mil
function heroPose(u) {
  const pop = springU(u, 45.4, SPRING.bouncy);
  const m = E.inOutCubic(prog(u, 47.5, 48.3));   // morph into the CTA pill
  return { pop, m, x: 540, y: lerp(1010, 1180, m), s: lerp(1 + 0.42 * pop, 0.45, m) };
}
function s8(ctx, u, IMG) {
  B.bgDark(ctx, u, 6);
  const drift = (u - 42.6) * 18;
  const pop = springU(u, 45.4, SPRING.bouncy), m = heroPose(u).m;
  // the row: everyone gray, the hero lifts out in colour
  const n = B.PRINTS.length;
  for (let j = -2; j < n + 2; j++) {
    const i = ((j % n) + n) % n;
    if (j === HERO) continue;
    const rel = j - HERO;
    const x = 540 + rel * 340 - drift + rel * 40 * pop, y = 1010;
    B.reelCard(ctx, IMG[B.PRINTS[i].k], x, y, 310, { gray: 0.85, alpha: (0.95 - 0.4 * pop) * (1 - m), scale: 1 - 0.1 * pop });
  }
  const P = heroPose(u);
  B.reelCard(ctx, IMG[B.PRINTS[HERO].k], P.x, P.y, 310, {
    gray: 1 - clamp(pop), glow: clamp(pop) * (1 - m), scale: P.s, alpha: 1 - E.inQuad(m),
    pill: pop > 0.3 ? B.PRINTS[HERO].label : null, pillS: 24,
  });
  ctx.save(); ctx.globalAlpha = 1 - m;
  B.words(ctx, u, [
    { size: 80, weight: 700, words: [['para', 21.40], ['fazer', 21.86], ['sua', 22.16], ['marca', 22.40]] },
    { size: 132, weight: 800, dy: 150, words: [['se', 22.74, 'g'], ['destacar.', 22.96, 'g']] },
  ], { x: SX, y: 360 });
  ctx.restore();
}

// ------------------------------------------------------------- S9 end card (u 47.6..56)
function s9(ctx, u, IMG) {
  B.bgDark(ctx, u, 7);
  // logo lockup: lamp left, wordmark right
  const lh = 250, lw = lh / B.LAMP.aspect, ww = 560, gap = 34;
  const x0 = (W - (lw + gap + ww)) / 2, cy = 660;
  B.lamp(ctx, IMG, x0 + lw / 2, cy, lh, u, 47.7, { from: (i) => [540 + (i - 3) * 60, 1100], stagger: 0.1 });
  const wh = IMG.word ? ww * IMG.word.height / IMG.word.width : 0;
  B.wordmark(ctx, IMG, x0 + lw + gap, cy - wh / 2 + 20, ww, prog(u, 48.2, 49.0));
  B.tagline(ctx, 540, 900, 28, ['ESTRATÉGIA', 'CRIATIVIDADE', 'RESULTADOS'], prog(u, 48.9, 49.7));
  const k = springU(u, 47.75, SPRING.bouncy);
  const press = Math.max(0, Math.sin(Math.PI * prog(u, 49.05, 49.45)));
  const bob = -Math.abs(Math.sin(Math.PI * u));
  B.ctaPill(ctx, 540, 1180, 960, 172, u, 'CLIQUE NO LINK ABAIXO', { k, press, arrowBob: u > 49.5 ? bob : 0 });
  const ks = springU(u, sec(25.32) - 0.2, SPRING.snappy);
  if (ks > 0) {
    ctx.save(); ctx.globalAlpha = clamp(ks * 2);
    ctx.font = font(54, 500); ctx.fillStyle = '#D9DCEB'; ctx.textAlign = 'center';
    ctx.fillText('e fale com a Branding7!', 540, 1352 + (1 - ks) * 30);
    ctx.restore();
  }
  // cursor glides in and clicks on "link"
  const cp = springKeys(u, [[48.2, [1100, 1700]], [48.5, [700, 1210]]], SPRING.gentle);
  const out = E.inCubic(prog(u, 50.4, 51.2));
  if (u > 48.2) {
    B.ripple(ctx, 700, 1210, u, 49.12, 140);
    B.cursor(ctx, cp[0] + out * 500, cp[1] + out * 600, 1.4, press);
  }
}

M.film({
  fonts: B.FONTS,
  images: B.IMAGES,
  hits: HITS,
  draw(ctx, u, t, IMG) {
    // S1 -> S2: vertical whip, both on screen
    if (u < 9.8) return s1(ctx, u, IMG);
    if (u < 10.6) { const w = B.whip(u, 9.8, 0.8); B.withT(ctx, 0, w.a, () => s1(ctx, u, IMG)); B.withT(ctx, 0, w.b, () => s2(ctx, u)); return; }
    if (u < 17.9) return s2(ctx, u);
    if (u < 18.7) { const w = B.whip(u, 17.9, 0.8); B.withT(ctx, 0, w.a, () => s2(ctx, u)); B.withT(ctx, 0, w.b, () => s3(ctx, u)); return; }
    if (u < 24) return s3(ctx, u);
    if (u < 24.8) {   // iris from the chart base: light -> dark on the drop
      s3(ctx, u);
      const r = Math.hypot(W, H) * E.outExpo(prog(u, 24, 24.7));
      ctx.save(); ctx.beginPath(); ctx.arc(330, 1400, Math.max(1, r), 0, TAU); ctx.clip(); s4(ctx, u); ctx.restore();
      return;
    }
    if (u < 26) return s4(ctx, u);
    if (u < 26.8) { const w = B.whip(u, 26, 0.8); B.withT(ctx, 0, w.a, () => s4(ctx, u)); B.withT(ctx, 0, w.b, () => s5(ctx, u, IMG)); return; }
    if (u < 33.5) return s5(ctx, u, IMG);
    if (u < 34.2) { s5(ctx, u, IMG); s6(ctx, u, IMG, false); return; }   // cards shrink while the dots take off
    if (u < 36.3) return s6(ctx, u, IMG);
    if (u < 37.0) { s7(ctx, u); s6(ctx, u, IMG, false); return; }
    if (u < 42.6) return s7(ctx, u);
    if (u < 43.4) {   // horizontal whip
      const p = E.inOutCubic(prog(u, 42.6, 43.4));
      B.withT(ctx, -p * W, 0, () => s7(ctx, u)); B.withT(ctx, (1 - p) * W, 0, () => s8(ctx, u, IMG)); return;
    }
    if (u < 47.6) return s8(ctx, u, IMG);
    if (u < 48.4) { s9(ctx, u, IMG); s8overlay(ctx, u, IMG); return; }
    return s9(ctx, u, IMG);
  },
});
// during the morph only the shrinking hero card rides over the end card
function s8overlay(ctx, u, IMG) {
  const P = heroPose(u);
  B.reelCard(ctx, IMG[B.PRINTS[HERO].k], P.x, P.y, 310, { glow: 1 - P.m, scale: P.s, alpha: 1 - E.inQuad(P.m) });
}
