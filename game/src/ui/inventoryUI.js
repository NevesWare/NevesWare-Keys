import { ITEMS, CATEGORY_COLORS, itemValue } from '../data/items.js';
import { size } from '../inventory/grid.js';
import { sfx } from '../audio.js';

export const CELL = 34;

/**
 * Renders grid and slot panels and handles drag & drop between them.
 *
 * Panel shapes:
 *  { id, title, type: 'grid', grid, quickTo? }
 *  { id, title, type: 'slot', accept: (item) => bool, get: () => item|null, set: (item|null) => void, w, h, quickTo? }
 *
 * Drop targets outside panels: any element with [data-sell] calls opts.onSell(item, fromPanel).
 */
export class InventoryUI {
  constructor() {
    this.panels = new Map();
    this.drag = null;
    this.onChange = () => {};
    this.onSell = null;
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    document.body.appendChild(this.tooltip);

    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('keydown', (e) => {
      if (this.drag && e.code === 'KeyR') {
        e.preventDefault();
        e.stopPropagation();
        this.rotateDrag();
      }
    }, true);
    window.addEventListener('contextmenu', (e) => {
      if (this.drag) {
        e.preventDefault();
        this.rotateDrag();
      }
    });
  }

  /** Mount panels into `container` (replaces its content). */
  mount(container, panels, { onChange, onSell } = {}) {
    container.innerHTML = '';
    for (const p of panels) {
      this.panels.set(p.id, { ...p, root: container });
      container.appendChild(this.buildPanel(p.id));
    }
    if (onChange) this.onChange = onChange;
    if (onSell !== undefined) this.onSell = onSell;
  }

  unmountAll() {
    this.panels.clear();
    this.cancelDrag();
    this.tooltip.style.display = 'none';
  }

  refresh() {
    for (const [id, p] of this.panels) {
      const el = document.querySelector(`[data-panel="${id}"]`);
      if (el) el.replaceWith(this.buildPanel(id));
      else this.panels.delete(id);
    }
  }

  buildPanel(id) {
    const p = this.panels.get(id);
    const wrap = document.createElement('div');
    wrap.className = 'inv-panel';
    wrap.dataset.panel = id;
    const title = document.createElement('div');
    title.className = 'inv-title';
    title.textContent = p.title;
    wrap.appendChild(title);

    const area = document.createElement('div');
    area.className = p.type === 'grid' ? 'inv-grid' : 'inv-slot';
    area.dataset.drop = id;
    const w = p.type === 'grid' ? p.grid.w : p.w;
    const h = p.type === 'grid' ? p.grid.h : p.h;
    area.style.width = `${w * CELL}px`;
    area.style.height = `${h * CELL}px`;
    area.style.setProperty('--cell', `${CELL}px`);

    if (p.type === 'grid') {
      for (const e of p.grid.entries) area.appendChild(this.itemEl(e.item, e.x, e.y, id));
    } else {
      const it = p.get();
      if (it) {
        const s = size({ ...it, rot: false });
        const el = this.itemEl({ ...it, rot: false, __ref: it }, 0, 0, id);
        el.style.left = `${((w - s.w) * CELL) / 2}px`;
        el.style.top = `${((h - s.h) * CELL) / 2}px`;
        area.appendChild(el);
      } else {
        const hint = document.createElement('div');
        hint.className = 'slot-hint';
        hint.textContent = p.hint ?? '';
        area.appendChild(hint);
      }
    }
    wrap.appendChild(area);
    return wrap;
  }

