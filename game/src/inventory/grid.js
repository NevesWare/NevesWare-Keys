import { ITEMS } from '../data/items.js';

/** Item footprint, honoring rotation. */
export function size(it) {
  const d = ITEMS[it.id];
  return it.rot ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
}

/**
 * Tarkov-style grid. Items are stored as { item, x, y }; item.rot swaps w/h.
 */
export class Grid {
  constructor(w, h, entries = []) {
    this.w = w;
    this.h = h;
    this.entries = [];
    for (const e of entries) this.entries.push({ item: e.item, x: e.x, y: e.y });
  }

  toJSON() {
    return { w: this.w, h: this.h, entries: this.entries };
  }

  static from(obj) {
    return new Grid(obj.w, obj.h, obj.entries ?? []);
  }

  at(x, y) {
    for (const e of this.entries) {
      const s = size(e.item);
      if (x >= e.x && x < e.x + s.w && y >= e.y && y < e.y + s.h) return e;
    }
    return null;
  }

  canPlace(item, x, y, ignore = null) {
    const s = size(item);
    if (x < 0 || y < 0 || x + s.w > this.w || y + s.h > this.h) return false;
    for (const e of this.entries) {
      if (e.item === ignore || e.item === item) continue;
      const es = size(e.item);
      if (x < e.x + es.w && x + s.w > e.x && y < e.y + es.h && y + s.h > e.y) return false;
    }
    return true;
  }

  place(item, x, y) {
    if (!this.canPlace(item, x, y)) return false;
    this.remove(item);
    this.entries.push({ item, x, y });
    return true;
  }

  remove(item) {
    const i = this.entries.findIndex((e) => e.item === item);
    if (i >= 0) this.entries.splice(i, 1);
    return i >= 0;
  }

  findSpace(item) {
    for (const rot of [item.rot, !item.rot]) {
      const prev = item.rot;
      item.rot = rot;
      for (let y = 0; y < this.h; y++)
        for (let x = 0; x < this.w; x++) if (this.canPlace(item, x, y)) return { x, y, rot };
      item.rot = prev;
    }
    return null;
  }

  /** Merges into existing stacks first, then finds free space. Returns leftover count (0 = all added). */
  add(item) {
    const d = ITEMS[item.id];
    if (d.stack) {
      for (const e of this.entries) {
        if (e.item.id !== item.id || e.item.count >= d.stack) continue;
        const take = Math.min(d.stack - e.item.count, item.count);
        e.item.count += take;
        item.count -= take;
        if (item.count <= 0) return 0;
      }
    }
    const spot = this.findSpace(item);
    if (!spot) return d.stack ? item.count : 1;
    item.rot = spot.rot;
    this.entries.push({ item, x: spot.x, y: spot.y });
    return 0;
  }

  items() {
    return this.entries.map((e) => e.item);
  }

  /** Total count of a stackable item id. */
  count(id) {
    return this.entries.reduce((n, e) => n + (e.item.id === id ? e.item.count : 0), 0);
  }

  /** Remove up to n units of stackable `id`. Returns how many were taken. */
  take(id, n) {
    let taken = 0;
    for (const e of [...this.entries]) {
      if (e.item.id !== id || taken >= n) continue;
      const t = Math.min(e.item.count, n - taken);
      e.item.count -= t;
      taken += t;
      if (e.item.count <= 0) this.remove(e.item);
    }
    return taken;
  }

  clear() {
    this.entries = [];
  }
}
