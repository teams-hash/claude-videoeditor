// Reference scan: the deterministic half of a reference breakdown. Measures shots and pace, picture change,
// brightness and palette, loudness, music tempo and beats, speech and the hook line, and renders three sheets
// (shots, hook, motion strips). Cached by content hash in LIBRARY/references, so no reference is scanned twice.
// The reference-analyst agent reads summary.md and the sheets and writes breakdown.md.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, probe, hf, run as exec, quickHash, slugify, readJson, writeJson, writeText, loadWords, rel, fmtT, P } from '../lib/core.mjs';
import { videoPass, audioPass, perSecond } from '../lib/analyze.mjs';
import { contactSheet } from '../lib/frames.mjs';
import { shots as findShots, paceStats } from './scenes.mjs';

export const summary = 'Reference scan: shots, pace, palette, loudness, tempo, hook, sheets (cached)';
export const usage = `studio refscan <video> [--slug name] [--force] [--no-transcribe]
Writes LIBRARY/references/<slug>/: scan.json, summary.md, shots.jpg, hook.jpg, motion.jpg, transcript.json.
Re-running on the same file returns the cached scan (by content hash) unless --force.
Next: the reference-analyst agent (or /ref) turns summary.md + sheets into breakdown.md with the template.`;

const DIR = path.join(P.library, 'references');
const IDX = path.join(DIR, 'index.json');

