// Atmosphere: sun, high cloud decks, coastal haze, glare and vignette.
// Everything is anchored to world positions, so both cameras look into the
// same sky and the light angle alone carries the time of day.

import { makeNoise, clamp } from './mathkit.js';

const puffSeed = makeNoise(90211);

// Fixed sun bearing, low over the western water and ahead of the outbound
// course. `tod` runs 0 = dawn, 0.5 = noon, 1 = night.
export const SUN = { x: -5200, y: 1050, z: 5400 };

export function sunHeight(tod) {
  return clamp(0.16 + Math.cos((tod - 0.5) * Math.PI) * 0.78, 0.04, 0.94);
}

// Fixed lattice of puffs, jittered by noise so the deck never looks stamped.
// Each puff keeps its own size, shade and drift phase.
export const CLOUDS = (() => {
  const deck = [];
  for (let i = 0; i < 210; i++) {
    const bearing = puffSeed(i * 3.1, i * 0.7) * Math.PI * 2;
    const spread = 380 + Math.abs(puffSeed(i * 0.4, i * 1.9)) * 5200;
    const band = puffSeed(i * 0.9, 4.2);
    deck.push({
      x: Math.cos(bearing) * spread - 260,
      y: band > 0.42 ? 620 + band * 900 : 210 + Math.abs(band) * 260,
      z: Math.sin(bearing) * spread + 260,
      size: 90 + Math.abs(puffSeed(i * 2.2, 7.7)) * 300,
      phase: puffSeed(i * 1.3, 2.2) * 6.28,
      dark: band < 0.2,
    });
  }
  return deck;
})();

// Sky ramp: cool high air over a warm, dusty horizon. Night turns the top to
// near-black and the horizon to dying copper.
function skyRamp(tod) {
  if (tod < 0.28) return [[0, '#12253f'], [0.42, '#3d6187'], [0.72, '#9a9a93'], [1, '#e6c39a']];
  if (tod > 0.72) return [[0, '#08111e'], [0.5, '#1d2f47'], [0.82, '#4a4f62'], [1, '#8a6a5c']];
  return [[0, '#0a2740'], [0.46, '#28648a'], [0.82, '#78aec0'], [1, '#d3c5a4']];
}

export function paintAtmosphereBack(ctx, project, width, height, cam, tod) {
  const sun = project(SUN.x, SUN.y * sunHeight(tod), SUN.z);
  if (!sun || sun.z <= 0) return;

  // Bloom and disc, added rather than painted so the sky brightens under it.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bloom = ctx.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 330);
  bloom.addColorStop(0, tod > 0.7 ? 'rgba(255,196,150,0.55)' : 'rgba(255,244,214,0.6)');
  bloom.addColorStop(0.3, 'rgba(255,214,158,0.18)');
  bloom.addColorStop(1, 'rgba(255,200,140,0)');
  ctx.fillStyle = bloom;
  ctx.fillRect(sun.x - 350, sun.y - 350, 700, 700);
  ctx.fillStyle = tod > 0.7 ? 'rgba(255,222,190,0.95)' : 'rgba(255,252,238,0.98)';
  ctx.beginPath();
  ctx.arc(sun.x, sun.y, 18, 0, Math.PI * 2);
  ctx.fill();

  // Streak glare while the sun sits near the centre of the frame.
  const offset = Math.abs(sun.x - width * 0.5);
  if (offset < width * 0.42) {
    const near = 1 - offset / (width * 0.42);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = 'rgba(255,228,180,' + (0.05 * near).toFixed(3) + ')';
      ctx.fillRect(0, sun.y + (i - 2) * 26, width, 2 + i);
    }
  }
  ctx.restore();
}

export function paintClouds(ctx, project, width, height, tod, time) {
  const visible = [];
  for (const c of CLOUDS) {
    const p = project(c.x + Math.sin(time * 0.02 + c.phase) * 40, c.y, c.z);
    if (!p) continue;
    if (p.x < -600 || p.x > width + 600 || p.y < -400 || p.y > height + 500) continue;
    if (p.z > 7000) continue;
    const r = Math.max(6, c.size * p.scale);
    if (r < 5) continue;
    visible.push({ p, r, dark: c.dark, depth: p.z });
  }
  // Far decks first so near puffs cover them.
  visible.sort((a, b) => b.depth - a.depth);
  const lit = clamp(1.15 - tod * 0.5, 0.4, 1.1);

  for (const d of visible) {
    const fade = clamp(1 - d.depth / 7000, 0.08, 1);
    const base = d.dark ? 168 : 250;
    ctx.save();
    ctx.globalAlpha = 0.62 * fade;
    // Four stacked lobes, lit crown over shaded belly, read as volume.
    for (let step = 3; step >= 0; step--) {
      const ox = (step - 1.5) * d.r * 0.42;
      const oy = Math.abs(step - 1.5) * d.r * 0.12;
      const rr = d.r * (0.62 + ((step * 37) % 5) * 0.06);
      const lobe = ctx.createLinearGradient(
        d.p.x + ox, d.p.y + oy - rr,
        d.p.x + ox, d.p.y + oy + rr * 0.8,
      );
      lobe.addColorStop(0, 'rgba(' + base + ',' + Math.round(base * 0.99) + ',' + Math.round(base * 1.01) + ',' + (0.9 * lit).toFixed(2) + ')');
      lobe.addColorStop(0.55, 'rgba(' + Math.round(base * 0.86) + ',' + Math.round(base * 0.9) + ',244,0.4)');
      lobe.addColorStop(1, 'rgba(' + Math.round(base * 0.7) + ',' + Math.round(base * 0.76) + ',214,0)');
      ctx.fillStyle = lobe;
      ctx.beginPath();
      ctx.ellipse(d.p.x + ox, d.p.y + oy, rr, rr * 0.64, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Haze that thickens toward the horizon, then a vignette: the frame should
// read as film rather than flat vector art.
export function paintAtmosphereFront(ctx, width, height, horizon, tod) {
  const top = horizon - height * 0.22;
  const band = ctx.createLinearGradient(0, top, 0, horizon + height * 0.1);
  band.addColorStop(0, 'rgba(232,214,186,0)');
  band.addColorStop(0.65, tod > 0.7 ? 'rgba(214,166,138,0.30)' : 'rgba(232,214,186,0.34)');
  band.addColorStop(1, 'rgba(232,214,186,0.05)');
  ctx.fillStyle = band;
  ctx.fillRect(0, top, width, height * 0.32);

  const vignette = ctx.createRadialGradient(
    width * 0.5, height * 0.5, height * 0.28,
    width * 0.5, height * 0.5, height * 0.92,
  );
  vignette.addColorStop(0, 'rgba(4,12,20,0)');
  vignette.addColorStop(1, tod > 0.7 ? 'rgba(2,6,12,0.62)' : 'rgba(4,14,22,0.38)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
}

export function paintSkyGradient(ctx, width, height, horizon, tod) {
  const sky = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizon));
  for (const [at, color] of skyRamp(tod)) sky.addColorStop(at, color);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, Math.max(0, horizon));
}
