# Reference analysis

Goal: turn someone else's video into instructions for the user's own footage. Recreate the visual language
(pace, motion family, type system, sound palette, structure), never the content (their words, assets, music,
recognisable layouts, logos or face).

## Process (`/ref <video>` runs it in the reference-analyst agent)

1. **Cache first:** `LIBRARY/references/index.json` lists every scanned reference by content hash. R1–R6 (the house
   references) are already broken down in `my-editing-style/references/reference-reels.md`.
2. **Measure:** `studio refscan <video> [--slug name]` writes `LIBRARY/references/<slug>/` with `summary.md` (shots,
   pace, per-second change, palette, loudness, tempo and beats, speech rate, hook line), `shots.jpg` (one frame per
   shot), `hook.jpg` (0–3 s every 0.25 s) and `motion.jpg` (frames around the three biggest changes).
3. **Look:** read `summary.md`, then the three sheets. Use `studio sheet <video> --from a --to b --every 0.1` only for a
   moment whose motion is unclear. Never step through frames one by one.
4. **Write `breakdown.md`** from `LIBRARY/references/_template.md`: every claim tied to a timestamp or a measured number.
5. **Map it:** each technique to a registry item or house component (`motion-map.md`), with timings in frames and
   the sound cue category, so the build can start without re-watching.
6. **Index:** add the breakdown path to the reference's entry in `index.json`.

## What to identify

Editing style and mood · structure and hook · pace (ASL, cuts per minute, re-hook interval) · motion graphics and
their timing (frames, eases) · typography (families by classification, sizes as % of height, case, weight contrast) ·
transitions and what causes each · camera moves (punch-ins, pushes, parallax) · sound (music kind and tempo, SFX
categories and where they hit, loudness) · B-roll selection logic · visual hierarchy · colour (palette, luma,
saturation, grade style) · composition and safe-zone use · what makes it feel premium (or cheap).

## Rules

- Measure before describing: numbers from `summary.md` beat impressions.
- Name techniques by mechanism ("per-word blur-in 4 frames apart, expo.out") not by vibe ("dynamic text").
- Mark guesses as guesses. Typeface names are classifications unless the font is certain.
- Do not reuse their copy, music, assets or exact layouts; describe the principle and the studio's way to build it.
