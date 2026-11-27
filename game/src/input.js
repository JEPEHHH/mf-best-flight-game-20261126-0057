// Keyboard and mouse input. The mouse adds a small look offset to either
// camera; it never changes the flight path, so the controls stay predictable.

export function createInput(canvas) {
  const keys = new Set();
  const state = { roll: 0, pitch: 0, throttleUp: false, throttleDown: false, lookX: 0, lookY: 0, gearPress: false, restartPress: false, viewPress: false, timePress: false };

  const down = (e) => {
    const k = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
    if (!keys.has(k)) {
      if (k === 'g') state.gearPress = true;
      if (k === 'r') state.restartPress = true;
      if (k === 'c') state.viewPress = true;
      if (k === 't') state.timePress = true;
    }
    keys.add(k);
  };
  const up = (e) => keys.delete(e.key.toLowerCase());
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.lookX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    state.lookY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  return {
    state,
    sample() {
      state.roll = (keys.has('d') || keys.has('arrowright') ? 1 : 0) - (keys.has('a') || keys.has('arrowleft') ? 1 : 0);
      state.pitch = (keys.has('arrowup') ? 1 : 0) - (keys.has('arrowdown') ? 1 : 0);
      state.throttleUp = keys.has('w');
      state.throttleDown = keys.has('s');
      return state;
    },
    clearEdges() {
      state.gearPress = false;
      state.restartPress = false;
      state.viewPress = false;
      state.timePress = false;
    },
  };
}
