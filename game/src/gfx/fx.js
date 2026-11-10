import * as THREE from 'three';
import { scorchTexture } from './procgen.js';

/*
 * Procedural particle FX: explosions (fireball, smoke, debris, scorch),
 * burning wrecks with smoke columns, and impact dust. Sprite pool, no images.
 */

function softTex(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  if (kind === 'fire') {
    gr.addColorStop(0, 'rgba(255,250,220,1)');
    gr.addColorStop(0.25, 'rgba(255,190,80,0.95)');
    gr.addColorStop(0.6, 'rgba(230,80,20,0.55)');
    gr.addColorStop(1, 'rgba(120,20,0,0)');
  } else {
    gr.addColorStop(0, 'rgba(255,255,255,0.9)');
    gr.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
  }
  g.fillStyle = gr;
  g.fillRect(0, 0, 128, 128);
  if (kind === 'smoke') {
    // lumpy billow
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 36;
      const b = g.createRadialGradient(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 0, 64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 18);
      b.addColorStop(0, 'rgba(255,255,255,0.25)');
      b.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = b;
      g.fillRect(0, 0, 128, 128);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const POOL = 220;

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.tex = { fire: softTex('fire'), smoke: softTex('smoke') };
    this.parts = [];
    this.free = [];
    for (let i = 0; i < POOL; i++) {
      const add = i % 3 === 0;
      const m = new THREE.SpriteMaterial({ map: add ? this.tex.fire : this.tex.smoke, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, fog: true });
      const s = new THREE.Sprite(m);
      s.visible = false;
      s.renderOrder = 5;
      scene.add(s);
      const p = { s, fire: add, vel: new THREE.Vector3(), life: 0, max: 1, s0: 1, s1: 1, rot: 0, grav: 0, col: new THREE.Color(), col1: new THREE.Color(), op: 1 };
      this.parts.push(p);
      this.free.push(p);
    }
    this.emitters = [];
    this.decals = [];
    this.light = new THREE.PointLight('#ffb060', 0, 26, 1.4);
    scene.add(this.light);
    this.lightT = 0;
  }

  spawn(fire, x, y, z, o) {
    const p = this.free.find((q) => q.fire === fire);
    if (!p) return null;
    this.free.splice(this.free.indexOf(p), 1);
    p.s.position.set(x, y, z);
    p.vel.set(o.vx ?? 0, o.vy ?? 0, o.vz ?? 0);
    p.life = 0;
    p.max = o.life ?? 1;
    p.s0 = o.s0 ?? 1;
    p.s1 = o.s1 ?? p.s0 * 2;
    p.grav = o.grav ?? 0;
    p.drag = o.drag ?? 1.2;
    p.op = o.op ?? 1;
    p.col.set(o.col ?? '#ffffff');
    p.col1.set(o.col1 ?? o.col ?? '#ffffff');
    p.s.material.rotation = Math.random() * Math.PI * 2;
    p.s.visible = true;
    return p;
  }

  /** Big explosion at ground point (x, z). */
  explosion(x, z, scale = 1) {
    const R = Math.random;
    for (let i = 0; i < 16 * scale; i++) {
      const a = R() * Math.PI * 2, sp = 2 + R() * 6;
      this.spawn(true, x, 0.6 + R(), z, { vx: Math.cos(a) * sp, vy: 2 + R() * 6, vz: Math.sin(a) * sp, life: 0.35 + R() * 0.45, s0: 1.5 * scale, s1: 4 * scale, drag: 3 });
    }
    for (let i = 0; i < 22 * scale; i++) {
      const a = R() * Math.PI * 2, sp = 1 + R() * 4;
      const dark = R() < 0.7;
      this.spawn(false, x + (R() - 0.5), 0.8 + R() * 1.5, z + (R() - 0.5), {
        vx: Math.cos(a) * sp, vy: 1.5 + R() * 3.5, vz: Math.sin(a) * sp, life: 2.5 + R() * 3, s0: 1.6 * scale, s1: 6 * scale, drag: 1.4,
        col: dark ? '#2a2622' : '#6e665c', col1: dark ? '#4a4540' : '#8a8478', op: 0.85,
      });
    }
    for (let i = 0; i < 14 * scale; i++) {
      const a = R() * Math.PI * 2, sp = 6 + R() * 8;
      this.spawn(false, x, 0.5, z, { vx: Math.cos(a) * sp, vy: 5 + R() * 7, vz: Math.sin(a) * sp, life: 0.9 + R() * 0.5, s0: 0.18, s1: 0.14, grav: 20, drag: 0.3, col: '#1a1612', op: 1 });
    }
    this.light.position.set(x, 2.5, z);
    this.light.intensity = 90 * scale;
    this.lightT = 0.35;
    // scorch mark stays on the ground
    const d = new THREE.Mesh(new THREE.PlaneGeometry(4.5 * scale, 4.5 * scale), new THREE.MeshStandardMaterial({ map: scorchTexture(), transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 }));
    d.rotation.set(-Math.PI / 2, 0, R() * 6);
    d.position.set(x, 0.03, z);
    this.scene.add(d);
    this.decals.push(d);
    if (this.decals.length > 24) {
      const old = this.decals.shift();
      this.scene.remove(old);
      old.geometry.dispose();
    }
  }

  /** Dust puff where a bullet hits the ground or a wall. */
  impact(x, y, z) {
    for (let i = 0; i < 3; i++) this.spawn(false, x, y, z, { vx: (Math.random() - 0.5) * 1.5, vy: 0.6 + Math.random(), vz: (Math.random() - 0.5) * 1.5, life: 0.5 + Math.random() * 0.4, s0: 0.25, s1: 0.9, col: '#8a7a62', op: 0.55 });
  }

  /** Persistent fire + smoke column (burning wreck). */
  addFire(x, z, s = 1) {
    this.emitters.push({ x, z, s, t: Math.random() });
  }

  update(dt, focus) {
    for (const e of this.emitters) {
      if (Math.abs(e.x - focus.x) > 120 || Math.abs(e.z - focus.z) > 120) continue;
      e.t -= dt;
      if (e.t > 0) continue;
      e.t = 0.09;
      const R = Math.random;
      this.spawn(true, e.x + (R() - 0.5) * e.s, 0.3, e.z + (R() - 0.5) * e.s, { vy: 1.5 + R(), vx: (R() - 0.5) * 0.4, vz: (R() - 0.5) * 0.4, life: 0.5 + R() * 0.3, s0: 0.9 * e.s, s1: 0.3 * e.s, drag: 0.5 });
      if (R() < 0.6) this.spawn(false, e.x, 1.2, e.z, { vy: 2.2 + R(), vx: 0.6 + R() * 0.4, vz: 0.3 * R(), life: 5 + R() * 3, s0: 1.2 * e.s, s1: 7 * e.s, drag: 0.15, col: '#1e1b18', col1: '#5a5550', op: 0.7 });
    }
    for (const p of this.parts) {
      if (!p.s.visible) continue;
      p.life += dt;
      const k = p.life / p.max;
      if (k >= 1) {
        p.s.visible = false;
        this.free.push(p);
        continue;
      }
      p.vel.y -= p.grav * dt;
      p.vel.multiplyScalar(Math.exp(-p.drag * dt));
      p.s.position.addScaledVector(p.vel, dt);
      if (p.s.position.y < 0.1) {
        p.s.position.y = 0.1;
        p.vel.y = 0;
      }
      const sc = p.s0 + (p.s1 - p.s0) * Math.sqrt(k);
      p.s.scale.set(sc, sc, 1);
      p.s.material.color.copy(p.col).lerp(p.col1, k);
      p.s.material.opacity = p.op * (p.fire ? 1 - k : Math.min(1, k * 6) * (1 - k));
      p.s.material.rotation += dt * 0.3;
    }
    if (this.lightT > 0) {
      this.lightT -= dt;
      this.light.intensity = Math.max(0, this.light.intensity - dt * 260);
    } else this.light.intensity = 0;
  }
}
