# Motion

Contents: Timing and easing · Rules · Building in HyperFrames · Recipes 1–24

---

## Timing and easing (30 fps)

Durations were measured from 15 fps frame strips around every transition in the references. Easing names are GSAP; After Effects equivalents are in brackets.

| Move | Frames | Easing | Seen in |
|---|---|---|---|
| Micro entrance (word, chip, icon) | 3–6 | expo.out [ease out, ~85% influence] | R1 R3 R5 R6 |
| Pop with overshoot (app icon, card) | 6–9 | back.out(1.6) [~8% overshoot] | R4 R5 |
| Blur-to-sharp text or widget | 6–9 | power2.out | R1 R3 |
| Card state wipe | 4–10 | power3.inOut, motion-blurred or feathered edge | R1 |
| Speaker window → full card; preview → full screen | 6–9 | power3.out | R2 R4 |
| Letter build | ~2 per letter | stepped, ghost → full colour | R5 |
| Typewriter (prompts, chats) | 15–20 characters/s | linear | R4 R5 R6 |
| Decode / scramble | ~30 | random glyph every frame, locking left → right | R1 |
| Count-up | 30–36 | power2.out | R1 |
| Odometer / split-flap digit | 2–4 per digit | power2.out | R2 R5 |
| Line draw (strike, frame, progress) | 3–8 | power2.out | R1 R5 |
| Exit | 2–4, or a cut | power2.in, squash, blur-out | R1 R5 |
| Readable hold | ≥ 30 | — | all |
| Copyable hold (prompt card, folder tree) | 100–230 | — | R6 |
| Ambient push on graphic scenes | continuous | linear, ~3–5% scale per second | R3 |

## Rules

- **Easing.** Entrances ease out. Exits are faster than entrances, or are cuts. Only progress bars, timers, typing and slow pushes move linearly.
- **Motion blur** on wipes, whips, count-ups and fly-ins.
- **Timing.** Every graphic starts within 4 frames of its word. Read the word times from `rough.words.json`, never by ear.
- **One entrance family per video** (blur-in, rise-fade or pop), plus one signature move.
- **Holds.** Anything the viewer must read stays at least 1 s. Anything worth a screenshot stays 3–5 s.

## Building in HyperFrames

- **Timelines.** Animations are GSAP timelines created with `{ paused: true }` and registered on `window.__timelines` under the composition id (`npx hyperframes docs gsap`). The renderer seeks them frame by frame, so every animation must be a pure function of time. Avoid `Math.random()` at render time, timers and `requestAnimationFrame` loops; precompute anything random with a fixed seed.
- **Properties.** The HyperFrames docs list these tween properties as supported: opacity, x, y, scale, scaleX, scaleY, rotation, width, height, visibility. The recipes below stick to them. For anything else (CSS filters, clip-path, changing text), check the HyperFrames docs or skill first, confirm with a snapshot, or use the fallback given.
- **Use ffmpeg for pixel work on footage** (blur plates, grades, halftones, punch-in framing) and HyperFrames for type, cards and UI.
- **Check before rendering.** `npx hyperframes check` runs lint, runtime, layout, motion and contrast in one go; fix every error. Its "line_unread" warnings on karaoke captions are expected at 4 words/s; merge only chunks shorter than about 0.6 s. Mark intentional overlaps with `data-layout-allow-overlap`, `data-layout-allow-occlusion` or `data-layout-allow-overflow`. Then `npx hyperframes snapshot --at <t1,t2,…>` and look at the contact sheet before rendering.
- **Tested facts (HyperFrames 0.8):** `filter: blur()` tweens render. Fonts load from a Google Fonts `<link>` (the compiler caches them). A transparent WebM layer needs `muted`; the footage keeps `data-has-audio="true"`. If npx can't find the CLI from a sub-folder, call the binary by its path.

---

## Recipes

### 1. Split-card frame (A)
Two video layers of the same rough cut, in sync:
- **Raw card:** untouched and wide.
- **Edit card:** inside a rounded container with overflow hidden, scaled about 1.6× around the face. Add a soft shadow on the container.

Add a label above each card. Positions are in formats.md.

### 2. Card state wipe (A)
Put the dark or white slide inside the edit card's clipping container.
- **Dark slide:** y from +100% of the card height to 0 in 8 frames, power3.inOut. A 40 px gradient strip on the leading edge stands in for motion blur.
- **White slide:** x from +100% to 0 in 4 frames, with a 60 px gradient strip (transparent → slide colour) riding the edge as the feather.
- **Return to video:** hard cut (`tl.set` visibility).
- **Sound:** a whoosh that hits 3 frames after the wipe starts.

