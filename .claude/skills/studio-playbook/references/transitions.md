# Transitions

Every transition has a cause on screen. Use 3–5 kinds per video; hard cuts inside a scene, at most a third of the
seams between beats are plain cuts, and two different worlds never crossfade. House edits ban flash, shake, glitch and
light-leak transitions unless a chosen Brand Nat code calls for them.

## Which one

| Situation | Transition | Length | Sound |
|---|---|---|---|
| Same scene, new framing (jump cut) | hard cut with a punch-in | 0 | none |
| New topic, same speaker | whip (horizontal smear) or match cut on a shape or word | 4–9 frames | air whoosh, peak 2–4 frames before the cut |
| Into a detail (button, number, app) | zoom through the object | build 0.6 s, through 0.35 s, `power3.in` | low whoosh or riser into the cut |
| Into an app or UI | object becomes the world (card grows past the frame) | 0.65 s `power2.inOut` | soft whoosh + pop as the UI builds |
| Before / after | slider wipe or card state wipe | 15 frames `power2.inOut` (slider), 4–10 (wipe) | whoosh 3 frames after the wipe starts |
| Section break | colour flood behind a held object | 0.4 s `power2.inOut` | sub drop on the flood |
| Same stage, new content | blur swap (out 8 px blur 0.13–0.2 s, in 0.13 s) | 0.3 s | none or a pop |
| A cut that must read as meant | dip cut: darken 40% for 3 frames, then cut | 3 frames | none |
| Music montage | cut on the beat; freeze on the downbeat (`beat-freeze-cut`) | per beat grid | the music does it |

## Building them

- Cut at the fastest frame of a move, same direction and speed on both sides; mirror eases across the seam
  (`power3.in` out, `power3.out` in).
- Registry families: `transitions-push`, `-scale`, `-blur`, `-cover`, `-radial`, `-grid`, `-3d`, `-light`, `-mechanical`,
  `-distortion`, `-destruction`, `-dissolve`; components `whip-pan-cut`, `zoom-through-transition`, `match-cut`,
  `text-match-cut`, `type-match-cut`, `iris-reveal`, `directional-wipe`, `curtain-reveal`.
- Shader transitions (`cinematic-zoom`, `whip-pan`, `cross-warp-morph`, `domain-warp-dissolve`, `sdf-iris`,
  `ripple-waves`, `swirl-vortex`, `gravitational-lens`): render with `--page-side-compositing` (about 6x faster).
  Off-style for the house look: `glitch`, `light-leak`, `flash-through-white`, `chromatic-radial-split`.
- Find more: `studio catalog --tag transition`.

## Sound pairing

| Transition | Sound (studio sfx category) | Hit |
|---|---|---|
| Whip / push | `whoosh` (air) | 2–4 frames before the cut |
| Zoom through | `whoosh` (low) or `riser` | riser peak on the cut |
| Card wipe | `whoosh` (air, short) | 3 frames after the wipe starts |
| Colour flood / reveal | `drop` (sub) | first frame of the reveal |
| Pop-in UI | `pop` or `ui` | first visible frame |
| Match cut | none, or a `click` on the rebound | the cut |
