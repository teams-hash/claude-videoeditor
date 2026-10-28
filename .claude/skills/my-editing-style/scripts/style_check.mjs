#!/usr/bin/env node
// QC a rendered reel against the house style: frame, loudness, dead air, cut rhythm and visual pace,
// plus timestamped contact sheets with the safe-zone margins tinted red for a visual pass.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findTool, run, probe, flag, loadWords } from './_ffmpeg.mjs';

const USAGE = `Usage: node style_check.mjs <video> [--format A|B|C|D] [--transcript words.json] [--sheets <folder>] [--no-safe-zone] [--json]

--format      A split showcase, B editorial proof, C screenshot tutorial, D app demo (sets length and pace targets)
--transcript  word timings ON THE EDIT TIMELINE (roughcut.mjs writes <out>.words.json) for an exact dead-air
              measure; without it, pauses are found with silence detection, which a music bed can hide
--sheets      write 2 fps contact sheets (16 frames each) to this folder; red bands mark the unsafe margins
Exit code 1 when any check FAILS.`;

const TARGETS = {
  A: { name: 'Split showcase', len: [20, 40], still: 6.5 },
  B: { name: 'Editorial proof', len: [35, 55], still: 6.5 },
  C: { name: 'Screenshot tutorial', len: [60, 90], still: 10, avgShot: 10, longShot: 16 },
  D: { name: 'App demo', len: [15, 25], still: 3.5, slotCv: 0.15, noVoice: true },
};
const CUT_SCORE = 0.30;     // hard cut
const CHANGE_SCORE = 0.015; // any visible change (graphic entrance, state change, cut); calibrated on the six references
const REFRACTORY = 0.3;

const argv = process.argv.slice(2);
if (!argv.length || argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); process.exit(argv.length ? 0 : 1); }
const input = argv[0];
const fmtKey = (flag(argv, '--format') || '').toUpperCase();
const T = TARGETS[fmtKey] || null;
const trPath = flag(argv, '--transcript');
const sheetsDir = flag(argv, '--sheets');
const asJson = argv.includes('--json');
const safeZone = !argv.includes('--no-safe-zone');

const ffmpeg = findTool('ffmpeg');
const info = probe(input);
const dur = info.duration;
const checks = [];
const metrics = { duration: +dur.toFixed(2) };
const add = (status, label, detail) => checks.push({ status, label, detail });
const fmtT = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stylecheck-'));

// 1. Frame
if (!info.video) add('FAIL', 'Frame', 'no video stream');
else {
  const { width: w, height: h, fps } = info.video;
  metrics.width = w; metrics.height = h; metrics.fps = fps ? +fps.toFixed(3) : null;
  if (w === 1080 && h === 1920) add('PASS', 'Frame', '1080x1920');
  else if (Math.abs(w / h - 9 / 16) < 0.01) add('WARN', 'Frame', `${w}x${h} is 9:16 but deliver 1080x1920`);
  else add('FAIL', 'Frame', `${w}x${h} is not 9:16`);
  if (fps && (Math.abs(fps - 30) < 0.05 || Math.abs(fps - 29.97) < 0.05)) add('PASS', 'Frame rate', `${fps.toFixed(2)} fps`);
  else add('WARN', 'Frame rate', `${fps ? fps.toFixed(2) : '?'} fps (house standard is 30)`);
}
if (T) {
  const [lo, hi] = T.len;
  add(dur >= lo && dur <= hi ? 'PASS' : 'WARN', 'Length', `${dur.toFixed(1)} s (Format ${fmtKey} target ${lo}-${hi} s)`);
}

// 2. Loudness
if (!info.audio) add('FAIL', 'Audio', 'no audio stream');
else {
  const r = run(ffmpeg, ['-hide_banner', '-nostats', '-i', input, '-map', '0:a:0', '-af', 'ebur128=peak=true:framelog=quiet', '-f', 'null', '-'], { allowFail: true });
  const last = (re) => { const m = [...String(r.stderr).matchAll(re)]; return m.length ? m[m.length - 1][1] : null; };
  const I = Number(last(/I:\s+(-?[\d.]+)\s+LUFS/g));
  const tp = last(/Peak:\s+(-?[\d.]+|-inf)\s+dBFS/g);
  const TP = tp === '-inf' || tp === null ? -Infinity : Number(tp);
  const LRA = Number(last(/LRA:\s+([\d.]+)\s+LU/g));
  Object.assign(metrics, { lufs: I, truePeak: TP, lra: LRA });
  const fix = 'normalise: ffmpeg -i in.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -ar 48000 out.mp4';
  add(I >= -15 && I <= -13 ? 'PASS' : 'WARN', 'Loudness', `${I.toFixed(1)} LUFS integrated (target -14 ±1)${I >= -15 && I <= -13 ? '' : '; ' + fix}`);
  add(TP <= -1 ? 'PASS' : TP <= 0 ? 'WARN' : 'FAIL', 'True peak', `${TP.toFixed(1)} dBTP (target ≤ -1.0)${TP > -1 ? '; ' + fix : ''}`);
}

