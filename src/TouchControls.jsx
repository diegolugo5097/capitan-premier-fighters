import { useRef, useState } from 'react';

const BTNS = [
  { k: 'lp', label: 'Puño' },
  { k: 'hp', label: 'Fuerte' },
  { k: 'lk', label: 'Patada' },
  { k: 'hk', label: 'Fuerte' },
];

export default function TouchControls({ gameRef, specials }) {
  const SPECIALS = specials;
  const base = useRef(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const pad = () => gameRef.current?.pad1;

  const setDir = (dx, dy) => {
    const p = pad(); if (!p) return;
    const dead = 16;
    p.virtual.left = dx < -dead; p.virtual.right = dx > dead;
    p.virtual.up = dy < -dead * 1.6; p.virtual.down = dy > dead;
  };
  const move = (e) => {
    const r = base.current.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const max = r.width / 2 - 14; const len = Math.hypot(dx, dy);
    if (len > max) { dx = (dx / len) * max; dy = (dy / len) * max; }
    setKnob({ x: dx, y: dy }); setDir(dx, dy);
  };
  const release = () => { setKnob({ x: 0, y: 0 }); setDir(0, 0); };

  const press = (k, v) => (e) => {
    e.preventDefault();
    const p = pad(); if (p) { p.virtual[k] = v; if (v) p.tapped[k] = true; }
  };

  return (
    <div className="touch" onContextMenu={(e) => e.preventDefault()}>
      <div
        className="stick" ref={base}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
        onPointerMove={(e) => { if (e.buttons || e.pointerType === 'touch') move(e); }}
        onPointerUp={release} onPointerCancel={release}
      >
        <div className="knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
      </div>
      <div className="pads">
        <div className="specials">
          {SPECIALS.map((s) => (
            <button key={s.m} className="sp" onPointerDown={(e) => { e.preventDefault(); pad()?.trigger(s.m); }}>{s.label}</button>
          ))}
        </div>
        <div className="face">
          {BTNS.map((b) => (
            <button key={b.k} className={`fb ${b.k}`} onPointerDown={press(b.k, true)} onPointerUp={press(b.k, false)} onPointerLeave={press(b.k, false)} onPointerCancel={press(b.k, false)}>{b.label}</button>
          ))}
        </div>
        <div className="specials">
          <button className="sp" onPointerDown={press('grab', true)} onPointerUp={press('grab', false)} onPointerLeave={press('grab', false)}>Agarre</button>
          <button className="sp super" onPointerDown={press('super', true)} onPointerUp={press('super', false)} onPointerLeave={press('super', false)}>Súper</button>
        </div>
      </div>
    </div>
  );
}
