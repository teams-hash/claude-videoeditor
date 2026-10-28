#!/usr/bin/env node
// Studio setup, the same on Windows, macOS and Linux: everything git does not carry is rebuilt or downloaded here.
// install.bat / install.sh install the system tools (Node, Python, FFmpeg) first, then run this script.
//   node tools/setup/setup.mjs            full setup (safe to re-run: finished steps are skipped)
//   node tools/setup/setup.mjs --check    verify only, change nothing
// Options: --no-matte (skip the ~120 MB matting models and env), --no-hf-skills (leave ~/.claude/skills alone),
//          --force (re-download assets and reinstall the Python envs)
import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const argv = process.argv.slice(2);
const opt = f => argv.includes(f);
if (opt('--help') || opt('-h')) { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 7).map(l => l.replace(/^\/\/ ?/, '')).join('\n')); process.exit(0); }
const CHECK = opt('--check'), FORCE = opt('--force'), MATTE = !opt('--no-matte'), HF_SKILLS = !opt('--no-hf-skills');
const IS_WIN = process.platform === 'win32';
const PLAT = `${process.platform}-${process.arch}`;
const STUDIO = path.join(ROOT, 'tools', 'studio', 'studio.mjs');
const HF_VERSION = process.env.HF_VERSION || '0.8.209';
const results = [];
const ok = (step, msg) => { results.push({ step, state: 'ok' }); console.log(`  ok    ${step}${msg ? `: ${msg}` : ''}`); };
const warn = (step, msg) => { results.push({ step, state: 'warn', msg }); console.log(`  warn  ${step}: ${msg}`); };
const fail = (step, msg) => { results.push({ step, state: 'fail', msg }); console.log(`  FAIL  ${step}: ${msg}`); };
const head = t => console.log(`\n== ${t}`);

function sh(bin, args, o = {}) {
  const r = spawnSync(bin, args, { encoding: 'utf8', cwd: o.cwd || ROOT, stdio: o.inherit ? 'inherit' : 'pipe', shell: o.shell, maxBuffer: 1 << 28, env: { ...process.env, ...o.env } });
  return { code: r.error ? -1 : r.status, out: `${r.stdout || ''}${r.stderr || ''}`, error: r.error };
}
// npm/npx are .cmd shims on Windows, which spawn only through a shell.
const npmBin = n => (IS_WIN ? `${n}.cmd` : n);
const npm = (n, args, o = {}) => sh(npmBin(n), args.map(a => (IS_WIN && /\s/.test(a) ? `"${a}"` : a)), { ...o, shell: IS_WIN });
const venvPy = dir => path.join(dir, ...(IS_WIN ? ['Scripts', 'python.exe'] : ['bin', 'python']));
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');
const sha256 = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const studio = (args, o) => sh(process.execPath, [STUDIO, ...args], o);

// ---------------------------------------------------------------------------------------------------------------
head('System tools');
const [major] = process.versions.node.split('.').map(Number);
if (major >= 22) ok('Node.js', process.versions.node); else fail('Node.js', `${process.versions.node} found, 22 or newer needed (HyperFrames)`);

// FFmpeg: on PATH, plus the filters and encoders the toolkit calls. A "full" build has them all.
const NEED_FILTERS = ['drawtext', 'ebur128', 'loudnorm', 'haldclutsrc', 'lut3d', 'scdet', 'alphamerge', 'tpad', 'sidechaincompress', 'deesser',
  'blackdetect', 'freezedetect', 'silencedetect', 'zoompan', 'tile'];
const ff = sh('ffmpeg', ['-hide_banner', '-version']), fp = sh('ffprobe', ['-hide_banner', '-version']);
if (ff.code !== 0 || fp.code !== 0) fail('FFmpeg', 'ffmpeg/ffprobe not on PATH. Run install.bat / install.sh, or see docs/INSTALL.md');
else {
  const ver = ff.out.match(/ffmpeg version (\S+)/)?.[1];
  const filters = sh('ffmpeg', ['-hide_banner', '-filters']).out;
  const missing = NEED_FILTERS.filter(f => !new RegExp(`\\s${f}\\s`).test(filters));
  const enc = sh('ffmpeg', ['-hide_banner', '-encoders']).out;
  if (!/libx264/.test(enc)) missing.push('libx264 encoder');
  if (missing.length) fail('FFmpeg', `${ver} lacks ${missing.join(', ')}; install a full build (docs/INSTALL.md)`);
  else ok('FFmpeg', `${ver} with every filter the toolkit uses`);
}

