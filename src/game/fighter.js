// Luchador: máquina de estados (caminar, saltar, atacar, bloquear, caer) y dibujo desde su sprite sheet.

export const GROUND = 468;
export const STAGE_L = 72;
export const STAGE_R = 888;
const GRAV = 0.78;

export class Fighter {
  constructor({ id, ch, alt = false, x, facing }) {
    this.id = id;
    this.ch = ch;            // datos del personaje (characters.js)
    this.moves = ch.moves;
    this.name = ch.name;
    this.alt = alt;          // paleta alterna (mismo personaje en los dos lados)
    this.reset(x, facing);
    this.wins = 0;
  }

  reset(x, facing) {
    this.x = x; this.y = 0; this.vx = 0; this.vy = 0;
    this.facing = facing;
    this.hp = 100; this.hpShown = 100;
    this.meter = this.meter ?? 0;
    this.state = 'idle'; this.t = 0; this.animT = 0;
    this.move = null; this.moveT = 0; this.usedHits = new Set(); this.connected = false;
    this.stun = 0; this.freeze = 0; this.invuln = 0;
    this.jumpDir = 0; this.airAttacked = false;
    this.hist = []; this.clock = 0;
    this.combo = 0; this.comboTimer = 0;
    this.blocking = false; this.crouching = false;
    this.hurtFrame = 0; this.shake = 0;
    this.grabbedBy = null; this.grabTarget = null;
    this.flash = 0;
  }

  get grounded() { return this.y <= 0 && this.vy <= 0; }

  // ---------- Entrada ----------
  dirFromPad(pad) {
    const f = this.facing;
    const fwd = f === 1 ? pad.held.right : pad.held.left;
    const back = f === 1 ? pad.held.left : pad.held.right;
    const v = pad.held.up ? 8 : pad.held.down ? 2 : 5;
    const h = fwd && !back ? 1 : back && !fwd ? -1 : 0;
    // numpad: 1 2 3 / 4 5 6 / 7 8 9
    if (v === 2) return h === 1 ? 3 : h === -1 ? 1 : 2;
    if (v === 8) return h === 1 ? 9 : h === -1 ? 7 : 8;
    return h === 1 ? 6 : h === -1 ? 4 : 5;
  }

  pushHistory(d) {
    const last = this.hist[this.hist.length - 1];
    if (!last || last.d !== d) this.hist.push({ d, t: this.clock });
    while (this.hist.length > 16) this.hist.shift();
  }

  // Busca la secuencia (con tolerancia) en las últimas `win` ticks
  motion(seq, win = 20) {
    const recent = this.hist.filter((h) => this.clock - h.t <= win).map((h) => h.d);
    let i = 0;
    for (const d of recent) {
      if (seq[i].includes(d)) i++;
      if (i === seq.length) return true;
    }
    return false;
  }

  attackPressed(pad) {
    const p = pad.pressed;
    return p.lp || p.hp || p.lk || p.hk;
  }

  specialFromInput(pad) {
    const punch = pad.pressed.lp || pad.pressed.hp;
    const kick = pad.pressed.lk || pad.pressed.hk;
    if (pad.pressed.super && this.meter >= 100) return 'super';
    if (pad.macro) { // atajos táctiles
      const m = pad.macro; pad.macro = null;
      if (m === 'lupa' && this.hasProjectile) return null;
      return m;
    }
    if (punch && this.motion([[6], [2, 1, 3], [3, 6]], 22)) return 'upper';
    if (punch && this.motion([[2], [3], [6, 9]], 20) && !this.hasProjectile) return 'lupa';
    if (kick && this.motion([[2], [1], [4, 7]], 20)) return 'spin';
    return null;
  }

