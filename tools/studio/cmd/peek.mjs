// Compact views of big studio files so they never need to be read whole: transcripts, HyperFrames logs,
// any JSON (shape + first items), logs (errors + tail), compositions (scenes, clips, timing) and media.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, num, readJson, fmtT, fmtBytes } from '../lib/core.mjs';
import { oneLine } from './probe.mjs';
import { probe } from '../lib/core.mjs';

export const summary = 'Compact view of a transcript, log, JSON, composition or media file';
export const usage = `studio peek <file> [--n 40] [--from s] [--to s] [--depth 3]
transcript (words with start/end) -> text lines stamped every ~12 words, word count, WPM (use --from/--to)
.log / .txt                          -> error and warning lines, then the last --n lines
.json                                -> shape (keys, types, array lengths) and the first items
.html                                -> composition ids, scenes, timed clips, scripts, fonts, size
media                                -> one-line probe`;

const MEDIA = /\.(mp4|mov|mkv|webm|m4v|wav|mp3|m4a|aac|flac|ogg|png|jpg|jpeg|webp)$/i;

function shape(v, depth, ind = '') {
  if (Array.isArray(v)) return `array[${v.length}]` + (v.length && depth > 0 ? ` of ${shape(v[0], depth - 1, ind)}` : '');
  if (v && typeof v === 'object') {
    const ks = Object.keys(v);
    if (depth <= 0) return `{${ks.slice(0, 8).join(', ')}${ks.length > 8 ? ', …' : ''}}`;
    return '{\n' + ks.slice(0, 30).map(k => `${ind}  ${k}: ${shape(v[k], depth - 1, ind + '  ')}`).join('\n') + (ks.length > 30 ? `\n${ind}  … ${ks.length - 30} more keys` : '') + `\n${ind}}`;
  }
  if (typeof v === 'string') return v.length > 60 ? `string(${v.length}) "${v.slice(0, 57)}…"` : JSON.stringify(v);
  return String(v);
}

function transcript(words, a) {
  const from = num(a.from, -Infinity), to = num(a.to, Infinity);
  const w = words.filter(x => x.start >= from && x.start < to);
  if (!w.length) return 'no words in range';
  const span = w[w.length - 1].end - w[0].start, lines = [];
  for (let i = 0; i < w.length; i += 12) lines.push(`[${fmtT(w[i].start)}] ${w.slice(i, i + 12).map(x => x.text).join(' ')}`);
  const max = num(a.n, 40);
  const shown = lines.length > max ? [...lines.slice(0, Math.ceil(max / 2)), `… ${lines.length - max} lines skipped (use --from/--to) …`, ...lines.slice(-Math.floor(max / 2))] : lines;
  return `${w.length} words · ${fmtT(w[0].start)}–${fmtT(w[w.length - 1].end)} · ${Math.round(w.length / (span / 60))} wpm\n` + shown.join('\n');
}

function html(text, file) {
  const ids = [...text.matchAll(/data-composition-id="([^"]+)"/g)].map(m => m[1]);
  const clips = [...text.matchAll(/<([a-z0-9-]+)[^>]*\bid="([^"]+)"[^>]*\bdata-start="([\d.]+)"[^>]*\bdata-duration="([\d.]+)"/gi)];
  const scenes = [...text.matchAll(/data-composition-src="([^"]+)"/g)].map(m => m[1]);
  const scripts = [...text.matchAll(/<script[^>]*src="([^"]+)"/g)].map(m => m[1]);
  const fonts = [...new Set([...text.matchAll(/font-family:\s*['"]?([^;'",]+)/g)].map(m => m[1].trim()))];
  const out = [`${path.basename(file)} · ${fmtBytes(Buffer.byteLength(text))} · compositions: ${ids.join(', ') || 'none'}`];
  if (scenes.length) out.push(`scene files: ${scenes.join(', ')}`);
  out.push(`timed clips: ${clips.length}`);
  for (const m of clips.slice(0, 40)) out.push(`  ${(+m[3]).toFixed(2).padStart(7)} +${(+m[4]).toFixed(2).padEnd(6)} <${m[1]}> #${m[2]}`);
  if (clips.length > 40) out.push(`  … ${clips.length - 40} more`);
  out.push(`scripts: ${scripts.join(', ') || 'inline only'}`, `fonts: ${fonts.slice(0, 12).join(', ')}`);
  return out.join('\n');
}

export function run(argv) {
  const a = parseArgs(argv);
  const file = a._[0];
  if (!file) { console.log(usage); return 1; }
  if (MEDIA.test(file)) { console.log(oneLine(probe(file))); return 0; }
  const text = fs.readFileSync(file, 'utf8');
  const n = num(a.n, 40);
  let parsed = null;
  if (/\.json$/i.test(file)) { try { parsed = readJson(file); } catch { /* JSON lines: handled as text below */ } }
  if (parsed !== null) {
    const j = parsed;
    const words = Array.isArray(j) ? j : j.words;
    if (Array.isArray(words) && words.length && typeof words[0]?.start === 'number' && ('text' in words[0] || 'word' in words[0])) {
      console.log(transcript(words.map(w => ({ ...w, text: w.text ?? w.word })), a));
      return 0;
    }
    console.log(`${path.basename(file)} · ${fmtBytes(Buffer.byteLength(text))}\n${shape(j, num(a.depth, 3))}`);
    const first = Array.isArray(j) ? j.slice(0, 3) : null;
    if (first) console.log('first items:\n' + first.map(x => JSON.stringify(x).slice(0, 240)).join('\n'));
    return 0;
  }
  if (/\.html?$/i.test(file)) { console.log(html(text, file)); return 0; }
  const lines = text.split(/\r?\n/).filter(Boolean);
  // HyperFrames transcribe logs are JSON lines: summarize instead of printing the word arrays.
  if (lines[0]?.startsWith('{"type":')) {
    const kinds = {};
    let words = 0;
    for (const l of lines) { try { const j = JSON.parse(l); kinds[j.type] = (kinds[j.type] || 0) + 1; if (j.words) words += j.words.length; } catch {} }
    console.log(`${path.basename(file)} · ${lines.length} JSON lines · ${JSON.stringify(kinds)} · ${words} words`);
    console.log(lines.filter(l => !l.includes('"words"')).slice(-5).map(l => l.slice(0, 200)).join('\n'));
    return 0;
  }
  const bad = lines.filter(l => /error|fail|warn|exception/i.test(l)).slice(-10);
  console.log(`${path.basename(file)} · ${lines.length} lines · ${fmtBytes(Buffer.byteLength(text))}`);
  if (bad.length) console.log('errors/warnings (last 10):\n' + bad.map(l => '  ' + l.slice(0, 220)).join('\n'));
  console.log(`last ${Math.min(n, lines.length)} lines:\n` + lines.slice(-n).map(l => '  ' + l.replace(/\x1b\[[0-9;]*m/g, '').slice(0, 220)).join('\n'));
  return 0;
}
