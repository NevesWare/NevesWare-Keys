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
    const anim = {
      forward: ['v-in-right', 'v-out-left'], back: ['v-in-left', 'v-out-right'],
      'tab-right': ['v-in-right', 'v-out-left'], 'tab-left': ['v-in-left', 'v-out-right'],
      fade: ['v-in-fade', 'v-out-fade'], up: ['v-in-up', 'v-out-fade']
    }[dir];
    if (anim && !s.settings.a11y.reduceMotion) {
      view.classList.add(anim[0]);
      if (old) {
        old.classList.add(anim[1]);
        setTimeout(() => old.remove(), 440);
      }
      setTimeout(() => view.classList.remove(anim[0]), 500);
    } else if (old) old.remove();

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
    if (id === 'add') return RS.editor.open();
    if (current && current.name === id) return;
    RS.app.go(id, {}, { tab: true });
  }

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
    if (what === 'products' && ['home', 'export', 'settings', 'settings.data', 'settings.history'].includes(current.name)) RS.app.refresh();
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

  window.addEventListener('resize', u.debounce(() => {
    moveIndicator();
    if (currentScreen && currentScreen.onResize && currentView) currentScreen.onResize(currentView);
  }, 120));

  /* ----- API chamada pelo Android ----- */
  window.App = {
    setInsets(top, bottom) {
      const r = document.documentElement.style;
      r.setProperty('--safe-top', Math.max(top, 8) + 'px');
      r.setProperty('--safe-bottom', Math.max(bottom, 6) + 'px');
    },
    setKeyboard(dp) {
      document.documentElement.classList.toggle('kb-open', dp > 0);
      const f = document.activeElement;
      if (dp > 0 && f && f.scrollIntoView) setTimeout(() => f.scrollIntoView({ block: 'center', behavior: 'smooth' }), 120);
    },
    handleBack() {
      if (RS.pin.locked) return false;
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
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (!RS.native.isApp) App.onResume();
  });

  /* ----- Splash + inicialização ----- */
  async function boot() {
    const bar = document.getElementById('splash-bar');
    const status = document.getElementById('splash-status');
    document.getElementById('splash-year').textContent = RS.config.year;
    const step = (pct, text) => { bar.style.width = pct + '%'; if (text) status.textContent = text; };
    const t0 = Date.now();

    try {
      const info = RS.native.info();
      if (info.insetTop != null) App.setInsets(info.insetTop, info.insetBottom);
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

    if (session && s.settings.security.pin) await RS.pin.lock();
    if (session) RS.app.welcome();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
