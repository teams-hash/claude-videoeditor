# Optimization report (2026-10-29)

Source: the studio folder `CLAUDE VIDEO EDITOR` on the studio PC, left untouched. This repository was built as a copy.

## Size

| | Bytes | |
|---|---|---|
| Original folder | 23,020,001,045 | 23.0 GB |
| This repository (files) | 2,747,751 | 2.7 MB (1.5 MB packed in git) |
| Saved | 23,017,253,294 | 99.99 % smaller |
| After running setup | about 610 MB more on each machine | venvs, models, fonts, LUTs; never committed |

## Where the 23 GB was, and what happened to it

| Original | Size | Class | In the repo |
|---|---|---|---|
| `projects/` (4 client jobs: proxies, mattes, renders, plates, frame dumps) | 10.9 GB | Not needed to run the studio; client data | Excluded. Stays on the studio PC |
| `SFX/_downloads/sonniss_gdc2026/` (5 bundle zips) | 6.5 GB | Download leftover | Excluded; re-downloadable (`docs/SFX.md`) |
| `SFX/sonniss_gdc2026/` (129 curated WAVs) | 356 MB | Optional, licence forbids redistribution | Converted to code: `studio sfx import` rebuilds the same 129 files from the zips |
| `SFX/_downloads/sonniss_selected/` | 33 MB | Hand-picked duplicates of bundle files | Excluded (one is indexed; see `docs/SFX.md`) |
| `SFX/_downloads/kenney_*` (152 OGGs) | 1.4 MB + 1.2 MB of zips | Essential, CC0 | **Kept** (sounds and licences); zips and empty folders dropped |
| `EXPORTS/` | 1.66 GB | Generated deliverables | Excluded; folder created by setup |
| `RAW FOOTAGES/`, `REFERENCES/` | 1.28 GB | Personal/client media | Excluded; folders created by setup |
| `.claude/worktrees/` | 815 MB | Claude Code session checkouts | Excluded |
| `_scratch/` | 342 MB | Throwaway output | Excluded |
| `tools/py/venv`, `tools/rvm/venv` | 438 MB | Replaceable | Converted: `requirements.txt`, `tools/rvm/requirements.txt` (pinned), built by setup |
| `tools/rvm/models/*.onnx` | 117 MB (one file 107 MB, over GitHub's limit) | Essential | Downloaded by setup from the official release, sha256-checked |
| `tools/rvm/bench/` | 17 MB | Benchmark videos and stills | Excluded |
| `tools/bin/deepfilternet/deep-filter.exe` | 26 MB | Essential, Windows-only | Downloaded per platform (Windows, macOS, Linux builds), sha256-checked |
| `tools/models/yunet/*.onnx` | 0.2 MB | Essential | Downloaded, sha256-checked |
| FFmpeg 9.0.2 (outside the folder, winget) | | Essential | Installed by `install.bat` / `install.sh`; setup verifies 15 filters + libx264 |
| `LIBRARY/fonts/` woff2 + `_src/node_modules` | 13 MB | Replaceable | Rebuilt: `npm ci` (lock file) + `build-fonts.mjs` |
| `LIBRARY/grades/cube/` | 9.7 MB | Replaceable | Rebuilt: `studio grade bake` (from `looks.json`) |
| `LIBRARY/sfx/synth/*.wav` | small | Replaceable | Rebuilt: `studio sfx kit` (FFmpeg synthesis) |
| `LIBRARY/motion/lookbook` renders | 33 MB | Generated demo video | Excluded; the lookbook's source compositions are kept |
| `LIBRARY/references/*/frames` | 2 MB | Cached frames | Excluded; breakdowns and scans kept |
| `_backups/` | 0.3 MB | Pre-edit skill backup | Excluded (superseded) |
| `projects/INDEX.*` | small | Generated | Rebuilt by `studio index` |

## Preserved

- All skills: `my-editing-style` and `brand-nat-styles` (copied in from `~/.claude/skills`, so they now travel with
  the repo), `studio-playbook` (14 reference files), and the `/new-edit`, `/ref`, `/qc`, `/export`, `/studio-status`
  commands. Content unchanged apart from path fixes (below).
- Agents (reference-analyst, motion-builder, qc-reviewer), hooks and `.claude/settings.json`.
- The full toolkit (22 commands, presets, Python helpers), house motion components and tokens, the lookbook source,
  font roles, the 8 colour looks, the 309-sound index, 6 reference breakdowns, `CLAUDE.md`.
- HyperFrames' own skills are installed from upstream by setup rather than copied (third-party, updated by HeyGen).

## Changed for portability

| File | Before | After |
|---|---|---|
| `tools/studio/lib/core.mjs` | `venv/Scripts/python.exe`, `deep-filter.exe`, `C:/Windows/Fonts/arialbd.ttf`, house scripts under `~/.claude/skills` | Per-platform venv and binary names; label font found per OS (`STUDIO_LABEL_FONT` override); house skills from the repo first |
| `tools/studio/cmd/sfx.mjs` | `C:\Windows\System32\tar.exe`; absolute `C:\Users\rgo\...` paths in the index; kit skipped when its JSON existed | System tar per OS; `~/...` paths; missing sounds skipped; kit rebuilt when its WAVs are missing |
| `LIBRARY/sfx/index.json` | 19 absolute paths to one user's home | `~/.claude/skills/...` |
| `tools/studio/cmd/clean.mjs` | Windows Recycle Bin only | Recycle Bin / macOS Trash / `gio trash` |
| `tools/studio/cmd/matte.mjs` | DirectML always | DirectML on Windows, CPU elsewhere |
| Agents, skills, `LIBRARY/references` | `C:/Users/rgo/Desktop/...` and `~/.claude/skills/my-editing-style` | Repo-relative |
| `CLAUDE.md`, `tools/studio/README.md` | One PC's specs and manual rebuild steps | Platform-neutral; setup is the rebuild path |

## Tests (Windows 10 Pro, Ryzen 5 5600G, Radeon iGPU, Node 24.22, Python 3.12.10, FFmpeg 9.0.2)

- Fresh `git clone` of the committed files, then `install.bat` with an empty home folder: **22 ok, 1 warning (Sonniss
  not downloaded, expected), 0 failed, 109 s**, including the HyperFrames skills install.
- 23 functional tests in that clone on a 10 s clip of real footage, all passing: probe, project intake, contact
  sheets, shot detection, YuNet faces, DeepFilterNet voice clean, SFX find/cats, mix (−13.9 LUFS, −2.2 dBTP),
  grade apply/sheet/verify (PSNR ≥ 40 dB), fonts, motion, Reels export, QC, RVM matte on DirectML, peek, index and
  status, `style_check.mjs`, and all three hooks (the source guard blocked an `rm` inside `RAW FOOTAGES`).
- Setup and tests changed no tracked file; `--check` mode verified the result.
- `studio sfx import --dry-run` on the original Sonniss zips selected the same 129 files (355 MB) as the original.
- Not tested: macOS and Linux (no machines available). Their pinned Python wheels were confirmed to exist (Apple
  Silicon, Linux x64), and DeepFilterNet's checksums were recorded from the official release files, but the scripts
  have not been run there. Transcription (`studio new` without `--no-transcribe`) was not run in the test, to avoid
  downloading the speech model; it is unchanged HyperFrames code.
