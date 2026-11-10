/**
 * Mobile controls for DeadSector.
 * - Left side: movement joystick (floats to where the thumb lands, returns to its HUD spot).
 * - Anywhere else: drag to rotate the camera 360°, pinch to zoom.
 * - Buttons: FIRE (hold), AIM (toggle or hold), reload, swap, heal, interact, bag, menu.
 */
import { toApp, view } from './viewport.js';

const R = 58;

export class TouchControls {
  constructor(input) {
    this.input = input;
    this.zone = document.getElementById('touch-zone');
    this.joy = document.querySelector('[data-w=joystick]');
    this.knob = this.joy.querySelector('.knob');
    this.move = { x: 0, y: 0 };
    this.aim = { x: 0, y: 0 }; // kept for API compatibility (unused: aim follows the camera)
    this.firing = false;
    this.sprint = false;
    this.aiming = false;
    this.aimMode = 'toggle';
    this.enabled = false;
    this.onCamera = null; // (dxPixels) => void
    this.onZoom = null; // (factor) => void
    this.stick = null;
    this.drags = new Map();

    this.zone.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.moveEv(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));

    for (const b of document.querySelectorAll('#hud [data-act]')) {
      const act = b.dataset.act;
      b.addEventListener('pointerdown', (e) => {
        if (document.body.classList.contains('hud-edit')) return;
        e.preventDefault();
        e.stopPropagation();
        b.classList.add('press');
        if (act === 'fire') {
          this.fireId = e.pointerId;
          this.firing = true;
          input.queued.add('fire');
        } else if (act === 'aim') {
          this.aiming = this.aimMode === 'hold' ? true : !this.aiming;
          this.syncAimBtn();
        } else input.queued.add(act);
        if (navigator.vibrate && this.vibrate) navigator.vibrate(8);
      });
      const rel = (e) => {
        b.classList.remove('press');
        if (act === 'fire' && e.pointerId === this.fireId) {
          this.fireId = null;
          this.firing = false;
        }
        if (act === 'aim' && this.aimMode === 'hold') {
          this.aiming = false;
          this.syncAimBtn();
        }
      };
      b.addEventListener('pointerup', rel);
      b.addEventListener('pointercancel', rel);
    }

    const coarse = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.setEnabled(coarse);
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' && !this.enabled) this.setEnabled(true);
    });
  }

  syncAimBtn() {
    document.querySelector('[data-w=aim]')?.classList.toggle('on', this.aiming);
  }

  setEnabled(on) {
    this.enabled = on;
    document.body.classList.toggle('touch', on);
  }

  reset() {
    this.endStick();
    this.drags.clear();
    this.move = { x: 0, y: 0 };
    this.firing = this.sprint = false;
    this.aiming = false;
    this.syncAimBtn();
  }

  down(e) {
    if (e.pointerType === 'mouse' || document.body.classList.contains('hud-edit')) return;
    e.preventDefault();
    const p = toApp(e.clientX, e.clientY);
    if (!this.stick && p.x < view.w * 0.42 && p.y > view.h * 0.3) {
      // float the joystick to the touch point
      this.stick = { id: e.pointerId, x: p.x, y: p.y };
      this.joy.classList.add('active');
      this.joy.style.left = `${p.x}px`;
      this.joy.style.top = `${p.y}px`;
      return;
    }
    this.drags.set(e.pointerId, { x: p.x, y: p.y });
    if (this.drags.size === 2) {
      const [a, b] = [...this.drags.values()];
      this.pinch = Math.hypot(a.x - b.x, a.y - b.y);
    }
  }

  moveEv(e) {
    const p = toApp(e.clientX, e.clientY);
    if (this.stick && e.pointerId === this.stick.id) {
      let dx = p.x - this.stick.x, dy = p.y - this.stick.y;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        dx = (dx / d) * R;
        dy = (dy / d) * R;
      }
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      this.move = { x: dx / R, y: -dy / R };
      this.sprint = Math.hypot(this.move.x, this.move.y) > 0.96 && !this.aiming;
      return;
    }
    const d = this.drags.get(e.pointerId);
    if (!d) return;
    if (this.drags.size >= 2) {
      d.x = p.x;
      d.y = p.y;
      const [a, b] = [...this.drags.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (this.pinch) this.onZoom?.(this.pinch / dist);
      this.pinch = dist;
      return;
    }
    const dx = p.x - d.x;
    d.x = p.x;
    d.y = p.y;
    this.onCamera?.(dx);
  }

  endStick() {
    this.stick = null;
    this.move = { x: 0, y: 0 };
    this.sprint = false;
    this.knob.style.transform = 'translate(-50%, -50%)';
    this.joy.classList.remove('active');
    this.onStickReset?.();
  }

  up(e) {
    if (this.stick && e.pointerId === this.stick.id) {
      this.endStick();
      return;
    }
    this.drags.delete(e.pointerId);
    if (this.drags.size < 2) this.pinch = null;
  }

  setInteract(label) {
    const b = document.querySelector('[data-w=interact]');
    b.classList.toggle('off', !label);
    if (label) b.querySelector('span').textContent = label;
  }
}
