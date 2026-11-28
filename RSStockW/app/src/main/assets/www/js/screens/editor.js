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

  function lotRow(l, active) {
    return `<div class="lot-row ${active ? 'on' : ''}" ${l.id ? `data-id="${l.id}"` : ''}>
      <div class="input lot-date"><span class="lead">${ui.icon('calendar', 16)}</span><input name="lexp" type="date" value="${u.esc(l.expiry || '')}" aria-label="Validade"></div>
      <div class="stepper lot-qty"><button type="button" data-lstep="-1" aria-label="Diminuir">${ui.icon('minus', 16)}</button>
        <input name="lqty" type="number" inputmode="decimal" min="0" step="any" value="${u.esc(l.quantity == null ? 1 : l.quantity)}" aria-label="Quantidade">
        <button type="button" data-lstep="1" aria-label="Aumentar">${ui.icon('plus', 16)}</button></div>
      <button type="button" class="lot-del" data-ldel aria-label="Remover data">${ui.icon('x', 16)}</button>
    </div>`;
  }

  function form(p, isNew, lots) {
    const cats = categories();
    const hasMore = p.batch || p.location || p.notes || p.cost;
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
        <label>Validades e quantidades</label>
        <div data-lots>${lots.map((l, i) => lotRow(l, i === 0)).join('')}</div>
        <div class="quick-dates row">${QUICK.map((q, i) => `<button type="button" class="chip glass-lite" data-quick="${i}">${q[0]}</button>`).join('')}</div>
        <div class="date-preview" data-preview>${preview(lots[0] && lots[0].expiry)}</div>
        <button type="button" class="btn ghost sm block add-lot" data-act="addlot">${ui.icon('plus', 18)}Adicionar outra data</button>
        <p class="hint" style="margin-top:6px">Mesmo produto com datas diferentes? Ex.: 12 un vencem dia 10 e 30 un no mês que vem — cada data com a sua quantidade.</p>
        <p class="err-msg hidden">Escolha a data de validade de cada linha.</p>
      </div>

      <div class="field">
        <label>Unidade de medida</label>
        <div class="input" style="padding-right:12px"><span class="lead">${ui.icon('box', 18)}</span><select name="unit" aria-label="Unidade">${cfg.units.map(x => `<option ${x === p.unit ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
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
        <span class="ct"><b style="font-size:.9rem">Mais detalhes</b><small>Lote, local, custo e observações</small></span>
        <span class="cv" data-more-ic>${ui.icon(hasMore ? 'down' : 'chev', 20)}</span>
      </button>
      <div data-more class="${hasMore ? '' : 'hidden'}" style="margin-top:16px">
        <div class="row2">
          <div class="field"><label class="label">Lote <span class="opt">opcional</span></label>
            <div class="input"><input name="batch" value="${u.esc(p.batch)}" placeholder="Ex.: L2391" autocomplete="off"></div></div>
          <div class="field"><label class="label">Local <span class="opt">opcional</span></label>
            <div class="input"><input name="location" value="${u.esc(p.location)}" placeholder="Ex.: Prateleira 2" autocomplete="off"></div></div>
        </div>
        <div class="field"><label class="label">Custo unitário (R$) <span class="opt">para o relatório de perdas</span></label>
          <div class="input"><span class="lead">R$</span><input name="cost" type="number" inputmode="decimal" min="0" step="0.01" value="${p.cost ? u.esc(p.cost) : ''}" placeholder="0,00"></div></div>
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
    const lots = isNew ? [{ expiry: p.expiry, quantity: p.quantity }]
      : s.lotsOf(p.id).map(l => ({ id: l.id, expiry: l.expiry, quantity: l.quantity }));
    if (!lots.length) lots.push({ id: p.id, expiry: p.expiry, quantity: p.quantity });
    const removedLots = [];
    let lookState = { code: '', found: null };
    ui.sheet({
      title: isNew ? 'Novo produto' : 'Editar produto',
      headExtra: `<button type="button" class="chip glass-lite" data-act="store" style="height:32px;max-width:46%">${RS.storeBadge(curStore, 20)}<span data-store-name style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${u.esc(curStore.name)}</span></button>`,
      body: `<form data-form autocomplete="off" onsubmit="return false">${form(p, isNew, lots)}</form>`,
      foot: isNew
        ? `<div class="btn-row"><button class="btn ghost" data-save="again" style="padding:0 14px">${ui.icon('plus', 18)}Salvar e novo</button><button class="btn primary" data-save="close">${ui.icon('check', 20)}Salvar</button></div>`
        : `<button class="btn primary block" data-save="close">${ui.icon('check', 20)}Salvar alterações</button>`,
      onMount(el, ctl) {
        const f = ctl.$('[data-form]');
        const $in = n => f.querySelector(`[name="${n}"]`);
        if (isNew && !p.name) setTimeout(() => $in('name').focus(), 450);

        const box = ctl.$('[data-lots]');
        const rows = () => Array.from(box.querySelectorAll('.lot-row'));
        const active = () => box.querySelector('.lot-row.on') || rows()[0];
        const setActive = r => { rows().forEach(x => x.classList.toggle('on', x === r)); updPreview(); };
        const updPreview = () => { const r = active(); ctl.$('[data-preview]').innerHTML = preview(r ? r.querySelector('[name="lexp"]').value : ''); };
        const syncDel = () => { const many = rows().length > 1; rows().forEach(r => r.querySelector('[data-ldel]').classList.toggle('hidden', !many)); };
        syncDel();
        box.addEventListener('focusin', e => { const r = e.target.closest('.lot-row'); if (r && !r.classList.contains('on')) setActive(r); });
        box.addEventListener('change', e => {
          if (e.target.name !== 'lexp') return;
          setActive(e.target.closest('.lot-row'));
          ctl.$('[data-f="expiry"]').classList.remove('err'); ctl.$('[data-f="expiry"] .err-msg').classList.add('hidden');
        });
        $in('name').addEventListener('input', () => { ctl.$('[data-f="name"]').classList.remove('err'); ctl.$('[data-f="name"] .err-msg').classList.add('hidden'); });
        $in('name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $in('barcode').focus(); } });

        /* Código de barras → busca o produto (seu estoque, catálogo, Open Food Facts…) e preenche */
        let lookSeq = 0;
        const fillFrom = r => {
          $in('name').value = r.name;
          $in('name').dispatchEvent(new Event('input'));
          if (r.category) {
            if (!ctl.$$('[data-cat]').some(b => b.dataset.cat === r.category)) {
              const b = document.createElement('button'); b.type = 'button'; b.className = 'chip glass-lite'; b.dataset.cat = r.category; b.textContent = r.category;
              const nb = ctl.$('[data-act="newcat"]'); if (nb) nb.before(b);
            }
            setCat(r.category);
          }
          if (r.unit && cfg.units.includes(r.unit)) $in('unit').value = r.unit;
          if (r.cost && !$in('cost').value) $in('cost').value = r.cost;
        };
        const checkBarcode = async () => {
          const code = $in('barcode').value.trim();
          const hint = ctl.$('[data-bc-hint]');
          if (!/^\d{6,14}$/.test(code)) { hint.classList.add('hidden'); return; }
          const seq = ++lookSeq;
          hint.classList.remove('hidden');
          hint.innerHTML = `<span class="bc-look"><span class="spinner sm"></span>Buscando o produto…</span>`;
          const r = await RS.catalog.lookup(code);
          if (seq !== lookSeq || !document.body.contains(hint)) return;
          lookState = { code, found: r };
          if (!r) {
            hint.innerHTML = `<span class="bc-look miss">${ui.icon('search', 15)} Não encontrei esse código nas bases. Digite o nome uma vez — ${RS.auth.isUser() ? 'ele fica salvo para as próximas leituras de todos.' : 'na próxima leitura ele já aparece.'}</span>`;
            if (!$in('name').value) setTimeout(() => $in('name').focus(), 150);
            return;
          }
          const same = $in('name').value.trim() && u.norm($in('name').value) === u.norm(r.name);
          const auto = !$in('name').value.trim();
          if (auto) fillFrom(r);
          hint.innerHTML = `<span class="bc-found">${r.image_url ? `<img src="${u.esc(r.image_url)}" alt="" data-bcimg>` : `<span class="bi">${ui.icon('check', 16, 2.6)}</span>`}
            <span class="bt"><b>${u.esc(r.name)}</b><small>${[r.size, r.category, 'via ' + (RS.catalog.SOURCE[r.source] || r.source)].filter(Boolean).map(u.esc).join(' · ')}</small></span>
            ${auto || same ? '' : `<button type="button" class="link" data-act="usefound">Usar</button>`}</span>`;
          const img = hint.querySelector('[data-bcimg]');
          if (img) img.addEventListener('error', () => { img.style.display = 'none'; });
          const ub = hint.querySelector('[data-act="usefound"]');
          if (ub) ub.onclick = () => { fillFrom(r); ub.style.display = 'none'; ui.toast('Dados preenchidos', { type: 'ok' }); };
          if (auto) {
            ui.tap(12);
            ui.toast('Produto encontrado — agora só a validade e a quantidade', { type: 'ok', icon: 'scan' });
            const d = ctl.$('.lot-row [name="lexp"]');
            if (d && !d.value) setTimeout(() => { d.scrollIntoView({ block: 'center', behavior: 'smooth' }); d.closest('.lot-row').classList.add('pulse'); }, 250);
          }
        };
        $in('barcode').addEventListener('change', checkBarcode);
        $in('barcode').addEventListener('input', u.debounce(() => { const v = $in('barcode').value.trim(); if (/^\d{8}$|^\d{12,14}$/.test(v)) checkBarcode(); }, 600));
        if (p.barcode) setTimeout(checkBarcode, 50);

        const setCat = c => {
          $in('category').value = c || '';
          ctl.$$('[data-cat]').forEach(b => b.classList.toggle('on', b.dataset.cat === c));
        };

        el.addEventListener('click', async e => {
          const t = e.target.closest('[data-quick],[data-lstep],[data-ldel],[data-cat],[data-act],[data-save]');
          if (!t) return;
          ui.tap();
          if (t.dataset.quick != null) {
            const r = active();
            const inp = r.querySelector('[name="lexp"]');
            inp.value = QUICK[+t.dataset.quick][1]();
            inp.dispatchEvent(new Event('change', { bubbles: true }));
          } else if (t.dataset.lstep) {
            const q = t.closest('.lot-row').querySelector('[name="lqty"]');
            q.value = Math.max(0, (parseFloat(q.value) || 0) + Number(t.dataset.lstep));
          } else if (t.dataset.ldel != null) {
            const r = t.closest('.lot-row');
            if (rows().length < 2) return;
            if (r.dataset.id) removedLots.push(r.dataset.id);
            r.classList.add('out');
            setTimeout(() => { const was = r.classList.contains('on'); r.remove(); if (was) setActive(rows()[0]); syncDel(); }, 200);
          } else if (t.dataset.act === 'addlot') {
            const last = rows()[rows().length - 1];
            const wrap = document.createElement('div');
            wrap.innerHTML = lotRow({ expiry: '', quantity: last ? last.querySelector('[name="lqty"]').value : 1 }, false);
            const r = wrap.firstElementChild;
            box.appendChild(r); setActive(r); syncDel();
            const inp = r.querySelector('[name="lexp"]');
            setTimeout(() => { inp.focus(); try { inp.showPicker && inp.showPicker(); } catch (er) { /* */ } }, 80);
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
              unit: $in('unit').value,
              category: $in('category').value,
              batch: $in('batch').value.trim(),
              location: $in('location').value.trim(),
              cost: Math.max(0, Number(String($in('cost').value).replace(',', '.')) || 0),
              notes: $in('notes').value.trim(),
              storeId: p.storeId
            };
            let ok = true;
            if (!data.name) { ok = false; ctl.$('[data-f="name"]').classList.add('err'); ctl.$('[data-f="name"] .err-msg').classList.remove('hidden'); }
            const lotData = rows().map((r, i) => ({ id: r.dataset.id || (isNew && i === 0 ? p.id : undefined), expiry: r.querySelector('[name="lexp"]').value, quantity: Math.max(0, parseFloat(r.querySelector('[name="lqty"]').value) || 0) }));
            if (lotData.some(l => !l.expiry)) { ok = false; ctl.$('[data-f="expiry"]').classList.add('err'); ctl.$('[data-f="expiry"] .err-msg').classList.remove('hidden'); }
            if (!ok) { ui.tap(30); ctl.$('.err input') && ctl.$('.err input').focus(); return; }

            t.disabled = true;
            const prev = t.innerHTML;
            t.innerHTML = '<span class="spinner sm"></span>Salvando…';
            await s.saveLots(data, lotData, removedLots);
            if (data.barcode && lookState.code === data.barcode && (!lookState.found || lookState.found.source === 'user')) RS.catalog.contribute(data.barcode, data.name, data.category, '');
            await u.sleep(250);
            ui.toast(isNew ? `“${data.name}” adicionado` + (lotData.length > 1 ? ` com ${lotData.length} datas` : '') : 'Alterações salvas', { type: 'ok' });
            if (t.dataset.save === 'again') {
              ctl.close();
              setTimeout(() => open(null, { category: data.category, unit: data.unit, expiry: lotData[0].expiry, storeId: data.storeId }), 380);
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
    if (!p || !s.canEdit(p.storeId)) { if (p) ui.toast('Você é visualizador nesta loja — só consulta', { type: 'warn', icon: 'eye' }); return Promise.resolve(null); }
    const out = mode === 'out';
    const reasons = out ? ['venda', 'vencido', 'avaria', 'uso', 'troca', 'ajuste'] : ['reposicao', 'ajuste', 'troca'];
    const names = Object.assign({ reposicao: 'Reposição / compra' }, s.REASONS);
    return new Promise(resolve => {
      let result = null;
      ui.sheet({
        title: out ? 'Dar baixa' : 'Entrada no estoque',
        body: `
          <p class="hint" style="text-align:center;margin:0 0 6px"><b style="color:var(--text)">${u.esc(p.name)}</b>${s.lotsOf(id).length > 1 ? ' · validade <b style="color:var(--text)">' + u.fmtDate(p.expiry) + '</b>' : ''} · em estoque: ${u.esc(u.fmtQty(p.quantity, p.unit))}</p>
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
  /* Escolhe a data (lote) para dar baixa/entrada quando o produto tem várias */
  async function pickLot(lots, mode) {
    if (lots.length < 2) return lots[0] ? lots[0].id : null;
    return ui.menu({
      title: mode === 'out' ? 'Dar baixa de qual data?' : 'Entrada em qual data?',
      options: lots.map((l, i) => ({ value: l.id, label: u.fmtDate(l.expiry) + ' · ' + u.fmtQty(l.quantity, l.unit), desc: (l.status === 'expired' ? 'VENCIDO · ' : '') + u.rel(l.days) + (i === 0 && mode === 'out' ? ' · mais antiga (sai primeiro)' : ''), icon: 'calendar', color: l.status === 'expired' ? '#050507' : l.status === 'soon' ? '#ff3b4e' : l.status === 'mid' ? '#f59e0b' : '#12a36b' }))
    });
  }

  function newLotSheet(id) {
    const base = s.byId(id);
    if (!base) return;
    ui.sheet({
      title: 'Nova data · ' + base.name,
      body: `<div class="field"><label>Validade</label><div class="input"><span class="lead">${ui.icon('calendar', 18)}</span><input name="lexp" type="date"></div>
          <div class="quick-dates row">${QUICK.map((q, i) => `<button type="button" class="chip glass-lite" data-quick="${i}">${q[0]}</button>`).join('')}</div>
          <div class="date-preview" data-preview>${preview('')}</div></div>
        <div class="field"><label>Quantidade nesta data</label>
          <div class="stepper"><button type="button" data-step="-1" aria-label="Diminuir">${ui.icon('minus', 18)}</button>
          <input name="lqty" type="number" inputmode="decimal" min="0" step="any" value="1">
          <button type="button" data-step="1" aria-label="Aumentar">${ui.icon('plus', 18)}</button></div></div>`,
      foot: `<button class="btn primary block" data-ok>${ui.icon('check', 20)}Adicionar data</button>`,
      onMount(el, ctl) {
        const d = ctl.$('[name="lexp"]'), q = ctl.$('[name="lqty"]');
        d.addEventListener('change', () => { ctl.$('[data-preview]').innerHTML = preview(d.value); });
        setTimeout(() => { try { d.focus(); d.showPicker && d.showPicker(); } catch (e) { /* */ } }, 420);
        el.addEventListener('click', async e => {
          const t = e.target.closest('[data-quick],[data-step],[data-ok]');
          if (!t) return;
          ui.tap();
          if (t.dataset.quick != null) { d.value = QUICK[+t.dataset.quick][1](); d.dispatchEvent(new Event('change')); }
          else if (t.dataset.step) q.value = Math.max(0, (parseFloat(q.value) || 0) + Number(t.dataset.step));
          else if (t.dataset.ok != null) {
            if (!d.value) { ui.toast('Escolha a validade', { type: 'warn' }); return; }
            const lot = await s.addLot(id, d.value, Math.max(0, parseFloat(q.value) || 0));
            ctl.close();
            ui.toast('Data ' + u.fmtDate(d.value) + ' adicionada', { type: 'ok', icon: 'calendar' });
            setTimeout(() => detail(lot.id), 320);
          }
        });
      }
    });
  }

  function detail(id) {
    const p = s.byId(id);
    if (!p) return;
    const lots = s.lotsOf(id);
    const multi = lots.length > 1;
    const lead = lots[0] || p;
    const total = lots.reduce((a, l) => a + (Number(l.quantity) || 0), 0);
    const edit = s.canEdit(p.storeId);
    const kv = (label, value, wide) => value ? `<div class="${wide ? 'wide' : ''}"><small>${label}</small><b>${u.esc(value)}</b></div>` : '';
    const logs = s.history.filter(e => e.name === p.name && e.storeId === p.storeId).slice(0, 3);
    const lotLine = l => `<div class="lot-line s-${l.status} ${l.id === id && multi ? 'cur' : ''}">
        <span class="ld"><b class="num">${u.fmtDate(l.expiry)}</b><small>${l.status === 'expired' ? '<span class="tag-exp">Vencido</span> ' : ''}${u.esc(u.rel(l.days))}</small></span>
        <b class="lq num">${u.esc(u.fmtQty(l.quantity, l.unit))}</b>
        ${edit ? `<button class="rb" data-lout="${l.id}" aria-label="Dar baixa desta data">${ui.icon('upload', 16)}</button>
        ${l.status === 'expired' && Number(l.quantity) > 0 ? `<button class="rb warn" data-ldisc="${l.id}" aria-label="Descartar vencido">${ui.icon('trash', 16)}</button>` : ''}` : ''}
      </div>`;
    ui.sheet({
      title: 'Detalhes',
      body: `
        <div class="detail-top s-${lead.status}">
          <span class="ic">${u.esc(u.initials(p.name))}</span>
          <div style="min-width:0"><h2>${u.esc(p.name)}</h2>
            <div style="margin-top:6px">${lead.status === 'expired' ? `<span class="tag-exp">Vencido</span> <span class="faint" style="font-size:.8rem">${u.esc(u.rel(lead.days))}</span>` : `<span class="pill s-${lead.status}"><span class="sdot"></span>${u.esc(u.rel(lead.days))}</span>`}${multi ? ` <span class="faint" style="font-size:.78rem">· ${lots.length} datas</span>` : ''}</div></div>
        </div>
        <div class="group-label" style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
          <span>${multi ? 'Validades (' + lots.length + ')' : 'Validade'}</span>
          ${edit ? `<button class="link" data-a="addlot" style="text-transform:none;letter-spacing:0;font-size:.82rem">${ui.icon('plus', 14)} Nova data</button>` : ''}</div>
        <div class="card glass-lite lots-card">${lots.map(lotLine).join('')}
          ${multi ? `<div class="lot-total"><span>Total em estoque</span><b class="num">${u.esc(u.fmtQty(total, p.unit))}</b></div>` : ''}</div>
        <div class="kv" style="margin-top:12px">
          ${kv('Loja', s.storeName(p.storeId))}
          ${kv('Categoria', p.category)}
          ${kv('Código de barras', p.barcode)}
          ${kv('Lote', p.batch)}
          ${kv('Local', p.location)}
          ${p.cost ? kv('Custo unitário', u.money(p.cost)) : ''}
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
          const b = e.target.closest('[data-a],[data-lout],[data-ldisc]');
          if (!b) return;
          ui.tap();
          if (b.dataset.lout) { ctl.close(); setTimeout(() => moveSheet(b.dataset.lout, 'out'), 280); return; }
          if (b.dataset.ldisc) {
            const l = s.byId(b.dataset.ldisc);
            const yes = await ui.confirm({ title: 'Descartar vencido?', message: `Dá baixa de ${u.esc(u.fmtQty(l.quantity, l.unit))} de “${u.esc(l.name)}” (validade ${u.fmtDate(l.expiry)}) como <b>vencido</b>. Entra no relatório de perdas${l.cost ? ' (' + u.money(l.cost * l.quantity) + ')' : ''}.`, confirm: 'Descartar', danger: true, icon: 'trash' });
            if (!yes) return;
            await s.move(l.id, -Number(l.quantity), 'vencido', 'Descarte');
            ctl.close(); ui.toast('Baixa por vencimento registrada', { type: 'ok', icon: 'check' });
            return;
          }
          const a = b.dataset.a;
          if (a === 'addlot') { if (viewerBlock()) return; ctl.close(); setTimeout(() => newLotSheet(id), 280); }
          else if (a === 'out' || a === 'in') {
            const lid = await pickLot(lots, a);
            if (!lid) return;
            ctl.close(); setTimeout(() => moveSheet(lid, a), 280);
          }
          else if (a === 'edit') { if (viewerBlock()) return; ctl.close(); setTimeout(() => open(s.products.find(x => x.id === id)), 300); }
          else if (a === 'dup') {
            if (viewerBlock()) return;
            ctl.close();
            const src = s.products.find(x => x.id === id);
            setTimeout(() => open(null, { name: src.name + ' (cópia)', barcode: src.barcode, category: src.category, unit: src.unit, quantity: src.quantity, location: src.location, cost: src.cost, expiry: '' }), 300);
          } else if (a === 'del') {
            if (viewerBlock()) return;
            let ids = [id];
            if (multi) {
              const v = await ui.menu({ title: 'Excluir', options: [
                { value: 'one', label: 'Só a data ' + u.fmtDate(p.expiry), desc: u.fmtQty(p.quantity, p.unit), icon: 'calendar' },
                { value: 'all', label: 'O produto inteiro', desc: 'Todas as ' + lots.length + ' datas · ' + u.fmtQty(total, p.unit), icon: 'trash', color: '#ef4444' }] });
              if (!v) return;
              if (v === 'all') ids = lots.map(l => l.id);
            } else {
              const yes = await ui.confirm({ title: 'Excluir produto?', message: `“${u.esc(p.name)}” será removido do estoque de ${u.esc(s.storeName(p.storeId))}.`, confirm: 'Excluir', danger: true });
              if (!yes) return;
            }
            const removed = ids.length > 1 ? await s.removeMany(ids) : await s.remove(id);
            ctl.close();
            ui.toast(ids.length > 1 ? 'Produto excluído (' + ids.length + ' datas)' : multi ? 'Data excluída' : 'Produto excluído', { icon: 'trash', action: { label: 'Desfazer', fn: () => s.restore(removed) } });
          }
        });
      }
    });
  }

  const viewerBlock = () => { if (s.canEdit()) return false; ui.toast('Você é visualizador nesta loja — só consulta', { type: 'warn', icon: 'eye' }); return true; };
  RS.editor = {
    open: p => { if (viewerBlock()) return; open(p ? s.products.find(x => x.id === p.id) : null); },
    openWithBarcode(code) {
      if (viewerBlock()) return;
      open(null, { barcode: code });   // a busca automática preenche nome, gramatura e categoria
    }
  };
  RS.detail = { open: detail };
})();
