// First-person cockpit: canopy frame, glareshield and the instrument panel.
// Every needle reads the live flight state, so the panel works as an
// instrument deck instead of a painted backdrop. Drawn over the world and
// under the HUD.

import { clamp } from './mathkit.js';

const RAD = Math.PI / 180;
const KTS_PER_MS = 1.94384;
const FEET_PER_M = 3.28084;

// A row of bolt heads between two points, used on the canopy bow and rail.
function boltRow(ctx, fromX, fromY, toX, toY, count, radius = 1.6, color = 'rgba(196,214,224,0.5)') {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0 : i / (count - 1);
    ctx.beginPath();
    ctx.arc(fromX + (toX - fromX) * t, fromY + (toY - fromY) * t, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function stencil(ctx, text, x, y, size, align = 'center', color = 'rgba(200,222,232,0.66)') {
  ctx.font = 'bold ' + size + 'px Courier New';
  ctx.textAlign = align;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

// One canopy side: padded glass panel with a bolted inner edge. The path is
// authored in left-hand coordinates and mirrored for the right side.
function canopySide(ctx, width, height, side, glass) {
  ctx.save();
  ctx.translate(side < 0 ? 0 : width, 0);
  ctx.scale(side < 0 ? 1 : -1, 1);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width * 0.14, 0);
  ctx.quadraticCurveTo(width * 0.075, height * 0.3, width * 0.085, height * 0.62);
  ctx.lineTo(0, height * 0.7);
  ctx.closePath();
  ctx.fillStyle = glass;
  ctx.fill();
  // Dark padding first, then a thin lit bead along the same path.
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(16,24,31,0.92)';
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(150,178,190,0.35)';
  ctx.stroke();
  ctx.restore();
}

// Recessed instrument well: dark shell, bright rim, black face.
function instrumentWell(ctx, cx, cy, r) {
  const shell = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, r * 0.1, cx, cy, r);
  shell.addColorStop(0, '#2a3238');
  shell.addColorStop(0.75, '#151b20');
  shell.addColorStop(1, '#0a0e12');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = shell;
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,172,184,0.5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
  ctx.fillStyle = '#0b1218';
  ctx.fill();
}

function tickFan(ctx, cx, cy, r, fromDeg, toDeg, stepDeg, len) {
  ctx.strokeStyle = 'rgba(214,232,240,0.55)';
  ctx.lineWidth = 1.3;
  for (let deg = fromDeg; deg <= toDeg; deg += stepDeg) {
    const a = (deg - 90) * RAD;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.lineTo(cx + Math.cos(a) * (r - len), cy + Math.sin(a) * (r - len));
    ctx.stroke();
  }
}

function needle(ctx, cx, cy, deg, len, weight, color) {
  const a = (deg - 90) * RAD;
  ctx.strokeStyle = color;
  ctx.lineWidth = weight;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(a) * len * 0.18, cy - Math.sin(a) * len * 0.18);
  ctx.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, weight * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#c8d6de';
  ctx.fill();
}

// Insets for the engine bay and the warning lamps.
function bay(ctx, x, y, w, h) {
  ctx.fillStyle = '#0a1118';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(120,150,164,0.35)';
  ctx.strokeRect(x, y, w, h);
}

function screw(ctx, x, y) {
  ctx.beginPath();
  ctx.arc(x, y, 3.6, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(150,172,182,0.35)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(10,14,18,0.9)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x - 2, y);
  ctx.lineTo(x + 2, y);
  ctx.stroke();
}

