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
    this.fov = fov;
    // blends: 0..1 — over-the-shoulder aim view, cinematic (helicopter) view
    this.aim = 0;
    this.aimTarget = 0;
    this.cine = 0;
    this.cineTarget = 0;
    this.cineDist = 44;
    this.lookAt = new THREE.Vector3();
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
    this.aim += (this.aimTarget - this.aim) * (1 - Math.exp(-7 * dt));
    this.cine += (this.cineTarget - this.cine) * (1 - Math.exp(-2.2 * dt));
    this.focus.lerp(target, 1 - Math.exp(-(this.cine > 0.5 ? 3 : 6) * dt));
    this.yaw += (this.targetYaw - this.yaw) * (1 - Math.exp(-8 * dt));
    this.apply();
  }

  apply() {
    const L = THREE.MathUtils.lerp;
    // aiming: camera drops toward the shoulder and looks ahead (sees farther)
    let pitch = L(this.pitch, 0.52, this.aim);
    let dist = L(this.distance, Math.max(8, this.distance * 0.62), this.aim);
    pitch = L(pitch, 0.6, this.cine);
    dist = L(dist, this.cineDist, this.cine);
    const cp = Math.cos(pitch);
    const off = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(pitch), Math.cos(this.yaw) * cp).multiplyScalar(dist);
    this.lookAt.copy(this.focus);
    this.lookAt.y += 1.1 * this.aim;
    this.camera.position.copy(this.lookAt).add(off);
    this.camera.lookAt(this.lookAt);
    const fov = L(this.fov, this.fov * 0.86, this.aim);
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
  }
}
