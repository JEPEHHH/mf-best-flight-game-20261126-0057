// Terrain painter: the sea, the sky, the far peaks and the triangulated
// granite ridges. Faces are sorted back-to-front and shaded by their normal
// against the sun, then textured with rock striations, grass stipple, roads
// and a coastal hamlet so the ground reads as a real place.

import { buildTerrain, isWater, FAR_PEAKS, GROUND_PROPS } from './world.js';
import { clamp, makeNoise } from './mathkit.js';
import { paintSkyGradient, paintAtmosphereBack, paintClouds } from './atmosphere.js';

const tintNoise = makeNoise(44021);
const detailNoise = makeNoise(77213);
const ridgeNoiseTint = (x, z) => tintNoise(x / 280, z / 320);

const terrain = buildTerrain();

// Sun sits low in the west, so west-facing slopes catch light and the east
// sides of every ridge fall into shadow.
const SUN_X = -0.86, SUN_Y = 0.42, SUN_Z = 0.28;

function shadeFor(y, facing, x, z, tod, grit) {
  const t = clamp(y / 280, 0, 1);
  const lit = clamp(0.24 + facing * 0.78 + t * 0.22, 0, 1);
  const moss = ridgeNoiseTint(x, z) * 0.6 + grit * 0.4;
  const warm = clamp(1.16 - tod * 0.42, 0.6, 1.16);
  const r = Math.round((26 + lit * 96 + t * 30 + moss * 26) * warm);
  const g = Math.round((50 + lit * 98 + t * 30 + moss * 30) * (0.94 + warm * 0.06));
  const b = Math.round(58 + lit * 78 + t * 30 + moss * 12);
  if (t > 0.8) {
    const snow = Math.round(168 + lit * 62);
    return { fill: 'rgb(' + snow + ',' + Math.min(255, snow + 6) + ',' + Math.min(255, snow + 22) + ')', lit: lit + 0.2 };
  }
  return { fill: 'rgb(' + Math.min(255, r) + ',' + Math.min(255, g) + ',' + Math.min(255, b) + ')', lit };
}

