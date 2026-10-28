// Contact sheet: frames at chosen times, labelled, with the safe zone tinted and optional face/track boxes.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, probe, num, readJson, outDirFor, rel, py, tmpDir, BIN } from '../lib/core.mjs';
import { contactSheet, spread } from '../lib/frames.mjs';

export const summary = 'Contact sheet with timestamps, safe zones and optional face/track boxes';
export const usage = `studio sheet <video> [-o out.jpg] [--count 16 | --every 2 | --at 1.2,3.4] [--from s] [--to s]
             [--safe vertical|title|none] [--cols 6] [--tile 270] [--faces | --boxes track.json|faces.json]
Default: 16 frames spread over the clip; safe zone by aspect (house vertical zone for 9:16, title-safe for 16:9).
--faces detects faces on exactly these frames (YuNet) and boxes them: captions and cards must stay off eyes-to-chin.
--boxes draws normalized {t,x,y,w,h} boxes from a sample within 0.1 s of each frame (studio track / faces output).
Output defaults to <project>/work/sheets/ (or _scratch/sheets/) as <name>-sheet.jpg.`;

// Nearest-sample lookup for faces.json ({t, faces:[...]}) or track.json ({t,x,y,w,h}) arrays.
export function boxLookup(file) {
  const j = readJson(file);
  const rows = Array.isArray(j) ? j : (j.samples || j.track || []);
  return t => {
    let best = null;
    for (const r of rows) if (!best || Math.abs(r.t - t) < Math.abs(best.t - t)) best = r;
    if (!best || Math.abs(best.t - t) > 0.1) return [];
    return best.faces ? best.faces : (best.ok === false ? [] : [best]);
  };
}

export function run(argv) {
  const a = parseArgs(argv, ['faces']);
  const video = a._[0];
  if (!video) { console.log(usage); return 1; }
  const info = probe(video);
  const from = num(a.from, 0), to = Math.min(num(a.to, info.duration), info.duration);
  let times;
  if (a.at) times = String(a.at).split(',').map(Number).filter(t => !Number.isNaN(t));
  else if (a.every) { const e = num(a.every, 2); times = []; for (let t = from; t < to; t += e) times.push(+t.toFixed(3)); }
  else times = spread(from, to, num(a.count, 16));
  const out = a.out || path.join(outDirFor(video, 'sheets'), `${path.basename(video, path.extname(video))}-sheet.jpg`);
  let boxesAt = a.boxes ? boxLookup(a.boxes) : undefined;
  if (a.faces) {
    const fj = path.join(tmpDir('faces'), 'faces.json');
    py('faces_yunet.py', ['--input', path.resolve(video), '--times', times.map(t => t.toFixed(3)).join(','), '--model', BIN.yunet, '--out', fj]);
    boxesAt = boxLookup(fj);
  }
  const r = contactSheet(video, times, out, {
    info, safe: a.safe, cols: a.cols ? num(a.cols) : undefined, tile: a.tile ? num(a.tile) : undefined, boxesAt,
  });
  console.log(`${r.count} frames (${r.cols}x${r.rows}) -> ${rel(r.out)}`);
  return 0;
}
