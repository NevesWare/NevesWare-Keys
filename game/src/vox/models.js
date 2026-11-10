import { VoxModel, hash3, jit, shade } from './voxModel.js';

/*
 * Procedural micro-voxel models.
 * Characters / vehicles / props: 1 voxel = 5 cm (SCALE_BODY).
 * Weapons / items: 1 voxel = 2.5 cm (SCALE_ITEM).
 * Vegetation: 1 voxel = 12.5 cm (SCALE_TREE) — keeps forests cheap on mobile.
 */
export const SCALE_BODY = 1 / 20;
export const SCALE_ITEM = 1 / 40;
export const SCALE_TREE = 1 / 8;
export const SCALE_GRASS = 1 / 20;

const cache = new Map();
export function cached(key, build) {
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key);
}

// ---------------------------------------------------------------- palettes
export const UNIFORMS = {
  ferro: { camo: [0x57524b, 0x6a6258, 0x45413c, 0x7a6650], band: 0xc0392b, glove: 0x2a2724, vest: 0x3d3a35, helmet: 0x4a4640 },
  mare: { camo: [0x4b5866, 0x5d6b79, 0x39424d, 0x6f7c88], band: 0x3f8fd8, glove: 0x23272c, vest: 0x3c4651, helmet: 0x46525e },
  raiz: { camo: [0x4b5a32, 0x3a4628, 0x6b5a3a, 0x2d3320], band: 0x86c34a, glove: 0x2a2a1e, vest: 0x4a5430, helmet: 0x4f5a34 },
  scav: { camo: [0x6b6f72, 0x8a5a3b, 0x3d4f3a, 0x5a4a6a, 0x7a3a34], band: 0xa8703f, glove: null, vest: 0x5a5040, helmet: 0x4a4a42 },
};
const SKINS = [0xe2b08c, 0xc58c64, 0x9a6444, 0x6e4530, 0xf0c9a8];
const BOOT = 0x2b241f;
const METAL = 0x43464b;
const WOOD = 0x7a4a2a;

function camo(pal, x, y, z, seed) {
  const cx = Math.floor((x + hash3(0, y >> 2, z >> 2, seed) * 3) / 3);
  const cy = Math.floor((y + hash3(x >> 2, 0, z >> 2, seed) * 3) / 3);
  const cz = Math.floor(z / 3);
  const k = Math.floor(hash3(cx, cy, cz, seed) * pal.length);
  return jit(pal[k], x, y, z, 0.07, seed);
}

// ---------------------------------------------------------------- humanoid
/**
 * Humanoid split in animatable parts. Origin = between the feet, facing +z.
 * opts: { faction, armor: null|'L'|'P', helmet: null|'L'|'P', backpack: bool, seed }
 * Returns { legL, legR, upper, hipY, hipX, gunPos } (geometries are cached).
 */
export function humanoid(opts) {
  const key = `hum:${opts.faction}:${opts.armor}:${opts.helmet}:${opts.backpack}:${opts.seed % 6}`;
  return cached(key, () => buildHumanoid(opts));
}

