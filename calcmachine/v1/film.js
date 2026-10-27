// Calc Machine Connect · v1 "Você já pensou em usar o Calc Machine dentro do Claude…" (shared/kit.js)
import { run, at, hub, pjcFile, brandReveal, statement, ctaButton, label, symbol, C, sp, M } from '../shared/kit.js';

const H = (w, n = 0, d = 0) => () => at(w, n) + d;
let T = {};
run({
  shrinkAt: 1.2,
  init() {
    T = {
      calc: at('Calc'), claude: at('Claude'), chat: at('ChatGPT'), gem: at('Gemini'), assin: at('assinatura'),
      gerando: at('gerando'), pjc: at('.PJC'), sys: at('PJe-Calc'), auto: at('automática'), calc2: at('Calc', 1),
      pois: at('Pois'), poss: at('possível'), vou: at('Vou'), desc: at('descrição'), acess: at('acessar'), fant: at('fantástica'),
    };
    T.punches = [T.poss, T.fant];
  },
  get punches() { return T.punches; },
  tagAt: (t) => (t < T.claude - 0.3 ? 'CALC MACHINE CONNECT' : t < T.gerando - 0.2 ? 'DENTRO DA SUA IA' : t < T.pois - 0.2 ? 'PJe-CALC AUTOMÁTICO' : 'AGORA É POSSÍVEL'),
  endLine: 'LINK NA DESCRIÇÃO',
  stage(ctx, t, IMG) {
    brandReveal(ctx, t, IMG, { t0: 1.25, t1: T.claude - 0.35, tName: T.calc, labelText: 'VOCÊ JÁ PENSOU EM USAR O', tLabel: 1.3 });
    hub(ctx, t, { t0: T.claude - 0.4, t1: T.gerando - 0.1, chips: [['Claude', T.claude], ['ChatGPT', T.chat], ['Gemini', T.gem]], sub: ['com a SUA assinatura', T.assin] });
    pjcFile(ctx, t, { t0: T.gerando, t1: T.calc2 - 0.2, tPjc: T.pjc, tSys: T.sys, tAuto: T.auto, cy: 495 });
    brandReveal(ctx, t, IMG, { t0: T.calc2 - 0.35, t1: T.pois - 0.05, tName: T.calc2, labelText: 'COM O', tLabel: T.calc2 - 0.3 });
    statement(ctx, t, { t0: T.pois - 0.05, t1: T.vou - 0.05, small: 'POIS É, ISSO AGORA É', tSmall: T.pois, big: 'POSSÍVEL.', tBig: T.poss, flareAt: T.poss + 0.1, cy: 600 });
    if (t >= T.vou - 0.1) {
      label(ctx, t, 'ACESSE ESSA FERRAMENTA FANTÁSTICA', 380, T.vou);
      symbol(ctx, 540, 520, 120, M.E.inOutCubic(M.prog(t, T.vou, T.vou + 0.6)), sp(t, T.vou + 0.5, M.SPRING.bouncy));
      ctaButton(ctx, t, 'LINK NA DESCRIÇÃO', T.desc - 0.1, 700, T.acess);
    }
  },
  hits: [
    [0.0, 'open', 'blip', { pitch: 'E6' }],
    [1.2, 'card shrinks', 'whoosh', { len: 0.45, from: 400, to: 2400 }],
    [H('Calc', 0, 0.15), 'symbol plugs', 'thud', { pitch: 'C3' }],
    [H('Calc', 0, 0.25), 'wordmark', 'bell', { pitch: 'E6' }],
    [H('Claude', 0, -0.4), 'hub', 'whoosh', { len: 0.35, from: 2400, to: 600 }],
    [H('Claude'), 'chip claude', 'pop', { pitch: 'C5' }],
    [H('ChatGPT'), 'chip chatgpt', 'pop', { pitch: 'E5' }],
    [H('Gemini'), 'chip gemini', 'pop', { pitch: 'G5' }],
    [H('assinatura'), 'assinatura', 'click'],
    [H('gerando'), 'file', 'whoosh', { len: 0.35, from: 600, to: 2600 }],
    [H('.PJC'), '.PJC', 'pop', { pitch: 'A5' }],
    [H('PJe-Calc'), 'system', 'tick'],
    [H('automática'), 'progress', 'type', { len: 1.0, n: 10 }],
    [H('automática', 0, 1.1), 'done', 'bell', { pitch: 'A6' }],
    [H('Calc', 1, 0.15), 'symbol plugs 2', 'thud', { pitch: 'C3' }],
    [H('Pois', 0, -0.05), 'statement', 'whoosh', { len: 0.3, from: 2400, to: 700 }],
    [H('possível'), 'POSSÍVEL', 'impact'],
    [H('Vou'), 'cta', 'whoosh', { len: 0.35, from: 600, to: 2400 }],
    [H('descrição', 0, -0.1), 'button', 'pop', { pitch: 'D5' }],
    [H('acessar'), 'tap', 'click'],
    [H('fantástica'), 'fantastica', 'blip', { pitch: 'A6' }],
    [() => M.CFG.duration - 2.6 - 0.42, 'push through', 'riser', { len: 0.45 }],
    [() => M.CFG.duration - 2.6, 'end card', 'impact'],
    [() => M.CFG.duration - 2.6 + 0.55, 'pill clicks', 'click'],
    [() => M.CFG.duration - 2.6 + 0.7, 'logo', 'bell', { pitch: 'E6' }],
  ],
});
