// SOLMAR HEAT — traffic: cars that loop the road grid and pedestrians who
// stroll the sidewalks, cross at corners and scatter when a car barrels in.
// Both are cheap state machines; the city reads alive because they never stop.
import { THREE } from './three.js';
import { TRAFFIC } from './config.js';
import { createCar, pickCarColor } from './vehicles.js';

const PED_COLORS = [0xe86a5a, 0x5a8fe8, 0x8fe85a, 0xe8d25a, 0xffffff, 0x8a5ad8, 0x333333];

function nearestRoadLine(lines, v) {
  let best = lines[0];
  for (const l of lines) if (Math.abs(l - v) < Math.abs(best - v)) best = l;
  return best;
}

export function createTraffic(scene, rng, city) {
  const cars = [];
  const peds = [];
  const { roadLines, half } = city;

  for (let i = 0; i < TRAFFIC.carCount; i += 1) {
    const along = rng.chance(0.5);
    const line = roadLines[rng.int(0, roadLines.length - 1)];
    const t = rng.range(-half + 10, half - 10);
    const heading = along ? (rng.chance(0.5) ? 0 : Math.PI) : (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2);
    const car = createCar(scene, along ? line : t, along ? t : line, heading, pickCarColor(rng));
    car.speed = TRAFFIC.carSpeed * rng.range(0.7, 1.15);
    car.lane = line;
    car.along = along;
    cars.push(car);
  }

  const pedGroup = new THREE.Group();
  scene.add(pedGroup);
  for (let i = 0; i < TRAFFIC.pedCount; i += 1) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.85, 0.35),
      new THREE.MeshLambertMaterial({ color: PED_COLORS[rng.int(0, PED_COLORS.length - 1)] }),
    );
    body.position.y = 1.0;
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.36, 0.36),
      new THREE.MeshLambertMaterial({ color: 0xc98d64 }),
    );
    head.position.y = 1.65;
    const legs = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.55, 0.3),
      new THREE.MeshLambertMaterial({ color: 0x2b3a55 }),
    );
    legs.position.y = 0.28;
    g.add(body, head, legs);
    pedGroup.add(g);
    peds.push({
      group: g,
      pos: new THREE.Vector3(rng.range(-half, half), 0, rng.range(-half, half)),
      heading: rng.range(0, Math.PI * 2),
      speed: TRAFFIC.pedSpeed * rng.range(0.7, 1.3),
      panic: 0,
      retarget: rng.range(2, 8),
    });
  }

  function updateCar(car, dt) {
    // Drive straight along its road; at an intersection, sometimes turn.
    const fx = Math.sin(car.heading);
    const fz = Math.cos(car.heading);
    car.pos.x += fx * car.speed * dt;
    car.pos.z += fz * car.speed * dt;
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.heading;
    const nearIntersection = car.along
      ? Math.abs(nearestRoadLine(roadLines, car.pos.z) - car.pos.z) < 3
      : Math.abs(nearestRoadLine(roadLines, car.pos.x) - car.pos.x) < 3;
    if (nearIntersection && rng.chance(dt * TRAFFIC.turnChance)) {
      const turn = rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
      car.heading += turn;
      car.along = !car.along;
      // Snap onto the centre of the road just turned onto, so traffic
      // stays in its lane instead of drifting across the sidewalk.
      if (car.along) car.pos.x = nearestRoadLine(roadLines, car.pos.x);
      else car.pos.z = nearestRoadLine(roadLines, car.pos.z);
    }
    // Wrap around the far edge so traffic never runs out.
    if (car.pos.x > half + 30) car.pos.x = -half - 30;
    if (car.pos.x < -half - 30) car.pos.x = half + 30;
    if (car.pos.z > half + 60) car.pos.z = -half - 30;
    if (car.pos.z < -half - 30) car.pos.z = half + 60;
  }

  return {
    cars,
    peds,
    update(dt, threatPos) {
      for (const car of cars) updateCar(car, dt);
      for (const ped of peds) {
        ped.retarget -= dt;
        if (ped.retarget <= 0) {
          ped.heading = rng.range(0, Math.PI * 2);
          ped.retarget = rng.range(3, 9);
        }
        // Flee a nearby fast threat (the player's car, a police ram).
        if (threatPos) {
          const d = Math.hypot(ped.pos.x - threatPos.x, ped.pos.z - threatPos.z);
          if (d < 9) {
            ped.panic = 2;
            ped.heading = Math.atan2(ped.pos.x - threatPos.x, ped.pos.z - threatPos.z);
          }
        }
        ped.panic = Math.max(0, ped.panic - dt);
        const sp = ped.panic > 0 ? ped.speed * 3.2 : ped.speed;
        ped.pos.x += Math.sin(ped.heading) * sp * dt;
        ped.pos.z += Math.cos(ped.heading) * sp * dt;
        ped.pos.x = Math.max(-half - 10, Math.min(half + 10, ped.pos.x));
        ped.pos.z = Math.max(-half - 10, Math.min(half + 40, ped.pos.z));
        ped.group.position.copy(ped.pos);
        ped.group.rotation.y = ped.heading;
      }
    },
    // Nearest pedestrian within `range` of a point, for the punch.
    nearestPed(x, z, range) {
      let best = null;
      let bestD = range;
      for (const ped of peds) {
        const d = Math.hypot(ped.pos.x - x, ped.pos.z - z);
        if (d < bestD) { bestD = d; best = ped; }
      }
      return best;
    },
    removePed(ped) {
      const i = peds.indexOf(ped);
      if (i >= 0) {
        pedGroup.remove(ped.group);
        peds.splice(i, 1);
      }
    },
  };
}
