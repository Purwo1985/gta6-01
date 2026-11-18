// SOLMAR HEAT — police: the wanted system. Stars rise with crimes, police
// cars spawn at the city edge and chase, ram and try to bust the player.
// Out of sight long enough and the heat fades; busted means game over.
import { THREE } from './three.js';
import { POLICE } from './config.js';
import { createCar } from './vehicles.js';

export function createPolice(scene, rng, city) {
  const cars = [];
  let wanted = 0;
  let decayTimer = 0;
  let sirenTimer = 0;
  let spawnTimer = 0;

  function desiredCount() {
    return Math.min(POLICE.maxCars, Math.ceil(wanted / 1.2));
  }

  function spawnOne(near) {
    const angle = rng.range(0, Math.PI * 2);
    const x = near.x + Math.sin(angle) * 55;
    const z = near.z + Math.cos(angle) * 55;
    const heading = Math.atan2(near.x - x, near.z - z);
    const car = createCar(scene, x, z, heading, 0x1a1a22, true);
    cars.push(car);
    return car;
  }

  return {
    cars,
    get wanted() { return wanted; },
    addWanted(n) {
      wanted = Math.max(0, Math.min(5, wanted + n));
      decayTimer = 0;
    },
    setWanted(n) { wanted = Math.max(0, Math.min(5, n)); decayTimer = 0; },
    clear() {
      wanted = 0;
      for (const c of cars) c.remove();
      cars.length = 0;
    },
    update(dt, playerPos, inCar, onCrime) {
      // Spawn up to the wanted level, staggered so the chase builds.
      spawnTimer -= dt;
      if (wanted > 0 && cars.length < desiredCount() && spawnTimer <= 0) {
        spawnOne(playerPos);
        spawnTimer = 2.2;
      }
      // Siren wail every few seconds while wanted.
      sirenTimer -= dt;
      if (wanted > 0 && sirenTimer <= 0) {
        sirenTimer = 2.6;
        onCrime('siren');
      }
      // Chase: steer toward the player, ram on contact.
      let nearest = Infinity;
      for (const car of cars) {
        const dx = playerPos.x - car.pos.x;
        const dz = playerPos.z - car.pos.z;
        const dist = Math.hypot(dx, dz);
        nearest = Math.min(nearest, dist);
        const wantHeading = Math.atan2(dx, dz);
        let diff = wantHeading - car.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        car.steer = Math.max(-1, Math.min(1, diff * 1.4));
        car.speed = Math.min(car.speed + 18 * dt, POLICE.chaseSpeed);
        car.heading += car.steer * 1.9 * dt * Math.min(1, Math.abs(car.speed) / 6);
        car.pos.x += Math.sin(car.heading) * car.speed * dt;
        car.pos.z += Math.cos(car.heading) * car.speed * dt;
        car.group.position.copy(car.pos);
        car.group.rotation.y = car.heading;
        if (dist < 3.4) {
          onCrime('ram', car);
        }
      }
      // Wanted decays only when no police car is close.
      if (wanted > 0) {
        if (nearest > 45) {
          decayTimer += dt;
          if (decayTimer > POLICE.decaySeconds) {
            wanted -= 1;
            decayTimer = 0;
          }
        } else {
          decayTimer = 0;
        }
      }
      // Drop police cars that fell far behind when the heat is gone.
      if (wanted === 0 && cars.length > 0) {
        for (const c of cars) c.remove();
        cars.length = 0;
      }
      return { nearestPolice: nearest };
    },
    nearestCar(playerPos) {
      let best = null;
      let bestD = Infinity;
      for (const car of cars) {
        const d = Math.hypot(car.pos.x - playerPos.x, car.pos.z - playerPos.z);
        if (d < bestD) { bestD = d; best = car; }
      }
      return { car: best, dist: bestD };
    },
  };
}
