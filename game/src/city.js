// SOLMAR HEAT — city: all of Porto Solmar, grown procedurally from a
// seed. A 7x7 grid of blocks around a road network, a beach and a sea to
// the south, a marina pier, palms and lamps. Buildings wear canvas
// window textures, so the skyline reads at sunset without any image file.
//
// The seeded dice are spent in exactly the same order as the first
// build — blocks row by row, windows row by row — so WORLD_SEED still
// lays out the same streets and towers the screenshots show. Anything
// new (crosswalks, billboards) draws from its own separate stream or
// from no dice at all, and never touches the layout stream.
import { THREE } from './three.js';
import { CITY, WORLD_SEED } from './config.js';
import { createRandom } from './random.js';

const PITCH = CITY.blockSize + CITY.roadWidth;
const FACADES = [0xffd9a0, 0xffb38a, 0xf7e8c9, 0xe8a87c, 0xc9d6e8, 0xf2c14e, 0xd98c8c, 0x9fc2e8];
const ROOFTOPS = [0x8a5a44, 0x5a6b7c, 0x7c5a6b, 0x4a4a55];
const GRID_MIN = -3;
const GRID_MAX = 3;

// A facade texture: warm base, one lit-or-dark window per cell of an
// 11-by-6 grid. The dice calls happen row by row, top to bottom, in the
// same order as the first build — the layout stream depends on it.
function facadeTexture(rng, baseHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const pen = canvas.getContext('2d');
  pen.fillStyle = baseHex;
  pen.fillRect(0, 0, 128, 256);
  for (let row = 10; row < 246; row += 22) {
    for (let col = 10; col < 118; col += 20) {
      pen.fillStyle = rng.chance(0.45) ? '#ffd97a' : '#2c3550';
      pen.fillRect(col, row, 12, 14);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function flatMesh(w, d, material, x, y, z, group) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

export function buildCity(scene, rng) {
  const colliders = [];
  const half = CITY.half;
  const district = new THREE.Group();
  district.name = 'PortoSolmar';
  scene.add(district);

  // Sunset sky, warm fog, a low sun.
  scene.background = new THREE.Color(0xff9e5e);
  scene.fog = new THREE.Fog(0xff9e5e, 180, 520);
  const skyGlow = new THREE.HemisphereLight(0xffd9b0, 0x3a2f4a, 0.9);
  scene.add(skyGlow);
  const sun = new THREE.DirectionalLight(0xffb36b, 1.6);
  sun.position.set(-120, 140, -80);
  scene.add(sun);

  // Ground: green base under everything, roads on top of it.
  flatMesh(
    half * 2 + 260,
    half * 2 + 260,
    new THREE.MeshLambertMaterial({ color: 0x6f8f5a }),
    0, -0.05, 40, district,
  );
  // Beach sand and sea to the south, where z runs positive.
  flatMesh(half * 2 + 260, 70, new THREE.MeshLambertMaterial({ color: 0xe8cf9a }), 0, 0.02, half + 35, district);
  flatMesh(half * 2 + 260, 220, new THREE.MeshLambertMaterial({ color: 0x2a7fa8 }), 0, 0.01, half + 180, district);

  // Roads: dark strips on every grid line, pale dashes down the middle.
  const asphalt = new THREE.MeshLambertMaterial({ color: 0x2e2e38 });
  const paint = new THREE.MeshBasicMaterial({ color: 0xd8d8c0 });
  const lines = [];
  for (let i = GRID_MIN; i <= GRID_MAX; i += 1) lines.push(i * PITCH);
  for (const line of lines) {
    flatMesh(CITY.roadWidth, half * 2, asphalt, line, 0.03, 0, district);
    flatMesh(half * 2, CITY.roadWidth, asphalt, 0, 0.03, line, district);
    for (let d = -half + 12; d < half - 6; d += 12) {
      flatMesh(1, 4, paint, line, 0.05, d, district);
      flatMesh(4, 1, paint, d, 0.05, line, district);
    }
  }
  // Crosswalks: white bars across every road at every intersection.
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xe8e8d8 });
  for (const ax of lines) {
    for (const az of lines) {
      for (let k = -2; k <= 2; k += 1) {
        flatMesh(1.6, 5, stripeMat, ax + k * 2.6, 0.06, az - CITY.roadWidth / 2 - 1.5, district);
        flatMesh(5, 1.6, stripeMat, ax - CITY.roadWidth / 2 - 1.5, 0.06, az + k * 2.6, district);
      }
    }
  }

  // Buildings: one to three per block, a taller core downtown. The dice
  // are spent block by block in the same order as the first build.
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  for (let bx = GRID_MIN; bx <= GRID_MAX; bx += 1) {
    for (let bz = GRID_MIN; bz <= GRID_MAX; bz += 1) {
      const centreX = (bx + 0.5) * PITCH;
      const centreZ = (bz + 0.5) * PITCH;
      const downtown = Math.abs(bx) <= 1 && Math.abs(bz) <= 1;
      const count = rng.int(1, downtown ? 2 : 3);
      for (let k = 0; k < count; k += 1) {
        const width = rng.range(14, 26);
        const depth = rng.range(14, 26);
        const height = downtown ? rng.range(24, 58) : rng.range(8, 26);
        const offX = rng.range(-8, 8);
        const offZ = rng.range(-8, 8);
        const facade = FACADES[rng.int(0, FACADES.length - 1)];
        const skin = facadeTexture(rng, `#${facade.toString(16).padStart(6, '0')}`);
        const tower = new THREE.Mesh(unitBox, new THREE.MeshLambertMaterial({ map: skin }));
        tower.scale.set(width, height, depth);
        tower.position.set(centreX + offX, height / 2, centreZ + offZ);
        district.add(tower);
        const cap = new THREE.Mesh(
          new THREE.BoxGeometry(width + 0.6, 0.8, depth + 0.6),
          new THREE.MeshLambertMaterial({ color: ROOFTOPS[rng.int(0, ROOFTOPS.length - 1)] }),
        );
        cap.position.set(centreX + offX, height + 0.4, centreZ + offZ);
        district.add(cap);
        colliders.push({
          minX: centreX + offX - width / 2,
          maxX: centreX + offX + width / 2,
          minZ: centreZ + offZ - depth / 2,
          maxZ: centreZ + offZ + depth / 2,
        });
        // A red beacon on the tallest towers.
        if (height > 40 && rng.chance(0.6)) {
          const beacon = new THREE.Mesh(
            new THREE.SphereGeometry(0.9, 8, 8),
            new THREE.MeshBasicMaterial({ color: 0xff4040 }),
          );
          beacon.position.set(centreX + offX, height + 1.6, centreZ + offZ);
          district.add(beacon);
        }
      }
    }
  }

  // Palms down the beachfront road, lamps on every road.
  const barkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4e });
  for (let x = -half; x <= half; x += 24) {
    for (const z of [half - 8, -half + 8]) {
      // One offset per palm, shared by trunk and crown, so the crown
      // sits on its trunk instead of floating beside it.
      const jitter = x + rng.range(-4, 4);
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 7, 6), barkMat);
      trunk.position.set(jitter, 3.5, z);
      district.add(trunk);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.4, 7), frondMat);
      crown.position.set(jitter, 8.2, z);
      district.add(crown);
    }
  }
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x222226 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const line of lines) {
    for (let d = -half + 20; d < half; d += 60) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 6, 6), poleMat);
      pole.position.set(line + CITY.roadWidth / 2 + 1, 3, d);
      district.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), bulbMat);
      bulb.position.set(line + CITY.roadWidth / 2 + 1, 6.2, d);
      district.add(bulb);
    }
  }

  // Marina pier at the docks, on the south-west beach.
  const pier = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1, 46),
    new THREE.MeshLambertMaterial({ color: 0x8a6a4a }),
  );
  pier.position.set(-120, 0.5, half + 42);
  district.add(pier);

  // Billboards along the beachfront road, from their own dice stream so
  // the layout stream above never notices them.
  const decor = createRandom(WORLD_SEED ^ 0x5f3759df);
  const boardFaces = [0xff5a5a, 0x5ad8ff, 0x9dff5a];
  for (let i = 0; i < 3; i += 1) {
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(12, 5, 0.5),
      new THREE.MeshBasicMaterial({ color: boardFaces[i % boardFaces.length] }),
    );
    board.position.set(-140 + i * 140 + decor.range(-8, 8), 7, half - 12);
    district.add(board);
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.3, 5, 6),
      new THREE.MeshLambertMaterial({ color: 0x333333 }),
    );
    post.position.set(board.position.x, 2.5, half - 12);
    district.add(post);
  }

  // The places the jobs point at.
  const landmarks = {
    docks: { x: -120, z: half + 18, label: 'Solmar Docks' },
    hotel: { x: 150, z: -90, label: 'Palms Hotel' },
    bank: { x: 90, z: 30, label: 'Solmar Bank' },
    safehouse: { x: -150, z: -150, label: 'Safehouse' },
    marina: { x: 150, z: half - 6, label: 'Marina Vault' },
    plaza: { x: 0, z: 0, label: 'Solmar Plaza' },
  };
  // A glowing pillar at the plaza so the centre reads from far away.
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(2, 2.6, 26, 10),
    new THREE.MeshLambertMaterial({ color: 0xf2c14e }),
  );
  pillar.position.set(0, 13, 0);
  district.add(pillar);
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(3, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
  );
  orb.position.set(0, 28, 0);
  district.add(orb);

  return { colliders, roadLines: lines, landmarks, half, group: district };
}

