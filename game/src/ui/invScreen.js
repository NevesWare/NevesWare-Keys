import { ITEMS, TRADER_STOCK, BUY_MULT, newItem, itemValue, ammoIdFor } from '../data/items.js';
import { factionById, FACTIONS } from '../data/factions.js';
import { slotAccepts, loadoutWeight, loadoutValue, activeWeapon, takeItem, addToStorages } from '../inventory/loadout.js';
import { ui3d } from './icons.js';
import { sfx } from '../audio.js';

const ICONS = {
  inv: '<svg viewBox="0 0 24 24"><path d="M8 4h8l1 3h2a1 1 0 011 1v11a2 2 0 01-2 2H6a2 2 0 01-2-2V8a1 1 0 011-1h2zm1 9h6v2H9z"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="M12 2a7 7 0 017 7c0 5-7 13-7 13S5 14 5 9a7 7 0 017-7zm0 4a3 3 0 100 6 3 3 0 000-6z"/></svg>',
  quest: '<svg viewBox="0 0 24 24"><path d="M7 3h10a2 2 0 012 2v16H5V5a2 2 0 012-2zm2 5h6v2H9zm0 4h6v2H9zm0 4h4v2H9z"/></svg>',
  cfg: '<svg viewBox="0 0 24 24"><path d="M12 8a4 4 0 110 8 4 4 0 010-8zm-1-6h2l.6 3 2 .9 2.6-1.7 1.4 1.4-1.7 2.6.9 2 3 .6v2l-3 .6-.9 2 1.7 2.6-1.4 1.4-2.6-1.7-2 .9-.6 3h-2l-.6-3-2-.9-2.6 1.7-1.4-1.4 1.7-2.6-.9-2-3-.6v-2l3-.6.9-2-1.7-2.6 1.4-1.4 2.6 1.7 2-.9z"/></svg>',
  trade: '<svg viewBox="0 0 24 24"><path d="M3 7h13l-3-3 1.4-1.4L20 8l-5.6 5.4L13 12l3-3H3zm18 10H8l3 3-1.4 1.4L4 16l5.6-5.4L11 12l-3 3h13z"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.8-8 11-8 11z"/></svg>',
  weight: '<svg viewBox="0 0 24 24"><path d="M12 3a3 3 0 012.8 4H19l2 14H3L5 7h4.2A3 3 0 0112 3z"/></svg>',
  shield: '<svg viewBox="0 0 24 24"><path d="M12 2l8 3v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11V5z"/></svg>',
  coin: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/></svg>',
};

