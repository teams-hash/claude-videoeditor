#!/usr/bin/env node
// Studio toolkit: one entry point for the deterministic jobs every edit repeats.
// Usage: node tools/studio/studio.mjs <command> [args]   ·   help [command] lists commands or shows one command's usage.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const cmdDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cmd');
const names = fs.readdirSync(cmdDir).filter(f => f.endsWith('.mjs')).map(f => f.slice(0, -4)).sort();
const [name, ...argv] = process.argv.slice(2);
const load = n => import(pathToFileURL(path.join(cmdDir, `${n}.mjs`)).href);

if (!name || name === 'help' || name === '--help' || name === '-h') {
  const which = argv[0];
  if (which && names.includes(which)) { console.log((await load(which)).usage.trim()); process.exit(0); }
  console.log('Studio toolkit · node tools/studio/studio.mjs <command> [args] · help <command> for details\n');
  for (const n of names) console.log(`  ${n.padEnd(12)} ${(await load(n)).summary}`);
  process.exit(0);
}
if (!names.includes(name)) { console.error(`unknown command "${name}". Commands: ${names.join(', ')}`); process.exit(2); }
const m = await load(name);
if (argv.includes('--help') || argv.includes('-h')) { console.log(m.usage.trim()); process.exit(0); }
try {
  process.exitCode = (await m.run(argv)) ?? 0;
} catch (e) {
  console.error(`studio ${name}: ${e.message}`);
  process.exitCode = 1;
}
