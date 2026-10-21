# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["mediapipe==0.10.14", "numpy<2", "pillow", "scipy"]
# ///
"""Presenter clips -> graded JPEG frames with the room softened behind her.

Each clip is trimmed to its spoken range, segmented (MediaPipe selfie, temporally smoothed),
and the room behind her is replaced by a brand backdrop (rose light, Ensino Plus arcs).
    uv run tools/prep_video.py   ->  media/frames/<clip>/0001.jpg ... (30 fps, 1080x1920)
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np, mediapipe as mp
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
CLIPS = json.load(open(ROOT / "edit.json"))["clips"]
W, H, FPS = 1080, 1920, 30
def backdrop():
    """Soft rose studio light with the identity board's concentric arcs peeking out beside her."""
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    top, bot = np.array([255, 247, 248], np.float32), np.array([248, 214, 220], np.float32)
    g = top + (bot - top) * (y / H)[..., None]
    glow = np.exp(-(((x - 540) / 620) ** 2 + ((y - 900) / 760) ** 2))[..., None]
    img = g * (1 - glow * 0.7) + np.array([255, 252, 252], np.float32) * glow * 0.7
    def ring(cx, cy, r, w, color, a, a0, a1):
        d = np.hypot(x - cx, y - cy); ang = np.arctan2(y - cy, x - cx)
        m = np.clip(1 - np.abs(d - r) / (w / 2), 0, 1) ** 0.25 * ((ang > a0) & (ang < a1))
        return m[..., None] * a, np.array(color, np.float32)
    for args in [(1170, 1050, 470, 60, (244, 190, 198), 0.5, -3.2, 3.2),
                 (1170, 1050, 370, 60, (251, 225, 229), 0.6, -3.2, 3.2),
                 (1170, 1050, 270, 60, (229, 0, 3), 0.14, -3.2, 3.2),
                 (-60, 560, 330, 50, (244, 190, 198), 0.45, -3.2, 3.2),
                 (-60, 560, 240, 50, (229, 0, 3), 0.12, -3.2, 3.2)]:
        m, c = ring(*args)
        img = img * (1 - m) + c * m
    im = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(3))
    return np.asarray(im, np.float32)

BG = backdrop()

def grade(a):
    a = a.astype(np.float32) / 255
    a = np.clip((a - 0.5) * 1.08 + 0.5 + 0.035, 0, 1)            # contrast + lift
    a = a ** np.array([0.94, 0.97, 1.0])                          # warm: lift reds a touch
    l = a.mean(2, keepdims=True); a = l + (a - l) * 1.08          # saturation
    return np.clip(a * 255, 0, 255)

seg = mp.solutions.selfie_segmentation.SelfieSegmentation(model_selection=0)
only = sys.argv[1:]
for name, c in CLIPS.items():
    if c.get("audio_only") or (only and name not in only): continue
    out = ROOT / "media" / "frames" / name; out.mkdir(parents=True, exist_ok=True)
    src = ROOT / "media" / f"{name}.mp4"
    cmd = ["ffmpeg", "-v", "error", "-ss", str(c["in"]), "-t", str(c["out"] - c["in"]), "-i", str(src),
           "-vf", f"fps={FPS},scale={W}:{H}", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    ema, i = None, 0
    while True:
        buf = p.stdout.read(W * H * 3)
        if len(buf) < W * H * 3: break
        fr = np.frombuffer(buf, np.uint8).reshape(H, W, 3)
        m = seg.process(fr).segmentation_mask.astype(np.float32)
        ema = m if ema is None else ema * 0.55 + m * 0.45          # steady edges, no flicker
        mk = Image.fromarray((np.clip((ema - 0.3) / 0.5, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(6))
        mk = np.asarray(mk, np.float32)[..., None] / 255
        g = grade(fr)
        o = g * mk + BG * (1 - mk)
        i += 1
        Image.fromarray(o.astype(np.uint8)).save(out / f"{i:04d}.jpg", quality=88)
    p.wait()
    print(name, i, "frames", flush=True)
