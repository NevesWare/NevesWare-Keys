import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { soilTexture, dirtTexture, concreteTexture, plankTexture, brickTexture, rustTexture, helipadTexture } from './textures.js';
import { createGrass, createForest, instancedChunks, shared } from './vegetation.js';

/** Map cells whose visuals are props (not wall blocks). */
export const PROP_CELLS = new Set(['trunk', 'rock', 'crate', 'crateMil', 'crateRare', 'sandbag', 'car']);
const WALL_H = 1.3; // meters per wall layer (2 layers = 2.6 m)

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

/** Adds the dithered "see the player through it" fade to any material. */
export function withFade(mat) {
  const prev = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    prev?.call(mat, sh, r);
    sh.uniforms.uPS = shared.playerScreen;
    sh.uniforms.uPZ = shared.playerViewZ;
    sh.uniforms.uFR = shared.fadeRadius;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vVZ2;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvVZ2 = mvPosition.z;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec2 uPS; uniform float uPZ; uniform float uFR; varying float vVZ2;')
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        float pd2 = distance(gl_FragCoord.xy, uPS);
        if (pd2 < uFR * 0.8 && vVZ2 > uPZ + 1.2) {
          float k2 = 1.0 - smoothstep(uFR * 0.4, uFR * 0.8, pd2);
          float d2 = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
          if (d2 < k2 * 0.8) discard;
        }`,
      );
  };
  return mat;
}

// ------------------------------------------------------------------ ground
function buildMask(vox, x0, z0, W, H) {
  const data = new Uint8Array(W * H * 4);
  for (let z = 0; z < H; z++)
    for (let x = 0; x < W; x++) {
      const g = vox.get(x0 + x, -1, z0 + z) ?? 'grass';
      const b = vox.get(x0 + x, 0, z0 + z);
      const i = (z * W + x) * 4;
      let r = 0, gg = 0, bl = 0, a = 255;
      if (g === 'road' || g === 'dirt') r = 255;
      else if (g === 'concrete' || g === 'helipad' || g === 'helipadMark') gg = 255;
      else if (g === 'plank') a = 0;
      else bl = g === 'grassLight' ? 170 : g === 'grassDark' ? 255 : 220;
      if (b && !PROP_CELLS.has(b)) bl = 0;
      if (b && b.startsWith('crate')) bl = 0;
      if (b === 'car') bl = 40;
      data.set([r, gg, bl, a], i);
    }
  const t = new THREE.DataTexture(data, W, H);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}

function buildGround(mask, x0, z0, W, H) {
  const geo = new THREE.PlaneGeometry(W + 80, H + 80);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({ roughness: 0.97, metalness: 0 });
  const u = {
    uMask: { value: mask },
    uOrigin: { value: new THREE.Vector2(x0, z0) },
    uSize: { value: new THREE.Vector2(W, H) },
    tSoil: { value: soilTexture() },
    tDirt: { value: dirtTexture() },
    tConc: { value: concreteTexture() },
    tPlank: { value: plankTexture('#7a5634') },
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWP;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vWP; uniform sampler2D uMask, tSoil, tDirt, tConc, tPlank; uniform vec2 uOrigin, uSize;`,
      )
      .replace(
        '#include <map_fragment>',
        `vec2 cuv = (vWP.xz - uOrigin) / uSize;
        vec4 mk = texture2D(uMask, cuv);
        vec3 soil = texture2D(tSoil, vWP.xz * 0.2).rgb;
        vec3 dirt = texture2D(tDirt, vWP.xz * 0.28).rgb;
        vec3 conc = texture2D(tConc, vWP.xz * 0.2).rgb;
        vec3 plk = texture2D(tPlank, vWP.xz * 0.45).rgb;
        float nz = texture2D(tSoil, vWP.xz * 0.04).g * 2.0;
        float rd = smoothstep(0.35, 0.7, mk.r + (nz - 0.35) * 0.5);
        vec3 col = mix(soil, dirt, rd);
        col = mix(col, conc, smoothstep(0.45, 0.55, mk.g));
        col = mix(col, plk, smoothstep(0.45, 0.55, 1.0 - mk.a));
        float outside = step(1.0, max(abs(cuv.x - 0.5), abs(cuv.y - 0.5)) * 2.0);
        col = mix(col, soil * 0.8, outside);
        diffuseColor.rgb *= col;`,
      );
  };
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x0 + W / 2, 0, z0 + H / 2);
  mesh.receiveShadow = true;
  return mesh;
}