  // ---------- Lógica por tick ----------
  update(pad, opp, game) {
    this.clock++;
    if (this.comboTimer > 0 && --this.comboTimer === 0) this.combo = 0;
    if (this.flash > 0) this.flash--;
    if (this.shake > 0) this.shake--;
    if (this.freeze > 0) { this.freeze--; if (!this.pose) this.updatePose(); return; }
    this.t++;
    this.animT++;
    if (this.invuln > 0) this.invuln--;

    const d = pad ? this.dirFromPad(pad) : 5;
    if (pad) this.pushHistory(d);

    const canAct = game.fightActive && !['ko', 'win', 'lose'].includes(this.state);

    // girar hacia el rival cuando se puede
    if (this.grounded && ['idle', 'walk', 'crouch'].includes(this.state)) {
      const want = opp.x >= this.x ? 1 : -1;
      if (want !== this.facing && Math.abs(opp.x - this.x) > 6) this.facing = want;
    }

    switch (this.state) {
      case 'idle': case 'walk': case 'crouch':
        this.blocking = false;
        if (!canAct) { this.toNeutral(); break; }
        this.neutral(pad, d, opp, game);
        break;
      case 'prejump':
        if (this.t >= 4) {
          this.state = 'air'; this.t = 0;
          this.vy = this.ch.jumpVy; this.vx = this.jumpDir * this.ch.jumpVx * this.facing;
          game.sfx('jump');
        }
        break;
      case 'air':
        if (canAct && pad && !this.airAttacked && this.attackPressed(pad)) {
          this.startMove('jumpAtk'); this.airAttacked = true; game.sfx('swing');
        }
        break;
      case 'attack':
        this.runMove(pad, opp, game);
        break;
      case 'hitstun': case 'blockstun':
        this.vx *= 0.86;
        if (this.stun-- <= 0) this.toNeutral();
        break;
      case 'knockdown':
        if (this.grounded && this.t > 4) {
          this.vx *= 0.8;
          if (!this.landed) { this.landed = true; this.landT = this.t; game.sfx('land'); game.shakeScreen(5); }
          if (this.hp <= 0) { this.state = 'ko'; this.t = 0; break; }
          if (this.t - this.landT > 34) { this.state = 'getup'; this.t = 0; this.invuln = 24; }
        }
        break;
      case 'getup':
        if (this.t > 16) this.toNeutral();
        break;
      case 'grabbed':
        if (this.grabbedBy) {
          const g = this.grabbedBy;
          this.x = g.x + g.facing * 74; this.y = 0; this.vx = 0; this.facing = -g.facing;
        }
        break;
      case 'ko': case 'lose':
        this.vx *= 0.85;
        break;
      case 'win':
        break;
    }

    // física
    if (this.state !== 'grabbed') {
      if (!this.grounded || this.vy > 0) {
        this.vy -= GRAV;
        this.y += this.vy;
        if (this.y <= 0) {
          this.y = 0; this.vy = 0;
          if (this.state === 'air' || (this.state === 'attack' && this.moves[this.move]?.air)) {
            this.state = 'idle'; this.move = null; this.t = 0; this.vx = 0; this.airAttacked = false;
            this.landLag = 4; game.sfx('land');
          }
        }
      }
      this.x += this.vx;
    }
    if (this.landLag > 0) this.landLag--;

    this.updatePose();

    if (this.hpShown > this.hp) this.hpShown = Math.max(this.hp, this.hpShown - 0.45);
    else this.hpShown = this.hp;
  }

  toNeutral() {
    this.state = this.crouching ? 'crouch' : 'idle';
    this.move = null; this.t = 0; this.vx = 0; this.stun = 0;
  }

  neutral(pad, d, opp, game) {
    if (!pad) return;
    this.crouching = d <= 3;
    // bloqueo: mantener atrás (4) o abajo-atrás (1)
    this.blocking = d === 4 || d === 1;

    // grab
    if (pad.pressed.grab || (pad.pressed.lp && pad.held.lk) || (pad.pressed.lk && pad.held.lp)) {
      this.startMove('grab'); this.grabTry(opp, game); return;
    }
    const sp = this.specialFromInput(pad);
    if (sp) { this.doSpecial(sp, game); return; }

    if (this.landLag > 0) return;

    if (this.attackPressed(pad)) {
      const p = pad.pressed;
      const m = p.lp ? 'jab' : p.hp ? 'cross' : p.lk ? 'kickF' : 'kickH';
      this.startMove(m); game.sfx('swing'); return;
    }

    if (d >= 7) { // salto
      this.state = 'prejump'; this.t = 0; this.vx = 0;
      this.jumpDir = d === 9 ? 1 : d === 7 ? -1 : 0;
      return;
    }
    if (this.crouching) {
      if (this.state !== 'crouch') { this.state = 'crouch'; this.t = 0; }
      this.vx = 0; return;
    }
    if (d === 6) { this.vx = this.ch.walkF * this.facing; this.setLoop('walk'); }
    else if (d === 4) { this.vx = -this.ch.walkB * this.facing; this.setLoop('walk'); }
    else { this.vx = 0; this.setLoop('idle'); }
  }

  setLoop(s) { if (this.state !== s) { this.state = s; this.t = 0; this.animT = 0; } }

  doSpecial(sp, game) {
    if (sp === 'super') {
      this.meter = 0;
      this.startMove('super');
      game.superFlash(this);
      game.sfx('super');
      game.audio.line(`${this.ch.id}_super`, this.moves.super.name);
    } else {
      this.startMove(sp);
      game.sfx(sp === 'lupa' ? 'charge' : 'swing');
      if (sp === 'lupa' && game.audio.hasVoice(`${this.ch.id}_especial`)) game.audio.line(`${this.ch.id}_especial`, '');
      game.callout(this, this.moves[sp].name);
    }
  }

