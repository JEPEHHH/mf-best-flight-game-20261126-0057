// Small numeric helpers shared by the flight model and the renderer.
// Deliberately plain: no imports, no globals, deterministic output.

export const clamp = (value, low, high) => value < low ? low : value > high ? high : value;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (t) => t * t * (3 - 2 * t);
export const wrapAngle = (a) => {
  let x = a % (Math.PI * 2);
  if (x > Math.PI) x -= Math.PI * 2;
  if (x < -Math.PI) x += Math.PI * 2;
  return x;
};
export const approach = (value, target, rate) => {
  if (value < target) return Math.min(target, value + rate);
  if (value > target) return Math.max(target, value - rate);
  return target;
};
export const distance2 = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

// A fixed-seed generator. Terrain must look identical on every run and on
// every screenshot, so nothing here may read Math.random or the clock.
export function seededRandom(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth value noise over a 2D grid, used for the coastal mountain chain.
export function makeNoise(seed) {
  const rnd = seededRandom(seed);
  const grid = new Map();
  const at = (x, z) => {
    const key = x + ',' + z;
    let v = grid.get(key);
    if (v === undefined) {
      v = rnd();
      grid.set(key, v);
    }
    return v;
  };
  return (x, z) => {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = smooth(x - ix), fz = smooth(z - iz);
    const a = lerp(at(ix, iz), at(ix + 1, iz), fx);
    const b = lerp(at(ix, iz + 1), at(ix + 1, iz + 1), fx);
    return lerp(a, b, fz);
  };
}

export function formatClock(seconds) {
  const s = Math.max(0, Math.floor(seconds));
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
}
