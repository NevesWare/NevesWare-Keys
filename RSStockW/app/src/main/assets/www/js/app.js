/* Inicialização, navegação estilo app (telas fixas + transições) e integração com o Android. */
(function () {
  const u = RS.u, ui = RS.ui, s = RS.store;
  const TABS = [
    { id: 'home', label: 'Início', icon: 'home' },
    { id: 'products', label: 'Produtos', icon: 'box' },
    { id: 'add' },
    { id: 'export', label: 'Exportar', icon: 'export' },
    { id: 'settings', label: 'Ajustes', icon: 'sliders' }
  ];
  const TAB_INDEX = { home: 0, products: 1, export: 3, settings: 4 };

  let history = [];
  let current = null;
  let currentScreen = null;
  let currentView = null;
  let hiddenAt = 0;

  /* ----- Estrutura fixa: palco + hotbar ----- */
  function shell() {
    const app = document.getElementById('app');
    app.innerHTML = `<div id="stage"></div>
      <nav class="hotbar glass away" aria-label="Navegação"><span class="hb-ind"></span>${TABS.map(t => t.id === 'add'
        ? `<button class="hb-add" data-tab="add" aria-label="Adicionar produto">${ui.icon('plus', 28, 2.4)}</button>`
        : `<button class="hb" data-tab="${t.id}" aria-label="${t.label}">${ui.icon(t.icon, 23)}<span>${t.label}</span></button>`).join('')}</nav>`;
    app.querySelector('.hotbar').addEventListener('click', onBar);
  }

  function updateBar(scr) {
    const bar = document.querySelector('.hotbar');
    if (!bar) return;
    const show = scr.bar !== false;
    bar.classList.toggle('away', !show);
    bar.querySelectorAll('.hb').forEach(b => b.classList.toggle('on', b.dataset.tab === scr.tab));
    moveIndicator();
  }

  function moveIndicator() {
    const bar = document.querySelector('.hotbar');
    const on = bar && bar.querySelector('.hb.on');
    const ind = bar && bar.querySelector('.hb-ind');
    if (!ind) return;
    if (!on) { ind.style.opacity = '0'; return; }
    ind.style.opacity = '1';
    ind.style.width = on.offsetWidth + 'px';
    ind.style.transform = `translateX(${on.offsetLeft}px)`;
  }

  /* dir: 'forward' | 'back' | 'tab-left' | 'tab-right' | 'fade' | 'none' */
  function render(dir) {
    const stage = document.getElementById('stage');
    const scr = RS.screens[current.name];
    if (!scr || !stage) return;
    if (currentScreen && currentScreen.unmount) currentScreen.unmount();

    const view = document.createElement('main');
    view.className = 'view' + (scr.bar === false ? ' no-bar' : '');
    view.id = 'view';
    view.innerHTML = scr.render(current.params || {});

    const old = currentView;
    if (old) old.removeAttribute('id');
    // sobras de transições anteriores (toques rápidos) saem na hora
    Array.from(stage.children).forEach(v => { if (v !== old) v.remove(); });
    if (old) old.classList.remove('p-in-right', 'p-in-left', 'c-in-zoom', 'c-in-up', 'c-in-right', 'c-in-left');

    // Atualização da MESMA tela (sincronização, dados mudaram): sem animação de entrada
    // e mantendo a rolagem — antes a tela "piscava" e voltava para o topo.
    if (dir === 'none' && old) {
      view.classList.add('no-enter');
      const ys = Array.from(old.querySelectorAll('.scroll,[data-list],.sheet-body')).map(e => e.scrollTop);
      stage.replaceChild(view, old);
      requestAnimationFrame(() => { Array.from(view.querySelectorAll('.scroll,[data-list],.sheet-body')).forEach((e, i) => { if (ys[i]) e.scrollTop = ys[i]; }); });
      setTimeout(() => view.classList.remove('no-enter'), 700);
      currentView = view; currentScreen = scr;
      if (scr.mount) scr.mount(view, current.params || {});
      requestAnimationFrame(() => { Array.from(view.querySelectorAll('.scroll,[data-list],.sheet-body')).forEach((e, i) => { if (ys[i]) e.scrollTop = ys[i]; }); });
      updateBar(scr);
      return;
    }

    /* Transições sem piscar no Android: as telas NUNCA mudam de opacidade (isso desliga/liga o vidro
       fosco dos cartões e causava o pisca). Ou elas se empurram (só movimento), ou uma cortina lisa
       cobre a troca. */
    const style = s.settings.anim || 'suave';
    const reduce = s.settings.a11y.reduceMotion || style === 'nenhuma';
    const side = { forward: 1, 'tab-right': 1, back: -1, 'tab-left': -1 }[dir] || 0;
    const pushStyle = (style === 'suave' || style === 'deslizar') && side !== 0;
    if (!old || reduce || !dir || dir === 'none') {
      if (old) old.remove();
    } else if (pushStyle) {
      const ms = style === 'suave' ? 360 : 420;
      view.classList.add(side > 0 ? 'p-in-right' : 'p-in-left');
      old.classList.add(side > 0 ? 'p-out-left' : 'p-out-right');
      setTimeout(() => old.remove(), ms + 30);
      setTimeout(() => view.classList.remove('p-in-right', 'p-in-left'), ms + 60);
    } else {
      // cortina: cobre a tela antiga, troca por baixo e revela a nova com um leve movimento
      const curtain = document.createElement('div');
      curtain.className = 'curtain';
      stage.appendChild(curtain);
      view.style.visibility = 'hidden';
      const cls = style === 'zoom' ? 'c-in-zoom' : style === 'subir' || dir === 'up' ? 'c-in-up' : side ? (side > 0 ? 'c-in-right' : 'c-in-left') : 'c-in-zoom';
      setTimeout(() => {
        old.remove();
        view.style.visibility = '';
        view.classList.add(cls);
        curtain.classList.add('out');
        setTimeout(() => { curtain.remove(); view.classList.remove(cls); }, 300);
      }, 150);
    }

    stage.appendChild(view);
    currentView = view;
    currentScreen = scr;
    if (scr.mount) scr.mount(view, current.params || {});
    updateBar(scr);
  }

  function onBar(e) {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    ui.tap();
    const id = b.dataset.tab;
    if (id === 'add') return quickAdd(b);
    if (current && current.name === id) return;
    RS.app.go(id, {}, { tab: true });
  }

  /* Menu rápido do botão + */
  let dialOpen = null;
  function quickAdd(btn) {
    if (dialOpen) return dialOpen.close();
    if (!s.current()) return RS.stores.form();
    const acts = [
      { k: 'product', icon: 'plus', c: 'var(--accent)', t: 'Novo produto', d: 'Cadastrar validade' },
      { k: 'scan', icon: 'scan', c: '#06b6d4', t: 'Escanear', d: 'Buscar ou cadastrar' },
      { k: 'out', icon: 'upload', c: '#ff3b4e', t: 'Dar baixa', d: 'Saída do estoque' },
      { k: 'in', icon: 'download', c: '#10b981', t: 'Entrada', d: 'Repor estoque' },
      { k: 'store', icon: 'home', c: '#f59e0b', t: 'Nova loja', d: 'Criar outro estoque', wide: true }
    ];
    const scrim = document.createElement('div'); scrim.className = 'dial-scrim';
    const dial = document.createElement('div'); dial.className = 'dial';
    dial.innerHTML = acts.map(a => `<button class="glass ${a.wide ? 'wide' : ''}" data-k="${a.k}" style="--dc:${a.c}"><span class="di">${ui.icon(a.icon, 22)}</span><span><b>${a.t}</b><small>${a.d}</small></span></button>`).join('');
    document.getElementById('app').append(scrim, dial);
    btn.classList.add('open');
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('show'); dial.classList.add('show'); }));
    const ctl = {
      close(after) {
        const i = ui.stack.indexOf(ctl); if (i >= 0) ui.stack.splice(i, 1);
        dialOpen = null;
        btn.classList.remove('open');
        scrim.classList.remove('show'); dial.classList.remove('show');
        setTimeout(() => { scrim.remove(); dial.remove(); }, 380);
        if (after) setTimeout(after, 160);
      }
    };
    dialOpen = ctl;
    ui.stack.push(ctl);
    scrim.onclick = () => ctl.close();
    dial.addEventListener('click', e => {
      const b = e.target.closest('[data-k]');
      if (!b) return;
      ui.tap();
      const k = b.dataset.k;
      ctl.close(async () => {
        if (k === 'product') RS.editor.open();
        else if (k === 'store') RS.stores.form();
        else if (k === 'scan') {
          const code = await RS.scanner.scan();
          if (!code) return;
          const p = s.byBarcode(code);
          if (p && p.storeId === s.settings.currentStoreId) RS.detail.open(p.id); else RS.editor.openWithBarcode(code);
        } else if (k === 'out' || k === 'in') {
          const id = await RS.pickProduct(k === 'out' ? 'Dar baixa em qual produto?' : 'Entrada em qual produto?');
          if (id) RS.moveSheet(id, k);
        }
      });
    });
  }

  /* Escolher um produto da loja atual (busca + código de barras). */
  RS.pickProduct = function (title) {
    return new Promise(resolve => {
      let picked = null;
      const draw = (q = '') => {
        const list = s.query({ text: q, sort: 'expiry' }).slice(0, 60);
        return list.length ? `<div class="list">${list.map(p => RS.itemRow(p)).join('')}</div>` : `<div class="empty"><h3>Nada encontrado</h3><p>Tente outro nome ou escaneie o código.</p></div>`;
      };
      ui.sheet({
        title,
        body: `<div class="search glass-lite" style="margin-bottom:12px">${ui.icon('search', 20)}<input data-q placeholder="Buscar produto…" autocomplete="off">
          <button class="icon-btn" data-scan style="width:38px;height:38px">${ui.icon('scan', 18)}</button></div><div data-l>${draw()}</div>`,
        onMount(el, ctl) {
          const q = ctl.$('[data-q]');
          q.addEventListener('input', u.debounce(() => { ctl.$('[data-l]').innerHTML = draw(q.value); }, 120));
          el.addEventListener('click', async e => {
            const it = e.target.closest('[data-open]');
            if (it) { ui.tap(); picked = it.dataset.open; return ctl.close(); }
            if (e.target.closest('[data-scan]')) {
              const code = await RS.scanner.scan();
              const p = code && s.byBarcode(code);
              if (p) { picked = p.id; ctl.close(); } else if (code) ui.toast('Código não encontrado nesta loja', { type: 'warn' });
            }
          });
        },
        onClose() { setTimeout(() => resolve(picked), 260); }
      });
    });
  };

  RS.app = {
    go(name, params = {}, opt = {}) {
      ui.closeAll();
      const scr = RS.screens[name];
      if (!scr) return;
      const from = current ? RS.screens[current.name] : null;
      let dir = 'forward';
      if (opt.tab || scr.tab === name) {
        const a = from ? TAB_INDEX[from.tab] : 0, b = TAB_INDEX[name];
        dir = from && from.tab === name ? 'back' : (b >= a ? 'tab-right' : 'tab-left');
        history = [];
      } else if (current) history.push(current);
      current = { name, params };
      render(opt.dir || dir);
    },
    back() {
      if (!history.length) return false;
      current = history.pop();
      render('back');
      return true;
    },
    refresh() { render('none'); },
    start(name, dir = 'fade') {
      history = [];
      current = { name, params: {} };
      render(dir);
    },
    get current() { return current; },

    /* Primeira entrada: oferece ativar as notificações. */
    welcome() {
      if (!s.settings.notif.enabled || s.settings.onboarded) return;
      s.set('onboarded', true);
      setTimeout(async () => {
        if (RS.native.notificationsAllowed()) return;
        const ok = await ui.confirm({ title: 'Ativar alertas de validade?', message: 'Receba um resumo diário quando produtos estiverem perto de vencer.', confirm: 'Ativar', cancel: 'Agora não', icon: 'bell' });
        if (ok) RS.native.requestNotifications();
      }, 900);
    }
  };

  /* Atualiza telas que dependem dos produtos quando eles mudam. */
  s.on(what => {
    if (!current) return;
    if (what === 'products' && ['home', 'export', 'settings', 'settings.data', 'history'].includes(current.name)) RS.app.refresh();
    if ((what === 'store' || what === 'stores' || what === 'all') && ['export', 'settings', 'history', 'settings.data'].includes(current.name)) RS.app.refresh();
  });

  /* ----- Efeito de toque (ripple) em todos os botões ----- */
  const RIPPLE = '.btn,.cell,.tile,.item,.chip,.fmt,.stat,.quick button,.hb,.day,.icon-btn,.keypad button,.theme-card,.xopt';
  document.addEventListener('pointerdown', e => {
    if (s.settings.a11y.reduceMotion) return;
    const el = e.target.closest(RIPPLE);
    if (!el || el.classList.contains('static')) return;
    const r = el.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const w = document.createElement('span');
    w.className = 'rp-wave';
    w.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    el.classList.add('rp-host');
    el.appendChild(w);
    setTimeout(() => w.remove(), 650);
  }, { passive: true });

  // Comportamento de app: sem menu de contexto, sem zoom por gesto
  document.addEventListener('contextmenu', e => { if (!e.target.closest('input,textarea')) e.preventDefault(); });
  document.addEventListener('gesturestart', e => e.preventDefault());

  let lastLayout = null;
  window.addEventListener('resize', u.debounce(() => {
    const lay = s.compatInfo().layout;
    if (lay !== lastLayout) { lastLayout = lay; s.applyAppearance(); }
    moveIndicator();
    if (currentScreen && currentScreen.onResize && currentView) currentScreen.onResize(currentView);
  }, 120));

  /* ----- API chamada pelo Android ----- */
  window.App = Object.assign(window.App || {}, {
    setInsets(top, bottom) {
      const r = document.documentElement.style;
      r.setProperty('--safe-top', Math.max(top, 8) + 'px');
      r.setProperty('--safe-bottom', Math.max(bottom, 6) + 'px');
    },
    /* Volta do login com Google (rsstock://login-callback) */
    async onDeepLink(url) {
      if (!url || !/login-callback/.test(url)) return;
      const L = ui.loading('Entrando com Google', 'Confirmando sua conta…');
      const r = await RS.auth.handleCallback(url);
      await L.done(400);
      if (r.ok) return RS.afterLogin();
      if (r.message) ui.toast(r.message, { type: 'err' });
    },
    setKeyboard(dp) {
      document.documentElement.classList.toggle('kb-open', dp > 0);
      const f = document.activeElement;
      if (dp > 0 && f && f.scrollIntoView) setTimeout(() => f.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
    },
    handleBack() {
      if (RS.pin.locked || (RS.updater && RS.updater.blocking)) return false;
      if (ui.closeTop()) return true;
      if (currentScreen && currentScreen.onBack && currentScreen.onBack()) return true;
      if (RS.app.back()) return true;
      if (current && current.name !== 'home' && currentScreen.bar !== false) { RS.app.go('home', {}, { tab: true }); return true; }
      return false;
    },
    onResume() {
      const away = hiddenAt && Date.now() - hiddenAt > 1500;
      if (current && away && !document.querySelector('.sheet.show')) RS.app.refresh();
      if (away && s.settings.security.pin && s.settings.security.lockOnResume && !RS.pin.locked && current && current.name !== 'auth' && current.name !== 'intro') RS.pin.lock();
      hiddenAt = 0;
      if (away && RS.updater) RS.updater.check();
      if (away && RS.auth.isUser()) { RS.auth.touch(); RS.repo.push(); }
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (!RS.native.isApp) App.onResume();
  });

  /* ----- Splash + inicialização ----- */
  async function boot() {
    const bar = document.getElementById('splash-bar');
    const status = document.getElementById('splash-status');
    document.getElementById('splash-year').textContent = RS.config.year;
    try { const iv = RS.native.info(); document.getElementById('splash-ver').textContent = 'Versão ' + (iv.version || RS.config.version) + (iv.versionCode ? ' (' + iv.versionCode + ')' : ''); } catch (e) { /* */ }
    const step = (pct, text) => { bar.style.width = pct + '%'; if (text) status.textContent = text; };
    const t0 = Date.now();

    try {
      const info = RS.native.info();
      if (info.insetTop != null) App.setInsets(info.insetTop, info.insetBottom);
    } catch (e) { /* */ }

    // Se o Android reabriu em modo seguro (fechou da última vez), volta o tema para o padrão uma única vez
    try {
      const info0 = RS.native.info();
      if (info0.safeMode && !sessionStorage.getItem('rs.safeApplied')) { sessionStorage.setItem('rs.safeApplied', '1'); s.safeReset(); }
    } catch (e) { /* */ }
    step(16, 'Carregando preferências…');
    await u.sleep(250);
    await s.load();
    step(42, 'Carregando estoque…');
    await RS.auth.init();
    await u.sleep(350);
    step(70, 'Preparando alertas…');
    await u.sleep(350);
    step(100, 'Pronto');
    const wait = 2300 - (Date.now() - t0);
    if (wait > 0) await u.sleep(wait);

    shell();
    const session = RS.auth.session();
    const first = !s.settings.introSeen && !session;
    RS.app.start(first ? 'intro' : session ? 'home' : 'auth', 'up');
    document.getElementById('splash').classList.add('done');
    if (window.__rsBootDone) window.__rsBootDone();

    if (session && s.settings.security.pin) await RS.pin.lock();
    if (session) RS.app.welcome();
    showCrashReport();
    setTimeout(() => RS.updater && RS.updater.check(false), 1500);
  }

  /* Se o app fechou sozinho da última vez, mostra o relatório para enviar ao suporte. */
  function showCrashReport() {
    const B = window.AndroidBridge;
    if (!B || !B.crashReport) return;
    let rep = '';
    try { rep = B.crashReport(); } catch (e) { rep = ''; }
    if (!rep) return;
    setTimeout(() => {
      ui.sheet({
        title: 'O app fechou da última vez',
        body: `<p class="hint" style="margin:0 4px 12px">Ativamos o <b>modo seguro</b> (sem efeitos pesados) para ele não fechar de novo. Toque em <b>Copiar</b> e envie este relatório para o suporte.</p>
          <div class="card glass-lite"><div class="preview-text" style="max-height:260px">${u.esc(rep)}</div></div>`,
        foot: `<div class="btn-row"><button class="btn ghost" data-close-rep>Fechar</button><button class="btn primary" data-copy>${ui.icon('copy', 18)}Copiar relatório</button></div>`,
        onMount(el, ctl) {
          ctl.$('[data-copy]').onclick = () => { try { B.copyText(rep); } catch (e) { /* */ } ui.toast('Relatório copiado', { type: 'ok', icon: 'copy' }); };
          ctl.$('[data-close-rep]').onclick = () => ctl.close();
        },
        onClose() { try { B.clearCrashReport(); } catch (e) { /* */ } }
      });
    }, 1800);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