function buildHumanoid({ faction, armor, helmet, backpack, seed }) {
  const u = UNIFORMS[faction] ?? UNIFORMS.scav;
  const s = seed % 6;
  const skin = SKINS[s % SKINS.length];
  const scav = faction === 'scav';
  const top = scav ? [u.camo[s % u.camo.length]] : u.camo; // scavs: plain hoodie
  const pants = scav ? [0x3b4a66, 0x334058, 0x45526e] : u.camo;
  const cloth = (pal) => (x, y, z) => (pal.length === 1 ? jit(pal[0], x, y, z, 0.09, seed) : camo(pal, x, y, z, seed + 3));
  const glove = (x, y, z) => jit(u.glove ?? skin, x, y, z, 0.05);

  // ---- leg (pivot at hip) ----
  const leg = (mirror) => {
    const m = new VoxModel([-4, -18, -5], [4, 1, 6]);
    m.capsule([0, 0, 0], [0, -8, 0.8], 2.5, cloth(pants));
    m.capsule([0, -8, 0.8], [0, -14.2, -0.2], 2.0, cloth(pants));
    if (!scav) m.ellipsoid([0, -8, 2.6], [1.8, 1.4, 0.9], (x, y, z) => jit(u.vest, x, y, z, 0.06)); // knee pad
    m.box([-1, -17, -2], [1, -15, 3], (x, y, z) => jit(y === -17 ? 0x151210 : BOOT, x, y, z, 0.06));
    m.capsule([0, -15.5, 0], [0, -13.5, 0], 1.7, (x, y, z) => jit(BOOT, x, y, z, 0.06));
    if (scav) m.box([-2, -12, -2], [2, -12, 2], (x, y, z) => jit(0x2c3550, x, y, z, 0.05)); // jeans cuff
    void mirror;
    return m.toGeometry(SCALE_BODY, [0, 0, 0]);
  };

  // ---- upper body ----
  const m = new VoxModel([-9, 14, -10], [9, 38, 14]);
  const C = cloth(top);
  // pelvis + torso
  m.fill([-5, 15, -4], [5, 28, 4], (x, y, z) => {
    if (y <= 17) return Math.abs(x) <= 4 && Math.abs(z) <= 2.6 ? cloth(pants)(x, y, z) : null;
    const t = (y - 18) / 10;
    const hw = 3.5 + t * 1.6, hd = 2.5 + t * 0.6;
    if (Math.abs(x) > hw || Math.abs(z) > hd) return null;
    if (Math.abs(x) > hw - 1 && Math.abs(z) > hd - 1) return null;
    return C(x, y, z);
  });
  m.box([-4, 17, -3], [4, 17, 3], (x, y, z) => jit(0x2a2018, x, y, z, 0.05)); // belt
  m.box([-1, 17, 3], [1, 17, 3], 0x8a8478); // buckle
  // shoulders + arms (rifle pose)
  m.ellipsoid([5.0, 26.6, 0], [2.0, 1.9, 2.1], C);
  m.ellipsoid([-5.0, 26.6, 0], [2.0, 1.9, 2.1], C);
  m.capsule([5.3, 26, 0], [6.0, 21.8, 2.2], 1.6, C);
  m.capsule([6.0, 21.8, 2.2], [2.9, 20.6, 7.2], 1.35, C);
  m.capsule([-5.3, 26, 0], [-4.6, 22.4, 5.4], 1.6, C);
  m.capsule([-4.6, 22.4, 5.4], [-1.2, 21.6, 11.4], 1.35, C);
  m.ellipsoid([2.9, 20.6, 7.6], [1.5, 1.5, 1.6], glove);
  m.ellipsoid([-1.0, 21.4, 11.8], [1.5, 1.4, 1.6], glove);
  // faction armband
  m.capsule([5.7, 24.6, 0.6], [5.8, 23.6, 1.2], 1.75, (x, y, z) => jit(u.band, x, y, z, 0.05));
  m.capsule([-5.1, 24.6, 1.2], [-4.9, 23.6, 2.2], 1.75, (x, y, z) => jit(u.band, x, y, z, 0.05));

  // armor: plate carrier
  if (armor) {
    const vc = armor === 'P' ? shade(u.vest, 0.95) : shade(u.vest, 1.12);
    const V = (x, y, z) => jit(vc, x, y, z, 0.07, 9);
    m.box([-4, 19, 3], [4, 27, 4], V);
    m.box([-4, 19, -4], [4, 27, -3], V);
    m.box([-5, 19, -3], [-5, 25, 3], V);
    m.box([5, 19, -3], [5, 25, 3], V);
    // mag pouches + admin pouch
    for (const px of [-3, -1, 1, 3]) m.box([px - 0.5, 19, 5], [px + 0.5, 22, 5], (x, y, z) => jit(shade(vc, 0.82), x, y, z, 0.06));
    m.box([-2, 24, 5], [2, 26, 5], (x, y, z) => jit(shade(vc, 0.9), x, y, z, 0.06));
    if (armor === 'P') {
      m.box([-5, 26, -4], [5, 28, 4], (x, y, z) => (Math.abs(x) > 3 ? V(x, y, z) : null)); // shoulder pads
      m.box([-3, 16, 3], [3, 18, 4], V); // groin flap
    }
  }

  // neck + head
  m.cylinder(0, 0.2, 28, 30, 1.7, (x, y, z) => jit(skin, x, y, z, 0.04));
  m.ellipsoid([0, 32.2, 0.4], [3.0, 3.5, 3.2], (x, y, z) => {
    if (!helmet && y >= 33 && z <= 2 + (y - 33) * -0.5 + 1) return jit(scav ? 0x2a211b : 0x1f1a16, x, y, z, 0.08); // hair
    return jit(skin, x, y, z, 0.035);
  });
  // face details
  m.set(1, 32, 3, 0x1a1412);
  m.set(-1, 32, 3, 0x1a1412);
  m.set(0, 31, 4, shade(skin, 0.9));
  m.set(0, 29, 3, shade(skin, 0.75));
  m.set(1, 33, 3, shade(skin, 0.6));
  m.set(-1, 33, 3, shade(skin, 0.6));
  if (scav && s % 2 === 0) {
    // balaclava with eye slit
    m.ellipsoid([0, 32.2, 0.4], [3.15, 3.65, 3.35], (x, y, z) => (y === 32 && z > 1 ? null : jit(0x1c1c1c, x, y, z, 0.06)));
    m.set(1, 32, 4, null);
    m.set(-1, 32, 4, null);
  } else if (scav) {
    // beanie
    m.ellipsoid([0, 34.2, 0.2], [3.2, 2.2, 3.4], (x, y, z) => (y >= 34 ? jit(0x7a2f2a, x, y, z, 0.08) : null));
  }
  if (helmet) {
    const hc = helmet === 'P' ? shade(u.helmet, 0.85) : u.helmet;
    m.ellipsoid([0, 33.3, 0.1], [3.45, 2.9, 3.65], (x, y, z) => {
      if (y < 32.5) return null;
      if (z > 2.4 && y < 34) return null;
      return jit(hc, x, y, z, 0.06, 4);
    });
    m.box([-1, 34, 4], [1, 35, 4], 0x1a1a1a); // NVG mount
    if (helmet === 'P') m.box([-3, 33, 4], [3, 33, 4], (x, y, z) => jit(0x1d2a33, x, y, z, 0.04)); // visor edge
    m.box([3, 33, -1], [3, 34, 0], (x, y, z) => jit(u.band, x, y, z, 0.05)); // ID patch
    m.box([-3, 33, -1], [-3, 34, 0], (x, y, z) => jit(u.band, x, y, z, 0.05));
  }

  if (backpack) {
    const bc = scav ? 0x4a4436 : shade(u.vest, 1.1);
    m.fill([-4, 19, -7], [4, 27, -4], (x, y, z) => (Math.abs(x) === 4 && (y === 19 || y === 27 || z === -7) ? null : jit(bc, x, y, z, 0.07, 7)));
    m.box([-3, 20, -8], [3, 23, -8], (x, y, z) => jit(shade(bc, 0.85), x, y, z, 0.06));
    m.box([-3, 27, -6], [3, 28, -4], (x, y, z) => jit(shade(bc, 0.9), x, y, z, 0.06));
  }

  return {
    legL: leg(false),
    legR: leg(true),
    upper: m.toGeometry(SCALE_BODY, [0, 0, 0]),
    hipY: 17 * SCALE_BODY,
    hipX: 2.6 * SCALE_BODY,
    gunPos: [0.9 * SCALE_BODY, 21.6 * SCALE_BODY, 8.2 * SCALE_BODY],
  };
}

