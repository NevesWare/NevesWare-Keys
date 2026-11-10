import { ITEMS, TRADER_STOCK, BUY_MULT, newItem, itemValue } from '../data/items.js';
import { factionById } from '../data/factions.js';
import { sfx } from '../audio.js';

const $ = (id) => document.getElementById(id);

/** Safe zone: loadout + stash + trader + deploy. */
export class Lobby {
  constructor(inv, { onDeploy, onSave, onReset }) {
    this.inv = inv;
    this.onDeploy = onDeploy;
    this.onSave = onSave;
    this.onReset = onReset;
    this.tab = 'buy';
  }

  open(profile, msg) {
    this.p = profile;
    const f = factionById(profile.faction);
    $('lobby').classList.remove('hidden');
    $('lobby').style.setProperty('--fc', f.color);
    $('lobby-faction').textContent = f.name;
    this.renderHeader();
    if (msg) this.flash(msg);

    const lo = profile.loadout;
    this.inv.mount(
      $('lobby-loadout'),
      [
        {
          id: 'weapon', title: 'Arma principal', type: 'slot', w: 4, h: 2, hint: 'arraste uma arma',
          accept: (it) => ITEMS[it.id].cat === 'weapon', get: () => lo.weapon, set: (it) => (lo.weapon = it), quickTo: 'stash',
        },
        {
          id: 'armor', title: 'Colete', type: 'slot', w: 3, h: 3, hint: 'arraste um colete',
          accept: (it) => ITEMS[it.id].cat === 'armor', get: () => lo.armor, set: (it) => (lo.armor = it), quickTo: 'stash',
        },
        { id: 'backpack', title: 'Mochila (vai para o raid)', type: 'grid', grid: lo.backpack, quickTo: 'stash' },
      ],
      { onChange: () => this.changed(), onSell: (it) => this.sell(it) },
    );
    this.inv.mount($('lobby-stash'), [
      { id: 'stash', title: 'Stash global', type: 'grid', grid: profile.stash, quickTo: ['weapon', 'armor', 'backpack'] },
    ]);
    this.renderTrader();
    $('lobby-deploy').onclick = () => this.deploy();
    $('lobby-reset').onclick = () => {
      if (confirm('Apagar o perfil e escolher outra facção?')) this.onReset();
    };
    $('lobby-load-ammo').onclick = () => this.loadAmmo();
  }

  close() {
    $('lobby').classList.add('hidden');
    this.inv.unmountAll();
  }

  changed() {
    this.renderHeader();
    this.onSave();
  }

  renderHeader() {
    $('lobby-money').textContent = `₢ ${this.p.money.toLocaleString('pt-BR')}`;
    const s = this.p.stats;
    $('lobby-stats').textContent = `Raids ${s.raids} · Extrações ${s.extracts} · Mortes ${s.deaths} · Abates ${s.kills}`;
    const lo = this.p.loadout;
    let worth = lo.backpack.items().reduce((v, i) => v + itemValue(i), 0);
    if (lo.weapon) worth += itemValue(lo.weapon);
    if (lo.armor) worth += itemValue(lo.armor);
    $('lobby-risk').textContent = `Em risco no raid: ₢ ${worth.toLocaleString('pt-BR')}`;
  }

  renderTrader() {
    const list = $('trader-list');
    list.innerHTML = '';
    for (const id of TRADER_STOCK) {
      const d = ITEMS[id];
      const qty = d.stack ? Math.min(d.stack, d.cat === 'ammo' && d.caliber === '12g' ? 20 : 30) : 1;
      const price = Math.round(d.value * BUY_MULT * qty);
      const row = document.createElement('button');
      row.className = 'trader-row';
      row.innerHTML = `<span class="tr-name">${d.name}${d.stack ? ` ×${qty}` : ''}</span><span class="tr-price">₢ ${price.toLocaleString('pt-BR')}</span>`;
      row.disabled = this.p.money < price;
      row.onclick = () => this.buy(id, qty, price);
      list.appendChild(row);
    }
  }

  buy(id, qty, price) {
    if (this.p.money < price) return;
    const it = newItem(id, qty);
    if (this.p.stash.add(it) > 0) {
      this.flash('Stash cheio!');
      sfx.empty();
      return;
    }
    this.p.money -= price;
    sfx.coin();
    this.inv.refresh();
    this.renderTrader();
    this.changed();
  }

  sell(item) {
    const v = itemValue(item);
    this.p.money += v;
    sfx.coin();
    this.flash(`Vendido: ${ITEMS[item.id].name} por ₢ ${v.toLocaleString('pt-BR')}`);
    setTimeout(() => this.renderTrader(), 0);
    return true;
  }

  /** Convenience: move matching ammo for the equipped weapon from stash into the backpack and fill the magazine. */
  loadAmmo() {
    const lo = this.p.loadout;
    if (!lo.weapon) return this.flash('Equipe uma arma primeiro.');
    const w = ITEMS[lo.weapon.id].weapon;
    const ammoId = Object.keys(ITEMS).find((k) => ITEMS[k].cat === 'ammo' && ITEMS[k].caliber === w.caliber);
    const fromStash = this.p.stash.count(ammoId);
    const need = w.mag - lo.weapon.mag;
    let took = this.p.stash.take(ammoId, need);
    lo.weapon.mag += took;
    if (took < need) {
      const fromBag = lo.backpack.take(ammoId, need - took);
      lo.weapon.mag += fromBag;
      took += fromBag;
    }
    const rest = this.p.stash.count(ammoId);
    if (rest > 0) {
      const moved = this.p.stash.take(ammoId, rest);
      const it = newItem(ammoId, moved);
      const left = lo.backpack.add(it);
      if (left > 0) this.p.stash.add(newItem(ammoId, left));
    }
    if (!fromStash && !took) this.flash(`Sem munição ${w.caliber}. Compre no trader.`);
    else this.flash(`Pente cheio e munição ${w.caliber} na mochila.`);
    sfx.reload();
    this.inv.refresh();
    this.changed();
  }

  deploy() {
    const lo = this.p.loadout;
    if (!lo.weapon && !confirm('Você vai entrar no raid desarmado. Continuar?')) return;
    this.onDeploy();
  }

  flash(msg) {
    const el = $('lobby-msg');
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(this.msgT);
    this.msgT = setTimeout(() => el.classList.add('hidden'), 3500);
  }
}
