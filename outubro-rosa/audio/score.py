# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Outubro Rosa score: hopeful, warm, never in the voice's way.

96 bpm, 4/4, bar = 2.5 s, F major, I-V-vi-IV (F C Dm Bb). 19 bars = 47.5 s.
  bars 0-2   (0-7.5 s)    hook: electric piano + soft pad, no drums
  bars 3-9   (7.5-25 s)   narration: soft kick on 1 and 3, shaker, sub on the root
  bars 10-15 (25-40 s)    rights: full pulse, offbeat hats, bass eighths, arpeggio plucks
  bars 16-17 (40-45 s)    CTA lift: light claps, pad opens
  bar 18     (45-47.5 s)  end card: resolve on F add9, crash, tail
    MOTION_REEL_SKILL=<skill> uv run outubro-rosa/audio/score.py
"""
import json, os, sys
from pathlib import Path
import numpy as np, soundfile as sf
sys.path.insert(0, str(Path(os.environ["MOTION_REEL_SKILL"]) / "scripts"))
from dsp import SR, Bus, bass_note, clap, crash, hat, keys, kick, measure_beats, pad_chord, pluck, reverb, sidechain, sub_drop  # noqa: E402

FILM = Path(__file__).resolve().parent.parent
BPM, BARS = 96, 19
DUR = BARS * 4 * 60 / BPM
PROG = [(["F3", "A3", "C4", "E4"], "F2"), (["C3", "G3", "C4", "E4"], "C2"),
        (["D3", "F3", "A3", "C4"], "D2"), (["Bb2", "F3", "A3", "D4"], "Bb1")]
ARP = [["F4", "A4", "C5", "A4"], ["E4", "G4", "C5", "G4"], ["D4", "F4", "A4", "F4"], ["D4", "F4", "Bb4", "F4"]]

drums, bass, music, arps = (Bus(DUR, BPM) for _ in range(4))
kicks = []
for bar in range(BARS - 1):
    notes, root = PROG[bar % 4]
    b0 = bar * 4
    music.add(keys(notes, 2.6), b0, 0.34)
    music.add(keys(notes[1:], 1.4), b0 + 2.5, 0.16)
    cut = (700, 1500) if bar < 10 else (900, 2600) if bar < 16 else (1200, 4200)
    music.add(pad_chord(notes, 2.6, cut, attack=0.4, release=0.4), b0, 0.16 if bar < 16 else 0.22)
    for k in range(4):                      # piano broken chord answers each beat, quietly
        if bar < 3 and k % 2 == 1: continue
        arps.add(pluck([ARP[bar % 4][k]], 0.35, 2200), b0 + k + 0.5, 0.10 if bar < 10 else 0.14, pan=0.25 * (1 if k % 2 else -1))
    if 3 <= bar:
        for k in (0, 2) if bar < 10 else (0, 1, 2, 3):
            drums.add(kick(soft=bar < 10), b0 + k, 0.55 if bar < 10 else 0.7); kicks.append((b0 + k) * 60 / BPM)
        for k in range(4):
            drums.add(hat(), b0 + k + 0.5, 0.07 if bar < 10 else 0.12, pan=0.2)
        if bar < 10:
            bass.add(bass_note(root, 2.4, 380), b0, 0.32)
        else:
            for k in range(8):
                bass.add(bass_note(root, 0.28, 600), b0 + k / 2, 0.30 if k % 2 == 0 else 0.2)
    if 16 <= bar:
        for k in (1, 3):
            drums.add(clap(), b0 + k, 0.18, pan=0.05)
# moments: into narration, into the rights section, into the CTA, the end card
for b in (12, 40, 64):
    drums.add(crash(1.4), b, 0.12)
last = (BARS - 1) * 4
music.add(pad_chord(["F3", "A3", "C4", "G4", "C5"], 3.2, (4500, 900), attack=0.01, release=1.0), last, 0.42)
music.add(keys(["F3", "C4", "G4", "A4"], 3.0), last, 0.4)
drums.add(kick(), last, 0.8); drums.add(crash(2.4), last, 0.22); drums.add(sub_drop(1.4, 70, 30), last, 0.45)

N = drums.n
duck = sidechain(kicks, drums.x.shape[1], 0.25, 0.12)
mix = drums.x + (bass.x + reverb(music.x + arps.x, 0.45)) * duck
mix = mix[:, :N]
fo = int(0.4 * SR); mix[:, -fo:] *= np.linspace(1, 0, fo) ** 2
mix *= 10 ** (-3 / 20) / (np.abs(mix).max() + 1e-9)
sf.write(FILM / "audio" / "music.wav", mix.T, SR)

grid = measure_beats(drums.x[:, :N].mean(0).astype(np.float32), SR, BPM, n_beats=BARS * 4)
period = 60 / BPM                           # the grid is written, not guessed: offset 0, exact period
grid.update(offset=0.0, period=period, bpm=BPM, beats=[round(i * period, 5) for i in range(BARS * 4 + 1)],
            downbeats=[round(i * 4 * period, 5) for i in range(BARS + 1)],
            sections=[{"name": "hook", "beat": 0}, {"name": "narration", "beat": 12}, {"name": "rights", "beat": 40},
                      {"name": "cta", "beat": 64}, {"name": "end", "beat": last}],
            source=f"score.py F major {BPM} bpm")
json.dump(grid, open(FILM / "beats.json", "w"), indent=1)
print(f"music.wav {DUR:.2f}s, beats.json {BPM} bpm")
