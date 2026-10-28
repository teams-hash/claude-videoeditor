# Motion presets and craft

House edits use the house timing table and 24 recipes (`my-editing-style/references/motion.md`). HyperFrames craft
rules (springs, overlap, titles, holds, beat grid) are in the `hyperframes` skill's `references/motion.md`. This file is
the studio's shared tokens and the cross-style rules. The tokens ship as `LIBRARY/motion/tokens/house-motion.js`
(`studio motion add` copies them into a project) so compositions never re-invent them.

## Tokens (30 fps)

| Token | Frames | Seconds | Ease (GSAP) | Use |
|---|---|---|---|---|
| `micro` | 4 | 0.13 | `expo.out` | words, chips, icons |
| `enter` | 6 | 0.2 | `expo.out` | cards, captions, labels |
| `pop` | 8 | 0.27 | `back.out(1.6)` | app icons, stamps, badges |
| `move` | 12 | 0.4 | `power3.out` | a card travelling, a panel expanding |
| `camera` | 18–30 | 0.6–1.0 | `power2.inOut` | pushes, pans, dolly, zoom-through build-up |
| `exit` | 0.5 × enter | | `power3.in` | or a hard cut |
| `count` | 30–36 | 1.0–1.2 | `power2.out` | count-ups and progress fills |
| `type` | 15–20 chars/s | | `none` | typed prompts |

Staggers: letters 1 frame, words 2–3 frames (60–100 ms), list rows 2 frames, cards 3 frames. Overlap: start the next
element when the previous is 30–50% done. Springs: damping 0.7–0.85 reads premium; 0.4–0.6 playful.

## Rules

- **Ease by role:** arrivals on a long tail, camera both ways, exits and zoom-throughs accelerate. Linear only for
  progress, typing, rotation and slow ambient pushes. The same `power2.out` on everything looks generated.
- **Distance by role:** hero moves travel 80–200 px; secondary elements 10–30 px; background drifts 3–5% scale per second.
- **One hero move at a time.** Secondary motion is smaller and shorter; the background is slowest.
- **Landed means still.** No breathing, floating or creeping on titles and UI once they land.
- **Start on the word.** Graphics start within 4 frames of their word (`rough.words.json`), sounds on their hit time.

## Depth

- Three planes: background (footage or colour, slowest), subject (cut-out), graphics and captions (front).
- Separate planes with scale (background 1.05–1.1), blur (4–12 px on the far plane for rack-focus moments) and a
  two-layer shadow on cards: `0 2px 6px rgba(0,0,0,.18), 0 18px 40px rgba(0,0,0,.28)`.
- Parallax speeds: background 0.6×, subject 1×, foreground 1.3×.

## Motion blur

- HyperFrames render-time blur: `data-motion-blur="on"` on the composition root (`data-motion-blur-shutter` for a
  longer smear); opt a subtree out with `data-motion-blur="off"`. Run `npx hyperframes check` after adding it.
- By hand: blur that peaks at the fastest frame, 6–12 px on text, 15–20 px full frame, horizontal on horizontal moves.
- Footage: `ffmpeg -vf tmix=frames=3` on fast pans; never on talking heads.

## Kinetic-type presets

| Preset | Build | Timing |
|---|---|---|
| Word rise | SplitText words, y 16 → 0, opacity 0 → 1 | 6 frames each, 2–3 frames apart, `expo.out` |
| Blur-in line | blur 8 px → 0, opacity 0 → 1 | 0.13–0.2 s |
| Slam | scale 1.3 → 1, opacity 0 → 1 | 3 frames, `power3.out`, impact on landing |
| Letter build | per-letter visibility, ghost 0.25 → full | 2 frames per letter |
| Mask reveal | line in an overflow-hidden box, y 100% → 0 | 8 frames, `power3.out` |
| Weight sweep | variable font `wght` 300 → 800 | 12 frames, `power2.out` (Archivo, Inter, Fraunces) |
| Slot roll | one word cycles through options | about 0.1 s per roll, lands with a tick |

## Check motion, don't guess

`npx hyperframes keyframes --shot motion.png --selector '#id'` draws an element's path; `snapshot --range a,b
--frames 8` samples a stretch; a `<name>.motion.json` next to a composition makes `check` assert intent
(`appearsBy`, `before`, `staysInFrame`).
