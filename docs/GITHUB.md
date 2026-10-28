# GitHub notes (owner)

The repository is `teams-hash/claude-videoeditor`. Access rules are in [GOVERNANCE.md](GOVERNANCE.md), and editor
setup is in [ONBOARDING.md](ONBOARDING.md).

## Owner checklist

- Visibility: **Private** (*Settings → General → Danger Zone → Change visibility*).
- Access model chosen (free organization with a Read team, or GitHub Pro with a protected `main`): GOVERNANCE.md.
- *Settings → Code security*: secret scanning and push protection on where offered.
- *Actions*: the `validate` workflow runs on every push and pull request. If you protect `main`, make its `lint` job
  a required check.

## Staying within GitHub's limits

| GitHub rule | This repo |
|---|---|
| Files over 100 MB are rejected (50 MB warns) | The lint check fails anything over 5 MB. The largest file is about 170 KB (a Kenney sound). The 107 MB matting model is downloaded by setup |
| Repositories should stay under 1 GB | About 3 MB of files. The lint check warns past 50 MB |
| No secrets | `.env*`, `*.key`, `*.pem`, `credentials*.json`, `secrets*.json` and `.claude/settings.local.json` are ignored |
| Git LFS | Not used and not needed: media lives on the Drive |

`projects/` is ignored. Project plans are client work and stay in each editor's clone (archived to the Drive in
Phase 2).

## If something large or secret slips into a commit

Before pushing: `git reset --soft HEAD~1`, add the path to `.gitignore`, `git rm --cached <file>`, commit again.
After pushing, deleting it in a new commit doesn't remove it from history. Rewrite with
`git filter-repo --path <file> --invert-paths` (`pip install git-filter-repo`), force-push, and have editors re-clone.
Rotate any secret that was pushed, even briefly.
