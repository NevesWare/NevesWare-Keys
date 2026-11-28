/* Lojas: trocar de loja, criar, editar e excluir — cada loja tem seu próprio estoque. */
(function () {
  const u = RS.u, ui = RS.ui, s = RS.store;
  const I = ui.icon;

  function storeBadge(st, size = 40) {
    return `<span class="store-ic" style="--stc:${st.color};width:${size}px;height:${size}px">${u.esc(u.initials(st.name))}</span>`;
  }
  RS.storeBadge = storeBadge;

  function statsLine(c) {
    return `${u.plural(c.total, 'produto', 'produtos')}${c.expired ? ' · <span class="txt-exp" style="font-weight:700">' + c.expired + ' vencido' + (c.expired > 1 ? 's' : '') + '</span>' : ''}${c.soon ? ' · <span style="color:var(--c-soon);font-weight:700">' + c.soon + ' em &lt;7 dias</span>' : ''}`;
  }

  /* Folha para trocar de loja rapidamente */
  function picker() {
    return new Promise(resolve => {
      let picked = null;
      ui.sheet({
        title: 'Suas lojas',
        body: `<div class="menu">${s.stores.map(st => {
          const c = s.storeCounts(st.id), on = st.id === s.settings.currentStoreId;
          return `<button class="cell ${on ? 'on' : ''}" data-pick="${st.id}">${storeBadge(st, 38)}
            <span class="ct"><b>${u.esc(st.name)}</b><small>${statsLine(c)}</small></span>
            <span class="cv">${on ? I('check', 20, 2.4) : ''}</span></button>`;
        }).join('')}</div>`,
        foot: `<div class="btn-row"><button class="btn ghost" data-manage>${I('sliders', 18)}Gerenciar</button><button class="btn primary" data-new>${I('plus', 18)}Nova loja</button></div>`,
        onMount(el, ctl) {
          el.addEventListener('click', e => {
            const p = e.target.closest('[data-pick]');
            if (p) { ui.tap(); picked = p.dataset.pick; ctl.close(); return; }
            if (e.target.closest('[data-new]')) { ui.tap(); ctl.close(); setTimeout(() => form(), 300); }
            if (e.target.closest('[data-manage]')) { ui.tap(); ctl.close(); setTimeout(() => RS.app.go('stores'), 250); }
          });
        },
        onClose() {
          if (picked && picked !== s.settings.currentStoreId) switchTo(picked);
          resolve(picked);
        }
      });
    });
  }

  async function switchTo(id) {
    const st = s.stores.find(x => x.id === id);
    const L = ui.loading('Abrindo estoque', st ? st.name : '');
    s.setCurrent(id);
    L.step('Carregando produtos…', 70);
    await L.done(650);
    RS.app.refresh();
    ui.toast('Estoque: ' + (st ? st.name : ''), { type: 'ok', icon: 'home' });
    if (RS.fx) RS.fx.burst(innerWidth / 2, 90);
  }

  /* Criar / editar loja */
  function form(existing) {
    const isNew = !existing;
    const st = RS.Store(existing || { color: s.STORE_COLORS[s.stores.length % s.STORE_COLORS.length], name: '' });
    return new Promise(resolve => {
      let saved = null;
      ui.sheet({
        title: isNew ? 'Nova loja' : 'Editar loja',
        body: `
          <div style="display:flex;justify-content:center;margin:4px 0 18px" data-prev>${storeBadge(Object.assign({}, st, { name: st.name || 'Nova loja' }), 64)}</div>
          <div class="field" data-f="name"><label>Nome da loja</label><div class="input"><span class="lead">${I('home', 18)}</span>
            <input name="name" value="${u.esc(st.name)}" placeholder="Ex.: Mercado Rio Sul" maxlength="50" autocomplete="off"></div>
            <p class="err-msg hidden">Informe o nome da loja.</p></div>
          <div class="field"><label class="label">Endereço / unidade <span class="opt">opcional</span></label><div class="input"><span class="lead">${I('pin', 18)}</span>
            <input name="address" value="${u.esc(st.address)}" placeholder="Ex.: Av. Brasil, 1500" maxlength="80" autocomplete="off"></div></div>
          <div class="field"><label>Cor</label><div class="swatches">${s.STORE_COLORS.map(c => `<button type="button" class="swatch ${c === st.color ? 'on' : ''}" data-color="${c}" style="--a:${c};--b:${c}"></button>`).join('')}</div></div>
          ${isNew ? '' : `<p class="hint" style="text-align:center">${statsLine(s.storeCounts(st.id))}</p>`}`,
        foot: isNew ? `<button class="btn primary block" data-save>${I('check', 20)}Criar loja</button>`
          : `<div class="btn-row"><button class="btn danger sm" data-del style="flex:.5" aria-label="Excluir loja">${I('trash', 18)}</button><button class="btn primary" data-save>${I('check', 20)}Salvar</button></div>`,
        onMount(el, ctl) {
          const name = ctl.$('[name="name"]');
          let color = st.color;
          const prev = () => { ctl.$('[data-prev]').innerHTML = storeBadge({ name: name.value || 'Nova loja', color }, 64); };
          name.addEventListener('input', prev);
          if (isNew) setTimeout(() => name.focus(), 420);
          el.addEventListener('click', async e => {
            const c = e.target.closest('[data-color]');
            if (c) { ui.tap(); color = c.dataset.color; ctl.$$('[data-color]').forEach(x => x.classList.toggle('on', x === c)); prev(); return; }
            if (e.target.closest('[data-save]')) {
              if (!name.value.trim()) { ctl.$('[data-f="name"]').classList.add('err'); ctl.$('[data-f="name"] .err-msg').classList.remove('hidden'); ui.tap(30); return; }
              ui.tap();
              saved = await s.saveStore({ id: st.id, name: name.value.trim(), address: ctl.$('[name="address"]').value.trim(), color });
              ctl.close();
              ui.toast(isNew ? `Loja “${saved.name}” criada` : 'Loja atualizada', { type: 'ok', icon: 'home' });
              if (RS.fx) RS.fx.burst(innerWidth / 2, innerHeight / 2);
              if (isNew) {
                const go = await ui.confirm({ title: 'Abrir o estoque desta loja?', message: `Você poderá trocar de loja a qualquer momento pelo topo da tela inicial.`, confirm: 'Abrir', cancel: 'Depois', icon: 'home' });
                if (go) switchTo(saved.id); else RS.app.refresh();
              } else RS.app.refresh();
              return;
            }
            if (e.target.closest('[data-del]')) {
              const ok = await removeFlow(st);
              if (ok) ctl.close();
            }
          });
        },
        onClose() { resolve(saved); }
      });
    });
  }

  async function removeFlow(st) {
    const c = s.storeCounts(st.id);
    const ok = await ui.confirm({
      title: `Excluir “${u.esc(st.name)}”?`,
      message: `A loja e ${u.plural(c.total, 'produto do estoque dela será apagado', 'produtos do estoque dela serão apagados')}. Essa ação fica registrada no histórico e não pode ser desfeita.`,
      confirm: 'Excluir loja', danger: true, icon: 'trash'
    });
    if (!ok) return false;
    const L = ui.loading('Excluindo loja', st.name);
    await s.removeStore(st.id);
    await L.done(700);
    ui.toast('Loja excluída', { icon: 'trash' });
    RS.app.refresh();
    return true;
  }

  /* Tela "Minhas lojas" */
  RS.screens.stores = {
    tab: 'settings',
    bar: false,
    render() {
      return `
        <header class="topbar"><button class="icon-btn glass" data-back aria-label="Voltar">${I('back')}</button>
          <div class="grow"><h1 class="page-title">Minhas lojas</h1></div>
          <button class="icon-btn glass" data-join aria-label="Entrar com código">${I('key')}</button>
          <button class="icon-btn glass" data-import aria-label="Importar loja">${I('download')}</button>
          <button class="icon-btn glass" data-new aria-label="Nova loja">${I('plus')}</button></header>
        <input type="file" accept="application/json,.json,.rsstock" data-file class="sr">
        <div class="scroll stagger">
          ${s.stores.length ? s.stores.map(st => {
            const c = s.storeCounts(st.id), on = st.id === s.settings.currentStoreId;
            return `<div class="card glass-lite store-card ${on ? 'on' : ''}" style="--stc:${st.color}">
              <div style="display:flex;align-items:center;gap:14px">
                ${storeBadge(st, 48)}
                <div style="flex:1;min-width:0"><b class="store-name">${u.esc(st.name)}</b>
                  <small class="muted" style="display:block;font-size:.78rem">${st.address ? u.esc(st.address) : 'Sem endereço'}</small></div>
                ${on ? '<span class="soon-tag">Aberta</span>' : ''}
              </div>
              ${s.isShared(st.id) || s.role(st.id) !== 'owner' ? `<div class="team-line">${I('user', 14)}<span>${s.role(st.id) === 'owner' ? 'Compartilhada com ' + u.plural(s.membersOf(st.id).length - 1, 'pessoa', 'pessoas') : 'Loja de equipe · você é ' + ROLE[s.role(st.id)]}</span>${RS.repo.status.live ? '<i class="live-dot"></i>ao vivo' : ''}</div>` : ''}
              <div class="mini-legend">${u.STATUSES.map(k => `<span class="s-${k}"><span class="sdot"></span>${c[k]}</span>`).join('')}<span class="faint" style="margin-left:auto">${u.plural(c.total, 'produto', 'produtos')}</span></div>
              <div class="btn-row" style="margin-top:12px">
                <button class="btn ghost sm" data-team="${st.id}" aria-label="Equipe">${I('user', 16)}Equipe</button>
                <button class="btn ghost sm" data-more="${st.id}" aria-label="Mais opções" style="flex:.45">${I('sliders', 16)}</button>
                <button class="btn ghost sm" data-edit="${st.id}" ${s.canEdit(st.id) ? '' : 'disabled'}>${I('edit', 16)}Editar</button>
                <button class="btn ${on ? 'ghost' : 'primary'} sm" data-open="${st.id}" ${on ? 'disabled' : ''}>${I('home', 16)}${on ? 'Aberta' : 'Abrir'}</button>
              </div></div>`;
          }).join('') : `<div class="empty glass-lite"><div class="art">${I('home', 36)}</div><h3>Nenhuma loja</h3><p>Crie lojas como “Mercado Rio Sul” ou “Guanabara”. Cada uma tem seu próprio estoque.</p><button class="btn primary" data-new>${I('plus', 18)}Criar loja</button></div>`}
        </div>`;
    },
    mount(root) {
      root.addEventListener('click', e => {
        const t = e.target.closest('[data-back],[data-new],[data-edit],[data-open],[data-team],[data-more],[data-join],[data-import]');
        if (!t) return;
        ui.tap();
        if (t.dataset.back != null) return RS.app.back();
        if (t.dataset.new != null) return form();
        if (t.dataset.join != null) return joinFlow();
        if (t.dataset.import != null) return root.querySelector('[data-file]').click();
        if (t.dataset.team) return team(t.dataset.team);
        if (t.dataset.more) return moreMenu(t.dataset.more);
        if (t.dataset.edit) return form(s.stores.find(x => x.id === t.dataset.edit));
        if (t.dataset.open) { switchTo(t.dataset.open).then(() => RS.app.back()); }
      });
      root.querySelector('[data-file]').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) importFlow(f); });
      this._off = s.on(w => { if (w === 'stores' || w === 'all') RS.app.refresh(); });
    },
    unmount() { if (this._off) this._off(); }
  };

  /* ================= Equipe (loja online compartilhada) ================= */
  const ROLE = { owner: 'dono', editor: 'editor', viewer: 'visualizador' };
  const ROLE_DESC = { owner: 'Controle total e convites', editor: 'Cadastra, edita, dá baixa e faz a ronda', viewer: 'Só consulta o estoque' };

  function needAccount() {
    if (RS.auth.isUser()) return false;
    ui.alert({ title: 'Entre na sua conta', message: 'A loja online compartilhada usa a nuvem. Entre ou crie uma conta (só nick e senha) em Ajustes › Conta para convidar pessoas ou participar de uma loja.', icon: 'cloud' });
    return true;
  }
  const errMsg = e => {
    const m = (e && e.message) || '';
    if (/function|does not exist|schema cache|PGRST202/i.test(m)) return 'O servidor ainda não foi atualizado para equipes. Peça ao administrador para aplicar a atualização do banco (migração 002).';
    if (/fetch|network|Failed/i.test(m)) return 'Sem conexão com a internet.';
    return m || 'Algo deu errado.';
  };

  function team(storeId) {
    const st = s.find(storeId);
    if (!st || needAccount()) return;
    const role = s.role(storeId), owner = role === 'owner';
    const myId = (RS.auth.session() || {}).id;
    let offT = null;
    const list = () => {
      const m = s.membersOf(storeId).slice().sort((a, b) => (a.role === 'owner' ? -1 : b.role === 'owner' ? 1 : 0));
      if (!m.length) return `<p class="hint" style="text-align:center">Só você por enquanto.</p>`;
      return `<div class="menu">${m.map(x => `<button class="cell" data-member="${x.userId}" ${owner && x.role !== 'owner' ? '' : 'data-static'}>
        <span class="ci" style="--cc:rgba(var(--accent-rgb),.18);color:var(--accent)">${u.esc(u.initials(x.nick || '?'))}</span>
        <span class="ct"><b>${u.esc(x.nick || 'Participante')}${x.userId === myId ? ' (você)' : ''}</b><small>${u.esc(ROLE[x.role] || x.role)} · ${u.esc(ROLE_DESC[x.role] || '')}</small></span>
        <span class="cv">${owner && x.role !== 'owner' ? I('chev', 18) : ''}</span></button>`).join('')}</div>`;
    };
    ui.sheet({
      title: 'Equipe · ' + st.name,
      body: `
        <div class="card glass-lite invite-card">
          <small class="muted">Código de convite</small>
          <b class="invite-code num" data-code>${st.inviteCode ? u.esc(st.inviteCode) : '<span class="spinner sm"></span>'}</b>
          <p class="hint" style="margin:6px 0 12px">Quem entrar com este código passa a ver e atualizar <b>este mesmo estoque</b> em tempo real — o que um muda, aparece para todos.</p>
          <div class="btn-row">
            <button class="btn ghost sm" data-copy>${I('copy', 16)}Copiar</button>
            <button class="btn primary sm" data-share>${I('share', 16)}Enviar convite</button></div>
          ${owner ? `<button class="link" data-reset style="margin-top:12px">${I('refresh', 14)} Trocar código (o antigo para de funcionar)</button>` : ''}
        </div>
        <div class="group-label">Participantes</div>
        <div data-list>${list()}</div>
        ${owner ? '' : `<button class="btn danger sm block" data-leave style="margin-top:16px">${I('logout', 18)}Sair desta loja</button>`}`,
      onMount(el, ctl) {
        let code = st.inviteCode || '';
        const show = c => { code = c; st.inviteCode = c; ctl.$('[data-code]').textContent = c || '—'; };
        const load = async reset => {
          try { show(await RS.repo.invite(storeId, reset)); if (reset) ui.toast('Novo código gerado', { type: 'ok', icon: 'key' }); }
          catch (e) { ctl.$('[data-code]').textContent = '—'; ui.toast(errMsg(e), { type: 'err', duration: 5000 }); }
        };
        if (!code && role !== 'viewer') load(false);
        offT = s.on(w => { if (w === 'all' || w === 'stores') { const box = ctl.$('[data-list]'); if (box) box.innerHTML = list(); } });
        el.addEventListener('click', async e => {
          const t = e.target.closest('[data-copy],[data-share],[data-reset],[data-leave],[data-member]');
          if (!t || t.hasAttribute('data-static')) return;
          ui.tap();
          const msg = `Entre na minha loja “${st.name}” no RS Stock 📦\n\nCódigo: ${code}\n\nNo app: Ajustes › Minhas lojas › 🔑 Entrar com código.`;
          if (t.dataset.copy != null) { if (!code) return; RS.native.copyText ? RS.native.copyText(code) : navigator.clipboard.writeText(code); ui.toast('Código copiado', { type: 'ok', icon: 'copy' }); }
          else if (t.dataset.share != null) { if (code) RS.native.shareText(msg, 'Convite RS Stock'); }
          else if (t.dataset.reset != null) {
            if (await ui.confirm({ title: 'Trocar o código?', message: 'Quem já participa continua. O código antigo deixa de funcionar para novas entradas.', confirm: 'Trocar', icon: 'key' })) load(true);
          } else if (t.dataset.leave != null) {
            if (!(await ui.confirm({ title: 'Sair da loja?', message: `Você deixa de ver o estoque de “${u.esc(st.name)}”. Os dados continuam para o resto da equipe.`, confirm: 'Sair', danger: true, icon: 'logout' }))) return;
            const L = ui.loading('Saindo da loja', st.name);
            await s.removeStore(storeId); await L.done(600);
            ctl.close(); RS.app.refresh();
          } else if (t.dataset.member) memberMenu(storeId, t.dataset.member, () => { const box = ctl.$('[data-list]'); if (box) box.innerHTML = list(); });
        });
      },
      onClose() { if (offT) offT(); }
    });
  }

  async function memberMenu(storeId, userId, redraw) {
    const m = s.membersOf(storeId).find(x => x.userId === userId);
    if (!m) return;
    const v = await ui.menu({ title: m.nick || 'Participante', value: m.role, options: [
      { value: 'editor', label: 'Editor', desc: ROLE_DESC.editor, icon: 'edit' },
      { value: 'viewer', label: 'Visualizador', desc: ROLE_DESC.viewer, icon: 'eye' },
      { value: 'remove', label: 'Remover da equipe', desc: 'Perde o acesso a esta loja', icon: 'trash', color: '#ef4444' }
    ] });
    if (!v || v === m.role) return;
    try {
      if (v === 'remove') {
        if (!(await ui.confirm({ title: 'Remover ' + u.esc(m.nick || 'participante') + '?', message: 'Ele deixa de ver e editar esta loja.', confirm: 'Remover', danger: true }))) return;
        await RS.repo.removeMember(storeId, userId);
        s.members[storeId] = s.membersOf(storeId).filter(x => x.userId !== userId);
        s.log('team', 'Equipe', (m.nick || 'Participante') + ' removido', storeId);
      } else {
        await RS.repo.setMemberRole(storeId, userId, v); m.role = v;
        s.log('team', 'Equipe', (m.nick || 'Participante') + ' agora é ' + ROLE[v], storeId);
      }
      await s.persist(); redraw();
      ui.toast('Equipe atualizada', { type: 'ok', icon: 'user' });
    } catch (e) { ui.toast(errMsg(e), { type: 'err', duration: 5000 }); }
  }

  function joinFlow() {
    if (needAccount()) return;
    ui.sheet({
      title: 'Entrar em uma loja',
      body: `<p class="hint" style="margin:0 4px 14px">Digite o código de convite que o dono da loja te enviou. Vocês passam a usar o mesmo estoque, atualizado ao vivo.</p>
        <div class="field" data-f="code"><div class="input"><span class="lead">${I('key', 18)}</span>
          <input name="code" placeholder="Ex.: 7F3A9C" maxlength="12" autocomplete="off" autocapitalize="characters" style="text-transform:uppercase;letter-spacing:.2em;font-weight:700"></div>
          <p class="err-msg hidden"></p></div>`,
      foot: `<button class="btn primary block" data-go>${I('check', 20)}Entrar na loja</button>`,
      onMount(el, ctl) {
        const inp = ctl.$('[name="code"]');
        setTimeout(() => inp.focus(), 400);
        const err = m => { ctl.$('[data-f="code"]').classList.add('err'); const p = ctl.$('.err-msg'); p.textContent = m; p.classList.remove('hidden'); };
        ctl.$('[data-go]').onclick = async () => {
          const code = inp.value.trim().toUpperCase();
          if (code.length < 4) return err('Código muito curto.');
          ui.tap();
          const L = ui.loading('Entrando na loja', 'Conferindo o código…');
          try {
            const r = await RS.repo.join(code);
            L.step('Baixando o estoque da equipe…', 70);
            await s.syncNow(true);
            await L.done(600);
            ctl.close();
            if (r && r.id && s.find(r.id)) { s.setCurrent(r.id); RS.app.refresh(); }
            ui.toast('Você entrou em “' + ((r && r.name) || 'loja') + '”', { type: 'ok', icon: 'user' });
            if (RS.fx) RS.fx.burst(innerWidth / 2, innerHeight / 2);
          } catch (e) { await L.done(200); err(/inválido/i.test(e.message || '') ? 'Código inválido ou trocado pelo dono.' : errMsg(e)); }
        };
      }
    });
  }

  /* ================= Exportar / importar loja ================= */
  async function moreMenu(storeId) {
    const st = s.find(storeId);
    if (!st) return;
    const owner = s.role(storeId) === 'owner';
    const v = await ui.menu({ title: st.name, options: [
      { value: 'export', label: 'Exportar loja (arquivo)', desc: 'Gera um arquivo com todos os produtos para importar em outro aparelho', icon: 'upload' },
      { value: 'share', label: 'Enviar arquivo da loja', desc: 'WhatsApp, e-mail, Drive…', icon: 'share' },
      { value: 'round', label: 'Ronda semanal', desc: 'Conferir as validades desta semana', icon: 'check' },
      { value: 'loss', label: 'Relatório de perdas', desc: 'Vencidos e avarias com valor', icon: 'alert' },
      owner ? { value: 'del', label: 'Excluir loja', desc: 'Apaga a loja e o estoque', icon: 'trash', color: '#ef4444' }
        : { value: 'leave', label: 'Sair desta loja', desc: 'Os dados continuam para a equipe', icon: 'logout', color: '#ef4444' }
    ] });
    if (!v) return;
    if (v === 'export' || v === 'share') return exportStoreFile(storeId, v === 'share' ? 'share' : 'save');
    if (v === 'round') { s.setCurrent(storeId); return RS.app.go('round'); }
    if (v === 'loss') return RS.app.go('losses', { storeId });
    if (v === 'del') return removeFlow(st);
    if (v === 'leave') return team(storeId);
  }

  async function exportStoreFile(storeId, mode) {
    const data = s.exportStore(storeId);
    if (!data) return;
    const L = ui.loading('Exportando loja', data.store.name);
    const safe = data.store.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '') || 'loja';
    const json = JSON.stringify(data, null, 1);
    L.step(u.plural(data.products.length, 'produto', 'produtos'), 60);
    const r = await RS.native.exportFile(btoa(unescape(encodeURIComponent(json))), 'application/json', 'Loja-' + safe + '.rsstock.json', mode);
    await L.done(500);
    if (r && r.ok) ui.toast(mode === 'share' ? 'Arquivo pronto para enviar' : 'Loja exportada' + (r.where ? ' em ' + r.where : ''), { type: 'ok', icon: 'upload' });
    else if (r && !r.cancelled) ui.toast((r && r.error) || 'Falha ao exportar', { type: 'err' });
  }

  function importFlow(file) {
    const rd = new FileReader();
    rd.onload = async () => {
      let data;
      try { data = JSON.parse(rd.result); } catch (e) { data = null; }
      if (!data || data.format !== 'rsstock-store' || !Array.isArray(data.products)) {
        return ui.alert({ title: 'Arquivo não reconhecido', message: 'Escolha um arquivo de loja exportado pelo RS Stock (Loja-….rsstock.json). Para o backup completo use Ajustes › Dados.', icon: 'alert' });
      }
      const name = (data.store && data.store.name) || 'Loja importada';
      const cur = s.current();
      const opts = [{ value: 'new', label: 'Criar nova loja “' + name + '”', desc: u.plural(data.products.length, 'produto', 'produtos') + ' com validade, quantidade e código', icon: 'plus' }];
      if (cur && s.canEdit(cur.id)) opts.push({ value: 'merge', label: 'Adicionar em “' + cur.name + '”', desc: 'Junta os produtos ao estoque da loja aberta', icon: 'layers' });
      const mode = await ui.menu({ title: 'Importar loja', options: opts });
      if (!mode) return;
      const L = ui.loading('Importando loja', name);
      try {
        const r = await s.importStore(data, { mode, targetId: cur && cur.id });
        L.step(u.plural(r.count, 'produto importado', 'produtos importados'), 90);
        await L.done(700);
        if (mode === 'new') s.setCurrent(r.store.id);
        RS.app.refresh();
        ui.toast(u.plural(r.count, 'produto importado', 'produtos importados') + ' em “' + r.store.name + '”', { type: 'ok', icon: 'download' });
        if (RS.fx) RS.fx.burst(innerWidth / 2, innerHeight / 2);
      } catch (e) { await L.done(100); ui.toast(e.message || 'Falha ao importar', { type: 'err' }); }
    };
    rd.readAsText(file);
  }

  RS.stores = { picker, form, switchTo, team, joinFlow, exportStoreFile, importFlow };
})();