// True when a circle of `radius` at (x, z) overlaps any building.
export function hitsBuilding(colliders, x, z, radius) {
  for (const block of colliders) {
    const overlapsX = x + radius > block.minX && x - radius < block.maxX;
    const overlapsZ = z + radius > block.minZ && z - radius < block.maxZ;
    if (overlapsX && overlapsZ) return true;
  }
  return false;
}

// Push a circle out of buildings and clamp it inside the playable bounds.
export function resolveCollisions(colliders, half, pos, radius) {
  for (const block of colliders) {
    const nearX = Math.max(block.minX, Math.min(pos.x, block.maxX));
    const nearZ = Math.max(block.minZ, Math.min(pos.z, block.maxZ));
    const pushX = pos.x - nearX;
    const pushZ = pos.z - nearZ;
    const gap2 = pushX * pushX + pushZ * pushZ;
    if (gap2 < radius * radius && gap2 > 0.0001) {
      const gap = Math.sqrt(gap2);
      pos.x = nearX + (pushX / gap) * radius;
      pos.z = nearZ + (pushZ / gap) * radius;
    } else if (gap2 <= 0.0001) {
      pos.x += radius;
    }
  }
  pos.x = Math.max(-half - 20, Math.min(half + 20, pos.x));
  pos.z = Math.max(-half - 20, Math.min(half + 55, pos.z));
  return pos;
}
