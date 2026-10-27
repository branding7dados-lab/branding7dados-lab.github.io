# /// script
# dependencies = ["numpy", "pillow"]
# ///
"""Brand logos for a dark film: Calc Machine Connect wordmark parts and Ensino Plus with its black
recoloured to the Calc Machine cream. The C symbol itself is drawn in code (shared/kit.js)."""
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "shared" / "assets"; OUT.mkdir(parents=True, exist_ok=True)
CREAM = np.array([242, 240, 232], np.uint8)

def trim(a):
    ys, xs = np.where(a[..., 3] > 20)
    return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

calc = np.asarray(Image.open(ROOT / "media" / "calc_logo_src.webp").convert("RGBA")).copy()
orange = (calc[..., 0].astype(int) - calc[..., 2].astype(int)) > 80
dark = ~orange
# wordmark "calc machine": right of the symbol, above CONNECT
word = calc.copy(); word[:, :560, 3] = 0; word[370:, :, 3] = 0
word[..., :3] = np.where(dark[..., None], CREAM, word[..., :3])
Image.fromarray(trim(word)).save(OUT / "calc_word.png")
conn = calc.copy(); conn[:370, :, 3] = 0; conn[:, :560, 3] = 0
Image.fromarray(trim(conn)).save(OUT / "calc_connect.png")
full = calc.copy(); full[..., :3] = np.where(dark[..., None], CREAM, full[..., :3])
Image.fromarray(trim(full)).save(OUT / "calc_logo_cream.png")

ens = np.asarray(Image.open(ROOT / "media" / "ensino_logo_src.png").convert("RGBA")).copy()
rgb = ens[..., :3].astype(int)
blackish = (rgb.max(2) < 110)                      # the black "ensino"; red stays red
ens[..., :3] = np.where(blackish[..., None], CREAM, ens[..., :3])
Image.fromarray(trim(ens)).save(OUT / "ensino_logo_dark.png")
for f in sorted(OUT.glob("*.png")): print(f.name, Image.open(f).size)
