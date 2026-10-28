# Changelog

Every release that changes what editors run gets a version (`package.json`) and an entry here. Editors' clones pick
up `main` automatically at the start of their next Claude Code session.

Versions: **patch** (1.0.1) wording fixes and small tool fixes; **minor** (1.1.0) a new rule, reference, skill or
command; **major** (2.0.0) changed behaviour editors must know about, or a renamed or removed skill or command.

## 1.0.0 (2026-10-29)

First team release, from the CLAUDE VIDEO EDITOR studio.

- Skills: `my-editing-style`, `brand-nat-styles`, `studio-playbook`, and the `/new-edit`, `/ref`, `/qc`, `/export`,
  `/studio-status` commands. Agents: reference-analyst, motion-builder, qc-reviewer.
- Toolkit: `studio` with 22 commands (intake, cut, matte, track, voice clean, SFX, mix, grade, motion, export, QC…),
  `install.bat` / `install.sh` setup with checksummed downloads.
- Team system: automatic update at session start (`tools/hooks/auto-update.mjs`), repository checks
  (`tools/ci/lint.mjs`) and CI, onboarding, contributing and governance docs, client profile template.
