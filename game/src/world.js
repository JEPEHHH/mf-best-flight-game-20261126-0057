// The world the Kestrel flies through: a granite coast, a chain of ridges,
// six gate rings and a short landing strip. Geometry is generated from a
// fixed seed so the sector is identical each sortie.

import { makeNoise, clamp, distance2 } from './mathkit.js';

export const WORLD_SEED = 72613;
export const SEA_LEVEL = 0;
export const RUNWAY = { x: 0, z: 900, heading: 0, length: 340, width: 42, elevation: 34 };

const ridgeNoise = makeNoise(WORLD_SEED);
const detailNoise = makeNoise(WORLD_SEED + 991);

// Height of the ground at a horizontal point. The sea occupies x < -520;
// the land rises into parallel ridgelines toward the east. A plateau is cut
// into the coast for the strip, so the runway sits flush with the ground.
const PLATEAU = { x: 0, z: 900, hw: 165, hz: 260, elev: 34, blend: 110 };

export function groundHeight(x, z) {
  if (x < -520) return SEA_LEVEL;
  const shore = clamp((x + 520) / 260, 0, 1);
  const folds = ridgeNoise(x / 430, z / 610) * 190 + detailNoise(x / 130, z / 160) * 42;
  const spine = Math.sin((z + x * 0.35) / 520) * 46;
  const raw = SEA_LEVEL + shore * (28 + folds + spine);
  const dx = Math.max(0, Math.abs(x - PLATEAU.x) - PLATEAU.hw);
  const dz = Math.max(0, Math.abs(z - PLATEAU.z) - PLATEAU.hz);
  const out = Math.hypot(dx, dz);
  if (out >= PLATEAU.blend) return raw;
  const t = 1 - out / PLATEAU.blend;
  const eased = t * t * (3 - 2 * t);
  return raw + (PLATEAU.elev - raw) * eased;
}

export function isWater(x, z) {
  return x < -520;
}

// The gate course snakes along the coast. Each gate has a centre, a radius,
// and the heading a pilot should carry when passing through it.
export const GATES = [
  { x: -180, y: 190, z: -300, radius: 48, label: 'G1' },
  { x: -340, y: 225, z: -40, radius: 46, label: 'G2' },
  { x: -230, y: 260, z: 230, radius: 44, label: 'G3' },
  { x: 60, y: 300, z: 430, radius: 42, label: 'G4' },
  { x: 280, y: 245, z: 610, radius: 40, label: 'G5' },
  { x: 120, y: 150, z: 820, radius: 38, label: 'G6' },
];

export const START = { x: -180, y: 210, z: -560, heading: 0, speed: 108 };

export function gateProgress(plane, index) {
  const g = GATES[index];
  if (!g) return null;
  const d = distance2(plane.x, plane.z, g.x, g.z);
  const dy = Math.abs(plane.y - g.y);
  return { distance: d, vertical: dy, inside: d < g.radius && dy < g.radius * 0.9 };
}

export function runwayDistance(plane) {
  return distance2(plane.x, plane.z, RUNWAY.x, RUNWAY.z);
}

// Terrain mesh: rows of triangles stored as flat arrays. Built once, then
// projected by the renderer each frame.

// Hand-placed ground detail: a coastal hamlet either side of the strip, a
// shore road that threads the ridge feet, and a lighthouse on the headland.
// Fixed positions keep the sector the same on every sortie.
export const GROUND_PROPS = (() => {
  const out = [];
  const hamlet = (cx, cz, n) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + 0.4;
      const r = 26 + (i % 4) * 24;
      const x = cx + Math.cos(a) * r;
      const z = cz + Math.sin(a) * r * 1.4;
      out.push({ kind: 'house', x, y: groundHeight(x, z), z });
    }
  };
  hamlet(-420, 780, 9);
  hamlet(-380, -230, 7);
  hamlet(300, 1040, 6);
  for (let z = -760; z < 1200; z += 46) {
    const x = -470 + Math.sin(z / 150) * 30;
    out.push({ kind: 'road', x, y: groundHeight(x, z), z, dx: -18, dy: 1, dz: 40 });
  }
  const lx = -505, lz = 1330;
  out.push({ kind: 'lighthouse', x: lx, y: groundHeight(lx, lz), z: lz });
  return out;
})();

export function buildTerrain() {
  const step = 46;
  const x0 = -900, x1 = 900;
  const z0 = -900, z1 = 1250;
  const verts = [];
  const nx = Math.round((x1 - x0) / step);
  const nz = Math.round((z1 - z0) / step);
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const jx = detailNoise(i * 0.41, j * 0.37) * 16;
      const jz = detailNoise(i * 0.29 + 13, j * 0.33 + 7) * 16;
      const x = x0 + i * step + jx;
      const z = z0 + j * step + jz;
      verts.push({ x, y: groundHeight(x, z), z });
    }
  }
  const faces = [];
  const stride = nx + 1;
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * stride + i;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      faces.push([a, c, d], [a, d, b]);
    }
  }
  return { verts, faces, nx, nz };
}

// A few mountain silhouettes far out to sea give the horizon a recognisable
// shape without adding geometry to the near field.
export const FAR_PEAKS = [
  { x: -1900, z: -400, h: 240, w: 320 },
  { x: -2300, z: 500, h: 310, w: 420 },
  { x: -1600, z: 1300, h: 190, w: 280 },
];
