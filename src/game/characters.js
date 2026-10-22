// Personajes: animaciones del sprite sheet, golpes, cajas y proyectiles.
// Tiempos en ticks (60 por segundo).
// frames: [animación del atlas, índice, duración]
// hit.box / HURT: [x, y, ancho, alto] relativo a los pies, mirando a la derecha (y crece hacia arriba)
// level: 'mid' (se bloquea parado o agachado) · 'low' (solo agachado) · 'high' (solo parado)
import capAtlas from './cap.json';
import brocaAtlas from './broca.json';
import cuajadaAtlas from './cuajada.json';
import capUrl from '../assets/cap.webp';
import brocaUrl from '../assets/broca.webp';
import cuajadaUrl from '../assets/cuajada.webp';
import capPortrait from '../assets/cap_full.webp';
import brocaPortrait from '../assets/broca_full.webp';
import cuajadaPortrait from '../assets/cuajada_full.webp';

const CAP = {
  id: 'cap',
  name: 'CAPITÁN PREMIER',
  short: 'CAPITÁN',
  title: 'El héroe del Café Premier',
  bio: 'Defiende la Calle 6 de Circasia con puños de café recién molido. Rápido y equilibrado: lanza la Onda Premier a distancia y castiga los saltos con el Gancho Premier.',
  color: '#ffd36b',
  quote: '¡Este café se sirve caliente... y con justicia!',
  atlasUrl: capUrl, atlas: capAtlas, portrait: capPortrait,
  face: [104, 0, 92, 92], // cara dentro del retrato (x, y, ancho, alto)
  walkF: 3.2, walkB: 2.6, jumpVy: 15.5, jumpVx: 3.9, power: 1,
  hurt: { stand: [-34, 0, 70, 186], crouch: [-40, 0, 84, 130], air: [-34, 0, 70, 160], down: [-90, 0, 180, 44] },
  anim: {
    idle: { frames: [0, 1, 2, 3, 4, 3, 2, 1], speed: 8 },
    walk: { frames: [0, 1, 2, 3, 4, 5, 6], speed: 6 },
    crouch: { frames: [1, 2, 3, 2], speed: 12 },
    air: { up: ['jump', 1], down: ['jump', 3], land: ['jump', 4], pre: ['jump', 0] },
    hurtL: [['hurt', 1, 6], ['hurt', 2, 99]],
    hurtH: [['hurt', 2, 6], ['hurt', 4, 99]],
    block: ['hurt', 3], blockLow: ['crouch', 0], grabbed: ['hurt', 2], lose: ['hurt', 4],
    getup: ['crouch', 0],
    win: [['win', 0, 16], ['win', 1, 16], ['win', 2, 34], ['win', 3, 999]],
  },
  moves: {
    jab: {
      name: 'Puño rápido',
      frames: [['punch', 0, 2], ['punch', 1, 3], ['punch', 2, 6], ['punch', 3, 4], ['punch', 5, 3]],
      hits: [{ start: 5, end: 10, box: [30, 122, 72, 34], dmg: 5, stun: 14, block: 9, push: 5, level: 'mid', meter: 5, spark: 'light' }],
      cancel: [5, 14],
    },
    cross: {
      name: 'Puño fuerte',
      frames: [['punch', 0, 4], ['punch', 1, 4], ['punch', 2, 11], ['punch', 3, 6], ['punch', 4, 4], ['punch', 5, 4]],
      advance: { start: 4, end: 12, vx: 2.2 },
      hits: [{ start: 8, end: 17, box: [30, 120, 82, 36], dmg: 10, stun: 18, block: 12, push: 8, level: 'mid', meter: 8, spark: 'heavy' }],
      cancel: [8, 19],
    },
    kickF: {
      name: 'Patada',
      frames: [['kick', 0, 3], ['kick', 1, 4], ['kick', 2, 8], ['kick', 3, 5], ['kick', 4, 4]],
      hits: [{ start: 7, end: 14, box: [34, 104, 112, 54], dmg: 8, stun: 16, block: 10, push: 8, level: 'mid', meter: 6, spark: 'light' }],
      cancel: [7, 15],
    },
    kickH: {
      name: 'Patada fuerte',
      frames: [['kick', 0, 5], ['kick', 1, 7], ['kick', 2, 12], ['kick', 3, 7], ['kick', 4, 5]],
      hits: [{ start: 12, end: 23, box: [34, 100, 118, 60], dmg: 13, stun: 20, block: 13, push: 11, level: 'mid', meter: 9, spark: 'heavy' }],
    },
    jumpAtk: {
      name: 'Puño en salto',
      air: true,
      frames: [['jump', 3, 999]],
      hits: [{ start: 3, end: 60, box: [10, 20, 82, 90], dmg: 10, stun: 18, block: 11, push: 7, level: 'high', meter: 7, spark: 'heavy' }],
    },
    lupa: {
      name: 'Onda Premier',
      special: true,
      frames: [['special', 0, 6], ['special', 1, 5], ['special', 2, 16], ['special', 3, 8], ['special', 4, 6]],
      projectile: { at: 11, kind: 'wave' },
    },
    upper: {
      name: 'Gancho Premier',
      special: true,
      invuln: [0, 7],
      frames: [['jump', 0, 3], ['jump', 1, 10], ['jump', 2, 22], ['jump', 3, 30]],
      hits: [{ start: 3, end: 17, box: [0, 110, 72, 120], dmg: 15, stun: 0, block: 14, push: 6, level: 'mid', meter: 12, spark: 'super', knockdown: true }],
      rise: { start: 3, vy: 15.5, vx: 2.6 },
    },
    spin: {
      name: 'Patada Cometa',
      special: true,
      frames: [['kick', 1, 5], ['kick', 2, 22], ['kick', 3, 8], ['kick', 4, 6]],
      advance: { start: 5, end: 26, vx: 6.2 },
      hits: [
        { start: 6, end: 14, box: [30, 96, 120, 64], dmg: 6, stun: 18, block: 9, push: 3, level: 'mid', meter: 6, spark: 'light' },
        { start: 16, end: 26, box: [30, 96, 120, 64], dmg: 7, stun: 0, block: 10, push: 10, level: 'mid', meter: 6, spark: 'heavy', knockdown: true },
      ],
    },
    grab: {
      name: 'Agarre',
      frames: [['punch', 1, 6], ['punch', 3, 24], ['special', 3, 14]],
      throwAt: 30,
    },
    whiff: { name: 'Agarre fallido', frames: [['punch', 1, 16]] },
    super: {
      name: 'Tormenta Premier',
      special: true,
      superMove: true,
      invuln: [0, 24],
      frames: [['special', 0, 10], ['special', 1, 10], ['special', 2, 40], ['special', 4, 10]],
      projectile: { at: 20, kind: 'superWave' },
    },
  },
  projectiles: {
    wave: { anim: 'wave', scale: 1.05, anchor: 'center', y: 100, speed: 7.6, dmg: 12, stun: 18, block: 12, push: 10, meter: 10, box: [-34, 52, 70, 100], life: 140, level: 'mid' },
    superWave: { anim: 'wave', scale: 1.9, anchor: 'center', y: 105, speed: 11, dmg: 30, stun: 0, block: 22, push: 18, meter: 0, box: [-60, 20, 120, 170], life: 110, knockdown: true, multi: true, level: 'mid' },
  },
  specials: [{ m: 'lupa', label: 'Onda' }, { m: 'upper', label: 'Gancho' }, { m: 'spin', label: 'Cometa' }],
};

