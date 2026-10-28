# DNMS Video Editing System

DNMS Digital's shared video editing system. Every editor gets the same skills, standards, client profiles and tools,
and is updated automatically from this repository.

- **New editor?** Follow [docs/ONBOARDING.md](docs/ONBOARDING.md) (about 30 minutes, Windows).
- **Changing a skill or rule?** [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md). Who approves what:
  [docs/GOVERNANCE.md](docs/GOVERNANCE.md). How it fits together: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
- **What changed?** [CHANGELOG.md](CHANGELOG.md).

**Updates:** each editor's clone fast-forwards to `main` at the start of every Claude Code session
(`tools/hooks/auto-update.mjs`), so nobody runs git or works from an old copy. Changes reach `main` only through a
pull request with passing checks.

## If you're Claude installing this for someone

The person asked you to install this studio. They may not be technical, so do every step yourself and keep your
messages to them short. Follow these steps exactly.

1. **Git.** Run `git --version`. If it's missing on Windows, run
   `winget install --id Git.Git -e --source winget --accept-package-agreements --accept-source-agreements`, then call
   it as `"C:\Program Files\Git\cmd\git.exe"` for the rest of this install (PATH updates only reach new windows). If
   `winget` is missing too, ask them to install Git from git-scm.com and tell you when it's done.
2. **Clone to a short path** (long paths break the Python setup on Windows):
   - Windows: `git clone https://github.com/teams-hash/claude-videoeditor.git "C:\DNMS Studio"`
   - macOS / Linux: `git clone https://github.com/teams-hash/claude-videoeditor.git ~/"DNMS Studio"`

   If that folder already holds a clone of this repo, run `git -C <folder> pull --ff-only` instead. If it holds
   anything else, ask them before touching it.
3. **Run setup as a background command** and wait for it to finish (5–15 minutes, longer than a normal command
   timeout):
   - Windows, from PowerShell: `& "C:\DNMS Studio\install.bat"`
   - Windows, from Git Bash: `cd "/c/DNMS Studio" && cmd.exe //c install.bat`
   - macOS / Linux: `cd ~/"DNMS Studio" && ./install.sh`

   Before it starts, tell them: *"Windows may ask for permission a few times while it installs Node.js, Python and
   FFmpeg. Click Yes."* It's done when it prints `Studio ready`. If it prints FAIL lines, do what each line says (or
   see [docs/INSTALL.md](docs/INSTALL.md)) and run setup again. Finished steps are skipped. `npm run check` in the
   folder verifies the result.
4. **Don't edit any files in the clone, and don't start an edit from this session.** The studio's skills, commands,
   hooks and rules load only in a session opened in that folder, and this session wasn't.
5. **Finish with this message**, using the folder you cloned to:

   > Setup is done. One last step: open a new session in the studio folder. In the Claude app, go to the **Code**
   > tab, choose the folder **C:\DNMS Studio** and click **Trust**. (This session can't edit videos, because the
   > studio only loads in that folder.) In the new session, type `/studio-status` to check it, then put a clip in
   > `RAW FOOTAGES` and type `/new-edit "RAW FOOTAGES/your-clip.mp4" my-editing-style`. The full guide is
   > docs/ONBOARDING.md in that folder.

## What it does

Claude edits the whole video in Claude Code. It's the editor and creative director: it plans the cut, writes the
storyboard, builds motion graphics in HyperFrames, scores the sound and checks the result. The repetitive work (cutting,
transcripts, mattes, mixing, loudness, grading, exports, QC) runs through a local FFmpeg toolkit, so results are
measured and repeatable.

The repository holds the skills, agents, toolkit, presets and libraries (about 4 MB). Everything heavy (Python envs,
models, fonts, LUTs, footage) is installed or rebuilt by the setup script.

## Features

- **Two house styles as Claude skills:** `my-editing-style` (four reel formats from six analysed references) and
  `brand-nat-styles` (style codes like `H10 C9 L4`, with a visual style guide).
