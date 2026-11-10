import { VoxelLevel } from '../world/voxelLevel.js';
import { Grid } from '../inventory/grid.js';
import { FACTIONS } from '../data/factions.js';

export const MAP_SIZE = 128;

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function valueNoise(seed) {
  const r = mulberry32(seed);
  const N = 17;
  const g = Array.from({ length: N * N }, () => r());
  return (x, z, scale) => {
    const fx = (x / scale) % (N - 1), fz = (z / scale) % (N - 1);
    const ix = Math.floor(fx), iz = Math.floor(fz);
    const tx = fx - ix, tz = fz - iz;
    const s = (t) => t * t * (3 - 2 * t);
    const v = (a, b) => g[(b % N) * N + (a % N)];
    const a = v(ix, iz) + (v(ix + 1, iz) - v(ix, iz)) * s(tx);
    const b = v(ix, iz + 1) + (v(ix + 1, iz + 1) - v(ix, iz + 1)) * s(tx);
    return a + (b - a) * s(tz);
  };
}

const CORNERS = {
  NO: { x: 14, z: 14 },
  NE: { x: MAP_SIZE - 15, z: 14 },
  SO: { x: 14, z: MAP_SIZE - 15 },
  SE: { x: MAP_SIZE - 15, z: MAP_SIZE - 15 },
};

/**
 * Raid world. Ground is a flat voxel layer at y=-1 (stand at y=0).
 * Collision/LOS/bullets use a 2D occupancy grid; the VoxelLevel is visual.
 */
export class RaidMap {
  constructor(seed = 1337) {
    this.W = MAP_SIZE;
    this.H = MAP_SIZE;
    this.solid = new Uint8Array(this.W * this.H);
    this.reserved = new Uint8Array(this.W * this.H);
    this.vox = new VoxelLevel();
    this.rand = mulberry32(seed);
    this.containers = [];
    this.extracts = [];
    this.outposts = {};
    this.botSpawns = [];
    this.props = [];
    this.generate(seed);
  }

  // ---------- queries ----------
  inBounds(x, z) {
    return x >= 0 && z >= 0 && x < this.W && z < this.H;
  }

  isSolid(x, z) {
    if (!this.inBounds(x, z)) return true;
    return this.solid[z * this.W + x] === 1;
  }

  /** Axis-separated circle(as AABB) movement against solid cells. */
  move(pos, vx, vz, r, dt) {
    const step = (axis, d) => {
      if (d === 0) return;
      pos[axis] += d;
      const x0 = Math.floor(pos.x - r), x1 = Math.floor(pos.x + r);
      const z0 = Math.floor(pos.z - r), z1 = Math.floor(pos.z + r);
      for (let x = x0; x <= x1; x++)
        for (let z = z0; z <= z1; z++) {
          if (!this.isSolid(x, z)) continue;
          const c = axis === 'x' ? x : z;
          pos[axis] = d > 0 ? Math.min(pos[axis], c - r - 1e-4) : Math.max(pos[axis], c + 1 + r + 1e-4);
        }
    };
    step('x', vx * dt);
    step('z', vz * dt);
  }

  /** DDA ray through grid. Returns distance to first solid cell or Infinity. */
  raycast(x0, z0, dx, dz, maxDist) {
    let cx = Math.floor(x0), cz = Math.floor(z0);
    const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
    const tdx = dx !== 0 ? Math.abs(1 / dx) : Infinity;
    const tdz = dz !== 0 ? Math.abs(1 / dz) : Infinity;
    let tmx = dx !== 0 ? (dx > 0 ? cx + 1 - x0 : x0 - cx) * tdx : Infinity;
    let tmz = dz !== 0 ? (dz > 0 ? cz + 1 - z0 : z0 - cz) * tdz : Infinity;
    let t = 0;
    while (t <= maxDist) {
      if (tmx < tmz) {
        cx += stepX;
        t = tmx;
        tmx += tdx;
      } else {
        cz += stepZ;
        t = tmz;
        tmz += tdz;
      }
      if (t > maxDist) break;
      if (this.isSolid(cx, cz)) return t;
    }
    return Infinity;
  }

  hasLOS(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const d = Math.hypot(dx, dz);
    if (d < 1e-6) return true;
    return this.raycast(ax, az, dx / d, dz / d, d) === Infinity;
  }

