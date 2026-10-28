# Architecture

How the DNMS Video Editing System is put together, and why. Decided 2026-10-29.

## The setup this is built for

- Editors give Claude a video and Claude edits all of it: the cut, captions, motion graphics, sound, grade, export
  and QC, through the local toolkit. That only runs in **Claude Code**, meaning the Claude desktop app's **Code** tab,
  the CLI or an IDE. claude.ai chat can't run FFmpeg on your PC.
- Each editor has their **own Claude Pro account**. There's no Team or Enterprise organization, so claude.ai's
  organization skill and plugin sync isn't available.
- Media lives on **Google Drive**.

## The design

```
  Owner / skill leads                         GitHub: teams-hash/claude-videoeditor (private)
  branch → pull request → CI → merge  ──────► main = the approved version
                                                  │
                                                  │ git fetch + fast-forward at every session start
                                                  ▼                       (tools/hooks/auto-update.mjs)
  Each editor's PC
  C:\DNMS Studio\        clone of the repo = the editing workspace
  ├─ .claude/            skills, agents, hooks   ← load when Claude Code opens this folder
  ├─ tools/              studio toolkit + setup  ← install.bat builds Python envs, models, fonts once per PC
  ├─ LIBRARY/            SFX index, looks, motion components, fonts list, reference breakdowns
  ├─ RAW FOOTAGES/ REFERENCES/ projects/ EXPORTS/   local working media, never committed
  └─ (Phase 2) Drive for desktop: G:\Shared drives\DNMS Studio Assets\ and DNMS Projects\
```

**One repository is the whole system.** It holds the skills (house styles, playbook, client profiles), the agents,
the hooks and the toolkit. An editor clones it once, runs `install.bat` once, and opens the folder in Claude Code.

**Updates are automatic.** At the start of every Claude Code session, `auto-update.mjs` fetches `main` and
fast-forwards the clone, then tells Claude in one line what happened (`DNMS studio v1.2.0 (up to date)`, or
`updated v1.1.0 -> v1.2.0`). If the editor is offline, or has edited shared files, or is on another branch, nothing
changes and the line says why. Editors never run git themselves.

**Editors can't break the master copy.** They need read access only. Changes reach `main` only through a pull
request with passing checks (`tools/ci/lint.mjs`). Rollback means reverting the commit, and every clone picks up the
revert at its next session.

## Why not the alternatives (for this setup)

| Option | Verdict |
|---|---|
| **Clone-the-workspace + auto-update hook** (this) | Works on Pro accounts. One install, one update path, no change to the toolkit, already tested on a clean clone |
| Claude Code plugin marketplace | Also works on Pro, but the toolkit resolves every path from its own folder (`tools/studio/lib/core.mjs`), so it would have to be split from the workspace. Updates need auto-update switched on per editor. Worth it only together with the next row |
| claude.ai Team/Enterprise organization sync | The best option for chat-first teams: no git on editors' PCs, and plugins can be made Required. It needs a Team/Enterprise plan, and chat can't run the pipeline anyway. Revisit if the team moves to Team |
| Copy skills into each `~/.claude/skills` | Drifts immediately. A personal copy with the same name also *overrides* the repo's copy, so remove personal duplicates |
| Git LFS for media | Unneeded: media stays off git entirely |

## What lives where

| In git (this repo, target < 50 MB) | On Google Drive (Phase 2) | Rebuilt on each PC by setup | Local only |
|---|---|---|---|
| Skills, references, client profiles, agents, hooks | Curated Sonniss SFX (356 MB), music with licences | Python envs, RVM matting env and models | Footage, project work files, renders |
| Toolkit code, presets, setup and its checksums | Fonts, LUT packs, motion lookbook renders | DeepFilterNet, fonts (npm), LUTs, synth SFX | `_scratch/` |
| SFX index, looks, motion components and tokens | Reference video library, client brand kits | HyperFrames skills (from HeyGen) | |
| Kenney CC0 sounds (1.4 MB), docs, CI | Raw footage and exports per client/project | | |

## Plans and costs

- **Claude Pro** ($20/mo) includes Claude Code, but whole-video editing is heavy and Pro's usage limits will be hit
  on long sessions. Editors who edit all day will likely need **Max**. Check after the pilot.
- **GitHub:** the repo sits on the personal account `teams-hash`. A personal repo has no read-only role:
  collaborators can push. To enforce "editors read, maintainers merge", either move the repo into a free GitHub
  organization (editors get *Read*) or add GitHub Pro ($4/mo) to `teams-hash` and protect `main`. See
  [GOVERNANCE.md](GOVERNANCE.md).
- **Google Drive:** your Workspace storage. Drive for desktop is free.

## Limits to know

- Skills load only in Claude Code sessions opened in the clone folder, which is where editing happens anyway.
- The update runs at session start. A session left open all day uses the version it started with.
- An editor who edits a shared file locally stops receiving updates until that change is discarded. The session-start
  line says so and gives the fix.
- Claude reviews video as sampled frames, measurements and transcripts. It doesn't watch in real time or hear the mix.
  A human watches every final once with sound (the QC skill ends with that sign-off).
