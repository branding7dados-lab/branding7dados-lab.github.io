# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Score for one Calc Machine reel: dark, cinematic tech pulse under the voice, landing on the end card.

120 bpm, 4/4 (bar = 2 s), minor i-VI-III-VII. Picture is cut to speech, so the score follows the
edit: a pad-only intro under the full-frame open, the pulse (soft kick, sub eighths, 16th plucks)
under the talk, a riser into the end card, then an impact and a held chord over the logo.
    MOTION_REEL_SKILL=<skill> uv run tools/score.py v1 [--key D]
"""
import argparse, json, os, sys
from pathlib import Path
import numpy as np, soundfile as sf
sys.path.insert(0, str(Path(os.environ["MOTION_REEL_SKILL"]) / "scripts"))
from dsp import SR, Bus, bass_note, crash, hat, kick, midi, note_name, pad_chord, pluck, reverb, riser, seed, sidechain, sub_drop  # noqa: E402

ap = argparse.ArgumentParser(); ap.add_argument("film"); ap.add_argument("--key", default="D"); ap.add_argument("--seed", type=int, default=7)
a = ap.parse_args()
seed(a.seed)
FILM = Path(__file__).resolve().parent.parent / a.film
edit = json.load(open(FILM / "edit.json"))
DUR, END = edit["duration"], edit["end_card"]
BPM = 120; beat = 60 / BPM
root = midi(f"{a.key}3")
minor = [0, 2, 3, 5, 7, 8, 10]
prog = [(0, [0, 3, 7]), (8, [0, 4, 7]), (3, [0, 4, 7]), (10, [0, 4, 7])]          # i VI III VII
def chord(i, octv=0):
    r, q = prog[i % 4]
    return [note_name(root + r + n + 12 * octv) for n in q], note_name(root + r - 12)

drums, bass, music, arps = (Bus(DUR, BPM) for _ in range(4))
nb = int(DUR / beat)
end_b = END / beat
kicks = []
for b in range(nb):
    t = b * beat
    bar = b // 4
    notes, broot = chord(bar)
    if b % 4 == 0 and t < END:
        music.add(pad_chord(notes + [note_name(midi(notes[0]) + 12)], 2.1, (600, 1500) if t < 1.2 else (900, 2400), attack=0.3, release=0.3), b, 0.2)
    if 1.2 <= t < END - 0.05:
        if t < END - 2.0 or b % 2 == 0:
            drums.add(kick(soft=True), b, 0.65); kicks.append(t)
        drums.add(hat(), b + 0.5, 0.09, pan=0.2)
        for h in (0.25, 0.75):
            drums.add(hat(), b + h, 0.035, pan=-0.25)
        bass.add(bass_note(broot, beat / 2 * 0.85, 420), b, 0.42); bass.add(bass_note(broot, beat / 2 * 0.85, 420), b + 0.5, 0.3)
        arp = [notes[0], notes[1], notes[2], note_name(midi(notes[1]) + 12)]
        for s in range(4):
            nt = note_name(midi(arp[(b * 4 + s) % 4]) + 12)
            arps.add(pluck([nt], 0.16, 1400 + 1800 * min(1, t / END)), b + s * 0.25, 0.07 if s % 2 else 0.1, pan=0.3 * (1 if s % 2 else -1))
# into the end card: riser, impact, held chord, sub
music.add(np.stack([riser(1.6)] * 2) * 0.5, 0, 1.0, at=END - 1.6)
notes, broot = chord(0)
music.add(pad_chord(notes + [note_name(midi(notes[0]) + 12), note_name(midi(notes[1]) + 12)], DUR - END + 0.6, (5200, 900), attack=0.005, release=0.9), 0, 0.5, at=END)
drums.add(kick(), 0, 1.0, at=END); drums.add(crash(2.4), 0, 0.28, at=END); drums.add(sub_drop(1.4, 68, 28), 0, 0.6, at=END)
bass.add(bass_note(broot, 1.8, 300), 0, 0.5, at=END)

N = drums.n
duck = sidechain(kicks, drums.x.shape[1], 0.35, 0.11)
mix = drums.x + (bass.x + reverb(music.x + arps.x, 0.4)) * duck
mix = mix[:, :N]
fo = int(0.5 * SR); mix[:, -fo:] *= np.linspace(1, 0, fo) ** 2
mix *= 10 ** (-3 / 20) / (np.abs(mix).max() + 1e-9)
sf.write(FILM / "audio" / "music.wav", mix.T, SR)
json.dump({"offset": 0.0, "period": beat, "bpm": BPM, "beats": [round(i * beat, 5) for i in range(nb + 1)],
           "downbeats": [round(i * 4 * beat, 5) for i in range(nb // 4 + 1)],
           "sections": [{"name": "talk", "beat": 0}, {"name": "end", "beat": round(end_b, 3)}],
           "source": f"tools/score.py {a.key} minor {BPM} bpm"}, open(FILM / "beats.json", "w"), indent=1)
print(a.film, f"music.wav {DUR:.2f}s, end card at {END:.2f}s")
