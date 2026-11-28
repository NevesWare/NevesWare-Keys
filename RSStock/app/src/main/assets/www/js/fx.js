/* Efeitos visuais do tema Coca: bolhas subindo no fundo. */
(function () {
  let made = false;
  RS.fx = {
    update() {
      const box = document.getElementById('bubbles');
      if (!box) return;
      const on = RS.store.isCoca() && !RS.store.settings.a11y.reduceMotion;
      if (!on) { box.innerHTML = ''; made = false; return; }
      if (made) return;
      made = true;
      let html = '';
      for (let i = 0; i < 22; i++) {
        const size = 6 + Math.random() * 18;
        html += `<i style="left:${Math.random() * 100}%;width:${size}px;height:${size}px;animation-duration:${7 + Math.random() * 9}s;animation-delay:-${Math.random() * 12}s"></i>`;
      }
      box.innerHTML = html;
    },
    /* Coca 2.0: transição "derramando" entre telas */
    pour() {
      if (!RS.store.isCoca2() || RS.store.settings.a11y.reduceMotion) return;
      const old = document.querySelector('.cola-wipe'); if (old) old.remove();
      const w = document.createElement('div');
      w.className = 'cola-wipe';
      w.innerHTML = '<div class="liq"></div>';
      document.body.appendChild(w);
      setTimeout(() => w.remove(), 820);
    },
    /* Pequena explosão de bolhas (usada ao salvar/trocar de loja no tema Coca). */
    burst(x, y) {
      if (!RS.store.isCoca() || RS.store.settings.a11y.reduceMotion) return;
      const layer = document.createElement('div');
      layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:70';
      for (let i = 0; i < 14; i++) {
        const b = document.createElement('i');
        const s = 6 + Math.random() * 12, a = Math.random() * Math.PI * 2, d = 40 + Math.random() * 70;
        b.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${s}px;height:${s}px;border-radius:50%;border:1.5px solid rgba(228,0,15,.5);background:rgba(255,255,255,.8);transition:transform .7s cubic-bezier(.2,.8,.2,1),opacity .7s`;
        layer.appendChild(b);
        requestAnimationFrame(() => requestAnimationFrame(() => { b.style.transform = `translate(${Math.cos(a) * d}px,${Math.sin(a) * d - 40}px)`; b.style.opacity = '0'; }));
      }
      document.body.appendChild(layer);
      setTimeout(() => layer.remove(), 800);
    }
  };
})();
