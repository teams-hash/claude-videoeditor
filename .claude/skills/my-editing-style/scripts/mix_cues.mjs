#!/usr/bin/env node
// Mix sound-effect cues onto a video or audio file. Cues are placed by the moment they should HIT.
import fs from 'node:fs';
import path from 'node:path';
import { findTool, run, probe } from './_ffmpeg.mjs';

const USAGE = `Usage: node mix_cues.mjs <input.mp4|.wav> <cues.json> <out.mp4|.wav>

cues.json, times in seconds on the edit timeline:
  [
    {"file": "sfx/boom.wav",       "hit": 0.0},
    {"file": "sfx/low_whoosh.wav", "hit": 4.17, "note": "cut at 4.27, peak lands 3 frames early"},
    {"file": "sfx/sub_drop.wav",   "hit": 2.0,  "gain": -5},
    {"file": "sfx/pop.wav",        "t": 7.66}
  ]
"hit" aligns the file's loudest point to that time (peak_s from sfx-kit.json beside the file,
or a "peak" field on the cue). "t" places the file's first sample instead. "gain" is in dB
(default: the kit's gain_db, else -12). File paths are relative to cues.json.
The video stream is copied untouched; the mixed audio is AAC 48 kHz (or PCM for .wav output).`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h') || argv.length < 3) { console.log(USAGE); process.exit(argv.length < 3 && !argv.includes('--help') ? 1 : 0); }
const [input, cuesPath, out] = argv;
const cues = JSON.parse(fs.readFileSync(cuesPath, 'utf8'));
const baseDir = path.dirname(path.resolve(cuesPath));
const info = probe(input);
if (!info.audio) throw new Error('input has no audio stream to mix onto');

const kits = new Map();
function kitEntry(file) {
  const dir = path.dirname(file);
  if (!kits.has(dir)) {
    const p = path.join(dir, 'sfx-kit.json');
    kits.set(dir, fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : []);
  }
  return kits.get(dir).find(e => e.file === path.basename(file));
}

const placed = cues.map((c, i) => {
  if (!c.file) throw new Error(`cue ${i} has no "file"`);
  const file = path.resolve(baseDir, c.file);
  if (!fs.existsSync(file)) throw new Error(`cue ${i}: file not found: ${file}`);
  const k = kitEntry(file);
  const peak = typeof c.peak === 'number' ? c.peak : (k?.peak_s ?? 0);
  let start;
  if (typeof c.t === 'number') start = c.t;
  else if (typeof c.hit === 'number') start = c.hit - peak;
  else throw new Error(`cue ${i} needs "hit" or "t"`);
  const gain = typeof c.gain === 'number' ? c.gain : (k?.gain_db ?? -12);
  return { file, start, trim: start < 0 ? -start : 0, gain, note: c.note ?? '' };
});

const ffmpeg = findTool('ffmpeg');
const args = ['-v', 'error', '-y', '-i', input];
for (const p of placed) args.push('-i', p.file);
let g = '[0:a]aresample=48000,aformat=channel_layouts=stereo[base];';
placed.forEach((p, i) => {
  const ms = Math.round(Math.max(0, p.start) * 1000);
  const trim = p.trim > 0 ? `,atrim=start=${p.trim.toFixed(3)},asetpts=PTS-STARTPTS` : '';
  g += `[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo${trim},volume=${p.gain}dB,adelay=${ms}|${ms}[c${i}];`;
});
g += '[base]' + placed.map((_, i) => `[c${i}]`).join('') + `amix=inputs=${placed.length + 1}:duration=first:dropout_transition=0:normalize=0[mix]`;
args.push('-filter_complex', g);
if (/\.wav$/i.test(out)) args.push('-map', '[mix]', '-c:a', 'pcm_s16le', out);
else args.push(...(info.video ? ['-map', '0:v', '-c:v', 'copy'] : []), '-map', '[mix]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out);
run(ffmpeg, args);

for (const p of [...placed].sort((a, b) => a.start - b.start)) {
  console.log(`${p.start.toFixed(3).padStart(8)} s  ${path.basename(p.file).padEnd(16)} ${String(p.gain).padStart(4)} dB  ${p.note}`);
}
console.log(`${placed.length} cues -> ${out}`);
