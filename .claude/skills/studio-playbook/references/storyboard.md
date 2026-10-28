# Storyboards

Changing a plan is cheap; changing a render is not. Show the storyboard with 3–6 stills and wait for a yes.

## Table (shown to the user)

```
<Title> · <Format or style codes> · ~<length> s · <size> · accent <hex> on <hex>
Thesis: <one sentence>

| Time    | Spoken line | Picture (shot, framing) | Graphic (component, params) | Sound (cue @ hit) |
|---------|-------------|-------------------------|-----------------------------|-------------------|
| 0.0–1.9 | "..."       | tight 1.35×             | headline-slam "DEAD."       | boom @0.00        |

Signature move: <one>. Breathers: <ranges>. Transitions: <kinds>.
```

Stills: `studio sheet work/rough.mp4 --at 0.4,6.2,14.8,... --faces` (faces boxed so text placement can be judged).

## storyboard.json (what the build reads)

```json
{
  "title": "Cold calling isn't dead", "style": "my-editing-style:B", "size": [1080, 1920], "fps": 30,
  "thesis": "Prove intent beats volume with the two-reps story.",
  "palette": { "ground": "#163227", "ink": "#F5F3EE", "accent": "#C5A759" },
  "fonts": ["Inter Tight", "Instrument Serif"],
  "beats": [
    {
      "id": "b01", "t0": 0.0, "t1": 1.9, "line": "Everyone says cold calling is dead.",
      "picture": { "framing": 1.35, "background": "brand" },
      "graphics": [ { "component": "headline-slam", "text": "DEAD.", "at": 0.73, "layer": "behind-subject" } ],
      "sound": [ { "sfx": "cat:impact", "hit": 0.0 }, { "sfx": "cat:pop", "hit": 0.73 } ],
      "transitionOut": "cut"
    }
  ]
}
```

- `at` and `hit` are edit-timeline seconds taken from `work/rough.words.json`, never by ear.
- `layer`: `background` | `behind-subject` | `front` | `captions`. Only giant words go behind the subject.
- One beat group per HyperFrames scene file (`hf/compositions/<id>.html`), so later edits touch one small file.

## cues.json (what `studio mix` reads)

Flatten every beat's `sound` list: `[{"sfx": "cat:whoosh", "hit": 4.17, "note": "cut at 4.27"}, ...]`.
`sfx` takes an index id (`sonniss/...`), `cat:<category>` or a file path; `gain` adjusts in dB.

## Shot list (for shoots the user plans)

| # | Line or moment | Framing | Movement | Notes (props, screen to capture) |
|---|---|---|---|---|

Capture screens at phone width (390–430 px CSS) for vertical edits; record 4K when punch-ins are planned.
