// Calc Machine Connect · v4 "Quer extrair cartão de ponto, contracheque, extrato de FGTS…" (shared/kit.js)
import { run, at, hub, brandReveal, statement, bigWord, label, fitTitle, life, doc, DOCS, infinity, panel, ctext, flare, C, sp, M } from '../shared/kit.js';

const H = (w, n = 0, d = 0) => () => at(w, n) + d;
let T = {};
// three documents fan in on their names, then an orange scan line reads them
function docs(ctx, t, t0, t1) {
  const L = life(t, t0, t1);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(0, -L.out * 160);
  label(ctx, t, 'QUER EXTRAIR', 345, t0 + 0.05);
  const scan = M.prog(t, T.auto - 0.1, T.auto + 1.4);
  const list = [[DOCS.ponto, T.ponto, 290, -0.09], [DOCS.cheque, T.cheque, 540, 0], [DOCS.fgts, T.fgts, 790, 0.09]];
  list.forEach(([kind, tk, x, rot], i) => {
    const k = sp(t, tk, M.SPRING.bouncy);
    const yy = 520 + (i === 1 ? -15 : 8) + 6 * Math.sin(t * 1.3 + i);
    doc(ctx, x, yy, 200, 260, kind, k, rot * k, scan > 0 && scan < 1 ? (scan * 1.15 - i * 0.07) : -1);
  });
  if (t > T.ia - 0.1) {
    const k = sp(t, T.ia, M.SPRING.bouncy);
    ctx.save(); ctx.translate(540, 705); ctx.scale(k, k);
    const f = M.font(34, 700, 'Display'), tw = M.layout(ctx, 'com inteligência artificial', f).width + 70;
    M.rrect(ctx, -tw / 2, -38, tw, 76, 38); ctx.fillStyle = C.orange; ctx.fill();
    ctext(ctx, 'com inteligência artificial', 0, 12, f, C.cream);
    ctx.restore();
  }
  ctx.restore();
}
function price(ctx, t, t0, t1) {
  const L = life(t, t0, t1);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(0, (1 - L.k) * 40 - L.out * 140);
  label(ctx, t, 'NA SUA IA, COM', 345, t0 + 0.05);
  const k = sp(t, T.preco, M.SPRING.bouncy);
  ctx.save(); ctx.translate(540, 440); ctx.rotate(-0.05 * k + 0.02 * Math.sin(t * 1.5)); ctx.scale(k, k);
  // price tag
  ctx.beginPath(); ctx.moveTo(-260, -70); ctx.lineTo(200, -70); ctx.lineTo(270, 0); ctx.lineTo(200, 70); ctx.lineTo(-260, 70); ctx.closePath();
  ctx.fillStyle = C.cream; ctx.fill();
  ctx.beginPath(); ctx.arc(190, 0, 14, 0, M.TAU); ctx.fillStyle = C.bg; ctx.fill();
  ctext(ctx, 'PREÇO FIXO', -30, 24, M.font(68, 700, 'Display'), C.ink);
  ctx.restore();
  infinity(ctx, 540, 590, 80, M.E.inOutCubic(M.prog(t, T.ilim - 0.15, T.ilim + 0.6)));
  if (t > T.ilim) fitTitle(ctx, t, 'ILIMITADO', 700, T.ilim + 0.1, 100, C.orange);
  ctx.restore();
}
run({
  shrinkAt: 1.0,
  init() {
    T = {
      ponto: at('cartão'), cheque: at('contracheque'), fgts: at('extrato'), auto: at('automática'), ia: at('inteligência'),
      eu: at('Eu'), calc: at('Calc'), agora: at('agora'), claude: at('Claude'), gpt: at('GPT'), gem: at('Gemini'),
      voce: at('Você'), dentro: at('dentro'), preco: at('preço'), ilim: at('ilimitado'), e: at('É'), imp: at('impressionante'),
    };
  },
  get punches() { return [T.ilim, T.imp]; },
  tagAt: (t) => (t < T.eu - 0.2 ? 'EXTRAÇÃO AUTOMÁTICA' : t < T.voce - 0.2 ? 'CALC MACHINE CONNECT' : t < T.e - 0.2 ? 'PREÇO FIXO · ILIMITADO' : 'CALC MACHINE CONNECT'),
  endLine: 'PREÇO FIXO · ILIMITADO',
  stage(ctx, t, IMG) {
    docs(ctx, t, 1.05, T.eu - 0.1);
    brandReveal(ctx, t, IMG, { t0: T.eu - 0.1, t1: T.agora - 0.15, tName: T.calc, labelText: 'EU RECOMENDO QUE VOCÊ CONHEÇA O', tLabel: T.eu });
    hub(ctx, t, { t0: T.agora - 0.15, t1: T.preco - 0.35, chips: [['Claude', T.claude], ['GPT', T.gpt], ['Gemini', T.gem]], sub: ['dentro da SUA IA', T.dentro] });
    price(ctx, t, T.preco - 0.35, T.e - 0.1);
    bigWord(ctx, t, 'IMPRESSIONANTE!', T.imp, null, 560, C.cream);
    if (t > T.imp) flare(ctx, t, T.imp + 0.05, 560);
  },
  hits: [
    [0.0, 'open', 'blip', { pitch: 'E6' }],
    [1.0, 'card shrinks', 'whoosh', { len: 0.45, from: 400, to: 2400 }],
    [H('cartão'), 'doc ponto', 'pop', { pitch: 'C5' }],
    [H('contracheque'), 'doc cheque', 'pop', { pitch: 'E5' }],
    [H('extrato'), 'doc fgts', 'pop', { pitch: 'G5' }],
    [H('automática', 0, -0.1), 'scan', 'riser', { len: 0.6 }],
    [H('automática', 0, 0.5), 'scan click', 'type', { len: 0.8, n: 8 }],
    [H('inteligência'), 'IA pill', 'pop', { pitch: 'A5' }],
    [H('Eu', 0, -0.1), 'brand', 'whoosh', { len: 0.35, from: 2400, to: 600 }],
    [H('Calc', 0, 0.15), 'symbol plugs', 'thud', { pitch: 'C3' }],
    [H('Calc', 0, 0.25), 'wordmark', 'bell', { pitch: 'E6' }],
    [H('agora', 0, -0.15), 'hub', 'whoosh', { len: 0.35, from: 600, to: 2400 }],
    [H('Claude'), 'chip claude', 'pop', { pitch: 'C5' }],
    [H('GPT'), 'chip gpt', 'pop', { pitch: 'E5' }],
    [H('Gemini'), 'chip gemini', 'pop', { pitch: 'G5' }],
    [H('dentro'), 'sua ia', 'click'],
    [H('preço', 0, -0.35), 'price', 'whoosh', { len: 0.35, from: 2400, to: 600 }],
    [H('preço'), 'tag', 'thud', { pitch: 'D3' }],
    [H('ilimitado'), 'ILIMITADO', 'impact'],
    [H('impressionante'), 'IMPRESSIONANTE', 'impact'],
    [() => M.CFG.duration - 2.6 - 0.42, 'push through', 'riser', { len: 0.45 }],
    [() => M.CFG.duration - 2.6, 'end card', 'impact'],
    [() => M.CFG.duration - 2.6 + 0.55, 'pill clicks', 'click'],
    [() => M.CFG.duration - 2.6 + 0.7, 'logo', 'bell', { pitch: 'E6' }],
  ],
});
