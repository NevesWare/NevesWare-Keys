/* Utilitários gerais: datas, formatação, DOM. */
(function () {
  const DAY = 86400000;
  const pad = n => String(n).padStart(2, '0');
  const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const MONTHS_FULL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

  const u = {
    $: (s, el = document) => el.querySelector(s),
    $$: (s, el = document) => Array.from(el.querySelectorAll(s)),

    esc(s) {
      return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    },

    uid() {
      if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 3 | 8)).toString(16);
      });
    },

    /* ----- Datas (sempre "AAAA-MM-DD", fuso local) ----- */
    toISO(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); },
    parse(iso) {
      if (!iso) return null;
      const [y, m, d] = iso.split('-').map(Number);
      if (!y || !m || !d) return null;
      return new Date(y, m - 1, d);
    },
    today() { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); },
    todayISO() { return u.toISO(u.today()); },
    addDays(n, from) { const d = from ? u.parse(from) : u.today(); d.setDate(d.getDate() + n); return u.toISO(d); },
    addMonths(n, from) {
      const d = from ? u.parse(from) : u.today();
      const day = d.getDate();
      d.setDate(1); d.setMonth(d.getMonth() + n);
      const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, last));
      return u.toISO(d);
    },
    daysUntil(iso) {
      const d = u.parse(iso);
      if (!d) return Infinity;
      return Math.round((d - u.today()) / DAY);
    },
    fmtDate(iso) { const d = u.parse(iso); return d ? pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() : '—'; },
    fmtShort(iso) { const d = u.parse(iso); return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] + (d.getFullYear() !== new Date().getFullYear() ? ' ' + d.getFullYear() : '') : '—'; },
    fmtLong(iso) { const d = u.parse(iso); return d ? d.getDate() + ' de ' + MONTHS_FULL[d.getMonth()] + ' de ' + d.getFullYear() : '—'; },
    fmtNow() {
      const d = new Date();
      return pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() + ' às ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    },
    stamp() { const d = new Date(); return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()); },

    /* Rótulo relativo: "vence em 3 dias", "venceu há 2 dias"... */
    rel(days, short) {
      if (days === Infinity) return 'sem data';
      if (short) {
        if (days < 0) return 'há ' + (-days) + 'd';
        if (days === 0) return 'hoje';
        if (days === 1) return 'amanhã';
        if (days < 60) return days + ' dias';
        if (days < 365) return Math.round(days / 30) + ' meses';
        return (days / 365).toFixed(1).replace('.0', '').replace('.', ',') + ' anos';
      }
      if (days < -1) return 'venceu há ' + (-days) + ' dias';
      if (days === -1) return 'venceu ontem';
      if (days === 0) return 'vence hoje';
      if (days === 1) return 'vence amanhã';
      if (days < 60) return 'vence em ' + days + ' dias';
      if (days < 365) return 'vence em ' + Math.round(days / 30) + ' meses';
      return 'vence em ' + (days / 365).toFixed(1).replace('.0', '').replace('.', ',') + ' anos';
    },

    status(days, threshold) {
      if (days < 0) return 'expired';
      if (days === 0) return 'today';
      if (days <= threshold) return 'soon';
      return 'ok';
    },
    statusName: { expired: 'Vencido', today: 'Vence hoje', soon: 'Próximo', ok: 'Em dia' },

    greet() {
      const h = new Date().getHours();
      return h < 5 ? 'Boa noite' : h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
    },

    initials(name) {
      let p = String(name || '').trim().split(/\s+/).filter(Boolean);
      const letters = p.filter(w => /^\p{L}/u.test(w));
      if (letters.length) p = letters;
      if (!p.length) return '?';
      return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : (p[0][1] || ''))).toUpperCase();
    },

    plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); },
    norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); },
    sleep(ms) { return new Promise(r => setTimeout(r, ms)); },
    debounce(fn, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },
    clamp(v, a, b) { return Math.min(b, Math.max(a, v)); },
    fmtQty(q, unit) {
      const n = Number(q) || 0;
      return (Number.isInteger(n) ? n : n.toLocaleString('pt-BR', { maximumFractionDigits: 3 })) + ' ' + (unit || 'un');
    },

    async sha256(text) {
      if (window.crypto && crypto.subtle) {
        const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
      }
      let h = 0; for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
      return 'w' + h;
    }
  };

  RS.u = u;
})();
