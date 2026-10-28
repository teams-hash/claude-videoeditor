// Shared helpers for the studio toolkit: studio paths, argument parsing, running ffmpeg / ffprobe /
// HyperFrames / the Python media env, probing media, decoding audio, and writes that refuse to touch originals.
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const STUDIO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const P = {
  raw: path.join(STUDIO, 'RAW FOOTAGES'),
  refs: path.join(STUDIO, 'REFERENCES'),
  exports: path.join(STUDIO, 'EXPORTS'),
  projects: path.join(STUDIO, 'projects'),
  library: path.join(STUDIO, 'LIBRARY'),
  scratch: path.join(STUDIO, '_scratch'),
};
export const IS_WIN = process.platform === 'win32';
// venv layout differs by platform: Scripts/python.exe on Windows, bin/python elsewhere.
const venvPy = dir => path.join(dir, ...(IS_WIN ? ['Scripts', 'python.exe'] : ['bin', 'python']));
// The house skills ship in the repo (.claude/skills); ~/.claude/skills is the fallback (HyperFrames' skills install there).
export const skillDir = name => [path.join(STUDIO, '.claude', 'skills', name), path.join(os.homedir(), '.claude', 'skills', name)]
  .find(d => fs.existsSync(d)) || path.join(STUDIO, '.claude', 'skills', name);
export const BIN = {
  py: venvPy(path.join(STUDIO, 'tools', 'py', 'venv')),
  pyScripts: path.join(STUDIO, 'tools', 'studio', 'py'),
  rvmPy: venvPy(path.join(STUDIO, 'tools', 'rvm', 'venv')),
  rvm: path.join(STUDIO, 'tools', 'rvm', 'rvm_matte.py'),
  dfn: path.join(STUDIO, 'tools', 'bin', 'deepfilternet', IS_WIN ? 'deep-filter.exe' : 'deep-filter'),
  yunet: path.join(STUDIO, 'tools', 'models', 'yunet', 'face_detection_yunet_2023mar.onnx'),
  houseScripts: path.join(skillDir('my-editing-style'), 'scripts'),
};
// HyperFrames CLI version for new work; existing projects keep the version pinned in their package.json.
export const HF_VERSION = process.env.HF_VERSION || '0.8.209';
const NPX_CLI = path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npx-cli.js');
// drawtext runs with the font's folder as cwd so the font path carries no drive colon to escape.
// STUDIO_LABEL_FONT overrides; otherwise the first bold sans found on this platform.
const LABEL_FONTS = [
  process.env.STUDIO_LABEL_FONT,
  'C:/Windows/Fonts/arialbd.ttf',
  '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
  '/Library/Fonts/Arial Bold.ttf',
  '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/dejavu-sans-fonts/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/TTF/DejaVuSans-Bold.ttf',
  '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
].filter(Boolean);
const labelFont = LABEL_FONTS.find(f => fs.existsSync(f)) || LABEL_FONTS[0];
export const LABEL_FONT_DIR = path.dirname(labelFont);
export const LABEL_FONT = path.basename(labelFont);
// Paths under the home folder are stored as ~/... so shared JSON (the SFX index) works on every machine.
export const homeRel = f => { const h = os.homedir(), a = path.resolve(f); return a.toLowerCase().startsWith(h.toLowerCase() + path.sep) ? '~/' + path.relative(h, a).replace(/\\/g, '/') : f; };
export const fromHome = f => (/^~[\\/]/.test(f) ? path.join(os.homedir(), f.slice(2)) : f);

// --key value, --key=value, boolean --flag (listed in `flags`), -o out, positionals in a._
export function parseArgs(argv, flags = []) {
  const a = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '-o') { a.out = argv[++i]; continue; }
    if (!t.startsWith('--')) { a._.push(t); continue; }
    const eq = t.indexOf('=');
    const k = eq > 0 ? t.slice(2, eq) : t.slice(2);
    if (eq > 0) a[k] = t.slice(eq + 1);
    else if (flags.includes(k) || i + 1 >= argv.length || argv[i + 1].startsWith('--')) a[k] = true;
    else a[k] = argv[++i];
  }
  return a;
}
export const num = (v, d) => (v === undefined || v === true || v === '' || Number.isNaN(Number(v)) ? d : Number(v));

