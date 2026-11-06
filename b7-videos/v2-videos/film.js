// V2 · Vídeos: pure function of time. window.seek(t) paints frame t (see ../shared/motion.js).
// docs/shotlist.md is the plan. VO word times are in seconds on audio/vo.wav (phrases from
// "Na Branding7" on are delayed 0.9 s so the brand lands on the drop at beat 20).
import * as M from '../shared/motion.js';
import * as B from '../shared/b7.js';

const { W, H, E, TAU, prog, clamp, lerp, springU, springKeys, SPRING, wobble, rrect } = M;
const { C, font, sec } = B;

const HITS = [
  [0, 'gancho', 'impact', { gain: 0.55 }],
  [0.1, 'texto digitando', 'type', { len: 0.9, n: 7, gain: 0.12 }],
  [2.4, 'reel entra', 'pop', { pitch: 'E5' }],
  [4.4, 'contador trava', 'thud', { gain: 0.3 }],
  [5.0, 'ninguém assiste', 'boing', { pitch: 260, to: 160, gain: 0.22 }],
  [7.6, 'whip concorrentes', 'whoosh', { len: 0.5 }],
  [8.8, 'concorrente 1', 'pop', { pitch: 'A5' }],
  [9.4, 'concorrente 2', 'pop', { pitch: 'C#6' }],
  [10.0, 'concorrente 3', 'pop', { pitch: 'E6' }],
  [11.96, 'sua empresa', 'click'],
  [15.4, 'despercebida', 'whoosh', { len: 0.8, from: 1800, to: 300, gain: 0.2 }],
  [20, 'riser para o drop', 'riser', { len: 2.2 }],
  [20, 'drop: Branding7', 'impact'],
  [20.4, 'logo', 'bell', { pitch: 'A6' }],
  [22.2, 'logo vira header', 'whoosh', { len: 0.4, gain: 0.2 }],
  [23.76, 'moldura de seleção', 'tick', { gain: 0.3 }],
  [25.9, 'whip claro', 'whoosh', { len: 0.5 }],
  [27, 'chip roteiro', 'blip', { pitch: 'E6' }],
  [27.6, 'chip produção', 'blip', { pitch: 'A6' }],
  [28.2, 'chip edição', 'blip', { pitch: 'C#7' }],
  [28.8, 'chip resultado', 'blip', { pitch: 'E7' }],
  [32.4, 'whip conversa', 'whoosh', { len: 0.5, pan: -0.3 }],
  [33.88, 'conversa', 'pop', { pitch: 'A5' }],
  [34.6, 'balão estoura', 'pop', { pitch: 'E6', to: 'A6' }],
  [36, 'print 687 mil', 'pop', { pitch: 'A4' }],
  [36.6, 'print 224 mil', 'pop', { pitch: 'C#5' }],
  [37.2, 'print 123 mil', 'pop', { pitch: 'E5' }],
  [37.8, 'print 29,6 mil', 'pop', { pitch: 'A5' }],
  [38.4, 'print 27,8 mil', 'pop', { pitch: 'C#6' }],
  [39.0, 'print 23,8 mil', 'pop', { pitch: 'E6' }],
  [39.6, 'print 10 mil', 'pop', { pitch: 'A6' }],
  [40.2, 'contador fecha', 'coins'],
  [42.5, 'whip para pergunta', 'whoosh', { len: 0.5 }],
  [46.9, 'whip para CTA', 'whoosh', { len: 0.5, pan: 0.3 }],
  [47.2, 'CTA', 'impact', { gain: 0.45 }],
  [48.0, 'clique no link', 'click'],
  [52, 'resolução', 'crash', { len: 2.5, gain: 0.18 }],
];

const SX = 84;

