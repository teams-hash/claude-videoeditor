#!/usr/bin/env node
// Build LIBRARY/fonts from the @fontsource packages in LIBRARY/fonts/_src (npm, OFL licensed): copy the latin
// woff2 files and licence per family and write fonts.json (roles, pairings, files) for `studio fonts`.
// Re-fetch on a new machine: cd LIBRARY/fonts/_src && npm install --ignore-scripts, then run this script.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'LIBRARY', 'fonts');
const NM = path.join(LIB, '_src', 'node_modules');

// family, package, role, pairings, use. Static packages list the weights to keep.
const FAMILIES = [
  ['Inter', '@fontsource-variable/inter', 'UI sans, captions', ['Instrument Serif', 'Fraunces', 'JetBrains Mono'], 'Default for captions, cards, UI rebuilds; 500-600 for captions, 700-800 for numbers'],
  ['Inter Tight', '@fontsource-variable/inter-tight', 'display sans', ['Instrument Serif', 'Inter'], 'Tight headlines and giant words (800); the house display face'],
  ['Manrope', '@fontsource-variable/manrope', 'friendly geometric sans', ['Fraunces', 'Playfair Display'], 'Softer brand UI, finance and wellness explainers'],
  ['DM Sans', '@fontsource-variable/dm-sans', 'low-contrast geometric sans', ['Playfair Display', 'Fraunces'], 'Clean product and SaaS cards'],
  ['Space Grotesk', '@fontsource-variable/space-grotesk', 'tech display sans', ['Inter', 'JetBrains Mono'], 'AI/tech hooks, data labels with character'],
  ['Montserrat', '@fontsource-variable/montserrat', 'wide geometric display', ['Playfair Display', 'Inter'], 'Bold uppercase titles, lower-third names'],
  ['Poppins', '@fontsource/poppins', 'rounded geometric sans', ['Instrument Serif', 'Inter'], 'Creator and education captions', ['400-normal', '500-normal', '600-normal', '700-normal', '800-normal', '400-italic']],
  ['Bebas Neue', '@fontsource/bebas-neue', 'condensed caps display', ['Inter', 'Montserrat'], 'Big numbers, stats, one-word slams (caps only)', ['400-normal']],
  ['Anton', '@fontsource/anton', 'heavy condensed display', ['Inter'], 'Punchy headline words; use sparingly', ['400-normal']],
  ['Oswald', '@fontsource-variable/oswald', 'condensed sans', ['Inter', 'Playfair Display'], 'Lower thirds, labels, dense stat cards'],
  ['Instrument Serif', '@fontsource/instrument-serif', 'editorial display serif', ['Inter', 'Inter Tight'], 'Italic accent words, quotes, editorial titles (house accent face)', ['400-normal', '400-italic']],
  ['Playfair Display', '@fontsource-variable/playfair-display', 'high-contrast serif', ['Montserrat', 'Inter'], 'Luxury and editorial titles'],
  ['Fraunces', '@fontsource-variable/fraunces', 'soft display serif (optical sizes)', ['Inter', 'Manrope'], 'Warm premium titles; SOFT and WONK axes for character'],
  ['JetBrains Mono', '@fontsource-variable/jetbrains-mono', 'monospace', ['Inter', 'Space Grotesk'], 'Prompts, code, terminal and API UI'],
  ['Caveat', '@fontsource-variable/caveat', 'handwritten', ['Inter'], 'Annotations, arrows, marker notes'],
  ['Archivo', '@fontsource-variable/archivo', 'grotesque with width axis', ['Instrument Serif', 'Inter'], 'Kinetic type: animate width and weight'],
  ['Nunito', '@fontsource-variable/nunito', 'rounded friendly sans', ['Fraunces'], 'Approachable brands (used in the LGF edit)'],
];

const out = [];
for (const [family, pkg, role, pairs, use, statics] of FAMILIES) {
  const src = path.join(NM, ...pkg.split('/'), 'files');
  if (!fs.existsSync(src)) { console.warn(`missing ${pkg}`); continue; }
  const files = fs.readdirSync(src).filter(f => f.endsWith('.woff2') && /-latin-/.test(f) && !/-latin-ext-/.test(f));
  const dir = family.toLowerCase().replace(/\s+/g, '-');
  let pick;
  if (statics) pick = statics.map(s => files.find(f => f.endsWith(`-latin-${s}.woff2`))).filter(Boolean);
  else {
    const axis = ['full', 'standard', 'wght'].find(ax => files.some(f => f.includes(`-latin-${ax}-normal`)));
    pick = files.filter(f => f.includes(`-latin-${axis}-`));
  }
  fs.mkdirSync(path.join(LIB, dir), { recursive: true });
  for (const f of pick) fs.copyFileSync(path.join(src, f), path.join(LIB, dir, f));
  fs.copyFileSync(path.join(src, '..', 'LICENSE'), path.join(LIB, dir, 'LICENSE'));
  const entries = pick.map(f => {
    const m = f.match(/-latin-(\w+)-(normal|italic)\.woff2$/);
    const weight = /^\d+$/.test(m[1]) ? m[1] : '100 900';
    return { file: f, weight, style: m[2] };
  });
  const weights = statics ? [...new Set(entries.map(e => e.weight))].join(',') : 'variable';
  out.push({ family, dir, role, weights, variable: !statics, pairs, use, licence: 'OFL-1.1', files: entries });
  console.log(`${family.padEnd(18)} ${entries.length} files`);
}
fs.writeFileSync(path.join(LIB, 'fonts.json'), JSON.stringify({ note: 'Built by tools/studio/setup/build-fonts.mjs. Latin subset (U+0000-00FF and common punctuation).', families: out }, null, 1) + '\n');
console.log(`${out.length} families -> LIBRARY/fonts/fonts.json`);
