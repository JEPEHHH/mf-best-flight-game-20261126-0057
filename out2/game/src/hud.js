// Cockpit-style HUD and instrument panel. Everything is drawn from the
// live flight state: the dials move with the aircraft, not with a timer.

import { clamp, formatClock } from './mathkit.js';
import { GATES } from './world.js';
import { throttleLabel } from './flight.js';

const DEG = 180 / Math.PI;

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(6,22,32,0.82)';
  ctx.strokeStyle = 'rgba(105,214,226,0.55)';
  ctx.lineWidth = 1.4;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
}

function label(ctx, text, x, y, size = 12, color = '#9fe8ef') {
  ctx.fillStyle = color;
  ctx.font = size + 'px Courier New';
  ctx.textAlign = 'left';
  ctx.fillText(text, x, y);
}

export function paintHud(ctx, width, height, plane, mission, input) {
  const pad = 22;
  ctx.textAlign = 'left';

  // Top-left mission strip.
  panel(ctx, pad, pad, 330, 92);
  label(ctx, 'RIDGELINE / SECTOR 7', pad + 12, pad + 22, 12, '#7df3ff');
  const msg = mission.messageAge > 0 ? mission.message :
    mission.phase === 'rings' ? 'NEXT GATE ' + GATES[mission.gateIndex].label : 'FINAL — LAND ON STRIP 07';
  label(ctx, msg.slice(0, 42), pad + 12, pad + 44, 11, '#ffd38a');
  label(ctx, 'GATES ' + mission.gateIndex + '/' + GATES.length + '   SCORE ' + mission.score, pad + 12, pad + 64, 11);
  label(ctx, 'TIME ' + formatClock(plane.elapsed) + '   DIST ' + Math.round(plane.distance) + 'm', pad + 12, pad + 82, 10, '#80a9b8');

  // Top-right integrity / fuel bars.
  const rx = width - pad - 230;
  panel(ctx, rx, pad, 230, 92);
  label(ctx, 'SYSTEMS', rx + 12, pad + 22, 12, '#7df3ff');
  const bar = (name, value, y, good, bad) => {
    label(ctx, name, rx + 12, y + 9, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(rx + 72, y, 142, 11);
    ctx.fillStyle = value > 0.55 ? good : bad;
    ctx.fillRect(rx + 72, y, 142 * clamp(value, 0, 1), 11);
  };
  bar('FUEL ', plane.fuel / 100, pad + 34, '#6fe6c0', '#ff9a6a');
  bar('HULL ', 1 - plane.damage / 100, pad + 54, '#7fd6ef', '#ff6b5c');
  bar('PWR  ', plane.throttle, pad + 74, '#ffd27a', '#8f9fa8');

  // Centre attitude indicator: a small artificial horizon ring.
  const hx = width * 0.5, hy = height * 0.5 - 52;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(-plane.bank);
  ctx.beginPath();
  ctx.arc(0, 0, 44, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(9,32,46,0.55)';
  ctx.fill();
  ctx.clip();
  const shift = plane.pitch * 150;
  ctx.fillStyle = 'rgba(72,148,184,0.42)';
  ctx.fillRect(-50, -50 - shift, 100, 50);
  ctx.fillStyle = 'rgba(104,72,46,0.55)';
  ctx.fillRect(-50, -shift, 100, 50);
  ctx.strokeStyle = 'rgba(235,248,246,0.8)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-50, -shift); ctx.lineTo(50, -shift); ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(hx, hy, 44, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(150,228,236,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx - 62, hy); ctx.lineTo(hx - 48, hy);
  ctx.moveTo(hx + 48, hy); ctx.lineTo(hx + 62, hy);
  ctx.moveTo(hx, hy - 8); ctx.lineTo(hx, hy + 8);
  ctx.strokeStyle = '#ffe39a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Bottom-left airspeed tape and bottom-right altitude tape.
  panel(ctx, pad, height - 132, 178, 110);
  label(ctx, 'AIRSPEED', pad + 12, height - 112, 11);
  ctx.font = 'bold 34px Courier New';
  ctx.fillStyle = '#eaffff';
  ctx.fillText(String(Math.round(plane.speed * 1.94384)).padStart(3, '0'), pad + 12, height - 76);
  label(ctx, 'KNOTS  /  THR ' + throttleLabel(plane) + '%', pad + 12, height - 56, 10);
  label(ctx, plane.stalled ? 'STALL WARNING' : 'G-LOAD ' + plane.gLoad.toFixed(1), pad + 12, height - 34, 10, plane.stalled ? '#ff8866' : '#86c6d4');

  const ax = width - pad - 178;
  panel(ctx, ax, height - 132, 178, 110);
  label(ctx, 'ALTITUDE', ax + 12, height - 112, 11);
  ctx.font = 'bold 34px Courier New';
  ctx.fillStyle = '#eaffff';
  ctx.fillText(String(Math.max(0, Math.round(plane.y * 3.28084))).padStart(5, '0'), ax + 12, height - 76);
  label(ctx, 'FEET MSL', ax + 12, height - 56, 10);
  label(ctx, 'GEAR ' + (plane.gear ? 'DOWN' : 'UP') + '   VSI ' + Math.round(Math.sin(plane.pitch) * plane.speed * 2), ax + 12, height - 34, 10, plane.gear ? '#8ef0d6' : '#9ec7d2');

  // Heading card, centred above the attitude ball.
  panel(ctx, hx - 118, pad, 236, 60);
  label(ctx, 'HDG', hx - 104, pad + 22, 11);
  ctx.font = 'bold 26px Courier New';
  ctx.fillStyle = '#ffe39a';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(((plane.heading * DEG) + 360) % 360)).padStart(3, '0') + '°', hx + 18, pad + 43);
  ctx.textAlign = 'left';

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
