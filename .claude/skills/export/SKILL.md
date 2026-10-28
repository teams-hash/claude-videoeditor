---
name: export
description: Make platform deliverables from a finished master (reels, tiktok, shorts, youtube, linkedin, x), check each against its spec, and update the project record.
argument-hint: "<master video path> <platform> [platform...]"
disable-model-invocation: true
---

Export deliverables: $ARGUMENTS

1. For each platform named, run `node tools/studio/studio.mjs export "<master>" --platform <p>` (never `--force` over
   an existing file; a new version gets a new name). If it refuses an aspect mismatch, ask before using `--fit`.
2. Run `node tools/studio/studio.mjs export "<output>" --platform <p> --check` on each output and report PASS/WARN/FAIL.
3. If the master belongs to a project, add the outputs to the deliverable in `projects/<slug>/project.json`, set the
   status, then run `node tools/studio/studio.mjs index`.
4. Report each file with its size, bitrate and any limit that is marked unverified in the specs.
