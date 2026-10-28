// Object tracking for callouts that follow something on screen: OpenCV CSRT from a starting box,
// smoothed, written as normalized keyframes a HyperFrames/GSAP callout can follow.
import path from 'node:path';
import { parseArgs, num, py, readJson, rel, outDirFor } from '../lib/core.mjs';

export const summary = 'Track a box through a clip (CSRT) -> keyframes for callouts that follow it';
export const usage = `studio track <video> --box x,y,w,h --start 2.0 [--end 5.0] [--smooth 5] [--every 1] [-o track.json]
--box in video pixels or 0-1 fractions (find it on a studio sheet frame). Output samples {t, ok, x, y, w, h}
are 0-1 fractions: in a composition, multiply by the stage size and tween the callout through them
(one GSAP keyframe per sample, ease "none"). Check with: studio sheet <video> --boxes track.json --from 2 --to 5`;

export function run(argv) {
  const a = parseArgs(argv);
  const video = a._[0];
  if (!video || !a.box) { console.log(usage); return 1; }
  const out = a.out || path.join(outDirFor(video, 'track'), `${path.basename(video, path.extname(video))}.track.json`);
  const args = ['--input', path.resolve(video), '--box', String(a.box), '--start', String(num(a.start, 0)), '--smooth', String(num(a.smooth, 5)), '--every', String(num(a.every, 1)), '--out', path.resolve(out)];
  if (a.end !== undefined) args.push('--end', String(num(a.end)));
  console.log(String(py('track.py', args).stdout).trim());
  const j = readJson(out), lost = j.samples.filter(s => !s.ok);
  if (lost.length) console.log(`warning: tracker lost the box on ${lost.length} samples from ${lost[0].t}s; shorten the range or restart from a fresh box`);
  console.log(`-> ${rel(out)}`);
  return 0;
}
