/* Lojas: trocar de loja, criar, editar e excluir — cada loja tem seu próprio estoque. */
(function () {
  const u = RS.u, ui = RS.ui, s = RS.store;
  const I = ui.icon;

  function storeBadge(st, size = 40) {
    return `<span class="store-ic" style="--stc:${st.color};width:${size}px;height:${size}px">${u.esc(u.initials(st.name))}</span>`;
  }
  RS.storeBadge = storeBadge;

  function statsLine(c) {
    return `${u.plural(c.total, 'produto', 'produtos')}${c.expired ? ' · <b class="txt-exp">' + c.expired + ' vencido' + (c.expired > 1 ? 's' : '') + '</b>' : ''}${c.soon ? ' · <b style="color:var(--c-soon)">' + c.soon + ' em &lt;7 dias</b>' : ''}`;
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
          <button class="icon-btn glass" data-new aria-label="Nova loja">${I('plus')}</button></header>
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
              <div class="mini-legend">${u.STATUSES.map(k => `<span class="s-${k}"><span class="sdot"></span>${c[k]}</span>`).join('')}<span class="faint" style="margin-left:auto">${u.plural(c.total, 'produto', 'produtos')}</span></div>
              <div class="btn-row" style="margin-top:12px">
                <button class="btn ghost sm" data-edit="${st.id}">${I('edit', 16)}Editar</button>
                <button class="btn ${on ? 'ghost' : 'primary'} sm" data-open="${st.id}" ${on ? 'disabled' : ''}>${I('home', 16)}${on ? 'Aberta' : 'Abrir'}</button>
              </div></div>`;
          }).join('') : `<div class="empty glass-lite"><div class="art">${I('home', 36)}</div><h3>Nenhuma loja</h3><p>Crie lojas como “Mercado Rio Sul” ou “Guanabara”. Cada uma tem seu próprio estoque.</p><button class="btn primary" data-new>${I('plus', 18)}Criar loja</button></div>`}
        </div>`;
    },
    mount(root) {
      root.addEventListener('click', e => {
        const t = e.target.closest('[data-back],[data-new],[data-edit],[data-open]');
        if (!t) return;
        ui.tap();
        if (t.dataset.back != null) return RS.app.back();
        if (t.dataset.new != null) return form();
        if (t.dataset.edit) return form(s.stores.find(x => x.id === t.dataset.edit));
        if (t.dataset.open) { switchTo(t.dataset.open).then(() => RS.app.back()); }
      });
      this._off = s.on(w => { if (w === 'stores') RS.app.refresh(); });
    },
    unmount() { if (this._off) this._off(); }
  };

  RS.stores = { picker, form, switchTo };
})();
