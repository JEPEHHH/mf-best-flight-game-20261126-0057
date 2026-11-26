// The Kestrel Mk II, drawn as a small low-poly solid in screen space.
// The silhouette is assembled from layered polygons with fixed shading, so
// the aircraft reads as a real machine from any chase angle.

export function paintAircraft(ctx, width, height, plane, time) {
  const cx = width * 0.5;
  const cy = height * 0.62 + plane.pitch * height * 0.06;
  const roll = plane.bank;
  const yaw = 0;
  const cos = Math.cos(roll), sin = Math.sin(roll);
  const span = Math.min(width * 0.36, 320);
  const bodyH = Math.min(height * 0.22, 128);

  const px = (x, y) => ({ x: cx + x * cos - y * sin, y: cy + x * sin + y * cos });
  const poly = (points, fill, stroke) => {
    ctx.beginPath();
    const p0 = px(points[0][0], points[0][1]);
    ctx.moveTo(p0.x, p0.y);
    for (let i = 1; i < points.length; i++) {
      const p = px(points[i][0], points[i][1]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
  };

  // A soft shadow under the aircraft, dead giveaway of its attitude.
  ctx.save();
  ctx.translate(cx, cy + bodyH * 0.9);
  ctx.rotate(roll);
  ctx.beginPath();
  ctx.ellipse(0, 0, span * 0.42, 14, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(4,16,24,0.28)';
  ctx.fill();
  ctx.restore();

  const w = span * 0.5;
  const h = bodyH * 0.5;

  // Far wing, then tailplane, then fuselage, then near wing: depth layering.
  poly([[-w * 0.92, -h * 0.18], [-w * 0.14, -h * 0.34], [-w * 0.1, h * 0.2], [-w * 0.86, h * 0.12]], '#5d7887', '#263d4b');
  poly([[-w * 0.34, h * 0.62], [-w * 0.06, h * 0.48], [w * 0.06, h * 0.48], [w * 0.34, h * 0.62]], '#7c95a0', '#2b4250');
  poly([[-w * 0.1, h * 0.7], [-w * 0.05, h * 0.28], [w * 0.05, h * 0.28], [w * 0.1, h * 0.7]], '#8da7b1', '#29404d');

  // Engine nacelle and exhaust glow.
  poly([[-w * 0.13, h * 0.72], [-w * 0.1, h * 1.02], [w * 0.1, h * 1.02], [w * 0.13, h * 0.72]], '#3f5b69', '#203541');
  const glow = ctx.createRadialGradient(cx, cy + h * 1.06, 1, cx, cy + h * 1.06, 34 + plane.throttle * 26);
  glow.addColorStop(0, 'rgba(255,206,120,' + (0.5 + plane.throttle * 0.4) + ')');
  glow.addColorStop(0.4, 'rgba(255,140,60,0.28)');
  glow.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy + h * 1.06, 34 + plane.throttle * 26, 0, Math.PI * 2);
  ctx.fill();

  // Main fuselage with a spine highlight.
  poly([[-w * 0.09, -h * 0.8], [-w * 0.15, h * 0.1], [-w * 0.1, h * 0.76], [w * 0.1, h * 0.76], [w * 0.15, h * 0.1], [w * 0.09, -h * 0.8]], '#d7e3e4', '#38515f');
  poly([[-w * 0.035, -h * 0.78], [-w * 0.055, h * 0.62], [w * 0.02, h * 0.62], [w * 0.03, -h * 0.78]], '#f0f5f2');

  // Canopy: tinted glass with a frame and a pilot's helmet hint.
  poly([[-w * 0.085, -h * 0.34], [-w * 0.07, -h * 0.68], [w * 0.07, -h * 0.68], [w * 0.085, -h * 0.34]], '#173c50', '#8fd8e8');
  poly([[-w * 0.04, -h * 0.58], [w * 0.01, -h * 0.64], [w * 0.03, -h * 0.38], [-w * 0.02, -h * 0.36]], 'rgba(160,222,235,0.55)');

  // Near wing, with flap line and navigation light.
  poly([[w * 0.1, -h * 0.3], [w * 0.94, -h * 0.16], [w * 0.88, h * 0.16], [w * 0.1, h * 0.24]], '#b8ccd2', '#2c4553');
  poly([[w * 0.16, h * 0.04], [w * 0.86, h * 0.04], [w * 0.85, h * 0.15], [w * 0.16, h * 0.19]], '#91aab4');
  const tip = px(w * 0.93, -h * 0.14);
  ctx.beginPath();
  ctx.arc(tip.x, tip.y, 3.4, 0, Math.PI * 2);
  ctx.fillStyle = plane.damage > 40 ? '#ff7a5c' : '#7dffc2';
  ctx.shadowBlur = 12;
  ctx.shadowColor = ctx.fillStyle;
  ctx.fill();
  ctx.shadowBlur = 0;

  // Landing gear, drawn only when selected.
  if (plane.gear) {
    const wheel = (x, y) => {
      const p = px(x, y);
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, 7, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#101c24';
      ctx.fill();
      ctx.strokeStyle = '#7a93a0';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    };
    ctx.beginPath();
    const a = px(-w * 0.12, h * 0.9), b = px(-w * 0.2, h * 1.35);
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
    const c = px(w * 0.12, h * 0.9), d = px(w * 0.2, h * 1.35);
    ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.strokeStyle = '#aebfc6'; ctx.lineWidth = 3; ctx.stroke();
    wheel(-w * 0.2, h * 1.4);
    wheel(w * 0.2, h * 1.4);
    wheel(0, h * 1.22);
  }

  // Wingtip strobe, a small honest animation.
  if (Math.sin(time * 5) > 0.94) {
    ctx.beginPath();
    ctx.arc(cx - span * 0.45, cy - 8, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fill();
  }
}
