# Sound design and mixing

House edits use the house palette, timing and music rules (`my-editing-style/references/sound.md`). This file covers
the studio library, layering, levels and the mix chain for every style.

## The library

- `studio sfx find <words> [--cat whoosh] [--max 1.5]` searches `LIBRARY/sfx/index.json` (Sonniss GDC 2026 curated,
  Kenney CC0 UI packs, media-use's Pixabay sounds, the synth kit). Each entry has `hit` (seconds to its loudest point).
- Categories: whoosh, impact, drop, riser, pop, click, ui, typing, paper, magic, glitch, cartoon, cash, alarm, foley,
  texture, voice, creature. `studio sfx cats` shows counts.
- A `cat:<category>` cue picks deterministically per cue, never the same take twice in a row, and only sounds short
  enough for the job (pop ≤ 0.7 s, click ≤ 0.4, ui ≤ 1.2, whoosh ≤ 1.6, impact ≤ 3, drop ≤ 5, riser ≤ 6). For a hero
  moment, choose the exact sound with `studio sfx find` and cue it by id.
- New libraries: unzip into `SFX/<name>/` (or `studio sfx import <zips> --to SFX/<name>`), then `studio sfx index`.
- Licences sit in each index entry. Sonniss: commercial use, no attribution, never for AI training, never redistribute
  raw files (deliver them only mixed). Kenney: CC0. Pixabay: free commercial use.

## Timing by hit

Write cues by the moment the sound must land; `studio mix` aligns each file's loudest point to it.

| Event | Sound | Hit |
|---|---|---|
| Scene cut | low whoosh | 2–4 frames before the cut |
| Card wipe, whip | air whoosh | 3 frames after the wipe starts |
| Reveal word or stat | sub drop | first frame of the word |
| Graphic entrance | pop or ui | first visible frame |
| Count-up steps | click or tick | each step, quiet (−24 dB) |
| Typing | typing or clicks | every 2–3 characters |
| Into a reveal | riser | its peak on the reveal |
| Pivot line | record scratch (licensed only) | first word, once per video at most |

## Layering a hero moment

Body (whoosh) + weight (sub drop or impact on the cut frame) + air (shimmer or reverse tail after). Offset the parts:
the swell peaks before the cut, the weight on it, the tail after. One hero layer stack per 10–15 s at most.

## Levels and ducking (what `studio mix` does)

- Category levels are peaks relative to a voice peaking near −3 dBFS: drop −9, impact −11, whoosh −14, riser and pop −18,
  ui and paper −20, magic −21, click −23, typing −24 dBFS. A cue's `gain` adjusts by dB.
- The effects bus ducks under speech (sidechain: threshold 0.03, ratio 3.5, attack 6 ms, release 240 ms).
- Music sits at least 18 dB under the voice (`--music-db -20`) and ducks harder (ratio 6, release 450 ms).
- `--vary` gives repeats a deterministic ±0.5 semitone and ±1 dB so they don't sound looped.
- Final: two-pass loudness to −14 LUFS integrated, −1.5 dBTP, linear gain (peaks limited first only when needed).

## Voice

`studio voice-clean <voice> --strength light|medium|strong`: DeepFilterNet (delay-compensated, realigned to the
sample), high-pass 80 Hz, de-mud −1.5 dB at 280 Hz, presence +1.5 dB at 4.8 kHz, de-esser, gentle compressor,
latency-compensated limiter. Targets: noise floor at or below −45 dBFS, speech-to-floor at least 30 dB. Use `light`
when the room tone is part of the feel; `strong` only for bad rooms (listen for warble).

## Music

Only tracks the user holds a licence for. Get the tempo and beat grid with
`npx hyperframes audio <track> --only bpm,beats --quality local`; frames per beat = fps × 60 / BPM, computed per beat
index (never accumulate a rounded beat). Cut on beats, change layouts on bars, drop the music out 0.15–0.22 s before
a phrase lands. `--quality best` uploads to HeyGen and may bill: ask first.

## Check

`npx hyperframes audio <mix>` lists where hits land; compare with cues. `studio qc` checks loudness and peaks.