// ------------------------------------------------------------- S1 hook (u 0..8.2)
function s1(ctx, u) {
  B.bgDark(ctx, u, 11);
  const kd = springU(u, -0.5, SPRING.bouncy);
  ctx.fillStyle = C.magenta;
  ctx.beginPath(); ctx.arc(SX + 22, lerp(-80, 236, kd), 20 * (1 + 0.25 * wobble(u - 0.2, 2.4, 6)), 0, TAU); ctx.fill();
  B.words(ctx, u, [
    { size: 118, weight: 800, words: [['Você', 0.0], ['tá', 0.24]] },
    { size: 118, weight: 800, words: [['cansado', 0.40], ['de', 1.06]] },
    { size: 118, weight: 800, words: [['postar', 1.20, 'g'], ['vídeos', 1.58, 'g']] },
    { size: 70, weight: 600, dy: 112, words: [['que', 1.96], ['ninguém', 2.20, 'm'], ['assiste?', 2.56, 'm']] },
  ], { x: SX, y: 400, lineGap: 1.02 });
  // the lonely reel: views crawl to 320 and stall
  const k = springU(u, 2.2, SPRING.snappy);
  if (k <= 0) return;
  const cw = 380, ch = 540, cx = 540, cy = 1130;
  [[-1, '540'], [1, '612']].forEach(([s, v]) => {
    const kk = springU(u, 2.8 + (s > 0 ? 0.3 : 0), SPRING.snappy);
    B.grayPost(ctx, cx + s * 300 - cw * 0.35, cy - ch * 0.35 + 30, cw * 0.7, ch * 0.7, { theme: 'dark', alpha: clamp(kk) * 0.45, rot: s * 0.12, views: v });
  });
  ctx.save(); ctx.translate(0, (1 - k) * 500);
  B.grayPost(ctx, cx - cw / 2, cy - ch / 2, cw, ch, { theme: 'dark', alpha: clamp(k * 2), rot: -0.04 + 0.03 * wobble(u - 4.4, 3, 5) });
  const n = Math.round(320 * E.outCubic(prog(u, 2.6, 4.4)));
  B.viewPill(ctx, cx - cw / 2 + 30, cy + ch / 2 - 110, 40, String(n), C.white);
  // a progress bar that stops a third of the way
  const pb = 0.32 * E.outCubic(prog(u, 2.6, 4.4));
  rrect(ctx, cx - 200, cy + ch / 2 + 60, 400, 12, 6); ctx.fillStyle = '#2A3148'; ctx.fill();
  rrect(ctx, cx - 200, cy + ch / 2 + 60, 400 * pb, 12, 6); ctx.fillStyle = C.magenta; ctx.fill();
  ctx.restore();
}

// ------------------------------------------------------------- S3 concorrentes (u 7.4..20.6)
function s3(ctx, u) {
  B.bgDark(ctx, u, 12);
  const fade = E.inOutCubic(prog(u, 16.8, 19.6));   // the pause: everything sinks back
  ctx.save(); ctx.globalAlpha = 1 - fade * 0.9;
  B.words(ctx, u, [
    { size: 92, weight: 700, words: [['Enquanto', 3.86], ['seus', 4.20]] },
    { size: 92, weight: 700, words: [['concorrentes', 4.38]] },
    { size: 92, weight: 700, words: [['aparecem,', 5.06]] },
    { size: 92, weight: 800, dy: 128, words: [['sua', 5.98, 'g'], ['empresa', 6.10, 'g']] },
    { size: 92, weight: 800, words: [['continua', 6.44, 'g'], ['passando', 7.10, 'g']] },
    { size: 92, weight: 800, words: [['despercebida?', 7.70, 'm']] },
  ], { x: SX, y: 370, lineGap: 1.06 });
  ctx.restore();
  // competitors' reels shoot up with their counts climbing (illustrative)
  const comps = [[260, 98, 8.8], [540, 125, 9.4], [820, 76, 10.0]];
  comps.forEach(([x, v, u0], i) => {
    const k = springU(u, u0 - 0.15, SPRING.bouncy);
    if (k <= 0) return;
    const w = 236, h = 336, y = 1260 - (i === 1 ? 50 : 0) + (1 - k) * 600 + fade * 80;
    ctx.save(); ctx.globalAlpha = clamp(k * 2) * (1 - fade * 0.7);
    rrect(ctx, x - w / 2, y - h / 2, w, h, 18);
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, ['#3B2A6B', '#2B3C7A', '#5A2A5E'][i]); g.addColorStop(1, '#141A30');
    ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 30; ctx.fill(); ctx.shadowColor = 'transparent';
    B.icon(ctx, 'play', x, y - 30, 80, 'rgba(255,255,255,0.85)');
    const n = Math.round(v * E.outCubic(prog(u, u0, u0 + 2.2)));
    B.viewPill(ctx, x - w / 2 + 16, y + h / 2 - 66, 26, `${n} mil`, C.white);
    B.icon(ctx, 'up', x + w / 2 - 30, y - h / 2 + 30, 34, C.green, 0.14);
    ctx.restore();
  });
  // your reel: tiny, gray, and it fades out on "despercebida"
  const ky = springU(u, sec(5.98) - 0.2, SPRING.snappy);
  if (ky > 0) {
    const gone = E.inOutCubic(prog(u, sec(7.7), sec(7.7) + 1.6));
    const w = 190 * (1 - 0.3 * gone), h = w * 1.42, x = 540, y = 1360 + gone * 40;
    B.grayPost(ctx, x - w / 2, y - h / 2, w, h, { theme: 'dark', alpha: clamp(ky * 2) * (1 - gone * 0.85) * (1 - fade), views: '320' });
    ctx.save(); ctx.globalAlpha = clamp(ky * 2) * (1 - gone) * (1 - fade);
    rrect(ctx, x - 70, y - h / 2 - 54, 140, 44, 22); ctx.fillStyle = C.magenta; ctx.fill();
    ctx.fillStyle = C.white; ctx.font = font(26, 700); ctx.textAlign = 'center'; ctx.fillText('VOCÊ', x, y - h / 2 - 23);
    ctx.restore();
  }
}