const BROCA = {
  id: 'broca',
  name: 'DOCTOR BROCA',
  short: 'BROCA',
  title: 'El terror de los cafetales',
  bio: 'Científico loco con guantes de acero y un tanque de ácido verde en la espalda. Lento pero aplastante: su Onda Broca corre por el piso y solo se bloquea agachado.',
  color: '#8dff6a',
  quote: 'Tus puñitos no le hacen ni cosquillas a mi acero.',
  atlasUrl: brocaUrl, atlas: brocaAtlas, portrait: brocaPortrait,
  face: [148, 0, 112, 112],
  walkF: 2.5, walkB: 2.1, jumpVy: 14.2, jumpVx: 3.4, power: 1.12,
  hurt: { stand: [-52, 0, 104, 178], crouch: [-56, 0, 112, 136], air: [-52, 0, 104, 156], down: [-95, 0, 190, 50] },
  anim: {
    idle: { frames: [0, 1, 2, 3, 4, 3, 2, 1], speed: 9 },
    walk: { frames: [0, 1, 2, 3, 4, 5, 6], speed: 7 },
    crouch: { frames: [1, 2, 1, 2], speed: 14 },
    air: { up: ['jump', 1], down: ['jump', 3], land: ['jump', 4], pre: ['jump', 0] },
    hurtL: [['hurt', 0, 6], ['hurt', 1, 99]],
    hurtH: [['hurt', 1, 6], ['hurt', 4, 99]],
    block: ['hurt', 3], blockLow: ['crouch', 1], grabbed: ['hurt', 0], lose: ['hurt', 4],
    getup: ['crouch', 1],
    win: [['win', 0, 16], ['win', 1, 16], ['win', 2, 24], ['win', 3, 999]],
  },
  moves: {
    jab: {
      name: 'Puño de acero',
      frames: [['punch', 0, 2], ['punch', 1, 4], ['punch', 2, 7], ['punch', 4, 4], ['punch', 5, 3]],
      hits: [{ start: 6, end: 12, box: [36, 92, 86, 42], dmg: 6, stun: 14, block: 9, push: 6, level: 'mid', meter: 5, spark: 'light' }],
      cancel: [6, 15],
    },
    cross: {
      name: 'Golpe ácido',
      frames: [['punch', 0, 4], ['punch', 1, 7], ['punch', 3, 12], ['punch', 4, 6], ['punch', 5, 4]],
      advance: { start: 5, end: 15, vx: 2.6 },
      hits: [{ start: 11, end: 21, box: [36, 80, 96, 48], dmg: 12, stun: 19, block: 13, push: 9, level: 'mid', meter: 8, spark: 'heavy' }],
      cancel: [11, 22],
    },
    kickF: {
      name: 'Patada',
      frames: [['kick', 1, 3], ['kick', 2, 5], ['kick', 3, 9], ['kick', 4, 6], ['kick', 5, 3]],
      hits: [{ start: 8, end: 16, box: [40, 70, 92, 50], dmg: 8, stun: 16, block: 10, push: 8, level: 'mid', meter: 6, spark: 'light' }],
      cancel: [8, 17],
    },
    kickH: {
      name: 'Patada pesada',
      frames: [['kick', 1, 5], ['kick', 2, 8], ['kick', 3, 13], ['kick', 4, 8], ['kick', 5, 5]],
      hits: [{ start: 13, end: 25, box: [40, 66, 100, 56], dmg: 13, stun: 20, block: 13, push: 12, level: 'mid', meter: 9, spark: 'heavy' }],
    },
    jumpAtk: {
      name: 'Puño en salto',
      air: true,
      frames: [['jump', 2, 999]],
      hits: [{ start: 3, end: 60, box: [20, 40, 92, 80], dmg: 11, stun: 18, block: 11, push: 7, level: 'high', meter: 7, spark: 'heavy' }],
    },
    lupa: {
      name: 'Onda Broca',
      special: true,
      frames: [['special', 0, 6], ['special', 1, 10], ['special', 2, 10], ['special', 3, 14], ['special', 4, 6]],
      projectile: { at: 17, kind: 'wave' },
    },
    upper: {
      name: 'Gancho de acero',
      special: true,
      invuln: [0, 6],
      frames: [['jump', 0, 4], ['jump', 1, 10], ['jump', 2, 22], ['jump', 3, 30]],
      hits: [{ start: 4, end: 18, box: [10, 90, 90, 110], dmg: 16, stun: 0, block: 14, push: 6, level: 'mid', meter: 12, spark: 'super', knockdown: true }],
      rise: { start: 4, vy: 13, vx: 2.2 },
    },
    spin: {
      name: 'Embestida',
      special: true,
      frames: [['punch', 1, 7], ['punch', 3, 24], ['punch', 4, 8], ['punch', 5, 5]],
      advance: { start: 7, end: 28, vx: 7.4 },
      hits: [{ start: 8, end: 28, box: [30, 70, 104, 70], dmg: 14, stun: 0, block: 12, push: 12, level: 'mid', meter: 10, spark: 'heavy', knockdown: true }],
    },
    grab: {
      name: 'Agarre',
      frames: [['punch', 1, 30], ['punch', 3, 12]],
      throwAt: 30,
    },
    whiff: { name: 'Agarre fallido', frames: [['punch', 1, 18]] },
    super: {
      name: 'Terremoto Broca',
      special: true,
      superMove: true,
      invuln: [0, 26],
      frames: [['special', 0, 8], ['special', 1, 14], ['special', 2, 12], ['special', 3, 34], ['special', 4, 10]],
      projectile: { at: 24, kind: 'superWave' },
    },
  },
  projectiles: {
    wave: { anim: 'wave', scale: 1.0, anchor: 'bottom', y: 0, speed: 6.2, dmg: 12, stun: 18, block: 12, push: 10, meter: 10, box: [-86, 0, 172, 38], life: 150, level: 'low' },
    superWave: { anim: 'wave', scale: 1.8, anchor: 'bottom', y: 0, speed: 9, dmg: 30, stun: 0, block: 22, push: 18, meter: 0, box: [-160, 0, 320, 72], life: 120, knockdown: true, multi: true, level: 'low' },
  },
  specials: [{ m: 'lupa', label: 'Onda' }, { m: 'upper', label: 'Gancho' }, { m: 'spin', label: 'Embestida' }],
};

