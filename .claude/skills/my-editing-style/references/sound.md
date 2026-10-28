# Sound

Contents: Principles · Effects palette · Cue timing · Music per format · Mix · Sourcing

---

## Principles

The references use sound sparingly and on purpose. Effects mark structure: a reveal, a cut, an entrance.
- **No loud music under the voice.** Only the voiceless app demo is music-driven.
- **Silence works inside music only.** A full drop-out of 0.15–0.22 s before a phrase hits; never dead air in speech.
- **Effects never compete with speech.**
- **Plan the sound like a score.** R5's own on-screen storyboard reads "SCORE: drop 1 on 'Claude did.' … stop under the scratch 0:28.3 · drop 2 on 'storyboard'", and the audio matches it to the frame.

## Effects palette

The kit column refers to `make_sfx.mjs` output. A licensed library sound in the closest-equivalent category is usually richer, so use the user's library first if they have one. Gains are relative to a voice peaking near −3 dBFS. They are the defaults in `sfx-kit.json` and starting points, not rules.

| Category | Kit file (peak at) | Closest library equivalent | Where it goes | Gain |
|---|---|---|---|---|
| Sub drop | `sub_drop.wav` (0.01 s) | 808 / cinematic sub drop, 40–80 Hz, ~2 s decay | First frame of the stressed reveal word or stat | −6 dB |
| Boom | `boom.wav` (0.01 s) | Low impact with a long tail | Frame 0 of the reel | −8 dB |
| Low whoosh-boom | `low_whoosh.wav` (0.30 s) | "Swoosh boom" transition, energy under 1 kHz | Every scene cut; the swell peaks 2–4 frames before the cut | −10 dB |
| Air whoosh | `whoosh.wav` (0.23 s) | Stereo noise sweep / swish | Card wipes, speaker-window expansions, whip cuts | −12 dB |
| Pop | `pop.wav` (0.00 s) | Soft bubble pop, UI tap | First visible frame of each card, icon, tile or word box | −15 dB |
| Click | `click.wav` (0.00 s) | Mouse or keyboard click | Send buttons, taps, typing (every 2–3 characters) | −20 dB |
| Tick | `tick.wav` (0.00 s) | Digital tick | Count-up and odometer steps | −20 dB |
| Riser | `riser.wav` (1.18 s) | Tonal sweep or noise riser | Into a reveal or list completion (its peak is the end) | −15 dB |
| Sparkle | `sparkle.wav` (0.04 s) | Glass glint / shimmer chime | Premium reveals: widgets, final numbers, sparkle icons | −18 dB |
| Record scratch | not synthesised | Vinyl scratch stop | Once per reel at most, on the pivot line | −8 dB |
| Texture | not synthesised | Nature ambience, digital data texture | Under AI b-roll scenes only (R3) | −20 dB |

## Cue timing

Write `work/cues.json` by **hit time**, the moment the sound should land on the edit timeline. `mix_cues.mjs` subtracts each kit file's peak offset for you.

```json
[
  {"file": "sfx/boom.wav",       "hit": 0.0},
  {"file": "sfx/sub_drop.wav",   "hit": 2.00, "note": "first frame of 'Claude did.'"},
  {"file": "sfx/low_whoosh.wav", "hit": 4.17, "note": "picture cut at 4.27, lands 3 frames early"},
  {"file": "sfx/pop.wav",        "hit": 7.66, "note": "prompt card appears"},
  {"file": "sfx/riser.wav",      "hit": 32.0, "note": "into 'storyboard'"}
]
```

- **Scene cuts:** low whoosh hit = cut time − 0.07 to 0.13 s (2–4 frames). R3 does this on all eight of its cuts.
- **Wipes:** whoosh hit = wipe start + 3 frames.
- **Reveals:** sub drop hit = the first frame of the stressed word (from `rough.words.json`).
- **Entrances:** pop hit = the first frame the graphic is visible.
- **Risers:** hit = the reveal itself.
- **Scratch-stop:** on the first word of the pivot line ("but my way is a little different").

## Music per format

| Format | Measured in the reference | Do this |
|---|---|---|
| A · Split showcase | R1: a drumless ambient pad ≈ 19 dB under the voice. R2 and R3: no bed | Either no bed, or a minimal tech underscore with no drums or vocals, at least 18 dB under the voice |
| B · Editorial proof | No bed. The score is sub drops, one scratch-stop and one riser | No bed; plan drop 1, the stop and drop 2 on the storyboard |
| C · Screenshot tutorial | Dry mono voice only | Voice only; optional soft pops on overlay entrances at about −20 dB |
| D · App demo | Half-time trap / lo-fi hip-hop ≈ 130 BPM: 808 sub, triplet hi-hats, one clap per bar, full drop-outs of 0.15–0.22 s before each 2-bar phrase | A similar licensed track (search "chill trap 130 bpm", "lofi trap instrumental"). Cut every 6 beats and cut the music before each phrase re-entry |

## Mix

- **Voice:** dry, with no reverb. If it needs cleaning (tested on ffmpeg 9):
  `ffmpeg -i in.mp4 -vn -af "highpass=f=80,deesser,acompressor=threshold=-18dB:ratio=3:attack=10:release=150" voice.wav`
- **Bed level:** at least 18 dB under the voice. Measure both with `style_check.mjs` or `npx hyperframes audio`, then set the bed's `volume=` accordingly.
- **Check timing:** `npx hyperframes audio work/mixed.mp4` lists where onsets and hits land; compare them with the cue list.
- **Finish:** `node scripts/loudnorm.mjs work/mixed.mp4 final.mp4` (two-pass, linear gain, peaks limited only when needed) → −14 LUFS integrated, −1.5 dBTP. A one-pass loudnorm landed 2.4 LU short on a 47 s test reel, so use the script.

## Sourcing

The skill ships no recorded sounds. `make_sfx.mjs` synthesises a clean, royalty-free basic kit. A record scratch, ambiences and music must come from the user's own library or a licensed one. Ask where their library is before searching; never download sounds or music without asking.
