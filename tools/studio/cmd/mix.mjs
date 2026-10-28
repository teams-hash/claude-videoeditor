// Final mix: voice + sound-effect cues (placed by hit time, from the SFX index) + optional music bed,
// effects and music ducked under the voice, then two-pass loudness to -14 LUFS / -1.5 dBTP with a linear gain.
// Generalizes the c0473 mix.js (take variation, ducking) and the house mix_cues.mjs / loudnorm.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, num, probe, ffmpeg, decodeMono, readJson, writeJson, tmpDir, rel, assertWritable, STUDIO } from '../lib/core.mjs';
import { loadIndex } from './sfx.mjs';

export const summary = 'Mix voice + SFX cues (by hit time) + music bed with ducking, two-pass loudnorm';
export const usage = `studio mix --voice voice.wav [--cues cues.json] [--music bed.wav] [--video render.mp4] -o out.wav|out.mp4
           [--len seconds] [--lufs -14] [--tp -1.5] [--music-db -20] [--no-duck-sfx] [--vary] [--report cues.out.json]
cues.json, times on the edit timeline:
  [{"sfx": "cat:whoosh",                 "hit": 4.17, "note": "cut at 4.27, lands 3 frames early"},
   {"sfx": "sonniss/bass-drop-downer-fast-16", "hit": 2.0, "gain": -2},
   {"sfx": "work/sfx/my_pop.wav",         "t": 7.66}]
"sfx" is an index id, "cat:<category>" (a deterministic pick per cue that avoids repeating a take back to back),
or a file path. "hit" lands the sound's loudest point on that time; "t" places its first sample.
Levels: each category has a house level relative to a voice peaking near -3 dBFS ("gain" adjusts it in dB).
--vary adds the c0473 deterministic variation (+-0.5 semitone on small sounds, +-1 dB) so repeats don't sound looped.
--music: a licensed bed, placed from 0, faded, kept >= 18 dB under the voice by default and ducked under speech.
With --video the mix is muxed onto it (video copied); otherwise a 48 kHz WAV is written.`;

// Target peak (dBFS) per category before loudnorm, from the house sound palette (voice peaking near -3 dBFS).
export const LEVEL = { drop: -9, impact: -11, whoosh: -14, riser: -18, pop: -18, click: -23, ui: -20, typing: -24, paper: -20,
  magic: -21, glitch: -19, cartoon: -18, cash: -19, alarm: -18, texture: -23, misc: -18 };
const SMALL = new Set(['pop', 'click', 'ui', 'paper', 'typing', 'cartoon']);
// Longest sound a "cat:" pick may choose per category, so a long bed or a voice line is never picked as a pop.
const MAX_DUR = { pop: 0.7, click: 0.4, ui: 1.2, whoosh: 1.6, impact: 3, drop: 5, riser: 6, typing: 3, paper: 2, magic: 3, glitch: 1.5, cartoon: 2, cash: 2 };
const SR = 48000;
const h01 = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return ((h >>> 0) % 100000) / 100000; };

function resolveCues(cues, baseDir) {
  const idx = (() => { try { return loadIndex(); } catch { return []; } })();
  const byId = new Map(idx.map(e => [e.id, e]));
  const lastPick = {};
  return cues.map((c, i) => {
    const want = c.sfx ?? c.file;
    if (!want) throw new Error(`cue ${i} has no "sfx"`);
    let e = byId.get(want);
    if (!e && String(want).startsWith('cat:')) {
      const cat = want.slice(4), pool = idx.filter(x => x.cat === cat && x.dur <= num(c.maxDur, MAX_DUR[cat] ?? 4)).sort((p, q) => p.id.localeCompare(q.id));
      if (!pool.length) throw new Error(`cue ${i}: no indexed sound in category ${cat}`);
      let k = Math.floor(h01(`${cat}@${c.hit ?? c.t}`) * pool.length);
      if (pool.length > 1 && lastPick[cat] === k) k = (k + 1) % pool.length;
      lastPick[cat] = k; e = pool[k];
    }
    let file, hitOff, peak, cat;
    if (e) { file = path.resolve(STUDIO, e.path); hitOff = e.hit; peak = e.peak_db; cat = e.cat; }
    else {
      file = path.resolve(baseDir, want);
      if (!fs.existsSync(file)) throw new Error(`cue ${i}: not in the SFX index and no such file: ${want}`);
      const x = decodeMono(file, 16000); let pk = 0, pi = 0;
      for (let j = 0; j < x.length; j++) { const v = Math.abs(x[j]); if (v > pk) { pk = v; pi = j; } }
      hitOff = pi / 16000; peak = 20 * Math.log10(pk + 1e-9); cat = c.cat || 'misc';
    }
    const start = typeof c.t === 'number' ? c.t : typeof c.hit === 'number' ? c.hit - hitOff : null;
    if (start === null) throw new Error(`cue ${i} needs "hit" or "t"`);
    const gain = (LEVEL[cat] ?? LEVEL.misc) - peak + num(c.gain, 0);
    return { i, file, id: e?.id || rel(file), cat, start, gain, note: c.note || '' };
  });
}

function renderBus(placed, len, vary) {
  const n = Math.ceil(len * SR), bus = new Float32Array(n), cache = new Map();
  for (const p of placed) {
    if (!cache.has(p.file)) cache.set(p.file, decodeMono(p.file, SR));
    const s = cache.get(p.file);
    const st = vary && SMALL.has(p.cat) ? h01(`p${p.start}${p.id}`) - 0.5 : 0, rate = 2 ** (st / 12);
    const g = 10 ** ((p.gain + (vary ? (h01(`g${p.start}`) - 0.5) * 2 : 0)) / 20);
    const o = Math.round(p.start * SR), m = Math.floor(s.length / rate);
    for (let i = 0; i < m && o + i < n; i++) {
      if (o + i < 0) continue;
      const x = i * rate, i0 = Math.floor(x), fr = x - i0;
      bus[o + i] += ((s[i0] || 0) * (1 - fr) + (s[i0 + 1] || 0) * fr) * g;
    }
  }
  return bus;
}

