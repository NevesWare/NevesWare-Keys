/* ViceHub — ponte com o Supabase (contas online, dados da conta e chat em tempo real).
 * Fica DESLIGADA até config.js ter backend:"supabase", supabaseUrl e supabaseAnonKey.
 * Desligada, o app usa contas locais (cada conta com seus próprios dados neste aparelho).
 * Banco: rode supabase/schema.sql no SQL Editor do seu projeto.
 */
(function () {
  "use strict";
  var CFG = window.VH_CONFIG || {};
  var ON = CFG.backend === "supabase" && !!CFG.supabaseUrl && !!CFG.supabaseAnonKey;
  /* o que vai para cada coluna de user_data */
  var COLS = { settings: "ajustes", visited: "visitados", favs: "salvos", cards: "cartas", owned: "garagem", favw: "armas_fav" };
  var sb = null, loading = null, pushT = 0;

  function ls(k, v) {
    try {
      if (arguments.length === 1) { var x = localStorage.getItem(k); return x ? JSON.parse(x) : null; }
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) { return null; }
  }
  function session() { return ls("vh3:session"); }
  function ukey(id, k) { return "vh3:u:" + id + ":" + k; }

  function ready() {
    if (sb) return Promise.resolve(sb);
    if (loading) return loading;
    loading = new Promise(function (res, rej) {
      var go = function () {
        try { sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true } }); res(sb); }
        catch (e) { rej(e); }
      };
      if (window.supabase && window.supabase.createClient) return go();
      var sc = document.createElement("script");
      sc.src = "lib/supabase.js"; sc.onload = go; sc.onerror = function () { loading = null; rej(new Error("supabase.js")); };
      document.head.appendChild(sc);
    });
    return loading;
  }
  function msg(e) {
    var m = (e && e.message) || String(e || "");
    if (/Invalid login/i.test(m)) return "E-mail ou senha não conferem.";
    if (/already registered|already exists/i.test(m)) return "Já existe uma conta com esse e-mail.";
    if (/duplicate key.*nick/i.test(m)) return "Esse nick já está em uso.";
    if (/Email not confirmed/i.test(m)) return "Confirme seu e-mail pelo link que enviamos e depois entre.";
    if (/fetch|network/i.test(m)) return "Sem conexão com o servidor. Tente de novo.";
    return m || "Algo deu errado. Tente de novo.";
  }
  function profileToSession(p, email) {
    var x = { id: p.vh_id, nick: p.nick, name: p.nick, email: email || "", cor: p.avatar_cor || "#ff3d8b", bio: p.bio || "", created: Date.parse(p.criado_em) || Date.now(), kind: "cloud", uuid: p.id };
    ls("vh3:session", x); return x;
  }
  function loadProfile(user) {
    return sb.from("profiles").select("*").eq("id", user.id).single().then(function (r) {
      if (r.error) throw r.error;
      return profileToSession(r.data, user.email);
    });
  }

  var VH_CLOUD = window.VH_CLOUD = {
    on: function () { return ON; },

    signUp: function (nick, email, pass) {
      return ready().then(function () {
        return sb.from("profiles").select("id").ilike("nick", nick).maybeSingle();
      }).then(function (r) {
        if (r.data) return { error: "Esse nick já está em uso." };
        return sb.auth.signUp({ email: email, password: pass, options: { data: { nick: nick } } }).then(function (a) {
          if (a.error) return { error: msg(a.error) };
          if (!a.data.session) return { error: "Conta criada. Confirme seu e-mail pelo link que enviamos e depois entre." };
          return loadProfile(a.data.user).then(function (u) { return { user: u }; });
        });
      }).catch(function (e) { return { error: msg(e) }; });
    },

    signIn: function (email, pass) {
      return ready().then(function () { return sb.auth.signInWithPassword({ email: email, password: pass }); })
        .then(function (a) {
          if (a.error) return { error: msg(a.error) };
          return loadProfile(a.data.user).then(function (u) { return { user: u }; });
        }).catch(function (e) { return { error: msg(e) }; });
    },

    signOut: function () { ready().then(function () { return sb.auth.signOut(); }).catch(function () { }); },

    saveProfile: function (x) {
      ready().then(function () { return sb.from("profiles").update({ nick: x.nick, bio: x.bio, avatar_cor: x.cor }).eq("id", x.uuid); }).catch(function () { });
    },

    /* baixa os dados da conta para este aparelho (chamado ao entrar, antes de recarregar) */
    pull: function () {
      var x = session(); if (!x || !x.uuid) return Promise.resolve();
      return ready().then(function () {
        return Promise.all([
          sb.from("user_data").select("*").eq("user_id", x.uuid).maybeSingle(),
          sb.from("drawings").select("itens").eq("user_id", x.uuid).maybeSingle(),
          sb.from("markers").select("*").eq("user_id", x.uuid)
        ]);
      }).then(function (r) {
        var d = r[0].data || {};
        Object.keys(COLS).forEach(function (k) { var v = d[COLS[k]]; if (v && Object.keys(v).length) ls(ukey(x.id, k), v); });
        if (r[1].data) ls(ukey(x.id, "drawings"), r[1].data.itens || []);
        if (r[2].data && r[2].data.length) ls(ukey(x.id, "mypins"), r[2].data.map(function (m) { return { id: "m-" + m.id, n: m.nome, c: m.cat, r: "vice", x: m.x, y: m.y, d: m.nota, foto: m.foto_url || "", area: "" }; }));
      }).catch(function () { });
    },

    /* envia os dados da conta (com atraso para juntar várias mudanças) */
    queue: function () { clearTimeout(pushT); pushT = setTimeout(function () { VH_CLOUD.push(); }, 2500); },
    push: function () {
      var x = session(); if (!x || !x.uuid) return Promise.resolve();
      return ready().then(function () {
        var row = { user_id: x.uuid, atualizado: new Date().toISOString() };
        Object.keys(COLS).forEach(function (k) { row[COLS[k]] = ls(ukey(x.id, k)) || {}; });
        var pins = (ls(ukey(x.id, "mypins")) || []).map(function (m) { return { user_id: x.uuid, nome: m.n, cat: m.c, x: m.x, y: m.y, nota: m.d || "", foto_url: /^data:/.test(m.foto || "") ? "" : (m.foto || "") }; });
        return Promise.all([
          sb.from("user_data").upsert(row),
          sb.from("drawings").upsert({ user_id: x.uuid, itens: ls(ukey(x.id, "drawings")) || [], atualizado: row.atualizado }, { onConflict: "user_id" }),
          sb.from("markers").delete().eq("user_id", x.uuid).then(function () { return pins.length ? sb.from("markers").insert(pins) : null; })
        ]);
      }).catch(function () { });
    },

    /* reabre a sessão salva quando o app abre */
    resume: function () {
      ready().then(function () { return sb.auth.getUser(); }).then(function (r) {
        if (r && r.data && r.data.user) return loadProfile(r.data.user);
      }).catch(function () { });
    },

    /* ---------- chat ---------- */
    chatLoad: function (room) {
      var x = session() || {};
      return ready().then(function () {
        return sb.from("chat_messages").select("*").eq("room_id", room).order("criado_em", { ascending: false }).limit(60);
      }).then(function (r) {
        return (r.data || []).reverse().map(function (m) { return VH_CLOUD._msg(m, x); });
      }).catch(function () { return []; });
    },
    _msg: function (m, x) {
      var re = null;
      try { re = m.resposta_texto ? JSON.parse(m.resposta_texto) : null; } catch (e) { re = null; }
      return { id: "c" + m.id, uid: m.vh_id, nick: m.nick, cor: m.cor || "#2de2e6", t: m.texto, ts: Date.parse(m.criado_em), mine: x && m.vh_id === x.id, re: re };
    },
    chatSend: function (room, m) {
      var x = session();
      if (!x || !x.uuid) return Promise.resolve({ error: "entre numa conta" });
      return ready().then(function () {
        return sb.from("chat_messages").insert({ room_id: room, user_id: x.uuid, nick: x.nick, vh_id: x.id, cor: x.cor, texto: m.t, resposta_texto: m.re ? JSON.stringify(m.re) : null });
      }).then(function (r) { return r.error ? { error: msg(r.error) } : {}; }).catch(function (e) { return { error: msg(e) }; });
    },
    chatSubscribe: function (room, cb) {
      var ch = null, x = session() || {};
      ready().then(function () {
        ch = sb.channel("room:" + room).on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: "room_id=eq." + room }, function (p) {
          if (p.new && p.new.vh_id !== x.id) cb(VH_CLOUD._msg(p.new, x));
        }).subscribe();
      }).catch(function () { });
      return function () { if (ch && sb) sb.removeChannel(ch); };
    }
  };
})();
