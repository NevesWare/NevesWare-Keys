// Item definitions. w/h are grid cells. value = trader sell base (buy price = value * 1.6).
export const ITEMS = {
  // --- weapons ---
  p9: {
    name: 'Pistola P-9', short: 'P-9', cat: 'weapon', w: 2, h: 1, value: 4000,
    weapon: { caliber: '9mm', mag: 12, rpm: 320, auto: false, damage: 22, spread: 3, range: 24, reload: 1.4, pellets: 1 },
  },
  vespa: {
    name: 'SMG Vespa', short: 'VESPA', cat: 'weapon', w: 3, h: 2, value: 14000,
    weapon: { caliber: '9mm', mag: 30, rpm: 780, auto: true, damage: 17, spread: 5, range: 26, reload: 2.0, pellets: 1 },
  },
  k7: {
    name: 'Fuzil K-7', short: 'K-7', cat: 'weapon', w: 4, h: 2, value: 32000,
    weapon: { caliber: '7.62', mag: 30, rpm: 600, auto: true, damage: 33, spread: 2.5, range: 34, reload: 2.4, pellets: 1 },
  },
  trovao: {
    name: 'Escopeta Trovão', short: 'TROVÃO', cat: 'weapon', w: 4, h: 1, value: 18000,
    weapon: { caliber: '12g', mag: 6, rpm: 90, auto: false, damage: 11, spread: 9, range: 14, reload: 2.8, pellets: 8 },
  },

  // --- ammo ---
  a9: { name: 'Munição 9mm', short: '9mm', cat: 'ammo', w: 1, h: 1, value: 40, stack: 60, caliber: '9mm' },
  a762: { name: 'Munição 7.62', short: '7.62', cat: 'ammo', w: 1, h: 1, value: 110, stack: 60, caliber: '7.62' },
  a12: { name: 'Cartucho 12g', short: '12g', cat: 'ammo', w: 1, h: 1, value: 90, stack: 20, caliber: '12g' },

  // --- armor ---
  coleteL: { name: 'Colete Leve', short: 'COLETE L', cat: 'armor', w: 2, h: 2, value: 9000, armor: { reduce: 0.3, durability: 60 } },
  coleteP: { name: 'Colete Pesado', short: 'COLETE P', cat: 'armor', w: 3, h: 3, value: 26000, armor: { reduce: 0.5, durability: 110 } },

  // --- meds ---
  bandagem: { name: 'Bandagem', short: 'BAND', cat: 'med', w: 1, h: 1, value: 600, med: { heal: 25, time: 2.0 } },
  medkit: { name: 'Kit Médico', short: 'MEDKIT', cat: 'med', w: 2, h: 1, value: 3500, med: { heal: 70, time: 4.0 } },

  // --- valuables ---
  cobre: { name: 'Fios de Cobre', short: 'COBRE', cat: 'loot', w: 1, h: 1, value: 1800 },
  circuito: { name: 'Placa de Circuito', short: 'PLACA', cat: 'loot', w: 1, h: 1, value: 4200 },
  bateria: { name: 'Bateria Militar', short: 'BAT', cat: 'loot', w: 1, h: 2, value: 6500 },
  hd: { name: 'Disco Rígido', short: 'HD', cat: 'loot', w: 2, h: 1, value: 7800 },
  relogio: { name: 'Relógio de Ouro', short: 'OURO', cat: 'loot', w: 1, h: 1, value: 15000 },
  combustivel: { name: 'Galão de Combustível', short: 'GALÃO', cat: 'loot', w: 2, h: 2, value: 9500 },
  ferramentas: { name: 'Kit de Ferramentas', short: 'FERRAM', cat: 'loot', w: 2, h: 2, value: 11000 },
  pendrive: { name: 'Pendrive Criptografado', short: 'USB', cat: 'loot', w: 1, h: 1, value: 24000 },
};

export const CATEGORY_COLORS = {
  weapon: '#44305e',
  ammo: '#6b3f2a',
  armor: '#3b5a8c',
  med: '#9e3a4a',
  loot: '#4f7a3a',
};

/** What the trader sells. */
export const TRADER_STOCK = ['p9', 'vespa', 'k7', 'trovao', 'a9', 'a762', 'a12', 'coleteL', 'coleteP', 'bandagem', 'medkit'];

export const BUY_MULT = 1.6;

/** Loot tables by container tier: [itemId, weight, [minCount, maxCount]] */
export const LOOT_TABLES = {
  common: [
    ['cobre', 10], ['a9', 9, [10, 30]], ['a12', 5, [4, 10]], ['bandagem', 8], ['bateria', 3],
    ['circuito', 4], ['a762', 4, [10, 25]], ['combustivel', 2],
  ],
  military: [
    ['a762', 9, [20, 50]], ['a9', 6, [20, 50]], ['medkit', 5], ['bateria', 5], ['hd', 4],
    ['coleteL', 3], ['vespa', 2], ['k7', 1], ['trovao', 2], ['circuito', 4],
  ],
  rare: [
    ['relogio', 5], ['pendrive', 3], ['hd', 6], ['ferramentas', 5], ['coleteP', 2], ['k7', 2], ['medkit', 4],
  ],
};

export function def(id) {
  return ITEMS[id];
}

let uid = 1;
export function newItem(id, count = 1) {
  const d = ITEMS[id];
  const it = { uid: `${Date.now().toString(36)}-${uid++}`, id, count: d.stack ? count : 1, rot: false };
  if (d.weapon) it.mag = 0;
  if (d.armor) it.dur = d.armor.durability;
  return it;
}

export function itemValue(it) {
  const d = ITEMS[it.id];
  let v = d.value * (d.stack ? it.count : 1);
  if (d.armor) v *= 0.4 + 0.6 * (it.dur / d.armor.durability);
  return Math.round(v);
}
