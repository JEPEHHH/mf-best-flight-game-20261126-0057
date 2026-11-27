// RIDGELINE hand-in (Node 22, standard library only).
//
// The entry ships the browser game in game/ together with the four real
// renders in screenshots/, then writes dossier.json beside them. A clean
// container has no network and nothing installed, so every import here
// resolves inside the repository. MAKEFUN_OUTPUT_DIR overrides /output for
// local runs.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repo = fileURLToPath(new URL('.', import.meta.url));
const target = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Platform limits. Files and folders are counted together, so the game stays
// small and exactly the screenshot count the bounty asks for goes in.
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyInto(name) {
  const from = join(repo, name);
  if (!existsSync(from)) throw new Error('Missing folder: ' + from);
  const to = join(target, name);
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function pngNames(directory) {
  return readdirSync(join(directory, 'screenshots'))
    .filter((file) => !file.startsWith('.') && /\.(png|jpe?g)$/i.test(file))
    .sort();
}

mkdirSync(target, { recursive: true });
copyInto('game');
copyInto('screenshots');
writeFileSync(join(target, 'dossier.json'), buildDossier(target, caps));

// The count check runs against the copy, after the dossier has read it, so a
// wrong number of captures fails loudly instead of shipping a thin entry.
const shots = pngNames(target);
if (shots.length < 3 || shots.length > 4) {
  throw new Error('The bounty needs 3 or 4 screenshots, found ' + shots.length);
}
process.stdout.write('RIDGELINE handed in: ' + target + ' / cover: ' + shots[0] + '\n');
