// Ten-line studio status from projects/INDEX.json. Fast (no probing), so the session-start hook can run it.
import fs from 'node:fs';
import path from 'node:path';
import { readJson, P } from '../lib/core.mjs';

export const summary = 'Ten-line studio status (projects, latest exports, library) from INDEX.json';
export const usage = `studio status
Prints projects with status and latest deliverables, the newest exports and library counts.
Flags a stale index when a project.json is newer than INDEX.json (then run: studio index).`;

export function run() {
  const f = path.join(P.projects, 'INDEX.json');
  if (!fs.existsSync(f)) { console.log('Studio: no projects/INDEX.json yet (run: node tools/studio/studio.mjs index)'); return 0; }
  const j = readJson(f), built = fs.statSync(f).mtimeMs;
  const stale = fs.readdirSync(P.projects).some(d => { const m = path.join(P.projects, d, 'project.json'); return fs.existsSync(m) && fs.statSync(m).mtimeMs > built + 1000; });
  const lines = [`Studio status (projects/INDEX.json, built ${j.built.slice(0, 16).replace('T', ' ')} UTC${stale ? ', STALE: run studio index' : ''})`];
  for (const p of j.projects.slice(0, 6)) {
    const del = (p.deliverables || []).map(d => `${d.id ?? ''}${d.version ? ' ' + d.version : ''}`.trim()).filter(Boolean).join(', ');
    lines.push(`- ${p.slug} · ${p.status || '?'}${p.style ? ' · ' + p.style : ''}${p.client ? ' · ' + p.client : ''}${del ? ' · ' + del : ''}${p.memory ? ' · memory: ' + p.memory : ''}`);
  }
  const recent = [...j.exports].sort((a, b) => (b.mtime ?? 0) - (a.mtime ?? 0)).slice(0, 3);
  if (recent.length) lines.push(`- newest exports: ${recent.map(e => e.file).join(', ')}`);
  const l = j.library || {};
  lines.push(`- library: ${l.sfx ?? 0} SFX · ${l.fonts ?? 0} font families · ${l.looks ?? 0} looks · ${l.motion ?? 0} motion components · ${l.refs ?? 0} references (${l.breakdowns ?? 0} broken down)`);
  lines.push('- toolkit: node tools/studio/studio.mjs help · craft rules: studio-playbook skill · index: projects/INDEX.md');
  console.log(lines.join('\n'));
  return 0;
}