  startMove(m) {
    this.state = 'attack'; this.move = m; this.moveT = 0; this.t = 0;
    this.usedHits = new Set(); this.connected = false;
    const mv = this.moves[m];
    if (!mv.air) this.vx = 0;
    if (mv.invuln) this.invuln = mv.invuln[1];
  }

  moveLength(mv) {
    return mv.frames.reduce((a, f) => a + f[2], 0);
  }

  runMove(pad, opp, game) {
    const mv = this.moves[this.move];
    const t = this.moveT++;

    // cancelar en especial si conectó
    if (pad && mv.cancel && this.connected && t >= mv.cancel[0] && t <= mv.cancel[1]) {
      const sp = this.specialFromInput(pad);
      if (sp) { this.doSpecial(sp, game); return; }
    }

    if (mv.rise && t === mv.rise.start) { this.vy = mv.rise.vy; this.vx = mv.rise.vx * this.facing; this.y = 0.1; }
    if (mv.advance) {
      if (t >= mv.advance.start && t <= mv.advance.end) this.vx = mv.advance.vx * this.facing;
      else if (t > mv.advance.end) this.vx *= 0.7;
    }
    if (mv.projectile && t === mv.projectile.at) game.spawnProjectile(this, mv.projectile.kind);
    if (this.move === 'grab' && this.grabTarget && t === mv.throwAt) game.doThrow(this, this.grabTarget);

    if (mv.air) return; // termina al aterrizar
    if (mv.rise) {
      // golpes con salto: frenan al tocar el suelo y recuperan
      if (t > mv.rise.start + 2 && this.grounded) { this.toNeutral(); this.landLag = 9; game.sfx('land'); }
      return;
    }
    if (t >= this.moveLength(mv)) { this.crouching = !!mv.crouch && pad?.held.down; this.toNeutral(); }
  }

  grabTry(opp, game) {
    const dist = Math.abs(opp.x - this.x);
    const ok = dist < 104 && opp.grounded && ['idle', 'walk', 'crouch', 'attack'].includes(opp.state)
      && !(opp.state === 'attack' && this.moves[opp.move]?.air) && opp.invuln === 0;
    if (ok) {
      this.grabTarget = opp;
      opp.state = 'grabbed'; opp.grabbedBy = this; opp.move = null; opp.t = 0;
      game.sfx('grab');
    } else {
      this.grabTarget = null;
      this.startMove('whiff');
    }
  }

  // ---------- Cajas ----------
  rect(box) {
    const [bx, by, bw, bh] = box;
    const left = this.facing === 1 ? this.x + bx : this.x - bx - bw;
    return { l: left, r: left + bw, b: this.y + by, t: this.y + by + bh };
  }

  hurtRect() {
    const HURT = this.ch.hurt;
    if (['knockdown', 'ko', 'getup'].includes(this.state) || (this.state === 'lose' && this.hp <= 0)) return this.rect(HURT.down);
    if (!this.grounded) return this.rect(HURT.air);
    const mv = this.move && this.moves[this.move];
    if (this.state === 'crouch' || (this.state === 'blockstun' && this.crouching)) return this.rect(HURT.crouch);
    // los ataques extienden un poco la caja hacia adelante
    if (this.state === 'attack' && mv?.hits) {
      const [bx, by, bw, bh] = HURT.stand;
      return this.rect([bx, by, bw + 26, bh]);
    }
    return this.rect(HURT.stand);
  }

  activeHits() {
    if (this.state !== 'attack') return [];
    const mv = this.moves[this.move];
    if (!mv.hits) return [];
    const t = this.moveT;
    return mv.hits
      .map((h, i) => ({ h, i }))
      .filter(({ h, i }) => t >= h.start && t <= h.end && !this.usedHits.has(i));
  }

  canBlockNow() {
    return this.grounded && ['idle', 'walk', 'crouch', 'blockstun'].includes(this.state) && this.blocking;
  }

