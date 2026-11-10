import { Grid } from '../inventory/grid.js';
import { LOOT_TABLES, ITEMS, newItem, ammoIdFor } from '../data/items.js';
import { newLoadout, addToStorages, carriedItems, clearLoadout } from '../inventory/loadout.js';
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

function armed(id) {
  const w = newItem(id);
  w.mag = ITEMS[id].weapon.mag;
  return w;
}

/** Bot gear by faction. */
export function botLoadout(faction, rand = Math.random) {
  const lo = newLoadout();
  let name;
  const give = (it) => addToStorages(lo, it);
  if (faction === 'scav') {
    const r = rand();
    const wid = r < 0.55 ? 'p9' : r < 0.8 ? 'trovao' : 'vespa';
    const w = armed(wid);
    if (wid === 'p9') {
      lo.secondary = w;
      lo.active = 'secondary';
    } else lo.primary = w;
    if (rand() < 0.5) lo.backpack = newItem('mochilaP');
    give(newItem(ammoIdFor(ITEMS[wid].weapon.caliber), wid === 'trovao' ? 6 + Math.floor(rand() * 8) : 10 + Math.floor(rand() * 25)));
    if (rand() < 0.5) give(roll(pick(LOOT_TABLES.common, rand), rand));
    if (rand() < 0.35) give(newItem('bandagem'));
    if (rand() < 0.15) lo.armor = roll(['coleteL'], rand);
    if (rand() < 0.2) lo.helmet = roll(['capaceteL'], rand);
    name = `Scav ${SCAV_NAMES[Math.floor(rand() * SCAV_NAMES.length)]}`;
  } else {
    const wid = rand() < 0.6 ? 'k7' : 'vespa';
    lo.primary = armed(wid);
    if (rand() < 0.5) lo.secondary = armed('p9');
    lo.backpack = newItem(rand() < 0.3 ? 'mochilaT' : 'mochilaM');
    give(newItem(ammoIdFor(ITEMS[wid].weapon.caliber), 30 + Math.floor(rand() * 40)));
    give(newItem(rand() < 0.5 ? 'medkit' : 'bandagem'));
    if (rand() < 0.5) give(roll(pick(LOOT_TABLES.military, rand), rand));
    if (rand() < 0.2) give(roll(pick(LOOT_TABLES.rare, rand), rand));
    lo.armor = roll([rand() < 0.4 ? 'coleteP' : 'coleteL'], rand);
    lo.helmet = roll([rand() < 0.35 ? 'capaceteP' : 'capaceteL'], rand);
    const f = FACTIONS.find((x) => x.id === faction);
    name = `${f ? f.name.split(' ').pop() : 'Op'} ${OP_NAMES[Math.floor(rand() * OP_NAMES.length)]}`;
  }
  return { name, loadout: lo };
}

/** Converts a dead actor's gear into a lootable container. */
export function bodyContainer(actor) {
  const grid = new Grid(10, 8);
  for (const it of carriedItems(actor.loadout)) grid.add(it);
  clearLoadout(actor.loadout);
  return { x: actor.pos.x, z: actor.pos.z, label: `Corpo: ${actor.name}`, grid, filled: true, body: true };
}
