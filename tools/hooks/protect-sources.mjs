// PreToolUse hook (Edit/Write/NotebookEdit/Bash/PowerShell): RAW FOOTAGES and REFERENCES hold originals.
// Blocks file edits inside them and shell commands that delete, move, rename, overwrite or redirect into them.
// Reading from them (ffmpeg -i, cp out of them) passes. Exit 2 blocks the call and sends stderr back to Claude.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.env.CLAUDE_PROJECT_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PROTECTED = ['RAW FOOTAGES', 'REFERENCES'].map(d => path.join(ROOT, d).replace(/\\/g, '/').toLowerCase());

function norm(p, cwd) {
  let s = String(p).trim().replace(/^["']|["']$/g, '').replace(/\\ /g, ' ').replace(/\\/g, '/');
  const m = s.match(/^\/([a-z])\/(.*)$/i);
  if (m) s = `${m[1]}:/${m[2]}`;
  if (!/^[a-z]:\//i.test(s)) s = path.resolve(cwd || ROOT, s).replace(/\\/g, '/');
  return s.toLowerCase();
}
const inside = (p, cwd) => { const n = norm(p, cwd); return PROTECTED.some(d => n === d || n.startsWith(d + '/')); };

// Split a shell line into segments and quote-aware tokens.
function segments(cmd) {
  const out = [];
  let cur = [], tok = '', q = null, had = false;
  const push = () => { if (had) cur.push(tok); tok = ''; had = false; };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (q) { if (c === q) q = null; else tok += c; continue; }
    if (c === '"' || c === "'") { q = c; had = true; continue; }
    if (c === '\\' && cmd[i + 1] === ' ') { tok += ' '; had = true; i++; continue; }
    if (/\s/.test(c) && c !== '\n') { push(); continue; }
    if (c === ';' || c === '\n' || c === '|' || c === '&') { push(); if (cur.length) out.push(cur); cur = []; continue; }
    if (c === '>') { push(); cur.push('>'); if (cmd[i + 1] === '>') i++; continue; }
    tok += c; had = true;
  }
  push();
  if (cur.length) out.push(cur);
  return out;
}

const ANY_ARG = /^(rm|rmdir|del|erase|rd|mv|move|ren|rename|unlink|shred|truncate|remove-item|move-item|rename-item|clear-content|ri|mi|rni)$/;
const LAST_ARG = /^(cp|copy|copy-item|cpi|ffmpeg|tee|set-content|add-content|out-file|sc|ac|robocopy|xcopy)$/;

function shellHit(cmd, cwd) {
  for (const seg of segments(cmd)) {
    const prog = (seg[0] || '').replace(/^.*[\\/]/, '').replace(/\.exe$/i, '').toLowerCase();
    const args = seg.slice(1).filter(a => !a.startsWith('-') || a.length < 2 || /[\\/]/.test(a));
    const ri = seg.indexOf('>');
    if (ri >= 0 && seg[ri + 1] && inside(seg[ri + 1], cwd)) return seg[ri + 1];
    if (ANY_ARG.test(prog)) { const h = args.find(a => a !== '>' && inside(a, cwd)); if (h) return h; }
    if (LAST_ARG.test(prog)) {
      const dest = [...args].reverse().find(a => a !== '>');
      if (dest && inside(dest, cwd)) return dest;
    }
    if (prog === 'sed' && seg.some(a => /^-i/.test(a))) { const h = args.find(a => inside(a, cwd)); if (h) return h; }
  }
  return null;
}

let input = '';
process.stdin.on('data', d => { input += d; }).on('end', () => {
  let j;
  try { j = JSON.parse(input); } catch { process.exit(0); }
  const t = j.tool_name, ti = j.tool_input || {}, cwd = j.cwd || ROOT;
  let hit = null;
  if (t === 'Edit' || t === 'Write' || t === 'NotebookEdit') { const f = ti.file_path || ti.notebook_path; if (f && inside(f, cwd)) hit = f; }
  else if ((t === 'Bash' || t === 'PowerShell') && ti.command) hit = shellHit(String(ti.command), cwd);
  if (!hit) process.exit(0);
  console.error(`protect-sources: this would modify "${hit}", inside RAW FOOTAGES or REFERENCES. Those folders hold the originals and are read-only. Read from them, but write into projects/<slug>/ instead.`);
  process.exit(2);
});
