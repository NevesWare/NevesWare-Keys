import * as THREE from 'three';

const BOX = new THREE.BoxGeometry(1, 1, 1);
function p(color, sx, sy, sz, x, y, z) {
  const m = new THREE.Mesh(BOX, new THREE.MeshLambertMaterial({ color }));
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  return m;
}

/** Blocky transport helicopter with a scripted descend/hover/ascend. */
export class Helicopter {
  constructor(color = '#5d4a87') {
    const g = new THREE.Group();
    g.add(
      p(color, 1.8, 1.3, 3.2, 0, 1.25, 0), // cabin
      p('#a3c6e0', 1.6, 0.6, 0.6, 0, 1.55, 1.5), // windshield
      p(color, 0.5, 0.5, 3.4, 0, 1.55, -3.0), // tail boom
      p(color, 0.15, 1.0, 0.7, 0, 2.0, -4.6), // tail fin
      p('#2a1d3d', 0.15, 0.15, 3.4, -0.75, 0.15, 0), // skids
      p('#2a1d3d', 0.15, 0.15, 3.4, 0.75, 0.15, 0),
      p('#2a1d3d', 0.15, 0.4, 0.15, -0.75, 0.4, 0.9),
      p('#2a1d3d', 0.15, 0.4, 0.15, 0.75, 0.4, 0.9),
      p('#2a1d3d', 0.15, 0.4, 0.15, -0.75, 0.4, -0.9),
      p('#2a1d3d', 0.15, 0.4, 0.15, 0.75, 0.4, -0.9),
      p('#2a1d3d', 0.3, 0.3, 0.3, 0, 2.05, 0), // mast
    );
    this.rotor = new THREE.Group();
    this.rotor.add(p('#140c1c', 7.0, 0.08, 0.3, 0, 0, 0), p('#140c1c', 0.3, 0.08, 7.0, 0, 0, 0));
    this.rotor.position.y = 2.25;
    g.add(this.rotor);
    this.tailRotor = p('#140c1c', 0.08, 1.4, 0.2, 0.15, 2.0, -4.6);
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

  /** dur seconds from altitude to ground. */
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

  update(dt) {
    if (!this.mesh.visible) return;
    this.rotor.rotation.y += dt * 22;
    this.tailRotor.rotation.x += dt * 30;
    this.t += dt;
    const ALT = 22;
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
      this.y = Math.sin(this.t * 6) * 0.03;
    }
    this.mesh.position.y = this.y;
  }
}
