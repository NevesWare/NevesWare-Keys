import { Grid } from '../inventory/grid.js';
import { LOOT_TABLES, ITEMS, newItem } from '../data/items.js';
import { FACTIONS } from '../data/factions.js';

function pick(table, rand) {
  const total = table.reduce((s, r) => s + r[1], 0);
  let x = rand() * total;
  for (const r of table) {
    x -= r[1];
    if (x <= 0) return r;
  }
  return table[table.length - 1];
}

function roll(row, rand) {
  const [id, , range] = row;
  const count = range ? range[0] + Math.floor(rand() * (range[1] - range[0] + 1)) : 1;
  const it = newItem(id, count);
  if (ITEMS[id].weapon) it.mag = Math.floor(rand() * ITEMS[id].weapon.mag);
  if (ITEMS[id].armor) it.dur = Math.round(ITEMS[id].armor.durability * (0.4 + rand() * 0.6));
  return it;
}

export function fillContainer(c, rand = Math.random) {
  const table = LOOT_TABLES[c.tier] ?? LOOT_TABLES.common;
  const n = c.tier === 'rare' ? 2 + Math.floor(rand() * 3) : 1 + Math.floor(rand() * 4);
  for (let i = 0; i < n; i++) c.grid.add(roll(pick(table, rand), rand));
  c.filled = true;
}

const SCAV_NAMES = ['Zé Ferrugem', 'Tonhão', 'Biscoito', 'Careca', 'Juca', 'Pé de Pano', 'Sombra', 'Corvo', 'Dente', 'Lagarto', 'Faísca', 'Mosca'];
const OP_NAMES = ['Alfa', 'Bravo', 'Delta', 'Eco', 'Foxtrot', 'Lima', 'Sierra', 'Tango', 'Vítor', 'Zulu'];

function ammoFor(weaponId) {
  const cal = ITEMS[weaponId].weapon.caliber;
  return Object.keys(ITEMS).find((k) => ITEMS[k].cat === 'ammo' && ITEMS[k].caliber === cal);
}

function armed(id, rand) {
  const w = newItem(id);
  w.mag = ITEMS[id].weapon.mag;
  return w;
}

/** Bot gear by faction. */
export function botLoadout(faction, rand = Math.random) {
  const backpack = new Grid(6, 5);
  let weapon, armor = null, name;
  if (faction === 'scav') {
    const r = rand();
    const wid = r < 0.55 ? 'p9' : r < 0.8 ? 'trovao' : 'vespa';
    weapon = armed(wid, rand);
    backpack.add(newItem(ammoFor(wid), wid === 'trovao' ? 6 + Math.floor(rand() * 8) : 10 + Math.floor(rand() * 25)));
    if (rand() < 0.5) backpack.add(roll(pick(LOOT_TABLES.common, rand), rand));
    if (rand() < 0.35) backpack.add(newItem('bandagem'));
    if (rand() < 0.15) armor = roll(['coleteL'], rand);
    name = `Scav ${SCAV_NAMES[Math.floor(rand() * SCAV_NAMES.length)]}`;
  } else {
    const wid = rand() < 0.6 ? 'k7' : 'vespa';
    weapon = armed(wid, rand);
    backpack.add(newItem(ammoFor(wid), 30 + Math.floor(rand() * 40)));
    backpack.add(newItem(rand() < 0.5 ? 'medkit' : 'bandagem'));
    if (rand() < 0.5) backpack.add(roll(pick(LOOT_TABLES.military, rand), rand));
    if (rand() < 0.2) backpack.add(roll(pick(LOOT_TABLES.rare, rand), rand));
    armor = roll([rand() < 0.4 ? 'coleteP' : 'coleteL'], rand);
    const f = FACTIONS.find((x) => x.id === faction);
    name = `${f ? f.name.split(' ').pop() : 'Op'} ${OP_NAMES[Math.floor(rand() * OP_NAMES.length)]}`;
  }
  return { name, loadout: { weapon, armor, backpack } };
}

/** Converts a dead actor's gear into a lootable container. */
export function bodyContainer(actor) {
  const grid = new Grid(8, 6);
  const { weapon, armor, backpack } = actor.loadout;
  if (weapon) grid.add(weapon);
  if (armor) grid.add(armor);
  for (const it of backpack.items()) grid.add(it);
  actor.loadout.weapon = null;
  actor.loadout.armor = null;
  backpack.clear();
  return { x: actor.pos.x, z: actor.pos.z, label: `Corpo: ${actor.name}`, grid, filled: true, body: true };
}
