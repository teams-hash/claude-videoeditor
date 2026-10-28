# Studio toolkit

`node tools/studio/studio.mjs <command> [args]` (Claude's shorthand: `studio`). `help <command>` prints full usage.
Node 22+, no npm dependencies; an FFmpeg full build on PATH; HyperFrames through npx (pinned in `lib/core.mjs`).

| Command | Does | Reuses |
|---|---|---|
| `new` | Project from a source: folders, probe, audio48k/16k, source sheet, Parakeet transcript, project.json | HyperFrames transcribe |
| `cut` | Tighten a cut list on the audio, then the rough cut at any aspect + words re-timed to the edit | house `tighten.mjs`, roughcut method |
| `matte` | Person matte: RVM on DirectML (default) or HyperFrames remove-background (CPU here) | `tools/rvm` |
| `faces` | YuNet face boxes over time with eyes and chin lines | OpenCV, `tools/models/yunet` |
| `track` | CSRT object tracking → normalized keyframes for callouts | OpenCV contrib |
| `scenes` | Shot boundaries and pace stats (PySceneDetect adaptive, ffmpeg fallback) | PySceneDetect |
| `voice-clean` | DeepFilterNet + EQ, de-ess, compressor, limiter; sample-aligned; noise report | `tools/bin/deepfilternet` |
| `mix` | Voice + SFX cues by hit time + music bed, ducking, two-pass loudnorm | c0473 mix.js, house mix_cues/loudnorm |
| `sfx` | Index, find, import bundle zips, synth fallback kit | house `make_sfx.mjs` |
| `grade` | Looks: list, apply at strength, bake `.cube`, verify, compare sheet | `LIBRARY/grades/looks.json` |
| `fonts` | List families, copy into a HyperFrames project with `@font-face` | `LIBRARY/fonts` |
| `motion` | List and add house components and tokens | `LIBRARY/motion` |
| `export` | Platform encodes with spec checks | `presets/platforms.json` |
| `qc` | Spec, loudness, dead air, black/frozen/flash frames, slivers, pace, hook, sheets, faces | `lib/analyze.mjs` |
| `refscan` | Reference scan (cached by content hash) for the reference-analyst | scenes, HyperFrames audio/transcribe |
| `sheet` | Contact sheets with timestamps, safe zones, face or track boxes | `lib/frames.mjs` |
| `peek` | Short views of transcripts, logs, JSON, compositions, media | |
| `probe` | One-line media facts | |
| `index` / `status` | `projects/INDEX.md` + `INDEX.json`; ten-line status for the session hook | project.json files |
| `clean` | Re-creatable intermediates in delivered projects; `--apply` → Recycle Bin | |

Layout: `studio.mjs` dispatches to `cmd/<name>.mjs` (each exports `summary`, `usage`, `run`); shared code in `lib/`
(`core` paths/run/probe/audio, `frames` sheets and overlays, `analyze` one-pass video and audio measurement);
Python helpers in `py/` run in `tools/py/venv`. Outputs default to `<project>/work/<kind>/` or `_scratch/`; nothing
writes inside `RAW FOOTAGES/` or `REFERENCES/` (`assertWritable`).

## Rebuilding the environment (new machine or repair)

`install.bat` / `./install.sh` at the repo root, or `node tools/setup/setup.mjs` once Node, Python and FFmpeg are
installed. It is safe to re-run and skips finished steps; `--check` verifies without changing anything, `--force`
rebuilds. What it does, so any piece can be repaired alone:

- **Python media env:** `tools/py/venv` from `requirements.txt`. PySceneDetect pulls `opencv-python`, which can shadow
  the contrib build's `cv2`; setup checks `cv2.TrackerCSRT_create(); cv2.FaceDetectorYN` and force-reinstalls
  `opencv-contrib-python-headless` when needed.
- **Matting env:** `tools/rvm/venv` from `tools/rvm/requirements.txt` (DirectML on Windows, CPU elsewhere).
- **Downloads** (`tools/setup/assets.json`, each checked by sha256): RVM models v1.0.0, YuNet
  `face_detection_yunet_2023mar.onnx`, DeepFilterNet 0.5.6 for this platform.
- **Fonts:** `npm ci --ignore-scripts` in `LIBRARY/fonts/_src` (versions in its lock file), then `setup/build-fonts.mjs`.
- **SFX:** Kenney ships in git; `studio sfx kit` synthesizes the fallback kit; Sonniss is a manual download
  (`docs/SFX.md`), then `studio sfx import <zips> --to SFX/sonniss_gdc2026`.
- **Grades:** `studio grade bake`; `studio grade verify` checks the round trip (PSNR above 40 dB per look).
- **HyperFrames skills:** `npx hyperframes@0.8.209 skills update hyperframes hyperframes-cli hyperframes-registry media-use`.

## Calibration notes

- QC "visible change": per-second max scene score ≥ 2.5 (hard cuts score ≥ 10; talking-head motion stays under ~1.2),
  measured on the c0473 v003 reels.
- `voice-clean`: DeepFilterNet output is realigned by cross-correlation and padded to the exact input length; the
  final limiter is latency-compensated. Residual offset measured 0.000 ms on c0473.
- `mix` levels are the house palette (voice peaking near −3 dBFS); see `LEVEL` in `cmd/mix.mjs`.
