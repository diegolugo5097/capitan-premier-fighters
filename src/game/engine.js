// Motor del combate: rounds, colisiones, proyectiles, efectos, HUD y render en canvas.
import { Fighter, GROUND, STAGE_L, STAGE_R } from './fighter.js';
import { renderStage, drawLights, W, H, RES } from './stage.js';
import { Pad } from './input.js';
import { AI } from './ai.js';

const ROUND_TIME = 99;
const WINS_NEEDED = 2;

function overlap(a, b) { return a.l < b.r && a.r > b.l && a.b < b.t && a.t > b.b; }

export class Game {
  constructor({ sprites, audio, mode = 'cpu', level = 'normal', p1Char, p2Char, onEvent }) {
    this.sprites = sprites; this.audio = audio;
    this.mode = mode; this.onEvent = onEvent || (() => {});
    this.stage = renderStage();
    const mirror = p1Char.id === p2Char.id;
    this.p1 = new Fighter({ id: 1, ch: p1Char, x: 300, facing: 1 });
    this.p2 = new Fighter({ id: 2, ch: p2Char, alt: mirror, x: 660, facing: -1 });
    this.pad1 = new Pad(); this.pad2 = new Pad();
    this.ai = mode === 'cpu' ? new AI(level) : null;
    this.projectiles = []; this.effects = []; this.texts = [];
    this.round = 1; this.tick = 0;
    this.shake = 0; this.flashT = 0; this.superT = 0; this.superOwner = null;
    this.paused = false; this.over = false; this.showBoxes = false;
    this.startRound();
  }

  // ---------- flujo de rounds ----------
  startRound() {
    this.p1.reset(300, 1); this.p2.reset(660, -1);
    this.projectiles = []; this.effects = [];
    this.timer = ROUND_TIME; this.timerTicks = 0;
    this.phase = 'intro'; this.phaseT = 0;
    this.fightActive = false;
    const final = this.p1.wins === WINS_NEEDED - 1 && this.p2.wins === WINS_NEEDED - 1;
    this.banner(final ? 'ROUND FINAL' : `ROUND ${this.round}`, 70, 'gold');
    this.audio.play('bell');
    this.audio.line(final ? 'round_final' : `round${Math.min(this.round, 3)}`, final ? 'Round final' : `Round ${this.round}`);
  }

  // estilos: 'gold' (rounds), 'fire' (¡PELEA!), 'ko', 'win', 'plain'
  banner(text, life = 60, style = 'gold', sub = '') {
    this.bannerText = { text, life, max: life, style, sub };
  }

  endRound(winner, reason) {
    this.fightActive = false;
    this.phase = 'end'; this.phaseT = 0;
    this.slowmo = reason === 'ko' ? 50 : 0;
    if (winner) winner.wins++;
    const loser = winner === this.p1 ? this.p2 : winner === this.p2 ? this.p1 : null;
    const perfect = winner && winner.hp === 100;
    if (reason === 'ko') { this.banner('K.O.', 100, 'ko', perfect ? '¡PERFECTO!' : ''); this.audio.play('ko'); this.audio.lines(perfect ? [['ko', 'K O'], ['perfecto', '¡Perfecto!']] : [['ko', 'K O']], { rate: 0.7, pitch: 0.4 }); this.flashT = 14; }
    else { this.banner(winner ? 'TIEMPO' : 'EMPATE', 90, 'gold'); this.audio.line(winner ? 'tiempo' : 'empate', winner ? 'Tiempo' : 'Empate'); }
    this.roundWinner = winner; this.roundLoser = loser;
  }

