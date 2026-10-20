# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["mediapipe==0.10.14", "numpy<2", "pillow", "scipy"]
# ///
"""Presenter clips -> graded JPEG frames with the room softened behind her.

Each clip is trimmed to its spoken range, segmented (MediaPipe selfie, temporally smoothed),
and the background is blurred and washed toward the brand rose so the wall art recedes.
    uv run tools/prep_video.py   ->  media/frames/<clip>/0001.jpg ... (30 fps, 1080x1920)
"""
import json, subprocess, sys
from pathlib import Path
import numpy as np, mediapipe as mp
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
CLIPS = json.load(open(ROOT / "edit.json"))["clips"]
W, H, FPS = 1080, 1920, 30
ROSE = np.array([252, 234, 236], np.float32)

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
        mk = Image.fromarray((np.clip((ema - 0.15) / 0.7, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(5))
        mk = np.asarray(mk, np.float32)[..., None] / 255
        g = grade(fr)
        bg = np.asarray(Image.fromarray(g.astype(np.uint8)).resize((W // 4, H // 4)).filter(ImageFilter.GaussianBlur(9)).resize((W, H), Image.BILINEAR), np.float32)
        bg = bg * 0.5 + ROSE * 0.5
        o = g * mk + bg * (1 - mk)
        i += 1
        Image.fromarray(o.astype(np.uint8)).save(out / f"{i:04d}.jpg", quality=88)
    p.wait()
    print(name, i, "frames", flush=True)
