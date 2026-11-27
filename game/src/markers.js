// The gate rings, their beacons, and the landing strip with its lighting:
// threshold bars, designator, aiming point, PAPI, approach bars and windsock.
// All of it is projected world geometry, nothing is a pasted sprite.

import { GATES, RUNWAY, groundHeight } from './world.js';

function ringPoints(gate, project, segments = 40) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = gate.x + Math.cos(a) * gate.radius;
    const y = gate.y + Math.sin(a) * gate.radius;
    pts.push(project(x, y, gate.z));
  }
  return pts;
}

export function paintGates(ctx, project, mission, time, tod = 0.35) {
  for (let i = 0; i < GATES.length; i++) {
    const gate = GATES[i];
    const done = i < mission.gateIndex;
    const active = i === mission.gateIndex && mission.phase === 'rings';
    const pts = ringPoints(gate, project);
    if (pts.some((p) => p === null)) continue;
    const pulse = active ? 0.62 + Math.sin(time * 3) * 0.26 : 1;

    // Beacons riding the ring: bright dots that travel the circumference.
    if (active) {
      for (let b = 0; b < 8; b++) {
        const idx = Math.round(((b / 8 + time * 0.12) % 1) * (pts.length - 1));
        const p = pts[idx];
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const r = Math.max(2, 5 * p.scale);
        const g = ctx.createRadialGradient(p.x, p.y, 0.5, p.x, p.y, r * 4);
        g.addColorStop(0, 'rgba(255,236,178,0.95)');
        g.addColorStop(1, 'rgba(255,180,70,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineWidth = active ? 7 : 3;
    ctx.strokeStyle = done ? 'rgba(92,220,180,0.5)' : active ? 'rgba(255,196,86,' + pulse + ')' : 'rgba(255,178,86,0.5)';
    ctx.shadowBlur = active ? 22 : 0;
    ctx.shadowColor = '#ffb84a';
    ctx.stroke();
    ctx.shadowBlur = 0;

    const c = project(gate.x, gate.y, gate.z);
    if (active && c) {
      const size = Math.max(10, Math.min(22, 300 / c.z));
      ctx.fillStyle = 'rgba(255,232,166,0.95)';
      ctx.font = 'bold ' + size + 'px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(gate.label, c.x, c.y - 14);
      ctx.font = 'bold ' + Math.max(8, size * 0.55) + 'px Courier New';
      ctx.fillStyle = 'rgba(210,240,248,0.8)';
      ctx.fillText(Math.round(c.z) + ' M', c.x, c.y + 26);
      ctx.textAlign = 'left';
      // A vertical mast down to the ground makes the ring read as a gate.
      const foot = project(gate.x, groundHeight(gate.x, gate.z), gate.z);
      if (foot) {
        ctx.beginPath();
        ctx.moveTo(c.x, c.y + gate.radius * c.scale);
        ctx.lineTo(foot.x, foot.y);
        ctx.strokeStyle = 'rgba(255,190,72,0.2)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    } else if (c && !done) {
      ctx.fillStyle = 'rgba(255,196,120,0.35)';
      ctx.font = 'bold ' + Math.max(9, Math.min(16, 220 / c.z)) + 'px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(gate.label, c.x, c.y - 10);
      ctx.textAlign = 'left';
    }
  }
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

export function paintRunway(ctx, project, tod = 0.35) {
  const y = RUNWAY.elevation + 0.6;
  const lz = RUNWAY.length / 2;
  const hw = RUNWAY.width / 2;
  // Mown grass apron gives the strip a silhouette from the air.
  const grass = [[-hw - 34, -lz - 46], [hw + 34, -lz - 46], [hw + 34, lz + 30], [-hw - 34, lz + 30]]
    .map(([dx, dz]) => project(RUNWAY.x + dx, y - 0.3, RUNWAY.z + dz));
  if (!grass.some((p) => p === null)) {
    ctx.beginPath();
    ctx.moveTo(grass[0].x, grass[0].y);
    for (const p of grass) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fillStyle = tod > 0.5 ? 'rgba(74,92,58,0.55)' : 'rgba(104,124,74,0.5)';
    ctx.fill();
  }
  const corners = [[-hw, -lz], [hw, -lz], [hw, lz], [-hw, lz]].map(([dx, dz]) => project(RUNWAY.x + dx, y, RUNWAY.z + dz));
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

  // Centre line dashes.
  for (let d = -lz + 20; d < lz - 12; d += 30) {
    const a = project(RUNWAY.x, y, RUNWAY.z + d);
    const b = project(RUNWAY.x, y, RUNWAY.z + d + 13);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(244,244,220,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Threshold piano keys, aim blocks and the 07 designator.
  for (let i = 0; i < 7; i++) {
    const dx = -hw + 3.5 + i * ((RUNWAY.width - 7) / 6);
    const a = project(RUNWAY.x + dx, y, RUNWAY.z - lz + 3);
    const b = project(RUNWAY.x + dx, y, RUNWAY.z - lz + 21);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(250,250,232,0.92)';
    ctx.lineWidth = Math.max(1.6, 3 * a.scale);
    ctx.stroke();
  }
  for (const side of [-1, 1]) {
    const a = project(RUNWAY.x + side * (hw - 3), y, RUNWAY.z + lz - 34);
    const b = project(RUNWAY.x + side * (hw - 3), y, RUNWAY.z + lz - 62);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(250,250,232,0.85)';
    ctx.lineWidth = Math.max(2, 6 * a.scale);
    ctx.stroke();
  }
  const designator = project(RUNWAY.x, y, RUNWAY.z - lz + 44);
  if (designator && designator.z < 900) {
    ctx.save();
    ctx.translate(designator.x, designator.y);
    ctx.scale(designator.scale, designator.scale);
    ctx.fillStyle = 'rgba(250,250,236,0.86)';
    ctx.font = 'bold 16px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('07', 0, 0);
    ctx.restore();
  }

  // Edge lights, approach bars and PAPI: only lit as the light drops.
  const lit = tod > 0.5;
  for (let d = -lz; d <= lz; d += 26) {
    for (const side of [-1, 1]) {
      lamp(ctx, project, RUNWAY.x + side * (hw + 2), y + 0.8, RUNWAY.z + d,
        lit ? 'rgba(255,244,206,0.95)' : 'rgba(255,246,214,0.55)', 1.5);
    }
  }
  for (let d = -lz - 90; d < -lz - 6; d += 22) {
    for (const side of [-1, 1]) {
      lamp(ctx, project, RUNWAY.x + side * 20, y + 1, RUNWAY.z + d, 'rgba(150,240,214,0.9)', 2.1);
    }
  }
  for (let i = 0; i < 4; i++) {
    const col = i < 2 ? 'rgba(255,246,210,0.95)' : 'rgba(255,96,72,0.95)';
    lamp(ctx, project, RUNWAY.x - hw - 12, y + 1.2, RUNWAY.z - lz + 26 + i * 9, col, 2.4);
  }

  // Windsock on the west edge, hanging with the onshore breeze.
  const sockBase = project(RUNWAY.x - hw - 16, RUNWAY.elevation + 9, RUNWAY.z + 8);
  const sockTip = project(RUNWAY.x - hw - 27, RUNWAY.elevation + 7, RUNWAY.z + 12);
  if (sockBase && sockTip) {
    ctx.strokeStyle = 'rgba(214,226,230,0.8)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(sockBase.x, sockBase.y + 10);
    ctx.lineTo(sockBase.x, sockBase.y - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(sockBase.x, sockBase.y - 4);
    ctx.lineTo(sockTip.x, sockTip.y);
    ctx.strokeStyle = 'rgba(255,150,90,0.9)';
    ctx.lineWidth = 3.2;
    ctx.stroke();
  }
}

// Aiming cue for the next gate, drawn as a flat HUD diamond on the world.
export function paintTargetDiamond(ctx, project, gate, width, height) {
  if (!gate) return;
  const p = project(gate.x, gate.y, gate.z);
  if (!p) return;
  ctx.strokeStyle = 'rgba(255,206,120,0.85)';
  ctx.lineWidth = 1.6;
  const s = 9;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y - s);
  ctx.lineTo(p.x + s, p.y);
  ctx.lineTo(p.x, p.y + s);
  ctx.lineTo(p.x - s, p.y);
  ctx.closePath();
  ctx.stroke();
}
