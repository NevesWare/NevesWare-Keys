/* Exportar: PDF, imagem ou texto, com filtros e campos. */
(function () {
  const u = RS.u, ui = RS.ui, s = RS.store, X = () => RS.exporter;

  const FORMATS = [
    { id: 'pdf', icon: 'pdf', title: 'PDF', desc: 'Relatório A4 para imprimir', a: '#ff5470', b: '#ff8a3d' },
    { id: 'image', icon: 'image', title: 'Imagem', desc: 'Foto com tudo, p/ WhatsApp', a: '#7c5cff', b: '#4cc9ff' },
    { id: 'text', icon: 'text', title: 'Texto', desc: 'Lista para copiar e colar', a: '#10b981', b: '#22d3ee' },
    { id: 'csv', icon: 'layers', title: 'Planilha', desc: 'CSV para Excel/Planilhas', a: '#f59e0b', b: '#f43f5e' }
  ];
  const SORTS = [
    { value: 'expiry', label: 'Validade mais próxima', icon: 'calendar' },
    { value: 'name', label: 'Nome (A–Z)', icon: 'type' },
    { value: 'qty', label: 'Maior quantidade', icon: 'layers' }
  ];

  const opts = () => s.settings.export;

  function summaryHtml() {
    const { summary } = X().dataset(opts());
    return `<div><b class="num" style="font-size:1.35rem">${summary.total}</b> <span class="muted">${summary.total === 1 ? 'produto' : 'produtos'}</span></div>
      <div style="display:flex;gap:10px;font-size:.74rem" class="num">${u.STATUSES.map(k => `<span class="s-${k}" style="display:flex;align-items:center;gap:5px"><span class="sdot"></span>${summary[k]}</span>`).join('')}</div>`;
  }

  RS.screens.export = {
    tab: 'export',
    render() {
      const o = opts();
      const sortLabel = (SORTS.find(x => x.value === o.sort) || SORTS[0]).label;
      return `
        <header class="topbar"><div class="grow"><p class="eyebrow">Exportar validades de</p><h1 class="h1" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${u.esc(X().titleName(o))}</h1></div>
          <button class="icon-btn glass" data-act="preview" aria-label="Prévia">${ui.icon('eye')}</button></header>

        <div class="scroll flexcol">
        <div class="fmt-grid">
          ${FORMATS.map(f => `<button class="fmt glass ${o.format === f.id ? 'on' : ''}" data-format="${f.id}" style="--a:${f.a};--b:${f.b}">
            <span class="xi">${ui.icon(f.icon, 20)}</span><span><b>${f.title}</b><small>${f.desc}</small></span><span class="radio"></span></button>`).join('')}
        </div>

        ${s.stores.length > 1 ? `<div class="seg" style="margin-top:12px">
          <button class="${o.scope !== 'all' ? 'on' : ''}" data-scope="current">${ui.icon('home', 16)}Esta loja</button>
          <button class="${o.scope === 'all' ? 'on' : ''}" data-scope="all">${ui.icon('layers', 16)}Todas (${s.stores.length})</button></div>` : ''}
        <div class="group-label">O que exportar</div>
        <div class="chips tight">
          ${Object.entries(X().FILTERS).map(([k, l]) => `<button class="chip glass-lite ${o.filter === k ? 'on' : ''}" data-filter="${k}">${l}</button>`).join('')}
        </div>

        <div class="group-label">Incluir</div>
        <div class="chips tight">
          <button class="chip glass-lite" data-act="sort">${ui.icon('sort', 14)}${u.esc(sortLabel)}</button>
          ${[['qty', 'Quantidade'], ['category', 'Categoria'], ['barcode', 'Código']].map(([k, l]) => `
            <button class="chip glass-lite tog ${o.include[k] ? 'on' : ''}" data-inc="${k}">${o.include[k] ? ui.icon('check', 14, 2.6) : ui.icon('plus', 14)}${l}</button>`).join('')}
        </div>

        <div class="spacer"></div>
        <div class="export-summary glass-lite" data-summary style="margin-top:0">${summaryHtml()}</div>
        <div class="btn-row" style="margin-top:12px">
          <button class="btn ghost" data-run="save">${ui.icon(o.format === 'image' ? 'download' : o.format === 'text' ? 'copy' : 'save', 20)}${o.format === 'text' ? 'Copiar' : 'Salvar'}</button>
          <button class="btn primary" data-run="share">${ui.icon('share', 20)}Compartilhar</button>
        </div>
        </div>`;
    },

    mount(root) {
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-format],[data-filter],[data-inc],[data-act],[data-run],[data-scope]');
        if (!t) return;
        ui.tap();
        if (t.dataset.scope) { s.set('export.scope', t.dataset.scope); return RS.app.refresh(); }
        if (t.dataset.format) { s.set('export.format', t.dataset.format); return RS.app.refresh(); }
        if (t.dataset.filter) { s.set('export.filter', t.dataset.filter); return RS.app.refresh(); }
        if (t.dataset.inc) { s.set('export.include.' + t.dataset.inc, !opts().include[t.dataset.inc]); return RS.app.refresh(); }
        if (t.dataset.act === 'sort') {
          const v = await ui.menu({ title: 'Ordenar por', options: SORTS, value: opts().sort });
          if (v) { s.set('export.sort', v); RS.app.refresh(); }
          return;
        }
        if (t.dataset.act === 'preview') return preview();
        if (t.dataset.run) return run(t.dataset.run);
      });
    }
  };

  function preview() {
    const o = opts();
    if (o.format === 'csv') {
      const rows = X().buildCSV(o).replace(/^\ufeff/, '').split('\r\n').slice(0, 12);
      ui.sheet({ title: 'Prévia da planilha', body: `<div class="card glass-lite"><div class="preview-text">${u.esc(rows.join('\n'))}</div></div><p class="hint" style="text-align:center">Abre no Excel, Google Planilhas e similares.</p>` });
    } else if (o.format === 'text') {
      ui.sheet({ title: 'Prévia do texto', body: `<div class="card glass-lite"><div class="preview-text">${u.esc(X().buildText(o))}</div></div>` });
    } else if (o.format === 'image') {
      const ctl = ui.sheet({ title: 'Prévia da imagem', body: `<div style="padding:40px 0;text-align:center"><div class="spinner"></div></div>` });
      setTimeout(() => {
        const imgs = X().buildImages(o);
        ctl.setBody(imgs.map(src => `<img class="preview-img" src="${src}" alt="Prévia" style="margin-bottom:12px">`).join('') +
          `<p class="hint" style="text-align:center">${imgs.length === 1 ? "1 folha" : imgs.length + " folhas"} no formato de tela de celular (1080×1920)</p>`);
      }, 350);
    } else {
      const r = X().buildReport(o);
      ui.sheet({
        title: 'Prévia do PDF',
        body: `<div class="card glass-lite"><p class="h2">${u.esc(r.title)}</p><p class="hint" style="margin:6px 0 14px">${u.esc(r.subtitle)}</p>
          <div class="list">${r.items.slice(0, 8).map(i => `<div class="item glass-lite s-${i.status}"><span class="body"><span class="name">${u.esc(i.name)}</span>
          <span class="meta">${u.esc(i.qty)} · ${u.esc(i.category)}</span></span><span class="side"><span class="when">${u.esc(i.expiry)}</span><span class="date">${u.esc(i.label)}</span></span></div>`).join('')}</div>
          ${r.items.length > 8 ? `<p class="hint" style="text-align:center">+ ${r.items.length - 8} produtos no arquivo</p>` : ''}</div>`
      });
    }
  }

  async function run(mode) {
    const o = opts();
    const { summary } = X().dataset(o);
    if (!summary.total) {
      const go = await ui.confirm({ title: 'Nada para exportar', message: 'Nenhum produto corresponde ao filtro escolhido. Exportar mesmo assim?', confirm: 'Exportar', icon: 'filter' });
      if (!go) return;
    }
    const name = X().fileBase(o);

    if (o.format === 'csv') {
      const L = ui.loading('Gerando planilha', 'Organizando colunas…');
      const csv = X().buildCSV(o);
      L.step('Pronto!', 100);
      await L.done(600);
      const r = await RS.native.exportFile(btoa(unescape(encodeURIComponent(csv))), 'text/csv', name + '.csv', mode);
      feedback(r, mode === 'save' ? 'Planilha salva' : null);
      return;
    }

    if (o.format === 'text') {
      const L = ui.loading('Gerando texto', 'Organizando produtos…');
      const text = X().buildText(o);
      L.step('Pronto!', 100);
      await L.done(600);
      if (mode === 'save') {
        try { await navigator.clipboard.writeText(text); ui.toast('Texto copiado', { type: 'ok', icon: 'copy' }); }
        catch (e) {
          const r = await RS.native.exportFile(btoa(unescape(encodeURIComponent(text))), 'text/plain', name + '.txt', 'save');
          feedback(r, 'Arquivo de texto salvo');
        }
      } else {
        const r = await RS.native.shareText(text, 'Relatório de validades');
        if (r && r.copied) ui.toast('Texto copiado para a área de transferência', { type: 'ok' });
      }
      return;
    }

    if (o.format === 'image') {
      const L = ui.loading('Gerando imagem', 'Desenhando o relatório…');
      await u.sleep(250);
      L.step('Desenhando o relatório…', 35);
      await u.sleep(50);
      const imgs = X().buildImages(o);
      L.step(imgs.length > 1 ? `${imgs.length} imagens prontas` : 'Imagem pronta', 80);
      const r = await RS.native.exportImages(imgs, name, mode === 'save' ? 'gallery' : 'share');
      L.step('Concluído', 100);
      await L.done(700);
      feedback(r, mode === 'save' ? (r.where === 'download' ? 'Imagem baixada' : 'Salvo em Imagens/RSStock') : null);
      return;
    }

    if (!RS.native.isApp) return ui.alert({ title: 'Disponível no app', message: 'O PDF é gerado pelo app Android. Na versão web, use Imagem ou Texto.', icon: 'pdf' });
    const L = ui.loading('Gerando PDF', 'Organizando produtos…');
    await u.sleep(200);
    L.step('Montando páginas…', 40);
    const report = X().buildReport(o);
    const r = await RS.native.exportPdf(report, name + '.pdf', mode);
    L.step('Concluído', 100);
    await L.done(800);
    feedback(r, mode === 'save' ? 'PDF salvo' : null);
  }

  function feedback(r, okMsg) {
    if (!r) return;
    if (r.ok && okMsg) ui.toast(okMsg, { type: 'ok' });
    else if (!r.ok && !r.cancelled) ui.toast(r.error || 'Não foi possível exportar', { type: 'err' });
  }
})();
