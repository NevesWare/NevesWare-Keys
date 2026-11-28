/* ==========================================================================
   Atualizações: ao abrir (e ao voltar para o app) consulta a última versão
   publicada pelo RS Admin (tabela app_releases). Se for mais nova:
   • obrigatória → tela bloqueante com o botão "Atualizar agora";
   • opcional    → aviso com "Atualizar" ou "Depois".
   O APK é baixado do Supabase Storage e o instalador do Android é aberto.
   ========================================================================== */
(function () {
  const u = RS.u, ui = RS.ui;
  const SKIP = 'rs.update.skip';
  let lastCheck = 0, overlay = null, busy = false, onProgress = null;

  function currentCode() {
    const info = RS.native.info();
    return Number(info.versionCode) || RS.config.versionCode;
  }
  function fmtSize(b) { return b ? (b / 1048576).toFixed(1).replace('.', ',') + ' MB' : ''; }

  window.App = window.App || {};
  const prevProgress = window.App.onUpdateProgress;
  window.App.onUpdateProgress = pct => { if (onProgress) onProgress(pct); if (prevProgress) prevProgress(pct); };

  async function latest() {
    const db = RS.auth.client;
    if (!db) return null;
    const { data, error } = await db.from('app_releases').select('*').eq('published', true).order('version_code', { ascending: false }).limit(1);
    if (error || !data || !data.length) return null;
    return data[0];
  }

  /* Baixa e instala. Devolve true se o instalador abriu. */
  async function install(rel, setStatus) {
    if (busy) return false;
    busy = true;
    try {
      if (!RS.native.isApp) { window.open(rel.apk_url, '_blank'); return true; }
      const B = window.AndroidBridge;
      setStatus('Baixando atualização…', 0);
      onProgress = pct => setStatus(`Baixando… ${pct}%`, pct);
      let r = await new Promise(res => { const id = 'up' + Date.now(); RS.native._wait(id, res); B.downloadUpdate(rel.apk_url, id); });
      onProgress = null;
      if (r && r.needPermission) {
        setStatus('Permita “Instalar apps desconhecidos” para o RS Stock e toque em Atualizar de novo.', 100);
        return false;
      }
      if (!r || !r.ok) { setStatus('Falha no download: ' + ((r && r.error) || 'sem conexão'), 0); return false; }
      setStatus('Abrindo o instalador…', 100);
      return true;
    } finally { busy = false; }
  }

  async function installAgain(rel, setStatus) {
    const B = window.AndroidBridge;
    if (B && B.hasDownloadedUpdate && B.hasDownloadedUpdate()) {
      const r = await new Promise(res => { const id = 'ui' + Date.now(); RS.native._wait(id, res); B.installUpdate(id); });
      if (r && r.needPermission) { setStatus('Permita “Instalar apps desconhecidos” e toque em Atualizar de novo.', 100); return; }
      if (r && r.ok) { setStatus('Abrindo o instalador…', 100); return; }
    }
    return install(rel, setStatus);
  }

  /* Tela cheia para atualização obrigatória (não dá para fechar). */
  function blocking(rel) {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'update-wall';
    overlay.innerHTML = `
      <div class="bg" style="position:absolute"><i class="blob b1"></i><i class="blob b2"></i></div>
      <div class="update-card glass">
        <div class="update-ic">${ui.icon('download', 34, 2)}</div>
        <span class="soon-tag" style="background:color-mix(in srgb,var(--c-danger) 20%,transparent);color:var(--c-danger)">Atualização obrigatória</span>
        <h2>RS Stock ${u.esc(rel.version_name)}</h2>
        <p class="muted">Para continuar usando o app, instale a nova versão.${rel.apk_size ? ' · ' + fmtSize(rel.apk_size) : ''}</p>
        ${rel.notes ? `<div class="update-notes">${u.esc(rel.notes).replace(/\n/g, '<br>')}</div>` : ''}
        <div class="bar" style="height:6px;border-radius:3px;background:var(--glass-3);overflow:hidden;margin:16px 0 8px"><i data-bar style="display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--accent-2));transition:width .3s"></i></div>
        <p class="hint" data-st style="text-align:center;min-height:1.2em">Versão atual: ${u.esc(RS.native.info().version || RS.config.version)}</p>
        <button class="btn primary block" data-up>${ui.icon('download', 20)}Atualizar agora</button>
      </div>`;
    document.body.appendChild(overlay);
    RS.updater.blocking = true;
    const st = overlay.querySelector('[data-st]'), bar = overlay.querySelector('[data-bar]');
    overlay.querySelector('[data-up]').onclick = () => { ui.tap(); installAgain(rel, (t, p) => { st.textContent = t; if (p != null) bar.style.width = p + '%'; }); };
  }

  function optional(rel) {
    ui.sheet({
      title: 'Nova versão disponível',
      body: `<div style="text-align:center;margin-bottom:12px"><div class="update-ic" style="margin:0 auto 12px">${ui.icon('sparkle', 30, 2)}</div>
          <b style="font-size:1.2rem">RS Stock ${u.esc(rel.version_name)}</b>
          <p class="hint" style="text-align:center">Você está na ${u.esc(RS.native.info().version || RS.config.version)}${rel.apk_size ? ' · download de ' + fmtSize(rel.apk_size) : ''}</p></div>
        ${rel.notes ? `<div class="update-notes">${u.esc(rel.notes).replace(/\n/g, '<br>')}</div>` : ''}
        <div style="height:6px;border-radius:3px;background:var(--glass-3);overflow:hidden;margin:16px 0 8px"><i data-bar style="display:block;height:100%;width:0;background:linear-gradient(90deg,var(--accent),var(--accent-2));transition:width .3s"></i></div>
        <p class="hint" data-st style="text-align:center;min-height:1.2em"></p>`,
      foot: `<div class="btn-row"><button class="btn ghost" data-later>Depois</button><button class="btn primary" data-up>${ui.icon('download', 20)}Atualizar</button></div>`,
      onMount(el, ctl) {
        const st = ctl.$('[data-st]'), bar = ctl.$('[data-bar]');
        ctl.$('[data-later]').onclick = () => { localStorage.setItem(SKIP, String(rel.version_code)); ctl.close(); };
        ctl.$('[data-up]').onclick = () => { ui.tap(); installAgain(rel, (t, p) => { st.textContent = t; if (p != null) bar.style.width = p + '%'; }); };
      }
    });
  }

  RS.updater = {
    blocking: false,
    async check(manual) {
      if (!RS.config.features.updates) return;
      if (!manual && Date.now() - lastCheck < 20 * 60000) return;
      lastCheck = Date.now();
      let rel = null;
      try { rel = await latest(); } catch (e) { rel = null; }
      if (!rel || rel.version_code <= currentCode()) {
        if (manual) ui.toast(rel ? 'Você já está na versão mais recente' : 'Não foi possível verificar agora', { type: rel ? 'ok' : 'warn', icon: 'check' });
        return;
      }
      if (rel.mandatory) return blocking(rel);
      if (!manual && localStorage.getItem(SKIP) === String(rel.version_code)) return;
      optional(rel);
    }
  };
})();
