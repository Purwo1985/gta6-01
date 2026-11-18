// SOLMAR HEAT — vehicles: arcade driving plus the car meshes. Parked
// cars wait to be stolen with E, traffic cars work the grid, police cars
// chase. One builder assembles every car in the fleet, so a paint job,
// a light bar or a wheel is never a special case.
import { THREE } from './three.js';
import { CAR } from './config.js';
import { resolveCollisions } from './city.js';

const PAINT_JOBS = [0xd83a2e, 0x2e6fd8, 0xf2c14e, 0xeeeeee, 0x222226, 0x2fa36b, 0xd86bb0, 0x7a4fd8];

const WHEEL_SPOTS = [
  [-0.95, 1.4],
  [0.95, 1.4],
  [-0.95, -1.4],
  [0.95, -1.4],
];

function lambert(color) {
  return new THREE.MeshLambertMaterial({ color });
}

function basic(color) {
  return new THREE.MeshBasicMaterial({ color });
}

export function buildCarMesh(color, isPolice = false) {
  const group = new THREE.Group();
  const coat = lambert(isPolice ? 0x1a1a22 : color);
  const hull = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, 4.4), coat);
  hull.position.y = 0.65;
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.65, 2.2), lambert(0x1c2733));
  cabin.position.set(0, 1.3, -0.2);
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.22, 0.3), lambert(0x111114));
  bumperF.position.set(0, 0.42, 2.2);
  const bumperR = new THREE.Mesh(new THREE.BoxGeometry(2.04, 0.22, 0.3), lambert(0x111114));
  bumperR.position.set(0, 0.42, -2.2);
  const lampF = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.1), basic(0xfff2b0));
  lampF.position.set(0, 0.72, 2.22);
  const lampR = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.18, 0.1), basic(0xd42020));
  lampR.position.set(0, 0.72, -2.22);
  group.add(hull, cabin, bumperF, bumperR, lampF, lampR);

  // The bar is handed back so the police chase can flash it red and blue.
  let lightBar = null;
  if (isPolice) {
    lightBar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.22, 0.5), basic(0xff2222));
    lightBar.position.set(0, 1.72, -0.2);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.02, 0.3, 4.42), basic(0xffffff));
    stripe.position.y = 0.62;
    group.add(lightBar, stripe);
  }

  const tyreGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const tyreMat = lambert(0x111111);
  const wheels = [];
  for (const [wx, wz] of WHEEL_SPOTS) {
    const wheel = new THREE.Mesh(tyreGeo, tyreMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
    wheels.push(wheel);
  }
  return { group, wheels, lightBar };
}

export function createCar(scene, x, z, heading, color, isPolice = false) {
  const { group, wheels, lightBar } = buildCarMesh(color, isPolice);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  scene.add(group);
  const car = {
    group,
    wheels,
    lightBar,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    steer: 0,
    health: CAR.maxHealth,
    isPolice,
    color,
    update(dt, throttle, steerInput, colliders, half) {
      const wantedSteer = steerInput * 0.55;
      this.steer += (wantedSteer - this.steer) * Math.min(1, dt * 8);
      if (throttle > 0) {
        this.speed += CAR.accel * throttle * dt;
      } else if (throttle < 0 && this.speed > 0.5) {
        this.speed -= CAR.brake * dt;
      } else if (throttle < 0) {
        this.speed += CAR.reverseAccel * throttle * dt;
      } else {
        this.speed -= this.speed * CAR.drag * dt;
        if (Math.abs(this.speed) < 0.05) this.speed = 0;
      }
      this.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, this.speed));
      const pace = Math.min(1, Math.abs(this.speed) / 6);
      const direction = Math.sign(this.speed || 1);
      this.heading += this.steer * CAR.turnRate * dt * pace * direction;
      this.pos.x += Math.sin(this.heading) * this.speed * dt;
      this.pos.z += Math.cos(this.heading) * this.speed * dt;
      resolveCollisions(colliders, half, this.pos, 1.6);
      group.position.copy(this.pos);
      group.rotation.y = this.heading;
      const roll = (this.speed * dt) / 0.42;
      for (const wheel of wheels) wheel.rotation.x += roll;
      return Math.abs(this.speed);
    },
    // Shove two cars apart by their circles; traffic and police rams
    // both lean on this instead of clipping through each other.
    pushFrom(other, radius = 2.6) {
      const dx = this.pos.x - other.pos.x;
      const dz = this.pos.z - other.pos.z;
      const gap = Math.hypot(dx, dz);
      if (gap <= 0.01 || gap >= radius) return;
      this.pos.x = other.pos.x + (dx / gap) * radius;
      this.pos.z = other.pos.z + (dz / gap) * radius;
    },
    remove() {
      scene.remove(group);
    },
  };
  return car;
}

export function pickCarColor(rng) {
  return PAINT_JOBS[rng.int(0, PAINT_JOBS.length - 1)];
}
