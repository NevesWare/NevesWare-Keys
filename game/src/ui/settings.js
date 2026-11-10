import { sfx } from '../audio.js';

const KEY = 'deadsector-settings';

export const DEFAULTS = {
  quality: 'auto',
  shadows: 'on',
  grass: true,
  fps: false,
  sens: 1,
  aimMode: 'toggle',
  aimAssist: true,
  vibration: true,
  volume: 0.8,
  hudScale: 1,
  hudOpacity: 0.95,
};

export function loadSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

const SECTIONS = [
  {
    id: 'gfx', label: 'Gráficos', rows: [
      { k: 'quality', label: 'Qualidade', desc: 'Automática escolhe pelo aparelho', type: 'seg', opts: [['auto', 'Auto'], ['baixo', 'Baixa'], ['medio', 'Média'], ['alto', 'Alta']] },
      { k: 'shadows', label: 'Sombras', desc: 'Aplicado na próxima incursão', type: 'seg', opts: [['on', 'Ligadas'], ['off', 'Desligadas']] },
      { k: 'grass', label: 'Capim', desc: 'Vegetação animada pelo vento', type: 'toggle' },
      { k: 'fps', label: 'Mostrar FPS', type: 'toggle' },
    ],
  },
  {
    id: 'ctl', label: 'Controles', rows: [
      { k: 'sens', label: 'Sensibilidade da câmera', type: 'range', min: 0.3, max: 2.5, step: 0.05, fmt: (v) => `${v.toFixed(2)}×` },
      { k: 'aimMode', label: 'Botão de mira', desc: 'Tocar para alternar ou segurar para mirar', type: 'seg', opts: [['toggle', 'Alternar'], ['hold', 'Segurar']] },
      { k: 'aimAssist', label: 'Auxílio de mira', desc: 'Leve correção em direção a alvos visíveis', type: 'toggle' },
      { k: 'vibration', label: 'Vibração', desc: 'Ao levar dano', type: 'toggle' },
    ],
  },
  {
    id: 'audio', label: 'Áudio', rows: [{ k: 'volume', label: 'Volume geral', type: 'range', min: 0, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` }],
  },
  {
    id: 'hud', label: 'Interface', rows: [
      { k: 'hudScale', label: 'Tamanho do HUD', type: 'range', min: 0.7, max: 1.4, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
      { k: 'hudOpacity', label: 'Opacidade do HUD', type: 'range', min: 0.3, max: 1, step: 0.05, fmt: (v) => `${Math.round(v * 100)}%` },
      { type: 'action', act: 'editHud', label: 'Editar posição dos botões', button: 'ABRIR EDITOR' },
    ],
  },
  {
    id: 'acc', label: 'Conta', rows: [
      { type: 'action', act: 'fullscreen', label: 'Tela cheia', button: 'ALTERNAR' },
      { type: 'action', act: 'reset', label: 'Reiniciar perfil', desc: 'Apaga facção, stash e progresso', button: 'APAGAR', danger: true },
    ],
  },
];

/**
 * Renders the settings UI into `root`.
 * hooks: { onChange(settings, key), onAction(act) }
 */
export function renderSettings(root, settings, hooks, tab = 'gfx') {
  root.innerHTML = '';
  root.classList.add('settings');
  const nav = document.createElement('nav');
  nav.className = 'set-nav';
  const body = document.createElement('div');
  body.className = 'set-body';
  root.append(nav, body);

  const show = (id) => {
    nav.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.s === id));
    const sec = SECTIONS.find((s) => s.id === id);
    body.innerHTML = '';
    for (const r of sec.rows) body.appendChild(row(r));
  };

  const row = (r) => {
    const el = document.createElement('div');
    el.className = 'set-row';
    el.innerHTML = `<div class="set-lbl"><b>${r.label}</b>${r.desc ? `<small>${r.desc}</small>` : ''}</div>`;
    const ctl = document.createElement('div');
    ctl.className = 'set-ctl';
    const commit = (v) => {
      settings[r.k] = v;
      saveSettings(settings);
      hooks.onChange?.(settings, r.k);
    };
    if (r.type === 'seg') {
      ctl.classList.add('seg');
      for (const [v, l] of r.opts) {
        const b = document.createElement('button');
        b.textContent = l;
        b.classList.toggle('on', settings[r.k] === v);
        b.onclick = () => {
          ctl.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
          b.classList.add('on');
          sfx.ui();
          commit(v);
        };
        ctl.appendChild(b);
      }
    } else if (r.type === 'toggle') {
      const b = document.createElement('button');
      b.className = `switch${settings[r.k] ? ' on' : ''}`;
      b.innerHTML = '<i></i>';
      b.onclick = () => {
        b.classList.toggle('on');
        sfx.ui();
        commit(b.classList.contains('on'));
      };
      ctl.appendChild(b);
    } else if (r.type === 'range') {
      const inp = document.createElement('input');
      inp.type = 'range';
      Object.assign(inp, { min: r.min, max: r.max, step: r.step, value: settings[r.k] });
      const val = document.createElement('span');
      val.className = 'set-val';
      val.textContent = r.fmt(Number(settings[r.k]));
      const fill = () => inp.style.setProperty('--p', `${((inp.value - r.min) / (r.max - r.min)) * 100}%`);
      fill();
      inp.oninput = () => {
        val.textContent = r.fmt(Number(inp.value));
        fill();
        commit(Number(inp.value));
      };
      ctl.append(inp, val);
    } else if (r.type === 'action') {
      const b = document.createElement('button');
      b.className = `set-btn${r.danger ? ' danger' : ''}`;
      b.textContent = r.button;
      b.onclick = () => hooks.onAction?.(r.act);
      ctl.appendChild(b);
    }
    el.appendChild(ctl);
    return el;
  };

  for (const s of SECTIONS) {
    const b = document.createElement('button');
    b.dataset.s = s.id;
    b.textContent = s.label;
    b.onclick = () => {
      sfx.ui();
      show(s.id);
    };
    nav.appendChild(b);
  }
  show(tab);
}

/** Full-screen settings modal. */
export function openSettingsModal(settings, hooks) {
  const m = document.getElementById('settings-modal');
  m.innerHTML = `<div class="modal-card">
      <header><h2>CONFIGURAÇÕES</h2><button class="x" aria-label="Fechar">✕</button></header>
      <div class="modal-body"></div>
    </div>`;
  m.classList.remove('hidden');
  const close = () => {
    m.classList.add('hidden');
    hooks.onClose?.();
  };
  m.querySelector('.x').onclick = close;
  renderSettings(m.querySelector('.modal-body'), settings, {
    ...hooks,
    onAction: (a) => {
      if (a === 'editHud') m.classList.add('hidden');
      hooks.onAction?.(a);
    },
  });
}
