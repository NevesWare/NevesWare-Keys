/* Produtos: busca, filtros por status, ordenação e lista. */
(function () {
  const u = VS.u, ui = VS.ui, s = VS.store;
  const state = { text: '', status: 'all' };
  const SORTS = [
    { value: 'expiry', label: 'Validade mais próxima', icon: 'calendar' },
    { value: 'name', label: 'Nome (A–Z)', icon: 'type' },
    { value: 'recent', label: 'Adicionados recentemente', icon: 'clock' },
    { value: 'qty', label: 'Maior quantidade', icon: 'layers' }
  ];

  function chips() {
    const c = s.counts();
    const items = [['all', 'Todos', c.total], ['expired', 'Vencidos', c.expired], ['today', 'Hoje', c.today], ['soon', 'Próximos', c.soon], ['ok', 'Em dia', c.ok]];
    return items.map(([k, l, n]) => `<button class="chip glass-lite ${state.status === k ? 'on' : ''}" data-status="${k}">
      ${k !== 'all' ? `<span class="sdot s-${k}"></span>` : ''}${l}<span class="n num">${n}</span></button>`).join('');
  }

  function listHtml() {
    const list = s.query({ text: state.text, status: state.status, sort: s.settings.productsSort });
    const sortLabel = (SORTS.find(x => x.value === s.settings.productsSort) || SORTS[0]).label;
    if (!s.products.length) {
      return `<div class="empty glass-lite" style="margin-top:14px">
        <div class="art">${ui.icon('box', 38, 1.6)}</div><h3>Nenhum produto ainda</h3>
        <p>Cadastre produtos com nome, validade e, se quiser, o código de barras.</p>
        <button class="btn primary" data-act="add">${ui.icon('plus', 20)}Adicionar produto</button></div>`;
    }
    return `<div class="list-head"><span>${u.plural(list.length, 'produto', 'produtos')}</span>
        <button data-act="sort">${ui.icon('sort', 16)}${u.esc(sortLabel)}</button></div>
      ${list.length ? `<div class="list stagger">${list.map(VS.itemRow).join('')}</div>` :
        `<div class="empty glass-lite"><div class="art">${ui.icon('search', 34, 1.8)}</div><h3>Nada encontrado</h3><p>Tente outro termo ou filtro.</p></div>`}`;
  }

  VS.screens.products = {
    tab: 'products',
    render(params) {
      if (params && params.status) state.status = params.status;
      return `
        <header class="topbar"><div class="grow"><p class="eyebrow">Estoque</p><h1 class="h1">Produtos</h1></div>
          <button class="icon-btn glass" data-act="scan" aria-label="Buscar por código">${ui.icon('scan')}</button></header>
        <label class="search glass">${ui.icon('search', 20)}
          <input data-search type="search" placeholder="Buscar por nome, código, categoria…" value="${u.esc(state.text)}" autocomplete="off">
          <button class="icon-btn ${state.text ? '' : 'hidden'}" data-act="clear" style="width:38px;height:38px" aria-label="Limpar">${ui.icon('x', 18)}</button>
        </label>
        <div class="chips" data-chips>${chips()}</div>
        <div data-list>${ui.skeleton(5)}</div>`;
    },

    mount(root) {
      const listEl = root.querySelector('[data-list]');
      const input = root.querySelector('[data-search]');
      const clearBtn = root.querySelector('[data-act="clear"]');
      const refresh = () => { listEl.innerHTML = listHtml(); root.querySelector('[data-chips]').innerHTML = chips(); };
      setTimeout(refresh, 280); // pequeno carregamento elegante

      input.addEventListener('input', u.debounce(() => {
        state.text = input.value;
        clearBtn.classList.toggle('hidden', !state.text);
        listEl.innerHTML = listHtml();
      }, 120));

      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-status],[data-act],[data-open]');
        if (!t) return;
        ui.tap();
        if (t.dataset.open) return VS.detail.open(t.dataset.open);
        if (t.dataset.status) {
          state.status = t.dataset.status;
          refresh();
          return;
        }
        const a = t.dataset.act;
        if (a === 'clear') { input.value = ''; state.text = ''; clearBtn.classList.add('hidden'); refresh(); }
        else if (a === 'add') VS.editor.open();
        else if (a === 'sort') {
          const v = await ui.menu({ title: 'Ordenar por', options: SORTS, value: s.settings.productsSort });
          if (v) { s.set('productsSort', v); refresh(); }
        } else if (a === 'scan') {
          const code = await VS.scanner.scan();
          if (!code) return;
          const p = s.byBarcode(code);
          if (p) VS.detail.open(p.id);
          else {
            const add = await ui.confirm({ title: 'Produto não encontrado', message: `Nenhum produto com o código <b>${u.esc(code)}</b>. Deseja cadastrar?`, confirm: 'Cadastrar', icon: 'scan' });
            if (add) VS.editor.openWithBarcode(code);
          }
        }
      });

      this._off = s.on(what => { if (what === 'products') refresh(); });
    },

    unmount() { if (this._off) this._off(); }
  };
})();
