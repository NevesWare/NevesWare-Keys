import { VoxelLevel } from '../world/voxelLevel.js';
import { Grid } from '../inventory/grid.js';
import { FACTIONS } from '../data/factions.js';

export const MAP_SIZE = 1024;
const MID = MAP_SIZE / 2;
const K = MAP_SIZE / 128; // layout scale vs. the original 128 m map

export const GROUND_TYPES = ['grass', 'grassDark', 'grassLight', 'road', 'dirt', 'concrete', 'helipad', 'helipadMark', 'plank'];
const GROUND_ID = Object.fromEntries(GROUND_TYPES.map((g, i) => [g, i]));

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
  const N = 129;
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
  N: { x: MID, z: 70 },
  NE: { x: MAP_SIZE - 90, z: 90 },
  SO: { x: 90, z: MAP_SIZE - 84 },
  SE: { x: MAP_SIZE - 90, z: MAP_SIZE - 84 },
};

/** Named places ("bases comuns" with helipads are landing zones). */
export const POIS = [
  { id: 'gz', name: 'Ground Zero', x: MID, z: MID, kind: 'ruins', risk: 'ALTO', lz: true },
  { id: 'aero', name: 'Aeródromo Pha', x: 735, z: 300, kind: 'airfield', risk: 'ALTO', lz: true },
  { id: 'kilo', name: 'Base Militar Kilo', x: 290, z: 290, kind: 'camp', risk: 'ALTO', lz: true },
  { id: 'vnorte', name: 'Vila Norte', x: 380, z: 175, kind: 'town', risk: 'MÉDIO', lz: true },
  { id: 'serraria', name: 'Serraria', x: 165, z: 560, kind: 'town', risk: 'MÉDIO', lz: true },
  { id: 'hosp', name: 'Hospital São Lucas', x: 640, z: 430, kind: 'town', risk: 'MÉDIO', lz: false },
  { id: 'fazenda', name: 'Fazenda Velha', x: 690, z: 650, kind: 'town', risk: 'BAIXO', lz: true },
  { id: 'florestal', name: 'Posto Florestal', x: 330, z: 760, kind: 'town', risk: 'BAIXO', lz: true },
  { id: 'porto', name: 'Porto Sul', x: MID, z: 925, kind: 'town', risk: 'MÉDIO', lz: true },
  { id: 'vleste', name: 'Vila Leste', x: 900, z: 520, kind: 'scav', risk: 'MÉDIO', lz: true },
  { id: 'voeste', name: 'Acampamento Oeste', x: 80, z: 300, kind: 'scav', risk: 'MÉDIO', lz: false },
];

/** The sector is one fixed, persistent world (like DayZ): only loot and spawns change per raid. */
export const WORLD_SEED = 73001;
let worldCache = null;
export function worldMap() {
  return (worldCache ??= new RaidMap(WORLD_SEED));
}

/**
 * Raid world. Ground is a flat voxel layer at y=-1 (stand at y=0).
 * Collision/LOS/bullets use a 2D occupancy grid; the VoxelLevel is visual.
 */
export class RaidMap {
  constructor(seed = 1337) {
    this.W = MAP_SIZE;
    this.H = MAP_SIZE;
    this.solid = new Uint8Array(this.W * this.H);
    this.gnd = new Uint8Array(this.W * this.H);
    this.lzs = [];
    this.zombieSpawns = [];
    this.pois = POIS;
    this.reserved = new Uint8Array(this.W * this.H);
    this.vox = new VoxelLevel();
    this.rand = mulberry32(seed);
    this.containers = [];
    this.extracts = [];
    this.outposts = {};
    this.botSpawns = [];
    this.props = [];
    this.buildings = [];
    this.fires = [];
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

  /** Fresh loot for a new raid on the persistent world. */
  resetLoot() {
    this.containers = this.containers.filter((c) => !c.body);
    for (const c of this.containers) {
      c.grid = new Grid(c.grid.w, c.grid.h);
      c.filled = false;
      c.looted = false;
    }
  }

  ground(x, z, mat) {
    if (this.inBounds(x, z)) this.gnd[z * this.W + x] = GROUND_ID[mat] ?? 0;
  }

  groundAt(x, z) {
    return this.inBounds(x, z) ? GROUND_TYPES[this.gnd[z * this.W + x]] : 'grass';
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
    const kinds = ['car', 'suv', 'car', 'humvee'];
    this.prop(kinds[Math.floor(this.rand() * kinds.length)], Math.floor(this.rand() * 4), cx, cz, (alongX ? Math.PI / 2 : 0) + (this.rand() - 0.5) * 0.15);
  }

  /** Vehicle/structure with a solid rectangular footprint (cells w x d centered on x,z). */
  structure(kind, x, z, w, d, rot = 0, v = 1) {
    const x0 = Math.round(x - w / 2), z0 = Math.round(z - d / 2);
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) if (!this.isSolid(x0 + i, z0 + j)) this.block(x0 + i, z0 + j, 1, 'car');
    this.prop(kind, v, x, z, rot);
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
    this.buildings.push({ x0, z0, w, d, wall, v: this.buildings.length % 3 });
  }

