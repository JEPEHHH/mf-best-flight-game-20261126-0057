// RIDGELINE entry point (Node 22, standard library only).
//
// The deliverable is a static browser game in game/ plus four real renders
// in screenshots/. This program assembles /output the same way on every run:
// copy the two folders, then write dossier.json with buildDossier. A fresh
// container has no network and no installed packages, so nothing here may
// reach outside the repository. MAKEFUN_OUTPUT_DIR replaces /output locally.

import { cpSync, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The platform counts files and directories together, so keep the game tiny
// and hand in exactly the number of screenshots the bounty asks for.
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyFolder(from, to) {
  if (!existsSync(from)) throw new Error('Missing folder: ' + from);
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

function readScreenshotNames(directory) {
  return readdirSync(join(directory, 'screenshots'))
    .filter((name) => !name.startsWith('.') && /\.(png|jpe?g)$/i.test(name))
    .sort();
}

mkdirSync(outputDir, { recursive: true });
copyFolder(join(repoRoot, 'game'), join(outputDir, 'game'));
copyFolder(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'));
writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, caps));

const shots = readScreenshotNames(outputDir);
if (shots.length < 3 || shots.length > 4) {
  throw new Error('The bounty needs 3 or 4 screenshots, found ' + shots.length);
}
process.stdout.write('RIDGELINE handed in: ' + outputDir + ' / cover: ' + shots[0] + '\n');
