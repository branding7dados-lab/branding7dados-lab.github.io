// Calc Machine Connect · v2 "Você já pensou em fazer cálculos ilimitados para o PJe-Calc…" (shared/kit.js)
import { run, at, hub, brandReveal, statement, ctaButton, label, infinity, title, fitTitle, life, flare, symbol, C, sp, M } from '../shared/kit.js';

const H = (w, n = 0, d = 0) => () => at(w, n) + d;
let T = {};
run({
  shrinkAt: 1.2,
  init() {
    T = {
      calc: at('cálculos'), ilim: at('ilimitados'), util: at('utilizando'), ia: at('inteligência'),
      dentro: at('dentro'), pref: at('preferida'), claude: at('Claude'), gpt: at('GPT'), gem: at('Gemini'), entao: at('Então'),
      poss: at('possível'), conheca: at('Conheça'), cm: at('Calc'), con: at('Connect'), faca: at('faça'), agora: at('agora', 1),
    };
  },
  punches: [],
  tagAt: (t) => (t < T.util - 0.2 ? 'CÁLCULOS ILIMITADOS' : t < T.entao - 0.2 ? 'INTELIGÊNCIA ARTIFICIAL' : t < T.conheca - 0.2 ? 'AGORA É POSSÍVEL' : 'CALC MACHINE CONNECT'),
  endLine: 'CONHEÇA AINDA AGORA',
  stage(ctx, t, IMG) {
    // 1. cálculos ilimitados -> PJe-Calc
    {
      const L = life(t, 1.25, T.util - 0.1);
      if (L.on) {
        ctx.save(); ctx.globalAlpha = L.alpha; ctx.translate(0, -L.out * 140);
        label(ctx, t, 'VOCÊ JÁ PENSOU EM FAZER', 345, 1.3);
        if (t > T.calc - 0.1) fitTitle(ctx, t, 'CÁLCULOS', 440, T.calc, 110);
        infinity(ctx, 540, 525, 85, M.E.inOutCubic(M.prog(t, T.ilim - 0.1, T.ilim + 0.7)));
        if (t > T.ilim) fitTitle(ctx, t, 'ILIMITADOS', 665, T.ilim + 0.1, 110, C.orange);
        ctx.restore();
      }
    }
    statement(ctx, t, { t0: T.util - 0.1, t1: T.dentro - 0.1, small: 'PARA O PJe-CALC, UTILIZANDO', tSmall: T.util, big: 'INTELIGÊNCIA', tBig: T.ia, accent: 'ARTIFICIAL', tAccent: T.ia + 0.6, cy: 500, flareAt: T.ia + 0.7 });
    hub(ctx, t, { t0: T.dentro - 0.1, t1: T.entao - 0.1, chips: [['Claude', T.claude], ['GPT', T.gpt], ['Gemini', T.gem]], sub: ['a SUA IA preferida', T.pref] });
    statement(ctx, t, { t0: T.entao - 0.05, t1: T.conheca - 0.1, small: 'ENTÃO, ISSO AGORA É', tSmall: T.entao, big: 'POSSÍVEL!', tBig: T.poss, flareAt: T.poss + 0.1, cy: 560 });
    brandReveal(ctx, t, IMG, { t0: T.conheca - 0.1, t1: T.faca - 0.1, tName: T.cm, labelText: 'CONHEÇA O', tLabel: T.conheca, connect: true, cy: 520 });
    if (t >= T.faca - 0.15) {
      label(ctx, t, 'FAÇA ISSO', 400, T.faca);
      symbol(ctx, 540, 520, 110, M.E.inOutCubic(M.prog(t, T.faca, T.faca + 0.5)), sp(t, T.faca + 0.4, M.SPRING.bouncy));
      ctaButton(ctx, t, 'AINDA AGORA', T.agora - 0.1, 690, T.agora + 0.45);
    }
  },
  hits: [
    [0.0, 'open', 'blip', { pitch: 'E6' }],
    [1.2, 'card shrinks', 'whoosh', { len: 0.45, from: 400, to: 2400 }],
    [H('cálculos'), 'CALCULOS', 'pop', { pitch: 'C5' }],
    [H('ilimitados'), 'infinity', 'riser', { len: 0.5 }],
    [H('ilimitados', 0, 0.1), 'ILIMITADOS', 'impact'],
    [H('utilizando', 0, -0.1), 'IA', 'whoosh', { len: 0.35, from: 2400, to: 600 }],
    [H('inteligência'), 'INTELIGENCIA', 'pop', { pitch: 'E5' }],
    [H('inteligência', 0, 0.6), 'ARTIFICIAL', 'pop', { pitch: 'A5' }],
    [H('dentro', 0, -0.1), 'hub', 'whoosh', { len: 0.35, from: 600, to: 2400 }],
    [H('preferida'), 'preferida', 'click'],
    [H('Claude'), 'chip claude', 'pop', { pitch: 'C5' }],
    [H('GPT'), 'chip gpt', 'pop', { pitch: 'E5' }],
    [H('Gemini'), 'chip gemini', 'pop', { pitch: 'G5' }],
    [H('Então', 0, -0.05), 'statement', 'whoosh', { len: 0.3, from: 2400, to: 700 }],
    [H('possível'), 'POSSIVEL', 'impact'],
    [H('Calc', 0, 0.15), 'symbol plugs', 'thud', { pitch: 'C3' }],
    [H('Calc', 0, 0.25), 'wordmark', 'bell', { pitch: 'E6' }],
    [H('faça', 0, 0.4), 'symbol', 'click'],
    [H('agora', 1, -0.1), 'button', 'pop', { pitch: 'D5' }],
    [H('agora', 1, 0.45), 'tap', 'click'],
    [() => M.CFG.duration - 2.6 - 0.42, 'push through', 'riser', { len: 0.45 }],
    [() => M.CFG.duration - 2.6, 'end card', 'impact'],
    [() => M.CFG.duration - 2.6 + 0.55, 'pill clicks', 'click'],
    [() => M.CFG.duration - 2.6 + 0.7, 'logo', 'bell', { pitch: 'E6' }],
  ],
});
