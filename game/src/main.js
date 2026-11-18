// SOLMAR HEAT — main: boot, the fixed-step loop, screens (start / play /
// pause / busted), and the glue between every system: entering and stealing
// cars, crimes and wanted, missions, combat, the camera and the HUD.
// ?seed=N fixes the city. ?shot=chase|walk|mission|start stages that scene
// instead of the loop, paints it and sets window.__shotReady for screenshots.
import { THREE } from './three.js';
import { CITY, CAR, STEP, WORLD_SEED, MISSIONS } from './config.js';
import { createRandom } from './random.js';
import { buildCity, resolveCollisions } from './city.js';
import { createPlayer } from './player.js';
import { createCar, pickCarColor } from './vehicles.js';
import { createTraffic } from './traffic.js';
import { createPolice } from './police.js';
import { createMissions } from './missions.js';
import { resolvePunch, damagePlayer } from './combat.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { loadSave, storeSave } from './save.js';
import { createInput, ACTION } from './input.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : WORLD_SEED;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const rng = createRandom(seed);
const city = buildCity(scene, rng);
const save = loadSave();
const player = createPlayer(scene);
const traffic = createTraffic(scene, rng, city);
const police = createPolice(scene, rng, city);
const missions = createMissions(scene, city, save);
const hud = createHud(city);
const audio = createAudio();
const input = createInput(canvas);

let screen = 'start';
let currentCar = null;
let parkedCars = [];
let camYawOffset = 0;
let camMode = 'follow';
let shotCamera = null;
let ramCooldown = 0;
let healthRegen = 0;
let debugDriveInput = null;
let debugWalkInput = null;
let lastPickupHint = 99;

function spawnParkedCars() {
  for (const c of parkedCars) c.remove();
  parkedCars = [];
  const spots = [
    [60, 24], [-60, -36], [120, 84], [-120, -84], [0, -96], [180, -24], [-180, 36], [60, 156],
  ];
  for (const [x, z] of spots) {
    const heading = rng.chance(0.5) ? 0 : Math.PI / 2;
    const car = createCar(scene, x, z, heading, pickCarColor(rng));
    parkedCars.push(car);
  }
}

