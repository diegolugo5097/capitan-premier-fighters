// Escenario: calle colonial al atardecer frente al Café Premier. Se pinta una vez a un canvas fuera de pantalla.
import { GROUND } from './fighter.js';

export const W = 960;
export const H = 540;
export const RES = 2; // resolución interna del canvas (x2) para que el texto del HUD se vea nítido
const PIX = 0.5;     // el escenario se pinta a media resolución y se amplía sin suavizado: aspecto pixel art

const HOUSES = [
  { x: -20, w: 200, wall: '#efe4cf', base: '#2f6b4f', rail: '#2f6b4f', door: '#7a2f1e', h: 250 },
  { x: 180, w: 170, wall: '#f2d9a6', base: '#9c3b2c', rail: '#9c3b2c', door: '#2c4f7a', h: 230 },
  { x: 350, w: 260, wall: '#efe7d8', base: '#1f2a3d', rail: '#c69b3b', door: '#1f2a3d', h: 280, cafe: true },
  { x: 610, w: 180, wall: '#d9e6ea', base: '#2c5f86', rail: '#2c5f86', door: '#8a3b22', h: 240 },
  { x: 790, w: 200, wall: '#f1e2c4', base: '#c0522f', rail: '#4b7a3a', door: '#4b7a3a', h: 255 },
];

function roof(ctx, x, y, w) {
  ctx.fillStyle = '#7d2e1c';
  ctx.beginPath();
  ctx.moveTo(x - 14, y); ctx.lineTo(x + w + 14, y); ctx.lineTo(x + w - 6, y - 26); ctx.lineTo(x + 6, y - 26);
  ctx.closePath(); ctx.fill();
  // tejas
  ctx.strokeStyle = '#a4452b'; ctx.lineWidth = 3;
  for (let i = x - 8; i < x + w + 10; i += 10) {
    ctx.beginPath(); ctx.moveTo(i, y); ctx.lineTo(i + 4, y - 25); ctx.stroke();
  }
  ctx.fillStyle = '#5a1f12'; ctx.fillRect(x - 14, y, w + 28, 5);
}