export function run(bin, args, o = {}) {
  const r = spawnSync(bin, args, {
    encoding: o.binary ? 'buffer' : 'utf8', maxBuffer: 1 << 30, cwd: o.cwd, input: o.input, windowsHide: true,
    env: o.env ? { ...process.env, ...o.env } : process.env, stdio: o.inherit ? 'inherit' : 'pipe',
  });
  if (r.error) throw r.error;
  if (r.status !== 0 && !o.allowFail) {
    const tail = String(r.stderr || r.stdout || '').trim().split(/\r?\n/).slice(-12).join('\n');
    throw new Error(`${path.basename(bin)} exited ${r.status}\n${tail}`);
  }
  return r;
}
export const ffmpeg = (args, o) => run('ffmpeg', ['-hide_banner', '-nostdin', ...args], o);
export const ffprobe = (args, o) => run('ffprobe', args, o);
export function hf(args, o = {}) {
  if (fs.existsSync(NPX_CLI)) return run(process.execPath, [NPX_CLI, '--yes', `hyperframes@${HF_VERSION}`, ...args], o);
  return run('npx', ['--yes', `hyperframes@${HF_VERSION}`, ...args], { ...o, shell: true });
}
export function py(script, args, o = {}) {
  if (!fs.existsSync(BIN.py)) throw new Error('Python media env missing: tools/py/venv (see tools/studio/README.md to rebuild it)');
  return run(BIN.py, [path.join(BIN.pyScripts, script), ...args], o);
}

export function probe(file) {
  if (!fs.existsSync(file)) throw new Error(`not found: ${file}`);
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', file]).stdout);
  const v = j.streams.find(s => s.codec_type === 'video' && !s.disposition?.attached_pic);
  const a = j.streams.find(s => s.codec_type === 'audio');
  const rate = s => { if (!s || s === '0/0') return null; const [n, d] = s.split('/').map(Number); return d ? n / d : n; };
  let video = null;
  if (v) {
    const sd = (v.side_data_list || []).find(x => x.rotation !== undefined);
    const rotation = Number(sd?.rotation ?? v.tags?.rotate ?? 0);
    const turned = Math.abs(rotation) % 180 === 90;
    const avg = rate(v.avg_frame_rate), real = rate(v.r_frame_rate);
    video = {
      codec: v.codec_name, profile: v.profile, width: v.width, height: v.height,
      displayWidth: turned ? v.height : v.width, displayHeight: turned ? v.width : v.height, rotation,
      fps: avg || real, vfr: !!(avg && real && Math.abs(avg - real) > 0.02), pixFmt: v.pix_fmt,
      bitrate: Number(v.bit_rate) || null, duration: Number(v.duration) || null,
      color: [v.color_primaries, v.color_transfer, v.color_space].filter(Boolean).join('/') || null,
    };
  }
  const audio = a ? { codec: a.codec_name, sampleRate: Number(a.sample_rate), channels: a.channels, bitrate: Number(a.bit_rate) || null, duration: Number(a.duration) || null } : null;
  return {
    file: path.resolve(file), duration: Number(j.format.duration) || video?.duration || audio?.duration || 0,
    size: Number(j.format.size), bitrate: Number(j.format.bit_rate) || null, format: j.format.format_name, video, audio,
  };
}
export const orientation = p => { const w = p.video?.displayWidth, h = p.video?.displayHeight; return !w ? 'audio' : w > h ? 'landscape' : w < h ? 'portrait' : 'square'; };