### 3. Count-up (A)
Pre-build 12–16 text layers for intermediate values spaced on an ease-out:
`value_k = start + (end − start) · (1 − (1 − k/n)^3)`

Show one layer every 2–3 frames with `tl.set(visibility)` over about 1 s, and keep the final one. Use tabular figures. For the blurred-digit look, give the 2–3 layers before the last scaleY 1.06 and opacity 0.85. Optionally add a `tick.wav` on each step at about −24 dB.

### 4. Decode / scramble (A)
Precompute about 30 strings with a seeded random generator. At frame f, the first `floor(f / 30 · length)` characters are final and the rest are random glyphs (A–Z, 0–9, @ # %). Use one layer per frame and switch them with `tl.set(visibility)`. A monospaced or tabular font keeps the width steady. The same trick decodes small labels ("PER VIDEO").

### 5. Odometer and split-flap (A, B)
Each digit is a vertical column of its values inside a box with overflow hidden. On each change, tween y by one line height in 3 frames, power2.out. For split-flap, give each digit a dark card with a thin centre line, and roll the digits one after another 2 frames apart.

### 6. Strike-through and replace (A, B)
A 4–6 px bar (accent or red) over the old value, transform-origin left, scaleX 0 → 1 in 6 frames, power2.out. Then the old value drops to opacity 0.45 and the new value enters beside or below it in the accent colour.

### 7. Blur-in text (A, C)
If CSS `filter: blur()` renders in your HyperFrames version (check with a snapshot), tween blur 12 px → 0 together with opacity 0 → 1 over 6–9 frames. Otherwise use opacity 0 → 1, scale 1.08 → 1 and y 12 px → 0 over 6–9 frames, power2.out; at phone size it reads the same.

### 8. Word and letter builds (all)
- **Words:** split the text into spans, one per word. At each word's start time, tween opacity 0 → 1 and y 16 px → 0 over 6 frames, expo.out.
- **Letters:** `tl.set` visibility on each letter every 2 frames. For R5's look, show a ghost state first (opacity 0.25 in a darker tone) and switch to full cream.

### 9. Karaoke list (A)
Each row is a dark base pill, an accent fill layer and a label. On the spoken word, fade the fill 0 → 1 in 2–3 frames and fade the previous row's fill to 0; keep every row lit for "the full list" moments. Placeholder rows show the label at opacity 0.3 until its word. The count in the header rolls like an odometer (recipe 5).

### 10. Speaker window expansion (A)
Tween the speaker window's width and height (or scale) to fill the card in 7 frames, power3.out, with the corner radius alongside. Hide the module while the speaker is expanded, and return in 7 frames at the end of the connective line.

### 11. Micro data-viz (A)
- **Lines:** 2–3 px tall divs.
- **Progress:** scaleX 0 → 1 from the left, linear, across the spoken span.
- **Nodes:** circles that pop (scale 0.6 → 1).
- **Scrubber:** the knob travels by x, linear, and a ✓ pops at the end.
- **Scatter:** dots pop with a 1-frame stagger; the outliers pop last in the accent colour with a pill label.

### 12. Text behind the subject, background swap (B)
Cut out only the segments that need it. Extract each one frame-accurately from the framed edit (`ffmpeg -i edit.mp4 -ss <start> -t <dur> -an -crf 12 seg.mp4`), then run `npx hyperframes remove-background seg.mp4 -o cut.webm --quality best`.
- **First run:** downloads the u2net_human_seg model once (about 176 MB), so ask the user before that download.
- **Speed:** about 1 s per frame on CPU.
- **Short output:** a clip can come back one frame short. Pad it with `-c:v libvpx-vp9 -i cut.webm -vf tpad=stop_mode=clone:stop=1 -c:v libvpx-vp9 -pix_fmt yuva420p`.

Stack, back to front: footage, a brand-colour layer for the swap, the giant word, the cut-out, then readable lines and captions in front. Start each cut-out on the exact frame its segment starts.

### 13. Prompt field (B, C, D)
- **Field:** rounded cream or white, with a tiny mono label above the text ("TO CLAUDE") and a circular send button on the right.
- **Typing:** one span per character, `tl.set` visibility at 15–20 characters per second. A `click.wav` every 2–3 characters at about −24 dB is optional.
- **Sent:** the label becomes "• SENT", the text drops to opacity 0.5, and the button icon becomes a spinner (rotation tween).
- **Exit:** scale 1 → 0.15 toward the top-left corner plus opacity 0 in 6 frames, with a whoosh.

### 14. Chat, comment and follow CTAs (B, D)
- **Chat bubble:** scale 0.9 → 1 plus opacity in 6 frames, back.out(1.6); the reply streams in word by word.
- **Comment CTA:** a header box ("Comment 'EDIT' and I'll send you the walkthrough"). The field types the keyword, the comment posts, the reply "Sending it over." appears, and the heart icon swaps to filled red.
- **Follow pill:** "Follow" (dark button) swaps to "✓ Following" (outlined) with scale 0.95 → 1.

Only simulate the user's own account.

### 15. Floating clusters and icon orbit (A, B, C)
- **Cluster:** 5–7 vertical cards (9:16, radius 16 px), rotated between −12° and +12° and fanned across the top third. They enter with y +60 px → 0 plus opacity, back.out(1.4), staggered 2 frames, then drift y ±10 px over 3 s (sine.inOut, yoyo).
- **Orbit (R3):** icons start off-frame and fly to ring positions in 27 frames, back.out(1.3), staggered 2 frames. The ring container then rotates slowly (about 20° per second) while each icon counter-rotates to stay upright.

### 16. Blur-background prompt modal (C)
Render the blurred plate with ffmpeg for the modal's time range:
`ffmpeg -ss <start> -to <end> -i work/rough.mp4 -vf "gblur=sigma=20" -an work/blur_<start>.mp4`
In the composition, hard-cut to the plate in sync with the voice. The card enters with y −30 px → 0 plus opacity in 3 frames, power2.out. Hold 3.3–5 s, then hard-cut back.

### 17. Before/after slider (B)
Stack two graded versions with the "before" on top. Anchor the top layer's container on the left and tween its width 100% → 0 in 15 frames, power2.inOut. A 3 px white line with a 28 px round handle rides the edge, and a tiny "BEFORE" label sits on the top layer. For R5's diagonal, rotate and oversize the container and line by about 12°.

### 18. Grade change (B)
Render a graded copy of the segment with ffmpeg (filter strings in look.md) and crossfade it in with opacity over 15 frames. Don't try to grade in the browser.

### 19. Magazine cover (B)
- **Frame:** four 3 px cream frame lines draw on in 8 frames (scaleX/scaleY from the corners).
- **Masthead:** Instrument Serif, about 300 px tall, sitting behind the subject (recipe 12).
- **Cover text:** an issue line in tiny tracked mono caps, a cover line top-left, and a barcode bottom-left (a generated SVG of bars).

### 20. Stamps (B)
Scale 1.3 → 1, rotation −8° → −6° and opacity 0 → 1 in 3 frames, power3.out. Hold. Put a pop or thud on the landing frame.

### 21. Droste zoom-out (B)
Nest the frame inside itself 2–3 levels deep (each level at scale 0.42, centred, with a thin white border). Animate the parent from scale 2.4 → 1 over 1 s, power2.inOut, so the viewer zooms out through the levels.

### 22. Dot-matrix processing and zoom to full screen (D)
Render the "processing" clip from the next result with ffmpeg (tested):
```
ffmpeg -ss <start> -t 0.5 -i result.mp4 -vf "scale=72:-2,eq=contrast=1.5:brightness=0.08:gamma=1.4,scale=1080:-2:flags=neighbor,format=gray,geq=lum='if(lt(hypot(mod(X\,15)-7\,mod(Y\,15)-7)\,5.5)\,p(X\,Y)\,0)',format=rgb24,colorchannelmixer=rr=1:rg=0:rb=0:gr=0.5:gg=0:gb=0:br=0.28:bg=0:bb=0" -an work/dots.mp4
```
Play it in the preview card for about 0.4 s, then the real result. To zoom to full screen, tween the preview card to x 0, y 0, 1080 × 1920 (or the equivalent scale) in 6 frames, power3.out, with the radius going to 0.

### 23. Exits (all)
- **Squash:** scaleY 1 → 0 in 2 frames, power2.in, around the centre.
- **Blur-out:** blur-in in reverse, in 4 frames.
- **Whip:** the outgoing shot moves x ±200 px and fades in 3 frames, the incoming shot enters from the other side in 3 frames, and a whoosh is centred on the cut.

### 24. Icons and sparkle (A, B)
- **Outline icons** (bulb, hourglass) pop: scale 0.6 → 1 plus opacity in 4–6 frames, back.out(1.6). A true stroke-draw needs stroke-dashoffset, so use it only if a snapshot shows it renders.
- **Hourglass flip:** rotation 0 → 180° in 6 frames.
- **Sparkle:** a 4-point star scales 0 → 1.2 → 1 and rotates 0 → 45° over 8 frames, with `sparkle.wav` at about −18 dB.
