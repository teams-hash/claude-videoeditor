# Typography

## Scale (px)

| Element | 1080×1920 | 1920×1080 |
|---|---|---|
| Caption | 54–72, weight 600–700 | 44–56 |
| Card text / labels in cards | 44–56 | 36–44 |
| Key word or number | 96–160 | 80–120 |
| Headline | 140–220 | 96–140 |
| Giant word behind the subject | 300–480 | 220–360 |
| Small tracked caps label | 28–34, tracking +8–12% | 28–32 |
| Lower third: name / title | 52 / 32 | 44 / 28 |

Nothing readable below 28 px (2.6% of the short side, the HyperFrames craft floor; `max(28px, 2.6cqw)` in components). Titles 4–9% of the frame height; hero words may fill 60–90% of the width.

## Setting

- Line length: captions at most 2 lines, 18–32 characters per line; cards at most 6 words per line.
- Leading: display 0.92–1.05; text 1.2–1.35. Tracking: display −1% to −3%; small caps +8–12%.
- Contrast by weight (400 vs 800) or by family (sans + serif italic accent), never by five sizes.
- Numbers: `font-variant-numeric: tabular-nums` for count-ups and timers; digits, not words.
- Two families per video at most. House pairing: Inter Tight 800 + Instrument Serif italic for the accent word.

## Pairings (LIBRARY/fonts, `studio fonts list`)

| Mood | Display | Text |
|---|---|---|
| Premium editorial | Instrument Serif or Playfair Display | Inter |
| Calm SaaS | Inter Tight | Inter |
| Warm, human | Fraunces | Manrope |
| Tech, AI | Space Grotesk | Inter or JetBrains Mono |
| Loud, stats | Bebas Neue or Anton (caps) | Inter |
| Friendly education | Poppins | Poppins |
| Annotations | Caveat | (with any) |

Add to a project: `studio fonts add <hf> "Inter Tight" "Instrument Serif"` and paste the printed `@font-face` block.

## Readability over video

- Contrast at least 4.5:1 (`npx hyperframes validate` reports contrast). On busy footage use a plate (rounded rect,
  70–85% opacity), a soft shadow (`0 2px 12px rgba(0,0,0,.35)`) or a 2–3 px stroke, in that order of preference.
- Cream (#F5F3EE) reads softer than pure white on bright footage; avoid red-on-green and thin weights over video.
- Keep text inside the safe zone (house vertical zone; 80% title-safe in 16:9) and off eyes-to-chin.

## Captions

- House: word-highlight karaoke, accent on the key word, centred around y 1250–1400 on 1080×1920, above the chin line.
- Phrase captions: 2–4 words per chunk, 0.6–1.2 s each, no chunk shorter than 0.6 s.
- Registry styles: `caption-pill-karaoke`, `caption-highlight`, `caption-editorial-emphasis`, `caption-weight-shift`,
  `caption-clip-wipe`, `caption-kinetic-slam`, `caption-parallax-layers`, `caption-camera-follow` (and glitch, neon,
  emoji, particle styles that are off-style for the house look).
- Captions come from the cut voice re-transcribed (Parakeet), with names corrected from memory.

## Kinetic type

SplitText for chars, words and lines; variable axes for weight and width (`Archivo`, `Inter`, `Fraunces`); masks for
line reveals; per-word stagger 60–120 ms; one moving element at a time; landed type holds still. Presets are in
`motion.md`; registry items in `motion-map.md`.
