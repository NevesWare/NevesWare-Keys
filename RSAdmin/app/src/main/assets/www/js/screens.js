/* RS Admin — telas */
(function () {
  const u = RS.u, ui = RS.ui, api = RS.api, I = ui.icon;
  const S = RS.screens;
  const cache = { accounts: null, stats: null, releases: null };

  const ago = iso => {
    if (!iso) return 'nunca';
    const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (m < 1) return 'agora'; if (m < 60) return m + ' min';
    const h = Math.round(m / 60); if (h < 24) return h + ' h';
    const d = Math.round(h / 24); if (d < 30) return d + ' d';
    return new Date(iso).toLocaleDateString('pt-BR');
  };
  const dt = iso => iso ? new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
  const mb = b => b ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : '';
  const internal = e => /@nick\.rsstock\.app$/i.test(e || '');
  const showEmail = e => internal(e) ? 'Conta só com nick (sem e-mail)' : (e ? u.esc(e) : 'Sem e-mail');
  const back = `<button class="icon-btn glass" data-back aria-label="Voltar">${I('back')}</button>`;
  const err = (box, e) => { box.innerHTML = `<div class="empty glass-lite"><div class="art">${I('alert', 32)}</div><h3>Não foi possível carregar</h3><p>${u.esc(api.msg(e))}</p><button class="btn ghost sm" data-retry>${I('refresh', 16)}Tentar de novo</button></div>`; };
  const avatar = (a, size = 44) => `<span class="adm-av" style="width:${size}px;height:${size}px;--h:${[...(a.nick || 'x')].reduce((s, c) => s + c.charCodeAt(0), 0) % 360}">${u.esc(u.initials(a.name || a.nick || '?'))}</span>`;

  function enrichProducts(list) {
    return list.map(p => { const days = u.daysUntil(p.expiry); return Object.assign({}, p, { days, status: u.status(days) }); });
  }
  function counts(list) { const c = { total: 0, expired: 0, soon: 0, mid: 0, ok: 0 }; list.forEach(p => { c.total++; c[p.status]++; }); return c; }

  /* ============================== Login ============================== */
  S.login = {
    bar: false,
    render() {
      return `<div class="scroll" style="-webkit-mask-image:none;mask-image:none"><div class="auth">
        <div class="auth-brand"><img class="app-logo" src="img/logo.png" alt=""><h1>RS Admin</h1><p>Painel de controle do RS Stock</p></div>
        <form class="auth-card glass" onsubmit="return false">
          <div class="field"><label>Nick do administrador</label><div class="input"><span class="lead">${I('user', 18)}</span><input name="id" autocomplete="username" autocapitalize="none" placeholder="seu_nick"></div></div>
          <div class="field"><label>Senha</label><div class="input"><span class="lead">${I('lock', 18)}</span><input name="pw" type="password" autocomplete="current-password" placeholder="Sua senha"></div></div>
          <button class="btn primary block" data-go>${I('shield', 20)}Entrar no painel</button>
          <p class="hint" style="text-align:center;margin-top:14px">Use a mesma conta criada no app RS Stock. A primeira conta que entrar aqui vira a administradora principal.</p>
        </form>
        <footer class="auth-foot"><strong>FlowLabs Studio</strong><br>Acesso restrito</footer>
      </div></div>`;
    },
    mount(root) {
      const go = async () => {
        const id = root.querySelector('[name=id]').value, pw = root.querySelector('[name=pw]').value;
        if (!id || !pw) return ui.toast('Preencha usuário e senha', { type: 'warn' });
        const b = root.querySelector('[data-go]'); const h = b.innerHTML;
        b.disabled = true; b.innerHTML = '<span class="spinner sm"></span>Verificando acesso…';
        const r = await api.signIn(id, pw);
        b.disabled = false; b.innerHTML = h;
        if (!r.ok) return ui.toast(r.message, { type: 'err' });
        RS.admin.enter();
      };
      root.querySelector('[data-go]').onclick = () => { ui.tap(); go(); };
      root.querySelector('[name=pw]').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    }
  };

  /* ============================== Painel ============================== */
  function bars(series, color) {
    const max = Math.max(1, ...series.map(x => x.n));
    return `<div class="bars">${series.map(x => { const d = new Date(x.day + 'T12:00:00'); return `<div class="bar-col" title="${x.n}"><i style="height:${Math.max(4, x.n / max * 100)}%;--bc:${color}"><em>${x.n || ''}</em></i><small>${d.getDate()}</small></div>`; }).join('')}</div>`;
  }
  S.dash = {
    tab: 'dash',
    render() {
      const me = RS.admin.me || {};
      return `<header class="topbar"><div class="grow"><p class="eyebrow">Olá, ${u.esc(me.nick || 'admin')}</p><h1 class="h1">Painel</h1></div>
          <button class="icon-btn glass" data-refresh aria-label="Atualizar">${I('refresh')}</button></header>
        <div class="scroll flexcol" data-body>${ui.skeleton(5)}</div>`;
    },
    async mount(root) {
      const body = root.querySelector('[data-body]');
      const load = async () => {
        try {
          const [s, us] = await Promise.all([api.stats(), api.updateStats().catch(() => null)]);
          cache.stats = s;
          const rel = s.latest_release;
          const k = (icon, color, label, value, sub = '') => `<div class="kpi glass-lite" style="--tc:${color}"><span class="ti">${I(icon, 18)}</span><b class="num">${value}</b><span>${label}</span>${sub ? `<small>${sub}</small>` : ''}</div>`;
          body.innerHTML = `
            <div class="kpis stagger">
              ${k('user', '#7c5cff', 'Contas', s.users, '+' + s.users_new_7d + ' em 7 dias')}
              ${k('zap', '#10b981', 'Ativos 7 dias', s.users_active_7d, s.users_active_24h + ' nas últimas 24h')}
              ${k('home', '#e4000f', 'Lojas', s.stores)}
              ${k('box', '#3b82f6', 'Produtos', s.products, (Math.round(s.units)).toLocaleString('pt-BR') + ' unidades')}
              ${k('alert', '#050507', 'Vencidos', s.expired, 'em todas as contas')}
              ${k('clock', '#ff3b4e', 'Vencem < 7 dias', s.soon)}
              ${k('upload', '#f59e0b', 'Baixas 7 dias', s.outs_7d, s.movements_7d + ' movimentações')}
              ${k('lock', '#64748b', 'Bloqueadas', s.blocked)}
            </div>
            <div class="group-label">Novas contas · 14 dias</div>
            <div class="card glass-lite">${bars(s.signups || [], '#7c5cff')}</div>
            <div class="group-label">Movimentações · 14 dias</div>
            <div class="card glass-lite">${bars(s.activity || [], '#10b981')}</div>
            ${us ? `<div class="group-label">Atualização dos aparelhos</div>
            <div class="mini-stats" style="grid-template-columns:repeat(3,minmax(0,1fr));margin-top:0">
              <div class="glass-lite"><b class="num" style="color:var(--c-ok)">${us.up_to_date}</b><small>atualizados</small></div>
              <div class="glass-lite"><b class="num" style="color:var(--c-danger)">${us.outdated}</b><small>desatualizados</small></div>
              <div class="glass-lite"><b class="num">${us.unknown}</b><small>sem dados</small></div></div>` : ''}
            <div class="group-label">Versões em uso</div>
            <div class="rows glass-lite">${(s.versions || []).map(v => `<div class="row static"><span class="ri" style="--tc:#06b6d4">${I('phone', 16)}</span><span class="ct"><b>RS Stock ${u.esc(v.version)}</b></span><span class="cv num">${u.plural(v.n, 'conta', 'contas')}</span></div>`).join('') || '<p class="hint" style="padding:14px">Sem dados ainda.</p>'}</div>
            <div class="group-label">Última versão publicada</div>
            <button class="card glass-lite" data-go-rel style="width:100%;text-align:left;display:flex;align-items:center;gap:14px">
              <span class="ri" style="--tc:#8b5cf6;width:44px;height:44px">${I('download', 20)}</span>
              <span style="flex:1">${rel ? `<b>v${u.esc(rel.version_name)}</b> <small class="faint">(código ${rel.version_code})</small><br><small class="muted">${rel.mandatory ? 'Obrigatória' : 'Opcional'} · ${dt(rel.created_at)}</small>` : '<b>Nenhuma versão publicada</b><br><small class="muted">Envie o primeiro APK</small>'}</span>${I('chev', 18)}</button>`;
        } catch (e) { err(body, e); }
      };
      load();
      root.addEventListener('click', e => {
        if (e.target.closest('[data-refresh],[data-retry]')) { ui.tap(); body.innerHTML = ui.skeleton(5); load(); }
        if (e.target.closest('[data-go-rel]')) RS.app.go('releases', {}, { tab: true });
      });
    }
  };

  /* ============================== Contas ============================== */
  const filters = [['all', 'Todas'], ['active', 'Ativas 7d'], ['admin', 'Admins'], ['blocked', 'Bloqueadas'], ['unconfirmed', 'Sem confirmação']];
  const st = { q: '', f: 'all' };
  function accountRow(a) {
    const tags = [];
    if (a.role === 'admin') tags.push('<span class="tag t-admin">Admin</span>');
    if (a.status === 'blocked') tags.push('<span class="tag t-block">Bloqueada</span>');
    if (!a.email_confirmed) tags.push('<span class="tag t-warn">E-mail pendente</span>');
    if (a.up_to_date === true) tags.push('<span class="tag t-ok">Atualizado</span>');
    if (a.up_to_date === false) tags.push('<span class="tag t-block">Desatualizado</span>');
    return `<button class="acc glass-lite" data-acc="${a.id}">${avatar(a)}
      <span class="ct"><b>@${u.esc(a.nick)} ${tags.join('')}</b><small>${showEmail(a.email)}</small>
      <small class="faint">${a.stores} lojas · ${a.products} produtos · v${u.esc(a.app_version_name || '—')} · visto ${ago(a.last_seen_at)}</small></span>${I('chev', 18)}</button>`;
  }
  S.accounts = {
    tab: 'accounts',
    render() {
      return `<header class="topbar"><div class="grow"><p class="eyebrow">Gerenciamento</p><h1 class="h1">Contas</h1></div>
          <button class="icon-btn glass" data-new aria-label="Nova conta">${I('plus')}</button></header>
        <label class="search glass">${I('search', 20)}<input data-q placeholder="Buscar nick, e-mail ou nome…" value="${u.esc(st.q)}" autocomplete="off"></label>
        <div class="chips" data-chips style="padding-bottom:6px">${filters.map(([k, l]) => `<button class="chip glass-lite ${st.f === k ? 'on' : ''}" data-f="${k}">${l}</button>`).join('')}</div>
        <div class="scroll" data-list>${ui.skeleton(6)}</div>`;
    },
    async mount(root) {
      const list = root.querySelector('[data-list]');
      const draw = () => {
        const q = u.norm(st.q);
        let a = (cache.accounts || []).filter(x => !q || u.norm(x.nick + ' ' + x.email + ' ' + x.name).includes(q));
        if (st.f === 'active') a = a.filter(x => x.last_seen_at && Date.now() - new Date(x.last_seen_at) < 7 * 864e5);
        if (st.f === 'admin') a = a.filter(x => x.role === 'admin');
        if (st.f === 'blocked') a = a.filter(x => x.status === 'blocked');
        if (st.f === 'unconfirmed') a = a.filter(x => !x.email_confirmed);
        list.innerHTML = a.length ? `<p class="hint" style="margin:0 4px 10px">${u.plural(a.length, 'conta', 'contas')}</p><div class="list">${a.map(accountRow).join('')}</div>` : `<div class="empty glass-lite"><div class="art">${I('user', 32)}</div><h3>Nenhuma conta</h3><p>Nada encontrado com esse filtro.</p></div>`;
      };
      const load = async () => { try { cache.accounts = await api.accounts(); draw(); } catch (e) { err(list, e); } };
      if (cache.accounts) draw();
      load();
      root.querySelector('[data-q]').addEventListener('input', u.debounce(e => { st.q = e.target.value; draw(); }, 120));
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-acc],[data-f],[data-new],[data-retry]');
        if (!t) return;
        ui.tap();
        if (t.dataset.acc) return RS.app.go('account', { id: t.dataset.acc });
        if (t.dataset.f) { st.f = t.dataset.f; root.querySelectorAll('[data-f]').forEach(x => x.classList.toggle('on', x === t)); return draw(); }
        if (t.dataset.retry != null) return load();
        if (t.dataset.new != null) {
          const r = await RS.admin.form('Nova conta', [['nick', 'Nick', 'nick_da_conta'], ['password', 'Senha', 'mínimo 6 caracteres'], ['name', 'Nome (opcional)', ''], ['email', 'E-mail (opcional)', 'deixe vazio para conta só com nick']], 'Criar conta');
          if (!r) return;
          const L = ui.loading('Criando conta', '@' + r.nick);
          const x = await api.action('create_user', r);
          await L.done(500);
          ui.toast(x.ok ? `Conta @${r.nick} criada — já pode entrar com nick e senha` : x.message, { type: x.ok ? 'ok' : 'err' });
          load();
        }
      });
    }
  };

  /* ============================== Detalhe da conta ============================== */
  S.account = {
    tab: 'accounts',
    bar: false,
    render() {
      return `<header class="topbar">${back}<div class="grow"><h1 class="page-title">Conta</h1></div>
        <button class="icon-btn glass" data-reload aria-label="Atualizar">${I('refresh')}</button></header>
        <div class="scroll flexcol" data-body>${ui.skeleton(5)}</div>`;
    },
    async mount(root, params) {
      const body = root.querySelector('[data-body]');
      let data = null;
      const acc = () => (cache.accounts || []).find(x => x.id === params.id) || {};
      const load = async () => {
        try {
          data = await api.account(params.id);
          const p = data.profile, a = Object.assign({}, acc(), p);
          const prods = enrichProducts(data.products), c = counts(prods);
          body.innerHTML = `
            <div class="card glass acc-hero">
              ${avatar(a, 64)}
              <div style="flex:1;min-width:0"><b style="font-size:1.2rem;display:block">@${u.esc(p.nick)}</b>
                <small class="muted" style="display:block">${showEmail(p.email)}</small>
                <div class="meta-tags"><span class="tag ${p.role === 'admin' ? 't-admin' : ''}">${p.role === 'admin' ? 'Admin' : 'Usuário'}</span>
                  <span class="tag ${p.status === 'blocked' ? 't-block' : 't-ok'}">${p.status === 'blocked' ? 'Bloqueada' : 'Ativa'}</span>
                  ${a.email_confirmed === false ? '<span class="tag t-warn">E-mail pendente</span>' : ''}</div></div>
            </div>
            <div class="mini-stats">
              <div class="glass-lite"><b class="num">${data.stores.length}</b><small>lojas</small></div>
              <div class="glass-lite"><b class="num">${prods.length}</b><small>produtos</small></div>
              <div class="glass-lite s-expired"><b class="num">${c.expired}</b><small>vencidos</small></div>
              <div class="glass-lite"><b class="num">${data.movements.length}</b><small>movim.</small></div>
            </div>
            <div class="rows glass-lite" style="margin-top:12px">
              <div class="row static"><span class="ri" style="--tc:#06b6d4">${I('phone', 16)}</span><span class="ct"><b>App</b><small>v${u.esc(p.app_version_name || '—')} · ${u.esc(p.device || 'aparelho desconhecido')}</small></span></div>
              <div class="row static"><span class="ri" style="--tc:#10b981">${I('clock', 16)}</span><span class="ct"><b>Último acesso</b><small>${dt(p.last_seen_at)} · criada em ${dt(p.created_at)}</small></span></div>
            </div>
            <div class="group-label">Suporte</div>
            <div class="actions-grid">
              ${[['edit', 'edit', '#8b5cf6', 'Editar nick/nome'], ['mail', 'update_email', '#06b6d4', 'Alterar e-mail'], ['key', 'set_password', '#f59e0b', 'Definir senha'], ['refresh', 'send_reset', '#3b82f6', 'Enviar redefinição'],
                a.email_confirmed === false ? ['check', 'confirm_email', '#10b981', 'Confirmar e-mail'] : null,
                p.status === 'blocked' ? ['lock', 'unblock', '#10b981', 'Desbloquear'] : ['lock', 'block', '#ff5470', 'Bloquear'],
                p.role === 'admin' ? ['user', 'demote', '#64748b', 'Remover admin'] : ['shield', 'promote', '#7c5cff', 'Tornar admin'],
                ['trash', 'delete_user', '#ff5470', 'Excluir conta']].filter(Boolean).map(([ic, act, col, l]) => `<button class="act-tile glass-lite" data-act="${act}" style="--tc:${col}"><span class="ri">${I(ic, 17)}</span>${l}</button>`).join('')}
            </div>
            <div class="group-label">Lojas e estoque</div>
            ${data.stores.length ? `<div class="list">${data.stores.map(s => { const sc = counts(prods.filter(x => x.store_id === s.id)); return `<button class="acc glass-lite" data-store="${s.id}">
              <span class="store-ic" style="--stc:${s.color};width:42px;height:42px">${u.esc(u.initials(s.name))}</span>
              <span class="ct"><b>${u.esc(s.name)}</b><small>${u.esc(s.address || 'Sem endereço')}</small>
              <span class="mini-legend" style="margin-top:6px">${u.STATUSES.map(k => `<span class="s-${k}"><span class="sdot"></span>${sc[k]}</span>`).join('')}</span></span>${I('chev', 18)}</button>`; }).join('')}</div>`
              : '<p class="hint">Esta conta ainda não tem lojas.</p>'}
            <div class="group-label">Movimentações recentes</div>
            <div class="card glass-lite" style="padding:4px 14px">${data.movements.slice(0, 40).map(m => `<div class="log"><span class="lt"><b>${u.esc(m.product_name)}</b><small>${({ add: 'Cadastro', edit: 'Edição', remove: 'Remoção', in: 'Entrada', out: 'Baixa', 'store-add': 'Loja criada', 'store-edit': 'Loja editada', 'store-remove': 'Loja excluída' })[m.type] || u.esc(m.type)} · ${u.esc(m.detail || '')}</small><small class="faint">${u.esc(m.store_name || '')}</small></span><time>${ago(m.created_at)}</time></div>`).join('') || '<p class="hint" style="padding:10px 0">Nenhuma movimentação.</p>'}</div>`;
        } catch (e) { err(body, e); }
      };
      load();
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-back],[data-reload],[data-retry],[data-act],[data-store]');
        if (!t) return;
        ui.tap();
        if (t.dataset.back != null) return RS.app.back();
        if (t.dataset.reload != null || t.dataset.retry != null) { body.innerHTML = ui.skeleton(5); return load(); }
        if (t.dataset.store) return RS.app.go('store', { id: t.dataset.store, account: data });
        const p = data && data.profile; if (!p) return;
        const act = t.dataset.act, uid = p.id;
        let payload = null, label = '';
        if (act === 'edit') { payload = await RS.admin.form('Editar perfil', [['nick', 'Nick', '', p.nick], ['name', 'Nome', '', p.name || '']], 'Salvar'); label = 'Perfil atualizado'; if (payload) payload = Object.assign({ userId: uid }, payload); }
        else if (act === 'update_email') { const r = await RS.admin.form('Alterar e-mail', [['email', 'Novo e-mail', 'email@exemplo.com', p.email || '']], 'Alterar'); if (r) payload = { userId: uid, email: r.email }; label = 'E-mail alterado'; }
        else if (act === 'set_password') { const r = await RS.admin.form('Definir nova senha', [['password', 'Nova senha', 'mínimo 6 caracteres']], 'Definir'); if (r) payload = { userId: uid, password: r.password }; label = 'Senha definida'; }
        else if (act === 'send_reset') { if (await ui.confirm({ title: 'Enviar redefinição?', message: `Um e-mail para criar nova senha será enviado para ${u.esc(p.email)}.`, confirm: 'Enviar', icon: 'mail' })) payload = { userId: uid }; label = 'E-mail enviado'; }
        else if (act === 'confirm_email') { payload = { userId: uid }; label = 'E-mail confirmado'; }
        else if (act === 'block' || act === 'unblock') { if (await ui.confirm({ title: act === 'block' ? 'Bloquear conta?' : 'Desbloquear conta?', message: act === 'block' ? 'A pessoa não conseguirá mais entrar até ser desbloqueada.' : 'A pessoa poderá entrar novamente.', confirm: act === 'block' ? 'Bloquear' : 'Desbloquear', danger: act === 'block', icon: 'lock' })) payload = { userId: uid }; label = act === 'block' ? 'Conta bloqueada' : 'Conta desbloqueada'; }
        else if (act === 'promote' || act === 'demote') { if (await ui.confirm({ title: act === 'promote' ? 'Tornar administrador?' : 'Remover administrador?', message: act === 'promote' ? 'Esta conta terá acesso total ao RS Admin.' : 'A conta volta a ser usuário comum.', confirm: 'Confirmar', icon: 'shield' })) payload = { userId: uid, role: act === 'promote' ? 'admin' : 'user' }; label = 'Cargo atualizado'; }
        else if (act === 'delete_user') {
          const typed = await RS.admin.form('Excluir conta', [['nick', `Digite o nick “${p.nick}” para confirmar`, p.nick]], 'Excluir definitivamente');
          if (typed && typed.nick === p.nick) payload = { userId: uid }; else if (typed) ui.toast('Nick não confere', { type: 'warn' });
          label = 'Conta excluída';
        }
        if (!payload) return;
        const server = { edit: 'update_profile', promote: 'set_role', demote: 'set_role' }[act] || act;
        const L = ui.loading('Aplicando', label + '…');
        const r = await api.action(server, payload);
        await L.done(500);
        ui.toast(r.ok ? label : r.message, { type: r.ok ? 'ok' : 'err' });
        if (r.ok) { cache.accounts = null; if (act === 'delete_user') return RS.app.back(); load(); }
      });
    }
  };

  /* ============================== Estoque de uma loja ============================== */
  S.store = {
    tab: 'accounts',
    bar: false,
    render(params) {
      const s = params.account.stores.find(x => x.id === params.id) || {};
      return `<header class="topbar">${back}<div class="grow"><p class="eyebrow">@${u.esc(params.account.profile.nick)}</p><h1 class="page-title">${u.esc(s.name || 'Loja')}</h1></div></header>
        <label class="search glass">${I('search', 20)}<input data-q placeholder="Buscar produto…" autocomplete="off"></label>
        <div class="chips" data-chips style="padding-bottom:6px"></div>
        <div class="scroll" data-list></div>`;
    },
    mount(root, params) {
      let f = 'all', q = '';
      const prods = enrichProducts(params.account.products.filter(p => p.store_id === params.id)).sort((a, b) => a.days - b.days);
      const draw = () => {
        const c = counts(prods);
        root.querySelector('[data-chips]').innerHTML = [['all', 'Todos', c.total]].concat(u.STATUSES.map(k => [k, u.statusShort[k], c[k]])).map(([k, l, n]) => `<button class="chip glass-lite ${f === k ? 'on' : ''}" data-f="${k}">${k !== 'all' ? `<span class="sdot s-${k}"></span>` : ''}${l}<span class="n num">${n}</span></button>`).join('');
        const list = prods.filter(p => (f === 'all' || p.status === f) && (!q || u.norm(p.name + ' ' + p.barcode).includes(u.norm(q))));
        root.querySelector('[data-list]').innerHTML = list.length ? `<div class="list">${list.map(p => `<button class="item glass-lite s-${p.status}" data-p="${p.id}">
          <span class="ic">${u.esc(u.initials(p.name))}</span>
          <span class="body"><span class="name">${u.esc(p.name)}</span><span class="meta">${u.esc(u.fmtQty(p.quantity, p.unit))}${p.category ? ' · ' + u.esc(p.category) : ''}${p.barcode ? ' · ' + u.esc(p.barcode) : ''}</span></span>
          <span class="side">${p.status === 'expired' ? '<span class="tag-exp">Vencido</span>' : `<span class="when">${u.esc(u.rel(p.days, true))}</span>`}<span class="date num">${u.fmtDate(p.expiry)}</span></span></button>`).join('')}</div>` : '<div class="empty glass-lite"><h3>Nenhum produto</h3><p>Nada com esse filtro.</p></div>';
      };
      draw();
      root.querySelector('[data-q]').addEventListener('input', u.debounce(e => { q = e.target.value; draw(); }, 120));
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-back],[data-f],[data-p]');
        if (!t) return;
        ui.tap();
        if (t.dataset.back != null) return RS.app.back();
        if (t.dataset.f) { f = t.dataset.f; return draw(); }
        const p = prods.find(x => x.id === t.dataset.p);
        const r = await RS.admin.form('Ajustar produto', [['quantity', 'Quantidade (' + p.unit + ')', '', String(p.quantity)], ['expiry', 'Validade (AAAA-MM-DD)', '', p.expiry || '']], 'Salvar', `<button class="btn danger block" data-del style="margin-top:10px">${I('trash', 18)}Excluir produto</button>`, async ctl => {
          if (await ui.confirm({ title: 'Excluir produto?', message: `“${u.esc(p.name)}” será removido do estoque desta conta.`, confirm: 'Excluir', danger: true })) {
            await api.deleteProduct(p.id); prods.splice(prods.indexOf(p), 1); ctl.close(); draw(); ui.toast('Produto excluído', { icon: 'trash' });
          }
        });
        if (!r) return;
        try {
          await api.updateProduct(p.id, { quantity: Number(String(r.quantity).replace(',', '.')) || 0, expiry: r.expiry || null });
          Object.assign(p, { quantity: Number(String(r.quantity).replace(',', '.')) || 0, expiry: r.expiry }, { days: u.daysUntil(r.expiry), status: u.status(u.daysUntil(r.expiry)) });
          draw(); ui.toast('Produto atualizado', { type: 'ok' });
        } catch (e2) { ui.toast(api.msg(e2), { type: 'err' }); }
      });
    }
  };

  /* ============================== Versões / atualizações ============================== */
  S.releases = {
    tab: 'releases',
    render() {
      return `<header class="topbar"><div class="grow"><p class="eyebrow">Atualizações do RS Stock</p><h1 class="h1">Versões</h1></div>
          <button class="icon-btn glass" data-refresh aria-label="Atualizar">${I('refresh')}</button></header>
        <button class="publish-cta" data-publish>${I('upload', 22)}<span><b>Publicar nova versão</b><small>Envie o APK — os apps vão buscar a atualização ao abrir</small></span></button>
        <div class="scroll" data-list>${ui.skeleton(3)}</div>`;
    },
    async mount(root) {
      const list = root.querySelector('[data-list]');
      const draw = () => {
        const r = cache.releases || [];
        list.innerHTML = r.length ? `<div class="list">${r.map((x, i) => `<div class="rel glass-lite ${i === 0 && x.published ? 'latest' : ''}">
          <div class="rel-top"><span class="ri" style="--tc:${x.mandatory ? '#ff3b4e' : '#7c5cff'}">${I('package', 18)}</span>
            <span class="ct"><b>v${u.esc(x.version_name)} <small class="faint">· nº ${x.version_code}</small></b><small>${dt(x.created_at)}${x.apk_size ? ' · ' + mb(x.apk_size) : ''}</small>
              <small class="faint">APK: versionCode ${x.apk_version_code ?? '—'}${x.sha256 ? ' · ' + x.sha256.slice(0, 10) + '…' : ''}</small></span>
            ${i === 0 && x.published ? '<span class="tag t-ok">Atual</span>' : ''}${!x.published ? '<span class="tag">Oculta</span>' : ''}</div>
          ${x.notes ? `<p class="rel-notes">${u.esc(x.notes).replace(/\n/g, '<br>')}</p>` : ''}
          <div class="rel-actions">
            <button class="chip glass-lite tog ${x.mandatory ? 'on' : ''}" data-mand="${x.id}">${I(x.mandatory ? 'lock' : 'zap', 14)}${x.mandatory ? 'Obrigatória' : 'Opcional'}</button>
            <button class="chip glass-lite" data-pub="${x.id}">${I(x.published ? 'eyeOff' : 'eye', 14)}${x.published ? 'Ocultar' : 'Publicar'}</button>
            <button class="chip glass-lite" data-edit="${x.id}">${I('edit', 14)}Editar</button>
            <button class="chip glass-lite" data-link="${x.id}">${I('copy', 14)}Link</button>
            <button class="chip glass-lite" data-del="${x.id}" style="color:var(--c-danger)">${I('trash', 14)}</button>
          </div></div>`).join('')}</div>` : `<div class="empty glass-lite"><div class="art">${I('package', 34)}</div><h3>Nenhuma versão ainda</h3><p>Publique o primeiro APK. Quem estiver com versão mais antiga verá o aviso de atualização.</p></div>`;
      };
      const load = async () => { try { cache.releases = await api.releases(); draw(); } catch (e) { err(list, e); } };
      if (cache.releases) draw();
      load();
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-publish],[data-refresh],[data-retry],[data-mand],[data-pub],[data-del],[data-link],[data-edit]');
        if (!t) return;
        ui.tap();
        if (t.dataset.publish != null) return publish(load);
        if (t.dataset.refresh != null || t.dataset.retry != null) return load();
        const rel = (cache.releases || []).find(x => String(x.id) === (t.dataset.mand || t.dataset.pub || t.dataset.del || t.dataset.link || t.dataset.edit));
        if (!rel) return;
        try {
          if (t.dataset.edit) {
            const r = await RS.admin.form('Editar versão', [['version_code', 'Número da versão', '', String(rel.version_code)], ['version_name', 'Nome da versão', '', rel.version_name], ['notes', 'Novidades (opcional)', '', rel.notes || '']], 'Salvar');
            if (!r) return;
            const code = parseInt(r.version_code, 10);
            if (!code) return ui.toast('Número inválido', { type: 'warn' });
            if ((cache.releases || []).some(o => o.id !== rel.id && o.version_code === code)) return ui.toast('Já existe uma versão com esse número', { type: 'warn' });
            await api.patchRelease(rel.id, { version_code: code, version_name: r.version_name, notes: r.notes });
            ui.toast('Versão atualizada', { type: 'ok' });
          }
          if (t.dataset.mand) { await api.patchRelease(rel.id, { mandatory: !rel.mandatory }); ui.toast(!rel.mandatory ? 'Agora é obrigatória' : 'Agora é opcional', { type: 'ok' }); }
          if (t.dataset.pub) { await api.patchRelease(rel.id, { published: !rel.published }); ui.toast(rel.published ? 'Versão ocultada' : 'Versão publicada', { type: 'ok' }); }
          if (t.dataset.link) { try { await navigator.clipboard.writeText(rel.apk_url); ui.toast('Link do APK copiado', { type: 'ok', icon: 'copy' }); } catch (e3) { ui.alert({ title: 'Link do APK', message: u.esc(rel.apk_url) }); } return; }
          if (t.dataset.del) {
            if (!await ui.confirm({ title: `Excluir v${u.esc(rel.version_name)}?`, message: 'O APK será apagado do servidor e a versão sai da lista de atualizações.', confirm: 'Excluir', danger: true })) return;
            await api.deleteRelease(rel); ui.toast('Versão excluída', { icon: 'trash' });
          }
          load();
        } catch (e2) { ui.toast(api.msg(e2), { type: 'err' }); }
      });
    }
  };

  function publish(done) {
    const next = Math.max(1, ...(cache.releases || []).map(r => r.version_code)) + ((cache.releases || []).length ? 1 : 1);
    let file = null, mandatory = false, info = null;
    ui.sheet({
      title: 'Publicar nova versão',
      body: `
        <label class="apk-drop glass-lite" data-drop>${I('upload', 28, 1.8)}<b data-fname>Escolher o APK</b><small data-fsize>Arquivo .apk gerado no AIDE</small>
          <input type="file" accept=".apk,application/vnd.android.package-archive,application/octet-stream" class="sr" data-file></label>
        <div class="apk-info hidden" data-info></div>
        <div class="row2" style="margin-top:14px">
          <div class="field"><label>Número da versão</label><div class="input"><input data-code type="number" inputmode="numeric" value="${next}"></div></div>
          <div class="field"><label>Nome da versão</label><div class="input"><input data-name placeholder="Ex.: 1.2.0" autocomplete="off"></div></div>
        </div>
        <p class="hint" style="margin-top:-6px">Você escolhe o número e o nome. O servidor reconhece a versão instalada pela <b>impressão digital do APK</b>, então não precisa bater com o build.gradle.</p>
        <div class="field" style="margin-top:12px"><label>Novidades (aparece para o usuário)</label><div class="input"><textarea data-notes placeholder="• Correções e melhorias"></textarea></div></div>
        <button type="button" class="cell glass-lite" data-mand style="border-radius:18px"><span class="ci" style="--cc:#ff3b4e">${I('lock', 18)}</span>
          <span class="ct"><b>Atualização obrigatória</b><small>O app fica bloqueado até a pessoa atualizar</small></span><span class="switch"></span></button>
        <div class="up-progress hidden" data-prog><div><i data-bar></i></div><small data-pt>Enviando… 0%</small></div>`,
      foot: `<button class="btn primary block" data-send>${I('upload', 20)}Enviar e publicar</button>`,
      onMount(el, ctl) {
        const $ = s => ctl.$(s);
        $('[data-file]').addEventListener('change', async e => {
          file = e.target.files && e.target.files[0];
          info = null;
          if (!file) return;
          $('[data-fname]').textContent = file.name;
          $('[data-fsize]').textContent = mb(file.size) + ' · lendo o APK…';
          $('[data-drop]').classList.add('picked');
          const box = $('[data-info]');
          box.classList.remove('hidden');
          box.innerHTML = '<span class="spinner sm"></span> Lendo versão e impressão digital…';
          try {
            info = await RS.apk.inspect(file);
            $('[data-fsize]').textContent = mb(file.size);
            const rels = cache.releases || [];
            const dup = rels.find(r => r.sha256 && r.sha256 === info.sha256);
            const lastApk = Math.max(0, ...rels.filter(r => r.published && r.apk_version_code).map(r => r.apk_version_code));
            const wrongPkg = info.packageName && info.packageName !== RS.config.targetPackage;
            const warns = [];
            if (wrongPkg) warns.push(`<p class="w-err">${I('alert', 14)} Este APK é de outro app (${u.esc(info.packageName)}). Envie o APK do RS Stock (${RS.config.targetPackage}).</p>`);
            if (dup) warns.push(`<p class="w-err">${I('alert', 14)} Este mesmo APK já foi publicado como v${u.esc(dup.version_name)}.</p>`);
            if (info.versionCode && lastApk && info.versionCode < lastApk) warns.push(`<p class="w-warn">${I('alert', 14)} O versionCode deste APK (${info.versionCode}) é menor que o da última versão publicada (${lastApk}). O Android não instala versão menor por cima — aumente o versionCode no build.gradle.</p>`);
            box.innerHTML = `<div class="apk-grid">
                <div><small>Pacote</small><b>${u.esc(info.packageName || '—')}</b></div>
                <div><small>versionCode do APK</small><b class="num">${info.versionCode ?? '—'}</b></div>
                <div><small>versionName do APK</small><b>${u.esc(info.versionName || '—')}</b></div>
                <div><small>Impressão digital</small><b class="num">${info.sha256.slice(0, 12)}…</b></div></div>${warns.join('')}`;
            info.blocked = !!(wrongPkg || dup);
            if (!$('[data-name]').dataset.touched) $('[data-name]').value = info.versionName || '';
            const suggested = Math.max(next, info.versionCode || 0);
            if (!$('[data-code]').dataset.touched) $('[data-code]').value = suggested;
          } catch (err2) {
            box.innerHTML = `<p class="w-warn">${I('alert', 14)} ${u.esc(err2.message)} — preencha a versão manualmente.</p>`;
            info = { sha256: null, versionCode: null, packageName: '', blocked: false };
          }
        });
        ['[data-code]', '[data-name]'].forEach(sel => $(sel).addEventListener('input', e => { e.target.dataset.touched = '1'; }));
        $('[data-mand]').onclick = () => { ui.tap(); mandatory = !mandatory; $('[data-mand] .switch').classList.toggle('on', mandatory); };
        $('[data-send]').onclick = async () => {
          const code = parseInt($('[data-code]').value, 10), name = $('[data-name]').value.trim();
          if (!file) return ui.toast('Escolha o arquivo APK', { type: 'warn' });
          if (!info) return ui.toast('Aguarde a leitura do APK', { type: 'warn' });
          if (info.blocked) return ui.toast('Corrija o aviso em vermelho antes de publicar', { type: 'err' });
          if (!code || !name) return ui.toast('Preencha o código e o nome da versão', { type: 'warn' });
          if ((cache.releases || []).some(r => r.version_code === code)) return ui.toast('Já existe uma versão com esse código', { type: 'warn' });
          const btn = $('[data-send]'); btn.disabled = true;
          $('[data-prog]').classList.remove('hidden');
          const setP = p => { $('[data-bar]').style.width = p + '%'; $('[data-pt]').textContent = p < 100 ? `Enviando… ${p}%` : 'Publicando…'; };
          try {
            const path = `rsstock-${code}-${Date.now()}.apk`;
            const url = await api.uploadApk(file, path, setP);
            const me = RS.admin.me || {};
            await api.saveRelease({ version_code: code, version_name: name, notes: $('[data-notes]').value.trim(), mandatory, apk_path: path, apk_url: url, apk_size: file.size, published: true, created_by: me.id || null,
              sha256: info.sha256, apk_version_code: info.versionCode, package_name: info.packageName || null });
            ctl.close();
            ui.toast(`v${name} publicada${mandatory ? ' como obrigatória' : ''}`, { type: 'ok', icon: 'check', duration: 3500 });
            done();
          } catch (e) {
            btn.disabled = false;
            $('[data-pt]').textContent = 'Erro: ' + api.msg(e);
            ui.toast(api.msg(e), { type: 'err' });
          }
        };
      }
    });
  }

  /* ============================== Ajustes ============================== */
  S.settings = {
    tab: 'settings',
    render() {
      const me = RS.admin.me || {};
      const dark = RS.admin.theme() === 'dark';
      return `<header class="topbar"><div class="grow"><p class="eyebrow">RS Admin</p><h1 class="h1">Ajustes</h1></div></header>
        <div class="scroll flexcol">
          <div class="me-card" style="cursor:default">${avatar(me, 60)}<span class="ct"><b>@${u.esc(me.nick || '')}</b><span class="meta"><span>Administrador</span><span>${internal(me.email) ? 'login por nick' : u.esc(me.email || '')}</span></span></span></div>
          <div class="group-label">Aparência</div>
          <div class="seg"><button class="${dark ? 'on' : ''}" data-theme="dark">${I('moon', 16)}Escuro</button><button class="${!dark ? 'on' : ''}" data-theme="light">${I('sun', 16)}Claro</button></div>
          <div class="group-label">Sobre</div>
          <div class="rows glass-lite">
            <div class="row static"><span class="ri" style="--tc:#7c5cff">${I('info', 16)}</span><span class="ct"><b>RS Admin ${RS.config.version}</b><small>Painel do RS Stock · FlowLabs Studio</small></span></div>
            <div class="row static"><span class="ri" style="--tc:#10b981">${I('db', 16)}</span><span class="ct"><b>Servidor</b><small>Supabase · projeto RSStock</small></span></div>
            <div class="row static"><span class="ri" style="--tc:#f59e0b">${I('shield', 16)}</span><span class="ct"><b>Segurança</b><small>Ações sensíveis rodam no servidor e conferem se você é admin</small></span></div>
          </div>
          <button class="btn danger block" data-out style="margin-top:20px">${I('logout', 18)}Sair do painel</button>
        </div>`;
    },
    mount(root) {
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-theme],[data-out]');
        if (!t) return;
        ui.tap();
        if (t.dataset.theme) { RS.admin.setTheme(t.dataset.theme); return RS.app.refresh(); }
        if (await ui.confirm({ title: 'Sair do painel?', message: 'Você precisará entrar de novo para administrar.', confirm: 'Sair', danger: true, icon: 'logout' })) {
          await api.signOut(); cache.accounts = cache.stats = cache.releases = null; RS.app.start('login');
        }
      });
    }
  };
})();
