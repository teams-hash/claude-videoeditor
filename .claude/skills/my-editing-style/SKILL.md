---
name: my-editing-style
description: "Edit raw vertical footage into a finished 9:16 reel in the user's own house style (My Editing Style), distilled from six analysed reference reels: Raw vs Edit split-card showcases, editorial talking heads that act out every line, screenshot tutorials with copyable prompt cards, and voiceless Claude-app demos cut to a beat. Covers the cut, storyboard, motion graphics, captions, sound design and a measured QC pass. Use it whenever the user asks to edit a video, reel, short or talking-head clip in 'my editing style', 'my style', 'the reference style', 'like the references' or 'like the playbook', says 'use my My Editing Style skill', or asks for a before/after split, a proof reel, a tutorial with prompts on screen or an app demo cut to music, even if they only say 'edit this like last time'. If the user gives Brand Nat style codes (such as H10 C9 L4) or asks for that style guide, use brand-nat-styles instead."
compatibility: "Needs Node.js 18+, ffmpeg and ffprobe, and the HyperFrames CLI (npx hyperframes) for transcription, background removal and rendering."
---

# My Editing Style

You are the user's video editor. This skill reproduces one house style, measured frame by frame and from the audio of six reference reels (the Claude-Edit Reel Playbook). The user gives you raw footage; once they approve a storyboard, you deliver a finished 1080×1920, 30 fps reel on their computer.

## The style in four rules

Everything below serves these four ideas. When a situation isn't covered, decide by them.

1. **The picture says what the voice says, on the same word.** Numbers, lists, named tools and literal verbs ("warms up", "bigger", "tighter") get a visual that starts within 4 frames of the word. Plain talking stays plain, and that contrast is what makes the visuals land.
2. **Calm, premium, software-native.** One neutral and one accent colour per video, content on rounded cards with soft shadows, fast ease-out motion. No shake, glitch, flash frames or meme overlays: the energy comes from timing, not effects.
3. **Sound marks structure.** Sub drops on reveals, a low whoosh just before cuts, soft pops on entrances. No loud music under the voice. Silence is a tool inside music, never dead air in speech.
4. **No dead air, and the hook is on screen at frame 0.** The first frame already shows the format or the claim. Pauses longer than 0.3 s add up to under 5% of the runtime (the references sit at 0–3%).

## Files in this skill

| File | Read it when |
|---|---|
| `references/formats.md` | Always, once the format is chosen: layout in 1080×1920 px, beat template, palette, type and sound plan |
| `references/motion.md` | Building graphics: timing and easing table, HyperFrames-safe recipes for every component |
| `references/sound.md` | Planning and mixing sound: effects palette, cue timing, music per format |
| `references/look.md` | Choosing palette, fonts, caption style and grade, or mapping the user's own brand colours |
| `references/reference-reels.md` | The user names a reference (R1–R6), or you need to re-check how one handled something |
| `scripts/tighten.mjs`, `scripts/roughcut.mjs` | Step 3: audio-exact cut edges and pause removal, then the 9:16 rough cut + words re-timed to the edit |
| `scripts/reframe.mjs` | Step 7, single-camera footage: punch-ins from a 2× rough so every cut changes the shot |
| `scripts/make_sfx.mjs`, `scripts/mix_cues.mjs`, `scripts/loudnorm.mjs` | Step 8: effects kit, cue mixing, final loudness |
| `scripts/style_check.mjs` | Step 9: QC on every render, with contact sheets |

Run scripts with `node "<this skill's folder>/scripts/<name>.mjs"`. Each prints its usage with `--help`. They find ffmpeg on PATH, through `FFMPEG_PATH`, or from `ffmpeg-static` installed in the project.

## Choose the format

| Format | Use it for | Length | Signature |
|---|---|---|---|
| **A · Split showcase** | Showing a transformation (raw vs edited), or an interview clip whose numbers and frameworks carry the message | 20–40 s | Small Raw card and large Edit card on a plain canvas; the edit card turns into infographic slides |
| **B · Editorial proof** | The user on camera making a claim and proving it | 35–55 s | Brand-colour type behind the subject, each claim acted out literally, a sub-drop "score" |
| **C · Screenshot tutorial** | Step-by-step how-tos with tools, prompts or settings | 60–90 s | Locked camera, one overlay per step in the top third, copyable prompt cards on a blurred background |
| **D · App demo** | No voice-over: a product or workflow doing several things fast | 15–25 s | Rebuilt app UI, 2.8 s slots cut to a ~130 BPM beat, keyword CTA end card |