// ------------------------------------------------------------------ props
const geoCache = new Map();
const cached = (k, f) => (geoCache.has(k) ? geoCache.get(k) : (geoCache.set(k, f()), geoCache.get(k)));

function rockGeo(v) {
  return cached(`rock${v}`, () => {
    const R = rng(300 + v);
    const g = new THREE.IcosahedronGeometry(0.6, 3);
    const p = g.attributes.position;
    const colors = [];
    const c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const vtx = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i));
      const n = Math.sin(vtx.x * 5 + v) * 0.1 + Math.sin(vtx.z * 7 - v * 2) * 0.08 + Math.sin(vtx.y * 11 + vtx.x * 6) * 0.07 + (R() - 0.5) * 0.04;
      vtx.multiplyScalar(1 + n);
      vtx.y = vtx.y * (0.55 + v * 0.12) + 0.18;
      vtx.x *= 1.1 + R() * 0.02;
      p.setXYZ(i, vtx.x, vtx.y, vtx.z);
      const moss = vtx.y > 0.42 + n * 2 && R() > 0.35 ? 1 : 0;
      c.set(moss ? '#55603a' : '#6b675f').multiplyScalar(0.7 + R() * 0.2);
      colors.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    g.computeVertexNormals();
    return g;
  });
}

function sandbagGeo() {
  return cached('sandbag', () => {
    const parts = [];
    for (let row = 0; row < 3; row++)
      for (let i = -1; i <= 1; i++) {
        const s = new THREE.SphereGeometry(1, 12, 8);
        s.scale(0.24, 0.12, 0.42);
        s.rotateY(Math.PI / 2);
        s.translate(i * 0.33 + (row % 2 ? 0.16 : 0) - 0.08, 0.12 + row * 0.2, 0);
        parts.push(s);
      }
    return mergeGeometries(parts);
  });
}

function fenceGeo() {
  return cached('fence', () => {
    const parts = [];
    for (const x of [-1, 1]) parts.push(new THREE.BoxGeometry(0.1, 1.1, 0.1).translate(x, 0.55, 0));
    for (const y of [0.45, 0.85]) parts.push(new THREE.BoxGeometry(2.1, 0.09, 0.05).translate(0, y, 0));
    return mergeGeometries(parts);
  });
}

function crateParts(tier) {
  return cached(`crate${tier}`, () => {
    if (tier === 'rare') {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new RoundedBoxGeometry(0.95, 0.5, 0.6, 3, 0.05), new THREE.MeshStandardMaterial({ color: '#2b2e33', roughness: 0.4, metalness: 0.7 })).translateY(0.25));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(0.97, 0.06, 0.62), new THREE.MeshStandardMaterial({ color: '#d4a83a', roughness: 0.4, metalness: 0.6 })).translateY(0.28));
      return g;
    }
    if (tier === 'military') {
      const g = new THREE.Group();
      g.add(new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.55, 0.62, 2, 0.03), new THREE.MeshStandardMaterial({ color: '#4f5a36', roughness: 0.8, metalness: 0.1 })).translateY(0.275));
      g.add(new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.07, 0.64), new THREE.MeshStandardMaterial({ color: '#3b4428', roughness: 0.8 })).translateY(0.5));
      return g;
    }
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new RoundedBoxGeometry(0.9, 0.82, 0.9, 2, 0.02), new THREE.MeshStandardMaterial({ map: plankTexture('#9a6a3c'), roughness: 0.85 })).translateY(0.41));
    return g;
  });
}

