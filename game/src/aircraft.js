// Kestrel Mk II, the aircraft the pilot flies. Drawn in screen space as a
// layered low-poly solid: far wing, tailplane, fuselage, canopy, near wing.
// Panel lines, the roundel, the tail code, exhaust heat, wingtip contrails,
// the gear and the strobe all belong to the airframe, so it reads as a
// machine from any chase angle.

export function paintAircraft(ctx, width, height, plane, time) {
  const cx = width * 0.5;
  const cy = height * 0.62 + plane.pitch * height * 0.06;
  const roll = plane.bank;
  const cos = Math.cos(roll);
  const sin = Math.sin(roll);
  const span = Math.min(width * 0.36, 320);
  const bodyH = Math.min(height * 0.22, 128);

  // Airframe points are authored around the model's own origin and rotated by
  // the bank; everything below goes through these two helpers.
  const at = (x, y) => ({ x: cx + x * cos - y * sin, y: cy + x * sin + y * cos });
  const shape = (points, fill, stroke, alpha) => {
    ctx.beginPath();
    const first = at(points[0][0], points[0][1]);
    ctx.moveTo(first.x, first.y);
    for (let i = 1; i < points.length; i++) {
      const p = at(points[i][0], points[i][1]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    if (alpha !== undefined) ctx.globalAlpha = 1;
  };
  const panelLine = (x1, y1, x2, y2, color, weight) => {
    const a = at(x1, y1);
    const b = at(x2, y2);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = color;
    ctx.lineWidth = weight;
    ctx.stroke();
  };

  const w = span * 0.5;
  const h = bodyH * 0.5;

  // Contact shadow under the aircraft, carrying the same roll as the airframe.
  ctx.save();
  ctx.translate(cx, cy + bodyH * 0.9);
  ctx.rotate(roll);
  ctx.beginPath();
  ctx.ellipse(0, 0, span * 0.42, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(4,16,24,0.28)';
  ctx.fill();
  ctx.restore();

  // Wingtip contrails, thickness tied to power.
  ctx.save();
  ctx.globalAlpha = 0.16 + plane.throttle * 0.12;
  for (const side of [-1, 1]) {
    const root = at(side * w * 0.9, h * 0.05);
    const trail = ctx.createLinearGradient(root.x, root.y, root.x + side * 20, root.y + 150);
    trail.addColorStop(0, 'rgba(238,246,250,0.75)');
    trail.addColorStop(1, 'rgba(238,246,250,0)');
    ctx.strokeStyle = trail;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(root.x, root.y);
    ctx.quadraticCurveTo(root.x + side * 26, root.y + 70, root.x + side * 30, root.y + 150);
    ctx.stroke();
  }
  ctx.restore();

  // Far wing, tailplane and fuselage go down first so the near wing can sit
  // on top of the stack.
  shape([[-w * 0.92, -h * 0.18], [-w * 0.14, -h * 0.34], [-w * 0.1, h * 0.2], [-w * 0.86, h * 0.12]], '#5d7887', '#263d4b');
  panelLine(-w * 0.5, -h * 0.24, -w * 0.48, h * 0.15, 'rgba(28,48,60,0.55)', 1);
  shape([[-w * 0.34, h * 0.62], [-w * 0.06, h * 0.48], [w * 0.06, h * 0.48], [w * 0.34, h * 0.62]], '#7c95a0', '#2b4250');
  shape([[-w * 0.1, h * 0.7], [-w * 0.05, h * 0.28], [w * 0.05, h * 0.28], [w * 0.1, h * 0.7]], '#8da7b1', '#29404d');

  // Nacelle and the exhaust bloom pouring out of the back of it.
  shape([[-w * 0.13, h * 0.72], [-w * 0.1, h * 1.02], [w * 0.1, h * 1.02], [w * 0.13, h * 0.72]], '#3f5b69', '#203541');
  const flare = 30 + plane.throttle * 30;
  const exhaust = ctx.createRadialGradient(cx, cy + h * 1.06, 1, cx, cy + h * 1.06, flare);
  exhaust.addColorStop(0, 'rgba(255,214,132,' + (0.5 + plane.throttle * 0.42) + ')');
  exhaust.addColorStop(0.4, 'rgba(255,140,60,0.28)');
  exhaust.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = exhaust;
  ctx.beginPath();
  ctx.arc(cx, cy + h * 1.06, flare, 0, Math.PI * 2);
  ctx.fill();

  // Fuselage with a lit spine and two panel lines across the flank.
  shape([[-w * 0.09, -h * 0.8], [-w * 0.15, h * 0.1], [-w * 0.1, h * 0.76], [w * 0.1, h * 0.76], [w * 0.15, h * 0.1], [w * 0.09, -h * 0.8]], '#d7e3e4', '#38515f');
  shape([[-w * 0.035, -h * 0.78], [-w * 0.055, h * 0.62], [w * 0.02, h * 0.62], [w * 0.03, -h * 0.78]], '#f0f5f2');
  panelLine(-w * 0.12, -h * 0.05, w * 0.12, -h * 0.05, 'rgba(120,146,158,0.55)', 1);
  panelLine(-w * 0.12, h * 0.34, w * 0.12, h * 0.34, 'rgba(120,146,158,0.45)', 1);

  // Canopy: tinted glass, a frame, a glint and the pilot's helmet.
  shape([[-w * 0.085, -h * 0.34], [-w * 0.07, -h * 0.68], [w * 0.07, -h * 0.68], [w * 0.085, -h * 0.34]], '#173c50', '#8fd8e8');
  shape([[-w * 0.04, -h * 0.58], [w * 0.01, -h * 0.64], [w * 0.03, -h * 0.38], [-w * 0.02, -h * 0.36]], 'rgba(160,222,235,0.55)');
  const helmet = at(-w * 0.01, -h * 0.46);
  ctx.beginPath();
  ctx.arc(helmet.x, helmet.y, 3.2, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(226,240,244,0.6)';
  ctx.fill();

  // Near wing: flap panel, two panel lines, the roundel and a nav light that
  // goes amber once the hull is badly hurt.
  shape([[w * 0.1, -h * 0.3], [w * 0.94, -h * 0.16], [w * 0.88, h * 0.16], [w * 0.1, h * 0.24]], '#b8ccd2', '#2c4553');
  shape([[w * 0.16, h * 0.04], [w * 0.86, h * 0.04], [w * 0.85, h * 0.15], [w * 0.16, h * 0.19]], '#91aab4');
  panelLine(w * 0.34, -h * 0.24, w * 0.32, h * 0.2, 'rgba(52,74,88,0.4)', 1);
  panelLine(w * 0.62, -h * 0.2, w * 0.6, h * 0.17, 'rgba(52,74,88,0.35)', 1);
  const roundel = at(w * 0.52, -h * 0.02);
  ctx.beginPath();
  ctx.arc(roundel.x, roundel.y, Math.max(4, span * 0.026), 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(228,226,206,0.85)';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(roundel.x, roundel.y, Math.max(2, span * 0.012), 0, Math.PI * 2);
  ctx.fillStyle = '#3f6d8c';
  ctx.fill();
  const navLight = at(w * 0.93, -h * 0.14);
  ctx.beginPath();
  ctx.arc(navLight.x, navLight.y, 3.4, 0, Math.PI * 2);
  ctx.fillStyle = plane.damage > 40 ? '#ff7a5c' : '#7dffc2';
  ctx.shadowBlur = 12;
  ctx.shadowColor = ctx.fillStyle;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Tail code, small but still readable at screenshot size.
  const code = at(-w * 0.02, h * 0.52);
  ctx.fillStyle = 'rgba(40,62,76,0.7)';
  ctx.font = 'bold ' + Math.max(6, span * 0.032) + 'px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText('K-07', code.x, code.y);
  ctx.textAlign = 'left';

  // Gear, only while it is down: two main legs and a nose leg with wheels.
  if (plane.gear) {
    ctx.beginPath();
    const legL = at(-w * 0.12, h * 0.9);
    const legR = at(w * 0.12, h * 0.9);
    const wheelL = at(-w * 0.2, h * 1.35);
    const wheelR = at(w * 0.2, h * 1.35);
    ctx.moveTo(legL.x, legL.y);
    ctx.lineTo(wheelL.x, wheelL.y);
    ctx.moveTo(legR.x, legR.y);
    ctx.lineTo(wheelR.x, wheelR.y);
    ctx.strokeStyle = '#aebfc6';
    ctx.lineWidth = 3;
    ctx.stroke();
    const wheel = (x, y) => {
      const p = at(x, y);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 7, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#101c24';
      ctx.fill();
      ctx.strokeStyle = '#7a93a0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };
    wheel(-w * 0.2, h * 1.4);
    wheel(w * 0.2, h * 1.4);
    wheel(0, h * 1.22);
  }

  // Wingtip strobe, a short honest blink.
  if (Math.sin(time * 5) > 0.94) {
    ctx.beginPath();
    ctx.arc(cx - span * 0.45, cy - 8, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  }
}
