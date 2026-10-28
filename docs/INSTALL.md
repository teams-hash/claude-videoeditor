# Installation details

`install.bat` / `install.sh` cover the normal case. This page is for manual installs, other platforms and repairs.

## What each installer does

| Step | Windows (`install.bat`) | macOS (`install.sh`) | Linux (`install.sh`) |
|---|---|---|---|
| Node.js 22+ | `winget install OpenJS.NodeJS.LTS` | `brew install node` | Install yourself first (nodejs.org or `nvm install 22`); Arch gets it from pacman |
| Python 3.12 | `winget install Python.Python.3.12` | `brew install python@3.12` | apt `python3 python3-venv`, dnf `python3.12`, pacman `python` |
| FFmpeg (full) | `winget install Gyan.FFmpeg` (the gyan.dev full build linked from ffmpeg.org) | `brew install ffmpeg` | apt/pacman `ffmpeg`; Fedora needs RPM Fusion |
| Git | `winget install Git.Git` | `brew install git` | from the package manager |
| Extras | | | `libarchive-tools` (bsdtar, reads Sonniss zips), `fonts-dejavu-core` (contact-sheet labels) |
| Everything else | `node tools/setup/setup.mjs` | same | same |

Nothing is installed globally by `setup.mjs` except the HyperFrames skills in `~/.claude/skills` (skip with
`--no-hf-skills`). Python packages live in venvs inside the repo; npm packages in `LIBRARY/fonts/_src/node_modules`.

## Manual install (no winget / Homebrew)

1. Install Node.js 22+ (https://nodejs.org), Python 3.12 (https://python.org) and an FFmpeg full build
   (https://ffmpeg.org/download.html; on Windows the gyan.dev "full" build) and put `ffmpeg`/`ffprobe` on PATH.
2. Run `node tools/setup/setup.mjs` from the repo folder.

To check FFmpeg by hand: `ffmpeg -hide_banner -filters` must list drawtext, ebur128, loudnorm, haldclutsrc, lut3d,
scdet, alphamerge, tpad, sidechaincompress, deesser, blackdetect, freezedetect, silencedetect, zoompan, tile, and
`ffmpeg -hide_banner -encoders` must list libx264. Setup checks exactly this list.

## Platform support

| Component | Windows 10/11 x64 | macOS Apple Silicon | macOS Intel | Linux x64 / arm64 |
|---|---|---|---|---|
| Toolkit, skills, agents, hooks | Tested | Expected to work | Expected to work | Expected to work |
| Python media env (faces, tracking, scenes) | Tested | Wheels verified | Wheels not checked | Wheels verified (x64) |
| RVM matting | Tested (DirectML GPU) | CPU (`onnxruntime`) | Not available: `--engine hf` | CPU |
| DeepFilterNet 0.5.6 | Tested | Official binary | Official binary | Official binary (x64 musl, arm64 gnu) |
| `studio clean --apply` | Recycle Bin | Trash (Finder) | Trash | `gio trash` |
| Hardware encode for proxies | `h264_amf`/`h264_nvenc`/`h264_qsv` | `h264_videotoolbox` | same | `h264_vaapi`/`h264_nvenc` |

"Tested" means run end to end on the studio PC (Windows 10 Pro, Ryzen 5 5600G, Radeon iGPU) on 2026-10-29.
"Wheels verified" means pip found the pinned packages for that platform; the scripts were not run there.

## Environment variables (all optional)

| Variable | Effect |
|---|---|
| `HF_VERSION` | HyperFrames CLI version for new work (default 0.8.209) |
| `STUDIO_LABEL_FONT` | A `.ttf` for contact-sheet labels when no Arial/DejaVu is found |
| `FFMPEG_PATH`, `FFPROBE_PATH` | Used by the house-style scripts when FFmpeg is not on PATH |

No API keys are needed. HeyGen, Gemini and ElevenLabs are optional paid services Claude asks about before use; their
keys belong in each person's own environment, never in the repository.

## Updating

`git pull`, then run the installer again: it installs only what changed (new pins in `requirements.txt` or
`assets.json`, new fonts). `node tools/setup/setup.mjs --force` rebuilds everything.
