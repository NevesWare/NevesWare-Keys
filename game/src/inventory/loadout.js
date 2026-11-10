import { Grid } from './grid.js';
import { ITEMS, itemWeight, itemValue } from '../data/items.js';

export const POCKETS_W = 6;

/** Equipment worn by an actor. Backpack is an item that carries its own grid. */
export function newLoadout() {
  return { primary: null, secondary: null, helmet: null, armor: null, backpack: null, pockets: new Grid(POCKETS_W, 1), active: 'primary' };
}

export const SLOTS = ['primary', 'secondary', 'helmet', 'armor', 'backpack'];

export function slotAccepts(slot, it) {
  const d = ITEMS[it.id];
  if (slot === 'primary') return d.cat === 'weapon' && d.slot === 'primary';
  if (slot === 'secondary') return d.cat === 'weapon' && d.slot === 'secondary';
  return d.cat === slot;
}

export function storages(lo) {
  return [lo.pockets, lo.backpack?.grid].filter(Boolean);
}

export function activeWeapon(lo) {
  return lo[lo.active] ?? lo.primary ?? lo.secondary ?? null;
}

export function countItem(lo, id) {
  return storages(lo).reduce((n, g) => n + g.count(id), 0);
}

export function takeItem(lo, id, n) {
  let got = 0;
  for (const g of storages(lo)) if (got < n) got += g.take(id, n - got);
  return got;
}

/** Returns leftover count (0 = everything stored). */
export function addToStorages(lo, item) {
  let left = 1;
  for (const g of [lo.backpack?.grid, lo.pockets].filter(Boolean)) {
    left = g.add(item);
    if (left === 0) return 0;
  }
  return left;
}

/** Top-level items carried (equipped + inside pockets/backpack grid entries). */
export function carriedItems(lo) {
  return [...SLOTS.map((s) => lo[s]), ...lo.pockets.items()].filter(Boolean);
}

export function loadoutWeight(lo) {
  return carriedItems(lo).reduce((w, i) => w + itemWeight(i), 0);
}

export function loadoutValue(lo) {
  return carriedItems(lo).reduce((v, i) => v + itemValue(i), 0);
}

export function clearLoadout(lo) {
  for (const s of SLOTS) lo[s] = null;
  lo.pockets.clear();
  lo.active = 'primary';
}
