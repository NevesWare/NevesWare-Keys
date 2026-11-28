/* RS Admin — navegação, tema e inicialização */
(function () {
  const u = RS.u, ui = RS.ui, api = RS.api;
  const THEME = 'rsadmin.theme';
  const TABS = [
    { id: 'dash', label: 'Painel', icon: 'home' },
    { id: 'accounts', label: 'Contas', icon: 'user' },
    { id: 'releases', label: 'Versões', icon: 'package' },
    { id: 'settings', label: 'Ajustes', icon: 'sliders' }
  ];
  const IDX = { dash: 0, accounts: 1, releases: 2, settings: 3 };

  // estado mínimo usado pelos componentes compartilhados (ui.js)
  RS.store = { settings: { haptics: true, a11y: { reduceMotion: false } }, isDark: () => RS.admin.theme() === 'dark' };

  let history = [], current = null, curScreen = null, curView = null;

  function shell() {
    document.getElementById('app').innerHTML = `<div id="stage"></div>
      <nav class="hotbar glass away"><span class="hb-ind"></span>${TABS.map(t => `<button class="hb" data-tab="${t.id}">${ui.icon(t.icon, 23)}<span>${t.label}</span></button>`).join('')}</nav>`;
    document.querySelector('.hotbar').addEventListener('click', e => {
      const b = e.target.closest('[data-tab]');
      if (!b || (current && current.name === b.dataset.tab)) return;
      ui.tap();
      RS.app.go(b.dataset.tab, {}, { tab: true });
    });
  }

  function moveInd() {
    const bar = document.querySelector('.hotbar'), on = bar && bar.querySelector('.hb.on'), ind = bar && bar.querySelector('.hb-ind');
    if (!ind) return;
    if (!on) { ind.style.opacity = 0; return; }
    ind.style.opacity = 1; ind.style.width = on.offsetWidth + 'px'; ind.style.transform = `translateX(${on.offsetLeft}px)`;
  }

  function render(dir) {
    const scr = RS.screens[current.name];
    const stage = document.getElementById('stage');
    const view = document.createElement('main');
    view.className = 'view' + (scr.bar === false ? ' no-bar' : '');
    view.innerHTML = scr.render(current.params || {});
    const old = curView;
    if (old) old.removeAttribute('id');
    view.id = 'view';
    const anim = { forward: ['v-in-right', 'v-out-left'], back: ['v-in-left', 'v-out-right'], fade: ['v-in-fade', 'v-out-fade'] }[dir];
    if (anim) { view.classList.add(anim[0]); if (old) { old.classList.add(anim[1]); setTimeout(() => old.remove(), 440); } setTimeout(() => view.classList.remove(anim[0]), 500); }
    else if (old) old.remove();
    stage.appendChild(view);
    curView = view; curScreen = scr;
    if (scr.mount) scr.mount(view, current.params || {});
    const bar = document.querySelector('.hotbar');
    bar.classList.toggle('away', scr.bar === false);
    bar.querySelectorAll('.hb').forEach(b => b.classList.toggle('on', b.dataset.tab === scr.tab));
    moveInd();
  }

  RS.app = {
    go(name, params = {}, opt = {}) {
      ui.closeAll();
      const scr = RS.screens[name];
      let dir = 'forward';
      if (opt.tab) { const a = current ? IDX[RS.screens[current.name].tab] || 0 : 0; dir = IDX[name] >= a ? 'forward' : 'back'; history = []; }
      else if (current) history.push(current);
      current = { name, params };
      render(dir);
    },
    back() { if (!history.length) return false; current = history.pop(); render('back'); return true; },
    refresh() { render(); },
    start(name) { history = []; current = { name, params: {} }; render('fade'); }
  };

  RS.admin = {
    me: null,
    theme() { try { return localStorage.getItem(THEME) || 'dark'; } catch (e) { return 'dark'; } },
    setTheme(t) {
      try { localStorage.setItem(THEME, t); } catch (e) { /* */ }
      document.documentElement.dataset.theme = t;
      RS.native.setSystemBars(t === 'dark');
    },
    async enter() {
      const L = ui.loading('Abrindo painel', 'Carregando dados…');
      this.me = await api.me();
      await L.done(600);
      RS.app.start('dash');
    },
    /* Formulário rápido numa folha: fields = [[chave, rótulo, placeholder, valor]] */
    form(title, fields, okLabel = 'Salvar', extraHtml = '', onExtra) {
      return new Promise(resolve => {
        let out = null;
        ui.sheet({
          title,
          body: fields.map(([k, l, ph, v]) => `<div class="field"><label>${u.esc(l)}</label><div class="input"><input data-k="${k}" ${k === 'password' ? 'type="password"' : ''} placeholder="${u.esc(ph || '')}" value="${u.esc(v || '')}" autocomplete="off" autocapitalize="none"></div></div>`).join('') + extraHtml,
          foot: `<button class="btn primary block" data-ok>${ui.icon('check', 20)}${u.esc(okLabel)}</button>`,
          onMount(el, ctl) {
            setTimeout(() => { const f = ctl.$('[data-k]'); if (f) f.focus(); }, 400);
            ctl.$('[data-ok]').onclick = () => {
              const r = {}; let ok = true;
              ctl.$$('[data-k]').forEach(i => { r[i.dataset.k] = i.value.trim(); if (!i.value.trim() && !/opcional/i.test(i.closest('.field').textContent)) ok = false; });
              if (!ok) return ui.toast('Preencha os campos', { type: 'warn' });
              out = r; ctl.close();
            };
            const d = ctl.$('[data-del]');
            if (d && onExtra) d.onclick = () => onExtra(ctl);
          },
          onClose() { resolve(out); }
        });
      });
    }
  };

  window.App = Object.assign(window.App || {}, {
    setInsets(top, bottom) {
      const r = document.documentElement.style;
      r.setProperty('--safe-top', Math.max(top, 8) + 'px');
      r.setProperty('--safe-bottom', Math.max(bottom, 6) + 'px');
    },
    setKeyboard() { /* */ },
    handleBack() {
      if (ui.closeTop()) return true;
      if (RS.app.back()) return true;
      if (current && current.name !== 'dash' && current.name !== 'login') { RS.app.go('dash', {}, { tab: true }); return true; }
      return false;
    },
    onResume() { /* */ }
  });

  window.addEventListener('resize', u.debounce(moveInd, 120));
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('.btn,.cell,.row,.chip,.acc,.kpi,.act-tile,.hb,.icon-btn,.item');
    if (!el || el.classList.contains('static')) return;
    const r = el.getBoundingClientRect(), size = Math.max(r.width, r.height) * 2.2, w = document.createElement('span');
    w.className = 'rp-wave';
    w.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - r.left - size / 2}px;top:${e.clientY - r.top - size / 2}px`;
    el.classList.add('rp-host'); el.appendChild(w); setTimeout(() => w.remove(), 650);
  }, { passive: true });

  async function boot() {
    RS.admin.setTheme(RS.admin.theme());
    try { const info = RS.native.info(); if (info.insetTop != null) App.setInsets(info.insetTop, info.insetBottom); } catch (e) { /* */ }
    const bar = document.getElementById('splash-bar'), st = document.getElementById('splash-status');
    bar.style.width = '30%';
    api.init();
    let session = null;
    try { session = await api.session(); } catch (e) { /* */ }
    bar.style.width = '70%'; st.textContent = session ? 'Verificando acesso…' : 'Pronto';
    let ok = false;
    if (session) { try { ok = await api.checkAdmin(); } catch (e) { ok = false; } }
    bar.style.width = '100%';
    await u.sleep(900);
    shell();
    if (ok) { RS.admin.me = await api.me(); RS.app.start('dash'); } else { if (session) await api.signOut(); RS.app.start('login'); }
    document.getElementById('splash').classList.add('done');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
