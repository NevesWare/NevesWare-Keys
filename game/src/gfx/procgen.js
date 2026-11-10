import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/*
 * Procedural material kit (no image files): every texture is painted on a
 * canvas from noise, and a matching normal map is derived from a height field
 * so surfaces catch the light (planks, corrugated metal, straw, soil).
 */

let s0 = 1;
const rnd = () => ((s0 = (s0 * 16807) % 2147483647) / 2147483647);
const cache = new Map();
const once = (k, f) => (cache.has(k) ? cache.get(k) : (cache.set(k, f()), cache.get(k)));

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}
function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Tileable value noise on a W×H grid, `cells` lattice cells across. */
function noiseField(W, H, cells, seed, octaves = 4) {
  const out = new Float32Array(W * H);
  let amp = 1, total = 0;
  for (let o = 0; o < octaves; o++) {
    const n = cells << o;
    const lat = new Float32Array(n * n);
    s0 = seed * 97 + o * 13 + 1;
    for (let i = 0; i < lat.length; i++) lat[i] = rnd();
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const fx = (x / W) * n, fy = (y / H) * n;
        const ix = Math.floor(fx), iy = Math.floor(fy);
        let tx = fx - ix, ty = fy - iy;
        tx = tx * tx * (3 - 2 * tx);
        ty = ty * ty * (3 - 2 * ty);
        const a = lat[(iy % n) * n + (ix % n)], b = lat[(iy % n) * n + ((ix + 1) % n)];
        const c = lat[((iy + 1) % n) * n + (ix % n)], d = lat[((iy + 1) % n) * n + ((ix + 1) % n)];
        out[y * W + x] += ((a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty) * amp;
      }
    total += amp;
    amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

/** Normal map (OpenGL convention) from a height field in [0,1]. */
function normalMap(h, W, H, strength = 2) {
  const [c, g] = canvas(W, H);
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const l = h[y * W + ((x - 1 + W) % W)], r = h[y * W + ((x + 1) % W)];
      const u = h[((y - 1 + H) % H) * W + x], d = h[((y + 1) % H) * W + x];
      let nx = (l - r) * strength, ny = (d - u) * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * W + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  return tex(c, false);
}

/** Paints `rgb(h)` per pixel from a height/noise field. */
function paint(W, H, fn) {
  const [c, g] = canvas(W, H);
  const img = g.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const [r, gg, b] = fn(x, y);
      const i = (y * W + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = gg;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  g.putImageData(img, 0, 0);
  return [c, g];
}

const mix = (a, b, t) => a + (b - a) * t;
const mixC = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

/** Weathered vertical board siding (dark shacks), with knots and gaps. */
export function planks({ base = [74, 62, 50], board = 0.2 } = {}) {
  return once(`planks${base}`, () => {
    const W = 256, H = 256;
    const n = noiseField(W, H, 4, 3, 4), grain = noiseField(W, H, 2, 9, 3);
    const h = new Float32Array(W * H);
    const boards = Math.round(1 / board);
    const bw = W / boards;
    const tint = [];
    s0 = 77;
    for (let i = 0; i < boards; i++) tint.push(0.75 + rnd() * 0.45);
    const [c] = paint(W, H, (x, y) => {
      const bi = Math.floor(x / bw), bx = (x % bw) / bw;
      const gap = bx < 0.04 || bx > 0.96;
      const streak = grain[(y >> 2) * W + ((x * 7) % W)];
      const v = (0.55 + n[y * W + x] * 0.5 + (streak - 0.5) * 0.5) * tint[bi];
      h[y * W + x] = gap ? 0 : 0.6 + streak * 0.3;
      let col = [base[0] * v, base[1] * v, base[2] * v];
      if (gap) col = [18, 14, 10];
      // grey weathering near the bottom
      col = mixC(col, [118, 112, 100], Math.max(0, (y / H - 0.65)) * 0.9 * n[x]);
      return col;
    });
    return { map: tex(c), normalMap: normalMap(h, W, H, 3) };
  });
}

/** Corrugated metal sheet: ridges along U, rust blotches and streaks. */
export function corrugated({ paintCol = [96, 104, 108], rust = 0.5 } = {}) {
  return once(`corr${paintCol}${rust}`, () => {
    const W = 256, H = 256;
    const n = noiseField(W, H, 4, 21, 5);
    const h = new Float32Array(W * H);
    const [c] = paint(W, H, (x, y) => {
      const ridge = 0.5 + 0.5 * Math.sin((x / W) * Math.PI * 2 * 12);
      h[y * W + x] = ridge;
      const r = Math.max(0, n[y * W + x] - (1 - rust) * 0.7) * 2.2 + Math.max(0, (y / H) - 0.7) * rust;
      let col = mixC(paintCol, [120, 62, 30], Math.min(1, r));
      const shade = 0.75 + ridge * 0.35;
      return [col[0] * shade, col[1] * shade, col[2] * shade];
    });
    return { map: tex(c), normalMap: normalMap(h, W, H, 5) };
  });
}

/** Straw for hay bales: fine fibers. */
export function straw() {
  return once('straw', () => {
    const W = 256, H = 256;
    const n = noiseField(W, H, 8, 41, 4);
    const h = new Float32Array(W * H);
    const [c, g] = paint(W, H, (x, y) => {
      const v = n[y * W + x];
      h[y * W + x] = v;
      return mixC([150, 126, 70], [196, 172, 108], v);
    });
    s0 = 5;
    for (let i = 0; i < 1400; i++) {
      const x = rnd() * W, y = rnd() * H, a = (rnd() - 0.5) * 0.6, l = 6 + rnd() * 14;
      g.strokeStyle = rnd() < 0.5 ? 'rgba(90,70,36,0.5)' : 'rgba(230,210,150,0.45)';
      g.lineWidth = 1;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      g.stroke();
    }
    return { map: tex(c), normalMap: normalMap(h, W, H, 4) };
  });
}

/** Ground detail normal map (soil relief) for the terrain. */
export function groundRelief() {
  return once('groundN', () => {
    const W = 256;
    const h = noiseField(W, W, 8, 61, 5);
    return normalMap(h, W, W, 6);
  });
}

/** Generic rough bark. */
export function bark() {
  return once('barkN', () => {
    const W = 128, H = 256;
    const n = noiseField(W, H, 4, 71, 4);
    const h = new Float32Array(W * H);
    const [c] = paint(W, H, (x, y) => {
      const f = 0.5 + 0.5 * Math.sin((x / W) * Math.PI * 2 * 7 + n[y * W + x] * 6);
      h[y * W + x] = f;
      return mixC([46, 36, 28], [104, 88, 70], f * 0.8 + n[y * W + x] * 0.2);
    });
    return { map: tex(c), normalMap: normalMap(h, W, H, 4) };
  });
}

// ---------------------------------------------------------------- materials
const mats = new Map();
const M = (k, f) => (mats.has(k) ? mats.get(k) : (mats.set(k, f()), mats.get(k)));

export function shackWallMaterial(v = 0) {
  const bases = [[74, 62, 50], [62, 58, 52], [88, 70, 52]];
  return M(`wall${v}`, () => {
    const t = planks({ base: bases[v % 3] });
    return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: 0.92 });
  });
}

export function roofMaterial(v = 0) {
  const cols = [[96, 104, 108], [92, 70, 60], [80, 88, 78]];
  return M(`roof${v}`, () => {
    const t = corrugated({ paintCol: cols[v % 3], rust: 0.35 + (v % 3) * 0.2 });
    return new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: 0.6, metalness: 0.45, side: THREE.DoubleSide });
  });
}

