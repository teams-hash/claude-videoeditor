// One-pass measurements shared by qc and refscan.
// videoPass: per-frame luma/saturation and scene-change score, plus black and frozen stretches.
// audioPass: EBU R128 loudness, true peak, sample peak and silences.
import fs from 'node:fs';
import path from 'node:path';
import { run, tmpDir } from './core.mjs';

export function videoPass(file, o = {}) {
  const dir = tmpDir('vpass');
  const vf = [`scale=${o.scale || 320}:-2`, 'format=yuv420p', 'blackdetect=d=0.08:pix_th=0.10',
    'freezedetect=n=-60dB:d=0.8', 'scdet=threshold=8', 'signalstats', 'metadata=mode=print:file=meta.txt'].join(',');
  const r = run('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'info', '-i', path.resolve(file), '-map', '0:v:0', '-vf', vf, '-an', '-f', 'null', '-'], { cwd: dir });
  const frames = [];
  let cur = null;
  for (const line of fs.readFileSync(path.join(dir, 'meta.txt'), 'utf8').split(/\r?\n/)) {
    if (line.startsWith('frame:')) { cur = { t: Number((line.match(/pts_time:([\d.]+)/) || [])[1]) }; frames.push(cur); continue; }
    const m = line.match(/^lavfi\.(signalstats\.(YAVG|SATAVG|YMIN|YMAX)|scd\.score)=(-?[\d.]+)/);
    if (m && cur) cur[m[2] || 'scene'] = Number(m[3]);
  }
  fs.rmSync(dir, { recursive: true, force: true });
  const err = String(r.stderr);
  const black = [...err.matchAll(/black_start:([\d.]+) black_end:([\d.]+) black_duration:([\d.]+)/g)].map(m => ({ start: +m[1], end: +m[2], dur: +m[3] }));
  const fs0 = [...err.matchAll(/freeze_start: ([\d.]+)/g)].map(m => +m[1]);
  const fe = [...err.matchAll(/freeze_duration: ([\d.]+)[\s\S]*?freeze_end: ([\d.]+)/g)].map(m => ({ dur: +m[1], end: +m[2] }));
  const frozen = fs0.map((start, i) => ({ start, end: fe[i]?.end ?? null, dur: fe[i]?.dur ?? null }));
  return { frames, black, frozen };
}

export function audioPass(file, o = {}) {
  const af = `ebur128=peak=true+sample:framelog=quiet,silencedetect=n=${o.silenceDb ?? -45}dB:d=${o.silenceMin ?? 0.35}`;
  const r = run('ffmpeg', ['-hide_banner', '-nostdin', '-v', 'info', '-i', path.resolve(file), '-map', '0:a:0', '-af', af, '-f', 'null', '-']);
  const err = String(r.stderr);
  const sum = err.slice(err.lastIndexOf('Summary:'));
  const grab = (re, s = sum) => { const m = s.match(re); return m ? (m[1] === '-inf' ? -Infinity : Number(m[1])) : null; };
  const truePeak = grab(/True peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS/);
  const samplePeak = grab(/Sample peak:\s+Peak:\s+(-?[\d.]+|-inf) dBFS/);
  const starts = [...err.matchAll(/silence_start: (-?[\d.]+)/g)].map(m => Math.max(0, +m[1]));
  const ends = [...err.matchAll(/silence_end: ([\d.]+) \| silence_duration: ([\d.]+)/g)].map(m => ({ end: +m[1], dur: +m[2] }));
  const silences = starts.map((s, i) => ({ start: s, end: ends[i]?.end ?? null, dur: ends[i]?.dur ?? null }));
  return { I: grab(/I:\s+(-?[\d.]+) LUFS/), LRA: grab(/LRA:\s+([\d.]+) LU/), truePeak, samplePeak, silences };
}

// Per-second aggregates of a videoPass: visual change (max scene score) and mean luma.
export function perSecond(frames, duration) {
  const n = Math.max(1, Math.ceil(duration)), out = Array.from({ length: n }, () => ({ change: 0, luma: 0, k: 0 }));
  for (const f of frames) { const s = out[Math.min(n - 1, Math.floor(f.t))]; s.change = Math.max(s.change, f.scene || 0); s.luma += f.YAVG || 0; s.k++; }
  return out.map((s, i) => ({ t: i, change: +s.change.toFixed(1), luma: s.k ? +(s.luma / s.k).toFixed(1) : null }));
}

// Cuts = frames whose scene score passes the threshold (scdet scores 0-100).
export const cutsFrom = (frames, thr = 12) => frames.filter(f => (f.scene || 0) >= thr).map(f => f.t);

// Photosensitivity screen: large luma swings (>= `delta` on 0-255) that reverse within 10 frames, counted per second.
export function flashes(frames, fps = 30, delta = 26) {
  const ev = [];
  for (let i = 1; i < frames.length; i++) {
    const d = (frames[i].YAVG ?? 0) - (frames[i - 1].YAVG ?? 0);
    if (Math.abs(d) < delta) continue;
    for (let k = i + 1; k < Math.min(frames.length, i + 10); k++) {
      const back = (frames[k].YAVG ?? 0) - (frames[k - 1].YAVG ?? 0);
      if (Math.sign(back) === -Math.sign(d) && Math.abs(back) >= delta) { ev.push(frames[i].t); break; }
    }
  }
  let worst = 0, at = null;
  for (const t of ev) { const c = ev.filter(u => u >= t && u < t + 1).length; if (c > worst) { worst = c; at = t; } }
  return { events: ev.length, worstPerSecond: worst, at };
}