export function carModel(v = 0) {
  const paints = ['#6a3326', '#3d4f63', '#6b7058', '#8a8478'];
  const body = new THREE.MeshStandardMaterial({ map: rustTexture(paints[v % 4]), roughness: 0.7, metalness: 0.35 });
  const dark = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8 });
  const glass = new THREE.MeshStandardMaterial({ color: '#1c262c', roughness: 0.08, metalness: 0.4 });
  const chrome = new THREE.MeshStandardMaterial({ color: '#9a9a96', roughness: 0.35, metalness: 0.9 });
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.7, 4.3, 3, 0.15), body).translateY(0.62));
  g.add(new THREE.Mesh(new RoundedBoxGeometry(1.62, 0.62, 2.2, 3, 0.18), glass).translateY(1.22).translateZ(-0.25));
  g.add(new THREE.Mesh(new RoundedBoxGeometry(1.66, 0.08, 2.0, 2, 0.04), body).translateY(1.53).translateZ(-0.3));
  for (const [x, z] of [[-0.86, 1.35], [0.86, 1.35], [-0.86, -1.35], [0.86, -1.35]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.26, 18), dark);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.36, z);
    g.add(w);
  }
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.16, 0.14), chrome).translateY(0.42).translateZ(2.17));
  g.add(new THREE.Mesh(new THREE.BoxGeometry(1.84, 0.16, 0.14), chrome).translateY(0.42).translateZ(-2.17));
  for (const x of [-0.6, 0.6]) g.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.12, 0.04), new THREE.MeshStandardMaterial({ color: '#e8e0b0', emissive: '#000000', roughness: 0.2 })).translateX(x).translateY(0.72).translateZ(2.16));
  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return g;
}

function wallMaterial(name) {
  const tex = name === 'brick' ? brickTexture('#8e4a36')
    : name === 'plank' ? plankTexture('#7a5634')
    : name === 'stone' ? concreteTexture()
    : name.startsWith('wall_') ? concreteTexture()
    : concreteTexture();
  const tint = name === 'wall_bears' ? '#b89a90' : name === 'wall_eagle' ? '#9aa8b8' : name === 'wall_cult' ? '#8a8680' : name === 'stone' ? '#8a8680' : '#ffffff';
  return withFade(new THREE.MeshStandardMaterial({ map: tex, color: tint, roughness: 0.9 }));
}

/**
 * Builds the visual world from map data.
 * @returns { group, mask, update(dt, camera, focus, playerWorld) }
 */
