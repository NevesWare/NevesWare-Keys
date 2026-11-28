/* Produtos: busca, filtros (status, data, categoria), ordenação, seleção múltipla. */
(function () {
  const u = RS.u, ui = RS.ui, s = RS.store;
  const state = { text: '', status: 'all', date: '', category: '', select: false, sel: new Set() };
  const SORTS = [
    { value: 'expiry', label: 'Validade mais próxima', icon: 'calendar' },
    { value: 'name', label: 'Nome (A–Z)', icon: 'type' },
    { value: 'recent', label: 'Adicionados recentemente', icon: 'clock' },
    { value: 'qty', label: 'Maior quantidade', icon: 'layers' }
  ];

  function chips() {
    const c = s.counts();
    const items = [['all', 'Todos', c.total]].concat(u.STATUSES.map(k => [k, u.statusShort[k], c[k]]));
    let html = '';
    if (state.date) html += `<button class="chip on filter-tag" data-clear="date">${ui.icon('calendar', 14)}${u.fmtShort(state.date)} ${ui.icon('x', 14)}</button>`;
    html += `<button class="chip glass-lite ${state.category ? 'on' : ''}" data-act="cat">${ui.icon('tag', 14)}${state.category ? u.esc(state.category) + ' ' + ui.icon('x', 14) : 'Categoria'}</button>`;
    html += items.map(([k, l, n]) => `<button class="chip glass-lite ${state.status === k ? 'on' : ''}" data-status="${k}">
      ${k !== 'all' ? `<span class="sdot s-${k}"></span>` : ''}${l}<span class="n num">${n}</span></button>`).join('');
    return html;
  }

  /* Um card por produto; se tiver várias datas mostra quantas e a mais próxima */
  function groupRow(g, opts) {
    if (g.lots.length === 1) return RS.itemRow(g.lots[0], opts);
    const p = g.lead;
    const meta = [g.lots.length + ' datas', u.fmtQty(g.qty, p.unit), p.category].filter(Boolean).join(' · ');
    return `<button class="item glass-lite s-${p.status} ${opts.sel ? 'sel' : ''}" data-open="${p.id}">
      ${opts.select ? `<span class="chk">${opts.sel ? ui.icon('check', 14, 3) : ''}</span>` : ''}
      <span class="ic">${u.esc(u.initials(p.name))}<i class="lot-badge num">${g.lots.length}</i></span>
      <span class="body"><span class="name">${u.esc(p.name)}</span><span class="meta">${u.esc(meta)}</span>
        <span class="lot-dots">${g.lots.slice(0, 8).map(l => `<i class="s-${l.status}" title="${u.fmtDate(l.expiry)}"></i>`).join('')}</span></span>
      <span class="side">${p.status === 'expired' ? '<span class="tag-exp">Vencido</span>' : `<span class="when">${u.esc(u.rel(p.days, true))}</span>`}<span class="date num">${u.fmtShort(p.expiry)}</span></span>
    </button>`;
  }
  const groupsNow = () => s.groups(current());

  function current() { return s.query({ text: state.text, status: state.status, date: state.date, category: state.category, sort: s.settings.productsSort }); }

  function listHtml() {
    const list = current();
    if (!s.products.length) {
      return `<div class="empty glass-lite" style="margin-top:8px">
        <div class="art">${ui.icon('box', 38, 1.6)}</div><h3>Nenhum produto ainda</h3>
        <p>Cadastre produtos com nome, validade e, se quiser, o código de barras.</p>
        <button class="btn primary" data-act="add">${ui.icon('plus', 20)}Adicionar produto</button></div>`;
    }
    const gs = s.groups(list);
    return list.length ? `<div class="list">${gs.map(g => groupRow(g, { select: state.select, sel: state.sel.has(g.lead.id) })).join('')}</div>
        <p class="hint" style="text-align:center;margin-top:14px">${state.select ? 'Toque para marcar · ' : 'Segure um item para selecionar vários · '}${u.plural(gs.length, 'produto', 'produtos')}${list.length > gs.length ? ' · ' + list.length + ' datas' : ''}</p>` :
      `<div class="empty glass-lite"><div class="art">${ui.icon('search', 34, 1.8)}</div><h3>Nada encontrado</h3><p>Tente outro termo ou filtro.</p></div>`;
  }

  function header() {
    if (state.select) {
      return `<div class="selbar glass">
        <button class="icon-btn" data-act="exit-sel" style="width:38px;height:38px" aria-label="Cancelar">${ui.icon('x', 20)}</button>
        <b><span class="num">${state.sel.size}</span> selecionado${state.sel.size === 1 ? '' : 's'}</b>
        <button class="btn ghost sm" data-act="sel-all">Todos</button>
        <button class="btn danger sm" data-act="sel-del" ${state.sel.size ? '' : 'disabled'}>${ui.icon('trash', 18)}</button></div>`;
    }
    const st = s.current();
    return `<header class="topbar"><button class="grow store-switch" data-act="stores"><span class="eyebrow">Estoque de</span>
          <span class="store-title">${st ? RS.storeBadge(st, 26) + '<b>' + u.esc(st.name) + '</b>' : '<b>Produtos</b>'}${ui.icon('down', 18, 2.4)}</span></button>
        <button class="icon-btn glass" data-act="sort" aria-label="Ordenar">${ui.icon('sort')}</button>
        <button class="icon-btn glass" data-act="scan" aria-label="Buscar por código">${ui.icon('scan')}</button></header>`;
  }

  RS.screens.products = {
    tab: 'products',
    render(params) {
      if (params && params.status) { state.status = params.status; state.date = params.date || ''; }
      state.select = false; state.sel.clear();
      return `
        <div data-head>${header()}</div>
        <label class="search glass">${ui.icon('search', 20)}
          <input data-search type="search" placeholder="Buscar por nome, código, categoria…" value="${u.esc(state.text)}" autocomplete="off" enterkeyhint="search">
          <button class="icon-btn ${state.text ? '' : 'hidden'}" data-act="clear" style="width:38px;height:38px" aria-label="Limpar">${ui.icon('x', 18)}</button>
        </label>
        <div class="chips" data-chips style="padding-bottom:8px">${chips()}</div>
        <div class="scroll" data-list>${ui.skeleton(6)}</div>`;
    },

    mount(root) {
      const listEl = root.querySelector('[data-list]');
      const input = root.querySelector('[data-search]');
      const clearBtn = root.querySelector('[data-act="clear"]');
      const refreshList = () => { const y = listEl.scrollTop; listEl.innerHTML = listHtml(); listEl.scrollTop = y; };
      const refresh = () => { refreshList(); root.querySelector('[data-chips]').innerHTML = chips(); root.querySelector('[data-head]').innerHTML = header(); };
      setTimeout(refresh, 260);

      input.addEventListener('input', u.debounce(() => {
        state.text = input.value;
        clearBtn.classList.toggle('hidden', !state.text);
        refreshList();
      }, 120));
      input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });

      // Toque longo = modo seleção
      let pressT = null, pressed = null, longFired = false;
      listEl.addEventListener('pointerdown', e => {
        const it = e.target.closest('[data-open]');
        if (!it || state.select) return;
        longFired = false; pressed = it;
        pressT = setTimeout(() => {
          longFired = true;
          ui.tap(35);
          state.select = true; state.sel = new Set([it.dataset.open]);
          refresh();
        }, 480);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(ev => listEl.addEventListener(ev, () => clearTimeout(pressT)));
      listEl.addEventListener('scroll', () => clearTimeout(pressT), { passive: true });

      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-status],[data-act],[data-open],[data-clear]');
        if (!t) return;
        if (t.dataset.open && longFired) { longFired = false; return; }
        ui.tap();
        if (t.dataset.open) {
          if (state.select) {
            const id = t.dataset.open;
            if (state.sel.has(id)) state.sel.delete(id); else state.sel.add(id);
            if (!state.sel.size) state.select = false;
            return refresh();
          }
          return RS.detail.open(t.dataset.open);
        }
        if (t.dataset.status) { state.status = t.dataset.status; return refresh(); }
        if (t.dataset.clear === 'date') { state.date = ''; return refresh(); }
        const a = t.dataset.act;
        if (a === 'clear') { input.value = ''; state.text = ''; clearBtn.classList.add('hidden'); refresh(); }
        else if (a === 'add') RS.editor.open();
        else if (a === 'stores') RS.stores.picker();
        else if (a === 'exit-sel') { state.select = false; state.sel.clear(); refresh(); }
        else if (a === 'sel-all') { const l = groupsNow(); state.sel = state.sel.size === l.length ? new Set() : new Set(l.map(g => g.lead.id)); refresh(); }
        else if (a === 'sel-del') {
          const n = state.sel.size;
          const ok = await ui.confirm({ title: `Excluir ${u.plural(n, 'produto', 'produtos')}?`, message: 'Os itens selecionados serão removidos do estoque.', confirm: 'Excluir', danger: true });
          if (!ok) return;
          const all = []; Array.from(state.sel).forEach(id => s.lotsOf(id).forEach(l => all.push(l.id)));
          const removed = await s.removeMany(all);
          state.select = false; state.sel.clear();
          refresh();
          ui.toast(u.plural(n, 'produto excluído', 'produtos excluídos'), { icon: 'trash', action: { label: 'Desfazer', fn: () => s.restore(removed) } });
        }
        else if (a === 'cat') {
          if (state.category) { state.category = ''; return refresh(); }
          const cats = Array.from(new Set(s.products.map(p => p.category).filter(Boolean))).sort();
          if (!cats.length) return ui.toast('Nenhum produto com categoria ainda', { type: 'warn' });
          const v = await ui.menu({ title: 'Filtrar por categoria', options: cats.map(c => ({ value: c, label: c, desc: u.plural(s.products.filter(p => p.category === c).length, 'produto', 'produtos'), icon: 'tag' })) });
          if (v) { state.category = v; refresh(); }
        }
        else if (a === 'sort') {
          const v = await ui.menu({ title: 'Ordenar por', options: SORTS, value: s.settings.productsSort });
          if (v) { s.set('productsSort', v); refresh(); }
        } else if (a === 'scan') {
          const code = await RS.scanner.scan();
          if (!code) return;
          const p = s.byBarcode(code);
          if (p && p.storeId === s.settings.currentStoreId) RS.detail.open(p.id);
          else RS.editor.openWithBarcode(code);   // busca nome/gramatura automaticamente
        }
      });

      this._off = s.on(what => { if (what === 'products' || what === 'store' || what === 'stores') refresh(); });
    },

    onBack() {
      if (state.select) { state.select = false; state.sel.clear(); RS.app.refresh(); return true; }
      return false;
    },

    unmount() { if (this._off) this._off(); }
  };
})();
