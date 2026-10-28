# Camera moves

## On footage (ffmpeg, before compositing)

- **Punch-ins:** build the rough at 2× (`studio cut ... --width 2160`), then `reframe.mjs` with a framing schedule:
  wide 1.0×, medium 1.2×, tight 1.35–1.5×. Punch-ins are cuts on jump-cut seams, not animated zooms.
- **Framing (9:16):** eyes on the upper third (eyes line about 0.35–0.45 of the height), chin above 0.72 so captions fit
  below it, headroom smaller as the shot gets tighter. Measure with `studio faces` before placing words.
- **Text behind the subject:** `studio matte` (RVM) gives the person's alpha; stack plate, giant word, cut-out, then
  readable text in front. Snap matte segments to jump cuts or the plate shows 1–3 frame slivers.
- **Stabilize** handheld B-roll: `ffmpeg -i in.mp4 -vf vidstabdetect=result=t.trf -f null -` then
  `ffmpeg -i in.mp4 -vf vidstabtransform=input=t.trf:smoothing=20,unsharp=5:5:0.6 out.mp4`.
- **Speed:** constant change with `data-playback-rate` in HyperFrames (0.1–10, pitch kept); ramps with a `rate` lane in
  `data-automation`. Smooth slow motion needs higher-fps footage; frame-blended slow motion looks cheap.

## Virtual camera (HyperFrames)

Tween `scale` and `x`/`y` on a wrapper inside the clip, never on the timed media element; chain states on one timeline.

| Move | Build | Timing |
|---|---|---|
| Push in | wrapper scale 1 → 1.08–1.15 toward the subject | 0.6–1.2 s `power2.inOut`, or 3–5%/s linear on stills |
| Pull back reveal | scale 1.3 → 1 showing context | 0.8–1.2 s `power2.out` |
| Pan between stations | x/y between framed points, hold at each | 0.5–0.8 s per move `power2.inOut` |
| Dolly zoom | scale the subject layer up while the background scales down | 1–2 s, tension moments only |
| Rack focus | blur 0 → 8 px on one plane, 8 → 0 on the other | 0.3–0.5 s |
| Orbit | slow rotation of a 3D stage | 3–5° per second, linear |

Registry: `push-in`, `pull-back-reveal`, `camera-dolly-zoom`, `focus-rack`, `pan-stations`, `drift-hold`,
`camera-rig-depth-stack`, `parallax-zoom`, `parallax-unzoom`, `yt-camera-move`, `ui-focus-zoom`, `cursor-zoom-follow`.
`camera-shake` is off-style for the house look.

## Parallax

Background 0.6×, subject 1×, foreground 1.3× of the same move. On a talking head: plate (background), cut-out
(subject), cards (foreground). On stills: split into layers with the matte or a hand mask.

## 3D

CSS 3D: `perspective` 900–1400 px on the stage, tilt text at most 15° and keep it readable. Three.js blocks
(`extruded-logo`, `product-turntable`, `glass-hero`, `three-orbiting-cards`): field of view 35–45°, slow orbits,
one key light plus a soft fill. Check every 3D shot with `snapshot --angle iso` or a contact sheet before render.
