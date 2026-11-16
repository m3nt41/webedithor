// Lector mínimo de PNG (8 bits, RGB o RGBA, sin entrelazado) para los tests por píxeles. Sin dependencias: usa zlib de Node.
// leerPng(base64) -> { w, h, px(x, y) -> [r,g,b,a] }
import { inflateSync } from 'node:zlib';

export function leerPng(b64) {
  const b = Buffer.from(b64, 'base64');
  let o = 8, w = 0, h = 0, tipo = 0; const idat = [];
  while (o < b.length) {
    const len = b.readUInt32BE(o), nom = b.toString('ascii', o + 4, o + 8), dat = b.subarray(o + 8, o + 8 + len);
    if (nom === 'IHDR') { w = dat.readUInt32BE(0); h = dat.readUInt32BE(4); tipo = dat[9]; if (dat[8] !== 8 || dat[12] !== 0) throw new Error('PNG no soportado'); }
    else if (nom === 'IDAT') idat.push(dat);
    o += 12 + len;
  }
  const bpp = tipo === 6 ? 4 : tipo === 2 ? 3 : 0;
  if (!bpp) throw new Error('PNG: tipo de color no soportado ' + tipo);
  const raw = inflateSync(Buffer.concat(idat)), fila = w * bpp, out = Buffer.alloc(h * fila);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (fila + 1)], s = y * (fila + 1) + 1, d = y * fila;
    for (let i = 0; i < fila; i++) {
      const x = raw[s + i], a = i >= bpp ? out[d + i - bpp] : 0, up = y ? out[d - fila + i] : 0, ul = y && i >= bpp ? out[d - fila + i - bpp] : 0;
      let v;
      if (f === 0) v = x; else if (f === 1) v = x + a; else if (f === 2) v = x + up; else if (f === 3) v = x + ((a + up) >> 1);
      else { const p = a + up - ul, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - ul); v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? up : ul); }
      out[d + i] = v & 255;
    }
  }
  return { w, h, px: (x, y) => { const i = y * fila + x * bpp; return [out[i], out[i + 1], out[i + 2], bpp === 4 ? out[i + 3] : 255]; } };
}

/** Cuenta píxeles "no blancos" (algún canal < umbral) en el rectángulo [x0,x1) × [y0,y1) que NO caen dentro de `excluir` ({x,y,w,h}). */
export function contarNoBlancos(png, x0, y0, x1, y1, excluir = null, umbral = 253) {
  let n = 0;
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(png.h, Math.ceil(y1)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(png.w, Math.ceil(x1)); x++) {
      if (excluir && x >= excluir.x && x < excluir.x + excluir.w && y >= excluir.y && y < excluir.y + excluir.h) continue;
      const [r, g, b] = png.px(x, y);
      if (r < umbral || g < umbral || b < umbral) n++;
    }
  }
  return n;
}
