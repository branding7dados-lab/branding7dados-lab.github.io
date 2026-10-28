# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["torch", "torchaudio", "soundfile", "numpy"]
# [tool.uv.sources]
# torch = { index = "pytorch-cpu" }
# torchaudio = { index = "pytorch-cpu" }
# [[tool.uv.index]]
# name = "pytorch-cpu"
# url = "https://download.pytorch.org/whl/cpu"
# explicit = true
# ///
"""Forced alignment (torchaudio MMS_FA) of the corrected speech text -> words.json (source seconds).
The text is what is said, as it will be written on screen; SPOKEN gives the sounds for numbers/brands."""
import json, re, unicodedata
from pathlib import Path
import soundfile as sf, torch, torchaudio

ROOT = Path(__file__).resolve().parent.parent
TEXT = ("Ei, salve, salve, tudo bem com vocês? A gente de novo aqui, ó, pra dar um recadinho do dia 31 do 10, "
        "não é, Tiago? Arena Deck, dia 31, Cascabum, Turma do Samba, um grande evento, não fique de fora, "
        "convites limitados. As bandas que embalaram os anos 2000 em Araraquara e toda a região, bora, "
        "você não vai ficar de fora, né?")
SPOKEN = {"31": "trinta e um", "10": "dez", "2000": "dois mil", "deck": "deque", "cascabum": "cascabum"}
bundle = torchaudio.pipelines.MMS_FA
model, tok, aligner = bundle.get_model(), bundle.get_tokenizer(), bundle.get_aligner()

def parts(w):
    k = w.lower().strip(",.?!")
    k = SPOKEN.get(k, k)
    k = unicodedata.normalize("NFKD", k).encode("ascii", "ignore").decode()
    return [p for p in re.sub(r"[^a-z ]", " ", k).split() if p]

words = TEXT.split()
x, sr = sf.read(ROOT / "media" / "a16k.wav", dtype="float32")
wav = torch.from_numpy(x)[None]
ps, owner = [], []
for i, w in enumerate(words):
    for p in parts(w): ps.append(p); owner.append(i)
with torch.inference_mode():
    em, _ = model(wav)
    spans = aligner(em[0], tok(ps))
ratio = wav.shape[1] / em.shape[1] / sr
t0, t1 = [None] * len(words), [None] * len(words)
for sp, i in zip(spans, owner):
    a, b = sp[0].start * ratio, sp[-1].end * ratio
    t0[i] = a if t0[i] is None else min(t0[i], a); t1[i] = b if t1[i] is None else max(t1[i], b)
out = [{"w": w, "s": round(t0[i], 3), "e": round(t1[i], 3)} for i, w in enumerate(words)]
json.dump({"words": out}, open(ROOT / "words.json", "w"), ensure_ascii=False, indent=1)
print(" ".join(f"{w['w']}@{w['s']}" for w in out))
