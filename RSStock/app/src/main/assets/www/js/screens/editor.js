/* Cadastro/edição de produto e folha de detalhes. */
(function () {
  const u = RS.u, ui = RS.ui, s = RS.store, cfg = RS.config;

  const QUICK = [['+7 dias', () => u.addDays(7)], ['+15 dias', () => u.addDays(15)], ['+30 dias', () => u.addDays(30)],
    ['+3 meses', () => u.addMonths(3)], ['+6 meses', () => u.addMonths(6)], ['+1 ano', () => u.addMonths(12)]];

  function categories() {
    const used = s.products.map(p => p.category).filter(Boolean);
    return Array.from(new Set(cfg.categories.concat(used)));
  }

  function preview(iso) {
    if (!iso) return `<span class="faint">Escolha a data ou use um atalho acima.</span>`;
    const d = u.daysUntil(iso), st = u.status(d);
    return `<span class="pill s-${st}"><span class="sdot"></span>${u.esc(u.rel(d))}</span><span class="faint">${u.fmtLong(iso)}</span>`;
  }

  function form(p, isNew) {
    const cats = categories();
    const hasMore = p.batch || p.location || p.notes;
    return `
      <div class="field" data-f="name">
        <label>Nome do produto</label>
        <div class="input"><span class="lead">${ui.icon('tag', 18)}</span>
          <input name="name" value="${u.esc(p.name)}" placeholder="Ex.: Leite integral 1L" autocomplete="off" enterkeyhint="next" maxlength="80"></div>
        <p class="err-msg hidden">Informe o nome do produto.</p>
      </div>

      <div class="field">
        <label class="label">Código de barras <span class="opt">opcional</span></label>
        <div class="input"><span class="lead">${ui.icon('hash', 18)}</span>
          <input name="barcode" value="${u.esc(p.barcode)}" placeholder="Digite ou escaneie" inputmode="numeric" autocomplete="off" maxlength="48">
          <button class="act" type="button" data-act="scan" aria-label="Escanear">${ui.icon('scan', 18)}</button></div>
        <p class="hint hidden" data-bc-hint></p>
      </div>

      <div class="field" data-f="expiry">
        <label>Data de validade</label>
        <div class="input"><span class="lead">${ui.icon('calendar', 18)}</span>
          <input name="expiry" type="date" value="${u.esc(p.expiry)}"></div>
        <div class="quick-dates row">${QUICK.map((q, i) => `<button type="button" class="chip glass-lite" data-quick="${i}">${q[0]}</button>`).join('')}</div>
        <div class="date-preview" data-preview>${preview(p.expiry)}</div>
        <p class="err-msg hidden">Escolha a data de validade.</p>
      </div>

      <div class="field">
        <label>Quantidade</label>
        <div class="row2">
          <div class="stepper"><button type="button" data-step="-1" aria-label="Diminuir">${ui.icon('minus', 18)}</button>
            <input name="quantity" type="number" inputmode="decimal" min="0" step="any" value="${u.esc(p.quantity)}">
            <button type="button" data-step="1" aria-label="Aumentar">${ui.icon('plus', 18)}</button></div>
          <div class="input" style="padding-right:12px"><select name="unit" aria-label="Unidade">${cfg.units.map(x => `<option ${x === p.unit ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
        </div>
      </div>

      <div class="field">
        <label class="label">Categoria <span class="opt">opcional</span></label>
        <div class="chips" data-cats style="padding-top:0">
          ${cats.map(c => `<button type="button" class="chip glass-lite ${c === p.category ? 'on' : ''}" data-cat="${u.esc(c)}">${u.esc(c)}</button>`).join('')}
          <button type="button" class="chip glass-lite" data-act="newcat">${ui.icon('plus', 16)}Nova</button>
        </div>
        <input type="hidden" name="category" value="${u.esc(p.category)}">
      </div>

      <button type="button" class="cell glass-lite" data-act="more" style="border-radius:18px;min-height:54px">
        <span class="ct"><b style="font-size:.9rem">Mais detalhes</b><small>Lote, local de armazenamento e observações</small></span>
        <span class="cv" data-more-ic>${ui.icon(hasMore ? 'down' : 'chev', 20)}</span>
      </button>
      <div data-more class="${hasMore ? '' : 'hidden'}" style="margin-top:16px">
        <div class="row2">
          <div class="field"><label class="label">Lote <span class="opt">opcional</span></label>
            <div class="input"><input name="batch" value="${u.esc(p.batch)}" placeholder="Ex.: L2391" autocomplete="off"></div></div>
          <div class="field"><label class="label">Local <span class="opt">opcional</span></label>
            <div class="input"><input name="location" value="${u.esc(p.location)}" placeholder="Ex.: Prateleira 2" autocomplete="off"></div></div>
        </div>
        <div class="field"><label class="label">Observações <span class="opt">opcional</span></label>
          <div class="input"><textarea name="notes" placeholder="Anotações sobre o produto">${u.esc(p.notes)}</textarea></div></div>
      </div>
      ${isNew ? '' : `<p class="hint" style="text-align:center;margin-top:18px">Cadastrado em ${u.fmtDate((p.createdAt || '').slice(0, 10))}</p>`}`;
  }

  function open(existing, preset) {
    const isNew = !existing;
    const p = RS.Product(Object.assign({}, existing || {}, preset || {}));
    if (isNew && !p.id) p.id = u.uid();

    const curStore = s.stores.find(x => x.id === (p.storeId || s.settings.currentStoreId)) || s.current();
    if (!curStore) { RS.stores.form(); return ui.toast('Crie uma loja antes de cadastrar produtos', { type: 'warn' }); }
    p.storeId = curStore.id;
    ui.sheet({
      title: isNew ? 'Novo produto' : 'Editar produto',
      headExtra: `<button type="button" class="chip glass-lite" data-act="store" style="height:32px;max-width:46%">${RS.storeBadge(curStore, 20)}<span data-store-name style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.esc(curStore.name)}</span></button>`,
      body: `<form data-form autocomplete="off" onsubmit="return false">${form(p, isNew)}</form>`,
      foot: isNew
        ? `<div class="btn-row"><button class="btn ghost" data-save="again" style="padding:0 14px">${ui.icon('plus', 18)}Salvar e novo</button><button class="btn primary" data-save="close">${ui.icon('check', 20)}Salvar</button></div>`
        : `<button class="btn primary block" data-save="close">${ui.icon('check', 20)}Salvar alterações</button>`,
      onMount(el, ctl) {
        const f = ctl.$('[data-form]');
        const $in = n => f.querySelector(`[name="${n}"]`);
        if (isNew && !p.name) setTimeout(() => $in('name').focus(), 450);

        const updPreview = () => { ctl.$('[data-preview]').innerHTML = preview($in('expiry').value); };
        $in('expiry').addEventListener('change', () => { updPreview(); ctl.$('[data-f="expiry"]').classList.remove('err'); ctl.$('[data-f="expiry"] .err-msg').classList.add('hidden'); });
        $in('name').addEventListener('input', () => { ctl.$('[data-f="name"]').classList.remove('err'); ctl.$('[data-f="name"] .err-msg').classList.add('hidden'); });
        $in('name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $in('barcode').focus(); } });

        const checkBarcode = () => {
          const code = $in('barcode').value.trim();
          const hint = ctl.$('[data-bc-hint]');
          const match = code && s.byBarcode(code);
          if (!match || match.id === p.id || $in('name').value === match.name) { hint.classList.add('hidden'); return; }
          hint.classList.remove('hidden');
          hint.innerHTML = `Já existe <b>${u.esc(match.name)}</b> com este código. <button type="button" class="link" data-act="fill">Usar dados</button>`;
          hint.querySelector('[data-act="fill"]').onclick = () => {
            $in('name').value = match.name;
            setCat(match.category);
            $in('unit').value = match.unit;
            ui.toast('Dados preenchidos — ajuste a validade', { type: 'ok' });
            hint.classList.add('hidden');
          };
        };
        $in('barcode').addEventListener('change', checkBarcode);
        if (p.barcode) checkBarcode();

        const setCat = c => {
          $in('category').value = c || '';
          ctl.$$('[data-cat]').forEach(b => b.classList.toggle('on', b.dataset.cat === c));
        };

        el.addEventListener('click', async e => {
          const t = e.target.closest('[data-quick],[data-step],[data-cat],[data-act],[data-save]');
          if (!t) return;
          ui.tap();
          if (t.dataset.quick != null) {
            $in('expiry').value = QUICK[+t.dataset.quick][1]();
            $in('expiry').dispatchEvent(new Event('change'));
          } else if (t.dataset.step) {
            const q = $in('quantity');
            q.value = Math.max(0, (parseFloat(q.value) || 0) + Number(t.dataset.step));
          } else if (t.dataset.cat != null) {
            setCat($in('category').value === t.dataset.cat ? '' : t.dataset.cat);
          } else if (t.dataset.act === 'scan') {
            const code = await RS.scanner.scan();
            if (code) { $in('barcode').value = code; checkBarcode(); }
          } else if (t.dataset.act === 'newcat') {
            const name = await askText('Nova categoria', 'Ex.: Frios');
            if (name) {
              const b = document.createElement('button');
              b.type = 'button'; b.className = 'chip glass-lite'; b.dataset.cat = name; b.textContent = name;
              t.before(b); setCat(name);
            }
          } else if (t.dataset.act === 'store') {
            if (s.stores.length < 2) return ui.toast('Você tem só uma loja', { icon: 'home' });
            const v = await ui.menu({ title: isNew ? 'Cadastrar em qual loja?' : 'Mover para a loja', value: p.storeId, options: s.stores.map(x => ({ value: x.id, label: x.name, icon: 'home', color: x.color })) });
            if (v) { p.storeId = v; t.innerHTML = RS.storeBadge(s.stores.find(x => x.id === v), 20) + '<span data-store-name>' + u.esc(s.storeName(v)) + '</span>'; }
          } else if (t.dataset.act === 'more') {
            const m = ctl.$('[data-more]');
            m.classList.toggle('hidden');
            ctl.$('[data-more-ic]').innerHTML = ui.icon(m.classList.contains('hidden') ? 'chev' : 'down', 20);
          } else if (t.dataset.save) {
            const data = {
              id: p.id,
              name: $in('name').value.trim(),
              barcode: $in('barcode').value.trim(),
              expiry: $in('expiry').value,
              quantity: Math.max(0, parseFloat($in('quantity').value) || 0),
              unit: $in('unit').value,
              category: $in('category').value,
              batch: $in('batch').value.trim(),
              location: $in('location').value.trim(),
              notes: $in('notes').value.trim(),
              storeId: p.storeId
            };
            let ok = true;
            if (!data.name) { ok = false; ctl.$('[data-f="name"]').classList.add('err'); ctl.$('[data-f="name"] .err-msg').classList.remove('hidden'); }
            if (!data.expiry) { ok = false; ctl.$('[data-f="expiry"]').classList.add('err'); ctl.$('[data-f="expiry"] .err-msg').classList.remove('hidden'); }
            if (!ok) { ui.tap(30); ctl.$('.err input') && ctl.$('.err input').focus(); return; }

            t.disabled = true;
            const prev = t.innerHTML;
            t.innerHTML = '<span class="spinner sm"></span>Salvando…';
            await s.save(data);
            await u.sleep(250);
            ui.toast(isNew ? `“${data.name}” adicionado` : 'Alterações salvas', { type: 'ok' });
            if (t.dataset.save === 'again') {
              ctl.close();
              setTimeout(() => open(null, { category: data.category, unit: data.unit, expiry: data.expiry, storeId: data.storeId }), 380);
            } else {
              t.innerHTML = prev;
              ctl.close();
            }
          }
        });
      }
    });
  }

  function askText(title, placeholder, value = '') {
    return new Promise(resolve => {
      let val = null;
      ui.sheet({
        title,
        body: `<div class="input"><input data-v placeholder="${u.esc(placeholder)}" value="${u.esc(value)}" maxlength="40" autocomplete="off"></div>`,
        foot: `<button class="btn primary block" data-ok>Confirmar</button>`,
        onMount(el, ctl) {
          const i = ctl.$('[data-v]');
          setTimeout(() => i.focus(), 400);
          const ok = () => { val = i.value.trim(); ctl.close(); };
          ctl.$('[data-ok]').onclick = ok;
          i.addEventListener('keydown', e => { if (e.key === 'Enter') ok(); });
        },
        onClose() { resolve(val); }
      });
    });
  }
  RS.askText = askText;

  /* ----- Detalhes ----- */
  /* Dar baixa (saída) ou entrada, com motivo — registrado no histórico. */
  function moveSheet(id, mode) {
    const p = s.byId(id);
    if (!p) return Promise.resolve(null);
    const out = mode === 'out';
    const reasons = out ? ['venda', 'vencido', 'avaria', 'uso', 'troca', 'ajuste'] : ['reposicao', 'ajuste', 'troca'];
    const names = Object.assign({ reposicao: 'Reposição / compra' }, s.REASONS);
    return new Promise(resolve => {
      let result = null;
      ui.sheet({
        title: out ? 'Dar baixa' : 'Entrada no estoque',
        body: `
          <p class="hint" style="text-align:center;margin:0 0 6px"><b style="color:var(--text)">${u.esc(p.name)}</b> · em estoque: ${u.esc(u.fmtQty(p.quantity, p.unit))}</p>
          <div class="big-qty">
            <button data-st="-1" aria-label="Menos">${ui.icon('minus', 22)}</button>
            <input data-q type="number" inputmode="decimal" min="0" step="any" value="1">
            <button data-st="1" aria-label="Mais">${ui.icon('plus', 22)}</button></div>
          <div class="chips tight" style="justify-content:center;flex-wrap:wrap;margin:0;padding:0 0 10px">
            ${out ? `<button class="chip glass-lite" data-all>Tudo (${u.esc(u.fmtQty(p.quantity, p.unit))})</button>` : ''}
            ${[5, 10].map(n => `<button class="chip glass-lite" data-n="${n}">${n} ${u.esc(p.unit)}</button>`).join('')}</div>
          <p class="after-qty" data-after></p>
          <div class="label" style="margin-top:4px">Motivo</div>
          <div class="chips tight" style="flex-wrap:wrap;margin:0;padding:0">${reasons.map((r, i) => `<button class="chip glass-lite ${i === 0 ? 'on' : ''}" data-r="${r}">${names[r]}</button>`).join('')}</div>
          <div class="field" style="margin-top:14px"><div class="input"><span class="lead">${ui.icon('note', 18)}</span><input data-note placeholder="Observação (opcional)" maxlength="80" autocomplete="off"></div></div>`,
        foot: `<button class="btn ${out ? 'danger' : 'primary'} block" data-go style="${out ? 'background:var(--c-soon);color:#fff' : ''}">${ui.icon(out ? 'upload' : 'download', 20)}${out ? 'Confirmar baixa' : 'Confirmar entrada'}</button>`,
        onMount(el, ctl) {
          const q = ctl.$('[data-q]');
          let reason = reasons[0];
          const upd = () => {
            const v = Math.max(0, parseFloat(q.value) || 0);
            const after = out ? Math.max(0, (Number(p.quantity) || 0) - v) : (Number(p.quantity) || 0) + v;
            ctl.$('[data-after]').innerHTML = `Ficará com <b style="color:var(--text)">${u.esc(u.fmtQty(Math.round(after * 1000) / 1000, p.unit))}</b>` + (out && v > p.quantity ? ' <span style="color:var(--c-danger)">(maior que o estoque)</span>' : '');
          };
          upd();
          q.addEventListener('input', upd);
          el.addEventListener('click', async e => {
            const t = e.target.closest('[data-st],[data-all],[data-n],[data-r],[data-go]');
            if (!t) return;
            ui.tap();
            if (t.dataset.st) { q.value = Math.max(0, (parseFloat(q.value) || 0) + Number(t.dataset.st)); upd(); }
            else if (t.dataset.all != null) { q.value = p.quantity; upd(); }
            else if (t.dataset.n) { q.value = t.dataset.n; upd(); }
            else if (t.dataset.r) { reason = t.dataset.r; ctl.$$('[data-r]').forEach(x => x.classList.toggle('on', x === t)); }
            else if (t.dataset.go != null) {
              const v = Math.max(0, parseFloat(q.value) || 0);
              if (!v) return ui.toast('Informe a quantidade', { type: 'warn' });
              result = await s.move(id, out ? -v : v, reason === 'reposicao' ? 'Reposição / compra' : reason, ctl.$('[data-note]').value.trim());
              ctl.close();
              ui.toast(out ? `Baixa registrada · restam ${u.fmtQty(result.quantity, result.unit)}` : `Entrada registrada · total ${u.fmtQty(result.quantity, result.unit)}`, { type: 'ok', icon: out ? 'upload' : 'download' });
              if (RS.fx) RS.fx.burst(innerWidth / 2, innerHeight - 120);
              if (out && result.quantity === 0) {
                const rm = await ui.confirm({ title: 'Estoque zerado', message: `“${u.esc(result.name)}” ficou com 0. Deseja remover o produto da lista?`, confirm: 'Remover', cancel: 'Manter', icon: 'box' });
                if (rm) await s.remove(id, 'Removido após zerar o estoque');
              }
            }
          });
        },
        onClose() { resolve(result); }
      });
    });
  }
  RS.moveSheet = moveSheet;

  /* ----- Detalhes ----- */
  function detail(id) {
    const p = s.byId(id);
    if (!p) return;
    const kv = (label, value, wide) => value ? `<div class="${wide ? 'wide' : ''}"><small>${label}</small><b>${u.esc(value)}</b></div>` : '';
    const logs = s.history.filter(e => e.name === p.name && e.storeId === p.storeId).slice(0, 3);
    ui.sheet({
      title: 'Detalhes',
      body: `
        <div class="detail-top s-${p.status}">
          <span class="ic">${u.esc(u.initials(p.name))}</span>
          <div style="min-width:0"><h2>${u.esc(p.name)}</h2>
            <div style="margin-top:6px">${p.status === 'expired' ? `<span class="tag-exp">Vencido</span> <span class="faint" style="font-size:.8rem">${u.esc(u.rel(p.days))}</span>` : `<span class="pill s-${p.status}"><span class="sdot"></span>${u.esc(u.rel(p.days))}</span>`}</div></div>
        </div>
        <div class="kv">
          ${kv('Validade', u.fmtDate(p.expiry))}
          ${kv('Em estoque', u.fmtQty(p.quantity, p.unit))}
          ${kv('Loja', s.storeName(p.storeId))}
          ${kv('Categoria', p.category)}
          ${kv('Código de barras', p.barcode)}
          ${kv('Lote', p.batch)}
          ${kv('Local', p.location)}
          ${kv('Observações', p.notes, true)}
        </div>
        <div class="btn-row" style="margin-top:12px">
          <button class="btn sm" data-a="out" style="background:color-mix(in srgb,var(--c-soon) 16%,transparent);color:var(--c-soon)">${ui.icon('upload', 18)}Dar baixa</button>
          <button class="btn ghost sm" data-a="in">${ui.icon('download', 18)}Entrada</button></div>
        ${logs.length ? `<div class="group-label">Últimas movimentações</div><div class="card glass-lite" style="padding:4px 14px">${logs.map(e => `<div class="log"><span class="lt"><small><b style="display:inline;font-size:inherit">${u.esc(s.LOG_LABEL[e.type] || '')}</b> · ${u.esc(e.detail)}</small></span><time>${new Date(e.t).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</time></div>`).join('')}</div>` : ''}`,
      foot: `<div class="btn-row">
          <button class="btn danger sm" data-a="del" aria-label="Excluir" style="flex:.6">${ui.icon('trash', 18)}</button>
          <button class="btn ghost sm" data-a="dup">${ui.icon('copy', 18)}Duplicar</button>
          <button class="btn primary sm" data-a="edit" style="flex:1.4">${ui.icon('edit', 18)}Editar</button></div>`,
      onMount(el, ctl) {
        el.addEventListener('click', async e => {
          const b = e.target.closest('[data-a]');
          if (!b) return;
          ui.tap();
          const a = b.dataset.a;
          if (a === 'out' || a === 'in') { ctl.close(); setTimeout(() => moveSheet(id, a), 280); }
          else if (a === 'edit') { ctl.close(); setTimeout(() => open(s.products.find(x => x.id === id)), 300); }
          else if (a === 'dup') {
            ctl.close();
            const src = s.products.find(x => x.id === id);
            setTimeout(() => open(null, { name: src.name, barcode: src.barcode, category: src.category, unit: src.unit, quantity: src.quantity, location: src.location, expiry: '' }), 300);
          } else if (a === 'del') {
            const yes = await ui.confirm({ title: 'Excluir produto?', message: `“${u.esc(p.name)}” será removido do estoque de ${u.esc(s.storeName(p.storeId))}.`, confirm: 'Excluir', danger: true });
            if (!yes) return;
            const removed = await s.remove(id);
            ctl.close();
            ui.toast('Produto excluído', { icon: 'trash', action: { label: 'Desfazer', fn: () => s.restore(removed) } });
          }
        });
      }
    });
  }

  RS.editor = {
    open: p => open(p ? s.products.find(x => x.id === p.id) : null),
    openWithBarcode(code) {
      const match = s.byBarcode(code);
      open(null, match ? { barcode: code, name: match.name, category: match.category, unit: match.unit } : { barcode: code });
      if (match) setTimeout(() => ui.toast('Produto reconhecido — informe a nova validade', { type: 'ok', icon: 'scan' }), 500);
    }
  };
  RS.detail = { open: detail };
})();
