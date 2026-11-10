import { Grid } from '../inventory/grid.js';

// Item definitions. w/h = grid cells. value = trader sell base (buy = value * BUY_MULT). kg = weight.
export const ITEMS = {
  // --- weapons ---
  p9: {
    name: 'Pistola P-9', short: 'P-9', cat: 'weapon', slot: 'secondary', w: 2, h: 1, value: 4000, kg: 0.8,
    weapon: { caliber: '9mm', mag: 12, rpm: 320, auto: false, damage: 22, spread: 3, range: 24, reload: 1.4, pellets: 1, sound: 'pistol' },
  },
  vespa: {
    name: 'SMG Vespa', short: 'VESPA', cat: 'weapon', slot: 'primary', w: 4, h: 2, value: 14000, kg: 2.6,
    weapon: { caliber: '9mm', mag: 30, rpm: 780, auto: true, damage: 17, spread: 5, range: 26, reload: 2.0, pellets: 1, sound: 'mp5' },
  },
  k7: {
    name: 'Fuzil K-7', short: 'K-7', cat: 'weapon', slot: 'primary', w: 7, h: 2, value: 32000, kg: 3.6,
    weapon: { caliber: '7.62', mag: 30, rpm: 600, auto: true, damage: 33, spread: 2.5, range: 34, reload: 2.4, pellets: 1, sound: 'ak' },
  },
  trovao: {
    name: 'Escopeta Trovão', short: 'TROVÃO', cat: 'weapon', slot: 'primary', w: 8, h: 2, value: 18000, kg: 3.3,
    weapon: { caliber: '12g', mag: 6, rpm: 90, auto: false, damage: 11, spread: 9, range: 14, reload: 2.8, pellets: 8, sound: 'shotgun' },
  },
  awm: {
    name: 'Sniper AWM', short: 'AWM', cat: 'weapon', slot: 'primary', w: 10, h: 2, value: 68000, kg: 6.5,
    weapon: { caliber: '.338', mag: 5, rpm: 42, auto: false, damage: 95, spread: 0.35, range: 70, reload: 3.4, pellets: 1, sound: 'awm' },
  },

  // --- ammo ---
  a9: { name: 'Munição 9x19mm', short: '9x19', cat: 'ammo', w: 1, h: 1, value: 40, stack: 60, caliber: '9mm', kg: 0.008 },
  a762: { name: 'Munição 7.62x39', short: '7.62x39', cat: 'ammo', w: 1, h: 1, value: 110, stack: 60, caliber: '7.62', kg: 0.016 },
  a338: { name: 'Munição .338 Lapua', short: '.338', cat: 'ammo', w: 1, h: 1, value: 420, stack: 30, caliber: '.338', kg: 0.05 },
  a12: { name: 'Cartucho 12/70', short: '12/70', cat: 'ammo', w: 1, h: 1, value: 90, stack: 20, caliber: '12g', kg: 0.04 },

  // --- gear ---
  coleteL: { name: 'Colete Leve', short: 'COLETE L', cat: 'armor', w: 3, h: 3, value: 9000, kg: 3.5, armor: { reduce: 0.3, durability: 60 } },
  coleteP: { name: 'Colete Pesado', short: 'COLETE P', cat: 'armor', w: 4, h: 3, value: 26000, kg: 9, armor: { reduce: 0.5, durability: 110 } },
  capaceteL: { name: 'Capacete Leve', short: 'CAPACETE', cat: 'helmet', w: 2, h: 2, value: 6000, kg: 1.2, armor: { reduce: 0.12, durability: 30 } },
  capaceteP: { name: 'Capacete Balístico', short: 'BALÍSTICO', cat: 'helmet', w: 2, h: 2, value: 17000, kg: 2.4, armor: { reduce: 0.22, durability: 55 } },
  mochilaP: { name: 'Mochila de Assalto', short: 'ASSALTO', cat: 'backpack', w: 3, h: 4, value: 5000, kg: 0.9, grid: [4, 5] },
  mochilaM: { name: 'Mochila Média', short: 'MÉDIA', cat: 'backpack', w: 4, h: 4, value: 12000, kg: 1.4, grid: [5, 6] },
  mochilaT: { name: 'Mochila Tática', short: 'TÁTICA', cat: 'backpack', w: 4, h: 5, value: 24000, kg: 2.1, grid: [6, 7] },

  // --- throwables ---
  granada: { name: 'Granada M67', short: 'GRANADA', cat: 'throw', w: 1, h: 1, value: 3200, kg: 0.4, stack: 3, throw: { damage: 120, radius: 6.5, fuse: 1.8 } },

  // --- meds ---
  bandagem: { name: 'Bandagem', short: 'BAND', cat: 'med', w: 1, h: 1, value: 600, kg: 0.05, med: { heal: 25, time: 2.0 } },
  medkit: { name: 'Kit Médico', short: 'MEDKIT', cat: 'med', w: 2, h: 1, value: 3500, kg: 0.6, med: { heal: 70, time: 4.0 } },

  // --- food & drink ---
  agua: { name: "Garrafa d'Água", short: 'ÁGUA', cat: 'food', w: 1, h: 2, value: 900, kg: 0.6, food: { water: 45, energy: 0 } },
  racao: { name: 'Ração MRE', short: 'MRE', cat: 'food', w: 2, h: 1, value: 1400, kg: 0.4, food: { water: -5, energy: 55 } },
  energetico: { name: 'Energético', short: 'ENERG.', cat: 'food', w: 1, h: 1, value: 1100, kg: 0.3, food: { water: 15, energy: 20, stamina: true } },

  // --- valuables ---
  cobre: { name: 'Fios de Cobre', short: 'COBRE', cat: 'loot', w: 1, h: 1, value: 1800, kg: 0.5 },
  circuito: { name: 'Placa de Circuito', short: 'PLACA', cat: 'loot', w: 2, h: 1, value: 4200, kg: 0.2 },
  bateria: { name: 'Bateria Militar', short: 'BATERIA', cat: 'loot', w: 1, h: 2, value: 6500, kg: 1.8 },
  hd: { name: 'Disco Rígido', short: 'HD', cat: 'loot', w: 1, h: 1, value: 7800, kg: 0.4 },
  relogio: { name: 'Relógio de Ouro', short: 'RELÓGIO', cat: 'loot', w: 1, h: 1, value: 15000, kg: 0.1 },
  combustivel: { name: 'Galão de Combustível', short: 'GALÃO', cat: 'loot', w: 3, h: 3, value: 9500, kg: 5 },
  ferramentas: { name: 'Kit de Ferramentas', short: 'FERRAM.', cat: 'loot', w: 3, h: 2, value: 11000, kg: 3 },
  pendrive: { name: 'Pendrive Criptografado', short: 'USB', cat: 'loot', w: 1, h: 1, value: 24000, kg: 0.02 },
};

