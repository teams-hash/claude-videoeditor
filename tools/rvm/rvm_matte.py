"""Robust Video Matting (ONNX) for reel-aligned proxies.

Reads a video with ffmpeg, runs RVM frame by frame with its recurrent state, and writes the alpha as a
lossless 8-bit gray FFV1 video with the same frame count. At every jump cut (piece start in the EDL) the
state is reset and warmed up on the new piece's first frames, so each take converges before it is used.

Usage:
  python rvm_matte.py --input proxy1080.mp4 --out matte1080.mkv [--edl edl.json] [--model rvm_mobilenetv3_fp32.onnx]
                      [--provider dml|cpu] [--ratio 0.25] [--warmup 12] [--frames N]
"""
import argparse, json, subprocess, sys, time
import numpy as np
import onnxruntime as ort

ap = argparse.ArgumentParser()
ap.add_argument("--input", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--edl")
ap.add_argument("--model", default="models/rvm_mobilenetv3_fp32.onnx")
ap.add_argument("--provider", default="dml", choices=["dml", "cpu"])
ap.add_argument("--ratio", type=float, default=0.25)
ap.add_argument("--warmup", type=int, default=12)
ap.add_argument("--frames", type=int, default=0, help="stop after N frames (benchmark)")
a = ap.parse_args()

probe = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                        "-of", "csv=p=0", a.input], capture_output=True, text=True).stdout.strip().split(",")
W, H = int(probe[0]), int(probe[1])

# Piece starts (output frame indices) where the source jumps.
starts = {0}
if a.edl:
    E = json.load(open(a.edl, encoding="utf-8"))
    for p in E["pieces"]:
        if p.get("cutBefore"):
            starts.add(round(p["out0"] * E["fps"]))

providers = ["DmlExecutionProvider", "CPUExecutionProvider"] if a.provider == "dml" else ["CPUExecutionProvider"]
so = ort.SessionOptions()
so.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
sess = ort.InferenceSession(a.model, sess_options=so, providers=providers)
ratio = np.array([a.ratio], dtype=np.float32)

def zero_state():
    return [np.zeros((1, 1, 1, 1), dtype=np.float32) for _ in range(4)]

def step(frame, rec):
    src = (frame.astype(np.float32) / 255.0).transpose(2, 0, 1)[None]
    fgr, pha, *rec = sess.run(None, {"src": src, "r1i": rec[0], "r2i": rec[1], "r3i": rec[2], "r4i": rec[3], "downsample_ratio": ratio})
    return pha[0, 0], rec

dec = subprocess.Popen(["ffmpeg", "-v", "error", "-i", a.input, "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], stdout=subprocess.PIPE, bufsize=W * H * 3 * 4)
enc = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "gray", "-s", f"{W}x{H}", "-r", "30", "-i", "-",
                        "-c:v", "ffv1", "-level", "3", "-pix_fmt", "gray", a.out], stdin=subprocess.PIPE)
size = W * H * 3

def read():
    b = dec.stdout.read(size)
    return None if len(b) < size else np.frombuffer(b, dtype=np.uint8).reshape(H, W, 3)

rec = zero_state()
n, t0 = 0, time.time()
pending = []                              # frames already read for a piece warm-up
while True:
    if pending:
        frame = pending.pop(0)
    else:
        frame = read()
    if frame is None:
        break
    if n in starts:
        # New take: reset, warm the recurrent state on the first frames of this piece, then process them for real.
        warm = [frame]
        while len(warm) < a.warmup:
            nxt = read()
            if nxt is None:
                break
            warm.append(nxt)
        # Only frames before the next piece start belong to this take.
        nxt_start = min([s for s in starts if s > n] or [10**9])
        warm_take = warm[:max(1, nxt_start - n)]
        rec = zero_state()
        for f in warm_take:
            _, rec = step(f, rec)
        frame = warm[0]
        pending = warm[1:] + pending
    pha, rec = step(frame, rec)
    enc.stdin.write((np.clip(pha, 0, 1) * 255 + .5).astype(np.uint8).tobytes())
    n += 1
    if n % 150 == 0:
        el = time.time() - t0
        print(f"{n} frames  {n / el:.2f} fps", flush=True)
    if a.frames and n >= a.frames:
        break

enc.stdin.close(); enc.wait()
dec.stdout.close(); dec.kill()
el = time.time() - t0
print(f"done {n} frames in {el:.1f}s ({n / el:.2f} fps) provider={sess.get_providers()[0]} model={a.model.split('/')[-1]} ratio={a.ratio}")
