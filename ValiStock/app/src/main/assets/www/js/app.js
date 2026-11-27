/* Inicialização, navegação (rotas + hotbar) e integração com o Android. */
(function () {
  const u = VS.u, ui = VS.ui, s = VS.store;
  const TABS = [
    { id: 'home', label: 'Início', icon: 'home' },
    { id: 'products', label: 'Produtos', icon: 'box' },
    { id: 'add' },
    { id: 'export', label: 'Exportar', icon: 'export' },
    { id: 'settings', label: 'Ajustes', icon: 'sliders' }
  ];

  let history = [];
  let current = null;
  let hiddenAt = 0;

  function hotbar(active) {
    return `<nav class="hotbar glass" aria-label="Navegação">${TABS.map(t => t.id === 'add'
      ? `<button class="hb-add" data-tab="add" aria-label="Adicionar produto">${ui.icon('plus', 28, 2.4)}</button>`
      : `<button class="hb ${active === t.id ? 'on' : ''}" data-tab="${t.id}" aria-label="${t.label}">${ui.icon(t.icon, 23)}<span>${t.label}</span></button>`).join('')}</nav>`;
  }

  function render(dir) {
    const app = document.getElementById('app');
    const scr = VS.screens[current.name];
    if (!scr) return;
    if (render.prev && render.prev.unmount) render.prev.unmount();
    render.prev = scr;
    const showBar = scr.bar !== false;
    app.innerHTML = `<main class="view ${showBar ? '' : 'no-bar'} ${dir === 'back' ? 'enter-back' : dir === 'none' ? '' : 'enter'}" id="view">${scr.render(current.params || {})}</main>${showBar ? hotbar(scr.tab) : ''}`;
    const view = document.getElementById('view');
    if (scr.mount) scr.mount(view, current.params || {});
    const bar = app.querySelector('.hotbar');
    if (bar) bar.addEventListener('click', onBar);
  }

  function onBar(e) {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    ui.tap();
    const id = b.dataset.tab;
    if (id === 'add') return VS.editor.open();
    if (current && current.name === id) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    VS.app.go(id, {}, { tab: true });
  }

  VS.app = {
    go(name, params = {}, opt = {}) {
      ui.closeAll();
      const scr = VS.screens[name];
      if (!scr) return;
      if (opt.tab || (scr.tab === name)) history = [];
      else if (current) history.push(current);
      current = { name, params };
      window.scrollTo(0, 0);
      render();
    },
    back() {
      if (!history.length) return false;
      current = history.pop();
      render('back');
      return true;
    },
    refresh() {
      const y = window.scrollY;
      render('none');
      window.scrollTo(0, y);
    },
    async start(name) {
      history = [];
      current = { name, params: {} };
      window.scrollTo(0, 0);
      render();
    },
    get current() { return current; },

    /* Primeira entrada: oferece ativar as notificações. */
    welcome() {
      if (!s.settings.notif.enabled || s.settings.onboarded) return;
      s.set('onboarded', true);
      setTimeout(async () => {
        if (VS.native.notificationsAllowed()) return;
        const ok = await ui.confirm({ title: 'Ativar alertas de validade?', message: 'Receba um resumo diário quando produtos estiverem perto de vencer.', confirm: 'Ativar', cancel: 'Agora não', icon: 'bell' });
        if (ok) VS.native.requestNotifications();
      }, 900);
    }
  };

  /* Re-renderiza telas que dependem dos produtos quando eles mudam. */
  s.on(what => {
    if (!current) return;
    if (what === 'products' && (current.name === 'home' || current.name === 'export' || current.name === 'settings')) VS.app.refresh();
  });

  /* ----- API chamada pelo Android ----- */
  window.App = {
    setInsets(top, bottom) {
      const r = document.documentElement.style;
      r.setProperty('--safe-top', Math.max(top, 0) + 'px');
      r.setProperty('--safe-bottom', Math.max(bottom, 0) + 'px');
    },
    handleBack() {
      if (VS.pin.locked) return false;
      if (ui.closeTop()) return true;
      if (VS.app.back()) return true;
      if (current && current.name !== 'home' && VS.screens[current.name].bar !== false) { VS.app.go('home', {}, { tab: true }); return true; }
      return false;
    },
    onResume() {
      // Atualiza contagens (a data pode ter mudado) e bloqueia com PIN se configurado
      const away = hiddenAt && Date.now() - hiddenAt > 1500;
      if (current && away && !document.querySelector('.sheet.show')) VS.app.refresh();
      if (away && s.settings.security.pin && s.settings.security.lockOnResume && !VS.pin.locked && current && current.name !== 'auth') VS.pin.lock();
      hiddenAt = 0;
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (!VS.native.isApp) App.onResume();
  });

  /* ----- Splash + inicialização ----- */
  async function boot() {
    const bar = document.getElementById('splash-bar');
    const status = document.getElementById('splash-status');
    document.getElementById('splash-year').textContent = VS.config.year;
    const step = (pct, text) => { bar.style.width = pct + '%'; if (text) status.textContent = text; };
    const t0 = Date.now();

    try {
      const info = VS.native.info();
      if (info.insetTop != null) App.setInsets(info.insetTop, info.insetBottom);
    } catch (e) { /* */ }

    step(18, 'Carregando preferências…');
    await u.sleep(250);
    await s.load();
    step(46, 'Carregando estoque…');
    await VS.auth.init();
    await u.sleep(350);
    step(74, 'Preparando alertas…');
    await u.sleep(350);
    step(100, 'Pronto');
    const wait = 2200 - (Date.now() - t0);
    if (wait > 0) await u.sleep(wait);

    const session = VS.auth.session();
    VS.app.start(session ? 'home' : 'auth');
    document.getElementById('splash').classList.add('done');

    if (session && s.settings.security.pin) await VS.pin.lock();

    if (session) VS.app.welcome();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
