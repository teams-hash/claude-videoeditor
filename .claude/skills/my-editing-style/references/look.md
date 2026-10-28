# Look

Contents: Palettes · The user's own brand · Type · Caption styles · Grade

---

## Palettes

Colours were sampled from the reference frames. Each family has one neutral, one ink and one accent; the accent marks only the key word or number.

| Family | Format | Neutral / canvas | Ink / deep panel | Accent | Extras |
|---|---|---|---|---|---|
| Clinical tech (R1) | A | #FFFFFF canvas, #F8F8FB white slide | #020202 ink, #090A12 dark slide | Lime #CAFF45 (#C8FB3A on dark) | — |
| Navy explainer (R2) | A | #FFFFFF canvas | Navy #121527 | Yellow #F5D133 | White text |
| Airy AI (R3) | A | #E5E5E5 canvas → #F7F7F7 | Navy #0D192C → #1B3956 | Ice blue #E2EBF7 → #B1D6FC | Claude orange #E27D55, pill #25262B |
| App native (R4) | D | — | #12100E background, #161514 surface | Orange #D57527 | Pill #3B2921 |
| Editorial luxe (R5) | B | Cream #EBECE2 | Forest #163227, caption box #1C362A | Gold #C5A759 | Sage for upcoming caption words (~50% cream on green) |
| Bright pragmatic (R6) | C | White cards #FFFFFF | Natural footage | Highlight #F8E389 | Blue UI icons |

## The user's own brand

Map the brand colours onto roles: canvas or neutral, ink, deep panel, accent, and an optional second accent for one recurring element. Keep the accent for key words and numbers only. Check that the accent reads on both the dark and light surfaces it appears on, nudging lightness rather than changing hue. If the user has brand fonts, map them onto the roles below (display, grotesk, italic serif, mono) instead of mixing in new families.

## Type

These are the closest equivalents available on Google Fonts; the exact faces in the references could not be identified. Load them in the HyperFrames composition. If renders fall back to a system font, download the font files into the project and use `@font-face`.

| Role | Font | Size at 1080×1920 | Used for |
|---|---|---|---|
| Neo-grotesk | Inter Tight 700/800 | Labels 30 px, numerals 120–260 px, tight tracking, tabular figures | A: labels, stats, counters |
| Slide caps | Montserrat 800 | 34–44 px, all caps | A (R2): slide headers and list rows |
| Thin lead-in | Inter 300 | 28–40 px, tight tracking | A (R3): the plain words of a word pair |
| Display serif | Instrument Serif | 180–330 px caps behind the head; masthead ~300 px | B: giant words, magazine masthead |
| Italic serif | Instrument Serif Italic | 60–140 px | A, B: the soft or emotional word ("Claude", "Scratch", "sentence.") |
| Heavy grotesk | Archivo Black | 40–150 px caps | B: "A SINGLE", "BIGGER", tag boxes |
| Mono | IBM Plex Mono 500 | 16–22 px caps, wide tracking | B, C: timecodes, "TO CLAUDE", "• SENT", prompt card bodies |
| Pixel | Silkscreen | 60–90 px | C: name cards such as "CLAUDE CODE" |

## Caption styles

| Style | Format | Spec |
|---|---|---|
| A · Micro pill | A (R1) | 2–3 words, 21–24 px white semibold in a pill rgba(0,0,0,.55), keyword in the accent; inside the edit card near 85% of its height. Deliberately small, because the graphics carry the message |
| A2 · Slide caption | A (R2) | 1–2 words, 30–36 px Montserrat/Poppins-style bold white with a soft shadow, keyword in yellow; at the bottom edge of the speaker window |
| A3 · Word pair | A (R3) | 1–3 thin words (Inter 300) plus one italic serif word with a soft glow; each word rises and fades in (6 frames); chest height |
| B · Karaoke box | B (R5) | 3–4 words, Instrument Serif 44–48 px on a #1C362A box (radius 6 px, padding 10 × 16 px); spoken words cream, upcoming words sage; y 1320–1400 |
| E · Native | C (R6) | 4–8 word sentence chunks on 1–2 lines, 44–48 px white semibold (Inter 600) with a 2–3 px dark stroke, centred at y 1340–1400; an emoji is allowed at the CTA |

## Grade

Grade footage with ffmpeg before compositing. These filter strings were tested on ffmpeg 9 and are starting points; judge them on a still.

| Look | Format | `-vf` |
|---|---|---|
| Untouched | A | none: interview footage stays neutral |
| B&W "before" card | A (R3) | `hue=s=0,eq=contrast=1.05` |
| Warm practical | B | `colorbalance=rs=0.04:gs=0.01:bs=-0.04:rm=0.03:bm=-0.03,eq=contrast=1.04:saturation=1.05` |
| Moody alternate | B | `eq=brightness=-0.06:contrast=1.08:saturation=0.82,colorbalance=rs=-0.02:bs=0.03:rm=-0.02:bm=0.02` (add `vignette=PI/5` for more) |
| Bright natural | C | `eq=brightness=0.02:contrast=1.03:saturation=1.05` |
| Blur plate for modals | C | `gblur=sigma=20` |
