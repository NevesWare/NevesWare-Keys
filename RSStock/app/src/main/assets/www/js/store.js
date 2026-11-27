/* Estado global: produtos + configurações, com persistência e eventos. */
(function () {
  const u = RS.u;
  const SKEY = 'rs.settings.v1';
  const HKEY = 'rs.history.v1';

  const DEFAULTS = {
    theme: 'dark',            // 'dark' | 'light' | 'system'
    accent: 'violet',
    blur: 24,
    bg: 'aurora',             // 'aurora' | 'gradient' | 'solid'
    compact: false,
    haptics: true,
    fullscreen: true,
    introSeen: false,
    profile: { name: '', store: '', color: 'violet' },
    notif: { enabled: true, daysBefore: 7, hour: 9, minute: 0, notifyExpired: true, inAppBadge: true },
    a11y: { fontScale: 1, contrast: false, reduceMotion: false, solid: false, bold: false, large: false },
    security: { pin: '', lockOnResume: false },
    export: { format: 'pdf', filter: 'all', sort: 'expiry', include: { barcode: true, category: true, qty: true } },
    productsSort: 'expiry',
    onboarded: false
  };

  function merge(base, over) {
    const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
    if (!over) return out;
    Object.keys(over).forEach(k => {
      if (base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k])) out[k] = merge(base[k], over[k]);
      else out[k] = over[k];
    });
    return out;
  }

  const listeners = new Set();

  const store = {
    products: [],
    settings: merge(DEFAULTS, null),
    DEFAULTS,

    history: [],

    /* Histórico de movimentações (adicionado, editado, baixa, removido…) */
    log(type, name, detail = '') {
      this.history.unshift({ t: Date.now(), type, name, detail });
      if (this.history.length > 300) this.history.length = 300;
      try { localStorage.setItem(HKEY, JSON.stringify(this.history)); } catch (e) { /* */ }
    },
    clearHistory() { this.history = []; localStorage.removeItem(HKEY); this.emit('history'); },

    async load() {
      try { this.history = JSON.parse(localStorage.getItem(HKEY) || '[]'); } catch (e) { this.history = []; }
      try { this.settings = merge(DEFAULTS, JSON.parse(localStorage.getItem(SKEY) || 'null')); } catch (e) { this.settings = merge(DEFAULTS, null); }
      this.products = (await RS.repo.list()).map(p => RS.Product(p));
      this.applyAppearance();
      this.syncNative();
    },

    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit(what) { listeners.forEach(fn => { try { fn(what); } catch (e) { console.error(e); } }); },

    /* ----- Configurações ----- */
    set(path, value) {
      const keys = path.split('.');
      let o = this.settings;
      for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
      o[keys[keys.length - 1]] = value;
      localStorage.setItem(SKEY, JSON.stringify(this.settings));
      if (/^(theme|accent|blur|bg|compact|a11y|fullscreen)/.test(path)) this.applyAppearance();
      if (/^notif/.test(path)) this.syncNative();
      this.emit('settings');
    },
    get(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), this.settings); },

    isDark() {
      const t = this.settings.theme;
      if (t === 'system') return !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
      return t !== 'light';
    },

    applyAppearance() {
      const s = this.settings, root = document.documentElement;
      const dark = this.isDark();
      root.dataset.theme = dark ? 'dark' : 'light';
      const ac = RS.config.accents[s.accent] || RS.config.accents.violet;
      root.style.setProperty('--accent', ac.a);
      root.style.setProperty('--accent-2', ac.b);
      root.style.setProperty('--accent-rgb', ac.rgb);
      root.style.setProperty('--blur', s.blur + 'px');
      root.style.setProperty('--fs', s.a11y.fontScale);
      root.dataset.bg = s.bg;
      const flag = (name, on) => { if (on) root.setAttribute(name, ''); else root.removeAttribute(name); };
      flag('data-compact', s.compact);
      flag('data-contrast', s.a11y.contrast);
      flag('data-reduce-motion', s.a11y.reduceMotion);
      flag('data-solid', s.a11y.solid);
      flag('data-bold', s.a11y.bold);
      flag('data-large', s.a11y.large);
      RS.native.setSystemBars(dark);
      RS.native.setImmersive(s.fullscreen !== false);
    },

    /* ----- Produtos ----- */
    threshold() { return Number(this.settings.notif.daysBefore) || 7; },

    enrich(p) {
      const days = u.daysUntil(p.expiry);
      return Object.assign({}, p, { days, status: u.status(days, this.threshold()) });
    },

    all() { return this.products.map(p => this.enrich(p)); },
    byId(id) { const p = this.products.find(x => x.id === id); return p ? this.enrich(p) : null; },
    byBarcode(code) { return code ? this.products.find(x => x.barcode && x.barcode === code) : null; },

    counts() {
      const c = { total: 0, expired: 0, today: 0, soon: 0, ok: 0, units: 0 };
      this.all().forEach(p => { c.total++; c[p.status]++; c.units += Number(p.quantity) || 0; });
      c.alerts = c.expired + c.today + c.soon;
      return c;
    },

    async save(data) {
      const now = new Date().toISOString();
      const idx = this.products.findIndex(p => p.id === data.id);
      let item;
      if (idx >= 0) {
        const before = this.products[idx];
        item = Object.assign({}, before, data, { updatedAt: now });
        this.products[idx] = item;
        const keys = Object.keys(data).filter(k => k !== 'id');
        if (keys.length === 1 && keys[0] === 'quantity') {
          const diff = (Number(item.quantity) || 0) - (Number(before.quantity) || 0);
          this.log(diff < 0 ? 'out' : 'in', item.name, (diff > 0 ? '+' : '') + RS.u.fmtQty(diff, item.unit) + ' → ' + RS.u.fmtQty(item.quantity, item.unit));
        } else this.log('edit', item.name, 'Validade ' + RS.u.fmtDate(item.expiry));
      } else {
        item = RS.Product(Object.assign({}, data, { createdAt: now, updatedAt: now }));
        const s = RS.auth.session();
        if (s && s.kind !== 'guest') item.userId = s.id;
        this.products.unshift(item);
        this.log('add', item.name, RS.u.fmtQty(item.quantity, item.unit) + ' · vence ' + RS.u.fmtDate(item.expiry));
      }
      await RS.repo.upsert(item, this.products);
      this.syncNative();
      this.emit('products');
      return item;
    },

    async remove(id) {
      const removed = this.products.find(p => p.id === id);
      this.products = this.products.filter(p => p.id !== id);
      if (removed) this.log('remove', removed.name);
      await RS.repo.remove(id, this.products);
      this.syncNative();
      this.emit('products');
      return removed;
    },

    async removeMany(ids) {
      const set = new Set(ids);
      const removed = this.products.filter(p => set.has(p.id));
      this.products = this.products.filter(p => !set.has(p.id));
      removed.forEach(p => this.log('remove', p.name));
      await RS.repo.saveAll(this.products);
      this.syncNative();
      this.emit('products');
      return removed;
    },

    async restore(item) {
      const list = Array.isArray(item) ? item : [item];
      this.products.unshift(...list);
      list.forEach(p => this.log('add', p.name, 'restaurado'));
      await RS.repo.saveAll(this.products);
      this.syncNative();
      this.emit('products');
    },

    async replaceAll(items) {
      this.products = items.map(p => RS.Product(p));
      await RS.repo.saveAll(this.products);
      this.syncNative();
      this.emit('products');
    },

    syncNative() {
      const lite = this.products.map(p => ({ id: p.id, name: p.name, expiry: p.expiry, quantity: p.quantity, unit: p.unit }));
      RS.native.sync(lite, this.settings.notif);
    },

    /* ----- Filtros / ordenação compartilhados ----- */
    query({ text = '', status = 'all', sort = 'expiry', date = '', category = '' } = {}) {
      const q = u.norm(text.trim());
      let list = this.all();
      if (status === 'alerts') list = list.filter(p => p.status !== 'ok');
      else if (status !== 'all') list = list.filter(p => p.status === status);
      if (date) list = list.filter(p => p.expiry === date);
      if (category) list = list.filter(p => p.category === category);
      if (q) list = list.filter(p => u.norm(p.name + ' ' + p.barcode + ' ' + p.category + ' ' + p.batch + ' ' + p.location).includes(q));
      const by = {
        expiry: (a, b) => a.days - b.days || a.name.localeCompare(b.name),
        name: (a, b) => a.name.localeCompare(b.name, 'pt-BR'),
        recent: (a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''),
        qty: (a, b) => (Number(b.quantity) || 0) - (Number(a.quantity) || 0)
      };
      return list.sort(by[sort] || by.expiry);
    },

    async resetAll() {
      localStorage.clear();
      this.history = [];
      this.settings = merge(DEFAULTS, null);
      this.products = [];
      await RS.repo.saveAll([]);
      this.applyAppearance();
      this.syncNative();
    }
  };

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = () => { if (store.settings.theme === 'system') store.applyAppearance(); };
    if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn);
  }

  RS.store = store;
})();
