import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const HELI_ALT = 26;
export const CRUISE_ALT = 38;

/** Painted airframe texture: panel lines, rivets, grime and a faction stripe. */
function airframeTexture(stripe) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#3a4036';
  g.fillRect(0, 0, 512, 512);
  // mottled paint
  for (let i = 0; i < 900; i++) {
    const v = Math.random();
    g.fillStyle = `rgba(${v < 0.5 ? '20,24,20' : '90,96,84'},${0.04 + Math.random() * 0.05})`;
    const r = 4 + Math.random() * 26;
    g.beginPath();
    g.arc(Math.random() * 512, Math.random() * 512, r, 0, Math.PI * 2);
    g.fill();
  }
  // panel lines
  g.strokeStyle = 'rgba(10,12,10,0.55)';
  g.lineWidth = 1.5;
  for (let x = 0; x < 512; x += 64 + Math.floor(Math.random() * 3) * 16) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x, 512);
    g.stroke();
  }
  for (let y = 0; y < 512; y += 96) {
    g.beginPath();
    g.moveTo(0, y);
    g.lineTo(512, y);
    g.stroke();
  }
  g.fillStyle = 'rgba(200,200,190,0.18)';
  for (let x = 4; x < 512; x += 12) for (let y = 0; y < 512; y += 96) g.fillRect(x, y + 3, 1.5, 1.5);
  // stripe band + streaks of grime
  g.fillStyle = stripe;
  g.fillRect(0, 300, 512, 26);
  for (let i = 0; i < 70; i++) {
    g.fillStyle = `rgba(18,16,12,${0.05 + Math.random() * 0.08})`;
    g.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 3, 30 + Math.random() * 90);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function blurDiscTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  gr.addColorStop(0, 'rgba(20,20,20,0)');
  gr.addColorStop(0.15, 'rgba(20,20,20,0.25)');
  gr.addColorStop(0.9, 'rgba(20,20,20,0.18)');
  gr.addColorStop(1, 'rgba(20,20,20,0)');
  g.fillStyle = gr;
  g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 4; i++) {
    g.save();
    g.translate(128, 128);
    g.rotate((i * Math.PI) / 2);
    const lg = g.createLinearGradient(0, 0, 0, 40);
    lg.addColorStop(0, 'rgba(10,10,10,0.35)');
    lg.addColorStop(1, 'rgba(10,10,10,0)');
    g.fillStyle = lg;
    g.beginPath();
    g.moveTo(0, 0);
    g.arc(0, 0, 128, 0, 0.5);
    g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Transport helicopter (procedural PBR model) with scripted descend / ascend / flight. Nose toward +z. */
export class Helicopter {
  constructor(color = '#4a5560') {
    const tex = airframeTexture(new THREE.Color(color).getStyle());
    tex.repeat.set(1.2, 1.2);
    const paint = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1a1d1b', roughness: 0.55, metalness: 0.6 });
    const metal = new THREE.MeshStandardMaterial({ color: '#5a5e60', roughness: 0.35, metalness: 0.9 });
    const glass = new THREE.MeshPhysicalMaterial({ color: '#1c2a30', roughness: 0.03, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, transparent: true, opacity: 0.82 });
    const interior = new THREE.MeshStandardMaterial({ color: '#0d0f0e', roughness: 0.95 });
    const tire = new THREE.MeshStandardMaterial({ color: '#121212', roughness: 0.92 });
    const red = new THREE.MeshBasicMaterial({ color: '#ff2a1a' });
    const green = new THREE.MeshBasicMaterial({ color: '#2aff6a' });
    this.beacon = new THREE.MeshBasicMaterial({ color: '#ff3020' });
    const g = new THREE.Group();
    this.body = new THREE.Group();
    g.add(this.body);
    const b = this.body;
    const add = (m, x, y, z, rx = 0, ry = 0, rz = 0, parent = b) => {
      m.position.set(x, y, z);
      m.rotation.set(rx, ry, rz);
      parent.add(m);
      return m;
    };
    // cabin + nose
    add(new THREE.Mesh(new RoundedBoxGeometry(2.2, 1.85, 5.2, 5, 0.6), paint), 0, 1.65, -0.1);
    const nose = add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), paint), 0, 1.45, 2.6);
    nose.scale.set(1.05, 0.86, 1.4);
    const cockpit = add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), glass), 0, 1.72, 2.72, 1.12);
    cockpit.scale.set(1.0, 0.92, 1.08);
    // dark open cabin (side doors slid back)
    for (const s of [-1, 1]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.25, 1.9), interior), s * 1.1, 1.62, 0.15);
      add(new THREE.Mesh(new RoundedBoxGeometry(0.1, 1.3, 1.9, 2, 0.04), paint), s * 1.2, 1.62, -1.6); // slid door
      add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.55), glass), s * 1.26, 1.95, -1.6);
      // door gun on pintle
      const gun = new THREE.Group();
      add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.9), dark), 0, 0, 0.2, 0, 0, 0, gun);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 8), metal), 0, 0.02, 0.95, Math.PI / 2, 0, 0, gun);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.2), dark), 0.12 * s, -0.08, 0.15, 0, 0, 0, gun);
      add(gun, s * 1.28, 1.9, 0.6, 0, s * 0.5);
      // sponson fuel tanks and step
      const sp = add(new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.4, 6, 14), paint), s * 1.35, 0.95, -0.4, Math.PI / 2);
      sp.scale.set(1, 1, 0.9);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 1.6), metal), s * 1.25, 0.62, 0.3);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), s > 0 ? green : red), s * 1.6, 1.0, -0.9);
    }
    // cockpit frame bars
    add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.5), dark), 0, 2.25, 2.4, -0.55);
    add(new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.06), dark), 0, 1.4, 3.35);
    // FLIR ball + wire cutter + pitot
    add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10), dark), 0, 0.72, 3.0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.6, 0.12), metal), 0, 2.45, 2.55, -0.4);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.7, 6), metal), 0.5, 1.2, 3.7, Math.PI / 2);
    // engines, exhausts, mast
    add(new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.72, 3.6, 4, 0.3), paint), 0, 2.72, -0.5);
    for (const s of [-1, 1]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 1.8, 16), paint), s * 0.65, 2.78, -1.4, Math.PI / 2);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.3, 16, 1, true), dark), s * 0.65, 2.78, 0.6, Math.PI / 2);
      const ex = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.55, 12, 1, true), dark), s * 0.9, 2.82, -2.45, Math.PI / 2 - 0.3, 0, s * 0.6);
      ex.material = dark;
    }
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.6, 14), metal), 0, 3.3, 0);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.18, 16), dark), 0, 3.55, 0);
    // antennas
    add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.18), dark), 0, 2.75, -2.4, -0.3);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.4, 0.14), dark), 0, 0.68, -1.2, 0.4);
    // tail boom, fin, stabilator
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.6, 6.4, 18), paint), 0, 2.0, -5.6, Math.PI / 2 + 0.06);
    const fin = add(new THREE.Mesh(new RoundedBoxGeometry(0.18, 2.0, 1.05, 2, 0.07), paint), 0, 2.95, -8.65, -0.33);
    fin.scale.set(1, 1, 1);
    add(new THREE.Mesh(new RoundedBoxGeometry(2.9, 0.08, 0.7, 2, 0.03), paint), 0, 2.15, -8.1);
    add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), this.beacon), 0, 3.95, -9.0);
    this.beaconMesh = b.children[b.children.length - 1];
    add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })), 0, 1.7, -8.9);
    // landing gear
    for (const s of [-1, 1]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8), metal), s * 0.95, 0.58, 1.6, 0, 0, s * 0.25);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.2), metal), s * 1.0, 0.7, 1.1, 0.5);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 18), tire), s * 1.08, 0.28, 1.6, 0, 0, Math.PI / 2);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.21, 12), metal), s * 1.08, 0.28, 1.6, 0, 0, Math.PI / 2);
    }
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), tire), 0, 0.5, -7.6, 0, 0, Math.PI / 2);
    // main rotor: blades + hub + motion blur disc
    this.rotor = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new RoundedBoxGeometry(7.4, 0.05, 0.46, 1, 0.02), dark);
      blade.position.x = 3.75;
      blade.rotation.x = 0.06;
      const tip = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.052, 0.47), new THREE.MeshStandardMaterial({ color: '#c9b04a', roughness: 0.5 }));
      tip.position.x = 7.3;
      const arm = new THREE.Group();
      arm.rotation.y = (i * Math.PI) / 2;
      arm.add(blade, tip);
      this.rotor.add(arm);
    }
    this.rotor.add(new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.25, 12), metal));
    this.rotor.position.set(0, 3.68, 0);
    b.add(this.rotor);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(7.6, 48), new THREE.MeshBasicMaterial({ map: blurDiscTexture(), transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(0, 3.7, 0);
    disc.castShadow = false;
    this.disc = disc;
    b.add(disc);
    this.tailRotor = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const bl = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.3, 0.14), dark);
      bl.rotation.x = (i * Math.PI) / 4;
      this.tailRotor.add(bl);
    }
    this.tailRotor.position.set(0.18, 3.3, -8.85);
    b.add(this.tailRotor);
    g.traverse((o) => {
      if (o.isMesh && o !== disc && o.material !== red && o.material !== green && o.material !== this.beacon) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    this.mesh = g;
    this.mode = 'idle';
    this.t = 0;
    this.y = 0;
    this.spin = 0;
    this.mesh.visible = false;
    this.fly = null;
  }

  placeAt(x, z, yaw = 0) {
    this.mesh.position.set(x, this.y, z);
    this.mesh.rotation.y = yaw;
  }

  /** World position next to the left cabin door at ground level. */
  doorPos(out = new THREE.Vector3(), dist = 1.8) {
    const yaw = this.mesh.rotation.y;
    // left side (-x local) rotated by yaw
    out.set(this.mesh.position.x - Math.cos(yaw) * dist, 0, this.mesh.position.z + Math.sin(yaw) * dist);
    return out;
  }

  descend(dur = 3, from = HELI_ALT) {
    this.mode = 'descend';
    this.t = 0;
    this.dur = dur;
    this.from = from;
    this.mesh.visible = true;
  }

  ascend(dur = 3, to = HELI_ALT, hide = true) {
    this.mode = 'ascend';
    this.t = 0;
    this.dur = dur;
    this.to = to;
    this.hide = hide;
    this.mesh.visible = true;
  }

  land() {
    this.mode = 'landed';
    this.mesh.visible = true;
    this.y = 0;
    this.mesh.position.y = 0;
  }

  /** Cruise from the current position to (x, z) at `speed` m/s; nose follows the heading, body pitches. */
  flyTo(x, z, speed = 40) {
    const p = this.mesh.position;
    this.fly = { x0: p.x, z0: p.z, x, z, d: Math.hypot(x - p.x, z - p.z), speed, s: 0 };
    this.mode = 'fly';
    this.t = 0;
    this.mesh.visible = true;
    this.mesh.rotation.y = Math.atan2(x - p.x, z - p.z);
  }

  /** Seconds left in the current flight. */
  eta() {
    if (this.mode !== 'fly' || !this.fly) return 0;
    return Math.max(0, (this.fly.d - this.fly.s) / this.fly.speed);
  }

  update(dt, spin = 24) {
    if (!this.mesh.visible) return;
    this.spin = THREE.MathUtils.lerp(this.spin, spin, Math.min(1, dt * 1.5));
    this.rotor.rotation.y += dt * this.spin;
    this.tailRotor.rotation.x += dt * this.spin * 1.4;
    // blades fade into a blur disc at speed
    const blur = THREE.MathUtils.smoothstep(this.spin, 8, 20);
    this.disc.material.opacity = blur;
    this.disc.visible = blur > 0.02;
    this.t += dt;
    this.beaconMesh.visible = Math.sin(this.t * 7) > 0.4;
    let pitch = 0, roll = 0;
    if (this.mode === 'descend') {
      const k = Math.min(1, this.t / this.dur);
      this.y = this.from * (1 - k) ** 2;
      pitch = -0.12 * (1 - k); // flare
      if (k >= 1) this.mode = 'landed';
    } else if (this.mode === 'ascend') {
      const k = Math.min(1, this.t / this.dur);
      this.y = this.to * k * k;
      pitch = 0.08 * k;
      if (k >= 1) {
        this.mode = 'hover';
        if (this.hide) {
          this.mode = 'idle';
          this.mesh.visible = false;
        }
      }
    } else if (this.mode === 'landed') {
      this.y = Math.sin(this.t * 6) * 0.015;
    } else if (this.mode === 'hover') {
      this.y += Math.sin(this.t * 1.3) * 0.004;
    } else if (this.mode === 'fly') {
      const f = this.fly;
      // accelerate, cruise, decelerate
      const ramp = Math.min(1, f.s / 60, (f.d - f.s) / 80 + 0.08);
      const v = f.speed * Math.max(0.12, ramp);
      f.s = Math.min(f.d, f.s + v * dt);
      const k = f.d > 0 ? f.s / f.d : 1;
      this.mesh.position.x = f.x0 + (f.x - f.x0) * k;
      this.mesh.position.z = f.z0 + (f.z - f.z0) * k;
      this.y = THREE.MathUtils.lerp(this.y, CRUISE_ALT, Math.min(1, dt * 0.8));
      pitch = 0.16 * ramp;
      roll = Math.sin(this.t * 0.7) * 0.03;
      if (f.s >= f.d) {
        this.mode = 'hover';
        this.fly = null;
      }
    }
    this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, pitch, Math.min(1, dt * 2));
    this.body.rotation.z = THREE.MathUtils.lerp(this.body.rotation.z, roll, Math.min(1, dt * 2));
    this.mesh.position.y = this.y;
  }
}
