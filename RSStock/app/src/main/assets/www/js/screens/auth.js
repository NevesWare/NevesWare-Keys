/* Login / criação de conta (preparado para Supabase) + PIN de bloqueio. */
(function () {
  const u = RS.u, ui = RS.ui, cfg = RS.config;
  const I = ui.icon;
  let tab = 'signin';

  function pwField(name, placeholder, ac) {
    return `<div class="input"><span class="lead">${I('lock', 18)}</span>
      <input name="${name}" type="password" placeholder="${placeholder}" autocomplete="${ac}">
      <button type="button" class="act" data-eye style="background:none;color:var(--text-3)" aria-label="Mostrar senha">${I('eye', 18)}</button></div>`;
  }

  function signinForm() {
    return `<form data-form="signin" onsubmit="return false">
      <div class="field"><label>Nick ou e-mail</label><div class="input"><span class="lead">${I('user', 18)}</span>
        <input name="id" placeholder="seu_nick ou voce@email.com" autocomplete="username" autocapitalize="none"></div></div>
      <div class="field"><label>Senha</label>${pwField('password', 'Sua senha', 'current-password')}</div>
      <div style="text-align:right;margin:-4px 4px 18px"><button type="button" class="link" data-act="forgot">Esqueci minha senha</button></div>
      <button class="btn primary block" data-submit>${I('logout', 20)}Entrar</button>
    </form>`;
  }

  function signupForm() {
    return `<form data-form="signup" onsubmit="return false">
      <div class="field"><label>Nick</label><div class="input"><span class="lead">${I('user', 18)}</span>
        <input name="nick" placeholder="Escolha um nome de usuário" autocomplete="username" autocapitalize="none" maxlength="24"></div></div>
      <div class="field"><label>E-mail</label><div class="input"><span class="lead">${I('mail', 18)}</span>
        <input name="email" type="email" placeholder="voce@email.com" autocomplete="email" autocapitalize="none"></div></div>
      <div class="field"><label>Senha</label>${pwField('password', 'Mínimo de 6 caracteres', 'new-password')}</div>
      <div class="field"><label>Confirmar senha</label>${pwField('confirm', 'Repita a senha', 'new-password')}</div>
      <button class="btn primary block" data-submit>${I('sparkle', 20)}Criar conta</button>
    </form>`;
  }

  RS.screens.auth = {
    bar: false,
    render(params = {}) {
      if (params.tab) tab = params.tab;
      const fromSettings = params.from === 'settings';
      return `<div class="scroll" style="-webkit-mask-image:none;mask-image:none;padding-top:0"><div class="auth">
        ${fromSettings ? `<div><button class="icon-btn glass" data-back aria-label="Voltar">${I('back')}</button></div>` : ''}
        <div class="auth-brand">
          <img class="app-logo" src="${RS.logoSrc()}" alt="">
          <h1>${cfg.appName}</h1>
          <p>${tab === 'signin' ? 'Entre para acompanhar suas validades' : 'Crie sua conta em segundos'}</p>
        </div>

        <div class="auth-card glass">
          <div class="seg" style="margin-bottom:20px">
            <button class="${tab === 'signin' ? 'on' : ''}" data-tab="signin">Entrar</button>
            <button class="${tab === 'signup' ? 'on' : ''}" data-tab="signup">Criar conta</button>
          </div>
          <div data-forms>${tab === 'signin' ? signinForm() : signupForm()}</div>
          ${!RS.auth.isConfigured() ? `<p class="hint" style="text-align:center;margin-top:14px">${I('cloud', 14)} Contas na nuvem chegam em breve <span class="soon-tag">Em breve</span></p>` : ''}
        </div>

        ${fromSettings ? '' : `
        <div class="divider">ou</div>
        <button class="btn ghost block" data-act="guest">${I('user', 20)}Entrar como convidado</button>`}
        <button class="btn block" data-act="site" style="margin-top:8px;color:var(--text-2)">${I('globe', 18)}Visitar site ${cfg.features.site && cfg.siteUrl ? '' : '<span class="soon-tag">Em breve</span>'}</button>

        <footer class="auth-foot"><strong>${cfg.studio}</strong><br>© ${cfg.year} · Todos os direitos reservados</footer>
      </div></div>`;
    },

    mount(root, params = {}) {
      root.addEventListener('click', async e => {
        const t = e.target.closest('[data-tab],[data-act],[data-submit],[data-eye],[data-back]');
        if (!t) return;
        ui.tap();
        if (t.dataset.back != null) return RS.app.back();
        if (t.dataset.tab) {
          tab = t.dataset.tab;
          root.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b === t));
          const box = root.querySelector('[data-forms]');
          box.style.animation = 'none'; box.offsetHeight; box.style.animation = 'rise .4s var(--ease) both';
          box.innerHTML = tab === 'signin' ? signinForm() : signupForm();
          root.querySelector('.auth-brand p').textContent = tab === 'signin' ? 'Entre para acompanhar suas validades' : 'Crie sua conta em segundos';
          return;
        }
        if (t.dataset.eye != null) {
          const inp = t.parentElement.querySelector('input');
          inp.type = inp.type === 'password' ? 'text' : 'password';
          t.innerHTML = I(inp.type === 'password' ? 'eye' : 'eyeOff', 18);
          return;
        }
        if (t.dataset.act === 'guest') {
          const L = ui.loading('Preparando seu estoque', 'Configurando o modo convidado…');
          RS.auth.signInGuest();
          L.step('Carregando lojas e estoques…', 50);
          await RS.store.loadAccount();
          await u.sleep(500);
          L.step('Tudo pronto!', 100);
          await L.done(1100);
          RS.app.start('home');
          return RS.app.welcome();
        }
        if (t.dataset.act === 'site') return RS.openSite();
        if (t.dataset.act === 'forgot') {
          const email = await RS.askText('Recuperar senha', 'Seu e-mail');
          if (email == null) return;
          const r = await RS.auth.resetPassword(email);
          if (r.code === 'not_configured') comingSoon();
          return;
        }
        if (t.dataset.submit != null) {
          const f = t.closest('form');
          const v = n => (f.querySelector(`[name="${n}"]`) || {}).value || '';
          let r;
          if (f.dataset.form === 'signup') {
            if (!v('nick') || !v('email') || !v('password')) return ui.toast('Preencha todos os campos', { type: 'warn' });
            if (!/^\S+@\S+\.\S+$/.test(v('email'))) return ui.toast('E-mail inválido', { type: 'warn' });
            if (v('password').length < 6) return ui.toast('A senha precisa ter 6+ caracteres', { type: 'warn' });
            if (v('password') !== v('confirm')) return ui.toast('As senhas não coincidem', { type: 'warn' });
            r = await withSpinner(t, () => RS.auth.signUp({ nick: v('nick').trim(), email: v('email').trim(), password: v('password') }));
          } else {
            if (!v('id') || !v('password')) return ui.toast('Informe seu nick/e-mail e senha', { type: 'warn' });
            r = await withSpinner(t, () => RS.auth.signIn(v('id').trim(), v('password')));
          }
          if (r.ok) return RS.app.start('home');
          if (r.code === 'not_configured') return comingSoon();
          ui.toast(r.message || 'Não foi possível entrar', { type: 'err' });
        }
      });
    }
  };

  async function withSpinner(btn, fn) {
    const html = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner sm"></span>Conectando…';
    await u.sleep(700);
    const r = await fn();
    btn.disabled = false;
    btn.innerHTML = html;
    return r;
  }

  async function comingSoon() {
    const guest = !RS.auth.session();
    const v = await ui.dialog({
      title: 'Contas em breve',
      message: 'O login com nick e senha e a criação de conta com e-mail estão chegando, com sincronização na nuvem. ' + (guest ? 'Por enquanto, entre como convidado — seus dados ficam salvos neste aparelho.' : ''),
      icon: 'cloud',
      buttons: guest ? [{ label: 'Fechar', value: false, cancel: true }, { label: 'Usar convidado', value: true, style: 'primary' }] : [{ label: 'Entendi', value: false, style: 'primary', cancel: true }]
    });
    if (v) root().querySelector('[data-act="guest"]').click();
  }
  const root = () => document.getElementById('view');

  /* ============================== PIN ============================== */
  function pinPad({ title, subtitle = '', fullscreen = false, check }) {
    return new Promise(resolve => {
      let value = '';
      const html = `
        <div style="text-align:center;padding-top:${fullscreen ? '12vh' : '8px'}">
          ${fullscreen ? `<img class="app-logo" src="${RS.logoSrc()}" alt="" style="margin:0 auto 18px">` : ''}
          <h2 class="h2" data-pt>${u.esc(title)}</h2>
          <p class="hint" data-ps style="text-align:center">${u.esc(subtitle)}</p>
          <div class="pin-dots" data-dots>${'<i></i>'.repeat(4)}</div>
          <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'del'].map(k => k === '' ? '<button class="blank"></button>'
            : `<button class="glass-lite" data-k="${k}">${k === 'del' ? I('back', 26) : k}</button>`).join('')}</div>
        </div>`;
      let el, ctl;
      const finish = v => { if (ctl) ctl.close(v); else { el.remove(); resolve(v); } };
      const onKey = async k => {
        ui.tap();
        if (k === 'del') value = value.slice(0, -1);
        else if (value.length < 4) value += k;
        el.querySelectorAll('[data-dots] i').forEach((d, i) => d.classList.toggle('on', i < value.length));
        if (value.length === 4) {
          const res = await check(value, { el, setTitle: t => el.querySelector('[data-pt]').textContent = t, setSub: t => el.querySelector('[data-ps]').textContent = t });
          if (res === true || (res && res.done)) { await u.sleep(120); finish(res === true ? value : res.value); }
          else {
            const dots = el.querySelector('[data-dots]');
            if (res !== 'next') { dots.classList.add('shake'); ui.tap(40); }
            await u.sleep(res === 'next' ? 150 : 420);
            dots.classList.remove('shake');
            value = '';
            dots.querySelectorAll('i').forEach(d => d.classList.remove('on'));
          }
        }
      };
      if (fullscreen) {
        el = document.createElement('div');
        el.style.cssText = 'position:fixed;inset:0;z-index:90;background:var(--bg);padding:var(--safe-top) 20px 20px';
        el.innerHTML = `<div class="bg" style="position:absolute"><i class="blob b1"></i><i class="blob b2"></i></div><div style="position:relative">${html}</div>`;
        document.body.appendChild(el);
        el.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) onKey(b.dataset.k); });
      } else {
        ctl = ui.sheet({
          title: 'PIN', body: html,
          onMount(sheetEl) { el = sheetEl; sheetEl.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) onKey(b.dataset.k); }); },
          onClose(v) { resolve(v || null); }
        });
      }
    });
  }

  RS.pin = {
    async create() {
      let first = null;
      return pinPad({
        title: 'Crie um PIN', subtitle: 'Escolha 4 dígitos',
        check(v, h) {
          if (!first) { first = v; h.setTitle('Confirme o PIN'); h.setSub('Digite novamente'); return 'next'; }
          if (v === first) return true;
          first = null; h.setTitle('Crie um PIN'); h.setSub('Os PINs não coincidem. Tente de novo.');
          return false;
        }
      });
    },
    async verify(title) {
      const hash = RS.store.settings.security.pin;
      const r = await pinPad({ title: title || 'Digite seu PIN', check: async v => (await u.sha256('rs:' + v)) === hash });
      return !!r;
    },
    /* Tela cheia de bloqueio — resolve quando o PIN correto for digitado. */
    lock() {
      const hash = RS.store.settings.security.pin;
      RS.pin.locked = true;
      return pinPad({ title: 'RS Stock bloqueado', subtitle: 'Digite seu PIN para continuar', fullscreen: true, check: async v => (await u.sha256('rs:' + v)) === hash })
        .then(() => { RS.pin.locked = false; });
    },
    locked: false
  };
})();
