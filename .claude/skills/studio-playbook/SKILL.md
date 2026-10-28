---
name: studio-playbook
description: "The studio's craft knowledge base: editing and pacing rules, story and hook structures, motion and easing presets, the technique-to-component map (HyperFrames registry plus house components), transitions, camera moves, typography, colour grading, sound design and mixing, storyboard templates, step-by-step workflows, platform export specs, the QC checklist and the reference-analysis method. Use it when planning, building, mixing, exporting or reviewing any video in this studio, when choosing a component, transition, font, look or sound, or when the user asks how something should be done. The style skills (my-editing-style, brand-nat-styles) still own their own look and win where they are specific."
---

# Studio playbook

Craft rules that hold across every style, written as numbers and decisions rather than taste words. Read only the
file the task needs; each is short. When a style skill is active, its own references win where they are specific
(house timing table: `.claude/skills/my-editing-style/references/motion.md`; HyperFrames craft: the `hyperframes`
skill's `references/motion.md`).

## What makes an edit look designed, not generated

1. **One idea per beat, said twice:** the picture shows what the voice says, landing within 4 frames of the word.
2. **Contrast of states:** plain talking stretches make the illustrated beats land. Never decorate every second.
3. **One system:** one entrance family, one accent colour, two typefaces, one transition family plus a signature move.
4. **Motion with a cause:** things move because something pushed them (a word, a beat, a cut). Landed titles hold still.
5. **Arrive slow, leave fast:** long-tailed ease-outs in, exits 40–50% shorter or a cut.
6. **Depth and hierarchy:** one focal point per frame; background < subject < graphics < captions.
7. **Sound marks structure:** hits on cuts and reveals, never a sound on every word; voice always on top.
8. **Real proof:** real screens, sources and numbers, labelled. Nothing invented.
9. **Measured finish:** −14 LUFS, safe zones, no slivers, no dead air, checked with `studio qc`.
10. **Taste check:** if a choice is the default anyone would make (fade-up on everything, centred white captions,
    stock whoosh on every cut), ask what the specific choice for this message is.

## Files

| Read | When |
|---|---|
| `references/editing.md` | Cutting, pacing, rhythm, retention structure, B-roll, jump-cut handling |
| `references/story.md` | Thesis, hook archetypes, structures, visual storytelling, proof, CTAs, on-screen copy |
| `references/motion.md` | Studio motion tokens (frames, eases, staggers), depth, motion blur, kinetic-type presets |
| `references/motion-map.md` | Which registry item or house component builds each technique, with settings and verdicts |
| `references/transitions.md` | Which transition when, durations, sound pairing, house-safe vs off-style |
| `references/camera.md` | Punch-ins and reframes on footage, virtual camera moves, parallax, speed ramps, 3D camera |
| `references/typography.md` | Type scale for 9:16 and 16:9, pairings, captions, readability, kinetic type |
| `references/color.md` | Correction order, scopes by numbers, the look library, matching shots, graphic palettes |
| `references/sound.md` | SFX library use, layering, timing, levels, ducking, voice chain, music, licences |
| `references/storyboard.md` | Storyboard table and storyboard.json / cues.json schemas |
| `references/workflows.md` | Step-by-step SOPs per job type, with toolkit commands and checkpoints |
| `references/export.md` | Platform specs, master settings, naming, captions sidecars, covers |
| `references/qc.md` | Automated checks, the judgement checklist and how to report |
| `references/reference-analysis.md` | Turning a reference video into actionable instructions without copying it |

## Tools this playbook assumes

`studio` = `node tools/studio/studio.mjs` (help lists all commands). Registry: `studio catalog <words>`,
`npx hyperframes add <name>`. House components: `studio motion list|add`. Agents: reference-analyst, qc-reviewer,
motion-builder (in `.claude/agents/`).