  // ---------- servicios para los luchadores ----------
  sfx(n) { this.audio.play(n); }
  shakeScreen(n) { this.shake = Math.max(this.shake, n); }
  callout(f, text) {
    this.texts.push({ x: f.x, y: GROUND - 240, text, life: 50, color: f.ch.color });
  }
  superFlash(f) {
    this.superT = 40; this.superOwner = f;
    this.texts.push({ x: W / 2, y: 190, text: `¡${f.moves.super.name.toUpperCase()}!`, life: 70, color: '#fff', big: true });
  }
  spark(def, kind) {
    const h = def.crouching || def.state === 'crouch' ? 80 : 120;
    this.effects.push({ type: kind, x: def.x + (def.facing === 1 ? 18 : -18), y: GROUND - def.y - h - Math.random() * 30, life: kind === 'super' ? 22 : 14, max: kind === 'super' ? 22 : 14, rot: Math.random() * 6 });
  }
  spawnProjectile(f, kind) {
    const pd = f.ch.projectiles[kind];
    const big = kind === 'superWave';
    this.projectiles.push({ owner: f, kind, big, pd, x: f.x + f.facing * (big ? 120 : 70), y: pd.y, dir: f.facing, life: pd.life, hitSet: new Set(), dead: false, t: 0 });
    this.sfx('fire');
  }
  doThrow(att, def) {
    if (def.state !== 'grabbed') return;
    def.grabbedBy = null;
    def.hp = Math.max(0, def.hp - 14);
    att.meter = Math.min(100, att.meter + 10);
    def.state = 'knockdown'; def.t = 0; def.landed = false;
    def.vy = 9; def.y = 1; def.vx = att.facing * 6.5;
    def.flash = 6;
    att.grabTarget = null;
    this.shakeScreen(8);
    this.sfx('throw');
    this.callout(att, '¡AGARRE!');
  }

  // ---------- update ----------
  update() {
    if (this.paused) return;
    this.tick++;

    if (this.slowmo > 0) { this.slowmo--; if (this.slowmo % 3 !== 0) { this.updateFx(); return; } }
    if (this.superT > 0) { this.superT--; this.updateFx(); if (this.superT > 0) return; }

    // fases
    this.phaseT++;
    if (this.phase === 'intro') {
      if (this.phaseT === 72) { this.banner('¡PELEA!', 50, 'fire'); this.sfx('hitHeavy'); this.audio.line('pelea', '¡Pelea!', { rate: 1.1, pitch: 0.5 }); }
      if (this.phaseT >= 80) { this.phase = 'fight'; this.fightActive = true; }
    } else if (this.phase === 'fight') {
      if (++this.timerTicks >= 60) { this.timerTicks = 0; this.timer--; }
      if (this.timer <= 0) {
        const w = this.p1.hp > this.p2.hp ? this.p1 : this.p2.hp > this.p1.hp ? this.p2 : null;
        this.endRound(w, 'time');
      }
    } else if (this.phase === 'end') {
      if (this.phaseT === 110) {
        const w = this.roundWinner, l = this.roundLoser;
        if (w) { w.state = 'win'; w.t = 0; w.vx = 0; }
        if (l && l.hp > 0) { l.state = 'lose'; l.t = 0; }
        if (w) { this.banner(w.ch.short, 120, 'win', 'GANA'); this.audio.line(`gana_${w.ch.id}`, `Gana ${w.ch.name.toLowerCase()}`); }
      }
      if (this.phaseT === 230) {
        if (this.p1.wins >= WINS_NEEDED || this.p2.wins >= WINS_NEEDED) {
          this.over = true;
          this.onEvent({ type: 'matchOver', winner: this.p1.wins >= WINS_NEEDED ? 1 : 2 });
        } else { this.round++; this.startRound(); }
      }
    }

    // entradas
    if (this.ai) this.ai.think(this.pad2, this.p2, this.p1, this);
    this.pad1.poll(); this.pad2.poll();

    this.p1.hasProjectile = this.projectiles.some((p) => p.owner === this.p1);
    this.p2.hasProjectile = this.projectiles.some((p) => p.owner === this.p2);

    // liberar agarres rotos
    for (const f of [this.p1, this.p2]) {
      if (f.state === 'grabbed' && (!f.grabbedBy || f.grabbedBy.move !== 'grab')) { f.grabbedBy = null; f.toNeutral(); }
    }

    this.p1.update(this.pad1, this.p2, this);
    this.p2.update(this.pad2, this.p1, this);

    this.pushApart();
    this.resolveHits();
    this.updateProjectiles();
    this.updateFx();

    // KO
    if (this.phase === 'fight') {
      const d1 = this.p1.hp <= 0, d2 = this.p2.hp <= 0;
      if (d1 || d2) this.endRound(d1 && d2 ? null : d1 ? this.p2 : this.p1, 'ko');
    }
  }

