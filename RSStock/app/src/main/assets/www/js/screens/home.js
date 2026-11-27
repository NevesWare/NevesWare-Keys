/* Início: tudo em uma tela — saúde do estoque, contadores, próximos 7 dias, atalhos e alertas. */
(function () {
  const u = RS.u, ui = RS.ui, s = RS.store;
  const WD = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function itemRow(p, opts = {}) {
    const meta = [u.fmtQty(p.quantity, p.unit), p.category].filter(Boolean).join(' · ');
    return `<button class="item glass-lite s-${p.status} ${opts.sel ? 'sel' : ''}" data-open="${p.id}">
      ${opts.select ? `<span class="chk">${opts.sel ? ui.icon('check', 14, 3) : ''}</span>` : ''}
      <span class="ic">${u.esc(u.initials(p.name))}</span>
      <span class="body"><span class="name">${u.esc(p.name)}</span><span class="meta">${u.esc(meta)}</span></span>
      <span class="side"><span class="when">${u.esc(u.rel(p.days, true))}</span><span class="date num">${u.fmtShort(p.expiry)}</span></span>
    </button>`;
  }
  RS.itemRow = itemRow;

  function ring(pct) {
    const r = 36, c = 2 * Math.PI * r;
    return `<svg width="84" height="84" viewBox="0 0 84 84">
      <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs>
      <circle class="ring-track" cx="42" cy="42" r="${r}" fill="none" stroke-width="8"/>
      <circle class="ring-bar" data-ring cx="42" cy="42" r="${r}" fill="none" stroke-width="8" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target="${c * (1 - pct / 100)}"/>
    </svg>`;
  }

  function week() {
    const all = s.all();
    return Array.from({ length: 7 }, (_, i) => {
      const iso = u.addDays(i), d = u.parse(iso);
      const n = all.filter(p => p.expiry === iso).length;
      const st = i === 0 ? 'today' : 'soon';
      return `<button class="day glass-lite ${i === 0 ? 'today' : ''} ${n ? 'has s-' + st : ''}" data-day="${iso}" aria-label="${n} produtos vencem em ${u.fmtDate(iso)}">
        <small>${i === 0 ? 'Hoje' : WD[d.getDay()]}</small><b class="num">${d.getDate()}</b><i>${n || ''}</i></button>`;
    }).join('');
  }

  function attentionList() {
    const urgent = s.query({ status: 'alerts', sort: 'expiry' });
    return urgent.length ? urgent : s.query({ sort: 'expiry' });
  }

  /* Mostra só o que cabe na tela — nada de rolar. */
  function fitList(view) {
    const box = view.querySelector('[data-fit]');
    if (!box) return;
    const list = attentionList();
    if (!list.length) return;
    const ROW = s.settings.compact ? 62 : 78;
    const h = box.clientHeight;
    let n = Math.max(0, Math.floor((h + 8) / ROW));
    let rest = list.length - n;
    if (rest > 0 && n > 0 && (h - n * ROW) < 54) { n--; rest++; }
    if (n === 0 && h < 46) { box.innerHTML = ''; box.previousElementSibling && (box.previousElementSibling.style.display = 'none'); return; }
    box.innerHTML = `<div class="list">${list.slice(0, n).map(p => itemRow(p)).join('')}</div>` +
      (rest > 0 ? `<button class="more-alerts glass-lite" data-act="all" style="width:100%;margin-top:8px">+ ${u.plural(rest, 'produto', 'produtos')} · ver todos ${ui.icon('chev', 16)}</button>` : '');
  }

  RS.screens.home = {
    tab: 'home',
    render() {
      const c = s.counts();
      const name = s.settings.profile.name;
      const pct = c.total ? Math.round((c.ok / c.total) * 100) : 100;
      const heroMsg = !c.total ? 'Toque no + para cadastrar seu primeiro produto.'
        : c.alerts === 0 ? 'Tudo em dia! Nada vence nos próximos ' + s.threshold() + ' dias.'
        : `${u.plural(c.alerts, 'produto precisa', 'produtos precisam')} de atenção.`;
      const hasAlerts = c.alerts > 0;

      return `
      <header class="topbar">
        <div class="grow">
          <p class="eyebrow">${u.greet()}${name ? ',' : ''}</p>
          <h1 class="h1">${name ? u.esc(name.split(' ')[0]) : RS.config.appName}</h1>
        </div>
        <button class="icon-btn glass short-only" data-act="scan" aria-label="Escanear" style="place-items:center">${ui.icon('scan')}</button>
        <button class="icon-btn glass" data-act="alerts" aria-label="Alertas">${ui.icon('bell')}${c.alerts && s.settings.notif.inAppBadge ? `<span class="dot num">${c.alerts > 99 ? '99+' : c.alerts}</span>` : ''}</button>
        <button class="avatar" data-act="profile" aria-label="Perfil" style="--av:${(RS.config.accents[s.settings.profile.color] || {}).a || 'var(--accent)'}">${u.esc(u.initials(name || 'R S'))}</button>
      </header>

      <section class="card glass tight stagger-1">
        <div class="hero compact">
          <div class="ring">${ring(pct)}<div class="val"><div><b class="num">${pct}%</b><small>em dia</small></div></div></div>
          <div class="hero-text">
            <h2>${s.settings.profile.store ? u.esc(s.settings.profile.store) : 'Saúde do estoque'}</h2>
            <p>${heroMsg}</p>
            <p class="faint hero-extra" style="font-size:.74rem;margin-top:4px">${u.plural(c.total, 'produto', 'produtos')} · ${(Math.round(c.units * 100) / 100).toLocaleString('pt-BR') + (c.units === 1 ? ' unidade' : ' unidades')}</p>
          </div>
        </div>
      </section>

      <section class="stats4">
        ${[['expired', 'Vencidos', c.expired], ['today', 'Hoje', c.today], ['soon', 'Próximos', c.soon], ['ok', 'Em dia', c.ok]].map(([k, l, v]) => `
          <button class="stat glass-lite s-${k}" data-filter="${k}">
            <span class="k"><span class="sdot"></span>${l}</span>
            <span class="v num">${v}</span>
          </button>`).join('')}
      </section>

      <div class="section-title"><span>Próximos 7 dias</span><button data-act="calendar">${ui.icon('calendar', 14)} Calendário</button></div>
      <section class="week">${week()}</section>

      <section class="quick row" style="margin-top:12px">
        <button class="glass-lite" data-act="add"><span class="qi">${ui.icon('plus', 20)}</span>Adicionar</button>
        <button class="glass-lite" data-act="scan"><span class="qi">${ui.icon('scan', 20)}</span>Escanear</button>
        <button class="glass-lite" data-act="export"><span class="qi">${ui.icon('export', 20)}</span>Exportar</button>
      </section>

      <div class="section-title"><span>${hasAlerts ? 'Precisam de atenção' : 'Próximos vencimentos'}</span>${c.total ? '<button data-act="all">Ver todos</button>' : ''}</div>
      <section class="fill" data-fit>
        ${c.total === 0 ? `
          <div class="empty glass-lite" style="padding:18px;display:flex;align-items:center;gap:14px;text-align:left">
            <div class="art" style="width:52px;height:52px;border-radius:18px;margin:0">${ui.icon('package', 26, 1.8)}</div>
            <div style="flex:1"><h3 style="font-size:.98rem;margin-bottom:2px">Estoque vazio</h3><p style="margin:0;font-size:.8rem">Só nome e validade são obrigatórios.</p></div>
            <button class="btn primary sm" data-act="add">${ui.icon('plus', 18)}Novo</button>
          </div>` : ''}
      </section>`;
    },

    mount(root) {
      setTimeout(() => {
        const r = root.querySelector('[data-ring]');
        if (r) r.style.strokeDashoffset = r.dataset.target;
      }, 160);
      requestAnimationFrame(() => fitList(root));

      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-act],[data-open],[data-filter],[data-day]');
        if (!t) return;
        ui.tap();
        if (t.dataset.open) return RS.detail.open(t.dataset.open);
        if (t.dataset.filter) return RS.app.go('products', { status: t.dataset.filter });
        if (t.dataset.day) return RS.app.go('products', { status: 'all', date: t.dataset.day });
        const a = t.dataset.act;
        if (a === 'add') RS.editor.open();
        else if (a === 'scan') {
          const code = await RS.scanner.scan();
          if (code) RS.editor.openWithBarcode(code);
        }
        else if (a === 'export') RS.app.go('export');
        else if (a === 'all') RS.app.go('products', { status: s.counts().alerts ? 'all' : 'all' });
        else if (a === 'profile') RS.app.go('settings.profile');
        else if (a === 'alerts') openAlerts();
        else if (a === 'calendar') openCalendar();
      });
    },

    onResize(root) { fitList(root); }
  };

  function openAlerts() {
    const list = s.query({ status: 'alerts', sort: 'expiry' });
    ui.sheet({
      title: 'Alertas',
      body: list.length ? `<p class="hint" style="margin:0 4px 14px">Produtos vencidos ou que vencem em até ${s.threshold()} dias.</p><div class="list">${list.map(p => itemRow(p)).join('')}</div>`
        : `<div class="empty"><div class="art">${ui.icon('check', 36)}</div><h3>Nenhum alerta</h3><p>Tudo em dia por aqui. Avisaremos quando algo estiver perto de vencer.</p></div>`,
      onMount(el, ctl) {
        el.addEventListener('click', e => {
          const b = e.target.closest('[data-open]');
          if (b) { ctl.close(); setTimeout(() => RS.detail.open(b.dataset.open), 200); }
        });
      }
    });
  }
  RS.openAlerts = openAlerts;

  /* Calendário mensal com os vencimentos de cada dia. */
  function openCalendar() {
    let base = u.today(); base.setDate(1);
    const draw = ctl => {
      const y = base.getFullYear(), m = base.getMonth();
      const first = new Date(y, m, 1).getDay();
      const days = new Date(y, m + 1, 0).getDate();
      const all = s.all();
      const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      let cells = '';
      for (let i = 0; i < first; i++) cells += '<span></span>';
      for (let d = 1; d <= days; d++) {
        const iso = u.toISO(new Date(y, m, d));
        const items = all.filter(p => p.expiry === iso);
        const worst = items.reduce((w, p) => ({ expired: 0, today: 1, soon: 2, ok: 3 }[p.status] < ({ expired: 0, today: 1, soon: 2, ok: 3 }[w] ?? 9) ? p.status : w), null);
        cells += `<button class="day glass-lite ${iso === u.todayISO() ? 'today' : ''} ${items.length ? 'has s-' + worst : ''}" data-day="${iso}" style="padding:6px 0"><b class="num" style="font-size:.9rem">${d}</b><i>${items.length || ''}</i></button>`;
      }
      ctl.setBody(`
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <button class="icon-btn glass-lite" data-m="-1" style="width:40px;height:40px">${ui.icon('back', 18)}</button>
          <b style="font-size:1.05rem">${MONTHS[m]} ${y}</b>
          <button class="icon-btn glass-lite" data-m="1" style="width:40px;height:40px">${ui.icon('chev', 18)}</button>
        </div>
        <div class="week" style="margin-bottom:6px">${WD.map(w => `<small class="faint" style="text-align:center;font-size:.66rem;font-weight:700">${w}</small>`).join('')}</div>
        <div class="week" style="row-gap:6px">${cells}</div>
        <p class="hint" style="text-align:center;margin-top:14px">Toque em um dia para ver os produtos que vencem nele.</p>`);
    };
    ui.sheet({
      title: 'Calendário de validades',
      body: '',
      onMount(el, ctl) {
        draw(ctl);
        el.addEventListener('click', e => {
          const mb = e.target.closest('[data-m]');
          if (mb) { ui.tap(); base.setMonth(base.getMonth() + Number(mb.dataset.m)); return draw(ctl); }
          const d = e.target.closest('[data-day]');
          if (d) { ui.tap(); ctl.close(); setTimeout(() => RS.app.go('products', { status: 'all', date: d.dataset.day }), 250); }
        });
      }
    });
  }
})();
