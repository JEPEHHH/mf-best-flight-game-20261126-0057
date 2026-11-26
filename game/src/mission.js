// Mission state machine: fly the six gates, then land on the strip.
// Kept separate from the flight physics and the drawing code so the outline
// of the dossier shows one clear job per file.

import { gateProgress, runwayDistance, RUNWAY, GATES } from './world.js';

export function createMission() {
  return {
    gateIndex: 0,
    hits: [],
    phase: 'rings',
    message: 'GATE 1 OF 6 — THREAD THE AMBER RING',
    messageAge: 0,
    score: 0,
    landed: false,
    finished: false,
    result: '',
    bestGate: 0,
  };
}

function say(mission, text) {
  mission.message = text;
  mission.messageAge = 3.2;
}

export function stepMission(mission, plane, dt) {
  mission.messageAge = Math.max(0, mission.messageAge - dt);
  if (mission.finished) return;

  if (mission.phase === 'rings') {
    const gate = GATES[mission.gateIndex];
    const state = gateProgress(plane, mission.gateIndex);
    if (state && state.inside) {
      const precision = 1 - Math.min(1, state.distance / gate.radius);
      const bonus = Math.round(120 + precision * 180);
      mission.score += bonus;
      mission.hits.push({ gate: gate.label, precision, time: plane.elapsed });
      mission.bestGate = Math.max(mission.bestGate, precision);
      mission.gateIndex++;
      if (mission.gateIndex >= GATES.length) {
        mission.phase = 'landing';
        say(mission, 'ALL GATES CLEARED — RETURN TO THE STRIP, GEAR DOWN');
      } else {
        say(mission, 'GATE ' + gate.label + ' CLEARED +' + bonus + ' — NEXT: ' + GATES[mission.gateIndex].label);
      }
    }
  } else if (mission.phase === 'landing') {
    const near = runwayDistance(plane) < RUNWAY.length * 0.55;
    const aligned = Math.abs(plane.heading - RUNWAY.heading) < 0.42;
    const low = plane.y - RUNWAY.elevation < 55;
    if (near && low && !plane.gear && mission.messageAge <= 0) {
      say(mission, 'LOW APPROACH — PRESS G FOR GEAR');
    }
    if (plane.onGround && near) {
      const gentle = plane.speed < 78 && !plane.crashed;
      if (gentle && plane.gear && aligned) {
        mission.score += 600 + Math.round(plane.fuel * 3);
        mission.landed = true;
        mission.finished = true;
        mission.result = 'SORTIE COMPLETE — CLEAN LANDING';
      } else {
        mission.finished = true;
        mission.result = plane.crashed ? 'AIRFRAME LOST' : 'HARD LANDING — TRY AGAIN';
      }
    }
  }

  if (plane.crashed && !mission.finished) {
    mission.finished = true;
    mission.result = 'AIRFRAME LOST — TERRAIN IMPACT';
  }
  if (plane.fuel <= 0 && !plane.onGround && plane.speed < 40) {
    mission.finished = true;
    mission.result = 'FUEL EXHAUSTED';
  }
}

export function missionProgress(mission) {
  return mission.gateIndex / GATES.length;
}
