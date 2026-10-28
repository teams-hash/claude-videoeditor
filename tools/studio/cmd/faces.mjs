// Face boxes over time with YuNet (OpenCV), for framing decisions, "keep the face clear" layout and QC.
import path from 'node:path';
import { parseArgs, num, py, readJson, rel, outDirFor, BIN, percentile } from '../lib/core.mjs';

export const summary = 'Face boxes over time (YuNet): eyes/chin lines for layout and QC';
export const usage = `studio faces <video> [-o faces.json] [--fps 2 | --times 1.0,2.5] [--score 0.75]
Writes [{t, faces:[{x,y,w,h,score,eyes,chin}]}] in 0-1 frame fractions and prints where the face usually sits,
so captions and cards can be placed above the eyes line or below the chin line.
Draw them on a sheet: studio sheet <video> --boxes faces.json`;

export function run(argv) {
  const a = parseArgs(argv);
  const video = a._[0];
  if (!video) { console.log(usage); return 1; }
  const out = a.out || path.join(outDirFor(video, 'faces'), `${path.basename(video, path.extname(video))}.faces.json`);
  const args = ['--input', path.resolve(video), '--model', BIN.yunet, '--out', path.resolve(out), '--score', String(num(a.score, 0.75))];
  if (a.times) args.push('--times', String(a.times)); else args.push('--fps', String(num(a.fps, 2)));
  py('faces_yunet.py', args);
  const rows = readJson(out), main = rows.map(r => r.faces.sort((p, q) => q.w * q.h - p.w * p.h)[0]).filter(Boolean);
  if (!main.length) { console.log(`no faces found in ${rows.length} samples -> ${rel(out)}`); return 0; }
  main.forEach(f => { f.cx = f.x + f.w / 2; });
  const st = k => `${percentile(main.map(f => f[k]), 0.1).toFixed(2)}–${percentile(main.map(f => f[k]), 0.9).toFixed(2)}`;
  console.log(`${main.length}/${rows.length} samples with a face · face centre x ${st('cx')} (of width) · eyes line ${st('eyes')} · chin line ${st('chin')} (of height) -> ${rel(out)}`);
  return 0;
}