/**
 * Gable roof over a building footprint (meters). Corrugated sheets, a ridge
 * cap and an overhang. Returns a mesh whose geometry starts at the eaves (y = 0).
 */
export function roofMesh(w, d, v = 0) {
  const over = 0.35, rise = Math.min(1.4, 0.35 * Math.min(w, d));
  const alongX = w >= d; // ridge runs along the long side
  const L = (alongX ? w : d) + over * 2, S = (alongX ? d : w) / 2 + over;
  const slope = Math.hypot(S, rise);
  const parts = [];
  for (const side of [-1, 1]) {
    const p = new THREE.PlaneGeometry(L, slope);
    p.rotateX(-Math.PI / 2);
    p.rotateX(side * Math.atan2(rise, S));
    p.translate(0, rise / 2, (side * S) / 2);
    const uv = p.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * L * 0.6, uv.getY(i) * slope * 0.6);
    parts.push(p);
  }
  const geo = mergeGeometries(parts);
  if (!alongX) geo.rotateY(Math.PI / 2);
  const g = new THREE.Group();
  const roof = new THREE.Mesh(geo, roofMaterial(v));
  roof.castShadow = roof.receiveShadow = true;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(alongX ? L : 0.22, 0.08, alongX ? 0.22 : L), M('cap', () => new THREE.MeshStandardMaterial({ color: '#3c3a36', roughness: 0.5, metalness: 0.6 })));
  cap.position.y = rise + 0.02;
  cap.castShadow = true;
  // gable end boards
  const tri = new THREE.Shape();
  const half = (alongX ? d : w) / 2;
  tri.moveTo(-half, 0);
  tri.lineTo(half, 0);
  tri.lineTo(0, rise);
  const tg = new THREE.ShapeGeometry(tri);
  for (const s of [-1, 1]) {
    const m = new THREE.Mesh(tg, shackWallMaterial(v));
    if (alongX) {
      m.rotation.y = Math.PI / 2;
      m.position.x = (s * (alongX ? w : d)) / 2;
    } else m.position.z = (s * d) / 2;
    m.material.side = THREE.DoubleSide;
    g.add(m);
  }
  g.add(roof, cap);
  return g;
}

