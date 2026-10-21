"""Speech from every clip, cleaned and levelled, laid on the edit timeline -> audio/vo.wav"""
import json, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
E = json.load(open(ROOT / "edit.json"))
parts = []
for name, c in E["clips"].items():
    src = next((ROOT / "media").glob(f"{name}.mp*"))
    out = ROOT / "audio" / f"vo_{name}.wav"
    d = c["out"] - c["in"]
    chain = ("highpass=f=85,afftdn=nf=-30:nr=14,"
             "acompressor=threshold=-24dB:ratio=3:attack=8:release=120:makeup=2,"
             "loudnorm=I=-16:TP=-2:LRA=7,"
             f"afade=t=in:d=0.03,afade=t=out:st={d - 0.12:.3f}:d=0.12")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(c["in"]), "-t", str(d), "-i", str(src),
                    "-af", chain, "-ar", "48000", "-ac", "2", str(out)], check=True)
    parts.append((out, c["at"]))
ins, flt = [], []
for i, (p, at) in enumerate(parts):
    ins += ["-i", str(p)]
    ms = int(round(at * 1000)); flt.append(f"[{i}]adelay={ms}|{ms}[a{i}]")
flt.append("".join(f"[a{i}]" for i in range(len(parts))) + f"amix=inputs={len(parts)}:normalize=0,apad,atrim=0:{E['end']}[o]")
subprocess.run(["ffmpeg", "-v", "error", "-y", *ins, "-filter_complex", ";".join(flt), "-map", "[o]", "-ar", "48000", str(ROOT / "audio" / "vo.wav")], check=True)
print("vo.wav ok")
