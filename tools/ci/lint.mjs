// Repository checks, run by CI on every push and pull request and by contributors before they open one.
//   node tools/ci/lint.mjs                 skills, agents, hooks, JSON, script syntax, file sizes and types, changelog
//   node tools/ci/lint.mjs --base <ref>    also require a version bump when shared files changed since <ref>
// Prints FAIL / WARN lines and exits 1 on any FAIL.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const fails = [], warns = [];
const fail = (where, msg) => fails.push(`FAIL ${where}: ${msg}`);
const warn = (where, msg) => warns.push(`WARN ${where}: ${msg}`);
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');
const read = p => fs.readFileSync(p, 'utf8');
const git = args => spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });

// Tracked files (what CI sees); outside a git repo, every file that .gitignore would not obviously skip.
function files() {
  const r = git(['ls-files', '-z', '--cached', '--others', '--exclude-standard']);
  if (r.status === 0) return r.stdout.split('\0').filter(Boolean).filter(f => fs.existsSync(path.join(ROOT, f)));
  const out = [];
  const walk = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
    if (['.git', 'node_modules', 'venv'].includes(e.name)) return;
    const p = path.join(d, e.name);
    e.isDirectory() ? walk(p) : out.push(rel(p));
  });
  walk(ROOT);
  return out;
}

