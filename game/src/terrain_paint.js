// Ground and sky painter. The sea, the far peaks and the triangulated granite
// are all drawn here: faces are sorted back to front, shaded by their normal
// against a fixed low sun, then dressed with rock striation, grass stipple,
// shoreline foam, the shore road, the hamlets and the lighthouse.

import { buildTerrain, isWater, FAR_PEAKS, GROUND_PROPS } from './world.js';
import { clamp, makeNoise } from './mathkit.js';
import { paintSkyGradient, paintAtmosphereBack, paintClouds } from './atmosphere.js';

const tint = makeNoise(44021);
const grain = makeNoise(77213);
const patchTint = (x, z) => tint(x / 280, z / 320);

const terrain = buildTerrain();

// Sun low in the west. West faces catch it, the east flank of every ridge
// drops into shadow, which is what gives the coast its read.
const SUN_X = -0.86, SUN_Y = 0.42, SUN_Z = 0.28;

// One ground colour: light on the normal, height band, moss tint and a warm
// offset that cools as the day runs out. Above 0.8 of the height scale the
// rock gives way to snow.
function shadeFor(y, facing, x, z, tod, grit) {
  const height = clamp(y / 280, 0, 1);
  const light = clamp(0.24 + facing * 0.78 + height * 0.22, 0, 1);
  const moss = patchTint(x, z) * 0.6 + grit * 0.4;
  const warm = clamp(1.16 - tod * 0.42, 0.6, 1.16);
  const red = Math.round((26 + light * 96 + height * 30 + moss * 26) * warm);
  const green = Math.round((50 + light * 98 + height * 30 + moss * 30) * (0.94 + warm * 0.06));
  const blue = Math.round(58 + light * 78 + height * 30 + moss * 12);
  if (height > 0.8) {
    const snow = Math.round(168 + light * 62);
    return {
      fill: 'rgb(' + snow + ',' + Math.min(255, snow + 6) + ',' + Math.min(255, snow + 22) + ')',
      light: light + 0.2,
    };
  }
  return {
    fill: 'rgb(' + Math.min(255, red) + ',' + Math.min(255, green) + ',' + Math.min(255, blue) + ')',
    light,
  };
}

function glintFor(tod, alpha) {
  return tod > 0.7 ? 'rgba(240,168,132,' + alpha + ')' : 'rgba(255,238,200,' + alpha + ')';
}

