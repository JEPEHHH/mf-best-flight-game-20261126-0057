// Head-up display. In the chase view it carries the full digital strip:
// airspeed and altitude tapes, an attitude reticle, the mission card, the
// systems bars and a bearing cue. The cockpit already has a panel full of
// dials, so there the HUD drops back to the mission card, the bars and the
// heading tape. Every figure comes from the live aircraft state.

import { clamp, formatClock } from './mathkit.js';
import { GATES, RUNWAY } from './world.js';
import { throttleLabel } from './flight.js';

const KTS_PER_MS = 1.94384;
const FT_PER_M = 3.28084;
const DEG = 180 / Math.PI;

// Time of day belongs to the frame loop, which paints the HUD but does not hand
// `tod` over the call: read it off the mounted game, and fall back to the dawn
// default for non-browser paints. Bands mirror the sky ramps in atmosphere.js
// so the caption never disagrees with the light it is describing.
const TOD_BANDS = [[0.28, 'pagi'], [0.62, 'siang'], [0.8, 'senja']];

function timeOfDayLabel() {
  const game = typeof window === 'undefined' ? null : window.__flightGame;
  const tod = game && typeof game.tod === 'number' ? game.tod : 0.34;
  for (const [edge, name] of TOD_BANDS) if (tod < edge) return name;
  return 'malam';
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(6,22,32,0.6)';
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

// A vertical strip of ticks around the current reading, with a fixed index
// marker and a unit caption underneath.
function tape(ctx, x, y, h, value, span, ticks, major, unit) {
  ctx.fillStyle = 'rgba(6,22,32,0.55)';
  ctx.fillRect(x, y, 46, h);
  ctx.strokeStyle = 'rgba(105,214,226,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, 46, h);
  const middle = y + h / 2;
  const step = span / ticks;
  for (let i = -ticks; i <= ticks; i++) {
    const ty = middle + (i / ticks) * (h / 2);
    const reading = Math.round(value + i * step);
    if (reading < 0) continue;
    const major_tick = reading % major < step;
    ctx.strokeStyle = major_tick ? 'rgba(214,244,250,0.75)' : 'rgba(150,200,214,0.35)';
    ctx.beginPath();
    ctx.moveTo(x + 46, ty);
    ctx.lineTo(x + (major_tick ? 32 : 38), ty);
    ctx.stroke();
    ctx.fillStyle = major_tick ? 'rgba(214,242,248,0.95)' : 'rgba(170,208,220,0.7)';
    ctx.font = '9px Courier New';
    ctx.textAlign = 'left';
    ctx.fillText(String(reading), x + 4, ty + 3);
  }
  ctx.fillStyle = '#eaffff';
  ctx.beginPath();
  ctx.moveTo(x + 46, middle);
  ctx.lineTo(x + 54, middle - 6);
  ctx.lineTo(x + 54, middle + 6);
  ctx.closePath();
  ctx.fill();
  label(ctx, unit, x + 4, y + h + 12, 8, '#7ba7b6');
}

export function paintHud(ctx, width, height, plane, mission, input, view = 'chase') {
  const pad = 22;
  const cockpit = view === 'cockpit';
  const centreX = width * 0.5;
  ctx.textAlign = 'left';

  // One ink set for the whole HUD: cyan for headings, amber for anything the
  // pilot has to act on, slate for reference text. Kept together so a tint
  // change touches one place.
  const ink = {
    title: '#7df3ff',
    order: '#ffd38a',
    body: '#9fe8ef',
    meta: '#80a9b8',
    good: '#6fe6c0',
    warn: '#ff9a6a',
  };

  // Mission card, top left, shortened in the cockpit so it clears the rail.
  const cardTop = cockpit ? pad + 6 : pad;
  const cardH = cockpit ? 66 : 92;
  panel(ctx, pad, cardTop, 330, cardH);
  label(ctx, 'RIDGELINE / SECTOR 7', pad + 12, pad + (cockpit ? 26 : 22), 12, ink.title);
  const order = mission.messageAge > 0
    ? mission.message
    : mission.phase === 'rings' ? 'NEXT GATE ' + GATES[mission.gateIndex].label : 'FINAL — LAND ON STRIP 07';
  label(ctx, order.slice(0, 42), pad + 12, pad + (cockpit ? 46 : 44), 11, ink.order);
  label(ctx, 'GATES ' + mission.gateIndex + '/' + GATES.length + '   SCORE ' + mission.score, pad + 12, pad + (cockpit ? 62 : 64), 11, ink.body);
  if (!cockpit) {
    label(ctx, 'TIME ' + formatClock(plane.elapsed) + '   DIST ' + Math.round(plane.distance) + 'm', pad + 12, pad + 82, 10, ink.meta);
  }

  // Systems bars, top right: fuel, hull, and power in the chase view.
  const right = width - pad - 230;
  panel(ctx, right, cardTop, 230, cardH);
  label(ctx, 'SYSTEMS', right + 12, pad + (cockpit ? 26 : 22), 12, ink.title);
  const gauge = (name, value, y, good, low) => {
    label(ctx, name, right + 12, y + 9, 10, ink.body);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(right + 72, y, 142, 11);
    ctx.fillStyle = value > 0.55 ? good : low;
    ctx.fillRect(right + 72, y, 142 * clamp(value, 0, 1), 11);
  };
  gauge('FUEL ', plane.fuel / 100, pad + 34, ink.good, ink.warn);
  gauge('HULL ', 1 - plane.damage / 100, pad + (cockpit ? 52 : 54), '#7fd6ef', '#ff6b5c');
  if (!cockpit) gauge('PWR  ', plane.throttle, pad + 74, '#ffd27a', '#8f9fa8');

  // Attitude reticle, chase only: a clipped horizon ball that rolls and
  // slides with the aircraft, plus a fixed pipper over it.
  const reticleX = centreX;
  const reticleY = height * 0.5 - 52;
  if (!cockpit) {
    ctx.save();
    ctx.translate(reticleX, reticleY);
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
    ctx.moveTo(-50, -shift);
    ctx.lineTo(50, -shift);
    ctx.stroke();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(reticleX, reticleY, 44, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(150,228,236,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(reticleX - 62, reticleY);
    ctx.lineTo(reticleX - 48, reticleY);
    ctx.moveTo(reticleX + 48, reticleY);
    ctx.lineTo(reticleX + 62, reticleY);
    ctx.moveTo(reticleX, reticleY - 8);
    ctx.lineTo(reticleX, reticleY + 8);
    ctx.strokeStyle = '#ffe39a';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Airspeed readout: box at bottom left, tape standing beside it on a shared
  // row so both tapes line up level and clear of the boxes.
  if (!cockpit) {
    const tapeY = Math.max(112, height - 292);
    tape(ctx, pad + 196, tapeY, 140, Math.round(plane.speed * KTS_PER_MS), 40, 5, 10, 'KT');
    panel(ctx, pad, height - 132, 178, 110);
    label(ctx, 'AIRSPEED', pad + 12, height - 112, 11, ink.body);
    ctx.font = 'bold 34px Courier New';
    ctx.fillStyle = '#eaffff';
    ctx.fillText(String(Math.round(plane.speed * KTS_PER_MS)).padStart(3, '0'), pad + 12, height - 76);
    label(ctx, 'KNOTS  /  THR ' + throttleLabel(plane) + '%', pad + 12, height - 56, 10, ink.meta);
    label(ctx, plane.stalled ? 'STALL WARNING' : 'G-LOAD ' + plane.gLoad.toFixed(1), pad + 12, height - 34, 10,
      plane.stalled ? '#ff8866' : ink.meta);

    // Altitude readout: box at bottom right, tape standing to its left.
    const altX = width - pad - 178;
    tape(ctx, altX - 52, tapeY, 140, Math.round(Math.max(0, plane.y * FT_PER_M)), 400, 5, 200, 'FT');
    panel(ctx, altX, height - 132, 178, 110);
    label(ctx, 'ALTITUDE', altX + 12, height - 112, 11, ink.body);
    ctx.font = 'bold 34px Courier New';
    ctx.fillStyle = '#eaffff';
    ctx.fillText(String(Math.max(0, Math.round(plane.y * FT_PER_M))).padStart(5, '0'), altX + 12, height - 76);
    label(ctx, 'FEET MSL', altX + 12, height - 56, 10, ink.meta);
    label(ctx, 'GEAR ' + (plane.gear ? 'DOWN' : 'UP') + '   VSI ' + Math.round(Math.sin(plane.pitch) * plane.speed * 2),
      altX + 12, height - 34, 10, plane.gear ? ink.good : ink.meta);
  }

  // Heading strip, and an arrow out to the bearing of whatever is next.
  const stripY = pad + (cockpit ? 4 : 0);
  panel(ctx, centreX - 118, stripY, 236, 46);
  label(ctx, 'HDG', centreX - 104, stripY + 19, 11);
  ctx.font = 'bold 24px Courier New';
  ctx.fillStyle = '#ffe39a';
  ctx.textAlign = 'center';
  ctx.fillText(String(Math.round(((plane.heading * DEG) + 360) % 360)).padStart(3, '0') + '°', centreX + 22, stripY + 36);
  ctx.textAlign = 'left';

  const target = mission.phase === 'landing' ? RUNWAY : GATES[mission.gateIndex];
  if (target) {
    const bearing = Math.atan2(target.x - plane.x, target.z - plane.z);
    const delta = ((bearing - plane.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    const arrowX = centreX + clamp(delta * DEG, -60, 60) * 1.8;
    ctx.fillStyle = 'rgba(255,206,120,0.9)';
    ctx.beginPath();
    ctx.moveTo(arrowX, stripY + 50);
    ctx.lineTo(arrowX - 6, stripY + 40);
    ctx.lineTo(arrowX + 6, stripY + 40);
    ctx.closePath();
    ctx.fill();
  label(ctx, 'CAM ' + (cockpit ? 'COCKPIT' : 'CHASE') + '  [C]', width - pad - 130, cockpit ? pad + 92 : pad + 100, 9, '#6c9aa9');
  label(ctx, 'T · ' + timeOfDayLabel(), width - pad - 130, cockpit ? pad + 106 : pad + 114, 9, ink.meta);
  }

  // Transient order line, lower centre, lifted clear of the readout boxes
  // below (they start at height - 132) so a fresh order never sits on a dial.
  if (mission.messageAge > 0 && !mission.finished) {
    ctx.font = 'bold 15px Courier New';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(5,20,28,0.78)';
    ctx.fillRect(centreX - 260, height - 182, 520, 30);
    ctx.fillStyle = '#ffd88f';
    ctx.fillText(mission.message, centreX, height - 162);
    ctx.textAlign = 'left';
  }
}
