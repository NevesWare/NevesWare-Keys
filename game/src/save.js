import { Grid } from './inventory/grid.js';
import { newItem } from './data/items.js';

const KEY = 'zona-rasa-save-v1';
export const STASH_W = 10;
export const STASH_H = 14;
export const BACKPACK_W = 6;
export const BACKPACK_H = 5;

export function newProfile(factionId) {
  const stash = new Grid(STASH_W, STASH_H);
  const loadout = { weapon: newItem('p9'), armor: null, backpack: new Grid(BACKPACK_W, BACKPACK_H) };
  loadout.weapon.mag = 12;
  loadout.backpack.add(newItem('a9', 36));
  loadout.backpack.add(newItem('bandagem'));
  let money = 40000;

  stash.add(newItem('a9', 60));
  stash.add(newItem('bandagem'));
  stash.add(newItem('bandagem'));
  stash.add(newItem('p9'));

  if (factionId === 'ferro') loadout.armor = newItem('coleteL');
  if (factionId === 'mare') {
    const v = newItem('vespa');
    v.mag = 30;
    stash.add(v);
  }
  if (factionId === 'raiz') {
    stash.add(newItem('medkit'));
    stash.add(newItem('medkit'));
    money += 20000;
  }

  return { faction: factionId, money, stash, loadout, stats: { raids: 0, extracts: 0, deaths: 0, kills: 0 } };
}

export function save(p) {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify({ ...p, stash: p.stash.toJSON(), loadout: { ...p.loadout, backpack: p.loadout.backpack.toJSON() } }),
    );
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
    o.loadout.backpack = Grid.from(o.loadout.backpack);
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
