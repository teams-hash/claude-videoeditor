// Frame grabs, labels, safe-zone and box overlays, and tiled contact sheets (ffmpeg only).
import fs from 'node:fs';
import path from 'node:path';
import { run, probe, tmpDir, assertWritable, LABEL_FONT, LABEL_FONT_DIR } from './core.mjs';

// Unsafe margins on a frame of w x h. vertical = the house TikTok/Reels zone (scaled from 1080x1920):
// top 220, bottom 450, 35 each side, right 100 from two-thirds down. title = 90% action / 80% title-safe outlines.
export function safeZoneFilter(w, h, kind) {
  if (!kind || kind === 'none') return '';
  if (kind === 'vertical') {
    const sx = w / 1080, sy = h / 1920;
    const r = (x, y, bw, bh) => `drawbox=x=${Math.round(x * sx)}:y=${Math.round(y * sy)}:w=${Math.round(bw * sx)}:h=${Math.round(bh * sy)}:color=red@0.30:t=fill`;
    return [r(0, 0, 1080, 220), r(0, 1470, 1080, 450), r(0, 220, 35, 1250), r(1045, 220, 35, 1250), r(980, 1280, 65, 190)].join(',');
  }
  const box = (f, t, c) => `drawbox=x=${Math.round(w * (1 - f) / 2)}:y=${Math.round(h * (1 - f) / 2)}:w=${Math.round(w * f)}:h=${Math.round(h * f)}:color=${c}:t=${t}`;
  return [box(0.9, Math.max(2, Math.round(w / 640)), 'yellow@0.75'), box(0.8, Math.max(3, Math.round(w / 420)), 'red@0.85')].join(',');
}
export const defaultSafe = (w, h) => (h > w ? 'vertical' : 'title');

// Normalized boxes [{x,y,w,h,label?}] drawn on a w x h frame.
export function boxesFilter(boxes, w, h) {
  return (boxes || []).filter(b => b && b.w > 0).map(b =>
    `drawbox=x=${Math.round(b.x * w)}:y=${Math.round(b.y * h)}:w=${Math.round(b.w * w)}:h=${Math.round(b.h * h)}:color=${b.color || 'lime'}@0.9:t=${Math.max(2, Math.round(w / 360))}`).join(',');
}

// Text burned onto a tile. Labels are restricted to safe characters so no ffmpeg escaping is needed.
export function labelFilter(text, tileW, o = {}) {
  const t = String(text).replace(/:/g, '.').replace(/[^A-Za-z0-9 .,_+#()\/%-]/g, '').replace(/%/g, ' pct');
  const fs = o.size || Math.max(12, Math.round(tileW / 14));
  return `drawtext=fontfile='${LABEL_FONT}':expansion=none:text='${t}':x=${o.x ?? 6}:y=${o.y ?? 6}:fontsize=${fs}:fontcolor=${o.color || 'yellow'}:box=1:boxcolor=black@0.65:boxborderw=${Math.round(fs / 3)}`;
}

// Tile frames at the given times into one image. o: { safe, cols, tile, labels, boxesAt(t) -> boxes, info }
export function contactSheet(video, times, out, o = {}) {
  assertWritable(out);
  const info = o.info || probe(video);
  if (!info.video) throw new Error(`no video stream: ${video}`);
  const W = info.video.displayWidth, H = info.video.displayHeight, fps = info.video.fps || 30;
  const tileW = o.tile || (H > W ? 270 : 400);
  const last = Math.max(0, info.duration - 1.5 / fps);
  const dir = tmpDir('sheet');
  const safe = o.safe === undefined ? defaultSafe(W, H) : o.safe;
  times.forEach((t0, i) => {
    const t = Math.min(Math.max(0, t0), last);
    const vf = [o.pre, safeZoneFilter(W, H, safe), o.boxesAt ? boxesFilter(o.boxesAt(t0), W, H) : '', `scale=${tileW}:-2`,
      labelFilter(o.labels?.[i] ?? `${t0.toFixed(2)}s`, tileW)].filter(Boolean).join(',');
    run('ffmpeg', ['-v', 'error', '-y', '-ss', t.toFixed(3), '-i', path.resolve(video), '-frames:v', '1', '-vf', vf,
      path.join(dir, `f${String(i).padStart(3, '0')}.png`)], { cwd: LABEL_FONT_DIR });
  });
  const cols = Math.max(1, Math.min(o.cols || (H > W ? 6 : 4), times.length));
  const rows = Math.ceil(times.length / cols);
  run('ffmpeg', ['-v', 'error', '-y', '-framerate', '1', '-i', path.join(dir, 'f%03d.png'),
    '-vf', `tile=${cols}x${rows}:padding=6:margin=6:color=0x111111`, '-frames:v', '1', '-q:v', '3', path.resolve(out)]);
  fs.rmSync(dir, { recursive: true, force: true });
  return { out, cols, rows, count: times.length };
}

// n times spread evenly inside [from, to], centred in each slot.
export const spread = (from, to, n) => Array.from({ length: n }, (_, i) => from + (to - from) * (i + 0.5) / n);
