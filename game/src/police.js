// SOLMAR HEAT — police: the wanted system. Crimes raise stars, patrol
// cars spawn out on the roads and chase, ram and try to bust Rico. Stay
// out of sight long enough and the heat fades one star at a time; get
// caught with no health left and the run ends on the BUSTED screen.
import { THREE } from './three.js';
import { POLICE } from './config.js';
import { resolveCollisions } from './city.js';
import { createCar } from './vehicles.js';

function closestLine(lines, value) {
  let nearest = lines[0];
  for (const line of lines) {
    if (Math.abs(line - value) < Math.abs(nearest - value)) nearest = line;
  }
  return nearest;
}

// Wrap an angle into (-PI, PI] so steering always takes the short way.
function wrapAngle(angle) {
  let wrapped = angle;
  while (wrapped > Math.PI) wrapped -= Math.PI * 2;
  while (wrapped < -Math.PI) wrapped += Math.PI * 2;
  return wrapped;
}

export function createPolice(scene, rng, city) {
  const cars = [];
  let wanted = 0;
  let coolTimer = 0;
  let wailTimer = 0;
  let spawnTimer = 0;

  function patrolsWanted() {
    return Math.min(POLICE.maxCars, Math.ceil(wanted / 1.2));
  }

  function launchOne(near) {
    // Spawn on a road, never inside a building: take a point at spawn
    // distance, snap its nearer axis onto a road line, then push whatever
    // is left out of any wall it still overlaps.
    const bearing = rng.range(0, Math.PI * 2);
    let x = near.x + Math.sin(bearing) * POLICE.spawnDistance;
    let z = near.z + Math.cos(bearing) * POLICE.spawnDistance;
    const snapX = Math.abs(closestLine(city.roadLines, x) - x);
    const snapZ = Math.abs(closestLine(city.roadLines, z) - z);
    if (snapX <= snapZ) x = closestLine(city.roadLines, x);
    else z = closestLine(city.roadLines, z);
    const spot = new THREE.Vector3(x, 0, z);
    resolveCollisions(city.colliders, city.half, spot, 2);
    const heading = Math.atan2(near.x - spot.x, near.z - spot.z);
    const patrol = createCar(scene, spot.x, spot.z, heading, 0x1a1a22, true);
    cars.push(patrol);
    return patrol;
  }

  function chaseCar(car, dt, target) {
    const dx = target.x - car.pos.x;
    const dz = target.z - car.pos.z;
    const gap = Math.hypot(dx, dz);
    const aim = Math.atan2(dx, dz);
    const error = wrapAngle(aim - car.heading);
    car.steer = Math.max(-1, Math.min(1, error * 1.4));
    car.speed = Math.min(car.speed + 18 * dt, POLICE.chaseSpeed);
    car.heading += car.steer * 1.9 * dt * Math.min(1, Math.abs(car.speed) / 6);
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    resolveCollisions(city.colliders, city.half, car.pos, 1.6);
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.heading;
    return gap;
  }

  return {
    cars,
    get wanted() {
      return wanted;
    },
    addWanted(n) {
      wanted = Math.max(0, Math.min(5, wanted + n));
      coolTimer = 0;
    },
    setWanted(n) {
      wanted = Math.max(0, Math.min(5, n));
      coolTimer = 0;
    },
    clear() {
      wanted = 0;
      for (const car of cars) car.remove();
      cars.length = 0;
    },
    update(dt, playerPos, inCar, onCrime) {
      // Stagger the spawns so the chase builds instead of arriving at once.
      spawnTimer -= dt;
      if (wanted > 0 && cars.length < patrolsWanted() && spawnTimer <= 0) {
        launchOne(playerPos);
        spawnTimer = 2.2;
      }
      // A siren wail every few seconds while the heat is on.
      wailTimer -= dt;
      if (wanted > 0 && wailTimer <= 0) {
        wailTimer = 2.6;
        onCrime('siren');
      }
      const flashingRed = Math.floor(performance.now() / 280) % 2 === 0;
      let nearest = Infinity;
      for (const car of cars) {
        const gap = chaseCar(car, dt, playerPos);
        nearest = Math.min(nearest, gap);
        if (car.lightBar) {
          car.lightBar.material.color.setHex(flashingRed ? 0xff2222 : 0x2244ff);
        }
        if (gap < 3.4) onCrime('ram', car);
      }
      // Stars fade only while no patrol car is anywhere near.
      if (wanted > 0) {
        if (nearest > 45) {
          coolTimer += dt;
          if (coolTimer > POLICE.decaySeconds) {
            wanted -= 1;
            coolTimer = 0;
          }
        } else {
          coolTimer = 0;
        }
      }
      // Heat gone: the patrol cars peel off and disappear.
      if (wanted === 0 && cars.length > 0) {
        for (const car of cars) car.remove();
        cars.length = 0;
      }
      return { nearestPolice: nearest };
    },
    nearestCar(playerPos) {
      let closest = null;
      let closestD = Infinity;
      for (const car of cars) {
        const gap = Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z);
        if (gap < closestD) {
          closestD = gap;
          closest = car;
        }
      }
      return { car: closest, dist: closestD };
    },
  };
}
