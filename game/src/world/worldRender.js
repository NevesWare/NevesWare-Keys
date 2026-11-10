import * as THREE from 'three';
import { VOX_MATERIAL, hash3 } from '../vox/voxModel.js';
import { crateGeo, rockGeo, treeGeo, grassGeo, sandbagGeo, carGeo } from '../vox/models.js';

const TEX = 20; // texels per meter on blocks (matches 5 cm body voxels)
const GROUND_TEX = 16; // texels per meter on the ground
const CHUNK = 16;

export const PROP_BLOCKS = new Set(['trunk', 'rock', 'crate', 'crateMil', 'crateRare', 'sandbag', 'car']);

const GROUND_COLORS = {
  grass: [0x5f8a3c, 0x6b9443, 0x557d36, 0x72994a],
  grassDark: [0x4b7232, 0x557a38, 0x42682c, 0x5a7f3a],
  grassLight: [0x7aa04c, 0x86aa55, 0x6f9545, 0x90b05e],
  road: [0x8a6e4a, 0x7d6342, 0x957852, 0x735a3c],
  dirt: [0x7a5e40, 0x6e5438, 0x846848],
  concrete: [0x8e8a86, 0x86827e, 0x96928e, 0x7e7a76],
  plank: [0x8a6038, 0x7d5530, 0x94683e],
  helipad: [0x44484c, 0x3e4246, 0x4a4e52],
  helipadMark: [0xe8e2d0, 0xded8c6],
};

const BLOCK_STYLE = {
  brick: { base: 0x9a5a44, alt: 0x8a4e3a, mortar: 0xb8ab98, kind: 'brick' },
  plank: { base: 0x8a6038, alt: 0x7a5230, mortar: 0x4a3420, kind: 'plank' },
  stone: { base: 0x7d7a80, alt: 0x6c6970, mortar: 0x55535a, kind: 'stone' },
  concrete: { base: 0x8e8a86, alt: 0x86827e, mortar: 0x6e6a66, kind: 'concrete' },
  wall_ferro: { base: 0x5a5450, alt: 0x4e4844, mortar: 0x9e3a32, kind: 'concrete', stripe: 0xb8402f },
  wall_mare: { base: 0x5a626c, alt: 0x4e5660, mortar: 0x3f7fbf, kind: 'concrete', stripe: 0x3f8fd8 },
  wall_raiz: { base: 0x5a6048, alt: 0x4e543e, mortar: 0x6b8a3a, kind: 'concrete', stripe: 0x86c34a },
};

function rgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}

function blockTexture(name) {
  const st = BLOCK_STYLE[name] ?? BLOCK_STYLE.stone;
  const data = new Uint8Array(TEX * TEX * 4);
  for (let y = 0; y < TEX; y++)
    for (let x = 0; x < TEX; x++) {
      let c = st.base;
      if (st.kind === 'brick') {
        const row = Math.floor(y / 5);
        const off = row % 2 ? 5 : 0;
        const mortar = y % 5 === 4 || (x + off) % 10 === 9;
        c = mortar ? st.mortar : hash3((x + off) / 10 | 0, row, 0, 3) > 0.5 ? st.base : st.alt;
      } else if (st.kind === 'plank') {
        c = y % 5 === 4 ? st.mortar : hash3(0, y / 5 | 0, 0, 4) > 0.5 ? st.base : st.alt;
      } else if (st.kind === 'stone') {
        const cell = hash3(x / 7 | 0, y / 6 | 0, 0, 5);
        c = x % 7 === 6 || y % 6 === 5 ? st.mortar : cell > 0.5 ? st.base : st.alt;
      } else {
        c = x === 0 || y === 0 ? st.mortar : hash3(x >> 2, y >> 2, 0, 6) > 0.5 ? st.base : st.alt;
        if (st.stripe && y >= 13 && y <= 15) c = st.stripe;
      }
      const k = 0.9 + hash3(x, y, 7, 1) * 0.2;
      const edge = x === 0 || y === 0 || x === TEX - 1 || y === TEX - 1 ? 0.82 : 1;
      const [r, g, b] = rgb(c);
      const i = (y * TEX + x) * 4;
      data[i] = Math.min(255, r * k * edge);
      data[i + 1] = Math.min(255, g * k * edge);
      data[i + 2] = Math.min(255, b * k * edge);
      data[i + 3] = 255;
    }
  const t = new THREE.DataTexture(data, TEX, TEX);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.colorSpace = THREE.SRGBColorSpace;
  t.needsUpdate = true;
  return t;
}

const blockMats = new Map();
function blockMaterial(name) {
  if (!blockMats.has(name)) blockMats.set(name, new THREE.MeshLambertMaterial({ map: blockTexture(name) }));
  return blockMats.get(name);
}

