// Voice clean-up chain: DeepFilterNet (delay-compensated, with an attenuation limit so the room tone stays
// natural), then high-pass, de-mud, presence, de-ess and gentle levelling. Reports noise floor and speech level
// before and after, so the gain is measured rather than guessed. Timing is unchanged (sample-aligned output).
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, num, probe, ffmpeg, run as exec, decodeMono, windowDb, percentile, tmpDir, rel, assertWritable, BIN, outDirFor } from '../lib/core.mjs';

export const summary = 'Voice clean-up: DeepFilterNet + EQ/de-ess/leveller, with before/after noise report';
export const usage = `studio voice-clean <in.wav|video> [-o out.wav] [--strength light|medium|strong] [--no-dfn] [--hpf 80]
                        [--deess 0.35] [--no-comp]
light/medium/strong cap DeepFilterNet's noise attenuation at 12 / 20 / 100 dB (medium keeps a natural room).
Output: mono 48 kHz 24-bit WAV, same length and timing as the input. Run it on the cut voice track
(or the source audio before cutting), then mix with studio mix --voice.`;

// Offset of `b` against `a` in seconds (positive = b is late), by cross-correlation on a 12 s window at 8 kHz.
function lagSeconds(a, b) {
  const sr = 8000, x = decodeMono(a, sr), y = decodeMono(b, sr);
  const from = Math.min(sr * 2, Math.floor(x.length / 4)), to = Math.min(x.length - 800, from + sr * 12);
  let best = -Infinity, lag = 0;
  for (let L = -400; L <= 400; L++) {
    let s = 0;
    for (let i = from; i < to; i += 2) s += x[i] * (y[i + L] || 0);
    if (s > best) { best = s; lag = L; }
  }
  return lag / sr;
}

function levels(file) {
  const db = windowDb(decodeMono(file, 16000), 16000, 50);
  const floor = percentile(db, 0.1), speech = percentile(db, 0.9);
  return { floor: +floor.toFixed(1), speech: +speech.toFixed(1), snr: +(speech - floor).toFixed(1) };
}

export function run(argv) {
  const a = parseArgs(argv, ['no-dfn', 'no-comp']);
  const input = a._[0];
  if (!input) { console.log(usage); return 1; }
  const info = probe(input);
  if (!info.audio) throw new Error('input has no audio');
  const out = assertWritable(a.out || path.join(outDirFor(input, 'audio'), `${path.basename(input, path.extname(input))}.clean.wav`));
  const dir = tmpDir('voice');
  const mono = path.join(dir, 'voice.wav');
  ffmpeg(['-v', 'error', '-y', '-i', input, '-map', '0:a:0', '-ac', '1', '-ar', '48000', '-c:a', 'pcm_s16le', mono]);
  const before = levels(mono);

  let stage = mono;
  if (!a['no-dfn']) {
    if (!fs.existsSync(BIN.dfn)) throw new Error(`DeepFilterNet missing: ${rel(BIN.dfn)} (run node tools/setup/setup.mjs, or pass --no-dfn)`);
    const lim = { light: 12, medium: 20, strong: 100 }[a.strength || 'medium'] ?? 20;
    const od = path.join(dir, 'dfn');
    exec(BIN.dfn, ['-D', '-a', String(lim), '-o', od, mono]);
    stage = path.join(od, 'voice.wav');
    if (!fs.existsSync(stage)) throw new Error('DeepFilterNet produced no output');
  }
  // DeepFilterNet can leave a few ms of offset and drop the last frames: realign and restore the exact length.
  const samples = Math.round(probe(mono).duration * 48000);
  const lag = stage === mono ? 0 : lagSeconds(mono, stage);
  const align = lag > 0 ? `atrim=start=${lag.toFixed(5)},asetpts=PTS-STARTPTS` : lag < 0 ? `adelay=${(-lag * 1000).toFixed(3)}` : null;
  const chain = [
    ...(align ? [align] : []),
    `highpass=f=${num(a.hpf, 80)}:poles=2`,
    'equalizer=f=280:t=q:w=1.1:g=-1.5',
    'equalizer=f=4800:t=q:w=0.9:g=1.5',
    `deesser=i=${num(a.deess, 0.35)}:m=0.5:f=0.5:s=o`,
    ...(a['no-comp'] ? [] : ['acompressor=threshold=-21dB:ratio=2.5:attack=8:release=140:makeup=2:knee=4']),
    'alimiter=limit=0.94:attack=3:release=50:level=false:latency=1',
    `apad=whole_len=${samples}`, `atrim=end_sample=${samples}`,
  ].join(',');
  ffmpeg(['-v', 'error', '-y', '-i', stage, '-af', chain, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s24le', out]);
  const after = levels(out);
  const dIn = probe(mono).duration, dOut = probe(out).duration;
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`before  floor ${before.floor} dB · speech ${before.speech} dB · SNR ${before.snr} dB`);
  console.log(`after   floor ${after.floor} dB · speech ${after.speech} dB · SNR ${after.snr} dB  (${a['no-dfn'] ? 'EQ only' : `DeepFilterNet ${a.strength || 'medium'}`})`);
  console.log(`length  ${dIn.toFixed(3)} s -> ${dOut.toFixed(3)} s · offset corrected ${(lag * 1000).toFixed(2)} ms · ${rel(out)}`);
  return 0;
}