// Python 3.12 (3.11-3.13 work with the pinned wheels; 3.12 is the tested one).
function findPython() {
  const cands = IS_WIN ? [['py', ['-3.12']], ['py', ['-3']], ['python', []]] : [['python3.12', []], ['python3', []], ['python', []]];
  for (const [bin, pre] of cands) {
    const r = sh(bin, [...pre, '-c', 'import sys; print("%d.%d" % sys.version_info[:2])']);
    const v = r.code === 0 && r.out.trim().match(/^3\.(\d+)$/m);
    if (v && Number(v[1]) >= 11 && Number(v[1]) <= 13) return { bin, pre, ver: `3.${v[1]}` };
  }
  return null;
}
const PY = findPython();
if (PY) ok('Python', `${PY.ver} (${[PY.bin, ...PY.pre].join(' ')})`); else fail('Python', '3.12 not found (3.11-3.13 accepted). Run the installer, or see docs/INSTALL.md');
const git = sh('git', ['--version']);
if (git.code === 0) ok('Git', git.out.trim()); else warn('Git', 'not found (only needed to clone and update the repo)');

// ---------------------------------------------------------------------------------------------------------------
head('Studio folders');
for (const d of ['RAW FOOTAGES', 'REFERENCES', 'EXPORTS', 'projects', '_scratch']) {
  const p = path.join(ROOT, d);
  if (fs.existsSync(p)) continue;
  if (CHECK) { warn('folders', `${d}/ missing (setup creates it)`); continue; }
  fs.mkdirSync(p, { recursive: true });
}
if (!results.some(r => r.step === 'folders')) ok('folders', 'RAW FOOTAGES, REFERENCES, EXPORTS, projects, _scratch');

