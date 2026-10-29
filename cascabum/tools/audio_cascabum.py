# /// script
# requires-python = ">=3.10"
# dependencies = ["librosa>=0.10", "numpy", "scipy", "soundfile"]
# ///
"""Voice cleanup + a synthesized pagode bed (the clip has no music of its own, unlike the Turma do
Samba cut whose live samba was the track) + the same SFX palette on the graphic cues -> mix.wav, -14 LUFS.

Pagode at 96 bpm in C: C6 - A7 - Dm7 - G7, surdo on 2 and 4, pandeiro sixteenths, tamborim
teleco-teco, cavaquinho strums (Karplus-Strong) and bass. It ducks 5 dB under the voice and lands
a chord on the end card.
    MOTION_REEL_SKILL=<skill> uv run tools/audio_cascabum.py .
"""
import json, os, subprocess, sys, wave
from pathlib import Path
import numpy as np
from scipy.signal import butter, sosfilt
sys.path.insert(0, str(Path(os.environ["MOTION_REEL_SKILL"]) / "scripts"))
from dsp import SR, hat, hz, ks_pluck, bass_note, crash, reverb  # noqa: E402

D = Path(sys.argv[1])
ev = json.load(open(D / "events.json"))
TOTAL, T_END = ev["total"], ev["speech_end"]
N = int(TOTAL * SR)
rng = np.random.default_rng(11)

# ---------------------------------------------------------------- voice
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(D / "media" / "raw.mp4"), "-t", "21.0", "-af",
                "highpass=f=80,afftdn=nf=-28:nr=8,equalizer=f=3000:t=q:w=1.2:g=2.5,"
                "acompressor=threshold=-20dB:ratio=3:attack=6:release=140:makeup=3,afade=t=out:st=20.3:d=0.6",
                "-ar", str(SR), "-ac", "2", str(D / "audio" / "voice.wav")], check=True)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(D / "audio" / "voice.wav"), "-f", "f32le", "-"], capture_output=True, check=True).stdout
v = np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
v = np.pad(v, ((0, max(0, N - len(v))), (0, 0)))[:N]

# ---------------------------------------------------------------- pagode bed
BPM = 96; beat = 60 / BPM; s16 = beat / 4
music = np.zeros((2, N + SR * 3))
def put(sig, t, g=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N: return
    if sig.ndim == 1:
        a = (pan + 1) / 2; sig = np.stack([sig * np.sqrt(1 - a), sig * np.sqrt(a)])
    j = min(music.shape[1], i + sig.shape[1]); music[:, i:j] += g * sig[:, :j - i]
def env(n, tau): return np.exp(-np.arange(n) / (tau * SR))
def surdo(open_=True):
    n = int(0.55 * SR); t = np.arange(n) / SR
    f = 52 + 30 * np.exp(-t / 0.04)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.32 if open_ else 0.08)
    return np.tanh(1.6 * x)
def tamborim():
    n = int(0.07 * SR); t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 1450 * t) * env(n, 0.018) + 0.5 * rng.normal(0, 1, n) * env(n, 0.008)
    return sosfilt(butter(2, 700, "high", fs=SR, output="sos"), x)
CHORDS = [(["E4", "A4", "C5", "G4"], "C2"), (["E4", "G4", "C#5", "A4"], "A1"), (["F4", "A4", "C5", "D5"], "D2"), (["F4", "G4", "B4", "D5"], "G1")]
STRUM = [0, 3, 6, 8, 10, 13]                      # cavaquinho hits in the 16 sixteenths of a bar
TAMB = [0, 2, 4, 7, 9, 11, 14]                    # teleco-teco
t_end = T_END
nbars = int(t_end / (4 * beat)) + 1
for b in range(nbars):
    t0 = b * 4 * beat
    notes, root = CHORDS[b % 4]
    for k in range(16):
        t = t0 + k * s16
        if t >= t_end - 0.02: break
        acc = [1.0, 0.45, 0.65, 0.5][k % 4]
        put(hat() * acc, t, 0.11, pan=-0.25)                              # pandeiro platinelas
        if k in TAMB: put(tamborim(), t, 0.10 if t > 1.6 else 0.05, pan=0.35)
        if k in STRUM and t > 1.6:
            for j, nt in enumerate(notes):                                 # strum: strings 12 ms apart
                put(ks_pluck(hz(nt), 0.28, 0.75, 0.0), t + j * 0.012, 0.075, pan=0.2)
    for bt in (1, 3):                                                      # surdo: answer on 2, marcação on 4
        t = t0 + bt * beat
        if t < t_end and t > 1.6: put(surdo(), t, 0.5 if bt == 3 else 0.35)
    for t, d in ((t0, 1.4), (t0 + 2.5 * beat, 0.9)):
        if t < t_end - 0.1 and t > 1.6: put(bass_note(root, d * beat, 500), t, 0.28)