  // ---------- Recibir golpe ----------
  receive(h, attacker, game, fromX) {
    const dir = fromX < this.x ? 1 : -1; // hacia dónde lo empujan
    const crouchBlock = this.crouching;
    const blockOK = this.canBlockNow() && (
      h.level === 'mid' || (h.level === 'low' && crouchBlock) || (h.level === 'high' && !crouchBlock)
    );

    if (blockOK) {
      this.state = 'blockstun'; this.stun = h.block; this.t = 0;
      this.vx = dir * h.push * 0.75;
      if (h.chip) this.hp = Math.max(1, this.hp - h.chip);
      this.meter = Math.min(100, this.meter + 3);
      this.freeze = 6; attacker.freeze = 6;
      game.spark(this, 'block');
      game.sfx('block');
      return 'block';
    }

    const already = ['hitstun', 'knockdown'].includes(this.state) && attacker.combo > 0;
    attacker.combo = already ? attacker.combo + 1 : 1;
    attacker.comboTimer = 70;
    const scale = Math.max(0.35, 1 - 0.12 * (attacker.combo - 1));
    const dmg = Math.max(1, Math.round(h.dmg * scale * (attacker.ch?.power || 1)));
    this.hp = Math.max(0, this.hp - dmg);
    attacker.meter = Math.min(100, attacker.meter + (h.meter || 0));
    this.meter = Math.min(100, this.meter + (h.meter || 0) * 0.5);
    this.move = null;
    this.grabbedBy = null;
    const heavy = h.spark === 'heavy' || h.spark === 'super';
    this.freeze = heavy ? 10 : 7; attacker.freeze = this.freeze;
    this.shake = this.freeze;
    this.flash = 6;

    if (this.hp <= 0 || h.knockdown || !this.grounded) {
      this.state = 'knockdown'; this.t = 0; this.landed = false;
      this.vy = h.spark === 'super' ? 11 : 8.5; this.y = Math.max(this.y, 1);
      this.vx = dir * (h.push * 0.6 + 2.5);
    } else {
      this.state = 'hitstun'; this.stun = h.stun; this.t = 0;
      this.vx = dir * h.push;
      this.hurtFrame = heavy ? 2 : 0;
    }
    game.spark(this, h.spark || 'light');
    game.sfx(heavy ? 'hitHeavy' : 'hit');
    if (heavy) game.shakeScreen(6);
    return 'hit';
  }

  // ---------- Frame del sprite sheet ----------
  seq(list, t) {
    let acc = 0;
    for (const f of list) { acc += f[2]; if (t < acc) return [f[0], f[1]]; }
    const last = list[list.length - 1];
    return [last[0], last[1]];
  }

  frame() {
    const s = this.state, A = this.ch.anim;
    if (s === 'idle') return ['idle', A.idle.frames[Math.floor(this.animT / A.idle.speed) % A.idle.frames.length]];
    if (s === 'walk') {
      const n = A.walk.frames.length, i = Math.floor(this.animT / A.walk.speed) % n;
      return ['walk', A.walk.frames[this.vx * this.facing >= 0 ? i : n - 1 - i]];
    }
    if (s === 'crouch') return this.t < 4 ? ['crouch', 0] : ['crouch', A.crouch.frames[Math.floor(this.animT / A.crouch.speed) % A.crouch.frames.length]];
    if (s === 'prejump') return A.air.pre;
    if (s === 'air') return this.vy > 2 ? A.air.up : A.air.down;
    if ((s === 'idle' || s === 'crouch') && this.landLag > 0) return A.air.land;
    if (s === 'attack') {
      const mv = this.moves[this.move];
      return this.seq(mv.frames, this.moveT);
    }
    if (s === 'hitstun') return this.seq(this.hurtFrame >= 2 ? A.hurtH : A.hurtL, this.t);
    if (s === 'blockstun') return this.crouching ? A.blockLow : A.block;
    if (s === 'grabbed') return A.grabbed;
    if (s === 'knockdown') {
      if (this.landed) return ['down', 0];
      return this.vy > 0 ? ['fall', 0] : ['fall', 1];
    }
    if (s === 'ko') return ['down', 0];
    if (s === 'lose') return this.hp <= 0 ? ['down', 0] : A.lose;
    if (s === 'getup') return A.getup;
    if (s === 'win') return this.seq(A.win, this.t);
    return ['idle', 0];
  }

  updatePose() {}

  draw(ctx, sprites) {
    let [anim, i] = this.frame();
    if ((this.state === 'idle' || this.state === 'crouch') && this.landLag > 0) [anim, i] = this.ch.anim.air.land;
    const meta = this.ch.atlas.frames;
    const fr = meta[anim]?.[i] || meta.idle[0];
    const [sx, sy, sw, sh, ax] = fr;
    const S = this.ch.atlas.scale;
    const img = sprites[this.ch.id + (this.alt ? '_alt' : '')];
    const shakeX = this.shake > 0 ? (this.shake % 2 ? 3 : -3) : 0;

    // sombra en el piso
    ctx.save();
    ctx.globalAlpha = 0.4 * Math.max(0.3, 1 - this.y / 260);
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(this.x, GROUND + 3, 56 - Math.min(20, this.y / 10), 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(this.x + shakeX), Math.round(GROUND - this.y));
    ctx.scale(this.facing, 1);
    if (this.invuln > 0 && this.state === 'getup' && this.clock % 4 < 2) ctx.globalAlpha = 0.55;
    const down = anim === 'down';
    ctx.drawImage(img, sx, sy, sw, sh, -ax * S, -sh * S + (down ? 6 : 0), sw * S, sh * S);
    if (this.flash > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.35 * (this.flash / 6);
      ctx.drawImage(img, sx, sy, sw, sh, -ax * S, -sh * S + (down ? 6 : 0), sw * S, sh * S);
    }
    ctx.restore();
  }
}
