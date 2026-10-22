# Capitán Premier Fighters

Pelea 1 vs 1 en pixel art estilo arcade de los 90, hecha con React + Canvas.
Luchadores: **Capitán Premier**, **Doctor Broca** y **Doctor Cuajada**, frente al Café Premier en la Calle 6.

```bash
npm install
npm run dev            # desarrollo
npm run build          # sitio para Vercel (carpeta dist/)
npm run build:single   # un solo HTML con todo embebido (dist-single/)
```

## Flujo
Título con PRESIONA START (si nadie toca nada, muestra la ficha de cada personaje) → selección estilo arcade con cuenta regresiva → pantalla VS → pelea al mejor de 3 rounds → pantalla de victoria con frase del ganador.
Modo 1 jugador contra la CPU (3 dificultades) o 2 jugadores en el mismo teclado. Controles táctiles en el celular.

## Estructura
- `src/game/characters.js` — **cada personaje**: qué frames usa cada movimiento, daño, cajas de golpe, velocidades, proyectiles, nombres y ficha. Aquí se balancea y se agregan personajes.
- `src/game/cap.json` / `broca.json` + `src/assets/*.webp` — frames recortados de las hojas de sprites: `[x, y, ancho, alto, centroDeLosPies]` por animación (idle, walk, crouch, jump, punch, kick, special, hurt, win, fall, down, wave).
- `src/game/fighter.js` — estados del luchador (caminar, saltar, atacar, bloquear, caer) y dibujo.
- `src/game/engine.js` — rounds, colisiones, proyectiles, chispas y HUD arcade (retratos, barras, K.O., reloj).
- `src/game/ai.js` — IA del rival. `stage.js` — escenario.
- `src/game/audio.js` — música y efectos sintetizados (sin archivos): tema de menú y tema de pelea con batería, bajo, guitarras distorsionadas y melodía; las partituras están en `TRACKS`. El locutor usa la voz del navegador y se apaga con el botón "Locutor".

## Agregar un personaje
1. Hoja de sprites con las mismas filas (IDLE, WALK, CROUCH, JUMP, PUNCH, KICK, SPECIAL, HURT, WIN) sobre fondo transparente, y un retrato de cuerpo completo.
2. Recortarla en un atlas con el mismo formato que `cap.json`.
3. Copiar el bloque de `CAP` en `characters.js`, ajustar frames, nombres y proyectil, y agregarlo a `ROSTER`.

En la pelea, la tecla `H` muestra las cajas de golpe (rojo) y de daño (azul).

## Voces del locutor
Graba las frases de `LOCUTOR.md` como mp3 y ponlas en `src/assets/voz/` con el nombre indicado.
El juego las detecta solo al compilar; las que falten se dicen con la voz del navegador.

## Controles (gamepad)
Funciona con cualquier control que reconozca el navegador (Xbox, PlayStation, Switch Pro, genéricos USB/Bluetooth), hasta dos a la vez.
- Control 1 = jugador 1, control 2 = jugador 2. Contra la CPU, cualquier control mueve al jugador 1.
- Por defecto: X puño · Y puño fuerte · A patada · B patada fuerte · LB/LT agarre · RB/RT súper · Start pausa. Cruceta o stick izquierdo.
- Menús: cruceta para moverse, A para elegir, B para volver.
- Botón **Controles**: muestra los controles conectados, prueba de botones en vivo y "Configurar botones" para mapear un control raro botón por botón (se guarda en el navegador).
- Código: `src/game/gamepad.js` (lectura y mapeos) y `src/GamepadBridge.jsx` (conexión con menús, pelea y pantalla de configuración).
