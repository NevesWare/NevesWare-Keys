/* Histórico (log): tudo o que foi feito fica registrado — por loja, tipo e dia. */
(function () {
  const u = RS.u, ui = RS.ui, s = RS.store;
  const I = ui.icon;
  const state = { scope: 'current', type: 'all' };

  const TYPES = {
    add: ['plus', '#12a36b', 'Cadastro'], edit: ['edit', '#7c5cff', 'Edição'], remove: ['trash', '#ff5470', 'Remoção'],
    in: ['download', '#06b6d4', 'Entrada'], out: ['upload', '#ff3b4e', 'Baixa'],
    'store-add': ['home', '#12a36b', 'Loja criada'], 'store-edit': ['home', '#7c5cff', 'Loja editada'], 'store-remove': ['home', '#ff5470', 'Loja excluída']
  };
  const FILTERS = [['all', 'Tudo'], ['out', 'Baixas'], ['in', 'Entradas'], ['add', 'Cadastros'], ['edit', 'Edições'], ['remove', 'Remoções'], ['store', 'Lojas']];

  function time(t) { const d = new Date(t); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }
  function dayLabel(t) {
    const d = new Date(t); d.setHours(0, 0, 0, 0);
    const diff = Math.round((u.today() - d) / 86400000);
    if (diff === 0) return 'Hoje';
    if (diff === 1) return 'Ontem';
    return u.fmtLong(u.toISO(d));
  }

  function list() {
    let h = s.history;
    if (state.scope === 'current') h = h.filter(e => e.storeId === s.settings.currentStoreId);
    if (state.type === 'store') h = h.filter(e => e.type.startsWith('store'));
    else if (state.type !== 'all') h = h.filter(e => e.type === state.type);
    return h;
  }

  function body() {
    const h = list();
    if (!h.length) return `<div class="empty glass-lite"><div class="art">${I('clock', 34)}</div><h3>Nada registrado</h3><p>Cadastros, edições, baixas, entradas e remoções aparecem aqui automaticamente.</p></div>`;
    let html = '', lastDay = '';
    h.forEach(e => {
      const dl = dayLabel(e.t);
      if (dl !== lastDay) { if (lastDay) html += '</div>'; html += `<div class="group-label">${dl}</div><div class="card glass-lite" style="padding:4px 14px">`; lastDay = dl; }
      const T = TYPES[e.type] || TYPES.edit;
      html += `<div class="log"><span class="li" style="--lc:${T[1]}">${I(T[0], 16)}</span>
        <span class="lt"><b>${u.esc(e.name)}</b><small>${T[2]}${e.detail ? ' · ' + u.esc(e.detail) : ''}</small>
        <small class="faint">${state.scope === 'all' ? u.esc(e.storeName || '') + ' · ' : ''}${u.esc(e.user || '')}</small></span><time>${time(e.t)}</time></div>`;
    });
    return html + '</div>';
  }

  RS.screens.history = {
    tab: 'home',
    bar: false,
    render(params = {}) {
      if (params.scope) state.scope = params.scope;
      const cur = s.current();
      return `
        <header class="topbar"><button class="icon-btn glass" data-back aria-label="Voltar">${I('back')}</button>
          <div class="grow"><h1 class="page-title">Histórico</h1><p class="eyebrow">${u.plural(list().length, 'registro', 'registros')}</p></div>
          <button class="icon-btn glass" data-clear aria-label="Limpar histórico">${I('trash', 20)}</button></header>
        <div class="seg" style="margin-bottom:10px">
          <button class="${state.scope === 'current' ? 'on' : ''}" data-scope="current">${u.esc(cur ? cur.name : 'Esta loja')}</button>
          <button class="${state.scope === 'all' ? 'on' : ''}" data-scope="all">Todas as lojas</button></div>
        <div class="chips tight" style="padding-bottom:6px">${FILTERS.map(([k, l]) => `<button class="chip glass-lite ${state.type === k ? 'on' : ''}" data-type="${k}">${l}</button>`).join('')}</div>
        <div class="scroll" data-body>${body()}</div>`;
    },
    mount(root) {
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-back],[data-scope],[data-type],[data-clear]');
        if (!t) return;
        ui.tap();
        if (t.dataset.back != null) return RS.app.back();
        if (t.dataset.scope) { state.scope = t.dataset.scope; return RS.app.refresh(); }
        if (t.dataset.type) { state.type = t.dataset.type; return RS.app.refresh(); }
        if (t.dataset.clear != null) {
          const ok = await ui.confirm({ title: 'Limpar histórico?', message: 'Todos os registros de movimentação serão apagados. Produtos e lojas não são afetados.', confirm: 'Limpar', danger: true });
          if (ok) { await s.clearHistory(); RS.app.refresh(); }
        }
      });
    }
  };
})();
