// SOLMAR HEAT — player: Rico on foot. Third-person walk and run with a
// mouse-drag orbit camera, a blocky capsule look, a punch attack and
// building collision. The camera sits behind Rico; W always walks away
// from it, so the controls never flip when the camera swings around.
import { THREE } from './three.js';
import { PLAYER } from './config.js';
import { resolveCollisions } from './city.js';

const SKIN_TONE = 0xc98d64;
const SHIRT_TONE = 0x2fa36b;
const TROUSER_TONE = 0x2b3a55;

function block(w, h, d, color, y) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.y = y;
  return mesh;
}

export function createPlayer(scene) {
  const figure = new THREE.Group();
  figure.name = 'Rico';
  const torso = block(0.7, 0.9, 0.4, SHIRT_TONE, 1.05);
  const skull = block(0.42, 0.42, 0.42, SKIN_TONE, 1.72);
  const legs = block(0.6, 0.6, 0.36, TROUSER_TONE, 0.3);
  const armL = block(0.18, 0.7, 0.22, SHIRT_TONE, 1.05);
  armL.position.x = -0.46;
  const armR = block(0.18, 0.7, 0.22, SHIRT_TONE, 1.05);
  armR.position.x = 0.46;
  figure.add(torso, skull, legs, armL, armR);
  scene.add(figure);

  const rico = {
    group: figure,
    pos: new THREE.Vector3(0, 0, 30),
    heading: 0,
    camYaw: Math.PI,
    camPitch: 0.32,
    health: PLAYER.maxHealth,
    punchTimer: 0,
    walkPhase: 0,
    update(dt, input, colliders, half) {
      const ahead = (input.isDown('KeyW') ? 1 : 0) - (input.isDown('KeyS') ? 1 : 0);
      const strafe = (input.isDown('KeyD') ? 1 : 0) - (input.isDown('KeyA') ? 1 : 0);
      const sprinting = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
      const drag = input.consumeDrag();
      this.camYaw -= drag.x * 0.005;
      this.camPitch = Math.max(0.05, Math.min(1.1, this.camPitch + drag.y * 0.004));
      const pace = sprinting ? PLAYER.runSpeed : PLAYER.walkSpeed;
      const yawSin = Math.sin(this.camYaw);
      const yawCos = Math.cos(this.camYaw);
      // The camera looks along -Z of its yaw, so W walks away from it.
      let mx = yawSin * -ahead + yawCos * strafe;
      let mz = yawCos * -ahead + -yawSin * strafe;
      const length = Math.hypot(mx, mz);
      const moving = length > 0;
      if (moving) {
        mx /= length;
        mz /= length;
        this.pos.x += mx * pace * dt;
        this.pos.z += mz * pace * dt;
        this.heading = Math.atan2(mx, mz);
        this.walkPhase += dt * pace * 1.6;
      }
      resolveCollisions(colliders, half, this.pos, PLAYER.radius);
      this.punchTimer = Math.max(0, this.punchTimer - dt);
      figure.position.copy(this.pos);
      figure.rotation.y = this.heading;
      // Walk bob, leg swing and a counter-swing of the arms.
      const swing = moving ? Math.sin(this.walkPhase) : 0;
      torso.position.y = 1.05 + (moving ? Math.abs(Math.sin(this.walkPhase)) * 0.06 : 0);
      legs.rotation.x = swing * 0.55;
      armL.rotation.x = -swing * 0.5;
      armR.rotation.x = swing * 0.5;
      return { moving, running: sprinting && moving };
    },
    cameraTarget() {
      return new THREE.Vector3(this.pos.x, this.pos.y + 1.6, this.pos.z);
    },
    cameraOffset() {
      const distance = 7.5;
      const level = Math.cos(this.camPitch) * distance;
      return new THREE.Vector3(
        Math.sin(this.camYaw) * level,
        Math.sin(this.camPitch) * distance + 1.2,
        Math.cos(this.camYaw) * level,
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
  return rico;
}