- **Studio playbook:** editing, story, motion, typography, colour, sound, export specs and the QC checklist.
- **Agents:** `reference-analyst` (breaks down a reference video), `motion-builder` (builds HyperFrames scenes),
  `qc-reviewer` (measured QC plus a scored review).
- **Toolkit (`studio`, 22 commands):** project intake with transcript, silence-tightened rough cuts at any aspect,
  person mattes (Robust Video Matting), face and object tracking, shot detection, voice clean-up (DeepFilterNet),
  SFX search by need and hit time, mixing with ducking and two-pass loudness, 8 colour looks with baked LUTs,
  17 open-licence font families, house motion components, platform exports with spec checks, QC with contact sheets.
- **Guard rails:** hooks keep originals read-only and stop Claude reading huge files whole.

## System requirements

| | Needed | Installed by the setup script |
|---|---|---|
| OS | Windows 10/11 (tested), macOS 13+ on Apple Silicon, or a recent Linux (Ubuntu 24.04+, Fedora, Arch) | |
| Claude Code | Desktop app, CLI or IDE extension | No: install from claude.com/claude-code |
| Node.js | 22 or newer | Yes (winget / Homebrew; on Linux, install Node 22 first) |
| Python | 3.12 (3.11–3.13 work) | Yes |
| FFmpeg | A full build (libx264, drawtext, ebur128, lut3d, scdet…) | Yes (Gyan full build / Homebrew / distro) |
| Disk | About 1.5 GB after setup, plus room for footage and renders | |
| RAM / GPU | 8 GB+ (16 GB recommended). Any GPU; matting uses it through DirectML on Windows | |

## Install

```bash
git clone https://github.com/teams-hash/claude-videoeditor.git "C:\DNMS Studio"
cd "C:\DNMS Studio"
```

(macOS / Linux: clone to `~/DNMS Studio` instead.) You need read access to the repository; ask the owner.

Windows (Command Prompt or double-click):

```bat
install.bat
```

macOS / Linux:

```bash
./install.sh
```

The installer adds any missing system tools, then runs `tools/setup/setup.mjs`, which:

1. checks Node, FFmpeg (and every filter the toolkit uses) and Python;
2. creates `RAW FOOTAGES/`, `REFERENCES/`, `EXPORTS/`, `projects/`, `_scratch/`;
3. builds the Python envs from `requirements.txt` and `tools/rvm/requirements.txt`;
4. downloads the matting models, face model and DeepFilterNet from their official GitHub releases, checking each
   against the sha256 in `tools/setup/assets.json`;
5. rebuilds the fonts (npm, pinned by lock file), the synthesized SFX kit and the colour LUTs;
6. installs the HyperFrames skills into `~/.claude/skills` and warms the pinned HyperFrames CLI;
7. smoke-tests the toolkit and prints a summary (`Studio ready` or the failing step).

Re-run it any time; finished steps are skipped. Options: `--check` (verify only), `--no-matte` (skip the 120 MB
matting setup), `--no-hf-skills` (leave `~/.claude/skills` alone), `--force` (rebuild). `npm run check` does the
verify. Optional: the Sonniss sound library (130 curated sounds) is a manual download; see [docs/SFX.md](docs/SFX.md).

## Use

Open the repository folder in Claude Code. The studio skills, agents, commands and hooks load automatically from
`.claude/`, and `CLAUDE.md` tells Claude how the studio works. Then type:

| You type | What happens |
|---|---|
| `/new-edit "RAW FOOTAGES/clip.mp4" my-editing-style` | New project: audio, transcript, contact sheet, `project.json`; then the plan and storyboard for approval |
| "edit this in my style" / Brand Nat codes (`H10 C9 L4`) | The style skills take over |
| `/ref "REFERENCES/reel.mp4"` | A reference broken down into build instructions, cached in `LIBRARY/references/` |
| `/qc "EXPORTS/name-v001.mp4" reels` | Measured QC plus a scored review with timestamped fixes |
| `/export "EXPORTS/name-v001.mp4" reels shorts` | Platform versions, each checked against its spec |
| `/studio-status` | Projects, newest exports, library counts |

