// Ties the flight model, mission, world and painters together into one loop.
// Also exposes a deterministic stepping hook used by the screenshot renderer
// so every capture is a frame the real game code actually produced.
//
// Two cameras share the same world: a chase view for flying and a first-person
// cockpit for the real thing. `tod` bends the light from dawn to night.

import { createPlane, stepPlane } from './flight.js';
import { createMission, stepMission } from './mission.js';
import { createInput } from './input.js';
import { createCamera, placeChaseCamera, placeCockpitCamera, makeProjector } from './camera.js';
import { paintSky, paintFarPeaks, paintTerrain, paintGroundShadow, paintSkyLayer } from './terrain_paint.js';
import { paintAtmosphereFront } from './atmosphere.js';
import { paintGates, paintRunway, paintTargetDiamond } from './markers.js';
import { paintAircraft } from './aircraft.js';
import { paintCockpit } from './cockpit.js';
import { paintHud } from './hud.js';
import { GATES } from './world.js';

export function createFlightGame(canvas, options = {}) {
  const ctx = canvas.getContext('2d');
  const input = createInput(canvas);
  const camera = createCamera();
  let plane = createPlane();
  let mission = createMission();
  let running = false;
  let last = 0;
  let time = 0;
  let width = 1280, height = 720;
  let view = 'chase';
  let tod = 0.34;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = Math.max(640, canvas.clientWidth || window.innerWidth);
    height = Math.max(480, canvas.clientHeight || window.innerHeight);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function render() {
    ctx.clearRect(0, 0, width, height);
    const cockpit = view === 'cockpit';
    if (cockpit) placeCockpitCamera(camera, plane, input.state.lookX, input.state.lookY);
    else placeChaseCamera(camera, plane, input.state.lookX, input.state.lookY);
    const project = makeProjector(camera, width, height);

    paintSky(ctx, width, height, plane, tod, time);
    const horizon = paintSkyLayer(ctx, project, width, height, plane, tod, time);
    paintFarPeaks(ctx, project, width, height, tod);
    paintTerrain(ctx, project, camera, width, height, tod);
    paintRunway(ctx, project, tod);
    paintGates(ctx, project, mission, time, tod);
    paintGroundShadow(ctx, project, plane);
    if (!cockpit) paintAircraft(ctx, width, height, plane, time);
    paintAtmosphereFront(ctx, width, height, horizon, tod);
    if (cockpit) paintCockpit(ctx, width, height, plane, tod);
    if (mission.phase === 'rings' && !cockpit) paintTargetDiamond(ctx, project, GATES[mission.gateIndex], width, height);
    paintHud(ctx, width, height, plane, mission, input.state, view);

    if (mission.finished) {
      ctx.fillStyle = 'rgba(3,14,22,0.72)';
      ctx.fillRect(0, height * 0.34, width, 120);
      ctx.textAlign = 'center';
      ctx.font = 'bold 30px Courier New';
      ctx.fillStyle = mission.landed ? '#8ef0d6' : '#ff9a7a';
      ctx.fillText(mission.result, width / 2, height * 0.34 + 52);
      ctx.font = '14px Courier New';
      ctx.fillStyle = '#c3e5ee';
      ctx.fillText('SCORE ' + mission.score + '   ·   PRESS R TO FLY AGAIN', width / 2, height * 0.34 + 88);
      ctx.textAlign = 'left';
    }
  }

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000 || 0.016));
    last = now;
    tick(dt);
    requestAnimationFrame(frame);
  }

  function tick(dt) {
    const keys = input.sample();
    time += dt;
    if (keys.restartPress) {
      plane = createPlane();
      mission = createMission();
    }
    if (keys.viewPress) view = view === 'chase' ? 'cockpit' : 'chase';
    if (keys.timePress) tod = (tod + 0.25) % 1;
    if (keys.gearPress && !plane.gear) {
      plane.gear = true;
      mission.message = 'GEAR DOWN — KEEP THE NOSE STEADY';
      mission.messageAge = 2.2;
    }
    stepPlane(plane, keys, dt);
    stepMission(mission, plane, dt);
    input.clearEdges();
    render();
  }

  return {
    pause() { running = false; },
    resume() {
      if (running) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    },
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      render();
      requestAnimationFrame(frame);
    },
    tick,
    render,
    get plane() { return plane; },
    get mission() { return mission; },
    get view() { return view; },
    get tod() { return tod; },
    setView(next) { view = next; },
    setTod(next) { tod = next; },
    setPlane(next) { plane = next; },
    setMission(next) { mission = next; },
    reset() { plane = createPlane(); mission = createMission(); time = 0; render(); },
  };
}
