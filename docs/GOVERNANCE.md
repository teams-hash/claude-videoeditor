# Governance

## Roles

| Role | Who | GitHub access | Does |
|---|---|---|---|
| Owner | `teams-hash` | Admin | Approves standards and house-style changes, merges, manages access, owns licences |
| Skill lead (maintainer) | 1–2 senior editors | Write | Turns editor feedback into PRs, reviews and merges craft and client changes, tags releases |
| Contributor | Editors approved to improve skills | Write (via PR only) | Branch → PR; never merges their own |
| Client lead | Account owner per client | Write, plus code owner of the client's folder | Approves that client's profile |
| Editor | Everyone else | **Read** | Uses the system and reports problems |

## Enforcing "read-only for editors"

The repo is on the personal account `teams-hash`. GitHub personal repos give every collaborator push access (there's
no Read role), and protecting `main` on a private personal repo needs GitHub Pro. Choose one before inviting
editors:

1. **Recommended, free:** create a GitHub organization (github.com/organizations/plan → Free), transfer the repo to
   it (*Settings → General → Transfer ownership*; GitHub redirects the old URL), set the org's base permission to
   **No access**, and add editors to a team with **Read**. Maintainers get **Write**. Editors then can't push anything.
2. **$4/month:** upgrade `teams-hash` to GitHub Pro and add a branch rule on `main`: require a pull request, 1
   approval, status check `lint`, and block force pushes. Editors are collaborators (they could push other
   branches, but not to `main`).

With either option, also turn on *Settings → Code security → Secret scanning / push protection* where it's offered.

## Release rules

- `main` is what every editor runs. Nothing lands on it without a PR and a green `lint` check.
- Patch fixes any time. Minor and major changes go out at most weekly, with a two-line note to the team (what changes
  for them).
- Every release: `package.json` version + `CHANGELOG.md` entry + tag `vX.Y.Z`.
- Rollback: `git revert <commit>` → merge. Clones pick it up at their next session.
- Changes to `tools/setup/`, `requirements.txt` or the installers need a test on a clean clone (`install.bat` in a
  fresh folder) before merge, because every editor will rerun setup.

## Access and offboarding

- Add an editor: invite their GitHub username (org team *Editors*, or a collaborator invite), then send them
  [ONBOARDING.md](ONBOARDING.md).
- Remove an editor: remove them from GitHub. Their clone stops updating (it keeps the files they already have).
- Review access every quarter.

## Content rules

- The repo holds the agency's know-how: keep it **private**.
- No client media, briefs with personal data, credentials or paid assets in git. They go on the Drive with the right
  sharing.
- Licences travel with assets: Sonniss (commercial use, no AI training, no redistribution of raw files), Kenney CC0,
  fonts SIL OFL. Music only with a licence on file.

## Reviews

- Weekly: skill lead triages editor feedback into PRs.
- Monthly: which skills misfire or go unused. Sharpen descriptions, merge or retire skills.
- Quarterly: standards and house styles review with the owner.
