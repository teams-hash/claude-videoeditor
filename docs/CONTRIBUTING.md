# Changing the system

For maintainers and approved contributors. Editors: report problems to the skill lead (project, video, what Claude
did, what it should have done). That report is the most useful contribution there is.

## The loop

```bash
git switch -c fix/caption-safe-zone
```

1. Make the change on a branch (above). Auto-update pauses while you're off `main`.
2. Test it for real: open this folder in Claude Code, check the skill triggers on the requests it should and not on
   others, and run it on a real clip.
3. Run the checks:

   ```bash
   node tools/ci/lint.mjs
   ```

4. Bump `version` in `package.json` and add a `CHANGELOG.md` entry (patch / minor / major, see the top of the
   changelog). Docs-only changes don't need a bump.
5. Push and open a pull request:

   ```bash
   git push -u origin fix/caption-safe-zone
   ```

6. CI runs the checks. A maintainer reviews and merges. Every editor gets it at their next session.
7. Tag the release: `git tag v1.1.0 && git push origin v1.1.0`.

A pilot editor can test a branch before merge with `git -C "C:\DNMS Studio" switch <branch>`, then
`git switch main` afterwards to resume updates.

## Rolling back

```bash
git revert <commit>
```

Then push (or open a PR for the revert). Every clone fast-forwards to the revert at its next session start.

## Writing skills

1. **One job per skill.** If the description needs "and also", split it or move the extra part to `references/`.
2. **The description is the trigger.** Say what it does, then when to use it, in the words editors actually type.
   Under 1,536 characters.
3. **SKILL.md under ~300 lines** (the hard limit is 500). Detail goes in `references/*.md`, each named in SKILL.md with
   *when* to read it.
4. **Rules must be checkable.** "Captions: max 2 lines, 32 characters per line, 250 px above the bottom on 9:16"
   beats "keep captions readable". If you can measure it, QC can check it.
5. **Precedence:** the editor's or client's explicit words > client profile > house style > studio-playbook >
   HyperFrames defaults.
6. **Client and style skills hold differences only.** Write what overrides the defaults; don't copy the defaults.

## Adding a client

1. Copy `docs/templates/client-profile/` to `.claude/skills/client-<slug>/` (for example `client-evan-rugen-lgf`).
2. Fill in `SKILL.md`, `brand.json`, `spelling.md` and `references.md`. Brand kits and reference videos go on the
   Drive; link them, don't commit them.
3. Set `name:` in SKILL.md to the folder name. Make the description name the client every way people refer to them.
4. Minor version bump, then PR as above.

## What never goes in the repo

Footage, renders, audio, images, fonts, models, zips, client briefs with personal data, API keys and passwords.
`.gitignore` and the lint check block most of it. If something slips into a commit, see [GITHUB.md](GITHUB.md).
