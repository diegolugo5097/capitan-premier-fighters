import { useEffect, useRef, useState, useCallback } from 'react';
import { loadSprites } from './game/sprites.js';
import { Game } from './game/engine.js';
import { Keyboard } from './game/input.js';
import { Audio } from './game/audio.js';
import { renderStage, drawLights, W, H, RES } from './game/stage.js';
import { ROSTER, moveList } from './game/characters.js';
import TouchControls from './TouchControls.jsx';
import logoUrl from './assets/logo.webp';
import GamepadBridge from './GamepadBridge.jsx';
import './styles.css';

const audio = new Audio();

function useSprites() {
  const [sprites, setSprites] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => {
    Promise.all([
      loadSprites(),
      document.fonts ? Promise.all([document.fonts.load('26px Bungee'), document.fonts.load('12px "Press Start 2P"'), document.fonts.load('700 14px "Chakra Petch"')]).catch(() => {}) : null,
    ]).then(([s]) => setSprites(s)).catch(() => setError('No se pudieron cargar los luchadores.'));
  }, []);
  return { sprites, error };
}

// Fondo: la calle frente al Café Premier, en pixel art
function StageBackdrop({ dim = 0.5 }) {
  const ref = useRef(null);
  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    const stage = renderStage();
    let t = 0, raf;
    const draw = () => {
      t++;
      ctx.setTransform(RES, 0, 0, RES, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(stage, 0, 0, W, H);
      drawLights(ctx, t);
      ctx.fillStyle = `rgba(3,7,20,${dim})`; ctx.fillRect(0, 0, W, H);
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [dim]);
  return <canvas ref={ref} width={W * RES} height={H * RES} className="screen" aria-hidden="true" />;
}

const Logo = ({ small }) => (
  <h1 className={`logo-img ${small ? 'small' : ''}`}>
    <img src={logoUrl} alt="Capitán Premier Fighters" />
  </h1>
);

// ---------- Título ----------
function TitleScreen({ level, setLevel, onStart }) {
  const [stage, setStage] = useState('press'); // press → menu
  const [bio, setBio] = useState(-1);
  const [sel, setSel] = useState(0);
  const items = [
    { id: 'cpu', label: 'Arcade', sub: '1 jugador contra la CPU' },
    { id: '2p', label: 'Versus', sub: '2 jugadores, mismo teclado' },
  ];
  useEffect(() => {
    let idle = 0;
    const id = setInterval(() => { idle++; if (idle >= 2) setBio((b) => (b + 1) % ROSTER.length); }, 4200);
    const reset = () => { idle = 0; setBio(-1); };
    window.addEventListener('pointerdown', reset); window.addEventListener('keydown', reset);
    return () => { clearInterval(id); window.removeEventListener('pointerdown', reset); window.removeEventListener('keydown', reset); };
  }, []);
  const press = useCallback(() => { audio.ensure(); audio.preloadVoices(); audio.play('confirm'); audio.startMusic('menu'); audio.line('titulo', 'Capitán Premier Fighters'); setStage('menu'); }, []);
  useEffect(() => {
    const onKey = (e) => {
      if (stage === 'press') { if (['Enter', 'Space', 'KeyJ'].includes(e.code)) { e.preventDefault(); press(); } return; }
      if (['KeyW', 'ArrowUp'].includes(e.code)) { setSel((i) => (i + items.length - 1) % items.length); audio.play('select'); }
      if (['KeyA', 'KeyD'].includes(e.code)) {
        const L = ['facil', 'normal', 'dificil'];
        setLevel(L[Math.max(0, Math.min(2, L.indexOf(level) + (e.code === 'KeyD' ? 1 : -1)))]); audio.play('select');
      }
      if (['KeyS', 'ArrowDown'].includes(e.code)) { setSel((i) => (i + 1) % items.length); audio.play('select'); }
      if (['Enter', 'Space', 'KeyJ'].includes(e.code)) { e.preventDefault(); audio.play('confirm'); onStart(items[sel].id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  const ch = bio >= 0 ? ROSTER[bio] : null;
  return (
    <div className="title-screen">
      <StageBackdrop dim={0.6} />
      <div className="rays" aria-hidden="true" />
      <div className="lineup" aria-hidden="true">
        <img className="lu lu-l" src={ROSTER[1].portrait} alt="" />
        <img className="lu lu-r" src={ROSTER[2].portrait} alt="" />
        <img className="lu lu-c" src={ROSTER[0].portrait} alt="" />
      </div>
      <div className="title-fade" aria-hidden="true" />
      {ch ? (
        <div className="bio-wrap" key={ch.id}>
          <div className="bio-card" style={{ '--c': ch.color }}>
            <img src={ch.portrait} alt={ch.name} />
            <div>
              <p className="tag-line">{ch.title}</p>
              <h2>{ch.name}</h2>
              <p>{ch.bio}</p>
              <p className="special-line">Especial: <strong>{ch.moves.lupa.name}</strong> · Súper: <strong>{ch.moves.super.name}</strong></p>
            </div>
          </div>
        </div>
      ) : (
        <div className="title-ui">
          <Logo />
          {stage === 'press' ? (
            <button className="press-start" onClick={press}>Presiona start</button>
          ) : (
            <div className="main-menu" role="menu">
              {items.map((it, i) => (
                <button key={it.id} role="menuitem" className={`slant-btn ${i === sel ? 'on' : ''}`}
                  onMouseEnter={() => setSel(i)} onClick={() => { audio.play('confirm'); onStart(it.id); }}>
                  <span>{it.label}</span><small>{it.sub}</small>
                </button>
              ))}
              <div className="diff" role="group" aria-label="Dificultad de la CPU">
                {[['facil', 'Fácil'], ['normal', 'Normal'], ['dificil', 'Difícil']].map(([v, l]) => (
                  <button key={v} className={`diff-chip ${level === v ? 'on' : ''}`} onClick={() => { setLevel(v); audio.play('select'); }} aria-pressed={level === v}>{l}</button>
                ))}
              </div>
            </div>
          )}
          <p className="credits">© Café Premier · Circasia · Créditos 99</p>
        </div>
      )}
    </div>
  );
}

// ---------- Selección de personaje (estilo arcade) ----------
function SelectScreen({ mode, onDone, onBack }) {
  const N = ROSTER.length;
  const [c1, setC1] = useState(0);
  const [c2, setC2] = useState(1);
  const [lock1, setLock1] = useState(false);
  const [lock2, setLock2] = useState(false);
  const [cpuSpin, setCpuSpin] = useState(1);
  const [time, setTime] = useState(20);
  const done = useRef(false);
  const cpu = mode === 'cpu';

  useEffect(() => { audio.line('elige', '¡Elige tu luchador!'); }, []);

  // la CPU "baraja" retratos hasta que el jugador elige
  useEffect(() => {
    if (!cpu || lock2) return;
    const id = setInterval(() => setCpuSpin((i) => (i + 1) % N), 110);
    return () => clearInterval(id);
  }, [cpu, lock2, N]);

  const finish = useCallback((a, b) => {
    if (done.current) return; done.current = true;
    setTimeout(() => onDone(ROSTER[a], ROSTER[b]), 900);
  }, [onDone]);

  const confirm1 = useCallback(() => {
    if (lock1) return;
    setLock1(true); audio.play('confirm');
    if (cpu) {
      const others = ROSTER.map((_, i) => i).filter((i) => i !== c1);
      const pick = others[Math.floor(Math.random() * others.length)];
      setTimeout(() => { setCpuSpin(pick); setC2(pick); setLock2(true); audio.play('confirm'); finish(c1, pick); }, 700);
    } else if (lock2) finish(c1, c2);
  }, [lock1, lock2, cpu, c1, c2, finish]);
  const confirm2 = useCallback(() => {
    if (cpu || lock2) return;
    setLock2(true); audio.play('confirm');
    if (lock1) finish(c1, c2);
  }, [cpu, lock1, lock2, c1, c2, finish]);

  // cuenta regresiva: al llegar a 0 se elige lo que esté marcado
  useEffect(() => {
    const id = setInterval(() => setTime((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => { if (time === 0) { confirm1(); confirm2(); } }, [time, confirm1, confirm2]);

  useEffect(() => {
    const onKey = (e) => {
      const mv = (set, d) => { set((i) => (i + d + N) % N); audio.play('select'); };
      if (!lock1) {
        if (e.code === 'KeyA' || (cpu && e.code === 'ArrowLeft')) mv(setC1, -1);
        if (e.code === 'KeyD' || (cpu && e.code === 'ArrowRight')) mv(setC1, 1);
        if (['KeyJ', 'Space'].includes(e.code) || (cpu && e.code === 'Enter')) { e.preventDefault(); confirm1(); }
      }
      if (!cpu && !lock2) {
        if (e.code === 'ArrowLeft') mv(setC2, -1);
        if (e.code === 'ArrowRight') mv(setC2, 1);
        if (['KeyN', 'Enter', 'Numpad1'].includes(e.code)) { e.preventDefault(); confirm2(); }
      }
      if (e.code === 'Escape') onBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lock1, lock2, cpu, N, confirm1, confirm2, onBack]);

  const tap = (i) => {
    if (!lock1) { if (i === c1) confirm1(); else { setC1(i); audio.play('select'); } return; }
    if (!cpu && !lock2) { if (i === c2) confirm2(); else { setC2(i); audio.play('select'); } }
  };
  const left = ROSTER[c1];
  const right = ROSTER[cpu ? (lock2 ? c2 : cpuSpin) : c2];
  return (
    <div className="select-screen">
      <div className="sel-bg" aria-hidden="true" />
      <div className="sel-head">
        <span>Elige tu luchador</span>
        <b className={time <= 5 ? 'hurry' : ''}>{String(time).padStart(2, '0')}</b>
      </div>
      <div className={`sel-big left ${lock1 ? 'locked' : ''}`} style={{ '--c': left.color }}>
        <img src={left.portrait} alt="" key={left.id} />
        <div className="plate"><small>1P</small>{left.name}</div>
      </div>
      <div className={`sel-big right ${lock2 ? 'locked' : ''} ${cpu && !lock2 ? 'spinning' : ''}`} style={{ '--c': right.color }}>
        <img src={right.portrait} alt="" key={right.id + (cpu && !lock2 ? 'spin' : '')} />
        <div className="plate"><small>{cpu ? 'CPU' : '2P'}</small>{cpu && !lock2 ? '???' : right.name}</div>
      </div>
      <div className="sel-grid" role="listbox" aria-label="Luchadores">
        {ROSTER.map((r, i) => (
          <button key={r.id} role="option" aria-selected={i === c1} className="tile" onClick={() => tap(i)} aria-label={r.name}>
            <span className="tile-face">
              <img src={r.portrait} alt="" style={{ height: `${(560 / r.face[3]) * 100}%`, left: `${(-r.face[0] / r.face[3]) * 100}%`, top: `${(-r.face[1] / r.face[3]) * 100}%` }} />
            </span>
            {i === c1 && <span className={`cursor p1 ${lock1 ? 'lock' : ''}`}>1P</span>}
            {((cpu && lock2 && i === c2) || (!cpu && i === c2)) && <span className={`cursor p2 ${lock2 ? 'lock' : ''}`}>{cpu ? 'CPU' : '2P'}</span>}
          </button>
        ))}
      </div>
      <p className="sel-help">{lock1 ? (cpu ? '¡Prepárate!' : lock2 ? '¡Prepárate!' : 'Jugador 2: flechas y Enter') : 'A / D para moverte · J para elegir · toca dos veces en el celular'}</p>
      <button className="back-link" onClick={onBack}>‹ Volver</button>
    </div>
  );
}

// ---------- Pantalla VS ----------
function VsScreen({ p1, p2, onDone }) {
  useEffect(() => {
    audio.stopMusic(0.3);
    audio.play('vs');
    audio.lines([[`nombre_${p1.id}`, p1.name.toLowerCase()], ['contra', 'contra'], [`nombre_${p2.id}`, p2.name.toLowerCase()]], { rate: 1, pitch: 0.5 });
    const id = setTimeout(onDone, 3000);
    return () => clearTimeout(id);
  }, [onDone, p1, p2]);
  return (
    <div className="vs" onClick={onDone}>
      <div className="vs-half left" style={{ '--c': p1.color }}>
        <img src={p1.portrait} alt={p1.name} />
        <div className="vs-name">{p1.name}</div>
      </div>
      <div className="vs-half right" style={{ '--c': p2.color }}>
        <img src={p2.portrait} alt={p2.name} className={p1.id === p2.id ? 'alt' : ''} />
        <div className="vs-name">{p2.name}</div>
      </div>
      <div className="vs-bolt" aria-hidden="true" />
      <div className="vs-mark">VS</div>
    </div>
  );
}

// ---------- Pelea ----------
function FightCanvas({ sprites, mode, level, p1, p2, onExit, paused, setPaused, showBoxes, gameRef }) {
  const ref = useRef(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const ctx = ref.current.getContext('2d');
    const game = new Game({
      sprites, audio, mode, level, p1Char: p1, p2Char: p2,
      onEvent: (e) => {
        if (e.type !== 'matchOver') return;
        setResult(e.winner);
        if (mode === 'cpu') audio.line(e.winner === 1 ? 'ganaste' : 'perdiste', e.winner === 1 ? '¡Ganaste!' : 'Perdiste');
      },
    });
    gameRef.current = game;
    if (location.hash === '#debug') window.__game = game;
    const kb = new Keyboard(game.pad1, game.pad2);
    kb.twoPlayers = mode === '2p';
    kb.attach();
    audio.startMusic('fight');
    let raf, last = performance.now(), acc = 0;
    const STEP = 1000 / 60;
    const loop = (now) => {
      acc += Math.min(100, now - last); last = now;
      while (acc >= STEP) { game.update(); acc -= STEP; }
      game.render(ctx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); kb.detach(); gameRef.current = null; };
  }, [sprites, mode, level, p1, p2, gameRef]);

  useEffect(() => { if (gameRef.current) gameRef.current.paused = paused || !!result; }, [paused, result, gameRef]);
  useEffect(() => { if (gameRef.current) gameRef.current.showBoxes = showBoxes; }, [showBoxes, gameRef]);

  const rematch = () => {
    const g = gameRef.current;
    if (!g) return;
    g.p1.wins = 0; g.p2.wins = 0; g.p1.meter = 0; g.p2.meter = 0;
    g.round = 1; g.over = false; g.startRound();
    setResult(null);
  };
  const winner = result === 1 ? p1 : p2;
  const loser = result === 1 ? p2 : p1;

  return (
    <>
      <canvas ref={ref} width={W * RES} height={H * RES} className="screen" />
      {result && (
        <div className="result" style={{ '--c': winner.color }}>
          <img className="result-loser" src={loser.portrait} alt="" />
          <img className="result-winner" src={winner.portrait} alt={winner.name} />
          <div className="result-box">
            <p className="result-tag">{mode === 'cpu' ? (result === 1 ? '¡Ganaste!' : 'Perdiste') : `Gana el jugador ${result}`}</p>
            <h2>{winner.name}</h2>
            <blockquote>“{winner.quote}”</blockquote>
            <div className="result-actions">
              <button className="slant-btn small on" onClick={rematch} autoFocus><span>Revancha</span></button>
              <button className="slant-btn small" onClick={onExit}><span>Menú</span></button>
            </div>
          </div>
        </div>
      )}
      {paused && !result && (
        <div className="overlay">
          <div className="panel wide">
            <p className="eyebrow">Pausa · {p1.name}</p>
            <MoveList mode={mode} ch={p1} />
            <div className="row">
              <button className="btn primary" onClick={() => setPaused(false)} autoFocus>Seguir peleando</button>
              <button className="btn" onClick={onExit}>Salir al menú</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function MoveList({ mode, ch }) {
  return (
    <div className="moves">
      <table>
        <tbody>
          {moveList(ch).map(([n, k]) => (
            <tr key={n}><td>{n}</td><td><kbd>{k}</kbd></td></tr>
          ))}
        </tbody>
      </table>
      <p className="note">
        Movimiento: <kbd>W A S D</kbd>{mode === 'cpu' ? <> o flechas</> : null}. Pausa: <kbd>Esc</kbd>. Cajas de golpe: <kbd>H</kbd>.
        {mode === '2p' && <> Jugador 2: flechas, <kbd>N M , .</kbd> para golpes, <kbd>/</kbd> agarre, <kbd>Shift der.</kbd> súper.</>}
        {' '}Las direcciones son relativas: → es hacia el rival.
        {' '}Con control: <kbd>X</kbd> puño · <kbd>Y</kbd> fuerte · <kbd>A</kbd> patada · <kbd>B</kbd> fuerte · <kbd>LB</kbd> agarre · <kbd>RB</kbd> súper · <kbd>Start</kbd> pausa.
      </p>
    </div>
  );
}

export default function App() {
  const { sprites, error } = useSprites();
  const [screen, setScreen] = useState('title');
  const [mode, setMode] = useState('cpu');
  const [level, setLevel] = useState('normal');
  const [pair, setPair] = useState([ROSTER[0], ROSTER[1]]);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [voice, setVoice] = useState(true);
  const [showBoxes, setShowBoxes] = useState(false);
  const [touch, setTouch] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches);
  const [helpCh, setHelpCh] = useState(0);
  const [gpConfig, setGpConfig] = useState(false);
  const gameRef = useRef(null);

  const start = (m) => { setMode(m); setScreen('select'); audio.ensure(); audio.startMusic('menu'); };
  const chosen = useCallback((a, b) => { setPair([a, b]); setScreen('vs'); }, []);
  const fight = useCallback(() => { setPaused(false); setScreen('fight'); }, []);
  const exit = useCallback(() => { setScreen('title'); setPaused(false); audio.startMusic('menu'); }, []);
  const back = useCallback(() => setScreen('title'), []);

  useEffect(() => { audio.setMuted(muted); }, [muted]);
  useEffect(() => { audio.voice = voice; }, [voice]);

  useEffect(() => {
    const onKey = (e) => {
      if (screen !== 'fight') return;
      if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); setPaused((p) => !p); }
      if (e.code === 'KeyH') setShowBoxes((b) => !b);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen]);

  return (
    <main className="cabinet">
      <div className={`stage-wrap s-${screen}`}>
        {!sprites && !error && <div className="loading"><img src={logoUrl} alt="" className="loading-logo" /><span>Cargando luchadores…</span></div>}
        {error && <div className="loading">{error}</div>}
        {sprites && screen === 'title' && <TitleScreen level={level} setLevel={setLevel} onStart={start} />}
        {sprites && screen === 'select' && <SelectScreen mode={mode} onDone={chosen} onBack={back} />}
        {sprites && screen === 'vs' && <VsScreen p1={pair[0]} p2={pair[1]} onDone={fight} />}
        {sprites && screen === 'fight' && (
          <FightCanvas sprites={sprites} mode={mode} level={level} p1={pair[0]} p2={pair[1]} onExit={exit}
            paused={paused} setPaused={setPaused} showBoxes={showBoxes} gameRef={gameRef} />
        )}
      </div>

      <div className="bar">
        {screen === 'fight' && <button className="mini" onClick={() => setPaused((p) => !p)}>{paused ? 'Seguir' : 'Pausa'}</button>}
        <button className="mini" onClick={() => { audio.ensure(); setMuted((m) => !m); }} aria-pressed={muted}>{muted ? 'Sonido: no' : 'Sonido: sí'}</button>
        <button className="mini" onClick={() => setVoice((v) => !v)} aria-pressed={voice}>{voice ? 'Locutor: sí' : 'Locutor: no'}</button>
        <button className="mini" onClick={() => { setGpConfig(true); if (screen === 'fight') setPaused(true); }}>Controles</button>
        <button className="mini" onClick={() => setTouch((t) => !t)} aria-pressed={touch}>{touch ? 'Ocultar controles táctiles' : 'Controles táctiles'}</button>
        {screen === 'fight' && <button className="mini" onClick={() => setShowBoxes((b) => !b)} aria-pressed={showBoxes}>Cajas de golpe</button>}
      </div>

      <GamepadBridge screen={screen} mode={mode} gameRef={gameRef} configOpen={gpConfig} setConfigOpen={setGpConfig} />

      {screen === 'fight' && touch && <TouchControls gameRef={gameRef} specials={pair[0].specials} />}

      {screen === 'title' && (
        <section className="help">
          <div className="help-head">
            <h3>Movimientos</h3>
            <div className="help-tabs" role="tablist">
              {ROSTER.map((r, i) => (
                <button key={r.id} role="tab" aria-selected={i === helpCh} className={`diff-chip ${i === helpCh ? 'on' : ''}`} onClick={() => setHelpCh(i)}>{r.short}</button>
              ))}
            </div>
          </div>
          <MoveList mode="cpu" ch={ROSTER[helpCh]} />
        </section>
      )}
    </main>
  );
}
