// SOLMAR HEAT — city: the whole of Porto Solmar, built procedurally from a
// seed. A 7x7 grid of blocks around a road network, a beach and sea to the
// south, a marina pier, palms and lamps. Buildings get canvas window
// textures, so the skyline reads at sunset without any image files.
import { THREE } from './three.js';
import { CITY } from './config.js';

const PITCH = CITY.blockSize + CITY.roadWidth;
const PALETTE = [0xffd9a0, 0xffb38a, 0xf7e8c9, 0xe8a87c, 0xc9d6e8, 0xf2c14e, 0xd98c8c, 0x9fc2e8];
const ROOFS = [0x8a5a44, 0x5a6b7c, 0x7c5a6b, 0x4a4a55];

function windowTexture(rng, base) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 128, 256);
  for (let y = 10; y < 246; y += 22) {
    for (let x = 10; x < 118; x += 20) {
      const lit = rng.chance(0.45);
      g.fillStyle = lit ? '#ffd97a' : '#2c3550';
      g.fillRect(x, y, 12, 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function buildCity(scene, rng) {
  const colliders = [];
  const half = CITY.half;
  const group = new THREE.Group();
  group.name = 'PortoSolmar';
  scene.add(group);

  // Sunset sky, warm fog and light.
  scene.background = new THREE.Color(0xff9e5e);
  scene.fog = new THREE.Fog(0xff9e5e, 180, 520);
  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x3a2f4a, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb36b, 1.6);
  sun.position.set(-120, 140, -80);
  scene.add(sun);

  // Ground: grass-green base under everything, then roads on top.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 260, half * 2 + 260),
    new THREE.MeshLambertMaterial({ color: 0x6f8f5a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 40);
  group.add(ground);

  // Beach sand + sea to the south (positive Z).
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 260, 70),
    new THREE.MeshLambertMaterial({ color: 0xe8cf9a }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.02, half + 35);
  group.add(sand);
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 260, 220),
    new THREE.MeshLambertMaterial({ color: 0x2a7fa8 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, 0.01, half + 180);
  group.add(sea);

  // Roads: dark strips along every grid line, with pale centre dashes.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2e2e38 });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8d8c0 });
  const lines = [];
  for (let i = -3; i <= 3; i += 1) lines.push(i * PITCH);
  for (const c of lines) {
    const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(CITY.roadWidth, half * 2), roadMat);
    roadNS.rotation.x = -Math.PI / 2;
    roadNS.position.set(c, 0.03, 0);
    group.add(roadNS);
    const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, CITY.roadWidth), roadMat);
    roadEW.rotation.x = -Math.PI / 2;
    roadEW.position.set(0, 0.03, c);
    group.add(roadEW);
    for (let d = -half + 12; d < half - 6; d += 12) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(1, 4), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(c, 0.05, d);
      group.add(dash);
      const dash2 = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), dashMat);
      dash2.rotation.x = -Math.PI / 2;
      dash2.position.set(d, 0.05, c);
      group.add(dash2);
    }
  }

  // Buildings: one to four per block, heights up to a downtown tower core.
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let bx = -3; bx <= 3; bx += 1) {
    for (let bz = -3; bz <= 3; bz += 1) {
      const cx = (bx + 0.5) * PITCH;
      const cz = (bz + 0.5) * PITCH;
      const downtown = Math.abs(bx) <= 1 && Math.abs(bz) <= 1;
      const count = rng.int(1, downtown ? 2 : 3);
      for (let k = 0; k < count; k += 1) {
        const w = rng.range(14, 26);
        const d = rng.range(14, 26);
        const h = downtown ? rng.range(24, 58) : rng.range(8, 26);
        const ox = rng.range(-8, 8);
        const oz = rng.range(-8, 8);
        const base = PALETTE[rng.int(0, PALETTE.length - 1)];
        const tex = windowTexture(rng, `#${base.toString(16).padStart(6, '0')}`);
        const mat = new THREE.MeshLambertMaterial({ map: tex });
        const b = new THREE.Mesh(boxGeo, mat);
        b.scale.set(w, h, d);
        b.position.set(cx + ox, h / 2, cz + oz);
        group.add(b);
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.6, 0.8, d + 0.6),
          new THREE.MeshLambertMaterial({ color: ROOFS[rng.int(0, ROOFS.length - 1)] }),
        );
        roof.position.set(cx + ox, h + 0.4, cz + oz);
        group.add(roof);
        colliders.push({
          minX: cx + ox - w / 2, maxX: cx + ox + w / 2,
          minZ: cz + oz - d / 2, maxZ: cz + oz + d / 2,
        });
        // Rooftop beacon on the tallest towers.
        if (h > 40 && rng.chance(0.6)) {
          const beacon = new THREE.Mesh(
            new THREE.SphereGeometry(0.9, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff4040 }),
          );
          beacon.position.set(cx + ox, h + 1.6, cz + oz);
          group.add(beacon);
        }
      }
    }
  }

  // Palms along the beachfront road and lamps along every road.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4e });
  for (let x = -half; x <= half; x += 24) {
    for (const z of [half - 8, -half + 8]) {
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 6), trunkMat);
      trunk.position.set(x + rng.range(-4, 4), 3.5, z);
      group.add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.4, 7), leafMat);
      crown.position.set(x + rng.range(-4, 4), 8.2, z);
      group.add(crown);
    }
  }
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x222226 });
  const lampGlow = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const c of lines) {
    for (let d = -half + 20; d < half; d += 60) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6, 6), lampMat);
      pole.position.set(c + CITY.roadWidth / 2 + 1, 3, d);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), lampGlow);
      bulb.position.set(c + CITY.roadWidth / 2 + 1, 6.2, d);
      group.add(bulb);
    }
  }

  // Marina pier at the docks (south-west beach).
  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1, 46),
    new THREE.MeshLambertMaterial({ color: 0x8a6a4a }),
  );
  pier.position.set(-120, 0.5, half + 42);
  group.add(pier);

  // Landmarks the missions point at.
  const landmarks = {
    docks: { x: -120, z: half + 18, label: 'Solmar Docks' },
    hotel: { x: 150, z: -90, label: 'Palms Hotel' },
    bank: { x: 90, z: 30, label: 'Solmar Bank' },
    safehouse: { x: -150, z: -150, label: 'Safehouse' },
    marina: { x: 150, z: half - 6, label: 'Marina Vault' },
    plaza: { x: 0, z: 0, label: 'Solmar Plaza' },
  };
  // A glowing sign pillar at the plaza so the city centre reads from afar.
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2.6, 26, 10),
    new THREE.MeshLambertMaterial({ color: 0xf2c14e }),
  );
  pillar.position.set(0, 13, 0);
  group.add(pillar);
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(3, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
  );
  orb.position.set(0, 28, 0);
  group.add(orb);

  return { colliders, roadLines: lines, landmarks, half, group };
}

// True when a circle of `radius` at (x, z) overlaps any building.
export function hitsBuilding(colliders, x, z, radius) {
  for (const c of colliders) {
    if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) return true;
  }
  return false;
}

// Push a circle out of buildings and clamp it inside the playable bounds.
export function resolveCollisions(colliders, half, pos, radius) {
  for (const c of colliders) {
    const nx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const nz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - nx;
    const dz = pos.z - nz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius && d2 > 0.0001) {
      const d = Math.sqrt(d2);
      pos.x = nx + (dx / d) * radius;
      pos.z = nz + (dz / d) * radius;
    } else if (d2 <= 0.0001) {
      pos.x += radius;
    }
  }
  pos.x = Math.max(-half - 20, Math.min(half + 20, pos.x));
  pos.z = Math.max(-half - 20, Math.min(half + 55, pos.z));
  return pos;
}