// ---------------------------------------------------------------------------------------------------------------
function venv(step, dir, reqs, test) {
  const py = venvPy(dir);
  if (!CHECK && PY && (FORCE || !fs.existsSync(py) || sh(py, ['-c', test]).code !== 0)) {
    console.log(`  ...   ${step}: building ${rel(dir)} (a few minutes the first time)`);
    if (FORCE && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    if (!fs.existsSync(py)) { const r = sh(PY.bin, [...PY.pre, '-m', 'venv', dir]); if (r.code !== 0) return fail(step, `venv: ${r.out.trim().slice(-300)}`); }
    sh(py, ['-m', 'pip', 'install', '--upgrade', '--quiet', 'pip']);
    const r = sh(py, ['-m', 'pip', 'install', '--quiet', '-r', reqs], { inherit: true });
    if (r.code !== 0) return fail(step, `pip install -r ${rel(reqs)} failed`);
  }
  if (!fs.existsSync(py)) return CHECK ? fail(step, `${rel(dir)} missing (run setup)`) : fail(step, 'no Python to build it');
  let t = sh(py, ['-c', test]);
  // PySceneDetect pulls opencv-python, which can shadow the contrib build's cv2 (CSRT tracker, YuNet).
  if (t.code !== 0 && !CHECK && /opencv-contrib/.test(fs.readFileSync(reqs, 'utf8'))) {
    const pin = fs.readFileSync(reqs, 'utf8').match(/^opencv-contrib-python-headless==\S+/m)[0];
    sh(py, ['-m', 'pip', 'install', '--quiet', '--force-reinstall', '--no-deps', pin]);
    t = sh(py, ['-c', test]);
  }
  if (t.code !== 0) return fail(step, `import check failed: ${t.out.trim().split('\n').pop()}`);
  ok(step, t.out.trim() || rel(dir));
}
head('Python environments');
venv('media env', path.join(ROOT, 'tools', 'py', 'venv'), path.join(ROOT, 'requirements.txt'),
  'import cv2, numpy, scenedetect, soundfile; cv2.TrackerCSRT_create(); cv2.FaceDetectorYN; print("opencv", cv2.__version__, "scenedetect", scenedetect.__version__)');
if (!MATTE) warn('matting env', 'skipped (--no-matte); studio matte --engine hf still works');
else if (PLAT === 'darwin-x64') warn('matting env', 'onnxruntime 1.24.4 has no Intel-Mac build; use studio matte --engine hf');
else venv('matting env', path.join(ROOT, 'tools', 'rvm', 'venv'), path.join(ROOT, 'tools', 'rvm', 'requirements.txt'),
  'import onnxruntime as o, numpy; print("onnxruntime", o.__version__, o.get_available_providers()[0])');

// ---------------------------------------------------------------------------------------------------------------
head('Models and binaries (downloaded, checked by sha256)');
const { assets } = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'setup', 'assets.json'), 'utf8'));
for (const a of assets) {
  if (a.group === 'matte' && (!MATTE || PLAT === 'darwin-x64')) continue;
  const src = a.platforms ? a.platforms[PLAT] : a;
  const dest = path.join(ROOT, a.dest.replace('{exe}', IS_WIN ? '.exe' : ''));
  if (!src) { warn(a.id, `no ${PLAT} build published; the toolkit runs without it (voice-clean --no-dfn)`); continue; }
  if (fs.existsSync(dest) && !FORCE && sha256(dest) === src.sha256) { ok(a.id, rel(dest)); continue; }
  if (CHECK) { fail(a.id, `${rel(dest)} missing or changed (run setup)`); continue; }
  try {
    console.log(`  ...   ${a.id}: downloading ${src.url.split('/').pop()}`);
    const res = await fetch(src.url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const got = crypto.createHash('sha256').update(buf).digest('hex');
    if (got !== src.sha256) throw new Error(`sha256 mismatch (got ${got.slice(0, 12)}..., want ${src.sha256.slice(0, 12)}...); not installed`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, buf);
    if (!IS_WIN && a.platforms) fs.chmodSync(dest, 0o755);
    ok(a.id, `${rel(dest)} (${(buf.length / 1048576).toFixed(1)} MB)`);
  } catch (e) { fail(a.id, `${src.url}: ${e.message}`); }
}
const dfn = path.join(ROOT, 'tools', 'bin', 'deepfilternet', IS_WIN ? 'deep-filter.exe' : 'deep-filter');
if (fs.existsSync(dfn)) { const r = sh(dfn, ['--version']); r.code === 0 ? ok('DeepFilterNet runs', r.out.trim()) : fail('DeepFilterNet runs', r.out.trim().slice(-200) || String(r.error)); }

// ---------------------------------------------------------------------------------------------------------------
head('Libraries generated from code');
// Fonts: @fontsource packages (OFL) pinned by package-lock.json, then copied into LIBRARY/fonts by build-fonts.mjs.
const fontSrc = path.join(ROOT, 'LIBRARY', 'fonts', '_src');
const haveFonts = () => fs.existsSync(path.join(ROOT, 'LIBRARY', 'fonts', 'inter')) && fs.readdirSync(path.join(ROOT, 'LIBRARY', 'fonts', 'inter')).some(f => f.endsWith('.woff2'));
if (!haveFonts() && !CHECK) {
  const r = npm('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: fontSrc });
  if (r.code !== 0) fail('fonts', `npm ci in LIBRARY/fonts/_src: ${r.out.trim().slice(-300)}`);
  else { const b = sh(process.execPath, [path.join(ROOT, 'tools', 'studio', 'setup', 'build-fonts.mjs')]); if (b.code !== 0) fail('fonts', b.out.trim().slice(-300)); }
}
if (haveFonts()) ok('fonts', `${JSON.parse(fs.readFileSync(path.join(ROOT, 'LIBRARY', 'fonts', 'fonts.json'), 'utf8')).families?.length ?? '17'} families in LIBRARY/fonts`);
else if (!results.some(r => r.step === 'fonts')) fail('fonts', 'LIBRARY/fonts not built (run setup)');

// Synth SFX kit (ffmpeg synthesis) and the graded looks' .cube LUTs.
const synth = path.join(ROOT, 'LIBRARY', 'sfx', 'synth');
const haveSynth = () => fs.existsSync(synth) && fs.readdirSync(synth).filter(f => f.endsWith('.wav')).length >= 9;
if (!haveSynth() && !CHECK) { const r = studio(['sfx', 'kit']); if (r.code !== 0) fail('synth SFX kit', r.out.trim().slice(-300)); }
if (haveSynth()) ok('synth SFX kit', 'LIBRARY/sfx/synth'); else if (!results.some(r => r.step === 'synth SFX kit')) fail('synth SFX kit', 'not built (run setup)');

const cubeDir = path.join(ROOT, 'LIBRARY', 'grades', 'cube');
const looks = JSON.parse(fs.readFileSync(path.join(ROOT, 'LIBRARY', 'grades', 'looks.json'), 'utf8'));
const lookIds = (Array.isArray(looks.looks) ? looks.looks : Object.keys(looks.looks || {}).map(id => ({ id }))).map(l => l.id);
const haveCubes = () => lookIds.length && lookIds.every(id => fs.existsSync(path.join(cubeDir, `${id}.cube`)));
if (!haveCubes() && !CHECK) { const r = studio(['grade', 'bake']); if (r.code !== 0) fail('grades', r.out.trim().slice(-300)); }
if (haveCubes()) ok('grades', `${lookIds.length} looks baked to LIBRARY/grades/cube`); else if (!results.some(r => r.step === 'grades')) fail('grades', 'LUTs not baked (run setup)');

// ---------------------------------------------------------------------------------------------------------------
head('Claude skills and HyperFrames');
const skillsDir = path.join(ROOT, '.claude', 'skills');
const ours = fs.readdirSync(skillsDir).filter(d => fs.existsSync(path.join(skillsDir, d, 'SKILL.md')));
ok('studio skills', `${ours.length} in .claude/skills (${ours.join(', ')}); Claude Code loads them when opened in this folder`);
const agents = fs.readdirSync(path.join(ROOT, '.claude', 'agents')).filter(f => f.endsWith('.md'));
ok('studio agents', agents.map(f => f.slice(0, -3)).join(', '));

const home = process.env.USERPROFILE || process.env.HOME;
const HF_CORE = ['hyperframes', 'hyperframes-cli', 'hyperframes-registry', 'media-use'];
const hfMissing = () => HF_CORE.filter(s => !fs.existsSync(path.join(home, '.claude', 'skills', s, 'SKILL.md')));
if (hfMissing().length && HF_SKILLS && !CHECK) {
  console.log('  ...   HyperFrames skills: installing to ~/.claude/skills (from github.com/heygen-com/hyperframes)');
  npm('npx', ['--yes', `hyperframes@${HF_VERSION}`, 'skills', 'update', ...HF_CORE], { inherit: true });
}
if (!hfMissing().length) ok('HyperFrames skills', HF_CORE.join(', '));
else (HF_SKILLS ? fail : warn)('HyperFrames skills', `missing ${hfMissing().join(', ')}: run npx hyperframes@${HF_VERSION} skills update`);

const hfv = npm('npx', ['--yes', `hyperframes@${HF_VERSION}`, '--version']);
if (hfv.code === 0) ok('HyperFrames CLI', `${hfv.out.trim().split('\n').pop()} (npx, pinned ${HF_VERSION})`); else fail('HyperFrames CLI', hfv.out.trim().slice(-300));

// SFX, counted after the skills install (media-use brings 19 sounds). Kenney (CC0) ships in the repo; Sonniss is
// downloaded by each person (its licence forbids redistribution).
const sfxMod = pathToFileURL(path.join(ROOT, 'tools', 'studio', 'cmd', 'sfx.mjs')).href;
const sfxCount = sh(process.execPath, ['-e', `import(${JSON.stringify(sfxMod)}).then(m => console.log(JSON.stringify(m.loadIndex().reduce((t, e) => (t[e.source] = (t[e.source] || 0) + 1, t), {}))))`]).out.trim();
if (/kenney/.test(sfxCount)) ok('SFX library', `sounds on this machine ${sfxCount}`); else fail('SFX library', `index unreadable or Kenney sounds missing: ${sfxCount.slice(-300)}`);
if (!/sonniss/.test(sfxCount)) warn('Sonniss SFX', 'not downloaded (optional, 130 curated sounds): see docs/SFX.md');

// ---------------------------------------------------------------------------------------------------------------
head('Toolkit smoke test');
const help = studio(['help']);
help.code === 0 && /qc/.test(help.out) ? ok('studio help', `${help.out.split('\n').filter(l => /^\s{2}\S/.test(l)).length} commands`) : fail('studio help', help.out.slice(-300));
if (!CHECK) { const r = studio(['index']); r.code === 0 ? ok('studio index', 'projects/INDEX.md') : fail('studio index', r.out.slice(-300)); }

// ---------------------------------------------------------------------------------------------------------------
const fails = results.filter(r => r.state === 'fail'), warns = results.filter(r => r.state === 'warn');
console.log(`\n${fails.length ? 'Setup incomplete' : 'Studio ready'}: ${results.length - fails.length - warns.length} ok, ${warns.length} warnings, ${fails.length} failed.`);
if (!fails.length) console.log('Next: open this folder in Claude Code and say "/new-edit <video> my-editing-style" (README.md has the rest).');
process.exit(fails.length ? 1 : 0);
