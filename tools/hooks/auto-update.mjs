// SessionStart hook: keep this clone on the team's latest approved version. On branch main, fetch origin/main and
// fast-forward. Prints one line into the session context and never fails the session: offline, no GitHub access,
// edits to shared files or another branch all leave the clone as it is and say why.
// DNMS_AUTO_UPDATE=0 turns it off (maintainers on a feature branch are skipped anyway).
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.CLAUDE_PROJECT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// Background git must never prompt: no terminal prompt, no credential-manager window.
const env = { ...process.env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
// Files whose change means the machine needs setup again (new tools, envs or downloads).
const SETUP_FILES = /^(tools\/setup\/|tools\/rvm\/requirements\.txt$|requirements\.txt$|install\.(bat|sh)$)/;
// Tracked files the toolkit rewrites in normal work (/ref, studio sfx index, the font build). Local changes to them
// don't block an update: they're set aside, the update applies, and they're put back. When the team changed the same
// file, the reference index is merged and the others take the team version.
const GENERATED = /^LIBRARY\/(references\/|sfx\/index\.json$|fonts\/fonts\.json$)/;
const REF_INDEX = 'LIBRARY/references/index.json';

function git(args, timeout = 15000) {
  const r = spawnSync('git', ['-C', ROOT, ...args], { encoding: 'utf8', env, timeout, windowsHide: true });
  return { ok: r.status === 0, out: (r.stdout || '').trim() };
}
const file = f => path.join(ROOT, f);
const readOrNull = f => { try { return fs.readFileSync(file(f), 'utf8'); } catch { return null; } };
function version() {
  try { return JSON.parse(readOrNull('package.json')).version; } catch { return '?'; }
}

// Team entries win; references only this PC has scanned are kept, and empty team fields take this PC's values.
function mergeRefIndex(localText, teamText) {
  const local = JSON.parse(localText), team = JSON.parse(teamText);
  const byId = new Map(local.references.map(r => [r.id, r]));
  const merged = team.references.map(t => {
    const l = byId.get(t.id);
    if (!l) return t;
    const out = { ...t };
    for (const [k, v] of Object.entries(l)) if (out[k] == null && v != null) out[k] = v;
    return out;
  });
  const teamIds = new Set(team.references.map(r => r.id));
  for (const r of local.references) if (!teamIds.has(r.id)) merged.push(r);
  return JSON.stringify({ ...team, references: merged }, null, 1) + '\n';
}

function run() {
  if (process.env.DNMS_AUTO_UPDATE === '0') return;
  if (!fs.existsSync(file('.git'))) return;
  const from = version();
  const tag = `DNMS studio v${from}`;

  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']).out;
  if (branch !== 'main') {
    console.log(`${tag} on branch "${branch}": auto-update runs on main only (git switch main to return).`);
    return;
  }
  const dirty = git(['diff', '--name-only', 'HEAD']).out.split('\n').filter(Boolean);
  const blocking = dirty.filter(f => !GENERATED.test(f));
  if (blocking.length) {
    console.log(`${tag}: NOT updated, shared files were changed on this PC (${blocking.slice(0, 5).join(', ')}). Tell the ` +
      'user: changes to shared files go to the skill lead (docs/CONTRIBUTING.md); to discard them and resume ' +
      `updates: git restore ${blocking.length > 5 ? '.' : blocking.map(f => `"${f}"`).join(' ')}`);
    return;
  }
  const before = git(['rev-parse', 'HEAD']).out;
  if (!git(['fetch', '--quiet', 'origin', 'main'], 20000).ok) {
    console.log(`${tag}: could not check for updates (offline or no GitHub access), using this copy.`);
    return;
  }
  const behind = Number(git(['rev-list', '--count', 'HEAD..origin/main']).out || 0);
  if (!behind) { console.log(`${tag} (up to date).`); return; }
  if (Number(git(['rev-list', '--count', 'origin/main..HEAD']).out || 0)) {
    console.log(`${tag}: NOT updated, this clone has its own commits on main. Ask a maintainer to sort it out.`);
    return;
  }

  const kept = new Map(dirty.map(f => [f, readOrNull(f)]));
  if (kept.size) git(['checkout', '--', ...kept.keys()]);
  const merged = git(['merge', '--ff-only', '--quiet', 'origin/main']).ok;
  const changed = merged ? git(['diff', '--name-only', before, 'HEAD']).out.split('\n') : [];
  const notes = [];
  for (const [f, text] of kept) {
    if (text === null) continue;
    if (!changed.includes(f)) { fs.writeFileSync(file(f), text); continue; }
    try {
      if (f !== REF_INDEX) throw new Error('team version kept');
      fs.writeFileSync(file(f), mergeRefIndex(text, readOrNull(f)));
    } catch {
      notes.push(f);
    }
  }
  if (!merged) {
    console.log(`${tag}: update failed (fast-forward refused, often a new local file in the way), using this copy. ` +
      'Ask a maintainer.');
    return;
  }
  const setup = changed.some(f => SETUP_FILES.test(f));
  console.log(`DNMS studio updated v${from} -> v${version()} (${behind} commit${behind > 1 ? 's' : ''}; see CHANGELOG.md).` +
    (setup ? ' Setup files changed: ask the user to run install.bat (or ./install.sh) once.' : '') +
    (notes.length ? ` Took the team version of ${notes.join(', ')}; rebuild this PC's entries if needed ` +
      '(studio sfx index for the SFX index).' : ''));
}

try { run(); } catch (e) { console.log(`DNMS auto-update skipped (${String(e.message).split('\n')[0]}).`); }
