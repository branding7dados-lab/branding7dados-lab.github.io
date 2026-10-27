# /// script
# requires-python = ">=3.10,<3.13"
# dependencies = ["faster-whisper"]
# ///
"""Word-timed transcript of each video's speech -> v*/words_raw.json (Whisper large-v3-turbo, pt)."""
import json, sys
from pathlib import Path
from faster_whisper import WhisperModel
ROOT = Path(__file__).resolve().parent.parent
m = WhisperModel(sys.argv[1] if len(sys.argv) > 1 else "large-v3-turbo", device="cpu", compute_type="int8")
for v in sorted(ROOT.glob("v[0-9]")):
    segs, _ = m.transcribe(str(v / "media" / "a16k.wav"), language="pt", word_timestamps=True, beam_size=5,
                           vad_filter=False, condition_on_previous_text=False)
    words = [dict(w=w.word.strip(), t0=round(w.start, 3), t1=round(w.end, 3), p=round(w.probability, 3)) for s in segs for w in s.words]
    json.dump({"words": words}, open(v / "words_raw.json", "w"), ensure_ascii=False, indent=1)
    print(v.name, " ".join(w["w"] for w in words), flush=True)
