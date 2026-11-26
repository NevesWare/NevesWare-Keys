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
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'
  };
  function svgIcon(name, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"' + (extra || "") + '>' + (IC[name] || "") + "</svg>";
  }
  var TYPE = { carro: { nome: "Carros", um: "Carro", ic: "car" }, moto: { nome: "Motos", um: "Moto", ic: "moto" }, barco: { nome: "Barcos", um: "Barco", ic: "boat" }, aereo: { nome: "Aéreos", um: "Aeronave", ic: "heli" } };
  var REG = {}; D.regioes.forEach(function (r) { REG[r.id] = r; });
  D.locais.forEach(function (l, i) { l.i = i; });

  var toastT;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }
  function quad(x, y) { return "ABCDEFGHIJ".charAt(clamp(Math.floor(x / 100), 0, 9)) + (clamp(Math.floor(y / 100), 0, 13) + 1); }

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
    if (hero) hero.active = i === 0;
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
      { c: "loja", l: "Lojas e armas" }, { c: "marina", l: "Marinas" }, { c: "aereo", l: "Aeroportos" }
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
    var W = 1000, H = 1400;
    var svg = $("#mapSvg"), wrap = $("#mapWrap"), stageEl = $("#mapStage");
    var st = { k: 1, tx: 0, ty: 0 }, fitK = 1, vw = 0, vh = 0;
    var built = false, ready = false, need = true;
    var cats = Object.keys(D.categorias);
    var on = {}; cats.forEach(function (c) { on[c] = true; });
    var fRegion = "all", fStatus = "all", favOnly = false, sel = -1, query = "";
    var favs = store.get("favs", []);
    var gMap, gOv;

    /* ---- contorno de Leonida (pontos, suavizados) ---- */
    var LAND = [[60, 190], [70, 160], [200, 150], [380, 148], [560, 152], [690, 160], [735, 175], [750, 260], [770, 350], [800, 450], [835, 550], [870, 650], [900, 750], [925, 840], [948, 920], [958, 1000], [960, 1060], [948, 1125], [915, 1172], [865, 1198], [815, 1196], [775, 1172], [745, 1135], [715, 1085], [690, 1030], [668, 965], [648, 895], [625, 820], [600, 745], [572, 680], [540, 620], [510, 565], [485, 515], [455, 470], [420, 430], [375, 400], [325, 380], [270, 360], [215, 330], [165, 295], [120, 265], [80, 240]];
    var BEACH = [[970, 870], [980, 868], [992, 940], [996, 1010], [994, 1090], [984, 1092], [982, 1010], [978, 940]];
    var KEYS = [[842, 1232, 26, 8, -18], [800, 1253, 24, 7, -20], [760, 1271, 22, 7, -18], [718, 1289, 30, 9, -16], [676, 1301, 20, 6, -12], [634, 1310, 22, 7, -10], [592, 1318, 26, 8, -8], [550, 1324, 18, 6, -6], [508, 1328, 20, 6, -4], [470, 1331, 24, 8, -2]];

    function smooth(pts, closed) {
      var n = pts.length, d = "M" + pts[0][0] + "," + pts[0][1];
      var last = closed ? n : n - 1;
      for (var i = 0; i < last; i++) {
        var p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
        if (!closed) { if (i === 0) p0 = p1; if (i + 2 >= n) p3 = p2; }
        var c1x = p1[0] + (p2[0] - p0[0]) / 6, c1y = p1[1] + (p2[1] - p0[1]) / 6;
        var c2x = p2[0] - (p3[0] - p1[0]) / 6, c2y = p2[1] - (p3[1] - p1[1]) / 6;
        d += "C" + c1x.toFixed(1) + "," + c1y.toFixed(1) + " " + c2x.toFixed(1) + "," + c2y.toFixed(1) + " " + p2[0] + "," + p2[1];
      }
      return d + (closed ? "Z" : "");
    }

    /* SVG estático do mapa (vira bitmap para o zoom ficar leve) */
    function mapSVG(vb) {
      var land = smooth(LAND, true), beach = smooth(BEACH, true);
      var keys = KEYS.map(function (k) { return '<ellipse cx="' + k[0] + '" cy="' + k[1] + '" rx="' + k[2] + '" ry="' + k[3] + '" transform="rotate(' + k[4] + " " + k[0] + " " + k[1] + ')"/>'; }).join("");
      var islands = keys + '<path d="' + beach + '"/><ellipse cx="966" cy="975" rx="7" ry="5"/><ellipse cx="966" cy="1030" rx="12" ry="5" transform="rotate(-10 966 1030)"/><ellipse cx="310" cy="418" rx="12" ry="5"/><ellipse cx="338" cy="428" rx="8" ry="4"/>';
      var grid = "";
      for (var gx = 100; gx < W; gx += 100) grid += '<path d="M' + gx + ' 0V' + H + '"/>';
      for (var gy = 100; gy < H; gy += 100) grid += '<path d="M0 ' + gy + 'H' + W + '"/>';
      var gl = "";
      for (var c = 0; c < 10; c++) gl += '<text x="' + (c * 100 + 50) + '" y="20">' + "ABCDEFGHIJ".charAt(c) + "</text>";
      for (var r = 0; r < 14; r++) gl += '<text x="14" y="' + (r * 100 + 56) + '">' + (r + 1) + "</text>";
      var ridges = "";
      [[640, 240], [665, 262], [612, 262], [690, 240], [585, 230], [560, 268], [705, 280], [630, 300], [520, 300], [480, 280], [450, 250]].forEach(function (p, i) {
        var s = i < 4 ? 1.3 : .9;
        ridges += '<path d="M' + (p[0] - 16 * s) + " " + (p[1] + 8 * s) + "L" + p[0] + " " + (p[1] - 10 * s) + "L" + (p[0] + 16 * s) + " " + (p[1] + 8 * s) + '"/>';
      });
      var roads =
        '<path d="M90 205 C250 190 450 185 700 190"/>' +
        '<path d="M700 190 C730 300 770 420 820 560 S900 800 925 900 S945 1000 930 1060"/>' +
        '<path d="M560 180 C600 330 640 480 700 640 S800 850 880 960"/>' +
        '<path d="M232 296 C330 330 420 400 480 500 S560 640 600 740"/>' +
        '<path d="M700 640 C760 650 820 620 860 640"/>' +
        '<path d="M930 1060 C900 1120 880 1170 850 1220 S760 1272 718 1289 S600 1320 470 1331"/>' +
        '<path d="M760 1000 C820 990 860 980 900 980"/>' +
        '<path d="M940 960 C955 958 968 950 980 948"/>';
      var labels = '<g font-family="monospace" font-size="13" fill="rgba(251,239,255,.28)">' + gl + "</g>";
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb.slice(0, 4).join(" ") + '" width="' + vb[4] + '" height="' + vb[5] + '">' +
        '<defs>' +
        '<radialGradient id="sea" cx="70%" cy="70%" r="80%"><stop offset="0" stop-color="#1a1240"/><stop offset=".6" stop-color="#0f0a2a"/><stop offset="1" stop-color="#08061a"/></radialGradient>' +
        '<linearGradient id="landG" x1="0" y1="0" x2=".4" y2="1"><stop offset="0" stop-color="#2a1a4c"/><stop offset=".55" stop-color="#33184f"/><stop offset="1" stop-color="#3d1748"/></linearGradient>' +
        '<clipPath id="landClip"><path d="' + land + '"/></clipPath>' +
        '<pattern id="swamp" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.4" fill="#7be38a" opacity=".55"/><path d="M8 11c2-2 4-2 6 0" stroke="#5fd39a" stroke-width="1" fill="none" opacity=".5"/></pattern>' +
        '<pattern id="city" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(-8)"><rect x="1" y="1" width="6.5" height="6.5" rx="1" fill="#ff7ab8" opacity=".55"/></pattern>' +
        '<pattern id="town" width="8" height="8" patternUnits="userSpaceOnUse"><rect x="1" y="1" width="5" height="5" rx="1" fill="#ffd9a8" opacity=".5"/></pattern>' +
        '<pattern id="forest" width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.6" fill="#8b5cf6" opacity=".35"/><circle cx="10" cy="10" r="2" fill="#a98bff" opacity=".3"/></pattern>' +
        '<radialGradient id="fade"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
        '<mask id="mVice"><ellipse cx="915" cy="985" rx="75" ry="125" fill="url(#fade)"/></mask>' +
        '<mask id="mGrass"><ellipse cx="790" cy="1060" rx="120" ry="110" fill="url(#fade)"/></mask>' +
        '<mask id="mForest"><ellipse cx="600" cy="270" rx="200" ry="120" fill="url(#fade)"/></mask>' +
        '<filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="6"/></filter>' +
        '<filter id="glowS" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.5"/></filter>' +
        "</defs>" +
        '<g stroke="rgba(139,92,246,.13)" stroke-width="1">' + grid + "</g>" + labels +
        // águas rasas
        '<g fill="none" stroke="#2de2e6" stroke-linejoin="round"><path d="' + land + '" stroke-width="60" opacity=".05"/><path d="' + land + '" stroke-width="30" opacity=".07"/><path d="' + land + '" stroke-width="12" opacity=".1"/></g>' +
        '<g fill="#2de2e6" opacity=".09">' + KEYS.map(function (k) { return '<ellipse cx="' + k[0] + '" cy="' + k[1] + '" rx="' + (k[2] + 14) + '" ry="' + (k[3] + 10) + '" transform="rotate(' + k[4] + " " + k[0] + " " + k[1] + ')"/>'; }).join("") + "</g>" +
        // terra
        '<path d="' + land + '" fill="url(#landG)"/>' +
        '<g fill="url(#landG)">' + islands + "</g>" +
        '<g clip-path="url(#landClip)">' +
        '<circle cx="912" cy="980" r="190" fill="#ff3d8b" opacity=".16"/>' +
        '<circle cx="790" cy="1060" r="170" fill="#7be38a" opacity=".12"/>' +
        '<circle cx="245" cy="280" r="220" fill="#ff9a3c" opacity=".14"/>' +
        '<circle cx="720" cy="640" r="220" fill="#ffd23f" opacity=".08"/>' +
        '<circle cx="610" cy="250" r="210" fill="#8b5cf6" opacity=".2"/>' +
        '<rect x="600" y="120" width="320" height="320" fill="url(#forest)" mask="url(#mForest)"/>' +
        '<rect x="660" y="940" width="260" height="240" fill="url(#swamp)" mask="url(#mGrass)"/>' +
        '<rect x="830" y="850" width="140" height="280" fill="url(#city)" mask="url(#mVice)"/>' +
        '<ellipse cx="700" cy="645" rx="38" ry="26" fill="url(#town)"/>' +
        '<ellipse cx="240" cy="300" rx="55" ry="26" fill="url(#town)"/>' +
        "</g>" +
        '<g fill="url(#city)" opacity=".8"><path d="' + beach + '"/></g>' +
        // relevo
        '<g fill="none" stroke="#c9b6ff" stroke-width="2.2" stroke-linejoin="round" opacity=".55">' + ridges + "</g>" +
        // água doce
        '<g fill="#1a1a52" stroke="#2de2e6" stroke-width="2" stroke-opacity=".45"><ellipse cx="790" cy="762" rx="58" ry="46"/><ellipse cx="590" cy="300" rx="30" ry="17"/></g>' +
        '<path d="M610 175 C590 260 560 330 525 420 S475 480 460 478" fill="none" stroke="#2de2e6" stroke-width="3" opacity=".5"/>' +
        '<path d="M720 1000 C740 1040 770 1070 760 1120 M800 990 C790 1040 820 1090 810 1150" fill="none" stroke="#2de2e6" stroke-width="2" opacity=".35"/>' +
        // estradas
        '<g fill="none" stroke-linecap="round" stroke-linejoin="round">' +
        '<g stroke="#ffd23f" stroke-width="7" opacity=".14" filter="url(#glowS)">' + roads + "</g>" +
        '<g stroke="#ffe3a3" stroke-width="2.2" opacity=".55">' + roads + "</g></g>" +
        // costa neon
        '<g fill="none" stroke="#ff3d8b"><path d="' + land + '" stroke-width="8" opacity=".55" filter="url(#glow)"/><g stroke-width="5" opacity=".45" filter="url(#glowS)">' + islands + "</g></g>" +
        '<g fill="none" stroke="#ff9fcb" stroke-width="1.8"><path d="' + land + '"/>' + islands + "</g>" +
        "</svg>";
    }

    function raster(vb, cb) {
      var img = new Image();
      img.onload = function () {
        var c = document.createElement("canvas"); c.width = vb[4]; c.height = vb[5];
        var x = c.getContext("2d"); x.drawImage(img, 0, 0, vb[4], vb[5]);
        try {
          if (c.toBlob && window.URL) c.toBlob(function (b) { cb(b ? URL.createObjectURL(b) : c.toDataURL("image/png")); }, "image/png");
          else cb(c.toDataURL("image/png"));
        } catch (e) { cb("data:image/svg+xml;charset=utf-8," + encodeURIComponent(mapSVG(vb))); }
      };
      img.onerror = function () { cb("data:image/svg+xml;charset=utf-8," + encodeURIComponent(mapSVG(vb))); };
      img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(mapSVG(vb));
    }

    function build() {
      if (built) return; built = true;
      var NS = "http://www.w3.org/2000/svg";
      gMap = document.createElementNS(NS, "g");
      gOv = document.createElementNS(NS, "g");
      svg.appendChild(gMap); svg.appendChild(gOv);
      var hiRes = Math.min(2, (window.devicePixelRatio || 1)) >= 2 ? 2200 : 1800;
      raster([0, 0, W, H, hiRes, Math.round(hiRes * 1.4)], function (url) {
        var im = document.createElementNS(NS, "image");
        im.setAttribute("href", url); im.setAttributeNS("http://www.w3.org/1999/xlink", "href", url);
        im.setAttribute("x", 0); im.setAttribute("y", 0); im.setAttribute("width", W); im.setAttribute("height", H);
        gMap.insertBefore(im, gMap.firstChild);
        ready = true; need = true;
        // detalhe em alta para Vice City e Keys
        raster([820, 850, 180, 280, 1260, 1960], function (u2) {
          var d = document.createElementNS(NS, "image");
          d.setAttribute("href", u2); d.setAttributeNS("http://www.w3.org/1999/xlink", "href", u2);
          d.setAttribute("x", 820); d.setAttribute("y", 850); d.setAttribute("width", 180); d.setAttribute("height", 280);
          gMap.appendChild(d);
          raster([440, 1180, 440, 180, 2200, 900], function (u3) {
            var e = document.createElementNS(NS, "image");
            e.setAttribute("href", u3); e.setAttributeNS("http://www.w3.org/1999/xlink", "href", u3);
            e.setAttribute("x", 440); e.setAttribute("y", 1180); e.setAttribute("width", 440); e.setAttribute("height", 180);
            gMap.appendChild(e);
          });
        });
      });
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
      st.k = clamp(st.k, fitK * .8, fitK * 16);
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
      var cell = 30, groups = [];
      pts.forEach(function (p) {
        if (p.l.i === sel) { groups.push({ items: [p], x: p.x, y: p.y }); return; }
        for (var g = 0; g < groups.length; g++) {
          var G = groups[g];
          if (G.items[0].l.i !== sel && Math.abs(G.x - p.x) < cell && Math.abs(G.y - p.y) < cell) { G.items.push(p); return; }
        }
        groups.push({ items: [p], x: p.x, y: p.y });
      });
      var showLabels = z > 3.2;
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
          if (showLabels || isSel) out += '<text class="pin-label" x="' + p.x.toFixed(1) + '" y="' + (p.y + 27).toFixed(1) + '" text-anchor="middle">' + esc(p.l.n) + "</text>";
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
          var nk = clamp(pinch.k * d / pinch.d, fitK * .8, fitK * 16);
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
        if (!visible(l)) { cats.forEach(function (c) { on[c] = true; }); fRegion = "all"; fStatus = "all"; favOnly = false; syncFilters(); }
        select(l.i, true);
      });
    }
    function norm(s) { return s.toLowerCase().normalize ? s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") : s.toLowerCase(); }
    function renderResults() {
      var res = $("#results");
      if (!query) { res.hidden = true; return; }
      var q = norm(query);
      var list = D.locais.filter(function (l) { return norm(l.n + " " + D.categorias[l.c].nome + " " + REG[l.r].nome).indexOf(q) >= 0; }).slice(0, 12);
      res.hidden = false;
      res.innerHTML = list.length ? list.map(function (l) {
        var c = D.categorias[l.c];
        return '<button class="result" data-i="' + l.i + '"><span class="dotc" style="background:' + c.cor + ";box-shadow:0 0 8px " + c.cor + '"></span><span><b>' + esc(l.n) + "</b><small>" + esc(c.nome) + " · " + esc(REG[l.r].nome) + "</small></span></button>";
      }).join("") : '<div class="empty" style="padding:16px">Nada encontrado para "' + esc(query) + '".</div>';
    }

    function zoomAt(sx, sy, f, animate) {
      var nk = clamp(st.k * f, fitK * .8, fitK * 16);
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
          var k = clamp(Math.min(vw, vh) * .45 / span, st.k * 1.6, fitK * 16);
          anim = { a: { k: st.k, tx: st.tx, ty: st.ty }, b: { k: k, tx: vw / 2 - mx * k, ty: vh * .45 - my * k }, t0: now, dur: 600 };
        }
        return;
      }
      $("#results").hidden = true;
      if (sel >= 0) { closeSheet(); return; }
      if (now - lastTap < 320) { var r2 = wrap.getBoundingClientRect(); zoomAt(e.clientX - r2.left, e.clientY - r2.top, 2, true); }
      lastTap = now;
    }

    /* ---- seleção e ficha ---- */
    function select(i, fly) {
      sel = i; need = true;
      var l = D.locais[i];
      if (fly) flyTo(l.x, l.y, Math.max(st.k / fitK, l.r === "vice" ? 9 : 5));
      else flyTo(l.x, l.y, Math.max(st.k / fitK, 1), 500);
      openSheet(l);
    }
    function openSheet(l) {
      var c = D.categorias[l.c], r = REG[l.r], fav = favs.indexOf(l.i) >= 0;
      var sh = $("#sheet");
      sh.innerHTML = '<div class="grab"></div><div style="display:flex;gap:12px;align-items:flex-start">' +
        '<span class="icon-btn" style="width:46px;height:46px;border-radius:15px;background:' + c.cor + '26;color:' + c.cor + '">' + svgIcon(c.icone) + "</span>" +
        '<div style="flex:1;min-width:0"><h3>' + esc(l.n) + '</h3><div class="meta" style="margin-bottom:0">' +
        '<span class="tagc" style="color:' + c.cor + '">' + esc(c.nome) + '</span><span class="tagc" style="color:' + r.cor + '">' + esc(r.nome) + "</span>" +
        '<span class="tagc ' + (l.s === "oficial" ? "ok" : "comm") + '">' + (l.s === "oficial" ? "Oficial" : "Comunidade") + "</span></div></div>" +
        '<button class="icon-btn glass" id="shClose" aria-label="Fechar">' + svgIcon("close") + "</button></div>" +
        '<p style="margin-top:12px">' + esc(l.d) + "</p>" +
        '<div class="row"><button class="btn primary" id="shSolo">' + svgIcon("layers") + "Só " + esc(c.nome.toLowerCase()) + '</button><button class="btn ghost" id="shFav">' + svgIcon("heart", fav ? ' fill="currentColor"' : "") + (fav ? "Salvo" : "Salvar") + "</button></div>" +
        '<div class="coord">QUADRANTE ' + quad(l.x, l.y) + " · X " + l.x + " · Y " + l.y + " · posição aproximada</div>";
      sh.classList.add("open");
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

    /* ---- chips e gaveta ---- */
    function buildChips() {
      var h = '<button class="chip" data-k="all" style="--c:#fbefff"><i></i>Todos</button><button class="chip" data-k="fav" style="--c:#ff3d8b">' + svgIcon("heart", ' width="13" height="13"') + "Salvos</button>";
      cats.forEach(function (c) { var C = D.categorias[c]; h += '<button class="chip" data-k="' + c + '" style="--c:' + C.cor + '"><i></i>' + esc(C.nome) + "</button>"; });
      var box = $("#mapChips"); box.innerHTML = h;
      box.addEventListener("click", function (e) {
        var b = e.target.closest(".chip"); if (!b) return;
        var k = b.getAttribute("data-k");
        if (k === "all") { cats.forEach(function (c) { on[c] = true; }); favOnly = false; fRegion = "all"; fStatus = "all"; }
        else if (k === "fav") { favOnly = !favOnly; if (favOnly && !favs.length) { favOnly = false; toast("Toque em Salvar num local para ele aparecer aqui"); } }
        else if (countOn() === cats.length) { solo(k); return; }
        else { on[k] = !on[k]; if (!countOn()) cats.forEach(function (c) { on[c] = true; }); }
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
        if (f === "allon") { cats.forEach(function (c) { on[c] = true; }); fRegion = "all"; fStatus = "all"; favOnly = false; }
        if (f === "alloff") { cats.forEach(function (c) { on[c] = false; }); on.garagem = true; }
        if (f === "done") { closeDrawer(); return; }
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
        [["all", "Todos"], ["oficial", "Oficial"], ["comunidade", "Comunidade"]].map(function (s) { return '<button class="' + (fStatus === s[0] ? "on" : "") + '" data-f="st" data-v="' + s[0] + '">' + s[1] + "</button>"; }).join("") + "</div>";
      $("#drawer").innerHTML = h;
    }
    function syncFilters() {
      var all = countOn() === cats.length;
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
        cats.forEach(function (k) { on[k] = true; }); fRegion = r.id; favOnly = false;
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
      '<div class="art">' + vArt(v) + "</div>" +
      '<span class="mk">' + esc(v.m === "—" ? TYPE[v.t].um : v.m) + "</span><h3>" + esc(v.n) + '</h3><span class="cl">' + esc(v.cl) + "</span>" +
      (v.spd ? '<div class="bar" title="Velocidade"><i style="width:' + v.spd * 10 + '%"></i></div>' : "") + "</button>";
  }
  function bindVCards(root) {
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
    var stage3 = null, openIdx = -1;
    function open(i) {
      var v = D.veiculos[i]; openIdx = i;
      var where = v.t === "barco" ? ["marina"] : v.t === "aereo" ? ["aereo"] : ["garagem", "oficina"];
      var whereTxt = v.t === "barco" ? "Ver marinas no mapa" : v.t === "aereo" ? "Ver aeroportos no mapa" : "Ver garagens e oficinas";
      $("#vPanel").innerHTML =
        '<div class="v3d" style="--vc:' + v.cor + '"><canvas id="vCanvas"></canvas><button class="icon-btn glass close" id="vClose" aria-label="Fechar">' + svgIcon("close") + '</button><div class="hint">arraste para girar</div></div>' +
        '<div class="vbody"><span class="eyebrow">' + esc(v.m === "—" ? TYPE[v.t].um : v.m) + "</span><h2>" + esc(v.n) + "</h2>" +
        '<div class="meta" style="display:flex;gap:6px;flex-wrap:wrap;margin-top:10px"><span class="tagc">' + esc(TYPE[v.t].um) + '</span><span class="tagc">' + esc(v.cl) + '</span><span class="tagc ' + (v.s === "oficial" ? "ok" : "comm") + '">' + (v.s === "oficial" ? "Mostrado pela Rockstar" : "Lista da comunidade") + "</span></div>" +
        '<div class="spec"><div><small>Inspirado em</small><b>' + esc(v.real || "Não identificado") + "</b></div>" +
        "<div><small>Velocidade</small><b>" + (v.spd ? v.spd.toFixed(1) + " / 10" : "Não publicada") + "</b>" + (v.spd ? '<div class="bar" style="margin-top:8px"><i style="width:' + v.spd * 10 + '%"></i></div>' : "") + "</div></div>" +
        (v.nota ? '<p class="muted" style="font-size:13.5px;margin:0 0 16px">' + esc(v.nota) + "</p>" : "") +
        '<button class="btn primary" id="vWhere" style="width:100%">' + svgIcon("pin") + whereTxt + "</button></div>";
      $("#vModal").classList.add("open"); $("#scrim").classList.add("open");
      $("#vClose").onclick = close;
      $("#vWhere").onclick = function () { close(); go("map"); Map.showCats(where); };
      if (window.THREE) {
        setTimeout(function () {
          if (openIdx !== i) return;
          stage3 = new Stage($("#vCanvas"), { interactive: true });
          stage3.setModel(v);
        }, 60);
      }
    }
    function close() {
      openIdx = -1;
      $("#vModal").classList.remove("open");
      if (!$("#drawer").classList.contains("open")) $("#scrim").classList.remove("open");
      var s = stage3; stage3 = null;
      if (s) setTimeout(function () { s.dispose(); }, 450);
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
     3D (three.js)
     ========================================================= */
  function Stage(canvas, opt) {
    var T = window.THREE, self = this;
    opt = opt || {};
    this.active = true;
    var renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (renderer.outputEncoding !== undefined) renderer.outputEncoding = T.sRGBEncoding;
    var scene = new T.Scene();
    scene.fog = new T.Fog(0x1c0d33, 12, 42);
    var cam = new T.PerspectiveCamera(opt.hero ? 38 : 34, 1, .1, 100);
    cam.position.set(0, opt.hero ? 2.3 : 2.2, opt.hero ? 9.6 : 7.4);
    cam.lookAt(0, opt.hero ? .1 : .6, 0);

    scene.add(new T.HemisphereLight(0xff8ad0, 0x1b0b3a, 1.0));
    var sunL = new T.DirectionalLight(0xffb070, 1.3); sunL.position.set(4, 6, 5); scene.add(sunL);
    var rim = new T.PointLight(0x2de2e6, 1.6, 22); rim.position.set(-4, 2.5, -3); scene.add(rim);
    var rim2 = new T.PointLight(0xff3d8b, 1.4, 18); rim2.position.set(4, 1.5, -2); scene.add(rim2);

    // chão de grade neon
    var grid = new T.GridHelper(60, 60, 0xff3d8b, 0x6b2fa3);
    grid.material.transparent = true; grid.material.opacity = .55; grid.position.y = 0;
    scene.add(grid);
    // plataforma
    var plat = new T.Mesh(new T.CylinderGeometry(2.6, 2.8, .14, 64), new T.MeshStandardMaterial({ color: 0x170b2c, metalness: .7, roughness: .25 }));
    plat.position.y = .07; scene.add(plat);
    var ring = new T.Mesh(new T.TorusGeometry(2.7, .035, 8, 96), new T.MeshBasicMaterial({ color: 0xff3d8b }));
    ring.rotation.x = Math.PI / 2; ring.position.y = .15; scene.add(ring);
    var ring2 = new T.Mesh(new T.TorusGeometry(2.95, .02, 8, 96), new T.MeshBasicMaterial({ color: 0x2de2e6 }));
    ring2.rotation.x = Math.PI / 2; ring2.position.y = .05; scene.add(ring2);

    if (opt.hero) {
      // sol listrado
      var sc = document.createElement("canvas"); sc.width = 256; sc.height = 256;
      var sx = sc.getContext("2d"), gr = sx.createLinearGradient(0, 0, 0, 256);
      gr.addColorStop(0, "#ffe066"); gr.addColorStop(.5, "#ff8a3d"); gr.addColorStop(1, "#ff2d7a");
      sx.fillStyle = gr; sx.beginPath(); sx.arc(128, 128, 126, 0, Math.PI * 2); sx.fill();
      sx.globalCompositeOperation = "destination-out";
      for (var y = 140, h = 4; y < 256; y += 18, h += 2.2) sx.fillRect(0, y, 256, h);
      var sunTex = new T.CanvasTexture(sc);
      var sun = new T.Mesh(new T.PlaneGeometry(14, 14), new T.MeshBasicMaterial({ map: sunTex, transparent: true, fog: false }));
      sun.position.set(0, 4.2, -30); scene.add(sun);
      // palmeiras
      var palmMat = new T.MeshStandardMaterial({ color: 0x1a0a2e, roughness: .9 });
      var leafMat = new T.MeshStandardMaterial({ color: 0x2a0f45, roughness: .8, side: T.DoubleSide });
      function palm(x, z, s, lean) {
        var g = new T.Group(), px = 0, py = 0;
        for (var i = 0; i < 9; i++) {
          var seg = new T.Mesh(new T.CylinderGeometry(.11 - i * .006, .13 - i * .006, .5, 7), palmMat);
          px += lean * i * .012; py += .48;
          seg.position.set(px, py, 0); seg.rotation.z = -lean * i * .025; g.add(seg);
        }
        for (var k = 0; k < 8; k++) {
          var leaf = new T.Mesh(new T.ConeGeometry(.22, 2.2, 4, 1, true), leafMat);
          leaf.scale.set(1, 1, .2);
          leaf.position.set(px, py + .1, 0);
          leaf.rotation.set(0, k * Math.PI / 4, 0);
          leaf.rotateX(Math.PI / 2.4); leaf.translateY(1.05);
          g.add(leaf);
        }
        g.position.set(x, 0, z); g.scale.setScalar(s); scene.add(g); return g;
      }
      palm(-5.2, -4, 1.15, 1); palm(-7.5, -9, 1.4, .6); palm(5.6, -5, 1.2, -1); palm(8.5, -11, 1.5, -.5); palm(-3.4, -14, 1.3, .3); palm(3.8, -15, 1.1, -.2);
      // estrelas
      var sg = new T.BufferGeometry(), arr = [];
      for (var s = 0; s < 260; s++) arr.push((Math.random() - .5) * 60, 2 + Math.random() * 14, -10 - Math.random() * 25);
      sg.setAttribute("position", new T.Float32BufferAttribute(arr, 3));
      scene.add(new T.Points(sg, new T.PointsMaterial({ color: 0xffd6f0, size: .06, transparent: true, opacity: .8, fog: false })));
    }

    var model = new T.Group(); scene.add(model);
    var spin = [], bob = false;
    var rotY = -.6, velY = opt.hero ? .0035 : .006, dragging = false, lastX = 0;

    if (opt.interactive) {
      canvas.addEventListener("pointerdown", function (e) { dragging = true; lastX = e.clientX; canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); });
      canvas.addEventListener("pointermove", function (e) { if (!dragging) return; var dx = e.clientX - lastX; lastX = e.clientX; rotY += dx * .012; velY = dx * .0012; });
      var end = function () { dragging = false; };
      canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
    }

    function M(c, o) { return new T.MeshStandardMaterial(Object.assign({ color: c, metalness: .55, roughness: .3 }, o || {})); }
    var glassM = M(0x101830, { metalness: .9, roughness: .08 }), darkM = M(0x0e0b16, { metalness: .2, roughness: .85 }), chrome = M(0xd8dcf0, { metalness: 1, roughness: .2 });
    var headM = new T.MeshBasicMaterial({ color: 0xfff6cc }), tailM = new T.MeshBasicMaterial({ color: 0xff2a55 });
    function box(w, h, d, m, x, y, z) { var b = new T.Mesh(new T.BoxGeometry(w, h, d), m); b.position.set(x || 0, y || 0, z || 0); return b; }
    function extrude(pts, depth, m) {
      var sh = new T.Shape(); sh.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) sh.lineTo(pts[i][0], pts[i][1]);
      var g = new T.ExtrudeGeometry(sh, { depth: depth, bevelEnabled: true, bevelThickness: .06, bevelSize: .05, bevelSegments: 2 });
      g.translate(0, 0, -depth / 2);
      return new T.Mesh(g, m);
    }
    function wheel(r, w, x, y, z) {
      var g = new T.Group();
      var t = new T.Mesh(new T.CylinderGeometry(r, r, w, 28), darkM); t.rotation.x = Math.PI / 2; g.add(t);
      var rim = new T.Mesh(new T.CylinderGeometry(r * .62, r * .62, w + .02, 20), chrome); rim.rotation.x = Math.PI / 2; g.add(rim);
      g.position.set(x, y, z); return g;
    }

    function buildCar(v) {
      var g = new T.Group(), c = new T.Color(v.cor), paint = M(c, { metalness: .65, roughness: .22 });
      var low = /Super|Esportivo/.test(v.cl), donk = /donk/i.test(v.cl);
      var lift = donk ? .3 : 0;
      var prof = low
        ? [[-2, .3], [2.05, .3], [2.1, .62], [1.25, .82], [.45, 1.22], [-.75, 1.24], [-1.55, .95], [-2.02, .9]]
        : [[-2.1, .34], [2.12, .34], [2.15, .84], [1.15, .95], [.65, 1.48], [-.95, 1.48], [-1.45, 1.02], [-2.12, .97]];
      var win = low ? [[1.12, .86], [.42, 1.18], [-.7, 1.2], [-1.35, .94]] : [[1.02, .98], [.6, 1.42], [-.9, 1.42], [-1.3, 1.02]];
      var body = extrude(prof, 1.62, paint); body.position.y = lift; g.add(body);
      var gl = extrude(win, 1.7, glassM); gl.position.y = lift + .01; g.add(gl);
      var wr = donk ? .55 : .38, wz = .86;
      [[1.3, wr, wz], [1.3, wr, -wz], [-1.3, wr, wz], [-1.3, wr, -wz]].forEach(function (p) { var w = wheel(wr, .3, p[0], p[1], p[2]); g.add(w); spin.push({ o: w, ax: "z", s: -.08 }); });
      g.add(box(.06, .1, .42, headM, 2.15, .58 + lift, .55)); g.add(box(.06, .1, .42, headM, 2.15, .58 + lift, -.55));
      g.add(box(.06, .1, .5, tailM, -2.13, .7 + lift, .5)); g.add(box(.06, .1, .5, tailM, -2.13, .7 + lift, -.5));
      if (low) { var sp = box(.35, .05, 1.5, darkM, -1.9, 1.08, 0); g.add(sp); }
      var glow = new T.Mesh(new T.PlaneGeometry(4.2, 1.9), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: .35 }));
      glow.rotation.x = -Math.PI / 2; glow.position.y = .17; g.add(glow);
      return g;
    }
    function buildMoto(v) {
      var g = new T.Group(), paint = M(new T.Color(v.cor));
      [[.95], [-.95]].forEach(function (p) {
        var w = new T.Group();
        var tire = new T.Mesh(new T.TorusGeometry(.42, .11, 12, 36), darkM); w.add(tire);
        var hub = new T.Mesh(new T.CylinderGeometry(.14, .14, .12, 16), chrome); hub.rotation.x = Math.PI / 2; w.add(hub);
        w.position.set(p[0], .53, 0); g.add(w); spin.push({ o: w, ax: "z", s: -.1 });
      });
      var tank = box(.75, .32, .38, paint, .18, 1.08, 0); tank.rotation.z = -.12; g.add(tank);
      g.add(box(.7, .12, .3, darkM, -.45, 1.0, 0));
      g.add(box(.55, .42, .3, M(0x3a3550), 0, .72, 0));
      var fork = new T.Mesh(new T.CylinderGeometry(.04, .04, .95, 8), chrome); fork.position.set(.82, .95, 0); fork.rotation.z = .35; g.add(fork);
      var bar = new T.Mesh(new T.CylinderGeometry(.03, .03, .8, 8), darkM); bar.rotation.x = Math.PI / 2; bar.position.set(.68, 1.38, 0); g.add(bar);
      var arm = box(.95, .07, .08, chrome, -.5, .66, 0); arm.rotation.z = .18; g.add(arm);
      g.add(box(.08, .14, .2, headM, .9, 1.18, 0)); g.add(box(.05, .08, .16, tailM, -.85, 1.05, 0));
      var ex = new T.Mesh(new T.CylinderGeometry(.06, .07, .9, 10), chrome); ex.rotation.z = Math.PI / 2 - .15; ex.position.set(-.45, .55, .2); g.add(ex);
      g.scale.setScalar(1.55);
      return g;
    }
    function buildBoat(v) {
      var g = new T.Group(), paint = M(new T.Color(v.cor)), white = M(0xf4f0ff, { roughness: .4 });
      var sh = new T.Shape(); sh.moveTo(-2, -.75); sh.lineTo(1.2, -.75); sh.quadraticCurveTo(2.3, -.4, 2.5, 0); sh.quadraticCurveTo(2.3, .4, 1.2, .75); sh.lineTo(-2, .75); sh.lineTo(-2, -.75);
      var hg = new T.ExtrudeGeometry(sh, { depth: .55, bevelEnabled: true, bevelThickness: .08, bevelSize: .06, bevelSegments: 2 });
      var hull = new T.Mesh(hg, paint); hull.rotation.x = -Math.PI / 2; hull.position.y = .15; g.add(hull);
      var deck = new T.Mesh(new T.ShapeGeometry(sh), white); deck.rotation.x = -Math.PI / 2; deck.position.y = .79; deck.scale.set(.94, .9, 1); g.add(deck);
      if (/Airboat/.test(v.cl)) {
        var cage = new T.Mesh(new T.TorusGeometry(.62, .04, 8, 32), chrome); cage.rotation.y = Math.PI / 2; cage.position.set(-1.6, 1.55, 0); g.add(cage);
        var prop = new T.Group(); prop.add(box(.04, 1.1, .12, darkM)); prop.add(box(.04, .12, 1.1, darkM)); prop.position.set(-1.6, 1.55, 0); g.add(prop); spin.push({ o: prop, ax: "x", s: .5 });
        g.add(box(.4, .5, .5, darkM, -1.2, 1.05, 0));
      } else if (/Jet ski/.test(v.cl)) {
        g.scale.set(.55, .8, .6);
      } else if (/Veleiro/.test(v.cl)) {
        var mast = new T.Mesh(new T.CylinderGeometry(.04, .05, 3.4, 8), chrome); mast.position.set(.3, 2.5, 0); g.add(mast);
        var sail = new T.Mesh(new T.ShapeGeometry(new T.Shape([new T.Vector2(0, 0), new T.Vector2(0, 3.1), new T.Vector2(-1.8, 0)])), new T.MeshStandardMaterial({ color: 0xffffff, side: T.DoubleSide, roughness: .6 }));
        sail.position.set(.25, .95, 0); g.add(sail);
      } else if (!/Caiaque|inflável/.test(v.cl)) {
        g.add(box(1.2, .45, 1.05, glassM, -.1, 1.05, 0));
        g.add(box(1.25, .06, 1.12, white, -.1, 1.3, 0));
      }
      var water = new T.Mesh(new T.CircleGeometry(2.6, 48), new T.MeshBasicMaterial({ color: 0x2de2e6, transparent: true, opacity: .22 }));
      water.rotation.x = -Math.PI / 2; water.position.y = .2; g.add(water);
      bob = true;
      return g;
    }
    function buildHeli(v) {
      var g = new T.Group(), paint = M(new T.Color(v.cor));
      var body = new T.Mesh(new T.SphereGeometry(.9, 28, 18), paint); body.scale.set(1.45, .85, .85); g.add(body);
      var cock = new T.Mesh(new T.SphereGeometry(.62, 24, 16), glassM); cock.scale.set(1, .8, .9); cock.position.set(.75, .1, 0); g.add(cock);
      var boom = new T.Mesh(new T.CylinderGeometry(.1, .22, 2.4, 12), paint); boom.rotation.z = Math.PI / 2; boom.position.set(-2.1, .15, 0); g.add(boom);
      g.add(box(.5, .7, .06, paint, -3.2, .45, 0));
      var rotor = new T.Group(); rotor.add(box(4.6, .03, .16, darkM)); rotor.add(box(.16, .03, 4.6, darkM)); rotor.position.y = .95; g.add(rotor); spin.push({ o: rotor, ax: "y", s: .35 });
      g.add(box(.12, .25, .12, darkM, 0, .8, 0));
      var tr = new T.Group(); tr.add(box(.03, .8, .1, darkM)); tr.position.set(-3.25, .5, .08); g.add(tr); spin.push({ o: tr, ax: "z", s: .6 });
      [.55, -.55].forEach(function (z) {
        var sk = new T.Mesh(new T.CylinderGeometry(.04, .04, 2.2, 8), chrome); sk.rotation.z = Math.PI / 2; sk.position.set(0, -.85, z); g.add(sk);
        g.add(box(.05, .4, .05, chrome, .5, -.65, z)); g.add(box(.05, .4, .05, chrome, -.5, -.65, z));
      });
      g.position.y = 1.35;
      var wrapG = new T.Group(); wrapG.add(g); return wrapG;
    }
    function buildPlane(v) {
      var g = new T.Group(), paint = M(new T.Color(v.cor)), white = M(0xf4f0ff);
      var jet = /Jato|comercial/.test(v.cl);
      var fus = new T.Mesh(new T.CylinderGeometry(.34, .26, 4.2, 20), paint); fus.rotation.z = Math.PI / 2; g.add(fus);
      var nose = new T.Mesh(new T.SphereGeometry(.34, 20, 14), paint); nose.scale.set(1.6, 1, 1); nose.position.x = 2.1; g.add(nose);
      var wind = new T.Mesh(new T.SphereGeometry(.26, 16, 10), glassM); wind.scale.set(1.4, .6, .9); wind.position.set(1.75, .2, 0); g.add(wind);
      var wing = box(1.0, .06, jet ? 4.6 : 5.0, paint, .2, jet ? -.1 : .3, 0); g.add(wing);
      g.add(box(.6, .05, 1.7, paint, -1.95, .15, 0));
      var fin = box(.75, .85, .05, paint, -1.9, .55, 0); g.add(fin);
      if (jet) {
        [.55, -.55].forEach(function (z) { var e = new T.Mesh(new T.CylinderGeometry(.18, .16, .8, 14), white); e.rotation.z = Math.PI / 2; e.position.set(-1.2, .38, z); g.add(e); });
      } else {
        var prop = new T.Group(); prop.add(box(.04, 1.3, .12, darkM)); prop.position.x = 2.62; g.add(prop); spin.push({ o: prop, ax: "x", s: .7 });
      }
      if (/Hidro/.test(v.cl)) { [.8, -.8].forEach(function (z) { var f = new T.Mesh(new T.CylinderGeometry(.14, .1, 2.6, 12), white); f.rotation.z = Math.PI / 2; f.position.set(.3, -.75, z); g.add(f); g.add(box(.05, .5, .05, chrome, .3, -.45, z)); }); }
      else { g.add(box(.05, .45, .05, chrome, .9, -.5, 0)); [.5, -.5].forEach(function (z) { g.add(box(.05, .45, .05, chrome, -.1, -.5, z)); }); }
      g.position.y = 1.4; g.scale.setScalar(.95);
      var wrapG = new T.Group(); wrapG.add(g); return wrapG;
    }
    this.setModel = function (v) {
      while (model.children.length) model.remove(model.children[0]);
      spin = []; bob = false;
      var m = v.t === "carro" ? buildCar(v) : v.t === "moto" ? buildMoto(v) : v.t === "barco" ? buildBoat(v) : /Helicóptero/.test(v.cl) ? buildHeli(v) : buildPlane(v);
      model.add(m);
      rim2.color = new T.Color(v.cor);
      ring.material.color = new T.Color(v.cor);
      model.scale.setScalar(.01); grow = 0;
    };
    var grow = 1, t0 = performance.now(), raf = 0, alive = true;
    function size() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      if (canvas.width !== Math.floor(w * renderer.getPixelRatio()) || canvas.height !== Math.floor(h * renderer.getPixelRatio())) {
        renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
      }
    }
    function frame() {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (!self.active) return;
      size();
      var t = (performance.now() - t0) / 1000;
      if (!dragging) { rotY += velY; velY = lerp(velY, opt.hero ? .0035 : .006, .02); }
      model.rotation.y = rotY;
      if (grow < 1) { grow = Math.min(1, grow + .045); var e = 1 - Math.pow(1 - grow, 3); model.scale.setScalar(e * (1 + Math.sin(grow * Math.PI) * .12)); }
      model.position.y = bob ? Math.sin(t * 1.6) * .06 : (opt.hero ? Math.sin(t * 1.2) * .03 : 0);
      spin.forEach(function (s) { s.o.rotation[s.ax] += s.s; });
      grid.position.z = opt.hero ? (t * 2.2) % 1 : 0;
      ring.scale.setScalar(1 + Math.sin(t * 2.2) * .015);
      renderer.render(scene, cam);
    }
    frame();
    this.dispose = function () {
      alive = false; cancelAnimationFrame(raf);
      scene.traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) { (o.material.map && o.material.map.dispose()); o.material.dispose(); } });
      renderer.dispose();
      if (renderer.forceContextLoss) renderer.forceContextLoss();
    };
  }

  var hero = null;
  function buildHero() {
    if (!window.THREE) return;
    try {
      hero = new Stage($("#heroCanvas"), { hero: true });
      hero.setModel({ t: "carro", cl: "Super", cor: "#ff3d8b" });
    } catch (e) { hero = null; }
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
  document.addEventListener("visibilitychange", function () { if (hero) hero.active = !document.hidden && current === 0; });

  buildHome();
  Veh.build();
  buildGarages();
  buildInfo();
  buildHero();
  requestAnimationFrame(placeGlow);
  setTimeout(function () { $("#splash").classList.add("hide"); placeGlow(); }, 1100);
})();
