// SOLMAR HEAT for gta6-01 (Node 22, standard library only): the entrypoint
// hands in the game. It copies this repository's game/ and screenshots/ to
// /output and writes /output/dossier.json with the vendored make.fun library
// (vendor/makefun-game.ts, unchanged). The game itself is plain static files
// under game/ — index.html plus ES modules and a vendored three.js minified
// build — so it plays offline from any static server with no network request.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Pre-flight checks: refuse to write a dossier the gate would refuse.
// The scorer caps screenshots at 4 files of 256 KiB each and requires
// game/index.html to exist; failing here, loudly, beats handing in a
// dossier.json built from a broken tree.
const gameIndex = join(here, 'game', 'index.html');
if (!existsSync(gameIndex)) throw new Error('pre-flight: game/index.html is missing');
const shotsDir = join(here, 'screenshots');
const shots = existsSync(shotsDir)
  ? readdirSync(shotsDir).filter((f) => !f.startsWith('.')).sort()
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`pre-flight: expected 3-4 screenshots, found ${shots.length}`);
}
for (const shot of shots) {
  const size = statSync(join(shotsDir, shot)).size;
  if (size > 262144) throw new Error(`pre-flight: screenshot ${shot} is ${size} bytes (max 262144)`);
}

// The gate caps game/ at 993 files/directories and 48 MiB in all; count the
// tree we are about to hand in and refuse when it would overflow, instead
// of letting the scorer refuse the entry.
function countTree(dir) {
  let entries = 0;
  let bytes = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    entries += 1;
    if (st.isDirectory()) {
      const sub = countTree(p);
      entries += sub.entries;
      bytes += sub.bytes;
    } else {
      bytes += st.size;
      if (Buffer.byteLength(p, 'utf8') - Buffer.byteLength(join(here, 'game'), 'utf8') > 1000) {
        throw new Error(`pre-flight: game path over 1000 bytes: ${p}`);
      }
    }
  }
  return { entries, bytes };
}
const tree = countTree(join(here, 'game'));
if (tree.entries > 993) throw new Error(`pre-flight: game/ has ${tree.entries} entries (max 993)`);
if (tree.bytes > 50331648) throw new Error(`pre-flight: game/ is ${tree.bytes} bytes (max 50331648)`);

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of game
// files, in all, or a path under game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);

console.log(
  `SOLMAR HEAT handed in: game/ ${tree.entries} entries, ${tree.bytes} bytes; `
  + `${shots.length} screenshots; dossier written to ${join(out, 'dossier.json')}`,
);
