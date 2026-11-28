/* Ferramentas: ronda semanal de validade, relatório de perdas, resumo semanal e ajuda do widget. */
(function () {
  const u = RS.u, ui = RS.ui, s = RS.store;
  const I = ui.icon;

  const MARK = {
    ok: ['check', 'Conferido', 'var(--c-ok)'],
    adj: ['edit', 'Ajustado', 'var(--c-mid)'],
    out: ['trash', 'Descartado', 'var(--c-soon)']
  };
  const fmtRange = () => {
    const r = s.weekRange();
    const f = d => d.getDate() + '/' + String(d.getMonth() + 1).padStart(2, '0');
    return f(r.start) + ' – ' + f(r.end);
  };

  /* ============================== Ronda semanal ============================== */
  const rstate = { filter: 'todo' };

  function roundList(st, r) {
    const all = s.query({ sort: 'expiry', storeId: st.id });
    const chk = (r && r.checked) || {};
    const list = rstate.filter === 'todo' ? all.filter(p => !chk[p.id]) : rstate.filter === 'done' ? all.filter(p => chk[p.id]) : all;
    if (!all.length) return `<div class="empty glass-lite"><div class="art">${I('package', 34)}</div><h3>Estoque vazio</h3><p>Cadastre produtos para fazer a ronda.</p></div>`;
    if (!list.length) return `<div class="empty glass-lite"><div class="art">${I('check', 34)}</div><h3>${rstate.filter === 'todo' ? 'Tudo conferido!' : 'Nada conferido ainda'}</h3><p>${rstate.filter === 'todo' ? 'Conclua a ronda para registrar no histórico.' : 'Toque em ✓ nos produtos conforme for olhando as prateleiras.'}</p></div>`;
    const edit = s.canEdit(st.id);
    return `<div class="list">${list.map(p => {
      const m = chk[p.id];
      const M = m && MARK[m.s];
      return `<div class="item glass-lite round-item s-${p.status} ${m ? 'done' : ''}" data-pid="${p.id}">
        <span class="ic">${M ? I(M[0], 18, 2.6) : u.esc(u.initials(p.name))}</span>
        <span class="body" data-open="${p.id}"><span class="name">${u.esc(p.name)}</span>
          <span class="meta">${M ? `<b style="color:${M[2]}">${M[1]}</b>${m.by ? ' por ' + u.esc(m.by) : ''}` : `${u.esc(u.fmtQty(p.quantity, p.unit))} · ${p.status === 'expired' ? '<b class="txt-exp">VENCIDO</b>' : u.esc(u.rel(p.days, true))} · ${u.fmtShort(p.expiry)}`}</span></span>
        ${edit ? (m ? `<button class="rb" data-undo="${p.id}" aria-label="Desfazer">${I('refresh', 18)}</button>` : `
          ${p.status === 'expired' || p.status === 'soon' ? `<button class="rb warn" data-discard="${p.id}" aria-label="Descartar">${I('trash', 18)}</button>` : ''}
          <button class="rb" data-adjust="${p.id}" aria-label="Ajustar quantidade">${I('edit', 18)}</button>
          <button class="rb ok" data-ok="${p.id}" aria-label="Conferido">${I('check', 20, 2.6)}</button>`) : ''}
      </div>`;
    }).join('')}</div>`;
  }

  RS.screens.round = {
    tab: 'settings',
    bar: false,
    render() {
      const st = s.current();
      if (!st) return `<header class="topbar"><button class="icon-btn glass" data-back aria-label="Voltar">${I('back')}</button><div class="grow"><h1 class="page-title">Ronda semanal</h1></div></header>
        <div class="fill" style="justify-content:center"><div class="empty glass"><div class="art">${I('home', 36)}</div><h3>Nenhuma loja</h3><p>Crie uma loja primeiro.</p></div></div>`;
      const r = s.roundFor(st.id);
      const total = s.products.filter(p => p.storeId === st.id).length;
      const done = r ? r.done : 0;
      const pct = total ? Math.round(done / total * 100) : 0;
      const finished = r && r.finishedAt;
      return `
        <header class="topbar"><button class="icon-btn glass" data-back aria-label="Voltar">${I('back')}</button>
          <div class="grow"><p class="eyebrow">Semana ${u.esc(s.weekKey().split('-S')[1])} · ${fmtRange()}</p><h1 class="page-title">Ronda semanal</h1></div>
          <button class="icon-btn glass" data-past aria-label="Rondas anteriores">${I('clock')}</button></header>
        <section class="card glass round-hero">
          <div class="ring" style="--p:${pct}"><b class="num">${pct}%</b></div>
          <div style="flex:1;min-width:0">
            <b class="store-name" style="display:flex;align-items:center;gap:8px">${RS.storeBadge(st, 22)}${u.esc(st.name)}</b>
            <small class="muted" style="display:block;margin-top:4px">${done} de ${u.plural(total, 'produto conferido', 'produtos conferidos')}</small>
            <small style="display:block;margin-top:2px;font-weight:700;color:${finished ? 'var(--c-ok)' : 'var(--text-3)'}">${finished ? '✓ Concluída ' + new Date(r.finishedAt).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }) : r ? 'Em andamento · ' + u.esc(r.author || '') : 'Não iniciada'}</small>
          </div>
        </section>
        <div class="chips" style="padding-top:10px">${[['todo', 'Pendentes'], ['done', 'Conferidos'], ['all', 'Todos']].map(([k, l]) => `<button class="chip glass-lite ${rstate.filter === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
        <div class="scroll" data-list style="padding-top:8px">${roundList(st, r)}</div>
        ${s.canEdit(st.id) ? `<div class="round-foot"><button class="btn ${done ? 'primary' : 'ghost'} block" data-finish ${done ? '' : 'disabled'}>${I('check', 20)}${finished ? 'Atualizar conclusão' : 'Concluir ronda'}</button></div>` : ''}`;
    },
    mount(root) {
      const st = s.current();
      const redraw = () => RS.app.refresh();
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-back],[data-past],[data-f],[data-ok],[data-undo],[data-adjust],[data-discard],[data-finish],[data-open]');
        if (!t) return;
        ui.tap();
        if (t.dataset.back != null) return RS.app.back();
        if (t.dataset.past != null) return pastRounds(st);
        if (t.dataset.f) { rstate.filter = t.dataset.f; return redraw(); }
        if (t.dataset.open) return RS.detail.open(t.dataset.open);
        if (t.dataset.ok) {
          const row = t.closest('.round-item'); if (row) row.classList.add('leaving');
          await u.sleep(row ? 220 : 0);
          await s.roundMark(st.id, t.dataset.ok, 'ok');
          return;
        }
        if (t.dataset.undo) return s.roundMark(st.id, t.dataset.undo, null);
        if (t.dataset.adjust) {
          const r = await RS.moveSheet(t.dataset.adjust, 'out');
          if (r) await s.roundMark(st.id, t.dataset.adjust, 'adj');
          return;
        }
        if (t.dataset.discard) {
          const p = s.byId(t.dataset.discard);
          if (!p) return;
          if (!(await ui.confirm({ title: 'Descartar ' + u.esc(p.name) + '?', message: `Baixa de <b>${u.esc(u.fmtQty(p.quantity, p.unit))}</b> como vencido/descarte. Entra no relatório de perdas${p.cost ? ' (' + u.money(p.cost * p.quantity) + ')' : ''}.`, confirm: 'Descartar', danger: true, icon: 'trash' }))) return;
          if (Number(p.quantity) > 0) await s.move(p.id, -Number(p.quantity), 'vencido', 'Ronda semanal');
          await s.roundMark(st.id, p.id, 'out');
          return;
        }
        if (t.dataset.finish != null) {
          const r = s.roundFor(st.id);
          const left = r ? r.total - r.done : 0;
          if (left > 0 && !(await ui.confirm({ title: 'Concluir com pendências?', message: u.plural(left, 'produto ainda não foi conferido', 'produtos ainda não foram conferidos') + '. Você pode continuar depois.', confirm: 'Concluir', icon: 'check' }))) return;
          const L = ui.loading('Concluindo ronda', st.name);
          await s.roundFinish(st.id);
          await L.done(700);
          ui.toast('Ronda da semana concluída', { type: 'ok', icon: 'check' });
          if (RS.fx) RS.fx.burst(innerWidth / 2, innerHeight / 2);
          redraw();
        }
      });
      this._off = s.on(w => { if (w === 'round' || w === 'products' || w === 'all') redraw(); });
    },
    unmount() { if (this._off) this._off(); }
  };

  function pastRounds(st) {
    const list = s.rounds.filter(r => r.storeId === st.id).slice(0, 12);
    ui.sheet({
      title: 'Rondas · ' + st.name,
      body: list.length ? `<div class="menu">${list.map(r => `<div class="cell"><span class="ci" style="--cc:${r.finishedAt ? 'var(--c-ok)' : 'var(--c-mid)'}">${I(r.finishedAt ? 'check' : 'clock', 18)}</span>
          <span class="ct"><b>Semana ${u.esc(r.week.split('-S')[1] || r.week)} · ${r.week.slice(0, 4)}</b><small>${r.done} de ${r.total} conferidos · ${u.esc(r.author || '')}${r.finishedAt ? ' · concluída ' + new Date(r.finishedAt).toLocaleDateString('pt-BR') : ' · não concluída'}</small></span></div>`).join('')}</div>`
        : `<div class="empty"><div class="art">${I('clock', 34)}</div><h3>Nenhuma ronda ainda</h3><p>Toda semana confira as validades da loja aqui. Fica registrado para a equipe.</p></div>`
    });
  }

  /* ============================== Relatório de perdas ============================== */
  const lstate = { days: 30, scope: 'current' };

  function lossText(L, st) {
    const lines = ['📉 RELATÓRIO DE PERDAS — RS Stock', (lstate.scope === 'current' && st ? '🏪 ' + st.name : '🏪 Todas as lojas') + ' · últimos ' + lstate.days + ' dias', '━━━━━━━━━━━━━━━━━━'];
    lines.push('💸 Total: ' + u.money(L.value) + ' · ' + (Math.round(L.units * 100) / 100).toLocaleString('pt-BR') + ' unidades · ' + u.plural(L.count, 'baixa', 'baixas'));
    Object.keys(L.byReason).forEach(k => lines.push('• ' + (k === 'vencido' ? 'Vencidos / descarte' : 'Avarias') + ': ' + u.money(L.byReason[k].value) + ' (' + L.byReason[k].units + ' un)'));
    const top = Object.entries(L.byProduct).sort((a, b) => b[1].value - a[1].value || b[1].units - a[1].units).slice(0, 10);
    if (top.length) { lines.push('', '🔝 Maiores perdas'); top.forEach(([n, v], i) => lines.push((i + 1) + '. ' + n + ' — ' + u.money(v.value) + ' (' + v.units + ' un)')); }
    lines.push('', 'Gerado em ' + u.fmtNow() + ' · FlowLabs');
    return lines.join('\n');
  }

  RS.screens.losses = {
    tab: 'settings',
    bar: false,
    render(params) {
      if (params && params.storeId) { lstate.scope = 'current'; if (params.storeId !== s.settings.currentStoreId) s.setCurrent(params.storeId); params.storeId = null; }
      const st = s.current();
      const L = s.losses({ days: lstate.days, storeId: lstate.scope === 'current' && st ? st.id : null });
      const noCost = L.rows.filter(m => !m.cost).length;
      const reasons = [['vencido', 'Vencidos / descarte', 'var(--c-expired-ui, #64748b)'], ['avaria', 'Avarias', 'var(--c-soon)']];
      const maxR = Math.max(1, ...reasons.map(([k]) => (L.byReason[k] || {}).value || (L.byReason[k] || {}).units || 0));
      const weeks = Object.keys(L.byWeek).sort().slice(-8);
      const maxW = Math.max(1, ...weeks.map(w => L.byWeek[w].value || L.byWeek[w].units));
      const top = Object.entries(L.byProduct).sort((a, b) => b[1].value - a[1].value || b[1].units - a[1].units).slice(0, 8);
      const byVal = L.value > 0;
      return `
        <header class="topbar"><button class="icon-btn glass" data-back aria-label="Voltar">${I('back')}</button>
          <div class="grow"><p class="eyebrow">${lstate.scope === 'current' && st ? u.esc(st.name) : 'Todas as lojas'}</p><h1 class="page-title">Relatório de perdas</h1></div>
          <button class="icon-btn glass" data-share aria-label="Compartilhar">${I('share')}</button></header>
        <div class="chips" style="padding-top:4px">
          ${[7, 30, 90, 365].map(d => `<button class="chip glass-lite ${lstate.days === d ? 'on' : ''}" data-days="${d}">${d === 365 ? '1 ano' : d + ' dias'}</button>`).join('')}
          <button class="chip glass-lite ${lstate.scope === 'all' ? 'on' : ''}" data-scope>${I('layers', 14)}Todas as lojas</button>
        </div>
        <div class="scroll stagger" style="padding-top:10px">
          <section class="card glass loss-hero">
            <small class="muted">Perdido em ${lstate.days === 365 ? '1 ano' : lstate.days + ' dias'}</small>
            <b class="num hero-num" style="display:block;margin:6px 0 4px;color:${L.value ? 'var(--c-soon)' : 'inherit'}">${u.money(L.value)}</b>
            <span class="muted" style="font-size:.84rem">${(Math.round(L.units * 100) / 100).toLocaleString('pt-BR')} unidades · ${u.plural(L.count, 'baixa', 'baixas')}</span>
            ${noCost ? `<p class="hint" style="margin:10px 0 0">${I('info', 14)} ${u.plural(noCost, 'baixa sem custo', 'baixas sem custo')} cadastrado — preencha o “Custo unitário” no produto para calcular o valor.</p>` : ''}
          </section>
          ${!L.count ? `<div class="empty glass-lite" style="margin-top:12px"><div class="art">${I('check', 34)}</div><h3>Nenhuma perda no período</h3><p>Baixas com motivo “Vencido” ou “Avaria” aparecem aqui automaticamente.</p></div>` : `
          <div class="group-label">Por motivo</div>
          <div class="card glass-lite bars">${reasons.map(([k, l, c]) => { const v = L.byReason[k] || { value: 0, units: 0 }; const x = byVal ? v.value : v.units; return `
            <div class="bar-row"><span>${l}</span><div class="bar-track"><i style="width:${Math.round(x / maxR * 100)}%;background:${c}"></i></div><b class="num">${byVal ? u.money(v.value) : v.units + ' un'}</b></div>`; }).join('')}</div>
          <div class="group-label">Por semana</div>
          <div class="card glass-lite week-chart">${weeks.map(w => { const v = L.byWeek[w]; const x = byVal ? v.value : v.units; return `<div class="wcol"><i style="height:${Math.max(4, Math.round(x / maxW * 100))}%"></i><small>S${w.split('-S')[1]}</small></div>`; }).join('')}</div>
          <div class="group-label">Maiores perdas</div>
          <div class="card glass-lite" style="padding:4px 14px">${top.map(([n, v], i) => `<div class="log"><span class="li" style="--lc:var(--c-soon)"><b class="num" style="font-size:.8rem">${i + 1}</b></span>
            <span class="lt"><b>${u.esc(n)}</b><small>${v.units} un${lstate.scope === 'all' && v.store ? ' · ' + u.esc(v.store) : ''}</small></span><time class="num" style="font-weight:700">${u.money(v.value)}</time></div>`).join('')}</div>
          ${lstate.scope === 'all' && Object.keys(L.byStore).length > 1 ? `<div class="group-label">Por loja</div><div class="card glass-lite bars">${Object.entries(L.byStore).map(([n, v]) => `<div class="bar-row"><span>${u.esc(n)}</span><b class="num">${u.money(v.value)} · ${v.units} un</b></div>`).join('')}</div>` : ''}`}
          <div style="height:18px"></div>
        </div>`;
    },
    mount(root) {
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-back],[data-days],[data-scope],[data-share]');
        if (!t) return;
        ui.tap();
        if (t.dataset.back != null) return RS.app.back();
        if (t.dataset.days) { lstate.days = Number(t.dataset.days); return RS.app.refresh(); }
        if (t.dataset.scope != null) { lstate.scope = lstate.scope === 'all' ? 'current' : 'all'; return RS.app.refresh(); }
        if (t.dataset.share != null) {
          const st = s.current();
          const L = s.losses({ days: lstate.days, storeId: lstate.scope === 'current' && st ? st.id : null });
          RS.native.shareText(lossText(L, st), 'Relatório de perdas');
        }
      });
    }
  };

  /* ============================== Resumo semanal (dentro do app) ============================== */
  function weeklyData() {
    const now = u.today();
    let expired = 0, week = 0;
    const soonList = [];
    s.products.forEach(p => {
      const d = u.daysUntil(p.expiry);
      if (d == null) return;
      if (d < 0) expired++;
      else if (d <= 7) { week++; soonList.push({ p, d }); }
    });
    soonList.sort((a, b) => a.d - b.d);
    const L = s.losses({ days: 7 });
    const pending = s.stores.filter(st => { const r = s.roundFor(st.id); return !r || !r.finishedAt; });
    return { now, expired, week, soonList, L, pending };
  }

  function showWeekly() {
    const W = weeklyData();
    ui.sheet({
      title: 'Resumo da semana',
      body: `
        <div class="week-grid">
          <div class="wk glass-lite" style="--wc:var(--c-expired-ui, #64748b)"><b class="num">${W.expired}</b><small>vencidos</small></div>
          <div class="wk glass-lite" style="--wc:var(--c-soon)"><b class="num">${W.week}</b><small>vencem em 7 dias</small></div>
          <div class="wk glass-lite" style="--wc:#ef4444"><b class="num">${u.money(W.L.value)}</b><small>perdas na semana</small></div>
          <div class="wk glass-lite" style="--wc:#3b82f6"><b class="num">${W.pending.length}</b><small>rondas pendentes</small></div>
        </div>
        ${W.soonList.length ? `<div class="group-label">Vencem nesta semana</div><div class="list">${W.soonList.slice(0, 8).map(x => RS.itemRow(s.enrich(x.p))).join('')}</div>` : ''}
        ${W.pending.length ? `<p class="hint" style="margin-top:14px">Ronda pendente: ${W.pending.map(x => u.esc(x.name)).join(', ')}</p>` : ''}`,
      foot: `<div class="btn-row"><button class="btn ghost" data-loss>${I('alert', 18)}Perdas</button><button class="btn primary" data-round>${I('check', 18)}Fazer ronda</button></div>`,
      onMount(el, ctl) {
        el.addEventListener('click', e => {
          const o = e.target.closest('[data-open]');
          if (o) { ctl.close(); setTimeout(() => RS.detail.open(o.dataset.open), 250); return; }
          if (e.target.closest('[data-loss]')) { ctl.close(); setTimeout(() => RS.app.go('losses'), 250); }
          if (e.target.closest('[data-round]')) { ctl.close(); setTimeout(() => RS.app.go('round'), 250); }
        });
      }
    });
  }
  RS.weekly = { show: showWeekly, data: weeklyData };

  /* ============================== Widget: como adicionar ============================== */
  RS.screens['widget-help'] = {
    tab: 'settings',
    bar: false,
    render() {
      const c = s.counts();
      return `
        <header class="topbar"><button class="icon-btn glass" data-back aria-label="Voltar">${I('back')}</button>
          <div class="grow"><h1 class="page-title">Widget na tela inicial</h1></div></header>
        <div class="scroll stagger">
          <div class="widget-preview">
            <div class="wp-head"><b>RS Stock</b><small>${u.esc((s.current() || {}).name || 'Todas as lojas')}</small></div>
            <div class="wp-row"><span style="--wc:#111"><b>${c.expired}</b>vencidos</span><span style="--wc:#ef4444"><b>${c.soon}</b>&lt;7 dias</span><span style="--wc:#f59e0b"><b>${c.mid}</b>7–30</span><span style="--wc:#10b981"><b>${c.ok}</b>+30</span></div>
            ${s.query({ sort: 'expiry' }).slice(0, 2).map(p => `<div class="wp-item"><span>${u.esc(p.name)}</span><em>${p.status === 'expired' ? 'VENCIDO' : u.esc(u.rel(p.days, true))}</em></div>`).join('')}
          </div>
          <div class="widget-preview" style="margin-top:14px">
            <div class="wp-head"><b>Vencendo em 15 dias</b><small>${(() => { const n = s.products.filter(p => { const d = u.daysUntil(p.expiry); return d >= 0 && d <= 15; }).length; return n + ' produtos'; })()}</small></div>
            ${s.query({ sort: 'expiry' }).filter(p => p.days >= 0 && p.days <= 15).slice(0, 4).map(p => `<div class="wp-item"><span>${u.esc(p.name)}<small style="display:block;opacity:.6;font-size:.7rem">${u.esc(u.fmtQty(p.quantity, p.unit))} · ${u.fmtShort(p.expiry)}</small></span><em style="color:${p.days < 7 ? '#ff5a6a' : '#ffc043'};font-weight:700">${p.days === 0 ? 'hoje' : p.days === 1 ? 'amanhã' : p.days + ' dias'}</em></div>`).join('') || '<div class="wp-item"><span>Nada vencendo em 15 dias ✨</span></div>'}
          </div>
          <p class="hint" style="text-align:center">Dois widgets: <b>“Validades”</b> (resumo por cor) e <b>“Vencendo”</b> (lista dos que vencem no prazo, da loja que você escolher).</p>
          <div class="group-label">Como adicionar</div>
          <div class="card glass-lite steps">
            <p><b>1.</b> Na tela inicial do Android, <b>segure</b> um espaço vazio.</p>
            <p><b>2.</b> Toque em <b>Widgets</b> e procure <b>RS Stock</b>.</p>
            <p><b>3.</b> Arraste o widget <b>“Validades”</b> ou <b>“Vencendo”</b> para a tela. Dá para aumentar o tamanho.</p>
            <p><b>3b.</b> No <b>“Vencendo”</b> abre uma janela: escolha o prazo (3, 7, <b>15</b>, 30, 60, 90 dias ou outro) e a loja. Para mudar depois, toque na engrenagem <b>⚙</b> do widget.</p>
            <p><b>4.</b> Toque no widget para abrir o app. Ele se atualiza sozinho quando você muda o estoque e todo dia de manhã.</p>
          </div>
          <p class="hint">O widget mostra a loja aberta no app: vencidos, o que vence logo e os próximos produtos.</p>
        </div>`;
    },
    mount(root) { root.addEventListener('click', e => { if (e.target.closest('[data-back]')) { ui.tap(); RS.app.back(); } }); }
  };

  /* ============================== Catálogo de códigos de barras (lista) ============================== */
  const cstate = { q: '' };
  RS.screens['catalog-list'] = {
    tab: 'settings',
    bar: false,
    render() {
      return `
        <header class="topbar"><button class="icon-btn glass" data-back aria-label="Voltar">${I('back')}</button>
          <div class="grow"><p class="eyebrow" data-cl-total>Carregando…</p><h1 class="page-title">Produtos cadastrados</h1></div>
          <button class="icon-btn glass" data-cl-scan aria-label="Escanear">${I('scan')}</button></header>
        <label class="search glass">${I('search', 20)}
          <input data-cl-q type="search" placeholder="Buscar por nome, marca ou código…" value="${u.esc(cstate.q)}" autocomplete="off" enterkeyhint="search"></label>
        <div class="scroll" data-cl-list style="padding-top:10px">${ui.skeleton(8)}</div>`;
    },
    mount(root) {
      const list = root.querySelector('[data-cl-list]'), total = root.querySelector('[data-cl-total]'), inp = root.querySelector('[data-cl-q]');
      let from = 0, done = false, busy = false, seq = 0;
      const row = p => `<button class="item glass-lite cl-item" data-cl="${u.esc(p.barcode)}">
          ${p.image_url ? `<img class="cl-img" src="${u.esc(p.image_url)}" alt="" loading="lazy">` : `<span class="ic">${u.esc(u.initials(p.name))}</span>`}
          <span class="body"><span class="name">${u.esc(p.name)}</span><span class="meta num">${u.esc(p.barcode)}${p.size ? ' · ' + u.esc(p.size) : ''}${p.category ? ' · ' + u.esc(p.category) : ''}</span></span></button>`;
      const load = async (reset) => {
        if (busy && !reset) return;
        if (reset) { from = 0; done = false; list.innerHTML = ui.skeleton(8); }
        if (done) return;
        busy = true; const my = ++seq;
        try {
          const r = await RS.catalog.page({ q: cstate.q, from, size: 60 });
          if (my !== seq) return;
          if (reset) list.innerHTML = '<div class="list" data-cl-rows></div>';
          const box = list.querySelector('[data-cl-rows]');
          box.insertAdjacentHTML('beforeend', r.rows.map(row).join(''));
          from += r.rows.length;
          done = r.rows.length < 60 || from >= r.total;
          total.textContent = (cstate.q ? r.total.toLocaleString('pt-BR') + ' encontrados' : r.total.toLocaleString('pt-BR') + ' produtos no catálogo') + (r.offline ? ' · sem conexão' : '');
          if (!from) list.innerHTML = `<div class="empty glass-lite"><div class="art">${I('search', 34)}</div><h3>Nada encontrado</h3><p>Tente outro nome, marca ou o começo do código.</p></div>`;
          list.querySelectorAll('.cl-img').forEach(im => { if (!im.dataset.b) { im.dataset.b = 1; im.addEventListener('error', () => { im.style.visibility = 'hidden'; }); } });
        } catch (e) {
          if (reset) list.innerHTML = `<div class="empty glass-lite"><div class="art">${I('cloud', 34)}</div><h3>Sem conexão</h3><p>Conecte à internet para ver a lista completa do catálogo.</p></div>`;
          total.textContent = 'Sem conexão';
        } finally { busy = false; }
      };
      load(true);
      list.addEventListener('scroll', () => { if (list.scrollTop + list.clientHeight > list.scrollHeight - 600) load(false); }, { passive: true });
      inp.addEventListener('input', u.debounce(() => { cstate.q = inp.value.trim(); load(true); }, 350));
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') inp.blur(); });
      root.addEventListener('click', async e => {
        if (e.target.closest('[data-back]')) { ui.tap(); return RS.app.back(); }
        if (e.target.closest('[data-cl-scan]')) {
          ui.tap();
          const code = await RS.scanner.scan();
          if (code) { inp.value = code; cstate.q = code; load(true); }
          return;
        }
        const it = e.target.closest('[data-cl]');
        if (!it) return;
        ui.tap();
        const code = it.dataset.cl;
        const name = it.querySelector('.name').textContent, meta = it.querySelector('.meta').textContent;
        const own = s.byBarcode(code);
        ui.sheet({
          title: 'Produto do catálogo',
          body: `<div class="detail-top"><span class="ic">${u.esc(u.initials(name))}</span><div style="min-width:0"><h2>${u.esc(name)}</h2><p class="faint num" style="margin-top:4px">${u.esc(meta)}</p></div></div>
            ${own ? `<p class="hint" style="margin-top:12px">${I('check', 14)} Já está no seu estoque em ${u.esc(s.storeName(own.storeId))}.</p>` : ''}`,
          foot: `<div class="btn-row">${own ? `<button class="btn ghost" data-own>${I('box', 18)}Ver no estoque</button>` : ''}<button class="btn primary" data-add>${I('plus', 18)}Cadastrar validade</button></div>`,
          onMount(el, ctl) {
            el.addEventListener('click', ev => {
              if (ev.target.closest('[data-add]')) { ctl.close(); setTimeout(() => RS.editor.openWithBarcode(code), 300); }
              if (ev.target.closest('[data-own]')) { ctl.close(); setTimeout(() => RS.detail.open(own.id), 300); }
            });
          }
        });
      });
    }
  };
})();
