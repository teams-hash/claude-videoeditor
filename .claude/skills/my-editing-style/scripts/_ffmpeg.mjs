// Shared helpers: find ffmpeg/ffprobe, run them, probe files, decode audio.
// Lookup order: FFMPEG_PATH / FFPROBE_PATH env vars, PATH, then ffmpeg-static / ffprobe-static
// installed in the current project (npm install ffmpeg-static ffprobe-static).
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const cache = {};

export function findTool(name) {
  if (cache[name]) return cache[name];
  const env = process.env[`${name.toUpperCase()}_PATH`];
  if (env && fs.existsSync(env)) return (cache[name] = env);
  const r = spawnSync(name, ['-version'], { encoding: 'utf8' });
  if (!r.error && r.status === 0) return (cache[name] = name);
  const req = createRequire(path.join(process.cwd(), 'package.json'));
  try {
    const p = name === 'ffmpeg' ? req('ffmpeg-static') : req('ffprobe-static').path;
    if (p && fs.existsSync(p)) return (cache[name] = p);
  } catch {}
  throw new Error(`${name} not found. Put it on PATH, set ${name.toUpperCase()}_PATH, or run "npm install ffmpeg-static ffprobe-static" in the project folder.`);
}

export function run(bin, args, opts = {}) {
  const r = spawnSync(bin, args, { encoding: opts.encoding ?? 'utf8', maxBuffer: 1 << 30, cwd: opts.cwd });
  if (r.error) throw r.error;
  if (r.status !== 0 && !opts.allowFail) {
    const tail = String(r.stderr || '').trim().split(/\r?\n/).slice(-8).join('\n');
    throw new Error(`${path.basename(bin)} exited with ${r.status}:\n${tail}`);
  }
  return r;
}

export function probe(file) {
  const r = run(findTool('ffprobe'), ['-v', 'error', '-show_entries',
    'format=duration:stream=codec_type,width,height,avg_frame_rate,sample_rate,channels', '-of', 'json', file]);
  const j = JSON.parse(r.stdout);
  const v = j.streams.find(s => s.codec_type === 'video');
  const a = j.streams.find(s => s.codec_type === 'audio');
  let fps = null;
  if (v && v.avg_frame_rate && v.avg_frame_rate !== '0/0') {
    const [n, d] = v.avg_frame_rate.split('/').map(Number);
    fps = d ? n / d : n;
  }
  return {
    duration: Number(j.format.duration),
    video: v ? { width: v.width, height: v.height, fps } : null,
    audio: a ? { sampleRate: Number(a.sample_rate), channels: a.channels } : null,
  };
}

// Decode the first audio stream to mono float samples.
export function decodeMono(file, sampleRate = 48000) {
  const r = spawnSync(findTool('ffmpeg'), ['-v', 'error', '-i', file, '-map', '0:a:0', '-ac', '1', '-ar', String(sampleRate), '-f', 'f32le', '-'], { maxBuffer: 1 << 30 });
  if (r.error) throw r.error;
  const b = r.stdout;
  const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
  return new Float32Array(ab, 0, Math.floor(b.length / 4));
}

export function flag(argv, name, fallback = undefined) {
  const i = argv.indexOf(name);
  return i >= 0 && i + 1 < argv.length ? argv[i + 1] : fallback;
}

export function loadWords(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const words = Array.isArray(j) ? j : (j.words || []);
  return words.filter(w => typeof w.start === 'number' && typeof w.end === 'number').sort((a, b) => a.start - b.start);
}
