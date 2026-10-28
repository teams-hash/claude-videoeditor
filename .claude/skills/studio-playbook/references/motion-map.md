# Motion map: technique → component

How each technique is built in this studio. "Lookbook" means it rendered on this PC in
`LIBRARY/motion/lookbook/motion-lookbook-v00N.mp4` (segment number in brackets). House components:
`studio motion add <hf> <name>` (variables in each `component.json` and file header). Registry items:
`npx --yes hyperframes@0.8.209 add <name> --dir <hf>`; search more with `studio catalog <technique words>` (pinned, cached CLI).

## Verdicts from the Lookbook (2026-10-28)

- Everything below marked ✓ rendered, including Three.js (WebGL through ANGLE/D3D11) and WebGPU shaders
  (mesh gradient, liquid glass) on the Radeon iGPU. Full 75 s Lookbook: about 3.5 min to render.
- Registry **primitives** (per-word-rise, headline-slam, count-up, push-in, whip-pan-cut, svg-mask-reveal, device-frame-stage)
  are responsive (container units): they fit any box, 9:16 included. Their `accent` takes green | blue | violet, which map
  to the page's `--brand`, `--accent`, `--accent-2`: set those to the brand colours in the root `:root`.
- Registry **blocks** made for 1920×1080 (lt-mask-reveal, data-chart, extruded-logo, liquid-glass-notification,
  mesh-gradient, caption-pill-karaoke, hw-callout-circle) have fixed pixel layouts and demo copy. In 9:16 they need
  re-layout in their source (scaled down, their text falls below the 28 px floor). Edit the installed copy; it is yours.
- Blocks with `data-no-timeline` (mesh-gradient and other shader backgrounds) need `data-no-timeline` on their host too,
  or every render waits 45 s for them.
- `headline-slam` ends its slam with a 3-frame stage shake: off-style for the house look.

## Map

| Technique | Build with | Settings that look designed | Status |
|---|---|---|---|
| Kinetic type (words) | `per-word-rise` (registry) | split word, `cues` = word times from rough.words.json | ✓ [01] |
| Headline slam | `house-giant-word` entrance slam, or `headline-slam` | scale 1.3 → 1 in 3 frames + impact SFX; no shake for house | ✓ [03] [02] |
| Giant word behind the subject | `house-giant-word` under the cut-out layer (`studio matte`) | serif italic accent, ground swap to the brand colour | ✓ [03] (no cut-out in the Lookbook) |
| Text transitions | `kinetic-type-swap`, `text-match-cut`, `morph-text`, `strikethrough-replace` (registry) | one per video | not yet rendered |
| Count-up / stats | `house-stat` (label, prefix/suffix, source) or `count-up` | 30–36 frames power2.out, tabular figures | ✓ [04] [05] |
| Mask reveal | `svg-mask-reveal`, `iris-reveal`, `lt-mask-reveal` | 8 frames power3.out | ✓ [06] |
| Lower third | `house-lower-third` (9:16 and 16:9) | rule 6 frames, name 8 frames from a mask, role +3 frames | ✓ [07]; registry `lt-*` ✓ [15] needs 9:16 re-layout |
| Proof / source card | `house-source-card` | real sources only; highlighter sweeps 10 frames after the card lands | ✓ [08] (sweep fixed for wrapped phrases in v002) |
| Prompt / typing | `house-prompt-card` | 15–20 chars/s, click SFX every 2–3 chars, SENT state | ✓ [09] |
| Camera push | `push-in` (registry); on footage `reframe.mjs` punch-ins | subtle 1.08, standard 1.12 | ✓ [10] |
| Whip / transitions | `whip-pan-cut`, `zoom-through-transition`, `match-cut`, shader transitions | whoosh peaking 2–4 frames before the cut | ✓ [11] |
| Tracked callout | `studio track` → `house-track-callout` | ring from the median box, ease none per sample; label beside the ring, or centred below it when neither side has room | ✓ [12] (14 px max error on the test clip; label stays in frame across a full crossing in v003) |
| Captions | `house-captions` (word JSON, ≤3 words or 1.2 s, accent on the spoken word) | y 64–70% on 9:16, plate on busy footage | ✓ [13] |
| Shader / gradient backgrounds | `mesh-gradient`, `aurora`, `flowing-gradient` (WebGPU) | host gets `data-no-timeline`; keep text contrast | ✓ [13] |
| Device / UI mockups | `device-frame-stage`, `browser-device-stage`, `vfx-iphone-device`; `hyperframes capture <url>` for real UI | phone width captures (390–430 px CSS) | ✓ [14] (empty stage: put the real screen in it) |
| Charts | `data-chart`, `animated-bar-chart`, `bar-chart-race`, `mk-line-graph`, `conic-progress-ring` | reveal values as spoken | ✓ [16] needs 9:16 re-layout |
| 3D type / logo | `extruded-logo`, `code-3d-extrude`, `product-turntable`, `glass-hero` (Three.js) | slow swing, one key light | ✓ [17] |
| Glass UI | `liquid-glass-notification`, `ios26-liquid-glass` (WebGPU html-in-canvas); CSS backdrop-filter cards as a fallback | readable contrast first | ✓ [18] (check contrast: the demo copy fails AA) |
| Parallax / depth | `parallax-zoom`, `camera-rig-depth-stack`, cut-out layers | background 0.6×, subject 1×, front 1.3× | installed, not yet rendered |
| Motion blur | `data-motion-blur="on"` on the root; `motion-blur`, `shutter-slam` components | blur peaks on the fastest frame | installed, not yet rendered |
| Callout shapes (hand-drawn) | `hw-callout-circle`, `hw-arrow`, `hw-underline`, `marker-highlight` | 16:9 blocks: re-layout for 9:16 | installed (`hw-callout-circle`), not yet rendered |
| Beat-synced motion | `beat-accent`, `beat-pulse-background`, `beat-timeline`, `beat-freeze-cut`; grid from `hyperframes audio --only bpm,beats` | cut on beats, layout on bars | not yet rendered |
| Social proof / CTA | `social-proof-card`, `testimonial-card` (real only), `cta-lockup`, `instagram-follow`, `tiktok-follow` | one CTA, at most 2 s | not yet rendered |

When a technique is used for the first time in a real edit, add its verdict here (and the Lookbook segment if added).
