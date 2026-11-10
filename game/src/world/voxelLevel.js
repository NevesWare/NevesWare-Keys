


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

}
