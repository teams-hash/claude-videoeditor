// House motion library: list the studio's own HyperFrames components and add them (plus the house motion
// tokens) to a project, next to registry items installed with npx hyperframes add.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, readJson, rel, P } from '../lib/core.mjs';

export const summary = 'House motion components: list, add to a HyperFrames project (with house tokens)';
export const usage = `studio motion list
studio motion add <hf project dir> <component...>
Copies LIBRARY/motion/components/<name>/ into <hf>/compositions/components/<name>/ and the house tokens
(house.css, house-motion.js) into <hf>/assets/house/. Each component's component.json has a mount snippet; its .html
header documents every variable.
Registry items (about 450): studio catalog <words>, then npx --yes hyperframes@<pinned> add; the studio-playbook motion-map.md says which to use.`;

const LIB = path.join(P.library, 'motion');
const COMP = path.join(LIB, 'components');
const copyDir = (src, dst) => {
  fs.mkdirSync(dst, { recursive: true });
  for (const d of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, d.name), t = path.join(dst, d.name);
    if (d.isDirectory()) copyDir(s, t); else fs.copyFileSync(s, t);
  }
};

export function run(argv) {
  const a = parseArgs(argv);
  const sub = a._[0];
  const names = fs.existsSync(COMP) ? fs.readdirSync(COMP).filter(d => fs.existsSync(path.join(COMP, d, 'component.json'))) : [];
  if (sub === 'list') {
    if (!names.length) { console.log('no house components yet'); return 0; }
    for (const n of names) { const c = readJson(path.join(COMP, n, 'component.json')); console.log(`${n.padEnd(22)} ${c.summary}`); }
    return 0;
  }
  if (sub !== 'add' || a._.length < 3) { console.log(usage); return 1; }
  const hf = path.resolve(a._[1]);
  if (!fs.existsSync(path.join(hf, 'index.html'))) throw new Error(`${hf} is not a HyperFrames project (no index.html)`);
  const want = a._.slice(2), missing = want.filter(w => !names.includes(w));
  if (missing.length) throw new Error(`unknown component(s): ${missing.join(', ')} (studio motion list)`);
  copyDir(path.join(LIB, 'tokens'), path.join(hf, 'assets', 'house'));
  for (const w of want) copyDir(path.join(COMP, w), path.join(hf, 'compositions', 'components', w));
  console.log(`added ${want.join(', ')} + house tokens to ${rel(hf)}. Mount snippets:`);
  for (const w of want) console.log(readJson(path.join(COMP, w, 'component.json')).mount);
  return 0;
}