// ---------------------------------------------------------------- weapons (grip at origin, barrel +z)
export function weaponGeo(id) {
  return cached(`wpn:${id}`, () => {
    const m = new VoxModel([-3, -14, -24], [3, 8, 40]);
    const M = (x, y, z) => jit(METAL, x, y, z, 0.1, 2);
    const W = (x, y, z) => jit(WOOD, x, y, z, 0.1, 3);
    const P = (x, y, z) => jit(0x323438, x, y, z, 0.06, 5);
    if (id === 'k7') {
      m.box([-1, 0, -4], [1, 3, 11], M);
      m.box([0, 2, 11], [0, 2, 30], M);
      m.box([0, 4, 6], [0, 4, 18], M); // gas tube
      m.box([-1, 0, 11], [1, 3, 18], W); // handguard
      m.box([0, 3, 28], [0, 5, 28], M); // front sight
      m.box([0, 4, 4], [0, 5, 4], M); // rear sight
      m.fill([-1, -4, -20], [1, 3, -4], (x, y, z) => (y <= 2.5 + (z + 4) * 0.02 && y >= -1 - (z + 4) * -0.15 ? W(x, y, z) : null));
      m.box([-1, -6, -2], [0, -1, 0], P); // grip
      for (let r = 0; r < 9; r++) m.box([-1, -1 - r, 3 + Math.round(r * 0.45)], [1, -1 - r, 5 + Math.round(r * 0.45)], M); // curved mag
    } else if (id === 'vespa') {
      m.box([-1, 0, -3], [1, 3, 9], P);
      m.box([0, 2, 9], [0, 2, 15], M);
      m.box([-1, -1, 9], [1, 1, 13], P);
      m.box([0, 4, 0], [0, 4, 8], M); // rail
      m.box([-1, -6, -1], [0, -1, 1], P);
      m.box([-1, -10, 4], [0, -1, 5], M); // straight mag
      m.box([0, 1, -14], [0, 1, -3], M); // wire stock
      m.box([0, -3, -14], [0, 1, -14], M);
    } else if (id === 'trovao') {
      m.box([-1, 0, -3], [1, 3, 8], M);
      m.box([0, 2, 8], [0, 3, 34], M);
      m.box([0, 0, 8], [0, 1, 30], M); // tube
      m.box([-1, -1, 12], [1, 1, 19], W); // pump
      m.fill([-1, -5, -20], [1, 3, -3], (x, y, z) => (y <= 2 && y >= -2 - (z + 3) * -0.18 ? W(x, y, z) : null));
      m.box([-1, -5, -2], [0, -1, 0], W);
    } else {
      // p9 pistol
      m.box([-1, 0, -2], [1, 2, 8], P);
      m.box([0, 1, 8], [0, 1, 9], M);
      m.box([-1, -6, -2], [0, -1, 1], (x, y, z) => jit(0x2c2620, x, y, z, 0.08));
      m.box([0, -2, 1], [0, -1, 3], M); // trigger guard
    }
    return m.toGeometry(SCALE_ITEM, [0, 0, 0]);
  });
}