// First audio stream as mono float32 samples.
export function decodeMono(file, sr = 16000, o = {}) {
  const args = ['-v', 'error'];
  if (o.start) args.push('-ss', String(o.start));
  args.push('-i', file);
  if (o.dur) args.push('-t', String(o.dur));
  args.push('-map', '0:a:0', '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-');
  const b = run('ffmpeg', args, { binary: true }).stdout;
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.length));
}
// RMS level per window, in dBFS.
export function windowDb(x, sr, winMs = 50) {
  const n = Math.max(1, Math.round(sr * winMs / 1000)), out = [];
  for (let i = 0; i + n <= x.length; i += n) { let s = 0; for (let k = i; k < i + n; k++) s += x[k] * x[k]; out.push(10 * Math.log10(s / n + 1e-12)); }
  return out;
}
export function percentile(arr, p) { if (!arr.length) return NaN; const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.max(0, Math.round((s.length - 1) * p)))]; }

const PROTECTED = [P.raw, P.refs].map(p => p.toLowerCase());
export function isProtected(file) {
  const abs = path.resolve(file).toLowerCase();
  return PROTECTED.some(p => abs === p || abs.startsWith(p + path.sep));
}
export function assertWritable(file) {
  if (isProtected(file)) throw new Error(`refusing to write inside RAW FOOTAGES or REFERENCES (originals are read-only): ${file}`);
  fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  return file;
}
export const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
export function writeJson(f, data, pretty = 1) { assertWritable(f); fs.writeFileSync(f, JSON.stringify(data, null, pretty) + '\n'); return f; }
export function writeText(f, text) { assertWritable(f); fs.writeFileSync(f, text); return f; }
export const tmpDir = (tag = 'studio') => fs.mkdtempSync(path.join(os.tmpdir(), `${tag}-`));

// Word timings from any transcript shape the studio produces: [{text,start,end}], {words:[...]},
// or HyperFrames JSON lines ({"type":"words","words":[...]} per line).
export function loadWords(file) {
  let j;
  try { j = readJson(file); }
  catch { j = fs.readFileSync(file, 'utf8').split(/\r?\n/).flatMap(l => { try { return JSON.parse(l).words || []; } catch { return []; } }); }
  const words = Array.isArray(j) ? j : (j.words || j.segments?.flatMap(s => s.words || []) || []);
  return words.filter(w => typeof w.start === 'number' && typeof w.end === 'number')
    .map(w => ({ text: String(w.text ?? w.word ?? '').trim(), start: w.start, end: w.end })).sort((a, b) => a.start - b.start);
}

// Project folder from a slug, a project path, or any path inside a project.
export function projectDir(arg) {
  if (!arg) return null;
  const direct = path.join(P.projects, arg);
  if (fs.existsSync(path.join(direct, 'project.json')) || (fs.existsSync(direct) && fs.statSync(direct).isDirectory())) return direct;
  let d = path.resolve(arg);
  while (d.length > P.projects.length) {
    if (path.dirname(d) === P.projects) return d;
    d = path.dirname(d);
  }
  return null;
}
// Default place for outputs about a file: its project's work/<sub>, else _scratch/<sub>.
export function outDirFor(file, sub) {
  const pd = projectDir(file);
  return pd ? path.join(pd, 'work', sub) : path.join(P.scratch, sub);
}

// Cheap content id: size plus the first and last 2 MB.
export function quickHash(file) {
  const st = fs.statSync(file), fd = fs.openSync(file, 'r'), n = Math.min(2 << 20, st.size);
  const h = crypto.createHash('sha1').update(String(st.size));
  const buf = Buffer.alloc(n);
  fs.readSync(fd, buf, 0, n, 0); h.update(buf);
  fs.readSync(fd, buf, 0, n, Math.max(0, st.size - n)); h.update(buf);
  fs.closeSync(fd);
  return h.digest('hex').slice(0, 16);
}

export const slugify = s => String(s).toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'untitled';
export const fmtS = s => `${Number(s).toFixed(2)}s`;
export const fmtT = s => { s = Math.max(0, s); const m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, '0')}`; };
export const fmtBytes = b => (b >= 1 << 30 ? `${(b / (1 << 30)).toFixed(2)} GB` : b >= 1 << 20 ? `${(b / (1 << 20)).toFixed(1)} MB` : `${Math.round(b / 1024)} KB`);
export const rel = f => { const r = path.relative(STUDIO, path.resolve(f)); return r.startsWith('..') ? path.resolve(f) : r.replace(/\\/g, '/'); };
