// Disk hygiene: list re-creatable intermediates in delivered projects (mattes, proxies, plates, pre-mux renders,
// superseded versions, frame dumps) with sizes. Lists only; --apply moves them to the Recycle Bin (recoverable).
// Never touches RAW FOOTAGES, REFERENCES, EXPORTS, scripts, JSON plans, transcripts or hf/ compositions and assets.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, num, readJson, run as exec, fmtBytes, rel, P, IS_WIN } from '../lib/core.mjs';

export const summary = 'List re-creatable intermediates in delivered projects (--apply: Recycle Bin)';
export const usage = `studio clean [--project slug] [--min-mb 20] [--apply]
Without --project, only projects whose project.json status is "delivered" are scanned.
Candidates: work/**/matte*, proxy*, plate*/ and plate*.mp4, render_v*_video.mp4 (pre-mux), superseded/, frames/, chk/.
--apply sends the listed items to the Recycle Bin (Windows) or Trash (macOS, Linux via gio). Ask the user before using it.`;

const RULES = [
  { re: /[\\/]work([\\/].*)?[\\/][^\\/]*matte[^\\/]*\.(mov|mkv|webm)$/i, why: 'matte (studio matte)' },
  { re: /[\\/]work([\\/].*)?[\\/]proxy\d*(\.mp4)?$/i, why: 'proxy' },
  { re: /[\\/]work([\\/].*)?[\\/]plate[^\\/]*$/i, why: 'plate render' },
  { re: /[\\/]work([\\/].*)?[\\/]render_v\d+_video\.mp4$/i, why: 'pre-mux render (the export holds the final)' },
  { re: /[\\/]superseded$/i, why: 'superseded versions' },
  { re: /[\\/](frames|chk)$/i, why: 'frame dumps' },
  { re: /[\\/]work[\\/]faces[\\/][^\\/]*\.(mov|mkv)$/i, why: 'face-tracking proxy' },
];
// Recoverable delete: Windows Recycle Bin, macOS Trash (Finder), Linux gio trash. Never a hard delete.
function toTrash(i) {
  if (IS_WIN) {
    const p = i.f.replace(/'/g, "''");
    exec('powershell', ['-NoProfile', '-Command', `Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.FileIO.FileSystem]::${i.dir ? 'DeleteDirectory' : 'DeleteFile'}('${p}','OnlyErrorDialogs','SendToRecycleBin')`]);
  } else if (process.platform === 'darwin') {
    exec('osascript', ['-e', `tell application "Finder" to delete POSIX file ${JSON.stringify(i.f)}`]);
  } else exec('gio', ['trash', i.f]);
}
const size = f => { const s = fs.statSync(f); return s.isDirectory() ? fs.readdirSync(f).reduce((t, x) => t + size(path.join(f, x)), 0) : s.size; };

function scan(dir, out) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, d.name);
    if (/[\\/]hf([\\/]|$)/i.test(path.relative(P.projects, f)) || d.name === 'scripts' || d.name === 'node_modules') continue;
    const rule = RULES.find(r => r.re.test(f));
    if (rule) { out.push({ f, why: rule.why, size: size(f), dir: d.isDirectory() }); continue; }
    if (d.isDirectory()) scan(f, out);
  }
}

export function run(argv) {
  const a = parseArgs(argv, ['apply']);
  const min = num(a['min-mb'], 20) * 1048576;
  const slugs = a.project ? [a.project] : !fs.existsSync(P.projects) ? [] : fs.readdirSync(P.projects).filter(s => {
    const m = path.join(P.projects, s, 'project.json');
    return fs.existsSync(m) && readJson(m).status === 'delivered';
  });
  const items = [];
  for (const s of slugs) { const d = path.join(P.projects, s); if (fs.existsSync(d)) scan(d, items); }
  // Keep the newest pre-mux render in each folder: an audio-only fix re-muxes it without a re-render.
  const newest = {};
  for (const i of items) { const m = i.f.match(/render_v(\d+)_video\.mp4$/i); if (m) { const d = path.dirname(i.f); newest[d] = Math.max(newest[d] ?? 0, Number(m[1])); } }
  const list = items.filter(i => {
    const m = i.f.match(/render_v(\d+)_video\.mp4$/i);
    return i.size >= min && !(m && Number(m[1]) === newest[path.dirname(i.f)]);
  }).sort((x, y) => y.size - x.size);
  if (!list.length) { console.log(`nothing over ${fmtBytes(min)} in: ${slugs.join(', ') || '(no delivered projects)'}`); return 0; }
  for (const i of list) console.log(`${fmtBytes(i.size).padStart(9)}  ${rel(i.f)}${i.dir ? '/' : ''}  · ${i.why}`);
  const total = list.reduce((t, i) => t + i.size, 0);
  console.log(`${list.length} items · ${fmtBytes(total)} re-creatable${a.apply ? '' : ' (listed only; --apply sends them to the Recycle Bin)'}`);
  if (!a.apply) return 0;
  for (const i of list) toTrash(i);
  console.log(`moved ${list.length} items (${fmtBytes(total)}) to the ${IS_WIN ? 'Recycle Bin' : 'Trash'}`);
  return 0;
}
