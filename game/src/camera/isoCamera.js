import * as THREE from 'three';

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Orthographic isometric follow camera with:
 * - 90° rotation steps (Q/E), smoothed
 * - look-ahead toward the aim point
 * - pixel snapping along the camera's screen axes (stops shimmering in the low-res target)
 */
export class IsoCamera {
  constructor({ viewHeight = 24, pitchDeg = 35.264, distance = 60 } = {}) {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 160);
    this.viewHeight = viewHeight;
    this.pitch = THREE.MathUtils.degToRad(pitchDeg);
    this.distance = distance;
    this.yaw = Math.PI / 4;
    this.targetYaw = this.yaw;
    this.focus = new THREE.Vector3();
    this.pixelHeight = 200;
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();
    this._back = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
  }

  setViewport(aspect, pixelHeight) {
    this.pixelHeight = pixelHeight;
    const h = this.viewHeight / 2;
    this.camera.top = h;
    this.camera.bottom = -h;
    this.camera.left = -h * aspect;
    this.camera.right = h * aspect;
    this.camera.updateProjectionMatrix();
  }

  rotate(dir) {
    this.targetYaw += (dir * Math.PI) / 2;
  }

  /** Planar basis for camera-relative movement. */
  groundAxes() {
    return {
      forward: new THREE.Vector2(-Math.sin(this.yaw), -Math.cos(this.yaw)),
      right: new THREE.Vector2(Math.cos(this.yaw), -Math.sin(this.yaw)),
    };
  }

  snapTo(target) {
    this.focus.copy(target);
    this.yaw = this.targetYaw;
    this.apply();
  }

  update(dt, target) {
    const k = 1 - Math.exp(-8 * dt);
    this.focus.lerp(target, k);
    this.yaw += (this.targetYaw - this.yaw) * (1 - Math.exp(-10 * dt));
    this.apply();
  }

  apply() {
    const cp = Math.cos(this.pitch);
    this._back.set(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp).normalize();
    this._fwd.copy(this._back).negate();
    this._right.crossVectors(this._fwd, UP).normalize();
    this._up.crossVectors(this._right, this._fwd).normalize();

    const wpp = this.viewHeight / this.pixelHeight;
    const r = this.focus.dot(this._right), u = this.focus.dot(this._up);
    const snapped = this.focus
      .clone()
      .addScaledVector(this._right, Math.round(r / wpp) * wpp - r)
      .addScaledVector(this._up, Math.round(u / wpp) * wpp - u);

    this.camera.position.copy(snapped).addScaledVector(this._back, this.distance);
    this.camera.up.copy(UP);
    this.camera.lookAt(snapped);
    this.camera.updateMatrixWorld();
  }
}
