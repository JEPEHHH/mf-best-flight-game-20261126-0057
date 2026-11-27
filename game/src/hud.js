// Head-up display. In the chase view it carries the full digital strip; in the
// cockpit the panel already holds the dials, so the HUD shrinks to the mission
// card, the systems bars and the heading tape. Everything is live flight state.

import { clamp, formatClock } from './mathkit.js';
import { GATES, RUNWAY } from './world.js';
import { throttleLabel } from './flight.js';

const DEG = 180 / Math.PI;

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(6,22,32,0.78)';
  ctx.strokeStyle = 'rgba(105,214,226,0.5)';
  ctx.lineWidth = 1.3;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
}

function label(ctx, text, x, y, size = 12, color = '#9fe8ef') {
  ctx.fillStyle = color;
  ctx.font = size + 'px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

function tape(ctx, x, y, h, value, span, ticks, major, unit) {
  ctx.fillStyle = 'rgba(6,22,32,0.72)';
  ctx.fillRect(x, y, 46, h);
  ctx.strokeStyle = 'rgba(105,214,226,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, 46, h);
  const mid = y + h / 2;
  for (let i = -ticks; i <= ticks; i++) {
    const ty = mid + (i / ticks) * (h / 2);
    const val = Math.round(value + (i * span) / ticks);
    if (val < 0) continue;
    const big = val % major === 0;
    ctx.strokeStyle = big ? 'rgba(214,244,250,0.75)' : 'rgba(150,200,214,0.35)';
    ctx.beginPath();
    ctx.moveTo(x + 46, ty);
    ctx.lineTo(x + (big ? 32 : 38), ty);
    ctx.stroke();
    if (big) {
      ctx.fillStyle = 'rgba(190,226,236,0.8)';
      ctx.font = '9px Courier New';
      ctx.textAlign = 'left';
      ctx.fillText(String(val), x + 4, ty + 3);
    }
  }
  ctx.fillStyle = '#eaffff';
  ctx.beginPath();
  ctx.moveTo(x + 46, mid);
  ctx.lineTo(x + 54, mid - 6);
  ctx.lineTo(x + 54, mid + 6);
  ctx.closePath();
  ctx.fill();
  label(ctx, unit, x + 4, y + h + 12, 8, '#7ba7b6');
}

export function paintHud(ctx, width, height, plane, mission, input, view = 'chase') {
  const pad = 22;
  const cockpit = view === 'cockpit';
  ctx.textAlign = 'left';

  // Top-left mission card. Slimmer in the cockpit so it clears the canopy rail.
  const cardH = cockpit ? 66 : 92;
  panel(ctx, pad, cockpit ? pad + 6 : pad, 330, cardH);
  label(ctx, 'RIDGELINE / SECTOR 7', pad + 12, pad + (cockpit ? 26 : 22), 12, '#7df3ff');
  const msg = mission.messageAge > 0 ? mission.message :
    mission.phase === 'rings' ? 'NEXT GATE ' + GATES[mission.gateIndex].label : 'FINAL — LAND ON STRIP 07';
  label(ctx, msg.slice(0, 42), pad + 12, pad + (cockpit ? 46 : 44), 11, '#ffd38a');
  label(ctx, 'GATES ' + mission.gateIndex + '/' + GATES.length + '   SCORE ' + mission.score, pad + 12, pad + (cockpit ? 62 : 64), 11);
  if (!cockpit) label(ctx, 'TIME ' + formatClock(plane.elapsed) + '   DIST ' + Math.round(plane.distance) + 'm', pad + 12, pad + 82, 10, '#80a9b8');

  // Top-right systems bars.
  const rx = width - pad - 230;
  panel(ctx, rx, cockpit ? pad + 6 : pad, 230, cardH);
  label(ctx, 'SYSTEMS', rx + 12, pad + (cockpit ? 26 : 22), 12, '#7df3ff');
  const bar = (name, value, y, good, bad) => {
    label(ctx, name, rx + 12, y + 9, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(rx + 72, y, 142, 11);
    ctx.fillStyle = value > 0.55 ? good : bad;
    ctx.fillRect(rx + 72, y, 142 * clamp(value, 0, 1), 11);
  };
  bar('FUEL ', plane.fuel / 100, pad + (cockpit ? 34 : 34), '#6fe6c0', '#ff9a6a');
  bar('HULL ', 1 - plane.damage / 100, pad + (cockpit ? 52 : 54), '#7fd6ef', '#ff6b5c');
  if (!cockpit) bar('PWR  ', plane.throttle, pad + 74, '#ffd27a', '#8f9fa8');

  // Centre attitude reticle in the chase view only.
  const hx = width * 0.5, hy = height * 0.5 - 52;
  if (!cockpit) {
    ctx.save();
    ctx.translate(hx, hy);
    ctx.rotate(-plane.bank);
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(9,32,46,0.45)';
    ctx.fill();
    ctx.clip();
    const shift = plane.pitch * 150;
    ctx.fillStyle = 'rgba(72,148,184,0.4)';
    ctx.fillRect(-50, -50 - shift, 100, 50);
    ctx.fillStyle = 'rgba(104,72,46,0.5)';
    ctx.fillRect(-50, -shift, 100, 50);
    ctx.strokeStyle = 'rgba(235,248,246,0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-50, -shift); ctx.lineTo(50, -shift); ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(hx, hy, 44, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(150,228,236,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(hx - 62, hy); ctx.lineTo(hx - 48, hy);
    ctx.moveTo(hx + 48, hy); ctx.lineTo(hx + 62, hy);
    ctx.moveTo(hx, hy - 8); ctx.lineTo(hx, hy + 8);
    ctx.strokeStyle = '#ffe39a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Digital airspeed and altitude strips: chase view only.
  if (!cockpit) {
    tape(ctx, pad + 150, height - 200, 140, Math.round(plane.speed * 1.94384), 40, 5, 10, 'KT');
    panel(ctx, pad, height - 132, 178, 110);
    label(ctx, 'AIRSPEED', pad + 12, height - 112, 11);
    ctx.font = 'bold 34px Courier New';
    ctx.fillStyle = '#eaffff';
    ctx.fillText(String(Math.round(plane.speed * 1.94384)).padStart(3, '0'), pad + 12, height - 76);
    label(ctx, 'KNOTS  /  THR ' + throttleLabel(plane) + '%', pad + 12, height - 56, 10);
    label(ctx, plane.stalled ? 'STALL WARNING' : 'G-LOAD ' + plane.gLoad.toFixed(1), pad + 12, height - 34, 10, plane.stalled ? '#ff8866' : '#86c6d4');

    const ax = width - pad - 178;
    tape(ctx, ax - 60, height - 380 > 90 ? height - 380 : 120, 140, Math.round(Math.max(0, plane.y * 3.28084)), 400, 5, 200, 'FT');
    panel(ctx, ax, height - 132, 178, 110);
    label(ctx, 'ALTITUDE', ax + 12, height - 112, 11);
    ctx.font = 'bold 34px Courier New';
    ctx.fillStyle = '#eaffff';
    ctx.fillText(String(Math.max(0, Math.round(plane.y * 3.28084))).padStart(5, '0'), ax + 12, height - 76);
    label(ctx, 'FEET MSL', ax + 12, height - 56, 10);
    label(ctx, 'GEAR ' + (plane.gear ? 'DOWN' : 'UP') + '   VSI ' + Math.round(Math.sin(plane.pitch) * plane.speed * 2), ax + 12, height - 34, 10, plane.gear ? '#8ef0d6' : '#9ec7d2');
  }

  // Heading strip, and a bearing cue to the next gate or the strip.
  const hy2 = pad + (cockpit ? 4 : 0);
  panel(ctx, hx - 118, hy2, 236, 46);
  label(ctx, 'HDG', hx - 104, hy2 + 19, 11);
  ctx.font = 'bold 24px Courier New';
  ctx.fillStyle = '#ffe39a';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(((plane.heading * DEG) + 360) % 360)).padStart(3, '0') + '°', hx + 22, hy2 + 36);
  ctx.textAlign = 'left';

  const target = mission.phase === 'landing' ? RUNWAY : GATES[mission.gateIndex];
  if (target) {
    const bearing = Math.atan2(target.x - plane.x, target.z - plane.z);
    const delta = ((bearing - plane.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const clamped = clamp(delta * DEG, -60, 60);
    const bx = hx + clamped * 1.8;
    ctx.fillStyle = 'rgba(255,206,120,0.9)';
    ctx.beginPath();
    ctx.moveTo(bx, hy2 + 50);
    ctx.lineTo(bx - 6, hy2 + 40);
    ctx.lineTo(bx + 6, hy2 + 40);
    ctx.closePath();
    ctx.fill();
    label(ctx, 'CAM ' + (cockpit ? 'COCKPIT' : 'CHASE') + '  [C]', width - pad - 130, height - 16, 9, '#6c9aa9');
  }

  // Transient message in the lower centre.
  if (mission.messageAge > 0 && !mission.finished) {
    ctx.font = 'bold 15px Courier New';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(5,20,28,0.78)';
    ctx.fillRect(hx - 260, height - 172, 520, 30);
    ctx.fillStyle = '#ffd88f';
    ctx.fillText(mission.message, hx, height - 152);
    ctx.textAlign = 'left';
  }
}
