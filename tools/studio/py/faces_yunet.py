"""Face boxes with OpenCV YuNet at chosen times (or every 1/fps s), read sequentially so times are frame-exact.
Each face: normalized x, y, w, h, score, plus the eyes and chin lines the 'keep the face clear' rule needs.

Usage: python faces_yunet.py --input v.mp4 --model yunet.onnx --out faces.json (--times 0.5,1.0 | --fps 2)
"""
import argparse, json
import cv2

ap = argparse.ArgumentParser()
ap.add_argument("--input", required=True)
ap.add_argument("--model", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--times")
ap.add_argument("--fps", type=float, default=2.0)
ap.add_argument("--score", type=float, default=0.75)
ap.add_argument("--width", type=int, default=640)
a = ap.parse_args()

cap = cv2.VideoCapture(a.input)
vfps = cap.get(cv2.CAP_PROP_FPS) or 30.0
n = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
targets = sorted(float(t) for t in a.times.split(",")) if a.times else [i / a.fps for i in range(int(n / vfps * a.fps))]
want = {}
for t in targets:
    want.setdefault(min(n - 1, int(round(t * vfps))), []).append(t)

det, rows, i = None, [], 0
while want:
    ok, img = cap.read()
    if not ok:
        break
    if i in want:
        h, w = img.shape[:2]
        sw, sh = a.width, int(round(h * a.width / w))
        small = cv2.resize(img, (sw, sh), interpolation=cv2.INTER_AREA)
        if det is None:
            det = cv2.FaceDetectorYN.create(a.model, "", (sw, sh), a.score, 0.3, 50)
        _, faces = det.detect(small)
        out = []
        for f in faces if faces is not None else []:
            x, y, fw, fh = (float(v) for v in f[:4])
            eyes = (float(f[5]) + float(f[7])) / 2
            out.append({"x": round(x / sw, 4), "y": round(y / sh, 4), "w": round(fw / sw, 4), "h": round(fh / sh, 4),
                        "score": round(float(f[14]), 3), "eyes": round(eyes / sh, 4), "chin": round((y + fh) / sh, 4)})
        for t in want.pop(i):
            rows.append({"t": round(t, 3), "faces": out})
    i += 1
for left in want.values():
    rows.extend({"t": round(t, 3), "faces": []} for t in left)
rows.sort(key=lambda r: r["t"])
with open(a.out, "w") as fh:
    json.dump(rows, fh, indent=1)
print(f"{sum(1 for r in rows if r['faces'])}/{len(rows)} samples with a face -> {a.out}")
