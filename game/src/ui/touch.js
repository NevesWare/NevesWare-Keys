/**
 * Mobile twin-stick controls.
 * Left half: floating movement stick (push to the edge = sprint).
 * Right half: floating aim stick (push past the inner ring = fire).
 * Action buttons push edge-triggered actions into the Input queue.
 */
const R = 56; // stick radius in px
const FIRE_AT = 0.55;

export class TouchControls {
  constructor(input) {
    this.input = input;
    this.root = document.getElementById('touch');
    this.move = { x: 0, y: 0 };
    this.aim = { x: 0, y: 0 };
    this.firing = false;
    this.sprint = false;
    this.sticks = {};
    this.enabled = false;

    this.zone = this.root.querySelector('.t-zone');
    this.zone.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.moveEv(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => this.up(e));

    for (const b of this.root.querySelectorAll('[data-act]')) {
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const a = b.dataset.act;
        if (a === 'fire') {
          this.fireBtn = e.pointerId;
          this.firing = true;
          input.queued.add('fire');
        } else input.queued.add(a);
        b.classList.add('press');
      });
      const rel = (e) => {
        b.classList.remove('press');
        if (b.dataset.act === 'fire' && e.pointerId === this.fireBtn) {
          this.fireBtn = null;
          this.firing = this.sticks.aim ? this.aimMag() > FIRE_AT : false;
        }
      };
      b.addEventListener('pointerup', rel);
      b.addEventListener('pointercancel', rel);
      b.addEventListener('pointerleave', rel);
    }

    const coarse = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.setEnabled(coarse);
    window.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch' && !this.enabled) this.setEnabled(true);
    });
  }

  setEnabled(on) {
    this.enabled = on;
    document.body.classList.toggle('touch', on);
  }

  show(on) {
    this.root.classList.toggle('hidden', !on);
    if (!on) this.reset();
  }

  reset() {
    for (const k of Object.keys(this.sticks)) this.sticks[k].el.remove();
    this.sticks = {};
    this.move.x = this.move.y = this.aim.x = this.aim.y = 0;
    this.firing = this.sprint = false;
  }

  aimMag() {
    return Math.hypot(this.aim.x, this.aim.y);
  }

  down(e) {
    if (e.pointerType === 'mouse') return;
    e.preventDefault();
    const side = e.clientX < window.innerWidth * 0.45 ? 'move' : 'aim';
    if (this.sticks[side]) return;
    const el = document.createElement('div');
    el.className = `t-stick ${side}`;
    el.innerHTML = '<div class="t-knob"></div>';
    el.style.left = `${e.clientX}px`;
    el.style.top = `${e.clientY}px`;
    this.root.appendChild(el);
    this.sticks[side] = { id: e.pointerId, x: e.clientX, y: e.clientY, el, knob: el.firstChild };
  }

  moveEv(e) {
    for (const [side, s] of Object.entries(this.sticks)) {
      if (s.id !== e.pointerId) continue;
      let dx = e.clientX - s.x, dy = e.clientY - s.y;
      const d = Math.hypot(dx, dy);
      if (d > R) {
        dx = (dx / d) * R;
        dy = (dy / d) * R;
      }
      s.knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const v = { x: dx / R, y: -dy / R };
      if (side === 'move') {
        this.move = v;
        this.sprint = Math.hypot(v.x, v.y) > 0.95;
      } else {
        this.aim = v;
        const m = this.aimMag();
        s.el.classList.toggle('hot', m > FIRE_AT);
        if (m > FIRE_AT && !this.firing) this.input.queued.add('fire');
        this.firing = m > FIRE_AT || this.fireBtn != null;
      }
    }
  }

  up(e) {
    for (const [side, s] of Object.entries(this.sticks)) {
      if (s.id !== e.pointerId) continue;
      s.el.remove();
      delete this.sticks[side];
      if (side === 'move') {
        this.move = { x: 0, y: 0 };
        this.sprint = false;
      } else {
        this.aim = { x: 0, y: 0 };
        this.firing = this.fireBtn != null;
      }
    }
  }

  setInteract(label) {
    const b = this.root.querySelector('[data-act=interact]');
    b.classList.toggle('hidden', !label);
    if (label) b.textContent = label;
  }
}