function windowShutter(ctx, x, y, w, h, color, lit) {
  ctx.fillStyle = lit ? '#ffcf6b' : '#1b2233';
  ctx.fillRect(x, y, w, h);
  if (lit) { ctx.fillStyle = 'rgba(255,190,90,0.25)'; ctx.fillRect(x - 6, y - 6, w + 12, h + 12); }
  ctx.fillStyle = color;
  ctx.fillRect(x - 10, y, 10, h); ctx.fillRect(x + w, y, 10, h);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
  for (let i = y + 6; i < y + h; i += 7) {
    ctx.beginPath(); ctx.moveTo(x - 10, i); ctx.lineTo(x, i); ctx.moveTo(x + w, i); ctx.lineTo(x + w + 10, i); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(x + w / 2 - 1, y, 2, h); ctx.fillRect(x, y + h / 2 - 1, w, 2);
}

function balcony(ctx, x, y, w, color) {
  ctx.fillStyle = '#4a2716'; ctx.fillRect(x - 6, y, w + 12, 8);
  ctx.fillStyle = color;
  ctx.fillRect(x - 6, y - 34, w + 12, 5);
  for (let i = x - 4; i <= x + w + 4; i += 9) ctx.fillRect(i, y - 30, 4, 30);
  // canecas de flores
  ctx.fillStyle = '#b8462c';
  for (let i = x + 6; i < x + w - 6; i += 34) { ctx.fillRect(i, y - 44, 14, 10); }
  ctx.fillStyle = '#e04a7a';
  for (let i = x + 6; i < x + w - 6; i += 34) { ctx.beginPath(); ctx.arc(i + 7, y - 48, 7, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#3f8a3a';
  for (let i = x + 6; i < x + w - 6; i += 34) { ctx.beginPath(); ctx.arc(i + 2, y - 44, 4, 0, 7); ctx.arc(i + 12, y - 44, 4, 0, 7); ctx.fill(); }
}

function drawHouse(ctx, hs, groundY) {
  const top = groundY - hs.h;
  ctx.fillStyle = hs.wall; ctx.fillRect(hs.x, top, hs.w, hs.h);
  // textura de muro
  ctx.fillStyle = 'rgba(120,90,60,0.08)';
  for (let i = 0; i < 40; i++) ctx.fillRect(hs.x + ((i * 53) % hs.w), top + ((i * 37) % hs.h), 6, 3);
  // zócalo
  ctx.fillStyle = hs.base; ctx.fillRect(hs.x, groundY - 46, hs.w, 46);
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(hs.x, groundY - 46, hs.w, 4);
  roof(ctx, hs.x, top, hs.w);

  if (hs.cafe) return;
  const mid = hs.x + hs.w / 2;
  // segundo piso
  windowShutter(ctx, mid - 52, top + 40, 34, 52, hs.rail, true);
  windowShutter(ctx, mid + 18, top + 40, 34, 52, hs.rail, false);
  balcony(ctx, mid - 66, top + 100, 132, hs.rail);
  // puerta
  ctx.fillStyle = hs.door; ctx.fillRect(mid - 24, groundY - 100, 48, 100);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(mid - 1, groundY - 100, 2, 100);
  ctx.fillStyle = '#d6a64a'; ctx.fillRect(mid - 8, groundY - 52, 4, 4); ctx.fillRect(mid + 4, groundY - 52, 4, 4);
  ctx.fillStyle = hs.wall; ctx.beginPath(); ctx.arc(mid, groundY - 100, 24, Math.PI, 0); ctx.fill();
  ctx.fillStyle = hs.door; ctx.beginPath(); ctx.arc(mid, groundY - 100, 20, Math.PI, 0); ctx.fill();
  // ventana baja
  const wx = hs.x + 16 < mid - 80 ? hs.x + 18 : mid + 40;
  if (hs.w > 175) windowShutter(ctx, hs.x + 26, groundY - 110, 30, 46, hs.rail, false);
  if (hs.w > 175) windowShutter(ctx, hs.x + hs.w - 56, groundY - 110, 30, 46, hs.rail, true);
  void wx;
}

function drawCafe(ctx, hs, groundY) {
  const top = groundY - hs.h;
  const mid = hs.x + hs.w / 2;
  // balcón corrido del segundo piso
  windowShutter(ctx, hs.x + 30, top + 42, 40, 56, '#1f2a3d', true);
  windowShutter(ctx, mid - 20, top + 42, 40, 56, '#1f2a3d', true);
  windowShutter(ctx, hs.x + hs.w - 70, top + 42, 40, 56, '#1f2a3d', true);
  balcony(ctx, hs.x + 18, top + 108, hs.w - 36, '#c69b3b');

  // letrero
  const sy = top + 124;
  ctx.fillStyle = '#121826'; ctx.fillRect(hs.x + 20, sy, hs.w - 40, 58);
  ctx.strokeStyle = '#e8b23a'; ctx.lineWidth = 3; ctx.strokeRect(hs.x + 24, sy + 4, hs.w - 48, 50);
  ctx.save();
  ctx.shadowColor = '#ffb83d'; ctx.shadowBlur = 14;
  ctx.fillStyle = '#ffd36b';
  ctx.font = '900 26px "Bungee", "Impact", sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('CAFÉ PREMIER', mid, sy + 24);
  ctx.restore();
  ctx.fillStyle = '#e9dfc8';
  ctx.font = '700 11px "Chakra Petch", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SEGUNDO PISO · UN CAFÉ DE PELÍCULA', mid, sy + 47);

  // vitrina y puerta
  const by = groundY - 104;
  ctx.fillStyle = '#ffcf6b'; ctx.fillRect(hs.x + 22, by, 70, 60); ctx.fillRect(hs.x + hs.w - 92, by, 70, 60);
  ctx.fillStyle = 'rgba(255,190,90,0.22)'; ctx.fillRect(hs.x + 14, by - 8, hs.w - 28, 76);
  ctx.strokeStyle = '#1f2a3d'; ctx.lineWidth = 4;
  ctx.strokeRect(hs.x + 22, by, 70, 60); ctx.strokeRect(hs.x + hs.w - 92, by, 70, 60);
  ctx.fillStyle = '#1f2a3d'; ctx.fillRect(mid - 30, groundY - 116, 60, 116);
  ctx.fillStyle = '#ffcf6b'; ctx.fillRect(mid - 22, groundY - 108, 18, 60); ctx.fillRect(mid + 4, groundY - 108, 18, 60);
  // toldo
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? '#e8b23a' : '#9c2b20';
    ctx.beginPath();
    const x0 = hs.x + 16 + i * ((hs.w - 32) / 10);
    ctx.moveTo(x0, by - 20); ctx.lineTo(x0 + (hs.w - 32) / 10, by - 20);
    ctx.lineTo(x0 + (hs.w - 32) / 10, by - 4); ctx.lineTo(x0, by - 4); ctx.fill();
  }
}

function lamp(ctx, x, groundY) {
  ctx.fillStyle = '#16191f'; ctx.fillRect(x - 3, groundY - 170, 6, 170);
  ctx.fillRect(x - 10, groundY - 6, 20, 6);
  ctx.fillRect(x - 3, groundY - 172, 26, 4);
  ctx.fillStyle = '#ffe2a0'; ctx.fillRect(x + 14, groundY - 166, 12, 14);
  const g = ctx.createRadialGradient(x + 20, groundY - 158, 2, x + 20, groundY - 158, 90);
  g.addColorStop(0, 'rgba(255,214,140,0.55)'); g.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = g; ctx.fillRect(x - 80, groundY - 260, 200, 200);
}

export function renderStage() {
  const c = document.createElement('canvas');
  c.width = W * PIX; c.height = H * PIX;
  const ctx = c.getContext('2d');
  ctx.scale(PIX, PIX);
  const wallBase = GROUND - 26;

  // cielo de atardecer
  const sky = ctx.createLinearGradient(0, 0, 0, wallBase);
  sky.addColorStop(0, '#0a1230'); sky.addColorStop(0.45, '#2b2257'); sky.addColorStop(0.8, '#a2434a'); sky.addColorStop(1, '#f0904a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, wallBase);
  // estrellas
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 70; i++) ctx.fillRect((i * 137) % W, (i * 71) % 150, (i % 3) ? 1 : 2, (i % 3) ? 1 : 2);
  // montañas
  ctx.fillStyle = '#1d2a3a';
  ctx.beginPath(); ctx.moveTo(0, 230);
  for (let x = 0; x <= W; x += 40) ctx.lineTo(x, 200 - Math.sin(x / 90) * 40 - Math.cos(x / 37) * 14);
  ctx.lineTo(W, 300); ctx.lineTo(0, 300); ctx.fill();
  ctx.fillStyle = '#16351f';
  ctx.beginPath(); ctx.moveTo(0, 260);
  for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 240 - Math.sin(x / 70 + 1) * 26);
  ctx.lineTo(W, 320); ctx.lineTo(0, 320); ctx.fill();

  HOUSES.forEach((h) => drawHouse(ctx, h, wallBase));
  drawCafe(ctx, HOUSES[2], wallBase);

  // andén
  ctx.fillStyle = '#8c8173'; ctx.fillRect(0, wallBase, W, 10);
  ctx.fillStyle = '#5e564c'; ctx.fillRect(0, wallBase + 10, W, 4);

  // calle empedrada
  const road = ctx.createLinearGradient(0, wallBase + 14, 0, H);
  road.addColorStop(0, '#4a4038'); road.addColorStop(1, '#2a241f');
  ctx.fillStyle = road; ctx.fillRect(0, wallBase + 14, W, H - wallBase);
  let row = 0;
  for (let y = wallBase + 16; y < H; y += 8 + row * 1.6, row++) {
    const sh = 6 + row * 1.4;
    const sw = 14 + row * 3;
    for (let x = -(row % 2) * sw / 2; x < W; x += sw + 3) {
      ctx.fillStyle = (Math.floor(x / sw) + row) % 3 === 0 ? '#5c5045' : '#51463c';
      ctx.beginPath(); ctx.ellipse(x + sw / 2, y + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2); ctx.fill();
    }
  }
  // luz cálida sobre la calle
  const glow = ctx.createRadialGradient(W / 2, GROUND, 40, W / 2, GROUND, 520);
  glow.addColorStop(0, 'rgba(255,170,90,0.18)'); glow.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);

  lamp(ctx, 120, wallBase + 12);
  lamp(ctx, 836, wallBase + 12);
  return c;
}

// Guirnalda de bombillos (animada)
export function drawLights(ctx, t) {
  for (let k = 0; k < 2; k++) {
    const y0 = 70 + k * 46;
    ctx.strokeStyle = 'rgba(20,20,20,0.8)'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 10) {
      const y = y0 + Math.sin((x / W) * Math.PI * 2) * 14 + (x % 320) / 320 * 0;
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    for (let x = 20; x < W; x += 40) {
      const y = y0 + Math.sin((x / W) * Math.PI * 2) * 14 + 5;
      const on = 0.65 + 0.35 * Math.sin(t / 18 + x * 0.3 + k);
      const colors = ['255,210,120', '255,120,90', '140,220,255', '180,255,140'];
      ctx.fillStyle = `rgba(${colors[(x / 40 + k) % 4 | 0]},${on})`;
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill();
    }
  }
}
