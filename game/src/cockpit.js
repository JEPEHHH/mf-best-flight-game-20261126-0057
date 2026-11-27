// First-person cockpit: canopy frame, glareshield and the instrument panel.
// Every needle is driven by the live flight state, so the panel is an
// instrument and not a picture. Drawn over the world, under the HUD.

import { clamp } from './mathkit.js';

const DEG = 180 / Math.PI;

function rivetLine(ctx, x1, y1, x2, y2, count, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    ctx.beginPath();
    ctx.arc(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function bezel(ctx, cx, cy, r) {
  const g = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.5, r * 0.1, cx, cy, r);
  g.addColorStop(0, '#2a3238');
  g.addColorStop(0.75, '#151b20');
  g.addColorStop(1, '#0a0e12');
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,172,184,0.5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r - 3, 0, Math.PI * 2);
  ctx.fillStyle = '#0b1218';
  ctx.fill();
}

function ticks(ctx, cx, cy, r, from, to, step, len, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.3;
  for (let a = from; a <= to; a += step) {
    const rad = (a - 90) * (Math.PI / 180);
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(rad) * r, cy + Math.sin(rad) * r);
    ctx.lineTo(cx + Math.cos(rad) * (r - len), cy + Math.sin(rad) * (r - len));
    ctx.stroke();
  }
}

function needle(ctx, cx, cy, angleDeg, len, width, color) {
  const rad = (angleDeg - 90) * (Math.PI / 180);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(cx - Math.cos(rad) * len * 0.18, cy - Math.sin(rad) * len * 0.18);
  ctx.lineTo(cx + Math.cos(rad) * len, cy + Math.sin(rad) * len);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, width * 1.5, 0, Math.PI * 2);
  ctx.fillStyle = '#c8d6de';
  ctx.fill();
}

function caption(ctx, text, x, y, size = 8) {
  ctx.font = 'bold ' + size + 'px Courier New';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(200,222,232,0.66)';
  ctx.fillText(text, x, y);
  ctx.textAlign = 'left';
}

