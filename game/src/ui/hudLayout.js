import { sfx } from '../audio.js';
import { toApp, view } from './viewport.js';

const KEY = 'deadsector-hud-v3';

/** Widget centers in % of the viewport, scale and opacity. Tuned for phones in landscape. */
export const DEFAULT_LAYOUT = {
  menu: { x: 3.6, y: 7, s: 1, o: 1 },
  status: { x: 20, y: 11.5, s: 1, o: 1 },
  timer: { x: 50, y: 5.5, s: 1, o: 1 },
  feed: { x: 50, y: 14, s: 1, o: 1 },
  minimap: { x: 91.5, y: 18, s: 1, o: 1 },
  bag: { x: 81, y: 9, s: 1, o: 1 },
  hotbar: { x: 40, y: 92, s: 1, o: 1 },
  ammo: { x: 88, y: 92, s: 1, o: 1 },
  joystick: { x: 14, y: 70, s: 1, o: 1 },
  fire: { x: 88, y: 70, s: 1, o: 1 },
  aim: { x: 75.5, y: 82, s: 1, o: 1 },
  reload: { x: 92, y: 47, s: 1, o: 1 },
  swap: { x: 78, y: 58, s: 1, o: 1 },
  heal: { x: 66.5, y: 87, s: 1, o: 1 },
  interact: { x: 64, y: 66, s: 1, o: 1 },
};

const LABELS = {
  menu: 'Menu', status: 'Vida e proteção', timer: 'Tempo', feed: 'Abates', minimap: 'Minimapa', bag: 'Mochila',
  hotbar: 'Hotbar', ammo: 'Munição', joystick: 'Joystick', fire: 'Atirar', aim: 'Mirar', reload: 'Recarregar',
  swap: 'Trocar arma', heal: 'Curar', interact: 'Interagir',
};

export function loadLayout() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    const out = {};
    for (const k of Object.keys(DEFAULT_LAYOUT)) out[k] = { ...DEFAULT_LAYOUT[k], ...(saved[k] ?? {}) };
    return out;
  } catch {
    return structuredClone(DEFAULT_LAYOUT);
  }
}

function saveLayout(l) {
  try {
    localStorage.setItem(KEY, JSON.stringify(l));
  } catch {
    /* ignore */
  }
}

/** Positions every [data-w] element according to the layout. */
export function applyLayout(layout, { scale = 1, opacity = 1 } = {}) {
  for (const el of document.querySelectorAll('[data-w]')) {
    const w = layout[el.dataset.w];
    if (!w) continue;
    el.style.left = `${w.x}%`;
    el.style.top = `${w.y}%`;
    el.style.transform = `translate(-50%, -50%) scale(${w.s * scale})`;
    el.style.opacity = String(Math.min(1, w.o * opacity));
  }
}

/**
 * HUD editor overlay: drag widgets, pick one to change size/opacity, restore defaults.
 */
export class HudEditor {
  constructor(getStyle) {
    this.getStyle = getStyle;
    this.root = document.getElementById('hud-editor');
    this.active = false;
  }

  open(layout, onDone) {
    this.layout = structuredClone(layout);
    this.original = layout;
    this.onDone = onDone;
    this.active = true;
    this.sel = null;
    document.body.classList.add('hud-edit');
    const hb = document.getElementById('hud-hotbar');
    if (hb && !hb.children.length) hb.innerHTML = [1, 2, 3, 4, 5, 6].map((n) => `<button class="hb-slot"><span class="hb-n">${n}</span></button>`).join('');
    this.root.classList.remove('hidden');
    this.root.innerHTML = `
      <div class="he-bar">
        <span class="he-title">EDITOR DE HUD</span>
        <span class="he-hint">Arraste os elementos · toque para ajustar</span>
        <button data-a="reset" class="he-btn">Restaurar padrão</button>
        <button data-a="cancel" class="he-btn">Cancelar</button>
        <button data-a="save" class="he-btn primary">Salvar</button>
      </div>
      <div class="he-panel hidden">
        <b class="he-name"></b>
        <label>Tamanho <input type="range" data-k="s" min="0.5" max="1.8" step="0.05"><span data-v="s"></span></label>
        <label>Opacidade <input type="range" data-k="o" min="0.2" max="1" step="0.05"><span data-v="o"></span></label>
      </div>
      <div class="he-grid"></div>`;
    this.root.querySelector('[data-a=reset]').onclick = () => {
      this.layout = structuredClone(DEFAULT_LAYOUT);
      this.select(null);
      this.apply();
      sfx.ui();
    };
    this.root.querySelector('[data-a=cancel]').onclick = () => this.close(false);
    this.root.querySelector('[data-a=save]').onclick = () => this.close(true);
    for (const inp of this.root.querySelectorAll('.he-panel input')) {
      inp.oninput = () => {
        if (!this.sel) return;
        this.layout[this.sel][inp.dataset.k] = Number(inp.value);
        this.updatePanel();
        this.apply();
      };
    }
    this.handlers = [];
    for (const el of document.querySelectorAll('#hud [data-w]')) {
      const down = (e) => {
        if (!this.active) return;
        e.preventDefault();
        e.stopPropagation();
        this.select(el.dataset.w);
        const id = el.dataset.w;
        const sp = toApp(e.clientX, e.clientY);
        const start = { x: sp.x, y: sp.y, wx: this.layout[id].x, wy: this.layout[id].y };
        const move = (ev) => {
          const mp = toApp(ev.clientX, ev.clientY);
          const dx = ((mp.x - start.x) / view.w) * 100;
          const dy = ((mp.y - start.y) / view.h) * 100;
          this.layout[id].x = Math.round(Math.min(98, Math.max(2, start.wx + dx)) * 2) / 2;
          this.layout[id].y = Math.round(Math.min(98, Math.max(2, start.wy + dy)) * 2) / 2;
          this.apply();
        };
        const up = () => {
          window.removeEventListener('pointermove', move);
          window.removeEventListener('pointerup', up);
        };
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', up);
      };
      el.addEventListener('pointerdown', down, true);
      this.handlers.push([el, down]);
    }
    this.apply();
  }

  select(id) {
    this.sel = id;
    document.querySelectorAll('#hud [data-w]').forEach((e) => e.classList.toggle('he-sel', e.dataset.w === id));
    this.root.querySelector('.he-panel').classList.toggle('hidden', !id);
    if (id) this.updatePanel();
  }

  updatePanel() {
    const w = this.layout[this.sel];
    this.root.querySelector('.he-name').textContent = LABELS[this.sel] ?? this.sel;
    for (const k of ['s', 'o']) {
      this.root.querySelector(`input[data-k=${k}]`).value = w[k];
      this.root.querySelector(`[data-v=${k}]`).textContent = `${Math.round(w[k] * 100)}%`;
    }
  }

  apply() {
    applyLayout(this.layout, { ...this.getStyle(), opacity: 1 });
  }

  close(save) {
    this.active = false;
    for (const [el, fn] of this.handlers) el.removeEventListener('pointerdown', fn, true);
    document.body.classList.remove('hud-edit');
    document.querySelectorAll('.he-sel').forEach((e) => e.classList.remove('he-sel'));
    this.root.classList.add('hidden');
    if (save) {
      saveLayout(this.layout);
      sfx.coin();
    }
    this.onDone?.(save ? this.layout : this.original);
  }
}
