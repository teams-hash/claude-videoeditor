// Registry search through the pinned, cached HyperFrames CLI (an unpinned npx call may try to download a newer one).
import { parseArgs, hf, num } from '../lib/core.mjs';

export const summary = 'Search the HyperFrames registry (~450 blocks and components) with the pinned CLI';
export const usage = `studio catalog [words] [--tag transition|camera|captions|text|data|...] [--type block|component] [--n 25] [--json]
Prints name, type and tags per match. Install one into a project with: npx --yes hyperframes@<pinned> add <name> --dir <hf>
(the pinned version is HF_VERSION in tools/studio/lib/core.mjs). House components: studio motion list.`;

export function run(argv) {
  const a = parseArgs(argv, ['json']);
  const args = ['catalog', ...a._, '--json'];
  if (a.tag) args.push('--tag', String(a.tag));
  if (a.type) args.push('--type', String(a.type));
  const out = String(hf(args).stdout);
  const s = out.indexOf('[') >= 0 && (out.indexOf('{') < 0 || out.indexOf('[') < out.indexOf('{')) ? out.indexOf('[') : out.indexOf('{');
  let items = JSON.parse(out.slice(s));
  if (!Array.isArray(items)) items = items.items || items.results || [];
  if (a.json) { console.log(JSON.stringify(items, null, 1)); return 0; }
  if (!items.length) { console.log('no match (try one word, or --tag)'); return 0; }
  for (const i of items.slice(0, num(a.n, 25))) console.log(`${String(i.name).padEnd(30)} ${String(i.type).padEnd(10)} ${[].concat(i.tags || []).slice(0, 4).join(', ')}`);
  if (items.length > num(a.n, 25)) console.log(`… ${items.length - num(a.n, 25)} more (--n)`);
  return 0;
}
