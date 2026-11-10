import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { leafTexture, barkTexture } from './textures.js';

export const shared = {
  time: { value: 0 },
  playerScreen: { value: new THREE.Vector2(-9999, -9999) },
  playerViewZ: { value: 0 },
  fadeRadius: { value: 160 },
};

function rng(s) {
  let a = s >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ------------------------------------------------------------------ grass
/**
 * Infinite-patch grass: N blades in a square patch that wraps around the camera focus,
 * so blades stay fixed in the world. Density/height come from the map mask (blue channel).
 */
export function createGrass({ count = 40000, patch = 40, mask, mapSize, mapOrigin = new THREE.Vector2(0, 0) }) {
  const R = rng(4242);
  const SEG = 4;
  const vPer = SEG * 2 + 1;
  const pos = new Float32Array(count * vPer * 3);
  const col = new Float32Array(count * vPer * 3);
  const off = new Float32Array(count * vPer * 4); // x, z, rotation, height
  const lean = new Float32Array(count * vPer);
  const idx = [];
  const base = new THREE.Color('#3d5a22');
  const tipA = new THREE.Color('#6f8f38');
  const tipB = new THREE.Color('#a7a64e');
  const c = new THREE.Color();
  for (let b = 0; b < count; b++) {
    const ox = (R() - 0.5) * patch, oz = (R() - 0.5) * patch;
    const rot = R() * Math.PI * 2;
    const h = 0.32 + R() * 0.5;
    const w = 0.04 + R() * 0.03;
    const ln = (R() - 0.5) * 0.6;
    const tip = tipA.clone().lerp(tipB, Math.pow(R(), 2.5));
    const v0 = b * vPer;
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const ww = w * (1 - t * 0.85);
      const verts = i === SEG ? [[0, t]] : [[-ww, t], [ww, t]];
      for (const [x, y] of verts) {
        const vi = v0 + (i === SEG ? SEG * 2 : i * 2 + (x > 0 ? 1 : 0));
        pos.set([x, y, 0], vi * 3);
        c.copy(base).lerp(tip, Math.pow(t, 0.9));
        col.set([c.r, c.g, c.b], vi * 3);
        off.set([ox, oz, rot, h], vi * 4);
        lean[vi] = ln;
      }
    }
    for (let i = 0; i < SEG - 1; i++) {
      const a = v0 + i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    const a = v0 + (SEG - 1) * 2;
    idx.push(a, a + 1, v0 + SEG * 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aOffset', new THREE.BufferAttribute(off, 4));
  g.setAttribute('aLean', new THREE.BufferAttribute(lean, 1));
  g.setIndex(count * vPer > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));

  const uniforms = {
    uTime: shared.time,
    uFocus: { value: new THREE.Vector3() },
    uPatch: { value: patch },
    uMask: { value: mask },
    uMapSize: { value: mapSize },
    uMapOrigin: { value: mapOrigin },
  };
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec4 aOffset; attribute float aLean;
        uniform float uTime; uniform vec3 uFocus; uniform float uPatch;
        uniform sampler2D uMask; uniform vec2 uMapSize; uniform vec2 uMapOrigin;`,
      )
      .replace(
        '#include <color_vertex>',
        `#include <color_vertex>
        vec2 rel = mod(aOffset.xy - uFocus.xz + uPatch * 0.5, uPatch) - uPatch * 0.5;
        vec2 wxz = uFocus.xz + rel;
        vec4 gm = texture2D(uMask, (wxz - uMapOrigin) / uMapSize);
        float hgt = aOffset.w * smoothstep(0.1, 0.7, gm.b);
        hgt *= 1.0 - smoothstep(uPatch * 0.36, uPatch * 0.5, length(rel));
        float t = position.y;
        float cr = cos(aOffset.z), sr = sin(aOffset.z);
        float wind = sin(uTime * 1.4 + wxz.x * 0.31 + wxz.y * 0.17) * 0.6 + sin(uTime * 2.9 + wxz.x * 0.83 - wxz.y * 0.4) * 0.25;
        float bend = (wind * 0.32 + aLean) * t * t;
        vec3 gP = vec3(position.x * cr + bend * hgt * 0.9, t * hgt, position.x * sr + wind * 0.12 * t * t * hgt);
        vec3 gTransformed = vec3(wxz.x + gP.x, gP.y, wxz.y + gP.z);
        float patchy = 0.5 + 0.5 * sin(wxz.x * 0.09 + 1.3) * sin(wxz.y * 0.075 - 0.4);
        vColor.rgb *= mix(vec3(0.85, 0.95, 0.85), vec3(1.25, 1.12, 0.72), patchy * t);
        vec3 gNormal = normalize(vec3(cr * 0.25, 1.0, sr * 0.25));`,
      )
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = gNormal;')
      .replace('#include <begin_vertex>', 'vec3 transformed = gTransformed;');
    // both blade sides lit like the front (thin, translucent blades)
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0; vec3 normal = normalize(vNormal); vec3 nonPerturbedNormal = normal;');
  };
  const mesh = new THREE.Mesh(g, mat);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  return {
    mesh,
    update(focus) {
      uniforms.uFocus.value.copy(focus);
    },
  };
}

// ------------------------------------------------------------------ trees & bushes
function foliageMaterial(hue, tint = '#ffffff') {
  const map = leafTexture(hue);
  const mat = new THREE.MeshLambertMaterial({ map, color: tint, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, emissive: '#2a2008', emissiveIntensity: 0.6 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = shared.time;
    sh.uniforms.uPS = shared.playerScreen;
    sh.uniforms.uPZ = shared.playerViewZ;
    sh.uniforms.uFR = shared.fadeRadius;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; varying float vVZ;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          vec3 ip = instanceMatrix[3].xyz;
        #else
          vec3 ip = vec3(0.0);
        #endif
        float sway = sin(uTime * 1.3 + ip.x * 0.7 + ip.z * 0.5 + position.y * 0.4) * 0.06 * position.y;
        transformed.x += sway; transformed.z += sway * 0.6;`,
      )
      .replace('#include <project_vertex>', '#include <project_vertex>\nvVZ = mvPosition.z;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0; vec3 normal = normalize(vNormal); vec3 nonPerturbedNormal = normal;')
      .replace('#include <common>', '#include <common>\nuniform vec2 uPS; uniform float uPZ; uniform float uFR; varying float vVZ;')
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        // see-through canopy around the player (dithered)
        // dissolve foliage that is very close to the camera
        float dithN = fract(sin(dot(floor(gl_FragCoord.xy), vec2(41.13, 289.7))) * 43758.5453);
        if (vVZ > -9.0 && dithN < smoothstep(-9.0, -5.0, vVZ)) discard;
        float pd = distance(gl_FragCoord.xy, uPS);
        if (pd < uFR && vVZ > uPZ + 1.0) {
          float k = 1.0 - smoothstep(uFR * 0.55, uFR, pd);
          float dith = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
          if (dith < k * 0.85) discard;
        }`,
      );
  };
  return mat;
}

function depthMat(map) {
  return new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 });
}

function cardsAround(R, centers, count, size, crown, out) {
  for (const cc of centers) {
    for (let i = 0; i < count; i++) {
      const s = size * (0.75 + R() * 0.5);
      const g = new THREE.PlaneGeometry(s, s);
      g.rotateX(R() * Math.PI);
      g.rotateY(R() * Math.PI * 2);
      g.rotateZ((R() - 0.5) * 0.8);
      const jx = (R() - 0.5) * size * 0.7, jy = (R() - 0.5) * size * 0.5, jz = (R() - 0.5) * size * 0.7;
      g.translate(cc.x + jx, cc.y + jy, cc.z + jz);
      // normals point away from crown center -> volumetric shading; color darker low/inside
      const p = g.attributes.position, n = g.attributes.normal;
      const colors = [];
      for (let k = 0; k < p.count; k++) {
        const v = new THREE.Vector3(p.getX(k), p.getY(k), p.getZ(k));
        const d = v.clone().sub(crown.c).normalize();
        d.y += 0.35;
        d.normalize();
        n.setXYZ(k, d.x, d.y, d.z);
        const shade = THREE.MathUtils.clamp(0.55 + (v.y - crown.c.y) / (crown.r * 2.2) + R() * 0.12, 0.45, 1.15);
        colors.push(shade, shade, shade * 0.95);
      }
      g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      out.push(g);
    }
  }
}

const treeCache = new Map();
/** Procedural broadleaf tree. Returns geometries in meters, base at y=0. */
export function treeGeometry(v) {
  if (treeCache.has(v)) return treeCache.get(v);
  const R = rng(1000 + v * 77);
  const H = 4.2 + R() * 1.6;
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.17, 0.3, H, 9, 8);
  trunk.translate(0, H / 2, 0);
  const tp = trunk.attributes.position;
  const bendA = (R() - 0.5) * 0.5;
  for (let i = 0; i < tp.count; i++) tp.setX(i, tp.getX(i) + Math.sin((tp.getY(i) / H) * 2) * bendA * (tp.getY(i) / H));
  trunk.computeVertexNormals();
  parts.push(trunk);
  const tips = [];
  const nb = 4 + Math.floor(R() * 3);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2 + R() * 0.8;
    const y0 = H * (0.55 + R() * 0.35);
    const len = 1.6 + R() * 1.2;
    const up = 0.5 + R() * 0.5;
    const br = new THREE.CylinderGeometry(0.05, 0.11, len, 6, 1);
    br.translate(0, len / 2, 0);
    br.rotateZ(-(Math.PI / 2 - up * 1.1));
    br.rotateY(a);
    br.translate(Math.sin(bendA) * 0.2, y0, 0);
    parts.push(br);
    const dir = new THREE.Vector3(Math.cos(up * 1.1), Math.sin(up * 1.1), 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
    tips.push(new THREE.Vector3(0, y0, 0).addScaledVector(dir, len));
  }
  const trunkGeo = mergeGeometries(parts.map((p) => p.toNonIndexed()));
  const crown = { c: new THREE.Vector3(0, H + 0.6, 0), r: 2.6 };
  const centers = [...tips, crown.c.clone(), crown.c.clone().add(new THREE.Vector3(0, 0.9, 0))];
  for (let i = 0; i < 6; i++)
    centers.push(crown.c.clone().add(new THREE.Vector3((R() - 0.5) * 3.6, (R() - 0.3) * 2.2, (R() - 0.5) * 3.6)));
  const cards = [];
  cardsAround(R, centers, 7, 1.9, crown, cards);
  const leafGeo = mergeGeometries(cards);
  const res = { trunkGeo, leafGeo, height: H + 3 };
  treeCache.set(v, res);
  return res;
}

export function bushGeometry(v) {
  const key = `bush${v}`;
  if (treeCache.has(key)) return treeCache.get(key);
  const R = rng(500 + v * 31);
  const crown = { c: new THREE.Vector3(0, 0.55, 0), r: 0.9 };
  const centers = [];
  for (let i = 0; i < 4; i++) centers.push(new THREE.Vector3((R() - 0.5) * 1.1, 0.4 + R() * 0.5, (R() - 0.5) * 1.1));
  const cards = [];
  cardsAround(R, centers, 6, 1.0, crown, cards);
  const res = { leafGeo: mergeGeometries(cards) };
  treeCache.set(key, res);
  return res;
}

const CHUNK = 24;
/** Instanced meshes chunked spatially so frustum culling works per chunk. */
export function instancedChunks(geo, mat, items, { castShadow = true, depth = null } = {}) {
  const group = new THREE.Group();
  const buckets = new Map();
  for (const it of items) {
    const k = `${Math.floor(it.x / CHUNK)},${Math.floor(it.z / CHUNK)}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(it);
  }
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (const list of buckets.values()) {
    const im = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((it, i) => {
      q.setFromAxisAngle(up, it.rot ?? 0);
      const sc = it.s ?? 1;
      im.setMatrixAt(i, m.compose(p.set(it.x, it.y ?? 0, it.z), q, s.set(sc * (it.sx ?? 1), sc * (it.sy ?? 1), sc * (it.sz ?? 1))));
    });
    im.castShadow = castShadow;
    im.receiveShadow = !depth; // foliage doesn't self-shadow (looks translucent)
    if (depth) im.customDepthMaterial = depth;
    im.computeBoundingSphere();
    group.add(im);
  }
  return group;
}

/** Trees + bushes for a list of placements. */
export function createForest(trees, bushes) {
  const group = new THREE.Group();
  const bark = new THREE.MeshLambertMaterial({ map: barkTexture(), color: '#b9a690' });
  const hues = [52, 70, 40];
  for (let v = 0; v < 3; v++) {
    const list = trees.filter((t) => t.v % 3 === v);
    if (!list.length) continue;
    const tg = treeGeometry(v);
    const fm = foliageMaterial(hues[v]);
    group.add(instancedChunks(tg.trunkGeo, bark, list));
    group.add(instancedChunks(tg.leafGeo, fm, list, { depth: depthMat(fm.map) }));
  }
  for (let v = 0; v < 2; v++) {
    const list = bushes.filter((b) => b.v % 2 === v);
    if (!list.length) continue;
    const fm = foliageMaterial(v ? 85 : 60, '#d8d8c8');
    group.add(instancedChunks(bushGeometry(v).leafGeo, fm, list, { depth: depthMat(fm.map) }));
  }
  return group;
}