// 3. Dead air
if (info.audio && !(T && T.noVoice)) {
  let gaps = [], source;
  if (trPath) {
    const words = loadWords(trPath);
    source = 'transcript';
    if (words.length) {
      if (words[0].start > REFRACTORY) gaps.push([0, words[0].start]);
      for (let i = 1; i < words.length; i++) {
        const g = words[i].start - words[i - 1].end;
        if (g > REFRACTORY) gaps.push([words[i - 1].end, words[i].start]);
      }
    }
  } else {
    source = 'silence detection';
    const r = run(ffmpeg, ['-hide_banner', '-nostats', '-i', input, '-map', '0:a:0', '-af', 'silencedetect=noise=-40dB:d=0.3', '-f', 'null', '-'], { allowFail: true });
    let s = null;
    for (const line of String(r.stderr).split(/\r?\n/)) {
      let m = line.match(/silence_start:\s*(-?[\d.]+)/); if (m) s = Math.max(0, Number(m[1]));
      m = line.match(/silence_end:\s*([\d.]+)/); if (m && s !== null) { gaps.push([s, Number(m[1])]); s = null; }
    }
    gaps = gaps.filter(([, e]) => e < dur - 0.05); // the closing hold is intentional
  }
  const total = gaps.reduce((a, [s, e]) => a + (e - s), 0);
  const longest = gaps.reduce((a, g) => (g[1] - g[0] > a[1] - a[0] ? g : a), [0, 0]);
  const pct = (100 * total) / dur;
  Object.assign(metrics, { speechFreeSeconds: +total.toFixed(2), speechFreePct: +pct.toFixed(1), longestPause: +(longest[1] - longest[0]).toFixed(2) });
  const where = longest[1] > longest[0] ? `; longest ${(longest[1] - longest[0]).toFixed(2)} s at ${fmtT(longest[0])}` : '';
  add(pct <= 5 ? 'PASS' : 'WARN', 'Dead air', `${total.toFixed(2)} s = ${pct.toFixed(1)}% of runtime (target ≤ 5%, from ${source})${where}`);
}

// 4. Cuts and visual pace from per-frame scene-change scores
if (info.video) {
  run(ffmpeg, ['-v', 'error', '-i', path.resolve(input), '-vf', "scale=720:-2,select='gte(scene\\,0)',metadata=print:key=lavfi.scene_score:file=scores.txt", '-an', '-f', 'null', '-'], { cwd: tmp });
  const frames = [];
  let t = null;
  for (const line of fs.readFileSync(path.join(tmp, 'scores.txt'), 'utf8').split(/\r?\n/)) {
    let m = line.match(/pts_time:([\d.]+)/); if (m) t = Number(m[1]);
    m = line.match(/scene_score=([\d.]+)/); if (m && t !== null) frames.push([t, Number(m[1])]);
  }
  const events = th => { const ev = []; for (const [tt, s] of frames) if (s >= th && (!ev.length || tt - ev[ev.length - 1] >= REFRACTORY)) ev.push(tt); return ev; };
  const cuts = events(CUT_SCORE);
  const bounds = [0, ...cuts, dur];
  const shots = bounds.slice(1).map((e, i) => [bounds[i], e]);
  const lens = shots.map(([s, e]) => e - s);
  const avg = lens.reduce((a, b) => a + b, 0) / lens.length;
  const longShot = shots.reduce((a, s) => (s[1] - s[0] > a[1] - a[0] ? s : a), [0, 0]);
  Object.assign(metrics, { hardCuts: cuts.length, cutTimes: cuts.map(c => +c.toFixed(2)), avgShot: +avg.toFixed(2), longestShot: +(longShot[1] - longShot[0]).toFixed(2) });
  const cutLine = `${cuts.length} hard cuts, average shot ${avg.toFixed(1)} s, longest ${(longShot[1] - longShot[0]).toFixed(1)} s at ${fmtT(longShot[0])}`;
  if (T && T.avgShot) add(avg <= T.avgShot && longShot[1] - longShot[0] <= T.longShot ? 'PASS' : 'WARN', 'Cut rhythm', `${cutLine} (target average ≤ ${T.avgShot} s, longest ≤ ${T.longShot} s)`);
  else if (T && T.slotCv) {
    const body = lens.slice(0, -1); // the end card runs long by design
    const m = body.reduce((a, b) => a + b, 0) / Math.max(body.length, 1);
    const cv = body.length > 1 ? Math.sqrt(body.reduce((a, b) => a + (b - m) ** 2, 0) / body.length) / m : 1;
    metrics.slotCv = +cv.toFixed(3);
    add(cv <= T.slotCv && m >= 2 && m <= 3.5 ? 'PASS' : 'WARN', 'Cut rhythm', `${cutLine}; slots average ${m.toFixed(2)} s, spread ${(cv * 100).toFixed(0)}% (target 2-3.5 s slots, spread ≤ ${T.slotCv * 100}%)`);
  } else add('INFO', 'Cut rhythm', `${cutLine} (in A and B most changes are graphic or setup changes, not hard cuts)`);

  const ch = events(CHANGE_SCORE);
  let still = [0, ch.length ? ch[0] : dur], prev = 0;
  for (const e of [...ch, dur]) { if (e - prev > still[1] - still[0]) still = [prev, e]; prev = e; }
  const every = dur / Math.max(ch.length, 1);
  Object.assign(metrics, { visualChanges: ch.length, changeEvery: +every.toFixed(2), longestStill: +(still[1] - still[0]).toFixed(2), longestStillAt: +still[0].toFixed(2) });
  const paceLine = `a visible change every ${every.toFixed(1)} s; longest stretch without one ${(still[1] - still[0]).toFixed(1)} s at ${fmtT(still[0])}`;
  if (T) add(still[1] - still[0] <= T.still ? 'PASS' : 'WARN', 'Visual pace', `${paceLine} (target ≤ ${T.still} s; gestures and handheld motion count as change, so confirm on the sheets)`);
  else add('INFO', 'Visual pace', paceLine);
}