// ------------------------------------------------------------- S4 Branding7 + criamos (u 19.4..26.7)
function logoPose(u) {
  // big and centred on the drop, then it docks top-left as a header
  return springKeys(u, [[19, [540, 760, 1]], [22.1, [150, 330, 0.3]]], SPRING.gentle);
}
function s4(ctx, u, IMG, bg = true) {
  if (bg) B.bgDark(ctx, u, 13);
  const [lx, ly, ls] = logoPose(u);
  const lh = 520 * ls;
  const from = (i) => [540 + (i - 3) * 160, 1500 + (i % 2) * 120];
  const L = B.lamp(ctx, IMG, lx, ly, lh, u, 19.5, { from, stagger: 0.1 });
  // wordmark: under the lamp when big, beside it when docked
  const d = prog(u, 22.1, 23.0), dk = E.inOutCubic(d);
  const ww = lerp(720, 330, dk);
  const wx = lerp(540 - 360, L.x + L.w + 26, dk), wy = lerp(1100, ly - 40, dk);
  B.wordmark(ctx, IMG, wx, wy, ww, prog(u, sec(10.14), sec(10.14) + 0.9));
  if (u < 22.2) return;
  B.words(ctx, u, [
    { size: 112, weight: 800, words: [['criamos', 11.28, 'gb'], ['vídeos', 11.56, 'gb']] },
    { size: 112, weight: 800, words: [['profissionais', 11.88, 'g']] },
  ], { x: SX, y: 600, lineGap: 1.06, lead: 0.4 });
  // the work itself: a video card with an editor's selection frame and a growth arrow
  const kc = springU(u, 22.9, SPRING.snappy);
  if (kc <= 0) return;
  const cx = 540, cy = 1160, w = 560, h = 400;
  ctx.save(); ctx.globalAlpha = clamp(kc * 2); ctx.translate(0, (1 - kc) * 300);
  // arrow behind
  const ap = E.outCubic(prog(u, 23.6, 25.0));
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
  // selection frame draws on, corner handles pop
  const sp = E.outCubic(prog(u, 23.6, 24.4));
  if (sp > 0) {
    const m = 18, X = cx - w / 2 - m, Y = cy - h / 2 - m, SW = w + m * 2, SH = h + m * 2;
    ctx.save(); ctx.strokeStyle = '#3FD0FF'; ctx.lineWidth = 4; ctx.setLineDash([16, 10]);
    ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X + SW * sp, Y);
    if (sp > 0.5) { ctx.moveTo(X + SW, Y + SH); ctx.lineTo(X + SW - SW * (sp - 0.5) * 2, Y + SH); }
    ctx.moveTo(X, Y); ctx.lineTo(X, Y + SH * sp); ctx.moveTo(X + SW, Y); ctx.lineTo(X + SW, Y + SH * sp);
    ctx.stroke(); ctx.setLineDash([]);
    [[X, Y], [X + SW, Y], [X, Y + SH], [X + SW, Y + SH]].forEach(([hx, hy], i) => {
      const kh = springU(u, 24.0 + i * 0.1, SPRING.bouncy);
      if (kh <= 0) return;
      ctx.fillStyle = C.white; ctx.fillRect(hx - 13 * kh, hy - 13 * kh, 26 * kh, 26 * kh);
      ctx.strokeStyle = '#3FD0FF'; ctx.strokeRect(hx - 13 * kh, hy - 13 * kh, 26 * kh, 26 * kh);
    });
    ctx.restore();
  }
  ctx.restore();
}

