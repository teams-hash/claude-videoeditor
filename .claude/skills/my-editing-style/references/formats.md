# Formats

Positions are pixels on a 1080×1920 frame. The references were measured at 720×1280 and scaled ×1.5; where a reference broke the safe zone (top 220 px, bottom 450 px, sides 35 px), the numbers below are already moved inside it.

Contents: A · Split showcase · B · Editorial proof · C · Screenshot tutorial · D · App demo · Closest Brand Nat codes

---

## A · Split showcase (R1, R2, R3)

**Use it for** showing a transformation (raw vs edited), or an interview or podcast clip whose numbers, steps or framework carry the message. 20–40 s.

**Pace.** A visible change every 1–2 s and a card-state change every 2–4 s. No hard cuts are needed: punch-ins and card states do the cutting. The face is never away for more than about 3.5 s.

### Layout

| Element | Position | Spec |
|---|---|---|
| Canvas | full frame | #FFFFFF, or #E5E5E5 with a soft radial lift to #F7F7F7 |
| Raw card | x 87–443, y 675–1313 | Same clip, in sync, wide framing. May be desaturated (R3 shows an older edit in B&W as the "before") |
| Edit card | x 443–962, y 513–1431 | Radius 24 px, shadow `0 12px 40px rgba(0,0,0,.18)`, overlaps the raw card, reframed ≈ 1.6× tighter than the raw |
| Raw label | x 108, y 594–648 | "Raw Video", ink #020202, 30 px semibold |
| Edit label | x 524–875, y 426–492 | "Claude Edit" (or "Edited by …") in ink on an accent box |
| Captions | inside the edit card, centred near y 1250 | Style A in look.md |
| Graphics | upper 60% of the edit card | Numbers beside the head, icons and keywords at chest height |

