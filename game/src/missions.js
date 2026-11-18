// SOLMAR HEAT — missions: five chained jobs with a giver, dialogue lines, a
// glowing beacon at the target and a cash reward. Each kind is one clear
// objective: reach the marker, escape the heat, drive a passenger, get away,
// or lift the cash van. Finishing one unlocks the next and saves progress.
import { THREE } from './three.js';
import { MISSIONS } from './config.js';

function makeBeacon(scene) {
  const group = new THREE.Group();
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(3, 0.25, 8, 32),
    new THREE.MeshBasicMaterial({ color: 0xffd21f }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.3;
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(1.1, 1.6, 26, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.35, side: THREE.DoubleSide }),
  );
  beam.position.y = 13;
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.4, 4),
    new THREE.MeshBasicMaterial({ color: 0xffd21f }),
  );
  arrow.rotation.x = Math.PI;
  arrow.position.y = 5.5;
  group.add(ring, beam, arrow);
  group.visible = false;
  scene.add(group);
  return group;
}

export function createMissions(scene, city, save) {
  const beacon = makeBeacon(scene);
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(1.4, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffd21f }),
  );
  marker.visible = false;
  scene.add(marker);
  let index = Math.min(save.missionIndex, MISSIONS.length - 1);
  let active = null;
  let lineIndex = 0;
  let lineTimer = 0;
  let escapeTimer = 0;
  let passenger = null;

  function targetFor(m, hasPassenger) {
    const L = city.landmarks;
    if (m.kind === 'goto') return L.docks;
    if (m.kind === 'escape') return null;
    // Taxi is two legs: Tio Benny waits at the plaza, and only once he is
    // in the car does the marker point at the Palms Hotel. (Before this fix
    // the marker pointed at the hotel from the start while the pickup fired
    // anywhere, so the job completed without ever going to Tio.)
    if (m.kind === 'taxi') return hasPassenger ? L.hotel : L.plaza;
    if (m.kind === 'getaway') return L.safehouse;
    if (m.kind === 'heist') return L.bank;
    return L.plaza;
  }

  function moveMarkerTo(target) {
    beacon.position.set(target.x, 0, target.z);
    beacon.visible = true;
    marker.position.set(target.x, 1.2, target.z);
    marker.visible = true;
  }

  function start(i) {
    index = i;
    const m = MISSIONS[i];
    passenger = false;
    const target = targetFor(m, false);
    active = { def: m, target, done: false };
    lineIndex = 0;
    lineTimer = 0;
    escapeTimer = 0;
    if (target) moveMarkerTo(target);
    else {
      beacon.visible = false;
      marker.visible = false;
    }
    return active;
  }

  return {
    beacon,
    marker,
    get index() { return index; },
    get active() { return active; },
    get currentLine() {
      if (!active) return '';
      return active.def.lines[Math.min(lineIndex, active.def.lines.length - 1)];
    },
    start(i = index) { return start(i); },
    // True when the player currently has a passenger to deliver.
    hasPassenger() { return passenger === true; },
    setPassenger(v) {
      passenger = v;
      // Boarding retargets the taxi leg: the marker swings to the hotel.
      if (v && active && active.def.kind === 'taxi') {
        const target = targetFor(active.def, true);
        active.target = target;
        moveMarkerTo(target);
      }
    },
    complete(saveRef, onEvent) {
      if (!active) return;
      const m = active.def;
      saveRef.cash += m.reward;
      if (!saveRef.completed.includes(m.id)) saveRef.completed.push(m.id);
      saveRef.missionIndex = Math.min(index + 1, MISSIONS.length - 1);
      onEvent('cash', m.reward);
      onEvent('complete', m);
      active = null;
      beacon.visible = false;
      marker.visible = false;
      passenger = false;
      if (saveRef.missionIndex < MISSIONS.length && index + 1 < MISSIONS.length) {
        start(index + 1);
      }
    },
    update(dt, playerPos, wanted, inCar) {
      if (!active) return null;
      const m = active.def;
      // Dialogue lines advance on a timer.
      lineTimer += dt;
      if (lineTimer > 4 && lineIndex < m.lines.length - 1) {
        lineIndex += 1;
        lineTimer = 0;
      }
      beacon.rotation.y += dt * 1.5;
      marker.position.y = 1.2 + Math.sin(performance.now() * 0.003) * 0.35;
      if (m.kind === 'goto' || m.kind === 'taxi' || m.kind === 'getaway' || m.kind === 'heist') {
        if (!active.target) return null;
        const d = Math.hypot(playerPos.x - active.target.x, playerPos.z - active.target.z);
        // The pickup only counts at the marker, in a car: before this fix
        // any car anywhere boarded Tio Benny the moment the player drove.
        if (m.kind === 'taxi' && !passenger) {
          if (d < 6) return { need: 'pickup', dist: d };
          return { dist: d };
        }
        if (d < 6) return { done: true };
        return { dist: d };
      }
      if (m.kind === 'escape') {
        if (wanted === 0) {
          escapeTimer += dt;
          if (escapeTimer > 2) return { done: true };
        } else {
          escapeTimer = 0;
        }
        return { dist: 0 };
      }
      return null;
    },
    objectiveText() {
      if (!active) return 'Free roam — press M for the next job';
      const m = active.def;
      if (m.kind === 'taxi' && !passenger) return 'Pick up Tio Benny at Solmar Plaza (follow the marker)';
      return m.brief;
    },
    targetPos() { return active && active.target ? active.target : null; },
  };
}
