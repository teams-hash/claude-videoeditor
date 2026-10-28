// Platform exports from a finished master: H.264 High / yuv420p / CFR / BT.709 tags / AAC-LC 48 kHz / faststart,
// bitrate caps per platform, and a spec check (aspect, size, length, file size) before anything is written.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, probe, ffmpeg, readJson, rel, assertWritable, fmtBytes } from '../lib/core.mjs';

export const summary = 'Platform export (reels, tiktok, shorts, youtube, linkedin, x, master) with spec check';
export const usage = `studio export <master.mp4> --platform reels|tiktok|shorts|youtube|linkedin|x|master [-o out.mp4] [--check]
               [--fit none|pad|crop] [--force]
--check    only compare the file with the platform spec (no encode); exit 1 on FAIL
--fit      when the aspect differs from the platform's: none (default, refuse: reframing is an editing decision),
           pad (letterbox on black) or crop (centre crop)
Output defaults to <master name>-<platform>.mp4 beside the master; an existing file is never overwritten without --force.
Specs live in tools/studio/presets/platforms.json (checked date and sources inside).`;

const SPEC = readJson(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'presets', 'platforms.json'));

export function check(info, key) {
  const s = SPEC.platforms[key], out = [];
  if (!s) throw new Error(`unknown platform ${key}`);
  const v = info.video, add = (level, msg) => out.push({ level, msg });
  if (!v) add('FAIL', 'no video stream');
  else {
    if (s.aspect) {
      const [x, y] = s.aspect.split(':').map(Number);
      if (Math.abs(v.displayWidth / v.displayHeight - x / y) > 0.01) add('FAIL', `aspect ${v.displayWidth}x${v.displayHeight} is not ${s.aspect}`);
      else if (s.width && v.displayWidth < s.width) add('WARN', `${v.displayWidth}x${v.displayHeight} is below ${s.width}x${s.height}`);
    }
    if (s.maxLongEdge && Math.max(v.displayWidth, v.displayHeight) > s.maxLongEdge) add('WARN', `long edge over ${s.maxLongEdge}px`);
    if (!['h264', 'hevc'].includes(v.codec)) add('FAIL', `video codec ${v.codec} (use H.264)`);
    if (v.pixFmt !== 'yuv420p') add('WARN', `pixel format ${v.pixFmt} (platforms expect yuv420p)`);
    if (v.vfr) add('WARN', 'variable frame rate');
  }
  if (!info.audio) add('WARN', 'no audio stream');
  else {
    if (info.audio.codec !== 'aac') add('WARN', `audio codec ${info.audio.codec} (AAC-LC expected)`);
    if (info.audio.sampleRate !== 48000) add('WARN', `audio ${info.audio.sampleRate} Hz (48 kHz expected)`);
  }
  const unv = s.verified ? '' : ' (limit unverified)';
  if (s.maxSeconds && info.duration > s.maxSeconds) add(s.verified ? 'FAIL' : 'WARN', `${info.duration.toFixed(1)} s is over the ${s.maxSeconds} s limit${unv}`);
  else if (s.recommendSeconds && info.duration > s.recommendSeconds) add('WARN', `${info.duration.toFixed(1)} s is over ${s.recommendSeconds} s (reach/recommendation threshold)${unv}`);
  if (s.maxBytes && info.size > s.maxBytes) add(s.verified ? 'FAIL' : 'WARN', `${fmtBytes(info.size)} is over ${fmtBytes(s.maxBytes)}${unv}`);
  return out;
}

export function run(argv) {
  const a = parseArgs(argv, ['check', 'force']);
  const input = a._[0], key = a.platform;
  if (!input || !key) { console.log(usage); return 1; }
  const s = SPEC.platforms[key];
  if (!s) throw new Error(`unknown platform "${key}" (${Object.keys(SPEC.platforms).join(', ')})`);
  const info = probe(input);
  const issues = check(info, key);
  if (a.check) {
    for (const i of issues) console.log(`${i.level}  ${i.msg}`);
    console.log(issues.length ? '' : 'PASS  matches the spec', `· ${s.label}${s.verified ? '' : ' (some limits unverified)'}`);
    return issues.some(i => i.level === 'FAIL') ? 1 : 0;
  }
  const fit = a.fit || 'none';
  const aspectFail = issues.find(i => i.msg.startsWith('aspect'));
  if (aspectFail && fit === 'none') throw new Error(`${aspectFail.msg}. Reframe the edit, or pass --fit pad|crop`);
  const out = a.out || path.join(path.dirname(path.resolve(input)), `${path.basename(input, path.extname(input))}-${key}.mp4`);
  if (fs.existsSync(out) && !a.force) throw new Error(`${rel(out)} exists (new version = new filename, or --force)`);
  assertWritable(out);

  const v = info.video, fps = Math.min(60, Math.round((v.fps || 30) * 1000) / 1000);
  const vf = [];
  if (s.width && (aspectFail || v.displayWidth !== s.width)) {
    if (fit === 'crop') vf.push(`scale=${s.width}:${s.height}:force_original_aspect_ratio=increase`, `crop=${s.width}:${s.height}`);
    else vf.push(`scale=${s.width}:${s.height}:force_original_aspect_ratio=decrease`, `pad=${s.width}:${s.height}:(ow-iw)/2:(oh-ih)/2:color=black`);
  }
  vf.push(`fps=${fps}`, 'format=yuv420p', 'setsar=1');
  const gop = s.gop === 'half' ? Math.max(1, Math.round(fps / 2)) : Math.round(fps * 2);
  const args = ['-v', 'error', '-y', '-i', input, '-map', '0:v:0', ...(info.audio ? ['-map', '0:a:0'] : []), '-vf', vf.join(','),
    '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-crf', String(s.crf), '-bf', '2', '-g', String(gop), '-keyint_min', String(Math.min(gop, Math.round(fps))),
    ...(s.gop === 'half' ? ['-flags', '+cgop'] : []), ...(s.maxrate ? ['-maxrate', s.maxrate, '-bufsize', `${parseInt(s.maxrate, 10) * 2}M`] : []),
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-tag:v', 'avc1',
    ...(info.audio ? ['-c:a', 'aac', '-b:a', `${s.audioKbps}k`, '-ar', '48000', '-ac', '2'] : []), '-movflags', '+faststart', out];
  ffmpeg(args);
  const o = probe(out), post = check(o, key);
  console.log(`${s.label}: ${o.video.displayWidth}x${o.video.displayHeight} ${+o.video.fps.toFixed(3)}fps · ${(o.bitrate / 1e6).toFixed(1)} Mb/s · ${fmtBytes(o.size)} -> ${rel(out)}`);
  for (const i of post) console.log(`${i.level}  ${i.msg}`);
  return post.some(i => i.level === 'FAIL') ? 1 : 0;
}
