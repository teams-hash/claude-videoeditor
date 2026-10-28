// PreToolUse hook (Read): stop whole-file reads of big text files and of media, which flood the context.
// Ranged reads (offset/limit), images and PDFs pass. Exit 2 blocks the call and sends stderr back to Claude.
import fs from 'node:fs';

const LIMIT = 150 * 1024;
let input = '';
process.stdin.on('data', d => { input += d; }).on('end', () => {
  let j;
  try { j = JSON.parse(input); } catch { process.exit(0); }
  const ti = j.tool_input || {}, f = ti.file_path;
  if (!f || ti.limit || ti.offset) process.exit(0);
  if (/\.(png|jpe?g|gif|webp|bmp|pdf|ipynb)$/i.test(f)) process.exit(0);
  if (/\.(mp4|mov|mkv|webm|m4v|wav|mp3|m4a|aac|ogg|flac|onnx|exe|dll|zip|woff2?|ttf|otf)$/i.test(f)) {
    console.error(`read-guard: ${f} is media or binary. Use: node tools/studio/studio.mjs probe "<file>" (or sheet / peek).`);
    process.exit(2);
  }
  let size;
  try { size = fs.statSync(f).size; } catch { process.exit(0); }
  if (size <= LIMIT) process.exit(0);
  console.error(`read-guard: ${f} is ${Math.round(size / 1024)} KB. Don't read it whole: node tools/studio/studio.mjs peek "<file>" summarizes it; or grep for what you need, or Read with offset/limit.`);
  process.exit(2);
});
