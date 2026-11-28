/* ==========================================================================
   Contas (Supabase Auth): cadastro com nick + e-mail, login por nick OU e-mail,
   recuperação/troca de senha, perfil, bloqueio e modo convidado (offline).
   ========================================================================== */
(function () {
  const KEY = 'rs.session.v1';
  const cfg = RS.config;

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function write(s) { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); }

  const ERR = {
    'Invalid login credentials': 'Usuário ou senha incorretos.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar (veja sua caixa de entrada).',
    'User already registered': 'Este e-mail já tem uma conta. Faça login.',
    'Password should be at least 6 characters': 'A senha precisa ter pelo menos 6 caracteres.',
    'User is banned': 'Esta conta está bloqueada. Fale com o suporte.',
    'Failed to fetch': 'Sem conexão com a internet.',
    'Network request failed': 'Sem conexão com a internet.'
  };
  function msg(e) {
    const m = (e && (e.message || e.error_description || e.msg)) || String(e || 'Erro');
    for (const k in ERR) if (m.includes(k)) return ERR[k];
    if (/rate limit/i.test(m)) return 'Muitas tentativas. Aguarde um pouco e tente de novo.';
    if (/network|fetch/i.test(m)) return 'Sem conexão com a internet.';
    return m;
  }

  const auth = {
    client: null,
    profile: null,   // { role, status, nick, name, email }

    isConfigured() { return !!(cfg.features.accounts && cfg.supabase.url && cfg.supabase.anonKey && window.supabase); },

    async init() {
      if (!this.isConfigured()) return;
      this.client = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'implicit', storage: window.localStorage, storageKey: 'rs.sb.auth' }
      });
      try {
        const { data } = await this.client.auth.getSession();
        const cur = read();
        if (data && data.session) {
          const u = data.session.user;
          write({ kind: 'user', id: u.id, email: u.email, nick: (cur && cur.nick) || (u.user_metadata && u.user_metadata.nick) || '' });
          this.touch();
        } else if (cur && cur.kind === 'user') {
          // sessão expirou/foi revogada: mantém os dados locais, mas volta ao login
          write(null);
        }
      } catch (e) { /* sem internet: segue com a sessão local */ }
      this.client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') { const c = read(); if (c && c.kind === 'user') write(null); }
        if (event === 'PASSWORD_RECOVERY') RS.ui && RS.ui.toast('Defina sua nova senha em Ajustes › Segurança', { icon: 'key' });
      });
    },

    session() { return read(); },
    isGuest() { const s = read(); return !s || s.kind === 'guest'; },
    isUser() { const s = read(); return !!(s && s.kind === 'user'); },

    signInGuest() {
      const s = { kind: 'guest', id: 'guest', nick: '', email: '', createdAt: new Date().toISOString() };
      write(s);
      return { ok: true, session: s };
    },

    /* Login por nick OU e-mail */
    async signIn(identifier, password) {
      if (!identifier || !password) return { ok: false, message: 'Preencha usuário e senha.' };
      if (!this.client) return { ok: false, code: 'not_configured' };
      try {
        let email = identifier.trim();
        if (!email.includes('@')) {
          const { data, error } = await this.client.rpc('email_for_nick', { p_nick: email });
          if (error) throw error;
          if (!data) return { ok: false, message: 'Nick não encontrado.' };
          email = data;
        }
        const { data, error } = await this.client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const u = data.user;
        write({ kind: 'user', id: u.id, email: u.email, nick: (u.user_metadata && u.user_metadata.nick) || '' });
        const p = await this.touch();
        if (p && p.status === 'blocked') { await this.signOut(); return { ok: false, message: 'Esta conta está bloqueada. Fale com o suporte.' }; }
        return { ok: true };
      } catch (e) { return { ok: false, message: msg(e) }; }
    },

    /* Cadastro só com nick + senha (a função "signup" do servidor cria a conta já confirmada). */
    async signUp({ nick, password, name }) {
      if (!nick || !password) return { ok: false, message: 'Preencha o nick e a senha.' };
      if (!this.client) return { ok: false, code: 'not_configured' };
      if (!/^[a-zA-Z0-9_.]{3,24}$/.test(nick)) return { ok: false, message: 'O nick deve ter 3 a 24 caracteres (letras, números, _ ou .).' };
      try {
        const { data, error } = await this.client.functions.invoke('signup', { body: { nick: nick.trim(), password, name: name || '' } });
        if (error) {
          let m = error.message;
          try { const b = await error.context.json(); m = b.error || m; } catch (e) { /* */ }
          return { ok: false, message: msg(m) };
        }
        if (!data || !data.ok) return { ok: false, message: (data && data.error) || 'Não foi possível criar a conta.' };
        return this.signIn(nick.trim(), password);
      } catch (e) { return { ok: false, message: msg(e) }; }
    },

    /* Login com Google: abre o navegador e volta pelo link rsstock://login-callback */
    async signInGoogle() {
      if (!this.client) return { ok: false, code: 'not_configured' };
      try {
        const { data, error } = await this.client.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: 'rsstock://login-callback', skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } } });
        if (error) throw error;
        RS.native.openUrl(data.url);
        return { ok: true, pending: true };
      } catch (e) {
        const m = msg(e);
        return { ok: false, message: /provider is not enabled|Unsupported provider/i.test(m) ? 'O login com Google ainda não foi ativado no servidor.' : m };
      }
    },

    /* Chamado quando o Android abre rsstock://login-callback#access_token=… */
    async handleCallback(url) {
      if (!this.client || !url) return { ok: false };
      try {
        const frag = url.includes('#') ? url.split('#')[1] : (url.split('?')[1] || '');
        const q = new URLSearchParams(frag);
        if (q.get('error_description')) return { ok: false, message: q.get('error_description') };
        let res;
        if (q.get('access_token')) res = await this.client.auth.setSession({ access_token: q.get('access_token'), refresh_token: q.get('refresh_token') });
        else if (q.get('code')) res = await this.client.auth.exchangeCodeForSession(q.get('code'));
        else return { ok: false };
        if (res.error) throw res.error;
        const u = res.data.user || (res.data.session && res.data.session.user);
        write({ kind: 'user', id: u.id, email: u.email, nick: (u.user_metadata && u.user_metadata.nick) || '' });
        const p = await this.touch();
        if (p && p.status === 'blocked') { await this.signOut(); return { ok: false, message: 'Esta conta está bloqueada. Fale com o suporte.' }; }
        return { ok: true };
      } catch (e) { return { ok: false, message: msg(e) }; }
    },

    isInternalEmail(e) { return /@nick\.rsstock\.app$/i.test(e || ''); },

    async resetPassword(email) {
      if (!this.client) return { ok: false, code: 'not_configured' };
      try {
        let e = (email || '').trim();
        if (e && !e.includes('@')) { const r = await this.client.rpc('email_for_nick', { p_nick: e }); e = r.data || ''; }
        if (!e) return { ok: false, message: 'Informe seu nick.' };
        if (this.isInternalEmail(e)) return { ok: false, message: 'Sua conta não tem e-mail cadastrado. Peça ao suporte para redefinir a senha.' };
        const { error } = await this.client.auth.resetPasswordForEmail(e);
        if (error) throw error;
        return { ok: true };
      } catch (err) { return { ok: false, message: msg(err) }; }
    },

    async changePassword(newPassword) {
      if (!this.client || !this.isUser()) return { ok: false, code: 'not_configured' };
      try {
        const { error } = await this.client.auth.updateUser({ password: newPassword });
        if (error) throw error;
        return { ok: true };
      } catch (e) { return { ok: false, message: msg(e) }; }
    },

    async changeEmail(newEmail) {
      if (!this.client || !this.isUser()) return { ok: false, code: 'not_configured' };
      try {
        const { error } = await this.client.auth.updateUser({ email: newEmail.trim() });
        if (error) throw error;
        return { ok: true };
      } catch (e) { return { ok: false, message: msg(e) }; }
    },

    async updateProfile(patch) {
      if (!this.client || !this.isUser()) return { ok: false };
      try {
        const s = read();
        if (patch.nick) {
          const { data: free } = await this.client.rpc('nick_available', { p_nick: patch.nick });
          if (!free && patch.nick.toLowerCase() !== (s.nick || '').toLowerCase()) return { ok: false, message: 'Este nick já está em uso.' };
        }
        const { error } = await this.client.from('profiles').update(patch).eq('id', s.id);
        if (error) throw error;
        if (patch.nick) write(Object.assign({}, s, { nick: patch.nick }));
        return { ok: true };
      } catch (e) { return { ok: false, message: msg(e) }; }
    },

    /* Registra o acesso (versão do app/aparelho) e lê cargo/situação da conta. */
    async touch() {
      if (!this.client || !this.isUser()) return null;
      try {
        const info = RS.native.info();
        const { data, error } = await this.client.rpc('touch_session', {
          p_version_code: Number(info.versionCode) || cfg.versionCode, p_version_name: info.version || cfg.version,
          p_device: info.device || navigator.userAgent.slice(0, 80), p_sha: RS.native.apkSha() || null
        });
        if (error) throw error;
        this.profile = data;
        const s = read();
        if (data && s) write(Object.assign({}, s, { nick: data.nick || s.nick, email: data.email || s.email }));
        if (data && data.name && RS.store && !RS.store.settings.profile.name) RS.store.set('profile.name', data.name);
        if (data && data.status === 'blocked') {
          await this.signOut();
          RS.ui && RS.ui.alert({ title: 'Conta bloqueada', message: 'Esta conta foi bloqueada pelo suporte. Entre em contato para mais informações.', icon: 'lock' });
          RS.app && RS.app.start('auth');
        }
        return data;
      } catch (e) { return null; }
    },

    async signOut() {
      try { if (this.client) await this.client.auth.signOut(); } catch (e) { /* offline */ }
      write(null);
      this.profile = null;
      return { ok: true };
    }
  };

  RS.auth = auth;
})();
