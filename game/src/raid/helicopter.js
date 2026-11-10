import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Transport helicopter (procedural PBR model) with a scripted descend/hover/ascend. Nose toward +z. */
export class Helicopter {
  constructor(color = '#4a5560') {
    // UH-60 style transport: dark grey airframe with a faction stripe
    const paint = new THREE.MeshStandardMaterial({ color: '#2f3438', roughness: 0.55, metalness: 0.45 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1b1e20', roughness: 0.6, metalness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({ color: '#10181e', roughness: 0.04, metalness: 0.7 });
    const stripe = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).lerp(new THREE.Color('#2f3438'), 0.25), roughness: 0.5 });
    const tire = new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.9 });
    const g = new THREE.Group();
    const add = (m, x, y, z, rx = 0) => {
      m.position.set(x, y, z);
      m.rotation.x = rx;
      g.add(m);
      return m;
    };
    add(new THREE.Mesh(new RoundedBoxGeometry(2.1, 1.75, 5.4, 4, 0.55), paint), 0, 1.6, 0);
    const nose = add(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), paint), 0, 1.5, 2.75);
    nose.scale.set(1.0, 0.85, 1.3);
    const cockpit = add(new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.45), glass), 0, 1.75, 2.75, 1.1);
    cockpit.scale.set(0.98, 0.9, 1.05);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 1.3), glass), 1.06, 1.95, 0.6);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 1.3), glass), -1.06, 1.95, 0.6);
    add(new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.22, 5.2), stripe), 0, 1.15, 0);
    // engines + mast
    add(new THREE.Mesh(new RoundedBoxGeometry(1.7, 0.7, 3.4, 3, 0.25), paint), 0, 2.7, -0.4);
    for (const x of [-0.6, 0.6]) add(new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 1.6, 14), dark), x, 2.75, -1.6, Math.PI / 2);
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.55, 12), dark), 0, 3.25, 0);
    // tail boom, fin, stabilizer
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.55, 6.2, 16), paint), 0, 2.0, -5.6, Math.PI / 2 + 0.06);
    const fin = add(new THREE.Mesh(new RoundedBoxGeometry(0.16, 1.8, 1.0, 2, 0.06), paint), 0, 2.85, -8.6);
    fin.rotation.x = -0.35;
    add(new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.08, 0.6, 2, 0.03), paint), 0, 2.2, -8.2);
    // landing gear (wheels)
    for (const x of [-1.0, 1.0]) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), dark), x * 0.95, 0.55, 1.6);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.18, 16), tire), x * 1.05, 0.26, 1.6).rotation.z = Math.PI / 2;
    }
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.1, 12), tire), 0, 0.5, -7.6).rotation.z = Math.PI / 2;
    add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.6), dark), 1.12, 0.75, 1.0);
    add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.6), dark), -1.12, 0.75, 1.0);
    this.rotor = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new RoundedBoxGeometry(7.2, 0.05, 0.42, 1, 0.02), dark);
      blade.position.x = 3.6;
      const arm = new THREE.Group();
      arm.rotation.y = (i * Math.PI) / 2;
      arm.add(blade);
      this.rotor.add(arm);
    }
    this.rotor.position.set(0, 3.55, 0);
    g.add(this.rotor);
    this.tailRotor = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.2, 0.12), dark);
      b.rotation.x = (i * Math.PI) / 2;
      this.tailRotor.add(b);
    }
    this.tailRotor.position.set(0.15, 3.2, -8.75);
    g.add(this.tailRotor);
    g.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    this.mesh = g;
    this.mode = 'idle';
    this.t = 0;
    this.y = 0;
    this.mesh.visible = false;
  }

  placeAt(x, z, yaw = 0) {
    this.mesh.position.set(x, 0, z);
    this.mesh.rotation.y = yaw;
  }

  descend(dur = 3) {
    this.mode = 'descend';
    this.t = 0;
    this.dur = dur;
    this.mesh.visible = true;
  }

  ascend(dur = 3) {
    this.mode = 'ascend';
    this.t = 0;
    this.dur = dur;
    this.mesh.visible = true;
  }

  land() {
    this.mode = 'landed';
    this.mesh.visible = true;
    this.y = 0;
  }

  update(dt, spin = 24) {
    if (!this.mesh.visible) return;
    this.rotor.rotation.y += dt * spin;
    this.tailRotor.rotation.x += dt * spin * 1.4;
    this.t += dt;
    const ALT = 26;
    if (this.mode === 'descend') {
      const k = Math.min(1, this.t / this.dur);
      this.y = ALT * (1 - k) ** 2;
      if (k >= 1) this.mode = 'landed';
    } else if (this.mode === 'ascend') {
      const k = Math.min(1, this.t / this.dur);
      this.y = ALT * k * k;
      if (k >= 1) {
        this.mode = 'idle';
        this.mesh.visible = false;
      }
    } else if (this.mode === 'landed') {
      this.y = Math.sin(this.t * 6) * 0.02;
    }
    this.mesh.position.y = this.y;
  }
}