// ---------------------------------------------------------------- items (for icons and world)
export function itemGeo(id) {
  return cached(`item:${id}`, () => buildItem(id));
}

function buildItem(id) {
  if (['p9', 'vespa', 'k7', 'trovao'].includes(id)) return weaponGeo(id);
  const m = new VoxModel([-30, -2, -30], [30, 60, 30]);
  const J = (c, a = 0.08, s = 1) => (x, y, z) => jit(c, x, y, z, a, s);
  switch (id) {
    case 'a9':
    case 'a762':
    case 'a12': {
      const box = id === 'a762' ? 0x4f5a34 : id === 'a12' ? 0x8a2a24 : 0x9a7a4a;
      m.box([-8, 0, -6], [8, 6, 6], J(box));
      const tip = id === 'a12' ? 0xb8302a : 0xb06a3a;
      for (let x = -6; x <= 6; x += 3)
        for (let z = -4; z <= 4; z += 3) {
          m.box([x, 7, z], [x + 1, 9, z + 1], J(0xc8a24a, 0.1));
          m.box([x, 10, z], [x + 1, 10, z + 1], J(tip, 0.1));
        }
      if (id === 'a762') m.box([-8, 3, 7], [-2, 4, 7], 0xd8c890);
      break;
    }
    case 'coleteL':
    case 'coleteP': {
      const c = id === 'coleteP' ? 0x4a5430 : 0x8a7a58;
      m.box([-10, 0, -2], [10, 26, 2], J(c, 0.08));
      m.box([-6, 20, -2], [6, 26, 2], null);
      m.box([-10, 26, -2], [-6, 30, 2], J(shade(c, 0.85)));
      m.box([6, 26, -2], [10, 30, 2], J(shade(c, 0.85)));
      for (const px of [-7, -3, 1, 5]) m.box([px, 2, 3], [px + 2, 9, 4], J(shade(c, 0.8)));
      m.box([-5, 12, 3], [5, 17, 3], J(shade(c, 0.9)));
      if (id === 'coleteP') {
        m.box([-12, 2, -2], [-11, 18, 2], J(shade(c, 0.8)));
        m.box([11, 2, -2], [12, 18, 2], J(shade(c, 0.8)));
      }
      break;
    }
    case 'capaceteL':
    case 'capaceteP': {
      const c = id === 'capaceteP' ? 0x3a4228 : 0x55603a;
      m.ellipsoid([0, 2, 0], [11, 11, 12], (x, y, z) => (y >= 2 ? jit(c, x, y, z, 0.07) : null));
      m.box([-2, 8, 11], [2, 10, 12], 0x1a1a1a);
      if (id === 'capaceteP') m.box([-9, 3, 9], [9, 4, 12], J(0x1d2a33, 0.04));
      break;
    }
    case 'mochilaP':
    case 'mochilaM':
    case 'mochilaT': {
      const c = id === 'mochilaT' ? 0x4f5a34 : id === 'mochilaM' ? 0x5a4a36 : 0x3b4252;
      const h = id === 'mochilaT' ? 30 : id === 'mochilaM' ? 26 : 20;
      m.box([-10, 0, -6], [10, h, 6], J(c, 0.08, 2));
      m.box([-8, 3, 7], [8, h * 0.5, 9], J(shade(c, 0.85), 0.07));
      m.box([-12, 3, -4], [-11, h - 6, 4], J(shade(c, 0.88)));
      m.box([11, 3, -4], [12, h - 6, 4], J(shade(c, 0.88)));
      m.box([-10, h + 1, -6], [10, h + 2, 4], J(shade(c, 0.9)));
      for (let y = 6; y < h; y += 4) m.box([-10, y, 7], [10, y, 7], null);
      break;
    }
    case 'bandagem':
      m.cylinder(0, 0, 0, 10, 6, J(0xeeeae0, 0.05));
      m.cylinder(0, 0, 0, 10, 2, null);
      break;
    case 'medkit':
      m.box([-14, 0, -6], [14, 14, 6], J(0xb8302a, 0.06));
      m.box([-2, 2, 7], [2, 12, 7], 0xf4f0e8);
      m.box([-6, 5, 7], [6, 9, 7], 0xf4f0e8);
      m.box([-4, 15, -1], [4, 16, 1], J(0x2a2a2a));
      break;
    case 'cobre':
      m.cylinder(0, 0, 0, 2, 9, J(0x3a2a20));
      m.cylinder(0, 0, 3, 10, 7, (x, y, z) => jit(0xc87533, x, y, z, 0.18));
      m.cylinder(0, 0, 11, 12, 9, J(0x3a2a20));
      break;
    case 'circuito':
      m.box([-10, 0, -8], [10, 1, 8], J(0x2f6b3a, 0.08));
      m.box([-6, 2, -4], [-1, 3, 1], 0x1a1a1a);
      m.box([2, 2, 2], [6, 3, 5], 0x1a1a1a);
      m.box([3, 2, -6], [4, 4, -3], 0xc8a24a);
      break;
    case 'bateria':
      m.box([-6, 0, -5], [6, 24, 5], J(0x4a5040, 0.06));
      m.box([-4, 25, -2], [-2, 27, 0], 0xb8302a);
      m.box([2, 25, -2], [4, 27, 0], 0x2a2a2a);
      m.box([-6, 10, 6], [6, 14, 6], 0xd8c890);
      break;
    case 'hd':
      m.box([-12, 0, -8], [12, 4, 8], J(0x9aa0a8, 0.05));
      m.cylinder(-2, 0, 5, 5, 5, J(0x6a7078, 0.04));
      break;
    case 'relogio':
      m.cylinder(0, 0, 0, 3, 7, J(0xd4a83a, 0.1));
      m.cylinder(0, 0, 4, 4, 5, J(0xf0ead8, 0.03));
      m.box([0, 5, 0], [0, 5, 3], 0x1a1a1a);
      m.box([-12, 0, -2], [-8, 1, 2], J(0x6b3f2a));
      m.box([8, 0, -2], [12, 1, 2], J(0x6b3f2a));
      break;
    case 'combustivel':
      m.box([-10, 0, -6], [10, 26, 6], J(0xb8302a, 0.07));
      m.box([-10, 27, -3], [10, 29, 3], J(0x8a2420));
      m.box([4, 30, -1], [7, 33, 1], J(0x2a2a2a));
      m.box([-8, 4, 7], [8, 22, 7], (x, y, z) => ((x + y) % 6 === 0 ? 0x8a2420 : null));
      break;
    case 'ferramentas':
      m.box([-14, 0, -7], [14, 12, 7], J(0xc0392b, 0.06));
      m.box([-14, 12, -7], [14, 13, 7], J(0x8a2420));
      m.box([-5, 14, -1], [5, 16, 1], J(0x2a2a2a));
      m.box([-2, 6, 8], [2, 8, 8], 0xd0d0d0);
      break;
    case 'pendrive':
      m.box([-3, 0, -8], [3, 2, 4], J(0x2a4a7a, 0.06));
      m.box([-2, 0, 5], [2, 2, 8], J(0xb0b4b8, 0.04));
      break;
    default:
      m.box([-5, 0, -5], [5, 10, 5], 0xff00ff);
  }
  return m.toGeometry(SCALE_ITEM, [0, 0, 0]);
}

