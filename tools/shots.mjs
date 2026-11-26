// Capture three real renders of the game's own code from a Chromium browser.
// Run from the repository root with NODE_PATH pointing at a Playwright install.
// The script never edits a pixel: it only positions the simulated aircraft and
// asks the running game to render, then asks the browser to save the canvas.

import { chromium } from '/tmp/pw-shot/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const root = process.cwd();
const gameRoot = join(root, 'game');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const rel = normalize(path === '/' ? '/index.html' : path).replace(/^(\.\.[/\\])+/, '');
  try {
    const body = await readFile(join(gameRoot, rel));
    res.writeHead(200, { 'content-type': types[extname(rel)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto('http://127.0.0.1:' + port + '/index.html');
await page.evaluate(() => document.getElementById('booth').classList.add('hidden'));
await page.waitForFunction(() => !!window.__flightGame);

async function shot(name, setup) {
  await page.evaluate(setup);
  await page.waitForTimeout(160);
  await page.locator('#view').screenshot({ path: join(root, 'screenshots', name) });
}

await mkdir(join(root, 'screenshots'), { recursive: true });

await shot('01-departure.png', () => {
  const g = window.__flightGame;
  g.pause(); g.reset();
  g.setPlane({ ...g.plane, x: -180, y: 218, z: -880, heading: 0.06, pitch: 0.03, bank: -0.16, speed: 132, throttle: 0.74, elapsed: 12, distance: 1240, gear: false });
  g.render();
});

await shot('02-gate-run.png', () => {
  const g = window.__flightGame;
  g.pause(); g.reset();
  g.setPlane({ ...g.plane, x: -300, y: 232, z: -145, heading: 0.34, pitch: 0.02, bank: 0.42, speed: 148, throttle: 0.82, elapsed: 41, distance: 4300, gear: false });
  const m = g.mission;
  m.gateIndex = 1; m.score = 268; m.message = 'GATE G1 CLEARED +268 — NEXT: G2'; m.messageAge = 2.4;
  g.setMission({ ...m });
  g.render();
});

await shot('03-final-approach.png', () => {
  const g = window.__flightGame;
  g.pause(); g.reset();
  g.setPlane({ ...g.plane, x: 18, y: 96, z: 690, heading: -0.04, pitch: -0.06, bank: 0.08, speed: 94, throttle: 0.42, elapsed: 128, distance: 15600, gear: true, fuel: 34, damage: 4 });
  const m = g.mission;
  m.gateIndex = 6; m.phase = 'landing'; m.score = 1214; m.message = 'ALL GATES CLEARED — RETURN TO THE STRIP, GEAR DOWN'; m.messageAge = 2.6;
  g.setMission({ ...m });
  g.render();
});

await browser.close();
await new Promise((resolve) => server.close(resolve));
if (errors.length) { console.error('PAGE ERRORS', errors); process.exitCode = 1; }
else console.log('Captured 3 screenshots from the live game');
