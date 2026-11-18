// SOLMAR HEAT — input: the keyboard and the mouse-drag orbit, read by
// every system through one small surface. Held keys live in a set, taps
// (one physical press) live in a second set the loop drains each frame,
// and drag deltas accumulate until something consumes them — so a frame
// never sees the same tap twice and never misses a flick of the mouse.
export const ACTION = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  run: 'ShiftLeft',
  enterCar: 'KeyE',
  punch: 'KeyF',
  horn: 'KeyH',
  pause: 'KeyP',
  confirm: 'Enter',
  mission: 'KeyM',
  mute: 'KeyN',
};

// Arrow keys drive too, for players who never learned WASD.
const ARROW_ALIAS = {
  ArrowUp: 'KeyW',
  ArrowDown: 'KeyS',
  ArrowLeft: 'KeyA',
  ArrowRight: 'KeyD',
};

function resolveCode(event) {
  return ARROW_ALIAS[event.code] ?? event.code;
}

export function createInput(canvas) {
  const held = new Set();
  const tapped = new Set();
  const drag = { x: 0, y: 0 };
  let orbiting = false;
  let pointerX = 0;
  let pointerY = 0;

  function press(event) {
    if (event.repeat) return;
    const code = resolveCode(event);
    held.add(code);
    tapped.add(code);
  }

  function release(event) {
    held.delete(resolveCode(event));
  }

  function clearAll() {
    held.clear();
    tapped.clear();
  }

  function grab(event) {
    orbiting = true;
    pointerX = event.clientX;
    pointerY = event.clientY;
  }

  function orbit(event) {
    if (!orbiting) return;
    drag.x += event.clientX - pointerX;
    drag.y += event.clientY - pointerY;
    pointerX = event.clientX;
    pointerY = event.clientY;
  }

  function letGo() {
    orbiting = false;
  }

  window.addEventListener('keydown', press);
  window.addEventListener('keyup', release);
  // Alt-tab used to strand keys in the held set, so Rico kept walking
  // or driving long after the player had left the keyboard.
  window.addEventListener('blur', clearAll);
  canvas.addEventListener('mousedown', grab);
  window.addEventListener('mousemove', orbit);
  window.addEventListener('mouseup', letGo);

  return {
    isDown(code) {
      return held.has(code);
    },
    // True once per physical press; the loop drains it every frame.
    wasPressed(code) {
      return tapped.has(code);
    },
    consumeDrag() {
      const delta = { x: drag.x, y: drag.y };
      drag.x = 0;
      drag.y = 0;
      return delta;
    },
    endFrame() {
      tapped.clear();
    },
  };
}
