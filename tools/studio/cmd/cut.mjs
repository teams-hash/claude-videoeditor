// Clean cut for any style: the house tighten.mjs sets audio-exact edges and trims inner pauses, then the
// rough cut is built the house roughcut way (frame-snapped pieces, cover crop, 10 ms fades, words re-timed),
// for any aspect, not only 9:16.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseArgs, num, probe, run as exec, ffmpeg, readJson, writeJson, loadWords, projectDir, BIN, rel, assertWritable } from '../lib/core.mjs';

export const summary = 'Tighten a cut list on the audio, then build the rough cut (any aspect) + re-timed words';
export const usage = `studio cut <project|source video> <cuts.json> [--aspect 9:16|16:9|1:1|4:5|source] [--width 1080] [--fps 30]
                [--transcript transcript.json] [-o work/rough.mp4] [--no-tighten] [--tighten-args "..."]
cuts.json: [{"id":"hook","in":0.60,"out":4.62,"text":"..."}] in SOURCE seconds, playback order; optional
"lead"/"tail"/"punch" as in the house tighten.mjs. Steps: tighten -> cuts.tight.json, then the rough cut and
<out>.words.json (kept words re-timed to the edit). Build at --width 2160 when reframe.mjs will punch in.
With a project slug, the source and transcript come from project.json and outputs land in work/.`;

export function run(argv) {
  const a = parseArgs(argv, ['no-tighten']);
  let [target, cutsPath] = a._;
  if (!target || !cutsPath) { console.log(usage); return 1; }
  const pd = projectDir(target);
  const man = pd && fs.existsSync(path.join(pd, 'project.json')) ? readJson(path.join(pd, 'project.json')) : null;
  const src = man ? man.source.path : target;
  if (pd && !fs.existsSync(cutsPath) && fs.existsSync(path.join(pd, cutsPath))) cutsPath = path.join(pd, cutsPath);
  const transcript = a.transcript || (pd && fs.existsSync(path.join(pd, 'transcript.json')) ? path.join(pd, 'transcript.json') : null);
  const out = a.out ? (pd && !path.isAbsolute(a.out) ? path.join(pd, a.out) : a.out) : path.join(pd || path.dirname(path.resolve(cutsPath)), pd ? 'work' : '', 'rough.mp4');
  assertWritable(out);

  // 1. Tighten on the audio (house script), unless asked not to.
  let tight = cutsPath;
  if (!a['no-tighten']) {
    tight = cutsPath.replace(/\.json$/i, '') + '.tight.json';
    const extra = a['tighten-args'] ? String(a['tighten-args']).split(/\s+/).filter(Boolean) : [];
    const r = exec(process.execPath, [path.join(BIN.houseScripts, 'tighten.mjs'), src, cutsPath, tight, ...(transcript ? ['--transcript', transcript] : []), ...extra]);
    console.log(String(r.stdout).trim().split(/\r?\n/).slice(-3).join('\n'));
  }

  // 2. Rough cut: same method as the house roughcut.mjs, with the target aspect.
  const info = probe(src);
  if (!info.video) throw new Error('source has no video stream');
  const fps = num(a.fps, 30), width = num(a.width, 1080);
  const asp = String(a.aspect || '9:16');
  let W = width, H;
  if (asp === 'source') H = Math.round(width * info.video.displayHeight / info.video.displayWidth / 2) * 2;
  else { const [x, y] = asp.split(':').map(Number); H = Math.round(width * y / x / 2) * 2; }
  const snap = x => Math.round(x * fps) / fps;
  const cuts = readJson(tight);
  if (!Array.isArray(cuts) || !cuts.length) throw new Error('cut list must be a non-empty array');
  cuts.forEach((c, i) => {
    if (!(typeof c.in === 'number' && typeof c.out === 'number' && c.out > c.in)) throw new Error(`cut ${i} (${c.id ?? '?'}) needs numeric in < out`);
    c.in = +snap(c.in).toFixed(4); c.out = +snap(c.out).toFixed(4);
  });
  const hasAudio = !!info.audio;
  let g = '';
  cuts.forEach((c, i) => {
    const d = c.out - c.in;
    g += `[0:v]trim=start=${c.in}:end=${c.out},setpts=PTS-STARTPTS,scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},setsar=1,fps=${fps}[v${i}];`;
    if (hasAudio) g += `[0:a]atrim=start=${c.in}:end=${c.out},asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:d=0.01,afade=t=out:st=${Math.max(0, d - 0.01).toFixed(3)}:d=0.01[a${i}];`;
  });
  g += cuts.map((_, i) => (hasAudio ? `[v${i}][a${i}]` : `[v${i}]`)).join('') + `concat=n=${cuts.length}:v=1:a=${hasAudio ? 1 : 0}[v]${hasAudio ? '[a]' : ''}`;
  const tail = ['-map', '[v]', ...(hasAudio ? ['-map', '[a]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000'] : []),
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out];
  if (g.length < 24000) ffmpeg(['-v', 'error', '-y', '-i', src, '-filter_complex', g, ...tail]);
  else {
    const script = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cut-')), 'graph.txt');
    fs.writeFileSync(script, g);
    ffmpeg(['-v', 'error', '-y', '-i', src, '-filter_complex_script', script, ...tail]);
  }

  let t = 0;
  const timeline = cuts.map(c => { const row = { id: c.id ?? '', start: +t.toFixed(3), srcIn: c.in, srcOut: c.out }; t += c.out - c.in; return row; });
  console.log(`rough cut ${cuts.length} pieces · ${t.toFixed(2)} s · ${W}x${H} @ ${fps} -> ${rel(out)}`);
  if (transcript) {
    const words = loadWords(transcript), kept = [];
    timeline.forEach((seg, i) => {
      const c = cuts[i];
      for (const w of words) {
        if (w.end <= c.in + 0.02 || w.start >= c.out - 0.02) continue;
        kept.push({ text: w.text, start: +(seg.start + Math.max(0, w.start - c.in)).toFixed(3), end: +(seg.start + Math.min(c.out, w.end) - c.in).toFixed(3), cut: seg.id });
      }
    });
    const wordsOut = out.replace(/\.[^.\\/]+$/, '') + '.words.json';
    writeJson(wordsOut, kept);
    console.log(`  ${kept.length} re-timed words -> ${rel(wordsOut)}  (verify by re-transcribing the rough: clipped words show up as changes)`);
  }
  writeJson(out.replace(/\.[^.\\/]+$/, '') + '.timeline.json', { fps, width: W, height: H, duration: +t.toFixed(3), pieces: timeline });
  return 0;
}
