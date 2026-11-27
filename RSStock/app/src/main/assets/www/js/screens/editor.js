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
    const d = u.daysUntil(iso), st = u.status(d, s.threshold());
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

    ui.sheet({
      title: isNew ? 'Novo produto' : 'Editar produto',
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
              notes: $in('notes').value.trim()
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
              setTimeout(() => open(null, { category: data.category, unit: data.unit, expiry: data.expiry }), 380);
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
  function detail(id) {
    const p = s.byId(id);
    if (!p) return;
    const kv = (label, value, wide) => value ? `<div class="${wide ? 'wide' : ''}"><small>${label}</small><b>${u.esc(value)}</b></div>` : '';
    ui.sheet({
      title: 'Detalhes',
      body: `
        <div class="detail-top s-${p.status}">
          <span class="ic">${u.esc(u.initials(p.name))}</span>
          <div style="min-width:0"><h2>${u.esc(p.name)}</h2>
            <div style="margin-top:6px"><span class="pill s-${p.status}"><span class="sdot"></span>${u.statusName[p.status]} · ${u.esc(u.rel(p.days))}</span></div></div>
        </div>
        <div class="kv">
          ${kv('Validade', u.fmtDate(p.expiry))}
          <div><small>Quantidade</small><div style="display:flex;align-items:center;gap:8px">
            <button class="icon-btn" data-q="-1" style="width:30px;height:30px;border-radius:10px;background:var(--glass-2)">${ui.icon('minus', 16)}</button>
            <b class="num" data-qv>${u.esc(u.fmtQty(p.quantity, p.unit))}</b>
            <button class="icon-btn" data-q="1" style="width:30px;height:30px;border-radius:10px;background:var(--glass-2)">${ui.icon('plus', 16)}</button></div></div>
          ${kv('Categoria', p.category)}
          ${kv('Código de barras', p.barcode)}
          ${kv('Lote', p.batch)}
          ${kv('Local', p.location)}
          ${kv('Observações', p.notes, true)}
          ${kv('Atualizado em', u.fmtDate((p.updatedAt || '').slice(0, 10)), true)}
        </div>`,
      foot: `<div class="btn-row">
          <button class="btn danger sm" data-a="del" aria-label="Excluir">${ui.icon('trash', 18)}</button>
          <button class="btn ghost sm" data-a="dup">${ui.icon('copy', 18)}Duplicar</button>
          <button class="btn primary sm" data-a="edit" style="flex:1.4">${ui.icon('edit', 18)}Editar</button></div>`,
      onMount(el, ctl) {
        el.addEventListener('click', async e => {
          const q = e.target.closest('[data-q]');
          if (q) {
            ui.tap();
            const cur = s.byId(id);
            const n = Math.max(0, (Number(cur.quantity) || 0) + Number(q.dataset.q));
            await s.save({ id, quantity: n });
            ctl.$('[data-qv]').textContent = u.fmtQty(n, cur.unit);
            return;
          }
          const b = e.target.closest('[data-a]');
          if (!b) return;
          ui.tap();
          if (b.dataset.a === 'edit') { ctl.close(); setTimeout(() => open(s.products.find(x => x.id === id)), 300); }
          else if (b.dataset.a === 'dup') {
            ctl.close();
            const src = s.products.find(x => x.id === id);
            setTimeout(() => open(null, { name: src.name, barcode: src.barcode, category: src.category, unit: src.unit, quantity: src.quantity, location: src.location, expiry: '' }), 300);
          } else if (b.dataset.a === 'del') {
            const yes = await ui.confirm({ title: 'Excluir produto?', message: `“${u.esc(p.name)}” será removido do estoque.`, confirm: 'Excluir', danger: true });
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
