// Local read-only checks that mirror the bounty's five gate rows closely
// enough to catch mistakes before handing in. No dependencies, no writes.

import { readdirSync, readFileSync, lstatSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';

const root = process.argv[2] ?? 'out';
const gameRoot = join(root, 'game');
const problems = [];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    const st = lstatSync(path);
    if (st.isSymbolicLink()) { problems.push('symlink: ' + path); continue; }
    if (st.isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

const files = walk(gameRoot);
if (files.length > 993) problems.push('too many files: ' + files.length);
let totalBytes = 0;
for (const f of files) totalBytes += lstatSync(f).size;
if (totalBytes > 50331648) problems.push('game too large: ' + totalBytes);

const html = readFileSync(join(gameRoot, 'index.html'), 'utf8');
const refs = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]);
for (const ref of refs) {
  if (ref.startsWith('data:')) continue;
  if (/^[a-z]+:/i.test(ref) || ref.startsWith('//')) { problems.push('network ref: ' + ref); continue; }
  if (!lstatSync(join(gameRoot, ref)).isFile()) problems.push('missing ref: ' + ref);
}

for (const f of files) {
  if (!/\.(js|mjs)$/.test(f)) continue;
  const text = readFileSync(f, 'utf8');
  if (/https?:\/\//.test(text)) problems.push('url in script: ' + f);
  for (const m of text.matchAll(/(?:from\s+|import\s*\(|export\s+.*from\s+)['"]([^'"]+)['"]/g)) {
    const spec = m[1];
    if (spec.startsWith('data:') || spec.startsWith('node:')) continue;
    if (!spec.startsWith('.')) { problems.push('bare specifier: ' + f + ' -> ' + spec); continue; }
    const target = resolve(dirname(f), spec);
    if (!target.startsWith(resolve(gameRoot))) problems.push('escapes game/: ' + f + ' -> ' + spec);
    if (!lstatSync(target).isFile()) problems.push('missing import: ' + f + ' -> ' + spec);
  }
}

const shots = readdirSync(join(root, 'screenshots')).filter((n) => !n.startsWith('.'));
if (shots.length < 3 || shots.length > 4) problems.push('screenshot count: ' + shots.length);
for (const name of shots) {
  const bytes = readFileSync(join(root, 'screenshots', name));
  if (bytes.length > 262144) problems.push('screenshot too big: ' + name);
  if (bytes[0] !== 0x89 || bytes[1] !== 0x50) problems.push('not PNG: ' + name);
  const w = bytes.readUInt32BE(16), h = bytes.readUInt32BE(20);
  if (Math.max(w, h) > 1280 || Math.min(w, h) < 480) problems.push('bad size: ' + name);
}

const dossier = JSON.parse(readFileSync(join(root, 'dossier.json'), 'utf8'));
if (dossier.schema !== 'makefun/dossier/v1') problems.push('bad dossier schema');
if (dossier.images.length !== shots.length) problems.push('dossier images mismatch');
if (Buffer.byteLength(JSON.stringify(dossier)) > 1.5 * 1024 * 1024) problems.push('dossier too big');

console.log(problems.length ? problems.join('\n') : 'LOCAL GATE CHECKS OK — files ' + files.length + ', bytes ' + totalBytes + ', shots ' + shots.length);
process.exitCode = problems.length ? 1 : 0;
