// Atmosphere: sun, high cloud decks, coastal haze, glare and vignette.
// Everything is painted from world positions so the same sky is seen from
// either camera, and the light angle doubles as the time of day.

import { makeNoise, clamp } from './mathkit.js';

const puffNoise = makeNoise(90211);

// Fixed sun direction in world space: low in the west, ahead of the outbound
// course. `tod` 0 = dawn, 0.5 = noon, 1 = night.
const SUN = { x: -5200, y: 1050, z: 5400 };

export function sunHeight(tod) {
  return clamp(0.16 + Math.cos((tod - 0.5) * Math.PI) * 0.78, 0.04, 0.94);
}

// Cloud deck laid out on a fixed lattice, jittered by noise so it never looks
// stamped. Each puff keeps its own size, brightness and drift phase.
export const CLOUDS = (() => {
  const out = [];
  for (let i = 0; i < 210; i++) {
    const a = puffNoise(i * 3.1, i * 0.7) * Math.PI * 2;
    const r = 380 + Math.abs(puffNoise(i * 0.4, i * 1.9)) * 5200;
    const x = Math.cos(a) * r - 260;
    const z = Math.sin(a) * r + 260;
    const band = puffNoise(i * 0.9, 4.2);
    const y = band > 0.42 ? 620 + band * 900 : 210 + Math.abs(band) * 260;
    out.push({ x, y, z, size: 90 + Math.abs(puffNoise(i * 2.2, 7.7)) * 300, phase: puffNoise(i * 1.3, 2.2) * 6.28, dark: band < 0.2 });
  }
  return out;
})();

const skyStops = (tod) => {
  if (tod < 0.28) return [[0, '#12253f'], [0.42, '#3d6187'], [0.72, '#9a9a93'], [1, '#e6c39a']];
  if (tod > 0.72) return [[0, '#08111e'], [0.5, '#1d2f47'], [0.82, '#4a4f62'], [1, '#8a6a5c']];
  return [[0, '#0a2740'], [0.46, '#28648a'], [0.82, '#78aec0'], [1, '#d3c5a4']];
};

export function paintAtmosphereBack(ctx, project, width, height, cam, tod) {
  // Sun disc and its bloom, drawn only when the sun is in front of the camera.
  const sun = project(SUN.x, SUN.y * sunHeight(tod), SUN.z);
  if (sun && sun.z > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const glow = ctx.createRadialGradient(sun.x, sun.y, 4, sun.x, sun.y, 420);
    glow.addColorStop(0, tod > 0.7 ? 'rgba(255,196,150,0.85)' : 'rgba(255,244,214,0.9)');
    glow.addColorStop(0.25, 'rgba(255,214,158,0.28)');
    glow.addColorStop(1, 'rgba(255,200,140,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sun.x - 440, sun.y - 440, 880, 880);
    ctx.fillStyle = tod > 0.7 ? 'rgba(255,222,190,0.95)' : 'rgba(255,252,238,0.98)';
    ctx.beginPath();
    ctx.arc(sun.x, sun.y, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Streaks of glare across the frame while the sun is near the centre.
  if (sun && sun.z > 0 && Math.abs(sun.x - width * 0.5) < width * 0.42) {
    const near = 1 - Math.abs(sun.x - width * 0.5) / (width * 0.42);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const y = sun.y + (i - 2) * 26;
      ctx.fillStyle = 'rgba(255,228,180,' + (0.05 * near).toFixed(3) + ')';
      ctx.fillRect(0, y, width, 2 + i);
    }
    ctx.restore();
  }
}

export function paintClouds(ctx, project, width, height, tod, time) {
  const drawn = [];
  for (const c of CLOUDS) {
    const x = c.x + Math.sin(time * 0.02 + c.phase) * 40;
    const p = project(x, c.y, c.z);
    if (!p) continue;
    if (p.x < -600 || p.x > width + 600 || p.y < -400 || p.y > height + 500) continue;
    const r = Math.max(6, c.size * p.scale);
    if (r < 5 || p.z > 7000) continue;
    drawn.push({ p, r, dark: c.dark, depth: p.z });
  }
  drawn.sort((a, b) => b.depth - a.depth);
  const lit = clamp(1.15 - tod * 0.5, 0.4, 1.1);
  for (const d of drawn) {
    const fade = clamp(1 - d.depth / 7000, 0.08, 1);
    ctx.save();
    ctx.globalAlpha = 0.62 * fade;
    // Lit crown over a shaded underside: three stacked lobes read as volume.
    const base = d.dark ? 168 : 250;
    for (let i = 3; i >= 0; i--) {
      const ox = (i - 1.5) * d.r * 0.42;
      const oy = Math.abs(i - 1.5) * d.r * 0.12;
      const rr = d.r * (0.62 + ((i * 37) % 5) * 0.06);
      const g = ctx.createLinearGradient(d.p.x + ox, d.p.y + oy - rr, d.p.x + ox, d.p.y + oy + rr * 0.8);
      g.addColorStop(0, 'rgba(' + base + ',' + Math.round(base * 0.99) + ',' + Math.round(base * 1.01) + ',' + (0.9 * lit).toFixed(2) + ')');
      g.addColorStop(0.55, 'rgba(' + Math.round(base * 0.86) + ',' + Math.round(base * 0.9) + ',244,0.4)');
      g.addColorStop(1, 'rgba(' + Math.round(base * 0.7) + ',' + Math.round(base * 0.76) + ',214,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(d.p.x + ox, d.p.y + oy, rr, rr * 0.64, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

// Haze that thickens toward the horizon, plus a vignette and grain so the
// frame reads like film rather than flat vector art.
export function paintAtmosphereFront(ctx, width, height, horizon, tod) {
  const band = ctx.createLinearGradient(0, horizon - height * 0.22, 0, horizon + height * 0.1);
  band.addColorStop(0, 'rgba(232,214,186,0)');
  band.addColorStop(0.65, tod > 0.7 ? 'rgba(214,166,138,0.30)' : 'rgba(232,214,186,0.34)');
  band.addColorStop(1, 'rgba(232,214,186,0.05)');
  ctx.fillStyle = band;
  ctx.fillRect(0, horizon - height * 0.22, width, height * 0.32);

  const vig = ctx.createRadialGradient(width * 0.5, height * 0.5, height * 0.28, width * 0.5, height * 0.5, height * 0.92);
  vig.addColorStop(0, 'rgba(4,12,20,0)');
  vig.addColorStop(1, tod > 0.7 ? 'rgba(2,6,12,0.62)' : 'rgba(4,14,22,0.38)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
}

export function paintSkyGradient(ctx, width, height, horizon, tod) {
  const stops = skyStops(tod);
  const sky = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizon));
  for (const [at, color] of stops) sky.addColorStop(at, color);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, Math.max(0, horizon));
}
