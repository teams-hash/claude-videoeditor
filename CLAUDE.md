# DNMS Video Editing System

DNMS Digital's shared video editing studio. Claude is the editor and creative director; repetitive work runs through
local tools. Read this, then only what the task needs.

## Team

- This folder is an editor's clone of `teams-hash/claude-videoeditor`. At session start `auto-update.mjs` prints one
  `DNMS studio v…` line. If it says NOT updated or could not check, tell the user in one sentence, with the fix it gives.
- Shared files (`.claude/`, `tools/`, `LIBRARY/` except what the toolkit writes, `docs/`, `CLAUDE.md`) change only
  through a pull request (`docs/CONTRIBUTING.md`). When a user asks to change a skill, rule or tool on `main`, don't
  edit it. Write the change up as a note for the skill lead instead, unless the user is a maintainer working on a branch.
- Client profiles are skills named `client-<slug>` (template in `docs/templates/client-profile/`). Use the one that
  matches the project's client.

## Map

| Path | What |
|---|---|
| `RAW FOOTAGES/`, `REFERENCES/` | Originals. Read-only (a hook blocks writes). Work in a project folder. Not in git |
| `projects/<slug>/` | One job: `project.json` (source, style, deliverables, pipeline order), `work/`, `hf/` (HyperFrames) |
| `projects/INDEX.md` | Every project, export and library count (`studio index` rebuilds it) |
| `EXPORTS/` | Deliverables only, `<name>-v001.mp4`, `-v002`… A new version is a new file. Not in git |
| `LIBRARY/` | Shared: `sfx/index.json`, `fonts/`, `grades/`, `motion/`, `references/` (cached scans and breakdowns) |
| `SFX/` | Sound libraries: Kenney CC0 (in git), Sonniss GDC 2026 curated (each person downloads it: `docs/SFX.md`). Indexed in `LIBRARY/sfx/index.json`; `studio sfx find` lists only sounds present on this machine |
| `tools/` | `studio/` toolkit, `setup/` installer (`setup.mjs`, `assets.json`), `rvm/` matting, `py/` Python media env, `bin/` DeepFilterNet, `hooks/` |
| `_scratch/` | Throwaway output (git-ignored) |

`studio` means `node tools/studio/studio.mjs`. `studio help` lists the commands; `studio help <cmd>` shows usage.

## Skills

- House style ("my style", formats A–D): `my-editing-style`. Style codes (H10 C9 L4…): `brand-nat-styles`. Both live in
  `.claude/skills/` with the studio skills, so they load whenever Claude Code opens this folder.
- Craft rules, presets, technique-to-component map, export specs, QC checklist: `studio-playbook`.
- HyperFrames: `hyperframes` (render contract), `hyperframes-cli`, `hyperframes-registry` (search ~450 blocks and
  components before hand-building), `media-use` (always `--local-only` unless the user approves a paid provider).
  These four install to `~/.claude/skills` from HyperFrames (setup does it; `npx hyperframes skills update` refreshes).
- Precedence: the user's words > the client profile (`client-<slug>`) > the chosen style skill > studio-playbook > HyperFrames defaults.

## Workflow (any style)

1. `studio new <source> --style <skill>`: project.json, audio, transcript, source sheet. Check the sheet for burned-in
   text. Landscape source and no size given: ask orientation and one video vs. one per script.
2. Fix misheard names (the client profile's `spelling.md`, then memory), write `work/cuts.json`, run `studio cut <slug> work/cuts.json`
   (`--aspect 16:9`; `--width 2160` when reframe.mjs will punch in).
3. Visual map, sound score and storyboard from `work/rough.words.json`. Show the storyboard; wait for a yes.
4. Build in `hf/`: one scene per sub-composition; registry items, `studio motion add`, `studio fonts add`;
   `npx hyperframes check` until clean; snapshot key beats.
5. Sound: `studio voice-clean`, cues by hit time (`studio sfx find`), `studio mix`.
6. Render, then `studio qc <file>` (plus `style_check.mjs` for house rules) or the qc-reviewer agent. Fix every FAIL.
7. `studio export --platform …`, update `project.json` (deliverables, status), `studio index`.

## Machine

- Setup: `install.bat` (Windows) or `./install.sh` (macOS, Linux); `npm run check` verifies a machine. A missing model,
  env or library means setup has not run: run it rather than rebuilding by hand.
- The toolkit's Python lives in its own venvs (`tools/py/venv`, `tools/rvm/venv`); the toolkit finds them itself. To run
  Python yourself on Windows use `py -3.12` (bare `python` may open the Store stub); never call `convert` there (a disk tool).
- FFmpeg full build on PATH: libx264 for finals; a hardware encoder (`h264_amf` AMD, `h264_nvenc` NVIDIA,
  `h264_qsv` Intel, `h264_videotoolbox` Mac) for fast proxies when `ffmpeg -encoders` lists it.
- Matting: `studio matte` (RVM: GPU through DirectML on Windows, CPU on macOS/Linux, ~8 min per minute of 1080p on the
  reference PC); `--engine hf` is the fallback where RVM is not installed (Intel Macs).
- HyperFrames renders at about 2x real time on the reference PC (Ryzen 5 5600G, integrated Radeon, 15 GB RAM): keep
  `--workers` at 3–4 on similar machines, add `--page-side-compositing` when shader transitions are used.
- HyperFrames is pinned per project in `hf/package.json`; new work uses 0.8.209 (`HF_VERSION` in `tools/studio/lib/core.mjs`).

## Tokens

- Start from `project.json`, `projects/INDEX.md` and memory. Don't re-explore folders.
- Never read big files whole (a hook blocks text files over 150 KB): `studio peek <file>`, grep, or ranged reads.
- Numbers before pictures: read `studio qc` / `refscan` / `probe` output first, then contact sheets, never frame by frame.
- References: check `LIBRARY/references/index.json`; new ones go to the reference-analyst agent (`/ref`).
- Reuse toolkit commands, house components and registry items. Don't rewrite a pipeline script that exists.

## Rules

- Ask before paid or cloud calls: HeyGen (media-use, `hyperframes audio --quality best`, `hyperframes cloud`), Gemini, ElevenLabs.
- `studio clean --apply` only after the user approves its list (it moves files to the Recycle Bin or Trash).
- Licences travel with sounds in the SFX index: Sonniss (commercial use, no AI training, no redistributing raw files),
  Kenney CC0, Pixabay. Use music only when the user holds a licence for it.
