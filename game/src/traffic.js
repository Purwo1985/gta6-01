// SOLMAR HEAT — traffic: the cars that work the road grid and the
// pedestrians who stroll the sidewalks, cross at corners and scatter
// when something fast bears down on them. Both are small state machines
// that never stop, which is most of why the city reads as alive.
import { THREE } from './three.js';
import { TRAFFIC } from './config.js';
import { createCar, pickCarColor } from './vehicles.js';

const SHIRT_COLORS = [0xe86a5a, 0x5a8fe8, 0x8fe85a, 0xe8d25a, 0xffffff, 0x8a5ad8, 0x333333];

function closestLine(lines, value) {
  let nearest = lines[0];
  for (const line of lines) {
    if (Math.abs(line - value) < Math.abs(nearest - value)) nearest = line;
  }
  return nearest;
}

function spawnGridCar(scene, rng, roadLines, half) {
  const northSouth = rng.chance(0.5);
  const lane = roadLines[rng.int(0, roadLines.length - 1)];
  const along = rng.range(-half + 10, half - 10);
  const face = northSouth
    ? (rng.chance(0.5) ? 0 : Math.PI)
    : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
  const car = createCar(scene, northSouth ? lane : along, northSouth ? along : lane, face, pickCarColor(rng));
  car.speed = TRAFFIC.carSpeed * rng.range(0.7, 1.15);
  car.lane = lane;
  car.along = northSouth;
  return car;
}

function buildPedestrian(scene, rng, half) {
  const figure = new THREE.Group();
  const torso = new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.85, 0.35),
    new THREE.MeshLambertMaterial({ color: SHIRT_COLORS[rng.int(0, SHIRT_COLORS.length - 1)] }),
  );
  torso.position.y = 1.0;
  const skull = new THREE.Mesh(
    new THREE.BoxGeometry(0.36, 0.36, 0.36),
    new THREE.MeshLambertMaterial({ color: 0xc98d64 }),
  );
  skull.position.y = 1.65;
  const shins = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.55, 0.3),
    new THREE.MeshLambertMaterial({ color: 0x2b3a55 }),
  );
  shins.position.y = 0.28;
  figure.add(torso, skull, shins);
  scene.add(figure);
  return {
    group: figure,
    pos: new THREE.Vector3(rng.range(-half, half), 0, rng.range(-half, half)),
    heading: rng.range(0, Math.PI * 2),
    speed: TRAFFIC.pedSpeed * rng.range(0.7, 1.3),
    panic: 0,
    retarget: rng.range(2, 8),
  };
}

export function createTraffic(scene, rng, city) {
  const cars = [];
  const peds = [];
  const { roadLines, half } = city;

  for (let i = 0; i < TRAFFIC.carCount; i += 1) {
    cars.push(spawnGridCar(scene, rng, roadLines, half));
  }

  for (let i = 0; i < TRAFFIC.pedCount; i += 1) {
    peds.push(buildPedestrian(scene, rng, half));
  }

  function driveCar(car, dt) {
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.heading;
    // At an intersection, sometimes turn onto the crossing road.
    const crossing = car.along
      ? Math.abs(closestLine(roadLines, car.pos.z) - car.pos.z) < 3
      : Math.abs(closestLine(roadLines, car.pos.x) - car.pos.x) < 3;
    if (crossing && rng.chance(dt * TRAFFIC.turnChance)) {
      car.heading += rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
      car.along = !car.along;
      // Land on the centre of the new road, so the car holds its lane
      // instead of wandering across the sidewalk after the turn.
      if (car.along) car.pos.x = closestLine(roadLines, car.pos.x);
      else car.pos.z = closestLine(roadLines, car.pos.z);
    }
    // Wrap past the far edge so the streets never run dry.
    if (car.pos.x > half + 30) car.pos.x = -half - 30;
    if (car.pos.x < -half - 30) car.pos.x = half + 30;
    if (car.pos.z > half + 60) car.pos.z = -half - 30;
    if (car.pos.z < -half - 30) car.pos.z = half + 60;
  }

  function strollPed(ped, dt, threatPos) {
    ped.retarget -= dt;
    if (ped.retarget <= 0) {
      ped.heading = rng.range(0, Math.PI * 2);
      ped.retarget = rng.range(3, 9);
    }
    // A fast threat nearby sends the pedestrian running the other way.
    if (threatPos) {
      const gap = Math.hypot(ped.pos.x - threatPos.x, ped.pos.z - threatPos.z);
      if (gap < 9) {
        ped.panic = 2;
        ped.heading = Math.atan2(ped.pos.x - threatPos.x, ped.pos.z - threatPos.z);
      }
    }
    ped.panic = Math.max(0, ped.panic - dt);
    const pace = ped.panic > 0 ? ped.speed * 3.2 : ped.speed;
    ped.pos.x += Math.sin(ped.heading) * pace * dt;
    ped.pos.z += Math.cos(ped.heading) * pace * dt;
    ped.pos.x = Math.max(-half - 10, Math.min(half + 10, ped.pos.x));
    ped.pos.z = Math.max(-half - 10, Math.min(half + 40, ped.pos.z));
    ped.group.position.copy(ped.pos);
    ped.group.rotation.y = ped.heading;
  }

  return {
    cars,
    peds,
    update(dt, threatPos) {
      for (const car of cars) driveCar(car, dt);
      for (const ped of peds) strollPed(ped, dt, threatPos);
    },
    // The closest pedestrian within `range` of a point, for the punch.
    nearestPed(x, z, range) {
      let closest = null;
      let closestD = range;
      for (const ped of peds) {
        const gap = Math.hypot(ped.pos.x - x, ped.pos.z - z);
        if (gap < closestD) {
          closestD = gap;
          closest = ped;
        }
      }
      return closest;
    },
    removePed(ped) {
      const slot = peds.indexOf(ped);
      if (slot < 0) return;
      const owner = peds[slot].group.parent;
      if (owner) owner.remove(ped.group);
      peds.splice(slot, 1);
    },
  };
}
