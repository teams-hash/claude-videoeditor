// Grade library: looks defined once as ffmpeg colour chains (LIBRARY/grades/looks.json), baked to .cube LUTs
// through a HALD identity image, applied to footage at a chosen strength, and compared side by side on a frame.
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs, num, probe, ffmpeg, readJson, tmpDir, rel, assertWritable, P, outDirFor } from '../lib/core.mjs';
import { labelFilter } from '../lib/frames.mjs';
import { LABEL_FONT_DIR } from '../lib/core.mjs';

export const summary = 'Grade looks: list, apply at a strength, bake .cube LUTs, compare on a frame';
export const usage = `studio grade list
studio grade apply <in> <look> [-o out.mp4] [--strength 1.0] [--no-finish]
studio grade bake [look...]            write LIBRARY/grades/cube/<look>.cube (36^3, from the colour chain only)
studio grade sheet <video|image> [--at 3.2] [--looks a,b,c] [-o sheet.jpg]
studio grade verify                    bake round-trip check: LUT vs. direct chain, mean error per look
Looks have a "color" chain (per-pixel, bakeable) and an optional "finish" chain (vignette, grain: spatial,
never baked). Inside HyperFrames compositions use npx hyperframes media-treatment instead of CSS filters.`;

const DIR = path.join(P.library, 'grades');
const looks = () => readJson(path.join(DIR, 'looks.json')).looks;
const look = id => { const l = looks().find(x => x.id === id); if (!l) throw new Error(`unknown look "${id}" (studio grade list)`); return l; };
const N = 6; // HALD level 6 -> 36x36x36 cube

function bake(ids) {
  const out = path.join(DIR, 'cube'), dir = tmpDir('hald');
  fs.mkdirSync(out, { recursive: true });
  for (const l of ids.length ? ids.map(look) : looks()) {
    const raw = path.join(dir, `${l.id}.rgb`);
    ffmpeg(['-v', 'error', '-y', '-f', 'lavfi', '-i', `haldclutsrc=level=${N}`, '-frames:v', '1', '-vf', `format=rgb48le,${l.color},format=rgb48le`, '-f', 'rawvideo', '-pix_fmt', 'rgb48le', raw]);
    const b = fs.readFileSync(raw), n = N * N, lines = [`TITLE "${l.name}"`, `# studio look ${l.id}: ${l.use}`, `LUT_3D_SIZE ${n}`, 'DOMAIN_MIN 0 0 0', 'DOMAIN_MAX 1 1 1'];
    // HALD pixel order is r fastest, then g, then b: the same order .cube expects.
    for (let i = 0; i < n * n * n; i++) lines.push([0, 2, 4].map(o => (b.readUInt16LE(i * 6 + o) / 65535).toFixed(6)).join(' '));
    fs.writeFileSync(path.join(out, `${l.id}.cube`), lines.join('\n') + '\n');
    console.log(`baked ${l.id}.cube`);
  }
  fs.rmSync(dir, { recursive: true, force: true });
}

function verify() {
  const cube = path.join(DIR, 'cube');
  for (const l of looks()) {
    const c = path.join(cube, `${l.id}.cube`);
    if (!fs.existsSync(c)) { console.log(`${l.id.padEnd(18)} not baked`); continue; }
    const r = ffmpeg(['-v', 'info', '-f', 'lavfi', '-i', 'testsrc2=s=640x360:d=0.1,format=rgb24', '-f', 'lavfi', '-i', 'testsrc2=s=640x360:d=0.1,format=rgb24', '-filter_complex',
      `[0:v]${l.color},format=rgb24[a];[1:v]lut3d=file='${path.basename(c)}':interp=tetrahedral,format=rgb24[b];[a][b]psnr`, '-f', 'null', '-'], { cwd: cube });
    const psnr = (String(r.stderr).match(/average:([\d.inf]+)/) || [])[1];
    console.log(`${l.id.padEnd(18)} LUT vs chain PSNR ${psnr} dB`);
  }
}

function apply(a) {
  const [, input, id] = a._;
  if (!input || !id) { console.log(usage); return 1; }
  const l = look(id), s = Math.min(1, Math.max(0, num(a.strength, 1)));
  const out = assertWritable(a.out || path.join(outDirFor(input, 'grade'), `${path.basename(input, path.extname(input))}.${id}${path.extname(input)}`));
  const finish = !a['no-finish'] && l.finish ? `,${l.finish}` : '';
  const vf = s >= 0.999 ? `${l.color}${finish}` : null;
  const info = probe(input);
  const args = ['-v', 'error', '-y', '-i', input];
  if (vf) args.push('-vf', vf);
  else args.push('-filter_complex', `[0:v]split[o][g];[g]${l.color}[gc];[o][gc]blend=all_mode=normal:all_opacity=${s.toFixed(3)}${finish}[v]`, '-map', '[v]');
  if (vf) args.push('-map', '0:v:0');
  if (info.audio) args.push('-map', '0:a:0', '-c:a', 'copy');
  args.push(...(/\.(png|jpe?g)$/i.test(out) ? ['-frames:v', '1'] : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p']), out);
  ffmpeg(args);
  console.log(`${id} at ${Math.round(s * 100)}% -> ${rel(out)}`);
}

function sheet(a) {
  const input = a._[1];
  if (!input) { console.log(usage); return 1; }
  const info = probe(input), t = num(a.at, (info.duration || 0) / 2);
  const ids = a.looks ? String(a.looks).split(',') : looks().map(l => l.id);
  const all = [{ id: 'original', color: 'null', name: 'original' }, ...ids.map(look)];
  const W = info.video.displayWidth, H = info.video.displayHeight, tile = H > W ? 300 : 420, dir = tmpDir('grades');
  all.forEach((l, i) => ffmpeg(['-v', 'error', '-y', ...(info.duration ? ['-ss', String(t)] : []), '-i', path.resolve(input), '-frames:v', '1',
    '-vf', `${l.color}${l.finish ? ',' + l.finish : ''},scale=${tile}:-2,${labelFilter(l.id, tile)}`, path.join(dir, `g${String(i).padStart(2, '0')}.png`)], { cwd: LABEL_FONT_DIR }));
  const cols = Math.min(all.length, H > W ? 5 : 3), rows = Math.ceil(all.length / cols);
  const out = assertWritable(a.out || path.join(outDirFor(input, 'grade'), `${path.basename(input, path.extname(input))}-grades.jpg`));
  ffmpeg(['-v', 'error', '-y', '-framerate', '1', '-i', path.join(dir, 'g%02d.png'), '-vf', `tile=${cols}x${rows}:padding=6:margin=6:color=0x111111`, '-frames:v', '1', '-q:v', '3', path.resolve(out)]);
  fs.rmSync(dir, { recursive: true, force: true });
  console.log(`${all.length} looks at ${t.toFixed(2)}s -> ${rel(out)}`);
}

export function run(argv) {
  const a = parseArgs(argv, ['no-finish']);
  const sub = a._[0];
  if (sub === 'list') { for (const l of looks()) console.log(`${l.id.padEnd(18)} ${l.use}`); return 0; }
  if (sub === 'bake') return bake(a._.slice(1));
  if (sub === 'verify') return verify();
  if (sub === 'apply') return apply(a);
  if (sub === 'sheet') return sheet(a);
  console.log(usage);
  return 1;
}