function palette(video, times, k = 6) {
  const px = [];
  for (const t of times) {
    const b = exec('ffmpeg', ['-v', 'error', '-ss', t.toFixed(3), '-i', path.resolve(video), '-frames:v', '1', '-vf', 'scale=48:-2', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { binary: true }).stdout;
    for (let i = 0; i + 2 < b.length; i += 3) px.push([b[i], b[i + 1], b[i + 2]]);
  }
  if (!px.length) return [];
  const lum = p => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  const sorted = [...px].sort((p, q) => lum(p) - lum(q));
  let c = Array.from({ length: k }, (_, i) => [...sorted[Math.floor((i + 0.5) * sorted.length / k)]]);
  let assign = new Array(px.length).fill(0);
  for (let it = 0; it < 12; it++) {
    const sum = c.map(() => [0, 0, 0, 0]);
    px.forEach((p, i) => {
      let best = 0, bd = Infinity;
      c.forEach((q, j) => { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2; if (d < bd) { bd = d; best = j; } });
      assign[i] = best; const s = sum[best]; s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; s[3]++;
    });
    c = sum.map((s, j) => (s[3] ? [s[0] / s[3], s[1] / s[3], s[2] / s[3]] : c[j]));
  }
  const share = c.map((_, j) => assign.filter(a => a === j).length / px.length);
  const hex = q => '#' + q.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  return c.map((q, j) => ({ hex: hex(q), share: +share[j].toFixed(3) })).sort((p, q) => q.share - p.share);
}

function hfAudio(video) {
  const r = hf(['audio', path.resolve(video), '--only', 'kind,bpm,beats,onsets,loudness,silence', '--quality', 'local'], { allowFail: true });
  const t = String(r.stdout || '').replace(/\x1b\[[0-9;]*m/g, '');
  const kind = (t.match(/\d s\s+(speech|music|mixed|silence|sfx|[a-z]+) \(([\d.]+)\)/) || []);
  const bpm = t.match(/tempo ([\d.]+) BPM/);
  const beats = t.match(/beats (\d+): ([\d. ]+)/);
  const hits = t.match(/hits ([^\n]+)/);
  const hitCount = hits ? (hits[1].match(/\d+\.\d+\(/g) || []).length + Number((hits[1].match(/\+(\d+)/) || [0, 0])[1]) : null;
  return { kind: kind[1] || null, kindConf: kind[2] ? Number(kind[2]) : null, bpm: bpm ? Number(bpm[1]) : null,
    beats: beats ? Number(beats[1]) : null, firstBeat: beats ? Number(beats[2].trim().split(/\s+/)[0]) : null, hits: hitCount };
}

export function run(argv) {
  const a = parseArgs(argv, ['force', 'no-transcribe']);
  const video = a._[0];
  if (!video) { console.log(usage); return 1; }
  const id = quickHash(video);
  const idx = fs.existsSync(IDX) ? readJson(IDX) : { references: [] };
  const hit = idx.references.find(r => r.id === id);
  if (hit && hit.scan && !a.force && fs.existsSync(path.resolve(P.library, '..', hit.scan))) {
    // A breakdown written since the scan (by the reference-analyst) gets recorded here.
    const bd = path.join(DIR, hit.slug, 'breakdown.md');
    if (fs.existsSync(bd) && hit.breakdown !== rel(bd)) { hit.breakdown = rel(bd); writeJson(IDX, idx); }
    console.log(`cached: ${hit.slug} · scan ${hit.scan}${hit.breakdown ? ` · breakdown ${hit.breakdown}` : ' · no breakdown yet'}${hit.house ? ` · house notes ${hit.house}` : ''}`);
    return 0;
  }
  const info = probe(video);
  const slug = slugify(a.slug || hit?.slug || path.basename(video).split('_')[0]);
  const out = path.join(DIR, slug);
  fs.mkdirSync(out, { recursive: true });
  const W = info.video.displayWidth, H = info.video.displayHeight, vertical = H > W;

  const sh = findShots(video), pace = paceStats(sh);
  const vp = videoPass(video), ps = perSecond(vp.frames, info.duration);
  // Short gaps matter in references: music drop-outs before a phrase run 0.15-0.3 s (house sound rules).
  const au = info.audio ? audioPass(video, { silenceMin: 0.12, silenceDb: -40 }) : null;
  const ha = info.audio ? hfAudio(video) : {};
  let words = [];
  if (info.audio && !a['no-transcribe']) {
    hf(['transcribe', path.resolve(video), '--dir', out, '--json'], { allowFail: true });
    if (fs.existsSync(path.join(out, 'transcript.json'))) words = loadWords(path.join(out, 'transcript.json'));
  }
  const speechSec = words.reduce((s, w) => s + Math.max(0, w.end - w.start), 0);
  const mids = sh.shots.map(s => (s.t0 + s.t1) / 2);
  const shotLook = sh.shots.map(s => {
    const f = vp.frames.filter(x => x.t >= s.t0 && x.t < s.t1);
    const avg = k => f.length ? +(f.reduce((m, x) => m + (x[k] || 0), 0) / f.length).toFixed(0) : null;
    return { ...s, luma: avg('YAVG'), sat: avg('SATAVG') };
  });
  const pal = palette(video, mids.filter((_, i) => i % Math.max(1, Math.ceil(mids.length / 12)) === 0));

  // Sheets: every shot (up to 30), the first 3 s, and motion strips around the 3 biggest changes after 3 s.
  const shotTimes = mids.length > 30 ? mids.filter((_, i) => i % Math.ceil(mids.length / 30) === 0) : mids;
  contactSheet(video, shotTimes, path.join(out, 'shots.jpg'), { info, safe: 'none', labels: shotTimes.map(t => `${t.toFixed(1)}s`) });
  const hook = Array.from({ length: 13 }, (_, i) => i * 0.25).filter(t => t < info.duration);
  contactSheet(video, hook, path.join(out, 'hook.jpg'), { info, safe: 'none', cols: 7 });
  const peaks = [...vp.frames].filter(f => f.t > 3 && f.t < info.duration - 0.6).sort((p, q) => (q.scene || 0) - (p.scene || 0));
  const moments = [];
  for (const f of peaks) { if (moments.length >= 3) break; if (moments.every(m => Math.abs(m - f.t) > 1.5)) moments.push(f.t); }
  moments.sort((p, q) => p - q);
  const strip = moments.flatMap(m => [-0.2, -0.067, 0.067, 0.2, 0.333, 0.5].map(d => +(m + d).toFixed(3)));
  if (strip.length) contactSheet(video, strip, path.join(out, 'motion.jpg'), { info, safe: 'none', cols: 6, tile: vertical ? 220 : 320 });

  const scan = {
    id, slug, file: rel(video), scanned: new Date().toISOString().slice(0, 10),
    format: { width: W, height: H, fps: +info.video.fps.toFixed(3), duration: +info.duration.toFixed(2) },
    pace, shots: shotLook, changePerSecond: ps.map(s => s.change),
    look: { lumaAvg: +(vp.frames.reduce((m, f) => m + (f.YAVG || 0), 0) / vp.frames.length).toFixed(0), satAvg: +(vp.frames.reduce((m, f) => m + (f.SATAVG || 0), 0) / vp.frames.length).toFixed(0), palette: pal },
    audio: au ? { I: au.I, LRA: au.LRA, truePeak: au.truePeak, silences: au.silences.length, ...ha } : null,
    speech: words.length ? { words: words.length, wpm: Math.round(words.length / (info.duration / 60)), coverage: +(speechSec / info.duration).toFixed(2),
      hook: words.filter(w => w.start < 3).map(w => w.text).join(' '), text: words.map(w => w.text).join(' ') } : null,
    sheets: { shots: 'shots.jpg', hook: 'hook.jpg', motion: strip.length ? 'motion.jpg' : null, motionMoments: moments },
  };
  writeJson(path.join(out, 'scan.json'), scan);

  const md = [
    `# Reference scan: ${slug}`, '',
    `${scan.file} · ${W}x${H} · ${scan.format.fps} fps · ${fmtT(info.duration)} · scanned ${scan.scanned} · id ${id}`, '',
    '## Pace',
    `${pace.shots} shots (${sh.engine}) · average ${pace.asl} s · median ${pace.median} s · ${pace.cutsPerMin} cuts/min · shortest ${pace.shortest} s · longest ${pace.longest} s`,
    `visible change per second (scene score; >=2.5 is a visible change): ${scan.changePerSecond.map(v => (v >= 2.5 ? Math.round(v) : '.')).join(' ')}`, '',
    '## Shots', '| # | in | out | dur | luma | sat |', '|---|---|---|---|---|---|',
    ...shotLook.slice(0, 40).map(s => `| ${s.i} | ${s.t0.toFixed(2)} | ${s.t1.toFixed(2)} | ${s.dur.toFixed(2)} | ${s.luma} | ${s.sat} |`), '',
    '## Look', `average luma ${scan.look.lumaAvg}/255 · average saturation ${scan.look.satAvg} · palette ${pal.map(p => `${p.hex} ${Math.round(p.share * 100)}%`).join(', ')}`, '',
    '## Sound',
    au ? `${au.I} LUFS · LRA ${au.LRA} LU · true peak ${au.truePeak} dBTP · content ${ha.kind ?? '?'} (${ha.kindConf ?? '?'}) · ~${ha.hits ?? '?'} hits` : 'no audio',
    au && ha.bpm ? `tempo ${ha.bpm} BPM, ${ha.beats ?? '?'} beats from ${ha.firstBeat ?? '?'} s. Detectors often lock to a related tempo: also check ${(ha.bpm * 1.5).toFixed(1)} (3:2), ${(ha.bpm * 2).toFixed(1)} (2x) and ${(ha.bpm / 2).toFixed(1)} (1/2) against the cut rhythm.` : '',
    au ? `gaps ≥ 0.12 s under −40 dBFS (phrase drop-outs, pauses): ${au.silences.length ? au.silences.slice(0, 20).map(s => `${s.start.toFixed(2)}s/${Math.round((s.dur ?? 0) * 1000)}ms`).join(', ') : 'none'}` : '',
    'SFX by category are not measured: listen at the hits, or compare onsets with `npx hyperframes audio <file> --only onsets` around cuts.', '',
    '## Speech',
    scan.speech ? `${scan.speech.words} words · ${scan.speech.wpm} wpm · speech covers ${Math.round(scan.speech.coverage * 100)}% of the runtime\nHook (first 3 s): "${scan.speech.hook}"\nTranscript: ${scan.speech.text.slice(0, 900)}${scan.speech.text.length > 900 ? '…' : ''}` : 'no speech detected', '',
    '## Sheets', `shots.jpg (one frame per shot) · hook.jpg (0-3 s every 0.25 s) · ${strip.length ? `motion.jpg (rows = moments at ${moments.map(m => m.toFixed(2)).join(', ')} s; frames -0.2 to +0.5 s)` : 'no motion strips'}`,
  ].join('\n');
  writeText(path.join(out, 'summary.md'), md + '\n');

  const bdFile = path.join(out, 'breakdown.md');
  // breakdown = the studio's breakdown.md; house = a pointer to the house-style notes (kept, never overwritten).
  const entry = { id, slug, file: rel(video), duration: +info.duration.toFixed(2), scanned: scan.scanned, scan: rel(path.join(out, 'scan.json')), breakdown: fs.existsSync(bdFile) ? rel(bdFile) : (hit?.breakdown || null), house: hit?.house || null, notes: hit?.notes || null };
  idx.references = [...idx.references.filter(r => r.id !== id), entry].sort((p, q) => p.slug.localeCompare(q.slug));
  writeJson(IDX, idx);
  console.log(`${slug}: ${pace.shots} shots · ASL ${pace.asl}s · ${ha.kind ?? 'no audio'}${ha.bpm ? ` ${ha.bpm} BPM` : ''} · ${scan.speech ? `${scan.speech.wpm} wpm` : 'no speech'} -> ${rel(out)}/summary.md (+ shots.jpg, hook.jpg, motion.jpg)`);
  return 0;
}
