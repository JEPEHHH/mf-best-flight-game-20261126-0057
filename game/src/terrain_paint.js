// Terrain painter: draws the sea, the sky gradient, the far peaks and the
// triangulated granite ridges. Faces are sorted back-to-front and shaded by
// their normal, which gives the low-poly range its shape.

import { buildTerrain, isWater, FAR_PEAKS } from './world.js';
import { clamp, makeNoise } from './mathkit.js';

const tintNoise = makeNoise(44021);
const ridgeNoiseTint = (x, z) => tintNoise(x / 280, z / 320);

const terrain = buildTerrain();

function shadeFor(y, slope, x, z) {
  const t = clamp(y / 280, 0, 1);
  const lit = clamp(0.38 + slope * 0.62 + t * 0.2, 0, 1);
  const moss = ridgeNoiseTint(x, z);
  const r = Math.round(30 + lit * 92 + t * 34 + moss * 18);
  const g = Math.round(56 + lit * 96 + t * 32 + moss * 26);
  const b = Math.round(60 + lit * 82 + t * 28 + moss * 8);
  if (t > 0.78) {
    const snow = Math.round(180 + t * 60);
    return 'rgb(' + snow + ',' + Math.min(255, snow + 8) + ',255)';
  }
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

export function paintSky(ctx, width, height, plane) {
  const horizon = height * 0.5 + plane.pitch * height * 0.22;
  const sky = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizon));
  sky.addColorStop(0, '#0a2740');
  sky.addColorStop(0.46, '#28648a');
  sky.addColorStop(0.82, '#78aec0');
  sky.addColorStop(1, '#d3c5a4');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, Math.max(0, horizon));

  const sea = ctx.createLinearGradient(0, horizon, 0, height);
  sea.addColorStop(0, '#486f80');
  sea.addColorStop(0.35, '#214151');
  sea.addColorStop(1, '#0d2331');
  ctx.fillStyle = sea;
  ctx.fillRect(0, Math.max(0, horizon), width, height - Math.max(0, horizon));

  // Haze band along the horizon.
  ctx.fillStyle = 'rgba(226,211,180,0.16)';
  ctx.fillRect(0, horizon - 12, width, 24);
}

export function paintFarPeaks(ctx, project, width, height) {
  for (const peak of FAR_PEAKS) {
    const base = project(peak.x, 0, peak.z);
    const top = project(peak.x, peak.h, peak.z);
    const left = project(peak.x - peak.w, 0, peak.z);
    const right = project(peak.x + peak.w, 0, peak.z);
    if (!base || !top || !left || !right) continue;
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(top.x, top.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.fillStyle = 'rgba(58,83,101,0.55)';
    ctx.fill();
  }
}

export function paintTerrain(ctx, project, camera, width) {
  const { verts, faces } = terrain;
  const projected = new Array(verts.length);
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    projected[i] = project(v.x, v.y, v.z);
  }

  const batches = [];
  for (const face of faces) {
    const a = projected[face[0]], b = projected[face[1]], c = projected[face[2]];
    if (!a || !b || !c) continue;
    if (a.x < -300 && b.x < -300 && c.x < -300) continue;
    if (a.x > width + 300 && b.x > width + 300 && c.x > width + 300) continue;
    const depth = (a.z + b.z + c.z) / 3;
    if (depth > 2400) continue;
    const va = verts[face[0]], vb = verts[face[1]], vc = verts[face[2]];
    const ux = vb.x - va.x, uy = vb.y - va.y, uz = vb.z - va.z;
    const vx = vc.x - va.x, vy = vc.y - va.y, vz = vc.z - va.z;
    const ny = uz * vx - ux * vz;
    const nx = uy * vz - uz * vy;
    const nz = ux * vy - uy * vx;
    const len = Math.hypot(nx, ny, nz) || 1;
    const slope = Math.abs(ny / len);
    const water = isWater(va.x, va.z) && isWater(vb.x, vb.z) && isWater(vc.x, vc.z);
    if (water) continue;
    batches.push({ a, b, c, depth, fill: shadeFor((va.y + vb.y + vc.y) / 3, 1 - slope, va.x, va.z) });
  }
  batches.sort((p, q) => q.depth - p.depth);
  for (const t of batches) {
    ctx.beginPath();
    ctx.moveTo(t.a.x, t.a.y);
    ctx.lineTo(t.b.x, t.b.y);
    ctx.lineTo(t.c.x, t.c.y);
    ctx.closePath();
    ctx.fillStyle = t.fill;
    ctx.fill();
  }
}
