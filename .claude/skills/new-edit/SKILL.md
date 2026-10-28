---
name: new-edit
description: Start a new edit from a source video in the studio (project folder, audio, transcript, source contact sheet, project.json), then plan it with the right style skill.
argument-hint: "<source video path> [my-editing-style|brand-nat-styles] [slug]"
disable-model-invocation: true
---

Start a new edit: $ARGUMENTS

1. Run `node tools/studio/studio.mjs new "<source>" --style <style> [--slug <slug>]` with the arguments above
   (quote the path; if no style was given, ask whether this is the house style or Brand Nat codes before planning).
2. Read the printed summary and look at `work/sheets/source.jpg`: burned-in captions or graphics change the plan.
3. If the source is landscape and no output size was named, ask the orientation and whether it is one video or one
   per script (memory: output size beats the skill default).
4. Correct names in the transcript (client spellings are in memory), then continue with workflow 1 in
   `.claude/skills/studio-playbook/references/workflows.md` and the chosen style skill. Stop at the storyboard for approval.
