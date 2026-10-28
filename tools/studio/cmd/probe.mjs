// Compact media facts: duration, display size, fps, codecs, bitrate, audio, rotation and VFR flags.
import path from 'node:path';
import { parseArgs, probe, fmtBytes } from '../lib/core.mjs';

export const summary = 'Compact media info, one line per file (or --json)';
export const usage = `studio probe <file...> [--json]
One line per file: duration, display size, fps, video codec/profile/pixel format, bitrate, audio, size,
plus rotation and VFR warnings. --json prints the full structured probe.`;

export function oneLine(p) {
  const v = p.video, a = p.audio, bits = [path.basename(p.file), `${p.duration.toFixed(2)}s`];
  if (v) bits.push(`${v.displayWidth}x${v.displayHeight}`, `${+v.fps.toFixed(3)}fps`, [v.codec, v.profile, v.pixFmt].filter(Boolean).join(' '));
  if (p.bitrate) bits.push(`${(p.bitrate / 1e6).toFixed(1)} Mb/s`);
  bits.push(a ? `${a.codec} ${Math.round(a.sampleRate / 1000)}k ${a.channels}ch` : 'no audio', fmtBytes(p.size));
  if (v?.rotation) bits.push(`rotation ${v.rotation}`);
  if (v?.vfr) bits.push('VFR');
  return bits.join(' · ');
}

export function run(argv) {
  const a = parseArgs(argv, ['json']);
  if (!a._.length) { console.log(usage); return 1; }
  const all = a._.map(f => probe(f));
  if (a.json) console.log(JSON.stringify(all.length === 1 ? all[0] : all, null, 1));
  else for (const p of all) console.log(oneLine(p));
  return 0;
}
