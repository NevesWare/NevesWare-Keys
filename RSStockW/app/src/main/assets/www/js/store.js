/* ==========================================================================
   Estado global: lojas, produtos (estoque de cada loja), histórico e ajustes.
   Os dados ficam separados por conta (convidado = este aparelho) e passam
   pelo RS.repo — hoje local, futuramente Supabase com a mesma interface.
   ========================================================================== */
(function () {
  const u = RS.u;
  const SKEY = 'rs.settings.v1';

  const DEFAULTS = {
    theme: 'dark',            // 'dark' | 'light' | 'system' | 'coca' | 'riosul'
    accent: 'violet',
    blur: 24,
    bg: 'aurora',             // 'aurora' | 'gradient' | 'solid'
    compact: false,
    haptics: true,
    fullscreen: true,
    introSeen: false,
    currentStoreId: '',
    profile: { name: '', color: 'violet' },
    notif: { enabled: true, daysBefore: 7, hour: 9, minute: 0, notifyExpired: true, inAppBadge: true, allStores: true, sound: 'alarm', vibrate: true, insistent: false, perStore: true, weekly: true, weeklyDay: 1, weeklyHour: 9, roundReminder: true },
    a11y: { fontScale: 1, contrast: false, reduceMotion: false, solid: false, bold: false, large: false },
    /* Compatibilidade com tamanhos de tela e aparelhos */
    compat: { universal: false, layout: 'auto', scale: 'auto', orientation: 'auto', lite: false, noTransitions: false, gpu: true, init: false },
    security: { pin: '', lockOnResume: false },
    export: { format: 'pdf', filter: 'all', sort: 'expiry', scope: 'current', include: { barcode: true, category: true, qty: true } },
    productsSort: 'expiry',
    onboarded: false
  };

  const STORE_COLORS = ['#7c5cff', '#e4000f', '#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];

  const REASONS = {
    venda: 'Venda', vencido: 'Vencido / descarte', avaria: 'Avaria', uso: 'Uso interno', troca: 'Troca', ajuste: 'Ajuste de contagem', outro: 'Outro'
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
    stores: [],
    products: [],      // produtos de TODAS as lojas (cada um com storeId)
    history: [],
    rounds: [],
    members: {},   // { storeId: [{ userId, nick, role }] }
    roles: {},     // { storeId: 'owner' | 'editor' | 'viewer' }
    settings: merge(DEFAULTS, null),
    DEFAULTS, STORE_COLORS, REASONS,
    LOG_LABEL: { add: 'Cadastro', edit: 'Edição', remove: 'Remoção', in: 'Entrada', out: 'Baixa', 'store-add': 'Loja criada', 'store-edit': 'Loja editada', 'store-remove': 'Loja excluída', round: 'Ronda', team: 'Equipe', import: 'Importação' },

    async load() {
      try { this.settings = merge(DEFAULTS, JSON.parse(localStorage.getItem(SKEY) || 'null')); } catch (e) { this.settings = merge(DEFAULTS, null); }
      if (this.settings.theme === 'coca2') { this.settings.theme = 'coca'; this.saveSettings(); } // Coca 2.0 foi removido
      this.autoCompat();
      if (this.settings.theme === 'coca') { /* tema especial mantém tudo vermelho */ }
      await this.loadAccount();
      this.applyAppearance();
    },

    /* Carrega os dados da conta atual (troca de conta = troca de dados). */
    async loadAccount() {
      const data = await RS.repo.load();
      this.applyData(data);

      // Migração: produtos antigos sem loja vão para uma "Loja principal"
      const orphans = this.products.filter(p => !p.storeId || !this.stores.find(x => x.id === p.storeId));
      if (orphans.length && !this.stores.length) this.stores.push(RS.Store({ name: 'Loja principal' }));
      orphans.forEach(p => { p.storeId = this.stores[0].id; });
      if (orphans.length) await this.persist();

      if (!this.stores.find(x => x.id === this.settings.currentStoreId)) {
        this.settings.currentStoreId = this.stores[0] ? this.stores[0].id : '';
        this.saveSettings();
      }
      this.syncNative();
      this.emit('all');
      if (RS.auth.isUser()) {
        this.syncNow(true);
        RS.repo.subscribe(() => this.syncNow(true));   // tempo real (lojas compartilhadas)
      }
    },

    applyData(data) {
      this.stores = (data.stores || []).map(x => RS.Store(x));
      this.products = (data.products || []).map(p => RS.Product(p));
      this.history = data.history || [];
      this.rounds = data.rounds || [];
      this.members = data.members || {};
      this.roles = data.roles || {};
    },

    /* Puxa da nuvem (enviando antes o que estiver pendente) e aplica no app. */
    async syncNow(silent) {
      const data = await RS.repo.pull();
      if (!data) {
        if (!silent && RS.repo.status.error) RS.ui.toast('Sem conexão — seus dados ficam salvos no aparelho', { type: 'warn', icon: 'cloud' });
        return false;
      }
      this.applyData(data);
      if (!this.find(this.settings.currentStoreId)) { this.settings.currentStoreId = this.stores[0] ? this.stores[0].id : ''; this.saveSettings(); }
      this.syncNative();
      this.emit('all');
      if (!silent) RS.ui.toast('Tudo sincronizado com a nuvem', { type: 'ok', icon: 'cloud' });
      return true;
    },
    find(id) { return this.stores.find(x => x.id === id); },

    /* Leva os dados do modo convidado para a conta logada. */
    async importGuest() {
      const g = RS.repo.guestData();
      if (!g) return false;
      const merged = {
        stores: this.stores.concat((g.stores || []).filter(x => !this.find(x.id))),
        products: this.products.concat((g.products || []).filter(p => !this.products.find(x => x.id === p.id))),
        history: (g.history || []).concat(this.history)
      };
      this.stores = merged.stores.map(x => RS.Store(x));
      this.products = merged.products.map(p => RS.Product(p));
      this.history = merged.history;
      if (!this.find(this.settings.currentStoreId) && this.stores[0]) { this.settings.currentStoreId = this.stores[0].id; this.saveSettings(); }
      const r = await RS.repo.uploadAll({ stores: this.stores, products: this.products, history: this.history });
      if (r && r.ok) RS.repo.clearGuest();
      this.syncNative();
      this.emit('all');
      return r && r.ok;
    },

    async persist() { await RS.repo.save({ stores: this.stores, products: this.products, history: this.history, rounds: this.rounds, members: this.members, roles: this.roles }); },

    /* ----- Equipe ----- */
    role(storeId) { return this.roles[storeId] || 'owner'; },
    canEdit(storeId) { return this.role(storeId || this.settings.currentStoreId) !== 'viewer'; },
    isShared(storeId) { const m = this.members[storeId] || []; return m.length > 1; },
    membersOf(storeId) { return this.members[storeId] || []; },

    /* ----- Ronda semanal de validade ----- */
    weekKey(d) {
      d = d ? new Date(d) : new Date();
      const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
      const day = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - day);
      const y = t.getUTCFullYear(), w = Math.ceil(((t - Date.UTC(y, 0, 1)) / 864e5 + 1) / 7);
      return y + '-S' + String(w).padStart(2, '0');
    },
    weekRange(d) {
      d = d ? new Date(d) : new Date();
      const mon = new Date(d); mon.setHours(0, 0, 0, 0); mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
      const sun = new Date(mon); sun.setDate(sun.getDate() + 6);
      return { start: mon, end: sun };
    },
    roundFor(storeId, week) { return this.rounds.find(r => r.storeId === storeId && r.week === (week || this.weekKey())) || null; },
    async roundMark(storeId, productId, status) {
      const week = this.weekKey(), ses = RS.auth.session();
      let r = this.roundFor(storeId, week);
      const now = new Date().toISOString();
      if (!r) {
        r = { id: u.uid(), storeId, week, author: (ses && ses.nick) || this.settings.profile.name || 'Convidado', checked: {}, total: 0, done: 0, startedAt: now, finishedAt: null, updatedAt: now };
        this.rounds.unshift(r);
        this.log('round', 'Ronda semanal', 'Iniciada · semana ' + week, storeId);
      }
      if (status) r.checked[productId] = { s: status, t: Date.now(), by: r.author };
      else delete r.checked[productId];
      const ids = this.products.filter(p => p.storeId === storeId).map(p => p.id);
      r.total = ids.length;
      r.done = ids.filter(id => r.checked[id]).length;
      r.updatedAt = now;
      await this.persist();
      this.syncNative();
      this.emit('round');
      return r;
    },
    async roundFinish(storeId) {
      const r = this.roundFor(storeId);
      if (!r) return null;
      r.finishedAt = new Date().toISOString(); r.updatedAt = r.finishedAt;
      this.log('round', 'Ronda semanal', 'Concluída · ' + r.done + ' de ' + r.total + ' conferidos', storeId);
      await this.persist();
      this.syncNative();
      this.emit('round');
      return r;
    },

    /* ----- Relatório de perdas (baixas por vencimento/avaria) ----- */
    LOSS_REASONS: ['vencido', 'avaria'],
    losses({ days = 30, storeId } = {}) {
      const since = Date.now() - days * 864e5;
      const rows = this.history.filter(m => m.type === 'out' && m.t >= since && this.LOSS_REASONS.includes(m.reason) && (!storeId || m.storeId === storeId));
      const sum = { value: 0, units: 0, count: rows.length, byReason: {}, byProduct: {}, byStore: {}, byWeek: {} };
      rows.forEach(m => {
        const q = Number(m.qty) || 0, v = q * (Number(m.cost) || 0);
        sum.value += v; sum.units += q;
        const br = sum.byReason[m.reason] = sum.byReason[m.reason] || { value: 0, units: 0 }; br.value += v; br.units += q;
        const bp = sum.byProduct[m.name] = sum.byProduct[m.name] || { value: 0, units: 0, store: m.storeName }; bp.value += v; bp.units += q;
        const bs = sum.byStore[m.storeName || '—'] = sum.byStore[m.storeName || '—'] || { value: 0, units: 0 }; bs.value += v; bs.units += q;
        const wk = this.weekKey(m.t); const bw = sum.byWeek[wk] = sum.byWeek[wk] || { value: 0, units: 0 }; bw.value += v; bw.units += q;
      });
      sum.rows = rows;
      return sum;
    },

    /* ----- Exportar / importar uma loja (arquivo .json) ----- */
    exportStore(storeId) {
      const st = this.find(storeId);
      if (!st) return null;
      return {
        format: 'rsstock-store', version: 1, exportedAt: new Date().toISOString(),
        store: { name: st.name, address: st.address, color: st.color, notes: st.notes },
        products: this.products.filter(p => p.storeId === storeId).map(p => ({ name: p.name, barcode: p.barcode, category: p.category, quantity: p.quantity, unit: p.unit, expiry: p.expiry, batch: p.batch, location: p.location, notes: p.notes, cost: p.cost }))
      };
    },
    async importStore(data, { mode = 'new', targetId } = {}) {
      if (!data || data.format !== 'rsstock-store' || !Array.isArray(data.products)) throw new Error('Arquivo de loja inválido');
      let st;
      if (mode === 'merge' && targetId && this.find(targetId)) st = this.find(targetId);
      else st = await this.saveStore({ name: (data.store && data.store.name) || 'Loja importada', address: (data.store && data.store.address) || '', color: (data.store && data.store.color) || undefined });
      const now = new Date().toISOString();
      data.products.forEach(p => this.products.unshift(RS.Product(Object.assign({}, p, { id: u.uid(), storeId: st.id, createdAt: now, updatedAt: now }))));
      this.log('import', 'Importação de loja', u.plural(data.products.length, 'produto importado', 'produtos importados'), st.id, st.name);
      await this.persist();
      this.syncNative();
      this.emit('all');
      return { store: st, count: data.products.length };
    },

    on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    emit(what) { Array.from(listeners).forEach(fn => { if (!listeners.has(fn)) return; try { fn(what); } catch (e) { console.error(e); } }); },

    /* ----- Configurações ----- */
    saveSettings() { localStorage.setItem(SKEY, JSON.stringify(this.settings)); },
    set(path, value) {
      const keys = path.split('.');
      let o = this.settings;
      for (let i = 0; i < keys.length - 1; i++) o = o[keys[i]];
      o[keys[keys.length - 1]] = value;
      this.saveSettings();
      if (/^(theme|accent|blur|bg|compact|a11y|fullscreen|compat)/.test(path)) this.applyAppearance();
      if (/^notif/.test(path)) this.syncNative();
      this.emit('settings');
    },
    get(path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), this.settings); },

    isCoca() { return this.settings.theme === 'coca'; },
    /* temas de marca (claros, com cores próprias): Coca e Rio Sul */
    isBrand() { return this.settings.theme === 'coca' || this.settings.theme === 'riosul'; },
    isCoca2() { return false; },
    isDark() {
      const t = this.settings.theme;
      if (t === 'coca' || t === 'riosul') return false;
      if (t === 'system') return !window.matchMedia || window.matchMedia('(prefers-color-scheme: dark)').matches;
      return t !== 'light';
    },

    accent() {
      if (this.isCoca()) return RS.config.cocaAccent;
      if (this.settings.theme === 'riosul') return RS.config.riosulAccent;
      return RS.config.accents[this.settings.accent] || RS.config.accents.violet;
    },

    applyAppearance() {
      const s = this.settings, root = document.documentElement;
      const dark = this.isDark();
      root.dataset.theme = this.isBrand() ? this.settings.theme : dark ? 'dark' : 'light';
      const ac = this.accent();
      root.style.setProperty('--accent', ac.a);
      root.style.setProperty('--accent-2', ac.b);
      root.style.setProperty('--accent-rgb', ac.rgb);
      root.style.setProperty('--blur', s.blur + 'px');
      const cp = this.compatInfo();
      root.style.setProperty('--fs', (s.a11y.fontScale * cp.scale).toFixed(3));
      root.dataset.layout = cp.layout;

      root.dataset.bg = s.bg;
      const flag = (name, on) => { if (on) root.setAttribute(name, ''); else root.removeAttribute(name); };
      flag('data-compact', s.compact);
      flag('data-contrast', s.a11y.contrast);
      flag('data-reduce-motion', s.a11y.reduceMotion);
      flag('data-solid', s.a11y.solid);
      flag('data-bold', s.a11y.bold);
      flag('data-large', s.a11y.large);
      flag('data-lite', cp.lite);
      flag('data-no-transitions', cp.noTransitions);
      RS.native.setSystemBars(dark);
      RS.native.setImmersive(s.fullscreen !== false && !cp.universal);
      RS.native.setOrientation(cp.orientation);
      RS.native.setGpu(cp.gpu && !cp.safe);
      flag('data-universal', cp.universal);
      // O ícone NÃO troca mais sozinho (trocar com o app aberto fazia o Android fechá-lo).
      // A troca é opcional, pelo botão em Aparência, e só acontece quando o app sai da tela.
      if (RS.fx) RS.fx.update();
      document.querySelectorAll('img.app-logo').forEach(i => { i.src = RS.logoSrc(); });
    },

    /* ----- Compatibilidade: decide layout, escala e orientação para este aparelho ----- */
    device() {
      const info = RS.native.info();
      const w = info.screenWdp || window.innerWidth, h = info.screenHdp || window.innerHeight;
      const sw = info.smallestWdp || Math.min(w, h);
      const tablet = info.tablet != null ? info.tablet : sw >= 600;
      const kind = tablet ? 'tablet' : sw < 360 ? 'small' : 'phone';
      return { w, h, sw, tablet, kind, safe: !!info.safeMode, density: info.density || window.devicePixelRatio || 1, sdk: info.sdk || 0, lowEnd: !!info.lowRam || (info.memoryClass && info.memoryClass <= 128) || (info.sdk && info.sdk < 26) };
    },
    compatInfo() {
      const c = this.settings.compat, d = this.device();
      const uni = !!c.universal || d.safe;   // modo compatibilidade de dispositivo
      const auto = (v) => uni || v === 'auto';
      const layout = auto(c.layout) ? (d.tablet ? 'tablet' : d.kind === 'small' ? 'compact' : 'phone') : c.layout;
      // escala pela menor largura da tela (funciona para qualquer DPI)
      const autoScale = d.sw < 330 ? 0.86 : d.sw < 360 ? 0.92 : d.sw >= 720 ? 1.12 : d.sw >= 600 ? 1.06 : 1;
      const scale = auto(c.scale) ? autoScale : Number(c.scale);
      const orientation = auto(c.orientation) ? (d.tablet ? 'auto' : 'portrait') : c.orientation;
      return { layout, scale: scale || 1, orientation, universal: uni, lite: uni || !!c.lite, noTransitions: uni || !!c.noTransitions, gpu: c.gpu !== false, safe: d.safe, device: d };
    },
    /* Primeira abertura: ajusta sozinho para aparelhos mais fracos */
    autoCompat() {
      const c = this.settings.compat;
      if (c.init) return;
      const d = this.device();
      c.init = true;
      if (d.lowEnd) c.universal = true;
      this.saveSettings();
    },

    /* ----- Lojas ----- */
    current() { return this.stores.find(x => x.id === this.settings.currentStoreId) || this.stores[0] || null; },
    storeName(id) { const st = this.stores.find(x => x.id === id); return st ? st.name : '—'; },
    setCurrent(id) {
      setTimeout(() => this.syncNative(), 0);   // widget mostra a loja aberta
      if (!this.stores.find(x => x.id === id)) return;
      this.settings.currentStoreId = id;
      this.saveSettings();
      this.emit('store');
    },

    async saveStore(data) {
      const now = new Date().toISOString();
      const idx = this.stores.findIndex(x => x.id === data.id);
      let st;
      if (idx >= 0) {
        const before = this.stores[idx];
        st = Object.assign({}, before, data, { updatedAt: now });
        this.stores[idx] = st;
        this.log('store-edit', st.name, before.name !== st.name ? 'Renomeada de “' + before.name + '”' : 'Dados da loja atualizados', st.id);
      } else {
        st = RS.Store(Object.assign({ color: STORE_COLORS[this.stores.length % STORE_COLORS.length] }, data, { createdAt: now, updatedAt: now }));
        const ses = RS.auth.session();
        if (ses && ses.kind !== 'guest') st.userId = ses.id;
        this.stores.push(st);
        this.log('store-add', st.name, 'Loja criada', st.id);
        if (!this.settings.currentStoreId) this.settings.currentStoreId = st.id;
      }
      this.saveSettings();
      await this.persist();
      this.syncNative();
      this.emit('stores');
      return st;
    },

    async removeStore(id) {
      const st = this.stores.find(x => x.id === id);
      if (!st) return;
      if (RS.auth.isUser() && this.role(id) !== 'owner') {
        // participante só sai da loja compartilhada; os dados continuam para a equipe
        try { await RS.repo.leave(id); } catch (e) { RS.ui.toast(RS.auth.client ? (e.message || 'Falha ao sair') : 'Sem conexão', { type: 'err' }); return; }
        // não apaga nada localmente (isso apagaria os dados da equipe na nuvem): só baixa de novo
        if (this.settings.currentStoreId === id) { this.settings.currentStoreId = ''; this.saveSettings(); }
        await this.syncNow(true);
        this.emit('stores');
        return;
      }
      const n = this.products.filter(p => p.storeId === id).length;
      this.stores = this.stores.filter(x => x.id !== id);
      this.products = this.products.filter(p => p.storeId !== id);
      this.log('store-remove', st.name, 'Loja excluída com ' + u.plural(n, 'produto', 'produtos'), id, st.name);
      if (this.settings.currentStoreId === id) this.settings.currentStoreId = this.stores[0] ? this.stores[0].id : '';
      this.saveSettings();
      await this.persist();
      this.syncNative();
      this.emit('stores');
    },

    storeCounts(id) {
      const c = { total: 0, expired: 0, soon: 0, mid: 0, ok: 0, units: 0, items: 0 };
      const keys = new Set();
      this.products.forEach(p => {
        if (id && p.storeId !== id) return;
        const st = u.status(u.daysUntil(p.expiry));
        c.total++; c[st]++; c.units += Number(p.quantity) || 0;
        keys.add(this.groupKey(p));
      });
      c.items = keys.size;          // produtos distintos (cada um pode ter várias datas)
      c.alerts = c.expired + c.soon;
      return c;
    },

    /* ----- Histórico (log de tudo que foi feito) ----- */
    log(type, name, detail = '', storeId, storeName) {
      const ses = RS.auth.session();
      this.history.unshift({
        id: u.uid(), t: Date.now(), type, name, detail,
        storeId: storeId || this.settings.currentStoreId,
        storeName: storeName || this.storeName(storeId || this.settings.currentStoreId),
        user: (ses && (ses.nick || ses.email)) || this.settings.profile.name || 'Convidado'
      });
      if (this.history.length > 1500) this.history.length = 1500;
    },
    async clearHistory() { this.history = []; await this.persist(); this.emit('history'); },

    /* ----- Produtos (sempre da loja atual, salvo quando indicado) ----- */
    enrich(p) {
      const days = u.daysUntil(p.expiry);
      return Object.assign({}, p, { days, status: u.status(days) });
    },
    all(storeId) {
      const id = storeId === undefined ? this.settings.currentStoreId : storeId;
      return this.products.filter(p => !id || p.storeId === id).map(p => this.enrich(p));
    },
    byId(id) { const p = this.products.find(x => x.id === id); return p ? this.enrich(p) : null; },

    /* ----- Lotes: o mesmo produto (nome + código + loja) com várias datas, cada uma com sua quantidade ----- */
    groupKey(p) { return (p.storeId || '') + '|' + u.norm((p.name || '').trim()) + '|' + (p.barcode || '').trim(); },
    lotsOf(id) {
      const p = this.products.find(x => x.id === id);
      if (!p) return [];
      const k = this.groupKey(p);
      return this.products.filter(x => this.groupKey(x) === k).map(x => this.enrich(x)).sort((a, b) => a.days - b.days || (a.createdAt || '').localeCompare(b.createdAt || ''));
    },
    /** Agrupa uma lista (já filtrada/ordenada) de lotes em produtos, mantendo a ordem do primeiro lote de cada um. */
    groups(list) {
      const map = new Map();
      list.forEach(p => {
        const k = this.groupKey(p);
        let g = map.get(k);
        if (!g) { g = { key: k, lead: p, lots: [], qty: 0 }; map.set(k, g); }
        g.lots.push(p); g.qty += Number(p.quantity) || 0;
        if (p.days < g.lead.days) g.lead = p;
      });
      return Array.from(map.values()).map(g => { g.lots.sort((a, b) => a.days - b.days); g.status = g.lead.status; g.days = g.lead.days; return g; });
    },
    /** Salva o produto com todas as suas datas. lots: [{ id?, expiry, quantity }]. removed: ids de lotes apagados. */
    async saveLots(base, lots, removed = []) {
      const now = new Date().toISOString();
      const ses = RS.auth.session();
      const shared = ['name', 'barcode', 'unit', 'category', 'batch', 'location', 'cost', 'notes', 'storeId'];
      const out = [];
      const changes = [];
      lots.forEach(l => {
        const idx = l.id ? this.products.findIndex(x => x.id === l.id) : -1;
        const fields = {}; shared.forEach(k => { if (base[k] !== undefined) fields[k] = base[k]; });
        if (idx >= 0) {
          const before = this.products[idx];
          const item = Object.assign({}, before, fields, { expiry: l.expiry, quantity: l.quantity, updatedAt: now });
          if (before.expiry !== item.expiry) changes.push('validade ' + u.fmtDate(before.expiry) + ' → ' + u.fmtDate(item.expiry));
          if (Number(before.quantity) !== Number(item.quantity)) changes.push(u.fmtDate(item.expiry) + ': ' + u.fmtQty(before.quantity, item.unit) + ' → ' + u.fmtQty(item.quantity, item.unit));
          if (before.name !== item.name && !changes.includes('nome')) changes.push('nome');
          if (before.storeId !== item.storeId && !changes.some(c => c.startsWith('movido'))) changes.push('movido para ' + this.storeName(item.storeId));
          this.products[idx] = item; out.push(item);
        } else {
          const item = RS.Product(Object.assign({ storeId: this.settings.currentStoreId }, fields, { id: l.id || u.uid(), expiry: l.expiry, quantity: l.quantity, createdAt: now, updatedAt: now }));
          if (ses && ses.kind !== 'guest') item.userId = ses.id;
          this.products.unshift(item); out.push(item);
          this.log('add', item.name, u.fmtQty(item.quantity, item.unit) + ' · vence ' + u.fmtDate(item.expiry), item.storeId);
        }
      });
      removed.forEach(id => {
        const r = this.products.find(x => x.id === id);
        if (!r) return;
        this.products = this.products.filter(x => x.id !== id);
        this.log('remove', r.name, 'Data ' + u.fmtDate(r.expiry) + ' removida · tinha ' + u.fmtQty(r.quantity, r.unit), r.storeId);
      });
      if (changes.length && out[0]) this.log('edit', out[0].name, changes.join(' · '), out[0].storeId);
      await this.persist();
      this.syncNative();
      this.emit('products');
      return out;
    },
    async addLot(id, expiry, quantity) {
      const p = this.products.find(x => x.id === id);
      if (!p) return null;
      const r = await this.saveLots(p, [{ expiry, quantity }]);
      return r[0];
    },
    byBarcode(code) {
      if (!code) return null;
      return this.products.find(x => x.barcode === code && x.storeId === this.settings.currentStoreId) || this.products.find(x => x.barcode === code);
    },
    counts() { return this.storeCounts(this.settings.currentStoreId); },

    async save(data) {
      const now = new Date().toISOString();
      const idx = this.products.findIndex(p => p.id === data.id);
      let item;
      if (idx >= 0) {
        const before = this.products[idx];
        item = Object.assign({}, before, data, { updatedAt: now });
        this.products[idx] = item;
        const changes = [];
        if (before.name !== item.name) changes.push('nome');
        if (before.expiry !== item.expiry) changes.push('validade ' + u.fmtDate(before.expiry) + ' → ' + u.fmtDate(item.expiry));
        if (Number(before.quantity) !== Number(item.quantity)) changes.push('qtd ' + u.fmtQty(before.quantity, item.unit) + ' → ' + u.fmtQty(item.quantity, item.unit));
        if (before.barcode !== item.barcode) changes.push('código');
        if (before.category !== item.category) changes.push('categoria');
        if (before.storeId !== item.storeId) changes.push('movido para ' + this.storeName(item.storeId));
        if (changes.length) this.log('edit', item.name, changes.join(' · '), item.storeId);
      } else {
        item = RS.Product(Object.assign({ storeId: this.settings.currentStoreId }, data, { createdAt: now, updatedAt: now }));
        const ses = RS.auth.session();
        if (ses && ses.kind !== 'guest') item.userId = ses.id;
        this.products.unshift(item);
        this.log('add', item.name, u.fmtQty(item.quantity, item.unit) + ' · vence ' + u.fmtDate(item.expiry), item.storeId);
      }
      await this.persist();
      this.syncNative();
      this.emit('products');
      return item;
    },

    /* Baixa (saída) ou entrada de estoque, com motivo — tudo registrado. */
    async move(id, delta, reason = '', note = '') {
      const p = this.products.find(x => x.id === id);
      if (!p) return null;
      const before = Number(p.quantity) || 0;
      const after = Math.max(0, Math.round((before + delta) * 1000) / 1000);
      p.quantity = after;
      p.updatedAt = new Date().toISOString();
      const real = after - before;
      const why = REASONS[reason] || reason;
      this.log(real < 0 ? 'out' : 'in', p.name,
        u.fmtQty(Math.abs(real), p.unit) + (why ? ' · ' + why : '') + ' · ' + u.fmtQty(before, p.unit) + ' → ' + u.fmtQty(after, p.unit) + (note ? ' · “' + note + '”' : '') + (this.lotsOf(p.id).length > 1 ? ' · val. ' + u.fmtDate(p.expiry) : ''),
        p.storeId);
      Object.assign(this.history[0], { qty: Math.abs(real), reason: reason || '', cost: Number(p.cost) || 0 });
      await this.persist();
      this.syncNative();
      this.emit('products');
      return this.enrich(p);
    },

    async remove(id, why) {
      const removed = this.products.find(p => p.id === id);
      this.products = this.products.filter(p => p.id !== id);
      if (removed) this.log('remove', removed.name, why || 'Removido do estoque · tinha ' + u.fmtQty(removed.quantity, removed.unit), removed.storeId);
      await this.persist();
      this.syncNative();
      this.emit('products');
      return removed;
    },

    async removeMany(ids) {
      const set = new Set(ids);
      const removed = this.products.filter(p => set.has(p.id));
      this.products = this.products.filter(p => !set.has(p.id));
      removed.forEach(p => this.log('remove', p.name, 'Removido (seleção múltipla)', p.storeId));
      await this.persist();
      this.syncNative();
      this.emit('products');
      return removed;
    },

    async restore(item) {
      const list = Array.isArray(item) ? item : [item];
      this.products.unshift(...list);
      list.forEach(p => this.log('add', p.name, 'Restaurado (desfazer)', p.storeId));
      await this.persist();
      this.syncNative();
      this.emit('products');
    },

    /* Substitui o estoque inteiro (backup). */
    async replaceAll(data) {
      if (Array.isArray(data)) data = { products: data };
      if (data.stores) this.stores = data.stores.map(x => RS.Store(x));
      if (!this.stores.length) this.stores.push(RS.Store({ name: 'Loja principal' }));
      this.products = (data.products || []).map(p => RS.Product(Object.assign({ storeId: this.stores[0].id }, p)));
      this.products.forEach(p => { if (!this.stores.find(x => x.id === p.storeId)) p.storeId = this.stores[0].id; });
      if (data.history) this.history = data.history;
      if (!this.stores.find(x => x.id === this.settings.currentStoreId)) this.settings.currentStoreId = this.stores[0].id;
      this.saveSettings();
      await this.persist();
      this.syncNative();
      this.emit('all');
    },

    async clearStoreProducts(storeId) {
      const n = this.products.filter(p => p.storeId === storeId).length;
      this.products = this.products.filter(p => p.storeId !== storeId);
      this.log('remove', 'Todos os produtos', u.plural(n, 'produto apagado', 'produtos apagados'), storeId);
      await this.persist();
      this.syncNative();
      this.emit('products');
    },

    syncNative() {
      const names = {};
      this.stores.forEach(x => { names[x.id] = x.name; });
      const lite = this.products.map(p => ({ id: p.id, name: p.name, expiry: p.expiry, quantity: p.quantity, unit: p.unit, store: names[p.storeId] || '' }));
      // dados para o widget e o resumo semanal
      let loss = { value: 0 }; try { loss = this.losses({ days: 7 }); } catch (e) { /* */ }
      const pendingRounds = this.stores.filter(st => { const r = this.roundFor(st.id); return !r || !r.finishedAt; }).map(st => st.name);
      const notif = Object.assign({}, this.settings.notif, { weeklyLoss: Math.round(loss.value * 100) / 100, pendingRounds, currency: 'R$', currentStore: (this.current() || {}).name || '', stores: this.stores.map(x => x.name) });
      RS.native.sync(lite, notif);
    },

    /* ----- Filtros / ordenação ----- */
    query({ text = '', status = 'all', sort = 'expiry', date = '', category = '', storeId } = {}) {
      const q = u.norm(text.trim());
      let list = this.all(storeId);
      if (status === 'alerts') list = list.filter(p => p.status === 'expired' || p.status === 'soon');
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
      await RS.repo.wipe();
      localStorage.clear();
      this.settings = merge(DEFAULTS, null);
      this.stores = []; this.products = []; this.history = [];
      this.applyAppearance();
      this.syncNative();
    }
  };

  /* Abertura em modo seguro (chamado pelo resgate da splash ou pelo Android depois de um fechamento) */
  store.safeReset = function () {
    try {
      const st = JSON.parse(localStorage.getItem(SKEY) || '{}');
      st.theme = 'dark'; st.bg = 'gradient';
      st.compat = Object.assign({}, st.compat || {}, { lite: true, noTransitions: true, init: true });
      localStorage.setItem(SKEY, JSON.stringify(st));
    } catch (e) { localStorage.removeItem(SKEY); }
  };

  if (window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const fn = () => { if (store.settings.theme === 'system') store.applyAppearance(); };
    if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn);
  }

  RS.store = store;
})();
