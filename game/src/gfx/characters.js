import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { itemModel } from './items.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/*
 * Animated humanoids built on Quaternius' Universal Animation Library mannequin (CC0).
 * Two animation layers: lower body (locomotion) and upper body (aim / reload / shoot),
 * made by splitting each clip's tracks by bone.
 */

const UPPER_BONES = ['spine002', 'spine003', 'neck', 'head', 'shoulder', 'upper_arm', 'forearm', 'hand', 'f_', 'thumb'];
const isUpper = (bone) => UPPER_BONES.some((k) => bone.includes(k));

export const FACTION_LOOK = {
  bears: { body: '#4c5240', joints: '#2a2d24', band: '#d0473a' },
  eagle: { body: '#7a6e55', joints: '#3d3a30', band: '#4a90e2' },
  cult: { body: '#26262a', joints: '#141416', band: '#e3d6b4' },
  zombie: { body: '#6f7a5c', joints: '#4a3b34', band: null },
  scav: { body: '#7a6a52', joints: '#3a332a', band: '#a8703f' },
};
const SCAV_BODIES = ['#7a6a52', '#5c6670', '#6b4a3a', '#55603e', '#7d7468'];

let assets = null;

export async function loadCharacters(url) {
  if (assets) return assets;
  const loader = new GLTFLoader();
  let gltf;
  if (url.startsWith('data:')) {
    // Published pages block fetch() of data: URLs (CSP) — decode in memory instead.
    const b64 = url.slice(url.indexOf(',') + 1);
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    gltf = await loader.parseAsync(buf.buffer, '');
  } else gltf = await loader.loadAsync(url);
  const clips = {};
  for (const c of gltf.animations) {
    // keep the character in place (no root motion)
    const tracks = c.tracks.filter((t) => !t.name.startsWith('root.'));
    const full = new THREE.AnimationClip(c.name, c.duration, tracks);
    const split = (pred) =>
      new THREE.AnimationClip(c.name, c.duration, tracks.filter((t) => pred(t.name.slice(0, t.name.lastIndexOf('.')))));
    clips[c.name] = { full, upper: split(isUpper), lower: split((b) => !isUpper(b)) };
  }
  gltf.scene.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.frustumCulled = false; // skinned bounds are unreliable; actors are culled by distance instead
    }
  });
  assets = { scene: gltf.scene, clips, offsets: null };
  assets.offsets = computeGearOffsets();
  return assets;
}

/** Pose a reference rig in the aim pose and derive bone-local transforms for gear. */
function computeGearOffsets() {
  // body gear is fitted in the neutral idle pose; the weapon in the aim pose
  const pose = (clip) => {
    const ref = skeletonClone(assets.scene);
    const mixer = new THREE.AnimationMixer(ref);
    mixer.clipAction(assets.clips[clip].full).play();
    mixer.update(0.0001);
    ref.updateMatrixWorld(true);
    return (n) => ref.getObjectByName(n);
  };
  const idle = pose('Idle_Loop'), aim = pose('Pistol_Aim_Neutral');
  const head = idle('DEF-head'), chest = idle('DEF-spine003'), hand = aim('DEF-handR');
  const wp = (o) => o.getWorldPosition(new THREE.Vector3());
  const local = (b, pos, rotY = 0, scale = 1) => {
    const desired = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY), new THREE.Vector3(scale, scale, scale));
    return new THREE.Matrix4().copy(b.matrixWorld).invert().multiply(desired);
  };
  const hp = wp(head), cp = wp(chest), hd = wp(hand);
  // the aim pose holds the gun forward of the hand; align barrel with character +z
  const fwd = new THREE.Vector3(0, 0, 1);
  return {
    helmet: { bone: 'DEF-head', m: local(head, hp.clone().add(new THREE.Vector3(0, 0.1, 0.0)), 0, 1.05) },
    armor: { bone: 'DEF-spine003', m: local(chest, cp.clone().add(new THREE.Vector3(0, -0.24, 0.0)), 0, 1.12) },
    backpack: { bone: 'DEF-spine003', m: local(chest, cp.clone().add(new THREE.Vector3(0, -0.3, -0.21)), Math.PI, 1.0) },
    weapon: { bone: 'DEF-handR', m: local(hand, hd.clone().add(new THREE.Vector3(-0.02, -0.03, 0.02)).addScaledVector(fwd, 0.0), 0, 1.0) },
    // clothing / kit always worn by humans (fitted in idle pose)
    wear: [
      ['DEF-head', 'balaclava', new THREE.Vector3(0, 0.1, 0.012)],
      ['DEF-head', 'goggles', new THREE.Vector3(0, 0.125, 0.1)],
      ['DEF-handL', 'glove', new THREE.Vector3(0, -0.02, 0.0)],
      ['DEF-handR', 'glove', new THREE.Vector3(0, -0.02, 0.0)],
      ['DEF-footL', 'boot', new THREE.Vector3(0, -0.02, 0.04)],
      ['DEF-footR', 'boot', new THREE.Vector3(0, -0.02, 0.04)],
      ['DEF-shinL', 'knee', new THREE.Vector3(0, 0.0, 0.07)],
      ['DEF-shinR', 'knee', new THREE.Vector3(0, 0.0, 0.07)],
      ['DEF-thighR', 'holster', new THREE.Vector3(0.11, -0.12, 0.0)],
      ['DEF-spine001', 'belt', new THREE.Vector3(0, 0.02, 0)],
    ].map(([bone, kind, off]) => {
      const b = idle(bone);
      return { bone, kind, m: local(b, wp(b).add(off), 0, 1) };
    }),
  };
}

