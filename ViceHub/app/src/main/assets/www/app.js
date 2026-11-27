/* ViceHub v3 — app.js
 * Abertura → contas (entrar, criar conta, convidado) → app.
 * Abas (barra embaixo): Mapa · Locais · Veículos · Guia.
 * Mapa oficial em tiles + locais do GTADB (CC BY 4.0) + marcadores do próprio jogador.
 */
(function () {
  "use strict";
  var D = window.VH_DATA, G6 = window.VH_GTADB, TL = window.VH_TILES, CFG = window.VH_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };
  var fmt = function (n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "."); };
  var norm = function (s) { s = String(s || "").toLowerCase(); return s.normalize ? s.normalize("NFD").replace(/[̀-ͯ]/g, "") : s; };
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("vh3:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("vh3:" + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  var toastT;
  function toast(msg) { var t = $("#toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 1900); }

  /* ---------- ícones (24×24, traço) ---------- */
  var IC = {
    home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
    house: '<path d="M3 12l9-8 9 8"/><path d="M5 10v10h14V10M10 20v-5h4v5"/>',
    garage: '<path d="M3 10l9-6 9 6v10H3z"/><path d="M7 20v-7h10v7M7 16.5h10"/>',
    garageGold: '<path d="M3 10l9-6 9 6v10H3z"/><path d="M6.5 18l1-2.5h9l1 2.5zM8 18v1.5M16 18v1.5"/><path d="M12 7.6l.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2z"/>',
    carGold: '<path d="M3 16v-3l2.2-5h13.6L21 13v3z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/><path d="M12 2.6l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z"/>',
    card: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M12 7.5l1.2 2.4 2.6.4-1.9 1.8.5 2.6L12 13.5l-2.4 1.2.5-2.6-1.9-1.8 2.6-.4z"/><path d="M8 18h8"/>',
    wrench: '<path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    gun: '<path d="M3 9h15l2-2h1v4h-4l-1 2h-3l-1 2H9l-1 5H5l1-6H3z"/>',
    bag: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    cart: '<path d="M3 4h2l2.4 11h10.6L20 7H6.3"/><circle cx="9.5" cy="19" r="1.5"/><circle cx="16.5" cy="19" r="1.5"/>',
    shirt: '<path d="M8 3l-5 3 2 4 2-1v12h10V9l2 1 2-4-5-3a3 3 0 0 1-8 0z"/>',
    scissors: '<circle cx="6" cy="6.5" r="2.5"/><circle cx="6" cy="17.5" r="2.5"/><path d="M8 8l12 10M8 16L20 6"/>',
    pen: '<path d="M4 20l3-1 11-11-2-2L5 17z"/><path d="M14 6l2-2 4 4-2 2"/>',
    cross: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M12 8v8M8 12h8"/>',
    shield: '<path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
    food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 1.5-3 4-3 7h3v11"/>',
    glass: '<path d="M5 4h14l-7 8z"/><path d="M12 12v8M8 20h8"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    bed: '<path d="M3 18V7M3 13h18v5M21 18v-3a3 3 0 0 0-3-3h-7v1"/><circle cx="7" cy="10" r="2"/>',
    anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13M8 11h8M5 14a7 7 0 0 0 14 0"/>',
    plane: '<path d="M10.5 3.5l1.5-.5 1.5.5V9l7 4v2l-7-2v4.5l2 1.5v1.5l-3.5-1-3.5 1V19l2-1.5V13l-7 2v-2l7-4z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M5 9h8M14 8l3 2v7a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
    bus: '<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14M8 21v-3M16 21v-3"/>',
    gov: '<path d="M3 9l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    tree: '<path d="M12 3l6 8h-3l4 6H5l4-6H6z"/><path d="M12 17v4"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19l8-8"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
    factory: '<path d="M3 21V10l5 3V10l5 3V5h3v16zM3 21h18M18 21V9h3v12"/>',
    map: '<path d="M9 4L3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    car: '<path d="M3 16v-3l2.2-5h13.6L21 13v3z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
    book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    zoom: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5M11 8v6M8 11h6"/>',
    left: '<path d="M15 6l-6 6 6 6"/>',
    right: '<path d="M9 6l6 6-6 6"/>',
    camera: '<path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    logout: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'
  };
  function ico(name, attrs) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (attrs || "") + ">" + (IC[name] || IC.pin) + "</svg>"; }

  var CAT = D.categorias;
  var GROUPS = [
    ["Colecionáveis", ["lendario", "garlend", "carta"]],
    ["Para o jogador", ["casa", "garagem", "oficina", "armas", "posto"]],
    ["Comer e sair", ["comida", "bar", "boate", "hotel"]],
    ["Compras e estilo", ["mercado", "loja", "roupas", "barbearia", "tatuagem"]],
    ["Serviços", ["saude", "seguranca", "servico"]],
    ["Transporte", ["transporte", "marina", "aereo", "corrida"]],
    ["Lugares", ["marco", "natureza", "residencial", "industria", "outros"]]
  ];
  var RANK = {};
  [["lendario", "garlend", "carta"], ["casa", "garagem"], ["oficina", "armas", "posto", "marina", "aereo", "corrida"],
   ["comida", "bar", "boate", "hotel", "mercado", "loja", "roupas", "barbearia", "tatuagem"], ["saude", "seguranca", "servico", "marco"],
   ["transporte", "natureza"], ["residencial", "industria", "outros"]].forEach(function (g, i) { g.forEach(function (c) { RANK[c] = i; }); });
  var REG = {}; D.regioes.forEach(function (r) { REG[r.id] = r; });
  var FLAG = { e: "Dá para entrar", u: "A confirmar", d: "Demolido", c: "Fechado" };

  /* ---------- locais: GTADB + marcadores do jogador ---------- */
  var LOCS = (G6 ? G6.items : []).map(function (it) {
    var c = CAT[it[3]] ? it[3] : "outros", fl = it[8] || "";
    var extra = fl.split("").map(function (f) { return FLAG[f]; }).filter(Boolean);
    return {
      id: it[0], n: String(it[1]).replace(/^["“]+|["”]+$/g, ""), area: it[2], c: c, r: it[4], x: it[5], y: it[6], real: it[7], fl: fl,
      foto: it[9] ? "gtadb/photos/" + it[0] + ".jpg" : "", ok: fl.indexOf("u") < 0,
      d: (D.notas && D.notas[it[0]]) || ((it[2] ? "Fica em " + it[2] + "." : "") + (extra.length ? " " + extra.join(" · ") + "." : "")).trim()
    };
  });
  var MINE = store.get("mypins", []);
  MINE.forEach(function (m) { m.mine = true; m.ok = true; LOCS.push(m); });
  var BYCAT = {}, ORDER = [];
  function reindex() {
    BYCAT = {};
    LOCS.forEach(function (l, i) { l.i = i; (BYCAT[l.c] = BYCAT[l.c] || []).push(l); });
    Object.keys(BYCAT).forEach(function (c) { BYCAT[c].sort(function (a, b) { return a.n.localeCompare(b.n); }); });
    ORDER = LOCS.slice().sort(function (a, b) { return (RANK[a.c] || 9) - (RANK[b.c] || 9) || (b.foto ? 1 : 0) - (a.foto ? 1 : 0) || (a.id < b.id ? -1 : 1); });
  }
  reindex();
  function saveMine() {
    var ok = store.set("mypins", LOCS.filter(function (l) { return l.mine; }).map(function (l) { return { id: l.id, n: l.n, c: l.c, r: l.r, x: l.x, y: l.y, d: l.d, foto: l.foto, area: l.area || "" }; }));
    if (!ok) toast("Sem espaço para salvar fotos. Tente uma foto menor.");
  }
  var visited = store.get("visited", {}), favs = store.get("favs", {});
  var nVisited = function () { return LOCS.filter(function (l) { return visited[l.id]; }).length; };
  function updateProgress() {
    var n = nVisited(), t = LOCS.length || 1;
    $("#prNum").textContent = fmt(n) + "/" + fmt(LOCS.length);
    $("#prRing").style.strokeDashoffset = (94.25 * (1 - n / t)).toFixed(2);
  }

  /* =========================================================
     CONTAS (adaptador local; troque por Supabase/Firebase depois)
     ========================================================= */
  function hash(s) { var h = 2166136261; for (var r = 0; r < 3; r++) for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i) + r; h = Math.imul(h, 16777619) >>> 0; } return h.toString(36); }
  var VH_AUTH = window.VH_AUTH = {
    current: function () { return store.get("session", null); },
    signUp: function (name, email, pass) {
      var users = store.get("users", {}), key = email.toLowerCase();
      if (users[key]) return { error: "Já existe uma conta com esse e-mail neste aparelho. Use Entrar." };
      users[key] = { name: name, email: key, h: hash(key + ":" + pass), created: Date.now() };
      store.set("users", users);
      var s = { name: name, email: key, kind: "local" }; store.set("session", s); return { user: s };
    },
    signIn: function (email, pass) {
      var users = store.get("users", {}), u = users[email.toLowerCase()];
      if (!u || u.h !== hash(u.email + ":" + pass)) return { error: "E-mail ou senha não conferem." };
      var s = { name: u.name, email: u.email, kind: "local" }; store.set("session", s); return { user: s };
    },
    guest: function () { var s = { name: "Convidado", kind: "guest" }; store.set("session", s); return { user: s }; },
    google: function () { return CFG.googleClientId ? { error: "Login com Google precisa do servidor de contas configurado (veja config.js)." } : { soon: true }; },
    signOut: function () { store.set("session", null); }
  };
  var Auth = (function () {
    var mode = "in", el = $("#auth");
    function setMode(m) {
      mode = m;
      $$(".au-tabs button").forEach(function (b) { b.classList.toggle("on", b.getAttribute("data-mode") === m); });
      $("#auNameF").hidden = m !== "up";
      $("#auGo").textContent = m === "up" ? "Criar conta" : "Entrar";
      $("#auPass").setAttribute("autocomplete", m === "up" ? "new-password" : "current-password");
      $("#auErr").hidden = true;
    }
    function err(t) { var e = $("#auErr"); e.textContent = t; e.hidden = false; }
    function done(u) { el.hidden = true; startApp(u); toast(u.kind === "guest" ? "Entrou como convidado" : "Olá, " + u.name.split(" ")[0] + "!"); }
    $$(".au-tabs button").forEach(function (b) { b.onclick = function () { setMode(b.getAttribute("data-mode")); }; });
    $("#auForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("#auName").value.trim(), email = $("#auEmail").value.trim(), pass = $("#auPass").value;
      if (mode === "up" && name.length < 2) return err("Escreva seu nome.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return err("Escreva um e-mail válido.");
      if (pass.length < 6) return err("A senha precisa de pelo menos 6 caracteres.");
      var r = mode === "up" ? VH_AUTH.signUp(name, email, pass) : VH_AUTH.signIn(email, pass);
      if (r.error) return err(r.error);
      done(r.user);
    });
    $("#auGuest").onclick = function () { done(VH_AUTH.guest().user); };
    $("#auGoogle").onclick = function () { var r = VH_AUTH.google(); toast(r.soon ? "Login com Google chega em breve" : r.error); };
    var dc = $("#auDiscord");
    if (CFG.discordUrl) { dc.href = CFG.discordUrl; dc.target = "_blank"; $("#auDiscordSoon").hidden = true; }
    else dc.onclick = function (e) { e.preventDefault(); toast("Nosso Discord abre em breve"); };
    return { show: function () { setMode("in"); el.hidden = false; } };
  })();

  /* =========================================================
     NAVEGAÇÃO (barra embaixo) COM TRANSIÇÃO 3D
     ========================================================= */
  var TABS = [
    { id: "map", label: "Mapa", ic: "map", view: "v-map" },
    { id: "places", label: "Locais", ic: "pin", view: "v-places" },
    { id: "veh", label: "Veículos", ic: "car", view: "v-veh" },
    { id: "guide", label: "Guia", ic: "book", view: "v-guide" }
  ];
  var current = 0, dock = $("#dock");
  TABS.forEach(function (t, i) {
    var b = document.createElement("button");
    b.className = "tab" + (i ? "" : " active"); b.setAttribute("role", "tab");
    b.innerHTML = ico(t.ic) + "<span>" + t.label + "</span>";
    b.addEventListener("click", function () { go(i); });
    dock.appendChild(b);
  });
  function ink() {
    var t = $$(".tab", dock)[current], k = $("#dockInk"); if (!t) return;
    k.style.width = t.offsetWidth + "px"; k.style.transform = "translateX(" + (t.offsetLeft - 6) + "px)";
  }
  function go(i) {
    if (typeof i === "string") i = TABS.findIndex(function (t) { return t.id === i; });
    if (i === current) return;
    current = i;
    TABS.forEach(function (t, k) {
      var v = document.getElementById(t.view);
      v.classList.remove("active", "left");
      if (k === i) v.classList.add("active"); else if (k < i) v.classList.add("left");
    });
    $$(".tab", dock).forEach(function (b, k) { b.classList.toggle("active", k === i); });
    ink(); closeDrawer();
    if (TABS[i].id === "map") Map.show(); else Map.closePop();
    if (TABS[i].id === "places") Places.render();
  }
  window.addEventListener("resize", function () { ink(); Map.resize(); });

  /* =========================================================
     MAPA
     ========================================================= */
  var Map = (function () {
    var NS = "http://www.w3.org/2000/svg";
    var BOX = G6 ? G6.bbox : [0, 0, 15040, 19840], W = BOX[2], H = BOX[3], MAXK = 2;
    var svg = $("#mapSvg"), wrap = $("#mapWrap"), stageEl = $("#mapStage"), pop = $("#pop");
    var st = { k: 1, tx: 0, ty: 0 }, fitK = 1, vw = 0, vh = 0, built = false, need = true, dirty = true;
    var cats = Object.keys(CAT);
    var on = {}; cats.forEach(function (c) { on[c] = true; });
    var fRegion = "all", fVisit = "all", fFav = false, sel = -1, gMap, gTiles, gPins, adding = false;
    var builtK = -1, builtRect = null, shown = 0, eligible = 0;

    /* ---- tiles ---- */
    var TSET = {}, tileEls = {};
    if (TL) Object.keys(TL.have).forEach(function (z) { var s = {}; TL.have[z].split("|").forEach(function (k) { s[k] = 1; }); TSET[z] = s; });
    function img(href, x, y, w, h) {
      var im = document.createElementNS(NS, "image");
      im.setAttribute("href", href); im.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
      im.setAttribute("x", x); im.setAttribute("y", y); im.setAttribute("width", w); im.setAttribute("height", h);
      im.setAttribute("preserveAspectRatio", "none"); return im;
    }
    function updateTiles() {
      if (!TL) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var zc = clamp(Math.ceil(Math.log(st.k * dpr) / Math.LN2 + 5 - .35), 0, TL.maxZ);
      var m = stageEl.classList.contains("tilted") ? .6 : .15;
      var x0 = -st.tx / st.k, y0 = -st.ty / st.k, x1 = (vw - st.tx) / st.k, y1 = (vh - st.ty) / st.k;
      var mx = (x1 - x0) * m, my = (y1 - y0) * m; x0 -= mx; x1 += mx; y0 -= my * 2; y1 += my;
      var want = {}, order = [], base = Math.min(2, zc);
      [base, zc].forEach(function (z, li) {
        if (li && z === base) return;
        var size = 256 * Math.pow(2, 5 - z), set = TSET[z] || {};
        var a = Math.floor((x0 + TL.x0) / size), b = Math.floor((x1 + TL.x0) / size), c = Math.floor((y0 + TL.y0) / size), d = Math.floor((y1 + TL.y0) / size);
        if ((b - a + 1) * (d - c + 1) > 140) return;
        for (var ty = c; ty <= d; ty++) for (var tx = a; tx <= b; tx++) {
          if (!set[ty + "," + tx]) continue;
          var key = z + "/" + ty + "," + tx; want[key] = 1;
          if (!tileEls[key]) tileEls[key] = img("tiles/" + z + "/" + z + "," + ty + "," + tx + ".jpg", tx * size - TL.x0, ty * size - TL.y0, size * 1.003, size * 1.003);
          order.push(tileEls[key]);
        }
      });
      Object.keys(tileEls).forEach(function (k) { if (!want[k]) { var e = tileEls[k]; if (e.parentNode) e.parentNode.removeChild(e); delete tileEls[k]; } });
      order.forEach(function (e) { gTiles.appendChild(e); });
    }

    function build() {
      if (built) return; built = true;
      gMap = document.createElementNS(NS, "g"); gTiles = document.createElementNS(NS, "g"); gPins = document.createElementNS(NS, "g");
      svg.innerHTML = '<defs><linearGradient id="goldG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff1a8"/><stop offset=".45" stop-color="#f5c542"/><stop offset="1" stop-color="#b9791a"/></linearGradient></defs>';
      gMap.appendChild(gTiles); svg.appendChild(gMap); svg.appendChild(gPins);
      if (!TL && window.VH_MAPIMG) { var M = window.VH_MAPIMG; gTiles.appendChild(img(M.src, M.x, M.y, M.w, M.h)); }
      bindInput(); buildQuick(); resize(true); loop();
    }
    function topSpace() { var t = $(".map-top"); return t ? t.getBoundingClientRect().bottom + 6 : 170; }
    function botSpace() { var d = $("#dock"); return d ? vh - (d.getBoundingClientRect().top - wrap.getBoundingClientRect().top) + 40 : 120; }
    function resize(reset) {
      if (!built) return;
      var r = wrap.getBoundingClientRect(); if (!r.width) return;
      var first = !vw; vw = r.width; vh = r.height;
      var top = topSpace(), bot = botSpace();
      fitK = Math.min((vw - 20) / W, (vh - top - bot) / H);
      if (reset || first) { st.k = fitK; st.tx = (vw - W * st.k) / 2; st.ty = top + (vh - top - bot - H * st.k) / 2; }
      dirty = true; need = true;
    }
    function clampView() {
      st.k = clamp(st.k, fitK * .8, Math.max(MAXK, fitK));
      var mw = W * st.k, mh = H * st.k, m = 80;
      st.tx = clamp(st.tx, Math.min(m - mw, vw - mw - m), Math.max(vw - m, m));
      st.ty = clamp(st.ty, Math.min(m - mh, vh - mh - m), Math.max(vh - m, m));
    }
    function visible(l) {
      if (!on[l.c]) return false;
      if (fRegion !== "all" && l.r !== fRegion) return false;
      if (fVisit === "yes" && !visited[l.id]) return false;
      if (fVisit === "no" && visited[l.id]) return false;
      if (fFav && !favs[l.id]) return false;
      return true;
    }

    /* ---- quadro: panorâmica só move o grupo de pins; pins só são refeitos quando o zoom ou o filtro mudam ---- */
    var anim = null, vel = null, drag = null;
    function loop() {
      requestAnimationFrame(loop);
      if (TABS[current].id !== "map") return;
      if (anim) {
        var t = clamp((performance.now() - anim.t0) / anim.dur, 0, 1), e = ease(t);
        st.k = lerp(anim.a.k, anim.b.k, e); st.tx = lerp(anim.a.tx, anim.b.tx, e); st.ty = lerp(anim.a.ty, anim.b.ty, e);
        if (t >= 1) anim = null; need = true;
      } else if (vel && !drag) {
        st.tx += vel.x; st.ty += vel.y; vel.x *= .92; vel.y *= .92;
        if (Math.abs(vel.x) + Math.abs(vel.y) < .3) vel = null;
        clampView(); need = true;
      }
      if (need) { need = false; draw(); }
    }
    function pinSVG(l, x, y, isSel) {
      var c = CAT[l.c], v = visited[l.id], gold = c.ouro;
      return '<g class="pin' + (isSel ? " sel" : "") + (gold ? " gold" : "") + '" data-i="' + l.i + '" transform="translate(' + x.toFixed(1) + "," + y.toFixed(1) + ")" + (isSel ? " scale(1.28)" : "") + '">' +
        (isSel ? '<circle class="pulse" r="6" fill="none" stroke="' + c.cor + '" stroke-width="2.5"/>' : "") +
        '<ellipse rx="5" ry="2" fill="rgba(0,0,0,.4)"/>' +
        '<path d="M-5 -7L0 0L5 -7Z" fill="rgba(14,9,30,.92)"/>' +
        '<g class="face"><circle cy="-19" r="14" fill="rgba(14,9,30,.92)" stroke="' + (gold ? "#f5c542" : "rgba(255,255,255,.85)") + '" stroke-width="1.5"/>' +
        '<circle cy="-19" r="11" fill="' + (gold ? "url(#goldG)" : c.cor) + '"' + (v ? ' opacity=".5"' : "") + "/></g>" +
        '<g transform="translate(-6.6,-25.6) scale(.55)" fill="none" stroke="' + (gold ? "#2a1600" : "#fff") + '" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + (IC[c.icone] || IC.pin) + "</g>" +
        (v ? '<g transform="translate(10,-31)"><circle r="5.5" fill="#5dff9b" stroke="#0a0716" stroke-width="1.5"/><path d="M-2.4 0l1.6 1.6L2.6-1.6" fill="none" stroke="#0a0716" stroke-width="1.8" stroke-linecap="round"/></g>' : "") +
        (favs[l.id] ? '<circle cx="-10" cy="-31" r="4" fill="#ff3d8b" stroke="#fff" stroke-width="1.2"/>' : "") + "</g>";
    }
    function buildPins() {
      var k = st.k, z = k / fitK;
      var minD = k < .05 ? 62 : k < .12 ? 50 : k < .35 ? 40 : k < .9 ? 33 : 29;
      var cull = k > .25;
      var rx0 = -st.tx - vw, ry0 = -st.ty - vh, rx1 = -st.tx + 2 * vw, ry1 = -st.ty + 2 * vh;
      builtRect = cull ? [rx0, ry0, rx1, ry1] : null;
      var grid = {}, out = "", labels = "", lgrid = {}, showLab = k >= .75, cell = minD;
      shown = 0; eligible = 0;
      function free(x, y) {
        var cx = Math.floor(x / cell), cy = Math.floor(y / cell);
        for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) {
          var b = grid[(cx + i) + ":" + (cy + j)]; if (!b) continue;
          for (var n = 0; n < b.length; n++) if (Math.abs(b[n][0] - x) < minD * .8 && Math.abs(b[n][1] - y) < minD) return false;
        }
        return true;
      }
      function take(x, y) { var key = Math.floor(x / cell) + ":" + Math.floor(y / cell); (grid[key] = grid[key] || []).push([x, y]); }
      function labelFree(x0, y0, x1, y1) {
        for (var gx = Math.floor(x0 / 80); gx <= Math.floor(x1 / 80); gx++) for (var gy = Math.floor(y0 / 20); gy <= Math.floor(y1 / 20); gy++) {
          var b = lgrid[gx + ":" + gy]; if (!b) continue;
          for (var n = 0; n < b.length; n++) { var r = b[n]; if (x0 < r[2] && x1 > r[0] && y0 < r[3] && y1 > r[1]) return false; }
        }
        for (gx = Math.floor(x0 / 80); gx <= Math.floor(x1 / 80); gx++) for (gy = Math.floor(y0 / 20); gy <= Math.floor(y1 / 20); gy++) (lgrid[gx + ":" + gy] = lgrid[gx + ":" + gy] || []).push([x0, y0, x1, y1]);
        return true;
      }
      var selL = sel >= 0 ? LOCS[sel] : null;
      if (selL) take(selL.x * k, selL.y * k);
      ORDER.forEach(function (l) {
        if (l === selL || !visible(l)) return;
        eligible++;
        var x = l.x * k, y = l.y * k;
        if (cull && (x < rx0 || y < ry0 || x > rx1 || y > ry1)) return;
        if (!free(x, y)) return;
        take(x, y); shown++;
        out += pinSVG(l, x, y, false);
        if (showLab) {
          var w = Math.min(160, l.n.length * 5.8 + 6);
          if (labelFree(x - w / 2, y + 3, x + w / 2, y + 17)) labels += '<text class="pin-label" x="' + x.toFixed(1) + '" y="' + (y + 14).toFixed(1) + '" text-anchor="middle">' + esc(l.n) + "</text>";
        }
      });
      var ra = clamp(1.5 - (z - 1) * .4, 0, 1), regs = "";
      if (ra > .02) D.regioes.forEach(function (r) {
        regs += '<text class="region-label" x="' + (r.x * k).toFixed(1) + '" y="' + (r.y * k).toFixed(1) + '" text-anchor="middle" font-size="' + (10 + z * 1.6).toFixed(1) + '" fill="' + r.cor + '" opacity="' + ra.toFixed(2) + '">' + esc(r.nome) + "</text>";
      });
      if (selL) { out += pinSVG(selL, selL.x * k, selL.y * k, true); labels += '<text class="pin-label" x="' + (selL.x * k).toFixed(1) + '" y="' + (selL.y * k + 16).toFixed(1) + '" text-anchor="middle">' + esc(selL.n) + "</text>"; }
      gPins.innerHTML = regs + out + labels;
      builtK = k; dirty = false;
      var hiddenN = eligible - shown;
      $("#legend").innerHTML = "<b>" + fmt(shown + (selL ? 1 : 0)) + "</b>/" + fmt(eligible + (selL ? 1 : 0)) + (hiddenN > 0 ? " · aproxime" : " locais");
    }
    function draw() {
      updateTiles();
      gMap.setAttribute("transform", "translate(" + st.tx.toFixed(2) + "," + st.ty.toFixed(2) + ") scale(" + st.k.toFixed(6) + ")");
      var outside = builtRect && (-st.tx < builtRect[0] + vw * .5 || -st.ty < builtRect[1] + vh * .5 || -st.tx + vw > builtRect[2] - vw * .5 || -st.ty + vh > builtRect[3] - vh * .5);
      if (dirty || Math.abs(st.k - builtK) > 1e-9 || outside) buildPins();
      gPins.setAttribute("transform", "translate(" + st.tx.toFixed(2) + "," + st.ty.toFixed(2) + ")");
      if (sel >= 0) placePop();
    }

    /* ---- cartão flutuante ---- */
    function placePop() {
      var pe = $(".pin.sel", svg); if (!pe || pop.hidden) return;
      var r = pe.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
      var px = r.left + r.width / 2 - wr.left, py = r.top - wr.top, pb = r.bottom - wr.top;
      var w = pop.offsetWidth, h = pop.offsetHeight, top = topSpace(), bottom = vh - botSpace() + 30;
      var left = clamp(px - w / 2, 14, vw - w - 14), y;
      if (py - h - 12 > top) { y = py - h - 12; pop.classList.remove("below"); }
      else { y = Math.min(pb + 10, bottom - h); pop.classList.add("below"); }
      pop.style.left = left + "px"; pop.style.top = Math.max(top, y) + "px";
    }
    function openPop(l) {
      var c = CAT[l.c], list = BYCAT[l.c] || [l], idx = list.indexOf(l);
      var photo = l.foto && (!window.VH_NOPHOTOS || l.mine);
      pop.innerHTML =
        '<div class="pop-ph">' + (photo ? '<img src="' + esc(l.foto) + '" alt="' + esc(l.n) + '">' : '<span class="noimg">' + (l.foto ? "Foto no app" : "Sem foto ainda") + "</span>") +
        '<button class="pop-x" data-a="close" aria-label="Fechar">' + ico("close") + "</button></div>" +
        '<div class="pop-b"><h3>' + esc(l.n) + '</h3><div class="pop-cat" style="color:' + c.cor + '">' + ico(c.icone) + esc(c.nome) +
        (l.mine ? '<span class="st no">Seu marcador</span>' : '<span class="st ' + (l.ok ? "ok" : "no") + '">' + (l.ok ? "Confirmado" : "A confirmar") + "</span>") + "</div>" +
        (l.d ? "<p>" + esc(l.d) + "</p>" : "") +
        (l.real ? '<div class="pop-real">' + ico("pin") + "<span>Na vida real: " + esc(l.real) + "</span></div>" : "") +
        '<button class="visit' + (visited[l.id] ? " on" : "") + '" data-a="visit"><span>' + (visited[l.id] ? (c.ouro ? "Coletado" : "Visitado") : (c.ouro ? "Marcar como coletado" : "Marcar como visitado")) + '</span><span class="box">' + ico("check", ' stroke-width="3"') + "</span></button></div>" +
        '<div class="pop-f"><button data-a="fav" class="' + (favs[l.id] ? "on" : "") + '" aria-label="Salvar">' + ico("heart", favs[l.id] ? ' fill="currentColor"' : "") + "</button>" +
        '<button data-a="zoom" aria-label="Aproximar">' + ico("zoom") + '</button><button data-a="copy" aria-label="Copiar nome">' + ico("link") + "</button>" +
        (l.mine ? '<button data-a="del" aria-label="Apagar marcador">' + ico("trash") + "</button>" : "") +
        '<span class="nav"><button data-a="prev" aria-label="Anterior">' + ico("left") + "</button>" + (idx + 1) + " / " + list.length + '<button data-a="next" aria-label="Próximo">' + ico("right") + "</button></span></div>" +
        '<div class="pop-id">' + esc(l.area || REG[l.r].nome) + " · " + (l.mine ? "marcador seu" : l.id + " · GTADB") + "</div>";
      pop.hidden = false; pop.style.animation = "none"; void pop.offsetWidth; pop.style.animation = "";
      var armed = false;
      pop.onclick = function (e) {
        var b = e.target.closest("[data-a]"); if (!b) return;
        var a = b.getAttribute("data-a");
        if (a === "close") closePop();
        if (a === "visit") { if (visited[l.id]) delete visited[l.id]; else visited[l.id] = 1; store.set("visited", visited); updateProgress(); openPop(l); dirty = true; need = true; }
        if (a === "fav") { if (favs[l.id]) delete favs[l.id]; else favs[l.id] = 1; store.set("favs", favs); openPop(l); dirty = true; need = true; }
        if (a === "zoom") flyTo(l, Math.max(st.k * 2.5, 1.2));
        if (a === "copy") {
          var txt = l.n + " — " + (l.area || REG[l.r].nome) + " (ViceHub)";
          try { navigator.clipboard.writeText(txt).then(function () { toast("Nome copiado"); }, function () { toast(txt); }); } catch (err) { toast(txt); }
        }
        if (a === "del") {
          if (!armed) { armed = true; toast("Toque de novo no lixo para apagar"); return; }
          LOCS.splice(LOCS.indexOf(l), 1); reindex(); saveMine(); closePop(); dirty = true; need = true; updateProgress(); toast("Marcador apagado");
        }
        if (a === "prev" || a === "next") { var nl = list[(idx + (a === "next" ? 1 : -1) + list.length) % list.length]; on[nl.c] = true; select(nl.i, true); }
      };
      requestAnimationFrame(placePop);
    }
    function closePop() { pop.hidden = true; if (sel >= 0) { sel = -1; dirty = true; need = true; } }
    function select(i, fly) {
      sel = i; dirty = true; var l = LOCS[i];
      if (fly) flyTo(l, Math.max(st.k, .8)); else if (st.k < .2) flyTo(l, .5); else need = true;
      openPop(l);
    }
    function flyTo(l, k) {
      k = clamp(k, fitK, MAXK);
      var top = topSpace(), cy = top + (vh - top - botSpace()) * .7 + 20;
      anim = { a: { k: st.k, tx: st.tx, ty: st.ty }, b: { k: k, tx: vw / 2 - l.x * k, ty: cy - l.y * k }, t0: performance.now(), dur: 750 };
    }
    function home() {
      var top = topSpace(), bot = botSpace(), k = fitK;
      anim = { a: { k: st.k, tx: st.tx, ty: st.ty }, b: { k: k, tx: (vw - W * k) / 2, ty: top + (vh - top - bot - H * k) / 2 }, t0: performance.now(), dur: 650 };
    }
    function zoomAt(sx, sy, f, animate) {
      var nk = clamp(st.k * f, fitK * .8, MAXK), mx = (sx - st.tx) / st.k, my = (sy - st.ty) / st.k;
      var b = { k: nk, tx: sx - mx * nk, ty: sy - my * nk };
      if (animate) anim = { a: { k: st.k, tx: st.tx, ty: st.ty }, b: b, t0: performance.now(), dur: 380 };
      else { st.k = b.k; st.tx = b.tx; st.ty = b.ty; clampView(); need = true; }
    }

    /* ---- atalhos de categoria no topo do mapa ---- */
    var QUICK = [
      ["Colecionáveis", "card", "#f5c542", ["lendario", "garlend", "carta"]],
      ["Garagens", "garage", "#2de2e6", ["garagem", "casa", "garlend"]],
      ["Oficinas", "wrench", "#ff6b5f", ["oficina"]],
      ["Armas", "gun", "#ff3b3b", ["armas"]],
      ["Compras", "bag", "#ff9a3c", ["mercado", "loja", "roupas", "barbearia", "tatuagem"]],
      ["Comer e sair", "glass", "#ff7ab8", ["comida", "bar", "boate"]],
      ["Postos", "fuel", "#ffe066", ["posto"]],
      ["Turismo", "star", "#ffd23f", ["marco", "natureza"]]
    ];
    var quickOn = -1;
    function buildQuick() {
      $("#quick").innerHTML = QUICK.map(function (q, i) {
        return '<button class="qchip' + (quickOn === i ? " on" : "") + '" data-q="' + i + '" style="--c:' + q[2] + '"><span class="qi" style="background:' + (q[2] === "#f5c542" ? "linear-gradient(180deg,#fff1a8,#f5c542 45%,#b9791a)" : q[2]) + ';color:' + (q[2] === "#f5c542" ? "#2a1600" : "#fff") + '">' + ico(q[1]) + "</span>" + q[0] + "</button>";
      }).join("");
    }
    $("#quick").addEventListener("click", function (e) {
      var b = e.target.closest("[data-q]"); if (!b) return;
      var i = +b.getAttribute("data-q");
      if (quickOn === i) { quickOn = -1; cats.forEach(function (c) { on[c] = true; }); }
      else {
        quickOn = i; cats.forEach(function (c) { on[c] = QUICK[i][3].indexOf(c) >= 0; });
        var n = LOCS.filter(visible).length;
        if (!n) toast(i === 0 ? "Nenhum colecionável marcado ainda. Use o botão dourado para adicionar." : "Nada nessa categoria ainda");
      }
      buildQuick(); syncBadge();
    });

    /* ---- adicionar marcador ---- */
    function startAdd() { adding = true; closePop(); $("#addHint").hidden = false; toast("Toque no mapa para posicionar"); }
    function stopAdd() { adding = false; $("#addHint").hidden = true; }

    /* ---- entrada ---- */
    var ptrs = {}, pinch = null, lastTap = 0;
    function bindInput() {
      svg.addEventListener("pointerdown", function (e) {
        if (svg.setPointerCapture) svg.setPointerCapture(e.pointerId);
        ptrs[e.pointerId] = { x: e.clientX, y: e.clientY }; anim = null; vel = null;
        var ids = Object.keys(ptrs);
        if (ids.length === 1) drag = { x: e.clientX, y: e.clientY, t: performance.now(), moved: 0, lt: performance.now() };
        if (ids.length === 2) { var a = ptrs[ids[0]], b = ptrs[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: st.k, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, tx: st.tx, ty: st.ty }; if (drag) drag.moved = 99; }
      });
      svg.addEventListener("pointermove", function (e) {
        if (!ptrs[e.pointerId]) return;
        ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(ptrs), r = wrap.getBoundingClientRect();
        if (ids.length >= 2 && pinch) {
          var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
          var nk = clamp(pinch.k * d / pinch.d, fitK * .8, MAXK), mx = (pinch.cx - r.left - pinch.tx) / pinch.k, my = (pinch.cy - r.top - pinch.ty) / pinch.k;
          st.k = nk; st.tx = cx - r.left - mx * nk; st.ty = cy - r.top - my * nk; clampView(); need = true;
        } else if (drag) {
          var dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now();
          drag.moved += Math.abs(dx) + Math.abs(dy); st.tx += dx; st.ty += dy; drag.x = e.clientX; drag.y = e.clientY;
          var dt = Math.max(1, now - drag.lt); drag.vx = dx * 16 / dt; drag.vy = dy * 16 / dt; drag.lt = now;
          clampView(); need = true;
        }
      });
      var up = function (e) {
        if (!ptrs[e.pointerId]) return;
        delete ptrs[e.pointerId];
        var left = Object.keys(ptrs).length;
        if (left < 2) pinch = null;
        if (left === 0 && drag) {
          if (drag.moved < 10 && performance.now() - drag.t < 450) onTap(e);
          else if (drag.vx && performance.now() - drag.lt < 80) vel = { x: drag.vx, y: drag.vy };
          drag = null;
        } else if (left === 1) { var id = Object.keys(ptrs)[0]; drag = { x: ptrs[id].x, y: ptrs[id].y, t: 0, moved: 99, lt: performance.now() }; }
      };
      svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
      svg.addEventListener("wheel", function (e) { e.preventDefault(); var r = wrap.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .0018)); }, { passive: false });
      $("#zoomIn").onclick = function () { zoomAt(vw / 2, vh / 2, 2, true); };
      $("#zoomOut").onclick = function () { zoomAt(vw / 2, vh / 2, .5, true); };
      $("#recenter").onclick = function () { closePop(); home(); };
      $("#tilt3d").onclick = function () { var t = stageEl.classList.toggle("tilted"); this.classList.toggle("on", t); need = true; toast(t ? "Mapa 3D ligado" : "Mapa 3D desligado"); };
      $("#addPin").onclick = function () { if (adding) stopAdd(); else startAdd(); };
      $("#addCancel").onclick = stopAdd;
      $("#openFilters").onclick = openDrawer;
      var input = $("#mapSearch"), res = $("#results");
      input.addEventListener("input", function () { renderResults(input.value.trim()); });
      input.addEventListener("focus", function () { if (input.value.trim()) renderResults(input.value.trim()); });
      res.addEventListener("click", function (e) {
        var b = e.target.closest("[data-i]"); if (!b) return;
        var l = LOCS[+b.getAttribute("data-i")]; res.hidden = true; input.blur();
        if (!visible(l)) { on[l.c] = true; fRegion = "all"; fVisit = "all"; fFav = false; syncBadge(); }
        select(l.i, true);
      });
    }
    function renderResults(q) {
      var res = $("#results");
      if (!q) { res.hidden = true; return; }
      var nq = norm(q), list = LOCS.filter(function (l) { return norm(l.n + " " + l.area + " " + (l.real || "") + " " + CAT[l.c].nome).indexOf(nq) >= 0; }).slice(0, 25);
      res.hidden = false;
      res.innerHTML = list.length ? list.map(function (l) {
        var c = CAT[l.c];
        return '<button class="result" data-i="' + l.i + '"><span class="rdot" style="background:' + c.cor + '33;color:' + c.cor + '">' + ico(c.icone) + "</span><span><b>" + esc(l.n) + "</b><small>" + esc(c.nome) + " · " + esc(l.area || REG[l.r].nome) + "</small></span></button>";
      }).join("") : '<div class="empty">Nada encontrado para "' + esc(q) + '".</div>';
    }
    function onTap(e) {
      var wr = wrap.getBoundingClientRect();
      if (adding) {
        stopAdd();
        var mx = (e.clientX - wr.left - st.tx) / st.k, my = (e.clientY - wr.top - st.ty) / st.k;
        PinForm.open(clamp(mx, 0, W), clamp(my, 0, H));
        return;
      }
      var el = document.elementFromPoint(e.clientX, e.clientY), pin = el && el.closest ? el.closest("[data-i]") : null;
      $("#results").hidden = true;
      if (pin) { select(+pin.getAttribute("data-i"), false); return; }
      if (sel >= 0) { closePop(); return; }
      var now = performance.now();
      if (now - lastTap < 320) zoomAt(e.clientX - wr.left, e.clientY - wr.top, 2, true);
      lastTap = now;
    }

    /* ---- filtros ---- */
    function hiddenCount() { return cats.filter(function (c) { return !on[c]; }).length; }
    function syncBadge() {
      var n = hiddenCount() + (fRegion !== "all") + (fVisit !== "all") + (fFav ? 1 : 0), b = $("#filterCount");
      b.textContent = n; b.hidden = !n; dirty = true; need = true;
      if (sel >= 0 && !visible(LOCS[sel])) closePop();
      if ($("#drawer").classList.contains("open")) renderDrawer();
    }
    function renderDrawer() {
      var h = '<div class="dr-h"><h3>Filtros</h3><button class="pop-x" style="position:static" data-f="done" aria-label="Fechar">' + ico("close") + "</button></div>" +
        '<div class="dr-row"><button class="btn ghost" data-f="all">Mostrar tudo</button><button class="btn ghost" data-f="none">Esconder tudo</button></div>' +
        '<div class="grp"><div class="grp-h">Progresso</div><div class="seg glass" style="margin:0">' +
        [["all", "Todos"], ["no", "Não visitados"], ["yes", "Visitados"]].map(function (s) { return '<button class="' + (fVisit === s[0] ? "on" : "") + '" data-f="visit" data-v="' + s[0] + '">' + s[1] + "</button>"; }).join("") + "</div>" +
        '<button class="fitem' + (fFav ? " on" : "") + '" data-f="fav" style="--c:#ff3d8b;margin-top:6px"><span class="ic" style="background:#ff3d8b">' + ico("heart") + "</span><b>Só os salvos</b><small>" + Object.keys(favs).length + '</small><span class="tg"></span></button></div>';
      GROUPS.forEach(function (g) {
        h += '<div class="grp"><div class="grp-h">' + g[0] + "</div>";
        g[1].forEach(function (c) {
          var C = CAT[c]; if (!C) return;
          h += '<button class="fitem' + (on[c] ? " on" : "") + '" data-f="cat" data-v="' + c + '" style="--c:' + C.cor + '"><span class="ic" style="background:' + (C.ouro ? "linear-gradient(180deg,#fff1a8,#f5c542 45%,#b9791a)" : C.cor) + '">' + ico(C.icone, C.ouro ? ' style="color:#2a1600"' : "") + "</span><b>" + esc(C.nome) + "</b><small>" + (BYCAT[c] ? BYCAT[c].length : 0) + '</small><span class="tg"></span></button>';
        });
        h += "</div>";
      });
      h += '<div class="grp"><div class="grp-h">Região</div><div class="chips" style="flex-wrap:wrap;margin:0;padding:0">' +
        '<button class="chip' + (fRegion === "all" ? " on" : "") + '" data-f="reg" data-v="all" style="--c:#fff"><i></i>Leonida inteira</button>' +
        D.regioes.map(function (r) { return '<button class="chip' + (fRegion === r.id ? " on" : "") + '" data-f="reg" data-v="' + r.id + '" style="--c:' + r.cor + '"><i></i>' + esc(r.nome) + "</button>"; }).join("") + "</div></div>";
      $("#drawer").innerHTML = h;
    }
    function openDrawer() { renderDrawer(); $("#drawer").classList.add("open"); $("#scrim").classList.add("open"); }
    $("#drawer").addEventListener("click", function (e) {
      var b = e.target.closest("[data-f]"); if (!b) return;
      var f = b.getAttribute("data-f"), v = b.getAttribute("data-v");
      if (f === "done") { closeDrawer(); return; }
      quickOn = -1; buildQuick();
      if (f === "all") { cats.forEach(function (c) { on[c] = true; }); fRegion = "all"; fVisit = "all"; fFav = false; }
      if (f === "none") cats.forEach(function (c) { on[c] = false; });
      if (f === "cat") on[v] = !on[v];
      if (f === "reg") fRegion = v;
      if (f === "visit") fVisit = v;
      if (f === "fav") fFav = !fFav;
      syncBadge();
    });

    return {
      show: function () { build(); setTimeout(function () { resize(false); }, 30); need = true; },
      resize: function () { resize(false); },
      closePop: closePop, popOpen: function () { return !pop.hidden; }, adding: function () { return adding; }, stopAdd: stopAdd,
      focus: function (i) { go("map"); var l = LOCS[i]; on[l.c] = true; syncBadge(); setTimeout(function () { select(i, true); }, 120); },
      region: function (r) {
        go("map"); cats.forEach(function (c) { on[c] = true; }); fRegion = r.id; syncBadge();
        setTimeout(function () { closePop(); flyTo({ x: r.x, y: r.y }, fitK * (r.id === "vice" ? 4.5 : 3)); }, 120);
      },
      solo: function (list) { go("map"); cats.forEach(function (c) { on[c] = list.indexOf(c) >= 0; }); fRegion = "all"; syncBadge(); setTimeout(home, 120); },
      added: function (l) { on[l.c] = true; dirty = true; syncBadge(); select(l.i, false); },
      refresh: function () { dirty = true; need = true; }
    };
  })();
  function closeDrawer() { $("#drawer").classList.remove("open"); if (!$("#vModal").classList.contains("open") && !$("#sheet").classList.contains("open")) $("#scrim").classList.remove("open"); }

  /* =========================================================
     FOLHA (perfil e formulário de marcador)
     ========================================================= */
  function openSheet(html) { $("#sheetPanel").innerHTML = '<div class="sh-grab"></div><div class="sh-b">' + html + "</div>"; $("#sheet").classList.add("open"); $("#scrim").classList.add("open"); }
  function closeSheet() { $("#sheet").classList.remove("open"); if (!$("#drawer").classList.contains("open") && !$("#vModal").classList.contains("open")) $("#scrim").classList.remove("open"); }
  $("#scrim").addEventListener("click", function () { closeDrawer(); Veh.close(); closeSheet(); });

  var PinForm = (function () {
    var pending = null, photo = "";
    function nearestRegion(x, y) { var best = D.regioes[0], bd = 1e18; D.regioes.forEach(function (r) { var d = (r.x - x) * (r.x - x) + (r.y - y) * (r.y - y); if (d < bd) { bd = d; best = r; } }); return best.id; }
    function open(x, y) {
      pending = { x: Math.round(x), y: Math.round(y) }; photo = "";
      var opts = ["lendario", "garlend", "carta"].concat(Object.keys(CAT).filter(function (c) { return !CAT[c].meu; }));
      openSheet('<span class="eyebrow">Novo marcador</span><h2 style="margin:4px 0 14px">O que tem aqui?</h2>' +
        '<div class="chips" id="pfCats" style="flex-wrap:wrap;margin:0 0 6px;padding:0">' + opts.map(function (c, i) { var C = CAT[c]; return '<button class="chip' + (i === 0 ? " on" : "") + '" data-c="' + c + '" style="--c:' + C.cor + '"><i></i>' + esc(C.nome) + "</button>"; }).join("") + "</div>" +
        '<label class="field"><span>Nome</span><input id="pfName" type="text" placeholder="Ex.: Cheetah dourado na garagem" autocomplete="off"></label>' +
        '<label class="field"><span>Anotação</span><textarea id="pfNote" rows="2" placeholder="Como chegar, horário, missão..."></textarea></label>' +
        '<button class="ph-pick" id="pfPhoto"><span class="th" id="pfThumb">' + ico("camera", ' width="20" height="20"') + '</span><span><b>Adicionar foto</b><small>Uma captura sua do jogo (opcional)</small></span></button>' +
        '<div class="stack"><button class="btn primary" id="pfSave">' + ico("pin") + 'Salvar marcador</button><button class="btn ghost" id="pfCancel">Cancelar</button></div>');
      var cat = opts[0];
      $("#pfCats").onclick = function (e) { var b = e.target.closest("[data-c]"); if (!b) return; cat = b.getAttribute("data-c"); $$("#pfCats .chip").forEach(function (x) { x.classList.toggle("on", x === b); }); };
      $("#pfPhoto").onclick = function () { $("#photoInput").value = ""; $("#photoInput").click(); };
      $("#pfCancel").onclick = closeSheet;
      $("#pfSave").onclick = function () {
        var n = $("#pfName").value.trim();
        if (!n) { toast("Escreva um nome para o marcador"); $("#pfName").focus(); return; }
        var l = { id: "M" + Date.now().toString(36), n: n, c: cat, r: nearestRegion(pending.x, pending.y), x: pending.x, y: pending.y, d: $("#pfNote").value.trim(), foto: photo, area: "", mine: true, ok: true };
        LOCS.push(l); reindex(); saveMine(); closeSheet(); updateProgress(); Map.added(l); toast("Marcador salvo");
      };
    }
    $("#photoInput").addEventListener("change", function () {
      var f = this.files && this.files[0]; if (!f) return;
      var rd = new FileReader();
      rd.onload = function () {
        var im = new Image();
        im.onload = function () {
          var w = Math.min(640, im.width), h = Math.round(im.height * w / im.width), c = document.createElement("canvas");
          c.width = w; c.height = h; c.getContext("2d").drawImage(im, 0, 0, w, h);
          try { photo = c.toDataURL("image/jpeg", .7); } catch (e) { photo = ""; }
          var t = $("#pfThumb"); if (t) { t.style.backgroundImage = "url(" + photo + ")"; t.innerHTML = ""; }
        };
        im.src = rd.result;
      };
      rd.readAsDataURL(f);
    });
    return { open: open };
  })();

  function openProfile() {
    var u = VH_AUTH.current() || { name: "Convidado", kind: "guest" }, guest = u.kind === "guest";
    var nMine = LOCS.filter(function (l) { return l.mine; }).length;
    openSheet('<div class="prof"><span class="avatar' + (guest ? " guest" : "") + '">' + esc((u.name || "?").charAt(0).toUpperCase()) + "</span><span><b>" + esc(u.name) + "</b><small>" + (guest ? "Convidado · dados salvos neste aparelho" : esc(u.email) + " · conta neste aparelho") + "</small></span></div>" +
      '<div class="pstats"><div><b>' + fmt(nVisited()) + "</b><span>visitados</span></div><div><b>" + Object.keys(favs).length + "</b><span>salvos</span></div><div><b>" + nMine + "</b><span>marcadores</span></div></div>" +
      '<div class="stack">' + (guest ? '<button class="btn primary" data-p="login">' + ico("user") + "Entrar ou criar conta</button>" : "") +
      '<a class="btn au-discord" data-p="discord" href="' + esc(CFG.discordUrl || "#") + '"' + (CFG.discordUrl ? ' target="_blank" rel="noopener"' : "") + ">Comunidade no Discord" + (CFG.discordUrl ? "" : "<em>em breve</em>") + "</a>" +
      '<button class="btn ghost" data-p="out">' + ico("logout") + (guest ? "Sair do modo convidado" : "Sair da conta") + "</button></div>" +
      '<p class="copy">© 2026 Flow Labs Studio · Todos os direitos reservados</p>');
    $("#sheetPanel").onclick = function (e) {
      var b = e.target.closest("[data-p]"); if (!b) return;
      var p = b.getAttribute("data-p");
      if (p === "discord" && !CFG.discordUrl) { e.preventDefault(); toast("Nosso Discord abre em breve"); }
      if (p === "login" || p === "out") { if (p === "out") VH_AUTH.signOut(); closeSheet(); Auth.show(); }
    };
  }
  $("#avatarBtn").onclick = openProfile;
  $("#progressBtn").onclick = openProfile;

  /* =========================================================
     LOCAIS
     ========================================================= */
  var Places = (function () {
    var cat = "all", q = "", shownN = 40;
    function chips() {
      var cs = Object.keys(CAT).filter(function (c) { return BYCAT[c]; });
      $("#plCats").innerHTML = '<button class="chip' + (cat === "all" ? " on" : "") + '" data-c="all" style="--c:#fff"><i></i>Todos <small>' + LOCS.length + "</small></button>" +
        cs.map(function (c) { return '<button class="chip' + (cat === c ? " on" : "") + '" data-c="' + c + '" style="--c:' + CAT[c].cor + '"><i></i>' + esc(CAT[c].nome) + " <small>" + BYCAT[c].length + "</small></button>"; }).join("");
    }
    function render() {
      chips();
      var sorted = LOCS.slice().sort(function (a, b) { return (b.mine ? 1 : 0) - (a.mine ? 1 : 0) || (b.foto ? 1 : 0) - (a.foto ? 1 : 0) || a.n.localeCompare(b.n); });
      var nq = norm(q), list = sorted.filter(function (l) { return (cat === "all" || l.c === cat) && (!nq || norm(l.n + " " + l.area + " " + (l.real || "")).indexOf(nq) >= 0); });
      $("#plGrid").innerHTML = list.length ? list.slice(0, shownN).map(function (l, i) {
        var c = CAT[l.c], photo = l.foto && (!window.VH_NOPHOTOS || l.mine);
        return '<button class="pl glass" data-i="' + l.i + '" style="animation-delay:' + (i % 20) * 25 + 'ms"><div class="ph">' +
          (photo ? '<img src="' + esc(l.foto) + '" alt="" loading="lazy">' : '<span class="noimg" style="color:' + c.cor + '">' + ico(c.icone) + "</span>") +
          '<span class="cdot" style="background:' + (c.ouro ? "linear-gradient(180deg,#fff1a8,#f5c542 45%,#b9791a)" : c.cor) + '">' + ico(c.icone) + "</span>" + (visited[l.id] ? '<span class="vis">' + ico("check", ' stroke-width="3"') + "</span>" : "") +
          '</div><div class="tx"><b>' + esc(l.n) + "</b><small>" + (l.mine ? "Seu marcador · " : "") + esc(l.area || REG[l.r].nome) + "</small></div></button>";
      }).join("") : '<div class="empty">Nenhum local com esse nome.</div>';
      $("#plMore").hidden = list.length <= shownN;
      $("#placesSub").textContent = fmt(list.length) + " locais · " + fmt(LOCS.filter(function (l) { return l.foto; }).length) + " com foto";
    }
    $("#plCats").addEventListener("click", function (e) { var b = e.target.closest("[data-c]"); if (!b) return; cat = b.getAttribute("data-c"); shownN = 40; render(); });
    $("#plSearch").addEventListener("input", function () { q = this.value.trim(); shownN = 40; render(); });
    $("#plMore").addEventListener("click", function () { shownN += 40; render(); });
    $("#plGrid").addEventListener("click", function (e) { var b = e.target.closest("[data-i]"); if (b) Map.focus(+b.getAttribute("data-i")); });
    return { render: render };
  })();

  /* =========================================================
     VEÍCULOS
     ========================================================= */
  var TYPE = { carro: "Carro", moto: "Moto", barco: "Barco", aereo: "Aeronave" };
  function slug(v) { return norm((v.m && v.m !== "—" ? v.m + " " : "") + v.n).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
  function vArt(v) {
    var c = v.cor, dk = "#140a26", gl = "rgba(120,220,255,.55)";
    if (v.t === "carro") {
      var low = /Super|Esportivo/.test(v.cl);
      var body = low ? "M12 54 C14 46 26 43 44 41 L74 29 C88 23 118 23 134 29 L160 40 C178 42 190 46 190 55 L190 60 L12 60 Z" : "M10 52 C10 44 22 42 38 41 L60 24 C72 20 118 20 130 24 L150 40 C172 41 190 44 190 52 L190 60 L10 60 Z";
      var win = low ? "M80 31 L100 31 L100 40 L60 41 Z M106 31 L128 31 L150 40 L106 40 Z" : "M66 27 L94 26 L94 40 L50 41 Z M100 26 L126 27 L144 40 L100 40 Z";
      return '<svg viewBox="0 0 200 80"><path d="' + body + '" fill="' + c + '"/><path d="' + win + '" fill="' + gl + '"/><circle cx="52" cy="60" r="13" fill="' + dk + '"/><circle cx="52" cy="60" r="6" fill="#cfd3e6"/><circle cx="150" cy="60" r="13" fill="' + dk + '"/><circle cx="150" cy="60" r="6" fill="#cfd3e6"/></svg>';
    }
    if (v.t === "moto") return '<svg viewBox="0 0 200 80"><circle cx="48" cy="56" r="18" fill="none" stroke="' + dk + '" stroke-width="7"/><circle cx="152" cy="56" r="18" fill="none" stroke="' + dk + '" stroke-width="7"/><path d="M48 56 L84 36 L124 34 L152 56" fill="none" stroke="#cfd3e6" stroke-width="4"/><path d="M96 24 C108 18 128 20 134 28 L126 36 L96 36 Z" fill="' + c + '"/><path d="M62 30 L96 28 L96 34 L58 36 Z" fill="' + dk + '"/></svg>';
    if (v.t === "barco") return '<svg viewBox="0 0 200 80"><path d="M8 42 L188 38 L168 62 L32 62 Z" fill="' + c + '"/><path d="M66 40 L82 22 L128 22 L140 39 Z" fill="' + gl + '"/><path d="M0 68 Q 12 63 24 68 T 48 68 T 72 68 T 96 68 T 120 68 T 144 68 T 168 68 T 192 68" stroke="#2de2e6" stroke-width="2.5" fill="none" opacity=".7"/></svg>';
    if (/Helicóptero/.test(v.cl)) return '<svg viewBox="0 0 200 80"><path d="M24 12 L176 12 M96 12 V22" stroke="' + dk + '" stroke-width="4" stroke-linecap="round"/><ellipse cx="90" cy="42" rx="42" ry="19" fill="' + c + '"/><path d="M60 34 C64 26 80 24 92 26 L92 42 L56 42 Z" fill="' + gl + '"/><path d="M128 38 L188 32 L188 40 L130 50 Z" fill="' + c + '"/><path d="M58 70 H126 M70 60 V70 M112 60 V70" stroke="' + dk + '" stroke-width="4" stroke-linecap="round"/></svg>';
    return '<svg viewBox="0 0 200 80"><path d="M8 44 C8 36 28 34 48 34 L168 36 C184 36 194 40 194 44 C194 48 184 50 168 50 L48 52 C28 52 8 50 8 44Z" fill="' + c + '"/><path d="M84 44 L118 44 L100 74 L88 74 Z" fill="' + c + '" opacity=".85"/><path d="M160 36 L178 12 L190 12 L184 40" fill="' + c + '"/><path d="M14 40 C18 36 28 36 34 38 L30 44 L14 44 Z" fill="' + gl + '"/></svg>';
  }
  function vPhoto(v) {
    var src = "img/veiculos/" + slug(v) + ".jpg";
    if (window.VH_PHOTOS) return window.VH_PHOTOS[src] ? '<img src="' + window.VH_PHOTOS[src] + '" alt="">' : "";
    return '<img src="' + src + '" alt="" onerror="this.parentNode.removeChild(this)">';
  }
  var Veh = (function () {
    var type = "all", cls = "all", q = "", openI = -1;
    function render() {
      var base = D.veiculos.filter(function (v) { return type === "all" || v.t === type; }), classes = [];
      base.forEach(function (v) { if (classes.indexOf(v.cl) < 0) classes.push(v.cl); });
      $("#vClass").innerHTML = '<button class="chip' + (cls === "all" ? " on" : "") + '" data-c="all" style="--c:#fff"><i></i>Todas <small>' + base.length + "</small></button>" +
        classes.map(function (c) { return '<button class="chip' + (cls === c ? " on" : "") + '" data-c="' + esc(c) + '"><i></i>' + esc(c) + "</button>"; }).join("");
      var nq = norm(q), list = base.filter(function (v) { return (cls === "all" || v.cl === cls) && (!nq || norm(v.n + " " + v.m + " " + v.cl + " " + (v.real || "")).indexOf(nq) >= 0); });
      $("#vList").innerHTML = list.length ? list.map(function (v, i) {
        var k = D.veiculos.indexOf(v), ok = v.s === "oficial" ? "#5dff9b" : "#ffd23f";
        return '<button class="vc glass" data-v="' + k + '" style="--vc:' + v.cor + ";animation-delay:" + Math.min(i, 16) * 30 + 'ms"><span class="flag" style="background:' + ok + '"></span><div class="art">' + vArt(v) + vPhoto(v) + "</div>" +
          '<span class="mk">' + esc(v.m === "—" ? TYPE[v.t] : v.m) + "</span><b>" + esc(v.n) + "</b><small>" + esc(v.cl) + "</small>" + (v.spd ? '<div class="bar"><i style="width:' + v.spd * 10 + '%"></i></div>' : "") + "</button>";
      }).join("") : '<div class="empty">Nenhum veículo com esse nome.</div>';
      $("#vehSub").textContent = D.veiculos.length + " modelos · carros, motos, barcos e aeronaves";
    }
    function build() {
      $("#vSeg").innerHTML = [["all", "Todos"], ["carro", "Carros"], ["moto", "Motos"], ["barco", "Barcos"], ["aereo", "Aéreos"]].map(function (s) { return '<button data-t="' + s[0] + '" class="' + (s[0] === type ? "on" : "") + '">' + s[1] + "</button>"; }).join("");
      $("#vSeg").onclick = function (e) { var b = e.target.closest("[data-t]"); if (!b) return; type = b.getAttribute("data-t"); cls = "all"; $$("#vSeg button").forEach(function (x) { x.classList.toggle("on", x === b); }); render(); };
      $("#vClass").onclick = function (e) { var b = e.target.closest("[data-c]"); if (!b) return; cls = b.getAttribute("data-c"); render(); };
      $("#vSearch").oninput = function () { q = this.value.trim(); render(); };
      $("#vList").onclick = function (e) { var b = e.target.closest("[data-v]"); if (b) open(+b.getAttribute("data-v")); };
      render();
    }
    function open(i) {
      var v = D.veiculos[i]; openI = i;
      var where = v.t === "barco" ? ["marina"] : v.t === "aereo" ? ["aereo"] : ["lendario", "garlend", "garagem", "oficina", "corrida"];
      $("#vPanel").innerHTML = '<div class="vm-art" style="--vc:' + v.cor + '">' + vArt(v) + vPhoto(v) + '<span class="soon">Foto em breve</span><button class="pop-x" data-a="close" aria-label="Fechar">' + ico("close") + "</button></div>" +
        '<div class="vm-b"><span class="eyebrow">' + esc(v.m === "—" ? TYPE[v.t] : v.m) + "</span><h2>" + esc(v.n) + "</h2>" +
        '<div class="spec"><div><small>Tipo</small><b>' + TYPE[v.t] + "</b></div><div><small>Classe</small><b>" + esc(v.cl) + "</b></div>" +
        "<div><small>Inspirado em</small><b>" + esc(v.real || "Não identificado") + "</b></div><div><small>Velocidade</small><b>" + (v.spd ? v.spd.toFixed(1) + " / 10" : "Não publicada") + "</b></div></div>" +
        (v.nota ? '<p class="muted" style="font-size:13.5px;margin:0 0 14px">' + esc(v.nota) + "</p>" : "") +
        '<p class="muted" style="font-size:12px;margin:0 0 14px">' + (v.s === "oficial" ? "Mostrado oficialmente pela Rockstar." : "Da lista da comunidade.") + "</p>" +
        '<button class="btn primary" data-a="where" style="width:100%">' + ico("map") + (v.t === "barco" ? "Ver marinas no mapa" : v.t === "aereo" ? "Ver aeroportos no mapa" : "Ver carros lendários, garagens e oficinas") + "</button></div>";
      $("#vModal").classList.add("open"); $("#scrim").classList.add("open");
      $("#vPanel").onclick = function (e) { var b = e.target.closest("[data-a]"); if (!b) return; if (b.getAttribute("data-a") === "close") close(); else { close(); Map.solo(where); } };
    }
    function close() { openI = -1; $("#vModal").classList.remove("open"); if (!$("#drawer").classList.contains("open") && !$("#sheet").classList.contains("open")) $("#scrim").classList.remove("open"); }
    return { build: build, close: close, isOpen: function () { return openI >= 0; } };
  })();

  /* =========================================================
     GUIA
     ========================================================= */
  var REGIMG = { vice: 1, keys: 1, gellhorn: 1, ambrosia: 1, grass: 1 };
  function buildGuide() {
    var J = D.jogo, nf = LOCS.filter(function (l) { return l.foto && !l.mine; }).length;
    $("#gHeroTxt").textContent = fmt(LOCS.length) + " locais no mapa oficial, " + D.veiculos.length + " veículos e as 6 regiões de Leonida.";
    var facts = [["Lançamento", J.lancamento], ["Plataformas", J.plataformas.join(" · ")], ["Versão para PC", J.pc], ["GTA Online novo", J.online], ["Vendas no 1º dia", J.destaques[0].valor], ["Inspirado em", J.inspiracao]];
    $("#facts").innerHTML = facts.map(function (f) { return '<div class="fact glass"><small>' + esc(f[0]) + "</small><b>" + esc(f[1]) + "</b></div>"; }).join("");
    $("#heroes").innerHTML = J.protagonistas.map(function (p, i) {
      var c = i ? "var(--aqua)" : "var(--pink)";
      return '<div class="hero-card glass"><span class="big" style="color:' + c + '">' + p.nome.charAt(0) + '</span><span class="eyebrow" style="color:' + c + '">Protagonista</span><h3>' + esc(p.nome) + "</h3><p>" + esc(p.texto) + "</p></div>";
    }).join("");
    var BOX = G6 ? G6.bbox : [0, 0, 15040, 19840], span = 4200, th = 92;
    $("#regions").innerHTML = D.regioes.map(function (r) {
      var n = LOCS.filter(function (l) { return l.r === r.id; }).length, sc = th / span, style;
      if (REGIMG[r.id]) style = 'background-image:url(img/regioes/' + r.id + '.jpg);background-size:cover;background-position:center';
      else style = "background-size:" + (BOX[2] * sc).toFixed(0) + "px " + (BOX[3] * sc).toFixed(0) + "px;background-position:" + (-(r.x - span / 2) * sc).toFixed(0) + "px " + (-(r.y - span / 2) * sc).toFixed(0) + "px";
      return '<button class="reg glass" data-r="' + r.id + '"><span class="thumb" style="' + style + '"></span><span><b>' + esc(r.nome) + '</b><small style="color:' + r.cor + '">inspirado em ' + esc(r.base) + "</small><p>" + esc(r.texto) + '</p><span class="n">' + n + " locais no mapa</span></span></button>";
    }).join("");
    $("#regions").onclick = function (e) { var b = e.target.closest("[data-r]"); if (b) Map.region(REG[b.getAttribute("data-r")]); };
    var cs = Object.keys(CAT).filter(function (c) { return BYCAT[c] && !CAT[c].meu; }).sort(function (a, b) { return BYCAT[b].length - BYCAT[a].length; });
    $("#numbers").innerHTML = '<div class="numgrid">' + cs.map(function (c) {
      return '<div class="num"><span class="ic" style="background:' + CAT[c].cor + '">' + ico(CAT[c].icone) + "</span><span><b>" + BYCAT[c].length + "</b><span>" + esc(CAT[c].nome) + "</span></span></div>";
    }).join("") + '</div><p class="muted" style="font-size:12px;margin:12px 0 0">' + fmt(nf) + " locais têm foto tirada do jogo. Carros lendários e cartas douradas você marca no mapa com o botão dourado.</p>";
    $("#garInfo").innerHTML = "<ul>" + D.garagensInfo.itens.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>";
    var homes = (BYCAT.casa || []).concat(BYCAT.garagem || []);
    $("#homes").innerHTML = homes.map(function (l) {
      var c = CAT[l.c];
      return '<button class="lrow glass" data-i="' + l.i + '"><span class="th" style="color:' + c.cor + '">' + (l.foto && !window.VH_NOPHOTOS ? '<img src="' + esc(l.foto) + '" alt="" loading="lazy">' : ico(c.icone, ' width="24" height="24"')) + '</span><span class="tx"><b>' + esc(l.n) + "</b><small>" + esc(c.nome) + " · " + esc(l.area) + "</small></span>" + ico("right", ' width="18" height="18" style="color:var(--faint)"') + "</button>";
    }).join("");
    $("#homes").onclick = function (e) { var b = e.target.closest("[data-i]"); if (b) Map.focus(+b.getAttribute("data-i")); };
  }

  /* =========================================================
     VOLTAR (Android), ABERTURA, INÍCIO
     ========================================================= */
  window.ViceHub = {
    back: function () {
      if (!$("#auth").hidden) return false;
      if ($("#sheet").classList.contains("open")) { closeSheet(); return true; }
      if (Veh.isOpen()) { Veh.close(); return true; }
      if ($("#drawer").classList.contains("open")) { closeDrawer(); return true; }
      if (Map.adding()) { Map.stopAdd(); return true; }
      if (!$("#results").hidden) { $("#results").hidden = true; return true; }
      if (Map.popOpen()) { Map.closePop(); return true; }
      if (current !== 0) { go(0); return true; }
      return false;
    }
  };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") window.ViceHub.back(); });
  ["#stage", "#app", "#v-map", "#mapWrap"].forEach(function (s) {
    var el = $(s);
    if (el) el.addEventListener("scroll", function () { el.scrollLeft = 0; if (s !== "#stage") el.scrollTop = 0; });
  });
  $$(".view").forEach(function (v) { v.addEventListener("scroll", function () { if (v.scrollLeft) v.scrollLeft = 0; }); });

  var started = false;
  function startApp(u) {
    var av = $("#avatarBtn"), guest = !u || u.kind === "guest";
    $("#avatarTxt").textContent = guest ? "C" : (u.name || "?").charAt(0).toUpperCase();
    av.classList.toggle("guest", guest);
    if (started) return; started = true;
    updateProgress(); Veh.build(); buildGuide(); Places.render(); Map.show();
    requestAnimationFrame(ink);
  }
  var splash = $("#splash"), done = false;
  function endSplash() {
    if (done) return; done = true;
    splash.classList.add("hide");
    setTimeout(function () { splash.hidden = true; }, 800);
    var u = VH_AUTH.current();
    if (u) startApp(u); else { startApp(null); Auth.show(); }
    setTimeout(function () { ink(); Map.resize(); }, 60);
  }
  splash.addEventListener("click", endSplash);
  setTimeout(endSplash, window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 500 : 2800);
})();
