/* Componentes de interface: ícones, toasts, folhas (sheets), diálogos, menus e carregamentos. */
(function () {
  const u = RS.u;

  /* ----- Ícones (traço 2px, estilo minimalista) ----- */
  const P = d => `<path d="${d}"/>`;
  const C = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}"/>`;
  const R = (x, y, w, h, rx) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}"/>`;
  const ICONS = {
    home: P('M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'),
    box: P('M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8'),
    plus: P('M12 5v14M5 12h14'),
    minus: P('M5 12h14'),
    export: P('M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5'),
    sliders: P('M4 7h9M17 7h3M4 17h3M11 17h9') + C(15, 7, 2) + C(9, 17, 2),
    bell: P('M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0'),
    search: C(11, 11, 7) + P('m20 20-3.5-3.5'),
    scan: P('M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M10 8v8M14 8v8M17 8v8'),
    x: P('M18 6 6 18M6 6l12 12'),
    back: P('m15 18-6-6 6-6'),
    chev: P('m9 18 6-6-6-6'),
    down: P('m6 9 6 6 6-6'),
    calendar: R(3, 4, 18, 18, 3) + P('M16 2v4M8 2v4M3 10h18'),
    edit: P('M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z'),
    trash: P('M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6'),
    copy: R(9, 9, 12, 12, 2) + P('M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1'),
    pdf: P('M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM14 3v6h6M8 13h8M8 17h5'),
    image: R(3, 3, 18, 18, 3) + C(9, 9, 2) + P('m21 15-5-5L5 21'),
    text: P('M4 6h16M4 10h10M4 14h16M4 18h10'),
    user: C(12, 8, 4) + P('M4 21a8 8 0 0 1 16 0'),
    moon: P('M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9'),
    sun: C(12, 12, 4) + P('M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4'),
    a11y: C(12, 4.5, 1.5) + P('M5 8l7 1.5L19 8M12 9.5V14l-3 7M12 14l3 7'),
    lock: R(4, 11, 16, 10, 3) + P('M8 11V7a4 4 0 0 1 8 0v4'),
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/>' + P('M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3'),
    heart: P('M19 14c1.5-1.5 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.8 0-3 .5-4.5 2-1.5-1.5-2.7-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4 3 5.5l7 7z'),
    info: C(12, 12, 9) + P('M12 16v-4M12 8h.01'),
    globe: C(12, 12, 9) + P('M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18'),
    logout: P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'),
    check: P('M20 6 9 17l-5-5'),
    alert: P('M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01'),
    clock: C(12, 12, 9) + P('M12 7v5l3 2'),
    sort: P('M3 6h18M6 12h12M10 18h4'),
    download: P('M12 3v12M7 10l5 5 5-5M5 21h14'),
    upload: P('M12 15V3M7 8l5-5 5 5M5 21h14'),
    mail: R(3, 5, 18, 14, 3) + P('m3 7 9 6 9-6'),
    key: C(7.5, 15.5, 4.5) + P('M10.7 12.3 21 2M16 7l3 3M18 5l2 2'),
    eye: P('M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z') + C(12, 12, 3),
    eyeOff: P('M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2'),
    tag: P('M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z') + C(7.5, 7.5, 1.5),
    refresh: P('M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5'),
    sparkle: P('M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4zM19 17l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z'),
    layers: P('m12 2 10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5'),
    type: P('M4 7V4h16v3M9 20h6M12 4v16'),
    contrast: C(12, 12, 9) + '<path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor"/>',
    phone: R(7, 2, 10, 20, 2) + P('M11 18h2'),
    pin: P('M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z') + C(12, 10, 2.5),
    hash: P('M4 9h16M4 15h16M10 3 8 21M16 3l-2 18'),
    note: P('M4 4h16v12l-4 4H4zM16 20v-4h4'),
    share: C(18, 5, 3) + C(6, 12, 3) + C(18, 19, 3) + P('m8.6 13.5 6.8 4M15.4 6.5l-6.8 4'),
    save: P('M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8'),
    filter: P('M3 5h18l-7 8v6l-4 2v-8z'),
    cloud: P('M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 0 0 4.3 12 3.5 3.5 0 0 0 6.5 19z'),
    zap: P('M13 2 3 14h9l-1 8 10-12h-9z'),
    star: P('m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z'),
    code: P('m16 18 6-6-6-6M8 6l-6 6 6 6'),
    package: P('M16.5 9.4 7.5 4.2M21 16V8l-9-5-9 5v8l9 5zM3.3 7 12 12l8.7-5M12 22V12')
  };

  function icon(name, size = 22, sw = 2) {
    return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;
  }

  /* ----- Pilha de camadas (para o botão voltar do Android) ----- */
  const stack = [];
  const layer = () => document.getElementById('layer');

  function tap(ms) { if (RS.store && RS.store.settings.haptics) RS.native.vibrate(ms || 8); }

  /* ----- Toast ----- */
  function toast(message, opts = {}) {
    const type = opts.type || 'info';
    const ic = opts.icon || ({ ok: 'check', warn: 'alert', err: 'alert', info: 'info' }[type]);
    const el = document.createElement('div');
    el.className = 'toast glass ' + type;
    el.innerHTML = `<span class="ti">${icon(ic, 16, 2.4)}</span><span style="flex:1">${u.esc(message)}</span>` +
      (opts.action ? `<button class="link" style="margin-left:8px">${u.esc(opts.action.label)}</button>` : '');
    const box = document.getElementById('toasts');
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 300); };
    if (opts.action) el.querySelector('button').onclick = () => { opts.action.fn(); close(); };
    setTimeout(close, opts.duration || (opts.action ? 4500 : 2600));
    if (type === 'err') tap(30);
  }

  /* ----- Folha inferior (bottom sheet) ----- */
  function sheet({ title = '', body = '', foot = '', onMount, onClose, headExtra = '' }) {
    const scrim = document.createElement('div');
    scrim.className = 'scrim';
    const el = document.createElement('section');
    el.className = 'sheet glass';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-label', title);
    el.innerHTML = `<div class="grab"></div>
      <header class="sheet-head"><h3>${u.esc(title)}</h3>${headExtra}<button class="icon-btn" data-close aria-label="Fechar">${icon('x', 20)}</button></header>
      <div class="sheet-body">${body}</div>${foot ? `<footer class="sheet-foot">${foot}</footer>` : ''}`;
    layer().append(scrim, el);
    requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('show'); el.classList.add('show'); }));

    let closed = false;
    const ctl = {
      el,
      $: s => el.querySelector(s),
      $$: s => Array.from(el.querySelectorAll(s)),
      setBody(html) { el.querySelector('.sheet-body').innerHTML = html; },
      close(result) {
        if (closed) return; closed = true;
        const i = stack.indexOf(ctl); if (i >= 0) stack.splice(i, 1);
        scrim.classList.remove('show'); el.classList.remove('show');
        el.style.transform = '';
        setTimeout(() => { scrim.remove(); el.remove(); }, 450);
        if (onClose) onClose(result);
      }
    };
    stack.push(ctl);
    scrim.onclick = () => ctl.close();
    el.querySelector('[data-close]').onclick = () => { tap(); ctl.close(); };

    // Arrastar para baixo para fechar
    let y0 = null, dy = 0;
    const head = el.querySelector('.sheet-head'), grab = el.querySelector('.grab');
    [head, grab].forEach(h => {
      h.addEventListener('touchstart', e => { y0 = e.touches[0].clientY; dy = 0; el.style.transition = 'none'; }, { passive: true });
      h.addEventListener('touchmove', e => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); el.style.transform = `translateY(${dy}px)`; }, { passive: true });
      h.addEventListener('touchend', () => { el.style.transition = ''; if (dy > 110) ctl.close(); else el.style.transform = ''; y0 = null; });
    });

    if (onMount) onMount(el, ctl);
    return ctl;
  }

  /* ----- Diálogo central ----- */
  function dialog({ title, message = '', icon: ic = 'info', danger = false, buttons }) {
    return new Promise(resolve => {
      const wrap = document.createElement('div');
      wrap.className = 'dialog-wrap';
      wrap.innerHTML = `<div class="scrim"></div><div class="dialog glass" role="alertdialog">
        <div class="di ${danger ? 'danger' : ''}">${icon(ic, 26)}</div>
        <h3>${u.esc(title)}</h3>${message ? `<p>${message}</p>` : ''}
        <div class="btn-row">${buttons.map((b, i) => `<button class="btn ${b.style || 'ghost'}" data-i="${i}">${u.esc(b.label)}</button>`).join('')}</div>
      </div>`;
      layer().appendChild(wrap);
      const scrim = wrap.firstChild, box = wrap.querySelector('.dialog');
      requestAnimationFrame(() => requestAnimationFrame(() => { scrim.classList.add('show'); box.classList.add('show'); }));
      let done = false;
      const ctl = {
        close(v) {
          if (done) return; done = true;
          const i = stack.indexOf(ctl); if (i >= 0) stack.splice(i, 1);
          scrim.classList.remove('show'); box.classList.remove('show');
          setTimeout(() => wrap.remove(), 300);
          resolve(v);
        }
      };
      stack.push(ctl);
      scrim.onclick = () => ctl.close(buttons.find(b => b.cancel) ? buttons.find(b => b.cancel).value : null);
      wrap.querySelectorAll('[data-i]').forEach(b => b.onclick = () => { tap(); ctl.close(buttons[+b.dataset.i].value); });
    });
  }

  const confirm = ({ title, message, confirm: ok = 'Confirmar', cancel = 'Cancelar', danger = false, icon: ic }) =>
    dialog({ title, message, danger, icon: ic || (danger ? 'trash' : 'info'), buttons: [{ label: cancel, value: false, cancel: true }, { label: ok, value: true, style: danger ? 'danger' : 'primary' }] });

  const alert = ({ title, message, icon: ic = 'info', ok = 'Entendi' }) =>
    dialog({ title, message, icon: ic, buttons: [{ label: ok, value: true, style: 'primary', cancel: true }] });

  /* ----- Menu de escolha ----- */
  function menu({ title, options, value }) {
    return new Promise(resolve => {
      let picked = null;
      sheet({
        title,
        body: `<div class="menu">${options.map((o, i) => `
          <button class="cell ${o.value === value ? 'on' : ''}" data-i="${i}">
            ${o.icon ? `<span class="ci" style="--cc:${o.color || 'rgba(var(--accent-rgb),.18)'};color:${o.color ? '#fff' : 'var(--accent)'}">${icon(o.icon, 18)}</span>` : ''}
            <span class="ct"><b>${u.esc(o.label)}</b>${o.desc ? `<small>${u.esc(o.desc)}</small>` : ''}</span>
            <span class="cv">${o.value === value ? icon('check', 20, 2.4) : ''}</span>
          </button>`).join('')}</div>`,
        onMount(el, ctl) {
          ctl.$$('[data-i]').forEach(b => b.onclick = () => { tap(); picked = options[+b.dataset.i].value; ctl.close(); });
        },
        onClose() { resolve(picked); }
      });
    });
  }

  /* ----- Tela de carregamento com etapas ----- */
  function loading(title, sub = '') {
    const el = document.createElement('div');
    el.className = 'loading-overlay';
    el.innerHTML = `<div class="loading-card glass"><div class="spinner"></div><b>${u.esc(title)}</b><small>${u.esc(sub)}</small><div class="bar"><i></i></div></div>`;
    document.body.appendChild(el);
    const started = Date.now();
    const ctl = {
      step(text, pct) {
        if (text != null) el.querySelector('small').textContent = text;
        if (pct != null) el.querySelector('.bar i').style.width = Math.round(pct) + '%';
      },
      async done(minMs = 700) {
        const wait = minMs - (Date.now() - started);
        if (wait > 0) await u.sleep(wait);
        el.style.transition = 'opacity .3s'; el.style.opacity = '0';
        setTimeout(() => el.remove(), 300);
      }
    };
    const token = { close() { /* não fecha com voltar */ }, locked: true };
    stack.push(token);
    const origDone = ctl.done;
    ctl.done = async (ms) => { const i = stack.indexOf(token); if (i >= 0) stack.splice(i, 1); return origDone(ms); };
    return ctl;
  }

  function skeleton(n = 4) { return Array.from({ length: n }, () => '<div class="skel"></div>').join(''); }

  RS.ui = {
    icon, toast, sheet, dialog, confirm, alert, menu, loading, skeleton, tap, stack,
    closeTop() {
      const top = stack[stack.length - 1];
      if (!top) return false;
      if (!top.locked) top.close();
      return true;
    },
    closeAll() { stack.slice().reverse().forEach(s => !s.locked && s.close()); }
  };
})();
