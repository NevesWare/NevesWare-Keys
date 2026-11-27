/* Leitor de código de barras pela câmera.
   Usa o BarcodeDetector nativo quando existe; senão carrega o ZXing (offline, nos assets). */
(function () {
  const u = RS.u, ui = RS.ui;
  let zxingLoading = null;

  function loadZXing() {
    if (window.ZXing) return Promise.resolve();
    if (zxingLoading) return zxingLoading;
    zxingLoading = new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = 'js/vendor/zxing.min.js';
      s.onload = () => res();
      s.onerror = () => { zxingLoading = null; rej(new Error('zxing')); };
      document.head.appendChild(s);
    });
    return zxingLoading;
  }

  async function nativeDetector() {
    if (!('BarcodeDetector' in window)) return null;
    try {
      const formats = await BarcodeDetector.getSupportedFormats();
      if (!formats || !formats.length) return null;
      return new BarcodeDetector({ formats });
    } catch (e) { return null; }
  }

  function scan() {
    return new Promise(resolve => {
      let result = null, stream = null, reader = null, raf = 0, stopped = false;

      const stop = () => {
        stopped = true;
        cancelAnimationFrame(raf);
        if (reader) { try { reader.reset(); } catch (e) { /* */ } }
        if (stream) stream.getTracks().forEach(t => t.stop());
      };

      const found = (code, ctl) => {
        if (stopped || !code) return;
        result = String(code).trim();
        ui.tap(40);
        ctl.close();
      };

      ui.sheet({
        title: 'Escanear código',
        body: `<div class="scanner"><video playsinline muted autoplay></video><div class="frame"></div><div class="laser"></div>
                 <div class="msg" data-msg>Abrindo a câmera…</div></div>
               <p class="hint" style="text-align:center;margin-top:14px">Aponte para o código de barras. A leitura é automática.</p>
               <div class="divider">ou digite</div>
               <div class="input"><span class="lead">${ui.icon('hash', 18)}</span>
                 <input data-manual inputmode="numeric" placeholder="Código de barras" autocomplete="off">
                 <button class="act" data-ok aria-label="Usar código">${ui.icon('check', 18, 2.4)}</button></div>`,
        async onMount(el, ctl) {
          const video = ctl.$('video'), msg = ctl.$('[data-msg]');
          const manual = ctl.$('[data-manual]');
          ctl.$('[data-ok]').onclick = () => manual.value.trim() && found(manual.value, ctl);
          manual.addEventListener('keydown', e => { if (e.key === 'Enter' && manual.value.trim()) found(manual.value, ctl); });

          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            msg.textContent = 'Câmera indisponível — digite o código abaixo.';
            return;
          }
          try {
            const detector = await nativeDetector();
            if (detector) {
              stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
              if (stopped) return stop();
              video.srcObject = stream;
              await video.play();
              msg.textContent = 'Procurando código…';
              const loop = async () => {
                if (stopped) return;
                try {
                  const codes = await detector.detect(video);
                  if (codes && codes.length) return found(codes[0].rawValue, ctl);
                } catch (e) { /* frame ainda não pronto */ }
                raf = requestAnimationFrame(loop);
              };
              loop();
            } else {
              await loadZXing();
              if (stopped) return;
              reader = new ZXing.BrowserMultiFormatReader();
              msg.textContent = 'Procurando código…';
              await reader.decodeFromConstraints({ video: { facingMode: 'environment' }, audio: false }, video, (res) => {
                if (res) found(res.getText(), ctl);
              });
            }
          } catch (e) {
            msg.textContent = (e && e.name === 'NotAllowedError') ? 'Permissão da câmera negada.' : 'Não foi possível abrir a câmera.';
          }
        },
        onClose() { stop(); resolve(result); }
      });
    });
  }

  RS.scanner = { scan };
})();
