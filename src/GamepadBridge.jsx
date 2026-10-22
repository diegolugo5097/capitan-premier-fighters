// Conecta los controles con el juego:
// - En la pelea: control 1 → jugador 1, control 2 → jugador 2 (contra la CPU, cualquier control mueve al jugador 1).
// - En los menús: los controles se traducen a teclas (cruceta = A/D/W/S, botón = J/Enter, B = Escape).
// - Con la pausa o el resultado abiertos: la cruceta mueve el foco y el botón lo activa.
// También muestra avisos de conexión y la pantalla para configurar botones.
import { useEffect, useRef, useState } from 'react';
import { gamepads, ACTIONS, shortName } from './game/gamepad.js';

function key(code, type = 'keydown') {
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code, bubbles: true }));
}
function tapKey(code) { key(code); setTimeout(() => key(code, 'keyup'), 30); }

const P1_KEYS = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', ok: 'KeyJ', back: 'Escape' };
const P2_KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight', ok: 'Enter', back: 'Escape' };

function focusNav(pressed) {
  const btns = [...document.querySelectorAll('.stage-wrap .overlay button, .stage-wrap .result button')];
  if (!btns.length) return false;
  let i = btns.indexOf(document.activeElement);
  if (i < 0) { btns[0].focus(); i = 0; }
  if (pressed.left || pressed.up) btns[(i + btns.length - 1) % btns.length].focus();
  if (pressed.right || pressed.down) btns[(i + 1) % btns.length].focus();
  if (pressed.lk || pressed.lp) document.activeElement?.click();
  return true;
}

