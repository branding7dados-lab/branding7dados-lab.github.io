# /// script
# dependencies = ["numpy", "pillow"]
# ///
"""Transparent logo -> trimmed PNGs: full, emblem only, wordmark only ."""
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent
rgba = np.asarray(Image.open(ROOT / "media" / "logo_src.png").convert("RGBA"))
alpha = rgba[..., 3] / 255
ys, xs = np.where(alpha > 0.3)
full = rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
cols = np.where((full[..., 3] > 76).any(0))[0]
gap = next(i for i in range(len(cols) - 1) if cols[i + 1] - cols[i] > 12)   # emblem | wordmark
out = ROOT / "assets"; out.mkdir(exist_ok=True)
parts = {"logo": full, "logo_emblem": full[:, :cols[gap] + 1], "logo_word": full[:, cols[gap + 1]:]}
for k, im in parts.items():
    Image.fromarray(im).save(out / f"{k}.png")
    print(k, im.shape)
