// Technical QC on a render: format and platform spec, loudness and peaks, dead air, black and frozen frames,
// photosensitive flashes, cut slivers, hook and pace, plus contact sheets (safe zones tinted, hook strip,
// optional face boxes). Prints a short PASS/WARN/FAIL report; the qc-reviewer agent adds the judgement calls.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, num, probe, py, readJson, writeJson, loadWords, rel, outDirFor, BIN, fmtT } from '../lib/core.mjs';
import { videoPass, audioPass, perSecond, cutsFrom, flashes } from '../lib/analyze.mjs';
import { contactSheet, spread } from '../lib/frames.mjs';
import { check as platformCheck } from './export.mjs';

export const summary = 'Technical QC: spec, loudness, dead air, black/frozen/flash frames, pace, sheets';
export const usage = `studio qc <video> [--platform reels|tiktok|shorts|youtube|linkedin|x] [--transcript words.json] [--faces]
           [--dir out-folder] [--speech|--music] [--max-still 6] [--json]
Writes <dir>/qc.json, sheet.jpg (safe zones tinted), hook.jpg (first 3 s) and, with --faces, faces.jpg.
--transcript  words ON THE EDIT TIMELINE (rough.words.json) for an exact dead-air measure
--speech / --music  content type for the dead-air rule (default: speech when a transcript is given or the
                    video is vertical). Exit code 1 when anything FAILS. Pair with style_check.mjs for house rules.`;

