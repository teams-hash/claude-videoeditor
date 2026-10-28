// SFX library: index every sound the studio owns (category, length, hit point, level, licence), curate
// bundle zips into editing-relevant folders, generate the synthesized fallback kit once, and find sounds by need.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, num, run as exec, decodeMono, readJson, writeJson, STUDIO, P, BIN, rel, slugify, skillDir, homeRel, fromHome, IS_WIN } from '../lib/core.mjs';

export const summary = 'SFX library: index, find by need, import bundle zips, synth fallback kit';
export const usage = `studio sfx index                       rebuild LIBRARY/sfx/index.json from SFX/, the synth kit and media-use's bundled sounds
studio sfx find [words] [--cat whoosh] [--min 0.1] [--max 1.5] [--source sonniss|kenney|synth|bundled] [--n 8]
studio sfx cats                        categories with counts per source
studio sfx import <zip...> --to SFX/<folder> [--max-mb 30] [--all] [--dry-run]
                                       extract only editing-relevant files (UI, whooshes, impacts, drops, risers, paper,
                                       typing, cartoon, glitch, booms...) from bundle zips; long ambiences stay zipped
studio sfx kit                         synthesize the house fallback kit once into LIBRARY/sfx/synth
Index entries: id, path, source, licence, cat, tags, dur, hit (seconds to the loudest point), onset, peak_db, rms_db.
Cue by hit time with studio mix ("hit" lands the loudest point on the moment), so timing never needs listening.`;

const INDEX = path.join(P.library, 'sfx', 'index.json');
const SONNISS_LIC = 'Sonniss GDC 2026 licence v2.0: commercial use, no attribution; no AI training, no redistribution of raw files';
function sources() {
  const sfx = path.join(STUDIO, 'SFX');
  const list = [
    { id: 'sonniss', dir: path.join(sfx, 'sonniss_gdc2026'), licence: SONNISS_LIC },
    { id: 'sonniss', dir: path.join(sfx, '_downloads', 'sonniss_selected'), licence: SONNISS_LIC },
    { id: 'kenney', dir: path.join(sfx, '_downloads', 'kenney_interface-sounds'), licence: 'CC0 (Kenney)' },
    { id: 'kenney', dir: path.join(sfx, '_downloads', 'kenney_ui-audio'), licence: 'CC0 (Kenney)' },
    { id: 'bundled', dir: path.join(skillDir('media-use'), 'audio', 'assets', 'sfx'), licence: 'Pixabay Content License' },
    { id: 'synth', dir: path.join(P.library, 'sfx', 'synth'), licence: 'own (ffmpeg synthesis)' },
  ];
  const known = new Set(list.map(s => s.dir.toLowerCase()));
  if (fs.existsSync(sfx)) for (const d of fs.readdirSync(sfx, { withFileTypes: true })) {
    const full = path.join(sfx, d.name);
    if (d.isDirectory() && !d.name.startsWith('_') && !known.has(full.toLowerCase())) list.push({ id: slugify(d.name), dir: full, licence: 'check the folder before client use' });
  }
  return list.filter(s => fs.existsSync(s.dir));
}

// First match wins, so the specific families come before the broad ones. Text is lower-cased with
// separators turned into spaces, so UCS names ("WHSHAir_Whoosh...") and snake_case ("sub_drop") both match.
const CATS = [
  ['voice', /\bvox|\bhmn|breath|laugh|cough|yell|scream|announcer|vocal/],
  ['drop', /bass ?drops?|downer|sub ?drop|downlifter/],
  ['riser', /riser|\brise\b|uplifter|build ?up|swell|reverse|tension/],
  ['whoosh', /whoosh|woosh|swoosh|swish|whsh|swsh|swipe|sweep|pass ?by|fly ?by|air designed|whip|maximi[sz]e|minimi[sz]e/],
  ['impact', /impact|impt|\bhits?\b|punch|slam|thud|knock|stomp|braam|boom|colossal|\bsnap\b/],
  ['typing', /typ(e|ing|ewriter)|keyboard|keystroke|key press/],
  ['paper', /paper|page|book|rustle|crumple|scratch|marker|card/],
  ['click', /click|tick|\btap|switch|mouse|toggle/],
  ['pop', /\bpops?\b|bubble|\bblips?\b|\bbloops?\b|\bdrop \d|pluck|bounce/],
  ['ui', /\bui|interface|button|menu|notif|alert|confirm|accept|select|hover|rollover|scroll|infographic|feedback|system|\bopen\b|\bclose\b|\bback\b|question|error|\bglass\b|bong|\bping/],
  ['magic', /magic|sparkle|shimmer|twinkle|chime|glitter|emotion|kalimba|arp/],
  ['glitch', /glitch|digital|data|static|bitcrush/],
  ['cartoon', /cartoon|boing|comic/],
  ['cash', /cash|coin|money|register|casino|chips/],
  ['alarm', /alarm|siren|warning/],
  ['creature', /\bcrea|monster|growl|werewolf|creature/],
  ['foley', /\bfoly|cloth|wood|\bice\b|metal|telephone|creak|squeak|fric|seat/],
  ['texture', /drone|texture|ambien|atmos|bed\b|loop/],
  ['designed', /\bdsgn/],
];
const AUDIO = /\.(wav|ogg|mp3|flac|aiff?)$/i;
const STOP = new Set(['the', 'and', 'for', 'with', 'sfx', 'audio', 'sound', 'sounds', 'vol', 'wav', 'ogg', 'mp3', 'by', 'of', 'a']);

