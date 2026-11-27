// Capture four real renders of the game's own code from a Chromium browser.
// Run from the repository root with Playwright at /tmp/pw-shot.
// The script never edits a pixel: it only positions the simulated aircraft and
// the light, asks the running game to render, then asks the browser to save
// the canvas.

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
await page.evaluate(() => { document.getElementById('booth').classList.add('hidden'); document.getElementById('hint').style.display = 'none'; });
await page.waitForFunction(() => !!window.__flightGame);

async function shot(name, setup) {
  await page.evaluate(setup);
  await page.waitForTimeout(220);
  await page.locator('#view').screenshot({ path: join(root, 'screenshots', name) });
}

await mkdir(join(root, 'screenshots'), { recursive: true });

// 1. Cockpit on final: dusk, gear down, the strip's approach bars ahead.
await shot('01-cockpit-final.png', () => {
  const g = window.__flightGame;
  g.pause(); g.reset();
  g.setView('cockpit'); g.setTod(0.63);
  g.setPlane({ ...g.plane, x: 6, y: 52, z: 640, heading: 0.02, pitch: -0.03, bank: 0.05, speed: 98, throttle: 0.44, elapsed: 141, distance: 17200, gear: true, fuel: 21, damage: 6 });
  const m = g.mission;
  m.gateIndex = 6; m.phase = 'landing'; m.score = 1180; m.message = 'FINAL — STRIP 07, WHEELS DOWN'; m.messageAge = 2.6;
  g.setMission({ ...m });
  g.render();
});

// 2. Hard bank through the second gate in the chase view.
await shot('02-gate-flythrough.png', () => {
  const g = window.__flightGame;
  g.pause(); g.reset();
  g.setView('chase'); g.setTod(0.34);
  g.setPlane({ ...g.plane, x: -318, y: 226, z: -78, heading: 0.62, pitch: 0.03, bank: 0.44, speed: 152, throttle: 0.86, elapsed: 44, distance: 4600, gear: false });
  const m = g.mission;
  m.gateIndex = 1; m.score = 271; m.message = 'GATE G1 CLEARED +271 — NEXT: G2'; m.messageAge = 2.4;
  g.setMission({ ...m });
  g.render();
});

// 3. Dawn run along the coast, hamlet and lighthouse below.
await shot('03-coast-dawn.png', () => {
  const g = window.__flightGame;
  g.pause(); g.reset();
  g.setView('chase'); g.setTod(0.2);
  g.setPlane({ ...g.plane, x: -430, y: 168, z: 470, heading: -0.14, pitch: 0.02, bank: -0.28, speed: 138, throttle: 0.7, elapsed: 96, distance: 11400, gear: false, fuel: 61 });
  const m = g.mission;
  m.gateIndex = 5; m.score = 902; m.message = 'GATE G5 CLEARED +208 — NEXT: G6'; m.messageAge = 2.2;
  g.setMission({ ...m });
  g.render();
});

// 4. Touchdown, wheels on the numbers as the sun drops.
await shot('04-touchdown.png', () => {
  const g = window.__flightGame;
  g.pause(); g.reset();
  g.setView('chase'); g.setTod(0.68);
  g.setPlane({ ...g.plane, x: -2, y: 47, z: 790, heading: 0.01, pitch: -0.035, bank: 0.02, speed: 58, throttle: 0.2, elapsed: 158, distance: 18900, gear: true, fuel: 12, damage: 12 });
  const m = g.mission;
  m.gateIndex = 6; m.phase = 'landing'; m.score = 1312; m.message = 'TOUCHDOWN — HOLD THE CENTRE LINE'; m.messageAge = 2.4;
  g.setMission({ ...m });
  g.render();
});

await browser.close();
await new Promise((resolve) => server.close(resolve));
if (errors.length) { console.error('PAGE ERRORS', errors); process.exitCode = 1; }
else console.log('Captured 4 screenshots from the live game');