  pushApart() {
    const a = this.p1, b = this.p2;
    for (const f of [a, b]) f.x = Math.max(STAGE_L, Math.min(STAGE_R, f.x));
    if (a.state === 'grabbed' || b.state === 'grabbed') return;
    const down = (f) => ['knockdown', 'ko', 'lose'].includes(f.state);
    if (down(a) || down(b)) return;
    const minDist = (a.ch.hurt.stand[2] + b.ch.hurt.stand[2]) / 2 * 0.95;
    const vert = Math.abs(a.y - b.y) < 120;
    const dx = b.x - a.x;
    if (vert && Math.abs(dx) < minDist) {
      const push = (minDist - Math.abs(dx)) / 2;
      const s = dx === 0 ? (a.facing === 1 ? 1 : -1) : Math.sign(dx);
      a.x -= s * push; b.x += s * push;
      // contra la pared
      if (a.x < STAGE_L) { b.x += STAGE_L - a.x; a.x = STAGE_L; }
      if (b.x < STAGE_L) { a.x += STAGE_L - b.x; b.x = STAGE_L; }
      if (a.x > STAGE_R) { b.x -= a.x - STAGE_R; a.x = STAGE_R; }
      if (b.x > STAGE_R) { a.x -= b.x - STAGE_R; b.x = STAGE_R; }
    }
  }

  resolveHits() {
    const results = [];
    for (const [att, def] of [[this.p1, this.p2], [this.p2, this.p1]]) {
      if (def.invuln > 0 || ['grabbed', 'getup', 'ko', 'lose'].includes(def.state)) continue;
      if (def.state === 'knockdown' && def.landed) continue;
      const hurt = def.hurtRect();
      for (const { h, i } of att.activeHits()) {
        const box = att.rect(h.box);
        if (overlap(box, hurt)) { results.push({ att, def, h, i }); break; }
      }
    }
    // golpes simultáneos se resuelven ambos
    for (const r of results) {
      r.att.usedHits.add(r.i);
      r.att.connected = true;
      const res = r.def.receive({ ...r.h, chip: r.att.moves[r.att.move]?.special ? 1 : 0 }, r.att, this, r.att.x);
      if (res === 'hit' && r.h.combo !== false && r.att.combo >= 2) {
        this.texts.push({ x: r.att.id === 1 ? 120 : W - 120, y: 150, text: `${r.att.combo} GOLPES`, life: 50, color: '#ffd36b', combo: true, side: r.att.id });
      }
    }
  }