const CUAJADA = {
  id: 'cuajada',
  name: 'DOCTOR CUAJADA',
  short: 'CUAJADA',
  title: 'El amo de la finca cafetera',
  bio: 'Inventor chiflado con armadura de bronce y un lanzallamas conectado a su espalda. Domina la media distancia: su Lanzallamas quema de cerca y su Bola de Fuego cruza toda la calle.',
  color: '#ff8a2a',
  quote: '¡Ja, ja! La ciencia siempre gana... sobre todo con fuego.',
  atlasUrl: cuajadaUrl, atlas: cuajadaAtlas, portrait: cuajadaPortrait,
  face: [215, 5, 110, 110],
  walkF: 2.9, walkB: 2.5, jumpVy: 15, jumpVx: 3.7, power: 1.05,
  hurt: { stand: [-40, 0, 80, 180], crouch: [-44, 0, 88, 140], air: [-40, 0, 80, 156], down: [-92, 0, 184, 46] },
  anim: {
    idle: { frames: [0, 1, 2, 3, 4, 3, 2, 1], speed: 8 },
    walk: { frames: [0, 1, 2, 3, 4, 5, 6], speed: 6 },
    crouch: { frames: [1, 2, 1, 2], speed: 12 },
    air: { up: ['jump', 1], down: ['jump', 3], land: ['jump', 4], pre: ['jump', 0] },
    hurtL: [['hurt', 2, 6], ['hurt', 3, 99]],
    hurtH: [['hurt', 4, 6], ['hurt', 5, 99]],
    block: ['hurt', 0], blockLow: ['crouch', 1], grabbed: ['hurt', 2], lose: ['hurt', 5],
    getup: ['crouch', 3],
    win: [['win', 0, 16], ['win', 1, 20], ['win', 2, 30], ['win', 3, 999]],
  },
  moves: {
    jab: {
      name: 'Puño de bronce',
      frames: [['punch', 0, 2], ['punch', 1, 4], ['punch', 3, 6], ['punch', 5, 4]],
      hits: [{ start: 5, end: 11, box: [30, 112, 74, 34], dmg: 5, stun: 14, block: 9, push: 5, level: 'mid', meter: 5, spark: 'light' }],
      cancel: [5, 14],
    },
    cross: {
      name: 'Culatazo',
      frames: [['punch', 0, 4], ['punch', 4, 5], ['punch', 2, 11], ['punch', 3, 6], ['punch', 5, 5]],
      advance: { start: 4, end: 12, vx: 2.3 },
      hits: [{ start: 9, end: 19, box: [30, 96, 92, 44], dmg: 11, stun: 18, block: 12, push: 9, level: 'mid', meter: 8, spark: 'heavy' }],
      cancel: [9, 20],
    },
    kickF: {
      name: 'Patada',
      frames: [['kick', 0, 3], ['kick', 1, 4], ['kick', 3, 8], ['kick', 5, 5]],
      hits: [{ start: 7, end: 14, box: [34, 40, 90, 50], dmg: 8, stun: 16, block: 10, push: 8, level: 'mid', meter: 6, spark: 'light' }],
      cancel: [7, 15],
    },
    kickH: {
      name: 'Patada alta',
      frames: [['kick', 0, 5], ['kick', 1, 7], ['kick', 2, 12], ['kick', 4, 7], ['kick', 5, 5]],
      hits: [{ start: 12, end: 23, box: [30, 110, 96, 70], dmg: 13, stun: 20, block: 13, push: 11, level: 'mid', meter: 9, spark: 'heavy' }],
    },
    jumpAtk: {
      name: 'Golpe en salto',
      air: true,
      frames: [['jump', 3, 999]],
      hits: [{ start: 3, end: 60, box: [16, 30, 90, 80], dmg: 10, stun: 18, block: 11, push: 7, level: 'high', meter: 7, spark: 'heavy' }],
    },
    lupa: {
      name: 'Bola de Fuego',
      special: true,
      frames: [['special', 0, 7], ['special', 1, 8], ['special', 3, 16], ['special', 4, 8]],
      projectile: { at: 12, kind: 'wave' },
    },
    upper: {
      name: 'Salto Cohete',
      special: true,
      invuln: [0, 7],
      frames: [['jump', 0, 4], ['jump', 1, 8], ['jump', 2, 22], ['jump', 3, 30]],
      hits: [{ start: 4, end: 18, box: [0, 100, 80, 120], dmg: 15, stun: 0, block: 14, push: 6, level: 'mid', meter: 12, spark: 'super', knockdown: true }],
      rise: { start: 4, vy: 15, vx: 2.4 },
    },
    spin: {
      name: 'Lanzallamas',
      special: true,
      frames: [['special', 0, 6], ['special', 1, 10], ['special', 2, 10], ['special', 1, 10], ['special', 3, 8], ['special', 4, 6]],
      hits: [
        { start: 7, end: 15, box: [60, 70, 140, 60], dmg: 5, stun: 16, block: 8, push: 3, level: 'mid', meter: 5, spark: 'fire' },
        { start: 17, end: 25, box: [60, 70, 140, 60], dmg: 5, stun: 16, block: 8, push: 3, level: 'mid', meter: 5, spark: 'fire' },
        { start: 27, end: 35, box: [60, 70, 140, 60], dmg: 6, stun: 0, block: 10, push: 10, level: 'mid', meter: 6, spark: 'fire', knockdown: true },
      ],
    },
    grab: {
      name: 'Agarre',
      frames: [['punch', 3, 30], ['punch', 4, 12]],
      throwAt: 30,
    },
    whiff: { name: 'Agarre fallido', frames: [['punch', 3, 16]] },
    super: {
      name: 'Infierno Cuajada',
      special: true,
      superMove: true,
      invuln: [0, 24],
      frames: [['special', 0, 12], ['special', 1, 10], ['special', 2, 40], ['special', 4, 10]],
      projectile: { at: 22, kind: 'superWave' },
    },
  },
  projectiles: {
    wave: { anim: 'wave', scale: 1.0, anchor: 'center', y: 92, speed: 7.2, dmg: 12, stun: 18, block: 12, push: 10, meter: 10, box: [-40, 62, 84, 64], life: 140, level: 'mid' },
    superWave: { anim: 'wave', scale: 2.4, anchor: 'center', y: 100, speed: 10, dmg: 30, stun: 0, block: 22, push: 18, meter: 0, box: [-90, 30, 180, 140], life: 120, knockdown: true, multi: true, level: 'mid' },
  },
  specials: [{ m: 'lupa', label: 'Fuego' }, { m: 'upper', label: 'Cohete' }, { m: 'spin', label: 'Llamas' }],
};