**R3 variant:** a larger edit card at x 351–962, y 324–1377 (radius 36 px) with a small raw card behind it on the left (x 81–351, y 513–1134). Labels are dark pills (#25262B) with a red recording dot and light text. A small brand mark sits centred under the cards, kept above y 1470.

**R2 variant: the edit card as a slide** with fixed zones:
- **Header**, top 12%: "3 THINGS IN / THE FIRST 30 SECONDS" with the digit in the accent and a short accent underline.
- **One module**, 12–55%: thumbnail grid, list rows, scrubber or scatter plot.
- **Speaker window**, 55–98%: rounded, 1 px accent border, captions at its bottom edge.

Only the module changes.

### Edit-card states

The card cycles through three states:
- **Video + overlays.**
- **Dark info card #090A12.** Wipes up from the bottom in 7–10 frames.
- **White info card #F8F8FB.** Sideways wipe with a feathered edge, 4 frames.

Back to video is a hard cut. Captions keep their position in every state.

### Look

- **Palettes:** lime #CAFF45 with #090A12 and #F8F8FB on white (R1) · yellow #F5D133 on navy #121527 (R2) · ice blue #E2EBF7 → #B1D6FC, navy #0D192C → #1B3956, Claude orange #E27D55 (R3).
- **Type:** Inter Tight 700/800 for labels and numerals · Montserrat 800 caps for slide headers · Inter 300 paired with Instrument Serif Italic for emotional words.
- **Signature move (pick one):** decode or count-up numbers · a karaoke list that grows (3 → 4 → 5) · AI-styled b-roll metaphors cut in every 2–3 s.

### Beat template

| Time | Beat | Picture | Graphics | Sound |
|---|---|---|---|---|
| 0.0–1.0 | Format hook | Both cards on screen at frame 0; punch-in inside the edit card by 0.5 s | Labels + first caption | Boom or whoosh on frame 0; optional drumless pad ≥ 18 dB under the voice |
| 1.0–4.0 | First number or claim | Edit card close-up | Numerals or title built on the word | Pop |
| 4–12 | Concept | Video + overlay, alternating with a full-card info slide every 2–4 s | Icon, keyword highlight, micro timeline | Whoosh on each wipe |
| 12 to end −4 | Escalation | Dark and white info cards; speaker expands to the full card on connective lines | Count-up, decode, odometer, growing list | ~2 s sub drone under info cards; riser into a completion |
| Last 3–4 s | Payoff | The biggest number, or the full list | Accent fill, sparkle, old value struck through | Sub drop on the stat; hold 1–2 s; no outro card |

---

## B · Editorial proof (R5)

**Use it for** the user on camera making a claim and proving it; personal-brand pieces. 35–55 s.

**Pace.** A graphic event every 1–2 s, a new setup or angle every 5–8 s, and 3–4 sub drops in total.

**Shoot.** One branded space with warm practical lamps and 5–6 setups (selfie close-up, seated with mic, desk, standing wide, and a crouch or walk-in for the CTA). Each section of the script gets its own setup. **With a single locked shot** (a teleprompter take), re-frame instead: build a 2× rough and use `reframe.mjs` (wide 1.0×; medium 1.2× with `cy 0` when a giant word needs room above the head; 1.35× with `cy 0.55` to lift the head when cards need the chest band). Change the framing at every cut.

**Tested on real footage (cold-calling reel):**
- Cards under the chin collide whenever the speaker leans in. Flank the face instead: left card at x 35–355, right card at x 725–1045, y 960–1290. Push any full-width card below the lowest chin of its shot (often y ≥ 1100).
- Cream giant words need the forest background swap every time. Swapping the background on the word's first frame also makes a strong beat.
- The closing line needs about 2 s on screen. If the speech ends sooner, hold the last frame (ffmpeg `tpad=stop_mode=clone`) and pad the audio.

### Layout

| Element | Position | Spec |
|---|---|---|
| Giant display words | y 220–560, full width, behind the head | Condensed serif caps, cream; letters build 2 frames each |
| Prompt and UI cards | x 60–1020, y 270–410 | Cream rounded field, tiny mono label ("TO CLAUDE"), round send button in the dark brand colour |
| Captions | box centred, y 1320–1400 | Style B in look.md |
| Floating cards and grids | top third, y 220–700 | Tilted ±6–12° |
| Follow pill | y 1160–1250 | Avatar, handle, "Follow" → "✓ Following" |
| Comment CTA | header y 240–380, field y 430–515 | Black bold text on white boxes |

### Look

- **Palette roles:** dark brand colour (forest #163227, caption box #1C362A) · cream #EBECE2 · gold accent #C5A759.
- **Grade:** warm practicals, green-shifted shadows, soft contrast. The "moody" alternate is about one stop darker and cooler.
- **Type:** Instrument Serif caps (giant words, masthead) · Archivo Black caps (tag boxes "THAT'S / JUST / ONE / MORE") · Instrument Serif Italic for the soft word ("Claude", "nothing.") · IBM Plex Mono micro labels.

### Literal effects: use one when the line says it

| The line says | Show it |
|---|---|
| warms up, more aesthetic | Before/after slider revealing a warmer grade |
| float in | The user's own reels rise in as tilted cards |
| magazine, editorial | Magazine cover: frame lines, masthead behind the head, issue line, barcode |
| bad take, raw footage | "BAD TAKE" stamps, a time-lapse card marked "2.3×", a pill "1:16 of raw footage" |
| time saved | Split-flap counter rolling down (1:16 → 0:55) |
| what you're seeing now | Droste zoom-out: the video inside itself |
| moody, dark | Grade drops about one stop and cools |
| huge, bigger | Caption box scales about 2×; giant word behind the head |
| tighter, faster | A jump cut on that exact word |
| never, no | Giant word letter-build behind the head |
| instead of an app | App icons struck with a red marker line, then dropped out of frame |

### Beat template

| Time | Beat | Picture | Graphics | Sound |
|---|---|---|---|---|
| 0.0–0.3 | Claim | Selfie close-up | 1–2 words in giant display serif caps | Pop |
| 0.3–2.0 | Kinetic headline | Background swapped to the brand colour | Text behind the head, ticker words, running mono timecode | Pops |
| 2.0–3.0 | Reveal | Same | Italic serif reveal with a gold word | Sub drop on the stressed word |
| 3–8 | Rule out the alternatives, then "one sentence" | Room | Struck app icons; prompt field types → SENT | Pops |
| 8–27 | Literal demos, 2–4 s each | New setup every 5–8 s | Grade change, floating cards, magazine, stamps, counter, Droste | Sub drop on 2–3 of them |
| ≈ 28 | Pivot | Close-up | Captions only | Record scratch, then a riser |
| 28–43 | What makes the user different, plus proof | Mic shot, new setup | Storyboard document, chat revision card, giant word | Sub drop on the payoff word |
| 43 to end | CTA | Wide → walk-in → close-up | Lead-magnet card, comment simulation, follow pill | Pops |

**Sound.** No music bed. Sub drops on reveal words, one record-scratch stop on the pivot line (from a licensed library), a riser into the payoff, and soft pops on entrances.

---

## C · Screenshot tutorial (R6)

**Use it for** step-by-step how-tos: tools, settings, prompts, folder setups. 60–90 s.

**Pace.** A jump cut per step (average shot ≈ 6 s, none over about 15 s). One overlay per step, on screen for about 75% of the runtime, changing roughly every 5 s.

**Shoot.** Locked tripod, medium close-up with headroom so the face sits at 35–45% of the height, bright natural light. Voice only.

### Layout

| Element | Position | Spec |
|---|---|---|
| Overlays | y 220–600, width ≤ 900 px, centred | White cards, radius 24 px, soft shadow |
| Prompt modal | x 80–1000, y 380–1460 | Over a hard cut to a blurred copy of the shot (gblur sigma ≈ 20) |
| Captions | centred, y 1340–1400 | Style E in look.md |

### Overlay types

- A cluster of 5–7 tilted reel cards for the hook.
- A tile panel whose tiles land on the spoken nouns ("Prompt", "Skill", "Tool").
- Label cards, for example a pixel-font name card.
- Screen recordings at real speed with a visible cursor.
- A mono folder tree, and a two-column table ("REPO / WHAT IT DOES").
- A chat composer with the prompt typing live.
- PROMPT modals: an uppercase "PROMPT" header, a "Copy" button and a mono body, with placeholders highlighted #F8E389. Hold them 3.3–5 s so viewers can screenshot.
- A tip in a white text box, and a cascade of small prompt cards for revision examples.

### Beat template

| Time | Beat | Picture | Graphics | Sound |
|---|---|---|---|---|
| 0–6 | Social-proof hook | Locked medium close-up with headroom | Fanned cluster of relevant reels above the head | Dry voice |
| 6–11 | Promise | Punch-out jump cut | Three tiles land on three nouns | — |
| 11 to end −5 | Steps, 5–15 s each | Jump cut per step | One top-third overlay per step; prompts on a blurred background for 3–5 s | — |
| Last 5 s | CTA | Same | Caption keyword plus a pointing emoji | — |

**Sound.** Dry voice only. At most, soft pops at about −20 dB on overlay entrances.

---

## D · App demo (R4)

**Use it for** showing a product or workflow doing several things fast, with no voice-over. 15–25 s.

**Pace.** Six 2.8 s slots (6 beats at about 130 BPM), then a CTA build and an end card.

### UI

Rebuild the UI as an illustration; never present it as a real recording.

| Element | Spec |
|---|---|
| Background | #12100E, surfaces #161514 |
| Command pill | Top right, #3B2921 with Claude-orange text |
| Status line | "✳ Editing with /skill-name…" in grey under the pill |
| Composer and keyboard | Lower 55% while typing, with a key-pop magnifier on each key |
| Autocomplete | The skill name plus a one-line description of what it does |
| Preview card | x 54–734, y 422–1690. Dot-matrix "processing" for about 0.4 s, then the result |
| End card | "Comment 'keyword'" in white bold, with an orange #D57527 banner over an animated grid of results |

### Slot anatomy

```
frames  0–15  type "/skill" with key-pop magnifiers and the autocomplete popup
frames 15–21  send: orange pill top right, "✳ Editing with <skill>…"
frames 21–33  preview card shows the dot-matrix render of the next clip
frames 33–48  preview card (≈ 65% width) plays the finished edit
frames 48–54  card zooms to full screen
frames 54–84  finished edit plays full screen, then a hard cut on the beat
```

**Sound.** A half-time trap or lo-fi hip-hop instrumental around 130 BPM. Cut every 6 beats. Drop the music to full silence for 0.15–0.22 s before each 2-bar phrase re-enters.

---

## Closest Brand Nat codes

| Format | Nearest codes in brand-nat-styles |
|---|---|
| A | L9 Before/After · P3 Giant count-up · V11 Progress header · C4 Small + BIG keyword |
| B | H10 Two-weight title · H9 Crossed-out logo · X16 Cover story · X17 Glass type · B1 Chat question + reply · V19 Live profile CTA |
| C | L6 Headroom whiteboard · M5 Two-framing jump cuts · P7 Cursor proof · V8 Quote card |
| D | B1 Chat question + reply · V17 Gradient comment CTA · M3 Fast visuals |

These matches are approximate. When the user mixes codes into this style, keep this skill's format, palette and sound rules, and borrow only the component.
