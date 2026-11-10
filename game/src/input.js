// Keyboard + mouse (+ basic gamepad). Held state for movement/fire; edge-triggered "pressed" for actions.
const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
  KeyQ: 'rotL', KeyE: 'rotR',
  KeyR: 'reload',
  KeyF: 'interact',
  KeyH: 'heal',
  Tab: 'inventory', KeyI: 'inventory',
  Escape: 'escape',
};

const PAD_BUTTONS = { 0: 'interact', 2: 'reload', 3: 'heal', 4: 'rotL', 5: 'rotR', 8: 'inventory', 7: 'fire', 10: 'sprint' };

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.held = new Set();
    this.queued = new Set();
    this.padHeld = new Set();
    this.padPrev = {};
    this.padMove = { x: 0, y: 0 };
    this.padAim = { x: 0, y: 0 };
    this.mouse = { x: 0, y: 0, inside: false };
    this.enabled = true; // false while UI has focus (keys still reach UI)

    window.addEventListener('keydown', (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      if (e.code === 'Tab') e.preventDefault();
      if (!e.repeat) this.queued.add(a);
      this.held.add(a);
    });
    window.addEventListener('keyup', (e) => {
      const a = KEYMAP[e.code];
      if (a) this.held.delete(a);
    });
    window.addEventListener('blur', () => this.held.clear());

    canvas.addEventListener('pointermove', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.mouse.inside = true;
    });
    canvas.addEventListener('pointerdown', (e) => {
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      if (e.button === 0) {
        this.held.add('fire');
        this.queued.add('fire');
      }
    });
    window.addEventListener('pointerup', (e) => {
      if (e.button === 0) this.held.delete('fire');
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  poll() {
    this.padMove.x = this.padMove.y = 0;
    this.padAim.x = this.padAim.y = 0;
    this.padHeld.clear();
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const pad = pads && Array.from(pads).find(Boolean);
    if (!pad) return;
    const dz = (v) => (Math.abs(v) < 0.2 ? 0 : v);
    this.padMove.x = dz(pad.axes[0] ?? 0);
    this.padMove.y = -dz(pad.axes[1] ?? 0);
    this.padAim.x = dz(pad.axes[2] ?? 0);
    this.padAim.y = -dz(pad.axes[3] ?? 0);
    for (const [idx, action] of Object.entries(PAD_BUTTONS)) {
      const down = !!pad.buttons[idx]?.pressed;
      if (down) this.padHeld.add(action);
      if (down && !this.padPrev[idx]) this.queued.add(action);
      this.padPrev[idx] = down;
    }
  }

  isHeld(a) {
    return this.held.has(a) || this.padHeld.has(a);
  }

  pressed(a) {
    if (!this.queued.has(a)) return false;
    this.queued.delete(a);
    return true;
  }

  clear() {
    this.queued.clear();
    this.held.delete('fire');
  }

  /** x = screen right, y = screen up/forward; length <= 1 */
  move() {
    let x = (this.isHeld('right') ? 1 : 0) - (this.isHeld('left') ? 1 : 0) + this.padMove.x;
    let y = (this.isHeld('up') ? 1 : 0) - (this.isHeld('down') ? 1 : 0) + this.padMove.y;
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y };
  }
}