// ------------------------------------------------------------- S5 chips (light) (u 25.9..31.9)
function s5(ctx, u) {
  B.bgLight(ctx, u);
  B.words(ctx, u, [
    { size: 96, weight: 700, words: [['que', 12.88, 'k'], ['prendem', 13.12, 'k']] },
    { size: 96, weight: 800, words: [['a', 13.68, 'b'], ['atenção', 13.78, 'b']] },
    { size: 96, weight: 700, words: [['e', 14.24, 'k'], ['geram', 14.62, 'k']] },
    { size: 96, weight: 800, words: [['resultados.', 15.04, 'm']] },
  ], { x: SX, y: 380, lineGap: 1.06 });
  // the wave line rising through the four promises
  const wp = E.inOutCubic(prog(u, 26.2, 29.6));
  const wy = (x) => 1440 - (x / W) * 460 + 50 * Math.sin(x / 140);
  if (wp > 0) {
    ctx.save(); ctx.lineWidth = 10; ctx.lineCap = 'round';
    ctx.strokeStyle = B.brandGrad(ctx, 0, 0, W, 0, [C.blue, C.purple, C.magenta]);
    ctx.beginPath();
    for (let x = -20; x <= (W + 40) * wp; x += 12) { if (x === -20) ctx.moveTo(x, wy(x)); else ctx.lineTo(x, wy(x)); }
    ctx.stroke(); ctx.restore();
  }
  const chips = [['camera', 'Roteiro', 'estratégico', 1], ['clapper', 'Produção', 'profissional', 0], ['edit', 'Edição de', 'alto nível', 1], ['bars', 'Conteúdo', 'com resultado', 0]];
  chips.forEach(([ic, a, b, purple], i) => {
    const k = springU(u, 26.8 + i * 0.6, SPRING.bouncy);
    if (k <= 0) return;
    const w = 500, h = 160, x = i % 2 ? 1008 - w : 72, y = 860 + i * 158;
    ctx.save(); ctx.globalAlpha = clamp(k * 2);
    ctx.translate(x + w / 2, y + h / 2); ctx.rotate((i % 2 ? 1 : -1) * 0.05); ctx.scale(k, k); ctx.translate(-x - w / 2, -y - h / 2);
    rrect(ctx, x, y, w, h, 30);
    ctx.fillStyle = purple ? B.brandGrad(ctx, x, y, x + w, y + h, [C.purple, C.magenta]) : C.navy;
    ctx.shadowColor = 'rgba(20,24,60,0.3)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 14; ctx.fill(); ctx.shadowColor = 'transparent';
    rrect(ctx, x + 24, y + 24, 112, 112, 24); ctx.fillStyle = 'rgba(255,255,255,0.14)'; ctx.fill();
    B.icon(ctx, ic, x + 80, y + 80, 74, C.white, 0.09);
    ctx.fillStyle = C.white; ctx.textAlign = 'left'; ctx.font = font(44, 600);
    ctx.fillText(a, x + 164, y + 70); ctx.fillText(b, x + 164, y + 124);
    ctx.restore();
  });
}

// ------------------------------------------------------------- S6 não é só conversa (u 31.1..36)
function s6(ctx, u, bg = true) {
  if (bg) B.bgDark(ctx, u, 14);
  const out = E.inCubic(prog(u, 34.7, 35.4));
  ctx.save(); ctx.globalAlpha = 1 - out; ctx.translate(0, -out * 260);
  B.words(ctx, u, [
    { size: 124, weight: 800, words: [['E', 16.32], ['não', 16.50]] },
    { size: 124, weight: 800, words: [['é', 16.66], ['só', 16.80]] },
    { size: 124, weight: 800, words: [['conversa.', 16.94, 'g']] },
  ], { x: SX, y: 560, lineGap: 1.04 });
  ctx.restore();
  // the chat bubble inflates, then bursts into the seven dots that become the client reels
  const kb = springU(u, 32.5, SPRING.bouncy);
  const burst = prog(u, 34.6, 34.8);
  if (kb > 0 && burst < 1) {
    ctx.save(); ctx.translate(760, 1180); ctx.scale(kb * (1 + 0.25 * burst), kb * (1 + 0.25 * burst)); ctx.globalAlpha = 1 - burst;
    rrect(ctx, -200, -140, 400, 260, 70); ctx.fillStyle = B.brandGrad(ctx, -200, 0, 200, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-110, 110); ctx.lineTo(-150, 190); ctx.lineTo(-40, 110); ctx.fill();
    for (let i = -1; i <= 1; i++) { ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(i * 80, -10 + 14 * Math.sin(u * Math.PI * 2 + i), 22, 0, TAU); ctx.fill(); }
    ctx.restore();
  }
}
function burstDot(u, i) {
  const p = E.outCubic(prog(u, 34.6, 35.6));
  const a = (i / 7) * TAU + 0.4, r = 260 * p;
  return [760 + Math.cos(a) * r, 1180 + Math.sin(a) * r * 0.8];
}

