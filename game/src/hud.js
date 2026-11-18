// SOLMAR HEAT — hud: everything on screen. Wanted stars, cash, health,
// speed, the job objective, dialogue subtitles, toast messages and a
// live 2D minimap — roads, buildings, the beacon, traffic, police and
// Rico's own arrow, all redrawn every frame from the world state.
import { CITY } from './config.js';

const MAP_SIZE = 168;

export function createHud(city) {
  const grab = (id) => document.getElementById(id);
  const starsBox = grab('wanted');
  const cashBox = grab('cash');
  const healthBar = grab('health-fill');
  const speedBox = grab('speed');
  const objectiveBox = grab('objective');
  const dialogueBox = grab('dialogue');
  const toastBox = grab('toast');
  const clockBox = grab('clock');
  const mapCanvas = grab('minimap');
  const map = mapCanvas.getContext('2d');
  let toastLeft = 0;
  let minutes = 17 * 60 + 24; // Sunset: 17:24, ticking slowly on.

  function project(x, z) {
    const span = CITY.half + 60;
    return [
      ((x + span) / (span * 2)) * MAP_SIZE,
      ((z + span) / (span * 2)) * MAP_SIZE,
    ];
  }

  function paintMinimap(playerPos, heading, cars, policeCars, targetPos) {
    const S = MAP_SIZE;
    const span = CITY.half + 60;
    map.clearRect(0, 0, S, S);
    map.fillStyle = 'rgba(20,28,40,0.85)';
    map.fillRect(0, 0, S, S);
    // Sea along the southern edge.
    map.fillStyle = '#2a7fa8';
    const [, seaTop] = project(0, CITY.half);
    map.fillRect(0, seaTop, S, S - seaTop);
    // Road grid.
    map.strokeStyle = '#8a8a9a';
    map.lineWidth = 3;
    for (const line of city.roadLines) {
      const [vx] = project(line, 0);
      map.beginPath();
      map.moveTo(vx, 0);
      map.lineTo(vx, S);
      map.stroke();
      const [, hz] = project(0, line);
      map.beginPath();
      map.moveTo(0, hz);
      map.lineTo(S, hz);
      map.stroke();
    }
    // Buildings as warm blocks.
    map.fillStyle = '#c9a86a';
    for (const block of city.colliders) {
      const [x1, z1] = project(block.minX, block.minZ);
      const [x2, z2] = project(block.maxX, block.maxZ);
      map.fillRect(x1, z1, Math.max(1, x2 - x1), Math.max(1, z2 - z1));
    }
    // The job target: a gold ring with a halo.
    if (targetPos) {
      const [tx, tz] = project(targetPos.x, targetPos.z);
      map.fillStyle = '#ffd21f';
      map.beginPath();
      map.arc(tx, tz, 6, 0, Math.PI * 2);
      map.fill();
      map.strokeStyle = '#ffd21f';
      map.beginPath();
      map.arc(tx, tz, 10, 0, Math.PI * 2);
      map.stroke();
    }
    // Traffic in white, police in blue, Rico as a green arrow.
    map.fillStyle = '#ffffff';
    for (const car of cars) {
      const [cx, cz] = project(car.pos.x, car.pos.z);
      map.fillRect(cx - 1.5, cz - 1.5, 3, 3);
    }
    map.fillStyle = '#4a90ff';
    for (const patrol of policeCars) {
      const [px, pz] = project(patrol.pos.x, patrol.pos.z);
      map.beginPath();
      map.arc(px, pz, 3.5, 0, Math.PI * 2);
      map.fill();
    }
    const [rx, rz] = project(playerPos.x, playerPos.z);
    map.save();
    map.translate(rx, rz);
    // The arrow is drawn pointing up; rotating by PI minus the heading
    // aims it along Rico's forward vector (sin h, cos h) on a map where
    // x runs right and z runs down.
    map.rotate(Math.PI - heading);
    map.fillStyle = '#37e07a';
    map.beginPath();
    map.moveTo(0, -7);
    map.lineTo(5, 6);
    map.lineTo(-5, 6);
    map.closePath();
    map.fill();
    map.restore();
  }

  return {
    update(dt, state) {
      minutes += dt * 0.6;
      const hours = Math.floor(minutes / 60) % 24;
      const mins = Math.floor(minutes % 60);
      clockBox.textContent =
        `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}  PORTO SOLMAR`;
      starsBox.textContent = '★'.repeat(state.wanted) + '☆'.repeat(Math.max(0, 5 - state.wanted));
      starsBox.style.color = state.wanted > 0 ? '#ffd21f' : '#888899';
      cashBox.textContent = `$${state.cash.toLocaleString('en-US')}`;
      const health = Math.max(0, state.health);
      healthBar.style.width = `${health}%`;
      healthBar.style.background = health > 50 ? '#37e07a' : health > 25 ? '#f2c14e' : '#e83a2e';
      speedBox.textContent = state.inCar ? `${Math.round(Math.abs(state.speed) * 3.6)} km/h` : '';
      objectiveBox.textContent = state.objective;
      dialogueBox.textContent = state.dialogue || '';
      dialogueBox.style.display = state.dialogue ? 'block' : 'none';
      if (toastLeft > 0) {
        toastLeft -= dt;
        if (toastLeft <= 0) toastBox.style.display = 'none';
      }
      paintMinimap(state.pos, state.heading, state.trafficCars, state.policeCars, state.targetPos);
    },
    toast(text, ms = 2600) {
      toastBox.textContent = text;
      toastBox.style.display = 'block';
      toastLeft = ms / 1000;
    },
    showScreen(name) {
      for (const id of ['screen-start', 'screen-pause', 'screen-over']) {
        document.getElementById(id).style.display = id === `screen-${name}` ? 'flex' : 'none';
      }
      document.getElementById('hud').style.display = name === 'play' ? 'block' : 'none';
    },
    setFinalStats(cash, missionsDone, busted) {
      document.getElementById('final-stats').textContent =
        `Cash $${cash.toLocaleString('en-US')} · Missions done ${missionsDone} · Busted ${busted} times`;
    },
  };
}
