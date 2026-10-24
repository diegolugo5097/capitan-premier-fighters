// Capitán Premier Fighters — versión nueva (10 luchadores, Capitán nuevo y selección de escenario).
// El juego está exportado desde Godot en public/juego/. Este componente lo muestra a pantalla completa.
// Al salir de la pelea (B / Retroceso en la portada) vuelve al menú del arcade si VITE_MENU_URL está
// configurada en Vercel; si no, vuelve a la portada de la pelea.
import { useEffect, useRef, useState } from 'react';

export default function App() {
  const frame = useRef(null);
  const [key, setKey] = useState(0);

  useEffect(() => {
    const onMsg = (e) => {
      if (e.data !== 'cp-exit') return;
      const menu = import.meta.env.VITE_MENU_URL;
      if (menu) window.location.href = menu;
      else setKey((k) => k + 1);
    };
    window.addEventListener('message', onMsg);
    const t = setTimeout(() => frame.current && frame.current.focus(), 300);
    return () => { window.removeEventListener('message', onMsg); clearTimeout(t); };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <iframe
        key={key}
        ref={frame}
        title="Capitán Premier Fighters"
        src={`${import.meta.env.BASE_URL}juego/index.html?juego=pelea`}
        allow="autoplay; fullscreen; gamepad"
        allowFullScreen
        style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
      />
    </div>
  );
}
