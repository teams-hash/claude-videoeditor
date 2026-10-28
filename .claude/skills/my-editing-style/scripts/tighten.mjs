#!/usr/bin/env node
// Tighten a cut list from the audio itself: trim each piece to real speech onset/offset and split out
// internal pauses. Transcript word times are not precise enough for this: the first word of a take is
// often stamped 0.3-0.4 s early, and the last word's end includes the trailing silence.
import fs from 'node:fs';
import { decodeMono, flag, loadWords } from './_ffmpeg.mjs';

const USAGE = `Usage: node tighten.mjs <source> <cuts.json> <out.json> [--transcript transcript.json]
                         [--min-gap 0.15] [--keep 0.08] [--punch-keep 0.17] [--threshold dB]

cuts.json pieces (source seconds) may carry optional fields:
  "lead": 0.16       seconds of room tone to keep before the first sound (default 0.05)
  "tail": 0.45       seconds to keep after the last sound (default 0.06)
  "punch": [3.0]     source times of pauses that are punchlines: keep --punch-keep there
Cut points only ever move inward (a piece is trimmed, never extended), so set "in"/"out" to exclude
anything you don't want, then let the audio decide the exact edges. Pauses longer than --min-gap inside
a piece are cut down to --keep (2-3 frames). Silence = 10 ms windows quieter than the threshold
(default: the file's 90th-percentile level minus 22 dB). With --transcript, each output piece gets
the text of the words inside it.`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h') || argv.length < 3) { console.log(USAGE); process.exit(argv.length < 3 && !argv.includes('--help') ? 1 : 0); }
const [src, cutsPath, outPath] = argv;
const minGap = Number(flag(argv, '--min-gap', 0.15));
const keep = Number(flag(argv, '--keep', 0.08));
const punchKeep = Number(flag(argv, '--punch-keep', 0.17));
const trPath = flag(argv, '--transcript');
const words = trPath ? loadWords(trPath) : [];

const SR = 16000, WIN = 160; // 10 ms windows
const x = decodeMono(src, SR);
const n = Math.floor(x.length / WIN);
const db = new Float32Array(n);
for (let i = 0; i < n; i++) { let s = 0; for (let j = i * WIN; j < (i + 1) * WIN; j++) s += x[j] * x[j]; db[i] = 10 * Math.log10(s / WIN + 1e-12); }
const sorted = Array.from(db).sort((a, b) => a - b);
const thr = Number(flag(argv, '--threshold', Math.min(-32, Math.max(-55, sorted[Math.floor(0.9 * (sorted.length - 1))] - 22))));
const voiced = t => db[Math.round(t * 100)] >= thr;

function onset(a, b) { // first run of 3 voiced windows
  for (let i = Math.round(a * 100); i < Math.round(b * 100) - 2; i++) if (db[i] >= thr && db[i + 1] >= thr && db[i + 2] >= thr) return i / 100;
  return null;
}
function lastVoiced(a, b) { for (let i = Math.round(b * 100); i >= Math.round(a * 100); i--) if (db[i] >= thr) return i / 100 + 0.01; return null; }

const cuts = JSON.parse(fs.readFileSync(cutsPath, 'utf8'));
const out = [];
let before = 0, after = 0;
for (const c of cuts) {
  before += c.out - c.in;
  const lead = c.lead ?? 0.05, tail = c.tail ?? 0.06;
  let a = c.in, b = c.out;
  if (!voiced(a)) { const on = onset(a, b); if (on !== null) a = Math.max(a, on - lead); }
  else if (c.lead !== undefined) { const on = onset(a, b); if (on !== null) a = Math.max(a, on - lead); }
  if (!voiced(b)) { const lv = lastVoiced(a, b); if (lv !== null) b = Math.min(b, lv + tail); }
  // internal silent runs: only between the first and last voiced window, so a kept lead or tail is never squeezed
  const gaps = [];
  let runStart = null;
  let first = Math.round(a * 100), last = Math.round(b * 100);
  while (first < last && db[first] < thr) first++;
  while (last > first && db[last] < thr) last--;
  for (let i = first + 1; i <= last - 1; i++) {
    if (db[i] < thr) { if (runStart === null) runStart = i; }
    else if (runStart !== null) { const s = runStart / 100, e = i / 100; if (e - s >= minGap) gaps.push([s, e]); runStart = null; }
  }
  const pieces = [];
  let cur = a;
  for (const [s, e] of gaps) {
    const k = (c.punch || []).some(t => t >= s - 0.1 && t <= e + 0.1) ? punchKeep : keep;
    pieces.push([cur, s + k / 2]);
    cur = e - k / 2;
  }
  pieces.push([cur, b]);
  pieces.forEach(([s, e], i) => {
    const text = words.length ? words.filter(w => w.start < e - 0.02 && w.end > s + 0.02).map(w => w.text).join(' ') : c.text;
    out.push({ id: pieces.length > 1 ? `${c.id}.${i + 1}` : c.id, in: +s.toFixed(3), out: +e.toFixed(3), text });
    after += e - s;
  });
  console.log(`${String(c.id).padEnd(10)} ${c.in.toFixed(2)}-${c.out.toFixed(2)} -> ${a.toFixed(2)}-${b.toFixed(2)}, ${gaps.length} pause(s) cut${gaps.length ? ': ' + gaps.map(([s, e]) => `${s.toFixed(2)}+${(e - s).toFixed(2)}s`).join(' ') : ''}`);
}
fs.writeFileSync(outPath, JSON.stringify(out, null, 1));
console.log(`threshold ${thr.toFixed(1)} dB · ${cuts.length} pieces -> ${out.length} · ${before.toFixed(2)} s -> ${after.toFixed(2)} s  ->  ${outPath}`);
