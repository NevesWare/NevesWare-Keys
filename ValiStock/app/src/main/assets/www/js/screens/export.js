/* Exportar: PDF, imagem ou texto, com filtros e campos. */
(function () {
  const u = VS.u, ui = VS.ui, s = VS.store, X = () => VS.exporter;

  const FORMATS = [
    { id: 'pdf', icon: 'pdf', title: 'PDF', desc: 'Relatório profissional em A4, pronto para imprimir ou enviar.', a: '#ff5470', b: '#ff8a3d' },
    { id: 'image', icon: 'image', title: 'Imagem', desc: 'Foto com todos os produtos e validades — ótima para WhatsApp.', a: '#7c5cff', b: '#4cc9ff' },
    { id: 'text', icon: 'text', title: 'Texto', desc: 'Lista organizada em texto para copiar e colar onde quiser.', a: '#10b981', b: '#22d3ee' }
  ];
  const SORTS = [
    { value: 'expiry', label: 'Validade mais próxima', icon: 'calendar' },
    { value: 'name', label: 'Nome (A–Z)', icon: 'type' },
    { value: 'qty', label: 'Maior quantidade', icon: 'layers' }
  ];

  const opts = () => s.settings.export;

  function summaryHtml() {
    const { summary } = X().dataset(opts());
    return `<div><b class="num" style="font-size:1.4rem">${summary.total}</b> <span class="muted">${summary.total === 1 ? 'produto será exportado' : 'produtos serão exportados'}</span></div>
      <button class="btn ghost sm" data-act="preview">${ui.icon('eye', 18)}Prévia</button>`;
  }

  VS.screens.export = {
    tab: 'export',
    render() {
      const o = opts();
      return `
        <header class="topbar"><div class="grow"><p class="eyebrow">Relatórios</p><h1 class="h1">Exportar</h1></div></header>

        <div class="stagger">
          <div class="export-opts">
            ${FORMATS.map(f => `<button class="xopt glass ${o.format === f.id ? 'on' : ''}" data-format="${f.id}" style="--a:${f.a};--b:${f.b}">
              <span class="xi">${ui.icon(f.icon, 24)}</span>
              <span class="ct"><b>${f.title}</b><small>${f.desc}</small></span><span class="radio"></span></button>`).join('')}
          </div>

          <div>
            <div class="group-label">O que exportar</div>
            <div class="chips" style="padding-top:0">
              ${Object.entries(X().FILTERS).map(([k, l]) => `<button class="chip glass-lite ${o.filter === k ? 'on' : ''}" data-filter="${k}">${l}</button>`).join('')}
            </div>
          </div>

          <div>
            <div class="group-label">Detalhes</div>
            <div class="group glass-lite">
              <button class="cell" data-act="sort"><span class="ci" style="--cc:#6366f1">${ui.icon('sort', 18)}</span>
                <span class="ct"><b>Ordenar por</b></span><span class="cv">${u.esc((SORTS.find(x => x.value === o.sort) || SORTS[0]).label)} ${ui.icon('chev', 18)}</span></button>
              ${[['qty', 'Quantidade', 'layers', '#10b981'], ['category', 'Categoria', 'tag', '#f59e0b'], ['barcode', 'Código de barras', 'hash', '#06b6d4']].map(([k, l, ic, c]) => `
                <button class="cell" data-inc="${k}"><span class="ci" style="--cc:${c}">${ui.icon(ic, 18)}</span>
                  <span class="ct"><b>Incluir ${l.toLowerCase()}</b></span><span class="switch ${o.include[k] ? 'on' : ''}"></span></button>`).join('')}
            </div>
          </div>

          <div class="export-summary glass-lite" data-summary>${summaryHtml()}</div>

          <div class="btn-row" style="margin-top:16px">
            <button class="btn ghost" data-run="save">${ui.icon(o.format === 'image' ? 'download' : 'save', 20)}${o.format === 'text' ? 'Copiar' : 'Salvar'}</button>
            <button class="btn primary" data-run="share">${ui.icon('share', 20)}Compartilhar</button>
          </div>
        </div>`;
    },

    mount(root) {
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-format],[data-filter],[data-inc],[data-act],[data-run]');
        if (!t) return;
        ui.tap();
        if (t.dataset.format) { s.set('export.format', t.dataset.format); return VS.app.refresh(); }
        if (t.dataset.filter) { s.set('export.filter', t.dataset.filter); return VS.app.refresh(); }
        if (t.dataset.inc) {
          const k = t.dataset.inc;
          s.set('export.include.' + k, !opts().include[k]);
          t.querySelector('.switch').classList.toggle('on', opts().include[k]);
          return;
        }
        if (t.dataset.act === 'sort') {
          const v = await ui.menu({ title: 'Ordenar por', options: SORTS, value: opts().sort });
          if (v) { s.set('export.sort', v); VS.app.refresh(); }
          return;
        }
        if (t.dataset.act === 'preview') return preview();
        if (t.dataset.run) return run(t.dataset.run);
      });
    }
  };

  function preview() {
    const o = opts();
    if (o.format === 'text') {
      ui.sheet({ title: 'Prévia do texto', body: `<div class="card glass-lite"><div class="preview-text">${u.esc(X().buildText(o))}</div></div>` });
    } else if (o.format === 'image') {
      const ctl = ui.sheet({ title: 'Prévia da imagem', body: `<div style="padding:40px 0;text-align:center"><div class="spinner"></div></div>` });
      setTimeout(() => {
        const imgs = X().buildImages(o);
        ctl.setBody(imgs.map(src => `<img class="preview-img" src="${src}" alt="Prévia" style="margin-bottom:12px">`).join('') +
          (imgs.length > 1 ? `<p class="hint" style="text-align:center">${imgs.length} imagens (40 produtos por imagem)</p>` : ''));
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
    const name = 'ValiStock-' + u.stamp();

    if (o.format === 'text') {
      const L = ui.loading('Gerando texto', 'Organizando produtos…');
      const text = X().buildText(o);
      L.step('Pronto!', 100);
      await L.done(600);
      if (mode === 'save') {
        try { await navigator.clipboard.writeText(text); ui.toast('Texto copiado', { type: 'ok', icon: 'copy' }); }
        catch (e) {
          const r = await VS.native.exportFile(btoa(unescape(encodeURIComponent(text))), 'text/plain', name + '.txt', 'save');
          feedback(r, 'Arquivo de texto salvo');
        }
      } else {
        const r = await VS.native.shareText(text, 'Relatório de validades');
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
      const r = await VS.native.exportImages(imgs, name, mode === 'save' ? 'gallery' : 'share');
      L.step('Concluído', 100);
      await L.done(700);
      feedback(r, mode === 'save' ? (r.where === 'download' ? 'Imagem baixada' : 'Salvo em Imagens/ValiStock') : null);
      return;
    }

    if (!VS.native.isApp) return ui.alert({ title: 'Disponível no app', message: 'O PDF é gerado pelo app Android. Na versão web, use Imagem ou Texto.', icon: 'pdf' });
    const L = ui.loading('Gerando PDF', 'Organizando produtos…');
    await u.sleep(200);
    L.step('Montando páginas…', 40);
    const report = X().buildReport(o);
    const r = await VS.native.exportPdf(report, name + '.pdf', mode);
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
