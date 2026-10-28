#!/usr/bin/env node
// Generate a small royalty-free sound-effects kit with ffmpeg synthesis, plus sfx-kit.json
// (each file's peak position and recommended gain), which mix_cues.mjs reads.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findTool, run, decodeMono } from './_ffmpeg.mjs';

const USAGE = `Usage: node make_sfx.mjs <output folder>

Writes 48 kHz stereo WAVs normalised to -3 dBFS peak:
  sub_drop, boom, low_whoosh, whoosh, pop, click, tick, riser, sparkle
and sfx-kit.json with peak_s (seconds from file start to the loudest point) and gain_db
(recommended level against a voice peaking near -3 dBFS). A record scratch cannot be
synthesised convincingly: take it from a licensed library if the edit needs one.`;

const argv = process.argv.slice(2);
if (!argv.length || argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); process.exit(argv.length ? 0 : 1); }
const outDir = path.resolve(argv[0]);
fs.mkdirSync(outDir, { recursive: true });
const SR = 48000;

// Each recipe: lavfi inputs + optional filter_complex ending in [o]. Mono until the final pan.
const KIT = [
  { name: 'sub_drop', gain_db: -6, use: 'Reveal word or stat: start it on the first frame of the word (felt more than heard).',
    inputs: [`aevalsrc=exprs='min(1,t/0.006)*exp(-1.25*t)*sin(2*PI*(70*t-8*t*t))':s=${SR}:d=2.4`] },
  { name: 'boom', gain_db: -8, use: 'Frame 0 of the reel: low impact with a long tail.',
    inputs: [`aevalsrc=exprs='min(1,t/0.004)*(exp(-1.1*t)*sin(2*PI*(58*t-4*t*t))+0.5*exp(-30*t)*sin(2*PI*(140*t-200*t*t)))':s=${SR}:d=3.4`] },
  { name: 'low_whoosh', gain_db: -10, use: 'Scene cuts: the swell peaks 2-4 frames before the picture cut.',
    inputs: [`anoisesrc=d=0.5:c=brown:r=${SR}:a=0.9:seed=7`, `aevalsrc=exprs='gte(t,0.30)*exp(-14*(t-0.30))*sin(2*PI*62*(t-0.30))':s=${SR}:d=0.5`],
    graph: `[0]highpass=f=40,lowpass=f=900,afade=t=in:st=0:d=0.30:curve=exp,afade=t=out:st=0.30:d=0.20[n];[1]volume=0.8[b];[n][b]amix=inputs=2:normalize=0[o]` },
  { name: 'whoosh', gain_db: -12, use: 'Card wipes, picture-in-picture expansions, whip cuts.',
    inputs: [`anoisesrc=d=0.4:c=pink:r=${SR}:a=0.8:seed=11`],
    graph: `[0]highpass=f=400,lowpass=f=9000,afade=t=in:st=0:d=0.22:curve=exp,afade=t=out:st=0.22:d=0.18[o]` },
  { name: 'pop', gain_db: -15, use: 'First visible frame of a card, icon, tile or word box.',
    inputs: [`aevalsrc=exprs='min(1,t/0.0015)*exp(-55*t)*sin(2*PI*(950*t-2600*t*t))':s=${SR}:d=0.09`] },
  { name: 'click', gain_db: -20, use: 'UI taps, send buttons, typing (every 2-3 characters).',
    inputs: [`anoisesrc=d=0.015:c=white:r=${SR}:a=0.9:seed=3`],
    graph: `[0]highpass=f=2500,afade=t=out:st=0.001:d=0.014[o]` },
  { name: 'tick', gain_db: -20, use: 'Counter and odometer steps.',
    inputs: [`aevalsrc=exprs='exp(-220*t)*sin(2*PI*4200*t)':s=${SR}:d=0.03`] },
  { name: 'riser', gain_db: -15, use: 'Into a reveal or list completion: the peak is the end, so hit = reveal time.',
    inputs: [`aevalsrc=exprs='pow(t/1.2,2)*sin(2*PI*(300*t+500*t*t))':s=${SR}:d=1.2`, `anoisesrc=d=1.2:c=pink:r=${SR}:a=0.5:seed=5`],
    graph: `[1]highpass=f=1500,volume=eval=frame:volume='pow(t/1.2,3)'[n];[0][n]amix=inputs=2:normalize=0,afade=t=out:st=1.185:d=0.015[o]` },
  { name: 'sparkle', gain_db: -18, use: 'Premium reveals: widgets, final numbers, sparkle icons.',
    inputs: [`aevalsrc=exprs='exp(-7*t)*(0.45*sin(2*PI*4186*t)+0.35*gte(t,0.035)*sin(2*PI*6272*t)+0.25*gte(t,0.07)*sin(2*PI*8372*t))':s=${SR}:d=0.7`] },
];

const ffmpeg = findTool('ffmpeg');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sfxkit-'));
const manifest = [];
for (const k of KIT) {
  const raw = path.join(tmp, `${k.name}.wav`);
  const args = ['-v', 'error', '-y'];
  for (const inp of k.inputs) args.push('-f', 'lavfi', '-i', inp);
  const graph = (k.graph ?? '[0]anull[o]') + ';[o]pan=stereo|c0=c0|c1=c0[s]';
  args.push('-filter_complex', graph, '-map', '[s]', '-ar', String(SR), '-c:a', 'pcm_f32le', raw);
  run(ffmpeg, args);

  const x = decodeMono(raw, SR);
  let peak = 0, at = 0;
  for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > peak) { peak = v; at = i; } }
  const norm = 20 * Math.log10(0.708 / Math.max(peak, 1e-6)); // to -3 dBFS
  const file = path.join(outDir, `${k.name}.wav`);
  run(ffmpeg, ['-v', 'error', '-y', '-i', raw, '-af', `volume=${norm.toFixed(2)}dB`, '-c:a', 'pcm_s16le', file]);
  manifest.push({ file: `${k.name}.wav`, duration_s: +(x.length / SR).toFixed(3), peak_s: +(at / SR).toFixed(3), gain_db: k.gain_db, use: k.use });
}
fs.writeFileSync(path.join(outDir, 'sfx-kit.json'), JSON.stringify(manifest, null, 1));
for (const m of manifest) console.log(`${m.file.padEnd(16)} ${String(m.duration_s).padStart(6)} s  peak at ${String(m.peak_s).padStart(5)} s  gain ${m.gain_db} dB`);
console.log(`kit -> ${outDir}`);
