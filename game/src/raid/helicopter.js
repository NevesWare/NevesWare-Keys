import * as THREE from 'three';
import { heliGeo, rotorGeo, SCALE_BODY } from '../vox/models.js';
import { VOX_MATERIAL, hex } from '../vox/voxModel.js';

/** Micro-voxel transport helicopter with a scripted descend/hover/ascend. */
export class Helicopter {
  constructor(color = '#4a5560') {
    const g = new THREE.Group();
    const body = new THREE.Mesh(heliGeo(hex(color)), VOX_MATERIAL);
    body.castShadow = true;
    g.add(body);
    this.rotor = new THREE.Group();
    const r1 = new THREE.Mesh(rotorGeo(120), VOX_MATERIAL);
    const r2 = r1.clone();
    r2.rotation.y = Math.PI / 2;
    r1.castShadow = r2.castShadow = true;
    this.rotor.add(r1, r2);
    this.rotor.position.set(0, 56 * SCALE_BODY, -4 * SCALE_BODY);
    g.add(this.rotor);
    this.tailRotor = new THREE.Mesh(rotorGeo(16), VOX_MATERIAL);
    this.tailRotor.rotation.z = Math.PI / 2;
    this.tailRotor.position.set(3 * SCALE_BODY, 48 * SCALE_BODY, -100 * SCALE_BODY);
    g.add(this.tailRotor);
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

  update(dt, spin = 22) {
    if (!this.mesh.visible) return;
    this.rotor.rotation.y += dt * spin;
    this.tailRotor.rotation.x += dt * spin * 1.4;
    this.t += dt;
    const ALT = 24;
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
