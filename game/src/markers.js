// Gate rings with their running beacons, and the landing strip with its
// markings and lighting: threshold bars, designator, aim blocks, PAPI,
// approach bars and windsock. Everything is projected world geometry.

import { GATES, RUNWAY, groundHeight } from './world.js';

const SEGMENTS = 40;

// Outline of a gate ring, sampled once per segment.
function rim(ctx, gate, project) {
  const pts = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const a = (i / SEGMENTS) * Math.PI * 2;
    pts.push(project(gate.x + Math.cos(a) * gate.radius, gate.y + Math.sin(a) * gate.radius, gate.z));
  }
  return pts;
}

function beacon(ctx, x, y, spread) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0.5, x, y, spread);
  g.addColorStop(0, 'rgba(255,236,178,0.95)');
  g.addColorStop(1, 'rgba(255,180,70,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, spread, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function lamp(ctx, project, x, y, z, color, radius) {
  const p = project(x, y, z);
  if (!p) return null;
  const r = Math.max(1.1, radius * p.scale);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(p.x, p.y, 0.4, p.x, p.y, r * 3.4);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r * 3.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  return p;
}

function stroke(ctx, a, b, color, width) {
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function paintGates(ctx, project, mission, time, tod = 0.35) {
  for (let i = 0; i < GATES.length; i++) {
    const gate = GATES[i];
    const cleared = i < mission.gateIndex;
    const live = i === mission.gateIndex && mission.phase === 'rings';
    const pts = rim(ctx, gate, project);
    if (pts.some((p) => p === null)) continue;
    const pulse = live ? 0.62 + Math.sin(time * 3) * 0.26 : 1;

    // Dots chase the circumference of the live ring.
    if (live) {
      for (let b = 0; b < 8; b++) {
        const slot = Math.round(((b / 8 + time * 0.12) % 1) * (pts.length - 1));
        const p = pts[slot];
        if (p) beacon(ctx, p.x, p.y, Math.max(2, 5 * p.scale) * 4);
      }
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineWidth = live ? 7 : 3;
    ctx.strokeStyle = cleared
      ? 'rgba(92,220,180,0.5)'
      : live ? 'rgba(255,196,86,' + pulse + ')' : 'rgba(255,178,86,0.5)';
    ctx.shadowBlur = live ? 22 : 0;
    ctx.shadowColor = '#ffb84a';
    ctx.stroke();
    ctx.shadowBlur = 0;

    const centre = project(gate.x, gate.y, gate.z);
    if (live && centre) {
      const size = Math.max(10, Math.min(22, 300 / centre.z));
      ctx.fillStyle = 'rgba(255,232,166,0.95)';
      ctx.font = 'bold ' + size + 'px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(gate.label, centre.x, centre.y - 14);
      ctx.font = 'bold ' + Math.max(8, size * 0.55) + 'px Courier New';
      ctx.fillStyle = 'rgba(210,240,248,0.8)';
      ctx.fillText(Math.round(centre.z) + ' M', centre.x, centre.y + 26);
      ctx.textAlign = 'left';
      // Mast to the ground: the ring has to read as a gate, not a hoop.
      const foot = project(gate.x, groundHeight(gate.x, gate.z), gate.z);
      if (foot) stroke(ctx, { x: centre.x, y: centre.y + gate.radius * centre.scale }, foot, 'rgba(255,190,72,0.2)', 1);
    } else if (centre && !cleared) {
      ctx.fillStyle = 'rgba(255,196,120,0.35)';
      ctx.font = 'bold ' + Math.max(9, Math.min(16, 220 / centre.z)) + 'px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(gate.label, centre.x, centre.y - 10);
      ctx.textAlign = 'left';
    }
  }
}

export function paintRunway(ctx, project, tod = 0.35) {
  const y = RUNWAY.elevation + 0.6;
  const halfLength = RUNWAY.length / 2;
  const halfWidth = RUNWAY.width / 2;
  const at = (dx, dz, lift = 0) => project(RUNWAY.x + dx, y + lift, RUNWAY.z + dz);

  // Mown grass apron: the strip needs a silhouette from the air.
  const apron = [[-halfWidth - 34, -halfLength - 46], [halfWidth + 34, -halfLength - 46],
    [halfWidth + 34, halfLength + 30], [-halfWidth - 34, halfLength + 30]]
    .map(([dx, dz]) => at(dx, dz, -0.3));
  if (!apron.some((p) => p === null)) {
    ctx.beginPath();
    ctx.moveTo(apron[0].x, apron[0].y);
    for (const p of apron) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = tod > 0.5 ? 'rgba(74,92,58,0.55)' : 'rgba(104,124,74,0.5)';
    ctx.fill();
  }

  const corners = [[-halfWidth, -halfLength], [halfWidth, -halfLength],
    [halfWidth, halfLength], [-halfWidth, halfLength]].map(([dx, dz]) => at(dx, dz));
  if (corners.some((p) => p === null)) return;

  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (const p of corners) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  const asphalt = ctx.createLinearGradient(corners[0].x, corners[0].y, corners[2].x, corners[2].y);
  asphalt.addColorStop(0, '#3a464e');
  asphalt.addColorStop(0.5, '#2a353c');
  asphalt.addColorStop(1, '#1d262c');
  ctx.fillStyle = asphalt;
  ctx.fill();
  ctx.strokeStyle = 'rgba(216,230,224,0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Centre line dashes down the strip.
  for (let d = -halfLength + 20; d < halfLength - 12; d += 30) {
    const a = at(0, d);
    const b = at(0, d + 13);
    if (a && b) stroke(ctx, a, b, 'rgba(244,244,220,0.8)', 2);
  }

  // Piano keys across the threshold.
  for (let i = 0; i < 7; i++) {
    const dx = -halfWidth + 3.5 + i * ((RUNWAY.width - 7) / 6);
    const a = at(dx, -halfLength + 3);
    const b = at(dx, -halfLength + 21);
    if (a && b) stroke(ctx, a, b, 'rgba(250,250,232,0.92)', Math.max(1.6, 3 * a.scale));
  }

  // Aiming blocks either side of the centre line near the far threshold.
  for (const side of [-1, 1]) {
    const a = at(side * (halfWidth - 3), halfLength - 34);
    const b = at(side * (halfWidth - 3), halfLength - 62);
    if (a && b) stroke(ctx, a, b, 'rgba(250,250,232,0.85)', Math.max(2, 6 * a.scale));
  }

  // Runway designator.
  const mark = at(0, -halfLength + 44);
  if (mark && mark.z < 900) {
    ctx.save();
    ctx.translate(mark.x, mark.y);
    ctx.scale(mark.scale, mark.scale);
    ctx.fillStyle = 'rgba(250,250,236,0.86)';
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('07', 0, 0);
    ctx.restore();
  }

  // Edge lights only bite as the light drops; approach bars always burn.
  const lit = tod > 0.5;
  for (let d = -halfLength; d <= halfLength; d += 26) {
    for (const side of [-1, 1]) {
      lamp(ctx, project, RUNWAY.x + side * (halfWidth + 2), y + 0.8, RUNWAY.z + d,
        lit ? 'rgba(255,244,206,0.95)' : 'rgba(255,246,214,0.55)', 1.5);
    }
  }
  for (let d = -halfLength - 90; d < -halfLength - 6; d += 22) {
    for (const side of [-1, 1]) {
      lamp(ctx, project, RUNWAY.x + side * 20, y + 1, RUNWAY.z + d, 'rgba(150,240,214,0.9)', 2.1);
    }
  }
  // PAPI: two white cells over two red ones, off the west shoulder.
  for (let i = 0; i < 4; i++) {
    const color = i < 2 ? 'rgba(255,246,210,0.95)' : 'rgba(255,96,72,0.95)';
    lamp(ctx, project, RUNWAY.x - halfWidth - 12, y + 1.2, RUNWAY.z - halfLength + 26 + i * 9, color, 2.4);
  }

  // Windsock on the west edge, hanging with the onshore breeze.
  const sockPost = at(-halfWidth - 16, 8, RUNWAY.elevation + 9 - y);
  const sockTip = at(-halfWidth - 27, 12, RUNWAY.elevation + 7 - y);
  if (sockPost && sockTip) {
    stroke(ctx, { x: sockPost.x, y: sockPost.y + 10 }, { x: sockPost.x, y: sockPost.y - 4 }, 'rgba(214,226,230,0.8)', 1.6);
    stroke(ctx, { x: sockPost.x, y: sockPost.y - 4 }, sockTip, 'rgba(255,150,90,0.9)', 3.2);
  }
}

// Flat aiming diamond on the next gate.
export function paintTargetDiamond(ctx, project, gate, width, height) {
  if (!gate) return;
  const p = project(gate.x, gate.y, gate.z);
  if (!p) return;
  const s = 9;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - s);
  ctx.lineTo(p.x + s, p.y);
  ctx.lineTo(p.x, p.y + s);
  ctx.lineTo(p.x - s, p.y);
  ctx.closePath();
  ctx.strokeStyle = 'rgba(255,206,120,0.85)';
  ctx.lineWidth = 1.6;
  ctx.stroke();
}
