# Export

`studio export <master> --platform <p>` encodes and checks; `--check` only checks. Specs live in
`tools/studio/presets/platforms.json` with the date checked and sources. Re-check limits marked unverified before
relying on them.

## Master (every delivery)

H.264 High, yuv420p, constant frame rate at the source rate (30 for the house formats), CRF 16, AAC-LC 48 kHz stereo,
MP4 with faststart, BT.709 tags, −14 LUFS integrated, ≤ −1 dBTP. Name: `EXPORTS/<name>-v001.mp4`; a change is `-v002`.

## Platforms (checked 2026-10-28)

| Platform | Frame | Video | Audio | Length | Verified |
|---|---|---|---|---|---|
| Instagram Reels | 1080×1920 9:16 | CRF 17, max 20 Mb/s, GOP 2 s | AAC 320k | accepted to 20 min; over 3 min not recommended to non-followers | third-party |
| TikTok | 1080×1920 | CRF 17, max 20 Mb/s | AAC 320k | 10 min in-app, up to 60 min uploaded | third-party |
| YouTube Shorts | 1080×1920 | CRF 17, max 16 Mb/s, closed GOP of half the frame rate, 2 B-frames | AAC 384k | up to 3 min | encoding verified (YouTube help); length third-party |
| YouTube | 1920×1080 (or 2160p) | CRF 17, max 16 Mb/s; recommended 8 Mb/s 1080p30, 12 Mb/s 1080p60, 35–45 Mb/s 4K30 | AAC-LC 384k 48 kHz | — | verified (YouTube help) |
| LinkedIn | 1:2.4 to 2.4:1, 256×144 to 4096×2304 | CRF 18, max 12 Mb/s | AAC 192k | 3 s–15 min (10 min mobile), 5 GB | third-party |
| X | long edge ≤ 1920 | CRF 20, max 8 Mb/s | AAC 192k | 2:20 for most accounts, 512 MB | unverified |

Aspect mismatches are refused: reframe the edit (a creative decision) or pass `--fit pad|crop` knowingly.

## Extras

- Captions sidecar: `npx hyperframes transcribe <final.mp4> --to srt -o EXPORTS/<name>-v001.srt` (correct names first).
- Cover frame: `ffmpeg -ss <hook t> -i <final> -frames:v 1 -q:v 2 EXPORTS/<name>-v001-cover.jpg`; keep its key text in
  the centre 4:5 area so profile-grid crops keep it.
- Transparent overlays for another editor: `npx hyperframes render --format mov` (ProRes 4444) or `--format png-sequence`.
- Archive: keep the master, `project.json`, compositions and plans; `studio clean` lists the rest.
