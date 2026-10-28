// SessionStart hook: print the ten-line studio status (projects, newest exports, library) into the session context,
// so a new session starts oriented without exploring folders. Never fails the session.
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

try {
  const status = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'studio', 'cmd', 'status.mjs');
  await (await import(pathToFileURL(status).href)).run();
} catch (e) {
  console.log(`Studio status unavailable (${e.message.split('\n')[0]}). Run: node tools/studio/studio.mjs status`);
}
