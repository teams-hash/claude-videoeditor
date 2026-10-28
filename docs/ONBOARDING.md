# New editor setup (Windows, about 30 minutes)

You'll end with Claude able to edit a whole video on your PC, using the team's skills, kept up to date
automatically.

## Before you start

- A **Claude Pro** (or Max) account.
- About 3 GB free disk, plus room for footage.
- A **GitHub** account only if the repository is private (it's public today). In that case, send your GitHub
  username to the studio owner and accept the invitation email from GitHub.

## Shortcut: let Claude install it

1. Install the **Claude desktop app** from claude.com/download and sign in.
2. Open the **Code** tab in any folder and paste:

   > Install this: https://github.com/teams-hash/claude-videoeditor

   (Claude follows [INSTALL-FOR-CLAUDE.md](INSTALL-FOR-CLAUDE.md) and installs it into `C:\DNMS Studio`.)

3. Click **Allow** when Claude asks to run commands, and **Yes** on Windows permission pop-ups.
4. When it's done, **open a new session in `C:\DNMS Studio`** (Code tab → choose the folder → Trust) and go to
   [step 5](#5-your-first-edit). The session you installed from can't edit videos.

The steps below do the same thing by hand.

## 1. Install the apps

1. **Claude desktop app** from claude.com/download. Sign in with your Claude account.
2. **Git**: open PowerShell and run:

   ```bash
   winget install --id Git.Git -e
   ```

   Close PowerShell when it finishes.

## 2. Get the studio

Open a new PowerShell window and run:

```bash
git clone https://github.com/teams-hash/claude-videoeditor.git "C:\DNMS Studio"
```

A browser window asks you to sign in to GitHub the first time: sign in and approve. This saves your login, so
updates later work without asking. Keep the short path `C:\DNMS Studio`: long paths break the Python setup.

## 3. Run setup

Double-click `C:\DNMS Studio\install.bat`. It installs Node.js, Python 3.12 and FFmpeg if they're missing, then
builds the toolkit (5–15 minutes the first time). It ends with `Studio ready`, or a FAIL line that says what to fix.
If it says to close the window and run it again, do that.

Optional, for the full sound library: follow [SFX.md](SFX.md). (Phase 2 will move this to the shared Drive.)

## 4. Open it in Claude

1. In the Claude desktop app, open the **Code** tab.
2. Choose the folder `C:\DNMS Studio` and accept **Trust this folder**.
3. Type `/studio-status`. The first line should read `DNMS studio v… (up to date)`.

## 5. Your first edit

1. Copy a clip into `C:\DNMS Studio\RAW FOOTAGES\`.
2. In the Code tab, type: `/new-edit "RAW FOOTAGES/your-clip.mp4" my-editing-style`
3. Claude makes the project, transcript and contact sheet, then shows you a plan and storyboard. Approve it or say
   what to change.
4. Finished videos land in `EXPORTS\` as `name-v001.mp4`, `-v002`…
5. Before delivering: `/qc "EXPORTS/name-v001.mp4" reels`, then watch it once yourself with sound.

## Updates

Automatic. Every time you start a Claude Code session in `C:\DNMS Studio`, it fetches the latest approved version.
What changed is in [CHANGELOG.md](../CHANGELOG.md). If Claude says setup files changed, double-click
`install.bat` once.

## Rules

- **Don't edit files in `.claude/`, `tools/`, `LIBRARY/`, `docs/` or `CLAUDE.md`.** They're shared, and a local edit
  stops your updates. If a skill or rule is wrong, tell the skill lead with the project and what happened
  ([CONTRIBUTING.md](CONTRIBUTING.md)).
- Footage, projects and exports stay in their folders. They're never uploaded to GitHub.
- Claude asks before using anything paid (HeyGen, ElevenLabs, Gemini). Say no unless the owner approved it.

## If something's wrong

| You see | Do |
|---|---|
| `could not check for updates` | You're offline or GitHub access lapsed: check the internet, then run `git -C "C:\DNMS Studio" fetch` once in PowerShell to sign in again |
| `NOT updated, shared files were changed on this PC` | Run `git -C "C:\DNMS Studio" restore .` in PowerShell (this discards your edits to shared files only) |
| `/new-edit` or `/qc` is missing | You opened a different folder: open `C:\DNMS Studio` in the Code tab |
| A setup FAIL line | Do what it says, or run `npm run check` in the folder and send the output to the skill lead |