// ---------------------------------------------------------------- world props (pivot = footprint center, y=0 ground)
export function crateGeo(tier) {
  return cached(`crate:${tier}`, () => {
    const m = new VoxModel([-10, 0, -10], [10, 18, 10]);
    if (tier === 'rare') {
      m.box([-9, 0, -7], [9, 12, 7], (x, y, z) => jit(0x2e3136, x, y, z, 0.06));
      m.box([-9, 6, -7], [9, 6, 7], 0xd4a83a);
      m.box([-2, 8, 8], [2, 10, 8], 0xd4a83a);
    } else if (tier === 'military') {
      m.box([-9, 0, -7], [9, 11, 7], (x, y, z) => jit(0x4f5a34, x, y, z, 0.07));
      m.box([-9, 11, -7], [9, 12, 7], (x, y, z) => jit(0x3d4628, x, y, z, 0.05));
      m.box([-6, 4, 8], [6, 6, 8], (x) => (x % 3 ? 0xd8c890 : null));
      m.box([-10, 3, -2], [-10, 5, 2], 0x2a2a2a);
      m.box([10, 3, -2], [10, 5, 2], 0x2a2a2a);
    } else {
      m.box([-9, 0, -9], [9, 16, 9], (x, y, z) => {
        const plank = Math.floor(y / 4);
        const edge = Math.abs(x) === 9 && Math.abs(z) === 9;
        return jit(edge ? 0x6b4325 : (y % 4 === 0 ? 0x7d5530 : 0x9a6a3c), x + plank * 7, y, z, 0.1);
      });
    }
    return m.toGeometry(SCALE_BODY, [0, 0, 0]);
  });
}

