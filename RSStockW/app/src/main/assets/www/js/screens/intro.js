/* Introdução (primeira abertura): 3 telas deslizáveis apresentando o app. */
(function () {
  const ui = RS.ui, cfg = RS.config;
  const SLIDES = [
    { icon: 'package', a: '#7c5cff', b: '#4cc9ff', title: 'Cadastre em segundos', text: 'Nome e validade é tudo que você precisa. Código de barras é opcional — digite ou escaneie com a câmera.' },
    { icon: 'bell', a: '#f43f5e', b: '#ff8a3d', title: 'Alertas antes de vencer', text: 'Receba um resumo diário dos produtos que estão perto do vencimento. Nada de perda no estoque.' },
    { icon: 'export', a: '#10b981', b: '#22d3ee', title: 'Exporte do seu jeito', text: 'Gere relatórios em PDF, imagem, texto ou planilha e compartilhe em um toque.' }
  ];
  let idx = 0;

  RS.screens.intro = {
    bar: false,
    render() {
      idx = 0;
      return `
        <header class="topbar" style="justify-content:space-between">
          <div style="display:flex;align-items:center;gap:10px"><img class="app-logo sm" src="${RS.logoSrc()}" alt="" style="width:36px;height:36px;border-radius:11px;box-shadow:none"><b>${cfg.appName}</b></div>
          <button class="btn sm" data-skip style="color:var(--text-2)">Pular</button>
        </header>
        <div class="intro"><div class="slides" data-slides>
          ${SLIDES.map(sl => `<section class="slide"><div class="art" style="--a:${sl.a};--b:${sl.b}">${ui.icon(sl.icon, 64, 1.6)}</div>
            <h2>${sl.title}</h2><p>${sl.text}</p></section>`).join('')}
        </div></div>
        <div class="dots" data-dots>${SLIDES.map((_, i) => `<i class="${i === 0 ? 'on' : ''}"></i>`).join('')}</div>
        <button class="btn primary block" data-next>Próximo ${ui.icon('chev', 20)}</button>
        <p class="hint" style="text-align:center;margin-top:12px">${cfg.studio} · © ${cfg.year}</p>`;
    },
    mount(root) {
      const track = root.querySelector('[data-slides]');
      const go = i => {
        idx = Math.max(0, Math.min(SLIDES.length - 1, i));
        track.style.transform = `translateX(${-idx * 100}%)`;
        root.querySelectorAll('[data-dots] i').forEach((d, k) => d.classList.toggle('on', k === idx));
        root.querySelector('[data-next]').innerHTML = idx === SLIDES.length - 1 ? `Começar ${ui.icon('check', 20)}` : `Próximo ${ui.icon('chev', 20)}`;
      };
      RS.screens.intro._go = go;
      const finish = () => { RS.store.set('introSeen', true); RS.app.start('auth', 'forward'); };
      root.querySelector('[data-next]').onclick = () => { ui.tap(); idx === SLIDES.length - 1 ? finish() : go(idx + 1); };
      root.querySelector('[data-skip]').onclick = () => { ui.tap(); finish(); };
      // deslizar com o dedo
      let x0 = null, dx = 0;
      const box = root.querySelector('.intro');
      box.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; dx = 0; track.style.transition = 'none'; }, { passive: true });
      box.addEventListener('touchmove', e => { if (x0 == null) return; dx = e.touches[0].clientX - x0; track.style.transform = `translateX(calc(${-idx * 100}% + ${dx}px))`; }, { passive: true });
      box.addEventListener('touchend', () => { track.style.transition = ''; if (Math.abs(dx) > 60) go(idx + (dx < 0 ? 1 : -1)); else go(idx); x0 = null; });
    },
    onBack() { if (idx > 0) { RS.screens.intro._go && RS.screens.intro._go(idx - 1); return true; } return false; }
  };
})();
