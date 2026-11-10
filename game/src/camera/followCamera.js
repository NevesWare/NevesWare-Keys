import * as THREE from 'three';

/**
 * High-angle perspective follow camera (cinematic top-down look).
 * Keeps the same API the game used for the isometric camera.
 */
export class FollowCamera {
  constructor({ fov = 36, pitchDeg = 54, distance = 22 } = {}) {
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.5, 220);
    this.pitch = THREE.MathUtils.degToRad(pitchDeg);
    this.distance = distance;
    this.yaw = Math.PI / 4;
    this.targetYaw = this.yaw;
    this.focus = new THREE.Vector3();
    this.minDist = 9;
    this.maxDist = 32;
  }

  setAspect(aspect) {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  rotate(dir) {
    this.targetYaw += (dir * Math.PI) / 4;
  }

  /** Free 360° rotation (radians), e.g. from a drag gesture. */
  addYaw(d) {
    this.targetYaw += d;
    this.yaw += d * 0.85; // stay responsive under the finger
  }

  zoom(factor) {
    this.distance = Math.min(this.maxDist, Math.max(this.minDist, this.distance * factor));
  }

  /** Yaw angle (game convention: 0 = +z) the camera is looking toward. */
  forwardAngle() {
    return Math.atan2(-Math.sin(this.yaw), -Math.cos(this.yaw));
  }

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
    this.focus.lerp(target, 1 - Math.exp(-6 * dt));
    this.yaw += (this.targetYaw - this.yaw) * (1 - Math.exp(-8 * dt));
    this.apply();
  }

  apply() {
    const cp = Math.cos(this.pitch);
    const off = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp).multiplyScalar(this.distance);
    this.camera.position.copy(this.focus).add(off);
    this.camera.lookAt(this.focus);
    this.camera.updateMatrixWorld();
  }
}