export function rockGeo(v) {
  return cached(`rock:${v}`, () => {
    const m = new VoxModel([-12, 0, -12], [12, 24, 12]);
    const h = 8 + v * 4;
    m.ellipsoid([0, 2, 0], [10, h, 9], (x, y, z) => {
      const n = hash3(x >> 1, y >> 1, z >> 1, v);
      if (n < 0.08 && y > 4) return null;
      const moss = y > h - 2 && hash3(x, y, z, 9) > 0.4;
      return jit(moss ? 0x5f7a3a : 0x7d7a80, x, y, z, 0.14, v);
    });
    m.ellipsoid([5, 2, 4], [5, 5 + v, 5], (x, y, z) => jit(0x6f6c72, x, y, z, 0.12, v + 2));
    return m.toGeometry(SCALE_BODY, [0, 0, 0]);
  });
}

export function treeGeo(v) {
  return cached(`tree:${v}`, () => {
    const m = new VoxModel([-16, 0, -16], [16, 50, 16]);
    const bark = (x, y, z) => jit(0x4a3424, x, y, z, 0.15, v);
    if (v % 2 === 0) {
      // conifer: stacked cones
      m.cylinder(0, 0, 0, 34, 1.3, bark);
      for (let i = 0; i < 5; i++) {
        const y0 = 8 + i * 6, r = 9 - i * 1.5;
        m.fill([-11, y0, -11], [11, y0 + 8, 11], (x, y, z) => {
          const rr = r * (1 - (y - y0) / 9);
          const d = Math.hypot(x, z) + hash3(x, y, z, v) * 1.6;
          if (d > rr) return null;
          const g = hash3(x, y, z, v + 1) > 0.5 ? 0x2f4a2a : 0x3a5a30;
          return jit(g, x, y, z, 0.12);
        });
      }
    } else {
      // broadleaf: trunk + clumped canopy
      m.cylinder(0, 0, 0, 16, 1.6, bark);
      m.capsule([0, 12, 0], [5, 19, 2], 1, bark);
      m.capsule([0, 13, 0], [-4, 20, -3], 1, bark);
      const clumps = [[0, 22, 0, 7], [5, 20, 2, 5], [-5, 21, -3, 5.5], [2, 26, -2, 5], [-3, 19, 4, 4.5]];
      for (const [cx, cy, cz, r] of clumps)
        m.ellipsoid([cx, cy, cz], [r, r * 0.8, r], (x, y, z) => {
          if (hash3(x, y, z, v + 5) < 0.12) return null;
          const lit = y > cy + r * 0.3;
          return jit(lit ? 0x5d8a3a : 0x46703a, x, y, z, 0.14, v);
        });
    }
    return m.toGeometry(SCALE_TREE, [0, 0, 0]);
  });
}

