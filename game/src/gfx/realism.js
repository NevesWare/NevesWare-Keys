import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { bytesFromUrl } from '../util/bytes.js';
import skyUrl from '../assets/ph/sky.hdr?url';

/*
 * Photoscanned CC0 assets from Poly Haven (polyhaven.com): PBR ground/wall
 * textures, prop models and an HDRI sky. Everything is optional — when an asset
 * fails to load the game keeps its procedural fallback.
 */
const MODEL_URLS = import.meta.glob('../assets/ph/models/*.glb', { query: '?url', import: 'default', eager: true });
const TEX_URLS = import.meta.glob('../assets/ph/tex/*.webp', { query: '?url', import: 'default', eager: true });

const base = (p) => p.split('/').pop().replace(/\.(glb|webp)$/, '');
const models = {};
const textures = {};
let sky = null;
let ready = false;

export const realReady = () => ready;

function loadTexture(url, srgb) {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (t) => {
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.anisotropy = matchMedia('(pointer: coarse)').matches ? 4 : 8;
        if (srgb) t.colorSpace = THREE.SRGBColorSpace;
        resolve(t);
      },
      undefined,
      reject,
    );
  });
}

/** Loads every bundled real asset. Resolves even if some fail. */
export async function loadRealAssets() {
  const loader = new GLTFLoader();
  const jobs = [];
  for (const [p, url] of Object.entries(MODEL_URLS)) {
    jobs.push(
      bytesFromUrl(url)
        .then((buf) => {
          // GLTFLoader's ImageBitmapLoader uses fetch() on blob: URLs, which the
          // published page's CSP blocks; hiding createImageBitmap while the parser
          // is constructed makes it fall back to <img> (allowed for blob:).
          const cib = window.createImageBitmap;
          window.createImageBitmap = undefined;
          try {
            return loader.parseAsync(buf, '');
          } finally {
            window.createImageBitmap = cib;
          }
        })
        .then((g) => (models[base(p)] = g.scene))
        .catch((e) => console.warn('model', p, e)),
    );
  }
  for (const [p, url] of Object.entries(TEX_URLS)) {
    jobs.push(
      loadTexture(url, base(p).endsWith('_diff'))
        .then((t) => (textures[base(p)] = t))
        .catch((e) => console.warn('tex', p, e)),
    );
  }
  jobs.push(
    bytesFromUrl(skyUrl)
      .then((buf) => {
        const d = new RGBELoader().parse(buf);
        const t = new THREE.DataTexture(d.data, d.width, d.height, THREE.RGBAFormat, d.type);
        t.colorSpace = THREE.LinearSRGBColorSpace;
        t.mapping = THREE.EquirectangularReflectionMapping;
        t.minFilter = t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = false;
        t.flipY = true;
        t.needsUpdate = true;
        sky = t;
      })
      .catch((e) => console.warn('sky', e)),
  );
  await Promise.all(jobs);
  ready = Object.keys(models).length > 0 || Object.keys(textures).length > 0;
  return ready;
}

export const skyTexture = () => sky;
export const hasModel = (id) => !!models[id];
export const hasTex = (id) => !!textures[`${id}_diff`];

/** Texture set { map, normalMap, armMap } with a shared repeat. */
export function texSet(id, repeat = 1) {
  const pick = (k) => {
    const t = textures[`${id}_${k}`];
    if (!t) return null;
    const c = t.clone();
    c.repeat.set(repeat, repeat);
    c.needsUpdate = true;
    return c;
  };
  return { map: pick('diff'), normalMap: pick('nor'), armMap: pick('arm') };
}

const matCache = new Map();
/** Photoscanned PBR material (cached by id + repeat). */
export function pbrMaterial(id, { repeat = 1, color = '#ffffff', normalScale = 1 } = {}) {
  const key = `${id}|${repeat}|${color}`;
  if (matCache.has(key)) return matCache.get(key);
  const t = texSet(id, repeat);
  if (!t.map) return null;
  const m = new THREE.MeshStandardMaterial({
    map: t.map,
    normalMap: t.normalMap,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    roughnessMap: t.armMap,
    metalnessMap: t.armMap,
    aoMap: t.armMap,
    aoMapIntensity: 0.8,
    roughness: 1,
    metalness: t.armMap ? 1 : 0,
    color,
  });
  matCache.set(key, m);
  return m;
}

/** A shadow-casting clone of a real model, scaled so its largest footprint side is `size` meters (or native size). */
export function modelClone(id, { size = null, height = null } = {}) {
  const src = models[id];
  if (!src) return null;
  const g = src.clone(true);
  const box = new THREE.Box3().setFromObject(g);
  const dim = box.getSize(new THREE.Vector3());
  let s = 1;
  if (size) s = size / Math.max(dim.x, dim.z);
  else if (height) s = height / dim.y;
  g.scale.setScalar(s);
  g.position.y = -box.min.y * s;
  const wrap = new THREE.Group();
  wrap.add(g);
  wrap.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return wrap;
}

const geoCache = new Map();
/**
 * One merged geometry + material for instancing a real model (uses the
 * largest-material group; small models from Poly Haven are single-material).
 */
export function modelInstanceParts(id, { size = null, height = null } = {}) {
  const key = `${id}|${size}|${height}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const src = models[id];
  if (!src) return null;
  src.updateMatrixWorld(true);
  const byMat = new Map();
  src.traverse((o) => {
    if (!o.isMesh) return;
    const geo = o.geometry.clone().applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push(geo);
  });
  let best = null;
  for (const [mat, list] of byMat) {
    const geo = list.length > 1 ? mergeGeometries(list) : list[0];
    if (!best || geo.attributes.position.count > best.geometry.attributes.position.count) best = { geometry: geo, material: mat };
  }
  if (!best) return null;
  const g = best.geometry;
  g.computeBoundingBox();
  const bb = g.boundingBox, dim = bb.getSize(new THREE.Vector3());
  let s = 1;
  if (size) s = size / Math.max(dim.x, dim.z);
  else if (height) s = height / dim.y;
  g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
  g.scale(s, s, s);
  g.computeBoundingSphere();
  geoCache.set(key, best);
  return best;
}
