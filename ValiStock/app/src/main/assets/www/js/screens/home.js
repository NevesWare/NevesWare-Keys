/* Início: visão geral do estoque, alertas e atalhos. */
(function () {
  const u = VS.u, ui = VS.ui, s = VS.store;
  VS.screens = VS.screens || {};

  function itemRow(p) {
    const meta = [u.fmtQty(p.quantity, p.unit), p.category].filter(Boolean).join(' · ');
    return `<button class="item glass-lite s-${p.status}" data-open="${p.id}">
      <span class="ic">${u.esc(u.initials(p.name))}</span>
      <span class="body"><span class="name">${u.esc(p.name)}</span><span class="meta">${u.esc(meta)}</span></span>
      <span class="side"><span class="when">${u.esc(u.rel(p.days, true))}</span><span class="date num">${u.fmtShort(p.expiry)}</span></span>
    </button>`;
  }
  VS.itemRow = itemRow;

  function ring(pct) {
    const r = 44, c = 2 * Math.PI * r;
    return `<svg width="104" height="104" viewBox="0 0 104 104">
      <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-2)"/></linearGradient></defs>
      <circle class="ring-track" cx="52" cy="52" r="${r}" fill="none" stroke-width="9"/>
      <circle class="ring-bar" data-ring cx="52" cy="52" r="${r}" fill="none" stroke-width="9" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target="${c * (1 - pct / 100)}"/>
    </svg>`;
  }

  VS.screens.home = {
    tab: 'home',
    render() {
      const c = s.counts();
      const name = s.settings.profile.name;
      const pct = c.total ? Math.round((c.ok / c.total) * 100) : 100;
      const urgent = s.query({ status: 'alerts', sort: 'expiry' }).slice(0, 5);
      const heroMsg = !c.total ? 'Cadastre seu primeiro produto para começar a acompanhar as validades.'
        : c.alerts === 0 ? 'Tudo em dia! Nenhum produto vencendo nos próximos ' + s.threshold() + ' dias.'
        : `${u.plural(c.alerts, 'produto precisa', 'produtos precisam')} de atenção${c.expired ? ' — ' + u.plural(c.expired, 'vencido', 'vencidos') : ''}.`;

      return `
      <header class="topbar">
        <div class="grow">
          <p class="eyebrow">${u.greet()}${name ? ',' : ''}</p>
          <h1 class="h1">${name ? u.esc(name.split(' ')[0]) : 'ValiStock'}</h1>
        </div>
        <button class="icon-btn glass" data-act="alerts" aria-label="Alertas">${ui.icon('bell')}${c.alerts && s.settings.notif.inAppBadge ? `<span class="dot num">${c.alerts > 99 ? '99+' : c.alerts}</span>` : ''}</button>
        <button class="avatar" data-act="profile" aria-label="Perfil" style="--av:${(VS.config.accents[s.settings.profile.color] || {}).a || 'var(--accent)'}">${u.esc(u.initials(name || 'V S'))}</button>
      </header>

      <div class="stagger">
        <section class="card glass pad-lg">
          <div class="hero">
            <div class="ring">${ring(pct)}<div class="val"><div><b class="num">${pct}%</b><small>em dia</small></div></div></div>
            <div class="hero-text">
              <h2>${s.settings.profile.store ? u.esc(s.settings.profile.store) : 'Saúde do estoque'}</h2>
              <p>${heroMsg}</p>
            </div>
          </div>
        </section>

        <section class="stats">
          ${[['expired', 'Vencidos', c.expired], ['today', 'Vencem hoje', c.today], ['soon', `Até ${s.threshold()} dias`, c.soon], ['ok', 'Em dia', c.ok]].map(([k, l, v]) => `
            <button class="stat glass-lite s-${k}" data-filter="${k}">
              <span class="k"><span class="sdot"></span>${l}</span>
              <span class="v num">${v}</span>
            </button>`).join('')}
        </section>

        <section>
          <div class="section-title"><span>Ações rápidas</span></div>
          <div class="quick">
            <button class="glass-lite" data-act="add"><span class="qi">${ui.icon('plus')}</span>Adicionar</button>
            <button class="glass-lite" data-act="scan"><span class="qi">${ui.icon('scan')}</span>Escanear</button>
            <button class="glass-lite" data-act="export"><span class="qi">${ui.icon('export')}</span>Exportar</button>
          </div>
        </section>

        <section>
          <div class="section-title"><span>${urgent.length ? 'Precisam de atenção' : 'Próximos vencimentos'}</span>${c.total ? '<button data-act="all">Ver todos</button>' : ''}</div>
          ${c.total === 0 ? `
            <div class="empty glass-lite">
              <div class="art">${ui.icon('package', 38, 1.6)}</div>
              <h3>Seu estoque está vazio</h3>
              <p>Toque no <b>+</b> da barra abaixo para cadastrar um produto. Só o nome e a validade são obrigatórios.</p>
              <button class="btn primary" data-act="add">${ui.icon('plus', 20)}Cadastrar produto</button>
            </div>` :
            `<div class="list">${(urgent.length ? urgent : s.query({ sort: 'expiry' }).slice(0, 4)).map(itemRow).join('')}</div>`}
        </section>
      </div>`;
    },

    mount(root) {
      requestAnimationFrame(() => setTimeout(() => {
        const r = root.querySelector('[data-ring]');
        if (r) r.style.strokeDashoffset = r.dataset.target;
      }, 120));

      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-act],[data-open],[data-filter]');
        if (!t) return;
        ui.tap();
        if (t.dataset.open) return VS.detail.open(t.dataset.open);
        if (t.dataset.filter) return VS.app.go('products', { status: t.dataset.filter });
        const a = t.dataset.act;
        if (a === 'add') VS.editor.open();
        else if (a === 'scan') {
          const code = await VS.scanner.scan();
          if (code) VS.editor.openWithBarcode(code);
        }
        else if (a === 'export') VS.app.go('export');
        else if (a === 'all') VS.app.go('products');
        else if (a === 'profile') VS.app.go('settings.profile');
        else if (a === 'alerts') openAlerts();
      });
    }
  };

  function openAlerts() {
    const list = s.query({ status: 'alerts', sort: 'expiry' });
    ui.sheet({
      title: 'Alertas',
      body: list.length ? `<p class="hint" style="margin:0 4px 14px">Produtos vencidos ou que vencem em até ${s.threshold()} dias.</p><div class="list">${list.map(itemRow).join('')}</div>`
        : `<div class="empty"><div class="art">${ui.icon('check', 36)}</div><h3>Nenhum alerta</h3><p>Tudo em dia por aqui. Avisaremos quando algo estiver perto de vencer.</p></div>`,
      onMount(el, ctl) {
        el.addEventListener('click', e => {
          const b = e.target.closest('[data-open]');
          if (b) { ctl.close(); setTimeout(() => VS.detail.open(b.dataset.open), 200); }
        });
      }
    });
  }
  VS.openAlerts = openAlerts;
})();