function walk(dir, out = []) {
  for (const d of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, d.name);
    if (d.isDirectory()) walk(f, out); else if (AUDIO.test(d.name) && !/^(preview|demo)\b/i.test(d.name)) out.push(f);
  }
  return out;
}
function measure(file) {
  const sr = 16000, x = decodeMono(file, sr);
  let pk = 0, pi = 0;
  for (let i = 0; i < x.length; i++) { const v = Math.abs(x[i]); if (v > pk) { pk = v; pi = i; } }
  const peak = 20 * Math.log10(pk + 1e-9), win = 80;
  let onset = 0, e = 0, k = 0, found = false;
  for (let i = 0; i + win <= x.length; i += win) {
    let s = 0; for (let j = i; j < i + win; j++) s += x[j] * x[j];
    const db = 10 * Math.log10(s / win + 1e-12);
    if (!found && db > peak - 30) { onset = i / sr; found = true; }
    if (db > peak - 40) { e += s / win; k++; }
  }
  return { dur: +(x.length / sr).toFixed(3), hit: +(pi / sr).toFixed(3), onset: +onset.toFixed(3), peak_db: +peak.toFixed(1), rms_db: +(10 * Math.log10(e / Math.max(1, k) + 1e-12)).toFixed(1) };
}
export function categorize(text) {
  const t = text.toLowerCase().replace(/[_\-.,()'&]+/g, ' ');
  for (const [c, re] of CATS) if (re.test(t)) return c;
  return 'misc';
}

function index() {
  const entries = [], seen = new Set(), ids = new Set(), counts = {};
  for (const s of sources()) {
    for (const file of walk(s.dir)) {
      const size = fs.statSync(file).size, key = `${path.basename(file).toLowerCase()}|${size}`;
      if (seen.has(key)) continue;
      seen.add(key);
      let m;
      try { m = measure(file); } catch (e) { console.warn(`skip ${rel(file)}: ${e.message.split('\n')[0]}`); continue; }
      const name = path.basename(file).replace(AUDIO, '');
      const folder = path.relative(s.dir, path.dirname(file)).replace(/\\/g, '/');
      let id = `${s.id}/${slugify(name)}`;
      for (let n = 2; ids.has(id); n++) id = `${s.id}/${slugify(name)}-${n}`;
      ids.add(id);
      const tags = [...new Set(`${folder} ${name}`.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 2 && !STOP.has(w)))].slice(0, 10);
      entries.push({ id, path: homeRel(rel(file)), source: s.id, licence: s.licence, cat: categorize(`${folder} ${name}`), tags, ...m });
      counts[s.id] = (counts[s.id] || 0) + 1;
    }
  }
  writeJson(INDEX, { built: new Date().toISOString(), count: entries.length, counts, entries });
  console.log(`indexed ${entries.length} sounds ${JSON.stringify(counts)} -> ${rel(INDEX)}`);
}
// Entries whose file is not on this machine (a library not downloaded yet, see docs/SFX.md) are left out.
export function loadIndex() {
  if (!fs.existsSync(INDEX)) throw new Error('no SFX index yet: run studio sfx index');
  return readJson(INDEX).entries.map(e => ({ ...e, path: path.resolve(STUDIO, fromHome(e.path)) })).filter(e => fs.existsSync(e.path));
}

function find(a) {
  const words = a._.slice(1).map(w => w.toLowerCase());
  const lo = num(a.min, 0), hi = num(a.max, Infinity);
  const hits = loadIndex().filter(e => (!a.cat || e.cat === a.cat) && (!a.source || e.source === a.source) && e.dur >= lo && e.dur <= hi)
    .map(e => ({ e, score: words.reduce((s, w) => s + (e.cat === w ? 3 : 0) + (e.tags.some(t => t.startsWith(w)) ? 2 : 0) + (e.id.includes(w) ? 1 : 0), 0) }))
    .filter(x => !words.length || x.score > 0)
    .sort((p, q) => q.score - p.score || p.e.dur - q.e.dur).slice(0, num(a.n, 8));
  if (!hits.length) { console.log('no match (try fewer words, or studio sfx cats)'); return; }
  for (const { e } of hits) console.log(`${e.id.padEnd(46)} ${e.cat.padEnd(8)} ${e.dur.toFixed(2).padStart(6)}s  hit ${e.hit.toFixed(2)}s  peak ${e.peak_db} dB  ${e.source}`);
}

function cats() {
  const t = {};
  for (const e of loadIndex()) { t[e.cat] ??= {}; t[e.cat][e.source] = (t[e.cat][e.source] || 0) + 1; }
  for (const [c, by] of Object.entries(t).sort()) console.log(`${c.padEnd(8)} ${Object.values(by).reduce((x, y) => x + y, 0).toString().padStart(4)}  ${JSON.stringify(by)}`);
}

// Editing-relevant libraries inside a bundle; long beds, crowds and location ambiences stay in the zip.
const KEEP_LIB = /ui|interface|infographic|transition|impact|whoosh|woosh|swoosh|swish|air designed|bass drop|downer|boom|braam|riser|glitch|paper|typewriter|keyboard|click|button|pop|cartoon|bloop|cards|cash|coin|camera|shutter|magic|sparkle|designed|hit|punch|fight|notification|stinger|trailer|swell|whip|game|alarm|elemental|bubble|book|telephone|cinema/i;
const SKIP_LIB = /ambien|walla|crowd|wind|rain|storm|forest|coast|highlands|train|restaurant|swimming|campfire|bonfire|factory|church|urban|fridge|clocks|haunting|ghostly|dog|dinosaur|east coast|radio|station|commute|transportation|public spaces|drones|textures/i;
// Windows' own bsdtar reads zips; elsewhere bsdtar (macOS tar, Linux libarchive-tools), else tar on PATH.
const TAR = IS_WIN ? path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe') : (fs.existsSync('/usr/bin/bsdtar') ? '/usr/bin/bsdtar' : 'tar');
function zipList(zip) {
  // bsdtar lines: perms links owner group size month day year|time name
  const out = String(exec(TAR, ['-tvf', zip]).stdout);
  return out.split(/\r?\n/).map(l => l.match(/^\S+\s+\d+\s+\S+\s+\S+\s+(\d+)\s+\S+\s+\d+\s+\S+\s+(.+)$/)).filter(Boolean)
    .map(m => ({ size: Number(m[1]), name: m[2] })).filter(e => AUDIO.test(e.name));
}
function importZips(a) {
  const zips = a._.slice(1);
  if (!zips.length || !a.to) { console.log(usage); return 1; }
  const to = path.resolve(STUDIO, a.to), maxMb = num(a['max-mb'], 30);
  let kept = 0, keptBytes = 0, skipped = 0;
  for (const zip of zips) {
    const all = zipList(zip);
    const pick = all.filter(e => {
      const lib = e.name.split('/')[0];
      return a.all || (KEEP_LIB.test(lib) && !SKIP_LIB.test(lib) && e.size <= maxMb * 1048576);
    });
    skipped += all.length - pick.length;
    kept += pick.length; keptBytes += pick.reduce((s, e) => s + e.size, 0);
    if (a['dry-run'] || !pick.length) continue;
    fs.mkdirSync(to, { recursive: true });
    for (let i = 0; i < pick.length; i += 40) exec(TAR, ['-xf', path.resolve(zip), '-C', to, ...pick.slice(i, i + 40).map(e => e.name)]);
  }
  console.log(`${a['dry-run'] ? 'would extract' : 'extracted'} ${kept} files (${(keptBytes / 1048576).toFixed(0)} MB) to ${rel(to)}; left ${skipped} in the zips`);
  if (!a['dry-run']) console.log('next: studio sfx index');
}

function kit() {
  const dir = path.join(P.library, 'sfx', 'synth');
  // sfx-kit.json is tracked but the WAVs are not, so a fresh clone checks for the sounds themselves.
  if (fs.existsSync(dir) && fs.readdirSync(dir).some(f => f.endsWith('.wav'))) { console.log(`synth kit already in ${rel(dir)}`); return; }
  exec(process.execPath, [path.join(BIN.houseScripts, 'make_sfx.mjs'), dir], { inherit: true });
}

export function run(argv) {
  const a = parseArgs(argv, ['all', 'dry-run']);
  const sub = a._[0];
  if (sub === 'index') return index();
  if (sub === 'find') return find(a);
  if (sub === 'cats') return cats();
  if (sub === 'import') return importZips(a);
  if (sub === 'kit') return kit();
  console.log(usage);
  return 1;
}
