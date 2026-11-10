import * as THREE from 'three';

const FILLED = 0x1000000;

// Face definitions: normal, and the 4 corners as (u,v) unit offsets in the face plane.
const FACES = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1] },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0] },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0] },
];
const AO_CURVE = [0.5, 0.68, 0.84, 1.0];

/** Deterministic hash -> [0,1) for voxel coordinates. */
export function hash3(x, y, z, s = 0) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647 + s * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Multiply a 0xRRGGBB color by k (clamped). */
export function shade(hex, k) {
  const r = Math.min(255, Math.round(((hex >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((hex >> 8) & 255) * k));
  const b = Math.min(255, Math.round((hex & 255) * k));
  return (r << 16) | (g << 8) | b;
}

/** Color with small per-voxel brightness noise — this is what makes the tiny cubes readable. */
export function jit(hex, x, y, z, amt = 0.08, s = 0) {
  return shade(hex, 1 - amt + hash3(x, y, z, s) * amt * 2);
}

export const hex = (s) => parseInt(s.replace('#', ''), 16);

/**
 * Sparse-bounded voxel model. Coordinates may be negative (min..max inclusive).
 * Builds a face-culled BufferGeometry with per-vertex ambient occlusion and vertex colors.
 */
export class VoxModel {
  constructor(min, max) {
    this.min = min;
    this.sx = max[0] - min[0] + 1;
    this.sy = max[1] - min[1] + 1;
    this.sz = max[2] - min[2] + 1;
    this.data = new Uint32Array(this.sx * this.sy * this.sz);
  }

  idx(x, y, z) {
    x -= this.min[0];
    y -= this.min[1];
    z -= this.min[2];
    if (x < 0 || y < 0 || z < 0 || x >= this.sx || y >= this.sy || z >= this.sz) return -1;
    return (y * this.sz + z) * this.sx + x;
  }

  set(x, y, z, color) {
    const i = this.idx(x, y, z);
    if (i >= 0) this.data[i] = color === null ? 0 : (color & 0xffffff) | FILLED;
  }

  solid(x, y, z) {
    const i = this.idx(x, y, z);
    return i >= 0 && this.data[i] !== 0;
  }

  /** Fill every voxel in [a,b] for which fn returns a color (number) — or null/undefined to skip. */
  fill(a, b, fn) {
    for (let y = Math.ceil(a[1]); y <= b[1]; y++)
      for (let z = Math.ceil(a[2]); z <= b[2]; z++)
        for (let x = Math.ceil(a[0]); x <= b[0]; x++) {
          const c = fn(x, y, z);
          if (c !== null && c !== undefined && c !== false) this.set(x, y, z, c);
        }
  }

  box(a, b, color) {
    this.fill(a, b, typeof color === 'function' ? color : () => color);
  }

  ellipsoid(c, r, color) {
    const fn = typeof color === 'function' ? color : () => color;
    this.fill(
      [Math.floor(c[0] - r[0]), Math.floor(c[1] - r[1]), Math.floor(c[2] - r[2])],
      [Math.ceil(c[0] + r[0]), Math.ceil(c[1] + r[1]), Math.ceil(c[2] + r[2])],
      (x, y, z) => {
        const dx = (x - c[0]) / r[0], dy = (y - c[1]) / r[1], dz = (z - c[2]) / r[2];
        return dx * dx + dy * dy + dz * dz <= 1 ? fn(x, y, z) : null;
      },
    );
  }

  /** Capsule between points a and b with radius r (voxel units). */
  capsule(a, b, r, color) {
    const fn = typeof color === 'function' ? color : () => color;
    const lo = [0, 1, 2].map((i) => Math.floor(Math.min(a[i], b[i]) - r));
    const hi = [0, 1, 2].map((i) => Math.ceil(Math.max(a[i], b[i]) + r));
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const len2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1;
    this.fill(lo, hi, (x, y, z) => {
      const ap = [x - a[0], y - a[1], z - a[2]];
      const t = Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / len2));
      const d2 = (ap[0] - ab[0] * t) ** 2 + (ap[1] - ab[1] * t) ** 2 + (ap[2] - ab[2] * t) ** 2;
      return d2 <= r * r ? fn(x, y, z, t) : null;
    });
  }

  /** Vertical cylinder. */
  cylinder(cx, cz, y0, y1, r, color) {
    const fn = typeof color === 'function' ? color : () => color;
    this.fill([Math.floor(cx - r), y0, Math.floor(cz - r)], [Math.ceil(cx + r), y1, Math.ceil(cz + r)], (x, y, z) =>
      (x - cx) ** 2 + (z - cz) ** 2 <= r * r ? fn(x, y, z) : null,
    );
  }

  /**
   * @param scale size of one voxel in world units
   * @param pivot voxel-space point that becomes the geometry origin
   */
  toGeometry(scale, pivot = [0, 0, 0]) {
    const pos = [], nor = [], col = [], ind = [];
    const { sx, sy, sz, min } = this;
    const c = new THREE.Color();
    let vcount = 0;
    for (let y = 0; y < sy; y++)
      for (let z = 0; z < sz; z++)
        for (let x = 0; x < sx; x++) {
          const v = this.data[(y * sz + z) * sx + x];
          if (!v) continue;
          const wx = x + min[0], wy = y + min[1], wz = z + min[2];
          c.setHex(v & 0xffffff, THREE.SRGBColorSpace);
          for (const f of FACES) {
            const [nx, ny, nz] = f.n;
            if (this.solid(wx + nx, wy + ny, wz + nz)) continue;
            // face base corner (the face lies on the +n side when n positive)
            const ox = wx + (nx > 0 ? 1 : 0), oy = wy + (ny > 0 ? 1 : 0), oz = wz + (nz > 0 ? 1 : 0);
            const ao = [];
            const corners = [[0, 0], [1, 0], [1, 1], [0, 1]];
            for (const [cu, cv] of corners) {
              const su = cu ? 1 : -1, sv = cv ? 1 : -1;
              const ux = f.u[0] * su, uy = f.u[1] * su, uz = f.u[2] * su;
              const vx = f.v[0] * sv, vy = f.v[1] * sv, vz = f.v[2] * sv;
              const bx = wx + nx, by = wy + ny, bz = wz + nz;
              const s1 = this.solid(bx + ux, by + uy, bz + uz) ? 1 : 0;
              const s2 = this.solid(bx + vx, by + vy, bz + vz) ? 1 : 0;
              const cc = this.solid(bx + ux + vx, by + uy + vy, bz + uz + vz) ? 1 : 0;
              const lvl = s1 && s2 ? 0 : 3 - (s1 + s2 + cc);
              ao.push(AO_CURVE[lvl]);
              const px = ox + f.u[0] * cu + f.v[0] * cv;
              const py = oy + f.u[1] * cu + f.v[1] * cv;
              const pz = oz + f.u[2] * cu + f.v[2] * cv;
              pos.push((px - pivot[0]) * scale, (py - pivot[1]) * scale, (pz - pivot[2]) * scale);
              nor.push(nx, ny, nz);
              col.push(c.r * AO_CURVE[lvl], c.g * AO_CURVE[lvl], c.b * AO_CURVE[lvl]);
            }
            // flip the diagonal to avoid AO anisotropy
            if (ao[0] + ao[2] < ao[1] + ao[3]) ind.push(vcount + 1, vcount + 2, vcount + 3, vcount + 1, vcount + 3, vcount);
            else ind.push(vcount, vcount + 1, vcount + 2, vcount, vcount + 2, vcount + 3);
            vcount += 4;
          }
        }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(vcount > 65535 ? new THREE.Uint32BufferAttribute(ind, 1) : new THREE.Uint16BufferAttribute(ind, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** Shared material for all vertex-colored voxel geometry. */
export const VOX_MATERIAL = new THREE.MeshLambertMaterial({ vertexColors: true });
