/* ==========================================================================
   Camada de dados (Repository).
   Hoje: LocalRepository (localStorage do WebView).
   Amanhã: SupabaseRepository com a MESMA interface — basta trocar em VS.repo.
   ========================================================================== */
(function () {
  const KEY = 'vs.products.v1';

  const LocalRepository = {
    name: 'local',
    async list() {
      try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
    },
    async saveAll(items) { localStorage.setItem(KEY, JSON.stringify(items)); return true; },
    async upsert(item, all) { await this.saveAll(all); return item; },
    async remove(id, all) { await this.saveAll(all); return true; }
  };

  /*
   * Esboço do repositório Supabase (ativar quando VS.config.features.cloudSync = true).
   * Tabela sugerida em docs/supabase-schema.sql (mesmos campos do modelo Product).
   *
   * const SupabaseRepository = {
   *   name: 'supabase',
   *   async list() {
   *     const { data, error } = await VS.auth.client.from('products').select('*').order('expiry');
   *     if (error) throw error; return data.map(fromRow);
   *   },
   *   async upsert(item) { await VS.auth.client.from('products').upsert(toRow(item)); return item; },
   *   async remove(id)   { await VS.auth.client.from('products').delete().eq('id', id); return true; },
   *   async saveAll(items) { await VS.auth.client.from('products').upsert(items.map(toRow)); return true; }
   * };
   */

  VS.repo = LocalRepository;

  /* Modelo de produto (compatível com a futura tabela "products"). */
  VS.Product = function (data) {
    const now = new Date().toISOString();
    return Object.assign({
      id: VS.u.uid(),
      userId: null,         // preenchido quando houver conta
      name: '',
      barcode: '',
      category: '',
      quantity: 1,
      unit: 'un',
      expiry: '',           // AAAA-MM-DD
      batch: '',
      location: '',
      notes: '',
      createdAt: now,
      updatedAt: now
    }, data || {});
  };
})();
