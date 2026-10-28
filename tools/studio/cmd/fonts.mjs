// Shared font library: list families with their roles, and copy chosen families into a HyperFrames project
// (assets/fonts + @font-face rules), since compositions only resolve bundled fonts by name.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, readJson, writeText, rel, P } from '../lib/core.mjs';

export const summary = 'Font library: list families and roles, add families to a HyperFrames project';
export const usage = `studio fonts list
studio fonts add <hf project dir> <family...>     e.g. studio fonts add projects/x/hf "Inter Tight" "Instrument Serif"
Copies the woff2 files and licences into <hf>/assets/fonts/ and writes assets/fonts/fonts.css. Paste the printed
@font-face block into the composition's <style> (paths are assets/fonts/..., as the HyperFrames contract requires).`;

const LIB = path.join(P.library, 'fonts');
const index = () => readJson(path.join(LIB, 'fonts.json')).families;

export function run(argv) {
  const a = parseArgs(argv);
  const sub = a._[0];
  if (sub === 'list') {
    for (const f of index()) console.log(`${f.family.padEnd(18)} ${f.role.padEnd(22)} ${f.weights.padEnd(10)} pairs: ${f.pairs.join(', ')}`);
    return 0;
  }
  if (sub !== 'add' || a._.length < 3) { console.log(usage); return 1; }
  const hfDir = path.resolve(a._[1]), want = a._.slice(2).map(s => s.toLowerCase());
  const fams = index().filter(f => want.includes(f.family.toLowerCase()));
  const missing = want.filter(w => !fams.some(f => f.family.toLowerCase() === w));
  if (missing.length) throw new Error(`not in the library: ${missing.join(', ')} (studio fonts list)`);
  const dest = path.join(hfDir, 'assets', 'fonts');
  fs.mkdirSync(dest, { recursive: true });
  const rules = [];
  for (const f of fams) {
    for (const file of f.files) {
      fs.copyFileSync(path.join(LIB, f.dir, file.file), path.join(dest, file.file));
      rules.push(`@font-face { font-family: '${f.family}'; src: url('assets/fonts/${file.file}') format('woff2'); font-weight: ${file.weight}; font-style: ${file.style}; font-display: block; }`);
    }
    const lic = path.join(LIB, f.dir, 'LICENSE');
    if (fs.existsSync(lic)) fs.copyFileSync(lic, path.join(dest, `LICENSE-${f.dir}.txt`));
  }
  writeText(path.join(dest, 'fonts.css'), rules.map(r => r.replace("url('assets/fonts/", "url('")).join('\n') + '\n');
  console.log(`copied ${fams.length} families to ${rel(dest)}. Inline block for the composition <style>:\n`);
  console.log(rules.join('\n'));
  return 0;
}