export function paintCockpit(ctx, width, height, plane, tod) {
  const hudTop = height * 0.16;
  const panelTop = height * 0.68;
  const glass = tod > 0.7 ? 'rgba(10,18,28,0.72)' : 'rgba(22,32,42,0.55)';

  // Canopy bow and side pillars, tapering toward the top of the frame.
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(width * 0.14, 0);
  ctx.quadraticCurveTo(width * 0.075, height * 0.3, width * 0.085, height * 0.62);
  ctx.lineTo(0, height * 0.7);
  ctx.closePath();
  ctx.fillStyle = glass;
  ctx.fill();
  // Padded inner edge and bolts along the bow.
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(16,24,31,0.92)';
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(150,178,190,0.35)';
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(width * 0.86, 0);
  ctx.quadraticCurveTo(width * 0.925, height * 0.3, width * 0.915, height * 0.62);
  ctx.lineTo(width, height * 0.7);
  ctx.closePath();
  ctx.fillStyle = glass;
  ctx.fill();
  ctx.lineWidth = 9;
  ctx.strokeStyle = 'rgba(16,24,31,0.92)';
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(150,178,190,0.35)';
  ctx.stroke();

  for (let i = 1; i < 9; i++) {
    const t = i / 9;
    const lx = width * 0.14 * (1 - t) + width * 0.02 * t;
    const ly = height * 0.62 * t;
    const rx = width * (1 - 0.14 * (1 - t)) - width * 0.02 * t;
    ctx.fillStyle = 'rgba(196,214,224,0.5)';
    ctx.beginPath();
    ctx.arc(lx, ly, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rx, ly, 2.1, 0, Math.PI * 2);
    ctx.fill();
  }

  // Horizontal canopy rail.
  const rail = ctx.createLinearGradient(0, hudTop - 14, 0, hudTop + 8);
  rail.addColorStop(0, 'rgba(38,50,60,0.9)');
  rail.addColorStop(1, 'rgba(12,18,24,0.95)');
  ctx.fillStyle = rail;
  ctx.fillRect(0, hudTop - 12, width, 16);
  ctx.fillStyle = 'rgba(160,186,198,0.28)';
  ctx.fillRect(0, hudTop - 12, width, 1.5);
  rivetLine(ctx, 0, hudTop - 5, width, hudTop - 5, 46, 'rgba(190,210,220,0.35)');

  // Glareshield hood over the panel.
  const shield = ctx.createLinearGradient(0, panelTop - 34, 0, panelTop + 20);
  shield.addColorStop(0, '#0d151c');
  shield.addColorStop(0.55, '#1b262e');
  shield.addColorStop(1, '#0b1218');
  ctx.beginPath();
  ctx.moveTo(0, panelTop - 26);
  ctx.quadraticCurveTo(width * 0.5, panelTop - 46, width, panelTop - 26);
  ctx.lineTo(width, panelTop + 16);
  ctx.lineTo(0, panelTop + 16);
  ctx.closePath();
  ctx.fillStyle = shield;
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,178,190,0.22)';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  // Main panel slab.
  const panel = ctx.createLinearGradient(0, panelTop, 0, height);
  panel.addColorStop(0, '#131b22');
  panel.addColorStop(0.35, '#0d1319');
  panel.addColorStop(1, '#070b0f');
  ctx.fillStyle = panel;
  ctx.fillRect(0, panelTop + 14, width, height - panelTop - 14);

  // Matt panel texture: stipple, screw heads and placards.
  for (let i = 0; i < 220; i++) {
    const x = ((i * 137) % 1000) / 1000 * width;
    const y = panelTop + 16 + ((i * 61) % 100) / 100 * (height - panelTop - 16);
    ctx.fillStyle = i % 3 ? 'rgba(206,222,230,0.035)' : 'rgba(0,0,0,0.16)';
    ctx.fillRect(x, y, 2, 1.4);
  }
  for (const [sx, sy] of [[24, panelTop + 30], [width - 24, panelTop + 30], [24, height - 30], [width - 24, height - 30]]) {
    ctx.beginPath();
    ctx.arc(sx, sy, 3.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,172,182,0.35)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(10,14,18,0.9)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(sx - 2, sy);
    ctx.lineTo(sx + 2, sy);
    ctx.stroke();
  }
  ctx.font = 'bold 7px Courier New';
  ctx.fillStyle = 'rgba(196,214,222,0.42)';
  ctx.textAlign = 'left';
  ctx.fillText('KESTREL MK II  ·  SURVEY FIT', 34, panelTop + 30);
  ctx.fillText('DO NOT EXCEED 320 KT', 34, height - 26);
  ctx.textAlign = 'right';
  ctx.fillText('STRIP 07 · GRANITE COAST', width - 34, panelTop + 30);

  // Control stick between the pilot's knees.
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

  // Sun glare sliding across the windscreen.
  const glare = ctx.createLinearGradient(width * 0.18, 0, width * 0.62, height * 0.7);
  glare.addColorStop(0, 'rgba(255,246,222,0)');
  glare.addColorStop(0.5, tod > 0.7 ? 'rgba(255,222,190,0.10)' : 'rgba(255,250,232,0.13)');
  glare.addColorStop(1, 'rgba(255,246,222,0)');
  ctx.fillStyle = glare;
  ctx.beginPath();
  ctx.moveTo(width * 0.14, 0);
  ctx.lineTo(width * 0.56, 0);
  ctx.lineTo(width * 0.74, panelTop);
  ctx.lineTo(width * 0.3, panelTop);
  ctx.closePath();
  ctx.fill();

  // Instrument cluster, laid out relative to panel width.
  const cx = width * 0.5;
  const rowY = panelTop + 74;
  const gap = Math.min(132, width * 0.105);
  const dials = [
    ['AIRSPEED', 'KTS', (cx - gap * 2)],
    ['ATTITUDE', '', (cx - gap)],
    ['ALTITUDE', 'FT', (cx + gap)],
    ['VSI', 'FPM', (cx + gap * 2)],
  ];

  for (const [name, unit, x] of dials) {
    if (x < 40 || x > width - 40) continue;
    bezel(ctx, x, rowY, 44);
    ticks(ctx, x, rowY, 38, -120, 120, 24, 8, 'rgba(214,232,240,0.55)');
    caption(ctx, name, x, rowY + 62, 9);
    if (unit) caption(ctx, unit, x, rowY + 72, 7);
  }

  // Airspeed needle and altimeter needles.
  const kts = plane.speed * 1.94384;
  needle(ctx, cx - gap * 2, rowY, clamp((kts / 320) * 240 - 120, -120, 120), 34, 2.4, '#f3f8fa');
  caption(ctx, String(Math.round(kts)).padStart(3, '0'), cx - gap * 2, rowY + 12, 11);

  const altHundreds = Math.max(0, plane.y * 3.28084);
  needle(ctx, cx + gap, rowY, ((altHundreds % 1000) / 1000) * 360, 30, 2.2, '#f3f8fa');
  needle(ctx, cx + gap, rowY, ((altHundreds % 10000) / 10000) * 360, 22, 3.4, '#dfeaf0');
  caption(ctx, String(Math.round(altHundreds)).padStart(5, '0'), cx + gap, rowY + 30, 10);

  // Vertical speed.
  const vsi = Math.sin(plane.pitch) * plane.speed * 196;
  needle(ctx, cx + gap * 2, rowY, clamp(vsi / 20, -120, 120), 30, 2.2, '#f3f8fa');
  caption(ctx, String(Math.round(vsi)).padStart(4, '0'), cx + gap * 2, rowY + 30, 10);

  // Attitude ball: sky and ground rotate with bank and pitch.
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
    ctx.beginPath();
    ctx.moveTo(-8, -shift + i * 14);
    ctx.lineTo(8, -shift + i * 14);
    ctx.strokeStyle = 'rgba(226,236,240,0.55)';
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(255,196,120,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ax - 24, rowY);
  ctx.lineTo(ax - 8, rowY);
  ctx.moveTo(ax + 8, rowY);
  ctx.lineTo(ax + 24, rowY);
  ctx.stroke();

  // Engine and systems strip to the left of the cluster.
  const leftX = cx - gap * 3.3;
  if (leftX > 46) {
    ctx.fillStyle = '#0a1118';
    ctx.fillRect(leftX - 44, rowY - 46, 88, 104);
    ctx.strokeStyle = 'rgba(120,150,164,0.35)';
    ctx.strokeRect(leftX - 44, rowY - 46, 88, 104);
    caption(ctx, 'THROTTLE', leftX, rowY - 32, 8);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(leftX - 10, rowY - 24, 20, 58);
    ctx.fillStyle = '#7fe3c0';
    ctx.fillRect(leftX - 10, rowY + 34 - 58 * plane.throttle, 20, 58 * plane.throttle);
    caption(ctx, Math.round(plane.throttle * 100) + '%', leftX, rowY + 48, 9);
    caption(ctx, 'FUEL', leftX, rowY + 64, 8);
    caption(ctx, Math.round(plane.fuel) + '%', leftX, rowY + 76, 9);
  }

  // Warning lamps and heading card to the right.
  const rightX = cx + gap * 3.3;
  if (rightX < width - 46) {
    ctx.fillStyle = '#0a1118';
    ctx.fillRect(rightX - 44, rowY - 46, 88, 104);
    ctx.strokeStyle = 'rgba(120,150,164,0.35)';
    ctx.strokeRect(rightX - 44, rowY - 46, 88, 104);
    caption(ctx, 'GEAR', rightX, rowY - 30, 8);
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
      caption(ctx, text, rightX, rowY + 1 + i * 22, 7);
    });
    caption(ctx, 'HDG', rightX, rowY + 62, 8);
    caption(ctx, String(Math.round(((plane.heading * DEG) + 360) % 360)).padStart(3, '0') + '°', rightX, rowY + 74, 10);
  }

  // Circuit-breaker rows along the bottom edge.
  for (let i = 0; i < 34; i++) {
    const x = 26 + i * ((width - 52) / 33);
    ctx.fillStyle = i % 5 === 0 ? 'rgba(255,170,90,0.5)' : 'rgba(150,180,194,0.22)';
    ctx.fillRect(x, height - 15, 7, 7);
  }
}

// Dark sill under the canopy so the cockpit frame sits in the world.
export function paintCockpitSill(ctx, width, height) {
  const g = ctx.createLinearGradient(0, height * 0.62, 0, height * 0.74);
  g.addColorStop(0, 'rgba(8,14,20,0.0)');
  g.addColorStop(1, 'rgba(8,14,20,0.85)');
  ctx.fillStyle = g;
  ctx.fillRect(0, height * 0.62, width, height * 0.12);
}
