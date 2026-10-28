# Workflows

`studio` = `node tools/studio/studio.mjs`. Checkpoints marked ◆ wait for the user.

## 1. Talking-head reel (any style)

1. `studio new "<source>" --style my-editing-style|brand-nat-styles [--client "..."]`; look at `work/sheets/source.jpg`
   for burned-in captions or graphics; landscape source with no size given: ask orientation and one or several videos.
2. Correct names in `transcript.json` (memory holds client spellings). Write `work/cuts.json` (best takes, source seconds).
3. `studio cut <slug> work/cuts.json --width 2160` (2× for punch-ins) → `work/rough.mp4`, `rough.words.json`.
   Re-transcribe the rough to verify no clipped words.
4. Plan: visual map (numbers, names, lists, literal verbs), score, `work/storyboard.json`. ◆ Show the table + stills.
5. Picture: `reframe.mjs` punch-ins; `studio matte work/rough.mp4 --edl ...` only for beats that need the cut-out;
   looks via `studio grade apply`.
6. Graphics: `npx hyperframes init hf --non-interactive --resolution portrait` (or reuse), `studio fonts add`,
   `studio motion add`, `npx hyperframes add <registry item>`; one scene file per beat group; `npx hyperframes check`;
   snapshot key beats. Big builds: hand scenes to the motion-builder agent.
7. Sound: `studio voice-clean`, cues by hit time, `studio mix --voice ... --cues work/cues.json --video <render>`.
8. Render (`npx hyperframes render`, 3–4 workers), mix, `studio qc <file> --faces` + house `style_check.mjs`
   (or the qc-reviewer agent). Fix every FAIL; weigh every WARN.
9. ◆ Deliver: `EXPORTS/<name>-v001.mp4`, platform variants with `studio export`, update `project.json` (deliverables,
   status "delivered"), `studio index`, save lasting client facts to memory.

## 2. Brand Nat style codes

Same as 1, with the codes as the treatment list (`brand-nat-styles/styles.md`): show the style card (codes + why) before
the storyboard, 5–6 styles per video, same job gets the same treatment every time.

## 3. Landscape explainer (16:9)

`studio cut ... --aspect 16:9`; title-safe 80% instead of the vertical zone; B-roll or graphic every 6–12 s; chapter
cards every 60–90 s; captions 44–56 px; export `--platform youtube` (and `linkedin`).

## 4. Reference-driven edit

1. `/ref <video>` (reference-analyst): cached scan + `LIBRARY/references/<slug>/breakdown.md`.
2. Map its "recreate with" list onto the user's footage; keep the language (pace, motion family, type system, sound
   palette), never the content (copy, assets, music, layouts that identify the creator).
3. Continue at workflow 1, step 4.

## 5. App demo or voiceless montage

Licensed track → `npx hyperframes audio <track> --only bpm,beats` → beat grid; slots of 6 beats; rebuilt UI with
`capture`, device frames and cursor components; cut on beats, layout changes on bars; keyword CTA end card.

## 6. Revision of a delivered project

Read `project.json` (pipeline order, last version) and the project's memory note; change the smallest step that
fixes the note; re-run only the downstream steps; new version number; QC; update deliverables and the index.

## 7. Housekeeping

`studio index` after deliveries; `studio clean` lists re-creatable intermediates (◆ approve before `--apply`);
commit studio changes with git (media is ignored).
