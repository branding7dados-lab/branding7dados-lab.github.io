# /// script
# requires-python = ">=3.10"
# dependencies = ["numpy", "scipy", "soundfile"]
# ///
"""A screen-recording video (screen on top, webcam below in one 720x1280 source) -> edit.json, words.json,
vo.wav and two graded frame sequences: media/screen/ (the app, ungraded so UI colours stay true) and
media/frames/ (the presenter, graded like the other reels, 1080 wide; the card crops it).

Cuts only shorten measured pauses (-38 dB): 0.12 s of the silence is kept on each side.
    uv run tools/build_split.py v5
"""
import json, re, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
v = sys.argv[1]
d = ROOT / v
SPLIT = 737                                   # first webcam row in the source
END_CARD = 2.6
cfg = json.load(open(d / "split.json"))      # {"in":, "out":, "pauses": [[a, b], ...]}
raw = json.load(open(d / "words_raw.json"))["words"]

cuts = [(a + 0.12, b - 0.12) for a, b in cfg["pauses"] if b - a > 0.6]
segs, a = [], cfg["in"]
for c0, c1 in cuts: segs.append([round(a, 3), round(c0, 3)]); a = c1
segs.append([round(a, 3), cfg["out"]])
talk = sum(b - a for a, b in segs)

def to_film(t):
    acc = 0.0
    for a, b in segs:
        if t <= b: return acc + max(0.0, t - a)
        acc += b - a
    return acc

words = [{"w": w["w"], "t0": round(to_film(w["t0"]), 3), "t1": round(to_film(w["t1"]), 3)} for w in raw]
for w in raw:
    for c0, c1 in cuts:
        assert not (w["t0"] < c1 and w["t1"] > c0), f"cut {c0}-{c1} touches '{w['w']}'"
edit = {"segments": segs, "talk": round(talk, 3), "end_card": round(talk, 3), "duration": round(talk + END_CARD, 3),
        "cuts_film": [round(to_film(c1), 3) for _, c1 in cuts]}
json.dump(edit, open(d / "edit.json", "w"), indent=1)
json.dump({"words": words}, open(d / "words.json", "w"), ensure_ascii=False, indent=1)
film = json.load(open(d / "film.json")) if (d / "film.json").exists() else {}
film.update(title=f"Calc Machine Connect · {v}", duration=edit["duration"], formats=["9x16"], poster=round(edit["duration"] - 0.9, 2))
json.dump(film, open(d / "film.json", "w"), indent=1)

src = d / "media" / "raw.mp4"
sel = "+".join(f"between(t,{a},{b})" for a, b in segs)
# voice: the kept spans, cleaned and levelled like the other reels
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-af",
                f"aselect='{sel}',asetpts=N/SR/TB,highpass=f=80,afftdn=nf=-32:nr=10,"
                "acompressor=threshold=-22dB:ratio=2.5:attack=8:release=140:makeup=2,equalizer=f=3200:t=q:w=1.2:g=2,"
                f"loudnorm=I=-16:TP=-2:LRA=7,apad", "-t", str(edit["duration"]), "-ar", "48000", "-ac", "2", str(d / "audio" / "vo.wav")], check=True)
for name, vf in [("screen", f"crop=720:{SPLIT}:0:0,scale=1080:-2:flags=lanczos"),
                 ("frames", f"crop=720:{1280 - SPLIT}:0:{SPLIT},scale=1080:-2:flags=lanczos,"
                            "eq=contrast=1.06:saturation=1.05,colorbalance=rs=-0.02:bs=0.02:rh=0.03:bh=-0.02,vignette=angle=PI/5")]:
    out = d / "media" / name; out.mkdir(parents=True, exist_ok=True)
    for f in out.glob("*.jpg"): f.unlink()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf",
                    f"select='{sel}',setpts=N/FRAME_RATE/TB,fps=30,{vf}", "-q:v", "2", str(out / "%04d.jpg")], check=True)
print(v, "segments", segs, "talk", round(talk, 2), "film", edit["duration"])