export default function GamepadBridge({ screen, mode, gameRef, configOpen, setConfigOpen }) {
  const [pads, setPads] = useState([]);
  const [toast, setToast] = useState(null);
  const live = useRef({ screen, mode });
  live.current = { screen, mode, configOpen };

  // avisos de conexión
  useEffect(() => {
    const refresh = () => setPads(gamepads.list().map((g) => ({ index: g.index, id: g.id, name: shortName(g.id), standard: g.mapping === 'standard', custom: gamepads.isCustom(g) })));
    const on = (e) => {
      refresh();
      const n = gamepads.list().findIndex((g) => g.index === e.gamepad.index) + 1;
      setToast(e.type === 'gamepadconnected' ? `Control ${n} conectado: ${shortName(e.gamepad.id)}` : `Control desconectado`);
      setTimeout(() => setToast(null), 2600);
    };
    window.addEventListener('gamepadconnected', on);
    window.addEventListener('gamepaddisconnected', on);
    const id = setInterval(refresh, 1500);
    refresh();
    return () => { window.removeEventListener('gamepadconnected', on); window.removeEventListener('gamepaddisconnected', on); clearInterval(id); };
  }, []);

  // ciclo de lectura
  useEffect(() => {
    let raf;
    const loop = () => {
      const slots = gamepads.poll();
      const { screen: sc, mode: md, configOpen: cfg } = live.current;
      const game = gameRef.current;
      if (!cfg && !gamepads.capture) {
        const overlayOpen = !!document.querySelector('.stage-wrap .overlay button, .stage-wrap .result button');
        if (sc === 'fight' && game && !overlayOpen && !game.paused) {
          // pelea
          const pads = [game.pad1, game.pad2];
          const merged = [{}, {}];
          slots.forEach((s, i) => {
            const target = md === 'cpu' ? 0 : Math.min(i, 1);
            for (const a in s.state) merged[target][a] = merged[target][a] || s.state[a];
            for (const a in s.pressed) if (s.pressed[a] && a !== 'start') pads[target].tapped[a] = true;
            if (s.pressed.start) tapKey('Escape');
          });
          pads[0].gp = merged[0];
          if (md !== 'cpu') pads[1].gp = merged[1];
        } else {
          if (game) { game.pad1.gp = {}; game.pad2.gp = {}; }
          slots.forEach((s, i) => {
            const p = s.pressed;
            if (sc === 'fight') {
              if (p.start) { tapKey('Escape'); return; }
              focusNav(p);
              return;
            }
            const K = sc === 'select' && md === '2p' && i === 1 ? P2_KEYS : P1_KEYS;
            if (p.up) tapKey(K.up);
            if (p.down) tapKey(K.down);
            if (p.left) tapKey(K.left);
            if (p.right) tapKey(K.right);
            if (p.lk || p.lp || p.start) tapKey(sc === 'title' ? 'Enter' : K.ok);
            if (p.hk && sc !== 'title') tapKey(K.back);
            if (sc === 'vs' && (p.lk || p.lp || p.start)) document.querySelector('.vs')?.click();
          });
        }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [gameRef]);

  return (
    <>
      {toast && <div className="gp-toast" role="status">{toast}</div>}
      {configOpen && <GamepadConfig pads={pads} onClose={() => setConfigOpen(false)} />}
    </>
  );
}

function GamepadConfig({ pads, onClose }) {
  const [busy, setBusy] = useState(null); // { index, step }
  const [live, setLive] = useState({});
  const [, force] = useState(0);

  // estado en vivo para probar los botones
  useEffect(() => {
    let raf;
    const loop = () => {
      const st = {};
      for (const g of gamepads.list()) st[g.index] = gamepads.read(g);
      setLive(st);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); gamepads.cancelCapture(); };
  }, []);

  const start = (index) => {
    gamepads.startCapture(index, (step) => setBusy({ index, step }), () => { setBusy(null); force((n) => n + 1); });
  };

  return (
    <div className="gp-modal" role="dialog" aria-label="Configurar controles">
      <div className="gp-panel">
        <div className="gp-head">
          <h2>Controles</h2>
          <button className="mini" onClick={onClose}>Cerrar</button>
        </div>
        {!gamepads.supported() && <p className="gp-note">Este navegador no permite usar controles.</p>}
        {gamepads.supported() && pads.length === 0 && (
          <p className="gp-note">Conecta un control por USB o Bluetooth y oprime cualquier botón para que el navegador lo detecte.</p>
        )}
        {pads.slice(0, 4).map((p, i) => (
          <div key={p.index} className="gp-card">
            <div className="gp-title">
              <b className={i === 0 ? 'p1' : i === 1 ? 'p2' : ''}>{i < 2 ? `Jugador ${i + 1}` : 'Sin asignar'}</b>
              <span>{p.name}</span>
              <small>{p.custom ? 'Botones personalizados' : p.standard ? 'Reconocido automáticamente' : 'Control genérico'}</small>
            </div>
            {busy?.index === p.index ? (
              <div className="gp-capture">
                <p>Oprime el botón para <strong>{ACTIONS[busy.step][1]}</strong> <span>({busy.step + 1} de {ACTIONS.length})</span></p>
                <div className="row">
                  <button className="mini" onClick={() => gamepads.skipCapture()}>Saltar (dejar como está)</button>
                  <button className="mini" onClick={() => { gamepads.cancelCapture(); setBusy(null); }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="row">
                <button className="mini" onClick={() => start(p.index)}>Configurar botones</button>
                {p.custom && <button className="mini" onClick={() => { gamepads.resetMap(p.id); force((n) => n + 1); }}>Restablecer</button>}
              </div>
            )}
            <div className="gp-live" aria-label="Prueba de botones">
              {ACTIONS.map(([a, label]) => (
                <span key={a} className={live[p.index]?.[a] ? 'on' : ''}>{label}</span>
              ))}
            </div>
          </div>
        ))}
        <p className="gp-note">
          Distribución por defecto (estilo Xbox): <kbd>X</kbd> puño · <kbd>Y</kbd> puño fuerte · <kbd>A</kbd> patada · <kbd>B</kbd> patada fuerte ·
          {' '}<kbd>LB</kbd>/<kbd>LT</kbd> agarre · <kbd>RB</kbd>/<kbd>RT</kbd> súper · <kbd>Start</kbd> pausa. Cruceta o stick izquierdo para moverse.
          En los menús: <kbd>A</kbd> elige y <kbd>B</kbd> vuelve. Si algún botón no responde, usa “Configurar botones”.
        </p>
      </div>
    </div>
  );
}