export function grassGeo(v) {
  return cached(`grass:${v}`, () => {
    const m = new VoxModel([-4, 0, -4], [4, 8, 4]);
    const n = 4 + v;
    for (let i = 0; i < n; i++) {
      const x = Math.round((hash3(i, v, 1) - 0.5) * 6), z = Math.round((hash3(i, v, 2) - 0.5) * 6);
      const h = 1 + Math.floor(hash3(i, v, 3) * 3);
      for (let y = 0; y < h; y++) m.set(x, y, z, jit(y === h - 1 ? 0x76a048 : 0x5a8638, x, y, z, 0.12));
    }
    if (v === 3) m.set(0, 3, 0, 0xe8d24a); // flower
    return m.toGeometry(SCALE_GRASS, [0, 0, 0]);
  });
}

export function sandbagGeo() {
  return cached('sandbag', () => {
    const m = new VoxModel([-11, 0, -10], [11, 20, 10]);
    for (let row = 0; row < 3; row++)
      for (let i = -1; i <= 1; i++) {
        const off = row % 2 ? 3 : 0;
        m.ellipsoid([i * 7 + off - 1, row * 5 + 2.5, 0], [3.8, 2.8, 6], (x, y, z) => jit(0xb89a6a, x, y, z, 0.1, row));
      }
    return m.toGeometry(SCALE_BODY, [0, 0, 0]);
  });
}

export function carGeo(v) {
  return cached(`car:${v}`, () => {
    const m = new VoxModel([-20, 0, -44], [20, 32, 44]);
    const paint = [0x6a7a5a, 0x7a3a2a, 0x3a4a6a, 0x8a8a80][v % 4];
    const rust = (x, y, z) => (hash3(x >> 1, y >> 1, z >> 1, v) > 0.72 ? jit(0x6a3a1e, x, y, z, 0.2) : jit(paint, x, y, z, 0.1, v));
    m.box([-17, 5, -40], [17, 15, 40], rust); // body
    m.fill([-15, 16, -16], [15, 27, 18], (x, y, z) => {
      const inset = Math.floor((y - 16) / 3);
      if (z < -16 + inset * 2 || z > 18 - inset * 3) return null;
      if (Math.abs(x) > 15 - Math.floor(inset / 2)) return null;
      if (y > 17 && y < 26 && (Math.abs(x) >= 14 - inset / 2 || z <= -15 + inset * 2 || z >= 17 - inset * 3)) {
        return hash3(x, y, z, 2) > 0.25 ? jit(0x2a3a44, x, y, z, 0.15) : null; // broken glass
      }
      return rust(x, y, z);
    });
    m.box([-14, 16, -16], [14, 25, 18], (x, y, z) => (Math.abs(x) < 13 && y < 25 ? jit(0x1a1716, x, y, z, 0.2) : undefined));
    for (const [wx, wz] of [[-16, -26], [16, -26], [-16, 26], [16, 26]]) {
      m.fill([wx - 2, 0, wz - 7], [wx + 2, 13, wz + 7], (x, y, z) => {
        const d = Math.hypot(y - 6.5, z - wz);
        if (d > 6.5) return null;
        return d < 3 ? jit(0x5a5a5a, x, y, z, 0.1) : jit(0x1a1a1a, x, y, z, 0.1);
      });
    }
    m.box([-12, 9, 41], [-8, 11, 41], 0xd8d0a0); // headlights
    m.box([8, 9, 41], [12, 11, 41], 0xd8d0a0);
    m.box([-17, 5, 41], [17, 7, 42], (x, y, z) => jit(0x3a3a3a, x, y, z, 0.1));
    return m.toGeometry(SCALE_BODY, [0, 0, 0]);
  });
}

