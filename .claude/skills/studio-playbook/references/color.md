# Colour

## Order of operations (footage)

1. White balance (neutral greys and whites; fix casts first, e.g. `fix-green-cast` for green-lit studios).
2. Exposure: talking heads sit at an average luma (signalstats YAVG) of about 100–140 on 0–255; faces brighter than the background.
3. Contrast: a gentle S-curve; blacks near 16–20, highlights below clipping (YMAX < 235 in limited range).
4. Saturation: ±5–10% at most before the look.
5. Look from `LIBRARY/grades/looks.json` at 60–100% strength (`studio grade apply <in> <look> --strength 0.8`).
6. Finish: vignette, grain (spatial; never baked into LUTs).

Grade before compositing (ffmpeg or the baked `.cube` in `LIBRARY/grades/cube/` via `lut3d`). Inside HyperFrames,
footage looks go through `npx hyperframes media-treatment`, never CSS filters (contract rule 11).

## Measure, don't eyeball

- Numbers: `ffmpeg -i in.mp4 -vf signalstats,metadata=print:key=lavfi.signalstats.YAVG -f null -` (also YMIN, YMAX, SATAVG).
- Waveform: `ffmpeg -ss 5 -i in.mp4 -frames:v 1 -vf "waveform=filter=lowpass:display=overlay:scale=ire" wf.png`
- Vectorscope: `ffmpeg -ss 5 -i in.mp4 -frames:v 1 -vf "vectorscope=mode=color4" vs.png`. Skin tones sit on the line at
  about 123° (between red and yellow); keep faces within ±10° of it after any look.
- Compare looks on one frame: `studio grade sheet <video> --at 12`.

## The look library

| Look | Use |
|---|---|
| `clean-neutral` | default talking heads and UI-heavy edits |
| `warm-premium` | founder and lifestyle talking heads |
| `teal-orange-light` | cinematic B-roll and promos, restrained |
| `matte-film` | editorial and documentary (adds grain) |
| `bright-airy` | lifestyle, wellness, product on white |
| `moody-contrast` | serious claims, finance, night (adds vignette) |
| `bw-editorial` | quotes, flashbacks, the "before" half |
| `fix-green-cast` | correction only, before any look |

Add a look: append it to `looks.json`, `studio grade bake <id>`, `studio grade verify` (LUT vs chain PSNR should be
above 40 dB), then check it on `studio grade sheet`.

## Matching shots

Within a scene, keep YAVG and SATAVG within about ±5 between cuts and the skin hue on the same line. Match the
darker shot up rather than the brighter one down.

## Colour on graphics

- One neutral and one accent per video (house rule); 60-30-10: ground 60%, secondary 30%, accent 10%.
- Dark grounds #0E0F12–#16181D rather than pure black; light grounds #F5F3EE cream rather than pure white.
- The accent marks meaning (the key word or number), never decoration. Check text contrast at least 4.5:1.
- Brand colours: take hex values from the client's own assets (logo SVG, site CSS), not from a screenshot.
- Deliver SDR BT.709; `studio export` tags the colour primaries, transfer and matrix.
