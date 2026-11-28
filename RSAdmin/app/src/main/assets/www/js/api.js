/* RS Admin — acesso ao Supabase (contas, lojas, estoque, log e versões do app). */
(function () {
  const cfg = RS.config;
  let db = null;

  const ERR = {
    'Invalid login credentials': 'Usuário ou senha incorretos.',
    'Email not confirmed': 'Confirme o e-mail desta conta antes de entrar.',
    'Failed to fetch': 'Sem conexão com a internet.',
    'not admin': 'Acesso restrito a administradores.'
  };
  const msg = e => { const m = (e && (e.message || e.error)) || String(e); for (const k in ERR) if (m.includes(k)) return ERR[k]; return m; };
  const must = r => { if (r.error) throw r.error; return r.data; };

  RS.api = {
    msg,
    get db() { return db; },

    init() {
      db = window.supabase.createClient(cfg.supabase.url, cfg.supabase.anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: 'rsadmin.auth' }
      });
    },

    async session() { const { data } = await db.auth.getSession(); return data.session; },

    /* Login por nick ou e-mail + confirmação de que é administrador. */
    async signIn(identifier, password) {
      try {
        let email = identifier.trim();
        if (!email.includes('@')) {
          const r = await db.rpc('email_for_nick', { p_nick: email });
          if (r.error) throw r.error;
          if (!r.data) return { ok: false, message: 'Nick não encontrado.' };
          email = r.data;
        }
        const { error } = await db.auth.signInWithPassword({ email, password });
        if (error) throw error;
        const isAdmin = await this.checkAdmin();
        if (!isAdmin) { await db.auth.signOut(); return { ok: false, message: 'Esta conta não é administradora.' }; }
        return { ok: true };
      } catch (e) { return { ok: false, message: msg(e) }; }
    },

    /* claim_admin(): se ainda não existe nenhum admin, a primeira conta que entrar vira admin. */
    async checkAdmin() {
      const r = await db.rpc('claim_admin');
      return !r.error && r.data === true;
    },

    async me() {
      const { data: { user } } = await db.auth.getUser();
      if (!user) return null;
      const { data } = await db.from('profiles').select('*').eq('id', user.id).single();
      return Object.assign({ email: user.email }, data || {});
    },

    async signOut() { await db.auth.signOut(); },

    stats: async () => must(await db.rpc('admin_stats')),
    accounts: async () => must(await db.rpc('admin_accounts')),
    updateStats: async () => must(await db.rpc('admin_update_stats')),

    async account(id) {
      const [p, st, pr, mv] = await Promise.all([
        db.from('profiles').select('*').eq('id', id).single(),
        db.from('stores').select('*').eq('user_id', id).order('created_at'),
        db.from('products').select('*').eq('user_id', id).order('expiry'),
        db.from('movements').select('*').eq('user_id', id).order('created_at', { ascending: false }).limit(200)
      ]);
      return { profile: must(p), stores: must(st), products: must(pr), movements: must(mv) };
    },

    async recentMovements(limit = 60) {
      return must(await db.from('movements').select('*').order('created_at', { ascending: false }).limit(limit));
    },

    /* Ações de suporte executadas no servidor (função admin-users com a chave de serviço). */
    async action(action, payload = {}) {
      try {
        const { data, error } = await db.functions.invoke('admin-users', { body: Object.assign({ action }, payload) });
        if (error) {
          let m = error.message;
          try { const b = await error.context.json(); m = b.error || m; } catch (e) { /* */ }
          return { ok: false, message: msg(m) };
        }
        return data && data.ok ? { ok: true, data } : { ok: false, message: (data && data.error) || 'Falha' };
      } catch (e) { return { ok: false, message: msg(e) }; }
    },

    async updateStore(id, patch) { return must(await db.from('stores').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('id', id)); },
    async updateProduct(id, patch) { return must(await db.from('products').update(Object.assign({ updated_at: new Date().toISOString() }, patch)).eq('id', id)); },
    async deleteProduct(id) { return must(await db.from('products').delete().eq('id', id)); },

    /* ---------- Versões (atualizações do RS Stock) ---------- */
    releases: async () => must(await db.from('app_releases').select('*').order('version_code', { ascending: false })),
    async saveRelease(row) { return must(await db.from('app_releases').insert(row).select().single()); },
    async patchRelease(id, patch) { return must(await db.from('app_releases').update(patch).eq('id', id)); },
    async deleteRelease(rel) {
      await db.storage.from(cfg.releasesBucket).remove([rel.apk_path]);
      return must(await db.from('app_releases').delete().eq('id', rel.id));
    },

    /* Envio do APK com barra de progresso (XHR direto na API do Storage). */
    async uploadApk(file, path, onProgress) {
      const s = await this.session();
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${cfg.supabase.url}/storage/v1/object/${cfg.releasesBucket}/${encodeURIComponent(path)}`);
        xhr.setRequestHeader('Authorization', 'Bearer ' + s.access_token);
        xhr.setRequestHeader('apikey', cfg.supabase.anonKey);
        xhr.setRequestHeader('x-upsert', 'true');
        xhr.setRequestHeader('Content-Type', 'application/vnd.android.package-archive');
        xhr.upload.onprogress = e => { if (e.lengthComputable && onProgress) onProgress(Math.round(e.loaded / e.total * 100)); };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve(`${cfg.supabase.url}/storage/v1/object/public/${cfg.releasesBucket}/${encodeURIComponent(path)}`)
          : reject(new Error((() => { try { return JSON.parse(xhr.responseText).message; } catch (e) { return 'HTTP ' + xhr.status; } })()));
        xhr.onerror = () => reject(new Error('Sem conexão com a internet.'));
        xhr.send(file);
      });
    }
  };
})();