  crate(x, z, tier, label = 'Caixa') {
    this.block(x, z, 1, tier === 'rare' ? 'crateRare' : tier === 'military' ? 'crateMil' : 'crate');
    this.prop('crate', tier, x + 0.5, z + 0.5, Math.floor(this.rand() * 4) * (Math.PI / 2));
    const c = { x: x + 0.5, z: z + 0.5, tier, label, grid: new Grid(7, 5), looted: false, filled: false };
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
    for (let z = 0; z < H; z++)
      for (let x = 0; x < W; x++) {
        const n = noise(x, z, 9);
        this.gnd[z * W + x] = n > 0.62 ? 1 : n < 0.3 ? 2 : 0;
      }

    // border cliffs
    for (let i = 0; i < W; i++) {
      for (const [x, z] of [[i, 0], [i, H - 1], [0, i], [W - 1, i]]) this.block(x, z, 3, 'stone');
      for (const [x, z] of [[i, 1], [i, H - 2], [1, i], [W - 2, i]]) if (R() < 0.5) this.block(x, z, 2, 'stone');
    }

    const C = { x: MID, z: MID };
    // road network: bases and places connect to Ground Zero and to their neighbours
    const hubs = [...Object.values(CORNERS), ...POIS];
    for (const h of hubs) this.road(C.x, C.z, h.x, h.z);
    const ring = POIS.filter((p) => p.id !== 'gz').sort((a, b) => Math.atan2(a.z - MID, a.x - MID) - Math.atan2(b.z - MID, b.x - MID));
    for (let i = 0; i < ring.length; i++) this.road(ring[i].x, ring[i].z, ring[(i + 1) % ring.length].x, ring[(i + 1) % ring.length].z);
    this.pendingCars = [];
    for (const h of hubs)
      for (const t of [0.2, 0.45, 0.7]) {
        const x = Math.round(C.x + (h.x - C.x) * t), z = Math.round(C.z + (h.z - C.z) * t);
        if (R() < 0.7) this.pendingCars.push([x + 2, z - 1, R() < 0.5]);
      }

    // faction bases
    FACTIONS.forEach((f) => this.outpost(f, CORNERS[f.corner]));

    // places
    for (const p of POIS) {
      if (p.kind === 'ruins') this.ruins(p);
      else if (p.kind === 'scav') this.scavTown(p);
      else if (p.kind === 'airfield') this.airfield(p);
      else if (p.kind === 'camp') this.camp(p);
      else this.town(p);
      if (p.lz) this.landingZone(p);
    }
    this.scavTown(CORNERS.NE);
    this.landingZone({ id: 'scavne', name: 'Vila Scav NE', x: CORNERS.NE.x, z: CORNERS.NE.z, risk: 'MÉDIO' });

    // neutral paid extraction: west clearing
    this.extracts.push({ name: 'Clareira Oeste', x: 20, z: MID, r: 4, faction: null, cost: 4000 });
    for (let x = 14; x <= 26; x++) for (let z = MID - 6; z <= MID + 6; z++) this.ground(x, z, 'concrete');
    this.prop('helipad', 0, 20, MID, 0);
    this.reserve(12, MID - 8, 28, MID + 8);
    this.road(20, MID, C.x, C.z);

    // forest cabins scattered in the woods
    for (let i = 0; i < 26; i++) {
      const p = this.freeSpot(60 + R() * (W - 120), 60 + R() * (H - 120), 3);
      const x = Math.floor(p.x), z = Math.floor(p.z);
      if (this.reserved[this.idx(x, z)]) continue;
      this.building(x, z, 6, 5, { wall: 'plank', doors: R() < 0.5 ? 'ns' : 'ew' });
      this.crate(x + 1, z + 1, R() < 0.25 ? 'military' : 'common', 'Caixa de Cabana');
      this.botSpawns.push({ x: x + 3, z: z + 7, faction: 'scav' });
    }

    for (const [x, z, ax] of this.pendingCars) this.car(x, z, ax);

    // rocks
    for (let i = 0; i < 70 * K * 4; i++) {
      const x = 4 + Math.floor(R() * (W - 8)), z = 4 + Math.floor(R() * (H - 8));
      if (this.reserved[this.idx(x, z)]) continue;
      const n = 1 + Math.floor(R() * 4);
      for (let k = 0; k < n; k++) {
        const rx = x + Math.floor(R() * 2), rz = z + Math.floor(R() * 2);
        if (!this.reserved[this.idx(rx, rz)] && !this.isSolid(rx, rz)) this.rock(rx, rz);
      }
    }

    // forest (dense patches + sparse trees)
    for (let z = 3; z < H - 3; z++)
      for (let x = 3; x < W - 3; x++) {
        const dens = noise(x + 50, z + 50, 14);
        if (R() >= (dens > 0.6 ? 0.032 : 0.0022)) continue;
        if (this.reserved[this.idx(x, z)] || this.isSolid(x, z) || this.gnd[this.idx(x, z)] === 3) continue;
        let ok = true;
        for (let ox = -3; ox <= 3 && ok; ox++) for (let oz = -3; oz <= 3; oz++) if (this.isSolid(x + ox, z + oz)) { ok = false; break; }
        if (ok) this.tree(x, z);
      }

    // scattered loot in the wild
    for (let i = 0; i < 90; i++) {
      const p = this.freeSpot(20 + R() * (W - 40), 20 + R() * (H - 40), 1);
      this.crate(Math.floor(p.x), Math.floor(p.z), R() < 0.15 ? 'military' : 'common', R() < 0.5 ? 'Mochila Abandonada' : 'Caixa de Suprimentos');
    }

    // bushes and fences (decoration, no collision)
    for (let i = 0; i < 520 * K * 3; i++) {
      const x = 3 + R() * (W - 6), z = 3 + R() * (H - 6);
      const cx = Math.floor(x), cz = Math.floor(z);
      if (this.reserved[this.idx(cx, cz)] || this.isSolid(cx, cz)) continue;
      this.prop('bush', Math.floor(R() * 2), x, z, R() * 6.28, 0.7 + R() * 0.6);
    }
    for (let i = 0; i < 160; i++) {
      const p = this.freeSpot(30 + R() * (W - 60), 30 + R() * (H - 60), 0);
      const ax = R() < 0.5;
      for (let k = 0; k < 4; k++) this.prop('fence', 0, p.x + (ax ? k * 2.1 : 0), p.z + (ax ? 0 : k * 2.1), ax ? 0 : Math.PI / 2);
    }

    // debris around places (decoration, no collision): tyres, jerrycans, gas bottles
    const spots = [...POIS, ...Object.values(CORNERS)];
    for (const c of spots) {
      for (let i = 0; i < 26; i++) {
        const a = R() * Math.PI * 2, rr = 6 + R() * 34;
        const x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
        if (!this.inBounds(Math.floor(x), Math.floor(z)) || this.isSolid(Math.floor(x), Math.floor(z))) continue;
        const k = R();
        this.prop(k < 0.45 ? 'tyre' : k < 0.8 ? 'jerry' : 'propane', 0, x, z, R() * 6.28);
      }
    }
    // hay bales in the fields around villages and farms
    for (const c of POIS) {
      if (c.kind !== 'town') continue;
      const n = c.id === 'fazenda' ? 40 : 12;
      for (let i = 0; i < n; i++) {
        const a = R() * Math.PI * 2, rr = 34 + R() * 40;
        const x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
        const cx = Math.floor(x), cz = Math.floor(z);
        if (!this.inBounds(cx, cz) || this.isSolid(cx, cz) || this.reserved[this.idx(cx, cz)]) continue;
        this.block(cx, cz, 1, 'hay');
        this.prop('hay', 0, cx + 0.5, cz + 0.5, R() * 6.28);
      }
    }
    // wild flower / weed patches
    for (let i = 0; i < 9000; i++) {
      const x = 4 + R() * (W - 8), z = 4 + R() * (H - 8);
      const cx = Math.floor(x), cz = Math.floor(z);
      if (this.isSolid(cx, cz) || this.gnd[this.idx(cx, cz)] > 2) continue;
      this.prop('flowers', 0, x, z, R() * 6.28, 0.6 + R() * 0.8);
    }
    // war damage: scorch marks and burning wrecks at Ground Zero and military sites
    for (let i = 0; i < 40; i++) {
      const a = R() * Math.PI * 2, rr = R() * 55;
      this.prop('scorch', 0, MID + Math.cos(a) * rr, MID + Math.sin(a) * rr, R() * 6.28, 1.5 + R() * 3);
    }
    for (const p of POIS) {
      if (!['ruins', 'camp', 'airfield'].includes(p.kind)) continue;
      for (let i = 0; i < 3; i++) this.fires.push({ x: p.x + (R() - 0.5) * 40, z: p.z + (R() - 0.5) * 40, s: 0.6 + R() * 0.8 });
    }

    // fallen logs in the woods
    for (let i = 0; i < 900; i++) {
      const x = 10 + R() * (W - 20), z = 10 + R() * (H - 20);
      if (noise(x + 50, z + 50, 14) < 0.55) continue;
      const cx = Math.floor(x), cz = Math.floor(z);
      if (this.reserved[this.idx(cx, cz)] || this.isSolid(cx, cz) || this.gnd[this.idx(cx, cz)] === 3) continue;
      this.prop('log', 0, x, z, R() * 6.28, 0.6 + R() * 0.8);
    }

    // wildlife of the sector: scavs and zombie hordes
    for (let i = 0; i < 40; i++) this.botSpawns.push({ x: 40 + R() * (W - 80), z: 40 + R() * (H - 80), faction: 'scav' });
    for (let h = 0; h < 10; h++) {
      const a = R() * Math.PI * 2, rr = 8 + R() * 40;
      this.zombieSpawns.push({ x: MID + Math.cos(a) * rr, z: MID + Math.sin(a) * rr, n: 4 + Math.floor(R() * 4) });
    }
    for (const p of POIS) if (p.id !== 'gz') this.zombieSpawns.push({ x: p.x + (R() - 0.5) * 30, z: p.z + (R() - 0.5) * 30, n: 2 + Math.floor(R() * 4) });
    for (let i = 0; i < 70; i++) this.zombieSpawns.push({ x: 30 + R() * (W - 60), z: 30 + R() * (H - 60), n: 1 });
  }