/** Transport helicopter (no rotors — those are separate meshes). Nose +z. */
export function heliGeo(color) {
  return cached(`heli:${color}`, () => {
    const m = new VoxModel([-26, 0, -110], [26, 60, 70]);
    const P = (x, y, z) => jit(color, x, y, z, 0.07, 3);
    const D = (x, y, z) => jit(shade(color, 0.7), x, y, z, 0.06);
    // fuselage (rounded)
    m.fill([-20, 8, -40], [20, 46, 60], (x, y, z) => {
      const cy = 26, ry = 18, rx = 19;
      let k = 1;
      if (z > 30) k = 1 - ((z - 30) / 32) ** 2;
      if (z < -20) k = 1 - ((-20 - z) / 26) * 0.5;
      const dx = x / (rx * k), dy = (y - cy) / (ry * Math.max(0.4, k));
      if (dx * dx + dy * dy > 1) return null;
      if (z > 34 && y > 24 && dx * dx + dy * dy > 0.55) return jit(0x2a3e4c, x, y, z, 0.12); // cockpit glass
      if (Math.abs(x) > 15 && y > 22 && y < 32 && z > -10 && z < 18) return jit(0x2a3e4c, x, y, z, 0.12); // side windows
      return P(x, y, z);
    });
    // side door (dark) + stripe
    m.box([-21, 12, -6], [-19, 30, 20], (x, y, z) => (z === -6 || z === 20 || y === 12 ? D(x, y, z) : undefined));
    m.box([-21, 20, -40], [21, 21, 30], (x, y, z) => (m.solid(x, y, z) && Math.abs(x) > 17 ? jit(0xf0e8d8, x, y, z, 0.03) : undefined));
    // tail boom
    m.capsule([0, 32, -40], [0, 36, -100], 5, P);
    m.box([-1, 36, -106], [1, 56, -96], P); // fin
    m.box([-10, 34, -100], [10, 36, -94], P); // stabilizer
    // engine housing + mast
    m.box([-9, 44, -24], [9, 50, 16], D);
    m.cylinder(0, -4, 50, 55, 2.5, (x, y, z) => jit(0x2a2a2a, x, y, z, 0.05));
    // skids
    for (const sx of [-16, 16]) {
      m.box([sx - 1, 0, -30], [sx + 1, 2, 40], (x, y, z) => jit(0x232323, x, y, z, 0.05));
      for (const sz of [-18, 22]) m.box([sx - 1, 2, sz - 1], [sx + 1, 10, sz + 1], (x, y, z) => jit(0x232323, x, y, z, 0.05));
    }
    return m.toGeometry(SCALE_BODY, [0, 0, 0]);
  });
}

export function rotorGeo(len) {
  return cached(`rotor:${len}`, () => {
    const m = new VoxModel([-len, -1, -3], [len, 1, 3]);
    m.box([-len, 0, -2], [len, 0, 2], (x, y, z) => jit(Math.abs(x) > len - 6 ? 0xd8c890 : 0x1c1c1c, x, y, z, 0.05));
    m.box([-3, -1, -3], [3, 1, 3], 0x2a2a2a);
    return m.toGeometry(SCALE_BODY, [0, 0, 0]);
  });
}
