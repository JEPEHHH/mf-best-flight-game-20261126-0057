// Flight model for the Kestrel Mk II.
// A purposely readable arcade model: throttle sets target speed, bank drives
// turn rate, pitch trades height for speed. Stall, fuel burn and terrain
// strikes all feed a damage value the HUD and the mission logic display.

import { clamp, approach, wrapAngle } from './mathkit.js';
import { groundHeight, START } from './world.js';

export function createPlane() {
  return {
    x: START.x, y: START.y, z: START.z,
    heading: START.heading, pitch: 0, bank: 0,
    speed: START.speed, throttle: 0.66,
    fuel: 100, damage: 0, gear: false,
    stalled: false, onGround: false, crashed: false,
    gLoad: 1, elapsed: 0, distance: 0,
  };
}

const TURN_PER_BANK = 0.85;
const MAX_SPEED = 226;
const MIN_SPEED = 44;

export function stepPlane(plane, input, dt) {
  if (plane.crashed) return;
  plane.elapsed += dt;

  // Throttle: W and S nudge it, and it stays where the pilot leaves it.
  if (input.throttleUp) plane.throttle = clamp(plane.throttle + dt * 0.42, 0, 1);
  if (input.throttleDown) plane.throttle = clamp(plane.throttle - dt * 0.42, 0, 1);

  const targetSpeed = MIN_SPEED + plane.throttle * (MAX_SPEED - MIN_SPEED);
  let accel = (targetSpeed - plane.speed) * 0.32;
  accel -= Math.sin(plane.pitch) * 42;          // climbs bleed energy
  if (plane.stalled) accel -= 14;
  plane.speed = clamp(plane.speed + accel * dt, 28, MAX_SPEED + 12);

  // Controls respond at every speed, but slow flight feels softer.
  const authority = clamp(plane.speed / 110, 0.45, 1.15);
  const bankTarget = clamp(input.roll, -1, 1) * 0.82;
  plane.bank = approach(plane.bank, bankTarget, dt * 1.7 * authority);
  const pitchTarget = clamp(input.pitch, -1, 1) * 0.36;
  plane.pitch = approach(plane.pitch, pitchTarget, dt * 0.75 * authority);

  const turnRate = Math.sin(plane.bank) * TURN_PER_BANK * clamp(110 / plane.speed, 0.6, 1.5);
  plane.heading = wrapAngle(plane.heading + turnRate * dt);

  const climb = Math.sin(plane.pitch) * plane.speed * 0.62;
  plane.y += climb * dt;
  plane.x += Math.sin(plane.heading) * Math.cos(plane.pitch) * plane.speed * dt;
  plane.z += Math.cos(plane.heading) * Math.cos(plane.pitch) * plane.speed * dt;
  plane.distance += plane.speed * dt;

  plane.gLoad = 1 / Math.max(0.25, Math.cos(plane.bank));
  plane.stalled = plane.speed < 62 && plane.pitch > 0.16;

  // Fuel burns faster at high power; an empty tank quietly ends the run.
  plane.fuel = Math.max(0, plane.fuel - dt * (0.28 + plane.throttle * 0.55));
  if (plane.fuel <= 0) {
    plane.throttle = 0;
    plane.speed = Math.max(38, plane.speed - dt * 9);
  }

  // Hard banks over the ridges stress the airframe.
  if (plane.gLoad > 2.5) plane.damage = clamp(plane.damage + (plane.gLoad - 2.5) * dt * 3.5, 0, 100);
  if (plane.damage >= 100) plane.crashed = true;

  const floor = groundHeight(plane.x, plane.z);
  const clearance = plane.y - floor;
  if (clearance < 0) {
    plane.y = floor;
    plane.onGround = true;
    if (plane.speed > 74 || !plane.gear || Math.abs(plane.bank) > 0.35) {
      plane.damage = clamp(plane.damage + 70, 0, 100);
      plane.crashed = true;
    } else {
      plane.speed = Math.max(0, plane.speed - 95 * dt);
    }
  } else if (clearance > 4) {
    plane.onGround = false;
  }
}

export function throttleLabel(plane) {
  return String(Math.round(plane.throttle * 100)).padStart(3, '0');
}
