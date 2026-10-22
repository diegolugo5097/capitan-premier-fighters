// Controles (Gamepad API): Xbox, PlayStation, Switch Pro y genéricos USB/Bluetooth.
// - Mapeo estándar automático cuando el navegador lo reconoce (mapping === 'standard').
// - Mapeo genérico de respaldo (stick/cruceta por ejes o "hat") para controles raros.
// - Cada control se puede reconfigurar botón por botón; se guarda por modelo de control.

export const ACTIONS = [
  ['up', 'Arriba'], ['down', 'Abajo'], ['left', 'Izquierda'], ['right', 'Derecha'],
  ['lp', 'Puño'], ['hp', 'Puño fuerte'], ['lk', 'Patada'], ['hk', 'Patada fuerte'],
  ['grab', 'Agarre'], ['super', 'Súper'], ['start', 'Start / Pausa'],
];

// b = botón, a = eje con dirección d, h = dirección del "hat" (eje 9 en controles genéricos)
const STANDARD = {
  up: [{ b: 12 }, { a: 1, d: -1 }], down: [{ b: 13 }, { a: 1, d: 1 }],
  left: [{ b: 14 }, { a: 0, d: -1 }], right: [{ b: 15 }, { a: 0, d: 1 }],
  lp: [{ b: 2 }], hp: [{ b: 3 }], lk: [{ b: 0 }], hk: [{ b: 1 }],
  grab: [{ b: 4 }, { b: 6 }], super: [{ b: 5 }, { b: 7 }], start: [{ b: 9 }, { b: 8 }],
};
const GENERIC = {
  up: [{ a: 1, d: -1 }, { h: 'up' }, { b: 12 }], down: [{ a: 1, d: 1 }, { h: 'down' }, { b: 13 }],
  left: [{ a: 0, d: -1 }, { h: 'left' }, { b: 14 }], right: [{ a: 0, d: 1 }, { h: 'right' }, { b: 15 }],
  lp: [{ b: 2 }], hp: [{ b: 3 }], lk: [{ b: 0 }], hk: [{ b: 1 }],
  grab: [{ b: 4 }, { b: 6 }], super: [{ b: 5 }, { b: 7 }], start: [{ b: 9 }, { b: 8 }],
};

const DEAD = 0.5;
const STORE = 'cpf-gamepad-maps';

function loadMaps() {
  try { return JSON.parse(localStorage.getItem(STORE) || '{}'); } catch { return {}; }
}
function saveMaps(m) {
  try { localStorage.setItem(STORE, JSON.stringify(m)); } catch { /* sin almacenamiento */ }
}

// Hat de controles genéricos: un solo eje con 8 posiciones (-1 … 1) y reposo fuera de rango
function hatDirs(v) {
  if (v === undefined || v > 1.05 || v < -1.05) return {};
  const pos = Math.round(((v + 1) / 2) * 7); // 0 arriba, 1 arr-der, 2 der, 3 ab-der, 4 abajo, 5 ab-izq, 6 izq, 7 arr-izq
  return {
    up: pos === 0 || pos === 1 || pos === 7,
    right: pos >= 1 && pos <= 3,
    down: pos >= 3 && pos <= 5,
    left: pos >= 5 && pos <= 7,
  };
}

const btnDown = (gp, i) => { const b = gp.buttons[i]; return !!b && (b.pressed || b.value > 0.5); };

export function shortName(id = '') {
  const s = id.replace(/\(.*?\)/g, '').replace(/STANDARD GAMEPAD|Vendor: \w+|Product: \w+/gi, '').replace(/\s+/g, ' ').trim();
  if (/xbox|xinput/i.test(id)) return 'Control Xbox';
  if (/dualsense|dualshock|playstation|054c/i.test(id)) return 'Control PlayStation';
  if (/pro controller|057e/i.test(id)) return 'Control Switch Pro';
  return s || 'Control';
}

export class GamepadManager {
  constructor() {
    this.maps = loadMaps();
    this.prev = {};      // estado anterior por índice de control
    this.capture = null; // configuración en curso
  }

  supported() { return typeof navigator !== 'undefined' && !!navigator.getGamepads; }

  list() {
    if (!this.supported()) return [];
    return [...navigator.getGamepads()].filter((g) => g && g.connected !== false).sort((a, b) => a.index - b.index);
  }