function nearestParked(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of parkedCars) {
    const d = Math.hypot(car.pos.x - player.pos.x, car.pos.z - player.pos.z);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function enterCar(car) {
  const i = parkedCars.indexOf(car);
  if (i >= 0) {
    parkedCars.splice(i, 1);
    police.addWanted(1);
    hud.toast('You stole a car! The cops noticed. (+1 ★)');
    audio.horn();
  }
  currentCar = car;
  player.group.visible = false;
  camYawOffset = 0;
}

function exitCar() {
  if (!currentCar) return;
  const fx = Math.sin(currentCar.heading);
  const fz = Math.cos(currentCar.heading);
  player.pos.set(currentCar.pos.x - fx * 3, 0, currentCar.pos.z - fz * 3);
  // The drop point can sit inside a building when the car is parked
  // against one; push Rico out of it instead of trapping him in a wall.
  resolveCollisions(city.colliders, city.half, player.pos, 0.6);
  player.group.position.copy(player.pos);
  player.group.visible = true;
  parkedCars.push(currentCar);
  currentCar = null;
}

function onCrime(type, arg) {
  if (type === 'assault') {
    police.addWanted(1);
    hud.toast('Assault! Wanted level up. (+1 ★)');
  } else if (type === 'siren') {
    audio.siren();
  } else if (type === 'ram') {
    if (ramCooldown <= 0) {
      ramCooldown = 0.8;
      audio.crash();
      if (damagePlayer(player, 9)) bustPlayer();
      if (currentCar) {
        currentCar.health -= 12;
        if (currentCar.health <= 0) {
          hud.toast('Your car is wrecked!');
          exitCar();
        }
      }
    }
  }
}

function bustPlayer() {
  if (screen !== 'play') return;
  screen = 'over';
  save.busted += 1;
  storeSave(save);
  audio.busted();
  police.clear();
  hud.setFinalStats(save.cash, save.completed.length, save.busted);
  hud.showScreen('over');
}

function startMission(i) {
  const m = missions.start(i);
  if (m.def.wanted) police.setWanted(m.def.wanted);
  hud.toast(`MISSION: ${m.def.title} — ${m.def.giver}`);
  audio.click();
}

function resetWorld() {
  police.clear();
  player.reset(0, 30);
  player.group.visible = true;
  currentCar = null;
  spawnParkedCars();
  missions.start(Math.min(save.missionIndex, MISSIONS.length - 1));
  screen = 'play';
  hud.showScreen('play');
}

const game = {
  resetWorld,
  step(dt) { tick(dt, true); },
  debugDrive(inputState) { debugDriveInput = inputState; },
  debugWalk(inputState) { debugWalkInput = inputState; },
  debugPlaceCar(x, z, heading) {
    const car = createCar(scene, x, z, heading, 0xd83a2e);
    enterCar(car);
  },
  debugPlacePlayer(x, z) {
    player.reset(x, z);
    player.camYaw = Math.PI * 0.9;
  },
  debugGatherPeds(x, z, count) {
    for (let i = 0; i < Math.min(count, traffic.peds.length); i += 1) {
      const ped = traffic.peds[i];
      const a = (i / count) * Math.PI * 2;
      ped.pos.set(x + Math.sin(a) * 7, 0, z + Math.cos(a) * 7);
    }
  },
  debugSetWanted(n) { police.setWanted(n); },
  debugSpawnPolice(n) {
    // Police appear ahead of the player's car, lights on, closing in —
    // so a chase reads in a single frame.
    const focus = currentCar ? currentCar.pos : player.pos;
    const heading = currentCar ? currentCar.heading : 0;
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    for (let i = 0; i < n; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const ahead = 26 + i * 9;
      const car = createCar(scene, focus.x + fx * ahead + fz * side * 7, focus.z + fz * ahead - fx * side * 7, heading + Math.PI, 0x1a1a22, true);
      police.cars.push(car);
    }
  },
  debugStartMission(i) { startMission(i); },
  debugCamera(mode) {
    camMode = mode;
    if (mode === 'aerial') shotCamera = { pos: new THREE.Vector3(150, 110, 150), look: new THREE.Vector3(0, 0, 0) };
    else shotCamera = null;
  },
};

function tick(dt, isShotStep) {
  ramCooldown = Math.max(0, ramCooldown - dt);
  // --- input-driven actions (skipped in staged steps unless debug input) ---
  const drive = debugDriveInput || null;
  const walk = debugWalkInput || null;
  if (!isShotStep || drive || walk) {
    if (currentCar) {
      const fwd = drive ? drive.forward : input.isDown(ACTION.forward);
      const back = drive ? !!drive.reverse : input.isDown(ACTION.back);
      const left = drive ? false : input.isDown(ACTION.left);
      const right = drive ? false : input.isDown(ACTION.right);
      const steer = (drive ? drive.steer : 0) + (left ? -1 : 0) + (right ? 1 : 0);
      const throttle = fwd ? 1 : back ? -1 : 0;
      const speed = currentCar.update(dt, throttle, steer, city.colliders, city.half);
      audio.setEngine(Math.abs(speed) / CAR.maxSpeed, true);
      if (!drive && input.wasPressed(ACTION.horn)) audio.horn();
      if (!drive && input.wasPressed(ACTION.enterCar)) exitCar();
      // Ram traffic cars aside; hitting a pedestrian in a car is a crime.
      for (const t of traffic.cars) currentCar.pushFrom(t, 3);
      const ped = traffic.nearestPed(currentCar.pos.x, currentCar.pos.z, 2.2);
      if (ped && Math.abs(currentCar.speed) > 4) {
        traffic.removePed(ped);
        police.addWanted(1);
        audio.crash();
        hud.toast('You hit a pedestrian! (+1 ★)');
      }
    } else {
      const fake = walk
        ? { isDown: (c) => (c === 'KeyW' && walk.forward), wasPressed: () => false, consumeDrag: () => ({ x: 0, y: 0 }) }
        : input;
      player.update(dt, fake, city.colliders, city.half);
      audio.setEngine(0, false);
      if (!walk && input.wasPressed(ACTION.punch)) resolvePunch(player, traffic, police, audio, onCrime, city);
      if (!walk && input.wasPressed(ACTION.enterCar)) {
        const car = nearestParked(4.5);
        if (car) enterCar(car);
        else hud.toast('No car close by — find a parked car (E)');
      }
    }
    debugDriveInput = null;
    debugWalkInput = null;
  }

  // --- world systems always advance ---
  const threat = currentCar ? currentCar.pos : player.pos;
  traffic.update(dt, threat);
  const focus = currentCar ? currentCar.pos : player.pos;
  police.update(dt, focus, !!currentCar, onCrime);
  const mState = missions.update(dt, focus, police.wanted, !!currentCar);
  if (mState && mState.done) {
    const done = missions.active.def;
    missions.complete(save, (kind, value) => {
      if (kind === 'cash') { audio.cash(); hud.toast(`Mission complete: ${done.title}  +$${value}`); }
    });
    storeSave(save);
    // complete() already starts the next mission; nothing more to do here.
    if (!missions.active) hud.toast('All missions done — Solmar is yours, Rico!');
  } else if (mState && mState.need === 'pickup' && currentCar) {
    missions.setPassenger(true);
    hud.toast('Tio Benny is in! Drive him to the Palms Hotel.');
  } else if (mState && mState.need === 'pickup' && !currentCar && lastPickupHint > 4) {
    // On foot at the plaza: say what is missing, throttled so it does not
    // spam every tick while the player stands at the marker.
    lastPickupHint = 0;
    hud.toast('Tio Benny needs a car — steal one and come back (E)');
  }
  // Slow health regen when the heat is off.
  if (police.wanted === 0 && player.health < 100) {
    healthRegen += dt;
    if (healthRegen > 1) { player.health = Math.min(100, player.health + 2); healthRegen = 0; }
  }
  lastPickupHint += dt;

  // --- camera ---
  if (camMode === 'aerial' && shotCamera) {
    camera.position.copy(shotCamera.pos);
    camera.lookAt(shotCamera.look);
  } else if (currentCar) {
    const drag = input.consumeDrag();
    camYawOffset -= drag.x * 0.004;
    camYawOffset = Math.max(-1.2, Math.min(1.2, camYawOffset));
    const yaw = currentCar.heading + Math.PI + camYawOffset;
    const dist = 9.5;
    camera.position.set(
      currentCar.pos.x + Math.sin(yaw) * dist,
      4.6,
      currentCar.pos.z + Math.cos(yaw) * dist,
    );
    camera.lookAt(currentCar.pos.x, 1.6, currentCar.pos.z);
  } else {
    const target = player.cameraTarget();
    const off = player.cameraOffset();
    camera.position.set(target.x + off.x, target.y + off.y, target.z + off.z);
    camera.lookAt(target);
  }

  // --- HUD ---
  hud.update(dt, {
    wanted: police.wanted,
    cash: save.cash,
    health: player.health,
    speed: currentCar ? currentCar.speed : 0,
    inCar: !!currentCar,
    objective: missions.objectiveText(),
    dialogue: missions.active ? missions.currentLine : '',
    pos: focus,
    heading: currentCar ? currentCar.heading : player.heading,
    trafficCars: traffic.cars,
    policeCars: police.cars,
    beaconPos: missions.beacon.visible ? missions.beacon.position : null,
    targetPos: missions.targetPos(),
  });
  renderer.render(scene, camera);
}

function runShot(name) {
  resetWorld();
  const screenName = stageShot(name, game);
  screen = screenName;
  hud.showScreen(screenName);
  // Paint twice so the frame is settled, then flag readiness.
  renderer.render(scene, camera);
  requestAnimationFrame(() => {
    renderer.render(scene, camera);
    window.__shotReady = true;
  });
}

function runGame() {
  spawnParkedCars();
  missions.start(Math.min(save.missionIndex, MISSIONS.length - 1));
  hud.showScreen('start');
  // Enter starts the game; so does a click/tap on the title screen, for
  // players who reach for the mouse before the keyboard.
  function confirmStart() {
    if (screen !== 'start' && screen !== 'over') return;
    audio.unlock();
    audio.click();
    if (screen === 'over') { player.reset(0, 30); player.group.visible = true; }
    screen = 'play';
    hud.showScreen('play');
  }
  window.addEventListener('pointerdown', confirmStart);
  let last = performance.now();
  let accumulator = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    if (input.wasPressed(ACTION.confirm)) confirmStart();
    if (input.wasPressed(ACTION.pause) && (screen === 'play' || screen === 'pause')) {
      screen = screen === 'play' ? 'pause' : 'play';
      hud.showScreen(screen === 'play' ? 'play' : 'pause');
      audio.click();
    }
    if (input.wasPressed(ACTION.mission) && screen === 'play' && !missions.active) {
      startMission(Math.min(save.missionIndex, MISSIONS.length - 1));
    }
    if (input.wasPressed(ACTION.mute)) {
      const muted = audio.toggleMute();
      hud.toast(muted ? 'Sound off (N to turn back on)' : 'Sound on');
    }
    if (screen === 'play') {
      accumulator += elapsed;
      while (accumulator >= STEP) {
        tick(STEP, false);
        accumulator -= STEP;
      }
    } else {
      // Menus still render the city behind them.
      renderer.render(scene, camera);
    }
    input.endFrame();
  }
  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

window.addEventListener('error', (event) => {
  const el = document.getElementById('error-box');
  if (el) { el.style.display = 'block'; el.textContent = `Error: ${event.message}`; }
});

if (shotName) runShot(shotName);
else runGame();
