/* ==========================================================================
   Camada de dados — offline primeiro, com nuvem (Supabase) e tempo real.
   • Convidado: tudo fica só neste aparelho.
   • Conta: salva no aparelho na hora e envia para a nuvem em segundo plano
     (fila de alterações). Lojas compartilhadas atualizam em tempo real:
     o que um participante muda aparece para os outros.
   Tabelas: stores, store_members, products, movements, rounds.
   ========================================================================== */
(function () {
  const sess = () => RS.auth.session();
  const isCloud = () => RS.auth.isUser() && RS.auth.client && RS.config.features.cloudSync;
  const ns = () => { const s = sess(); return 'rs.data.' + (s && s.kind === 'user' ? s.id : 'guest') + '.v2'; };
  const qkey = () => ns() + '.queue';
  const metaKey = () => ns() + '.meta';

  const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const emptyQueue = () => ({ stores: {}, products: {}, delStores: {}, delProducts: {}, moves: {}, rounds: {} });
  const isUuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v || '');

  /* ---- conversão app ↔ banco ---- */
  const toStore = (x, uid) => ({ id: x.id, user_id: x.userId || uid, name: x.name, address: x.address || '', color: x.color || '#7c5cff', notes: x.notes || '', created_at: x.createdAt, updated_at: x.updatedAt });
  const fromStore = r => RS.Store({ id: r.id, userId: r.user_id, name: r.name, address: r.address, color: r.color, notes: r.notes, inviteCode: r.invite_code || '', createdAt: r.created_at, updatedAt: r.updated_at });
  const toProduct = (p, uid) => ({ id: p.id, user_id: p.userId || uid, store_id: p.storeId, name: p.name, barcode: p.barcode || '', category: p.category || '', quantity: Number(p.quantity) || 0, unit: p.unit || 'un', expiry: p.expiry || null, batch: p.batch || '', location: p.location || '', notes: p.notes || '', cost: Number(p.cost) || 0, created_at: p.createdAt, updated_at: p.updatedAt });
  const fromProduct = r => RS.Product({ id: r.id, userId: r.user_id, storeId: r.store_id, name: r.name, barcode: r.barcode, category: r.category, quantity: Number(r.quantity), unit: r.unit, expiry: r.expiry || '', batch: r.batch, location: r.location, notes: r.notes, cost: Number(r.cost) || 0, createdAt: r.created_at, updatedAt: r.updated_at });
  const toMove = (m, uid) => ({ id: m.id, user_id: uid, store_id: m.storeId || null, store_name: m.storeName || '', product_name: m.name || '', type: m.type, detail: m.detail || '', author: m.user || '', qty: m.qty != null ? Number(m.qty) : null, reason: m.reason || null, unit_cost: m.cost != null ? Number(m.cost) : null, created_at: new Date(m.t).toISOString() });
  const fromMove = r => ({ id: r.id, t: new Date(r.created_at).getTime(), type: r.type, name: r.product_name, detail: r.detail, storeId: r.store_id, storeName: r.store_name, user: r.author, qty: r.qty != null ? Number(r.qty) : null, reason: r.reason || '', cost: r.unit_cost != null ? Number(r.unit_cost) : null });
  const toRound = (x, uid) => ({ id: x.id, store_id: x.storeId, user_id: x.userId || uid, week: x.week, author: x.author || '', checked: x.checked || {}, total: x.total || 0, done_count: x.done || 0, started_at: x.startedAt, finished_at: x.finishedAt || null, updated_at: x.updatedAt });
  const fromRound = r => ({ id: r.id, storeId: r.store_id, userId: r.user_id, week: r.week, author: r.author, checked: r.checked || {}, total: r.total, done: r.done_count, startedAt: r.started_at, finishedAt: r.finished_at, updatedAt: r.updated_at });

  let last = null;
  let pushTimer = null, pushing = null, channel = null, pullTimer = null;
  const legacy = {};   // tabelas do servidor ainda sem as colunas novas (migração 002 pendente)

  function diff(prev, next, q) {
    const idx = list => { const m = {}; (list || []).forEach(x => { m[x.id] = x; }); return m; };
    const ps = idx(prev && prev.stores), ns2 = idx(next.stores);
    const pp = idx(prev && prev.products), np = idx(next.products);
    const pr = idx(prev && prev.rounds), nr = idx(next.rounds);
    Object.keys(ns2).forEach(id => { if (!ps[id] || ps[id].updatedAt !== ns2[id].updatedAt || ps[id].name !== ns2[id].name) { q.stores[id] = 1; delete q.delStores[id]; } });
    Object.keys(ps).forEach(id => { if (!ns2[id]) { q.delStores[id] = 1; delete q.stores[id]; } });
    Object.keys(np).forEach(id => { const a = pp[id], b = np[id]; if (!a || a.updatedAt !== b.updatedAt || a.quantity !== b.quantity || a.storeId !== b.storeId || a.cost !== b.cost) { q.products[id] = 1; delete q.delProducts[id]; } });
    Object.keys(pp).forEach(id => { if (!np[id]) { q.delProducts[id] = 1; delete q.products[id]; } });
    Object.keys(nr).forEach(id => { if (!pr[id] || pr[id].updatedAt !== nr[id].updatedAt) q.rounds[id] = 1; });
    const known = new Set(((prev && prev.history) || []).map(m => m.id));
    (next.history || []).forEach(m => { if (m.id && !known.has(m.id)) q.moves[m.id] = 1; });
  }

  const repo = {
    name: 'hybrid',
    status: { syncing: false, lastSync: null, pending: 0, error: '', live: false },

    async load() {
      let data = readJSON(ns(), null);
      if (!data) data = { stores: [], products: readJSON('rs.products.v1', []), history: readJSON('rs.history.v1', []), rounds: [], members: {}, roles: {} };
      data.rounds = data.rounds || []; data.members = data.members || {}; data.roles = data.roles || {};
      last = JSON.parse(JSON.stringify(data));
      const meta = readJSON(metaKey(), {});
      this.status.lastSync = meta.lastSync || null;
      this.status.pending = this.pendingCount();
      return data;
    },

    async save(data) {
      const snap = { stores: data.stores, products: data.products, history: data.history, rounds: data.rounds || [], members: data.members || {}, roles: data.roles || {}, savedAt: new Date().toISOString() };
      writeJSON(ns(), snap);
      localStorage.removeItem('rs.products.v1');
      localStorage.removeItem('rs.history.v1');
      if (isCloud()) {
        const q = Object.assign(emptyQueue(), readJSON(qkey(), emptyQueue()));
        diff(last, snap, q);
        writeJSON(qkey(), q);
        this.status.pending = this.pendingCount();
        clearTimeout(pushTimer);
        pushTimer = setTimeout(() => this.push(), 1000);
      }
      last = JSON.parse(JSON.stringify(snap));
      return true;
    },

    async wipe() { localStorage.removeItem(ns()); localStorage.removeItem(qkey()); localStorage.removeItem(metaKey()); },

    pendingCount() {
      const q = Object.assign(emptyQueue(), readJSON(qkey(), emptyQueue()));
      return ['stores', 'products', 'delStores', 'delProducts', 'moves', 'rounds'].reduce((n, k) => n + Object.keys(q[k]).length, 0);
    },

    async push() {
      if (!isCloud()) return { ok: false, offline: true };
      if (pushing) return pushing;
      pushing = (async () => {
        const db = RS.auth.client, uid = sess().id;
        const q = Object.assign(emptyQueue(), readJSON(qkey(), emptyQueue()));
        const data = readJSON(ns(), { stores: [], products: [], history: [], rounds: [] });
        const byId = list => { const m = {}; (list || []).forEach(x => { m[x.id] = x; }); return m; };
        const S = byId(data.stores), P = byId(data.products), H = byId(data.history), R = byId(data.rounds);
        this.status.syncing = true; this.status.error = '';
        RS.store && RS.store.emit('sync');
        try {
          const roles = data.roles || {};
          const st = Object.keys(q.stores).map(id => S[id]).filter(Boolean);
          const mine = st.filter(x => !x.userId || x.userId === uid).map(x => toStore(x, uid));
          if (mine.length) { const { error } = await db.from('stores').upsert(mine); if (error) throw error; }
          // lojas de outra pessoa (compartilhadas comigo): só atualiza, nunca recria
          for (const x of st.filter(x => x.userId && x.userId !== uid && roles[x.id] !== 'viewer')) {
            const { error } = await db.from('stores').update({ name: x.name, address: x.address || '', color: x.color, notes: x.notes || '', updated_at: x.updatedAt }).eq('id', x.id);
            if (error) throw error;
          }
          // servidor sem a migração 002: envia sem as colunas novas em vez de travar a sincronização
          const NEW_COLS = { products: ['cost'], movements: ['qty', 'reason', 'unit_cost'] };
          const missingCol = err => err && (err.code === 'PGRST204' || err.code === '42703' || /column/i.test(err.message || ''));
          const upsertSafe = async (table, rows, opts) => {
            if (legacy[table]) rows = rows.map(r => { const o = Object.assign({}, r); NEW_COLS[table].forEach(k => delete o[k]); return o; });
            let { error } = await db.from(table).upsert(rows, opts);
            if (error && missingCol(error) && !legacy[table]) { legacy[table] = true; return upsertSafe(table, rows, opts); }
            if (error) throw error;
          };
          const pr = Object.keys(q.products).map(id => P[id]).filter(p => p && isUuid(p.storeId)).map(p => toProduct(p, uid));
          for (let i = 0; i < pr.length; i += 400) await upsertSafe('products', pr.slice(i, i + 400));
          const dp = Object.keys(q.delProducts);
          if (dp.length) { const { error } = await db.from('products').delete().in('id', dp); if (error) throw error; }
          const ds = Object.keys(q.delStores);
          if (ds.length) { const { error } = await db.from('stores').delete().in('id', ds); if (error) throw error; }
          const mv = Object.keys(q.moves).map(id => H[id]).filter(m => m && isUuid(m.id)).map(m => toMove(m, uid));
          for (let i = 0; i < mv.length; i += 400) await upsertSafe('movements', mv.slice(i, i + 400), { ignoreDuplicates: true });
          const rd = Object.keys(q.rounds).map(id => R[id]).filter(x => x && isUuid(x.storeId)).map(x => toRound(x, uid));
          if (rd.length) { const { error } = await db.from('rounds').upsert(rd); if (error && !/relation|rounds|schema cache|PGRST20/.test((error.message || '') + (error.code || ''))) throw error; }
          writeJSON(qkey(), emptyQueue());
          this.status.pending = 0;
          this.status.lastSync = new Date().toISOString();
          writeJSON(metaKey(), { lastSync: this.status.lastSync });
          return { ok: true };
        } catch (e) {
          this.status.error = (e && e.message) || 'Falha ao sincronizar';
          return { ok: false, error: this.status.error };
        } finally {
          this.status.syncing = false; pushing = null;
          RS.store && RS.store.emit('sync');
        }
      })();
      return pushing;
    },

    /* Baixa os dados da conta + lojas compartilhadas comigo. */
    async pull() {
      if (!isCloud()) return null;
      if (this.pendingCount()) { const r = await this.push(); if (!r.ok) return null; }
      const db = RS.auth.client, uid = sess().id;
      try {
        this.status.syncing = true; RS.store && RS.store.emit('sync');
        const [st, pr, mv, mb, rd] = await Promise.all([
          db.from('stores').select('*').order('created_at'),
          db.from('products').select('*').limit(20000),
          db.from('movements').select('*').order('created_at', { ascending: false }).limit(1500),
          db.from('store_members').select('*'),
          db.from('rounds').select('*').order('started_at', { ascending: false }).limit(200)
        ]);
        if (st.error) throw st.error; if (pr.error) throw pr.error; if (mv.error) throw mv.error;
        const members = {}, roles = {};
        (mb.error ? [] : mb.data).forEach(m => {
          (members[m.store_id] = members[m.store_id] || []).push({ userId: m.user_id, nick: m.nick, role: m.role, joinedAt: m.joined_at });
          if (m.user_id === uid) roles[m.store_id] = m.role;
        });
        // só as minhas lojas e as que participo (a conta admin enxerga tudo no servidor, mas o app não mistura)
        const keep = {};
        st.data.forEach(x => { if (x.user_id === uid) { keep[x.id] = 1; if (!roles[x.id]) roles[x.id] = 'owner'; } else if (roles[x.id]) keep[x.id] = 1; });
        Object.keys(members).forEach(id => { if (!keep[id]) delete members[id]; });
        Object.keys(roles).forEach(id => { if (!keep[id]) delete roles[id]; });
        const data = {
          stores: st.data.filter(x => keep[x.id]).map(fromStore),
          products: pr.data.filter(x => keep[x.store_id]).map(fromProduct),
          history: mv.data.filter(x => x.user_id === uid || keep[x.store_id]).map(fromMove),
          rounds: rd.error ? [] : rd.data.filter(x => keep[x.store_id]).map(fromRound),
          members, roles
        };
        writeJSON(ns(), data);
        last = JSON.parse(JSON.stringify(data));
        this.status.lastSync = new Date().toISOString();
        writeJSON(metaKey(), { lastSync: this.status.lastSync });
        return data;
      } catch (e) {
        this.status.error = (e && e.message) || 'Falha ao baixar da nuvem';
        return null;
      } finally { this.status.syncing = false; RS.store && RS.store.emit('sync'); }
    },

    /* Tempo real: quando alguém da equipe muda algo, baixa de novo (com pequeno atraso). */
    subscribe(onChange) {
      if (!isCloud() || channel) return;
      try {
        const db = RS.auth.client;
        const fire = () => { clearTimeout(pullTimer); pullTimer = setTimeout(onChange, 1200); };
        channel = db.channel('rs-live');
        ['products', 'stores', 'store_members', 'rounds', 'movements'].forEach(t => channel.on('postgres_changes', { event: '*', schema: 'public', table: t }, fire));
        channel.subscribe(st => { this.status.live = st === 'SUBSCRIBED'; RS.store && RS.store.emit('sync'); });
      } catch (e) { channel = null; }
    },
    unsubscribe() { try { if (channel) RS.auth.client.removeChannel(channel); } catch (e) { /* */ } channel = null; this.status.live = false; },

    async uploadAll(data) {
      const q = emptyQueue();
      (data.stores || []).forEach(x => { q.stores[x.id] = 1; });
      (data.products || []).forEach(x => { q.products[x.id] = 1; });
      (data.history || []).forEach(x => { if (x.id) q.moves[x.id] = 1; });
      writeJSON(ns(), { stores: data.stores || [], products: data.products || [], history: data.history || [], rounds: data.rounds || [], members: {}, roles: {} });
      writeJSON(qkey(), q);
      last = JSON.parse(JSON.stringify(data));
      return this.push();
    },

    /* Equipe / convites (precisa da migração 002 no servidor) */
    async invite(storeId, reset) {
      const { data, error } = await RS.auth.client.rpc(reset ? 'reset_invite' : 'create_invite', { p_store: storeId });
      if (error) throw error; return data;
    },
    async join(code) {
      const { data, error } = await RS.auth.client.rpc('join_store', { p_code: code });
      if (error) throw error; return data;
    },
    async leave(storeId) {
      const { error } = await RS.auth.client.rpc('leave_store', { p_store: storeId });
      if (error) throw error; return true;
    },
    async removeMember(storeId, userId) {
      const { error } = await RS.auth.client.from('store_members').delete().eq('store_id', storeId).eq('user_id', userId);
      if (error) throw error; return true;
    },
    async setMemberRole(storeId, userId, role) {
      const { error } = await RS.auth.client.from('store_members').update({ role }).eq('store_id', storeId).eq('user_id', userId);
      if (error) throw error; return true;
    },

    guestData() { return readJSON('rs.data.guest.v2', null); },
    clearGuest() { localStorage.removeItem('rs.data.guest.v2'); }
  };

  RS.repo = repo;

  RS.Store = function (data) {
    const now = new Date().toISOString();
    return Object.assign({ id: RS.u.uid(), userId: null, name: 'Nova loja', address: '', color: '#7c5cff', notes: '', inviteCode: '', createdAt: now, updatedAt: now }, data || {});
  };
  RS.Product = function (data) {
    const now = new Date().toISOString();
    return Object.assign({ id: RS.u.uid(), userId: null, storeId: '', name: '', barcode: '', category: '', quantity: 1, unit: 'un', expiry: '', batch: '', location: '', notes: '', cost: 0, createdAt: now, updatedAt: now }, data || {});
  };
})();
