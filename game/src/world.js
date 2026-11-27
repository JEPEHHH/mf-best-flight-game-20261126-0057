// Sector 7 is a granite coast: water west of x = -520, a chain of ridges
// climbing away to the east, six gate rings threading the shoreline and a
// short strip cut into a headland. Every number here is pinned, so each
// sortie flies over the same sector.

import { makeNoise, clamp, distance2 } from './mathkit.js';

export const WORLD_SEED = 72613;
export const SEA_LEVEL = 0;
export const RUNWAY = { x: 0, z: 900, heading: 0, length: 340, width: 42, elevation: 34 };

// Two noise fields off one seed: broad folds shape the ridges, fine grain
// shapes the small stuff (dune stubble, vertex jitter).
const folds = makeNoise(WORLD_SEED);
const grain = makeNoise(WORLD_SEED + 991);

// Flat shelf stamped into the coast so the strip sits flush. Inside the
// half-extents the ground is level at 34 m; outside it the natural surface
// returns over `blend` metres, smoothly so there is no step.
const PLATEAU = { x: 0, z: 900, hw: 165, hz: 260, elev: 34, blend: 110 };

// Ground height at a point. Sea is flat at sea level; inland the ride climbs
// with the ridge chain, then the plateau correction pulls it back to the
// shelf height near the strip.
export function groundHeight(x, z) {
  if (x < -520) return SEA_LEVEL;
  const inland = clamp((x + 520) / 260, 0, 1);
  const ridge = folds(x / 430, z / 610) * 190 + grain(x / 130, z / 160) * 42;
  const spine = Math.sin((z + x * 0.35) / 520) * 46;
  const natural = SEA_LEVEL + inland * (28 + ridge + spine);
  const dx = Math.max(0, Math.abs(x - PLATEAU.x) - PLATEAU.hw);
  const dz = Math.max(0, Math.abs(z - PLATEAU.z) - PLATEAU.hz);
  const outside = Math.hypot(dx, dz);
  if (outside >= PLATEAU.blend) return natural;
  const t = 1 - outside / PLATEAU.blend;
  const blend = t * t * (3 - 2 * t);
  return natural + (PLATEAU.elev - natural) * blend;
}

export function isWater(x, z) {
  return x < -520;
}

// The course: six rings hung along the coast, each with the height a pilot
// should carry through it.
export const GATES = [
  { x: -180, y: 190, z: -300, radius: 48, label: 'G1' },
  { x: -340, y: 225, z: -40, radius: 46, label: 'G2' },
  { x: -230, y: 260, z: 230, radius: 44, label: 'G3' },
  { x: 60, y: 300, z: 430, radius: 42, label: 'G4' },
  { x: 280, y: 245, z: 610, radius: 40, label: 'G5' },
  { x: 120, y: 150, z: 820, radius: 38, label: 'G6' },
];

export const START = { x: -180, y: 210, z: -560, heading: 0, speed: 108 };

// How close the plane is to a gate, and whether it counts as threaded: inside
// the ring plane horizontally and within nine tenths of the radius vertically.
export function gateProgress(plane, index) {
  const gate = GATES[index];
  if (!gate) return null;
  const flat = distance2(plane.x, plane.z, gate.x, gate.z);
  const vertical = Math.abs(plane.y - gate.y);
  return { distance: flat, vertical, inside: flat < gate.radius && vertical < gate.radius * 0.9 };
}

export function runwayDistance(plane) {
  return distance2(plane.x, plane.z, RUNWAY.x, RUNWAY.z);
}

// Ground dressing: two hamlets on the coast, a shore road and a lighthouse on
// the southern headland. Hand-placed so the sector never shifts.
export const GROUND_PROPS = (() => {
  const props = [];
  const village = (cx, cz, count) => {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.4;
      const radius = 26 + (i % 4) * 24;
      const x = cx + Math.cos(angle) * radius;
      const z = cz + Math.sin(angle) * radius * 1.4;
      props.push({ kind: 'house', x, y: groundHeight(x, z), z });
    }
  };
  village(-420, 780, 9);
  village(-380, -230, 7);
  village(300, 1040, 6);
  for (let z = -760; z < 1200; z += 46) {
    const x = -470 + Math.sin(z / 150) * 30;
    props.push({ kind: 'road', x, y: groundHeight(x, z), z, dx: -18, dy: 1, dz: 40 });
  }
  const lx = -505;
  const lz = 1330;
  props.push({ kind: 'lighthouse', x: lx, y: groundHeight(lx, lz), z: lz });
  return props;
})();

// Terrain mesh, built once at load: a grid of vertices, each nudged off its
// slot by up to 16 m so the ridgelines break instead of grid-stepping, and a
// face list of two triangles per cell. The renderer projects it every frame.
export function buildTerrain() {
  const step = 46;
  const x0 = -900, x1 = 900, z0 = -900, z1 = 1250;
  const nx = Math.round((x1 - x0) / step);
  const nz = Math.round((z1 - z0) / step);
  const verts = [];
  for (let row = 0; row <= nz; row++) {
    for (let col = 0; col <= nx; col++) {
      const jx = grain(col * 0.41, row * 0.37) * 16;
      const jz = grain(col * 0.29 + 13, row * 0.33 + 7) * 16;
      const x = x0 + col * step + jx;
      const z = z0 + row * step + jz;
      verts.push({ x, y: groundHeight(x, z), z });
    }
  }
  const faces = [];
  const stride = nx + 1;
  for (let row = 0; row < nz; row++) {
    for (let col = 0; col < nx; col++) {
      const a = row * stride + col;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      faces.push([a, c, d], [a, d, b]);
    }
  }
  return { verts, faces, nx, nz };
}

// Distant silhouettes out to sea. Cheap geometry that gives the horizon a
// shape without adding anything to the near field.
export const FAR_PEAKS = [
  { x: -1900, z: -400, h: 240, w: 320 },
  { x: -2300, z: 500, h: 310, w: 420 },
  { x: -1600, z: 1300, h: 190, w: 280 },
];