  itemEl(item, x, y, panelId) {
    const real = item.__ref ?? item;
    const d = ITEMS[real.id];
    const s = size(item);
    const el = document.createElement('div');
    el.className = `inv-item cat-${d.cat}`;
    el.style.left = `${x * CELL}px`;
    el.style.top = `${y * CELL}px`;
    el.style.width = `${s.w * CELL - 2}px`;
    el.style.height = `${s.h * CELL - 2}px`;
    el.style.background = CATEGORY_COLORS[d.cat];
    const label = document.createElement('span');
    label.className = 'lbl';
    label.textContent = d.short;
    el.appendChild(label);
    const info = document.createElement('span');
    info.className = 'cnt';
    if (d.stack) info.textContent = real.count;
    else if (d.weapon) info.textContent = `${real.mag}/${d.weapon.mag}`;
    else if (d.armor) info.textContent = `${Math.round(real.dur)}`;
    el.appendChild(info);

    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      if (e.ctrlKey || e.shiftKey) {
        this.quickMove(real, panelId);
        return;
      }
      // drag starts only after the pointer moves a bit, so clicks/double-clicks stay clicks
      this.pending = { item: real, panelId, x: e.clientX, y: e.clientY, rect: el.getBoundingClientRect() };
    });
    el.addEventListener('pointerenter', () => this.showTip(real, el));
    el.addEventListener('pointerleave', () => (this.tooltip.style.display = 'none'));
    return el;
  }

  showTip(item, el) {
    if (this.drag) return;
    const d = ITEMS[item.id];
    let html = `<b>${d.name}</b><br>Valor: ₢ ${itemValue(item).toLocaleString('pt-BR')}`;
    if (d.weapon) html += `<br>Calibre ${d.weapon.caliber} · Dano ${d.weapon.damage}${d.weapon.pellets > 1 ? `×${d.weapon.pellets}` : ''} · ${d.weapon.auto ? 'Auto' : 'Semi'}`;
    if (d.armor) html += `<br>Proteção ${Math.round(d.armor.reduce * 100)}% · Durab. ${Math.round(item.dur)}/${d.armor.durability}`;
    if (d.med) html += `<br>Cura ${d.med.heal} em ${d.med.time}s`;
    if (d.stack) html += `<br>${item.count}/${d.stack}`;
    html += '<br><i>arrastar · R gira · duplo-clique move</i>';
    this.tooltip.innerHTML = html;
    const r = el.getBoundingClientRect();
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${Math.min(window.innerWidth - 230, r.right + 6)}px`;
    this.tooltip.style.top = `${r.top}px`;
  }

  // ---------------- drag & drop ----------------
  startDrag(item, from, e, rect) {
    this.tooltip.style.display = 'none';
    const ghost = document.createElement('div');
    ghost.className = 'inv-item drag-ghost';
    ghost.style.background = CATEGORY_COLORS[ITEMS[item.id].cat];
    ghost.innerHTML = `<span class="lbl">${ITEMS[item.id].short}</span>`;
    document.body.appendChild(ghost);
    const p = this.panels.get(from);
    const fromSlot = p.type === 'slot';
    if (fromSlot) item.rot = false;
    this.drag = {
      item,
      from,
      origRot: item.rot,
      ghost,
      // grab offset in cells (which cell of the item the cursor holds)
      gx: fromSlot ? 0 : Math.floor((e.clientX - rect.left) / CELL),
      gy: fromSlot ? 0 : Math.floor((e.clientY - rect.top) / CELL),
    };
    this.sizeGhost();
    this.onMove(e);
  }

  sizeGhost() {
    const s = size(this.drag.item);
    this.drag.ghost.style.width = `${s.w * CELL - 2}px`;
    this.drag.ghost.style.height = `${s.h * CELL - 2}px`;
  }

  rotateDrag() {
    const d = this.drag;
    d.item.rot = !d.item.rot;
    [d.gx, d.gy] = [d.gy, d.gx];
    this.sizeGhost();
    sfx.ui();
  }

  cancelDrag() {
    if (!this.drag) return;
    this.drag.item.rot = this.drag.origRot;
    this.drag.ghost.remove();
    this.clearPreview();
    this.drag = null;
  }

  clearPreview() {
    document.querySelectorAll('.drop-preview').forEach((n) => n.remove());
    document.querySelectorAll('.sell-hover').forEach((n) => n.classList.remove('sell-hover'));
  }

  targetAt(x, y) {
    this.drag.ghost.style.display = 'none';
    const el = document.elementFromPoint(x, y);
    this.drag.ghost.style.display = '';
    if (!el) return null;
    const sell = el.closest('[data-sell]');
    if (sell) return { sell };
    const area = el.closest('[data-drop]');
    if (!area) return null;
    const p = this.panels.get(area.dataset.drop);
    if (!p) return null;
    const r = area.getBoundingClientRect();
    const cx = Math.floor((x - r.left) / CELL) - this.drag.gx;
    const cy = Math.floor((y - r.top) / CELL) - this.drag.gy;
    return { area, panel: p, id: area.dataset.drop, cx, cy };
  }

  onMove(e) {
    if (this.pending && !this.drag) {
      const pd = this.pending;
      if (Math.hypot(e.clientX - pd.x, e.clientY - pd.y) > 4) {
        this.pending = null;
        this.startDrag(pd.item, pd.panelId, { clientX: pd.x, clientY: pd.y }, pd.rect);
      }
    }
    if (!this.drag) return;
    const d = this.drag;
    d.ghost.style.left = `${e.clientX - d.gx * CELL - CELL / 2}px`;
    d.ghost.style.top = `${e.clientY - d.gy * CELL - CELL / 2}px`;
    this.clearPreview();
    const t = this.targetAt(e.clientX, e.clientY);
    if (!t) return;
    if (t.sell) {
      t.sell.classList.add('sell-hover');
      return;
    }
    const ok = this.canDrop(t);
    const prev = document.createElement('div');
    prev.className = `drop-preview ${ok ? 'ok' : 'bad'}`;
    if (t.panel.type === 'grid') {
      const s = size(d.item);
      prev.style.left = `${t.cx * CELL}px`;
      prev.style.top = `${t.cy * CELL}px`;
      prev.style.width = `${s.w * CELL}px`;
      prev.style.height = `${s.h * CELL}px`;
    } else {
      prev.style.inset = '0';
    }
    t.area.appendChild(prev);
  }

  canDrop(t) {
    const it = this.drag.item;
    if (t.panel.type === 'slot') return t.panel.accept(it) && (!t.panel.get() || t.panel.get() === it);
    const g = t.panel.grid;
    if (g.canPlace(it, t.cx, t.cy)) return true;
    const under = this.stackTarget(t);
    return !!under;
  }

  stackTarget(t) {
    const it = this.drag.item;
    const d = ITEMS[it.id];
    if (!d.stack || t.panel.type !== 'grid') return null;
    const s = size(it);
    for (let x = t.cx; x < t.cx + s.w; x++)
      for (let y = t.cy; y < t.cy + s.h; y++) {
        const e = t.panel.grid.at(x, y);
        if (e && e.item !== it && e.item.id === it.id && e.item.count < d.stack) return e.item;
      }
    return null;
  }

  detach(item, fromId) {
    const p = this.panels.get(fromId);
    if (p.type === 'grid') p.grid.remove(item);
    else p.set(null);
  }

  onUp(e) {
    if (this.pending && !this.drag) {
      const pd = this.pending;
      this.pending = null;
      const now = performance.now();
      if (this.lastClick && this.lastClick.item === pd.item && now - this.lastClick.t < 400) {
        this.lastClick = null;
        this.quickMove(pd.item, pd.panelId);
      } else this.lastClick = { item: pd.item, t: now };
      return;
    }
    if (!this.drag) return;
    const d = this.drag;
    const t = this.targetAt(e.clientX, e.clientY);
    let moved = false;

    if (t?.sell && this.onSell) {
      if (this.onSell(d.item, d.from)) {
        this.detach(d.item, d.from);
        moved = true;
      }
    } else if (t && t.panel) {
      if (t.panel.type === 'slot') {
        if (this.canDrop(t) && t.panel.get() !== d.item) {
          this.detach(d.item, d.from);
          d.item.rot = false;
          t.panel.set(d.item);
          moved = true;
        }
      } else {
        const g = t.panel.grid;
        const stack = this.stackTarget(t);
        if (g.canPlace(d.item, t.cx, t.cy)) {
          if (t.id !== d.from) this.detach(d.item, d.from);
          else g.remove(d.item);
          g.entries.push({ item: d.item, x: t.cx, y: t.cy });
          moved = true;
        } else if (stack) {
          const max = ITEMS[d.item.id].stack;
          const take = Math.min(max - stack.count, d.item.count);
          stack.count += take;
          d.item.count -= take;
          if (d.item.count <= 0) this.detach(d.item, d.from);
          moved = true;
        }
      }
    }

    if (!moved) d.item.rot = d.origRot;
    d.ghost.remove();
    this.clearPreview();
    this.drag = null;
    if (moved) {
      sfx.pickup();
      this.onChange();
    }
    this.refresh();
  }

  /** Double-click / ctrl-click: send item to the panel's quickTo target (auto-placement). */
  quickMove(item, fromId) {
    const src = this.panels.get(fromId);
    const targets = [src.quickTo].flat().filter(Boolean);
    for (const toId of targets) {
      const to = this.panels.get(toId);
      if (!to) continue;
      if (to.type === 'slot') {
        if (!to.accept(item) || to.get()) continue;
        this.detach(item, fromId);
        item.rot = false;
        to.set(item);
        return this.afterQuick(true);
      }
      const orig = src.type === 'grid' ? src.grid.entries.find((e) => e.item === item) : null;
      const ox = orig?.x, oy = orig?.y, orot = item.rot, before = item.count;
      this.detach(item, fromId);
      const left = to.grid.add(item);
      if (left === 0) return this.afterQuick(true);
      // restore what did not fit
      if (src.type === 'grid') {
        item.rot = orot;
        if (src.grid.canPlace(item, ox, oy)) src.grid.entries.push({ item, x: ox, y: oy });
        else src.grid.add(item);
      } else src.set(item);
      if (item.count !== before) return this.afterQuick(true);
    }
    return this.afterQuick(false);
  }

  afterQuick(ok) {
    if (ok) {
      sfx.pickup();
      this.onChange();
      this.refresh();
    } else sfx.empty();
  }
}