export function buildWorld({ vox, props, bounds, quality }) {
  const { x0, z0, W, H } = bounds;
  const group = new THREE.Group();
  const mask = buildMask(vox, x0, z0, W, H);
  group.add(buildGround(mask, x0, z0, W, H));

  // walls: textured instanced boxes per material
  const walls = new Map();
  for (const [k, m] of vox.voxels) {
    if (PROP_CELLS.has(m)) continue;
    const [x, y, z] = k.split(',').map(Number);
    if (y < 0) continue;
    if (!walls.has(m)) walls.set(m, []);
    walls.get(m).push({ x: x + 0.5, z: z + 0.5, y: y * WALL_H + WALL_H / 2, sy: WALL_H });
  }
  const unit = new THREE.BoxGeometry(1, 1, 1);
  for (const [m, list] of walls) group.add(instancedChunks(unit, wallMaterial(m), list));

  // props
  const by = (k) => props.filter((p) => p.kind === k);
  const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 });
  for (let v = 0; v < 3; v++) group.add(instancedChunks(rockGeo(v), rockMat, by('rock').filter((p) => p.v % 3 === v).map((p) => ({ ...p, s: 0.9 + (p.s ?? 1) * 0.3 }))));
  group.add(instancedChunks(sandbagGeo(), new THREE.MeshStandardMaterial({ color: '#a89068', roughness: 0.95 }), by('sandbag')));
  group.add(instancedChunks(fenceGeo(), new THREE.MeshStandardMaterial({ map: plankTexture('#6a5038'), roughness: 0.9 }), by('fence')));
  for (const tier of ['common', 'military', 'rare']) {
    for (const p of by('crate').filter((c) => c.v === tier)) {
      const c = crateParts(tier).clone();
      c.position.set(p.x, 0, p.z);
      c.rotation.y = p.rot ?? 0;
      c.traverse((o) => o.isMesh && (o.castShadow = o.receiveShadow = true));
      group.add(c);
    }
  }
  for (const p of by('car')) {
    const c = carModel(p.v);
    c.position.set(p.x, 0, p.z);
    c.rotation.y = p.rot ?? 0;
    group.add(c);
  }
  for (const p of by('helipad')) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), new THREE.MeshStandardMaterial({ map: helipadTexture(), transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
    d.rotation.x = -Math.PI / 2;
    d.position.set(p.x, 0.01, p.z);
    d.receiveShadow = true;
    group.add(d);
  }

  // vegetation
  const trees = by('tree').map((p) => ({ ...p, s: 0.75 + Math.max(0, (p.s ?? 0.8) - 0.6) * 1.6 }));
  group.add(createForest(trees, by('bush')));
  const grass = quality.grass > 0
    ? createGrass({ count: Math.round(quality.grass), patch: quality.grassPatch, mask, mapSize: new THREE.Vector2(W, H), mapOrigin: new THREE.Vector2(x0, z0) })
    : null;
  if (grass) group.add(grass.mesh);

  const v = new THREE.Vector3();
  return {
    group,
    mask,
    update(dt, camera, focus, playerWorld, viewport) {
      shared.time.value += dt;
      grass?.update(focus);
      if (playerWorld) {
        v.copy(playerWorld).setY(1.0).project(camera);
        shared.playerScreen.value.set(((v.x + 1) / 2) * viewport.x, ((v.y + 1) / 2) * viewport.y);
        v.copy(playerWorld).setY(1.0).applyMatrix4(camera.matrixWorldInverse);
        shared.playerViewZ.value = v.z;
        shared.fadeRadius.value = viewport.y * 0.16;
      } else shared.playerScreen.value.set(-9999, -9999);
    },
  };
}

// ------------------------------------------------------------------ lighting / sky
let envTex = null;
export function makeEnvironment(renderer) {
  if (envTex) return envTex;
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(10, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {},
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `varying vec3 vP; void main(){
        float h = normalize(vP).y;
        vec3 top = vec3(0.32, 0.45, 0.65), hor = vec3(1.0, 0.78, 0.52), gnd = vec3(0.22, 0.2, 0.14);
        vec3 c = h > 0.0 ? mix(hor, top, pow(h, 0.6)) : mix(hor * 0.6, gnd, min(1.0, -h * 3.0));
        vec3 sd = normalize(vec3(-0.75, 0.42, 0.45));
        c += vec3(6.0, 4.2, 2.4) * pow(max(dot(normalize(vP), sd), 0.0), 220.0);
        gl_FragColor = vec4(c, 1.0); }`,
    }),
  );
  s.add(sky);
  envTex = pm.fromScene(s, 0.02).texture;
  pm.dispose();
  return envTex;
}

/** Golden-hour sun + sky light + haze. Returns { sun, follow(p) }. */
export function addLighting(scene, renderer, { shadowSize = 2048, extent = 26 } = {}) {
  scene.background = new THREE.Color('#bfb59a');
  scene.fog = new THREE.Fog('#c4b896', 34, 105);
  scene.environment = makeEnvironment(renderer);
  scene.environmentIntensity = 0.7;
  const hemi = new THREE.HemisphereLight('#a9c0dc', '#5a4a30', 0.8);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffcf8f', 4.6);
  sun.castShadow = shadowSize > 0;
  sun.shadow.mapSize.set(shadowSize || 512, shadowSize || 512);
  const c = sun.shadow.camera;
  c.left = -extent;
  c.right = extent;
  c.top = extent;
  c.bottom = -extent;
  c.near = 1;
  c.far = 140;
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const offset = new THREE.Vector3(-30, 34, 17);
  return {
    sun,
    follow(p) {
      // snap to shadow texels to avoid shimmering
      const step = (extent * 2) / (shadowSize || 512);
      sun.target.position.set(Math.round(p.x / step) * step, 0, Math.round(p.z / step) * step);
      sun.position.copy(sun.target.position).add(offset);
    },
  };
}
