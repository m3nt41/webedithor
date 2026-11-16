// SOMBRA EN REPOSO (lógica pura, sin DOM). La usan seguridad.js (validar), tree.js, renderer/preview (editor), exporter (export),
// el inspector y los tests.
//
// Se guarda UNA clave propia `sombra` en styles.base / styles.mobile, siempre en sintaxis de box-shadow:
//   "X Y desfoque expansión color"  (puede haber varias capas separadas por coma; 'none' = sin sombra, sirve en móvil para quitarla)
// La TÉCNICA CSS no se guarda: se elige al dibujar según el nodo (así si luego le pones fondo, la sombra cambia sola de técnica):
//   modo 'texto' (texto sin caja)        -> text-shadow  (sigue las letras, sin capa compuesta)
//   modo 'plano' (icono/imagen sin caja) -> filter: drop-shadow(...)  (sigue la forma; en una imagen con transparencia, la silueta)
//   modo false   (con caja)              -> box-shadow   (sigue la caja y sus esquinas)
// text-shadow y drop-shadow no tienen "expansión": se ignora, salvo en el Contorno (0 0 0 Npx color), que se dibuja con 8 copias desplazadas.

const L = '(?:0|-?\\d{1,3}(?:\\.\\d{1,3})?(?:px|em|rem))';                                      // longitud: 0 o número con unidad
const COLOR = '(?:#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})'                          // #rgb #rgba #rrggbb #rrggbbaa
  + '|rgba?\\(\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*,\\s*\\d{1,3}\\s*(?:,\\s*(?:0|1|0?\\.\\d{1,3}|1\\.0{1,3})\\s*)?\\)' // rgb(...) / rgba(...)
  + '|hsla?\\(\\s*\\d{1,3}(?:deg)?\\s*,\\s*\\d{1,3}%\\s*,\\s*\\d{1,3}%\\s*(?:,\\s*(?:0|1|0?\\.\\d{1,3}|1\\.0{1,3})\\s*)?\\)' // hsl(...) / hsla(...)
  + '|transparent|currentcolor|[a-zA-Z]{3,20})';                                                // palabra (un nombre de color; si no existe el navegador lo ignora)
const NUMS = `(${L})\\s+(${L})(?:\\s+(${L}))?(?:\\s+(${L}))?`;
const CAPA_A = new RegExp(`^(inset\\s+)?${NUMS}\\s+(${COLOR})$`, 'i');                          // lengths + color
const CAPA_B = new RegExp(`^(${COLOR})\\s+(inset\\s+)?${NUMS}$`, 'i');                          // color + lengths
export const SOMBRA_MAX_CAPAS = 4;

/** Parte un valor en capas por las comas de fuera de paréntesis. null si los paréntesis no cuadran. */
function capas(v) {
  const out = []; let prof = 0, ini = 0;
  for (let i = 0; i < v.length; i++) {
    const c = v[i];
    if (c === '(') prof++;
    else if (c === ')') { if (--prof < 0) return null; }
    else if (c === ',' && prof === 0) { out.push(v.slice(ini, i).trim()); ini = i + 1; }
  }
  if (prof !== 0) return null;
  out.push(v.slice(ini).trim());
  return out;
}

/** Una capa -> { inset, x, y, blur, spread, color } (textos tal cual, con su unidad) o null. */
function capa(s) {
  let m = CAPA_A.exec(s), inset, x, y, b, e, color;
  if (m) [, inset, x, y, b, e, color] = m;
  else if ((m = CAPA_B.exec(s))) [, color, inset, x, y, b, e] = m;
  else return null;
  return { inset: !!inset, x, y, blur: b ?? '0', spread: e ?? '0', color, n: e !== undefined ? 4 : b !== undefined ? 3 : 2 };
}

/** Lee un valor de sombra -> lista de capas, [] si es 'none', o null si el formato no es válido. */
export function leerSombra(v, { texto = false } = {}) {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  if (!s || s.length > 300) return null;
  if (s.toLowerCase() === 'none') return [];
  const cs = capas(s);
  if (!cs || cs.length > SOMBRA_MAX_CAPAS) return null;
  const out = [];
  for (const c of cs) {
    const x = capa(c);
    if (!x) return null;
    if (texto && (x.inset || x.n > 3)) return null;                                                  // text-shadow: sin inset ni 4º número
    if (/^-/.test(x.blur)) return null;                                                             // el desfoque no puede ser negativo
    out.push(x);
  }
  return out;
}

/** ¿Es una sombra válida? (box-shadow / sombra del editor; con {texto:true}, la sintaxis de text-shadow). */
export const sombraValida = (v, opc) => leerSombra(v, opc) !== null;

/** ¿Hay una sombra "de verdad" (no vacía ni 'none')? */
export const haySombra = (v) => { const l = leerSombra(v); return !!l && l.length > 0; };

const num = (t) => parseFloat(t) || 0;
const unidad = (t) => (String(t).match(/(px|em|rem)$/)?.[1] ?? 'px');

/** ¿Es un Contorno (0 0 0 N color con N > 0)? Devuelve {n, u, color} o null. */
function contorno(c) {
  if (c.inset || num(c.x) !== 0 || num(c.y) !== 0 || num(c.blur) !== 0 || num(c.spread) <= 0) return null;
  return { n: Math.abs(num(c.spread)), u: unidad(c.spread), color: c.color };
}

/** Las 8 copias desplazadas que dibujan un contorno de N alrededor de letras o de una silueta. */
const anillo = (r) => {
  const d = `${r.n}${r.u}`, m = `-${r.n}${r.u}`;
  return [[d, '0'], [m, '0'], ['0', d], ['0', m], [d, d], [d, m], [m, d], [m, m]].map(([x, y]) => ({ x, y, blur: '0', color: r.color }));
};

