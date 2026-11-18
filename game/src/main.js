// SOLMAR HEAT — main: boot, the fixed-step loop, the screens (start /
// play / pause / busted) and the glue between every system — stealing
// cars, crimes and wanted, jobs, combat, the camera and the HUD.
// ?seed=N rebuilds the city from another seed. ?shot=chase|walk|
// mission|start stages that scene instead of the loop, paints it and
// sets window.__shotReady so screenshots can be taken of the real game.
import { THREE } from './three.js';
import { CITY, CAR, POLICE, STEP, WORLD_SEED, MISSIONS } from './config.js';
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

const query = new URLSearchParams(window.location.search);
const shotName = query.get('shot');
const seedText = Number.parseInt(query.get('seed') ?? '', 10);
const seed = Number.isInteger(seedText) ? seedText : WORLD_SEED;

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

const PARKED_SPOTS = [
  [60, 24], [-60, -36], [120, 84], [-120, -84],
  [0, -96], [180, -24], [-180, 36], [60, 156],
];
const RAM_CAR_DAMAGE = 12;
const ENTER_CAR_RANGE = 4.5;

let screen = 'start';
let currentCar = null;
let parkedCars = [];
let camYawOffset = 0;
let camMode = 'follow';
let shotCamera = null;
let ramCooldown = 0;
let regenClock = 0;
let stagedDrive = null;
let stagedWalk = null;
let pickupHintClock = 99;

function parkFreshCars() {
  for (const old of parkedCars) old.remove();
  parkedCars = [];
  for (const [x, z] of PARKED_SPOTS) {
    const facing = rng.chance(0.5) ? 0 : Math.PI / 2;
    parkedCars.push(createCar(scene, x, z, facing, pickCarColor(rng)));
  }
}

function closestParked(maxDist) {
  let closest = null;
  let closestD = maxDist;
  for (const car of parkedCars) {
    const gap = Math.hypot(car.pos.x - player.pos.x, car.pos.z - player.pos.z);
    if (gap < closestD) {
      closestD = gap;
      closest = car;
    }
  }
  return closest;
}

function takeCar(car) {
  const slot = parkedCars.indexOf(car);
  if (slot >= 0) {
    parkedCars.splice(slot, 1);
    police.addWanted(1);
    hud.toast('You stole a car! The cops noticed. (+1 ★)');
    audio.horn();
  }
  currentCar = car;
  player.group.visible = false;
  camYawOffset = 0;
}

function leaveCar() {
  if (!currentCar) return;
  const fx = Math.sin(currentCar.heading);
  const fz = Math.cos(currentCar.heading);
  player.pos.set(currentCar.pos.x - fx * 3, 0, currentCar.pos.z - fz * 3);
  // The drop point can sit inside a building when the car hugs a wall;
  // push Rico out of it instead of trapping him in the brickwork.
  resolveCollisions(city.colliders, city.half, player.pos, 0.6);
  player.group.position.copy(player.pos);
  player.group.visible = true;
  parkedCars.push(currentCar);
  currentCar = null;
}

