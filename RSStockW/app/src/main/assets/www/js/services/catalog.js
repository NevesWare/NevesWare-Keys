/* ==========================================================================
   Catálogo de produtos por código de barras — preenche nome, marca,
   gramatura e categoria ao escanear.
   Ordem: 1) seu estoque  2) cache do aparelho  3) servidor (catálogo
   compartilhado + Cosmos + Open Food Facts)  4) Open Food Facts direto.
   ========================================================================== */
(function () {
  const KEY = 'rs.catalog.v1';
  const MISS_TTL = 24 * 3600e3;   // código não encontrado: tenta de novo depois de 1 dia
  const MAX = 3000;

  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } };
  const write = m => {
    try {
      const keys = Object.keys(m);
      if (keys.length > MAX) keys.sort((a, b) => (m[a].t || 0) - (m[b].t || 0)).slice(0, keys.length - MAX).forEach(k => delete m[k]);
      localStorage.setItem(KEY, JSON.stringify(m));
    } catch (e) { /* armazenamento cheio: segue sem cache */ }
  };

  const UNIT = { kg: 'kg', g: 'g', gr: 'g', grs: 'g', mg: 'mg', l: 'L', lt: 'L', lts: 'L', litro: 'L', litros: 'L', ml: 'ml', cl: 'cl', un: 'un', und: 'un', unid: 'un' };
  function parseSize(text) {
    const m = String(text || '').toLowerCase().replace(',', '.').match(/(\d+(?:\.\d+)?)\s*(kg|grs|gr|g|mg|litros|litro|lts|lt|l|ml|cl|unid|und|un)\b/);
    if (!m) return { size: '', value: null, unit: '' };
    const value = Number(m[1]), unit = UNIT[m[2]] || m[2];
    return { size: (Number.isInteger(value) ? String(value) : String(value).replace('.', ',')) + (unit === 'un' ? ' un' : unit), value, unit };
  }
  function categoryFrom(tags, text) {
    const t = (tags || []).join(' ') + ' ' + String(text || '').toLowerCase();
    const has = (...k) => k.some(x => t.includes(x));
    if (has('dairies', 'milk', 'cheese', 'yogurt', 'leite', 'queijo', 'iogurte', 'laticin')) return 'Laticínios';
    if (has('beverage', 'drink', 'juice', 'soda', 'water', 'bebida', 'suco', 'refrigerante', 'cerveja', 'beer')) return 'Bebidas';
    if (has('meat', 'sausage', 'chicken', 'carne', 'frango', 'linguica', 'presunto')) return 'Carnes';
    if (has('bread', 'bakery', 'biscuit', 'cookie', 'pao', 'pão', 'bolo', 'biscoito')) return 'Padaria';
    if (has('frozen', 'congelad', 'ice-cream', 'sorvete')) return 'Congelados';
    if (has('fruit', 'vegetable', 'fruta', 'legume', 'verdura')) return 'Hortifruti';
    if (has('cleaning', 'detergent', 'limpeza', 'sabao', 'sabão', 'desinfet', 'amaciante')) return 'Limpeza';
    if (has('hygiene', 'shampoo', 'toothpaste', 'soap', 'higiene', 'creme dental', 'desodorante', 'papel higi')) return 'Higiene';
    if (has('pet-food', 'dog', 'cat-food', 'racao', 'ração')) return 'Pet';
    if (has('en:foods', 'food', 'snack', 'cereal', 'pasta', 'rice', 'sauce', 'alimento')) return 'Alimentos';
    return '';
  }
  function fullName(base, brand, size) {
    let n = String(base || '').replace(/\s+/g, ' ').trim();
    if (!n) return '';
    const b = String(brand || '').split(',')[0].trim();
    if (b && !n.toLowerCase().includes(b.toLowerCase())) n += ' ' + b;
    if (size && !/\d/.test(n.replace(/\d{8,}/g, ''))) n += ' ' + size.replace(' ', '');
    return n.charAt(0).toUpperCase() + n.slice(1);
  }
  /** Converte a resposta do Open Food Facts no formato do catálogo. */
  function fromOFF(code, d) {
    if (!d || d.status !== 1 || !d.product) return null;
    const p = d.product;
    const base = p.product_name_pt || p.product_name || p.generic_name_pt || '';
    if (!base) return null;
    const sz = parseSize(p.quantity || base);
    const brand = String(p.brands || '').split(',')[0].trim();
    return { barcode: code, name: fullName(base, brand, sz.size), brand, size: sz.size || String(p.quantity || '').slice(0, 30), size_value: sz.value, size_unit: sz.unit,
      category: categoryFrom(p.categories_tags, base), image_url: p.image_front_small_url || p.image_small_url || '', source: 'off' };
  }

  function timeout(ms) { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; }

  async function viaServer(code) {
    const cfg = RS.config.supabase;
    if (!cfg || !cfg.url) return undefined;
    const h = { apikey: cfg.anonKey };
    try {
      const r = await fetch(cfg.url + '/functions/v1/product-lookup?code=' + encodeURIComponent(code), { headers: h, signal: timeout(8000) });
      if (!r.ok) return undefined;
      const j = await r.json();
      return j.found ? j.product : null;   // null = servidor respondeu "não achei"
    } catch (e) { return undefined; }      // undefined = sem conexão/erro
  }
  async function viaOFF(code) {
    try {
      const f = 'product_name,product_name_pt,generic_name_pt,brands,quantity,categories_tags,image_front_small_url,image_small_url';
      const r = await fetch('https://world.openfoodfacts.org/api/v2/product/' + code + '.json?fields=' + f, { signal: timeout(8000) });
      if (!r.ok) return undefined;
      return fromOFF(code, await r.json());
    } catch (e) { return undefined; }
  }

  const SOURCE = { stock: 'do seu estoque', off: 'Open Food Facts', cosmos: 'Cosmos', user: 'catálogo RS Stock' };

  RS.catalog = {
    SOURCE, parseSize, fullName, fromOFF,
    /** Devolve { name, brand, size, category, unit?, image_url, source } ou null. */
    async lookup(code) {
      code = String(code || '').replace(/\D/g, '');
      if (code.length < 6) return null;
      const own = RS.store.byBarcode(code);
      if (own) return { barcode: code, name: own.name, brand: '', size: '', category: own.category, unit: own.unit, cost: own.cost, image_url: '', source: 'stock' };
      const m = read();
      const c = m[code];
      if (c && c.p) return c.p;
      if (c && c.miss && Date.now() - c.t < MISS_TTL) return null;
      let p = await viaServer(code);
      if (p === undefined) p = await viaOFF(code);   // servidor fora do ar: tenta direto
      if (p === undefined) return null;               // sem internet: não marca como "não existe"
      m[code] = p ? { p, t: Date.now() } : { miss: true, t: Date.now() };
      write(m);
      return p;
    },
    /** Quantos produtos o catálogo compartilhado tem (guardado para mostrar sem internet). */
    async count() {
      const c = RS.auth && RS.auth.client;
      let n = null;
      try { const cached = JSON.parse(localStorage.getItem('rs.catalog.count') || 'null'); if (cached) n = cached.n; } catch (e) { /* */ }
      if (!c) return { n, cached: true };
      try {
        const { count, error } = await c.from('catalog').select('barcode', { count: 'exact', head: true });
        if (error) throw error;
        try { localStorage.setItem('rs.catalog.count', JSON.stringify({ n: count, t: Date.now() })); } catch (e) { /* */ }
        return { n: count, cached: false };
      } catch (e) { return { n, cached: true }; }
    },
    /** Página da lista do catálogo (com busca por nome, marca ou código). */
    async page({ q = '', from = 0, size = 60 } = {}) {
      const c = RS.auth && RS.auth.client;
      const clean = String(q || '').replace(/[,()%*]/g, ' ').trim();
      if (!c) {   // sem conexão: mostra o que este aparelho já conhece
        const all = Object.values(read()).filter(x => x.p).map(x => x.p);
        const f = clean ? all.filter(p => RS.u.norm(p.name + ' ' + p.brand + ' ' + p.barcode).includes(RS.u.norm(clean))) : all;
        return { rows: f.slice(from, from + size), total: f.length, offline: true };
      }
      let qb = c.from('catalog').select('barcode,name,brand,size,category,image_url,source', { count: 'exact' }).order('name').range(from, from + size - 1);
      if (clean) qb = /^\d+$/.test(clean) ? qb.like('barcode', clean + '%') : qb.or(`name.ilike.%${clean}%,brand.ilike.%${clean}%`);
      const { data, count, error } = await qb;
      if (error) throw error;
      return { rows: data || [], total: count || 0, offline: false };
    },
    /** Quem cadastra um código que não estava em nenhuma base ensina o catálogo de todos. */
    async contribute(code, name, category, size) {
      code = String(code || '').replace(/\D/g, '');
      if (code.length < 6 || !name || !RS.auth.isUser() || !RS.auth.client) return;
      const m = read();
      if (m[code] && m[code].p && m[code].p.source !== 'user') return;   // já existe oficial
      try { await RS.auth.client.rpc('catalog_contribute', { p_barcode: code, p_name: name, p_brand: '', p_size: size || '', p_category: category || '' }); } catch (e) { /* */ }
      m[code] = { p: { barcode: code, name, brand: '', size: size || '', category: category || '', image_url: '', source: 'user' }, t: Date.now() };
      write(m);
    }
  };
})();
