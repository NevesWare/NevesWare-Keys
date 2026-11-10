import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

/** Transport helicopter (procedural PBR model) with a scripted descend/hover/ascend. Nose toward +z. */
export class Helicopter {
  constructor(color = '#4a5560') {
    const tone = new THREE.Color('#4b5244').lerp(new THREE.Color(color), 0.3);
    const paint = new THREE.MeshStandardMaterial({ color: tone, roughness: 0.6, metalness: 0.3 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1e2022', roughness: 0.6, metalness: 0.5 });
    const glass = new THREE.MeshStandardMaterial({ color: '#1a2830', roughness: 0.05, metalness: 0.5 });
    const stripe = new THREE.MeshStandardMaterial({ color: '#e8e0cc', roughness: 0.6 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), paint);
    body.scale.set(1.25, 1.15, 3.0);
    body.position.set(0, 1.55, 0.2);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5), glass);
    nose.scale.set(1.1, 1.0, 1.6);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 1.75, 1.75);
    const boom = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.42, 5.2, 16), paint);
    boom.rotation.x = Math.PI / 2;
    boom.position.set(0, 1.9, -4.9);
    const fin = new THREE.Mesh(new RoundedBoxGeometry(0.12, 1.5, 0.9, 2, 0.05), paint);
    fin.position.set(0, 2.55, -7.3);
    fin.rotation.x = -0.3;
    const stab = new THREE.Mesh(new RoundedBoxGeometry(1.8, 0.08, 0.5, 2, 0.03), paint);
    stab.position.set(0, 1.95, -6.8);
    const engine = new THREE.Mesh(new RoundedBoxGeometry(1.3, 0.6, 2.6, 3, 0.2), dark);
    engine.position.set(0, 2.75, -0.3);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.5, 12), dark);
    mast.position.set(0, 3.2, -0.2);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.25, 32, 1, true), stripe);
    band.rotation.x = Math.PI / 2;
    band.scale.set(1.26, 1, 1.16);
    band.position.set(0, 1.55, -1.4);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.1, 1.5), dark);
    door.position.set(1.22, 1.45, 0.1);
    const door2 = door.clone();
    door2.position.x = -1.22;
    g.add(body, nose, boom, fin, stab, engine, mast, band, door, door2);
    for (const x of [-0.95, 0.95]) {
      const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.2, 10), dark);
      skid.rotation.x = Math.PI / 2;
      skid.position.set(x, 0.07, 0.2);
      g.add(skid);
      for (const z of [-1.0, 1.3]) {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.75, 8), dark);
        strut.position.set(x * 0.92, 0.42, z);
        strut.rotation.z = x > 0 ? 0.25 : -0.25;
        g.add(strut);
      }
    }
    this.rotor = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new RoundedBoxGeometry(5.6, 0.04, 0.32, 1, 0.015), dark);
      blade.position.x = 2.8;
      const arm = new THREE.Group();
      arm.rotation.y = (i * Math.PI) / 2;
      arm.add(blade);
      this.rotor.add(arm);
    }
    this.rotor.position.set(0, 3.48, -0.2);
    g.add(this.rotor);
    this.tailRotor = new THREE.Group();
    for (let i = 0; i < 2; i++) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.2, 0.12), dark);
      b.rotation.x = (i * Math.PI) / 2;
      this.tailRotor.add(b);
    }
    this.tailRotor.position.set(0.15, 2.6, -7.4);
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