const SETTINGS_KEY = 'deadsector-settings';
export function loadSettings() {
  try {
    return { quality: 'auto', shadows: 'on', grass: true, fps: false, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { quality: 'auto', shadows: 'on', grass: true, fps: false };
  }
}
function saveSettings(s) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

/**
 * Full-screen inventory in the style of modern extraction shooters.
 * context 'lobby' -> tabs: Inventário / Comerciante / Mapa / Missões / Configurações; right pane = stash
 * context 'raid'  -> tabs: Inventário / Mapa / Missões / Configurações; right pane = loot container
 */
export class InventoryScreen {
  constructor(inv, hooks) {
    this.inv = inv;
    this.h = hooks; // { onClose, onDeploy, onReset, onChange, getMapCanvas, onSettings }
    this.root = document.getElementById('inv-screen');
    this.settings = loadSettings();
    this.tab = 'inv';
    window.addEventListener('resize', () => this.isOpen && this.render());
  }

  get isOpen() {
    return !this.root.classList.contains('hidden');
  }

  open(ctx) {
    this.ctx = ctx; // { context, profile, actor, container, raid }
    this.tab = ctx.tab ?? 'inv';
    this.root.classList.remove('hidden');
    this.root.classList.toggle('lobby', ctx.context === 'lobby');
    this.root.classList.toggle('raid', ctx.context === 'raid');
    this.render();
  }

  close() {
    this.root.classList.add('hidden');
    this.inv.unmountAll();
  }

  computeCell() {
    const W = window.innerWidth, H = window.innerHeight;
    const c = Math.floor(Math.min((W - 96) / 24.6, (H - 118) / 11));
    return Math.max(24, Math.min(54, c));
  }

  changed() {
    this.ctx.actor?.refreshGear();
    this.h.onChange?.();
    this.render();
  }

  render() {
    const { context, profile } = this.ctx;
    this.inv.unmountAll();
    this.inv.setCell(this.computeCell());
    this.inv.setHandlers({ onChange: () => this.changed(), onSell: context === 'lobby' ? (it) => this.sell(it) : null });
    const f = factionById(profile.faction);
    this.root.style.setProperty('--fc', f.color);

    const tabs = context === 'lobby'
      ? [['inv', 'Inventário', ICONS.inv], ['trade', 'Comerciante', ICONS.trade], ['map', 'Mapa', ICONS.map], ['quest', 'Missões', ICONS.quest], ['cfg', 'Config.', ICONS.cfg]]
      : [['inv', 'Inventário', ICONS.inv], ['map', 'Mapa', ICONS.map], ['quest', 'Missões', ICONS.quest], ['cfg', 'Config.', ICONS.cfg]];

    this.root.innerHTML = `
      <div class="iv-top">
        <nav class="iv-tabs">${tabs.map(([id, label, ic]) => `<button data-tab="${id}" class="${this.tab === id ? 'on' : ''}">${ic}<span>${label}</span></button>`).join('')}</nav>
        <div class="iv-top-r">
          ${context === 'lobby' ? `<span class="iv-faction">${f.name}</span><span class="iv-money">₢ ${profile.money.toLocaleString('pt-BR')}</span>` : `<span class="iv-time" id="iv-time"></span>`}
          ${context === 'raid' ? '<button class="iv-close" aria-label="Fechar">✕</button>' : ''}
        </div>
      </div>
      <div class="iv-body"></div>
      <div class="iv-bottom"></div>`;
    this.root.querySelectorAll('.iv-tabs button').forEach((b) =>
      b.addEventListener('click', () => {
        this.tab = b.dataset.tab;
        sfx.ui();
        this.render();
      }),
    );
    this.root.querySelector('.iv-close')?.addEventListener('click', () => this.h.onClose?.());

    const body = this.root.querySelector('.iv-body');
    if (this.tab === 'inv') this.renderInventory(body);
    else if (this.tab === 'trade') this.renderTrader(body);
    else if (this.tab === 'map') this.renderMap(body);
    else if (this.tab === 'quest') this.renderQuests(body);
    else this.renderSettings(body);
    this.renderBottom(this.root.querySelector('.iv-bottom'));
  }

  // ---------------------------------------------------------------- inventory tab
  pane(title, icon, extraClass = '') {
    const s = document.createElement('section');
    s.className = `iv-pane ${extraClass}`;
    s.innerHTML = `<h3>${icon ?? ''}<span>${title}</span></h3>`;
    return s;
  }

  slotPanel(id, slot, label, w, h, lo) {
    return this.inv.panelEl({
      id, title: label, type: 'slot', w, h, label: '',
      accept: (it) => slotAccepts(slot, it),
      get: () => lo[slot],
      set: (it) => {
        lo[slot] = it;
        if ((slot === 'primary' || slot === 'secondary') && it && !lo[lo.active]) lo.active = slot;
      },
      quickTo: this.ctx.container ? ['loot'] : this.ctx.context === 'lobby' ? ['stash'] : ['bag', 'pockets'],
    });
  }

  renderCharacter(body) {
    const { profile, actor } = this.ctx;
    const lo = profile.loadout;
    const C = this.inv.cell;
    const p = this.pane('PERSONAGEM', ICONS.inv, 'iv-char');
    const compact = window.innerHeight < 520;
    const row = document.createElement('div');
    row.className = `char-row${compact ? ' compact' : ''}`;
    const cv = document.createElement('canvas');
    cv.className = 'char-prev';
    cv.width = Math.round(C * (compact ? 2.2 : 4.4));
    cv.height = Math.round(C * (compact ? 2.6 : 5.7));
    row.appendChild(cv);
    const gear = document.createElement('div');
    gear.className = compact ? 'gear-row' : 'gear-col';
    const gw = compact ? 1.62 : 2.6, gh = compact ? 1.45 : 1.75;
    gear.append(this.slotPanel('helmet', 'helmet', 'CAPACETE', gw, gh, lo), this.slotPanel('armor', 'armor', 'COLETE', gw, gh, lo), this.slotPanel('backpackSlot', 'backpack', 'MOCHILA', gw, gh, lo));
    row.appendChild(gear);
    p.appendChild(row);
    const wpn = document.createElement('div');
    wpn.className = 'wpn-slots';
    wpn.append(this.slotPanel('primary', 'primary', 'PRINCIPAL', 7.2, 1.7, lo), this.slotPanel('secondary', 'secondary', 'SECUNDÁRIA', 7.2, 1.2, lo));
    p.appendChild(wpn);
    const hp = actor ? Math.ceil(actor.health) : 100;
    const kg = loadoutWeight(lo);
    const stats = document.createElement('div');
    stats.className = 'stats-bar';
    stats.innerHTML = `<span class="st-hp">${ICONS.heart}${hp}%</span><span>${ICONS.shield}${lo.armor ? Math.round(lo.armor.dur) : 0}</span><span class="${kg > 35 ? 'heavy' : ''}">${ICONS.weight}${kg.toFixed(1)} / 40kg</span>`;
    p.appendChild(stats);
    body.appendChild(p);
    requestAnimationFrame(() => ui3d.drawCharacter(cv, profile.faction, lo, 3));
  }

  renderBag(body) {
    const lo = this.ctx.profile.loadout;
    const p = this.pane('MOCHILA', ICONS.inv, 'iv-bag');
    const other = this.ctx.context === 'lobby' ? ['stash'] : this.ctx.container ? ['loot'] : [];
    const noSelf = (it) => it === lo.backpack || (!!it.grid && it.grid.entries.length > 0);
    if (lo.backpack) {
      p.appendChild(this.inv.panelEl({ id: 'bag', type: 'grid', grid: lo.backpack.grid, quickTo: [...other, 'pockets'], reject: noSelf }));
    } else {
      const e = document.createElement('div');
      e.className = 'empty-note';
      e.textContent = 'Sem mochila equipada';
      p.appendChild(e);
    }
    const h = document.createElement('h3');
    h.innerHTML = '<span>BOLSOS</span>';
    p.appendChild(h);
    p.appendChild(this.inv.panelEl({ id: 'pockets', type: 'grid', grid: lo.pockets, quickTo: [...other, 'bag'], reject: (it) => !!it.grid }));
    body.appendChild(p);
  }

  renderInventory(body) {
    this.renderCharacter(body);
    this.renderBag(body);
    const { context, profile, container } = this.ctx;
    if (context === 'lobby') {
      const p = this.pane('INVENTÁRIO GLOBAL', ICONS.inv, 'iv-right');
      const sc = document.createElement('div');
      sc.className = 'iv-scroll';
      sc.appendChild(this.inv.panelEl({ id: 'stash', type: 'grid', grid: profile.stash, quickTo: ['primary', 'secondary', 'helmet', 'armor', 'backpackSlot', 'bag', 'pockets'] }));
      p.appendChild(sc);
      const tools = document.createElement('div');
      tools.className = 'pane-tools';
      tools.innerHTML = '<button class="btn-s" data-act="ammo">Carregar munição</button><button class="btn-s" data-act="sort">Organizar</button>';
      tools.querySelector('[data-act=ammo]').onclick = () => this.loadAmmo();
      tools.querySelector('[data-act=sort]').onclick = () => this.sortStash();
      p.appendChild(tools);
      body.appendChild(p);
    } else {
      const p = this.pane('SAQUE', ICONS.inv, 'iv-right');
      if (container) {
        const sub = document.createElement('div');
        sub.className = 'loot-label';
        sub.textContent = container.label;
        p.appendChild(sub);
        const sc = document.createElement('div');
        sc.className = 'iv-scroll';
        sc.appendChild(this.inv.panelEl({ id: 'loot', type: 'grid', grid: container.grid, quickTo: ['primary', 'secondary', 'helmet', 'armor', 'backpackSlot', 'bag', 'pockets'] }));
        p.appendChild(sc);
        const take = document.createElement('div');
        take.className = 'pane-tools';
        take.innerHTML = '<button class="btn-s">Pegar tudo</button>';
        take.querySelector('button').onclick = () => this.takeAll(container);
        p.appendChild(take);
      } else {
        const e = document.createElement('div');
        e.className = 'empty-note';
        e.textContent = 'Nada para saquear por perto. Aproxime-se de uma caixa ou corpo e toque em SAQUEAR.';
        p.appendChild(e);
      }
      body.appendChild(p);
    }
  }

  takeAll(container) {
    const lo = this.ctx.profile.loadout;
    let moved = 0;
    for (const it of [...container.grid.items()]) {
      if (it.grid && it.grid.entries.length) continue;
      container.grid.remove(it);
      if (addToStorages(lo, it) === 0) moved++;
      else container.grid.add(it);
    }
    if (moved) sfx.pickup();
    else sfx.empty();
    this.changed();
  }

  // ---------------------------------------------------------------- bottom bar
  renderBottom(el) {
    const { context, profile } = this.ctx;
    if (context === 'lobby') {
      const lo = profile.loadout;
      el.innerHTML = `<div class="risk">Em risco no raid: <b>₢ ${loadoutValue(lo).toLocaleString('pt-BR')}</b></div>
        <button class="btn deploy">CHAMAR HELICÓPTERO</button>`;
      el.querySelector('.deploy').onclick = () => {
        if (!activeWeapon(lo) && !confirm('Você vai entrar no raid desarmado. Continuar?')) return;
        this.h.onDeploy?.();
      };
    } else {
      el.innerHTML = '<div class="hotbar"></div><div class="keyhints"><span><kbd>F</kbd> Saquear</span><span><kbd>Duplo-clique</kbd> Transferir</span><span><kbd>R</kbd> Girar</span><span><kbd>TAB</kbd> Fechar</span></div>';
      renderHotbar(el.querySelector('.hotbar'), this.ctx.actor, (i) => this.h.onHotbar?.(i));
    }
  }

  // ---------------------------------------------------------------- trader tab
  renderTrader(body) {
    const { profile } = this.ctx;
    const p = this.pane('COMERCIANTE', ICONS.trade, 'iv-trader');
    const list = document.createElement('div');
    list.className = 'trader-list';
    for (const id of TRADER_STOCK) {
      const d = ITEMS[id];
      const qty = d.stack ? (d.caliber === '12g' ? 20 : 30) : 1;
      const price = Math.round(d.value * BUY_MULT * qty);
      const row = document.createElement('button');
      row.className = 'trader-row';
      row.disabled = profile.money < price;
      row.innerHTML = `<img src="${ui3d.icon(id)}" alt=""><span class="tr-name">${d.name}${d.stack ? ` ×${qty}` : ''}</span><span class="tr-price">₢ ${price.toLocaleString('pt-BR')}</span>`;
      row.onclick = () => this.buy(id, qty, price);
      list.appendChild(row);
    }
    p.appendChild(list);
    body.appendChild(p);
    const r = this.pane('INVENTÁRIO GLOBAL', ICONS.inv, 'iv-right');
    const sell = document.createElement('div');
    sell.className = 'sell-zone';
    sell.dataset.sell = '1';
    sell.innerHTML = 'VENDER <small>arraste um item aqui</small>';
    r.appendChild(sell);
    const sc = document.createElement('div');
    sc.className = 'iv-scroll';
    sc.appendChild(this.inv.panelEl({ id: 'stash', type: 'grid', grid: profile.stash }));
    r.appendChild(sc);
    body.appendChild(r);
  }

  buy(id, qty, price) {
    const p = this.ctx.profile;
    if (p.money < price) return;
    const it = newItem(id, qty);
    if (it.mag !== undefined) it.mag = 0;
    if (p.stash.add(it) > 0) {
      sfx.empty();
      this.h.toast?.('Stash cheio!');
      return;
    }
    p.money -= price;
    sfx.coin();
    this.changed();
  }

  sell(item) {
    const v = itemValue(item);
    this.ctx.profile.money += v;
    sfx.coin();
    this.h.toast?.(`Vendido: ${ITEMS[item.id].name} por ₢ ${v.toLocaleString('pt-BR')}`);
    return true;
  }

  loadAmmo() {
    const { profile } = this.ctx;
    const lo = profile.loadout;
    const ws = [lo.primary, lo.secondary].filter(Boolean);
    if (!ws.length) return this.h.toast?.('Equipe uma arma primeiro.');
    let any = false;
    for (const w of ws) {
      const wd = ITEMS[w.id].weapon;
      const ammo = ammoIdFor(wd.caliber);
      const need = wd.mag - w.mag;
      const got = profile.stash.take(ammo, need);
      w.mag += got + takeItem(lo, ammo, need - got);
      const rest = profile.stash.count(ammo);
      if (rest > 0) {
        const it = newItem(ammo, profile.stash.take(ammo, rest));
        const left = addToStorages(lo, it);
        if (left > 0) profile.stash.add(newItem(ammo, left));
      }
      any = any || got > 0 || rest > 0;
    }
    sfx.reload();
    this.h.toast?.(any ? 'Pentes cheios e munição na mochila.' : 'Sem munição compatível no stash.');
    this.changed();
  }

  sortStash() {
    const g = this.ctx.profile.stash;
    const items = g.items();
    const order = { weapon: 0, armor: 1, helmet: 2, backpack: 3, ammo: 4, med: 5, loot: 6 };
    items.sort((a, b) => order[ITEMS[a.id].cat] - order[ITEMS[b.id].cat] || ITEMS[b.id].w * ITEMS[b.id].h - ITEMS[a.id].w * ITEMS[a.id].h);
    g.clear();
    for (const it of items) {
      it.rot = false;
      g.add(it);
    }
    sfx.ui();
    this.changed();
  }

  // ---------------------------------------------------------------- map / quests / settings
  renderMap(body) {
    const p = this.pane('MAPA DO SETOR', ICONS.map, 'iv-map');
    const cv = this.h.getMapCanvas?.();
    if (cv) {
      cv.classList.add('big-map');
      p.appendChild(cv);
    }
    const legend = document.createElement('div');
    legend.className = 'map-legend';
    legend.innerHTML =
      FACTIONS.map((f) => `<span><i style="background:${f.color}"></i>${f.name} (${f.corner})</span>`).join('') +
      '<span><i style="background:#a8703f"></i>Vila Scav (SE)</span><span><i style="background:#ffd66b"></i>Extração</span><span><i style="background:#f4e9d8"></i>Você</span>';
    p.appendChild(legend);
    body.appendChild(p);
  }

  renderQuests(body) {
    const p = this.pane('MISSÕES', ICONS.quest, 'iv-quests');
    p.insertAdjacentHTML(
      'beforeend',
      `<ul class="quests">
        <li><b>Primeiros passos</b><span>Extraia com vida de um raid.</span><em>${this.ctx.profile.stats.extracts > 0 ? 'CONCLUÍDA' : 'EM ANDAMENTO'}</em></li>
        <li><b>Limpeza</b><span>Elimine 5 scavs.</span><em>EM BREVE</em></li>
        <li><b>Dados perdidos</b><span>Traga um Pendrive Criptografado das ruínas.</span><em>EM BREVE</em></li>
      </ul>`,
    );
    body.appendChild(p);
  }

  renderSettings(body) {
    const s = this.settings;
    const p = this.pane('CONFIGURAÇÕES', ICONS.cfg, 'iv-cfg');
    p.insertAdjacentHTML(
      'beforeend',
      `<label>Qualidade gráfica <select data-k="quality"><option value="auto">Automática</option><option value="baixo">Baixa</option><option value="medio">Média</option><option value="alto">Alta</option></select></label>
       <label>Sombras <select data-k="shadows"><option value="on">Ligadas</option><option value="off">Desligadas</option></select></label>
       <label>Grama <input type="checkbox" data-k="grass"></label>
       <label>Mostrar FPS <input type="checkbox" data-k="fps"></label>
       <button class="btn-s" data-act="fs">Tela cheia</button>
       ${this.ctx.context === 'lobby' ? '<button class="btn-s danger" data-act="reset">Reiniciar perfil</button>' : ''}
       <p class="hint">Sombras e capim são reconstruídos no próximo raid.</p>`,
    );
    p.querySelector('[data-k=quality]').value = s.quality ?? 'auto';
    p.querySelector('[data-k=shadows]').value = s.shadows === 'off' ? 'off' : 'on';
    p.querySelector('[data-k=grass]').checked = s.grass;
    p.querySelector('[data-k=fps]').checked = s.fps;
    p.querySelectorAll('[data-k]').forEach((el) =>
      el.addEventListener('change', () => {
        s[el.dataset.k] = el.type === 'checkbox' ? el.checked : el.value;
        saveSettings(s);
        this.h.onSettings?.(s);
      }),
    );
    p.querySelector('[data-act=fs]').onclick = () => document.documentElement.requestFullscreen?.().catch(() => {});
    p.querySelector('[data-act=reset]')?.addEventListener('click', () => {
      if (confirm('Apagar o perfil e escolher outra facção?')) this.h.onReset?.();
    });
    body.appendChild(p);
  }
}

/** Hotbar: 1 primary, 2 secondary, 3–6 pocket slots. */
export function renderHotbar(el, actor, onUse) {
  if (!actor) return;
  const lo = actor.loadout;
  const pocket = (x) => lo.pockets.at(x, 0)?.item ?? null;
  const slots = [lo.primary, lo.secondary, pocket(0), pocket(1), pocket(2), pocket(3)];
  el.innerHTML = '';
  slots.forEach((it, i) => {
    const b = document.createElement('button');
    b.className = 'hb-slot';
    const activeSlot = (i === 0 && lo.active === 'primary' && it) || (i === 1 && lo.active === 'secondary' && it);
    if (activeSlot) b.classList.add('on');
    b.innerHTML = `<span class="hb-n">${i + 1}</span>${it ? `<img src="${ui3d.icon(it.id)}" alt="">` : ''}${it && ITEMS[it.id].stack ? `<span class="hb-c">${it.count}x</span>` : ''}`;
    b.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onUse?.(i);
    });
    el.appendChild(b);
  });
}
