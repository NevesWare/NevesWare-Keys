/* ==========================================================================
   Camada de dados (Repository) — pensada para o Supabase.
   Cada conta tem seus próprios dados: lojas → produtos (estoque) → movimentações.
   Hoje: LocalRepository (no aparelho, separado por conta).
   Amanhã: SupabaseRepository com a MESMA interface (load / save / wipe).
   Tabelas equivalentes em docs/supabase-schema.sql: stores, products, movements.
   ========================================================================== */
(function () {
  const ns = () => {
    const s = RS.auth.session();
    return 'rs.data.' + (s && s.kind !== 'guest' ? s.id : 'guest') + '.v2';
  };

  const LocalRepository = {
    name: 'local',
    async load() {
      let data = null;
      try { data = JSON.parse(localStorage.getItem(ns()) || 'null'); } catch (e) { data = null; }
      if (!data) {
        // Migração da versão anterior (uma loja só)
        let products = [], history = [];
        try { products = JSON.parse(localStorage.getItem('rs.products.v1') || '[]'); } catch (e) { /* */ }
        try { history = JSON.parse(localStorage.getItem('rs.history.v1') || '[]'); } catch (e) { /* */ }
        data = { stores: [], products, history };
      }
      return data;
    },
    async save(data) {
      localStorage.setItem(ns(), JSON.stringify({ stores: data.stores, products: data.products, history: data.history, savedAt: new Date().toISOString() }));
      localStorage.removeItem('rs.products.v1');
      localStorage.removeItem('rs.history.v1');
      return true;
    },
    async wipe() { localStorage.removeItem(ns()); }
  };

  /*
   * Esboço do SupabaseRepository (ativar com RS.config.features.cloudSync):
   *
   * const SupabaseRepository = {
   *   name: 'supabase',
   *   async load() {
   *     const db = RS.auth.client;
   *     const [st, pr, mv] = await Promise.all([
   *       db.from('stores').select('*').order('created_at'),
   *       db.from('products').select('*'),
   *       db.from('movements').select('*').order('created_at', { ascending: false }).limit(1000)
   *     ]);
   *     return { stores: st.data.map(fromStoreRow), products: pr.data.map(fromProductRow), history: mv.data.map(fromMoveRow) };
   *   },
   *   async save(data) {
   *     // upsert das lojas e produtos alterados + insert das novas movimentações
   *   },
   *   async wipe() { }
   * };
   */

  RS.repo = LocalRepository;

  /* Loja (tabela "stores") */
  RS.Store = function (data) {
    const now = new Date().toISOString();
    return Object.assign({
      id: RS.u.uid(),
      userId: null,
      name: 'Nova loja',
      address: '',
      color: '#7c5cff',
      notes: '',
      createdAt: now,
      updatedAt: now
    }, data || {});
  };

  /* Produto (tabela "products") — pertence a uma loja */
  RS.Product = function (data) {
    const now = new Date().toISOString();
    return Object.assign({
      id: RS.u.uid(),
      userId: null,
      storeId: '',
      name: '',
      barcode: '',
      category: '',
      quantity: 1,
      unit: 'un',
      expiry: '',
      batch: '',
      location: '',
      notes: '',
      createdAt: now,
      updatedAt: now
    }, data || {});
  };
})();
