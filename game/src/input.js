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
  Digit1: 'hb1', Digit2: 'hb2', Digit3: 'hb3', Digit4: 'hb4', Digit5: 'hb5', Digit6: 'hb6',
  KeyX: 'swap',
  KeyM: 'map',
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
      if (e.button === 2) this.held.add('aim');
    });
    window.addEventListener('pointerup', (e) => {
      if (e.button === 0) this.held.delete('fire');
      if (e.button === 2) this.held.delete('aim');
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  poll() {
    this.padMove.x = this.padMove.y = 0;
    this.padAim.x = this.padAim.y = 0;
    this.padHeld.clear();
    let pads = [];
    try {
      pads = navigator.getGamepads ? navigator.getGamepads() : [];
    } catch {
      pads = []; // blocked by the page's permission policy
    }
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
    if (this.touch?.enabled) {
      if (a === 'fire' && this.touch.firing) return true;
      if (a === 'sprint' && this.touch.sprint) return true;
    }
    return this.held.has(a) || this.padHeld.has(a);
  }

  /** Aim direction from touch/gamepad in screen terms, or null when using the mouse. */
  stickAim() {
    const t = this.touch;
    if (t?.enabled && (t.aim.x || t.aim.y)) return t.aim;
    if (this.padAim.x || this.padAim.y) return this.padAim;
    return null;
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
    const tm = this.touch?.enabled ? this.touch.move : { x: 0, y: 0 };
    let x = (this.isHeld('right') ? 1 : 0) - (this.isHeld('left') ? 1 : 0) + this.padMove.x + tm.x;
    let y = (this.isHeld('up') ? 1 : 0) - (this.isHeld('down') ? 1 : 0) + this.padMove.y + tm.y;
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    return { x, y };
  }
}
