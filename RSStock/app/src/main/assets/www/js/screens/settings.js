/* Ajustes e todas as subpáginas. */
(function () {
  const u = RS.u, ui = RS.ui, s = RS.store, cfg = RS.config;
  const I = ui.icon;

  const cell = (act, icon, color, title, sub = '', value = '', extra = '') =>
    `<button class="cell ${extra}" data-go="${act}"><span class="ci" style="--cc:${color}">${I(icon, 18)}</span>
      <span class="ct"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="cv">${value}${extra.includes('danger') ? '' : I('chev', 18)}</span></button>`;

  const toggle = (key, icon, color, title, sub = '') =>
    `<button class="cell" data-toggle="${key}"><span class="ci" style="--cc:${color}">${I(icon, 18)}</span>
      <span class="ct"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="switch ${s.get(key) ? 'on' : ''}"></span></button>`;

  const sub = (title, body, action = '') => `
    <header class="topbar"><button class="icon-btn glass" data-back aria-label="Voltar">${I('back')}</button>
      <div class="grow"><h1 class="page-title">${title}</h1></div>${action}</header>
    <div class="scroll stagger">${body}</div>`;

  /* Liga os interruptores e o botão voltar de qualquer subpágina. */
  function bindCommon(root, onToggle) {
    root.addEventListener('click', e => {
      const b = e.target.closest('[data-back]');
      if (b) { ui.tap(); return RS.app.back(); }
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

  function syncBadge() {
    const st = RS.repo.status;
    if (st.syncing) return '<span class="soon-tag">Sincronizando…</span>';
    if (st.pending) return `<span class="soon-tag" style="background:color-mix(in srgb,var(--c-mid) 25%,transparent);color:var(--c-mid)">${st.pending} pendente${st.pending > 1 ? 's' : ''}</span>`;
    return '<span class="soon-tag" style="background:color-mix(in srgb,var(--c-ok) 22%,transparent);color:var(--c-ok)">Em dia</span>';
  }
  function ago(iso) {
    if (!iso) return 'nunca';
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'agora mesmo'; if (m < 60) return 'há ' + m + ' min';
    const h = Math.round(m / 60); if (h < 24) return 'há ' + h + ' h';
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function userLabel() {
    const ses = RS.auth.session();
    if (!ses || ses.kind === 'guest') return 'Convidado · dados salvos neste aparelho';
    return ses.email || ses.nick;
  }

  /* ============================== Principal ============================== */
  const tile = (go, icon, color, title, sub = '', extra = '') =>
    `<button class="tile glass-lite ${extra}" data-go="${go}" style="--tc:${color}"><span class="ti">${I(icon, 20)}</span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;

  RS.screens.settings = {
    tab: 'settings',
    render() {
      const pr = s.settings.profile;
      const themeName = { dark: 'Escuro', light: 'Claro', system: 'Sistema', coca: 'Coca' }[s.settings.theme];
      const cur = s.current();
      const row = (go, icon, color, title, sub, value = '') => `<button class="row" data-go="${go}" style="--tc:${color}"><span class="ri">${I(icon, 18)}</span>
        <span class="ct"><b>${title}</b><small>${sub}</small></span><span class="cv">${value}${I('chev', 18)}</span></button>`;
      return `
        <header class="topbar"><div class="grow"><p class="eyebrow">Preferências</p><h1 class="h1">Ajustes</h1></div>
          <button class="icon-btn glass" data-go="logout" aria-label="Sair" style="color:var(--c-danger)">${I('logout', 20)}</button></header>

        <div class="scroll flexcol">
        <button class="me-card stagger-in" data-go="settings.profile">
          <span class="me-avatar" style="--av:${(cfg.accents[pr.color] || {}).a}"><span>${u.esc(u.initials(pr.name || 'R S'))}</span></span>
          <span class="ct"><b>${u.esc(pr.name || 'Toque para criar seu perfil')}</b>
            <span class="meta"><span>${RS.auth.isGuest() ? 'Convidado' : 'Conta'}</span>${cur ? `<span>${u.esc(cur.name)}</span>` : ''}<span>${u.plural(s.products.length, 'produto', 'produtos')}</span></span></span>
          ${I('chev', 22)}
        </button>

        <div class="shortcuts">
          <button class="sc glass-lite" data-go="stores" style="--tc:#e4000f"><span class="ti">${I('home', 19)}</span><em class="num">${s.stores.length}</em><span><b>Lojas</b><small>Criar e editar</small></span></button>
          <button class="sc glass-lite" data-go="history" style="--tc:#6366f1"><span class="ti">${I('clock', 19)}</span><em class="num">${s.history.length > 999 ? '999+' : s.history.length}</em><span><b>Histórico</b><small>Movimentações</small></span></button>
          <button class="sc glass-lite" data-go="settings.data" style="--tc:#f59e0b"><span class="ti">${I('db', 19)}</span><span><b>Backup</b><small>Salvar e restaurar</small></span></button>
        </div>

        <div class="group-label">Preferências</div>
        <div class="rows glass-lite">
          ${row('settings.appearance', 'moon', '#8b5cf6', 'Aparência', 'Tema, cores e vidro', themeName)}
          ${row('settings.notifications', 'bell', '#f43f5e', 'Notificações', 'Alertas de validade', s.settings.notif.enabled ? s.settings.notif.daysBefore + ' dias' : 'Off')}
          ${row('settings.a11y', 'a11y', '#10b981', 'Acessibilidade', 'Texto, contraste e movimento')}
          ${row('settings.security', 'lock', '#0ea5e9', 'Segurança', 'PIN e senha da conta', s.settings.security.pin ? 'PIN ativo' : '')}
          ${row('account', 'cloud', '#3b82f6', RS.auth.isUser() ? 'Minha conta' : 'Criar conta / Entrar', RS.auth.isUser() ? 'Backup na nuvem ativo' : 'Salve seus dados na nuvem', RS.auth.isUser() ? syncBadge() : '<span class="soon-tag">Grátis</span>')}
        </div>

        <div class="group-label">Sobre</div>
        <div class="about-row">
          <button class="glass-lite" data-go="settings.credits" style="--tc:#ec4899">${I('heart', 18)}Créditos</button>
          <button class="glass-lite" data-go="settings.about" style="--tc:#64748b">${I('info', 18)}v${cfg.version}</button>
          <button class="glass-lite" data-go="site" style="--tc:#06b6d4">${I('globe', 18)}Site</button>
        </div>
        </div>`;
    },
    mount(root) {
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-go]');
        if (!t) return;
        ui.tap();
        const g = t.dataset.go;
        if (g === 'site') return openSite();
        if (g === 'account') return RS.auth.isUser() ? RS.app.go('settings.account') : RS.app.go('auth', { from: 'settings', tab: 'signup' });
        if (g === 'export') return RS.app.go('export', {}, { tab: true });
        if (g === 'logout') {
          const ok = await ui.confirm({
            title: RS.auth.isGuest() ? 'Sair do modo convidado?' : 'Sair da conta?',
            message: RS.auth.isGuest() ? 'Seus produtos continuam salvos neste aparelho e aparecerão quando você entrar como convidado novamente.' : 'Você poderá entrar novamente a qualquer momento.',
            confirm: 'Sair', danger: true, icon: 'logout'
          });
          if (!ok) return;
          const L = ui.loading('Saindo', 'Encerrando sessão…');
          if (RS.auth.isUser()) await RS.repo.push();
          await RS.auth.signOut();
          await L.done(800);
          return RS.app.start('auth');
        }
        RS.app.go(g);
      });
    }
  };

  function openSite() {
    if (cfg.features.site && cfg.siteUrl) return RS.native.openUrl(cfg.siteUrl);
    ui.alert({ title: 'Site em breve', message: 'O site oficial do RS Stock está sendo preparado pela FlowLabs Studio. Em breve você poderá acessá-lo por aqui.', icon: 'globe' });
  }
  RS.openSite = openSite;

  /* ============================== Perfil ============================== */
  RS.screens['settings.profile'] = {
    tab: 'settings',
    bar: false,
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
          <div class="field"><label>Cor do avatar</label>
            <div class="swatches">${Object.entries(cfg.accents).map(([k, a]) => `<button class="swatch ${pr.color === k ? 'on' : ''}" data-color="${k}" style="--a:${a.a};--b:${a.b}" aria-label="${a.name}"></button>`).join('')}</div></div>
        </div>
        <div class="group-label">Conta</div>
        <div class="group glass-lite">
          <button class="cell" data-acc><span class="ci" style="--cc:#3b82f6">${I('mail', 18)}</span><span class="ct"><b>${RS.auth.isGuest() ? 'Criar conta com e-mail' : 'E-mail'}</b>
            <small>${RS.auth.isGuest() ? 'Guarde seus dados na nuvem' : u.esc(RS.auth.session().email || '')}</small></span><span class="soon-tag">Em breve</span></button>
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
        if (e.target.closest('[data-acc]')) { ui.tap(); RS.app.go('auth', { from: 'settings', tab: 'signup' }); }
      });
    }
  };

  /* ============================== Aparência ============================== */
  RS.screens['settings.appearance'] = {
    tab: 'settings',
    bar: false,
    render() {
      const st = s.settings;
      return sub('Aparência', `
        <div class="group-label" style="margin-top:4px">Tema</div>
        <div class="theme-cards">
          ${[['dark', 'Escuro'], ['light', 'Claro'], ['system', 'Sistema'], ['coca', 'Coca']].map(([k, l]) => `<button class="theme-card ${st.theme === k ? 'on' : ''}" data-theme-pick="${k}"><div class="pv ${k}"><i></i></div>${l}</button>`).join('')}
        </div>
        ${st.theme === 'coca' ? `<p class="hint">Tema especial vermelho e branco: muda as cores, o fundo com bolhas, as transições e também o ícone do app na tela inicial do celular.</p>` : ''}

        <div class="${st.theme === 'coca' ? 'hidden' : ''}">
        <div class="group-label">Cor de destaque</div>
        <div class="card glass-lite"><div class="swatches">
          ${Object.entries(cfg.accents).map(([k, a]) => `<button class="swatch ${st.accent === k ? 'on' : ''}" data-accent="${k}" style="--a:${a.a};--b:${a.b}" aria-label="${a.name}"></button>`).join('')}
        </div><p class="hint" data-accent-name style="margin-top:14px">${cfg.accents[st.accent].name}</p></div>
        </div>

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
          ${RS.native.isApp ? toggle('fullscreen', 'phone', '#14b8a6', 'Tela cheia', 'Esconde as barras do sistema') : ''}
          ${toggle('compact', 'layers', '#6366f1', 'Lista compacta', 'Mostra mais produtos por tela')}
          ${toggle('haptics', 'zap', '#0ea5e9', 'Vibração ao tocar', 'Resposta tátil leve nos botões')}
        </div>`);
    },
    mount(root) {
      bindCommon(root);
      root.addEventListener('click', e => {
        const t = e.target.closest('[data-theme-pick],[data-accent],[data-bg]');
        if (!t) return;
        ui.tap();
        if (t.dataset.themePick) {
          const was = s.settings.theme;
          s.set('theme', t.dataset.themePick);
          if (RS.fx) RS.fx.burst(innerWidth / 2, innerHeight / 3);
          RS.app.refresh();
          if (t.dataset.themePick === 'coca' && was !== 'coca') ui.toast('Tema Coca ativado · o ícone do app também muda', { type: 'ok', icon: 'sparkle', duration: 3800 });
          else if (was === 'coca' && t.dataset.themePick !== 'coca') ui.toast('Ícone do app voltou ao padrão', { icon: 'sparkle' });
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
  RS.screens['settings.notifications'] = {
    tab: 'settings',
    bar: false,
    render() {
      const n = s.settings.notif;
      const allowed = RS.native.notificationsAllowed();
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
        <p class="hint">Você é avisado dos produtos que vencem dentro desse prazo (de todas as lojas). Cores: ⚫ vencido · 🔴 menos de 7 dias · 🟡 7 a 30 dias · 🟢 mais de 30 dias.</p>

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
        ${RS.native.isApp ? `<button class="btn block" data-sys style="margin-top:8px;color:var(--text-2)">Abrir ajustes do sistema</button>` : ''}`);
    },
    mount(root) {
      bindCommon(root, async (k, v) => {
        if (k === 'notif.enabled' && v && !RS.native.notificationsAllowed()) await RS.native.requestNotifications();
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
          const ok = await RS.native.requestNotifications();
          if (ok) { ui.toast('Notificações permitidas', { type: 'ok' }); RS.app.refresh(); }
          else { ui.toast('Permissão negada — ative nos ajustes do sistema', { type: 'warn' }); RS.native.openNotificationSettings(); }
        }
        if (e.target.closest('[data-sys]')) RS.native.openNotificationSettings();
        if (e.target.closest('[data-test]')) {
          ui.tap();
          if (!RS.native.notificationsAllowed()) {
            const ok = await RS.native.requestNotifications();
            if (!ok) return ui.toast('Permita as notificações primeiro', { type: 'warn' });
          }
          const c = s.counts();
          const n = RS.native.testNotification('RS Stock', c.alerts ? c.alerts + ' produtos precisam de atenção' : 'Tudo em dia ✨');
          ui.toast(n === -1 && !RS.native.isApp ? 'Teste enviado (navegador)' : 'Notificação enviada', { type: 'ok', icon: 'bell' });
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
  RS.screens['settings.a11y'] = {
    tab: 'settings',
    bar: false,
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
  RS.screens['settings.security'] = {
    tab: 'settings',
    bar: false,
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
            <span class="ct"><b>Alterar senha</b><small>${RS.auth.isGuest() ? 'Crie uma conta para usar' : 'Atualize a senha de acesso'}</small></span>${I('chev', 18)}</button>
          <button class="cell" data-reset><span class="ci" style="--cc:#3b82f6">${I('mail', 18)}</span>
            <span class="ct"><b>Recuperar senha por e-mail</b><small>Enviamos um link para criar nova senha</small></span>${I('chev', 18)}</button>
        </div>
        <p class="hint" style="margin-top:16px">${RS.auth.isUser() ? 'Seus dados ficam salvos no aparelho e com backup na sua conta.' : 'No modo convidado os dados ficam só neste aparelho.'}</p>`);
    },
    mount(root) {
      bindCommon(root);
      root.addEventListener('click', async e => {
        if (e.target.closest('[data-pin]')) {
          ui.tap();
          const pin = await RS.pin.create();
          if (pin) { s.set('security.pin', await u.sha256('rs:' + pin)); ui.toast('PIN definido', { type: 'ok', icon: 'lock' }); RS.app.refresh(); }
        } else if (e.target.closest('[data-unpin]')) {
          const ok = await RS.pin.verify('Confirme o PIN atual');
          if (ok) { s.set('security.pin', ''); s.set('security.lockOnResume', false); ui.toast('PIN removido', { type: 'ok' }); RS.app.refresh(); }
        } else if (e.target.closest('[data-pass]')) {
          ui.tap();
          if (!RS.auth.isUser()) return RS.app.go('auth', { from: 'settings', tab: 'signup' });
          const p1 = await RS.askText('Nova senha', 'Mínimo 6 caracteres');
          if (!p1) return;
          if (p1.length < 6) return ui.toast('A senha precisa ter 6+ caracteres', { type: 'warn' });
          const p2 = await RS.askText('Confirme a nova senha', 'Repita a senha');
          if (p1 !== p2) return ui.toast('As senhas não coincidem', { type: 'warn' });
          const r = await RS.auth.changePassword(p1);
          ui.toast(r.ok ? 'Senha alterada' : (r.message || 'Não foi possível alterar'), { type: r.ok ? 'ok' : 'err', icon: 'key' });
        } else if (e.target.closest('[data-reset]')) {
          ui.tap();
          const ses = RS.auth.session();
          const email = (ses && ses.email) || await RS.askText('Recuperar senha', 'Seu e-mail ou nick');
          if (!email) return;
          const r = await RS.auth.resetPassword(email);
          if (r.ok) ui.alert({ title: 'Verifique seu e-mail', message: 'Enviamos um link para você criar uma nova senha.', icon: 'mail' });
          else ui.toast(r.message || 'Disponível com uma conta', { type: 'err' });
        }
      });
    }
  };

  /* ============================== Dados ============================== */
  RS.screens['settings.data'] = {
    tab: 'settings',
    bar: false,
    render() {
      const c = s.counts();
      return sub('Backup e dados', `
        <div class="card glass" style="display:flex;align-items:center;gap:16px">
          <span class="ci" style="width:52px;height:52px;border-radius:18px;display:grid;place-items:center;background:rgba(var(--accent-rgb),.18);color:var(--accent)">${I('db', 24)}</span>
          <span><b style="font-size:1.3rem" class="num">${c.total}</b> <span class="muted">${c.total === 1 ? 'produto' : 'produtos'}</span><br>
            <small class="faint">${u.plural(c.units, 'unidade', 'unidades')} em estoque · ${RS.auth.isUser() ? 'aparelho + nuvem' : 'somente neste aparelho'}</small></span>
        </div>
        <div class="group-label">Backup na nuvem</div>
        <div class="group glass-lite">
          ${RS.auth.isUser() ? `
          <button class="cell" data-sync><span class="ci" style="--cc:#3b82f6">${I('cloud', 18)}</span><span class="ct"><b>Sincronizar agora</b><small>Último backup: ${ago(RS.repo.status.lastSync)}${RS.repo.status.error ? ' · ' + u.esc(RS.repo.status.error) : ''}</small></span>${syncBadge()}</button>` : `
          <button class="cell" data-login><span class="ci" style="--cc:#3b82f6">${I('cloud', 18)}</span><span class="ct"><b>Ativar backup na nuvem</b><small>Crie uma conta grátis e acesse de qualquer aparelho</small></span>${I('chev', 18)}</button>`}
        </div>
        <div class="group-label">Arquivo de backup</div>
        <div class="group glass-lite">
          <button class="cell" data-backup><span class="ci" style="--cc:#10b981">${I('download', 18)}</span><span class="ct"><b>Criar backup</b><small>Salva um arquivo .json com tudo</small></span>${I('chev', 18)}</button>
          <label class="cell"><span class="ci" style="--cc:#3b82f6">${I('upload', 18)}</span><span class="ct"><b>Restaurar backup</b><small>Importa um arquivo criado pelo RS Stock</small></span>${I('chev', 18)}
            <input type="file" accept="application/json,.json" data-restore class="sr"></label>
        </div>
        <div class="group-label">Zona de perigo</div>
        <div class="group glass-lite">
          <button class="cell danger" data-clear-products><span class="ci" style="--cc:#ff8a3d">${I('trash', 18)}</span><span class="ct"><b>Apagar produtos desta loja</b><small>${u.esc(s.current() ? s.current().name : '')} · mantém as outras lojas</small></span></button>
          <button class="cell danger" data-reset-all><span class="ci" style="--cc:#ff5470">${I('refresh', 18)}</span><span class="ct"><b>Restaurar o app</b><small>Apaga produtos, ajustes e sessão</small></span></button>
        </div>`);
    },
    mount(root) {
      bindCommon(root);
      root.addEventListener('click', async e => {
        if (e.target.closest('[data-sync]')) {
          ui.tap();
          const L = ui.loading('Sincronizando', 'Enviando e baixando dados…');
          const ok = await s.syncNow(true);
          await L.done(600);
          ui.toast(ok ? 'Backup na nuvem em dia' : 'Sem conexão — tentaremos de novo depois', { type: ok ? 'ok' : 'warn', icon: 'cloud' });
          return RS.app.refresh();
        }
        if (e.target.closest('[data-login]')) { ui.tap(); return RS.app.go('auth', { from: 'settings', tab: 'signup' }); }
        if (e.target.closest('[data-backup]')) {
          ui.tap();
          const L = ui.loading('Criando backup', 'Empacotando dados…');
          const data = { app: 'RS Stock', version: cfg.version, schema: 2, exportedAt: new Date().toISOString(), stores: s.stores, products: s.products, history: s.history, settings: Object.assign({}, s.settings, { security: { pin: '', lockOnResume: false } }) };
          const json = JSON.stringify(data, null, 2);
          await L.done(600);
          const r = await RS.native.exportFile(btoa(unescape(encodeURIComponent(json))), 'application/json', 'RSStock-backup-' + u.stamp() + '.json', 'save');
          if (r.ok) ui.toast('Backup salvo', { type: 'ok' });
          else if (!r.cancelled) ui.toast(r.error || 'Falha ao salvar', { type: 'err' });
        } else if (e.target.closest('[data-clear-products]')) {
          const cur = s.current();
          if (!cur) return;
          const n = s.storeCounts(cur.id).total;
          const ok = await ui.confirm({ title: `Apagar o estoque de ${u.esc(cur.name)}?`, message: `${u.plural(n, 'produto será removido', 'produtos serão removidos')}. As outras lojas não são afetadas.`, confirm: 'Apagar', danger: true });
          if (!ok) return;
          await s.clearStoreProducts(cur.id);
          ui.toast('Produtos apagados', { icon: 'trash' });
          RS.app.refresh();
        } else if (e.target.closest('[data-reset-all]')) {
          const ok = await ui.confirm({ title: 'Restaurar o app?', message: 'Tudo será apagado: produtos, configurações e sessão. Recomendamos criar um backup antes.', confirm: 'Restaurar', danger: true, icon: 'refresh' });
          if (!ok) return;
          const L = ui.loading('Restaurando', 'Limpando dados…');
          await s.resetAll();
          await L.done(1000);
          RS.app.start('auth');
        }
      });
      root.querySelector('[data-restore]').addEventListener('change', async e => {
        const file = e.target.files && e.target.files[0];
        e.target.value = '';
        if (!file) return;
        try {
          const data = JSON.parse(await file.text());
          if (!data || !Array.isArray(data.products)) throw new Error('formato');
          const ok = await ui.confirm({ title: 'Restaurar backup?', message: `${data.stores ? u.plural(data.stores.length, 'loja', 'lojas') + ' e ' : ''}${u.plural(data.products.length, 'produto', 'produtos')} substituirão os dados atuais.`, confirm: 'Restaurar', icon: 'upload' });
          if (!ok) return;
          const L = ui.loading('Restaurando backup', 'Importando produtos…');
          await s.replaceAll(data);
          if (data.settings) {
            const keep = s.settings.security;
            Object.keys(data.settings).forEach(k => { if (k !== 'security' && k in s.settings) s.set(k, data.settings[k]); });
            s.set('security', keep);
          }
          await L.done(900);
          ui.toast('Backup restaurado', { type: 'ok' });
          RS.app.refresh();
        } catch (err) {
          ui.toast('Arquivo de backup inválido', { type: 'err' });
        }
      });
    }
  };

  /* ============================== Créditos ============================== */
  /* ============================== Minha conta ============================== */
  RS.screens['settings.account'] = {
    tab: 'settings',
    bar: false,
    render() {
      const ses = RS.auth.session() || {}, st = RS.repo.status, pf = RS.auth.profile || {};
      return sub('Minha conta', `
        <div class="card glass" style="text-align:center;padding:24px 18px">
          <span class="me-avatar" style="display:block;margin:0 auto 12px;--av:${(cfg.accents[s.settings.profile.color] || {}).a}"><span>${u.esc(u.initials(s.settings.profile.name || ses.nick || 'R S'))}</span></span>
          <b style="font-size:1.15rem;display:block">@${u.esc(ses.nick || '')}</b>
          <p class="muted" style="font-size:.84rem;margin-top:4px">${RS.auth.isInternalEmail(ses.email) ? 'Conta com nick e senha' : u.esc(ses.email || '')}</p>
          ${pf.role === 'admin' ? '<span class="soon-tag" style="margin-top:8px">Administrador</span>' : ''}
        </div>
        <div class="group-label">Nuvem</div>
        <div class="group glass-lite">
          <button class="cell" data-sync><span class="ci" style="--cc:#3b82f6">${I('cloud', 18)}</span><span class="ct"><b>Sincronizar agora</b><small>Último backup: ${ago(st.lastSync)}</small></span>${syncBadge()}</button>
        </div>
        <div class="group-label">Dados de acesso</div>
        <div class="group glass-lite">
          <button class="cell" data-nick><span class="ci" style="--cc:#8b5cf6">${I('user', 18)}</span><span class="ct"><b>Alterar nick</b><small>@${u.esc(ses.nick || '')}</small></span>${I('chev', 18)}</button>
          <button class="cell" data-email><span class="ci" style="--cc:#06b6d4">${I('mail', 18)}</span><span class="ct"><b>${RS.auth.isInternalEmail(ses.email) ? 'Adicionar e-mail' : 'Alterar e-mail'}</b><small>Opcional · ajuda a recuperar a senha</small></span>${I('chev', 18)}</button>
          <button class="cell" data-go-sec><span class="ci" style="--cc:#f59e0b">${I('key', 18)}</span><span class="ct"><b>Senha e segurança</b></span>${I('chev', 18)}</button>
        </div>
        <button class="btn danger block" data-out style="margin-top:20px">${I('logout', 18)}Sair da conta</button>`);
    },
    mount(root) {
      bindCommon(root);
      this._off = s.on(w => { if (w === 'sync') { const b = root.querySelector('[data-sync] .soon-tag'); if (b) b.outerHTML = syncBadge(); } });
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-sync],[data-nick],[data-email],[data-go-sec],[data-out]');
        if (!t) return;
        ui.tap();
        if (t.dataset.sync != null) {
          const L = ui.loading('Sincronizando', 'Enviando e baixando dados…');
          const ok = await s.syncNow(true);
          await L.done(600);
          ui.toast(ok ? 'Backup na nuvem em dia' : 'Sem conexão — tentaremos de novo depois', { type: ok ? 'ok' : 'warn', icon: 'cloud' });
          return RS.app.refresh();
        }
        if (t.dataset.nick != null) {
          const v = await RS.askText('Novo nick', 'letras, números, _ ou .', (RS.auth.session() || {}).nick || '');
          if (!v) return;
          if (!/^[a-zA-Z0-9_.]{3,24}$/.test(v)) return ui.toast('Nick inválido (3 a 24 caracteres)', { type: 'warn' });
          const r = await RS.auth.updateProfile({ nick: v });
          ui.toast(r.ok ? 'Nick atualizado' : r.message, { type: r.ok ? 'ok' : 'err' });
          return RS.app.refresh();
        }
        if (t.dataset.email != null) {
          const v = await RS.askText('Novo e-mail', 'voce@email.com');
          if (!v) return;
          if (!/^\S+@\S+\.\S+$/.test(v)) return ui.toast('E-mail inválido', { type: 'warn' });
          const r = await RS.auth.changeEmail(v);
          if (r.ok) ui.alert({ title: 'Confirme o novo e-mail', message: 'Enviamos um link de confirmação. A troca vale depois que você confirmar.', icon: 'mail' });
          else ui.toast(r.message, { type: 'err' });
          return;
        }
        if (t.dataset.goSec != null) return RS.app.go('settings.security');
        if (t.dataset.out != null) {
          const ok = await ui.confirm({ title: 'Sair da conta?', message: 'Seus dados continuam salvos na nuvem. Para ver de novo, é só entrar.', confirm: 'Sair', danger: true, icon: 'logout' });
          if (!ok) return;
          const L = ui.loading('Saindo', 'Enviando últimas alterações…');
          await RS.repo.push();
          await RS.auth.signOut();
          await L.done(700);
          RS.app.start('auth');
        }
      });
    },
    unmount() { if (this._off) this._off(); }
  };

  RS.screens['settings.credits'] = {
    tab: 'settings',
    bar: false,
    render() {
      const sparks = Array.from({ length: 14 }, (_, i) => `<i style="left:${(i * 37) % 100}%;top:${(i * 53) % 100}%;animation-delay:-${(i * .37).toFixed(2)}s"></i>`).join('');
      return `
        <header class="topbar"><button class="icon-btn glass" data-back aria-label="Voltar">${I('back')}</button>
          <div class="grow"><h1 class="page-title">Créditos</h1></div></header>
        <div class="credits3d">
          <div class="scene3d" data-scene>
            <div class="sparks">${sparks}</div>
            <div class="orbit o1"><i></i></div>
            <div class="orbit o2"><i></i></div>
            <div class="cube" data-cube>
              <div class="face f1">FL</div>
              <div class="face f2">FlowLabs</div>
              <div class="face f3">${I('sparkle', 44, 1.8)}</div>
              <div class="face f4">${I('code', 44, 1.8)}</div>
              <div class="face f5">${I('heart', 44, 1.8)}</div>
              <div class="face f6">${I('zap', 44, 1.8)}</div>
            </div>
          </div>
          <div class="brand-word">FlowLabs</div>
          <div class="brand-sub">Studio</div>
          <p class="credits-text">O ${cfg.appName} é criado pela <b style="color:var(--text)">FlowLabs Studio</b> — ferramentas simples, bonitas e úteis para o dia a dia.</p>
          <div class="credit-chips">
            <span class="glass-lite">${I('sparkle', 14)}Design e desenvolvimento</span>
            <span class="glass-lite">${I('scan', 14)}ZXing · Apache 2.0</span>
            <span class="glass-lite">${I('code', 14)}Android WebView</span>
          </div>
          <button class="btn ghost sm" data-site style="margin-top:18px">${I('globe', 16)}Site da FlowLabs <span class="soon-tag">Em breve</span></button>
          <p class="hint" style="text-align:center;margin-top:14px">Arraste o cubo para girar · Feito no Brasil 💜<br>© ${cfg.year} FlowLabs Studio · Todos os direitos reservados</p>
        </div>`;
    },
    mount(root) {
      bindCommon(root);
      root.addEventListener('click', e => { if (e.target.closest('[data-site]')) { ui.tap(); openSite(); } });
      // Girar o cubo com o dedo
      const scene = root.querySelector('[data-scene]'), cube = root.querySelector('[data-cube]');
      let x0 = null, y0 = null, rx = -22, ry = 0, vx = 0, raf = 0;
      const apply = () => { cube.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`; };
      scene.addEventListener('pointerdown', e => {
        x0 = e.clientX; y0 = e.clientY;
        const m = getComputedStyle(cube).transform;
        cube.classList.add('drag'); cancelAnimationFrame(raf);
        if (m && m !== 'none') cube.style.transform = m;
        scene.setPointerCapture(e.pointerId);
      });
      scene.addEventListener('pointermove', e => {
        if (x0 == null) return;
        vx = (e.clientX - x0) * .6;
        ry += vx; rx = Math.max(-80, Math.min(80, rx - (e.clientY - y0) * .5));
        x0 = e.clientX; y0 = e.clientY; apply();
      });
      const end = () => {
        if (x0 == null) return;
        x0 = null;
        const glide = () => { vx *= .95; ry += vx; apply(); if (Math.abs(vx) > .2) raf = requestAnimationFrame(glide); };
        glide();
        ui.tap(10);
      };
      scene.addEventListener('pointerup', end);
      scene.addEventListener('pointercancel', end);
    }
  };

  /* ============================== Histórico ============================== */
  const LOG = {
    add: ['plus', '#2ed3a0', 'Adicionado'], edit: ['edit', '#7c5cff', 'Editado'], remove: ['trash', '#ff5470', 'Removido'],
    in: ['download', '#06b6d4', 'Entrada'], out: ['upload', '#ff8a3d', 'Baixa']
  };
  function ago(t) {
    const m = Math.round((Date.now() - t) / 60000);
    if (m < 1) return 'agora';
    if (m < 60) return m + ' min';
    const h = Math.round(m / 60);
    if (h < 24) return h + ' h';
    const d = new Date(t);
    return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0');
  }
  RS.screens['settings.history'] = {
    tab: 'settings',
    bar: false,
    render() {
      const h = s.history;
      return sub('Histórico', h.length ? `<div class="card glass-lite" style="padding:6px 14px">${h.map(e => {
        const L = LOG[e.type] || LOG.edit;
        return `<div class="log"><span class="li" style="--lc:${L[1]}">${I(L[0], 16)}</span>
          <span class="lt"><b>${u.esc(e.name)}</b><small>${L[2]}${e.detail ? ' · ' + u.esc(e.detail) : ''}</small></span><time>${ago(e.t)}</time></div>`;
      }).join('')}</div>` : `<div class="empty glass-lite"><div class="art">${I('clock', 34)}</div><h3>Sem movimentações</h3><p>Tudo o que você adicionar, editar, dar baixa ou remover aparece aqui.</p></div>`,
        h.length ? `<button class="icon-btn glass" data-clear-h aria-label="Limpar histórico">${I('trash', 20)}</button>` : '');
    },
    mount(root) {
      bindCommon(root);
      root.addEventListener('click', async e => {
        if (!e.target.closest('[data-clear-h]')) return;
        const ok = await ui.confirm({ title: 'Limpar histórico?', message: 'Os registros de movimentação serão apagados. Seus produtos não são afetados.', confirm: 'Limpar', danger: true });
        if (ok) { s.clearHistory(); RS.app.refresh(); }
      });
    }
  };

  /* ============================== Sobre ============================== */
  RS.screens['settings.about'] = {
    tab: 'settings',
    bar: false,
    render() {
      const info = RS.native.info();
      return sub('Sobre o app', `
        <div class="card glass" style="text-align:center;padding:30px 18px">
          <img class="app-logo" src="${RS.logoSrc()}" alt="" style="margin:0 auto 14px">
          <h2 class="h2" style="font-size:1.4rem">${cfg.appName}</h2>
          <p class="muted" style="margin-top:4px">Versão ${u.esc(info.version || cfg.version)}</p>
        </div>
        <div class="group-label">Informações</div>
        <div class="group glass-lite">
          <div class="cell static"><span class="ct"><b>Plataforma</b></span><span class="cv">${info.platform === 'android' ? 'Android' + (info.sdk ? ' (API ' + info.sdk + ')' : '') : 'Web'}</span></div>
          ${info.device ? `<div class="cell static"><span class="ct"><b>Aparelho</b></span><span class="cv">${u.esc(info.device)}</span></div>` : ''}
          <div class="cell static"><span class="ct"><b>Armazenamento</b></span><span class="cv">${RS.auth.isUser() ? 'Aparelho + nuvem' : 'Local (neste aparelho)'}</span></div>
          <div class="cell static"><span class="ct"><b>Sincronização na nuvem</b></span><span class="cv">${RS.auth.isUser() ? 'Ativa' : 'Entre com uma conta'}</span></div>
          <button class="cell" data-check-update><span class="ct"><b>Procurar atualização</b><small>Versão instalada: ${u.esc(info.version || cfg.version)}</small></span>${I('refresh', 18)}</button>
        </div>
        <div class="group-label">Como funciona</div>
        <div class="card glass-lite"><p class="muted" style="font-size:.88rem;line-height:1.6">
          Crie suas lojas (ex.: Mercado Rio Sul, Guanabara) — cada uma tem o próprio estoque. Cadastre produtos com nome e validade; as cores mostram a situação:
          <span class="tag-exp">Vencido</span> <b style="color:var(--c-soon)">menos de 7 dias</b>, <b style="color:var(--c-mid)">7 a 30 dias</b> e <b style="color:var(--c-ok)">mais de 30 dias</b>.
          Dê baixa ou entrada no estoque, acompanhe tudo no histórico e exporte em PDF, imagem, texto ou planilha com o nome da loja.</p></div>`);
    },
    mount(root) {
      bindCommon(root);
      root.addEventListener('click', e => { if (e.target.closest('[data-check-update]')) { ui.tap(); RS.updater.check(true); } });
    }
  };
})();
