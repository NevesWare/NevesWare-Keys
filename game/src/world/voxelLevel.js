import * as THREE from 'three';

export const MATERIALS = {
  grass: '#8bbf4f',
  dirt: '#a8703f',
  stone: '#7a6f8f',
  wood: '#6b3f2a',
  leaves: '#4f7a3a',
  brick: '#c9b8a0',
  plank: '#b07a45',
  grassDark: '#5f8f42',
  grassLight: '#9dcc5c',
  road: '#b08a5a',
  concrete: '#9a93a8',
  helipad: '#5d4a87',
  helipadMark: '#f4e9d8',
  rock: '#857a99',
  crate: '#c08a4a',
  crateMil: '#55703f',
  crateRare: '#ffd66b',
  sandbag: '#c9a978',
  wall_ferro: '#9e3a4a',
  wall_mare: '#3b5a8c',
  wall_raiz: '#4f7a3a',
};

function hash2(x, z) {
  const s = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Sparse voxel grid. Voxel (x,y,z) occupies [x,x+1] x [y,y+1] x [z,z+1].
 * The same grid drives rendering (instanced cubes) and collision.
 */
export class VoxelLevel {
  constructor() {
    this.voxels = new Map();
  }

  static key(x, y, z) {
    return `${x},${y},${z}`;
  }

  set(x, y, z, mat) {
    this.voxels.set(VoxelLevel.key(x, y, z), mat);
  }

  get(x, y, z) {
    return this.voxels.get(VoxelLevel.key(x, y, z));
  }

  isSolid(x, y, z) {
    return this.voxels.has(VoxelLevel.key(x, y, z));
  }

  /** Inclusive box fill. */
  box(x0, y0, z0, x1, y1, z1, mat) {
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        for (let z = z0; z <= z1; z++) this.set(x, y, z, mat);
  }

  /** Round floating island: grass top at y=top, dirt below, stone cone underneath. */
  island(cx, cz, top, r) {
    for (let dx = -r - 1; dx <= r + 1; dx++) {
      for (let dz = -r - 1; dz <= r + 1; dz++) {
        const x = cx + dx;
        const z = cz + dz;
        const d = Math.hypot(dx, dz) + (hash2(x, z) - 0.5) * 0.8;
        if (d > r) continue;
        this.set(x, top, z, 'grass');
        this.set(x, top - 1, z, 'dirt');
        const depth = 1 + Math.floor((r - d) * 1.3);
        for (let k = 2; k <= depth + 1; k++) this.set(x, top - k, z, 'stone');
      }
    }
  }

  /** Single-column stepping stone with a grass cap. */
  pillar(x, z, top, depth = 3) {
    this.set(x, top, z, 'grass');
    for (let y = top - depth; y < top; y++) this.set(x, y, z, 'stone');
  }

  /** Trunk starting at (x, y, z) plus a blocky canopy. */
  tree(x, y, z) {
    for (let i = 0; i < 3; i++) this.set(x, y + i, z, 'wood');
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        this.set(x + dx, y + 3, z + dz, 'leaves');
        if (Math.abs(dx) + Math.abs(dz) <= 1) this.set(x + dx, y + 4, z + dz, 'leaves');
      }
  }

  /** Highest solid voxel top surface at or below y in the column containing (x, z). */
  groundBelow(x, y, z, maxDepth = 40) {
    const ix = Math.floor(x);
    const iz = Math.floor(z);
    for (let iy = Math.floor(y); iy > Math.floor(y) - maxDepth; iy--) {
      if (this.isSolid(ix, iy, iz)) return iy + 1;
    }
    return null;
  }

  /** One InstancedMesh per material; fully hidden voxels are skipped. */
  buildMeshes() {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const byMat = new Map();
    const dirs = [
      [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
    ];

    for (const [k, mat] of this.voxels) {
      const [x, y, z] = k.split(',').map(Number);
      const exposed = dirs.some(([dx, dy, dz]) => !this.isSolid(x + dx, y + dy, z + dz));
      if (!exposed) continue;
      if (!byMat.has(mat)) byMat.set(mat, []);
      byMat.get(mat).push([x, y, z]);
    }

    const m = new THREE.Matrix4();
    for (const [mat, list] of byMat) {
      const material = new THREE.MeshLambertMaterial({ color: MATERIALS[mat] ?? '#ff00ff' });
      const mesh = new THREE.InstancedMesh(geo, material, list.length);
      list.forEach(([x, y, z], i) => {
        m.makeTranslation(x + 0.5, y + 0.5, z + 0.5);
        mesh.setMatrixAt(i, m);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
    return group;
  }
}