/** Grid scale shown to the player. */
export const CELL_CM = 12.5;

export const CATEGORY_TINT = {
  weapon: 'rgba(120,120,130,0.10)',
  ammo: 'rgba(200,160,74,0.10)',
  armor: 'rgba(90,110,70,0.12)',
  helmet: 'rgba(90,110,70,0.12)',
  backpack: 'rgba(90,110,70,0.12)',
  med: 'rgba(184,48,42,0.14)',
  throw: 'rgba(110,120,70,0.14)',
  food: 'rgba(80,160,200,0.12)',
  loot: 'rgba(80,140,200,0.10)',
};

export const TRADER_STOCK = [
  'p9', 'vespa', 'k7', 'trovao', 'awm', 'a9', 'a762', 'a12', 'a338', 'coleteL', 'coleteP', 'capaceteL', 'capaceteP',
  'mochilaP', 'mochilaM', 'mochilaT', 'bandagem', 'medkit', 'agua', 'racao', 'energetico', 'granada',
];

/** Barter offers at the Intendente: give items, receive an item. */
export const BARTERS = [
  { give: [['cobre', 3]], get: 'coleteL' },
  { give: [['circuito', 2], ['bateria', 1]], get: 'vespa' },
  { give: [['hd', 2]], get: 'capaceteP' },
  { give: [['relogio', 1]], get: 'k7' },
  { give: [['combustivel', 1]], get: 'mochilaM' },
  { give: [['ferramentas', 1], ['cobre', 2]], get: 'mochilaT' },
  { give: [['pendrive', 1]], get: 'coleteP' },
];