  /** Village: houses around a square, with loot and scavs. */
  town(c) {
    const R = this.rand;
    const n = 6 + Math.floor(R() * 4);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + R() * 0.4, rr = 12 + R() * 14;
      const w = 6 + Math.floor(R() * 4), d = 5 + Math.floor(R() * 3);
      const x = Math.round(c.x + Math.cos(a) * rr - w / 2), z = Math.round(c.z + Math.sin(a) * rr - d / 2);
      this.building(x, z, w, d, { wall: R() < 0.3 ? 'brick' : 'plank', floor: 'plank', doors: ['ns', 'ew', 'nsew'][i % 3] });
      this.crate(x + 1, z + 1, R() < 0.2 ? 'military' : 'common', 'Armário');
      if (R() < 0.5) this.crate(x + w - 2, z + d - 2, 'common', 'Caixa');
    }
    for (let i = 0; i < 4; i++) this.botSpawns.push({ x: c.x + (R() - 0.5) * 20, z: c.z + (R() - 0.5) * 20, faction: 'scav' });
    this.reserve(c.x - 32, c.z - 32, c.x + 32, c.z + 32);
  }

  /** Airfield: runway, hangars, parked vehicles, military loot. */
  airfield(c) {
    for (let x = c.x - 90; x <= c.x + 90; x++) for (let z = c.z - 7; z <= c.z + 7; z++) this.ground(x, z, 'concrete');
    for (let x = c.x - 85; x <= c.x + 85; x += 8) for (let z = c.z - 1; z <= c.z; z++) this.ground(x, z, 'helipadMark');
    this.reserve(c.x - 92, c.z - 30, c.x + 92, c.z + 9);
    for (const dx of [-40, -15, 10]) {
      this.structure('hangar', c.x + dx, c.z - 20, 10, 8, Math.PI);
      this.crate(c.x + dx - 3, c.z - 22, 'military', 'Caixa Militar');
      this.crate(c.x + dx + 3, c.z - 22, 'rare', 'Cofre de Carga');
    }
    this.structure('truck', c.x + 35, c.z - 16, 3, 8, 0);
    this.structure('apc', c.x + 45, c.z - 16, 3, 6, 0);
    this.structure('tower', c.x - 60, c.z - 18, 3, 3, 0);
    for (let i = 0; i < 5; i++) this.botSpawns.push({ x: c.x - 30 + i * 15, z: c.z - 12, faction: 'scav', guard: true });
  }

  /** Abandoned military camp: walls, towers, tents of crates. */
  camp(c) {
    const R = this.rand;
    const s = 16;
    for (let x = c.x - s; x <= c.x + s; x++)
      for (let z = c.z - s; z <= c.z + s; z++) {
        this.ground(x, z, 'dirt');
        const edge = x === c.x - s || x === c.x + s || z === c.z - s || z === c.z + s;
        if (edge && Math.abs(x - c.x) > 2 && Math.abs(z - c.z) > 2) this.block(x, z, 2, 'stone');
      }
    this.reserve(c.x - s - 2, c.z - s - 2, c.x + s + 2, c.z + s + 2);
    this.structure('tower', c.x - s + 3, c.z - s + 3, 3, 3, 0);
    this.structure('tower', c.x + s - 3, c.z + s - 3, 3, 3, 0);
    this.structure('humvee', c.x + 8, c.z - 8, 3, 5, 0.3);
    this.structure('truck', c.x - 8, c.z + 6, 3, 8, 0);
    for (const [dx, dz] of [[-4, -4], [4, 4], [-10, 10], [10, -2]]) this.crate(c.x + dx, c.z + dz, 'military', 'Caixa Militar');
    this.crate(c.x, c.z, 'rare', 'Cofre do Comando');
    for (let i = -3; i <= 3; i++) this.sandbag(c.x + i, c.z - 6, 0);
    for (let i = 0; i < 6; i++) this.botSpawns.push({ x: c.x + (R() - 0.5) * 20, z: c.z + (R() - 0.5) * 20, faction: 'scav', guard: true });
  }

  /** Common base: helipad (landing zone + paid extraction), sandbags and supplies. */
  landingZone(p) {
    const x = Math.round(p.x + 22), z = Math.round(p.z + 22);
    for (let i = x - 4; i <= x + 4; i++) for (let j = z - 4; j <= z + 4; j++) {
      this.ground(i, j, 'concrete');
      this.clearCell(i, j);
    }
    this.prop('helipad', 0, x + 0.5, z + 0.5, 0);
    for (let i = -2; i <= 2; i++) this.sandbag(x + i, z + 6, 0);
    this.crate(x + 5, z - 4, 'common', 'Caixa de Suprimentos');
    this.reserve(x - 7, z - 7, x + 7, z + 7);
    this.lzs.push({ id: p.id, name: p.name, x: x + 0.5, z: z + 0.5, risk: p.risk });
    this.extracts.push({ name: `LZ ${p.name}`, x: x + 0.5, z: z + 0.5, r: 4, faction: null, cost: 3000 });
  }

  outpost(f, c) {
    const s = 9; // half size
    const x0 = c.x - s, z0 = c.z - s, x1 = c.x + s, z1 = c.z + s;
    // walls w/ gate facing map center
    const gx = c.x < MID ? 'e' : 'w', gz = c.z < MID ? 's' : 'n';
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
    // vehicles, watchtower, barriers, supplies
    const sx = c.x < MID ? 1 : -1, sz = c.z < MID ? 1 : -1;
    this.structure('truck', c.x - 6 * sx, c.z - 2, 3, 8, 0);
    this.structure('humvee', c.x + 6 * sx, c.z - 3 * sz, 3, 5, Math.PI / 2);
    this.structure('tower', c.x - 6 * sx, c.z + 6 * sz, 3, 3, 0);
    this.prop('barrels', 3, c.x - 3.5 * sx, c.z + 7 * sz, 0.4);
    this.prop('crates', f.id.length, c.x + 6 * sx, c.z + 6 * sz, 0.2);
    for (const k of [-1, 1]) this.structure('barrier', c.x + k * 2.5 + (sx > 0 ? 9 : -9), c.z + (sz > 0 ? 3.5 : -3.5), 2, 1, 0);
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
    this.botSpawns.push({ x: c.x + (c.x < MID ? 13 : -13), z: c.z + (c.z < MID ? 13 : -13), faction: f.id, patrol: true });
    this.botSpawns.push({ x: c.x + (c.x < MID ? 14 : -14), z: c.z + (c.z < MID ? 12 : -12), faction: f.id, patrol: true });
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
