// Carga los sprite sheets y retratos de cada personaje.
// Si los dos jugadores eligen el mismo personaje, el segundo usa una paleta alterna (tono rotado).
import { ROSTER } from './characters.js';

function loadImage(src) {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360 / 360;
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255];
}

// Paleta alterna: rota el tono de los colores saturados (piel y grises se mantienen)
function altPalette(img) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    let [h, s, l] = rgbToHsl(d[i], d[i + 1], d[i + 2]);
    if (s < 0.3) continue;
    if (h > 12 && h < 40 && l > 0.45) continue; // piel
    h += 150;
    const [r, g, b] = hslToRgb(h, s, l);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  ctx.putImageData(data, 0, 0);
  return c;
}

export async function loadSprites() {
  const out = {};
  await Promise.all(ROSTER.map(async (ch) => {
    const [atlas, portrait] = await Promise.all([loadImage(ch.atlasUrl), loadImage(ch.portrait)]);
    out[ch.id] = atlas;
    out[ch.id + '_alt'] = altPalette(atlas);
    out[ch.id + '_portrait'] = portrait;
  }));
  return out;
}