// Tamaño en pantalla: todos los sprites, cajas y velocidades se escalan con este factor
const ZOOM = 1.22;
function scaleChar(ch) {
  const k = ZOOM;
  const box = (b) => b.map((v) => Math.round(v * k));
  ch.atlas = { ...ch.atlas, scale: ch.atlas.scale * k };
  ch.walkF *= k; ch.walkB *= k; ch.jumpVx *= k; ch.jumpVy *= Math.sqrt(k);
  for (const key of Object.keys(ch.hurt)) ch.hurt[key] = box(ch.hurt[key]);
  for (const mv of Object.values(ch.moves)) {
    for (const h of mv.hits || []) h.box = box(h.box);
    if (mv.advance) mv.advance = { ...mv.advance, vx: mv.advance.vx * k };
    if (mv.rise) mv.rise = { ...mv.rise, vy: mv.rise.vy * Math.sqrt(k), vx: mv.rise.vx * k };
  }
  for (const pd of Object.values(ch.projectiles)) { pd.box = box(pd.box); pd.y *= k; pd.speed *= k; }
  return ch;
}
scaleChar(CAP); scaleChar(BROCA); scaleChar(CUAJADA);

export const CHARS = { cap: CAP, broca: BROCA, cuajada: CUAJADA };
export const ROSTER = [CAP, BROCA, CUAJADA];

// Lista de controles (los comandos son iguales para los dos personajes)
export function moveList(ch) {
  const m = ch.moves;
  return [
    [m.jab.name, 'J'],
    [m.cross.name, 'K'],
    [m.kickF.name, 'L'],
    [m.kickH.name, 'I'],
    [m.jumpAtk.name, 'en el aire + golpe'],
    ['Agarre (de cerca)', 'O  ·  J + L'],
    [m.lupa.name, '↓ ↘ → + puño'],
    [m.upper.name, '→ ↓ ↘ + puño'],
    [m.spin.name, '↓ ↙ ← + patada'],
    [`${m.super.name} (súper)`, 'Espacio con la barra llena'],
    ['Bloquear', 'atrás  ·  ↙ para lo que va por el piso'],
  ];
}
