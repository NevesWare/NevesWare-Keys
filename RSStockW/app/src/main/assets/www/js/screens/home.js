/* Início — limpo e direto: loja atual, situação do estoque, o que vence primeiro e a última movimentação. */
(function () {
  const u = RS.u, ui = RS.ui, s = RS.store;

  function itemRow(p, opts = {}) {
    const meta = [u.fmtQty(p.quantity, p.unit), p.category].filter(Boolean).join(' · ');
    return `<button class="item glass-lite s-${p.status} ${opts.sel ? 'sel' : ''}" data-open="${p.id}">
      ${opts.select ? `<span class="chk">${opts.sel ? ui.icon('check', 14, 3) : ''}</span>` : ''}
      <span class="ic">${u.esc(u.initials(p.name))}</span>
      <span class="body"><span class="name">${u.esc(p.name)}</span><span class="meta">${u.esc(meta)}</span></span>
      <span class="side">${p.status === 'expired' ? '<span class="tag-exp">Vencido</span>' : `<span class="when">${u.esc(u.rel(p.days, true))}</span>`}<span class="date num">${u.fmtShort(p.expiry)}</span></span>
    </button>`;
  }
  RS.itemRow = itemRow;

  function ago(t) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return 'há ' + m + ' min';
    const h = Math.round(m / 60);
    if (h < 24) return 'há ' + h + ' h';
    return 'há ' + Math.round(h / 24) + ' d';
  }

  function fitList(view) {
    const box = view.querySelector('[data-fit]');
    if (!box) return;
    const list = s.query({ sort: 'expiry' });
    if (!list.length) return;
    const ROW = s.settings.compact ? 62 : 78;
    const h = box.clientHeight;
    const cols = document.documentElement.dataset.layout === 'tablet' ? 2 : 1;
    let n = Math.max(0, Math.floor((h + 8) / ROW)) * cols;
    let rest = list.length - n;
    if (rest > 0 && n > 0 && (h - n * ROW) < 54) { n--; rest++; }
    box.innerHTML = `<div class="list">${list.slice(0, n).map(p => itemRow(p)).join('')}</div>` +
      (rest > 0 ? `<button class="more-alerts glass-lite" data-act="all" style="width:100%;margin-top:8px">Ver todos os ${list.length} produtos ${ui.icon('chev', 16)}</button>` : '');
  }

  RS.screens.home = {
    tab: 'home',
    render() {
      const st = s.current();
      const name = s.settings.profile.name;
      if (!st) {
        return `<header class="topbar"><div class="grow"><p class="eyebrow">${u.greet()}${name ? ', ' + u.esc(name.split(' ')[0]) : ''}</p><h1 class="h1">${RS.config.appName}</h1></div></header>
          <div class="fill" style="justify-content:center">
            <div class="empty glass">
              <div class="art">${ui.icon('home', 38, 1.6)}</div>
              <h3>Crie sua primeira loja</h3>
              <p>Cada loja tem o próprio estoque — por exemplo “Mercado Rio Sul” e “Guanabara”. Depois é só cadastrar os produtos.</p>
              <button class="btn primary" data-act="new-store">${ui.icon('plus', 20)}Criar loja</button>
            </div></div>`;
      }
      const c = s.counts();
      const last = s.history.find(e => e.storeId === st.id);
      const pct = k => c.total ? (c[k] / c.total * 100) : 0;
      const msg = !c.total ? 'Nenhum produto cadastrado ainda'
        : c.alerts ? `${u.plural(c.alerts, 'precisa', 'precisam')} de atenção` : 'Tudo em dia por aqui';

      return `
      <header class="topbar">
        <button class="store-switch" data-act="stores" aria-label="Trocar de loja">
          <span class="eyebrow">${u.greet()}${name ? ', ' + u.esc(name.split(' ')[0]) : ''}</span>
          <span class="store-title">${RS.storeBadge(st, 26)}<b>${u.esc(st.name)}</b>${ui.icon('down', 18, 2.4)}</span>
        </button>
        <button class="icon-btn glass" data-act="scan" aria-label="Escanear">${ui.icon('scan')}</button>
        <button class="icon-btn glass" data-act="alerts" aria-label="Alertas">${ui.icon('bell')}${c.alerts && s.settings.notif.inAppBadge ? `<span class="dot num">${c.alerts > 99 ? '99+' : c.alerts}</span>` : ''}</button>
      </header>

      <section class="card glass hero-card">
        <div style="display:flex;align-items:flex-end;justify-content:space-between;gap:10px">
          <div><b class="num hero-num">${c.total}</b> <span class="muted">${c.total === 1 ? 'produto' : 'produtos'}</span>
            <p class="hero-msg ${c.alerts ? 'alert' : ''}">${msg}</p></div>
          <span class="faint num" style="font-size:.76rem;text-align:right">${(Math.round(c.units * 100) / 100).toLocaleString('pt-BR')}<br>unidades</span>
        </div>
        <div class="seg-bar">${c.total ? u.STATUSES.map(k => pct(k) ? `<i class="s-${k}" style="width:${pct(k)}%"></i>` : '').join('') : ''}</div>
        <div class="legend">${u.STATUSES.map(k => `<button class="s-${k}" data-filter="${k}"><span><span class="sdot"></span>${u.statusShort[k]}</span><b class="num">${c[k]}</b></button>`).join('')}</div>
      </section>

      <div class="quick-tools">
        <button class="qt glass-lite" data-act="round" style="--tc:#10b981">${ui.icon('check', 17, 2.4)}<span><b>Ronda</b><small>${(() => { const r = s.roundFor(st.id); return r && r.finishedAt ? 'Concluída ✓' : r ? r.done + ' de ' + c.total : 'Desta semana'; })()}</small></span></button>
        <button class="qt glass-lite" data-act="weekly" style="--tc:#3b82f6">${ui.icon('calendar', 17, 2.2)}<span><b>Semana</b><small>Resumo</small></span></button>
        <button class="qt glass-lite" data-act="losses" style="--tc:#ef4444">${ui.icon('alert', 17, 2.2)}<span><b>Perdas</b><small>${(() => { const L = s.losses({ days: 30, storeId: st.id }); return L.value ? u.money(L.value) : L.count ? L.units + ' un' : '30 dias'; })()}</small></span></button>
      </div>
      ${last ? `<button class="last-move glass-lite" data-act="history">${ui.icon('clock', 16)}<span><b>${u.esc(last.name)}</b> · ${u.esc((s.LOG_LABEL[last.type] || '') + (last.type === 'in' || last.type === 'out' ? ' de ' + (last.detail || '').split(' · ')[0] : ''))}</span><em>${ago(last.t)}</em></button>` : ''}

      <div class="section-title"><span>Vencem primeiro</span>${c.total ? '<button data-act="all">Ver todos</button>' : ''}</div>
      <section class="fill" data-fit>
        ${c.total === 0 ? `
          <div class="empty glass-lite" style="padding:18px;display:flex;align-items:center;gap:14px;text-align:left">
            <div class="art" style="width:52px;height:52px;border-radius:18px;margin:0">${ui.icon('package', 26, 1.8)}</div>
            <div style="flex:1"><h3 style="font-size:.98rem;margin-bottom:2px">Estoque vazio</h3><p style="margin:0;font-size:.8rem">Toque no + para cadastrar.</p></div>
            <button class="btn primary sm" data-act="add">${ui.icon('plus', 18)}Novo</button>
          </div>` : ''}
      </section>`;
    },

    mount(root) {
      requestAnimationFrame(() => fitList(root));
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-act],[data-open],[data-filter]');
        if (!t) return;
        ui.tap();
        if (t.dataset.open) return RS.detail.open(t.dataset.open);
        if (t.dataset.filter) return RS.app.go('products', { status: t.dataset.filter });
        const a = t.dataset.act;
        if (a === 'add') RS.editor.open();
        else if (a === 'new-store') RS.stores.form();
        else if (a === 'stores') RS.stores.picker();
        else if (a === 'scan') {
          const code = await RS.scanner.scan();
          if (!code) return;
          const p = s.byBarcode(code);
          if (p && p.storeId === s.settings.currentStoreId) RS.detail.open(p.id); else RS.editor.openWithBarcode(code);
        }
        else if (a === 'all') RS.app.go('products', { status: 'all' });
        else if (a === 'history') RS.app.go('history');
        else if (a === 'alerts') openAlerts();
        else if (a === 'round') RS.app.go('round');
        else if (a === 'weekly') RS.weekly.show();
        else if (a === 'losses') RS.app.go('losses');
      });
      this._off = s.on(w => { if (w === 'stores' || w === 'store' || w === 'all' || w === 'round') RS.app.refresh(); });
    },
    unmount() { if (this._off) this._off(); },
    onResize(root) { fitList(root); }
  };

  function openAlerts() {
    const list = s.query({ status: 'alerts', sort: 'expiry' });
    const st = s.current();
    ui.sheet({
      title: 'Alertas · ' + (st ? st.name : ''),
      body: list.length ? `<p class="hint" style="margin:0 4px 14px">Produtos vencidos ou que vencem em menos de 7 dias.</p><div class="list">${list.map(p => itemRow(p)).join('')}</div>`
        : `<div class="empty"><div class="art">${ui.icon('check', 36)}</div><h3>Nenhum alerta</h3><p>Nada vencido ou vencendo nos próximos 7 dias nesta loja.</p></div>`,
      onMount(el, ctl) {
        el.addEventListener('click', e => {
          const b = e.target.closest('[data-open]');
          if (b) { ctl.close(); setTimeout(() => RS.detail.open(b.dataset.open), 200); }
        });
      }
    });
  }
  RS.openAlerts = openAlerts;
})();
