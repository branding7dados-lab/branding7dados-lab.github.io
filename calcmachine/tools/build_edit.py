# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""Per video: cut list -> edit.json, corrected + film-timed words.json, cleaned vo.wav, graded frames.

Cuts are placed in measured silence only: the head starts 0.22 s before the first voiced frame,
the tail ends 0.45 s after the last, and an inner pause is removed only between its own silent
edges (80 ms kept on each side), so no word is clipped. Whisper's word times are warped onto the
measured speech span (its first word tends to start early in leading silence).
    uv run tools/build_edit.py [v1 v2 ...] [--no-frames]
"""
import json, re, subprocess, sys
from pathlib import Path
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfiltfilt

ROOT = Path(__file__).resolve().parent.parent
END_CARD = 2.6
# inner pauses to remove, in source seconds (measured silence edges, -38 dB, 120 Hz high-pass)
PAUSES = {"v3": [(11.19, 11.69), (21.80, 22.25)]}
FIX = [  # caption spelling: brands and products as they are written
    (r"^Cloud([,.?!]?)$", r"Claude\1"), (r"^Calg$", "Calc"), (r"^Connector$", "Connect"),
    (r"^PJC$", ".PJC"), (r"^CalcMachine([,.?!]?)$", r"Calc Machine\1"),
    (r"^Inteligência$", "inteligência"), (r"^Artificial([,.?!]?)$", r"artificial\1"),
]
MERGE = [("chat", "GPT", "ChatGPT"), ("PJE", "Calc", "PJe-Calc"), ("PJ", "Calcula", "PJe-Calc"), ("contra", "-cheque", "contracheque")]

def speech_span(wav):
    x, sr = sf.read(wav)
    y = sosfiltfilt(butter(4, [200, 4000], "bandpass", fs=sr, output="sos"), x)
    h = sr // 100
    e = np.array([np.sqrt((y[i:i + h] ** 2).mean()) for i in range(0, len(y) - h, h)])
    db = 20 * np.log10(e + 1e-9); db -= np.percentile(db, 95)
    on = np.flatnonzero(db > -16)
    return on[0] / 100, (on[-1] + 1) / 100, len(x) / sr

def fix_words(words):
    out = []
    for w in words:
        if out and any(out[-1]["w"] == a and re.sub(r"[,.?!]", "", w["w"]) == b for a, b, _ in MERGE):
            a, b, m = next(m for m in MERGE if out[-1]["w"] == m[0] and re.sub(r"[,.?!]", "", w["w"]) == m[1])
            out[-1] = {**out[-1], "w": m + re.sub(r"[^,.?!]", "", w["w"]), "t1": w["t1"]}
            continue
        t = w["w"]
        for pat, rep in FIX: t = re.sub(pat, rep, t)
        out.append({**w, "w": t})
    return out

def to_film(t, segs):
    acc = 0.0
    for a, b in segs:
        if t <= b: return acc + max(0.0, t - a)
        acc += b - a
    return acc

def build(v, frames=True):
    d = ROOT / v
    raw = json.load(open(d / "words_raw.json"))["words"]
    s0, s1, dur = speech_span(d / "media" / "a16k.wav")
    t_in, t_out = max(0.0, s0 - 0.22), min(dur, s1 + 0.45)
    cuts = [(a + 0.08, b - 0.08) for a, b in PAUSES.get(v, [])]
    segs, a = [], t_in
    for c0, c1 in cuts: segs.append([round(a, 3), round(c0, 3)]); a = c1
    segs.append([round(a, 3), round(t_out, 3)])
    talk = sum(b - a for a, b in segs)
    # warp whisper onto the measured span, then onto film time
    w0, w1 = raw[0]["t0"], raw[-1]["t1"]
    warp = lambda t: s0 + (t - w0) * (s1 - s0) / (w1 - w0)
    words = [{"w": w["w"], "t0": round(to_film(warp(w["t0"]), segs), 3), "t1": round(to_film(warp(w["t1"]), segs), 3)} for w in fix_words(raw)]
    edit = {"segments": segs, "talk": round(talk, 3), "end_card": round(talk, 3), "duration": round(talk + END_CARD, 3),
            "speech_src": [s0, s1], "cuts_film": [round(to_film(c1, segs), 3) for _, c1 in cuts]}
    json.dump(edit, open(d / "edit.json", "w"), indent=1)
    json.dump({"words": words}, open(d / "words.json", "w"), ensure_ascii=False, indent=1)
    film = json.load(open(d / "film.json")) if (d / "film.json").exists() else {}
    film.update(title=f"Calc Machine Connect · {v}", duration=edit["duration"], formats=["9x16"], poster=round(edit["duration"] - 0.9, 2))
    json.dump(film, open(d / "film.json", "w"), indent=1)
    # voice: each segment cleaned, 12 ms fades at every cut, concatenated
    src = d / "media" / "raw.mp4"
    parts = []
    for i, (a, b) in enumerate(segs):
        p = d / "audio" / f"seg{i}.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(a), "-t", str(b - a), "-i", str(src), "-af",
                        f"afade=t=in:d=0.012,afade=t=out:st={b - a - 0.012:.3f}:d=0.012", "-ar", "48000", "-ac", "2", str(p)], check=True)
        parts.append(p)
    lst = d / "audio" / "segs.txt"; lst.write_text("".join(f"file '{p.name}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", str(lst), "-af",
                    "highpass=f=80,afftdn=nf=-32:nr=10,acompressor=threshold=-22dB:ratio=2.5:attack=8:release=140:makeup=2,"
                    "equalizer=f=3200:t=q:w=1.2:g=2,loudnorm=I=-16:TP=-2:LRA=7,apad", "-t", str(edit["duration"]),
                    "-ar", "48000", str(d / "audio" / "vo.wav")], check=True)
    if frames:
        fd = d / "media" / "frames"; fd.mkdir(parents=True, exist_ok=True)
        for f in fd.glob("*.jpg"): f.unlink()
        sel = "+".join(f"between(t,{a},{b})" for a, b in segs)
        grade = ("eq=contrast=1.07:saturation=1.06:brightness=0.005:gamma=0.98,"
                 "colorbalance=rs=-0.03:gs=0.01:bs=0.03:rm=0.0:gm=0.0:bm=0.0:rh=0.04:gh=0.02:bh=-0.03,"
                 "vignette=angle=PI/5:mode=forward")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf",
                        f"select='{sel}',setpts=N/FRAME_RATE/TB,fps=30,scale=1080:1920,{grade}", "-q:v", "3",
                        str(fd / "%04d.jpg")], check=True)
    print(v, "segments", segs, "talk", round(talk, 2), "film", edit["duration"], "frames", len(list((d / 'media' / 'frames').glob('*.jpg'))))

args = [a for a in sys.argv[1:] if not a.startswith("--")]
for v in args or ["v1", "v2", "v3", "v4"]:
    build(v, "--no-frames" not in sys.argv)
