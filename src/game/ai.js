// IA del rival: decide un plan cada cierto tiempo y lo ejecuta como pulsaciones virtuales.

const LEVELS = {
  facil: { react: 30, block: 0.25, anti: 0.15, aggro: 0.35, combo: 0.1 },
  normal: { react: 17, block: 0.55, anti: 0.45, aggro: 0.55, combo: 0.35 },
  dificil: { react: 9, block: 0.8, anti: 0.75, aggro: 0.7, combo: 0.65 },
};

// helpers de secuencia: 'f' = adelante, 'b' = atrás
const SEQ = {
  lupa: [['down'], ['down', 'f'], ['f', 'lp']],
  upper: [['f'], ['down'], ['down', 'f', 'hp']],
  spin: [['down'], ['down', 'b'], ['b', 'lk']],
};

export class AI {
  constructor(level = 'normal') { this.setLevel(level); this.queue = []; this.wait = 0; this.hold = []; }
  setLevel(l) { this.cfg = LEVELS[l] || LEVELS.normal; }

  push(steps, perStep = 2) { steps.forEach((s) => this.queue.push({ keys: s, n: perStep })); }

  apply(pad, me, keys) {
    for (const k of Object.keys(pad.virtual)) pad.virtual[k] = false;
    for (const k of keys) {
      if (k === 'f') pad.virtual[me.facing === 1 ? 'right' : 'left'] = true;
      else if (k === 'b') pad.virtual[me.facing === 1 ? 'left' : 'right'] = true;
      else pad.virtual[k] = true;
    }
  }

  think(pad, me, opp, game) {
    const c = this.cfg;
    if (!game.fightActive) { this.apply(pad, me, []); this.queue = []; return; }

    if (this.queue.length) {
      const q = this.queue[0];
      this.apply(pad, me, q.keys);
      if (--q.n <= 0) this.queue.shift();
      return;
    }

    const dist = Math.abs(opp.x - me.x);
    const oppMv = opp.state === 'attack' ? opp.moves[opp.move] : null;
    const threat = game.projectiles.find((p) => p.owner === opp && Math.sign(me.x - p.x) === p.dir && Math.abs(me.x - p.x) < 260);

    // Reacciones rápidas (con probabilidad según dificultad)
    if (me.state === 'blockstun') { this.apply(pad, me, me.crouching ? ['down', 'b'] : ['b']); return; }
    if (['idle', 'walk', 'crouch'].includes(me.state)) {
      if (threat && Math.random() < c.block * 0.12) {
        const low = threat.pd.level === 'low';
        if (Math.random() < 0.5) this.push([['up', 'f']], 3); else { this.hold = low ? ['down', 'b'] : ['b']; this.wait = 24; }
        return;
      }
      if (oppMv && dist < 200 && Math.random() < c.block * 0.35) {
        this.hold = ['b']; this.wait = 14;
      }
      if (!opp.grounded && opp.state !== 'knockdown' && dist < 180 && opp.vy < 4 && Math.random() < c.anti * 0.15) {
        this.push(SEQ.upper, 2); return;
      }
    }

    if (this.wait > 0) { this.wait--; this.apply(pad, me, this.hold); return; }

    // nuevo plan
    this.wait = c.react + Math.floor(Math.random() * c.react);
    if (!['idle', 'walk', 'crouch'].includes(me.state)) { this.hold = []; return; }

    const r = Math.random();
    if (me.meter >= 100 && dist < 420 && r < 0.3) { this.queue.push({ keys: ['super'], n: 2 }); return; }

    if (dist > 300) {
      if (r < 0.35 && !me.hasProjectile) { this.push(SEQ.lupa, 2); return; }
      if (r < 0.5 && c.aggro > 0.5) { this.push([['up', 'f']], 3); this.queue.push({ keys: [], n: 18 }); this.queue.push({ keys: ['hk'], n: 3 }); return; }
      this.hold = ['f'];
      return;
    }
    if (dist > 125) {
      if (r < 0.18 && !me.hasProjectile) { this.push(SEQ.lupa, 2); return; }
      if (r < 0.3) { this.push(SEQ.spin, 2); return; }
      if (r < 0.42 * c.aggro + 0.1) {
        this.push([['up', 'f']], 3); this.queue.push({ keys: [], n: 14 }); this.queue.push({ keys: ['lk'], n: 3 }); return;
      }
      if (r < 0.75) { this.hold = ['f']; this.wait = Math.floor(this.wait / 2); return; }
      this.hold = r < 0.88 ? ['b'] : []; return;
    }
    // cerca
    if (r < 0.15) { this.queue.push({ keys: ['grab'], n: 2 }); return; }
    if (r < 0.15 + c.combo * 0.4) {
      this.queue.push({ keys: ['hp'], n: 2 }); this.queue.push({ keys: [], n: 7 });
      this.push(Math.random() < 0.5 ? SEQ.lupa : SEQ.upper, 2); return;
    }
    if (r < 0.55) { const k = ['lp', 'hp', 'lk', 'hk'][Math.floor(Math.random() * 4)]; this.queue.push({ keys: [k], n: 2 }); return; }
    if (r < 0.7) { this.push(SEQ.spin, 2); return; }
    this.hold = ['b']; this.wait = 18;
  }
}