function loudnessJson(args) {
  const r = ffmpeg(['-v', 'info', ...args, '-f', 'null', '-']);
  const t = String(r.stderr);
  return JSON.parse(t.slice(t.lastIndexOf('{'), t.lastIndexOf('}') + 1));
}

export function run(argv) {
  const a = parseArgs(argv, ['no-duck-sfx', 'vary']);
  if (!a.voice || !a.out) { console.log(usage); return 1; }
  assertWritable(a.out);
  const vInfo = probe(a.voice);
  const video = a.video ? probe(a.video) : null;
  const len = num(a.len, video ? video.duration : vInfo.duration);
  const I = num(a.lufs, -14), TP = num(a.tp, -1.5);
  const dir = tmpDir('mix');
  const inputs = ['-i', a.voice];
  let g = `[0:a]aresample=${SR},aformat=channel_layouts=stereo,apad=whole_dur=${len.toFixed(3)},atrim=0:${len.toFixed(3)},asplit=3[v][vk1][vk2];`;
  const mixIn = ['[v]'];
  let placed = [];
  if (a.cues) {
    placed = resolveCues(readJson(a.cues), path.dirname(path.resolve(a.cues)));
    const bus = renderBus(placed, len, !!a.vary);
    const busFile = path.join(dir, 'sfx_bus.wav');
    ffmpeg(['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_f32le', busFile], { input: Buffer.from(bus.buffer) });
    inputs.push('-i', busFile);
    g += `[1:a]aformat=channel_layouts=stereo[s];`;
    if (a['no-duck-sfx']) g += '[s]anull[sd];[vk1]anullsink;';
    else g += '[s][vk1]sidechaincompress=threshold=0.03:ratio=3.5:attack=6:release=240:knee=3[sd];';
    mixIn.push('[sd]');
  } else g += '[vk1]anullsink;';
  if (a.music) {
    const mi = inputs.length / 2;
    inputs.push('-i', a.music);
    const fadeOut = Math.max(0, len - 1.5).toFixed(3);
    g += `[${mi}:a]aresample=${SR},aformat=channel_layouts=stereo,atrim=0:${len.toFixed(3)},volume=${num(a['music-db'], -20)}dB,afade=t=in:d=0.4,afade=t=out:st=${fadeOut}:d=1.5[m];`;
    g += '[m][vk2]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=450:knee=6[md];';
    mixIn.push('[md]');
  } else g += '[vk2]anullsink;';
  g += `${mixIn.join('')}amix=inputs=${mixIn.length}:normalize=0:duration=first[pre]`;

  // Two-pass loudnorm with a linear gain; a transparent limiter first only if the gain would push peaks over.
  const m1 = loudnessJson([...inputs, '-filter_complex', `${g};[pre]loudnorm=I=${I}:TP=${TP}:LRA=11:print_format=json`]);
  let pre = '', m = m1;
  const gain = I - Number(m1.input_i);
  if (Number(m1.input_tp) + gain > TP - 0.3) {
    const lim = Math.min(1, Math.max(0.0625, 10 ** ((TP - gain - 1.0) / 20)));
    pre = `alimiter=limit=${lim.toFixed(4)}:attack=5:release=60:level=false:latency=1,`;
    m = loudnessJson([...inputs, '-filter_complex', `${g};[pre]${pre}loudnorm=I=${I}:TP=${TP}:LRA=11:print_format=json`]);
  }
  const ln = `${pre}loudnorm=I=${I}:TP=${TP}:LRA=11:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
  const graph = `${g};[pre]${ln},aresample=${SR}[out]`;
  if (video) {
    const vi = inputs.length / 2;
    ffmpeg(['-v', 'error', '-y', ...inputs, '-i', a.video, '-filter_complex', graph, '-map', `${vi}:v:0`, '-map', '[out]', '-c:v', 'copy',
      '-c:a', 'aac', '-b:a', '256k', '-ar', String(SR), '-shortest', '-movflags', '+faststart', a.out]);
  } else ffmpeg(['-v', 'error', '-y', ...inputs, '-filter_complex', graph, '-map', '[out]', '-c:a', 'pcm_s24le', a.out]);
  fs.rmSync(dir, { recursive: true, force: true });

  const r = ffmpeg(['-v', 'info', '-i', a.out, '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-']);
  const last = re => { const all = [...String(r.stderr).matchAll(re)]; return all.length ? all[all.length - 1][1] : '?'; };
  for (const p of [...placed].sort((x, y) => x.start - y.start)) console.log(`${p.start.toFixed(3).padStart(8)}s  ${p.cat.padEnd(7)} ${p.id.slice(0, 44).padEnd(44)} ${p.note}`);
  console.log(`${placed.length} cues${a.music ? ' + music bed' : ''} · in ${Number(m1.input_i).toFixed(1)} LUFS -> out ${last(/I:\s+(-?[\d.]+)\s+LUFS/g)} LUFS, ${last(/Peak:\s+(-?[\d.]+|-inf)\s+dBFS/g)} dBTP${pre ? ' (peaks limited first)' : ''} -> ${rel(a.out)}`);
  if (a.report) writeJson(a.report, placed.map(({ file, ...p }) => p));
  return 0;
}