  mapFor(gp) {
    const custom = this.maps[gp.id];
    const base = gp.mapping === 'standard' ? STANDARD : GENERIC;
    return custom ? { ...base, ...custom } : base;
  }
  isCustom(gp) { return !!this.maps[gp.id]; }

  read(gp) {
    const map = this.mapFor(gp);
    const hat = gp.axes.length > 9 ? hatDirs(gp.axes[9]) : {};
    const st = {};
    for (const [act] of ACTIONS) {
      st[act] = (map[act] || []).some((bd) => {
        if (bd.b !== undefined) return btnDown(gp, bd.b);
        if (bd.a !== undefined) { const v = gp.axes[bd.a] ?? 0; return bd.d < 0 ? v < -DEAD : v > DEAD; }
        if (bd.h) return !!hat[bd.h];
        return false;
      });
    }
    return st;
  }

  // Lee todos los controles: [{ gp, state, pressed }] (pressed = recién oprimido en este cuadro)
  poll() {
    const out = [];
    for (const gp of this.list()) {
      const st = this.read(gp);
      const prev = this.prev[gp.index] || {};
      const pressed = {};
      for (const [act] of ACTIONS) pressed[act] = st[act] && !prev[act];
      this.prev[gp.index] = st;
      out.push({ gp, state: st, pressed });
    }
    if (this.capture) this.stepCapture();
    return out;
  }

  // ---------- configuración botón por botón ----------
  startCapture(gpIndex, onStep, onDone) {
    const gp = this.list().find((g) => g.index === gpIndex);
    if (!gp) return;
    this.capture = { gpIndex, id: gp.id, step: 0, map: {}, onStep, onDone, base: null, wait: 12 };
    onStep(0);
  }
  skipCapture() { if (this.capture) this.advance(null); }
  cancelCapture() { this.capture = null; }
  resetMap(id) { delete this.maps[id]; saveMaps(this.maps); }

  stepCapture() {
    const c = this.capture;
    const gp = this.list().find((g) => g.index === c.gpIndex);
    if (!gp) return;
    if (c.wait > 0) { c.wait--; c.base = { axes: [...gp.axes], buttons: gp.buttons.map((b) => b.pressed || b.value > 0.5) }; return; }
    // esperar a que suelte todo antes de leer el siguiente botón
    const anyBtn = gp.buttons.some((b) => b.pressed || b.value > 0.5);
    const anyAxis = gp.axes.some((v, i) => Math.abs(v - (c.base.axes[i] ?? 0)) > 0.6);
    if (c.needRelease) { if (!anyBtn && !anyAxis) c.needRelease = false; return; }
    let found = null;
    gp.buttons.forEach((b, i) => { if (!found && !c.base.buttons[i] && (b.pressed || b.value > 0.5)) found = { b: i }; });
    if (!found) {
      gp.axes.forEach((v, i) => {
        if (found) return;
        const rest = c.base.axes[i] ?? 0;
        if (i === 9 && gp.axes.length > 9 && Math.abs(rest) > 1.05) {
          const h = hatDirs(v); const dir = ['up', 'down', 'left', 'right'].find((d) => h[d]);
          if (dir) found = { h: dir };
        } else if (Math.abs(v - rest) > 0.6 && Math.abs(v) > DEAD) found = { a: i, d: v < 0 ? -1 : 1 };
      });
    }
    if (found) this.advance(found);
  }
  advance(binding) {
    const c = this.capture;
    const act = ACTIONS[c.step][0];
    if (binding) {
      c.map[act] = [binding];
      // las direcciones siempre aceptan además el stick izquierdo
      if (['up', 'down', 'left', 'right'].includes(act) && binding.a === undefined) {
        const extra = { up: { a: 1, d: -1 }, down: { a: 1, d: 1 }, left: { a: 0, d: -1 }, right: { a: 0, d: 1 } }[act];
        c.map[act].push(extra);
      }
    }
    c.step++; c.needRelease = true;
    if (c.step >= ACTIONS.length) {
      if (Object.keys(c.map).length) { this.maps[c.id] = c.map; saveMaps(this.maps); }
      const done = c.onDone; this.capture = null; done?.();
      return;
    }
    c.onStep(c.step);
  }
}

export const gamepads = new GamepadManager();