/** Capas ya listas para text-shadow o drop-shadow: { x, y, blur, color }[] (el contorno se expande; el resto ignora inset y expansión). */
function capasPlanas(cs) {
  return cs.flatMap((c) => { const r = contorno(c); return r ? anillo(r) : c.inset ? [] : [{ x: c.x, y: c.y, blur: c.blur, color: c.color }]; });
}

/** Declaraciones CSS de la sombra en reposo para la técnica `modo` ('texto' | 'plano' | false).
 *  Devuelve {} si no hay valor o es inválido; con 'none' devuelve la propiedad en none (para que en móvil pise la de escritorio). */
export function sombraDeclaraciones(valor, modo) {
  const prop = modo === 'texto' ? 'textShadow' : modo ? 'filter' : 'boxShadow';
  const cs = leerSombra(valor, {});
  if (cs === null) return {};
  if (!cs.length) return { [prop]: 'none' };
  if (!modo) return { boxShadow: cs.map((c) => `${c.inset ? 'inset ' : ''}${c.x} ${c.y} ${c.blur} ${c.spread} ${c.color}`).join(', ') };
  const planas = capasPlanas(cs);
  if (!planas.length) return { [prop]: 'none' };
  if (modo === 'texto') return { textShadow: planas.map((c) => `${c.x} ${c.y} ${c.blur} ${c.color}`).join(', ') };
  return { filter: planas.map((c) => `drop-shadow(${c.x} ${c.y} ${c.blur} ${c.color})`).join(' ') };
}

/** El mismo drop-shadow que se dibuja en reposo (para componerlo con un filter de hover/press: brightness...). '' si no aplica. */
export function filtroReposo(valor) {
  return sombraDeclaraciones(valor, 'plano').filter ?? '';
}

// ---- Presets del inspector (valores en sintaxis box-shadow) ----
export const SOMBRA_COLOR_CONTORNO = '#7c5cff';
export const PRESETS_SOMBRA = [
  { k: 'ninguna', txt: 'Ninguna', val: '', ayuda: 'Sin sombra' },
  { k: 'suave', txt: 'Suave', val: '0 2px 8px 0 rgba(0,0,0,0.15)', ayuda: 'Sombra pequeña y discreta' },
  { k: 'media', txt: 'Media', val: '0 6px 18px 0 rgba(0,0,0,0.22)', ayuda: 'Sombra normal, como una tarjeta' },
  { k: 'elevada', txt: 'Elevada', val: '0 16px 40px 0 rgba(0,0,0,0.30)', ayuda: 'Sombra grande: el elemento parece flotar' },
  { k: 'contorno', txt: 'Contorno', val: `0 0 0 2px ${SOMBRA_COLOR_CONTORNO}`, ayuda: 'Un borde de color alrededor, sin desenfoque' },
];
export const SOMBRA_PERSONALIZADA = '0 4px 14px 0 rgba(0,0,0,0.25)'; // punto de partida de "Personalizada"

const compacto = (v) => String(v ?? '').toLowerCase().replace(/\s+/g, '');

/** Qué muestra el inspector. v = valor efectivo de `sombra`.
 *  -> { tipo:'ninguna' } | { tipo:'preset', k } | { tipo:'custom', capa } | { tipo:'otro' } (varias capas o algo raro: no se toca) */
export function leerSombraUi(v) {
  const s = String(v ?? '').trim();
  if (!s || s.toLowerCase() === 'none') return { tipo: 'ninguna' };
  const p = PRESETS_SOMBRA.find((x) => x.val && compacto(x.val) === compacto(s));
  if (p) return { tipo: 'preset', k: p.k, capa: leerSombra(s)[0] };
  const cs = leerSombra(s);
  if (cs && cs.length === 1 && !cs[0].inset) return { tipo: 'custom', capa: cs[0] };
  return { tipo: 'otro' };
}

/** Color de una capa -> { hex:'#rrggbb', alfa:0..1 } para el selector de color + opacidad. Si no se entiende: negro al 25 %. */
export function colorSombra(c) {
  const s = String(c ?? '').trim().toLowerCase();
  let m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(s);
  if (m) {
    let h = m[1];
    if (h.length <= 4) h = [...h].map((x) => x + x).join('');
    return { hex: '#' + h.slice(0, 6), alfa: h.length === 8 ? Math.round((parseInt(h.slice(6), 16) / 255) * 100) / 100 : 1 };
  }
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/.exec(s);
  if (m) {
    const h = [m[1], m[2], m[3]].map((x) => Math.min(255, +x).toString(16).padStart(2, '0')).join('');
    return { hex: '#' + h, alfa: m[4] === undefined ? 1 : Math.min(1, +m[4]) };
  }
  return { hex: '#000000', alfa: 0.25 };
}

/** Arma el valor de sombra con números ya limpios (px) y un color #rrggbb + opacidad 0..1. */
export function armarSombra({ x, y, blur, spread, hex, alfa }) {
  const n = (t, min, max) => Math.min(max, Math.max(min, Math.round(Number(t) || 0)));
  const a = Math.min(1, Math.max(0, Number(alfa)));
  const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex : '#000000';
  const rgb = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(',');
  const color = a >= 1 ? h.toLowerCase() : `rgba(${rgb},${Math.round(a * 100) / 100})`;
  return `${n(x, -200, 200)}px ${n(y, -200, 200)}px ${n(blur, 0, 200)}px ${n(spread, -100, 100)}px ${color}`;
}
