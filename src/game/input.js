// Entrada por teclado + controles táctiles virtuales.
export const BUTTONS = ['up', 'down', 'left', 'right', 'lp', 'hp', 'lk', 'hk', 'grab', 'super'];

const P1_KEYS = {
  KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  KeyJ: 'lp', KeyK: 'hp', KeyL: 'lk', KeyI: 'hk', KeyO: 'grab', Space: 'super',
};
const P1_ARROWS = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const P2_KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  Numpad1: 'lp', Numpad2: 'hp', Numpad4: 'lk', Numpad5: 'hk', Numpad3: 'grab', Numpad0: 'super',
  KeyN: 'lp', KeyM: 'hp', Comma: 'lk', Period: 'hk', Slash: 'grab', ShiftRight: 'super',
};

export class Pad {
  constructor() {
    this.held = {}; this.prev = {}; this.pressed = {};
    this.virtual = {}; // táctil o IA
    BUTTONS.forEach((b) => { this.held[b] = false; this.prev[b] = false; this.pressed[b] = false; this.virtual[b] = false; });
    this.keys = {};
    this.tapped = {}; // pulsaciones que ocurrieron entre dos ticks
    this.gp = {};     // estado del control (gamepad)
    this.macro = null; this.macroT = 0;
  }
  trigger(m) { this.macro = m; this.macroT = 0; }
  poll() {
    if (this.macro && ++this.macroT > 10) this.macro = null;
    for (const b of BUTTONS) {
      const h = !!this.keys[b] || !!this.virtual[b] || !!this.tapped[b] || !!this.gp[b];
      this.tapped[b] = false;
      this.pressed[b] = h && !this.prev[b];
      this.prev[b] = h;
      this.held[b] = h;
    }
  }
  clear() {
    BUTTONS.forEach((b) => { this.keys[b] = false; this.virtual[b] = false; this.tapped[b] = false; this.gp[b] = false; });
  }
}

export class Keyboard {
  constructor(p1, p2) {
    this.p1 = p1; this.p2 = p2; this.twoPlayers = false;
    this.onDown = this.onDown.bind(this);
    this.onUp = this.onUp.bind(this);
    this.onBlur = () => { p1.clear(); p2.clear(); };
  }
  map(code) {
    if (P1_KEYS[code]) return [this.p1, P1_KEYS[code]];
    if (this.twoPlayers) { if (P2_KEYS[code]) return [this.p2, P2_KEYS[code]]; }
    else if (P1_ARROWS[code]) return [this.p1, P1_ARROWS[code]];
    else if (P2_KEYS[code]) return [this.p1, P2_KEYS[code]];
    return null;
  }
  onDown(e) {
    const m = this.map(e.code);
    if (!m) return;
    e.preventDefault();
    if (!e.repeat) m[0].tapped[m[1]] = true;
    m[0].keys[m[1]] = true;
  }
  onUp(e) {
    const m = this.map(e.code);
    if (!m) return;
    m[0].keys[m[1]] = false;
  }
  attach() {
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('blur', this.onBlur);
  }
  detach() {
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('blur', this.onBlur);
  }
}