# end card: the band "hits" the chord with the logo
put(surdo(), T_END, 0.7); put(crash(2.6), T_END, 0.22)
for j, nt in enumerate(["E4", "G4", "C5", "E5"]):
    put(ks_pluck(hz(nt), 2.2, 0.8, 0.0), T_END + j * 0.02, 0.12, pan=0.15)
put(bass_note("C2", 1.6, 400), T_END, 0.32)
music = reverb(music, 0.18)[:, :N].T

# duck under the voice: envelope of the cleaned speech
mono = np.abs(v.mean(1))
k = int(0.05 * SR)
envv = np.convolve(mono, np.ones(k) / k, "same")
on = (envv > np.percentile(envv, 60) * 0.6).astype(float)
on = np.convolve(on, np.ones(int(0.25 * SR)) / int(0.25 * SR), "same")
duck = 10 ** (-5 * np.clip(on, 0, 1) / 20)
music *= (duck * (1 - (np.arange(N) / SR < 1.6) * 0.5))[:, None]
fo = int(0.8 * SR); music[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 2
music *= 0.55 / (np.abs(music).max() + 1e-9)

# ---------------------------------------------------------------- SFX (same palette as the Turma do Samba cut)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], "band", fs=SR, output="sos"), x)
def whoosh(d=0.36):
    n = int(d * SR); x = rng.normal(0, 1, n); out, y = np.zeros(n), 0.0
    a = 1 - np.exp(-2 * np.pi * 300 * (12 ** (np.arange(n) / n)) / SR)
    for i in range(n): y += a[i] * (x[i] - y); out[i] = y
    return out * np.sin(np.pi * np.arange(n) / n) ** 2
def pop():
    n = int(0.07 * SR); t = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(700 + 900 * t / 0.07) / SR) * env(n, 0.018)
def impact():
    n = int(0.9 * SR); t = np.arange(n) / SR
    boom = np.sin(2 * np.pi * np.cumsum(42 + 70 * np.exp(-t / 0.05)) / SR) * env(n, 0.25)
    return np.tanh((boom + 0.4 * bp(rng.normal(0, 1, n), 200, 2500) * env(n, 0.06)) * 1.4)
def ding():
    n = int(1.6 * SR); t = np.arange(n) / SR
    return sum(a * np.sin(2 * np.pi * f * t) * env(n, d) for f, a, d in [(1318.5, 1, 0.55), (2637, 0.4, 0.3), (1975.5, 0.35, 0.4), (3956, 0.15, 0.15)]) * 0.5
def confetti():
    c = np.zeros(int(1.0 * SR))
    for _ in range(14):
        p = pop() * rng.uniform(0.25, 0.6); i = int(rng.uniform(0, 0.7) * SR); c[i:i + len(p)] += p
    w = whoosh(0.5); c[:len(w)] += 0.5 * w
    return c
FX = dict(whoosh=(whoosh(), -0.15, 0.5), pop=(pop(), 0, 0.5), impact=(impact(), 0, 0.6), ding=(ding(), 0, 0.5), confetti=(confetti(), 0, 0.55))
sfx = np.zeros(N)
for e in ev["events"]:
    x, off, g = FX[e["s"]]; i = int((e["t"] + off) * SR); j = min(N, i + len(x))
    if 0 <= i < N: sfx[i:j] += g * x[:j - i]
sfx *= 10 ** (-15 / 20)

mix = v + music + sfx[:, None]
mix /= max(1.0, np.abs(mix).max() / 0.95)
with wave.open(str(D / "audio" / "premix.wav"), "w") as wf:
    wf.setnchannels(2); wf.setsampwidth(2); wf.setframerate(SR)
    wf.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
m = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(D / "audio" / "premix.wav"), "-af", "loudnorm=I=-14:TP=-1:LRA=9:print_format=json",
                    "-f", "null", "-"], capture_output=True, text=True).stderr
j = json.loads(m[m.rindex("{"):m.rindex("}") + 1])
af = (f"loudnorm=I=-14:TP=-1:LRA=9:measured_I={j['input_i']}:measured_TP={j['input_tp']}:measured_LRA={j['input_lra']}:"
      f"measured_thresh={j['input_thresh']}:offset={j['target_offset']}:linear=true,aresample=48000")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(D / "audio" / "premix.wav"), "-af", af, "-t", str(TOTAL), str(D / "audio" / "mix.wav")], check=True)
print("mix ok, premix", j["input_i"], "LUFS")
