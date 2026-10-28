// Person matte for a clip. Default engine is Robust Video Matting: on the GPU through DirectML on Windows (any
// vendor), on the CPU elsewhere. npx hyperframes remove-background only offers CPU/CoreML/CUDA.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, num, run as exec, hf, BIN, outDirFor, rel, assertWritable, STUDIO, IS_WIN } from '../lib/core.mjs';

export const summary = 'Person matte: RVM on the GPU (default) or HyperFrames remove-background';
export const usage = `studio matte <video> [-o out] [--engine rvm|hf] [--model resnet50|mobilenetv3] [--ratio 0.25] [--edl edl.json] [--cpu]
rvm: writes a lossless gray alpha video (.mkv, FFV1) with the same frame count. --edl resets the recurrent state
     at each jump cut so every take converges. resnet50 (default) gave 35-38% less flicker than HyperFrames' u2net on
     c0473 and runs ~3.7 fps at 1080p (~8 min per minute); mobilenetv3 is faster for drafts. --ratio is the
     internal downsample (0.25 for 1080p, 0.4 for 540p).
hf:  npx hyperframes remove-background -> transparent .webm (or .mov) on the CPU.
Use the alpha with ffmpeg alphamerge (give both inputs setpts=PTS-STARTPTS) or as a HyperFrames cut-out layer.`;

export function run(argv) {
  const a = parseArgs(argv, ['cpu']);
  const video = a._[0];
  if (!video) { console.log(usage); return 1; }
  const engine = a.engine || 'rvm';
  const base = path.basename(video, path.extname(video));
  if (engine === 'hf') {
    const out = assertWritable(a.out || path.join(outDirFor(video, 'matte'), `${base}.cutout.webm`));
    hf(['remove-background', path.resolve(video), '-o', path.resolve(out)], { inherit: true });
    console.log(`cut-out -> ${rel(out)}`);
    return 0;
  }
  if (!fs.existsSync(BIN.rvmPy)) throw new Error('RVM env missing: tools/rvm/venv (run: node tools/setup/setup.mjs --matte)');
  const out = assertWritable(a.out || path.join(outDirFor(video, 'matte'), `${base}.matte.mkv`));
  const model = path.join(STUDIO, 'tools', 'rvm', 'models', `rvm_${a.model === 'mobilenetv3' ? 'mobilenetv3' : 'resnet50'}_fp32.onnx`);
  const args = [BIN.rvm, '--input', path.resolve(video), '--out', path.resolve(out), '--model', model, '--provider', a.cpu || !IS_WIN ? 'cpu' : 'dml', '--ratio', String(num(a.ratio, 0.25))];
  if (a.edl) args.push('--edl', path.resolve(a.edl));
  exec(BIN.rvmPy, args, { inherit: true, cwd: path.dirname(BIN.rvm) });
  console.log(`matte -> ${rel(out)}`);
  return 0;
}
