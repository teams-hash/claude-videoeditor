---
name: studio-status
description: Show the studio's state: projects and their deliverables, newest exports, library counts and pending housekeeping.
disable-model-invocation: true
---

Show the studio status.

1. Run `node tools/studio/studio.mjs index` then `node tools/studio/studio.mjs status`, and show the output.
2. Run `node tools/studio/studio.mjs clean --min-mb 100` and summarize the re-creatable total in one line
   (listing only; never `--apply` without the user's yes).
3. Mention anything stale: projects without `project.json`, references without a breakdown, an SFX index older than
   the newest folder in `SFX/`.