// ------------------------------------------------------------- S7 alcance (u 34.6..43.2)
const CARD_U = [36, 36.6, 37.2, 37.8, 38.4, 39.0, 39.6];
function slot(i) {
  const top = i < 4, j = top ? i : i - 4, n = top ? 4 : 3, w = 226;
  return { x: 540 + (j - (n - 1) / 2) * (w + 16), y: top ? 950 : 1300, w };
}
function s7(ctx, u, IMG, bg = true) {
  if (bg) B.bgDark(ctx, u, 15);
  B.words(ctx, u, [
    { size: 76, weight: 800, words: [['Olha', 18.12, 'g'], ['o', 18.32, 'g'], ['alcance', 18.42, 'g']] },
    { size: 76, weight: 700, words: [['que', 18.90], ['nossos', 19.08], ['clientes', 19.24]] },
    { size: 76, weight: 700, words: [['já', 19.90], ['conquistaram!', 20.12]] },
  ], { x: SX, y: 330, lineGap: 1.12 });
  // dots from the burst fly to their slots and open up into the reels
  B.PRINTS.forEach((pr, i) => {
    const S = slot(i);
    const fly = springU(u, CARD_U[i] - 0.9, SPRING.snappy);
    const open = springU(u, CARD_U[i], SPRING.bouncy);
    const [bx, by] = burstDot(u, i);
    if (open < 0.05) {
      if (u < 34.6) return;
      ctx.fillStyle = M.mix(C.purple, C.magenta, i / 6);
      ctx.beginPath(); ctx.arc(lerp(bx, S.x, fly), lerp(by, S.y, fly), 22, 0, TAU); ctx.fill();
      return;
    }
    B.reelCard(ctx, IMG[pr.k], S.x, S.y, S.w, { scale: open, rot: 0.04 * wobble(u - CARD_U[i], 2, 4) * (i % 2 ? 1 : -1), pill: pr.label, pillS: 21 });
  });
  let v = 0;
  B.PRINTS.forEach((p, i) => { v += p.views * springU(u, CARD_U[i], SPRING.gentle); });
  const kc = springU(u, 36.3, SPRING.snappy);
  if (kc > 0) {
    ctx.save(); ctx.globalAlpha = clamp(kc * 2); ctx.textAlign = 'left';
    ctx.font = font(96, 800); ctx.fillStyle = C.white;
    ctx.fillText(B.fmtInt(Math.round(Math.min(v, 1125200) / 100) * 100), SX, 650);
    ctx.font = font(40, 500); ctx.fillStyle = '#C8CCE0';
    ctx.fillText('visualizações em 7 vídeos de clientes', SX, 712);
    ctx.restore();
  }
}

// ------------------------------------------------------------- S8 quer vídeos assim (light) (u 42.4..47.4)
function s8(ctx, u, IMG) {
  B.bgLight(ctx, u);
  B.words(ctx, u, [
    { size: 100, weight: 800, words: [['Quer', 21.38, 'k'], ['vídeos', 21.50, 'k']] },
    { size: 100, weight: 800, words: [['assim', 21.84, 'k']] },
    { size: 100, weight: 800, words: [['para', 22.28, 'b'], ['sua', 22.60, 'b']] },
    { size: 100, weight: 800, words: [['empresa?', 22.70, 'b']] },
  ], { x: SX, y: 400, lineGap: 1.04 });
  // marquee of the real reels
  const n = B.PRINTS.length, w = 300, gap = 30, span = n * (w + gap);
  const off = ((u - 42) * 70) % span;
  for (let j = -1; j < n + 2; j++) {
    const i = ((j % n) + n) % n;
    const x = 140 + j * (w + gap) - off;
    if (x < -w || x > W + w) continue;
    const k = springU(u, 42.6 + j * 0.15, SPRING.snappy);
    B.reelCard(ctx, IMG[B.PRINTS[i].k], x, 1180 + (1 - k) * 500, w, { pill: B.PRINTS[i].label, pillS: 24, rot: 0.03 * Math.sin(j * 2.1) });
  }
}

