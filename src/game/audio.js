// Sonido sintetizado con Web Audio (sin archivos): efectos, música de pelea y locutor.
// Música: secuenciador por semicorcheas con batería, bajo, power chords distorsionados,
// melodía principal, arpegios y metales. Dos temas: 'menu' (épico) y 'fight' (rápido).

const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// Voces del locutor grabadas: src/assets/voz/<clave>.mp3 (ver LOCUTOR.md).
// Si falta un archivo, se usa la voz del navegador con el texto de respaldo.
const VOICE_FILES = import.meta.glob('../assets/voz/*.{mp3,ogg,wav,m4a}', { query: '?url', import: 'default', eager: true });
const VOICE_URLS = {};
for (const [path, url] of Object.entries(VOICE_FILES)) VOICE_URLS[path.split('/').pop().replace(/\.[^.]+$/, '')] = url;

// ---------- partituras ----------
// Cada compás tiene 16 pasos. 0 = silencio, -1 = sostener la nota anterior.
const _ = 0, H = -1;
const TRACKS = {
  fight: {
    bpm: 168,
    // acordes por compás (raíz MIDI de la quinta del power chord) — Mi menor: Em C D B / Em C G D
    chords: [40, 36, 38, 35, 40, 36, 43, 38],
    // melodía A (8 compases) y B (8 compases)
    lead: [
      [64, H, H, 67, H, H, 71, H, 69, H, 67, H, 66, H, 64, H],
      [67, H, H, H, 64, H, H, H, 60, H, 64, H, 67, H, 72, H],
      [74, H, H, 72, H, H, 71, H, 69, H, 71, H, 72, H, 74, H],
      [75, H, H, H, 71, H, H, H, 66, H, 71, H, 75, H, 78, H],
      [76, H, H, 74, H, H, 71, H, 74, H, 76, H, 79, H, 76, H],
      [72, H, H, H, 76, H, H, H, 79, H, H, H, 84, H, H, H],
      [83, H, H, 81, H, H, 79, H, 78, H, 79, H, 81, H, 83, H],
      [81, H, H, H, H, H, 78, H, 74, H, H, H, 78, H, 81, H],
    ],
    leadB: [
      [_, _, _, _, 71, H, 72, H, 74, H, H, H, 76, H, H, H],
      [_, _, _, _, 72, H, 71, H, 69, H, H, H, 67, H, H, H],
      [_, _, _, _, 69, H, 71, H, 72, H, H, H, 74, H, H, H],
      [75, H, H, H, H, H, H, H, 71, H, 75, H, 78, H, 83, H],
      [_, _, _, _, 71, H, 72, H, 74, H, H, H, 79, H, H, H],
      [_, _, _, _, 76, H, 74, H, 72, H, H, H, 76, H, H, H],
      [79, H, H, H, 78, H, H, H, 74, H, H, H, 71, H, H, H],
      [74, H, H, H, H, H, H, H, 78, H, H, H, 83, H, H, H],
    ],
    drums: {
      kick: [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      hat: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    },
    chug: [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0],
    bass: [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 0, 12],
  },
  menu: {
    bpm: 112,
    chords: [40, 36, 43, 38, 40, 36, 38, 35],
    lead: [
      [64, H, H, H, H, H, 71, H, H, H, 69, H, 67, H, 66, H],
      [67, H, H, H, H, H, H, H, 64, H, H, H, 72, H, H, H],
      [71, H, H, H, H, H, 74, H, H, H, 72, H, 71, H, 69, H],
      [69, H, H, H, H, H, H, H, 66, H, H, H, 74, H, H, H],
      [76, H, H, H, H, H, 79, H, H, H, 78, H, 76, H, 74, H],
      [72, H, H, H, H, H, H, H, 76, H, H, H, 79, H, H, H],
      [78, H, H, H, H, H, 74, H, H, H, 72, H, 74, H, 78, H],
      [75, H, H, H, H, H, H, H, H, H, H, H, 71, H, H, H],
    ],
    drums: {
      kick: [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0],
      snare: [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
      hat: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1],
    },
    chug: [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
    bass: [0, _, _, _, _, _, 0, _, _, _, 12, _, _, _, 7, _],
    brass: true,
  },
};

export class Audio {
  constructor() {
    this.ctx = null; this.muted = false; this.voice = true;
    this.track = null; this.timer = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx = (this.ctx = new AC());
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -16; this.comp.ratio.value = 4; this.comp.attack.value = 0.004; this.comp.release.value = 0.2;
      this.master = ctx.createGain(); this.master.gain.value = 0.62;
      this.comp.connect(this.master); this.master.connect(ctx.destination);
      this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.9; this.sfxBus.connect(this.comp);
      this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.42; this.musicBus.connect(this.comp);
      // reverb corta para dar espacio
      this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(1.6);
      this.revGain = ctx.createGain(); this.revGain.gain.value = 0.22;
      this.reverb.connect(this.revGain); this.revGain.connect(this.comp);
      // distorsión para las guitarras
      this.dist = ctx.createWaveShaper(); this.dist.curve = this.curve(28); this.dist.oversample = '2x';
      this.distLP = ctx.createBiquadFilter(); this.distLP.type = 'lowpass'; this.distLP.frequency.value = 2600;
      this.guitarGain = ctx.createGain(); this.guitarGain.gain.value = 0.28;
      this.dist.connect(this.distLP); this.distLP.connect(this.guitarGain); this.guitarGain.connect(this.musicBus);
      // eco para la melodía
      this.delay = ctx.createDelay(1); this.delayFb = ctx.createGain(); this.delayGain = ctx.createGain();
      this.delayFb.gain.value = 0.28; this.delayGain.gain.value = 0.22;
      this.delay.connect(this.delayFb); this.delayFb.connect(this.delay); this.delay.connect(this.delayGain); this.delayGain.connect(this.musicBus);
      this.noiseBuf = this.makeNoise(1);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.62, this.ctx.currentTime, 0.03);
    if (m) try { window.speechSynthesis?.cancel(); } catch { /* sin voz */ }
  }

  // ---------- utilidades ----------
  impulse(sec) {
    const ctx = this.ctx, len = Math.floor(ctx.sampleRate * sec);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }
  curve(k) {
    const n = 2048, c = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((1 + k) * x) / (1 + k * Math.abs(x)); }
    return c;
  }
  makeNoise(sec) {
    const ctx = this.ctx, buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * sec), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  env(g, t, a, peak, dur, end = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(end, t + dur);
  }
  osc(type, f, t, dur, dest, gain, a = 0.004, detune = 0) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    const g = ctx.createGain(); this.env(g, t, a, gain, dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
    return o;
  }
  noiseHit(t, dur, freq, gain, type, dest, q = 0.8) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource(); src.buffer = this.noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = ctx.createGain(); this.env(g, t, 0.002, gain, dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
  }

  // ---------- instrumentos ----------
  kick(t, dest = this.musicBus, gain = 1) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    const g = ctx.createGain(); this.env(g, t, 0.002, 1.1 * gain, 0.32);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + 0.4);
    this.noiseHit(t, 0.02, 3000, 0.25 * gain, 'highpass', dest);
  }
  snare(t, gain = 1) {
    this.noiseHit(t, 0.18, 1800, 0.75 * gain, 'bandpass', this.musicBus, 0.6);
    this.noiseHit(t, 0.18, 1800, 0.3 * gain, 'bandpass', this.reverb, 0.6);
    this.osc('triangle', 190, t, 0.1, this.musicBus, 0.45 * gain);
  }
  hat(t, open = false) { this.noiseHit(t, open ? 0.16 : 0.035, 8000, open ? 0.2 : 0.16, 'highpass', this.musicBus); }
  crash(t) { this.noiseHit(t, 1.4, 6000, 0.3, 'highpass', this.musicBus); this.noiseHit(t, 1.4, 6000, 0.2, 'highpass', this.reverb); }
  bass(t, m, dur) {
    const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(this.musicBus);
    this.osc('sawtooth', hz(m), t, dur, lp, 0.42);
    this.osc('square', hz(m - 12), t, dur, lp, 0.25);
  }
  power(t, root, dur, gain = 0.5) {
    for (const [iv, dt] of [[0, -8], [0, 8], [7, -5], [12, 4]]) this.osc('sawtooth', hz(root + iv), t, dur, this.dist, gain, 0.003, dt);
  }
  lead(t, m, dur) {
    const ctx = this.ctx;
    const g = ctx.createGain(); this.env(g, t, 0.01, 0.2, dur * 0.98, 0.02);
    g.gain.setTargetAtTime(0.0001, t + dur, 0.04);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
    g.connect(lp); lp.connect(this.musicBus); lp.connect(this.delay); lp.connect(this.reverb);
    const vib = ctx.createOscillator(); vib.frequency.value = 5.5; const vg = ctx.createGain(); vg.gain.value = dur > 0.25 ? 9 : 0;
    vib.connect(vg);
    for (const [type, det] of [['square', -6], ['sawtooth', 6]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(hz(m), t); o.detune.value = det;
      vg.connect(o.detune);
      o.connect(g); o.start(t); o.stop(t + dur + 0.25);
    }
    vib.start(t + 0.12); vib.stop(t + dur + 0.25);
  }
  brass(t, root, dur) {
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2200, t + 0.25);
    lp.connect(this.musicBus); lp.connect(this.reverb);
    for (const iv of [12, 19, 24, 27]) {
      const third = iv === 27 && [36, 43].includes(root) ? 28 : iv; // mayor en C y G
      this.osc('sawtooth', hz(root + third), t, dur, lp, 0.07, 0.12, (Math.random() - 0.5) * 14);
    }
  }
  timpani(t) {
    const o = this.ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.5);
    const g = this.ctx.createGain(); this.env(g, t, 0.004, 0.8, 0.9);
    o.connect(g); g.connect(this.musicBus); g.connect(this.reverb); o.start(t); o.stop(t + 1);
  }

  // ---------- música ----------
  startMusic(name = 'fight') {
    if (!this.ensure()) return;
    if (this.track === name) return;
    this.stopMusic();
    const tr = TRACKS[name];
    this.track = name;
    const ctx = this.ctx, step = 60 / tr.bpm / 4;
    let i = 0, next = ctx.currentTime + 0.12;
    this.musicBus.gain.cancelScheduledValues(ctx.currentTime);
    this.musicBus.gain.setValueAtTime(0.42, ctx.currentTime);
    const tick = () => {
      while (next < ctx.currentTime + 0.18) {
        const bar = Math.floor(i / 16), s = i % 16;
        const b8 = bar % 8, section = Math.floor(bar / 8) % 2; // A, B
        const root = tr.chords[b8];
        const D = tr.drums;
        // batería
        if (D.kick[s]) this.kick(next);
        if (name === 'fight' && section === 1 && s % 4 === 2) this.kick(next, this.musicBus, 0.6);
        if (D.snare[s]) this.snare(next);
        if (D.hat[s]) this.hat(next, s === 14);
        if (s === 0 && b8 === 0) this.crash(next);
        if (name === 'fight' && b8 === 7 && s >= 12) this.snare(next, 0.6 + (s - 12) * 0.12);
        // bajo
        const bp = tr.bass[s];
        if (name === 'fight') { if (s % 2 === 0) this.bass(next, root + (bp || 0), step * 1.6); }
        else if (bp !== _ || s === 0) this.bass(next, root + (bp || 0), step * 5);
        // guitarras / metales
        if (tr.brass) {
          if (s === 0) { this.brass(next, root, step * 15); this.timpani(next); }
          if (s === 10) this.timpani(next);
          if (tr.chug[s]) this.power(next, root, step * 3, 0.22);
        } else if (tr.chug[s]) {
          const long = s === 0 && b8 % 2 === 0;
          this.power(next, root, long ? step * 1.9 : step * 0.8, long ? 0.5 : 0.38);
        }
        // arpegio en la sección B de la pelea
        if (name === 'fight' && section === 1 && s % 2 === 1) {
          const arp = [12, 19, 24, 19][(s >> 1) % 4];
          this.osc('square', hz(root + arp + 12), next, step * 0.8, this.musicBus, 0.05);
        }
        // melodía
        const mel = (section === 1 && tr.leadB ? tr.leadB : tr.lead)[b8];
        const n = mel[s];
        if (n > 0) {
          let len = 1; while (s + len < 16 && mel[s + len] === H) len++;
          this.lead(next, n + (name === 'menu' ? 0 : 0), step * len);
        }
        next += step; i++;
      }
    };
    tick();
    this.timer = setInterval(tick, 25);
  }
  stopMusic(fade = 0) {
    if (this.timer) clearInterval(this.timer);
    this.timer = null; this.track = null;
    if (this.ctx && fade) {
      const t = this.ctx.currentTime;
      this.musicBus.gain.setValueAtTime(this.musicBus.gain.value, t);
      this.musicBus.gain.linearRampToValueAtTime(0.0001, t + fade);
    }
  }

  // ---------- locutor ----------
  // line('round1', 'Round 1'): usa el mp3 si existe; si no, la voz del navegador
  async loadVoice(key) {
    if (!VOICE_URLS[key] || !this.ensure()) return null;
    this.voiceBufs ||= {};
    if (!this.voiceBufs[key]) {
      this.voiceBufs[key] = fetch(VOICE_URLS[key]).then((r) => r.arrayBuffer()).then((b) => this.ctx.decodeAudioData(b)).catch(() => null);
    }
    return this.voiceBufs[key];
  }
  preloadVoices() { Object.keys(VOICE_URLS).forEach((k) => this.loadVoice(k)); }
  hasVoice(key) { return !!VOICE_URLS[key]; }
  async line(key, fallback, opts) { return this.lines([[key, fallback]], opts); }
  // varias frases seguidas (p. ej. nombre · contra · nombre)
  async lines(list, opts = {}) {
    if (this.muted || !this.voice) return;
    const token = (this.voiceToken = (this.voiceToken || 0) + 1);
    if (this.voiceSrc) { try { this.voiceSrc.stop(); } catch { /* ya terminó */ } this.voiceSrc = null; }
    const bufs = await Promise.all(list.map(([k]) => this.loadVoice(k)));
    if (token !== this.voiceToken) return;
    if (bufs.every(Boolean)) {
      if (!this.voiceGain) { this.voiceGain = this.ctx.createGain(); this.voiceGain.gain.value = 1.4; this.voiceGain.connect(this.master); }
      let t = this.ctx.currentTime + 0.02;
      for (const b of bufs) {
        const src = this.ctx.createBufferSource(); src.buffer = b; src.connect(this.voiceGain); src.start(t);
        this.voiceSrc = src; t += b.duration + 0.08;
      }
      // baja un poco la música mientras habla
      const g = this.musicBus.gain, now = this.ctx.currentTime;
      g.cancelScheduledValues(now); g.setTargetAtTime(0.22, now, 0.05); g.setTargetAtTime(0.42, t, 0.25);
      return;
    }
    this.say(list.map(([, txt]) => txt).join('. '), opts);
  }
  say(text, { rate = 0.95, pitch = 0.55 } = {}) {
    if (this.muted || !this.voice) return;
    try {
      const s = window.speechSynthesis; if (!s) return;
      s.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = s.getVoices().find((x) => /^es/i.test(x.lang));
      if (v) u.voice = v;
      u.lang = v?.lang || 'es-ES'; u.rate = rate; u.pitch = pitch; u.volume = 1;
      s.speak(u);
    } catch { /* sin voz disponible */ }
  }

  // ---------- efectos ----------
  play(name) {
    if (!this.ensure() || this.muted) return;
    const t = this.ctx.currentTime, B = this.sfxBus;
    switch (name) {
      case 'swing': this.noiseHit(t, 0.12, 2400, 0.35, 'bandpass', B, 0.7); break;
      case 'hit':
        this.noiseHit(t, 0.1, 1200, 1.0, 'bandpass', B); this.kick(t, B, 0.55); break;
      case 'hitHeavy':
        this.noiseHit(t, 0.22, 700, 1.3, 'bandpass', B); this.kick(t, B, 1); this.noiseHit(t, 0.3, 500, 0.5, 'lowpass', this.reverb); break;
      case 'block': this.osc('triangle', 1400, t, 0.08, B, 0.3); this.noiseHit(t, 0.06, 4000, 0.4, 'highpass', B); break;
      case 'jump': this.osc('triangle', 320, t, 0.12, B, 0.15); break;
      case 'land': this.noiseHit(t, 0.1, 220, 0.6, 'lowpass', B); break;
      case 'grab': this.noiseHit(t, 0.08, 700, 0.7, 'bandpass', B); break;
      case 'throw': this.kick(t, B, 1.2); this.noiseHit(t, 0.35, 300, 1.1, 'lowpass', B); break;
      case 'charge': {
        const o = this.ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(900, t + 0.25);
        const g = this.ctx.createGain(); this.env(g, t, 0.01, 0.18, 0.3); o.connect(g); g.connect(B); o.start(t); o.stop(t + 0.35); break;
      }
      case 'fire': this.noiseHit(t, 0.45, 900, 0.9, 'bandpass', B, 0.4); this.noiseHit(t, 0.45, 900, 0.4, 'bandpass', this.reverb, 0.4); this.osc('sawtooth', 160, t, 0.3, B, 0.2); break;
      case 'super':
        this.crash(t); this.timpani(t);
        for (const m of [40, 47, 52, 59]) this.osc('sawtooth', hz(m), t, 1.2, this.dist, 0.35);
        break;
      case 'ko':
        this.kick(t, B, 1.4); this.crash(t);
        for (const m of [40, 47, 52]) this.osc('sawtooth', hz(m), t, 2.2, this.dist, 0.4);
        break;
      case 'bell': this.osc('triangle', 880, t, 0.6, B, 0.3); this.osc('sine', 1320, t, 0.6, B, 0.15); break;
      case 'select': this.osc('square', 660, t, 0.06, B, 0.12); this.osc('square', 990, t + 0.05, 0.08, B, 0.1); break;
      case 'confirm': this.osc('square', 523, t, 0.1, B, 0.15); this.osc('square', 784, t + 0.08, 0.1, B, 0.15); this.osc('square', 1046, t + 0.16, 0.25, B, 0.15); break;
      case 'vs':
        this.crash(t); this.kick(t, B, 1.4); this.timpani(t);
        for (const m of [40, 47, 52, 55, 59]) this.osc('sawtooth', hz(m), t, 1.8, this.dist, 0.3);
        break;
      default: break;
    }
  }
}