function reportCrime(type, arg) {
  if (type === 'assault') {
    police.addWanted(1);
    hud.toast('Assault! Wanted level up. (+1 ★)');
  } else if (type === 'siren') {
    audio.siren();
  } else if (type === 'ram') {
    if (ramCooldown > 0) return;
    ramCooldown = 0.8;
    audio.crash();
    if (damagePlayer(player, POLICE.ramDamage)) bustPlayer();
    if (currentCar) {
      currentCar.health -= RAM_CAR_DAMAGE;
      if (currentCar.health <= 0) {
        hud.toast('Your car is wrecked!');
        leaveCar();
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

function beginMission(i) {
  const job = missions.start(i);
  if (job.def.wanted) police.setWanted(job.def.wanted);
  hud.toast(`MISSION: ${job.def.title} — ${job.def.giver}`);
  audio.click();
}

function resetWorld() {
  police.clear();
  player.reset(0, 30);
  player.group.visible = true;
  currentCar = null;
  parkFreshCars();
  missions.start(Math.min(save.missionIndex, MISSIONS.length - 1));
  screen = 'play';
  hud.showScreen('play');
}

// The debug surface the screenshot stager drives: a fresh game plus a
// scripted nudge per frame, so every shot is the live game playing.
const game = {
  resetWorld,
  step(dt) {
    tick(dt, true);
  },
  debugDrive(state) {
    stagedDrive = state;
  },
  debugWalk(state) {
    stagedWalk = state;
  },
  debugPlaceCar(x, z, heading) {
    takeCar(createCar(scene, x, z, heading, 0xd83a2e));
  },
  debugPlacePlayer(x, z) {
    player.reset(x, z);
    player.camYaw = Math.PI * 0.9;
  },
  debugGatherPeds(x, z, count) {
    for (let i = 0; i < Math.min(count, traffic.peds.length); i += 1) {
      const ped = traffic.peds[i];
      const angle = (i / count) * Math.PI * 2;
      ped.pos.set(x + Math.sin(angle) * 7, 0, z + Math.cos(angle) * 7);
    }
  },
  debugSetWanted(n) {
    police.setWanted(n);
  },
  debugSpawnPolice(n) {
    // Patrol cars appear ahead of Rico, lights on, closing in — so a
    // chase reads in a single frame.
    const focus = currentCar ? currentCar.pos : player.pos;
    const heading = currentCar ? currentCar.heading : 0;
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    for (let i = 0; i < n; i += 1) {
      const side = i % 2 === 0 ? -1 : 1;
      const ahead = 26 + i * 9;
      const patrol = createCar(
        scene,
        focus.x + fx * ahead + fz * side * 7,
        focus.z + fz * ahead - fx * side * 7,
        heading + Math.PI,
        0x1a1a22,
        true,
      );
      police.cars.push(patrol);
    }
  },
  debugStartMission(i) {
    beginMission(i);
  },
  debugCamera(mode) {
    camMode = mode;
    shotCamera = mode === 'aerial'
      ? { pos: new THREE.Vector3(150, 110, 150), look: new THREE.Vector3(0, 0, 0) }
      : null;
  },
};

function driveStep(dt) {
  const staged = stagedDrive;
  const forward = staged ? staged.forward : input.isDown(ACTION.forward);
  const reverse = staged ? !!staged.reverse : input.isDown(ACTION.back);
  const left = staged ? false : input.isDown(ACTION.left);
  const right = staged ? false : input.isDown(ACTION.right);
  const steer = (staged ? staged.steer : 0) + (left ? -1 : 0) + (right ? 1 : 0);
  const throttle = forward ? 1 : reverse ? -1 : 0;
  const speed = currentCar.update(dt, throttle, steer, city.colliders, city.half);
  audio.setEngine(Math.abs(speed) / CAR.maxSpeed, true);
  if (!staged && input.wasPressed(ACTION.horn)) audio.horn();
  if (!staged && input.wasPressed(ACTION.enterCar)) leaveCar();
  // Shove traffic cars aside; running a pedestrian down is a crime.
  for (const other of traffic.cars) currentCar.pushFrom(other, 3);
  const victim = traffic.nearestPed(currentCar.pos.x, currentCar.pos.z, 2.2);
  if (victim && Math.abs(currentCar.speed) > 4) {
    traffic.removePed(victim);
    police.addWanted(1);
    audio.crash();
    hud.toast('You hit a pedestrian! (+1 ★)');
  }
}

function footStep(dt) {
  const staged = stagedWalk;
  const fake = staged
    ? {
      isDown: (code) => code === 'KeyW' && staged.forward,
      wasPressed: () => false,
      consumeDrag: () => ({ x: 0, y: 0 }),
    }
    : input;
  player.update(dt, fake, city.colliders, city.half);
  audio.setEngine(0, false);
  if (!staged && input.wasPressed(ACTION.punch)) {
    resolvePunch(player, traffic, police, audio, reportCrime, city);
  }
  if (!staged && input.wasPressed(ACTION.enterCar)) {
    const car = closestParked(ENTER_CAR_RANGE);
    if (car) takeCar(car);
    else hud.toast('No car close by — find a parked car (E)');
  }
}

function worldStep(dt) {
  const threat = currentCar ? currentCar.pos : player.pos;
  traffic.update(dt, threat);
  const focus = currentCar ? currentCar.pos : player.pos;
  police.update(dt, focus, !!currentCar, reportCrime);
  const jobState = missions.update(dt, focus, police.wanted, !!currentCar);
  if (jobState && jobState.done) {
    const finished = missions.active.def;
    missions.complete(save, (kind, value) => {
      if (kind === 'cash') {
        audio.cash();
        hud.toast(`Mission complete: ${finished.title}  +$${value}`);
      }
    });
    storeSave(save);
    // complete() already starts the next job; nothing more to do here.
    if (!missions.active) hud.toast('All missions done — Solmar is yours, Rico!');
  } else if (jobState && jobState.need === 'pickup' && currentCar) {
    missions.setPassenger(true);
    hud.toast('Tio Benny is in! Drive him to the Palms Hotel.');
  } else if (jobState && jobState.need === 'pickup' && !currentCar && pickupHintClock > 4) {
    // On foot at the plaza: say what is missing, throttled so it does
    // not spam every tick while Rico stands at the marker.
    pickupHintClock = 0;
    hud.toast('Tio Benny needs a car — steal one and come back (E)');
  }
  // Slow health regen while the heat is off.
  if (police.wanted === 0 && player.health < 100) {
    regenClock += dt;
    if (regenClock > 1) {
      player.health = Math.min(100, player.health + 2);
      regenClock = 0;
    }
  }
  pickupHintClock += dt;
}

function cameraStep() {
  if (camMode === 'aerial' && shotCamera) {
    camera.position.copy(shotCamera.pos);
    camera.lookAt(shotCamera.look);
    return;
  }
  if (currentCar) {
    const drag = input.consumeDrag();
    camYawOffset -= drag.x * 0.004;
    camYawOffset = Math.max(-1.2, Math.min(1.2, camYawOffset));
    const yaw = currentCar.heading + Math.PI + camYawOffset;
    const distance = 9.5;
    camera.position.set(
      currentCar.pos.x + Math.sin(yaw) * distance,
      4.6,
      currentCar.pos.z + Math.cos(yaw) * distance,
    );
    camera.lookAt(currentCar.pos.x, 1.6, currentCar.pos.z);
    return;
  }
  const target = player.cameraTarget();
  const offset = player.cameraOffset();
  camera.position.set(target.x + offset.x, target.y + offset.y, target.z + offset.z);
  camera.lookAt(target);
}

function hudStep(dt) {
  hud.update(dt, {
    wanted: police.wanted,
    cash: save.cash,
    health: player.health,
    speed: currentCar ? currentCar.speed : 0,
    inCar: !!currentCar,
    objective: missions.objectiveText(),
    dialogue: missions.active ? missions.currentLine : '',
    pos: currentCar ? currentCar.pos : player.pos,
    heading: currentCar ? currentCar.heading : player.heading,
    trafficCars: traffic.cars,
    policeCars: police.cars,
    beaconPos: missions.beacon.visible ? missions.beacon.position : null,
    targetPos: missions.targetPos(),
  });
}

function tick(dt, isShotStep) {
  ramCooldown = Math.max(0, ramCooldown - dt);
  // Input-driven motion runs in live play, and in staged steps only
  // while a debug nudge is queued for this frame.
  if (!isShotStep || stagedDrive || stagedWalk) {
    if (currentCar) driveStep(dt);
    else footStep(dt);
    stagedDrive = null;
    stagedWalk = null;
  }
  worldStep(dt);
  cameraStep();
  hudStep(dt);
  renderer.render(scene, camera);
}

function runShot(name) {
  resetWorld();
  const shown = stageShot(name, game);
  screen = shown;
  hud.showScreen(shown);
  // Paint twice so the frame is settled, then flag readiness.
  renderer.render(scene, camera);
  requestAnimationFrame(() => {
    renderer.render(scene, camera);
    window.__shotReady = true;
  });
}

function runGame() {
  parkFreshCars();
  missions.start(Math.min(save.missionIndex, MISSIONS.length - 1));
  hud.showScreen('start');
  // Enter starts the game; so does a click or tap on the title screen,
  // for players who reach for the mouse before the keyboard.
  function confirmStart() {
    if (screen !== 'start' && screen !== 'over') return;
    audio.unlock();
    audio.click();
    if (screen === 'over') {
      player.reset(0, 30);
      player.group.visible = true;
    }
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
      beginMission(Math.min(save.missionIndex, MISSIONS.length - 1));
    }
    if (input.wasPressed(ACTION.mute)) {
      const silenced = audio.toggleMute();
      hud.toast(silenced ? 'Sound off (N to turn back on)' : 'Sound on');
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
  const box = document.getElementById('error-box');
  if (box) {
    box.style.display = 'block';
    box.textContent = `Error: ${event.message}`;
  }
});

if (shotName) runShot(shotName);
else runGame();