const WEAR_GEO = {};
function wearMesh(kind, mats) {
  const g = (WEAR_GEO[kind] ??= (() => {
    switch (kind) {
      case 'balaclava': return new THREE.SphereGeometry(0.118, 18, 14).scale(1, 1.12, 1.08);
      case 'goggles': return new RoundedBoxGeometry(0.17, 0.05, 0.05, 2, 0.02);
      case 'glove': return new THREE.SphereGeometry(0.052, 12, 10).scale(1, 1.25, 0.8);
      case 'boot': return new RoundedBoxGeometry(0.12, 0.13, 0.27, 2, 0.04);
      case 'knee': return new RoundedBoxGeometry(0.11, 0.12, 0.05, 2, 0.02);
      case 'holster': return new RoundedBoxGeometry(0.06, 0.2, 0.13, 2, 0.02);
      case 'belt': return new THREE.CylinderGeometry(0.17, 0.17, 0.06, 18).scale(1, 1, 0.78);
      case 'cap': return new THREE.SphereGeometry(0.125, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
      case 'brim': return new RoundedBoxGeometry(0.18, 0.015, 0.09, 1, 0.006);
      default: return new THREE.BoxGeometry(0.05, 0.05, 0.05);
    }
  })());
  const m = new THREE.Mesh(g, kind === 'goggles' ? mats.glass : kind === 'boot' ? mats.boot : mats.kit);
  m.castShadow = true;
  return m;
}

/** Procedural camouflage on the body (the mannequin has no UVs: noise in bind-pose space). */
function camoMaterial(colors, roughness = 0.88) {
  const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness, metalness: 0 });
  const u = { uC0: { value: new THREE.Color(colors[0]) }, uC1: { value: new THREE.Color(colors[1]) }, uC2: { value: new THREE.Color(colors[2]) } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCamo;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCamo = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vCamo; uniform vec3 uC0, uC1, uC2;
        float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float vn(vec3 p){ vec3 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(mix(h3(i), h3(i+vec3(1,0,0)), f.x), mix(h3(i+vec3(0,1,0)), h3(i+vec3(1,1,0)), f.x), f.y),
                     mix(mix(h3(i+vec3(0,0,1)), h3(i+vec3(1,0,1)), f.x), mix(h3(i+vec3(0,1,1)), h3(i+vec3(1,1,1)), f.x), f.y), f.z); }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float n1 = vn(vCamo * 9.0) * 0.65 + vn(vCamo * 22.0) * 0.35;
        float n2 = vn(vCamo * 14.0 + 7.3);
        vec3 cc = mix(uC0, uC1, smoothstep(0.45, 0.55, n1));
        cc = mix(cc, uC2, smoothstep(0.6, 0.68, n2));
        cc *= 0.9 + vn(vCamo * 120.0) * 0.2; // fabric grain
        diffuseColor.rgb *= cc;`,
      );
  };
  return mat;
}

const CAMO = {
  bears: ['#3f4534', '#59604a', '#262a1f'],
  eagle: ['#6f6650', '#8c8062', '#4b4f3c'],
  cult: ['#1c1c1f', '#2e2e32', '#3c3c41'],
  zombie: ['#6f7a5c', '#58614a', '#5a2a24'],
};

export function charactersReady() {
  return !!assets;
}

/** One animated character instance. */
export class CharacterRig {
  constructor({ faction, seed = 0 }) {
    const look = FACTION_LOOK[faction] ?? FACTION_LOOK.scav;
    if (!assets) {
      this.initFallback(faction, look);
      return;
    }
    this.root = new THREE.Group();
    this.model = skeletonClone(assets.scene);
    this.root.add(this.model);
    const bodyColor = faction === 'scav' ? SCAV_BODIES[seed % SCAV_BODIES.length] : look.body;
    this.bodyMat = CAMO[faction] ? camoMaterial(CAMO[faction]) : new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.88, metalness: 0 });
    this.jointMat = new THREE.MeshStandardMaterial({ color: look.joints, roughness: 0.7, metalness: 0.05 });
    this.model.traverse((o) => {
      if (!o.isMesh) return;
      o.material = o.material.name === 'M_Joints' ? this.jointMat : this.bodyMat;
      o.castShadow = true;
      o.frustumCulled = false;
    });
    this.bones = {};
    this.model.traverse((o) => {
      if (o.isBone) this.bones[o.name] = o;
    });
    // worn kit: balaclava, goggles, gloves, boots, knee pads, holster, belt
    if (faction !== 'zombie') {
      const dark = faction === 'cult' ? '#111113' : faction === 'scav' ? '#2a2622' : '#1d1f1c';
      const mats = {
        kit: new THREE.MeshStandardMaterial({ color: dark, roughness: 0.9 }),
        boot: new THREE.MeshStandardMaterial({ color: '#1a1714', roughness: 0.7 }),
        glass: new THREE.MeshStandardMaterial({ color: '#0e1418', roughness: 0.08, metalness: 0.6 }),
      };
      this.wear = [];
      for (const w of assets.offsets.wear) {
        if (faction === 'scav' && (w.kind === 'knee' || w.kind === 'holster')) continue;
        const m = wearMesh(w.kind, mats);
        m.matrixAutoUpdate = false;
        m.matrix.copy(w.m);
        this.bones[w.bone]?.add(m);
        this.wear.push({ kind: w.kind, mesh: m });
      }
    }
    // faction armband on the left upper arm
    const band = look.band && new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.07, 12, 1, true), new THREE.MeshStandardMaterial({ color: look.band, roughness: 0.6, side: THREE.DoubleSide }));
    band?.position.set(0, 0.12, 0);
    if (band) this.bones['DEF-upper_armL']?.add(band);

    this.mixer = new THREE.AnimationMixer(this.model);
    this.layers = { lower: null, upper: null };
    this.names = { lower: '', upper: '' };
    this.gear = {};
    this.dead = false;
    this.oneShot = null;
    this.play('lower', 'Idle_Loop', 0);
    this.play('upper', 'Idle_Loop', 0);
  }

  /** Simple static humanoid used if the animated model could not be loaded. */
  initFallback(faction, look) {
    this.fallback = true;
    this.root = new THREE.Group();
    this.bodyMat = CAMO[faction] ? camoMaterial(CAMO[faction]) : new THREE.MeshStandardMaterial({ color: look.body, roughness: 0.88 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1d1f1c', roughness: 0.9 });
    const cap = (r, len, m, x, y, z) => {
      const mesh = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      this.root.add(mesh);
      return mesh;
    };
    this.legL = cap(0.085, 0.7, this.bodyMat, -0.11, 0.48, 0);
    this.legR = cap(0.085, 0.7, this.bodyMat, 0.11, 0.48, 0);
    cap(0.17, 0.42, this.bodyMat, 0, 1.2, 0);
    cap(0.11, 0.02, dark, 0, 1.66, 0);
    cap(0.06, 0.45, this.bodyMat, -0.22, 1.25, 0.18).rotation.x = 1.2;
    cap(0.06, 0.45, this.bodyMat, 0.22, 1.25, 0.18).rotation.x = 1.2;
    this.gear = {};
    this.phase = 0;
    this.dead = false;
  }

  action(layer, name) {
    const c = assets.clips[name];
    return this.mixer.clipAction(layer === 'full' ? c.full : c[layer]);
  }

  play(layer, name, fade = 0.2, { once = false, timeScale = 1 } = {}) {
    if (this.names[layer] === name && !once) {
      this.layers[layer].timeScale = timeScale;
      return;
    }
    const a = this.action(layer, name);
    a.reset();
    a.timeScale = timeScale;
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    a.clampWhenFinished = once;
    a.enabled = true;
    a.setEffectiveWeight(1);
    if (this.layers[layer] && this.layers[layer] !== a) this.layers[layer].crossFadeTo(a, fade, false);
    a.play();
    this.layers[layer] = a;
    this.names[layer] = name;
  }

  /** Show equipment: { helmet, armor, backpack, weapon } item ids or null. */
  setGear(g) {
    if (this.fallback) {
      const spots = { helmet: [0, 1.7, 0], armor: [0, 0.98, 0], backpack: [0, 1.0, -0.2], weapon: [0.12, 1.32, 0.35] };
      for (const slot of Object.keys(spots)) {
        const id = g[slot] ?? null;
        if (this.gear[slot]?.id === id) continue;
        if (this.gear[slot]) this.gear[slot].obj.removeFromParent();
        this.gear[slot] = null;
        if (!id) continue;
        const obj = itemModel(id);
        obj.position.set(...spots[slot]);
        if (slot === 'backpack') obj.rotation.y = Math.PI;
        this.root.add(obj);
        this.gear[slot] = { id, obj };
      }
      return;
    }
    for (const slot of ['helmet', 'armor', 'backpack', 'weapon']) {
      const id = g[slot] ?? null;
      if (this.gear[slot]?.id === id) continue;
      if (this.gear[slot]) this.gear[slot].obj.removeFromParent();
      this.gear[slot] = null;
      if (!id) continue;
      const off = assets.offsets[slot];
      const obj = itemModel(id);
      obj.matrixAutoUpdate = false;
      obj.matrix.copy(off.m);
      this.bones[off.bone].add(obj);
      this.gear[slot] = { id, obj };
    }
  }

  melee() {
    if (this.dead || this.fallback) return;
    this.oneShot = 0.55;
    this.play('upper', Math.random() < 0.5 ? 'Punch_Jab' : 'Punch_Cross', 0.08, { once: true, timeScale: 1.4 });
  }

  shoot() {
    if (this.dead || this.fallback) return;
    this.oneShot = 0.18;
    this.play('upper', 'Pistol_Shoot', 0.05, { once: true, timeScale: 2.2 });
  }

  die() {
    if (this.dead) return;
    if (this.fallback) {
      this.dead = true;
      this.root.rotation.x = -Math.PI / 2;
      this.root.position.y = 0.2;
      return;
    }
    this.dead = true;
    this.mixer.stopAllAction();
    this.layers = { lower: null, upper: null };
    this.names = { lower: '', upper: '' };
    const a = this.action('full', 'Death01');
    a.setLoop(THREE.LoopOnce, 1);
    a.clampWhenFinished = true;
    a.play();
  }

  flash(on) {
    this.bodyMat.emissive.set(on ? '#5a1a10' : '#000000');
  }

  /**
   * @param s { speed, sprint, armed, aiming, reloading, healing, backwards, zombie }
   */
  update(dt, s) {
    if (this.fallback) {
      if (this.dead) return;
      this.phase += (s.speed ?? 0) * dt * 2.5;
      const sw = (s.speed ?? 0) > 0.25 ? Math.sin(this.phase) * 0.5 : 0;
      this.legL.rotation.x = sw;
      this.legR.rotation.x = -sw;
      return;
    }
    if (!this.dead) {
      const moving = s.speed > 0.25;
      const ts = s.backwards ? -1 : 1;
      if (s.sprint && moving) {
        this.play('lower', 'Sprint_Loop', 0.2, { timeScale: ts });
        if (!this.oneShot) this.play('upper', 'Sprint_Loop', 0.2);
      } else {
        const lower = !moving ? 'Idle_Loop' : s.speed < 2.6 ? 'Walk_Loop' : 'Jog_Fwd_Loop';
        const k = s.zombie ? 0.75 : 1;
        this.play('lower', lower, 0.2, { timeScale: moving ? ts * k * Math.max(0.7, s.speed / (lower === 'Walk_Loop' ? 1.8 : 4)) : 1 });
        if (this.oneShot != null) {
          this.oneShot -= dt;
          if (this.oneShot <= 0) this.oneShot = null;
        } else if (s.reloading) this.play('upper', 'Pistol_Reload', 0.15);
        else if (s.healing) this.play('upper', 'Interact', 0.2);
        else if (s.zombie) this.play('upper', 'Pistol_Aim_Neutral', 0.3, { timeScale: 0.4 });
        else if (s.armed && s.aiming) this.play('upper', 'Pistol_Aim_Neutral', 0.12);
        else if (s.armed) this.play('upper', 'Pistol_Idle_Loop', 0.2);
        else this.play('upper', lower, 0.2);
      }
    }
    this.mixer.update(dt);
  }
}
