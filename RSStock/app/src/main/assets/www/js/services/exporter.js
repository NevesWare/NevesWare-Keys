/* Exportação com o nome da loja: PDF (nativo), imagem em folhas (PNG), texto e planilha. */
(function () {
  const u = RS.u;
  const FILTERS = {
    all: 'Todos os produtos',
    alerts: 'Precisam de atenção',
    expired: 'Somente vencidos',
    soon: 'Menos de 7 dias',
    mid: '7 a 30 dias',
    ok: 'Mais de 30 dias'
  };
  const EMOJI = { expired: '⚫', soon: '🔴', mid: '🟡', ok: '🟢' };
  const TITLE = { expired: 'VENCIDOS', soon: 'VENCEM EM MENOS DE 7 DIAS', mid: 'VENCEM DE 7 A 30 DIAS', ok: 'MAIS DE 30 DIAS' };

  function emptySummary() { return { total: 0, expired: 0, soon: 0, mid: 0, ok: 0, units: 0 }; }

  /* Agrupa por loja: [{ store, list, summary }] */
  function dataset(opts) {
    const s = RS.store;
    const stores = opts.scope === 'all' ? s.stores : [s.current()].filter(Boolean);
    const groups = stores.map(st => {
      const list = s.query({ status: opts.filter, sort: opts.sort, storeId: st.id });
      const summary = emptySummary();
      list.forEach(p => { summary.total++; summary[p.status]++; summary.units += Number(p.quantity) || 0; });
      return { store: st, list, summary };
    });
    const summary = emptySummary();
    groups.forEach(g => Object.keys(summary).forEach(k => { summary[k] += g.summary[k]; }));
    const list = [].concat(...groups.map(g => g.list.map(p => Object.assign({ storeName: g.store.name }, p))));
    return { groups, list, summary };
  }

  function titleName(opts) {
    const s = RS.store;
    return opts.scope === 'all' ? 'Todas as lojas' : (s.current() ? s.current().name : 'Estoque');
  }
  function fileBase(opts) {
    const n = u.norm(titleName(opts)).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return 'RSStock-' + (n || 'estoque') + '-' + u.stamp();
  }
  const qtyFmt = n => (Math.round(n * 100) / 100).toLocaleString('pt-BR');

  /* ---------------- Texto (WhatsApp) ---------------- */
  function buildText(opts) {
    const { groups, summary } = dataset(opts);
    const inc = opts.include;
    const LINE = '━━━━━━━━━━━━━━━━━━━━';
    const L = [];
    L.push(LINE);
    L.push('📦 *RS STOCK · VALIDADES*');
    if (groups.length === 1) {
      L.push('🏪 *' + groups[0].store.name.toUpperCase() + '*');
      if (groups[0].store.address) L.push('📍 ' + groups[0].store.address);
    } else L.push('🏪 *TODAS AS LOJAS* (' + groups.length + ')');
    L.push('🗓️ ' + u.fmtNow());
    if (opts.filter !== 'all') L.push('🔎 ' + FILTERS[opts.filter]);
    L.push(LINE);
    L.push('');
    L.push('📊 *RESUMO* — ' + u.plural(summary.total, 'produto', 'produtos') + ' · ' + qtyFmt(summary.units) + ' un.');
    u.STATUSES.forEach(k => { if (opts.filter === 'all' || summary[k]) L.push(`${EMOJI[k]} ${u.statusName[k]}: *${summary[k]}*`); });

    groups.forEach(g => {
      if (groups.length > 1) {
        L.push('');
        L.push(LINE);
        L.push('🏪 *' + g.store.name.toUpperCase() + '* — ' + u.plural(g.summary.total, 'produto', 'produtos'));
        L.push(LINE);
      }
      if (!g.list.length) { L.push(''); L.push('_Nenhum produto com esse filtro._'); return; }
      u.STATUSES.forEach(k => {
        const items = g.list.filter(p => p.status === k);
        if (!items.length) return;
        L.push('');
        L.push(`${EMOJI[k]} *${TITLE[k]} (${items.length})*`);
        items.forEach(p => {
          L.push(`▸ *${p.name}*`);
          L.push(`    📅 ${u.fmtDate(p.expiry)} · ${u.rel(p.days)}`);
          const extra = [];
          if (inc.qty) extra.push('📦 ' + u.fmtQty(p.quantity, p.unit));
          if (inc.category && p.category) extra.push('🏷️ ' + p.category);
          if (extra.length) L.push('    ' + extra.join(' · '));
          if (inc.barcode && p.barcode) L.push('    🔢 ' + p.barcode);
          if (p.batch) L.push('    🔖 Lote ' + p.batch);
        });
      });
    });
    L.push('');
    L.push(LINE);
    L.push('_Gerado pelo RS Stock · ' + RS.config.studio + '_');
    return L.join('\n');
  }

  /* ---------------- PDF (desenhado no Android) ---------------- */
  function buildReport(opts) {
    const { list, summary, groups } = dataset(opts);
    const ac = RS.store.accent();
    const st = groups.length === 1 ? groups[0].store : null;
    return {
      title: titleName(opts),
      subtitle: 'Relatório de validades · ' + FILTERS[opts.filter] + ' · ' + u.plural(list.length, 'produto', 'produtos') + ' · ' + qtyFmt(summary.units) + ' unidades',
      store: st && st.address ? st.address : (groups.length > 1 ? groups.length + ' lojas' : ''),
      generatedAt: u.fmtNow(),
      accent: ac.a,
      columns: opts.include,
      showStore: groups.length > 1,
      summary,
      items: list.map(p => ({
        name: p.name,
        barcode: p.barcode || '',
        category: groups.length > 1 ? p.storeName : (p.category || '—'),
        qty: u.fmtQty(p.quantity, p.unit),
        expiry: u.fmtDate(p.expiry),
        label: u.rel(p.days),
        status: p.status
      }))
    };
  }

  /* ---------------- Imagem em folhas (formato tela de celular 9:16) ---------------- */
  const LOGOS = { def: new Image(), coca: new Image() };
  LOGOS.def.src = 'img/logo.png';
  LOGOS.coca.src = 'img/logo-coca.png';
  const W = 540, H = 960, S = 2;            // 1080 × 1920 px
  const ROW = 58, GAP = 8, SEC = 34, FOOT = 64;

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

  function palette() {
    const t = document.documentElement.dataset.theme;
    const css = getComputedStyle(document.documentElement);
    const v = n => css.getPropertyValue(n).trim();
    const base = {
      dark: { bg: '#07080d', glass: 'rgba(255,255,255,.07)', stroke: 'rgba(255,255,255,.12)', T: '#f3f4fa', T2: 'rgba(243,244,250,.65)', T3: 'rgba(243,244,250,.42)' },
      light: { bg: '#eef1f7', glass: 'rgba(255,255,255,.7)', stroke: 'rgba(255,255,255,.95)', T: '#0e1020', T2: 'rgba(14,16,32,.6)', T3: 'rgba(14,16,32,.42)' },
      coca: { bg: '#fff6f6', glass: 'rgba(255,255,255,.92)', stroke: 'rgba(228,0,15,.12)', T: '#2a0306', T2: 'rgba(42,3,6,.62)', T3: 'rgba(42,3,6,.42)' }
    }[t] || {};
    return Object.assign(base, { coca: t === 'coca', dark: t === 'dark', col: { expired: '#050507', soon: v('--c-soon'), mid: v('--c-mid'), ok: v('--c-ok') } });
  }

  /* Divide os itens em folhas sem esticar a imagem. */
  function paginate(groups, multi) {
    const pages = [];
    let cur = [], y = 0, first = true;
    const top = () => (first ? 268 : 120);
    const limit = H - FOOT - 12;
    const push = (row, h) => {
      if (top() + y + h > limit && cur.length) { pages.push(cur); cur = []; y = 0; first = false; }
      cur.push(row); y += h;
    };
    groups.forEach(g => {
      if (multi) push({ kind: 'store', store: g.store, n: g.list.length }, SEC + GAP);
      if (!g.list.length) push({ kind: 'empty' }, ROW + GAP);
      g.list.forEach(p => push({ kind: 'item', p }, ROW + GAP));
    });
    if (cur.length || !pages.length) pages.push(cur);
    return pages;
  }

  function renderPage(rows, ctxInfo, pageIdx, total) {
    const P = palette(), { opts, summary, title, address } = ctxInfo;
    const ac = RS.store.accent();
    const font = '"Google Sans", Roboto, system-ui, sans-serif';
    const cv = document.createElement('canvas');
    cv.width = W * S; cv.height = H * S;
    const ctx = cv.getContext('2d');
    ctx.scale(S, S);

    // Fundo
    ctx.fillStyle = P.bg; ctx.fillRect(0, 0, W, H);
    const blob = (x, y, r, c, a) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, c + Math.round(a * 255).toString(16).padStart(2, '0'));
      g.addColorStop(1, c + '00');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    };
    if (P.coca) {
      ctx.fillStyle = '#e4000f';
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 120);
      ctx.bezierCurveTo(W * .7, 175, W * .45, 95, W * .25, 135); ctx.bezierCurveTo(W * .12, 160, W * .05, 140, 0, 150); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, 150); ctx.bezierCurveTo(W * .05, 140, W * .12, 160, W * .25, 135); ctx.bezierCurveTo(W * .45, 95, W * .7, 175, W, 120); ctx.stroke();
      for (let i = 0; i < 26; i++) { ctx.beginPath(); ctx.arc((i * 97) % W, 200 + (i * 173) % (H - 260), 2 + (i % 5) * 1.6, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(228,0,15,.12)'; ctx.lineWidth = 1.2; ctx.stroke(); }
    } else {
      blob(40, 40, 360, ac.a, P.dark ? .5 : .3);
      blob(W, H * .45, 380, ac.b, P.dark ? .35 : .24);
      blob(W * .3, H, 340, '#ff6fb5', P.dark ? .25 : .18);
    }
    const onHeader = P.coca ? '#ffffff' : P.T, onHeader2 = P.coca ? 'rgba(255,255,255,.85)' : P.T2;
    const glass = (x, y, w, h, r) => { rr(ctx, x, y, w, h, r); ctx.fillStyle = P.glass; ctx.fill(); ctx.strokeStyle = P.stroke; ctx.lineWidth = 1; ctx.stroke(); };

    // Marca
    let y = 30;
    const LOGO = P.coca ? LOGOS.coca : LOGOS.def;
    if (LOGO.complete && LOGO.naturalWidth) ctx.drawImage(LOGO, 24, y, 34, 34);
    ctx.fillStyle = onHeader; ctx.font = `700 16px ${font}`; ctx.fillText('RS Stock', 66, y + 15);
    ctx.fillStyle = onHeader2; ctx.font = `500 10.5px ${font}`; ctx.fillText(RS.config.studio, 66, y + 29);
    ctx.textAlign = 'right';
    ctx.fillStyle = onHeader2; ctx.font = `500 10.5px ${font}`; ctx.fillText(u.fmtNow(), W - 24, y + 15);
    ctx.fillStyle = onHeader; ctx.font = `700 11px ${font}`; ctx.fillText(`Folha ${pageIdx + 1} de ${total}`, W - 24, y + 29);
    ctx.textAlign = 'left';
    y += 58;

    if (pageIdx === 0) {
      ctx.fillStyle = onHeader; ctx.font = `750 25px ${font}`; ctx.fillText(fit(ctx, title, W - 48), 24, y + 18);
      ctx.fillStyle = onHeader2; ctx.font = `500 11.5px ${font}`;
      ctx.fillText(fit(ctx, (address ? address + ' · ' : '') + 'Validades · ' + FILTERS[opts.filter] + ' · ' + u.plural(summary.total, 'produto', 'produtos'), W - 48), 24, y + 38);
      y += 62;
      const tiles = u.STATUSES.map(k => [u.statusShort[k], summary[k], P.col[k], k]);
      const tw = (W - 48 - 24) / 4;
      tiles.forEach((t, i) => {
        const x = 24 + i * (tw + 8);
        glass(x, y, tw, 70, 16);
        ctx.beginPath(); ctx.arc(x + 15, y + 19, 4.5, 0, Math.PI * 2); ctx.fillStyle = t[2]; ctx.fill();
        if (t[3] === 'expired' && P.dark) { ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.2; ctx.stroke(); }
        ctx.fillStyle = P.T2; ctx.font = `650 10.5px ${font}`; ctx.fillText(t[0], x + 25, y + 23);
        ctx.fillStyle = P.T; ctx.font = `750 24px ${font}`; ctx.fillText(String(t[1]), x + 13, y + 56);
      });
      y += 92;
    } else {
      ctx.fillStyle = onHeader; ctx.font = `700 16px ${font}`; ctx.fillText(fit(ctx, title + ' · continuação', W - 48), 24, y + 6);
      y += 26;
    }

    rows.forEach(r => {
      if (r.kind === 'store') {
        ctx.fillStyle = r.store.color; rr(ctx, 24, y + 6, 22, 22, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `800 9px ${font}`; ctx.textAlign = 'center'; ctx.fillText(u.initials(r.store.name), 35, y + 20.5); ctx.textAlign = 'left';
        ctx.fillStyle = P.coca ? '#e4000f' : P.T; ctx.font = `750 14px ${font}`; ctx.fillText(fit(ctx, r.store.name, W - 160), 54, y + 22);
        ctx.fillStyle = P.T3; ctx.font = `600 11px ${font}`; ctx.textAlign = 'right'; ctx.fillText(u.plural(r.n, 'produto', 'produtos'), W - 24, y + 22); ctx.textAlign = 'left';
        y += SEC + GAP;
        return;
      }
      if (r.kind === 'empty') {
        glass(24, y, W - 48, ROW, 16);
        ctx.fillStyle = P.T2; ctx.font = `500 12.5px ${font}`; ctx.fillText('Nenhum produto com esse filtro.', 42, y + 34);
        y += ROW + GAP;
        return;
      }
      const p = r.p, c = P.col[p.status];
      glass(24, y, W - 48, ROW, 16);
      rr(ctx, 24, y + 14, 4, ROW - 28, 2); ctx.fillStyle = c; ctx.fill();
      const right = W - 40;
      ctx.textAlign = 'right';
      if (p.status === 'expired') {
        ctx.font = `800 9.5px ${font}`;
        const tw = ctx.measureText('VENCIDO').width + 14;
        rr(ctx, right - tw, y + 12, tw, 18, 6); ctx.fillStyle = '#050507'; ctx.fill();
        if (P.dark) { ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.stroke(); }
        ctx.fillStyle = '#fff'; ctx.fillText('VENCIDO', right - 7, y + 24.5);
      } else {
        ctx.fillStyle = c; ctx.font = `750 12.5px ${font}`; ctx.fillText(u.rel(p.days, true), right, y + 25);
      }
      ctx.fillStyle = P.T3; ctx.font = `500 10.5px ${font}`; ctx.fillText(u.fmtDate(p.expiry), right, y + 43);
      ctx.textAlign = 'left';
      ctx.fillStyle = P.T; ctx.font = `650 13.5px ${font}`;
      ctx.fillText(fit(ctx, p.name, W - 48 - 150), 42, y + 25);
      const sub = [];
      if (opts.include.qty) sub.push(u.fmtQty(p.quantity, p.unit));
      if (opts.include.category && p.category) sub.push(p.category);
      if (opts.include.barcode && p.barcode) sub.push(p.barcode);
      ctx.fillStyle = P.T2; ctx.font = `500 10.5px ${font}`;
      ctx.fillText(fit(ctx, sub.join('  ·  ') || u.statusName[p.status], W - 48 - 150), 42, y + 43);
      y += ROW + GAP;
    });

    // Rodapé
    ctx.strokeStyle = P.coca ? 'rgba(228,0,15,.2)' : P.stroke; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(24, H - FOOT + 8); ctx.lineTo(W - 24, H - FOOT + 8); ctx.stroke();
    ctx.fillStyle = P.T3; ctx.font = `500 10.5px ${font}`;
    ctx.fillText('Gerado pelo RS Stock · ' + RS.config.studio, 24, H - 30);
    ctx.textAlign = 'right'; ctx.fillStyle = P.coca ? '#e4000f' : P.T2; ctx.font = `700 11px ${font}`;
    ctx.fillText(`Folha ${pageIdx + 1}/${total}`, W - 24, H - 30); ctx.textAlign = 'left';
    return cv.toDataURL('image/png');
  }

  function buildImages(opts) {
    const { groups, summary } = dataset(opts);
    const multi = groups.length > 1;
    const pages = paginate(groups, multi);
    const info = { opts, summary, title: titleName(opts), address: !multi && groups[0] ? groups[0].store.address : '' };
    return pages.map((rows, i) => renderPage(rows, info, i, pages.length));
  }

  /* ---------------- Planilha (CSV para Excel / Google Planilhas) ---------------- */
  function buildCSV(opts) {
    const { list } = dataset(opts);
    const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const head = ['Loja', 'Produto', 'Código de barras', 'Categoria', 'Quantidade', 'Unidade', 'Validade', 'Dias restantes', 'Situação', 'Lote', 'Local', 'Observações'];
    const rows = list.map(p => [p.storeName, p.name, p.barcode, p.category, String(p.quantity).replace('.', ','), p.unit, u.fmtDate(p.expiry), p.days, u.statusName[p.status], p.batch, p.location, p.notes]);
    return '﻿' + [head].concat(rows).map(r => r.map(q).join(';')).join('\r\n');
  }

  RS.exporter = { FILTERS, dataset, buildText, buildReport, buildImages, buildCSV, fileBase, titleName };
})();
