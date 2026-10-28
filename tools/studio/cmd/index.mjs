// Studio index: projects/INDEX.md (for people) and INDEX.json (for studio status and the session-start hook),
// built from every project.json, the exports on disk (probe results cached by size+mtime) and library counts.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, probe, readJson, writeJson, writeText, rel, fmtT, fmtBytes, P, STUDIO } from '../lib/core.mjs';

export const summary = 'Rebuild projects/INDEX.md + INDEX.json (projects, exports, library counts)';
export const usage = `studio index
Reads projects/*/project.json and EXPORTS/, caches probes, counts the library, and writes projects/INDEX.md
and projects/INDEX.json. Run after a delivery or when a project's status changes.`;

const JSON_OUT = path.join(P.projects, 'INDEX.json');

export function libraryCounts() {
  const count = (f, k) => { try { const j = readJson(f); return k(j); } catch { return 0; } };
  const sfx = count(path.join(P.library, 'sfx', 'index.json'), j => j.count);
  const fonts = count(path.join(P.library, 'fonts', 'fonts.json'), j => j.families.length);
  const looks = count(path.join(P.library, 'grades', 'looks.json'), j => j.looks.length);
  const refs = count(path.join(P.library, 'references', 'index.json'), j => j.references.length);
  const breakdowns = count(path.join(P.library, 'references', 'index.json'), j => j.references.filter(r => r.breakdown || r.house).length);
  const motionDir = path.join(P.library, 'motion', 'components');
  const motion = fs.existsSync(motionDir) ? fs.readdirSync(motionDir).filter(d => fs.existsSync(path.join(motionDir, d, 'component.json'))).length : 0;
  return { sfx, fonts, looks, refs, breakdowns, motion };
}

export function run(argv) {
  parseArgs(argv);
  const prev = fs.existsSync(JSON_OUT) ? readJson(JSON_OUT) : {};
  const cache = prev.probeCache || {};
  const projects = [];
  for (const d of fs.readdirSync(P.projects, { withFileTypes: true })) {
    if (!d.isDirectory() || d.name.startsWith('_')) continue;
    const mf = path.join(P.projects, d.name, 'project.json');
    if (fs.existsSync(mf)) { const m = readJson(mf); projects.push({ ...m, slug: m.slug || d.name, manifest: true, updated: fs.statSync(mf).mtime.toISOString().slice(0, 10) }); }
    else projects.push({ slug: d.name, manifest: false, status: 'unindexed', title: d.name });
  }
  const exportsList = [];
  for (const f of fs.existsSync(P.exports) ? fs.readdirSync(P.exports).filter(f => /\.(mp4|mov|webm)$/i.test(f)).sort() : []) {
    const full = path.join(P.exports, f), st = fs.statSync(full), key = `${f}|${st.size}|${st.mtimeMs}`;
    let p = cache[key];
    if (!p) { const i = probe(full); p = { duration: +i.duration.toFixed(2), w: i.video?.displayWidth, h: i.video?.displayHeight }; cache[key] = p; }
    const owner = projects.find(pr => (pr.deliverables || []).some(dv => (dv.exports || [dv.export]).filter(Boolean).some(e => path.basename(e) === f)))?.slug
      || projects.find(pr => f.startsWith(pr.slug))?.slug || null;
    exportsList.push({ file: f, size: st.size, date: st.mtime.toISOString().slice(0, 10), mtime: Math.round(st.mtimeMs), ...p, project: owner });
  }
  const lib = libraryCounts();
  const built = new Date().toISOString();
  writeJson(JSON_OUT, { built, projects: projects.map(({ manifest, ...p }) => ({ slug: p.slug, title: p.title, client: p.client, style: p.style, status: p.status, deliverables: p.deliverables || [], memory: p.memory || null, updated: p.updated || null })), exports: exportsList, library: lib, probeCache: cache });

  const md = [
    '# Studio index', '', `Built ${built.slice(0, 16).replace('T', ' ')} by \`node tools/studio/studio.mjs index\`. Do not edit by hand.`, '',
    '## Projects', '', '| Project | Client | Style | Status | Deliverables | Memory |', '|---|---|---|---|---|---|',
    ...projects.map(p => `| [${p.slug}](${p.slug}/${p.manifest ? 'project.json' : ''}) | ${p.client || '–'} | ${p.style || '–'} | ${p.status || '–'} | ${(p.deliverables || []).map(d => `${d.id ?? ''} ${d.version ?? ''} ${d.size ?? ''}`.trim()).join('; ') || '–'} | ${p.memory || '–'} |`), '',
    '## Exports', '', '| File | Length | Size | Frame | Project |', '|---|---|---|---|---|',
    ...exportsList.map(e => `| ${e.file} | ${fmtT(e.duration)} | ${fmtBytes(e.size)} | ${e.w}x${e.h} | ${e.project || '–'} |`), '',
    '## Library', '', `SFX ${lib.sfx} indexed · fonts ${lib.fonts} families · looks ${lib.looks} · motion components ${lib.motion} · references ${lib.refs} (${lib.breakdowns} with breakdowns)`, '',
  ].join('\n');
  writeText(path.join(P.projects, 'INDEX.md'), md);
  console.log(`${projects.length} projects · ${exportsList.length} exports · library ${JSON.stringify(lib)} -> ${rel(path.join(P.projects, 'INDEX.md'))}`);
  return 0;
}
