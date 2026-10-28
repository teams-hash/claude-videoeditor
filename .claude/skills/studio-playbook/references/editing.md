# Editing and pacing

## Cutting

- **Cut points.** Cut at the end of a thought, never mid-word. Picture cuts land on a motion peak or a beat; audio
  joins get 10 ms fades (`studio cut` does this). Cut inside a breath, not after it.
- **Keep one breath before a punchline:** about 5 frames (house `"punch"` in cuts.json). Every other pause > 0.15 s
  shrinks to 2–3 frames (`tighten.mjs`).
- **J- and L-cuts:** let the next line's audio start 4–12 frames before its picture (J) to pull the viewer forward,
  or let audio run over the next picture (L) for reactions and B-roll. In HyperFrames, voice is its own `<audio>`.
- **Jump cuts on one camera:** every jump changes the framing (1.0× → 1.2× → 1.35–1.5×, `reframe.mjs`), or a graphic
  covers the seam. Two adjacent pieces at the same size read as a glitch.
- **Best take wins:** usually the last clean one. Splicing a cleaner ending from another take is fine. Verify by
  re-transcribing the rough: clipped or doubled words show up as text changes.

## Pace by format

| Format | Visible change every | Average shot | Notes |
|---|---|---|---|
| Vertical talking head (house A, B) | 1–2 s | 1.8–3 s | punch-ins, cards, type count as changes |
| Tutorial / screen steps (house C) | 3–5 s | 3–6 s | the viewer must read; hold copyable things 3–5 s |
| App demo to music (house D) | every 6 beats | 2–3 s | cut on the beat, change layout on the bar |
| Landscape explainer 16:9 | 4–8 s | 3–6 s | B-roll or graphic every 6–12 s; chapters every 60–90 s |
| Montage / sizzle | 0.13–0.8 s | 0.4 s | contrast with one held shot |

`studio qc` measures the longest stretch without a visible change (limit 6 s vertical, 12 s landscape).

## Rhythm

- Vary shot lengths (long, short, short, long); identical lengths feel mechanical.
- Contrast speeds: a fast run of cuts reads faster after a held shot.
- Hold 0.3–0.75 s before a payoff, then play the payoff at normal speed.
- Breathers: 2–4 s of plain talking between illustrated beats, about every 10–15 s.

## Retention structure (shorts)

| Time | Job |
|---|---|
| frame 0 | The hook is already on screen: claim, format or result. Audio starts within 0.3 s |
| 0–3 s | The promise: what the viewer gets if they stay |
| every 7–10 s | A re-hook: format change, number, reveal, punch-in, sound hit |
| 70–80% | The payoff |
| last 1–2 s | CTA, ideally a line that loops back into the first |

## B-roll and cutaways

- B-roll shows the noun or proves the claim of its line, starting on that word; 1.5–3 s per shot.
- Never cover the face on a punchline or an emotional line; covering filler or a re-take seam is ideal.
- Screen recordings: zoom to the action (`ui-focus-zoom`, `cursor-zoom-follow`), never show a full desktop at phone size.

## Amateur tells to remove

Same zoom on every cut · captions on every word in caps with no hierarchy · graphics later than 4 frames after
their word · music fighting the voice · dead air at the start · a different transition at every seam · every element
fading and sliding up · titles that keep moving after they land · text over the eyes or mouth · invented numbers.
