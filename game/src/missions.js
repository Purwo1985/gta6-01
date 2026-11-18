// SOLMAR HEAT — missions: five chained jobs with a giver, a few lines of
// dialogue, a glowing beacon over the target and a cash reward. Each job
// is one clear objective — reach the marker, shake the heat, drive a
// passenger, get away, lift the van. Finishing one unlocks the next and
// the save remembers it.
import { THREE } from './three.js';
import { MISSIONS } from './config.js';

function buildBeacon(scene) {
  const assembly = new THREE.Group();
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(3, 0.25, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd21f }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 0.3;
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.6, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  shaft.position.y = 13;
  const tip = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.4, 4),
    new THREE.MeshBasicMaterial({ color: 0xffd21f }),
  );
  tip.rotation.x = Math.PI;
  tip.position.y = 5.5;
  assembly.add(halo, shaft, tip);
  assembly.visible = false;
  scene.add(assembly);
  return assembly;
}

// Where a job points, given whether its passenger is already aboard.
// The taxi is two legs: Tio Benny waits at the plaza, and only once he
// is in the car does the marker swing to the Palms Hotel.
function destinationFor(job, landmarks, aboard) {
  if (job.kind === 'goto') return landmarks.docks;
  if (job.kind === 'escape') return null;
  if (job.kind === 'taxi') return aboard ? landmarks.hotel : landmarks.plaza;
  if (job.kind === 'getaway') return landmarks.safehouse;
  if (job.kind === 'heist') return landmarks.bank;
  return landmarks.plaza;
}

export function createMissions(scene, city, save) {
  const beacon = buildBeacon(scene);
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffd21f }),
  );
  marker.visible = false;
  scene.add(marker);
  let index = Math.min(save.missionIndex, MISSIONS.length - 1);
  let active = null;
  let lineAt = 0;
  let lineClock = 0;
  let escapeClock = 0;
  let aboard = false;

  function pointMarkerAt(target) {
    beacon.position.set(target.x, 0, target.z);
    beacon.visible = true;
    marker.position.set(target.x, 1.2, target.z);
    marker.visible = true;
  }

  function hideMarker() {
    beacon.visible = false;
    marker.visible = false;
  }

  function start(i) {
    index = i;
    const def = MISSIONS[i];
    aboard = false;
    lineAt = 0;
    lineClock = 0;
    escapeClock = 0;
    const target = destinationFor(def, city.landmarks, false);
    active = { def, target, done: false };
    if (target) pointMarkerAt(target);
    else hideMarker();
    return active;
  }

  return {
    beacon,
    marker,
    get index() {
      return index;
    },
    get active() {
      return active;
    },
    get currentLine() {
      if (!active) return '';
      const script = active.def.lines;
      return script[Math.min(lineAt, script.length - 1)];
    },
    start(i = index) {
      return start(i);
    },
    // True while the taxi passenger is riding along.
    hasPassenger() {
      return aboard === true;
    },
    setPassenger(value) {
      aboard = value;
      // Boarding retargets the taxi leg: the marker swings to the hotel.
      if (value && active && active.def.kind === 'taxi') {
        const target = destinationFor(active.def, city.landmarks, true);
        active.target = target;
        pointMarkerAt(target);
      }
    },
    complete(saveRef, onEvent) {
      if (!active) return;
      const def = active.def;
      saveRef.cash += def.reward;
      if (!saveRef.completed.includes(def.id)) saveRef.completed.push(def.id);
      saveRef.missionIndex = Math.min(index + 1, MISSIONS.length - 1);
      onEvent('cash', def.reward);
      onEvent('complete', def);
      active = null;
      aboard = false;
      hideMarker();
      if (index + 1 < MISSIONS.length) {
        start(index + 1);
      }
    },
    update(dt, playerPos, wanted, inCar) {
      if (!active) return null;
      const def = active.def;
      // Dialogue lines roll on a slow timer, one at a time.
      lineClock += dt;
      if (lineClock > 4 && lineAt < def.lines.length - 1) {
        lineAt += 1;
        lineClock = 0;
      }
      beacon.rotation.y += dt * 1.5;
      marker.position.y = 1.2 + Math.sin(performance.now() * 0.003) * 0.35;
      if (def.kind === 'escape') {
        if (wanted === 0) {
          escapeClock += dt;
          if (escapeClock > 2) return { done: true };
        } else {
          escapeClock = 0;
        }
        return { dist: 0 };
      }
      if (!active.target) return null;
      const gap = Math.hypot(playerPos.x - active.target.x, playerPos.z - active.target.z);
      // The pickup only counts at the marker, in a car: the old build
      // boarded Tio Benny the moment Rico drove anywhere at all.
      if (def.kind === 'taxi' && !aboard) {
        if (gap < 6) return { need: 'pickup', dist: gap };
        return { dist: gap };
      }
      if (gap < 6) return { done: true };
      return { dist: gap };
    },
    objectiveText() {
      if (!active) return 'Free roam — press M for the next job';
      const def = active.def;
      if (def.kind === 'taxi' && !aboard) {
        return 'Pick up Tio Benny at Solmar Plaza (follow the marker)';
      }
      return def.brief;
    },
    targetPos() {
      return active && active.target ? active.target : null;
    },
  };
}