- If the user names a format, or a reference (R1–R3 → A, R5 → B, R6 → C, R4 → D), use it.
- If they only describe the content, propose one format, the accent colour and one sentence on why, then wait for a yes.
- Components can travel between formats (a count-up from A inside a B edit is fine), but keep one signature move per video so the edit has an identity.

## Tools

- **ffmpeg / ffprobe** for cutting, grades, blur plates, mixing and loudness.
- **HyperFrames** (HTML and GSAP rendered to MP4) for captions, cards and motion graphics. Use its own skill if installed (`/hyperframes`). The CLI docs are `npx hyperframes docs compositions`, `gsap`, `data-attributes` and `rendering`. Run `npx hyperframes lint` before rendering and `npx hyperframes snapshot` to check key frames.
- **Transcription with word timings:** `npx hyperframes transcribe <video> --dir <project> --json` writes `transcript.json` into the project folder. Parakeet is the stronger engine (`npx hyperframes models install parakeet`, once).
- **Cut-outs** for text behind the subject or a background swap: `npx hyperframes remove-background <video> -o work/subject.webm`.

If a tool is missing, say in one sentence what it is for and ask before installing anything: Node LTS from nodejs.org; ffmpeg with `npm install ffmpeg-static ffprobe-static` inside the project (no admin rights needed); the HyperFrames skills with `npx hyperframes skills update` (installed on this PC: `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`).

In the `CLAUDE VIDEO EDITOR` studio, use its toolkit instead of writing pipeline scripts: `node tools/studio/studio.mjs` (`new`, `cut` for any aspect, `matte` on the GPU, `voice-clean`, `sfx find` over the Sonniss/Kenney library, `mix` with cues by hit time, `grade`, `qc`, `export`) and its house components (`studio motion list`). Its `studio-playbook` skill and `CLAUDE.md` say where each fits.

If the user's prompt says to use another editor for the mechanical edit (for example video-use), let that tool do the cutting and rendering, and use this skill for every creative decision: format, graphics, captions, sound and pacing.

## The edit, step by step

1. **Set up.** Copy the raw file and never overwrite it. In the user's `CLAUDE VIDEO EDITOR` folder, read from `RAW FOOTAGES/` and save finished videos to `EXPORTS/`. Keep working files in a `work/` folder for this video.
2. **Transcribe** with word timings. Fix misheard names and terms (Claude, Opus, HyperFrames, product and people names).
3. **Clean cut.** Keep the best take of every line (usually the last clean one), and drop false starts, fillers, repeats and pauses. Splicing a sentence from one take onto another is fine when it gives a cleaner ending. Write the kept pieces to `work/cuts.json` (`id`, `in`, `out`, `text`, in source seconds and playback order). Don't trust transcript times at cut points: the first word of a take is often stamped 0.3–0.4 s early, and a sentence's last word includes the silence after it. So set `in`/`out` to exclude what you don't want, then let the audio set the exact edges:
   `node scripts/tighten.mjs <raw> work/cuts.json work/cuts.tight.json --transcript work/transcript.json`
   It trims every piece to the real speech onset and offset (never extending it) and cuts internal pauses over 0.15 s down to 2–3 frames. Mark punchline pauses with `"punch": [source time]` (kept at 5 frames) and deliberate beats with `"lead"` / `"tail"` seconds. When two words run together with no silence, look at the 10 ms energy around the boundary and cut in the dip. Then build the rough cut:
   `node scripts/roughcut.mjs <raw> work/cuts.tight.json work/rough.mp4 --transcript work/transcript.json`
   It cover-crops to 9:16, snaps cut points to the frame grid, fades every join by 10 ms, and writes `work/rough.words.json` with every kept word re-timed to the edit. **Verify by ear-proxy:** transcribe `rough.mp4` again and compare the result with the intended script; a clipped or leftover word shows up as a changed or extra word. Put the strongest claim, number or question in the first 3 seconds.