Put footage in `RAW FOOTAGES/` and references in `REFERENCES/`; deliverables land in `EXPORTS/` as `-v001`, `-v002`…
None of these folders is committed. The toolkit also runs on its own: `npm run studio -- help`, or
`node tools/studio/studio.mjs help <command>`.

Paid or cloud services (HeyGen, Gemini, ElevenLabs) are never used without asking; no API keys are needed for the
local workflow.

## Layout

| Path | What |
|---|---|
| `CLAUDE.md` | How Claude runs the studio (map, workflow, rules) |
| `.claude/skills/` | `my-editing-style`, `brand-nat-styles`, `studio-playbook`, and the `/new-edit` `/ref` `/qc` `/export` `/studio-status` commands |
| `.claude/agents/` | reference-analyst, motion-builder, qc-reviewer |
| `.claude/settings.json` | Hooks: auto-update, session status, read guard, original-file protection |
| `tools/studio/` | The toolkit (`studio.mjs`, `cmd/`, `lib/`, `py/`, `presets/platforms.json`); see its README |
| `tools/setup/` | `setup.mjs` and `assets.json` (downloads with checksums) |
| `tools/rvm/`, `tools/hooks/`, `tools/ci/` | Matting runner and requirements; Claude Code hooks; repository checks (`lint.mjs`) |
| `LIBRARY/` | SFX index, font roles, colour looks, motion tokens and house components, reference breakdowns |
| `SFX/` | Kenney UI sounds (CC0) in git; Sonniss after download |
| `projects/` | One folder per job, local to each PC (not in git) |
| `docs/` | Onboarding, contributing, governance, architecture, install details, SFX libraries, GitHub notes, client profile template |
| `.github/` | CI (`validate.yml`), code owners, pull request template |

## Troubleshooting

| Problem | Fix |
|---|---|
| `FAIL FFmpeg ... lacks drawtext/libx264` | A minimal FFmpeg is installed. Windows: `winget install Gyan.FFmpeg`. macOS: `brew install ffmpeg`. Fedora: enable RPM Fusion, then `sudo dnf install ffmpeg --allowerasing` |
| `ffmpeg` / `node` not found right after install.bat | Close the window and run `install.bat` again (PATH updates reach new windows) |
| Python venv fails with `ensurepip` on Windows | The folder path is too long: clone to a shorter path (e.g. `C:\Studio`) or enable Windows long paths |
| `FAIL Python` on Ubuntu 22.04 | It ships 3.10: `sudo add-apt-repository ppa:deadsnakes/ppa && sudo apt install python3.12 python3.12-venv` |
| `sha256 mismatch` on a download | The release file changed or the download was cut: re-run setup; if it persists, do not bypass the check, open an issue |
| `studio matte` slow or missing on an Intel Mac | RVM's runtime has no Intel-Mac build: `studio matte --engine hf` |
| Contact-sheet labels fail (drawtext font) | Set `STUDIO_LABEL_FONT` to any bold `.ttf` (Linux: install `fonts-dejavu-core`) |
| `studio sfx find` returns no Sonniss sounds | Expected until you download it: [docs/SFX.md](docs/SFX.md) |
| HyperFrames skills missing | `npx hyperframes@0.8.209 skills update hyperframes hyperframes-cli hyperframes-registry media-use` |
| Anything else | `npm run check` names the broken piece; [docs/INSTALL.md](docs/INSTALL.md) covers manual installs |

## Licences

The system's own code, skills and docs belong to DNMS Digital (private; not for redistribution). Third-party pieces keep their licences: Kenney sounds
CC0 (`SFX/_downloads/kenney_*/License.txt`), fonts SIL OFL (licence per family in `LIBRARY/fonts/`, and
`.claude/skills/brand-nat-styles/guide/fonts/OFL.txt`), Robust Video Matting GPL-3.0, DeepFilterNet MIT/Apache-2.0,
YuNet MIT, HyperFrames and its skills from HeyGen (installed from npm/GitHub, not stored here), Sonniss GDC bundle
under its own licence (not stored here: no redistribution of raw files, no AI training).