  /** Nearest free cell center to (x,z) (spiral search). */
  freeSpot(x, z, minClear = 1) {
    for (let r = 0; r < 20; r++)
      for (let dx = -r; dx <= r; dx++)
        for (let dz = -r; dz <= r; dz++) {
          if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
          const cx = Math.floor(x) + dx, cz = Math.floor(z) + dz;
          let ok = true;
          for (let ox = -minClear; ox <= minClear && ok; ox++)
            for (let oz = -minClear; oz <= minClear && ok; oz++) if (this.isSolid(cx + ox, cz + oz)) ok = false;
          if (ok) return { x: cx + 0.5, z: cz + 0.5 };
        }
    return { x, z };
  }

  // ---------- building helpers ----------
  idx(x, z) {
    return z * this.W + x;
  }

  reserve(x0, z0, x1, z1) {
    for (let x = Math.max(0, x0); x <= Math.min(this.W - 1, x1); x++)
      for (let z = Math.max(0, z0); z <= Math.min(this.H - 1, z1); z++) this.reserved[this.idx(x, z)] = 1;
  }

  ground(x, z, mat) {
    if (this.inBounds(x, z)) this.vox.set(x, -1, z, mat);
  }

  block(x, z, h, mat, solid = true) {
    if (!this.inBounds(x, z)) return;
    for (let y = 0; y < h; y++) this.vox.set(x, y, z, mat);
    if (solid) this.solid[this.idx(x, z)] = 1;
  }

  clearCell(x, z) {
    if (!this.inBounds(x, z)) return;
    this.solid[this.idx(x, z)] = 0;
    for (let y = 0; y < 4; y++) this.vox.voxels.delete(VoxelLevel.key(x, y, z));
  }

  prop(kind, v, x, z, rot = this.rand() * Math.PI * 2, s = 1) {
    this.props.push({ kind, v, x, z, rot, s });
  }

  tree(x, z) {
    this.block(x, z, 1, 'trunk');
    this.prop('tree', Math.floor(this.rand() * 3), x + 0.5, z + 0.5, this.rand() * 6.28, 0.62 + this.rand() * 0.25);
  }

  rock(x, z) {
    this.block(x, z, 1, 'rock');
    this.prop('rock', Math.floor(this.rand() * 3), x + 0.5, z + 0.5);
  }

  sandbag(x, z, rot) {
    this.block(x, z, 1, 'sandbag');
    this.prop('sandbag', 0, x + 0.5, z + 0.5, rot);
  }

  /** Abandoned car: 2 x 4 cells, along x (alongX) or z. */
  car(x, z, alongX) {
    const cells = [];
    for (let a = 0; a < 2; a++) for (let b = 0; b < 4; b++) cells.push(alongX ? [x + b, z + a] : [x + a, z + b]);
    if (cells.some(([cx, cz]) => this.isSolid(cx, cz))) return;
    for (const [cx, cz] of cells) this.block(cx, cz, 1, 'car');
    const cx = alongX ? x + 2 : x + 1, cz = alongX ? z + 1 : z + 2;
    this.prop('car', Math.floor(this.rand() * 4), cx, cz, (alongX ? Math.PI / 2 : 0) + (this.rand() - 0.5) * 0.15);
  }

