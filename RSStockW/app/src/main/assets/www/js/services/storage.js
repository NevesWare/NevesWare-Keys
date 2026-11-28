/* ==========================================================================
   Camada de dados — offline primeiro, com backup/sincronização no Supabase.
   • Convidado: tudo fica só neste aparelho.
   • Conta: salva no aparelho na hora e envia para a nuvem em segundo plano
     (fila de alterações). Ao abrir o app, baixa da nuvem a versão mais nova.
   Tabelas: stores, products, movements (ver docs/supabase-schema.sql).
   ========================================================================== */
(function () {
  const sess = () => RS.auth.session();
  const isCloud = () => RS.auth.isUser() && RS.auth.client && RS.config.features.cloudSync;
  const ns = () => { const s = sess(); return 'rs.data.' + (s && s.kind === 'user' ? s.id : 'guest') + '.v2'; };
  const qkey = () => ns() + '.queue';
  const metaKey = () => ns() + '.meta';

  const readJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || 'null') || d; } catch (e) { return d; } };
  const writeJSON = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const emptyQueue = () => ({ stores: {}, products: {}, delStores: {}, delProducts: {}, moves: {} });

  /* ---- conversão app ↔ banco ---- */
  const toStore = (x, uid) => ({ id: x.id, user_id: uid, name: x.name, address: x.address || '', color: x.color || '#7c5cff', notes: x.notes || '', created_at: x.createdAt, updated_at: x.updatedAt });
  const fromStore = r => RS.Store({ id: r.id, userId: r.user_id, name: r.name, address: r.address, color: r.color, notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at });
  const toProduct = (p, uid) => ({ id: p.id, user_id: uid, store_id: p.storeId, name: p.name, barcode: p.barcode || '', category: p.category || '', quantity: Number(p.quantity) || 0, unit: p.unit || 'un', expiry: p.expiry || null, batch: p.batch || '', location: p.location || '', notes: p.notes || '', created_at: p.createdAt, updated_at: p.updatedAt });
  const fromProduct = r => RS.Product({ id: r.id, userId: r.user_id, storeId: r.store_id, name: r.name, barcode: r.barcode, category: r.category, quantity: Number(r.quantity), unit: r.unit, expiry: r.expiry || '', batch: r.batch, location: r.location, notes: r.notes, createdAt: r.created_at, updatedAt: r.updated_at });
  const toMove = (m, uid) => ({ id: m.id, user_id: uid, store_id: m.storeId || null, store_name: m.storeName || '', product_name: m.name || '', type: m.type, detail: m.detail || '', author: m.user || '', created_at: new Date(m.t).toISOString() });
  const fromMove = r => ({ id: r.id, t: new Date(r.created_at).getTime(), type: r.type, name: r.product_name, detail: r.detail, storeId: r.store_id, storeName: r.store_name, user: r.author });
  const isUuid = v => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v || '');

  let last = null;        // última versão salva (para descobrir o que mudou)
  let pushTimer = null, pushing = null;

  function diff(prev, next, q) {
    const idx = (list) => { const m = {}; (list || []).forEach(x => { m[x.id] = x; }); return m; };
    const ps = idx(prev && prev.stores), ns2 = idx(next.stores);
    const pp = idx(prev && prev.products), np = idx(next.products);
    Object.keys(ns2).forEach(id => { if (!ps[id] || ps[id].updatedAt !== ns2[id].updatedAt || ps[id].name !== ns2[id].name) { q.stores[id] = 1; delete q.delStores[id]; } });
    Object.keys(ps).forEach(id => { if (!ns2[id]) { q.delStores[id] = 1; delete q.stores[id]; } });
    Object.keys(np).forEach(id => { const a = pp[id], b = np[id]; if (!a || a.updatedAt !== b.updatedAt || a.quantity !== b.quantity || a.storeId !== b.storeId) { q.products[id] = 1; delete q.delProducts[id]; } });
    Object.keys(pp).forEach(id => { if (!np[id]) { q.delProducts[id] = 1; delete q.products[id]; } });
    const known = new Set(((prev && prev.history) || []).map(m => m.id));
    (next.history || []).forEach(m => { if (m.id && !known.has(m.id)) q.moves[m.id] = 1; });
  }

  const repo = {
    name: 'hybrid',
    status: { syncing: false, lastSync: null, pending: 0, error: '' },

    async load() {
      let data = readJSON(ns(), null);
      if (!data) {
        // migração da primeira versão (uma loja só)
        data = { stores: [], products: readJSON('rs.products.v1', []), history: readJSON('rs.history.v1', []) };
      }
      last = JSON.parse(JSON.stringify(data));
      const meta = readJSON(metaKey(), {});
      this.status.lastSync = meta.lastSync || null;
      this.status.pending = this.pendingCount();
      return data;
    },

    async save(data) {
      const snap = { stores: data.stores, products: data.products, history: data.history, savedAt: new Date().toISOString() };
      writeJSON(ns(), snap);
      localStorage.removeItem('rs.products.v1');
      localStorage.removeItem('rs.history.v1');
      if (isCloud()) {
        const q = readJSON(qkey(), emptyQueue());
        diff(last, snap, q);
        writeJSON(qkey(), q);
        this.status.pending = this.pendingCount();
        clearTimeout(pushTimer);
        pushTimer = setTimeout(() => this.push(), 1200);
      }
      last = JSON.parse(JSON.stringify(snap));
      return true;
    },

    async wipe() { localStorage.removeItem(ns()); localStorage.removeItem(qkey()); localStorage.removeItem(metaKey()); },

    pendingCount() {
      const q = readJSON(qkey(), emptyQueue());
      return Object.keys(q.stores).length + Object.keys(q.products).length + Object.keys(q.delStores).length + Object.keys(q.delProducts).length + Object.keys(q.moves).length;
    },

    /* Envia a fila de alterações para a nuvem. */
    async push() {
      if (!isCloud()) return { ok: false, offline: true };
      if (pushing) return pushing;
      pushing = (async () => {
        const db = RS.auth.client, uid = sess().id;
        const q = readJSON(qkey(), emptyQueue());
        const data = readJSON(ns(), { stores: [], products: [], history: [] });
        const byId = (list) => { const m = {}; list.forEach(x => { m[x.id] = x; }); return m; };
        const S = byId(data.stores), P = byId(data.products), H = byId(data.history || []);
        this.status.syncing = true; this.status.error = '';
        RS.store && RS.store.emit('sync');
        try {
          const st = Object.keys(q.stores).map(id => S[id]).filter(Boolean).map(x => toStore(x, uid));
          if (st.length) { const { error } = await db.from('stores').upsert(st); if (error) throw error; }
          const pr = Object.keys(q.products).map(id => P[id]).filter(p => p && isUuid(p.storeId)).map(p => toProduct(p, uid));
          for (let i = 0; i < pr.length; i += 400) { const { error } = await db.from('products').upsert(pr.slice(i, i + 400)); if (error) throw error; }
          const dp = Object.keys(q.delProducts);
          if (dp.length) { const { error } = await db.from('products').delete().in('id', dp); if (error) throw error; }
          const ds = Object.keys(q.delStores);
          if (ds.length) { const { error } = await db.from('stores').delete().in('id', ds); if (error) throw error; }
          const mv = Object.keys(q.moves).map(id => H[id]).filter(m => m && isUuid(m.id)).map(m => toMove(m, uid));
          for (let i = 0; i < mv.length; i += 400) { const { error } = await db.from('movements').upsert(mv.slice(i, i + 400), { ignoreDuplicates: true }); if (error) throw error; }
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

    /* Baixa os dados da conta (envia antes o que estiver pendente). */
    async pull() {
      if (!isCloud()) return null;
      if (this.pendingCount()) { const r = await this.push(); if (!r.ok) return null; }
      const db = RS.auth.client;
      try {
        this.status.syncing = true; RS.store && RS.store.emit('sync');
        const [st, pr, mv] = await Promise.all([
          db.from('stores').select('*').order('created_at'),
          db.from('products').select('*').limit(20000),
          db.from('movements').select('*').order('created_at', { ascending: false }).limit(1000)
        ]);
        if (st.error) throw st.error; if (pr.error) throw pr.error; if (mv.error) throw mv.error;
        const data = { stores: st.data.map(fromStore), products: pr.data.map(fromProduct), history: mv.data.map(fromMove) };
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

    /* Envia TUDO (usado ao migrar dados do convidado para a conta). */
    async uploadAll(data) {
      const q = emptyQueue();
      (data.stores || []).forEach(x => { q.stores[x.id] = 1; });
      (data.products || []).forEach(x => { q.products[x.id] = 1; });
      (data.history || []).forEach(x => { if (x.id) q.moves[x.id] = 1; });
      writeJSON(ns(), { stores: data.stores || [], products: data.products || [], history: data.history || [] });
      writeJSON(qkey(), q);
      last = JSON.parse(JSON.stringify(data));
      return this.push();
    },

    guestData() { return readJSON('rs.data.guest.v2', null); },
    clearGuest() { localStorage.removeItem('rs.data.guest.v2'); }
  };

  RS.repo = repo;

  /* Loja (tabela "stores") */
  RS.Store = function (data) {
    const now = new Date().toISOString();
    return Object.assign({ id: RS.u.uid(), userId: null, name: 'Nova loja', address: '', color: '#7c5cff', notes: '', createdAt: now, updatedAt: now }, data || {});
  };

  /* Produto (tabela "products") — pertence a uma loja */
  RS.Product = function (data) {
    const now = new Date().toISOString();
    return Object.assign({ id: RS.u.uid(), userId: null, storeId: '', name: '', barcode: '', category: '', quantity: 1, unit: 'un', expiry: '', batch: '', location: '', notes: '', createdAt: now, updatedAt: now }, data || {});
  };
})();
