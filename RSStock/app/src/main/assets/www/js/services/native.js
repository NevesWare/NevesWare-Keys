/* Ponte com o Android (window.AndroidBridge). No navegador usa alternativas web. */
(function () {
  const B = window.AndroidBridge;
  const pending = {};
  let seq = 0;

  window.Native = {
    _resolve(id, value) {
      const fn = pending[id];
      if (fn) { delete pending[id]; fn(value); }
    }
  };

  function withCallback(invoke, timeoutMs) {
    return new Promise(resolve => {
      const id = 'cb' + (++seq);
      pending[id] = resolve;
      if (timeoutMs) setTimeout(() => { if (pending[id]) { delete pending[id]; resolve({ ok: false, error: 'timeout' }); } }, timeoutMs);
      invoke(id);
    });
  }

  function download(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }

  function b64ToBlob(b64, mime) {
    const data = b64.includes(',') ? b64.split(',')[1] : b64;
    const bin = atob(data);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  RS.native = {
    isApp: !!B,

    info() {
      if (!B) return { platform: 'web', version: RS.config.version };
      try { return JSON.parse(B.info()); } catch (e) { return { platform: 'android' }; }
    },

    sync(products, notif) {
      if (!B) return;
      try { B.sync(JSON.stringify(products), JSON.stringify(notif)); } catch (e) { /* ignora */ }
    },

    vibrate(ms) {
      if (B) { try { B.vibrate(ms || 12); } catch (e) { /* */ } }
      else if (navigator.vibrate) navigator.vibrate(ms || 12);
    },

    setSystemBars(dark) {
      if (B) { try { B.setSystemBars(!!dark); } catch (e) { /* */ } }
      const m = document.querySelector('meta[name="theme-color"]');
      if (m) m.content = dark ? '#07080d' : '#eef1f7';
    },

    /* Troca o ícone do app na tela inicial do Android ('default' | 'coca'). */
    setAppIcon(name) {
      if (!B || !B.setAppIcon) return;
      try { if (B.getAppIcon() !== name) B.setAppIcon(name); } catch (e) { /* */ }
    },

    setImmersive(on) {
      if (B && B.setImmersive) { try { B.setImmersive(!!on); } catch (e) { /* */ } }
    },

    openUrl(url) { if (B) B.openUrl(url); else window.open(url, '_blank'); },

    notificationsAllowed() {
      if (B) { try { return B.notificationsAllowed(); } catch (e) { return false; } }
      return 'Notification' in window && Notification.permission === 'granted';
    },

    async requestNotifications() {
      if (B) return withCallback(id => B.requestNotificationPermission(id), 60000);
      if (!('Notification' in window)) return false;
      const r = await Notification.requestPermission();
      return r === 'granted';
    },

    openNotificationSettings() { if (B) B.openNotificationSettings(); },

    testNotification(fallbackTitle, fallbackBody) {
      if (B) return B.testNotification();
      if ('Notification' in window && Notification.permission === 'granted') new Notification(fallbackTitle, { body: fallbackBody });
      return -1;
    },

    shareText(text, subject) {
      if (B) { B.shareText(text, subject || ''); return Promise.resolve({ ok: true }); }
      if (navigator.share) return navigator.share({ title: subject, text }).then(() => ({ ok: true }), () => ({ ok: false, cancelled: true }));
      return navigator.clipboard.writeText(text).then(() => ({ ok: true, copied: true }), () => ({ ok: false }));
    },

    /* mode: 'share' | 'save' | 'gallery' */
    exportPdf(report, filename, mode) {
      if (!B) return Promise.resolve({ ok: false, error: 'O PDF é gerado pelo app Android.' });
      return withCallback(id => B.exportPdf(JSON.stringify(report), filename, mode, id), 120000);
    },

    exportFile(base64, mime, filename, mode) {
      if (!B) { download(b64ToBlob(base64, mime), filename); return Promise.resolve({ ok: true, where: 'download' }); }
      return withCallback(id => B.exportFile(base64, mime, filename, mode, id), 120000);
    },

    exportImages(list, baseName, mode) {
      if (!B) {
        list.forEach((b64, i) => download(b64ToBlob(b64, 'image/png'), list.length === 1 ? baseName + '.png' : baseName + '-' + (i + 1) + '.png'));
        return Promise.resolve({ ok: true, where: 'download' });
      }
      return withCallback(id => B.exportImages(JSON.stringify(list), baseName, mode, id), 120000);
    },

    exit() { if (B) B.exitApp(); }
  };
})();