// ------------------------------------------------------------- S9 end card (u 46.8..56)
function s9(ctx, u, IMG) {
  B.bgDark(ctx, u, 16);
  const lh = 250, lw = lh / B.LAMP.aspect, ww = 560, gap = 34;
  const x0 = (W - (lw + gap + ww)) / 2, cy = 600;
  B.lamp(ctx, IMG, x0 + lw / 2, cy, lh, u, 46.9, { from: (i) => [540 + (i - 3) * 60, 1150], stagger: 0.1 });
  const wh = IMG.word ? ww * IMG.word.height / IMG.word.width : 0;
  B.wordmark(ctx, IMG, x0 + lw + gap, cy - wh / 2 + 20, ww, prog(u, 47.4, 48.2));
  B.tagline(ctx, 540, 840, 28, ['ESTRATÉGIA', 'CRIATIVIDADE', 'RESULTADOS'], prog(u, 48.1, 48.9));
  const k = springU(u, sec(23.52) - 0.3, SPRING.bouncy);
  const press = Math.max(0, Math.sin(Math.PI * prog(u, 47.9, 48.3)));
  const bob = -Math.abs(Math.sin(Math.PI * u));
  B.ctaPill(ctx, 540, 1120, 960, 172, u, 'CLIQUE NO LINK ABAIXO', { k, press, arrowBob: u > 48.4 ? bob : 0 });
  const ks = springU(u, sec(24.94) - 0.3, SPRING.snappy);
  if (ks > 0) {
    ctx.save(); ctx.globalAlpha = clamp(ks * 2); ctx.textAlign = 'center';
    ctx.font = font(54, 500); ctx.fillStyle = '#D9DCEB';
    ctx.fillText('e conheça nossos', 540, 1300 + (1 - ks) * 30);
    ctx.font = font(54, 700); ctx.fillStyle = C.white;
    ctx.fillText('pacotes de vídeos!', 540, 1370 + (1 - ks) * 30);
    ctx.restore();
  }
  const cp = springKeys(u, [[47.0, [1100, 1700]], [47.3, [700, 1150]]], SPRING.gentle);
  const out = E.inCubic(prog(u, 49.4, 50.2));
  if (u > 47.0) {
    B.ripple(ctx, 700, 1150, u, 48.0, 140);
    B.cursor(ctx, cp[0] + out * 500, cp[1] + out * 600, 1.4, press);
  }
}

M.film({
  fonts: B.FONTS,
  images: B.IMAGES,
  hits: HITS,
  draw(ctx, u, t, IMG) {
    if (u < 7.4) return s1(ctx, u);
    if (u < 8.2) { const w = B.whip(u, 7.4, 0.8); B.withT(ctx, 0, w.a, () => s1(ctx, u)); B.withT(ctx, 0, w.b, () => s3(ctx, u)); return; }
    if (u < 19.4) return s3(ctx, u);
    if (u < 20.6) { s3(ctx, u); s4(ctx, u, IMG, false); return; }   // the lamp's dots gather over the fading scene
    if (u < 25.9) return s4(ctx, u, IMG);
    if (u < 26.7) { const w = B.whip(u, 25.9, 0.8); B.withT(ctx, 0, w.a, () => s4(ctx, u, IMG)); B.withT(ctx, 0, w.b, () => s5(ctx, u)); return; }
    if (u < 32.0) return s5(ctx, u);
    if (u < 32.8) { const p = E.inOutCubic(prog(u, 32.0, 32.8)); B.withT(ctx, -p * W, 0, () => s5(ctx, u)); B.withT(ctx, (1 - p) * W, 0, () => s6(ctx, u)); return; }
    if (u < 34.6) return s6(ctx, u);
    if (u < 35.4) { s6(ctx, u); s7(ctx, u, IMG, false); return; }
    if (u < 42.4) return s7(ctx, u, IMG);
    if (u < 43.2) { const w = B.whip(u, 42.4, 0.8); B.withT(ctx, 0, w.a, () => s7(ctx, u, IMG)); B.withT(ctx, 0, w.b, () => s8(ctx, u, IMG)); return; }
    if (u < 46.6) return s8(ctx, u, IMG);
    if (u < 47.2) { const p = E.inOutCubic(prog(u, 46.6, 47.2)); B.withT(ctx, -p * W, 0, () => s8(ctx, u, IMG)); B.withT(ctx, (1 - p) * W, 0, () => s9(ctx, u, IMG)); return; }
    return s9(ctx, u, IMG);
  },
});
