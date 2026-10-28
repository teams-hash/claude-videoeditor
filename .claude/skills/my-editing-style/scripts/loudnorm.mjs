#!/usr/bin/env node
// Two-pass loudness normalisation for the final mix. The video stream is copied untouched.
// If the needed gain would push peaks past the ceiling, a transparent peak limiter runs first,
// so the gain can stay linear (one-pass loudnorm often lands 2+ LU short on short reels).
import { findTool, run, probe, flag } from './_ffmpeg.mjs';

const USAGE = `Usage: node loudnorm.mjs <in.mp4|.wav> <out.mp4|.wav> [--lufs -14] [--tp -1.5]

Measures the file, limits peaks only if needed, then applies an exact linear gain to reach
the target integrated loudness with a true-peak ceiling. Prints the measured result.`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h') || argv.length < 2) { console.log(USAGE); process.exit(argv.length < 2 && !argv.includes('--help') ? 1 : 0); }
const [input, out] = argv;
const I = Number(flag(argv, '--lufs', -14));
const TP = Number(flag(argv, '--tp', -1.5));
const LRA = 11;
const ffmpeg = findTool('ffmpeg');
const info = probe(input);
if (!info.audio) throw new Error('input has no audio stream');

function measure(pre, src = input) {
  const af = (pre ? pre + ',' : '') + `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:print_format=json`;
  const txt = String(run(ffmpeg, ['-hide_banner', '-nostats', '-i', src, '-map', '0:a:0', '-af', af, '-f', 'null', '-']).stderr);
  return JSON.parse(txt.slice(txt.lastIndexOf('{'), txt.lastIndexOf('}') + 1));
}

let pre = '';
let m = measure(pre);
const original = m;
const gain = I - Number(m.input_i);
if (Number(m.input_tp) + gain > TP - 0.3) {
  const ceiling = TP - gain - 1.0; // sample-peak ceiling before the gain, with 1 dB of true-peak margin
  const lim = Math.min(1, Math.max(0.0625, 10 ** (ceiling / 20)));
  pre = `alimiter=limit=${lim.toFixed(4)}:attack=5:release=60:level=false`;
  m = measure(pre);
}
const af = (pre ? pre + ',' : '') +
  `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
const args = ['-v', 'error', '-y', '-i', input];
if (/\.wav$/i.test(out)) args.push('-map', '0:a:0', '-af', af, '-ar', '48000', '-c:a', 'pcm_s16le', out);
else args.push(...(info.video ? ['-map', '0:v', '-c:v', 'copy'] : []), '-map', '0:a:0', '-af', af, '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', out);
run(ffmpeg, args);

const r = run(ffmpeg, ['-hide_banner', '-nostats', '-i', out, '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']);
const last = re => { const all = [...String(r.stderr).matchAll(re)]; return all.length ? all[all.length - 1][1] : '?'; };
console.log(`in  ${Number(original.input_i).toFixed(1)} LUFS, ${Number(original.input_tp).toFixed(1)} dBTP${pre ? '  (peaks limited first so the gain could stay linear)' : ''}`);
console.log(`out ${last(/I:\s+(-?[\d.]+)\s+LUFS/g)} LUFS, ${last(/Peak:\s+(-?[\d.]+|-inf)\s+dBFS/g)} dBTP  ->  ${out}`);
