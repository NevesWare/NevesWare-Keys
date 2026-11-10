import { ITEMS, CATEGORY_TINT, itemValue, itemWeight, CELL_CM } from '../data/items.js';
import { size } from '../inventory/grid.js';
import { ui3d } from './icons.js';
import { sfx } from '../audio.js';
import { toApp, rectToApp, view } from './viewport.js';

const appRoot = () => document.getElementById('app') ?? document.body;

/**
 * Grid & slot panels with drag and drop (mouse + touch).
 *
 * Panel shapes:
 *  { id, title, type: 'grid', grid, quickTo?, reject?(item) }
 *  { id, title, type: 'slot', accept(item), get(), set(item|null), w, h, quickTo?, label? }
 * Drop targets outside panels: [data-sell] -> onSell(item, fromPanelId) returns true if sold.
 */
export class InventoryUI {
  constructor() {
    this.cell = 44;
    this.panels = new Map();
    this.drag = null;
    this.pending = null;
    this.onChange = () => {};
    this.onSell = null;
    this.tooltip = document.createElement('div');
    this.tooltip.className = 'tooltip';
    appRoot().appendChild(this.tooltip);
    this.rotBtn = document.createElement('button');
    this.rotBtn.className = 'drag-rotate hidden';
    this.rotBtn.textContent = '⟳ GIRAR';
    this.rotBtn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (this.drag) this.rotateDrag();
    });
    appRoot().appendChild(this.rotBtn);

    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', (e) => this.onUp(e));
    window.addEventListener('pointercancel', (e) => this.onUp(e, true));
    window.addEventListener(
      'keydown',
      (e) => {
        if (this.drag && e.code === 'KeyR') {
          e.preventDefault();
          e.stopPropagation();
          this.rotateDrag();
        }
      },
      true,
    );
    window.addEventListener('contextmenu', (e) => {
      if (this.drag) {
        e.preventDefault();
        this.rotateDrag();
      }
    });
  }

  setCell(px) {
    this.cell = px;
    document.documentElement.style.setProperty('--cell', `${px}px`);
  }

  /** Register a panel and return its element (caller places it in the DOM). */
  panelEl(p) {
    this.panels.set(p.id, { ...p });
    return this.buildPanel(p.id);
  }

  setHandlers({ onChange, onSell } = {}) {
    if (onChange) this.onChange = onChange;
    if (onSell !== undefined) this.onSell = onSell;
  }

  unmountAll() {
    this.panels.clear();
    this.cancelDrag();
    this.tooltip.style.display = 'none';
  }

  refresh() {
    for (const [id] of this.panels) {
      const el = document.querySelector(`[data-panel="${id}"]`);
      if (el) el.replaceWith(this.buildPanel(id));
      else this.panels.delete(id);
    }
  }

  buildPanel(id) {
    const p = this.panels.get(id);
    const C = this.cell;
    const wrap = document.createElement('div');
    wrap.className = `inv-panel ${p.type}`;
    wrap.dataset.panel = id;
    if (p.title) {
      const title = document.createElement('div');
      title.className = 'inv-title';
      title.textContent = p.title;
      wrap.appendChild(title);
    }
    const area = document.createElement('div');
    area.className = p.type === 'grid' ? 'inv-grid' : 'inv-slot';
    area.dataset.drop = id;
    const w = p.type === 'grid' ? p.grid.w : p.w;
    const h = p.type === 'grid' ? p.grid.h : p.h;
    area.style.width = `${w * C}px`;
    area.style.height = `${h * C}px`;

    if (p.type === 'grid') {
      for (const e of p.grid.entries) area.appendChild(this.itemEl(e.item, e.x, e.y, id));
    } else {
      const it = p.get();
      if (it) area.appendChild(this.slotItemEl(it, id, w, h));
      else if (p.label) {
        const hint = document.createElement('div');
        hint.className = 'slot-hint';
        hint.textContent = p.label;
        area.appendChild(hint);
      }
    }
    wrap.appendChild(area);
    return wrap;
  }

  decorate(el, item) {
    const d = ITEMS[item.id];
    const tag = document.createElement('span');
    tag.className = 'tag';
    tag.textContent = this.cell >= 38 && (d.cat === 'ammo' || d.cat === 'weapon') ? d.short : '';
    el.appendChild(tag);
    const info = document.createElement('span');
    info.className = 'cnt';
    if (d.stack) info.textContent = `${item.count}x`;
    else if (d.weapon) info.innerHTML = `${item.mag}<small>/${d.weapon.mag}</small>`;
    else if (d.armor) info.textContent = `${Math.round(item.dur)}/${d.armor.durability}`;
    else if (item.grid) info.textContent = `${item.grid.w}×${item.grid.h}`;
    el.appendChild(info);
    this.bindItem(el, item);
  }

  iconImg(item, w, h, rot) {
    const img = document.createElement('img');
    img.className = 'icon';
    img.draggable = false;
    img.src = ui3d.icon(item.id);
    // icons are drawn for the unrotated footprint; rotate into the rotated box
    img.style.width = `${rot ? h : w}px`;
    img.style.height = `${rot ? w : h}px`;
    img.style.transform = rot ? 'translate(-50%, -50%) rotate(90deg)' : 'translate(-50%, -50%)';
    return img;
  }

  itemEl(item, x, y, panelId) {
    const C = this.cell;
    const d = ITEMS[item.id];
    const s = size(item);
    const el = document.createElement('div');
    el.className = `inv-item cat-${d.cat}`;
    el.style.left = `${x * C}px`;
    el.style.top = `${y * C}px`;
    el.style.width = `${s.w * C}px`;
    el.style.height = `${s.h * C}px`;
    el.style.background = CATEGORY_TINT[d.cat];
    el.appendChild(this.iconImg(item, s.w * C - 6, s.h * C - 6, item.rot));
    el.dataset.panel = panelId;
    this.decorate(el, item);
    return el;
  }

  slotItemEl(item, panelId, w, h) {
    const C = this.cell;
    const d = ITEMS[item.id];
    const el = document.createElement('div');
    el.className = `inv-item in-slot cat-${d.cat}`;
    el.style.left = '0px';
    el.style.top = '0px';
    el.style.width = `${w * C}px`;
    el.style.height = `${h * C}px`;
    const k = Math.min((w * C - 10) / (d.w * C), (h * C - 10) / (d.h * C));
    el.appendChild(this.iconImg(item, d.w * C * k, d.h * C * k, false));
    el.dataset.panel = panelId;
    this.decorate(el, item);
    return el;
  }

  bindItem(el, item) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || this.drag) return;
      e.preventDefault();
      const panelId = el.dataset.panel;
      if (e.ctrlKey || e.shiftKey) {
        this.quickMove(item, panelId);
        return;
      }
      const p = toApp(e.clientX, e.clientY);
      this.pending = { item, panelId, x: p.x, y: p.y, cx: e.clientX, cy: e.clientY, rect: rectToApp(el.getBoundingClientRect()), pid: e.pointerId, el };
    });
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'mouse') this.showTip(item, el);
    });
    el.addEventListener('pointerleave', () => (this.tooltip.style.display = 'none'));
  }

  showTip(item, el, autoHide = 0) {
    if (this.drag) return;
    const d = ITEMS[item.id];
    const row = (a, b) => `<div class="tt-row"><span>${a}</span><span>${b}</span></div>`;
    let html = `<b>${d.name}</b>${row('Valor', `₢ ${itemValue(item).toLocaleString('pt-BR')}`)}${row('Peso', `${itemWeight(item).toFixed(2)} kg`)}`;
    html += row('Tamanho', `${d.w}×${d.h} · ≈${Math.round(d.w * CELL_CM)}×${Math.round(d.h * CELL_CM)} cm`);
    if (d.weapon)
      html += row('Calibre', d.weapon.caliber) + row('Dano', `${d.weapon.damage}${d.weapon.pellets > 1 ? `×${d.weapon.pellets}` : ''}`) + row('Modo', d.weapon.auto ? 'Automático' : 'Semi');
    if (d.armor) html += row('Proteção', `${Math.round(d.armor.reduce * 100)}%`) + row('Durabilidade', `${Math.round(item.dur)}/${d.armor.durability}`);
    if (d.med) html += row('Cura', `${d.med.heal} HP · ${d.med.time}s`);
    if (item.grid) html += row('Espaço', `${item.grid.w}×${item.grid.h}`);
    if (d.stack) html += row('Qtd.', `${item.count}/${d.stack}`);
    this.tooltip.innerHTML = html;
    const r = rectToApp(el.getBoundingClientRect());
    const tw = 220;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = `${r.right + tw + 8 < view.w ? r.right + 6 : Math.max(4, r.left - tw - 6)}px`;
    this.tooltip.style.top = `${Math.max(4, Math.min(view.h - 170, r.top))}px`;
    clearTimeout(this.tipT);
    if (autoHide) this.tipT = setTimeout(() => (this.tooltip.style.display = 'none'), autoHide);
  }

  // ---------------- drag & drop ----------------
  startDrag(item, from, x, y, rect, pid) {
    this.tooltip.style.display = 'none';
    const C = this.cell;
    const ghost = document.createElement('div');
    ghost.className = 'inv-item drag-ghost';
    appRoot().appendChild(ghost);
    const fromSlot = this.panels.get(from).type === 'slot';
    const origRot = item.rot;
    if (fromSlot) item.rot = false;
    this.drag = {
      item, from, origRot, ghost, pid,
      gx: fromSlot ? 0 : Math.floor((x - rect.left) / C),
      gy: fromSlot ? 0 : Math.floor((y - rect.top) / C),
    };
    this.sizeGhost();
    this.rotBtn.classList.toggle('hidden', !matchMedia('(pointer: coarse)').matches);
    this.onMove({ clientX: this.pendingClient.x, clientY: this.pendingClient.y, pointerId: pid });
  }

  sizeGhost() {
    const C = this.cell;
    const d = this.drag;
    const s = size(d.item);
    d.ghost.style.width = `${s.w * C}px`;
    d.ghost.style.height = `${s.h * C}px`;
    d.ghost.innerHTML = '';
    d.ghost.appendChild(this.iconImg(d.item, s.w * C - 6, s.h * C - 6, d.item.rot));
  }

  rotateDrag() {
    const d = this.drag;
    d.item.rot = !d.item.rot;
    [d.gx, d.gy] = [d.gy, d.gx];
    this.sizeGhost();
    sfx.ui();
    if (this.lastPos) this.onMove(this.lastPos);
  }

  cancelDrag() {
    if (!this.drag) return;
    this.drag.item.rot = this.drag.origRot;
    this.drag.ghost.remove();
    this.clearPreview();
    this.drag = null;
    this.rotBtn.classList.add('hidden');
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
    const C = this.cell;
    const r = rectToApp(area.getBoundingClientRect());
    const ap = toApp(x, y);
    const cx = Math.floor((ap.x - r.left) / C) - this.drag.gx;
    const cy = Math.floor((ap.y - r.top) / C) - this.drag.gy;
    return { area, panel: p, id: area.dataset.drop, cx, cy };
  }

  onMove(e) {
    if (this.pending && !this.drag && e.pointerId === this.pending.pid) {
      const pd = this.pending;
      const mp = toApp(e.clientX, e.clientY);
      if (Math.hypot(mp.x - pd.x, mp.y - pd.y) > 6) {
        this.pending = null;
        this.pendingClient = { x: pd.cx, y: pd.cy };
        this.startDrag(pd.item, pd.panelId, pd.x, pd.y, pd.rect, pd.pid);
      }
    }
    if (!this.drag || e.pointerId !== this.drag.pid) return;
    this.lastPos = { clientX: e.clientX, clientY: e.clientY, pointerId: e.pointerId };
    const d = this.drag;
    const C = this.cell;
    const gp = toApp(e.clientX, e.clientY);
    d.ghost.style.left = `${gp.x - d.gx * C - C / 2}px`;
    d.ghost.style.top = `${gp.y - d.gy * C - C / 2}px`;
    this.clearPreview();
    const t = this.targetAt(e.clientX, e.clientY);
    if (!t) return;
    if (t.sell) {
      t.sell.classList.add('sell-hover');
      return;
    }
    const prev = document.createElement('div');
    prev.className = `drop-preview ${this.canDrop(t) ? 'ok' : 'bad'}`;
    if (t.panel.type === 'grid') {
      const s = size(d.item);
      prev.style.left = `${t.cx * C}px`;
      prev.style.top = `${t.cy * C}px`;
      prev.style.width = `${s.w * C}px`;
      prev.style.height = `${s.h * C}px`;
    } else prev.style.inset = '0';
    t.area.appendChild(prev);
  }

  canDrop(t) {
    const it = this.drag.item;
    if (t.panel.reject?.(it)) return false;
    if (t.panel.type === 'slot') return t.panel.accept(it) && t.panel.get() !== it;
    if (t.panel.grid.canPlace(it, t.cx, t.cy)) return true;
    return !!this.stackTarget(t);
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

  sourcePos(item, fromId) {
    const p = this.panels.get(fromId);
    if (p.type !== 'grid') return null;
    const e = p.grid.entries.find((x) => x.item === item);
    return e ? { x: e.x, y: e.y } : null;
  }

  detach(item, fromId) {
    const p = this.panels.get(fromId);
    if (p.type === 'grid') p.grid.remove(item);
    else p.set(null);
  }

  onUp(e, cancelled = false) {
    if (this.pending && !this.drag && e.pointerId === this.pending.pid) {
      const pd = this.pending;
      this.pending = null;
      if (cancelled) return;
      const now = performance.now();
      if (this.lastClick && this.lastClick.item === pd.item && now - this.lastClick.t < 380) {
        this.lastClick = null;
        this.quickMove(pd.item, pd.panelId);
      } else {
        this.lastClick = { item: pd.item, t: now };
        if (e.pointerType !== 'mouse') this.showTip(pd.item, pd.el, 2200);
      }
      return;
    }
    if (!this.drag || e.pointerId !== this.drag.pid) return;
    const d = this.drag;
    const t = cancelled ? null : this.targetAt(e.clientX, e.clientY);
    let moved = false;

    if (t?.sell && this.onSell) {
      if (this.onSell(d.item, d.from)) {
        this.detach(d.item, d.from);
        moved = true;
      }
    } else if (t && t.panel && this.canDrop(t)) {
      if (t.panel.type === 'slot') moved = this.dropOnSlot(d, t.panel);
      else {
        const g = t.panel.grid;
        if (g.canPlace(d.item, t.cx, t.cy)) {
          this.detach(d.item, d.from);
          g.entries.push({ item: d.item, x: t.cx, y: t.cy });
        } else {
          const stack = this.stackTarget(t);
          const take = Math.min(ITEMS[d.item.id].stack - stack.count, d.item.count);
          stack.count += take;
          d.item.count -= take;
          if (d.item.count <= 0) this.detach(d.item, d.from);
        }
        moved = true;
      }
    }

    if (!moved) d.item.rot = d.origRot;
    d.ghost.remove();
    this.clearPreview();
    this.drag = null;
    this.rotBtn.classList.add('hidden');
    if (moved) {
      sfx.pickup();
      this.onChange();
    }
    this.refresh();
  }

  /** Equip into a slot; if occupied, swap the old item back to where the dragged one came from. */
  dropOnSlot(d, slot) {
    const old = slot.get();
    const src = this.panels.get(d.from);
    const pos = this.sourcePos(d.item, d.from);
    this.detach(d.item, d.from);
    const rot = d.item.rot;
    d.item.rot = false;
    if (!old) {
      slot.set(d.item);
      return true;
    }
    slot.set(null);
    let placed = false;
    if (src.type === 'grid') {
      old.rot = false;
      placed = (pos && src.grid.place(old, pos.x, pos.y)) || src.grid.add(old) === 0;
    } else if (src.accept(old)) {
      src.set(old);
      placed = true;
    }
    if (placed) {
      slot.set(d.item);
      return true;
    }
    d.item.rot = rot;
    if (src.type === 'grid') src.grid.place(d.item, pos.x, pos.y);
    else src.set(d.item);
    slot.set(old);
    return false;
  }

  /** Double-click / double-tap / ctrl-click: send item to the panel's quickTo targets. */
  quickMove(item, fromId) {
    const src = this.panels.get(fromId);
    if (!src) return;
    for (const toId of [src.quickTo].flat().filter(Boolean)) {
      const to = this.panels.get(toId);
      if (!to || to.reject?.(item)) continue;
      if (to.type === 'slot') {
        if (!to.accept(item) || to.get()) continue;
        this.detach(item, fromId);
        item.rot = false;
        to.set(item);
        return this.afterQuick(true);
      }
      const pos = this.sourcePos(item, fromId);
      const orot = item.rot, before = item.count;
      this.detach(item, fromId);
      if (to.grid.add(item) === 0) return this.afterQuick(true);
      if (src.type === 'grid') {
        item.rot = orot;
        if (!(pos && src.grid.place(item, pos.x, pos.y))) src.grid.add(item);
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
