/* Ajustes e todas as subpáginas. */
(function () {
  const u = VS.u, ui = VS.ui, s = VS.store, cfg = VS.config;
  const I = ui.icon;

  const cell = (act, icon, color, title, sub = '', value = '', extra = '') =>
    `<button class="cell ${extra}" data-go="${act}"><span class="ci" style="--cc:${color}">${I(icon, 18)}</span>
      <span class="ct"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="cv">${value}${extra.includes('danger') ? '' : I('chev', 18)}</span></button>`;

  const toggle = (key, icon, color, title, sub = '') =>
    `<button class="cell" data-toggle="${key}"><span class="ci" style="--cc:${color}">${I(icon, 18)}</span>
      <span class="ct"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="switch ${s.get(key) ? 'on' : ''}"></span></button>`;

  const sub = (title, body) => `
    <header class="topbar"><button class="icon-btn glass" data-back aria-label="Voltar">${I('back')}</button>
      <div class="grow"><h1 class="page-title">${title}</h1></div></header>
    <div class="stagger">${body}</div>`;

  /* Liga os interruptores e o botão voltar de qualquer subpágina. */
  function bindCommon(root, onToggle) {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-back]');
      if (b) { ui.tap(); return VS.app.back(); }
      const t = e.target.closest('[data-toggle]');
      if (t) {
        ui.tap();
        const k = t.dataset.toggle;
        s.set(k, !s.get(k));
        t.querySelector('.switch').classList.toggle('on', !!s.get(k));
        if (onToggle) onToggle(k, s.get(k));
      }
    });
  }

  function userLabel() {
    const ses = VS.auth.session();
    if (!ses || ses.kind === 'guest') return 'Convidado · dados salvos neste aparelho';
    return ses.email || ses.nick;
  }

  /* ============================== Principal ============================== */
  VS.screens.settings = {
    tab: 'settings',
    render() {
      const pr = s.settings.profile, c = s.counts();
      const themeName = { dark: 'Escuro', light: 'Claro', system: 'Sistema' }[s.settings.theme];
      return `
        <header class="topbar"><div class="grow"><p class="eyebrow">Preferências</p><h1 class="h1">Ajustes</h1></div></header>
        <div class="stagger">
          <button class="card glass profile-card" data-go="settings.profile" style="width:100%;text-align:left">
            <span class="avatar lg" style="--av:${(cfg.accents[pr.color] || {}).a}">${u.esc(u.initials(pr.name || 'V S'))}</span>
            <span class="ct"><b>${u.esc(pr.name || 'Seu perfil')}</b><small class="muted" style="font-size:.82rem">${u.esc(userLabel())}</small>
              ${VS.auth.isGuest() ? `<span class="soon-tag" style="display:inline-block;margin-top:8px">Convidado</span>` : ''}</span>
            ${I('chev', 20)}
          </button>

          ${VS.auth.isGuest() ? `<button class="card glass-lite" data-go="account" style="width:100%;text-align:left;display:flex;align-items:center;gap:14px;margin-top:12px">
            <span class="ci" style="width:40px;height:40px;border-radius:14px;display:grid;place-items:center;background:rgba(var(--accent-rgb),.18);color:var(--accent)">${I('cloud', 20)}</span>
            <span style="flex:1"><b style="display:block;font-size:.95rem">Crie sua conta</b><small class="muted">Sincronize seus produtos entre aparelhos</small></span>
            <span class="soon-tag">Em breve</span></button>` : ''}

          <div>
            <div class="group-label">Conta</div>
            <div class="group glass-lite">
              ${cell('settings.profile', 'user', '#7c5cff', 'Perfil', 'Nome, estabelecimento e cor')}
              ${cell('settings.security', 'lock', '#0ea5e9', 'Segurança e senha', 'Bloqueio com PIN e senha da conta')}
            </div>
          </div>

          <div>
            <div class="group-label">Preferências</div>
            <div class="group glass-lite">
              ${cell('settings.appearance', 'moon', '#8b5cf6', 'Aparência', 'Tema, cores e efeito vidro', themeName)}
              ${cell('settings.notifications', 'bell', '#f43f5e', 'Notificações', 'Alertas de validade', s.settings.notif.enabled ? s.settings.notif.daysBefore + ' dias' : 'Desligadas')}
              ${cell('settings.a11y', 'a11y', '#10b981', 'Acessibilidade', 'Texto, contraste e movimento')}
            </div>
          </div>

          <div>
            <div class="group-label">Dados</div>
            <div class="group glass-lite">
              ${cell('settings.data', 'db', '#f59e0b', 'Backup e dados', u.plural(c.total, 'produto salvo', 'produtos salvos'))}
              ${cell('export', 'export', '#06b6d4', 'Exportar relatório', 'PDF, imagem ou texto')}
            </div>
          </div>

          <div>
            <div class="group-label">Sobre</div>
            <div class="group glass-lite">
              ${cell('settings.credits', 'heart', '#ec4899', 'Créditos', cfg.studio)}
              ${cell('site', 'globe', '#3b82f6', 'Site oficial', '', cfg.features.site && cfg.siteUrl ? '' : '<span class="soon-tag">Em breve</span>')}
              ${cell('settings.about', 'info', '#64748b', 'Sobre o app', '', 'v' + cfg.version)}
            </div>
          </div>

          <div class="group glass-lite" style="margin-top:24px">
            ${cell('logout', 'logout', '#ff5470', VS.auth.isGuest() ? 'Sair do modo convidado' : 'Sair da conta', '', '', 'danger')}
          </div>
          <p class="hint" style="text-align:center;margin-top:24px">${cfg.appName} ${cfg.version} · ${cfg.studio}<br>© ${cfg.year} · Todos os direitos reservados</p>
        </div>`;
    },
    mount(root) {
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-go]');
        if (!t) return;
        ui.tap();
        const g = t.dataset.go;
        if (g === 'site') return openSite();
        if (g === 'account') return VS.app.go('auth', { from: 'settings', tab: 'signup' });
        if (g === 'logout') {
          const ok = await ui.confirm({
            title: VS.auth.isGuest() ? 'Sair do modo convidado?' : 'Sair da conta?',
            message: VS.auth.isGuest() ? 'Seus produtos continuam salvos neste aparelho e aparecerão quando você entrar como convidado novamente.' : 'Você poderá entrar novamente a qualquer momento.',
            confirm: 'Sair', danger: true, icon: 'logout'
          });
          if (!ok) return;
          const L = ui.loading('Saindo', 'Encerrando sessão…');
          await VS.auth.signOut();
          await L.done(800);
          return VS.app.start('auth');
        }
        VS.app.go(g);
      });
    }
  };

  function openSite() {
    if (cfg.features.site && cfg.siteUrl) return VS.native.openUrl(cfg.siteUrl);
    ui.alert({ title: 'Site em breve', message: 'O site oficial do ValiStock está sendo preparado pela Flow Labs Studio. Em breve você poderá acessá-lo por aqui.', icon: 'globe' });
  }
  VS.openSite = openSite;

  /* ============================== Perfil ============================== */
  VS.screens['settings.profile'] = {
    tab: 'settings',
    render() {
      const pr = s.settings.profile;
      return sub('Perfil', `
        <div class="card glass" style="text-align:center;padding:28px 18px">
          <span class="avatar lg" data-av style="margin:0 auto 14px;--av:${(cfg.accents[pr.color] || {}).a}">${u.esc(u.initials(pr.name || 'V S'))}</span>
          <p class="muted" style="font-size:.84rem">${u.esc(userLabel())}</p>
        </div>
        <div style="margin-top:18px">
          <div class="field"><label>Seu nome</label><div class="input"><span class="lead">${I('user', 18)}</span>
            <input data-k="profile.name" value="${u.esc(pr.name)}" placeholder="Como devemos te chamar?" maxlength="40" autocomplete="off"></div></div>
          <div class="field"><label class="label">Estabelecimento <span class="opt">opcional</span></label><div class="input"><span class="lead">${I('home', 18)}</span>
            <input data-k="profile.store" value="${u.esc(pr.store)}" placeholder="Ex.: Mercadinho São José" maxlength="60" autocomplete="off"></div>
            <p class="hint">Aparece no topo da tela inicial e nos relatórios exportados.</p></div>
          <div class="field"><label>Cor do avatar</label>
            <div class="swatches">${Object.entries(cfg.accents).map(([k, a]) => `<button class="swatch ${pr.color === k ? 'on' : ''}" data-color="${k}" style="--a:${a.a};--b:${a.b}" aria-label="${a.name}"></button>`).join('')}</div></div>
        </div>
        <div class="group-label">Conta</div>
        <div class="group glass-lite">
          <button class="cell" data-acc><span class="ci" style="--cc:#3b82f6">${I('mail', 18)}</span><span class="ct"><b>${VS.auth.isGuest() ? 'Criar conta com e-mail' : 'E-mail'}</b>
            <small>${VS.auth.isGuest() ? 'Guarde seus dados na nuvem' : u.esc(VS.auth.session().email || '')}</small></span><span class="soon-tag">Em breve</span></button>
        </div>`);
    },
    mount(root) {
      bindCommon(root);
      const av = root.querySelector('[data-av]');
      root.querySelectorAll('[data-k]').forEach(inp => inp.addEventListener('input', u.debounce(() => {
        s.set(inp.dataset.k, inp.value.trim());
        av.textContent = u.initials(s.settings.profile.name || 'V S');
      }, 200)));
      root.addEventListener('click', e => {
        const c = e.target.closest('[data-color]');
        if (c) {
          ui.tap();
          s.set('profile.color', c.dataset.color);
          root.querySelectorAll('[data-color]').forEach(x => x.classList.toggle('on', x === c));
          av.style.setProperty('--av', cfg.accents[c.dataset.color].a);
        }
        if (e.target.closest('[data-acc]')) { ui.tap(); VS.app.go('auth', { from: 'settings', tab: 'signup' }); }
      });
    }
  };

  /* ============================== Aparência ============================== */
  VS.screens['settings.appearance'] = {
    tab: 'settings',
    render() {
      const st = s.settings;
      return sub('Aparência', `
        <div class="group-label" style="margin-top:4px">Tema</div>
        <div class="theme-cards">
          ${[['dark', 'Escuro'], ['light', 'Claro'], ['system', 'Sistema']].map(([k, l]) => `<button class="theme-card ${st.theme === k ? 'on' : ''}" data-theme-pick="${k}"><div class="pv ${k}"><i></i></div>${l}</button>`).join('')}
        </div>

        <div class="group-label">Cor de destaque</div>
        <div class="card glass-lite"><div class="swatches">
          ${Object.entries(cfg.accents).map(([k, a]) => `<button class="swatch ${st.accent === k ? 'on' : ''}" data-accent="${k}" style="--a:${a.a};--b:${a.b}" aria-label="${a.name}"></button>`).join('')}
        </div><p class="hint" data-accent-name style="margin-top:14px">${cfg.accents[st.accent].name}</p></div>

        <div class="group-label">Efeito vidro</div>
        <div class="group glass-lite">
          <div class="cell-block">
            <div style="display:flex;justify-content:space-between;margin-bottom:14px"><b style="font-size:.95rem">Desfoque</b><span class="muted num" data-blur-v>${st.blur}px</span></div>
            <input class="range" type="range" min="0" max="40" step="2" value="${st.blur}" data-blur style="--p:${st.blur / 40 * 100}%">
          </div>
          <div class="cell-block">
            <b style="font-size:.95rem;display:block;margin-bottom:12px">Fundo</b>
            <div class="seg">${[['aurora', 'Animado'], ['gradient', 'Estático'], ['solid', 'Liso']].map(([k, l]) => `<button class="${st.bg === k ? 'on' : ''}" data-bg="${k}">${l}</button>`).join('')}</div>
          </div>
        </div>

        <div class="group-label">Interface</div>
        <div class="group glass-lite">
          ${toggle('compact', 'layers', '#6366f1', 'Lista compacta', 'Mostra mais produtos por tela')}
          ${toggle('haptics', 'phone', '#0ea5e9', 'Vibração ao tocar', 'Resposta tátil leve nos botões')}
        </div>`);
    },
    mount(root) {
      bindCommon(root);
      root.addEventListener('click', e => {
        const t = e.target.closest('[data-theme-pick],[data-accent],[data-bg]');
        if (!t) return;
        ui.tap();
        if (t.dataset.themePick) {
          s.set('theme', t.dataset.themePick);
          root.querySelectorAll('[data-theme-pick]').forEach(x => x.classList.toggle('on', x === t));
        } else if (t.dataset.accent) {
          s.set('accent', t.dataset.accent);
          root.querySelectorAll('[data-accent]').forEach(x => x.classList.toggle('on', x === t));
          root.querySelector('[data-accent-name]').textContent = cfg.accents[t.dataset.accent].name;
        } else if (t.dataset.bg) {
          s.set('bg', t.dataset.bg);
          root.querySelectorAll('[data-bg]').forEach(x => x.classList.toggle('on', x === t));
        }
      });
      const r = root.querySelector('[data-blur]');
      r.addEventListener('input', () => {
        r.style.setProperty('--p', (r.value / 40 * 100) + '%');
        root.querySelector('[data-blur-v]').textContent = r.value + 'px';
        s.set('blur', Number(r.value));
      });
    }
  };

  /* ============================== Notificações ============================== */
  const DAYS = [1, 3, 5, 7, 15, 30];
  VS.screens['settings.notifications'] = {
    tab: 'settings',
    render() {
      const n = s.settings.notif;
      const allowed = VS.native.notificationsAllowed();
      const time = String(n.hour).padStart(2, '0') + ':' + String(n.minute).padStart(2, '0');
      return sub('Notificações', `
        ${!allowed ? `<div class="card glass-lite" style="display:flex;gap:14px;align-items:center;margin-bottom:6px">
          <span class="ci" style="width:40px;height:40px;border-radius:14px;display:grid;place-items:center;background:color-mix(in srgb,var(--c-soon) 20%,transparent);color:var(--c-soon)">${I('alert', 20)}</span>
          <span style="flex:1"><b style="display:block;font-size:.92rem">Permissão necessária</b><small class="muted">Permita notificações para receber os alertas.</small></span>
          <button class="btn primary sm" data-perm>Permitir</button></div>` : ''}

        <div class="group glass-lite">
          ${toggle('notif.enabled', 'bell', '#f43f5e', 'Alertas de validade', 'Um resumo diário dos produtos que precisam de atenção')}
        </div>

        <div class="group-label">Avisar com antecedência de</div>
        <div class="chips" style="padding-top:0">${DAYS.map(d => `<button class="chip glass-lite ${n.daysBefore === d ? 'on' : ''}" data-days="${d}">${u.plural(d, 'dia', 'dias')}</button>`).join('')}</div>
        <p class="hint">Produtos que vencem dentro desse período aparecem como “Próximos”.</p>

        <div class="group-label">Horário</div>
        <div class="group glass-lite">
          <label class="cell"><span class="ci" style="--cc:#8b5cf6">${I('clock', 18)}</span><span class="ct"><b>Horário do resumo diário</b></span>
            <input type="time" value="${time}" data-time style="background:none;border:0;outline:0;font-size:1rem;font-weight:600;color:var(--accent);color-scheme:${s.isDark() ? 'dark' : 'light'}"></label>
        </div>

        <div class="group-label">Incluir</div>
        <div class="group glass-lite">
          ${toggle('notif.notifyExpired', 'alert', '#ff5470', 'Produtos já vencidos', 'Continua lembrando até você remover ou atualizar')}
          ${toggle('notif.inAppBadge', 'zap', '#f59e0b', 'Contador no sino', 'Mostra a quantidade de alertas na tela inicial')}
        </div>

        <button class="btn ghost block" data-test style="margin-top:22px">${I('bell', 20)}Enviar notificação de teste</button>
        ${VS.native.isApp ? `<button class="btn block" data-sys style="margin-top:8px;color:var(--text-2)">Abrir ajustes do sistema</button>` : ''}`);
    },
    mount(root) {
      bindCommon(root, async (k, v) => {
        if (k === 'notif.enabled' && v && !VS.native.notificationsAllowed()) await VS.native.requestNotifications();
      });
      root.addEventListener('click', async e => {
        const d = e.target.closest('[data-days]');
        if (d) {
          ui.tap();
          s.set('notif.daysBefore', Number(d.dataset.days));
          root.querySelectorAll('[data-days]').forEach(x => x.classList.toggle('on', x === d));
          return;
        }
        if (e.target.closest('[data-perm]')) {
          const ok = await VS.native.requestNotifications();
          if (ok) { ui.toast('Notificações permitidas', { type: 'ok' }); VS.app.refresh(); }
          else { ui.toast('Permissão negada — ative nos ajustes do sistema', { type: 'warn' }); VS.native.openNotificationSettings(); }
        }
        if (e.target.closest('[data-sys]')) VS.native.openNotificationSettings();
        if (e.target.closest('[data-test]')) {
          ui.tap();
          if (!VS.native.notificationsAllowed()) {
            const ok = await VS.native.requestNotifications();
            if (!ok) return ui.toast('Permita as notificações primeiro', { type: 'warn' });
          }
          const c = s.counts();
          const n = VS.native.testNotification('ValiStock', c.alerts ? c.alerts + ' produtos precisam de atenção' : 'Tudo em dia ✨');
          ui.toast(n === -1 && !VS.native.isApp ? 'Teste enviado (navegador)' : 'Notificação enviada', { type: 'ok', icon: 'bell' });
        }
      });
      root.querySelector('[data-time]').addEventListener('change', e => {
        const [h, m] = e.target.value.split(':').map(Number);
        if (isNaN(h)) return;
        s.set('notif.hour', h);
        s.set('notif.minute', m || 0);
        ui.toast('Resumo diário às ' + e.target.value, { type: 'ok', icon: 'clock' });
      });
    }
  };

  /* ============================== Acessibilidade ============================== */
  const SCALES = [[0.9, 'P'], [1, 'M'], [1.12, 'G'], [1.25, 'GG']];
  VS.screens['settings.a11y'] = {
    tab: 'settings',
    render() {
      const a = s.settings.a11y;
      return sub('Acessibilidade', `
        <div class="group-label" style="margin-top:4px">Tamanho do texto</div>
        <div class="card glass-lite">
          <div class="seg">${SCALES.map(([v, l]) => `<button class="${a.fontScale === v ? 'on' : ''}" data-scale="${v}" style="font-size:${0.8 * v}rem">${l}</button>`).join('')}</div>
          <p class="hint" style="margin-top:14px">Validade sob controle — exemplo de texto com o tamanho escolhido.</p>
        </div>

        <div class="group-label">Leitura</div>
        <div class="group glass-lite">
          ${toggle('a11y.bold', 'type', '#6366f1', 'Texto em negrito', 'Deixa os textos mais pesados')}
          ${toggle('a11y.contrast', 'contrast', '#0f172a', 'Alto contraste', 'Aumenta o contraste de textos e bordas')}
          ${toggle('a11y.large', 'a11y', '#10b981', 'Botões maiores', 'Áreas de toque mais amplas')}
        </div>

        <div class="group-label">Visual e movimento</div>
        <div class="group glass-lite">
          ${toggle('a11y.reduceMotion', 'zap', '#f59e0b', 'Reduzir movimento', 'Desliga animações e transições')}
          ${toggle('a11y.solid', 'layers', '#64748b', 'Reduzir transparência', 'Troca o vidro por superfícies sólidas (mais leve)')}
        </div>`);
    },
    mount(root) {
      bindCommon(root);
      root.addEventListener('click', e => {
        const b = e.target.closest('[data-scale]');
        if (!b) return;
        ui.tap();
        s.set('a11y.fontScale', Number(b.dataset.scale));
        root.querySelectorAll('[data-scale]').forEach(x => x.classList.toggle('on', x === b));
      });
    }
  };

  /* ============================== Segurança ============================== */
  VS.screens['settings.security'] = {
    tab: 'settings',
    render() {
      const sec = s.settings.security;
      return sub('Segurança e senha', `
        <div class="group-label" style="margin-top:4px">Bloqueio do app</div>
        <div class="group glass-lite">
          <button class="cell" data-pin><span class="ci" style="--cc:#0ea5e9">${I('lock', 18)}</span>
            <span class="ct"><b>${sec.pin ? 'Alterar PIN' : 'Criar PIN de acesso'}</b><small>${sec.pin ? 'PIN ativo · pedido ao abrir o app' : 'Proteja o app com 4 dígitos'}</small></span>${I('chev', 18)}</button>
          ${sec.pin ? toggle('security.lockOnResume', 'refresh', '#8b5cf6', 'Bloquear ao voltar', 'Pede o PIN sempre que o app voltar do segundo plano') : ''}
          ${sec.pin ? `<button class="cell danger" data-unpin><span class="ci" style="--cc:#ff5470">${I('x', 18)}</span><span class="ct"><b>Remover PIN</b></span></button>` : ''}
        </div>

        <div class="group-label">Senha da conta</div>
        <div class="group glass-lite">
          <button class="cell" data-pass><span class="ci" style="--cc:#f59e0b">${I('key', 18)}</span>
            <span class="ct"><b>Alterar senha</b><small>${VS.auth.isGuest() ? 'Disponível quando você tiver uma conta' : 'Atualize a senha de acesso'}</small></span><span class="soon-tag">Em breve</span></button>
          <button class="cell" data-reset><span class="ci" style="--cc:#3b82f6">${I('mail', 18)}</span>
            <span class="ct"><b>Recuperar senha por e-mail</b></span><span class="soon-tag">Em breve</span></button>
        </div>
        <p class="hint" style="margin-top:16px">Seus dados ficam salvos somente neste aparelho enquanto você usa o modo convidado.</p>`);
    },
    mount(root) {
      bindCommon(root);
      root.addEventListener('click', async e => {
        if (e.target.closest('[data-pin]')) {
          ui.tap();
          const pin = await VS.pin.create();
          if (pin) { s.set('security.pin', await u.sha256('vs:' + pin)); ui.toast('PIN definido', { type: 'ok', icon: 'lock' }); VS.app.refresh(); }
        } else if (e.target.closest('[data-unpin]')) {
          const ok = await VS.pin.verify('Confirme o PIN atual');
          if (ok) { s.set('security.pin', ''); s.set('security.lockOnResume', false); ui.toast('PIN removido', { type: 'ok' }); VS.app.refresh(); }
        } else if (e.target.closest('[data-pass],[data-reset]')) {
          ui.tap();
          ui.alert({ title: 'Em breve', message: 'Contas com e-mail e senha chegarão em uma próxima atualização, com sincronização na nuvem.', icon: 'key' });
        }
      });
    }
  };

  /* ============================== Dados ============================== */
  VS.screens['settings.data'] = {
    tab: 'settings',
    render() {
      const c = s.counts();
      return sub('Backup e dados', `
        <div class="card glass" style="display:flex;align-items:center;gap:16px">
          <span class="ci" style="width:52px;height:52px;border-radius:18px;display:grid;place-items:center;background:rgba(var(--accent-rgb),.18);color:var(--accent)">${I('db', 24)}</span>
          <span><b style="font-size:1.3rem" class="num">${c.total}</b> <span class="muted">${c.total === 1 ? 'produto' : 'produtos'}</span><br>
            <small class="faint">${u.plural(c.units, 'unidade', 'unidades')} em estoque · armazenados neste aparelho</small></span>
        </div>
        <div class="group-label">Backup</div>
        <div class="group glass-lite">
          <button class="cell" data-backup><span class="ci" style="--cc:#10b981">${I('download', 18)}</span><span class="ct"><b>Criar backup</b><small>Salva um arquivo .json com tudo</small></span>${I('chev', 18)}</button>
          <label class="cell"><span class="ci" style="--cc:#3b82f6">${I('upload', 18)}</span><span class="ct"><b>Restaurar backup</b><small>Importa um arquivo criado pelo ValiStock</small></span>${I('chev', 18)}
            <input type="file" accept="application/json,.json" data-restore class="sr"></label>
        </div>
        <div class="group-label">Zona de perigo</div>
        <div class="group glass-lite">
          <button class="cell danger" data-clear-products><span class="ci" style="--cc:#ff8a3d">${I('trash', 18)}</span><span class="ct"><b>Apagar todos os produtos</b><small>Mantém suas configurações</small></span></button>
          <button class="cell danger" data-reset-all><span class="ci" style="--cc:#ff5470">${I('refresh', 18)}</span><span class="ct"><b>Restaurar o app</b><small>Apaga produtos, ajustes e sessão</small></span></button>
        </div>`);
    },
    mount(root) {
      bindCommon(root);
      root.addEventListener('click', async e => {
        if (e.target.closest('[data-backup]')) {
          ui.tap();
          const L = ui.loading('Criando backup', 'Empacotando dados…');
          const data = { app: 'ValiStock', version: cfg.version, exportedAt: new Date().toISOString(), products: s.products, settings: Object.assign({}, s.settings, { security: { pin: '', lockOnResume: false } }) };
          const json = JSON.stringify(data, null, 2);
          await L.done(600);
          const r = await VS.native.exportFile(btoa(unescape(encodeURIComponent(json))), 'application/json', 'ValiStock-backup-' + u.stamp() + '.json', 'save');
          if (r.ok) ui.toast('Backup salvo', { type: 'ok' });
          else if (!r.cancelled) ui.toast(r.error || 'Falha ao salvar', { type: 'err' });
        } else if (e.target.closest('[data-clear-products]')) {
          const ok = await ui.confirm({ title: 'Apagar todos os produtos?', message: `${u.plural(s.products.length, 'produto será removido', 'produtos serão removidos')}. Essa ação não pode ser desfeita.`, confirm: 'Apagar', danger: true });
          if (!ok) return;
          await s.replaceAll([]);
          ui.toast('Produtos apagados', { icon: 'trash' });
          VS.app.refresh();
        } else if (e.target.closest('[data-reset-all]')) {
          const ok = await ui.confirm({ title: 'Restaurar o app?', message: 'Tudo será apagado: produtos, configurações e sessão. Recomendamos criar um backup antes.', confirm: 'Restaurar', danger: true, icon: 'refresh' });
          if (!ok) return;
          const L = ui.loading('Restaurando', 'Limpando dados…');
          await s.resetAll();
          await L.done(1000);
          VS.app.start('auth');
        }
      });
      root.querySelector('[data-restore]').addEventListener('change', async e => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
          const data = JSON.parse(await file.text());
          if (!data || !Array.isArray(data.products)) throw new Error('formato');
          const ok = await ui.confirm({ title: 'Restaurar backup?', message: `${u.plural(data.products.length, 'produto', 'produtos')} serão importados e substituirão a lista atual.`, confirm: 'Restaurar', icon: 'upload' });
          if (!ok) return;
          const L = ui.loading('Restaurando backup', 'Importando produtos…');
          await s.replaceAll(data.products);
          if (data.settings) {
            const keep = s.settings.security;
            Object.keys(data.settings).forEach(k => { if (k !== 'security' && k in s.settings) s.set(k, data.settings[k]); });
            s.set('security', keep);
          }
          await L.done(900);
          ui.toast('Backup restaurado', { type: 'ok' });
          VS.app.refresh();
        } catch (err) {
          ui.toast('Arquivo de backup inválido', { type: 'err' });
        }
      });
    }
  };

  /* ============================== Créditos ============================== */
  VS.screens['settings.credits'] = {
    tab: 'settings',
    render() {
      return sub('Créditos', `
        <div class="card glass credits-hero">
          <div class="studio-mark">FL</div>
          <h2>${cfg.studio}</h2>
          <p>O ValiStock é desenvolvido com carinho pela Flow Labs Studio — criando ferramentas simples, bonitas e úteis para o dia a dia.</p>
        </div>
        <div class="group-label">Equipe e projeto</div>
        <div class="group glass-lite">
          <div class="cell static"><span class="ci" style="--cc:#7c5cff">${I('sparkle', 18)}</span><span class="ct"><b>Design e desenvolvimento</b><small>${cfg.studio}</small></span></div>
          <div class="cell static"><span class="ci" style="--cc:#ec4899">${I('package', 18)}</span><span class="ct"><b>Produto</b><small>${cfg.appName} — controle de validades e estoque</small></span></div>
          <button class="cell" data-site><span class="ci" style="--cc:#3b82f6">${I('globe', 18)}</span><span class="ct"><b>Site da Flow Labs Studio</b></span><span class="soon-tag">Em breve</span></button>
        </div>
        <div class="group-label">Tecnologias de código aberto</div>
        <div class="group glass-lite">
          <div class="cell static"><span class="ci" style="--cc:#10b981">${I('scan', 18)}</span><span class="ct"><b>ZXing</b><small>Leitura de códigos de barras · Apache 2.0</small></span></div>
          <div class="cell static"><span class="ci" style="--cc:#64748b">${I('code', 18)}</span><span class="ct"><b>Android WebView</b><small>Interface e motor de renderização</small></span></div>
        </div>
        <p class="hint" style="text-align:center;margin-top:24px">Feito no Brasil 💜<br>© ${cfg.year} ${cfg.studio} · Todos os direitos reservados</p>`);
    },
    mount(root) {
      bindCommon(root);
      root.addEventListener('click', e => { if (e.target.closest('[data-site]')) { ui.tap(); openSite(); } });
    }
  };

  /* ============================== Sobre ============================== */
  VS.screens['settings.about'] = {
    tab: 'settings',
    render() {
      const info = VS.native.info();
      return sub('Sobre o app', `
        <div class="card glass" style="text-align:center;padding:30px 18px">
          <div class="logo-mark" style="margin:0 auto 14px">${document.querySelector('.logo-mark svg').outerHTML}</div>
          <h2 class="h2" style="font-size:1.4rem">${cfg.appName}</h2>
          <p class="muted" style="margin-top:4px">Versão ${u.esc(info.version || cfg.version)}</p>
        </div>
        <div class="group-label">Informações</div>
        <div class="group glass-lite">
          <div class="cell static"><span class="ct"><b>Plataforma</b></span><span class="cv">${info.platform === 'android' ? 'Android' + (info.sdk ? ' (API ' + info.sdk + ')' : '') : 'Web'}</span></div>
          ${info.device ? `<div class="cell static"><span class="ct"><b>Aparelho</b></span><span class="cv">${u.esc(info.device)}</span></div>` : ''}
          <div class="cell static"><span class="ct"><b>Armazenamento</b></span><span class="cv">Local (neste aparelho)</span></div>
          <div class="cell static"><span class="ct"><b>Sincronização na nuvem</b></span><span class="cv"><span class="soon-tag">Em breve</span></span></div>
        </div>
        <div class="group-label">Como funciona</div>
        <div class="card glass-lite"><p class="muted" style="font-size:.88rem;line-height:1.6">
          Cadastre produtos com nome e validade (o código de barras é opcional). O ValiStock classifica cada item como <b style="color:var(--c-ok)">em dia</b>,
          <b style="color:var(--c-soon)">próximo</b>, <b style="color:var(--c-today)">vence hoje</b> ou <b style="color:var(--c-expired)">vencido</b>, envia um resumo diário por notificação
          e exporta tudo em PDF, imagem ou texto.</p></div>`);
    },
    mount(root) { bindCommon(root); }
  };
})();
