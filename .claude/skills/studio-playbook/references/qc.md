# Quality control

Two passes on every render before it is called done: the measured pass (`studio qc`) and the judgement pass
(this checklist, or the qc-reviewer agent with `/qc`). House edits also run `style_check.mjs`.

## Measured: `studio qc <file> [--platform reels] [--transcript work/rough.words.json] [--faces]`

| Area | Check | FAIL | WARN |
|---|---|---|---|
| spec | codec, pixel format, frame rate, aspect, length, size vs platform | wrong aspect, verified limit exceeded | VFR, 44.1 kHz, unverified limit |
| loudness | integrated, true peak, sample peak | more than 2 LU off −14, true peak > −0.1, clipping | 1–2 LU off, true peak > −1 |
| pace | dead air (gaps > 0.3 s), longest stretch without a visible change | — | dead air > 5%, still > 6 s (vertical) / 12 s |
| picture | black frames mid-video, frozen picture, 1–3 frame slivers | black mid-video | frozen > ~4 s, slivers |
| hook | first frame black, audio start, first visible change | black first frame | audio starts late, no change in 3 s |
| safety | flashes per second (photosensitivity) | > 3 per second | > 2 per second |
| faces | face boxes on the sheet frames | — | (read faces.jpg) |

Outputs `sheet.jpg` (safe zones tinted), `hook.jpg` (first 3 s) and `faces.jpg` in `work/qc/<name>/`.

## Judgement checklist (score 1–5, 4 is the bar)

1. **Hook:** frame 0 shows the claim or format; the first 3 s promise something specific.
2. **Rhythm:** shot lengths vary; re-hooks every 7–10 s; breathers exist; no dead stretches.
3. **Story:** every graphic says what the voice says on its word; one idea per beat; proof is real and labelled.
4. **Motion quality:** one entrance family; eases by role; landed things hold still; no late graphics (> 4 frames).
5. **Typography:** two families max, consistent sizes per role, readable at phone size, safe zone respected,
   nothing on eyes-to-chin.
6. **Smoothness:** no stutter, jumps at seams or slivers; motion blur on fast moves.
7. **Sound design:** hits land on their frames, no sound on every word, voice always on top, music licensed.
8. **Audio levels:** consistent voice level, no pumping from ducking, no clicks at joins.
9. **Consistency:** same grade across cuts, same palette and accent use, same treatment for the same job.
10. **Finish:** spelling of names and numbers, captions match speech, CTA clear, end frame intentional.

## Severity and verdict

FAIL = a viewer would notice it and it breaks a style rule, the message (a payoff shown before it is said, an
unreadable line, a wrong name or number), a measured limit or a delivery spec. WARN = visible on close review, or a
craft improvement. No FAIL → ship; any FAIL → fix then ship; a broken hook or FAILs in three or more areas → rework.

## Checks the sheets alone miss

- **Graphics before their word:** list timed clips (`studio peek hf/index.html`) against the edit-timeline word times;
  a graphic that shows the answer before the voice says it spoils the beat.
- **Text on the face during lean-ins:** `studio faces <file> --fps 10`, then compare chin and eyes lines with caption tops.
- **Voice joins inside speech:** a join where the voice is loud on both sides (about −12 dBFS) can clip a consonant;
  joins should sit in pauses (−27 dBFS and below).
- **The tail:** digital silence under moving picture at the end reads as a mistake; lay room tone or end earlier.

## Generic-AI tells to catch

Captions on every word in caps · fade-and-slide-up on everything · stock whoosh on every cut · centred white text with
drop shadow over everything · floating/breathing titles · random glitch or shake · invented stats · logo animations
that do not match the brand · music louder than the voice · the same zoom on every cut.

## Report format

```
QC <file> · <length> · <platform>
FAIL/WARN items with timestamps and a concrete fix each (what to change, where, to what)
Scores: hook 4 · rhythm 3 · story 5 · motion 4 · type 4 · smooth 5 · sound 3 · levels 5 · consistency 4 · finish 4
Verdict: ship / fix then ship / rework, with the top 3 fixes in order
```
