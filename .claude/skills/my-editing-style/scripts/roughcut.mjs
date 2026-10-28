#!/usr/bin/env node
// Build a 9:16 rough cut from a cut list, with 10 ms audio fades at every join.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findTool, run, probe, flag, loadWords } from './_ffmpeg.mjs';

const USAGE = `Usage: node roughcut.mjs <source video> <cuts.json> <out.mp4> [--width 1080] [--fps 30] [--transcript transcript.json]

cuts.json lists the kept pieces in playback order, in source seconds:
  [{"id": "hook", "in": 0.60, "out": 4.62, "text": "Everyone says cold calling is dead."}, ...]

The source is scaled to cover and centre-cropped to 9:16 (no stretching).
With --transcript (word timings of the SOURCE), also writes <out>.words.json:
the kept words re-timed to the rough-cut timeline, ready for placing graphics and sound cues.`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); process.exit(0); }
const pos = argv.filter((a, i) => !a.startsWith('--') && !(i > 0 && argv[i - 1].startsWith('--')));
if (pos.length < 3) { console.error(USAGE); process.exit(1); }
const [src, cutsPath, out] = pos;
const width = Number(flag(argv, '--width', 1080));
const fps = Number(flag(argv, '--fps', 30));
const height = Math.round((width * 16) / 9 / 2) * 2;

// Snap every cut point to the output frame grid so each video piece and its audio have the same length.
const snap = x => Math.round(x * fps) / fps;
const cuts = JSON.parse(fs.readFileSync(cutsPath, 'utf8'));
if (!Array.isArray(cuts) || !cuts.length) throw new Error('cuts.json must be a non-empty array');
cuts.forEach((c, i) => {
  if (!(typeof c.in === 'number' && typeof c.out === 'number' && c.out > c.in)) {
    throw new Error(`cut ${i} (${c.id ?? '?'}) needs numeric "in" < "out"`);
  }
  c.in = +snap(c.in).toFixed(4);
  c.out = +snap(c.out).toFixed(4);
});

const info = probe(src);
if (!info.video) throw new Error('source has no video stream');
const hasAudio = !!info.audio;

let f = '';
cuts.forEach((c, i) => {
  const d = c.out - c.in;
  f += `[0:v]trim=start=${c.in}:end=${c.out},setpts=PTS-STARTPTS,scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},setsar=1,fps=${fps}[v${i}];`;
  if (hasAudio) {
    f += `[0:a]atrim=start=${c.in}:end=${c.out},asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:d=0.01,afade=t=out:st=${Math.max(0, d - 0.01).toFixed(3)}:d=0.01[a${i}];`;
  }
});
f += cuts.map((_, i) => (hasAudio ? `[v${i}][a${i}]` : `[v${i}]`)).join('') + `concat=n=${cuts.length}:v=1:a=${hasAudio ? 1 : 0}[v]${hasAudio ? '[a]' : ''}`;

const ffmpeg = findTool('ffmpeg');
const tail = ['-map', '[v]', ...(hasAudio ? ['-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000'] : []),
  '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out];
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
if (f.length < 24000) {
  run(ffmpeg, ['-v', 'error', '-y', '-i', src, '-filter_complex', f, ...tail]);
} else {
  // Long cut lists exceed the Windows command-line limit: pass the graph as a file.
  const script = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'roughcut-')), 'graph.txt');
  fs.writeFileSync(script, f);
  const r = run(ffmpeg, ['-v', 'error', '-y', '-i', src, '-/filter_complex', script, ...tail], { allowFail: true });
  if (r.status !== 0) run(ffmpeg, ['-v', 'error', '-y', '-i', src, '-filter_complex_script', script, ...tail]);
}

let t = 0;
const timeline = cuts.map(c => { const row = { id: c.id ?? '', start: +t.toFixed(3), srcIn: c.in, srcOut: c.out }; t += c.out - c.in; return row; });
for (const r of timeline) console.log(`${r.start.toFixed(2).padStart(7)}  ${r.id}`);
console.log(`  total  ${t.toFixed(2)} s  ->  ${out} (${width}x${height}, ${fps} fps)`);

const tr = flag(argv, '--transcript');
if (tr) {
  const words = loadWords(tr);
  const kept = [];
  timeline.forEach((seg, i) => {
    const c = cuts[i];
    for (const w of words) {
      if (w.end <= c.in + 0.02 || w.start >= c.out - 0.02) continue;
      kept.push({
        text: w.text,
        start: +(seg.start + Math.max(0, w.start - c.in)).toFixed(3),
        end: +(seg.start + Math.min(c.out, w.end) - c.in).toFixed(3),
        cut: seg.id,
      });
    }
  });
  const wordsOut = out.replace(/\.[^.\\/]+$/, '') + '.words.json';
  fs.writeFileSync(wordsOut, JSON.stringify(kept, null, 1));
  console.log(`  words  ${kept.length} re-timed words  ->  ${wordsOut}`);
}