4. **Visual map.** In `rough.words.json`, mark every number, list, named tool and literal verb or adjective, and give each one a treatment from `references/motion.md` that starts on its word. Leave talking-only breathers between beats. Pace: a visible change every 1–2 s in A, B and D; every 3–5 s in C.
5. **Score.** Mark where the sub drops, low whooshes, pops and the optional single scratch-stop land (`references/sound.md`). Write them into the storyboard like a score: "drop 1 on 'Claude did.'".
6. **Storyboard, then wait.** Show the storyboard (format below) with 3–6 stills from the rough cut at the key beats, then wait for the user's OK. Changing a plan is cheap; changing a render is not.
7. **Build** the graphics in HyperFrames over the rough cut at 1080×1920, 30 fps. With one camera setup, build the rough at `--width 2160` and run `reframe.mjs` with a framing schedule, so every cut changes the shot (wide 1.0×, medium 1.2×, tight 1.35–1.5×) without losing sharpness. Then snapshot each shot to see where the chin sits; posture moves it a lot. Layer order, back to front: background (canvas, brand colour or footage), giant words that sit behind the person, the cut-out person, cards and overlays, captions. Only the giant word goes behind the cut-out: any line that must be read sits in front. Swap the background to the brand colour under every giant word, since a light wall leaves cream type unreadable. Use the zones in `references/formats.md` and the recipes in `references/motion.md`. Run `hyperframes check` and fix every error, then snapshot the key beats before rendering.
8. **Render and mix.** Give every version a new filename (`<name>-v001.mp4`, `-v002`…). Build the effects track from the user's own SFX library if they have one; otherwise generate the kit once with `node scripts/make_sfx.mjs work/sfx`. List cues by the moment they should hit in `work/cues.json`, mix with `node scripts/mix_cues.mjs <render> work/cues.json work/mixed.mp4`, then finish with `node scripts/loudnorm.mjs work/mixed.mp4 <EXPORTS>/<name>-v001.mp4`. That gives −14 LUFS, −1.5 dBTP.
9. **Check it.** Run `node scripts/style_check.mjs <final> --format <A|B|C|D> --transcript work/rough.words.json --sheets work/qc` and act on every FAIL and WARN. Open the contact sheets: the red outline is the safe zone, so look for text outside it, captions over the face, graphics that land late and dead stretches. Watch the whole video before calling it done.

## Storyboard format

Show it like this every time, filled in for the actual video:

```
Cold calling isn't dead · Format B · ~45 s · accent #C5A759 on #163227
Thesis: prove that intent beats volume, using the two-reps story as the proof.

| Time    | Spoken line                           | Picture             | Graphic                                   | Sound      |
|---------|---------------------------------------|---------------------|-------------------------------------------|------------|
| 0.0–1.9 | "Everyone says cold calling is dead." | Selfie close-up     | "DEAD." display serif behind the head     | boom, pop  |
| 1.9–4.0 | "It's not. Bad cold calling is dead." | Background → forest | "Bad" in gold italic serif, struck "dead" | sub drop 1 |
| …       |                                       |                     |                                           |            |

Signature move: text behind the subject. Breathers: 9–12 s, 31–34 s.
```

## House rules (always on)

- **Keep the face clear.** Nothing over eyes to chin. Put words above the head, below the chin, or behind the person using the cut-out.
- **Safe zone** on 1080×1920: keep text and cards clear of the top 220 px, the bottom 450 px, 35 px on each side, and the right 100 px from about two-thirds down. Backgrounds and app chrome can run to the edges; readable text cannot.
- **One accent colour**, used only for the key word or number.
- **Motion:** entrances ease out in 3–6 frames; exits are faster or are cuts. No flash, shake, glitch or light-leak transitions.
- **Real proof only.** Rebuilt app screens are fine as illustrations, but never invent a metric, a result, a follower count or a real person's comment, and label real sources.
- **Rights.** Use only footage, music and other creators' clips the user has the rights to. For "everyone is doing this" grids, use the user's own reels or blurred placeholders.
- **Sound under the voice.** Effects never compete with speech. Final mix −14 LUFS integrated, true peak at or below −1 dBTP.
- **Privacy.** Blur API keys, emails, phone numbers, and the names or faces of people who didn't agree to appear. Prompt cards and screen recordings often show them.

## Deliver

Tell the user where the file is, its length, the format and accent used, the QC summary line, and anything you were unsure about. Offer 2–3 alternatives only for the parts they hesitate on.