export function paintSky(ctx, width, height, plane, tod = 0.35, time = 0) {
  const horizon = height * 0.5 + plane.pitch * height * 0.22;
  paintSkyGradient(ctx, width, height, horizon, tod);

  const sea = ctx.createLinearGradient(0, horizon, 0, height);
  if (tod > 0.7) {
    sea.addColorStop(0, '#3d4a5c');
    sea.addColorStop(0.4, '#1b2a3c');
    sea.addColorStop(1, '#0a1522');
  } else {
    sea.addColorStop(0, '#4d7386');
    sea.addColorStop(0.4, '#22414f');
    sea.addColorStop(1, '#0d2331');
  }
  ctx.fillStyle = sea;
  ctx.fillRect(0, Math.max(0, horizon), width, height - Math.max(0, horizon));

  // Sun path glitter on the water, strongest near the horizon line.
  const glint = ctx.createLinearGradient(0, horizon, 0, height);
  glint.addColorStop(0, todayGlint(tod, 0.24));
  glint.addColorStop(0.35, todayGlint(tod, 0.09));
  glint.addColorStop(1, todayGlint(tod, 0.01));
  ctx.fillStyle = glint;
  ctx.fillRect(width * 0.05, Math.max(0, horizon), width * 0.42, height - Math.max(0, horizon));

  // Wave crests: short dashes that thin out with distance.
  ctx.strokeStyle = 'rgba(214,236,244,0.30)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 150; i++) {
    const t = i / 150;
    const y = horizon + Math.pow(t, 1.7) * (height - horizon);
    const len = 6 + t * 46;
    const x = ((detailNoise(i * 0.31, i * 0.12) * 0.5 + 0.5) * width + Math.sin(time * 0.35 + i) * 12) % width;
    ctx.globalAlpha = 0.10 + t * 0.34;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function todayGlint(tod, alpha) {
  return tod > 0.7 ? 'rgba(240,168,132,' + alpha + ')' : 'rgba(255,238,200,' + alpha + ')';
}

export function paintFarPeaks(ctx, project, width, height, tod = 0.35) {
  for (const peak of FAR_PEAKS) {
    const base = project(peak.x, 0, peak.z);
    const top = project(peak.x, peak.h, peak.z);
    const left = project(peak.x - peak.w, 0, peak.z);
    const right = project(peak.x + peak.w, 0, peak.z);
    if (!base || !top || !left || !right) continue;
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(peak.x, top.y - 18);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.fillStyle = tod > 0.7 ? 'rgba(38,50,72,0.72)' : 'rgba(52,78,100,0.62)';
    ctx.fill();
    // A paler west face keeps the silhouette from reading as a triangle.
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(peak.x, top.y - 18);
    ctx.lineTo(peak.x - peak.w * 0.2, base.y);
    ctx.closePath();
    ctx.fillStyle = tod > 0.7 ? 'rgba(62,76,102,0.55)' : 'rgba(78,106,128,0.45)';
    ctx.fill();
  }
}

function paintProps(ctx, project, width, height, tod) {
  for (const prop of GROUND_PROPS) {
    const p = project(prop.x, prop.y, prop.z);
    if (!p || p.z > 3400) continue;
    const s = p.scale;
    if (prop.kind === 'house') {
      const variant = (Math.abs(prop.x * 7 + prop.z * 3) % 10) / 10;
      const w = Math.max(2, (10 + variant * 8) * s), h = Math.max(2, (8 + variant * 5) * s);
      const wallTone = 176 + Math.round(variant * 40);
      ctx.fillStyle = 'rgb(' + wallTone + ',' + (wallTone - 8) + ',' + (wallTone - 26) + ')';
      ctx.fillRect(p.x - w * 0.5, p.y - h, w, h);
      // Shaded east wall and lit west wall.
      ctx.fillStyle = 'rgba(40,44,46,0.28)';
      ctx.fillRect(p.x + w * 0.18, p.y - h, w * 0.32, h);
      ctx.fillStyle = 'rgba(255,250,236,0.20)';
      ctx.fillRect(p.x - w * 0.5, p.y - h, w * 0.16, h);
      // Roof with eaves, ridge line and a chimney.
      ctx.fillStyle = '#7a4534';
      ctx.beginPath();
      ctx.moveTo(p.x - w * 0.66, p.y - h);
      ctx.lineTo(p.x, p.y - h - h * 0.8);
      ctx.lineTo(p.x + w * 0.66, p.y - h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(24,26,28,0.55)';
      ctx.lineWidth = Math.max(0.6, s * 1.4);
      ctx.beginPath();
      ctx.moveTo(p.x - w * 0.6, p.y - h);
      ctx.lineTo(p.x, p.y - h - h * 0.74);
      ctx.stroke();
      if (s > 0.14) {
        ctx.fillStyle = '#5a3a2c';
        ctx.fillRect(p.x + w * 0.22, p.y - h - h * 0.72, Math.max(1, w * 0.14), Math.max(1.5, h * 0.3));
      }
      // Windows: dark by day, warm when the light drops.
      const lit = tod > 0.48;
      for (let wy = 0; wy < 2; wy++) {
        for (let wx = 0; wx < 2; wx++) {
          const wxPos = p.x - w * 0.3 + wx * w * 0.34;
          const wyPos = p.y - h * 0.72 + wy * h * 0.34;
          ctx.fillStyle = lit ? 'rgba(255,206,120,0.95)' : 'rgba(38,50,58,0.85)';
          ctx.fillRect(wxPos, wyPos, Math.max(1, w * 0.18), Math.max(1, h * 0.2));
        }
      }
      if (lit && s > 0.12) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(p.x, p.y - h * 0.4, 1, p.x, p.y - h * 0.4, w * 1.6);
        g.addColorStop(0, 'rgba(255,206,130,0.35)');
        g.addColorStop(1, 'rgba(255,206,130,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y - h * 0.4, w * 1.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (prop.kind === 'road') {
      ctx.strokeStyle = 'rgba(196,186,166,0.55)';
      ctx.lineWidth = Math.max(1, 3.4 * s);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      const q = project(prop.x + prop.dx, prop.y + prop.dy, prop.z + prop.dz);
      if (q) ctx.lineTo(q.x, q.y);
      ctx.stroke();
    } else if (prop.kind === 'lighthouse') {
      const h = Math.max(6, 46 * s);
      ctx.fillStyle = '#e8e5dc';
      ctx.fillRect(p.x - Math.max(1, 2.4 * s), p.y - h, Math.max(2, 4.8 * s), h);
      ctx.fillStyle = '#b6423a';
      ctx.fillRect(p.x - Math.max(1, 2.4 * s), p.y - h, Math.max(2, 4.8 * s), h * 0.26);
      if (tod > 0.55) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(p.x, p.y - h, 1, p.x, p.y - h, h * 2.6);
        g.addColorStop(0, 'rgba(255,246,206,0.95)');
        g.addColorStop(1, 'rgba(255,236,180,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y - h, h * 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

export function paintTerrain(ctx, project, camera, width, height, tod = 0.35) {
  const { verts, faces } = terrain;
  const projected = new Array(verts.length);
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    projected[i] = project(v.x, v.y, v.z);
  }

  const batches = [];
  const spacing = 62;
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
    const facing = clamp(((nx / len) * SUN_X + (ny / len) * SUN_Y + (nz / len) * SUN_Z), -1, 1) * 0.5 + 0.5;
    const grit = detailNoise(va.x / 90, va.z / 90) * 0.5 + 0.5;
    const shade = shadeFor((va.y + vb.y + vc.y) / 3, facing, va.x, va.z, tod, grit);
    batches.push({ a, b, c, depth, fill: shade.fill, lit: shade.lit, slope, x: va.x, z: va.z, y: va.y, scale: (a.scale + b.scale + c.scale) / 3, grit });
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

    // Aerial perspective: distant ground takes the horizon colour, so the
    // range steps back instead of ending in a hard edge.
    const fog = clamp((t.depth - 420) / 1900, 0, 1);
    if (fog > 0.02) {
      ctx.fillStyle = tod > 0.7 ? 'rgba(96,88,104,' + (fog * 0.62).toFixed(3) + ')' : 'rgba(198,192,176,' + (fog * 0.6).toFixed(3) + ')';
      ctx.fill();
    }

    const px = Math.max(4, spacing * t.scale);
    if (px < 5) continue;

    // Crest highlight on lit steep faces keeps the ridgelines readable.
    if (t.slope < 0.5 && t.lit > 0.55) {
      ctx.strokeStyle = 'rgba(246,252,250,' + (0.10 * t.lit).toFixed(3) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(t.a.x, t.a.y);
      ctx.lineTo(t.b.x, t.b.y);
      ctx.stroke();
    }

    // Steep granite gets striations, gentle ground gets grass stipple. Kept
    // faint so the mesh does not read as a wireframe grid.
    if (t.slope < 0.62) {
      ctx.strokeStyle = 'rgba(232,244,248,' + (0.035 + t.lit * 0.07).toFixed(3) + ')';
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const f = 0.2 + t.grit * 0.55 + i * 0.22;
        ctx.beginPath();
        ctx.moveTo(t.a.x + (t.c.x - t.a.x) * f, t.a.y + (t.c.y - t.a.y) * f);
        ctx.lineTo(t.b.x + (t.c.x - t.b.x) * f * 0.6, t.b.y + (t.c.y - t.b.y) * f * 0.6);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(34,66,40,' + (0.07 + (1 - t.lit) * 0.16).toFixed(3) + ')';
      for (let i = 0; i < 3; i++) {
        const f1 = 0.2 + ((t.grit * 7 + i) % 1) * 0.6;
        const f2 = 0.2 + ((t.grit * 3 + i * 0.4) % 1) * 0.6;
        ctx.fillRect(t.a.x + (t.b.x - t.a.x) * f1, t.a.y + (t.b.y - t.a.y) * f2, 1.7, 1.7);
      }
    }
  }

  // Shoreline foam where the granite meets the water.
  ctx.strokeStyle = 'rgba(238,250,252,0.42)';
  ctx.lineWidth = 2;
  for (let z = -820; z < 1240; z += 44) {
    const wx = -516 + Math.sin(z / 190) * 16;
    const p = project(wx, 2, z);
    const q = project(wx + 26, 1, z + 14);
    if (!p || !q || p.z > 1500) continue;
    ctx.globalAlpha = clamp(0.7 - p.z / 2200, 0.08, 0.7);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.quadraticCurveTo((p.x + q.x) * 0.5, p.y + 5, q.x, q.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  paintProps(ctx, project, width, height, tod);
}

// Aircraft shadow thrown onto the ground below the plane.
export function paintGroundShadow(ctx, project, plane) {
  const p = project(plane.x + 16, 0.6, plane.z + 26);
  if (!p || p.z > 1600) return;
  const r = clamp(120 * p.scale, 6, 90);
  const g = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, r);
  g.addColorStop(0, 'rgba(6,14,20,0.42)');
  g.addColorStop(1, 'rgba(6,14,20,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, r, r * 0.34, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function paintSkyLayer(ctx, project, width, height, plane, tod, time) {
  const horizon = height * 0.5 + plane.pitch * height * 0.22;
  paintAtmosphereBack(ctx, project, width, height, { }, tod);
  paintClouds(ctx, project, width, height, tod, time);
  return horizon;
}