export function run(argv) {
  const a = parseArgs(argv, ['faces', 'json', 'speech', 'music']);
  const file = a._[0];
  if (!file) { console.log(usage); return 1; }
  const info = probe(file);
  const name = path.basename(file, path.extname(file));
  const dir = path.resolve(a.dir || path.join(outDirFor(file, 'qc'), name));
  fs.mkdirSync(dir, { recursive: true });
  const vertical = info.video && info.video.displayHeight > info.video.displayWidth;
  const platform = a.platform || (vertical ? 'reels' : 'youtube');
  const R = [], add = (level, area, msg) => R.push({ level, area, msg });

  for (const i of platformCheck(info, platform)) add(i.level, 'spec', i.msg);
  if (info.video && info.audio && info.video.duration && info.audio.duration && Math.abs(info.video.duration - info.audio.duration) > 0.1)
    add('WARN', 'spec', `audio ${info.audio.duration.toFixed(2)} s vs video ${info.video.duration.toFixed(2)} s`);

  // Audio
  let au = null;
  if (info.audio) {
    au = audioPass(file);
    const target = -14, d = Math.abs(au.I - target);
    add(d <= 1 ? 'PASS' : d <= 2 ? 'WARN' : 'FAIL', 'loudness', `${au.I} LUFS integrated (target ${target} ±1), LRA ${au.LRA} LU`);
    add(au.truePeak <= -1 ? 'PASS' : au.truePeak <= -0.1 ? 'WARN' : 'FAIL', 'loudness', `true peak ${au.truePeak} dBTP (ceiling -1)`);
    if (au.samplePeak !== null && au.samplePeak >= -0.01) add('FAIL', 'loudness', `sample peak ${au.samplePeak} dBFS: clipped`);
    const speech = a.music ? false : (a.speech || !!a.transcript || vertical);
    let gaps;
    if (a.transcript) {
      const w = loadWords(a.transcript); gaps = [];
      for (let i = 1; i < w.length; i++) { const g = w[i].start - w[i - 1].end; if (g > 0.3) gaps.push({ start: w[i - 1].end, dur: g }); }
    } else gaps = au.silences.filter(s => s.dur && s.start > 0.3 && (s.end ?? info.duration) < info.duration - 0.3);
    const dead = gaps.reduce((s, g) => s + g.dur, 0), share = dead / info.duration;
    if (speech) add(share <= 0.05 ? 'PASS' : 'WARN', 'pace', `dead air ${(share * 100).toFixed(1)}% (${gaps.length} gaps over 0.3 s; budget 5%)` + (gaps.length ? `; longest ${Math.max(...gaps.map(g => g.dur)).toFixed(2)} s at ${fmtT(gaps.sort((x, y) => y.dur - x.dur)[0].start)}` : ''));
    const lead = au.silences.find(s => s.start <= 0.05);
    if (lead && lead.dur > 0.5) add('WARN', 'hook', `audio starts ${lead.dur.toFixed(2)} s in`);
  } else add('WARN', 'loudness', 'no audio to measure');

  // Picture
  let vp = null;
  if (info.video) {
    vp = videoPass(file);
    const fps = info.video.fps || 30, edge = 0.2;
    const midBlack = vp.black.filter(b => b.start > edge && b.end < info.duration - edge);
    add(midBlack.length ? 'FAIL' : 'PASS', 'picture', midBlack.length ? `black frames at ${midBlack.map(b => `${fmtT(b.start)} (${b.dur.toFixed(2)} s)`).join(', ')}` : 'no black frames mid-video');
    if (vp.frames[0] && (vp.frames[0].YAVG ?? 255) < 20) add('FAIL', 'hook', 'first frame is black: the hook must be on screen at frame 0');
    const longFreeze = vp.frozen.filter(f => (f.dur ?? 0) >= num(a['max-still'], 6) * 0.6);
    if (longFreeze.length) add('WARN', 'picture', `frozen picture ${longFreeze.map(f => `${fmtT(f.start)} for ${(f.dur ?? 0).toFixed(1)} s`).join(', ')}`);
    const fl = flashes(vp.frames, fps);
    add(fl.worstPerSecond > 3 ? 'FAIL' : fl.worstPerSecond > 2 ? 'WARN' : 'PASS', 'safety', `flashes: worst ${fl.worstPerSecond}/s${fl.at !== null ? ` at ${fmtT(fl.at)}` : ''} (photosensitivity limit 3/s)`);
    // Hard cuts score >= 10 on one frame; card entrances and punch-ins spread over frames, so "visible change"
    // is a per-second max >= 2.5 (talking-head motion stays under ~1.2). Calibrated on the c0473 v003 reels.
    const cuts = cutsFrom(vp.frames, 10), slivers = [];
    for (let i = 1; i < cuts.length; i++) if (cuts[i] - cuts[i - 1] < 0.1) slivers.push(cuts[i - 1]);
    add(slivers.length ? 'WARN' : 'PASS', 'picture', slivers.length ? `back-to-back changes under 0.1 s (slivers or flash frames) at ${slivers.slice(0, 6).map(fmtT).join(', ')}` : 'no 1-3 frame slivers between cuts');
    const ps = perSecond(vp.frames, info.duration), changes = ps.filter(s => s.change >= 2.5);
    let still = 0, worst = 0, worstAt = 0;
    for (const s of ps) { if (s.change >= 2.5) still = 0; else if (++still > worst) { worst = still; worstAt = s.t - still + 1; } }
    const limit = num(a['max-still'], vertical ? 6 : 12);
    add(worst > limit ? 'WARN' : 'PASS', 'pace', `${cuts.length} hard cuts, a visible change every ${(info.duration / Math.max(1, changes.length)).toFixed(1)} s on average; longest stretch without one ${worst} s at ${fmtT(worstAt)} (limit ${limit} s)`);
    const firstChange = changes.find(s => s.t > 0)?.t;
    if (vertical && (firstChange === undefined || firstChange > 3)) add('WARN', 'hook', `first visible change at ${firstChange === undefined ? 'never' : `${firstChange} s`} (vertical hooks usually change within 3 s)`);

    const n = Math.min(24, Math.max(8, Math.round(info.duration / 2.5)));
    const times = spread(0, info.duration, n);
    contactSheet(file, times, path.join(dir, 'sheet.jpg'), { info });
    contactSheet(file, [0, 0.5, 1, 1.5, 2, 2.5, 3].filter(t => t < info.duration), path.join(dir, 'hook.jpg'), { info, safe: 'none', cols: 7 });
    if (a.faces) {
      if (!fs.existsSync(BIN.py)) add('WARN', 'faces', 'Python media env missing; face check skipped');
      else {
        const fj = path.join(dir, 'faces.json');
        py('faces_yunet.py', ['--input', path.resolve(file), '--times', times.map(t => t.toFixed(3)).join(','), '--model', BIN.yunet, '--out', fj]);
        const rows = readJson(fj);
        const found = rows.filter(r => r.faces.length).length;
        contactSheet(file, times, path.join(dir, 'faces.jpg'), { info, boxesAt: t => (rows.find(r => Math.abs(r.t - t) < 0.01)?.faces || []) });
        add('INFO', 'faces', `face found in ${found}/${rows.length} samples; check faces.jpg: no caption or card may sit between eyes and chin`);
      }
    }
  }

  const fails = R.filter(r => r.level === 'FAIL').length, warns = R.filter(r => r.level === 'WARN').length;
  writeJson(path.join(dir, 'qc.json'), { file: rel(file), platform, duration: info.duration, results: R, audio: au && { I: au.I, LRA: au.LRA, truePeak: au.truePeak } });
  if (a.json) console.log(JSON.stringify(R, null, 1));
  else {
    console.log(`QC ${path.basename(file)} · ${fmtT(info.duration)} · ${platform}`);
    for (const r of R) console.log(`${r.level.padEnd(4)}  ${r.area.padEnd(8)} ${r.msg}`);
    console.log(`=> ${fails ? 'FAIL' : warns ? 'PASS with warnings' : 'PASS'} (${fails} fail, ${warns} warn) · sheets: ${rel(dir)}/sheet.jpg, hook.jpg${a.faces ? ', faces.jpg' : ''}`);
  }
  return fails ? 1 : 0;
}
