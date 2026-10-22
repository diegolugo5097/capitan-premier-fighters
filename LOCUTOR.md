# Guion del locutor — Capitán Premier Fighters

Graba cada frase como un archivo **.mp3** con el nombre exacto de la columna "Archivo" y ponlo en `src/assets/voz/`.
Al compilar, el juego los usa automáticamente. Si falta alguno, esa frase la dice la voz del navegador.

Consejos de grabación:
- Un archivo por frase, sin silencio al principio ni al final (recórtalo).
- Tono de locutor de arcade: grave, fuerte y con eco si quieres. Las frases cortas funcionan mejor.
- Mono, 44.1 kHz, 128 kbps es suficiente. Cada archivo debería pesar menos de 100 KB.

## Pelea

| Archivo | Texto | Cuándo suena |
|---|---|---|
| `round1.mp3` | ¡Round 1! | Empieza el primer round |
| `round2.mp3` | ¡Round 2! | Empieza el segundo round |
| `round3.mp3` | ¡Round 3! | Empieza el tercer round (o más, si hubo empates) |
| `round_final.mp3` | ¡Round final! | Cuando los dos llevan un round ganado |
| `pelea.mp3` | ¡Pelea! | Justo después de anunciar el round |
| `ko.mp3` | ¡K.O.! | Cuando alguien queda sin vida |
| `perfecto.mp3` | ¡Perfecto! | Si el ganador no recibió daño (suena después de "K.O.") |
| `tiempo.mp3` | ¡Tiempo! | Se acaba el reloj |
| `empate.mp3` | ¡Empate! | Se acaba el reloj con la misma vida |
| `gana_cap.mp3` | ¡Gana Capitán Premier! | El Capitán gana el round |
| `gana_broca.mp3` | ¡Gana el Doctor Broca! | Broca gana el round |
| `gana_cuajada.mp3` | ¡Gana el Doctor Cuajada! | Cuajada gana el round |
| `ganaste.mp3` | ¡Ganaste! | Fin de la pelea, modo Arcade, gana el jugador |
| `perdiste.mp3` | Perdiste... | Fin de la pelea, modo Arcade, gana la CPU |

## Menús

| Archivo | Texto | Cuándo suena |
|---|---|---|
| `titulo.mp3` | ¡Capitán Premier Fighters! | Al presionar START en el título |
| `elige.mp3` | ¡Elige tu luchador! | Al entrar a la selección |
| `nombre_cap.mp3` | Capitán Premier | Pantalla VS (nombre de cada luchador) |
| `nombre_broca.mp3` | Doctor Broca | Pantalla VS |
| `nombre_cuajada.mp3` | Doctor Cuajada | Pantalla VS |
| `contra.mp3` | ...contra... | Pantalla VS, entre los dos nombres |

En la pantalla VS suenan seguidos: `nombre_` del jugador 1 → `contra` → `nombre_` del jugador 2.

## Súper (opcional, voz del locutor o del personaje)

| Archivo | Texto |
|---|---|
| `cap_super.mp3` | ¡Tormenta Premier! |
| `broca_super.mp3` | ¡Terremoto Broca! |
| `cuajada_super.mp3` | ¡Infierno Cuajada! |

## Especiales (opcional, voz del personaje; si no existen, no suena nada)

| Archivo | Texto |
|---|---|
| `cap_especial.mp3` | ¡Onda Premier! |
| `broca_especial.mp3` | ¡Onda Broca! |
| `cuajada_especial.mp3` | ¡Bola de fuego! |