/** Ground: one plane with a nearest-filtered texture, 16 texels per meter (micro-voxel look). */
function buildGround(vox, x0, z0, W, H) {
  const tw = W * GROUND_TEX, th = H * GROUND_TEX;
  const data = new Uint8Array(tw * th * 4);
  for (let cz = 0; cz < H; cz++)
    for (let cx = 0; cx < W; cx++) {
      const mat = vox.get(x0 + cx, -1, z0 + cz) ?? 'grass';
      const pal = GROUND_COLORS[mat] ?? GROUND_COLORS.grass;
      for (let ty = 0; ty < GROUND_TEX; ty++)
        for (let tx = 0; tx < GROUND_TEX; tx++) {
          const gx = cx * GROUND_TEX + tx, gy = cz * GROUND_TEX + ty;
          let c = pal[Math.floor(hash3(gx >> 1, gy >> 1, 0, 11) * pal.length)];
          if (mat === 'concrete' && (tx === 0 || ty === 0) && (cx + x0) % 2 === 0) c = 0x6e6a66;
          if (mat === 'road' && hash3(gx, gy, 1, 12) > 0.93) c = 0x9a8a70; // gravel
          if (mat.startsWith('grass') && hash3(gx, gy, 2, 13) > 0.985) c = 0x7a6a50; // pebbles
          const k = 0.92 + hash3(gx, gy, 3, 14) * 0.16;
          const [r, g, b] = rgb(c);
          const i = (gy * tw + gx) * 4;
          data[i] = Math.min(255, r * k);
          data[i + 1] = Math.min(255, g * k);
          data[i + 2] = Math.min(255, b * k);
          data[i + 3] = 255;
        }
    }
  const tex = new THREE.DataTexture(data, tw, th);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.needsUpdate = true;
  const geo = new THREE.PlaneGeometry(W, H);
  geo.rotateX(-Math.PI / 2);
  // PlaneGeometry UV v goes bottom->top; after rotation +z is "down" in texture: flip v.
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i));
  const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex }));
  mesh.position.set(x0 + W / 2, 0, z0 + H / 2);
  mesh.receiveShadow = true;
  return mesh;
}

const PROP_GEO = {
  tree: (v) => treeGeo(v),
  rock: (v) => rockGeo(v),
  crate: (v) => crateGeo(v),
  sandbag: () => sandbagGeo(),
  car: (v) => carGeo(v),
  grass: (v) => grassGeo(v),
};

/**
 * Builds the visual world.
 * @param vox VoxelLevel (ground at y=-1, blocks at y>=0)
 * @param props [{ kind, v, x, z, rot, s }]
 * @param bounds { x0, z0, W, H }
 * @param opts { grass: density 0..1, shadows }
 */
export function buildWorld(vox, props, bounds, opts = {}) {
  const group = new THREE.Group();
  const { x0, z0, W, H } = bounds;
  group.add(buildGround(vox, x0, z0, W, H));

  // blocks: instanced unit cubes per material per chunk
  const buckets = new Map();
  for (const [k, mat] of vox.voxels) {
    if (PROP_BLOCKS.has(mat)) continue;
    const [x, y, z] = k.split(',').map(Number);
    if (y < 0) continue;
    const key = `${mat}|${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push([x, y, z]);
  }
  const box = new THREE.BoxGeometry(1, 1, 1);
  const m4 = new THREE.Matrix4();
  for (const [key, list] of buckets) {
    const mat = key.split('|')[0];
    const im = new THREE.InstancedMesh(box, blockMaterial(mat), list.length);
    list.forEach(([x, y, z], i) => im.setMatrixAt(i, m4.makeTranslation(x + 0.5, y + 0.5, z + 0.5)));
    im.castShadow = im.receiveShadow = true;
    im.computeBoundingSphere();
    group.add(im);
  }

  // grass scatter
  const all = [...props];
  const dens = opts.grass ?? 0.6;
  if (dens > 0) {
    for (let cz = z0; cz < z0 + H; cz++)
      for (let cx = x0; cx < x0 + W; cx++) {
        const g = vox.get(cx, -1, cz);
        if (!g || !g.startsWith('grass') || vox.get(cx, 0, cz)) continue;
        const n = Math.floor(hash3(cx, cz, 5, 21) * 4 * dens);
        for (let i = 0; i < n; i++)
          all.push({
            kind: 'grass', v: Math.floor(hash3(cx, cz, i, 22) * 4),
            x: cx + hash3(cx, cz, i, 23), z: cz + hash3(cx, cz, i, 24), rot: hash3(cx, cz, i, 25) * 6.28,
          });
      }
  }

  // props: instanced per geometry per chunk (so frustum culling works per chunk)
  const pb = new Map();
  for (const p of all) {
    const key = `${p.kind}:${p.v ?? 0}|${Math.floor(p.x / CHUNK)},${Math.floor(p.z / CHUNK)}`;
    if (!pb.has(key)) pb.set(key, []);
    pb.get(key).push(p);
  }
  const q = new THREE.Quaternion(), sv = new THREE.Vector3(), pv = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (const [key, list] of pb) {
    const [kindv] = key.split('|');
    const [kind, v] = kindv.split(':');
    const geo = PROP_GEO[kind](kind === 'crate' ? v : Number(v));
    const im = new THREE.InstancedMesh(geo, VOX_MATERIAL, list.length);
    list.forEach((p, i) => {
      q.setFromAxisAngle(up, p.rot ?? 0);
      const s = p.s ?? 1;
      im.setMatrixAt(i, m4.compose(pv.set(p.x, 0, p.z), q, sv.set(s, s, s)));
    });
    im.castShadow = kind !== 'grass';
    im.receiveShadow = true;
    im.computeBoundingSphere();
    group.add(im);
  }
  return group;
}

/** Standard lighting rig with a shadow-casting sun that follows a focus point. */
export function addLighting(scene, { shadowSize = 2048, extent = 22 } = {}) {
  scene.background = new THREE.Color('#9fc0d8');
  scene.fog = new THREE.Fog('#9fc0d8', 70, 140);
  const hemi = new THREE.HemisphereLight('#cfe3f2', '#5a5040', 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff0d8', 2.6);
  sun.castShadow = shadowSize > 0;
  sun.shadow.mapSize.set(shadowSize || 512, shadowSize || 512);
  const c = sun.shadow.camera;
  c.left = -extent;
  c.right = extent;
  c.top = extent;
  c.bottom = -extent;
  c.near = 1;
  c.far = 120;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.02;
  scene.add(sun, sun.target);
  const offset = new THREE.Vector3(-22, 40, 14);
  return {
    sun,
    follow(p) {
      sun.target.position.set(p.x, 0, p.z);
      sun.position.copy(sun.target.position).add(offset);
    },
  };
}
