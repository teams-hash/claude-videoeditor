"""Track one box through a clip with OpenCV CSRT and write normalized keyframes for callouts that follow it.
Frames are read sequentially (frame-exact). Light smoothing removes tracker jitter; a lost track stops cleanly.

Usage: python track.py --input v.mp4 --box x,y,w,h --start 2.0 [--end 5.0] [--smooth 5] [--every 1] --out track.json
       --box is in pixels of the video, or 0-1 fractions of the frame.
"""
import argparse, json
import cv2

ap = argparse.ArgumentParser()
ap.add_argument("--input", required=True)
ap.add_argument("--box", required=True)
ap.add_argument("--start", type=float, default=0.0)
ap.add_argument("--end", type=float, default=None)
ap.add_argument("--smooth", type=int, default=5)
ap.add_argument("--every", type=int, default=1)
ap.add_argument("--out", required=True)
a = ap.parse_args()

cap = cv2.VideoCapture(a.input)
fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
W, H = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
bx = [float(v) for v in a.box.split(",")]
if all(v <= 1.0 for v in bx):
    bx = [bx[0] * W, bx[1] * H, bx[2] * W, bx[3] * H]
make = getattr(cv2, "TrackerCSRT_create", None) or cv2.legacy.TrackerCSRT_create
start_f = int(round(a.start * fps))
end_f = int(round(a.end * fps)) if a.end is not None else None

i, tracker, raw, lost = 0, None, [], 0
while True:
    ok, img = cap.read()
    if not ok or (end_f is not None and i > end_f):
        break
    if i == start_f:
        tracker = make()
        tracker.init(img, tuple(int(round(v)) for v in bx))
        raw.append((i, True, bx))
    elif tracker is not None:
        good, box = tracker.update(img)
        raw.append((i, bool(good), [float(v) for v in box]))
        lost = 0 if good else lost + 1
        if lost > int(fps / 2):
            break
    i += 1

# Centred moving average over good samples only.
k = max(1, a.smooth)
samples = []
for j, (f, good, b) in enumerate(raw):
    win = [r[2] for r in raw[max(0, j - k // 2): j + k // 2 + 1] if r[1]]
    m = [sum(v[c] for v in win) / len(win) for c in range(4)] if (good and win) else b
    if j % a.every == 0 or j == len(raw) - 1:
        samples.append({"t": round(f / fps, 3), "ok": good, "x": round(m[0] / W, 4), "y": round(m[1] / H, 4), "w": round(m[2] / W, 4), "h": round(m[3] / H, 4)})
with open(a.out, "w") as fh:
    json.dump({"fps": fps, "width": W, "height": H, "start": a.start, "samples": samples}, fh, indent=1)
okn = sum(1 for s in samples if s["ok"])
print(f"{len(samples)} samples ({okn} tracked) {samples[0]['t'] if samples else '-'}s..{samples[-1]['t'] if samples else '-'}s -> {a.out}")
