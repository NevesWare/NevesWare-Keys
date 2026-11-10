import * as THREE from 'three';

const L = THREE.MathUtils.lerp;

/**
 * Third-person over-the-shoulder camera (DayZ style) with two blends:
 * - aim: closer to the shoulder, narrower FOV (sees farther);
 * - cine: high chase/overview view used by the menu backdrop and the helicopter flight.
 * Yaw convention: the camera sits behind the focus along (sin yaw, cos yaw).
 */
export class FollowCamera {
  constructor({ fov = 58, distance = 3.6 } = {}) {
    this.camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 400);
    this.fov = fov;
    this.yaw = Math.PI / 4;
    this.targetYaw = this.yaw;
    this.pitchTP = 0.2; // look-down angle in third person (radians)
    this.targetPitch = this.pitchTP;
    this.tpDist = distance;
    this.minDist = 2.2;
    this.maxDist = 7;
    this.shoulder = 0.55;
    this.focus = new THREE.Vector3();
    this.aim = 0;
    this.aimTarget = 0;
    this.cine = 0;
    this.cineTarget = 0;
    this.cineDist = 44;
    this.cinePitch = 0.6;
    this.distance = 30; // kept for older callers (unused in third person)
    this.blocker = null; // (x, z, dx, dz, maxDist) => free distance, for wall collision
    this.lookAt = new THREE.Vector3();
    this._d = this.tpDist;
    this._dir = new THREE.Vector3();
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

  /** Look up/down (positive = look further down). */
  addPitch(d) {
    this.targetPitch = THREE.MathUtils.clamp(this.targetPitch + d, -0.45, 0.85);
    this.pitchTP = THREE.MathUtils.clamp(this.pitchTP + d * 0.85, -0.45, 0.85);
  }

  zoom(factor) {
    this.tpDist = Math.min(this.maxDist, Math.max(this.minDist, this.tpDist * factor));
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

  /**
   * Point on the horizontal plane y = h hit by the screen-center ray (capped at
   * `max` meters) — what the crosshair is on. Used to aim shots from the player.
   */
  centerPoint(h = 1.35, max = 80, out = new THREE.Vector3()) {
    const o = this.camera.position;
    this.camera.getWorldDirection(this._dir);
    let t = max;
    if (this._dir.y < -1e-3) t = Math.min(max, (h - o.y) / this._dir.y);
    if (t < 2) t = max;
    return out.copy(o).addScaledVector(this._dir, t).setY(h);
  }

  snapTo(target) {
    this.focus.copy(target);
    this.yaw = this.targetYaw;
    this.pitchTP = this.targetPitch;
    this.apply(true);
  }

  update(dt, target) {
    this.aim += (this.aimTarget - this.aim) * (1 - Math.exp(-9 * dt));
    this.cine += (this.cineTarget - this.cine) * (1 - Math.exp(-2.2 * dt));
    this.focus.lerp(target, 1 - Math.exp(-(this.cine > 0.5 ? 3 : 14) * dt));
    this.yaw += (this.targetYaw - this.yaw) * (1 - Math.exp(-12 * dt));
    this.pitchTP += (this.targetPitch - this.pitchTP) * (1 - Math.exp(-12 * dt));
    this.apply(false, dt);
  }

  apply(snap = false, dt = 0) {
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    // --- third person ---
    const pitch = L(this.pitchTP, 0.035, this.aim); // aiming levels the view so the laser dot sits on the crosshair
    let dist = L(this.tpDist, Math.max(1.6, this.tpDist * 0.5), this.aim);
    const sh = L(this.shoulder, 0.62, this.aim);
    const piv = new THREE.Vector3(this.focus.x, this.focus.y + 1.6, this.focus.z);
    const rx = cy, rz = -sy; // right vector
    const back = new THREE.Vector3(sy * Math.cos(pitch), Math.sin(pitch), cy * Math.cos(pitch));
    if (this.blocker) {
      // pull the camera in front of walls between the shoulder and the camera
      const sx = piv.x + rx * sh, sz = piv.z + rz * sh;
      const hd = Math.hypot(back.x, back.z) || 1;
      const free = this.blocker(sx, sz, back.x / hd, back.z / hd, dist * hd + 0.4);
      dist = Math.min(dist, Math.max(0.6, (free - 0.35) / hd));
    }
    this._d = snap || !dt ? dist : dist < this._d ? dist : L(this._d, dist, 1 - Math.exp(-5 * dt));
    const tpPos = piv.clone().addScaledVector(back, this._d);
    tpPos.x += rx * sh;
    tpPos.z += rz * sh;
    const tpLook = tpPos.clone().addScaledVector(back, -10);
    // --- cinematic / overview ---
    const cp = Math.cos(this.cinePitch);
    const cnLook = this.focus.clone();
    const cnPos = cnLook.clone().add(new THREE.Vector3(sy * cp, Math.sin(this.cinePitch), cy * cp).multiplyScalar(this.cineDist));
    const k = this.cine;
    this.camera.position.lerpVectors(tpPos, cnPos, k);
    this.lookAt.lerpVectors(tpLook, cnLook, k);
    this.camera.lookAt(this.lookAt);
    const fov = L(L(this.fov, this.fov * 0.72, this.aim), 36, k);
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.camera.updateMatrixWorld();
  }
}
