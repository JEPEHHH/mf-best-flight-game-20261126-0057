// Camera and software projection. The whole game is drawn on one 2D canvas:
// no WebGL, no vendored engine, no images. Points in world space are rotated
// into camera space and projected with a simple pinhole transform.

import { clamp, lerp } from './mathkit.js';

export function createCamera() {
  return { x: 0, y: 0, z: 0, heading: 0, pitch: 0, bank: 0, fov: 1.05, shake: 0 };
}

export function placeChaseCamera(cam, plane, lookX, lookY) {
  const back = 46;
  const up = 13;
  const h = plane.heading;
  cam.x = plane.x - Math.sin(h) * back + Math.cos(h) * lookX * 9;
  cam.z = plane.z - Math.cos(h) * back - Math.sin(h) * lookX * 9;
  cam.y = plane.y + up + lookY * 6;
  cam.heading = h + lookX * 0.04;
  cam.pitch = plane.pitch * 0.65 + lookY * 0.03;
  cam.bank = plane.bank * 0.35;
}

// Pilot eye point: slightly ahead of and above the model's origin, so the
// dashboard sits at the bottom of the frame and the nose stays hidden.
export function placeCockpitCamera(cam, plane, lookX, lookY) {
  const h = plane.heading;
  cam.x = plane.x + Math.sin(h) * 12;
  cam.z = plane.z + Math.cos(h) * 12;
  cam.y = plane.y + 4.6 + lookY * 3;
  cam.heading = h + lookX * 0.03;
  cam.pitch = plane.pitch * 0.92 + lookY * 0.02;
  cam.bank = plane.bank * 0.82;
}

export function makeProjector(cam, width, height) {
  const ch = Math.cos(cam.heading), sh = Math.sin(cam.heading);
  const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
  const cb = Math.cos(cam.bank), sb = Math.sin(cam.bank);
  const focal = (height * 0.5) / Math.tan(cam.fov * 0.5);
  const cx = width * 0.5, cy = height * 0.5;

  return function project(x, y, z) {
    let dx = x - cam.x, dy = y - cam.y, dz = z - cam.z;
    // yaw
    let ex = dx * ch - dz * sh;
    let ez = dx * sh + dz * ch;
    // pitch
    let ey = dy * cp - ez * sp;
    ez = dy * sp + ez * cp;
    // roll
    const rx = ex * cb - ey * sb;
    ey = ex * sb + ey * cb;
    ex = rx;
    if (ez <= 1.2) return null;
    const scale = focal / ez;
    return { x: cx + ex * scale, y: cy - ey * scale, z: ez, scale };
  };
}
