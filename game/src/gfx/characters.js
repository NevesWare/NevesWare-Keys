import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { itemModel } from './items.js';

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
  const gltf = await new GLTFLoader().loadAsync(url);
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
  };
}

export function charactersReady() {
  return !!assets;
}

/** One animated character instance. */
export class CharacterRig {
  constructor({ faction, seed = 0 }) {
    const look = FACTION_LOOK[faction] ?? FACTION_LOOK.scav;
    this.root = new THREE.Group();
    this.model = skeletonClone(assets.scene);
    this.root.add(this.model);
    const bodyColor = faction === 'scav' ? SCAV_BODIES[seed % SCAV_BODIES.length] : look.body;
    this.bodyMat = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.85, metalness: 0 });
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
    if (this.dead) return;
    this.oneShot = 0.55;
    this.play('upper', Math.random() < 0.5 ? 'Punch_Jab' : 'Punch_Cross', 0.08, { once: true, timeScale: 1.4 });
  }

  shoot() {
    if (this.dead) return;
    this.oneShot = 0.18;
    this.play('upper', 'Pistol_Shoot', 0.05, { once: true, timeScale: 2.2 });
  }

  die() {
    if (this.dead) return;
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
