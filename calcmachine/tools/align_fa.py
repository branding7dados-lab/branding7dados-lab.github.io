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
"""Forced alignment of Whisper's words to each video's audio (torchaudio MMS_FA, a CTC acoustic
model) -> v*/words_raw.json gets precise t0/t1. Acronyms and brands are aligned by how they are
spoken; the written form stays as transcribed (build_edit.py fixes spelling for the captions)."""
import json, re, sys, unicodedata
from pathlib import Path
import numpy as np, soundfile as sf, torch, torchaudio

ROOT = Path(__file__).resolve().parent.parent
SPOKEN = {"pjc": "pe jota ce", "pje": "pe jota e", "pj": "pe jota", "gpt": "ge pe te", "fgts": "efe ge te esse", "cloud": "cloud",
          "calcmachine": "calc machine", "-cheque": "cheque"}
bundle = torchaudio.pipelines.MMS_FA
model = bundle.get_model(); tok = bundle.get_tokenizer(); aligner = bundle.get_aligner()

def norm(w):
    w = w.lower().strip(",.?!")
    w = SPOKEN.get(w, w)
    w = unicodedata.normalize("NFKD", w).encode("ascii", "ignore").decode()
    return [p for p in re.sub(r"[^a-z ]", " ", w).split() if p]

for v in sorted(ROOT.glob("v[0-9]")):
    data = json.load(open(v / "words_raw.json")); words = data["words"]
    x, sr = sf.read(v / "media" / "a16k.wav", dtype="float32")
    wav = torch.from_numpy(x)[None]
    parts, owner = [], []
    for i, w in enumerate(words):
        for p in norm(w["w"]): parts.append(p); owner.append(i)
    with torch.inference_mode():
        em, _ = model(wav)
        spans = aligner(em[0], tok(parts))
    ratio = wav.shape[1] / em.shape[1] / sr
    t0 = [None] * len(words); t1 = [None] * len(words)
    for sp, i in zip(spans, owner):
        a, b = sp[0].start * ratio, sp[-1].end * ratio
        t0[i] = a if t0[i] is None else min(t0[i], a); t1[i] = b if t1[i] is None else max(t1[i], b)
    moved = []
    for i, w in enumerate(words):
        if t0[i] is not None:
            moved.append(abs(t0[i] - w["t0"])); w["t0"], w["t1"] = round(t0[i], 3), round(t1[i], 3)
    data["aligned"] = "mms_fa"
    json.dump(data, open(v / "words_raw.json", "w"), ensure_ascii=False, indent=1)
    print(v.name, f"{len(words)} words, median shift vs whisper {np.median(moved)*1000:.0f} ms, max {max(moved)*1000:.0f} ms;",
          "first", words[0]["t0"], "last", words[-1]["t1"])
