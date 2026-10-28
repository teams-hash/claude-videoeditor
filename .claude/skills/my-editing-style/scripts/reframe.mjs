#!/usr/bin/env node
// Re-frame a high-resolution rough cut with a punch-in schedule, so single-camera footage gets
// "setup changes" (wide / medium / tight) that stay sharp. Optional ffmpeg grade on the way out.
import fs from 'node:fs';
import path from 'node:path';
import { findTool, run, probe, flag } from './_ffmpeg.mjs';

const USAGE = `Usage: node reframe.mjs <hi-res rough.mp4> <framing.json> <out.mp4> [--width 1080] [--fps 30] [--grade "<ffmpeg filters>"]

framing.json, times on the edit timeline:
  [{"t": 0, "zoom": 1.2, "cy": 0}, {"t": 1.92, "zoom": 1.5, "cy": 0.25}, {"t": 3.97, "zoom": 1.0}]
zoom 1.0 = full frame. cx / cy (0-1, default 0.5) choose which part of the frame the crop keeps:
cy 0 keeps the top, which pushes the head down and leaves room above it for words behind the head.
Build the rough cut at 2x the output size first (roughcut.mjs --width 2160) so a 1.5x punch-in
still has full resolution. Audio is copied unchanged.`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h') || argv.length < 3) { console.log(USAGE); process.exit(argv.length < 3 && !argv.includes('--help') ? 1 : 0); }
const [input, framingPath, out] = argv;
const width = Number(flag(argv, '--width', 1080));
const fps = Number(flag(argv, '--fps', 30));
const height = Math.round((width * 16) / 9 / 2) * 2;
const grade = flag(argv, '--grade');
const shots = JSON.parse(fs.readFileSync(framingPath, 'utf8')).sort((a, b) => a.t - b.t);
const info = probe(input);
if (!info.video) throw new Error('input has no video');
if (info.video.width < width * Math.max(...shots.map(s => s.zoom || 1)) - 1) {
  console.warn(`note: ${info.video.width}px input under ${Math.max(...shots.map(s => s.zoom || 1))}x zoom will be upscaled; build the rough at a higher width for sharp punch-ins`);
}
// Piecewise expression over the input timestamp: if(lt(it,t1), v0, if(lt(it,t2), v1, ...))
const chain = key => {
  let expr = String(shots[shots.length - 1][key]);
  for (let i = shots.length - 2; i >= 0; i--) expr = `if(lt(it\\,${shots[i + 1].t})\\,${shots[i][key]}\\,${expr})`;
  return expr;
};
shots.forEach(s => { s.zoom = s.zoom ?? 1; s.cx = s.cx ?? 0.5; s.cy = s.cy ?? 0.5; });
const z = chain('zoom'), cx = chain('cx'), cy = chain('cy');
let vf = `zoompan=z='${z}':x='(iw-iw/zoom)*(${cx})':y='(ih-ih/zoom)*(${cy})':d=1:s=${width}x${height}:fps=${fps}`;
if (grade) vf += `,${grade}`;
vf += ',format=yuv420p';
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
run(findTool('ffmpeg'), ['-v', 'error', '-y', '-i', input, '-vf', vf, '-map', '0:v', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-c:a', 'copy', '-movflags', '+faststart', out]);
const o = probe(out);
console.log(`${shots.length} shots -> ${out} (${o.video.width}x${o.video.height}, ${o.duration.toFixed(2)} s)`);
for (const s of shots) console.log(`  ${String(s.t).padStart(6)} s  zoom ${s.zoom}  cx ${s.cx}  cy ${s.cy}`);
