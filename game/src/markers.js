// Draws the amber gate rings, the next target's beacon, and the landing
// strip with its approach lights. All of it is projected world geometry.

import { GATES, RUNWAY, groundHeight } from './world.js';

function ringPoints(gate, project, segments = 28) {
  const pts = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const x = gate.x + Math.cos(a) * gate.radius;
    const y = gate.y + Math.sin(a) * gate.radius;
    const p = project(x, y, gate.z);
    pts.push(p);
  }
  return pts;
}

export function paintGates(ctx, project, mission, time) {
  for (let i = 0; i < GATES.length; i++) {
    const gate = GATES[i];
    const done = i < mission.gateIndex;
    const active = i === mission.gateIndex && mission.phase === 'rings';
    const pts = ringPoints(gate, project);
    if (pts.some((p) => p === null)) continue;
    const pulse = active ? 0.68 + Math.sin(time * 3) * 0.24 : 1;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (const p of pts) ctx.lineTo(p.x, p.y);
    ctx.lineWidth = active ? 6 : 3;
    ctx.strokeStyle = done ? 'rgba(92,220,180,0.55)' : active ? 'rgba(255,190,72,' + pulse + ')' : 'rgba(255,178,86,0.58)';
    ctx.shadowBlur = active ? 18 : 0;
    ctx.shadowColor = '#ffb84a';
    ctx.stroke();
    ctx.shadowBlur = 0;

    const c = project(gate.x, gate.y, gate.z);
    if (active && c) {
      ctx.fillStyle = 'rgba(255,225,150,0.92)';
      ctx.font = 'bold ' + Math.max(10, Math.min(22, 280 / c.z)) + 'px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText(gate.label, c.x, c.y - 12);
      // A vertical mast down to the ground makes the ring read as a gate.
      const foot = project(gate.x, groundHeight(gate.x, gate.z), gate.z);
      if (foot) {
        ctx.beginPath();
        ctx.moveTo(c.x, c.y + gate.radius * c.scale);
        ctx.lineTo(foot.x, foot.y);
        ctx.strokeStyle = 'rgba(255,190,72,0.22)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
  }
}

export function paintRunway(ctx, project) {
  const y = RUNWAY.elevation + 0.6;
  const corners = [
    [-RUNWAY.width / 2, -RUNWAY.length / 2],
    [RUNWAY.width / 2, -RUNWAY.length / 2],
    [RUNWAY.width / 2, RUNWAY.length / 2],
    [-RUNWAY.width / 2, RUNWAY.length / 2],
  ].map(([dx, dz]) => project(RUNWAY.x + dx, y, RUNWAY.z + dz));
  if (corners.some((p) => p === null)) return;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (const p of corners) ctx.lineTo(p.x, p.y);
  ctx.closePath();
  ctx.fillStyle = '#26333b';
  ctx.fill();
  ctx.strokeStyle = '#d7e6df';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Dashed centre line.
  for (let d = -RUNWAY.length / 2 + 14; d < RUNWAY.length / 2 - 8; d += 26) {
    const a = project(RUNWAY.x, y, RUNWAY.z + d);
    const b = project(RUNWAY.x, y, RUNWAY.z + d + 11);
    if (!a || !b) continue;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(240,240,215,0.85)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Threshold bars and approach lights.
  for (const side of [-1, 1]) {
    const a = project(RUNWAY.x + side * (RUNWAY.width / 2 - 4), y, RUNWAY.z - RUNWAY.length / 2 + 2);
    const b = project(RUNWAY.x + side * 8, y, RUNWAY.z - RUNWAY.length / 2 + 2);
    if (a && b) {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = '#f4f2d8'; ctx.lineWidth = 3; ctx.stroke();
    }
    for (let d = -RUNWAY.length / 2 - 60; d < -RUNWAY.length / 2; d += 20) {
      const p = project(RUNWAY.x + side * 22, y + 1, RUNWAY.z + d);
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, 90 / p.z), 0, Math.PI * 2);
      ctx.fillStyle = '#8ef0d6';
      ctx.fill();
    }
  }
}