/** Trader level requirements (unlock by gaining XP). */
export const UNLOCK_LEVEL = { trovao: 2, mochilaM: 2, medkit: 2, k7: 3, coleteP: 4, capaceteP: 4, mochilaT: 5, awm: 6, a338: 6, granada: 3 };

/** Level from total XP: each level needs 35% more than the previous one. */
export function levelInfo(xp = 0) {
  let level = 1, need = 300, rest = xp;
  while (rest >= need) {
    rest -= need;
    level++;
    need = Math.round(need * 1.35);
  }
  return { level, into: rest, need };
}

export const BUY_MULT = 1.6;

/** Loot tables by container tier: [itemId, weight, [minCount, maxCount]] */
export const LOOT_TABLES = {
  common: [
    ['cobre', 10], ['a9', 9, [10, 30]], ['a12', 5, [4, 10]], ['bandagem', 8], ['bateria', 3],
    ['circuito', 4], ['a762', 4, [10, 25]], ['combustivel', 2], ['mochilaP', 2], ['capaceteL', 1],
    ['agua', 7], ['racao', 6], ['energetico', 4],
  ],
  military: [
    ['a762', 9, [20, 50]], ['a9', 6, [20, 50]], ['medkit', 5], ['bateria', 5], ['hd', 4], ['capaceteL', 3],
    ['coleteL', 3], ['vespa', 2], ['k7', 1], ['trovao', 2], ['circuito', 4], ['mochilaM', 2],
    ['racao', 4], ['agua', 3], ['granada', 3, [1, 2]],
  ],
  rare: [
    ['relogio', 5], ['pendrive', 3], ['hd', 6], ['ferramentas', 5], ['coleteP', 2], ['k7', 2], ['medkit', 4],
    ['capaceteP', 2], ['mochilaT', 1], ['awm', 1], ['a338', 3, [5, 15]],
  ],
};

let uid = 1;
export function newItem(id, count = 1) {
  const d = ITEMS[id];
  const it = { uid: `${Date.now().toString(36)}-${uid++}`, id, count: d.stack ? count : 1, rot: false };
  if (d.weapon) it.mag = 0;
  if (d.armor) it.dur = d.armor.durability;
  if (d.grid) it.grid = new Grid(d.grid[0], d.grid[1]);
  return it;
}

/** Re-create Grid instances inside container items after JSON load. */
export function hydrate(it) {
  if (it && it.grid && !(it.grid instanceof Grid)) {
    it.grid = Grid.from(it.grid);
    for (const e of it.grid.entries) hydrate(e.item);
  }
  return it;
}

export function ammoIdFor(caliber) {
  return Object.keys(ITEMS).find((k) => ITEMS[k].cat === 'ammo' && ITEMS[k].caliber === caliber);
}

export function itemValue(it) {
  const d = ITEMS[it.id];
  let v = d.value * (d.stack ? it.count : 1);
  if (d.armor) v *= 0.4 + 0.6 * (it.dur / d.armor.durability);
  if (it.grid) v += it.grid.items().reduce((s, i) => s + itemValue(i), 0);
  return Math.round(v);
}

export function itemWeight(it) {
  const d = ITEMS[it.id];
  let w = d.kg * (d.stack ? it.count : 1);
  if (it.grid) w += it.grid.items().reduce((s, i) => s + itemWeight(i), 0);
  return w;
}
