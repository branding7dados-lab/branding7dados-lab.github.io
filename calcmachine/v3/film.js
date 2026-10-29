// Calc Machine Connect · v3 "Gente, eu estou impressionado com a evolução do Calc Machine…" (shared/kit.js)
import { run, at, hub, brandReveal, statement, bigWord, label, fitTitle, life, panel, ctext, badgeCheck, flare, C, sp, M } from '../shared/kit.js';

const H = (w, n = 0, d = 0) => () => at(w, n) + d;
let T = {};
// IA -> cálculos -> PJe-Calc: three nodes wired left to right, each lit on its word
function pipeline(ctx, t, t0, t1, nodes) {
  const L = life(t, t0, t1);
  if (!L.on) return;
  ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(0, (1 - L.k) * 40 - L.out * 140);
  label(ctx, t, 'A FERRAMENTA QUE UTILIZA', 345, t0 + 0.05);
  const xs = [235, 540, 845], y = 520;
  nodes.forEach(([lab, tn, accent], i) => {
    const k = sp(t, tn, M.SPRING.bouncy);
    if (i > 0) {
      const p = M.E.inOutCubic(M.prog(t, tn - 0.25, tn + 0.1));
      ctx.beginPath(); ctx.moveTo(xs[i - 1] + 108, y); ctx.lineTo(M.lerp(xs[i - 1] + 108, xs[i] - 108, p), y);
      ctx.lineWidth = 5; ctx.strokeStyle = C.orange; ctx.setLineDash([14, 12]); ctx.lineDashOffset = -t * 50; ctx.stroke(); ctx.setLineDash([]);
    }
    if (k <= 0) return;
    ctx.save(); ctx.translate(xs[i], y); ctx.scale(k, k);
    panel(ctx, -106, -86, 212, 172, 32, accent ? C.orange : C.panel, accent ? 'rgba(0,0,0,0)' : 'rgba(242,240,232,0.2)');
    const f = M.font(lab.length > 7 ? 32 : 40, 700, 'Display');
    lab.split('\n').forEach((ln, j, arr) => ctext(ctx, ln, 0, 14 + (j - (arr.length - 1) / 2) * 44, f, C.cream));
    ctx.restore();
  });
  ctx.restore();
}
run({
  shrinkAt: 1.0,
  init() {
    T = {
      imp: at('impressionado'), evol: at('evolução'), calc: at('Calc'), ferr: at('ferramenta'), ia: at('inteligência'), calcs: at('cálculos'),
      sys: at('PJe-Calc'), imp2: at('impressionado', 1), voce: at('Você'), claude: at('Claude'), gpt: at('GPT'), gem: at('Gemini'),
      assin: at('assinatura'), e: at('É'), simp: at('simplesmente'), sens: at('sensacional'),
    };
  },
  get punches() { return [T.imp, T.imp2, T.sens]; },
  tagAt: (t) => (t < T.ferr - 0.2 ? 'A EVOLUÇÃO' : t < T.voce - 0.2 ? 'IA + PJe-CALC' : t < T.e - 0.2 ? 'DENTRO DA SUA IA' : 'CALC MACHINE CONNECT'),
  endLine: 'NO CLAUDE, NO GPT E NO GEMINI',
  stage(ctx, t, IMG) {
    bigWord(ctx, t, 'IMPRESSIONADO', T.imp, T.evol - 0.15, 560);
    brandReveal(ctx, t, IMG, { t0: T.evol - 0.15, t1: T.ferr - 0.1, tName: T.calc, labelText: 'COM A EVOLUÇÃO DO', tLabel: T.evol });
    pipeline(ctx, t, T.ferr - 0.1, T.imp2 - 0.2, [['IA', T.ia, false], ['CÁLCULOS', T.calcs, false], ['PJe-Calc', T.sys, true]]);
    bigWord(ctx, t, 'IMPRESSIONADO!', T.imp2, T.voce - 0.1, 560, C.orange);
    hub(ctx, t, { t0: T.voce - 0.1, t1: T.e - 0.1, lead: ['VOCÊ VAI CONSEGUIR USAR AGORA', T.voce], chips: [['Claude', T.claude], ['GPT', T.gpt], ['Gemini', T.gem]], sub: ['com a SUA assinatura', T.assin] });
    statement(ctx, t, { t0: T.e - 0.05, t1: null, small: 'É SIMPLESMENTE', tSmall: T.e, big: 'SENSACIONAL!', tBig: T.sens, flareAt: T.sens + 0.1, cy: 560 });
  },
  hits: [
    [0.0, 'open', 'blip', { pitch: 'E6' }],
    [1.0, 'card shrinks', 'whoosh', { len: 0.45, from: 400, to: 2400 }],
    [H('impressionado'), 'IMPRESSIONADO', 'impact'],
    [H('evolução', 0, -0.15), 'brand', 'whoosh', { len: 0.35, from: 2400, to: 600 }],
    [H('Calc', 0, 0.15), 'symbol plugs', 'thud', { pitch: 'C3' }],
    [H('Calc', 0, 0.25), 'wordmark', 'bell', { pitch: 'E6' }],
    [H('ferramenta', 0, -0.1), 'pipeline', 'whoosh', { len: 0.35, from: 600, to: 2400 }],
    [H('inteligência'), 'node IA', 'pop', { pitch: 'C5' }],
    [H('cálculos'), 'node calculos', 'pop', { pitch: 'E5' }],
    [H('PJe-Calc'), 'node pje', 'pop', { pitch: 'G5' }],
    [H('Impressionado'), 'IMPRESSIONADO 2', 'impact'],
    [H('Você', 0, -0.1), 'hub', 'whoosh', { len: 0.35, from: 2400, to: 600 }],
    [H('Claude'), 'chip claude', 'pop', { pitch: 'C5' }],
    [H('GPT'), 'chip gpt', 'pop', { pitch: 'E5' }],
    [H('Gemini'), 'chip gemini', 'pop', { pitch: 'G5' }],
    [H('assinatura'), 'assinatura', 'click'],
    [H('sensacional'), 'SENSACIONAL', 'impact'],
    [() => M.CFG.duration - 2.6 - 0.42, 'push through', 'riser', { len: 0.45 }],
    [() => M.CFG.duration - 2.6, 'end card', 'impact'],
    [() => M.CFG.duration - 2.6 + 0.55, 'pill clicks', 'click'],
    [() => M.CFG.duration - 2.6 + 0.7, 'logo', 'bell', { pitch: 'E6' }],
  ],
});
