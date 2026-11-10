import { Grid } from './inventory/grid.js';
import { newItem, hydrate } from './data/items.js';
import { newLoadout, SLOTS } from './inventory/loadout.js';

const KEY = 'deadsector-save-v1';
export const STASH_W = 10;
export const STASH_H = 16;

export function newProfile(factionId) {
  const stash = new Grid(STASH_W, STASH_H);
  const lo = newLoadout();
  lo.secondary = newItem('p9');
  lo.secondary.mag = 12;
  lo.active = 'secondary';
  lo.backpack = newItem('mochilaP');
  lo.backpack.grid.add(newItem('a9', 36));
  lo.pockets.add(newItem('bandagem'));
  let money = 40000;

  stash.add(newItem('a9', 60));
  stash.add(newItem('bandagem'));
  stash.add(newItem('capaceteL'));

  if (factionId === 'bears') {
    lo.armor = newItem('coleteL');
    lo.helmet = newItem('capaceteL');
  }
  if (factionId === 'eagle') {
    const v = newItem('vespa');
    v.mag = 30;
    lo.primary = v;
    lo.active = 'primary';
  }
  if (factionId === 'cult') {
    const t = newItem('trovao');
    t.mag = 6;
    lo.primary = t;
    lo.active = 'primary';
    lo.backpack.grid.add(newItem('a12', 16));
    money += 15000;
  }
  return { faction: factionId, money, stash, loadout: lo, stats: { raids: 0, extracts: 0, deaths: 0, kills: 0 } };
}

export function save(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage unavailable: progress lives for this session only */
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    o.stash = Grid.from(o.stash);
    o.stash.entries.forEach((e) => hydrate(e.item));
    o.loadout.pockets = Grid.from(o.loadout.pockets);
    o.loadout.pockets.entries.forEach((e) => hydrate(e.item));
    for (const s of SLOTS) hydrate(o.loadout[s]);
    return o;
  } catch {
    return null;
  }
}

export function wipe() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
