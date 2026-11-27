/* Exportação: PDF (nativo), imagem (canvas → PNG) e texto. */
(function () {
  const u = VS.u;
  const FILTERS = {
    all: 'Todos os produtos',
    alerts: 'Precisam de atenção',
    expired: 'Somente vencidos',
    soon: 'Vencem em breve',
    ok: 'Em dia'
  };

  function dataset(opts) {
    const s = VS.store;
    let list = s.query({ status: opts.filter === 'soon' ? 'all' : opts.filter, sort: opts.sort });
    if (opts.filter === 'soon') list = list.filter(p => p.status === 'soon' || p.status === 'today');
    const summary = { total: list.length, expired: 0, today: 0, soon: 0, ok: 0, units: 0 };
    list.forEach(p => { summary[p.status]++; summary.units += Number(p.quantity) || 0; });
    return { list, summary };
  }

  function meta() {
    const pr = VS.store.settings.profile;
    return { store: pr.store || '', owner: pr.name || '', generatedAt: u.fmtNow() };
  }

  /* ---------------- Texto ---------------- */
  function buildText(opts) {
    const { list, summary } = dataset(opts);
    const m = meta(), inc = opts.include;
    const mark = { expired: '🔴', today: '🟠', soon: '🟡', ok: '🟢' };
    const L = [];
    L.push('📦 *ValiStock — Relatório de validades*');
    if (m.store) L.push('🏪 ' + m.store);
    L.push('🗓️ ' + m.generatedAt);
    L.push('🔎 ' + FILTERS[opts.filter]);
    L.push('');
    L.push(`Total: ${summary.total} · Vencidos: ${summary.expired} · Hoje: ${summary.today} · Próximos: ${summary.soon} · Em dia: ${summary.ok}`);
    L.push('━━━━━━━━━━━━━━━━━━');
    if (!list.length) L.push('Nenhum produto com esse filtro.');
    list.forEach((p, i) => {
      L.push('');
      L.push(`${mark[p.status]} *${i + 1}. ${p.name}*`);
      L.push(`   Validade: ${u.fmtDate(p.expiry)} (${u.rel(p.days)})`);
      const extra = [];
      if (inc.qty) extra.push('Qtd: ' + u.fmtQty(p.quantity, p.unit));
      if (inc.category && p.category) extra.push('Categoria: ' + p.category);
      if (extra.length) L.push('   ' + extra.join(' · '));
      if (inc.barcode && p.barcode) L.push('   Código: ' + p.barcode);
      if (p.batch) L.push('   Lote: ' + p.batch);
    });
    L.push('');
    L.push('━━━━━━━━━━━━━━━━━━');
    L.push('Gerado pelo ValiStock · ' + VS.config.studio);
    return L.join('\n');
  }

  /* ---------------- PDF (desenhado no Android) ---------------- */
  function buildReport(opts) {
    const { list, summary } = dataset(opts);
    const m = meta();
    const ac = VS.config.accents[VS.store.settings.accent] || VS.config.accents.violet;
    return {
      title: 'Relatório de validades',
      subtitle: FILTERS[opts.filter] + ' · ' + u.plural(list.length, 'produto', 'produtos') + ' · ' + u.plural(summary.units, 'unidade', 'unidades'),
      store: m.store || m.owner,
      generatedAt: m.generatedAt,
      accent: ac.a,
      columns: opts.include,
      summary,
      items: list.map(p => ({
        name: p.name,
        barcode: p.barcode || '',
        category: p.category || '—',
        qty: u.fmtQty(p.quantity, p.unit),
        expiry: u.fmtDate(p.expiry),
        label: u.rel(p.days),
        status: p.status
      }))
    };
  }

  /* ---------------- Imagem ---------------- */
  const PER_IMAGE = 40;

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fit(ctx, text, max) {
    if (ctx.measureText(text).width <= max) return text;
    while (text.length > 1 && ctx.measureText(text + '…').width > max) text = text.slice(0, -1);
    return text + '…';
  }

  function renderImage(list, summary, opts, page, pages) {
    const dark = VS.store.isDark();
    const ac = VS.config.accents[VS.store.settings.accent] || VS.config.accents.violet;
    const css = getComputedStyle(document.documentElement);
    const col = { expired: css.getPropertyValue('--c-expired').trim(), today: css.getPropertyValue('--c-today').trim(), soon: css.getPropertyValue('--c-soon').trim(), ok: css.getPropertyValue('--c-ok').trim() };
    const font = '"Google Sans", Roboto, system-ui, sans-serif';
    const S = 2, W = 1080 / S;          // desenha em 540 de largura lógica, escala 2x
    const ROW = 64, HEAD = page === 0 ? 300 : 120, FOOT = 70;
    const H = HEAD + Math.max(1, list.length) * (ROW + 10) + FOOT + 20;

    const cv = document.createElement('canvas');
    cv.width = W * S; cv.height = H * S;
    const ctx = cv.getContext('2d');
    ctx.scale(S, S);

    // Fundo com manchas de cor (efeito vidro)
    ctx.fillStyle = dark ? '#07080d' : '#eef1f7';
    ctx.fillRect(0, 0, W, H);
    const blob = (x, y, r, c, a) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c + Math.round(a * 255).toString(16).padStart(2, '0'));
      g.addColorStop(1, c + '00');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    };
    blob(40, 40, 360, ac.a, dark ? .55 : .35);
    blob(W, H * .45, 380, ac.b, dark ? .4 : .28);
    blob(W * .3, H, 340, '#ff6fb5', dark ? .28 : .2);

    const glass = (x, y, w, h, r) => {
      rr(ctx, x, y, w, h, r);
      ctx.fillStyle = dark ? 'rgba(255,255,255,.07)' : 'rgba(255,255,255,.62)';
      ctx.fill();
      ctx.strokeStyle = dark ? 'rgba(255,255,255,.12)' : 'rgba(255,255,255,.9)';
      ctx.lineWidth = 1; ctx.stroke();
    };
    const T = dark ? '#f3f4fa' : '#0e1020', T2 = dark ? 'rgba(243,244,250,.65)' : 'rgba(14,16,32,.6)', T3 = dark ? 'rgba(243,244,250,.42)' : 'rgba(14,16,32,.42)';
    const m = meta();

    let y = 34;
    // Marca
    const grad = ctx.createLinearGradient(24, y, 60, y + 36);
    grad.addColorStop(0, ac.a); grad.addColorStop(1, ac.b);
    rr(ctx, 24, y, 36, 36, 12); ctx.fillStyle = grad; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(33, y + 18); ctx.lineTo(39.5, y + 24.5); ctx.lineTo(51, y + 12); ctx.stroke();
    ctx.fillStyle = T; ctx.font = `700 17px ${font}`; ctx.fillText('ValiStock', 70, y + 16);
    ctx.fillStyle = T3; ctx.font = `500 11px ${font}`; ctx.fillText(VS.config.studio, 70, y + 31);
    ctx.textAlign = 'right';
    ctx.fillStyle = T2; ctx.font = `500 11px ${font}`; ctx.fillText(m.generatedAt, W - 24, y + 16);
    if (pages > 1) { ctx.fillStyle = T3; ctx.fillText(`Parte ${page + 1} de ${pages}`, W - 24, y + 31); }
    else if (m.store) { ctx.fillStyle = T3; ctx.fillText(fit(ctx, m.store, 200), W - 24, y + 31); }
    ctx.textAlign = 'left';
    y += 64;

    if (page === 0) {
      ctx.fillStyle = T; ctx.font = `700 26px ${font}`; ctx.fillText('Validades do estoque', 24, y + 20);
      ctx.fillStyle = T2; ctx.font = `500 12px ${font}`;
      ctx.fillText(FILTERS[opts.filter] + ' · ' + u.plural(summary.total, 'produto', 'produtos') + (m.store && pages > 1 ? ' · ' + m.store : ''), 24, y + 42);
      y += 66;
      const tiles = [['Vencidos', summary.expired, col.expired], ['Hoje', summary.today, col.today], ['Próximos', summary.soon, col.soon], ['Em dia', summary.ok, col.ok]];
      const tw = (W - 48 - 30) / 4;
      tiles.forEach((t, i) => {
        const x = 24 + i * (tw + 10);
        glass(x, y, tw, 74, 18);
        ctx.fillStyle = t[2]; ctx.beginPath(); ctx.arc(x + 16, y + 20, 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = T2; ctx.font = `600 11px ${font}`; ctx.fillText(t[0], x + 26, y + 24);
        ctx.fillStyle = T; ctx.font = `700 26px ${font}`; ctx.fillText(String(t[1]), x + 14, y + 60);
      });
      y += 96;
    }

    if (!list.length) {
      glass(24, y, W - 48, ROW, 18);
      ctx.fillStyle = T2; ctx.font = `500 13px ${font}`; ctx.fillText('Nenhum produto com esse filtro.', 42, y + 38);
    }
    list.forEach(p => {
      glass(24, y, W - 48, ROW, 18);
      const c = col[p.status];
      rr(ctx, 24, y + 16, 4, ROW - 32, 2); ctx.fillStyle = c; ctx.fill();
      const right = W - 40;
      ctx.textAlign = 'right';
      ctx.fillStyle = c; ctx.font = `700 13px ${font}`; ctx.fillText(u.rel(p.days, true), right, y + 27);
      ctx.fillStyle = T3; ctx.font = `500 11px ${font}`; ctx.fillText(u.fmtDate(p.expiry), right, y + 45);
      ctx.textAlign = 'left';
      ctx.fillStyle = T; ctx.font = `650 14px ${font}`;
      ctx.fillText(fit(ctx, p.name, W - 48 - 150), 42, y + 27);
      const sub = [];
      if (opts.include.qty) sub.push(u.fmtQty(p.quantity, p.unit));
      if (opts.include.category && p.category) sub.push(p.category);
      if (opts.include.barcode && p.barcode) sub.push(p.barcode);
      ctx.fillStyle = T2; ctx.font = `500 11px ${font}`;
      ctx.fillText(fit(ctx, sub.join('  ·  ') || u.statusName[p.status], W - 48 - 150), 42, y + 45);
      y += ROW + 10;
    });

    ctx.fillStyle = T3; ctx.font = `500 11px ${font}`; ctx.textAlign = 'center';
    ctx.fillText('Gerado pelo ValiStock · ' + VS.config.studio, W / 2, H - 30);
    return cv.toDataURL('image/png');
  }

  function buildImages(opts) {
    const { list, summary } = dataset(opts);
    const pages = Math.max(1, Math.ceil(list.length / PER_IMAGE));
    const out = [];
    for (let i = 0; i < pages; i++) out.push(renderImage(list.slice(i * PER_IMAGE, (i + 1) * PER_IMAGE), summary, opts, i, pages));
    return out;
  }

  VS.exporter = { FILTERS, dataset, buildText, buildReport, buildImages };
})();
