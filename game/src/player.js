// SOLMAR HEAT — player: Rico on foot. Third-person walk/run with a drag
// orbit camera, simple capsule look, punch attack and building collision.
import { THREE } from './three.js';
import { PLAYER } from './config.js';
import { resolveCollisions } from './city.js';

const SKIN = 0xc98d64;
const SHIRT = 0x2fa36b;
const PANTS = 0x2b3a55;

export function createPlayer(scene) {
  const group = new THREE.Group();
  group.name = 'Rico';
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.9, 0.4),
    new THREE.MeshLambertMaterial({ color: SHIRT }),
  );
  body.position.y = 1.05;
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.42, 0.42, 0.42),
    new THREE.MeshLambertMaterial({ color: SKIN }),
  );
  head.position.y = 1.72;
  const legs = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.6, 0.36),
    new THREE.MeshLambertMaterial({ color: PANTS }),
  );
  legs.position.y = 0.3;
  group.add(body, head, legs);
  scene.add(group);

  return {
    group,
    pos: new THREE.Vector3(0, 0, 30),
    heading: 0, // facing angle, radians
    camYaw: Math.PI,
    camPitch: 0.32,
    health: PLAYER.maxHealth,
    punchTimer: 0,
    walkPhase: 0,
    update(dt, input, colliders, half) {
      const fwd = input.isDown('KeyW') ? 1 : 0;
      const back = input.isDown('KeyS') ? 1 : 0;
      const left = input.isDown('KeyA') ? 1 : 0;
      const right = input.isDown('KeyD') ? 1 : 0;
      const run = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const drag = input.consumeDrag();
      this.camYaw -= drag.x * 0.005;
      this.camPitch = Math.max(0.05, Math.min(1.1, this.camPitch + drag.y * 0.004));
      const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
      let mx = 0;
      let mz = 0;
      const sin = Math.sin(this.camYaw);
      const cos = Math.cos(this.camYaw);
      // Camera looks toward -Z of its yaw; W moves away from the camera.
      mx += sin * (back - fwd);
      mz += cos * (back - fwd);
      mx += cos * (right - left);
      mz += -sin * (right - left);
      const len = Math.hypot(mx, mz);
      if (len > 0) {
        mx /= len;
        mz /= len;
        this.pos.x += mx * speed * dt;
        this.pos.z += mz * speed * dt;
        this.heading = Math.atan2(mx, mz);
        this.walkPhase += dt * speed * 1.6;
      }
      resolveCollisions(colliders, half, this.pos, PLAYER.radius);
      this.punchTimer = Math.max(0, this.punchTimer - dt);
      group.position.copy(this.pos);
      group.rotation.y = this.heading;
      // Walk bob and leg swing.
      body.position.y = 1.05 + (len > 0 ? Math.abs(Math.sin(this.walkPhase)) * 0.06 : 0);
      legs.rotation.x = len > 0 ? Math.sin(this.walkPhase) * 0.55 : 0;
      return { moving: len > 0, running: run && len > 0 };
    },
    cameraTarget() {
      return new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z);
    },
    cameraOffset() {
      const dist = 7.5;
      return new THREE.Vector3(
        Math.sin(this.camYaw) * Math.cos(this.camPitch) * dist,
        Math.sin(this.camPitch) * dist + 1.2,
        Math.cos(this.camYaw) * Math.cos(this.camPitch) * dist,
      );
    },
    punch() {
      if (this.punchTimer > 0) return false;
      this.punchTimer = PLAYER.punchCooldown;
      return true;
    },
    reset(x, z) {
      this.pos.set(x, 0, z);
      this.health = PLAYER.maxHealth;
      this.heading = 0;
      // A fresh spawn carries no leftover punch cooldown or walk cycle.
      this.punchTimer = 0;
      this.walkPhase = 0;
    },
  };
}
