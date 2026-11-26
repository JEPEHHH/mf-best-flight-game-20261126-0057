// The world the Kestrel flies through: a granite coast, a chain of ridges,
// six gate rings and a short landing strip. Geometry is generated from a
// fixed seed so the sector is identical each sortie.

import { makeNoise, clamp, distance2 } from './mathkit.js';

export const WORLD_SEED = 72613;
export const SEA_LEVEL = 0;
export const RUNWAY = { x: 0, z: 900, heading: 0, length: 260, width: 30, elevation: 6 };

const ridgeNoise = makeNoise(WORLD_SEED);
const detailNoise = makeNoise(WORLD_SEED + 991);

// Height of the ground at a horizontal point. The sea occupies x < -520;
// the land rises into parallel ridgelines toward the east.
export function groundHeight(x, z) {
  if (x < -520) return SEA_LEVEL;
  const shore = clamp((x + 520) / 260, 0, 1);
  const folds = ridgeNoise(x / 430, z / 610) * 190 + detailNoise(x / 130, z / 160) * 42;
  const spine = Math.sin((z + x * 0.35) / 520) * 46;
  return SEA_LEVEL + shore * (28 + folds + spine);
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
// projected by the renderer each frame. A coarse grid keeps it fast.
export function buildTerrain() {
  const step = 62;
  const x0 = -900, x1 = 900;
  const z0 = -900, z1 = 1250;
  const verts = [];
  const nx = Math.round((x1 - x0) / step);
  const nz = Math.round((z1 - z0) / step);
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      const x = x0 + i * step;
      const z = z0 + j * step;
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
