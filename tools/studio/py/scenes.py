"""Shot boundaries with PySceneDetect's AdaptiveDetector (robust to fast camera moves and motion graphics).

Usage: python scenes.py --input v.mp4 --out scenes.json [--threshold 3.0] [--min-scene 0.25]
"""
import argparse, json
from scenedetect import detect, AdaptiveDetector, open_video

ap = argparse.ArgumentParser()
ap.add_argument("--input", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--threshold", type=float, default=3.0)
ap.add_argument("--min-scene", type=float, default=0.25)
a = ap.parse_args()

fps = float(open_video(a.input).frame_rate)
try:
    det = AdaptiveDetector(adaptive_threshold=a.threshold, min_scene_len=max(1, int(round(a.min_scene * fps))))
except TypeError:
    det = AdaptiveDetector()
scenes = detect(a.input, det)
shots = [{"i": k, "t0": round(s.get_seconds(), 3), "t1": round(e.get_seconds(), 3), "dur": round(e.get_seconds() - s.get_seconds(), 3)} for k, (s, e) in enumerate(scenes)]
with open(a.out, "w") as fh:
    json.dump({"fps": fps, "engine": "pyscenedetect-adaptive", "shots": shots}, fh, indent=1)
print(f"{len(shots)} shots -> {a.out}")