// Minimal YAML frontmatter reader: top-level `key: value` pairs, quoted values and folded continuation lines.
function frontmatter(text) {
  if (!text.startsWith('---\n') && !text.startsWith('---\r\n')) return null;
  const end = text.indexOf('\n---', 4);
  if (end < 0) return null;
  const fm = {};
  let key = null;
  for (const line of text.slice(4, end).split(/\r?\n/)) {
    const m = line.match(/^([A-Za-z][\w-]*):\s*(.*)$/);
    if (m) { key = m[1]; fm[key] = m[2].replace(/^["']|["']$/g, ''); }
    else if (key && /^\s+\S/.test(line)) fm[key] += ' ' + line.trim();
  }
  return fm;
}

// Relative markdown links ([text](references/x.md)) must point at files that exist.
function checkLinks(file) {
  const text = read(file);
  for (const m of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = m[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target) || target.startsWith('<')) continue;
    if (!fs.existsSync(path.resolve(path.dirname(file), decodeURI(target)))) fail(rel(file), `broken link ${m[1]}`);
  }
}

function checkSkills() {
  const dir = path.join(ROOT, '.claude', 'skills');
  for (const name of fs.readdirSync(dir)) {
    const skill = path.join(dir, name, 'SKILL.md');
    if (!fs.existsSync(skill)) { fail(`.claude/skills/${name}`, 'no SKILL.md'); continue; }
    const text = read(skill);
    const fm = frontmatter(text);
    if (!fm) { fail(rel(skill), 'frontmatter missing (the file must start with ---)'); continue; }
    if (fm.name && fm.name !== name) fail(rel(skill), `name "${fm.name}" differs from its folder "${name}"`);
    if (!/^[a-z0-9-]+$/.test(fm.name || name)) fail(rel(skill), 'name must be lowercase letters, digits and hyphens');
    if (!fm.description) fail(rel(skill), 'description missing (Claude uses it to decide when to load the skill)');
    // Claude Code truncates description + when_to_use at 1,536 characters in the skill listing.
    else if ((fm.description + (fm.when_to_use || '')).length > 1536) fail(rel(skill), 'description over 1,536 characters');
    const lines = text.split('\n').length;
    if (lines > 500) fail(rel(skill), `${lines} lines; keep SKILL.md under 500 and move detail to references/`);
    else if (lines > 300) warn(rel(skill), `${lines} lines; consider moving detail to references/`);
  }
}

function checkAgents() {
  const dir = path.join(ROOT, '.claude', 'agents');
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.md'))) {
    const fm = frontmatter(read(path.join(dir, f)));
    if (!fm?.name || !fm?.description) fail(`.claude/agents/${f}`, 'needs frontmatter with name and description');
  }
}

// Every hook command that names a file under ${CLAUDE_PROJECT_DIR} must point at one that exists.
function checkHooks() {
  const p = path.join(ROOT, '.claude', 'settings.json');
  const settings = JSON.parse(read(p));
  for (const groups of Object.values(settings.hooks || {}))
    for (const g of groups) for (const h of g.hooks || []) {
      const m = String(h.command).match(/\$\{CLAUDE_PROJECT_DIR\}\/([^"\s]+)/);
      if (m && !fs.existsSync(path.join(ROOT, m[1]))) fail('.claude/settings.json', `hook script missing: ${m[1]}`);
    }
}

const MEDIA = /\.(mp4|mov|mkv|webm|avi|m4v|mxf|braw|r3d|wav|mp3|m4a|aac|flac|aif|aiff|png|jpe?g|webp|gif|bmp|tiff?|heic|psd|exr|ttf|otf|onnx|pt|pth|ckpt|safetensors|exe|dll|zip|7z|rar)$/i;
// Licensed for redistribution and kept small on purpose (see .gitignore).
const ALLOWED = [/^SFX\/_downloads\/kenney_[^/]+\/.+\.ogg$/, /^\.claude\/skills\/brand-nat-styles\/guide\/fonts\/.+\.woff2$/];
const MAX_BYTES = 5 * 1024 * 1024;

function checkFiles(list) {
  let total = 0;
  for (const f of list) {
    const size = fs.statSync(path.join(ROOT, f)).size;
    total += size;
    if (size > MAX_BYTES) fail(f, `${(size / 1048576).toFixed(1)} MB; files over 5 MB belong on the shared Drive`);
    if ((MEDIA.test(f) || f.endsWith('.ogg') || f.endsWith('.woff2')) && !ALLOWED.some(r => r.test(f)))
      fail(f, 'media, font, model or binary file; these live on the shared Drive or are rebuilt by setup');
    if (f.endsWith('.json')) { try { JSON.parse(read(path.join(ROOT, f))); } catch (e) { fail(f, `invalid JSON (${e.message})`); } }
    if (/\.(mjs|js)$/.test(f) && !f.includes('/node_modules/')) {
      const r = spawnSync(process.execPath, ['--check', path.join(ROOT, f)], { encoding: 'utf8' });
      if (r.status !== 0) fail(f, `syntax error: ${(r.stderr || '').split('\n').find(l => /Error/.test(l)) || 'node --check failed'}`);
    }
    if (f.endsWith('.md') && !f.startsWith('LIBRARY/motion/lookbook/')) checkLinks(path.join(ROOT, f));
  }
  if (total > 50 * 1048576) warn('repository', `${(total / 1048576).toFixed(0)} MB of files; the target is under 50 MB`);
}

// The top CHANGELOG entry must match package.json, and shared changes need a new version.
function checkVersion(base) {
  const version = JSON.parse(read(path.join(ROOT, 'package.json'))).version;
  const top = read(path.join(ROOT, 'CHANGELOG.md')).match(/^## \[?v?(\d+\.\d+\.\d+)/m);
  if (!top) fail('CHANGELOG.md', 'no "## x.y.z" entry');
  else if (top[1] !== version) fail('CHANGELOG.md', `top entry is ${top[1]} but package.json says ${version}`);
  if (!base) return;
  const diff = git(['diff', '--name-only', `${base}...HEAD`]);
  if (diff.status !== 0) { fail('version', `cannot diff against ${base}`); return; }
  // Docs and CI changes don't change what editors run, so they can ship without a bump.
  const shared = diff.stdout.split('\n').filter(f => f && !/^(docs\/|\.github\/|README\.md$|CHANGELOG\.md$)/.test(f));
  const baseVersion = (() => {
    const r = git(['show', `${base}:package.json`]);
    try { return JSON.parse(r.stdout).version; } catch { return null; }
  })();
  if (shared.length && baseVersion === version)
    fail('package.json', `shared files changed (${shared.slice(0, 3).join(', ')}${shared.length > 3 ? '…' : ''}) but the version is still ${version}: bump it and add a CHANGELOG entry`);
}

const baseArg = process.argv.indexOf('--base');
const steps = [checkSkills, checkAgents, checkHooks, () => checkFiles(files()), () => checkVersion(baseArg > 0 ? process.argv[baseArg + 1] : null)];
for (const step of steps) {
  try { step(); } catch (e) { fail(step.name || 'check', e.message); }
}
for (const line of [...warns, ...fails]) console.log(line);
console.log(fails.length ? `${fails.length} failed, ${warns.length} warnings` : `All checks passed (${warns.length} warnings)`);
process.exit(fails.length ? 1 : 0);