export function paintCockpit(ctx, width, height, plane, tod) {
  const railY = height * 0.16;
  const deckY = height * 0.68;
  const glass = tod > 0.7 ? 'rgba(10,18,28,0.72)' : 'rgba(22,32,42,0.55)';

  // Canopy bows down both sides, tapering toward the top of the frame.
  canopySide(ctx, width, height, -1, glass);
  canopySide(ctx, width, height, 1, glass);
  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    const ly = height * 0.62 * t;
    const lx = width * 0.14 * (1 - t) + width * 0.02 * t;
    const rx = width * (1 - 0.14 * (1 - t)) - width * 0.02 * t;
    boltRow(ctx, lx, ly, lx, ly, 1, 2.1);
    boltRow(ctx, rx, ly, rx, ly, 1, 2.1);
  }

  // Horizontal canopy rail across the windscreen.
  const rail = ctx.createLinearGradient(0, railY - 14, 0, railY + 8);
  rail.addColorStop(0, 'rgba(38,50,60,0.9)');
  rail.addColorStop(1, 'rgba(12,18,24,0.95)');
  ctx.fillStyle = rail;
  ctx.fillRect(0, railY - 12, width, 16);
  ctx.fillStyle = 'rgba(160,186,198,0.28)';
  ctx.fillRect(0, railY - 12, width, 1.5);
  boltRow(ctx, 0, railY - 5, width, railY - 5, 46, 1.6, 'rgba(190,210,220,0.35)');

  // Glareshield hood curving over the panel.
  const shield = ctx.createLinearGradient(0, deckY - 34, 0, deckY + 20);
  shield.addColorStop(0, '#0d151c');
  shield.addColorStop(0.55, '#1b262e');
  shield.addColorStop(1, '#0b1218');
  ctx.beginPath();
  ctx.moveTo(0, deckY - 26);
  ctx.quadraticCurveTo(width * 0.5, deckY - 46, width, deckY - 26);
  ctx.lineTo(width, deckY + 16);
  ctx.lineTo(0, deckY + 16);
  ctx.closePath();
  ctx.fillStyle = shield;
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,178,190,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Panel slab.
  const panel = ctx.createLinearGradient(0, deckY, 0, height);
  panel.addColorStop(0, '#131b22');
  panel.addColorStop(0.35, '#0d1319');
  panel.addColorStop(1, '#070b0f');
  ctx.fillStyle = panel;
  ctx.fillRect(0, deckY + 14, width, height - deckY - 14);

  // Matt finish: stipple grain, corner screws and stencilled placards.
  for (let i = 0; i < 220; i++) {
    const x = (((i * 137) % 1000) / 1000) * width;
    const y = deckY + 16 + (((i * 61) % 100) / 100) * (height - deckY - 16);
    ctx.fillStyle = i % 3 ? 'rgba(206,222,230,0.035)' : 'rgba(0,0,0,0.16)';
    ctx.fillRect(x, y, 2, 1.4);
  }
  for (const [sx, sy] of [[24, deckY + 30], [width - 24, deckY + 30], [24, height - 30], [width - 24, height - 30]]) {
    screw(ctx, sx, sy);
  }
  stencil(ctx, 'KESTREL MK II  ·  SURVEY FIT', 34, deckY + 30, 7, 'left', 'rgba(196,214,222,0.42)');
  stencil(ctx, 'DO NOT EXCEED 320 KT', 34, height - 26, 7, 'left', 'rgba(196,214,222,0.42)');
  stencil(ctx, 'STRIP 07 · GRANITE COAST', width - 34, deckY + 30, 7, 'right', 'rgba(196,214,222,0.42)');

  // Control stick between the pilot's knees, leaning with the bank.
  const stickX = width * 0.5 + Math.sin(plane.bank) * 26;
  ctx.beginPath();
  ctx.moveTo(width * 0.5, height + 6);
  ctx.lineTo(stickX, height - 84);
  ctx.strokeStyle = '#131a20';
  ctx.lineWidth = 9;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(150,176,188,0.35)';
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(stickX, height - 88, 11, 17, plane.bank * 0.6, 0, Math.PI * 2);
  ctx.fillStyle = '#0d1419';
  ctx.fill();
  ctx.strokeStyle = 'rgba(160,186,198,0.4)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Sun glare sliding over the windscreen; warmer and weaker at dusk.
  const glare = ctx.createLinearGradient(width * 0.18, 0, width * 0.62, height * 0.7);
  glare.addColorStop(0, 'rgba(255,246,222,0)');
  glare.addColorStop(0.5, tod > 0.7 ? 'rgba(255,222,190,0.10)' : 'rgba(255,250,232,0.13)');
  glare.addColorStop(1, 'rgba(255,246,222,0)');
  ctx.fillStyle = glare;
  ctx.beginPath();
  ctx.moveTo(width * 0.14, 0);
  ctx.lineTo(width * 0.56, 0);
  ctx.lineTo(width * 0.74, deckY);
  ctx.lineTo(width * 0.3, deckY);
  ctx.closePath();
  ctx.fill();

  // Instrument cluster, spaced off the panel width.
  const cx = width * 0.5;
  const rowY = deckY + 74;
  const gap = Math.min(132, width * 0.105);
  const faces = [
    ['AIRSPEED', 'KTS', cx - gap * 2],
    ['ATTITUDE', '', cx - gap],
    ['ALTITUDE', 'FT', cx + gap],
    ['VSI', 'FPM', cx + gap * 2],
  ];

  for (const [name, unit, x] of faces) {
    if (x < 40 || x > width - 40) continue;
    instrumentWell(ctx, x, rowY, 44);
    tickFan(ctx, x, rowY, 38, -120, 120, 24, 8);
    stencil(ctx, name, x, rowY + 62, 9);
    if (unit) stencil(ctx, unit, x, rowY + 72, 7);
  }

  // Airspeed: 0–320 kt across the fan, read straight off plane.speed.
  const airspeed = plane.speed * KTS_PER_MS;
  needle(ctx, cx - gap * 2, rowY, clamp((airspeed / 320) * 240 - 120, -120, 120), 34, 2.4, '#f3f8fa');
  stencil(ctx, String(Math.round(airspeed)).padStart(3, '0'), cx - gap * 2, rowY + 12, 11, 'center', '#eaf4f8');

  // Altimeter: coarse hundreds over a slow ten-thousandths drum.
  const altitude = Math.max(0, plane.y * FEET_PER_M);
  needle(ctx, cx + gap, rowY, ((altitude % 1000) / 1000) * 360, 30, 2.2, '#f3f8fa');
  needle(ctx, cx + gap, rowY, ((altitude % 10000) / 10000) * 360, 22, 3.4, '#dfeaf0');
  stencil(ctx, String(Math.round(altitude)).padStart(5, '0'), cx + gap, rowY + 30, 10, 'center', '#eaf4f8');

  // Vertical speed, derived from pitch and speed.
  const vsi = Math.sin(plane.pitch) * plane.speed * 196;
  needle(ctx, cx + gap * 2, rowY, clamp(vsi / 20, -120, 120), 30, 2.2, '#f3f8fa');
  stencil(ctx, String(Math.round(vsi)).padStart(4, '0'), cx + gap * 2, rowY + 30, 10, 'center', '#eaf4f8');

  // Attitude ball: horizon rolls with bank and slides with pitch.
  const ax = cx - gap;
  ctx.save();
  ctx.beginPath();
  ctx.arc(ax, rowY, 38, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(ax, rowY);
  ctx.rotate(-plane.bank);
  const shift = plane.pitch * 190;
  ctx.fillStyle = tod > 0.7 ? '#12233a' : '#1d5a7a';
  ctx.fillRect(-70, -140 - shift, 140, 140);
  ctx.fillStyle = '#5b3f26';
  ctx.fillRect(-70, -shift, 140, 140);
  ctx.strokeStyle = 'rgba(240,248,250,0.85)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-40, -shift);
  ctx.lineTo(40, -shift);
  ctx.stroke();
  for (let i = -2; i <= 2; i++) {
    if (!i) continue;
    ctx.strokeStyle = 'rgba(226,236,240,0.55)';
    ctx.beginPath();
    ctx.moveTo(-8, -shift + i * 14);
    ctx.lineTo(8, -shift + i * 14);
    ctx.stroke();
  }
  ctx.restore();
  // Fixed bank pointer over the ball.
  ctx.strokeStyle = 'rgba(255,196,120,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ax - 24, rowY);
  ctx.lineTo(ax - 8, rowY);
  ctx.moveTo(ax + 8, rowY);
  ctx.lineTo(ax + 24, rowY);
  ctx.stroke();

  // Throttle quadrant and fuel gauge on the left.
  const leftX = cx - gap * 3.3;
  if (leftX > 46) {
    bay(ctx, leftX - 44, rowY - 46, 88, 104);
    stencil(ctx, 'THROTTLE', leftX, rowY - 32, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(leftX - 10, rowY - 24, 20, 58);
    ctx.fillStyle = '#7fe3c0';
    ctx.fillRect(leftX - 10, rowY + 34 - 58 * plane.throttle, 20, 58 * plane.throttle);
    stencil(ctx, Math.round(plane.throttle * 100) + '%', leftX, rowY + 48, 9);
    stencil(ctx, 'FUEL', leftX, rowY + 64, 8);
    stencil(ctx, Math.round(plane.fuel) + '%', leftX, rowY + 76, 9);
    // Fuel low: the reading goes amber under a quarter tank.
    if (plane.fuel < 25) {
      ctx.fillStyle = 'rgba(255,182,74,0.75)';
      ctx.fillRect(leftX - 10, rowY + 34 - 58 * plane.throttle - 2, 20, 2);
    }
  }

  // Gear and airframe lamps plus the heading card on the right.
  const rightX = cx + gap * 3.3;
  if (rightX < width - 46) {
    bay(ctx, rightX - 44, rowY - 46, 88, 104);
    stencil(ctx, 'GEAR', rightX, rowY - 30, 8);
    const lamps = [
      ['DN', plane.gear ? '#4ef0a8' : 'rgba(80,120,110,0.5)'],
      ['UP', plane.gear ? 'rgba(120,180,230,0.35)' : '#68c8ff'],
      ['STALL', plane.stalled ? '#ff5a48' : 'rgba(130,70,64,0.45)'],
      ['HULL', plane.damage > 40 ? '#ffb64a' : 'rgba(150,120,70,0.4)'],
    ];
    lamps.forEach(([text, color], i) => {
      ctx.beginPath();
      ctx.arc(rightX, rowY - 12 + i * 22, 7, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      stencil(ctx, text, rightX, rowY + 1 + i * 22, 7);
    });
    stencil(ctx, 'HDG', rightX, rowY + 62, 8);
    stencil(ctx, String(Math.round((plane.heading / RAD + 360) % 360)).padStart(3, '0') + '°', rightX, rowY + 74, 10, 'center', '#eaf4f8');
  }

  // Circuit-breaker strip along the bottom lip of the panel.
  for (let i = 0; i < 34; i++) {
    const x = 26 + i * ((width - 52) / 33);
    ctx.fillStyle = i % 5 === 0 ? 'rgba(255,170,90,0.5)' : 'rgba(150,180,194,0.22)';
    ctx.fillRect(x, height - 15, 7, 7);
  }
}

// Dark sill under the canopy so the frame sits into the world.
export function paintCockpitSill(ctx, width, height) {
  const g = ctx.createLinearGradient(0, height * 0.62, 0, height * 0.74);
  g.addColorStop(0, 'rgba(8,14,20,0.0)');
  g.addColorStop(1, 'rgba(8,14,20,0.85)');
  ctx.fillStyle = g;
  ctx.fillRect(0, height * 0.62, width, height * 0.12);
}