  updateProjectiles() {
    const ps = this.projectiles;
    for (const p of ps) {
      p.t++; p.life--;
      p.x += p.pd.speed * p.dir;
      if (p.life <= 0 || p.x < -200 || p.x > W + 200) p.dead = true;
    }
    // choque entre proyectiles
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
      const a = ps[i], b = ps[j];
      if (a.owner === b.owner || a.dead || b.dead) continue;
      if (Math.abs(a.x - b.x) < 60) {
        if (a.big && !b.big) b.dead = true;
        else if (b.big && !a.big) a.dead = true;
        else { a.dead = true; b.dead = true; }
        this.effects.push({ type: 'super', x: (a.x + b.x) / 2, y: GROUND - 110, life: 20, max: 20, rot: 0 });
        this.sfx('hitHeavy');
      }
    }
    for (const p of ps) {
      if (p.dead) continue;
      const def = p.owner === this.p1 ? this.p2 : this.p1;
      if (def.invuln > 0 || ['grabbed', 'ko', 'lose', 'getup'].includes(def.state)) continue;
      if (def.state === 'knockdown' && def.landed) continue;
      const fake = { x: p.x, y: 0, facing: p.dir };
      const [bx, by, bw, bh] = p.pd.box;
      const box = { l: fake.x + bx, r: fake.x + bx + bw, b: by, t: by + bh };
      if (overlap(box, def.hurtRect())) {
        const h = { ...p.pd, spark: p.big ? 'super' : 'heavy', chip: p.big ? 6 : 2 };
        if (p.pd.multi) {
          // el súper golpea varias veces
          if (p.t % 6 !== 0 || p.hitSet.size >= 4) continue;
          p.hitSet.add(p.t);
          const last = p.hitSet.size >= 4;
          def.receive({ ...h, dmg: last ? 14 : 6, knockdown: last, stun: 30 }, p.owner, this, p.x - p.dir * 100);
          if (last) p.dead = true;
        } else {
          def.receive(h, p.owner, this, p.x - p.dir * 100);
          p.dead = true;
        }
      }
    }
    this.projectiles = ps.filter((p) => !p.dead);
  }

  updateFx() {
    this.effects = this.effects.filter((e) => --e.life > 0);
    this.texts = this.texts.filter((t) => --t.life > 0);
    if (this.bannerText && --this.bannerText.life <= 0) this.bannerText = null;
    if (this.flashT > 0) this.flashT--;
    if (this.shake > 0) this.shake--;
  }

  // ---------- render ----------
  render(ctx) {
    ctx.setTransform(RES, 0, 0, RES, 0, 0);
    ctx.save();
    if (this.shake > 0) ctx.translate((Math.random() - 0.5) * this.shake * 1.6, (Math.random() - 0.5) * this.shake);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.stage, 0, 0, W, H);
    drawLights(ctx, this.tick);

    if (this.superT > 0) {
      ctx.fillStyle = `rgba(5,5,20,${Math.min(0.75, this.superT / 20)})`;
      ctx.fillRect(-20, -20, W + 40, H + 40);
    }

    // el que ataca se dibuja encima
    const order = this.p1.state === 'attack' && this.p2.state !== 'attack' ? [this.p2, this.p1] : [this.p1, this.p2];
    for (const f of order) f.draw(ctx, this.sprites);

    for (const p of this.projectiles) this.drawProjectile(ctx, p);
    for (const e of this.effects) this.drawEffect(ctx, e);
    if (this.showBoxes) this.drawBoxes(ctx);
    ctx.restore();

    this.drawHUD(ctx);
  }

  drawProjectile(ctx, p) {
    const ch = p.owner.ch;
    const [sx, sy, sw, sh] = ch.atlas.frames[p.pd.anim][0];
    const img = this.sprites[ch.id + (p.owner.alt ? '_alt' : '')];
    const pulse = 1 + Math.sin(p.t * 0.7) * 0.07;
    const s = p.pd.scale * pulse * ch.atlas.scale;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    const cy = p.pd.anchor === 'bottom' ? GROUND - (sh * s) / 2 + 2 : GROUND - p.y;
    ctx.translate(p.x, cy);
    ctx.scale(p.dir, 1);
    // estela
    ctx.globalAlpha = 0.35;
    ctx.drawImage(img, sx, sy, sw, sh, (-sw * s) / 2 - 26, (-sh * s) / 2, sw * s, sh * s);
    ctx.globalAlpha = 1;
    ctx.drawImage(img, sx, sy, sw, sh, (-sw * s) / 2, (-sh * s) / 2, sw * s, sh * s);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(p.t * 0.9);
    ctx.drawImage(img, sx, sy, sw, sh, (-sw * s) / 2, (-sh * s) / 2, sw * s, sh * s);
    ctx.restore();
  }

  drawEffect(ctx, e) {
    const k = e.life / e.max;
    ctx.save();
    ctx.translate(e.x, e.y);
    ctx.rotate(e.rot);
    ctx.globalCompositeOperation = 'lighter';
    const size = e.type === 'super' ? 70 : e.type === 'heavy' ? 46 : e.type === 'block' ? 34 : 30;
    const r = size * (1.3 - k * 0.6);
    const color = e.type === 'block' ? '120,200,255' : e.type === 'super' ? '255,230,140' : e.type === 'fire' ? '255,110,30' : '255,190,80';
    ctx.globalAlpha = k;
    ctx.fillStyle = `rgba(${color},0.9)`;
    ctx.beginPath();
    const spikes = e.type === 'block' ? 6 : 10;
    for (let i = 0; i < spikes * 2; i++) {
      const a = (i / (spikes * 2)) * Math.PI * 2;
      const rr = i % 2 ? r * 0.35 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, 7); ctx.fill();
    ctx.restore();
  }

  drawBoxes(ctx) {
    const toScreen = (r) => [r.l, GROUND - r.t, r.r - r.l, r.t - r.b];
    for (const f of [this.p1, this.p2]) {
      ctx.strokeStyle = 'rgba(80,160,255,0.9)'; ctx.strokeRect(...toScreen(f.hurtRect()));
      ctx.strokeStyle = 'rgba(255,60,60,0.95)';
      if (f.state === 'attack') for (const h of f.moves[f.move].hits || []) {
        if (f.moveT >= h.start && f.moveT <= h.end) ctx.strokeRect(...toScreen(f.rect(h.box)));
      }
    }
    for (const p of this.projectiles) {
      const [bx, by, bw, bh] = p.pd.box;
      ctx.strokeStyle = 'rgba(255,60,60,0.95)';
      ctx.strokeRect(p.x + bx, GROUND - by - bh, bw, bh);
    }
  }

  drawHUD(ctx) {
    const barW = 340, barH = 20, top = 30, face = 58;
    const drawSide = (f, flip) => {
      const x = flip ? W / 2 + 42 : W / 2 - 42 - barW;
      // retrato
      const px = flip ? W - 16 - face : 16;
      const pimg = this.sprites[f.ch.id + '_portrait'];
      ctx.fillStyle = '#0b0f1c'; ctx.fillRect(px - 3, top - 15, face + 6, face + 6);
      ctx.fillStyle = '#1b2440'; ctx.fillRect(px, top - 12, face, face);
      if (pimg) {
        const [fx, fy, fw, fh] = f.ch.face;
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.beginPath(); ctx.rect(px, top - 12, face, face); ctx.clip();
        ctx.translate(px + face / 2, top - 12 + face / 2);
        if (flip) ctx.scale(-1, 1);
        if (f.alt) ctx.filter = 'hue-rotate(150deg)';
        ctx.drawImage(pimg, fx, fy, fw, fh, -face / 2, -face / 2, face, face);
        ctx.restore();
      }
      ctx.strokeStyle = f.ch.color; ctx.lineWidth = 2; ctx.strokeRect(px - 1, top - 13, face + 2, face + 2);

      // barra de vida (se vacía hacia el retrato, como en el arcade)
      const bx = flip ? px - 8 - barW : px + face + 8;
      ctx.fillStyle = '#0b0f1c'; ctx.fillRect(bx - 3, top - 3, barW + 6, barH + 6);
      ctx.fillStyle = '#b3160d'; ctx.fillRect(bx, top, barW, barH);
      const lag = (f.hpShown / 100) * barW, cur = (f.hp / 100) * barW;
      ctx.fillStyle = '#ff8a3a';
      if (flip) ctx.fillRect(bx + barW - lag, top, lag, barH); else ctx.fillRect(bx, top, lag, barH);
      const g = ctx.createLinearGradient(0, top, 0, top + barH);
      g.addColorStop(0, '#fff7a0'); g.addColorStop(0.5, '#ffd21f'); g.addColorStop(1, '#d99a08');
      ctx.fillStyle = g;
      if (flip) ctx.fillRect(bx + barW - cur, top, cur, barH); else ctx.fillRect(bx, top, cur, barH);
      ctx.strokeStyle = '#fff2c8'; ctx.lineWidth = 2; ctx.strokeRect(bx - 1, top - 1, barW + 2, barH + 2);
      // nombre
      ctx.font = '400 15px "Bungee", "Impact", sans-serif';
      ctx.textBaseline = 'top';
      ctx.textAlign = flip ? 'right' : 'left';
      ctx.lineWidth = 4; ctx.strokeStyle = '#0b0f1c';
      const nx = flip ? bx + barW : bx;
      ctx.strokeText(f.name, nx, top + barH + 6);
      ctx.fillStyle = '#fff'; ctx.fillText(f.name, nx, top + barH + 6);
      // rounds ganados
      const nw = ctx.measureText(f.name).width;
      for (let i = 0; i < WINS_NEEDED; i++) {
        const cx = flip ? nx - nw - 16 - i * 22 : nx + nw + 16 + i * 22;
        ctx.beginPath(); ctx.arc(cx, top + barH + 15, 7, 0, 7);
        ctx.fillStyle = i < f.wins ? '#ffd21f' : 'rgba(255,255,255,0.15)'; ctx.fill();
        ctx.strokeStyle = '#0b0f1c'; ctx.lineWidth = 2; ctx.stroke();
      }
      // barra de súper
      const mw = 200, my = H - 30;
      const mx = flip ? W - 24 - mw : 24;
      ctx.fillStyle = '#0b0f1c'; ctx.fillRect(mx - 3, my - 3, mw + 6, 16);
      const full = f.meter >= 100;
      ctx.fillStyle = full ? (this.tick % 20 < 10 ? '#fff6c2' : '#ffd21f') : '#3f8cff';
      const mlen = (f.meter / 100) * mw;
      if (flip) ctx.fillRect(mx + mw - mlen, my, mlen, 10); else ctx.fillRect(mx, my, mlen, 10);
      ctx.font = '400 12px "Bungee", "Impact", sans-serif';
      ctx.textAlign = flip ? 'right' : 'left';
      ctx.lineWidth = 3; ctx.strokeStyle = '#0b0f1c';
      const lbl = full ? 'SÚPER LISTO' : 'SÚPER';
      ctx.strokeText(lbl, flip ? mx + mw : mx, my - 17);
      ctx.fillStyle = full ? '#ffd21f' : '#cfe3ff'; ctx.fillText(lbl, flip ? mx + mw : mx, my - 17);
    };
    drawSide(this.p1, false);
    drawSide(this.p2, true);

    // insignia K.O. y reloj, al estilo arcade
    ctx.save();
    ctx.translate(W / 2, top + barH / 2);
    ctx.fillStyle = '#0b0f1c';
    ctx.beginPath(); ctx.moveTo(-30, -16); ctx.lineTo(30, -16); ctx.lineTo(36, 0); ctx.lineTo(30, 16); ctx.lineTo(-30, 16); ctx.lineTo(-36, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = this.p1.hp < 30 || this.p2.hp < 30 ? (this.tick % 16 < 8 ? '#ff3b2a' : '#b3160d') : '#c81e12';
    ctx.beginPath(); ctx.moveTo(-26, -12); ctx.lineTo(26, -12); ctx.lineTo(31, 0); ctx.lineTo(26, 12); ctx.lineTo(-26, 12); ctx.lineTo(-31, 0); ctx.closePath(); ctx.fill();
    ctx.font = '400 18px "Bungee", "Impact", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff2c8'; ctx.fillText('K.O.', 0, 1);
    ctx.restore();
    ctx.font = '400 40px "Bungee", "Impact", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.lineWidth = 6; ctx.strokeStyle = '#0b0f1c';
    const tt = String(Math.max(0, this.timer)).padStart(2, '0');
    ctx.strokeText(tt, W / 2, top + 22);
    ctx.fillStyle = this.timer <= 10 ? '#ff6b3a' : '#ffd21f'; ctx.fillText(tt, W / 2, top + 22);

    // textos flotantes
    for (const t of this.texts) {
      const a = Math.min(1, t.life / 15);
      ctx.globalAlpha = a;
      ctx.textAlign = t.combo ? (t.side === 1 ? 'left' : 'right') : 'center';
      ctx.font = t.big ? '400 46px "Bungee", "Impact", sans-serif' : t.combo ? '400 28px "Bungee", "Impact", sans-serif' : '700 18px "Chakra Petch", sans-serif';
      const x = t.combo ? (t.side === 1 ? 30 : W - 30) : t.x;
      const y = t.combo ? 150 : t.y - (50 - t.life) * 0.6;
      ctx.lineWidth = 5; ctx.strokeStyle = '#0b0f1c'; ctx.strokeText(t.text, x, y);
      ctx.fillStyle = t.color; ctx.fillText(t.text, x, y);
      ctx.globalAlpha = 1;
    }

    // destello blanco del K.O.
    if (this.flashT > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flashT / 16})`; ctx.fillRect(0, 0, W, H); }

    // banner central, estilo arcade: texto inclinado, degradado metálico y líneas de velocidad
    const b = this.bannerText;
    if (b) {
      const p = 1 - b.life / b.max, age = b.max - b.life;
      const out = Math.min(1, b.life / 10);
      const STY = {
        gold: ['#fffbe0', '#ffd21f', '#e8590c', '#3a0d02'],
        fire: ['#ffffff', '#ffe066', '#ff3b1f', '#2b0000'],
        ko: ['#ffffff', '#ff6b5a', '#c80d0d', '#1a0000'],
        win: ['#ffffff', '#cfe8ff', '#2f6bd8', '#050a1a'],
      }[b.style] || ['#fff', '#fff', '#ccc', '#000'];
      const size = b.style === 'ko' ? 150 : b.style === 'fire' ? 104 : b.text.length > 9 ? 72 : 92;
      ctx.save();
      ctx.translate(W / 2, H / 2 - 30);
      ctx.globalAlpha = out;
      // franja de fondo con líneas de velocidad
      const bandH = size * 1.05;
      ctx.fillStyle = 'rgba(5,8,20,0.6)';
      ctx.beginPath(); ctx.moveTo(-W, -bandH / 2); ctx.lineTo(W, -bandH / 2 - 18); ctx.lineTo(W, bandH / 2 - 18); ctx.lineTo(-W, bandH / 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
      for (let i = 0; i < 9; i++) {
        const y = -bandH / 2 + ((i * 37 + age * 6) % bandH);
        const x0 = ((i * 211 + age * 40) % (W * 1.4)) - W * 0.7;
        ctx.beginPath(); ctx.moveTo(x0 - W / 2, y - 4); ctx.lineTo(x0 - W / 2 + 160, y - 9); ctx.stroke();
      }
      // entrada: zoom desde grande (K.O.) o deslizamiento lateral
      let sc = 1, dx = 0;
      if (b.style === 'ko') { sc = age < 8 ? 2.4 - (age / 8) * 1.4 : 1; }
      else if (age < 8) dx = (1 - age / 8) * -W;
      const shake = b.style === 'ko' && age < 26 ? (Math.random() - 0.5) * 10 : 0;
      ctx.translate(dx + shake, shake * 0.5);
      ctx.scale(sc, sc);
      ctx.transform(1, 0, -0.18, 1, 0, 0); // inclinación
      ctx.font = `400 ${size}px "Bungee", "Impact", sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const ty = b.sub && b.style !== 'win' ? -10 : b.style === 'win' ? 14 : 0;
      ctx.lineJoin = 'round';
      ctx.lineWidth = size * 0.2; ctx.strokeStyle = STY[3]; ctx.strokeText(b.text, 6, ty + 8);
      ctx.strokeText(b.text, 0, ty);
      ctx.lineWidth = size * 0.07; ctx.strokeStyle = '#ffffff'; ctx.strokeText(b.text, 0, ty);
      const g = ctx.createLinearGradient(0, ty - size / 2, 0, ty + size / 2);
      g.addColorStop(0, STY[0]); g.addColorStop(0.45, STY[1]); g.addColorStop(0.55, STY[2]); g.addColorStop(1, STY[3]);
      ctx.fillStyle = g; ctx.fillText(b.text, 0, ty);
      // brillo que cruza
      if (age < 40) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * out;
        const sx = -W / 2 + (age / 40) * W;
        const sg = ctx.createLinearGradient(sx - 60, 0, sx + 60, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.9)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg; ctx.fillText(b.text, 0, ty); ctx.restore();
      }
      if (b.sub) {
        const sy = b.style === 'win' ? -size * 0.62 : size * 0.48;
        ctx.font = `400 ${b.style === 'win' ? 34 : 28}px "Bungee", "Impact", sans-serif`;
        ctx.lineWidth = 7; ctx.strokeStyle = '#000'; ctx.strokeText(b.sub, 0, sy);
        ctx.fillStyle = b.style === 'win' ? '#ffd21f' : '#fff'; ctx.fillText(b.sub, 0, sy);
      }
      ctx.restore();
      void p;
    }
  }
}