// ---------------------------------------------------------------- props (instanced geometry + material)
function finish(geo) {
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  return geo;
}

/** Round hay bale lying on its side (1.2 m). */
export function hayBale() {
  return M('hay', () => {
    const t = straw();
    const g = new THREE.CylinderGeometry(0.62, 0.62, 1.15, 24, 3);
    g.rotateZ(Math.PI / 2);
    // bulge the barrel slightly
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const k = 1 + 0.05 * (1 - (x / 0.58) ** 2);
      p.setXYZ(i, x, y * k, z * k);
    }
    g.translate(0, 0.6, 0);
    return { geometry: finish(g), material: new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: 0.95, color: '#d8ccb0' }) };
  });
}

export function tyre() {
  return M('tyre', () => {
    const g = new THREE.TorusGeometry(0.3, 0.12, 10, 24);
    g.rotateX(Math.PI / 2);
    g.translate(0, 0.12, 0);
    return { geometry: finish(g), material: new THREE.MeshStandardMaterial({ color: '#1b1b1a', roughness: 0.88 }) };
  });
}

export function jerrycan() {
  return M('jerry', () => {
    const parts = [new THREE.BoxGeometry(0.17, 0.42, 0.34).translate(0, 0.21, 0), new THREE.BoxGeometry(0.06, 0.05, 0.22).translate(0, 0.45, -0.02), new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8).translate(0, 0.45, 0.12)];
    return { geometry: finish(mergeGeometries(parts)), material: new THREE.MeshStandardMaterial({ color: '#3e4a2a', roughness: 0.55, metalness: 0.35 }) };
  });
}

export function propane() {
  return M('propane', () => {
    const g = mergeGeometries([new THREE.CapsuleGeometry(0.16, 0.42, 4, 12).translate(0, 0.37, 0), new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8).translate(0, 0.78, 0)]);
    return { geometry: finish(g), material: new THREE.MeshStandardMaterial({ color: '#8a2c22', roughness: 0.45, metalness: 0.4 }) };
  });
}

export function logGeo() {
  return M('log', () => {
    const t = bark();
    const g = new THREE.CylinderGeometry(0.22, 0.28, 4.2, 10, 4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setX(i, p.getX(i) * (1 + Math.sin(y * 3) * 0.06));
      p.setZ(i, p.getZ(i) * (1 + Math.cos(y * 2.3) * 0.06));
    }
    g.rotateZ(Math.PI / 2);
    g.translate(0, 0.24, 0);
    return { geometry: finish(g), material: new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normalMap, roughness: 0.95 }) };
  });
}

/** Low wild flowers / weeds patch (red & white dots, like the reference fields). */
export function flowerPatch() {
  return M('flowers', () => {
    const parts = [];
    s0 = 404;
    for (let i = 0; i < 14; i++) {
      const b = new THREE.IcosahedronGeometry(0.03 + rnd() * 0.02, 0);
      b.translate((rnd() - 0.5) * 1.4, 0.22 + rnd() * 0.15, (rnd() - 0.5) * 1.4);
      parts.push(b);
    }
    return { geometry: finish(mergeGeometries(parts)), material: new THREE.MeshStandardMaterial({ color: '#6e2a22', roughness: 0.9 }) };
  });
}

/** Scorch / crater decal texture (transparent). */
export function scorchTexture() {
  return once('scorch', () => {
    const [c, g] = canvas(256);
    const gr = g.createRadialGradient(128, 128, 8, 128, 128, 126);
    gr.addColorStop(0, 'rgba(12,10,8,0.95)');
    gr.addColorStop(0.5, 'rgba(26,22,18,0.7)');
    gr.addColorStop(1, 'rgba(40,34,26,0)');
    g.fillStyle = gr;
    g.fillRect(0, 0, 256, 256);
    s0 = 9;
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(10,8,6,${0.2 + rnd() * 0.4})`;
      const a = rnd() * Math.PI * 2, r = 60 + rnd() * 60;
      g.beginPath();
      g.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 3 + rnd() * 10, 0, 7);
      g.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}