// 5. Contact sheets
const sheets = [];
if (sheetsDir && info.video) {
  const out = path.resolve(sheetsDir);
  fs.mkdirSync(out, { recursive: true });
  for (const f of fs.readdirSync(out)) if (/^sheet_\d+\.jpg$/.test(f)) fs.unlinkSync(path.join(out, f));
  const fonts = ['C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/segoeui.ttf', '/System/Library/Fonts/Supplemental/Arial.ttf', '/Library/Fonts/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf'];
  const font = fonts.find(f => fs.existsSync(f));
  if (font) fs.copyFileSync(font, path.join(tmp, 'font.ttf'));
  const zone = 'color=red@0.10:t=fill';
  const bands = safeZone ? [
    `drawbox=x=0:y=0:w=iw:h=ih*220/1920:${zone}`, `drawbox=x=0:y=ih*1470/1920:w=iw:h=ih*450/1920:${zone}`,
    `drawbox=x=0:y=ih*220/1920:w=iw*35/1080:h=ih*1250/1920:${zone}`, `drawbox=x=iw*1045/1080:y=ih*220/1920:w=iw*35/1080:h=ih*1250/1920:${zone}`,
    `drawbox=x=iw*980/1080:y=ih*1280/1920:w=iw*65/1080:h=ih*190/1920:${zone}`,
    `drawbox=x=iw*35/1080:y=ih*220/1920:w=iw*1010/1080:h=ih*1250/1920:color=red@0.8:t=6`].join(',') + ',' : '';
  const label = font ? ",drawtext=fontfile=font.ttf:text='%{pts\\:hms}':x=4:y=4:fontsize=16:fontcolor=yellow:box=1:boxcolor=black@0.7" : '';
  const vf = `fps=2,${bands}scale=200:-2${label},tile=8x2:padding=4:color=gray`;
  const pattern = path.join(out, 'sheet_%02d.jpg');
  const r = run(ffmpeg, ['-v', 'error', '-y', '-i', path.resolve(input), '-vf', vf, '-q:v', '3', pattern], { cwd: tmp, allowFail: true });
  if (r.status !== 0) run(ffmpeg, ['-v', 'error', '-y', '-i', path.resolve(input), '-vf', `fps=2,${bands}scale=200:-2,tile=8x2:padding=4:color=gray`, '-q:v', '3', pattern], { cwd: tmp });
  for (const f of fs.readdirSync(out).sort()) if (/^sheet_\d+\.jpg$/.test(f)) sheets.push(path.join(out, f));
}

const count = s => checks.filter(c => c.status === s).length;
const title = T ? `Format ${fmtKey} · ${T.name}` : 'no format given';
if (asJson) console.log(JSON.stringify({ file: input, format: fmtKey || null, metrics, checks, sheets }, null, 1));
else {
  console.log(`${path.basename(input)}  (${title})`);
  for (const c of checks) console.log(`  ${c.status.padEnd(4)}  ${c.label.padEnd(12)} ${c.detail}`);
  if (sheets.length) console.log(`  SHEETS ${sheets.length} contact sheet(s), 8 s each, red = unsafe margin: ${path.dirname(sheets[0])}`);
  console.log(`QC: ${count('PASS')} pass · ${count('WARN')} warn · ${count('FAIL')} fail`);
}
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(count('FAIL') ? 1 : 0);
