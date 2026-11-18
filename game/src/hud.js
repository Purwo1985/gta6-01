// SOLMAR HEAT — hud: every on-screen element. Wanted stars, cash, health,
// speed, the mission objective, dialogue subtitles, toast messages and a
// live 2D minimap (roads, buildings, beacon, cars, police, player arrow).
import { CITY } from './config.js';

export function createHud(city) {
  const el = (id) => document.getElementById(id);
  const starsEl = el('wanted');
  const cashEl = el('cash');
  const healthEl = el('health-fill');
  const speedEl = el('speed');
  const objectiveEl = el('objective');
  const dialogEl = el('dialogue');
  const toastEl = el('toast');
  const minimap = el('minimap');
  const mctx = minimap.getContext('2d');
  const clockEl = el('clock');
  let toastTimer = 0;
  let gameMinutes = 17 * 60 + 24; // Sunset: 17:24, ticking slowly.

  function drawMinimap(playerPos, heading, cars, policeCars, beaconPos, targetPos) {
    const S = 168;
    const half = CITY.half + 60;
    const toMap = (x, z) => [((x + half) / (half * 2)) * S, ((z + half) / (half * 2)) * S];
    mctx.clearRect(0, 0, S, S);
    mctx.fillStyle = 'rgba(20,28,40,0.85)';
    mctx.fillRect(0, 0, S, S);
    // Sea strip at the bottom.
    mctx.fillStyle = '#2a7fa8';
    const [, seaY] = toMap(0, CITY.half);
    mctx.fillRect(0, seaY, S, S - seaY);
    // Roads.
    mctx.strokeStyle = '#8a8a9a';
    mctx.lineWidth = 3;
    for (const line of city.roadLines) {
      const [x] = toMap(line, 0);
      mctx.beginPath(); mctx.moveTo(x, 0); mctx.lineTo(x, S); mctx.stroke();
      const [, z] = toMap(0, line);
      mctx.beginPath(); mctx.moveTo(0, z); mctx.lineTo(S, z); mctx.stroke();
    }
    // Buildings as warm blocks.
    mctx.fillStyle = '#c9a86a';
    for (const c of city.colliders) {
      const [x1, z1] = toMap(c.minX, c.minZ);
      const [x2, z2] = toMap(c.maxX, c.maxZ);
      mctx.fillRect(x1, z1, Math.max(1, x2 - x1), Math.max(1, z2 - z1));
    }
    // Mission target.
    if (targetPos) {
      const [x, z] = toMap(targetPos.x, targetPos.z);
      mctx.fillStyle = '#ffd21f';
      mctx.beginPath(); mctx.arc(x, z, 6, 0, Math.PI * 2); mctx.fill();
      mctx.strokeStyle = '#ffd21f';
      mctx.beginPath(); mctx.arc(x, z, 10, 0, Math.PI * 2); mctx.stroke();
    }
    // Traffic cars (white), police (blue-red), player (green arrow).
    mctx.fillStyle = '#ffffff';
    for (const c of cars) {
      const [x, z] = toMap(c.pos.x, c.pos.z);
      mctx.fillRect(x - 1.5, z - 1.5, 3, 3);
    }
    mctx.fillStyle = '#4a90ff';
    for (const c of policeCars) {
      const [x, z] = toMap(c.pos.x, c.pos.z);
      mctx.beginPath(); mctx.arc(x, z, 3.5, 0, Math.PI * 2); mctx.fill();
    }
    const [px, pz] = toMap(playerPos.x, playerPos.z);
    mctx.save();
    mctx.translate(px, pz);
    // The arrow is drawn pointing up (0,-1); rotating by PI - heading
    // points it along the player's forward vector (sin h, cos h) on the
    // map (x right, z down). The old `heading + PI` mirrored it left-right.
    mctx.rotate(Math.PI - heading);
    mctx.fillStyle = '#37e07a';
    mctx.beginPath();
    mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(-5, 6); mctx.closePath();
    mctx.fill();
    mctx.restore();
  }

  return {
    update(dt, state) {
      gameMinutes += dt * 0.6;
      const hh = Math.floor(gameMinutes / 60) % 24;
      const mm = Math.floor(gameMinutes % 60);
      clockEl.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}  PORTO SOLMAR`;
      starsEl.textContent = '★'.repeat(state.wanted) + '☆'.repeat(Math.max(0, 5 - state.wanted));
      starsEl.style.color = state.wanted > 0 ? '#ffd21f' : '#888899';
      cashEl.textContent = `$${state.cash.toLocaleString('en-US')}`;
      healthEl.style.width = `${Math.max(0, state.health)}%`;
      healthEl.style.background = state.health > 50 ? '#37e07a' : state.health > 25 ? '#f2c14e' : '#e83a2e';
      speedEl.textContent = state.inCar ? `${Math.round(Math.abs(state.speed) * 3.6)} km/h` : '';
      objectiveEl.textContent = state.objective;
      dialogEl.textContent = state.dialogue || '';
      dialogEl.style.display = state.dialogue ? 'block' : 'none';
      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) toastEl.style.display = 'none';
      }
      drawMinimap(state.pos, state.heading, state.trafficCars, state.policeCars, state.beaconPos, state.targetPos);
    },
    toast(text, ms = 2600) {
      toastEl.textContent = text;
      toastEl.style.display = 'block';
      toastTimer = ms / 1000;
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
