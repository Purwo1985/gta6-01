// SOLMAR HEAT — vehicles: arcade car physics plus the car meshes themselves.
// Parked cars can be stolen (E), traffic cars drive the grid, police cars
// chase. One builder makes every car so the city feels like one fleet.
import { THREE } from './three.js';
import { CAR } from './config.js';
import { resolveCollisions } from './city.js';

const CAR_COLORS = [0xd83a2e, 0x2e6fd8, 0xf2c14e, 0xeeeeee, 0x222226, 0x2fa36b, 0xd86bb0, 0x7a4fd8];

export function buildCarMesh(color, isPolice = false) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color: isPolice ? 0x1a1a22 : color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.75, 4.4), paint);
  body.position.y = 0.65;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.7, 0.65, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x1c2733 }),
  );
  cabin.position.set(0, 1.3, -0.2);
  group.add(body, cabin);
  if (isPolice) {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.22, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }),
    );
    bar.position.set(0, 1.72, -0.2);
    const stripe = new THREE.Mesh(
      new THREE.BoxGeometry(2.02, 0.3, 4.42),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    stripe.position.y = 0.62;
    group.add(bar, stripe);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const wheels = [];
  for (const [x, z] of [[-0.95, 1.4], [0.95, 1.4], [-0.95, -1.4], [0.95, -1.4]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.42, z);
    group.add(w);
    wheels.push(w);
  }
  return { group, wheels };
}

export function createCar(scene, x, z, heading, color, isPolice = false) {
  const { group, wheels } = buildCarMesh(color, isPolice);
  group.position.set(x, 0, z);
  group.rotation.y = heading;
  scene.add(group);
  return {
    group,
    wheels,
    pos: new THREE.Vector3(x, 0, z),
    heading,
    speed: 0,
    steer: 0,
    health: CAR.maxHealth,
    isPolice,
    color,
    update(dt, throttle, steerInput, colliders, half) {
      const targetSteer = steerInput * 0.55;
      this.steer += (targetSteer - this.steer) * Math.min(1, dt * 8);
      if (throttle > 0) this.speed += CAR.accel * throttle * dt;
      else if (throttle < 0) {
        this.speed += this.speed > 0.5 ? -CAR.brake * dt : CAR.reverseAccel * throttle * dt;
      } else {
        this.speed -= this.speed * CAR.drag * dt;
        if (Math.abs(this.speed) < 0.05) this.speed = 0;
      }
      this.speed = Math.max(-CAR.maxReverse, Math.min(CAR.maxSpeed, this.speed));
      const turn = this.steer * CAR.turnRate * dt * Math.min(1, Math.abs(this.speed) / 6) * Math.sign(this.speed || 1);
      this.heading += turn;
      const fx = Math.sin(this.heading);
      const fz = Math.cos(this.heading);
      this.pos.x += fx * this.speed * dt;
      this.pos.z += fz * this.speed * dt;
      resolveCollisions(colliders, half, this.pos, 1.6);
      group.position.copy(this.pos);
      group.rotation.y = this.heading;
      const spin = (this.speed * dt) / 0.42;
      for (const w of wheels) w.rotation.x += spin;
      return Math.abs(this.speed);
    },
    // Simple circle push-apart used by traffic and police rams.
    pushFrom(other, radius = 2.6) {
      const dx = this.pos.x - other.pos.x;
      const dz = this.pos.z - other.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.01 && d < radius) {
        this.pos.x = other.pos.x + (dx / d) * radius;
        this.pos.z = other.pos.z + (dz / d) * radius;
      }
    },
    remove() { scene.remove(group); },
  };
}

export function pickCarColor(rng) {
  return CAR_COLORS[rng.int(0, CAR_COLORS.length - 1)];
}
