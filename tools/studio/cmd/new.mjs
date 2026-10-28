// Start a project from a source video: folders, probe, audio for the mix and for ASR, a source contact sheet
// (to spot burned-in captions or graphics before planning), a Parakeet transcript and project.json.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, probe, orientation, slugify, P, ffmpeg, hf, writeJson, rel, fmtT, HF_VERSION, loadWords } from '../lib/core.mjs';
import { contactSheet, spread } from '../lib/frames.mjs';

export const summary = 'Start a project: folders, probe, audio, source sheet, transcript, project.json';
export const usage = `studio new <source video> [--slug name] [--title "..."] [--client "..."] [--style my-editing-style|brand-nat-styles]
                   [--no-transcribe] [--force]
Creates projects/<slug>/ with work/, audio48k.wav (stereo, for the mix), audio16k.wav (mono, for ASR),
work/sheets/source.jpg (16 frames: look for burned-in captions and graphics before planning),
transcript.json (Parakeet word timings) and project.json. The source is referenced, never copied or changed.`;

export function run(argv) {
  const a = parseArgs(argv, ['no-transcribe', 'force']);
  const src = a._[0];
  if (!src) { console.log(usage); return 1; }
  const info = probe(src);
  const slug = slugify(a.slug || path.basename(src));
  const dir = path.join(P.projects, slug);
  if (fs.existsSync(path.join(dir, 'project.json')) && !a.force) throw new Error(`projects/${slug} already exists (choose --slug, or --force to redo the intake)`);
  fs.mkdirSync(path.join(dir, 'work', 'sheets'), { recursive: true });

  if (info.audio) {
    ffmpeg(['-v', 'error', '-y', '-i', src, '-map', '0:a:0', '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', path.join(dir, 'audio48k.wav')]);
    ffmpeg(['-v', 'error', '-y', '-i', src, '-map', '0:a:0', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', path.join(dir, 'audio16k.wav')]);
  }
  const sheet = path.join(dir, 'work', 'sheets', 'source.jpg');
  if (info.video) contactSheet(src, spread(0, info.duration, 16), sheet, { info, safe: 'none' });

  let words = [];
  if (info.audio && !a['no-transcribe']) {
    const r = hf(['transcribe', path.join(dir, 'audio16k.wav'), '--dir', dir, '--json'], { allowFail: true });
    fs.writeFileSync(path.join(dir, 'transcribe.log'), String(r.stderr || ''));
    if (r.stdout) fs.writeFileSync(path.join(dir, 'transcribe.out.json'), String(r.stdout));
    const t = path.join(dir, 'transcript.json');
    if (fs.existsSync(t)) words = loadWords(t);
    else console.warn(`transcription failed (exit ${r.status}); see ${rel(path.join(dir, 'transcribe.log'))}`);
  }

  const manifest = {
    slug, title: a.title || path.basename(src, path.extname(src)), client: a.client || null, style: a.style || null,
    created: new Date().toISOString().slice(0, 10), status: 'intake',
    source: {
      path: path.resolve(src), duration: +info.duration.toFixed(3), width: info.video?.displayWidth ?? null,
      height: info.video?.displayHeight ?? null, fps: info.video ? +info.video.fps.toFixed(3) : null,
      orientation: orientation(info), audio: !!info.audio,
    },
    hyperframes: HF_VERSION, deliverables: [], pipeline: [], notes: [], memory: null,
  };
  writeJson(path.join(dir, 'project.json'), manifest);

  console.log(`projects/${slug}: ${manifest.source.orientation} ${manifest.source.width}x${manifest.source.height} · ${fmtT(info.duration)} · ${info.audio ? 'audio' : 'no audio'}`);
  console.log(`  sheet       ${rel(sheet)}  (check for burned-in captions/graphics)`);
  if (words.length) console.log(`  transcript  ${words.length} words · first: "${words.slice(0, 10).map(w => w.text).join(' ')}"`);
  console.log(`  next        fix misheard names (memory has client spellings), write work/cuts.json, then: studio cut ${slug} work/cuts.json`);
  if (manifest.source.orientation === 'landscape') console.log('  note        landscape source: confirm the output size and one video vs. one per script before planning');
  return 0;
}
