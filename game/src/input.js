// SOLMAR HEAT — input: keyboard state plus mouse-drag camera orbit.
// Keys are read by name so the HUD can show the same bindings as the help.
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

export function createInput(canvas) {
  const keys = new Set();
  let dragX = 0;
  let dragY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  const pressed = new Set();

  function onKeyDown(event) {
    if (event.repeat) return;
    keys.add(event.code);
    pressed.add(event.code);
  }
  function onKeyUp(event) { keys.delete(event.code); }
  function onMouseDown(event) {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
  }
  function onMouseMove(event) {
    if (!dragging) return;
    dragX += event.clientX - lastX;
    dragY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  }
  function onMouseUp() { dragging = false; }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  return {
    isDown(code) { return keys.has(code); },
    // True once per physical press; consumed by the game loop each frame.
    wasPressed(code) { return pressed.has(code); },
    consumeDrag() {
      const out = { x: dragX, y: dragY };
      dragX = 0;
      dragY = 0;
      return out;
    },
    endFrame() { pressed.clear(); },
  };
}
