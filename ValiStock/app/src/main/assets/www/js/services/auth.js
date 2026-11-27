/* ==========================================================================
   Autenticação — preparada para Supabase.
   Hoje só o modo convidado é funcional; login/cadastro retornam "not_configured"
   até VS.config.supabase + features.accounts estarem preenchidos.
   ========================================================================== */
(function () {
  const KEY = 'vs.session.v1';
  const cfg = VS.config;

  function read() { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } }
  function write(s) { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); }

  const auth = {
    client: null, // instância supabase-js (futuro)

    isConfigured() { return !!(cfg.features.accounts && cfg.supabase.url && cfg.supabase.anonKey); },

    /* Carrega supabase-js e cria o cliente (chamar no início quando configurado). */
    async init() {
      if (!this.isConfigured()) return;
      // Exemplo para o futuro:
      // await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
      // this.client = supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey);
      // const { data } = await this.client.auth.getSession();
      // if (data.session) write(fromSupabase(data.session));
    },

    session() { return read(); },
    isGuest() { const s = read(); return !s || s.kind === 'guest'; },

    signInGuest() {
      const s = { kind: 'guest', id: 'guest-' + VS.u.uid(), nick: '', email: '', createdAt: new Date().toISOString() };
      write(s);
      return { ok: true, session: s };
    },

    /* Entrar com nick OU e-mail + senha. */
    async signIn(identifier, password) {
      if (!identifier || !password) return { ok: false, code: 'missing', message: 'Preencha usuário e senha.' };
      if (!this.isConfigured()) return { ok: false, code: 'not_configured' };
      // Futuro: se "identifier" não for e-mail, buscar o e-mail pelo nick em "profiles" e então:
      // const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      return { ok: false, code: 'not_configured' };
    },

    /* Criar conta com nick + e-mail + senha. */
    async signUp({ nick, email, password }) {
      if (!nick || !email || !password) return { ok: false, code: 'missing', message: 'Preencha todos os campos.' };
      if (!this.isConfigured()) return { ok: false, code: 'not_configured' };
      // Futuro:
      // const { data, error } = await this.client.auth.signUp({ email, password, options: { data: { nick } } });
      return { ok: false, code: 'not_configured' };
    },

    async resetPassword(email) {
      if (!this.isConfigured()) return { ok: false, code: 'not_configured' };
      // await this.client.auth.resetPasswordForEmail(email);
      return { ok: false, code: 'not_configured' };
    },

    async changePassword(newPassword) {
      if (!this.isConfigured() || this.isGuest()) return { ok: false, code: 'not_configured' };
      // await this.client.auth.updateUser({ password: newPassword });
      return { ok: false, code: 'not_configured' };
    },

    async signOut() {
      // if (this.client) await this.client.auth.signOut();
      write(null);
      return { ok: true };
    }
  };

  VS.auth = auth;
})();
