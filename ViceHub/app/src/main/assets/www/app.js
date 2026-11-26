/* ViceHub — app.js
 * Telas: Início · Mapa · Veículos · Garagens · Leonida
 * Sem dependências além do three.js (cenas 3D).
 */
(function () {
  "use strict";
  var D = window.VH_DATA;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var ease = function (t) { return 1 - Math.pow(1 - t, 3); };

  /* ---------- armazenamento local (opcional) ---------- */
  var store = {
    get: function (k, d) { try { var v = localStorage.getItem("vh:" + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem("vh:" + k, JSON.stringify(v)); } catch (e) { } }
  };

  /* ---------- ícones ---------- */
  var IC = {
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
    music: '<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>',
    bag: '<path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>',
    wrench: '<path d="M14.5 5.5a4 4 0 0 0-5 5L4 16l4 4 5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
    garage: '<path d="M3 10l9-6 9 6v10H3z"/><path d="M7 20v-7h10v7M7 16.5h10"/>',
    home: '<path d="M4 11l8-7 8 7v9h-5v-6H9v6H4z"/>',
    anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v13M8 11h8M5 14a7 7 0 0 0 14 0"/>',
    plane: '<path d="M10.5 3.5l1.5-.5 1.5.5V9l7 4v2l-7-2v4.5l2 1.5v1.5l-3.5-1-3.5 1V19l2-1.5V13l-7 2v-2l7-4z"/>',
    flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19l8-8"/>',
    sun: '<circle cx="12" cy="11" r="5"/><path d="M3 19h18M6 15.5h12M12 2v2M4.5 5l1.4 1.4M19.5 5l-1.4 1.4"/>',
    map: '<path d="M9 4L3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
    car: '<path d="M3 16v-3l2.2-5h13.6L21 13v3z"/><circle cx="7.5" cy="16.5" r="1.8"/><circle cx="16.5" cy="16.5" r="1.8"/>',
    moto: '<circle cx="6" cy="16" r="3.2"/><circle cx="18" cy="16" r="3.2"/><path d="M6 16l4-6h4l4 6M13 10l-1-3h3"/>',
    boat: '<path d="M3 15h18l-3 5H6z"/><path d="M12 15V4l6 9h-6"/>',
    heli: '<path d="M3 5h18M12 5v3"/><path d="M4 12a5 4 0 0 1 10 0v2H4z"/><path d="M14 12.5h7M6 17.5h8"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    arrow: '<path d="M9 6l6 6-6 6"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
    food: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 1.5-3 4-3 7h3v11"/>',
    bed: '<path d="M3 18V7M3 13h18v5M21 18v-3a3 3 0 0 0-3-3h-7v1"/><circle cx="7" cy="10" r="2"/>',
    fuel: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M5 9h8M14 8l3 2v7a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
    bus: '<rect x="5" y="3" width="14" height="15" rx="3"/><path d="M5 11h14M8 21v-3M16 21v-3"/><circle cx="8.5" cy="14.5" r=".8"/><circle cx="15.5" cy="14.5" r=".8"/>',
    gov: '<path d="M3 9l9-5 9 5M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    building: '<rect x="5" y="3" width="14" height="18" rx="1.5"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/>',
    factory: '<path d="M3 21V10l5 3V10l5 3V5h3v16zM3 21h18M18 21V9h3v12"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'
  };
  function svgIcon(name, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (extra || "") + '>' + (IC[name] || "") + "</svg>";
  }
  var TYPE = { carro: { nome: "Carros", um: "Carro", ic: "car" }, moto: { nome: "Motos", um: "Moto", ic: "moto" }, barco: { nome: "Barcos", um: "Barco", ic: "boat" }, aereo: { nome: "Aéreos", um: "Aeronave", ic: "heli" } };
  var REG = {}; D.regioes.forEach(function (r) { REG[r.id] = r; });
  /* locais: base do GTADB (CC BY 4.0) + notas do ViceHub */
  var G6 = window.VH_GTADB, MAPBOX = G6 ? G6.bbox : [0, 0, 15040, 19840];
  var FLAGTXT = { e: "Dá para entrar", u: "A confirmar", d: "Demolido", c: "Fechado" };
  if (G6) {
    D.locais = G6.items.map(function (it) {
      var cat = D.categorias[it[3]] ? it[3] : "outros";
      var fl = it[8] || "", extra = fl.split("").map(function (f) { return FLAGTXT[f]; }).filter(Boolean);
      return {
        id: it[0], n: it[1] || "Prédio sem nome", nomeado: !!it[1], area: it[2], c: cat, r: it[4], x: it[5], y: it[6],
        real: it[7], flags: fl, foto: it[9] ? "gtadb/photos/" + it[0] + ".jpg" : "",
        s: fl.indexOf("u") >= 0 ? "comunidade" : "oficial",
        d: (D.notas && D.notas[it[0]]) || ((it[2] ? "Fica em " + it[2] + "." : "") + (extra.length ? " " + extra.join(" · ") + "." : "")).trim() || "Local do mapa de Leonida."
      };
    });
  }
  /* locais do usuário (modo editor): pins novos e pins movidos, guardados no aparelho */
  var EDIT = { custom: store.get("custom2", []), moves: store.get("moves2", {}) };
  D.locais.forEach(function (l, i) { var m = EDIT.moves[l.id]; if (m) { l.x = m[0]; l.y = m[1]; } });
  EDIT.custom.forEach(function (c) { c.s = "meu"; c.mine = true; D.locais.push(c); });
  D.locais.forEach(function (l, i) { l.i = i; });
  function saveEdits() {
    store.set("custom2", D.locais.filter(function (l) { return l.mine; }).map(function (l) { return { n: l.n, c: l.c, r: l.r, x: l.x, y: l.y, d: l.d }; }));
    store.set("moves2", EDIT.moves);
  }

  var toastT;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }
  function quad(x, y) { return "ABCDEFGHIJKLMNOP".charAt(clamp(Math.floor(x / 1000), 0, 15)) + (clamp(Math.floor(y / 1000), 0, 19) + 1); }

  /* =========================================================
     NAVEGAÇÃO COM TRANSIÇÃO 3D
     ========================================================= */
  var TABS = [
    { id: "home", label: "Início", ic: "sun", view: "v-home" },
    { id: "map", label: "Mapa", ic: "map", view: "v-map" },
    { id: "veh", label: "Veículos", ic: "car", view: "v-veh" },
    { id: "gar", label: "Garagens", ic: "garage", view: "v-gar" },
    { id: "info", label: "Leonida", ic: "info", view: "v-info" }
  ];
  var current = 0;
  var tabbar = $("#tabbar");
  TABS.forEach(function (t, i) {
    var b = document.createElement("button");
    b.className = "tab" + (i === 0 ? " active" : "");
    b.innerHTML = svgIcon(t.ic) + "<span>" + t.label + "</span>";
    b.setAttribute("aria-label", t.label);
    b.addEventListener("click", function () { go(i); });
    tabbar.appendChild(b);
  });
  function placeGlow() {
    var tabs = $$(".tab", tabbar), g = $("#tabGlow"), t = tabs[current];
    if (!t) return;
    g.style.width = t.offsetWidth + "px";
    g.style.transform = "translateX(" + (t.offsetLeft - 7) + "px)";
  }
  function go(i) {
    if (typeof i === "string") i = TABS.findIndex(function (t) { return t.id === i; });
    if (i === current) return;
    var prev = current; current = i;
    TABS.forEach(function (t, k) {
      var v = document.getElementById(t.view);
      v.classList.remove("active", "left");
      if (k === i) v.classList.add("active");
      else if (k < i) v.classList.add("left");
    });
    $$(".tab", tabbar).forEach(function (b, k) { b.classList.toggle("active", k === i); });
    $("#viewTitle").textContent = document.getElementById(TABS[i].view).getAttribute("data-title");
    placeGlow();
    closeSheet(); closeDrawer();
    if (TABS[i].id === "map") Map.show();
    if (TABS[prev].id === "map") $("#results").hidden = true;
  }
  window.addEventListener("resize", function () { placeGlow(); Map.resize(); });

  /* efeito de inclinação 3D nos cartões */
  function attachTilt(el, max) {
    max = max || 8;
    el.classList.add("tilt");
    el.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch" && e.buttons === 0) return;
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      el.style.transform = "perspective(700px) rotateX(" + (-py * max) + "deg) rotateY(" + (px * max) + "deg) translateZ(6px)";
    });
    var reset = function () { el.style.transform = ""; };
    el.addEventListener("pointerleave", reset);
    el.addEventListener("pointercancel", reset);
    el.addEventListener("pointerup", reset);
  }

  /* =========================================================
     INÍCIO
     ========================================================= */
  function buildHome() {
    var nGar = D.locais.filter(function (l) { return l.c === "garagem"; }).length;
    var stats = [
      { v: D.locais.length, l: "locais no mapa" },
      { v: D.veiculos.length, l: "veículos catalogados" },
      { v: D.regioes.length, l: "regiões de Leonida" },
      { v: D.jogo.destaques[0].valor, l: D.jogo.destaques[0].rotulo }
    ];
    $("#stats").innerHTML = stats.map(function (s) { return '<div class="stat glass"><b>' + esc(s.v) + "</b><span>" + esc(s.l) + "</span></div>"; }).join("");
    $$(".stat").forEach(function (e) { attachTilt(e, 10); });

    var quick = [
      { c: "garagem", l: "Garagens" }, { c: "casa", l: "Esconderijos" }, { c: "boate", l: "Boates" },
      { c: "armas", l: "Armas" }, { c: "marina", l: "Marinas" }, { c: "aereo", l: "Aeroportos" }
    ];
    $("#quick").innerHTML = quick.map(function (q) {
      var cat = D.categorias[q.c];
      return '<button class="qbtn glass" data-c="' + q.c + '"><i style="background:' + cat.cor + '22;color:' + cat.cor + ';box-shadow:0 0 18px ' + cat.cor + '33">' + svgIcon(cat.icone) + "</i>" + esc(q.l) + "</button>";
    }).join("");
    $$("#quick .qbtn").forEach(function (b) {
      attachTilt(b, 14);
      b.addEventListener("click", function () { Map.solo(b.getAttribute("data-c")); go("map"); });
    });

    $("#regCount").textContent = "deslize para ver";
    $("#regions").innerHTML = D.regioes.map(function (r) {
      var n = D.locais.filter(function (l) { return l.r === r.id; }).length;
      return '<div class="region-card glass" data-r="' + r.id + '"><span class="orb" style="background:' + r.cor + '"></span>' +
        '<span class="tag" style="color:' + r.cor + '">inspirado em ' + esc(r.base) + "</span><h3>" + esc(r.nome) + "</h3><p>" + esc(r.texto) + "</p>" +
        '<button class="link-btn" data-r="' + r.id + '">' + svgIcon("pin", ' width="15" height="15"') + "Ver " + n + " locais no mapa</button></div>";
    }).join("");
    $$("#regions .region-card").forEach(function (c) { attachTilt(c, 9); });
    $$("#regions .link-btn").forEach(function (b) {
      b.addEventListener("click", function () { var r = REG[b.getAttribute("data-r")]; go("map"); Map.focusRegion(r); });
    });

    var feat = D.veiculos.filter(function (v) { return v.t === "carro" && v.s === "oficial"; });
    $("#featured").innerHTML = feat.map(vCardHTML).join("");
    bindVCards($("#featured"));
  }

  /* =========================================================
     MAPA
     ========================================================= */
  var Map = (function () {
    var W = MAPBOX[2], H = MAPBOX[3], MAXK = 2; /* zoom máximo = 2 px por metro */
    var svg = $("#mapSvg"), wrap = $("#mapWrap"), stageEl = $("#mapStage");
    var st = { k: 1, tx: 0, ty: 0 }, fitK = 1, vw = 0, vh = 0;
    var built = false, ready = false, need = true;
    var cats = Object.keys(D.categorias);
    var on = {}; function allOn() { cats.forEach(function (c) { on[c] = !D.categorias[c].oculto; }); } allOn();
    function isAll() { return cats.every(function (c) { return on[c] === !D.categorias[c].oculto; }); }
    var fRegion = "all", fStatus = "all", favOnly = false, sel = -1, query = "";
    var favs = store.get("favs", []);
    var editMode = false, moveIdx = -1, showExport = false;
    function setEdit(v) {
      editMode = v; moveIdx = -1;
      var b = $("#editFab"); if (b) b.classList.toggle("on", v);
      if (v) { stageEl.classList.remove("tilted"); $("#tilt3d").classList.remove("on"); }
      toast(v ? "Editor ligado: toque no mapa para criar um local" : "Editor desligado");
      if (sel >= 0) openSheet(D.locais[sel]);
    }
    var gMap, gOv;

    /* mapa oficial do jogo em tiles (GTADB, CC BY 4.0). Sem tiles, usa uma imagem única (versão web). */
    var TL = window.VH_TILES, TILESET = {}, tileEls = {}, gTiles, NS = "http://www.w3.org/2000/svg";
    if (TL) Object.keys(TL.have).forEach(function (z) { var set = {}; TL.have[z].split("|").forEach(function (k) { set[k] = 1; }); TILESET[z] = set; });
    function tileImg(key, href, x, y, w, h) {
      var im = document.createElementNS(NS, "image");
      im.setAttribute("href", href); im.setAttributeNS("http://www.w3.org/1999/xlink", "href", href);
      im.setAttribute("x", x); im.setAttribute("y", y); im.setAttribute("width", w); im.setAttribute("height", h);
      im.setAttribute("preserveAspectRatio", "none");
      im._key = key; return im;
    }
    function updateTiles() {
      if (!TL) return;
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var zc = clamp(Math.ceil(Math.log(st.k * dpr) / Math.LN2 + 5 - .35), 0, TL.maxZ);
      var tilt = stageEl.classList.contains("tilted") ? .6 : .15;
      var vx0 = -st.tx / st.k, vy0 = -st.ty / st.k, vx1 = (vw - st.tx) / st.k, vy1 = (vh - st.ty) / st.k;
      var mx = (vx1 - vx0) * tilt, my = (vy1 - vy0) * tilt;
      vx0 -= mx; vx1 += mx; vy0 -= my * 2; vy1 += my;
      var want = {}, order = [];
      [Math.min(2, zc), zc].forEach(function (z, li) {
        if (li === 1 && z === Math.min(2, zc)) return;
        var size = 256 * Math.pow(2, 5 - z), set = TILESET[z] || {};
        var tx0 = Math.floor((vx0 + TL.x0) / size), tx1 = Math.floor((vx1 + TL.x0) / size);
        var ty0 = Math.floor((vy0 + TL.y0) / size), ty1 = Math.floor((vy1 + TL.y0) / size);
        if ((tx1 - tx0 + 1) * (ty1 - ty0 + 1) > 140) return;
        for (var ty = ty0; ty <= ty1; ty++) for (var tx = tx0; tx <= tx1; tx++) {
          if (!set[ty + "," + tx]) continue;
          var key = z + "/" + ty + "," + tx; want[key] = 1;
          if (!tileEls[key]) tileEls[key] = tileImg(key, "tiles/" + z + "/" + z + "," + ty + "," + tx + ".jpg", tx * size - TL.x0, ty * size - TL.y0, size * 1.003, size * 1.003);
          order.push(tileEls[key]);
        }
      });
      Object.keys(tileEls).forEach(function (k) { if (!want[k]) { var e = tileEls[k]; if (e.parentNode) e.parentNode.removeChild(e); delete tileEls[k]; } });
      order.forEach(function (e) { gTiles.appendChild(e); });
    }

    function build() {
      if (built) return; built = true;
      gMap = document.createElementNS(NS, "g");
      gOv = document.createElementNS(NS, "g");
      gTiles = document.createElementNS(NS, "g");
      svg.appendChild(gMap); svg.appendChild(gOv); gMap.appendChild(gTiles);
      if (!TL && window.VH_MAPIMG) { var M = window.VH_MAPIMG; gTiles.appendChild(tileImg("img", M.src, M.x, M.y, M.w, M.h)); }
      ready = true;
      bindInput();
      buildChips();
      buildDrawer();
      resize(true);
      loop();
    }

    function resize(reset) {
      if (!built) return;
      var r = wrap.getBoundingClientRect();
      if (!r.width) return;
      var first = !vw;
      vw = r.width; vh = r.height;
      var top = 120, bot = 110;
      fitK = Math.min(vw / W, (vh - top - bot) / H) * 1.02;
      if (reset || first) {
        st.k = fitK; st.tx = (vw - W * st.k) / 2; st.ty = top + (vh - top - bot - H * st.k) / 2;
      }
      need = true;
    }
    function clampView() {
      st.k = clamp(st.k, fitK * .8, Math.max(MAXK, fitK));
      var mw = W * st.k, mh = H * st.k, m = 80;
      st.tx = clamp(st.tx, Math.min(m - mw + 0, vw - mw - m) , Math.max(vw - m, m));
      st.ty = clamp(st.ty, Math.min(m - mh, vh - mh - m), Math.max(vh - m, m));
    }

    /* ---- filtro ---- */
    function visible(l) {
      if (favOnly && favs.indexOf(l.i) < 0) return false;
      if (!on[l.c]) return false;
      if (fRegion !== "all" && l.r !== fRegion) return false;
      if (fStatus !== "all" && l.s !== fStatus) return false;
      return true;
    }
    function countOn() { return cats.filter(function (c) { return on[c]; }).length; }

    /* ---- desenho por quadro ---- */
    var anim = null, vel = null;
    function loop() {
      requestAnimationFrame(loop);
      if (TABS[current].id !== "map") return;
      if (anim) {
        var t = clamp((performance.now() - anim.t0) / anim.dur, 0, 1), e = ease(t);
        st.k = lerp(anim.a.k, anim.b.k, e); st.tx = lerp(anim.a.tx, anim.b.tx, e); st.ty = lerp(anim.a.ty, anim.b.ty, e);
        if (t >= 1) anim = null;
        need = true;
      } else if (vel && !drag) {
        st.tx += vel.x; st.ty += vel.y; vel.x *= .92; vel.y *= .92;
        if (Math.abs(vel.x) + Math.abs(vel.y) < .3) vel = null;
        clampView(); need = true;
      }
      if (need) { need = false; draw(); }
    }
    function draw() {
      updateTiles();
      gMap.setAttribute("transform", "translate(" + st.tx.toFixed(2) + "," + st.ty.toFixed(2) + ") scale(" + st.k.toFixed(5) + ")");
      var z = st.k / fitK, out = "";
      // rótulos das regiões
      var ra = clamp(1.6 - (z - 1) * .45, 0, 1);
      if (ra > .02) D.regioes.forEach(function (r) {
        var sx = st.tx + r.x * st.k, sy = st.ty + r.y * st.k;
        out += '<text class="region-label" x="' + sx.toFixed(1) + '" y="' + (sy - 30).toFixed(1) + '" text-anchor="middle" font-size="' + (11 + z * 1.5).toFixed(1) + '" fill="' + r.cor + '" opacity="' + ra.toFixed(2) + '">' + esc(r.nome) + "</text>";
      });
      // agrupa pinos próximos
      var pts = [];
      D.locais.forEach(function (l) {
        if (!visible(l)) return;
        var sx = st.tx + l.x * st.k, sy = st.ty + l.y * st.k;
        if (sx < -40 || sy < -40 || sx > vw + 40 || sy > vh + 40) return;
        pts.push({ l: l, x: sx, y: sy });
      });
      var cell = 38, groups = [], grid = {};
      pts.forEach(function (p) {
        if (p.l.i === sel) { groups.push({ items: [p], x: p.x, y: p.y }); return; }
        var key = Math.floor(p.x / cell) + ":" + Math.floor(p.y / cell), G = grid[key];
        if (!G) { G = grid[key] = { items: [], x: p.x, y: p.y }; groups.push(G); }
        G.items.push(p);
      });
      var showLabels = st.k > .45;
      groups.forEach(function (G, gi) {
        if (G.items.length > 1) {
          var cx = 0, cy = 0; G.items.forEach(function (p) { cx += p.x; cy += p.y; }); cx /= G.items.length; cy /= G.items.length;
          var colors = G.items.slice(0, 3).map(function (p) { return D.categorias[p.l.c].cor; });
          out += '<g class="pin" data-cl="' + gi + '" transform="translate(' + cx.toFixed(1) + "," + cy.toFixed(1) + ')">' +
            '<circle r="20" fill="' + colors[0] + '" opacity=".18"/>' +
            '<circle r="14" fill="rgba(24,12,44,.85)" stroke="' + colors[0] + '" stroke-width="2"/>' +
            (colors[1] ? '<circle r="17" fill="none" stroke="' + colors[1] + '" stroke-width="1.5" stroke-dasharray="4 5" opacity=".9"/>' : "") +
            '<text y="4.5" text-anchor="middle" font-family="Manrope,system-ui,sans-serif" font-weight="800" font-size="12.5" fill="#fbefff">' + G.items.length + "</text></g>";
          G.cx = cx; G.cy = cy;
        } else {
          var p = G.items[0], cat = D.categorias[p.l.c], isSel = p.l.i === sel;
          out += '<g class="pin' + (isSel ? " sel" : "") + '" data-i="' + p.l.i + '" transform="translate(' + p.x.toFixed(1) + "," + p.y.toFixed(1) + ")" + (isSel ? " scale(1.25)" : "") + '">' +
            (isSel ? '<circle class="ring" r="14" fill="none" stroke="' + cat.cor + '" stroke-width="2"/>' : "") +
            '<circle r="17" fill="' + cat.cor + '" opacity=".22"/>' +
            '<circle r="12" fill="' + cat.cor + '" stroke="rgba(255,255,255,.9)" stroke-width="1.6"/>' +
            '<g transform="translate(-7.2,-7.2) scale(.6)" fill="none" stroke="#160a2a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">' + IC[cat.icone] + "</g>" +
            (favs.indexOf(p.l.i) >= 0 ? '<circle cx="9" cy="-9" r="4" fill="#ff3d8b" stroke="#fff" stroke-width="1.2"/>' : "") +
            "</g>";
          if ((showLabels && p.l.nomeado !== false) || isSel) out += '<text class="pin-label" x="' + p.x.toFixed(1) + '" y="' + (p.y + 27).toFixed(1) + '" text-anchor="middle">' + esc(p.l.n) + "</text>";
        }
      });
      lastGroups = groups;
      gOv.innerHTML = out;
      // HUD
      var cx2 = (vw / 2 - st.tx) / st.k, cy2 = (vh / 2 - st.ty) / st.k;
      var total = D.locais.filter(visible).length;
      $("#hud").innerHTML = "<b>" + quad(cx2, cy2) + "</b> · zoom " + z.toFixed(1) + "×<br><b>" + total + "</b> locais no filtro";
    }
    var lastGroups = [];

    /* ---- entrada: arrastar, pinça, roda, toque ---- */
    var ptrs = {}, drag = null, pinch = null, lastTap = 0;
    function bindInput() {
      svg.addEventListener("pointerdown", function (e) {
        svg.setPointerCapture && svg.setPointerCapture(e.pointerId);
        ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        anim = null; vel = null;
        var ids = Object.keys(ptrs);
        if (ids.length === 1) drag = { x: e.clientX, y: e.clientY, sx: e.clientX, sy: e.clientY, t: performance.now(), moved: 0, lt: performance.now() };
        if (ids.length === 2) {
          var a = ptrs[ids[0]], b = ptrs[ids[1]];
          pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: st.k, cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, tx: st.tx, ty: st.ty };
          if (drag) drag.moved = 99;
        }
      });
      svg.addEventListener("pointermove", function (e) {
        if (!ptrs[e.pointerId]) return;
        ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
        var ids = Object.keys(ptrs), r = wrap.getBoundingClientRect();
        if (ids.length >= 2 && pinch) {
          var a = ptrs[ids[0]], b = ptrs[ids[1]];
          var d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
          var nk = clamp(pinch.k * d / pinch.d, fitK * .8, MAXK);
          var mx = (pinch.cx - r.left - pinch.tx) / pinch.k, my = (pinch.cy - r.top - pinch.ty) / pinch.k;
          st.k = nk; st.tx = cx - r.left - mx * nk; st.ty = cy - r.top - my * nk;
          clampView(); need = true;
        } else if (drag) {
          var dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now();
          drag.moved += Math.abs(dx) + Math.abs(dy);
          st.tx += dx; st.ty += dy; drag.x = e.clientX; drag.y = e.clientY;
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
          var tap = drag.moved < 10 && performance.now() - drag.t < 450;
          if (tap) onTap(e);
          else if (drag.vx && performance.now() - drag.lt < 80) vel = { x: drag.vx, y: drag.vy };
          drag = null;
        } else if (left === 1) {
          var id = Object.keys(ptrs)[0]; drag = { x: ptrs[id].x, y: ptrs[id].y, t: 0, moved: 99, lt: performance.now() };
        }
      };
      svg.addEventListener("pointerup", up);
      svg.addEventListener("pointercancel", up);
      svg.addEventListener("wheel", function (e) {
        e.preventDefault();
        var r = wrap.getBoundingClientRect();
        zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * .0018));
      }, { passive: false });

      $("#zoomIn").addEventListener("click", function () { zoomAt(vw / 2, vh / 2, 1.8, true); });
      $("#zoomOut").addEventListener("click", function () { zoomAt(vw / 2, vh / 2, 1 / 1.8, true); });
      $("#recenter").addEventListener("click", function () { home(); });
      $("#editFab").addEventListener("click", function () { setEdit(!editMode); });
      $("#tilt3d").addEventListener("click", function () {
        var t = stageEl.classList.toggle("tilted");
        this.classList.toggle("on", t);
        toast(t ? "Mapa 3D ligado" : "Mapa 3D desligado");
      });
      $("#openFilters").addEventListener("click", openDrawer);

      var input = $("#mapSearch"), res = $("#results");
      input.addEventListener("input", function () { query = input.value.trim().toLowerCase(); renderResults(); });
      input.addEventListener("focus", function () { if (query) renderResults(); });
      res.addEventListener("click", function (e) {
        var b = e.target.closest("[data-i]"); if (!b) return;
        var l = D.locais[+b.getAttribute("data-i")];
        res.hidden = true; input.blur();
        if (!visible(l)) { allOn(); fRegion = "all"; fStatus = "all"; favOnly = false; syncFilters(); }
        select(l.i, true);
      });
    }
    function norm(s) { return s.toLowerCase().normalize ? s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") : s.toLowerCase(); }
    function renderResults() {
      var res = $("#results");
      if (!query) { res.hidden = true; return; }
      var q = norm(query);
      var list = D.locais.filter(function (l) { return l.nomeado !== false && norm(l.n + " " + (l.area || "") + " " + (l.real || "") + " " + D.categorias[l.c].nome + " " + REG[l.r].nome).indexOf(q) >= 0; }).slice(0, 20);
      res.hidden = false;
      res.innerHTML = list.length ? list.map(function (l) {
        var c = D.categorias[l.c];
        return '<button class="result" data-i="' + l.i + '"><span class="dotc" style="background:' + c.cor + ";box-shadow:0 0 8px " + c.cor + '"></span><span><b>' + esc(l.n) + "</b><small>" + esc(c.nome) + " · " + esc(l.area || REG[l.r].nome) + "</small></span></button>";
      }).join("") : '<div class="empty" style="padding:16px">Nada encontrado para "' + esc(query) + '".</div>';
    }

    function zoomAt(sx, sy, f, animate) {
      var nk = clamp(st.k * f, fitK * .8, MAXK);
      var mx = (sx - st.tx) / st.k, my = (sy - st.ty) / st.k;
      var b = { k: nk, tx: sx - mx * nk, ty: sy - my * nk };
      if (animate) { anim = { a: { k: st.k, tx: st.tx, ty: st.ty }, b: b, t0: performance.now(), dur: 380 }; }
      else { st.k = b.k; st.tx = b.tx; st.ty = b.ty; clampView(); need = true; }
    }
    function flyTo(x, y, z, dur) {
      var k = z ? fitK * z : Math.max(st.k, fitK * 5);
      var b = { k: k, tx: vw / 2 - x * k, ty: vh * .4 - y * k };
      anim = { a: { k: st.k, tx: st.tx, ty: st.ty }, b: b, t0: performance.now(), dur: dur || 700 };
    }
    function home() {
      var top = 120, bot = 110, k = fitK;
      anim = { a: { k: st.k, tx: st.tx, ty: st.ty }, b: { k: k, tx: (vw - W * k) / 2, ty: top + (vh - top - bot - H * k) / 2 }, t0: performance.now(), dur: 650 };
    }
    function onTap(e) {
      var el = document.elementFromPoint(e.clientX, e.clientY);
      var pin = el && el.closest ? el.closest("[data-i],[data-cl]") : null;
      var now = performance.now();
      if (pin && pin.hasAttribute("data-i")) { select(+pin.getAttribute("data-i"), false); return; }
      if (pin && pin.hasAttribute("data-cl")) {
        var G = lastGroups[+pin.getAttribute("data-cl")];
        if (G) {
          var r = wrap.getBoundingClientRect();
          var mx = (G.cx - st.tx) / st.k, my = (G.cy - st.ty) / st.k;
          var minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
          G.items.forEach(function (p) { minX = Math.min(minX, p.l.x); maxX = Math.max(maxX, p.l.x); minY = Math.min(minY, p.l.y); maxY = Math.max(maxY, p.l.y); });
          var span = Math.max(maxX - minX, maxY - minY, 6);
          var k = clamp(Math.min(vw, vh) * .45 / span, st.k * 1.6, MAXK);
          anim = { a: { k: st.k, tx: st.tx, ty: st.ty }, b: { k: k, tx: vw / 2 - mx * k, ty: vh * .45 - my * k }, t0: now, dur: 600 };
        }
        return;
      }
      $("#results").hidden = true;
      if (editMode) {
        var rr = wrap.getBoundingClientRect();
        var px = Math.round(clamp((e.clientX - rr.left - st.tx) / st.k, 0, W)), py = Math.round(clamp((e.clientY - rr.top - st.ty) / st.k, 0, H));
        if (moveIdx >= 0) {
          var ml = D.locais[moveIdx]; ml.x = px; ml.y = py;
          if (!ml.mine) EDIT.moves[ml.id] = [px, py];
          saveEdits(); moveIdx = -1; toast("Pin movido para " + quad(px, py)); select(ml.i, false); return;
        }
        openAddForm(px, py); return;
      }
      if (sel >= 0) { closeSheet(); return; }
      if (now - lastTap < 320) { var r2 = wrap.getBoundingClientRect(); zoomAt(e.clientX - r2.left, e.clientY - r2.top, 2, true); }
      lastTap = now;
    }

    /* ---- seleção e ficha ---- */
    function select(i, fly) {
      sel = i; need = true;
      var l = D.locais[i];
      if (fly) flyTo(l.x, l.y, Math.max(st.k, .9) / fitK);
      else flyTo(l.x, l.y, Math.max(st.k / fitK, 1), 500);
      openSheet(l);
    }
    function openSheet(l) {
      var c = D.categorias[l.c], r = REG[l.r], fav = favs.indexOf(l.i) >= 0;
      var sh = $("#sheet");
      sh.innerHTML = '<div class="grab"></div>' +
        (l.foto && !window.VH_NOPHOTOS ? '<div class="sh-photo"><img src="' + esc(l.foto) + '" alt="' + esc(l.n) + '" loading="lazy"></div>' : "") +
        '<div style="display:flex;gap:12px;align-items:flex-start">' +
        '<span class="icon-btn" style="width:46px;height:46px;border-radius:15px;background:' + c.cor + '26;color:' + c.cor + '">' + svgIcon(c.icone) + "</span>" +
        '<div style="flex:1;min-width:0"><h3>' + esc(l.n) + '</h3><div class="meta" style="margin-bottom:0">' +
        '<span class="tagc" style="color:' + c.cor + '">' + esc(c.nome) + '</span><span class="tagc" style="color:' + r.cor + '">' + esc(r.nome) + "</span>" +
        '<span class="tagc ' + (l.s === "oficial" ? "ok" : "comm") + '">' + (l.s === "oficial" ? "Confirmado" : l.mine ? "Seu local" : "A confirmar") + "</span></div></div>" +
        '<button class="icon-btn glass" id="shClose" aria-label="Fechar">' + svgIcon("close") + "</button></div>" +
        '<p style="margin-top:12px">' + esc(l.d) + "</p>" +
        (l.real ? '<p class="sh-real">' + svgIcon("pin", ' width="14" height="14"') + "<span><b>Na vida real:</b> " + esc(l.real) + "</span></p>" : "") +
        '<div class="row"><button class="btn primary" id="shSolo">' + svgIcon("layers") + "Só " + esc(c.nome.toLowerCase()) + '</button><button class="btn ghost" id="shFav">' + svgIcon("heart", fav ? ' fill="currentColor"' : "") + (fav ? "Salvo" : "Salvar") + "</button></div>" +
        (editMode ? '<div class="row" style="margin-top:8px"><button class="btn ghost" id="shMove">' + svgIcon("target") + "Mover pin</button>" +
          (l.mine ? '<button class="btn ghost" id="shDel">' + svgIcon("close") + "Apagar</button>" : "") + "</div>" : "") +
        '<div class="coord">QUADRANTE ' + quad(l.x, l.y) + (l.id ? " · " + l.id + " · dados GTADB (CC BY 4.0)" : " · seu local") + "</div>";
      sh.classList.add("open");
      if (editMode) {
        $("#shMove").onclick = function () { moveIdx = l.i; $("#sheet").classList.remove("open"); toast("Toque no mapa onde o pin deve ficar"); };
        var del = $("#shDel"), armed = false;
        if (del) del.onclick = function () {
          if (!armed) { armed = true; del.lastChild.textContent = "Toque de novo"; return; }
          l.deleted = true; D.locais.splice(D.locais.indexOf(l), 1); D.locais.forEach(function (x, k) { x.i = k; });
          favs = []; store.set("favs", favs); saveEdits(); closeSheet(); toast("Local apagado");
        };
      }
      $("#shClose").onclick = closeSheet;
      $("#shSolo").onclick = function () { solo(l.c); toast("Mostrando só " + c.nome.toLowerCase()); };
      $("#shFav").onclick = function () {
        var k = favs.indexOf(l.i);
        if (k >= 0) favs.splice(k, 1); else favs.push(l.i);
        store.set("favs", favs); openSheet(l); need = true; syncFilters();
        toast(k >= 0 ? "Removido dos salvos" : "Salvo nos seus locais");
      };
    }
    function closeSheet() { $("#sheet").classList.remove("open"); if (sel >= 0) { sel = -1; need = true; } }

    /* ---- modo editor: novo local ---- */
    function nearestRegion(x, y) {
      var best = D.regioes[0], bd = 1e12;
      D.regioes.forEach(function (r) { var d = (r.x - x) * (r.x - x) + (r.y - y) * (r.y - y); if (d < bd) { bd = d; best = r; } });
      return best.id;
    }
    function openAddForm(x, y) {
      var reg = nearestRegion(x, y), cat = "marco";
      var sh = $("#sheet");
      sh.innerHTML = '<div class="grab"></div><div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><h3>Novo local</h3><button class="icon-btn glass" id="adClose" aria-label="Fechar">' + svgIcon("close") + "</button></div>" +
        '<div class="coord" style="margin:4px 0 12px">QUADRANTE ' + quad(x, y) + " · X " + x + " · Y " + y + "</div>" +
        '<div class="searchbar glass" style="height:44px;margin-bottom:8px"><input id="adName" type="text" placeholder="Nome do local" autocomplete="off"></div>' +
        '<div class="searchbar glass" style="height:44px;margin-bottom:10px"><input id="adDesc" type="text" placeholder="Descrição curta (opcional)" autocomplete="off"></div>' +
        '<div class="chips" id="adCats" style="margin-bottom:8px">' + cats.map(function (c) { var C = D.categorias[c]; return '<button class="chip' + (c === cat ? " on" : "") + '" data-c="' + c + '" style="--c:' + C.cor + '"><i></i>' + esc(C.nome) + "</button>"; }).join("") + "</div>" +
        '<div class="chips" id="adRegs" style="margin-bottom:12px">' + D.regioes.map(function (r) { return '<button class="chip' + (r.id === reg ? " on" : "") + '" data-r="' + r.id + '" style="--c:' + r.cor + '"><i></i>' + esc(r.nome) + "</button>"; }).join("") + "</div>" +
        '<div class="row"><button class="btn primary" id="adSave">' + svgIcon("pin") + "Adicionar ao mapa</button></div>";
      sh.classList.add("open");
      $("#adClose").onclick = closeSheet;
      $("#adCats").onclick = function (e) { var b = e.target.closest("[data-c]"); if (!b) return; cat = b.getAttribute("data-c"); $$("#adCats .chip").forEach(function (x) { x.classList.toggle("on", x === b); }); };
      $("#adRegs").onclick = function (e) { var b = e.target.closest("[data-r]"); if (!b) return; reg = b.getAttribute("data-r"); $$("#adRegs .chip").forEach(function (x) { x.classList.toggle("on", x === b); }); };
      $("#adSave").onclick = function () {
        var n = $("#adName").value.trim();
        if (!n) { toast("Escreva o nome do local"); $("#adName").focus(); return; }
        var l = { n: n, c: cat, r: reg, x: x, y: y, d: $("#adDesc").value.trim() || "Adicionado por você.", s: "meu", mine: true, i: D.locais.length };
        D.locais.push(l); saveEdits(); on[cat] = true; syncFilters(); select(l.i, false); toast("Local adicionado");
      };
      setTimeout(function () { var i = $("#adName"); if (i) i.focus(); }, 300);
    }
    function exportJSON() {
      var mine = D.locais.filter(function (l) { return l.mine; }).map(function (l) { return { n: l.n, c: l.c, r: l.r, x: l.x, y: l.y, s: "comunidade", d: l.d }; });
      return JSON.stringify({ novos: mine, movidos: EDIT.moves }, null, 1);
    }

    /* ---- chips e gaveta ---- */
    function buildChips() {
      var h = '<button class="chip" data-k="all" style="--c:#fbefff"><i></i>Todos</button><button class="chip" data-k="fav" style="--c:#ff3d8b">' + svgIcon("heart", ' width="13" height="13"') + "Salvos</button>";
      cats.forEach(function (c) { var C = D.categorias[c]; h += '<button class="chip" data-k="' + c + '" style="--c:' + C.cor + '"><i></i>' + esc(C.nome) + "</button>"; });
      var box = $("#mapChips"); box.innerHTML = h;
      box.addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        var k = b.getAttribute("data-k");
        if (k === "all") { allOn(); favOnly = false; fRegion = "all"; fStatus = "all"; }
        else if (k === "fav") { favOnly = !favOnly; if (favOnly && !favs.length) { favOnly = false; toast("Toque em Salvar num local para ele aparecer aqui"); } }
        else if (isAll()) { solo(k); return; }
        else { on[k] = !on[k]; if (!countOn()) allOn(); }
        syncFilters();
      });
      syncFilters();
    }
    function buildDrawer() {
      var dr = $("#drawer");
      dr.addEventListener("click", function (e) {
        var b = e.target.closest("[data-f]"); if (!b) return;
        var f = b.getAttribute("data-f"), v = b.getAttribute("data-v");
        if (f === "cat") { on[v] = !on[v]; if (!countOn()) on[v] = true; }
        if (f === "reg") fRegion = v;
        if (f === "st") fStatus = v;
        if (f === "allon") { allOn(); fRegion = "all"; fStatus = "all"; favOnly = false; }
        if (f === "alloff") { cats.forEach(function (c) { on[c] = false; }); on.garagem = true; }
        if (f === "done") { closeDrawer(); return; }
        if (f === "edit") { setEdit(!editMode); }
        if (f === "export") { showExport = !showExport; }
        if (f === "copy") {
          var txt = exportJSON(), ta = $("#exportBox");
          try { navigator.clipboard.writeText(txt).then(function () { toast("Copiado"); }, function () { ta.select(); toast("Selecionado: copie com o menu do teclado"); }); }
          catch (err) { ta.select(); toast("Selecionado: copie com o menu do teclado"); }
          return;
        }
        syncFilters();
      });
      $("#scrim").addEventListener("click", function () { closeDrawer(); Veh.close(); });
    }
    function renderDrawer() {
      var h = '<div class="grab" style="width:40px;height:4px;border-radius:4px;background:var(--glass-brd);margin:-4px auto 14px"></div>' +
        '<div class="dh"><h3>Filtros do mapa</h3><button class="link-btn" data-f="done">Pronto</button></div>' +
        '<div class="sub-h">Categorias</div><div class="filter-list">';
      cats.forEach(function (c) {
        var C = D.categorias[c], n = D.locais.filter(function (l) { return l.c === c; }).length;
        h += '<button class="fitem ' + (on[c] ? "on" : "off") + '" data-f="cat" data-v="' + c + '" style="--c:' + C.cor + '"><span class="ic" style="background:' + C.cor + '26;color:' + C.cor + '">' + svgIcon(C.icone) + "</span><span><b>" + esc(C.nome) + "</b><small>" + n + " locais</small></span></button>";
      });
      h += '</div><div class="row" style="display:flex;gap:8px;margin-top:10px"><button class="btn ghost" data-f="allon">Mostrar tudo</button><button class="btn ghost" data-f="alloff">Só garagens</button></div>';
      h += '<div class="sub-h">Região</div><div class="chips" style="flex-wrap:wrap">';
      h += '<button class="chip ' + (fRegion === "all" ? "on" : "") + '" data-f="reg" data-v="all" style="--c:#fbefff"><i></i>Leonida inteira</button>';
      D.regioes.forEach(function (r) { h += '<button class="chip ' + (fRegion === r.id ? "on" : "") + '" data-f="reg" data-v="' + r.id + '" style="--c:' + r.cor + '"><i></i>' + esc(r.nome) + "</button>"; });
      h += '</div><div class="sub-h">Confirmação</div><div class="seg">' +
        [["all", "Todos"], ["oficial", "Confirmados"], ["comunidade", "A confirmar"], ["meu", "Meus"]].map(function (s) { return '<button class="' + (fStatus === s[0] ? "on" : "") + '" data-f="st" data-v="' + s[0] + '">' + s[1] + "</button>"; }).join("") + "</div>";
      var nMine = D.locais.filter(function (l) { return l.mine; }).length, nMov = Object.keys(EDIT.moves).length;
      h += '<div class="sub-h">Editor do mapa</div><div class="info-card glass" style="padding:14px"><p class="muted" style="margin:0 0 12px;font-size:13px">Com o editor ligado, toque no mapa para criar um local ou use "Mover pin" na ficha. Você tem ' + nMine + " locais novos e " + nMov + " pins movidos.</p>" +
        '<div class="row" style="display:flex;gap:8px"><button class="btn ' + (editMode ? "primary" : "ghost") + '" data-f="edit">' + (editMode ? "Editor ligado" : "Ligar editor") + '</button><button class="btn ghost" data-f="export">Exportar</button></div>' +
        (showExport ? '<textarea id="exportBox" readonly style="width:100%;height:140px;margin-top:10px;border-radius:14px;background:rgba(0,0,0,.3);border:1px solid var(--glass-brd);color:var(--text);font:12px var(--mono);padding:10px;user-select:text;-webkit-user-select:text">' + esc(exportJSON()) + '</textarea><button class="btn primary" data-f="copy" style="width:100%;margin-top:8px">Copiar</button>' : "") + "</div>";
      $("#drawer").innerHTML = h;
    }
    function syncFilters() {
      var all = isAll();
      $$("#mapChips .chip").forEach(function (b) {
        var k = b.getAttribute("data-k");
        b.classList.toggle("on", k === "all" ? (all && !favOnly && fRegion === "all" && fStatus === "all") : k === "fav" ? favOnly : (!all && on[k]));
      });
      var badge = (all ? 0 : countOn()) + (fRegion !== "all" ? 1 : 0) + (fStatus !== "all" ? 1 : 0) + (favOnly ? 1 : 0);
      var bd = $("#filterBadge"); bd.textContent = badge; bd.hidden = !badge;
      if ($("#drawer").classList.contains("open")) renderDrawer();
      if (sel >= 0 && !visible(D.locais[sel])) closeSheet();
      need = true;
    }
    function openDrawer() { renderDrawer(); $("#drawer").classList.add("open"); $("#scrim").classList.add("open"); }
    function solo(c) {
      cats.forEach(function (k) { on[k] = k === c; }); favOnly = false; fRegion = "all";
      if (built) syncFilters();
    }

    return {
      show: function () {
        build();
        setTimeout(function () { resize(false); }, 30);
        need = true;
      },
      resize: function () { resize(false); },
      solo: function (c) { solo(c); pendingHome = true; },
      focusRegion: function (r) {
        allOn(); fRegion = r.id; favOnly = false;
        setTimeout(function () { syncFilters(); flyTo(r.x, r.y + (r.id === "vice" ? 80 : 0), r.id === "vice" ? 4.2 : r.id === "keys" ? 2.6 : 2.4, 900); }, 120);
      },
      showCats: function (list) {
        cats.forEach(function (k) { on[k] = list.indexOf(k) >= 0; }); favOnly = false; fRegion = "all"; fStatus = "all";
        setTimeout(function () { syncFilters(); home(); }, 120);
      },
      select: function (i) { setTimeout(function () { select(i, true); }, 160); },
      closeSheet: closeSheet,
      sheetOpen: function () { return $("#sheet").classList.contains("open"); }
    };
  })();
  var pendingHome = false;
  function closeSheet() { Map.closeSheet(); }
  function closeDrawer() { $("#drawer").classList.remove("open"); if (!$("#vModal").classList.contains("open")) $("#scrim").classList.remove("open"); }

  /* =========================================================
     VEÍCULOS
     ========================================================= */
  function vArt(v) {
    var c = v.cor, dark = "#140a26", glass = "rgba(120,220,255,.55)";
    if (v.t === "carro") {
      var low = /Super|Esportivo/.test(v.cl);
      var donk = /donk/i.test(v.cl);
      var body = low ? "M12 54 C14 46 26 43 44 41 L74 29 C88 23 118 23 134 29 L160 40 C178 42 190 46 190 55 L190 60 L12 60 Z"
        : "M10 52 C10 44 22 42 38 41 L60 24 C72 20 118 20 130 24 L150 40 C172 41 190 44 190 52 L190 60 L10 60 Z";
      var win = low ? '<path d="M80 31 L100 31 L100 40 L60 41 Z M106 31 L128 31 L150 40 L106 40 Z" fill="' + glass + '"/>'
        : '<path d="M66 27 L94 26 L94 40 L50 41 Z M100 26 L126 27 L144 40 L100 40 Z" fill="' + glass + '"/>';
      var wr = donk ? 16 : 13, wy = donk ? 58 : 60;
      return '<svg viewBox="0 0 200 80"><g transform="translate(0,' + (donk ? -6 : 0) + ')"><path d="' + body + '" fill="' + c + '"/>' + win + '<rect x="182" y="47" width="8" height="4" rx="2" fill="#fff8c9"/><rect x="11" y="47" width="7" height="4" rx="2" fill="#ff3355"/></g>' +
        '<circle cx="52" cy="' + wy + '" r="' + wr + '" fill="' + dark + '"/><circle cx="52" cy="' + wy + '" r="' + (wr * .5) + '" fill="#cfd3e6"/><circle cx="150" cy="' + wy + '" r="' + wr + '" fill="' + dark + '"/><circle cx="150" cy="' + wy + '" r="' + (wr * .5) + '" fill="#cfd3e6"/></svg>';
    }
    if (v.t === "moto") {
      return '<svg viewBox="0 0 200 80"><circle cx="48" cy="56" r="18" fill="none" stroke="' + dark + '" stroke-width="7"/><circle cx="152" cy="56" r="18" fill="none" stroke="' + dark + '" stroke-width="7"/>' +
        '<path d="M48 56 L84 36 L124 34 L152 56" fill="none" stroke="#cfd3e6" stroke-width="4" stroke-linejoin="round"/><path d="M142 20 L152 56" stroke="#cfd3e6" stroke-width="4"/>' +
        '<path d="M96 24 C108 18 128 20 134 28 L126 36 L96 36 Z" fill="' + c + '"/><path d="M62 30 L96 28 L96 34 L58 36 Z" fill="' + dark + '"/><rect x="88" y="40" width="26" height="16" rx="4" fill="#3a3550"/><path d="M136 18 L150 16" stroke="' + dark + '" stroke-width="4" stroke-linecap="round"/><circle cx="148" cy="28" r="4" fill="#fff8c9"/></svg>';
    }
    if (v.t === "barco") {
      return '<svg viewBox="0 0 200 80"><path d="M8 42 L188 38 L168 62 L32 62 Z" fill="' + c + '"/><path d="M8 42 L188 38 L184 44 L14 48 Z" fill="rgba(255,255,255,.35)"/>' +
        '<path d="M66 40 L82 22 L128 22 L140 39 Z" fill="' + glass + '"/><path d="M78 22 L128 22" stroke="#fff" stroke-width="2"/>' +
        '<path d="M0 68 Q 12 63 24 68 T 48 68 T 72 68 T 96 68 T 120 68 T 144 68 T 168 68 T 192 68" stroke="#2de2e6" stroke-width="2.5" fill="none" opacity=".7"/></svg>';
    }
    if (/Helicóptero/.test(v.cl)) {
      return '<svg viewBox="0 0 200 80"><path d="M24 12 L176 12" stroke="' + dark + '" stroke-width="4" stroke-linecap="round"/><path d="M96 12 V22" stroke="' + dark + '" stroke-width="4"/>' +
        '<ellipse cx="90" cy="42" rx="42" ry="19" fill="' + c + '"/><path d="M60 34 C64 26 80 24 92 26 L92 42 L56 42 Z" fill="' + glass + '"/><path d="M128 38 L188 32 L188 40 L130 50 Z" fill="' + c + '"/><path d="M182 22 L190 22 L190 42 L184 42 Z" fill="' + dark + '"/>' +
        '<path d="M58 70 H126 M70 60 V70 M112 60 V70" stroke="' + dark + '" stroke-width="4" stroke-linecap="round"/></svg>';
    }
    return '<svg viewBox="0 0 200 80"><path d="M8 44 C8 36 28 34 48 34 L168 36 C184 36 194 40 194 44 C194 48 184 50 168 50 L48 52 C28 52 8 50 8 44Z" fill="' + c + '"/>' +
      '<path d="M84 44 L118 44 L100 74 L88 74 Z" fill="' + c + '" opacity=".85"/><path d="M90 42 L114 42 L104 16 L94 16 Z" fill="' + c + '" opacity=".6"/>' +
      '<path d="M160 36 L178 12 L190 12 L184 40" fill="' + c + '"/><path d="M14 40 C18 36 28 36 34 38 L30 44 L14 44 Z" fill="' + glass + '"/>' +
      '<g fill="' + glass + '"><circle cx="54" cy="41" r="2.5"/><circle cx="66" cy="41" r="2.5"/><circle cx="78" cy="41" r="2.5"/><circle cx="126" cy="41" r="2.5"/><circle cx="138" cy="41" r="2.5"/><circle cx="150" cy="41" r="2.5"/></g></svg>';
  }
  function vCardHTML(v, i) {
    var idx = D.veiculos.indexOf(v);
    return '<button class="vcard glass" data-v="' + idx + '" style="--vc:' + v.cor + ";animation-delay:" + Math.min(i, 14) * 40 + 'ms">' +
      '<span class="flag" style="background:' + (v.s === "oficial" ? "#5dff9b" : "#ffd23f") + ";box-shadow:0 0 8px " + (v.s === "oficial" ? "#5dff9b" : "#ffd23f") + '"></span>' +
      '<div class="art">' + photoHTML(v, false) + "</div>" +
      '<span class="mk">' + esc(v.m === "—" ? TYPE[v.t].um : v.m) + "</span><h3>" + esc(v.n) + '</h3><span class="cl">' + esc(v.cl) + "</span>" +
      (v.spd ? '<div class="bar" title="Velocidade"><i style="width:' + v.spd * 10 + '%"></i></div>' : "") + "</button>";
  }
  /* fotos: coloque img/veiculos/<slug>.jpg (veja o README); sem foto, mostra a silhueta */
  function slug(v) {
    var t = ((v.m && v.m !== "—" ? v.m + " " : "") + v.n).toLowerCase();
    if (t.normalize) t = t.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return t.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  }
  function photoHTML(v, big) {
    var src = v.foto || ("img/veiculos/" + slug(v) + ".jpg");
    if (window.VH_PHOTOS) { if (!window.VH_PHOTOS[src]) return '<div class="ph-fallback">' + vArt(v) + '<span class="ph-soon">' + (big ? "Foto em breve" : "sem foto") + "</span></div>"; src = window.VH_PHOTOS[src]; }
    return '<div class="ph-fallback">' + vArt(v) + '<span class="ph-soon">' + (big ? "Foto em breve" : "sem foto") + '</span></div><img class="ph" alt="' + esc(v.m + " " + v.n) + '" src="' + esc(src) + '" loading="lazy">';
  }
  function bindPhotos(root) {
    Array.prototype.forEach.call(root.querySelectorAll("img.ph"), function (im) {
      var ok = function () { im.classList.add("ok"); if (im.parentNode) im.parentNode.classList.add("has-photo"); };
      if (im.complete && im.naturalWidth) ok();
      im.addEventListener("load", ok);
      im.addEventListener("error", function () { if (im.parentNode) im.parentNode.removeChild(im); });
    });
  }
  window.VH_SLUG = slug;
  function bindVCards(root) {
    bindPhotos(root);
    $$(".vcard", root).forEach(function (b) {
      attachTilt(b, 12);
      b.addEventListener("click", function () { Veh.open(+b.getAttribute("data-v")); });
    });
  }

  var Veh = (function () {
    var type = "all", cls = "all", q = "";
    function build() {
      var seg = [["all", "Todos"], ["carro", "Carros"], ["moto", "Motos"], ["barco", "Barcos"], ["aereo", "Aéreos"]];
      $("#vSeg").innerHTML = seg.map(function (s) { return '<button data-t="' + s[0] + '" class="' + (s[0] === type ? "on" : "") + '">' + s[1] + "</button>"; }).join("");
      $("#vSeg").addEventListener("click", function (e) {
        var b = e.target.closest("[data-t]"); if (!b) return;
        type = b.getAttribute("data-t"); cls = "all";
        $$("#vSeg button").forEach(function (x) { x.classList.toggle("on", x === b); });
        render();
      });
      $("#vSearch").addEventListener("input", function () { q = this.value.trim().toLowerCase(); render(); });
      $("#vClass").addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        cls = b.getAttribute("data-c"); render();
      });
      render();
    }
    function render() {
      var base = D.veiculos.filter(function (v) { return type === "all" || v.t === type; });
      var classes = [];
      base.forEach(function (v) { if (classes.indexOf(v.cl) < 0) classes.push(v.cl); });
      $("#vClass").innerHTML = '<button class="chip ' + (cls === "all" ? "on" : "") + '" data-c="all" style="--c:#fbefff"><i></i>Todas (' + base.length + ")</button>" +
        classes.map(function (c) { var n = base.filter(function (v) { return v.cl === c; }).length; return '<button class="chip ' + (cls === c ? "on" : "") + '" data-c="' + esc(c) + '"><i></i>' + esc(c) + " (" + n + ")</button>"; }).join("");
      var list = base.filter(function (v) {
        if (cls !== "all" && v.cl !== cls) return false;
        if (q && (v.n + " " + v.m + " " + v.cl + " " + (v.real || "")).toLowerCase().indexOf(q) < 0) return false;
        return true;
      });
      $("#vGrid").innerHTML = list.length ? list.map(vCardHTML).join("") : '<div class="empty" style="grid-column:1/-1">Nenhum veículo com esse nome.</div>';
      bindVCards($("#vGrid"));
    }
    var openIdx = -1;
    function open(i) {
      var v = D.veiculos[i]; openIdx = i;
      var where = v.t === "barco" ? ["marina"] : v.t === "aereo" ? ["aereo"] : ["garagem", "oficina"];
      var whereTxt = v.t === "barco" ? "Ver marinas no mapa" : v.t === "aereo" ? "Ver aeroportos no mapa" : "Ver garagens e oficinas";
      $("#vPanel").innerHTML =
        '<div class="vphoto" style="--vc:' + v.cor + '">' + photoHTML(v, true) + '<button class="icon-btn glass close" id="vClose" aria-label="Fechar">' + svgIcon("close") + "</button></div>" +
        '<div class="vbody"><span class="eyebrow">' + esc(v.m === "—" ? TYPE[v.t].um : v.m) + "</span><h2>" + esc(v.n) + "</h2>" +
        '<div class="meta" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"><span class="tagc">' + esc(TYPE[v.t].um) + '</span><span class="tagc">' + esc(v.cl) + '</span><span class="tagc ' + (v.s === "oficial" ? "ok" : "comm") + '">' + (v.s === "oficial" ? "Mostrado pela Rockstar" : "Lista da comunidade") + "</span></div>" +
        '<div class="spec"><div><small>Inspirado em</small><b>' + esc(v.real || "Não identificado") + "</b></div>" +
        "<div><small>Velocidade</small><b>" + (v.spd ? v.spd.toFixed(1) + " / 10" : "Não publicada") + "</b>" + (v.spd ? '<div class="bar" style="margin-top:8px"><i style="width:' + v.spd * 10 + '%"></i></div>' : "") + "</div></div>" +
        (v.nota ? '<p class="muted" style="font-size:13.5px;margin:0 0 16px">' + esc(v.nota) + "</p>" : "") +
        '<button class="btn primary" id="vWhere" style="width:100%">' + svgIcon("pin") + whereTxt + "</button></div>";
      $("#vModal").classList.add("open"); $("#scrim").classList.add("open");
      bindPhotos($("#vPanel"));
      attachTilt($("#vPanel .vphoto"), 10);
      $("#vClose").onclick = close;
      $("#vWhere").onclick = function () { close(); go("map"); Map.showCats(where); };
    }
    function close() {
      openIdx = -1;
      $("#vModal").classList.remove("open");
      if (!$("#drawer").classList.contains("open")) $("#scrim").classList.remove("open");
    }
    return { build: build, open: open, close: close, isOpen: function () { return openIdx >= 0; } };
  })();

  /* =========================================================
     GARAGENS & LEONIDA
     ========================================================= */
  function rowHTML(l) {
    var c = D.categorias[l.c], r = REG[l.r];
    return '<button class="lrow glass" data-i="' + l.i + '"><span class="ic" style="background:' + c.cor + "22;color:" + c.cor + '">' + svgIcon(c.icone) + '</span><span class="tx"><b>' + esc(l.n) + "</b><small>" + esc(r.nome) + " · " + esc(l.d) + '</small></span><span class="go">' + svgIcon("arrow", ' width="18" height="18"') + "</span></button>";
  }
  function bindRows(root) {
    $$(".lrow[data-i]", root).forEach(function (b) {
      attachTilt(b, 5);
      b.addEventListener("click", function () {
        var l = D.locais[+b.getAttribute("data-i")];
        go("map"); Map.showCats([l.c]); Map.select(l.i);
      });
    });
  }
  function buildGarages() {
    var gi = D.garagensInfo;
    $("#garInfo").innerHTML = '<span class="eyebrow">Vice City Real Estate</span><h3 style="font-size:19px;margin-top:6px">' + esc(gi.titulo) + "</h3><ul>" + gi.itens.map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("") + "</ul>";
    var gar = D.locais.filter(function (l) { return l.c === "garagem"; });
    var casa = D.locais.filter(function (l) { return l.c === "casa"; });
    var spots = D.locais.filter(function (l) { return l.c === "marina" || l.c === "aereo" || l.c === "oficina"; });
    $("#garCount").textContent = gar.length + " com nome conhecido";
    $("#casaCount").textContent = casa.length + " da história";
    $("#garList").innerHTML = gar.map(rowHTML).join("");
    $("#casaList").innerHTML = casa.map(rowHTML).join("");
    $("#spotList").innerHTML = spots.map(rowHTML).join("");
    bindRows($("#v-gar"));
  }
  function buildInfo() {
    var J = D.jogo;
    $("#heroes").innerHTML = J.protagonistas.map(function (p, i) {
      var c = i ? "var(--aqua)" : "var(--pink)";
      return '<div class="hero-card glass" style="background:linear-gradient(160deg,' + (i ? "rgba(45,226,230,.18)" : "rgba(255,61,139,.2)") + ',transparent 70%),var(--glass)"><span class="big" style="color:' + c + '">' + p.nome.charAt(0) + '</span><span class="eyebrow" style="color:' + c + '">Protagonista</span><h3>' + esc(p.nome) + "</h3><p>" + esc(p.texto) + "</p></div>";
    }).join("");
    $$(".hero-card").forEach(function (c) { attachTilt(c, 10); });
    var kv = [["Lançamento", J.lancamento], ["Plataformas", J.plataformas.join(" · ")], ["PC", J.pc], ["GTA Online novo", J.online], ["Estado", J.estado + " (" + J.inspiracao + ")"]];
    J.destaques.forEach(function (d) { kv.push([d.rotulo.charAt(0).toUpperCase() + d.rotulo.slice(1), d.valor]); });
    $("#gameKv").innerHTML = kv.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("");
    $("#regList").innerHTML = D.regioes.map(function (r) {
      return '<button class="lrow glass" data-r="' + r.id + '"><span class="ic" style="background:' + r.cor + "22;color:" + r.cor + '">' + svgIcon("pin") + '</span><span class="tx"><b>' + esc(r.nome) + "</b><small>" + esc(r.base) + " · " + esc(r.texto) + '</small></span><span class="go">' + svgIcon("arrow", ' width="18" height="18"') + "</span></button>";
    }).join("");
    $$("#regList .lrow").forEach(function (b) {
      attachTilt(b, 5);
      b.addEventListener("click", function () { go("map"); Map.focusRegion(REG[b.getAttribute("data-r")]); });
    });
  }

  /* =========================================================
     VOLTAR (botão do Android) E INÍCIO
     ========================================================= */
  window.ViceHub = {
    back: function () {
      if (Veh.isOpen()) { Veh.close(); return true; }
      if ($("#drawer").classList.contains("open")) { closeDrawer(); return true; }
      if (Map.sheetOpen()) { closeSheet(); return true; }
      if (!$("#results").hidden) { $("#results").hidden = true; return true; }
      if (current !== 0) { go(0); return true; }
      return false;
    }
  };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") window.ViceHub.back(); });

  buildHome();
  Veh.build();
  buildGarages();
  buildInfo();
  requestAnimationFrame(placeGlow);
  var splash = $("#splash"), splashDone = false;
  function endSplash() {
    if (splashDone) return; splashDone = true;
    splash.classList.add("hide"); placeGlow();
    setTimeout(function () { splash.hidden = true; }, 1000);
  }
  splash.addEventListener("click", endSplash);
  setTimeout(endSplash, window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 600 : 3500);
})();