  /** Rectangular building with wall height 2 and door gaps in the middle of chosen sides. */
  building(x0, z0, w, d, { wall = 'brick', floor = 'plank', doors = 'nsew' } = {}) {
    const x1 = x0 + w - 1, z1 = z0 + d - 1;
    const mx = x0 + Math.floor(w / 2), mz = z0 + Math.floor(d / 2);
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++) {
        this.ground(x, z, floor);
        const edge = x === x0 || x === x1 || z === z0 || z === z1;
        if (!edge) continue;
        const door =
          (doors.includes('n') && z === z0 && (x === mx || x === mx - 1)) ||
          (doors.includes('s') && z === z1 && (x === mx || x === mx - 1)) ||
          (doors.includes('w') && x === x0 && (z === mz || z === mz - 1)) ||
          (doors.includes('e') && x === x1 && (z === mz || z === mz - 1));
        if (!door) this.block(x, z, 2, wall);
      }
    this.reserve(x0 - 1, z0 - 1, x1 + 1, z1 + 1);
  }

  crate(x, z, tier, label = 'Caixa') {
    this.block(x, z, 1, tier === 'rare' ? 'crateRare' : tier === 'military' ? 'crateMil' : 'crate');
    this.prop('crate', tier, x + 0.5, z + 0.5, Math.floor(this.rand() * 4) * (Math.PI / 2));
    const c = { x: x + 0.5, z: z + 0.5, tier, label, grid: new Grid(5, 4), looted: false, filled: false };
    this.containers.push(c);
    return c;
  }

  road(ax, az, bx, bz, width = 1) {
    const steps = Math.ceil(Math.hypot(bx - ax, bz - az));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const wob = Math.sin(t * 9 + ax) * 2;
      const cx = Math.round(ax + (bx - ax) * t + wob * (bz - az !== 0 ? 1 : 0) * 0.3);
      const cz = Math.round(az + (bz - az) * t + wob * (bx - ax !== 0 ? 1 : 0) * 0.3);
      for (let ox = -width; ox <= width; ox++)
        for (let oz = -width; oz <= width; oz++) {
          this.ground(cx + ox, cz + oz, 'road');
          this.reserve(cx + ox, cz + oz, cx + ox, cz + oz);
        }
    }
  }

  // ---------- generation ----------
  generate(seed) {
    const R = this.rand;
    const noise = valueNoise(seed + 7);
    const W = this.W, H = this.H;

    // ground
    for (let x = 0; x < W; x++)
      for (let z = 0; z < H; z++) {
        const n = noise(x, z, 9);
        this.ground(x, z, n > 0.62 ? 'grassDark' : n < 0.3 ? 'grassLight' : 'grass');
      }

    // border cliffs
    for (let i = 0; i < W; i++) {
      for (const [x, z] of [[i, 0], [i, H - 1], [0, i], [W - 1, i]]) this.block(x, z, 3, 'stone');
      for (const [x, z] of [[i, 1], [i, H - 2], [1, i], [W - 2, i]]) if (R() < 0.5) this.block(x, z, 2, 'stone');
    }

    const C = { x: 64, z: 64 };

    // roads from center to each corner
    for (const k of Object.keys(CORNERS)) this.road(C.x, C.z, CORNERS[k].x, CORNERS[k].z);
    this.road(C.x, C.z, 64, 6);
    this.pendingCars = [];
    for (const k of Object.keys(CORNERS)) {
      for (const t of [0.35, 0.62]) {
        const x = Math.round(C.x + (CORNERS[k].x - C.x) * t), z = Math.round(C.z + (CORNERS[k].z - C.z) * t);
        this.pendingCars.push([x + 2, z - 1, R() < 0.5]);
      }
    }

    // faction outposts
    FACTIONS.forEach((f) => this.outpost(f, CORNERS[f.corner]));

    // scav town (SE)
    this.scavTown(CORNERS.SE);

    // center ruins
    this.ruins(C);

    // neutral extraction: north clearing
    this.reserve(58, 2, 70, 12);
    for (let x = 60; x <= 68; x++) for (let z = 3; z <= 10; z++) this.ground(x, z, 'road');
    this.extracts.push({ name: 'Clareira Norte', x: 64.5, z: 7, r: 4, faction: null });

    // forest cabins
    const cabins = [[38, 40], [90, 40], [40, 92], [88, 88], [64, 30], [30, 64], [98, 64]];
    for (const [x, z] of cabins) {
      this.building(x, z, 6, 5, { wall: 'plank', doors: R() < 0.5 ? 'ns' : 'ew' });
      this.crate(x + 1, z + 1, R() < 0.25 ? 'military' : 'common', 'Caixa de Cabana');
      this.botSpawns.push({ x: x + 3, z: z + 7, faction: 'scav' });
    }

    for (const [x, z, ax] of this.pendingCars) this.car(x, z, ax);

    // rocks
    for (let i = 0; i < 70; i++) {
      const x = 4 + Math.floor(R() * (W - 8)), z = 4 + Math.floor(R() * (H - 8));
      if (this.reserved[this.idx(x, z)]) continue;
      const n = 1 + Math.floor(R() * 4);
      for (let k = 0; k < n; k++) {
        const rx = x + Math.floor(R() * 2), rz = z + Math.floor(R() * 2);
        if (!this.reserved[this.idx(rx, rz)] && !this.isSolid(rx, rz)) this.rock(rx, rz);
      }
    }

    // forest
    for (let x = 3; x < W - 3; x++)
      for (let z = 3; z < H - 3; z++) {
        if (this.reserved[this.idx(x, z)] || this.isSolid(x, z)) continue;
        const dens = noise(x + 50, z + 50, 14);
        if (R() < (dens > 0.6 ? 0.022 : 0.003)) {
          let ok = true;
          for (let ox = -3; ox <= 3; ox++) for (let oz = -3; oz <= 3; oz++) if (this.isSolid(x + ox, z + oz)) ok = false;
          if (ok) this.tree(x, z);
        }
      }

    // scattered loot in the wild
    for (let i = 0; i < 10; i++) {
      const p = this.freeSpot(10 + R() * (W - 20), 10 + R() * (H - 20), 1);
      this.crate(Math.floor(p.x), Math.floor(p.z), 'common', 'Mochila Abandonada');
    }

    // bushes and roadside fences (decoration, no collision)
    for (let i = 0; i < 520; i++) {
      const x = 3 + R() * (W - 6), z = 3 + R() * (H - 6);
      const cx = Math.floor(x), cz = Math.floor(z);
      if (this.reserved[this.idx(cx, cz)] || this.isSolid(cx, cz)) continue;
      this.prop('bush', Math.floor(R() * 2), x, z, R() * 6.28, 0.7 + R() * 0.6);
    }
    for (let i = 0; i < 26; i++) {
      const p = this.freeSpot(10 + R() * (W - 20), 10 + R() * (H - 20), 0);
      const ax = R() < 0.5;
      for (let k = 0; k < 4; k++) this.prop('fence', 0, p.x + (ax ? k * 2.1 : 0), p.z + (ax ? 0 : k * 2.1), ax ? 0 : Math.PI / 2);
    }

    // wild scav spawns
    for (let i = 0; i < 6; i++) this.botSpawns.push({ x: 20 + R() * (W - 40), z: 20 + R() * (H - 40), faction: 'scav' });
  }

  outpost(f, c) {
    const s = 9; // half size
    const x0 = c.x - s, z0 = c.z - s, x1 = c.x + s, z1 = c.z + s;
    // walls w/ gate facing map center
    const gx = c.x < 64 ? 'e' : 'w', gz = c.z < 64 ? 's' : 'n';
    for (let x = x0; x <= x1; x++)
      for (let z = z0; z <= z1; z++) {
        this.ground(x, z, 'concrete');
        const edge = x === x0 || x === x1 || z === z0 || z === z1;
        if (!edge) continue;
        const gate =
          (gz === 's' && z === z1 && Math.abs(x - c.x) <= 1) || (gz === 'n' && z === z0 && Math.abs(x - c.x) <= 1) ||
          (gx === 'e' && x === x1 && Math.abs(z - c.z) <= 1) || (gx === 'w' && x === x0 && Math.abs(z - c.z) <= 1);
        if (!gate) this.block(x, z, 2, `wall_${f.id}`);
      }
    this.reserve(x0 - 2, z0 - 2, x1 + 2, z1 + 2);
    // helipad
    for (let x = c.x - 2; x <= c.x + 2; x++) for (let z = c.z - 2; z <= c.z + 2; z++) this.ground(x, z, 'helipad');
    for (const [dx, dz] of [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1], [0, 0]]) this.ground(c.x + dx, c.z + dz, 'helipadMark');
    // supply crates in the corners of the compound
    this.crate(x0 + 2, z0 + 2, 'military', 'Caixa de Suprimentos');
    this.crate(x1 - 2, z1 - 2, 'military', 'Caixa de Suprimentos');
    // sandbag cover
    for (let i = -2; i <= 2; i++) {
      this.sandbag(c.x + i, c.z - 5, 0);
      this.sandbag(c.x + i, c.z + 5, 0);
    }
    this.outposts[f.id] = { x: c.x + 0.5, z: c.z + 0.5, faction: f.id };
    this.prop('helipad', 0, c.x + 0.5, c.z + 0.5, 0);
    this.extracts.push({ name: `Heliponto ${f.name}`, x: c.x + 0.5, z: c.z + 0.5, r: 3.5, faction: f.id });
    for (let i = 0; i < 3; i++) this.botSpawns.push({ x: c.x + (i - 1) * 3, z: c.z + (gz === 's' ? 7 : -7), faction: f.id, guard: true });
    // patrol squad that roams toward the center
    this.botSpawns.push({ x: c.x + (c.x < 64 ? 13 : -13), z: c.z + (c.z < 64 ? 13 : -13), faction: f.id, patrol: true });
    this.botSpawns.push({ x: c.x + (c.x < 64 ? 14 : -14), z: c.z + (c.z < 64 ? 12 : -12), faction: f.id, patrol: true });
  }

  scavTown(c) {
    const R = this.rand;
    const spots = [[-10, -10], [-2, -11], [5, -9], [-11, -1], [3, 0], [-6, 6]];
    for (const [dx, dz] of spots) {
      const w = 4 + Math.floor(R() * 3), d = 4 + Math.floor(R() * 2);
      this.building(c.x + dx, c.z + dz, w, d, { wall: 'plank', floor: 'dirt', doors: 'nw' });
      this.crate(c.x + dx + 1, c.z + dz + 1, R() < 0.3 ? 'military' : 'common', 'Caixote Scav');
      this.botSpawns.push({ x: c.x + dx + 2, z: c.z + dz - 2, faction: 'scav' });
    }
  }

  ruins(c) {
    const R = this.rand;
    const blds = [[-12, -12, 9, 8], [4, -13, 8, 7], [-13, 4, 8, 9], [5, 5, 9, 8], [-3, -3, 6, 6]];
    for (const [dx, dz, w, d] of blds) {
      this.building(c.x + dx, c.z + dz, w, d, { wall: 'brick', floor: 'concrete', doors: 'nsew' });
      // broken walls: punch random holes
      for (let i = 0; i < 3; i++) {
        const side = Math.floor(R() * 4);
        const x = side < 2 ? c.x + dx + 1 + Math.floor(R() * (w - 2)) : side === 2 ? c.x + dx : c.x + dx + w - 1;
        const z = side >= 2 ? c.z + dz + 1 + Math.floor(R() * (d - 2)) : side === 0 ? c.z + dz : c.z + dz + d - 1;
        this.clearCell(x, z);
      }
      const tier = w * d > 60 ? 'rare' : 'military';
      this.crate(c.x + dx + 1, c.z + dz + 1, tier, tier === 'rare' ? 'Cofre' : 'Caixa Militar');
      this.crate(c.x + dx + w - 2, c.z + dz + d - 2, 'common', 'Armário');
    }
    for (let i = 0; i < 5; i++) this.botSpawns.push({ x: c.x - 8 + R() * 16, z: c.z - 8 + R() * 16, faction: 'scav' });
  }

  // ---------- pathfinding (A*, 8-neighbour, no corner cutting) ----------
  findPath(sx, sz, tx, tz, maxNodes = 4000) {
    const W = this.W;
    const start = Math.floor(sz) * W + Math.floor(sx);
    const goal = Math.floor(tz) * W + Math.floor(tx);
    if (this.solid[goal]) return null;
    const g = new Map([[start, 0]]);
    const came = new Map();
    const heap = [[0, start]];
    const push = (f, n) => {
      heap.push([f, n]);
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p][0] <= heap[i][0]) break;
        [heap[p], heap[i]] = [heap[i], heap[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = heap[0];
      const last = heap.pop();
      if (heap.length) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]];
          i = m;
        }
      }
      return top;
    };
    const gx = goal % W, gz = Math.floor(goal / W);
    const h = (n) => {
      const dx = Math.abs((n % W) - gx), dz = Math.abs(Math.floor(n / W) - gz);
      return Math.max(dx, dz) + 0.414 * Math.min(dx, dz);
    };
    let expanded = 0;
    while (heap.length && expanded++ < maxNodes) {
      const [, cur] = pop();
      if (cur === goal) {
        const path = [];
        let n = cur;
        while (n !== undefined) {
          path.push({ x: (n % W) + 0.5, z: Math.floor(n / W) + 0.5 });
          n = came.get(n);
        }
        return path.reverse();
      }
      const cx = cur % W, cz = Math.floor(cur / W);
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          if (!dx && !dz) continue;
          const nx = cx + dx, nz = cz + dz;
          if (this.isSolid(nx, nz)) continue;
          if (dx && dz && (this.isSolid(cx + dx, cz) || this.isSolid(cx, cz + dz))) continue;
          const n = nz * W + nx;
          const ng = g.get(cur) + (dx && dz ? 1.414 : 1);
          if (ng < (g.get(n) ?? Infinity)) {
            g.set(n, ng);
            came.set(n, cur);
            push(ng + h(n), n);
          }
        }
    }
    return null;
  }
}
