// Shot boundaries and pace stats: PySceneDetect adaptive (default) or the ffmpeg scene score as a fallback.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, num, py, probe, readJson, writeJson, rel, outDirFor, BIN, percentile } from '../lib/core.mjs';
import { videoPass, cutsFrom } from '../lib/analyze.mjs';

export const summary = 'Shot boundaries + pace stats (PySceneDetect adaptive, ffmpeg fallback)';
export const usage = `studio scenes <video> [-o scenes.json] [--engine adaptive|ffmpeg] [--threshold 3.0] [--min-scene 0.25]
Prints shot count, average and median shot length, cuts per minute and the shortest/longest shots.`;

export function shots(video, a = {}) {
  const info = probe(video);
  if ((a.engine || 'adaptive') === 'adaptive' && fs.existsSync(BIN.py)) {
    const tmp = path.join(outDirFor(video, 'scenes'), `${path.basename(video, path.extname(video))}.raw-scenes.json`);
    fs.mkdirSync(path.dirname(tmp), { recursive: true });
    py('scenes.py', ['--input', path.resolve(video), '--out', tmp, '--threshold', String(num(a.threshold, 3)), '--min-scene', String(num(a['min-scene'], 0.25))]);
    const j = readJson(tmp); fs.rmSync(tmp, { force: true });
    if (j.shots.length) return { engine: j.engine, duration: info.duration, shots: j.shots };
  }
  const cuts = cutsFrom(videoPass(video).frames, 12);
  const edges = [0, ...cuts.filter(t => t > 0.05), info.duration];
  return { engine: 'ffmpeg-scdet', duration: info.duration, shots: edges.slice(0, -1).map((t0, i) => ({ i, t0: +t0.toFixed(3), t1: +edges[i + 1].toFixed(3), dur: +(edges[i + 1] - t0).toFixed(3) })) };
}
export function paceStats(r) {
  const d = r.shots.map(s => s.dur);
  return { shots: d.length, asl: +(r.duration / Math.max(1, d.length)).toFixed(2), median: +percentile(d, 0.5).toFixed(2),
    cutsPerMin: +((d.length - 1) / (r.duration / 60)).toFixed(1), shortest: +Math.min(...d).toFixed(2), longest: +Math.max(...d).toFixed(2) };
}

export function run(argv) {
  const a = parseArgs(argv);
  const video = a._[0];
  if (!video) { console.log(usage); return 1; }
  const r = shots(video, a), s = paceStats(r);
  const out = a.out || path.join(outDirFor(video, 'scenes'), `${path.basename(video, path.extname(video))}.scenes.json`);
  writeJson(out, { ...r, stats: s });
  console.log(`${s.shots} shots (${r.engine}) · ASL ${s.asl}s · median ${s.median}s · ${s.cutsPerMin} cuts/min · shortest ${s.shortest}s · longest ${s.longest}s -> ${rel(out)}`);
  return 0;
}
