# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""Script-to-audio word timing without an ASR model.

Speech regions come from a band-limited (300-3400 Hz) loudness envelope, normalised per clip.
Words are laid onto the speech time in proportion to their syllable count; a word that ends in
punctuation snaps its end to the nearest pause when one is within 0.45 s.
    uv run tools/align_script.py  ->  words.json
"""
import json, re, sys
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfiltfilt

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = {
 "cena1": "Você sabia que o diagnóstico de câncer de mama também pode gerar dúvidas importantes dentro da relação de trabalho?",
 "cena2": "Durante o diagnóstico e o tratamento, podem surgir questões sobre afastamento pelo INSS, ausências para consultas e exames, manutenção de benefícios e os impactos que esses períodos podem gerar na rotina e nas verbas trabalhistas.",
 "cena3": "Por isso, além de falar sobre prevenção, o Outubro Rosa também é um momento para reforçar a importância da informação e do conhecimento sobre os direitos da trabalhadora.",
 "cena4": "Consulte sua advogada e saiba de todos os seus direitos. Cuidar da saúde também passa por conhecer os seus direitos.",
 "cena5": "Siga o Ensino Plus para mais conteúdos sobre a área trabalhista.",
}
SPOKEN = {"INSS": "i ene esse esse"}
V = "aeiouáéíóúâêôãõày"

def syl(w):
    w = SPOKEN.get(w.strip(",.?!"), w).lower()
    n = len(re.findall(r"[%s]+" % V, w))
    n += len(re.findall(r"(ia|io|ua|uo|ea|eo|oa)(?![nm])", w)) * 0  # keep diphthongs merged
    return max(1, n)

def speech_mask(path):
    x, sr = sf.read(path)
    if x.ndim > 1: x = x.mean(1)
    sos = butter(4, [300, 3400], "bandpass", fs=sr, output="sos")
    y = sosfiltfilt(sos, x)
    hop = sr // 100
    env = np.sqrt(np.convolve(y**2, np.ones(hop*3)/(hop*3), "same")[::hop])
    db = 20*np.log10(env + 1e-9)
    ref = np.percentile(db, 95)
    floor = np.percentile(db, 10)
    m = db > max(ref - 15, floor + 8)
    # close gaps < 120 ms, drop blips < 60 ms
    def runs(a):
        d = np.diff(np.r_[0, a.astype(int), 0]); return list(zip(np.where(d == 1)[0], np.where(d == -1)[0]))
    for s, e in runs(~m):
        if e - s < 12 and s > 0 and e < len(m): m[s:e] = True
    for s, e in runs(m):
        if e - s < 6: m[s:e] = False
    return m, len(x)/sr

def align(name, wav):
    m, dur = speech_mask(wav)
    t = np.flatnonzero(m) / 100.0            # speech time samples, 10 ms each
    words = SCRIPT[name].split()
    w8 = np.array([syl(w) for w in words], float)
    cum = np.r_[0, np.cumsum(w8)] / w8.sum()
    idx = np.clip((cum * (len(t)-1)).round().astype(int), 0, len(t)-1)
    b = t[idx].copy(); b[-1] = t[-1] + 0.01
    # pauses: gaps between speech runs
    gaps = [(t[i], t[i+1]) for i in range(len(t)-1) if t[i+1] - t[i] > 0.15]
    # punctuation boundaries become anchors on the nearest pause (monotonic, within 1.2 s)
    anchors, used = {}, -1
    for i, w in enumerate(words[:-1]):
        if w[-1] in ",.?!" and gaps:
            cand = [(abs(g[0] - b[i+1]) - 2 * (g[1] - g[0]), k) for k, g in enumerate(gaps) if k > used]
            if cand:
                d, k = min(cand)
                if abs(gaps[k][0] - b[i+1]) < 1.6: anchors[i] = gaps[k]; used = k
    # re-lay each anchored piece by syllables over its own speech time
    cuts = [(-1, (t[0], t[0]))] + sorted(anchors.items()) + [(len(words)-1, (t[-1]+0.01, t[-1]+0.01))]
    for (ia, ga), (ib, gb) in zip(cuts, cuts[1:]):
        lo, hi = ga[1], gb[0]
        tt = t[(t >= lo) & (t <= hi)]
        seg = w8[ia+1:ib+1]
        c = np.r_[0, np.cumsum(seg)] / seg.sum()
        bb = tt[np.clip((c * (len(tt)-1)).round().astype(int), 0, len(tt)-1)]
        bb[0], bb[-1] = lo, hi
        b[ia+1:ib+2] = bb
    out = [{"w": w, "t0": float(b[i]), "t1": float(b[i+1])} for i, w in enumerate(words)]
    for i, (g0, g1) in anchors.items():
        out[i]["t1"], out[i+1]["t0"] = g0, g1
    for o in out: o["t0"] = round(o["t0"], 2); o["t1"] = round(o["t1"], 2)
    return {"duration": round(dur, 3), "speech": [round(t[0], 2), round(t[-1], 2)], "gaps": [[round(a,2), round(c,2)] for a, c in gaps], "words": out}

res = {n: align(n, ROOT/"media"/f"{n}_16k.wav") for n in SCRIPT}
json.dump(res, open(ROOT/"words.json", "w"), ensure_ascii=False, indent=1)
for n, r in res.items():
    print(n, r["duration"], "speech", r["speech"], "gaps", r["gaps"])
    print("   ", " ".join(f'{w["w"]}@{w["t0"]}' for w in r["words"]))