// Sky and sea in one pass so the horizon line stays married to the pitch.
export function paintSky(ctx, width, height, plane, tod = 0.35, time = 0) {
  const horizon = height * 0.5 + plane.pitch * height * 0.22;
  paintSkyGradient(ctx, width, height, horizon, tod);

  const water = ctx.createLinearGradient(0, horizon, 0, height);
  if (tod > 0.7) {
    water.addColorStop(0, '#3d4a5c');
    water.addColorStop(0.4, '#1b2a3c');
    water.addColorStop(1, '#0a1522');
  } else {
    water.addColorStop(0, '#4d7386');
    water.addColorStop(0.4, '#22414f');
    water.addColorStop(1, '#0d2331');
  }
  ctx.fillStyle = water;
  ctx.fillRect(0, Math.max(0, horizon), width, height - Math.max(0, horizon));

  // Sun road on the water, laid in off the left of frame.
  const road = ctx.createLinearGradient(0, horizon, 0, height);
  road.addColorStop(0, glintFor(tod, 0.24));
  road.addColorStop(0.35, glintFor(tod, 0.09));
  road.addColorStop(1, glintFor(tod, 0.01));
  ctx.fillStyle = road;
  ctx.fillRect(width * 0.05, Math.max(0, horizon), width * 0.42, height - Math.max(0, horizon));

  // Wave crests: short dashes, longer and more opaque as they near the camera,
  // each one drifting on the clock.
  ctx.strokeStyle = 'rgba(214,236,244,0.30)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 150; i++) {
    const t = i / 150;
    const y = horizon + Math.pow(t, 1.7) * (height - horizon);
    const length = 6 + t * 46;
    const drift = Math.sin(time * 0.35 + i) * 12;
    const x = ((grain(i * 0.31, i * 0.12) * 0.5 + 0.5) * width + drift) % width;
    ctx.globalAlpha = 0.10 + t * 0.34;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + length, y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

// Far peaks: a body silhouette, then a paler west face over it so the shape
// does not read as a plain triangle.
export function paintFarPeaks(ctx, project, width, height, tod = 0.35) {
  for (const peak of FAR_PEAKS) {
    const foot = project(peak.x, 0, peak.z);
    const crown = project(peak.x, peak.h, peak.z);
    const left = project(peak.x - peak.w, 0, peak.z);
    const right = project(peak.x + peak.w, 0, peak.z);
    if (!foot || !crown || !left || !right) continue;
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(peak.x, crown.y - 18);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();
    ctx.fillStyle = tod > 0.7 ? 'rgba(38,50,72,0.72)' : 'rgba(52,78,100,0.62)';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(left.x, left.y);
    ctx.lineTo(peak.x, crown.y - 18);
    ctx.lineTo(peak.x - peak.w * 0.2, foot.y);
    ctx.closePath();
    ctx.fillStyle = tod > 0.7 ? 'rgba(62,76,102,0.55)' : 'rgba(78,106,128,0.45)';
    ctx.fill();
  }
}

// One house: lit west wall, shaded east wall, pitched roof with a chimney and
// two windows that burn once the evening comes in.
function house(ctx, p, s, variant, tod) {
  const w = Math.max(2, (10 + variant * 8) * s);
  const h = Math.max(2, (8 + variant * 5) * s);
  const wall = 176 + Math.round(variant * 40);
  ctx.fillStyle = 'rgb(' + wall + ',' + (wall - 8) + ',' + (wall - 26) + ')';
  ctx.fillRect(p.x - w * 0.5, p.y - h, w, h);
  ctx.fillStyle = 'rgba(40,44,46,0.28)';
  ctx.fillRect(p.x + w * 0.18, p.y - h, w * 0.32, h);
  ctx.fillStyle = 'rgba(255,250,236,0.20)';
  ctx.fillRect(p.x - w * 0.5, p.y - h, w * 0.16, h);

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

  const windowsLit = tod > 0.48;
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      ctx.fillStyle = windowsLit ? 'rgba(255,206,120,0.95)' : 'rgba(38,50,58,0.85)';
      ctx.fillRect(p.x - w * 0.3 + col * w * 0.34, p.y - h * 0.72 + row * h * 0.34,
        Math.max(1, w * 0.18), Math.max(1, h * 0.2));
    }
  }

  if (windowsLit && s > 0.12) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const spill = ctx.createRadialGradient(p.x, p.y - h * 0.4, 1, p.x, p.y - h * 0.4, w * 1.6);
    spill.addColorStop(0, 'rgba(255,206,130,0.35)');
    spill.addColorStop(1, 'rgba(255,206,130,0)');
    ctx.fillStyle = spill;
    ctx.beginPath();
    ctx.arc(p.x, p.y - h * 0.4, w * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function lighthouse(ctx, p, s, tod) {
  const h = Math.max(6, 46 * s);
  const w = Math.max(2, 4.8 * s);
  ctx.fillStyle = '#e8e5dc';
  ctx.fillRect(p.x - Math.max(1, 2.4 * s), p.y - h, w, h);
  ctx.fillStyle = '#b6423a';
  ctx.fillRect(p.x - Math.max(1, 2.4 * s), p.y - h, w, h * 0.26);
  if (tod > 0.55) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const beam = ctx.createRadialGradient(p.x, p.y - h, 1, p.x, p.y - h, h * 2.6);
    beam.addColorStop(0, 'rgba(255,246,206,0.95)');
    beam.addColorStop(1, 'rgba(255,236,180,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.arc(p.x, p.y - h, h * 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// Ground props, painted after the mesh so they sit on top of it.
function paintProps(ctx, project, width, height, tod) {
  for (const prop of GROUND_PROPS) {
    const p = project(prop.x, prop.y, prop.z);
    if (!p || p.z > 3400) continue;
    const s = p.scale;
    if (prop.kind === 'house') {
      house(ctx, p, s, (Math.abs(prop.x * 7 + prop.z * 3) % 10) / 10, tod);
    } else if (prop.kind === 'road') {
      const next = project(prop.x + prop.dx, prop.y + prop.dy, prop.z + prop.dz);
      ctx.strokeStyle = 'rgba(196,186,166,0.55)';
      ctx.lineWidth = Math.max(1, 3.4 * s);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      if (next) ctx.lineTo(next.x, next.y);
      ctx.stroke();
    } else if (prop.kind === 'lighthouse') {
      lighthouse(ctx, p, s, tod);
    }
  }
}

// The mesh itself. Vertices are projected once, faces culled by frame edge and
// depth, sorted far to near, then filled and dressed.
export function paintTerrain(ctx, project, camera, width, height, tod = 0.35) {
  const { verts, faces } = terrain;
  const screen = new Array(verts.length);
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    screen[i] = project(v.x, v.y, v.z);
  }

  const spacing = 62;
  const drawn = [];
  for (const face of faces) {
    const a = screen[face[0]];
    const b = screen[face[1]];
    const c = screen[face[2]];
    if (!a || !b || !c) continue;
    if (a.x < -300 && b.x < -300 && c.x < -300) continue;
    if (a.x > width + 300 && b.x > width + 300 && c.x > width + 300) continue;
    const depth = (a.z + b.z + c.z) / 3;
    if (depth > 2400) continue;

    const va = verts[face[0]];
    const vb = verts[face[1]];
    const vc = verts[face[2]];
    if (isWater(va.x, va.z) && isWater(vb.x, vb.z) && isWater(vc.x, vc.z)) continue;

    // Face normal from the two edges, then lit against the sun vector.
    const ux = vb.x - va.x, uy = vb.y - va.y, uz = vb.z - va.z;
    const vx = vc.x - va.x, vy = vc.y - va.y, vz = vc.z - va.z;
    const ny = uz * vx - ux * vz;
    const nx = uy * vz - uz * vy;
    const nz = ux * vy - uy * vx;
    const length = Math.hypot(nx, ny, nz) || 1;
    const facing = clamp((nx / length) * SUN_X + (ny / length) * SUN_Y + (nz / length) * SUN_Z, -1, 1) * 0.5 + 0.5;
    const grit = grain(va.x / 90, va.z / 90) * 0.5 + 0.5;
    const shade = shadeFor((va.y + vb.y + vc.y) / 3, facing, va.x, va.z, tod, grit);
    drawn.push({
      a, b, c, depth,
      fill: shade.fill,
      light: shade.light,
      slope: Math.abs(ny / length),
      grit,
      scale: (a.scale + b.scale + c.scale) / 3,
    });
  }
  drawn.sort((p, q) => q.depth - p.depth);

  for (const t of drawn) {
    ctx.beginPath();
    ctx.moveTo(t.a.x, t.a.y);
    ctx.lineTo(t.b.x, t.b.y);
    ctx.lineTo(t.c.x, t.c.y);
    ctx.closePath();
    ctx.fillStyle = t.fill;
    ctx.fill();

    // Aerial perspective: distance washes toward the haze colour, so the far
    // range steps back rather than ending on a hard edge.
    const fog = clamp((t.depth - 420) / 1900, 0, 1);
    if (fog > 0.02) {
      ctx.fillStyle = tod > 0.7
        ? 'rgba(96,88,104,' + (fog * 0.62).toFixed(3) + ')'
        : 'rgba(198,192,176,' + (fog * 0.6).toFixed(3) + ')';
      ctx.fill();
    }

    if (Math.max(4, spacing * t.scale) < 5) continue;

    // Crest highlight along the top edge of lit steep faces.
    if (t.slope < 0.5 && t.light > 0.55) {
      ctx.strokeStyle = 'rgba(246,252,250,' + (0.10 * t.light).toFixed(3) + ')';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(t.a.x, t.a.y);
      ctx.lineTo(t.b.x, t.b.y);
      ctx.stroke();
    }

    // Steep rock takes striation, gentle ground takes grass stipple. Both stay
    // faint so the mesh never reads as a wireframe.
    if (t.slope < 0.62) {
      ctx.strokeStyle = 'rgba(232,244,248,' + (0.035 + t.light * 0.07).toFixed(3) + ')';
      ctx.lineWidth = 1;
      for (let i = 0; i < 2; i++) {
        const f = 0.2 + t.grit * 0.55 + i * 0.22;
        ctx.beginPath();
        ctx.moveTo(t.a.x + (t.c.x - t.a.x) * f, t.a.y + (t.c.y - t.a.y) * f);
        ctx.lineTo(t.b.x + (t.c.x - t.b.x) * f * 0.6, t.b.y + (t.c.y - t.b.y) * f * 0.6);
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(34,66,40,' + (0.07 + (1 - t.light) * 0.16).toFixed(3) + ')';
      for (let i = 0; i < 3; i++) {
        const f1 = 0.2 + ((t.grit * 7 + i) % 1) * 0.6;
        const f2 = 0.2 + ((t.grit * 3 + i * 0.4) % 1) * 0.6;
        ctx.fillRect(t.a.x + (t.b.x - t.a.x) * f1, t.a.y + (t.b.y - t.a.y) * f2, 1.7, 1.7);
      }
    }
  }

  // Foam along the tideline where granite meets water.
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

// Shadow the aircraft throws on the ground it is flying over.
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

// Sky furniture between the sky wash and the terrain: sun bloom, glare and the
// cloud deck. Returns the horizon row so the haze band can line up.
export function paintSkyLayer(ctx, project, width, height, plane, tod, time) {
  const horizon = height * 0.5 + plane.pitch * height * 0.22;
  paintAtmosphereBack(ctx, project, width, height, {}, tod);
  paintClouds(ctx, project, width, height, tod, time);
  return horizon;
}
