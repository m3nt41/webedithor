// CONTROLES VISUALES DEL INSPECTOR (lógica pura, sin DOM: se prueba en Node con tests/controles.mjs).
//
// Cada control traduce entre un string CSS (lo que SIEMPRE se guarda en styles.base / styles.mobile)
// y botones que el usuario puede pulsar. Regla de oro: LEER nunca escribe. Un valor que el control no
// reconoce se marca "personalizado" y se queda tal cual (se edita en "Avanzado").
//
// modeloControl(campo, valorEfectivo, modo) devuelve:
//   opciones:      [{ txt, val, on }]  botones; val = string CSS que escribe el botón ('' = borrar la propiedad)
//   personalizado: true si el valor actual no es ninguno de los botones
//   min:           (solo columnas en Auto) mínimo en px para el campo numérico
// modo = 'desktop' | 'mobile'. En móvil, '' significa "igual que escritorio", así que las opciones que en
// escritorio equivalen a "nada" escriben aquí un valor explícito (none, 0, auto).

const norm = (v) => String(v ?? '').trim();
const sinEsp = (v) => norm(v).toLowerCase().replace(/\s+/g, '');

/** Propiedad camelCase -> css (maxWidth -> max-width). */
export const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());

// ---- Columnas (grid) ----
export const COLUMNAS_MAX = 6;
export const columnasN = (n) => `repeat(${n}, 1fr)`;
export const columnasAuto = (min) => `repeat(auto-fit, minmax(${min}px, 1fr))`;

export function leerColumnas(v) {
  const s = norm(v);
  if (!s) return { tipo: 'vacio' };
  let m = /^repeat\(\s*(\d+)\s*,\s*1fr\s*\)$/i.exec(s);
  if (m && +m[1] >= 1 && +m[1] <= COLUMNAS_MAX) return { tipo: 'n', n: +m[1] };
  if (/^1fr(\s+1fr){0,5}$/i.test(s)) return { tipo: 'n', n: s.split(/\s+/).length }; // "1fr 1fr 1fr"
  m = /^repeat\(\s*auto-fit\s*,\s*minmax\(\s*(\d+(?:\.\d+)?)px\s*,\s*1fr\s*\)\s*\)$/i.exec(s);
  if (m) return { tipo: 'auto', min: +m[1] };
  return { tipo: 'otro' };
}

// ---- Ancho máximo ----
export const ANCHOS = [1200, 900, 760, 700, 500];

export function leerAnchoMax(v) {
  const s = norm(v).toLowerCase();
  if (s === '' || s === 'none') return { tipo: 'completo' };
  const m = /^(\d+)px$/.exec(s);
  if (m && ANCHOS.includes(+m[1])) return { tipo: 'preset', n: +m[1] };
  return { tipo: 'otro' };
}

// ---- Centrar (margin) ----
/** Expande el atajo margin a [arriba, derecha, abajo, izquierda]; null si no tiene 1-4 partes. */
function expandir(partes) {
  if (partes.length === 1) return [partes[0], partes[0], partes[0], partes[0]];
  if (partes.length === 2) return [partes[0], partes[1], partes[0], partes[1]];
  if (partes.length === 3) return [partes[0], partes[1], partes[2], partes[1]];
  if (partes.length === 4) return partes;
  return null;
}
const CERO = ['0', '0px'];

export function leerCentrar(v) {
  const s = norm(v).toLowerCase();
  if (!s) return { tipo: 'vacio' };
  const l = expandir(s.split(/\s+/));
  if (!l) return { tipo: 'otro' };
  const [t, r, b, i] = l;
  if (r === 'auto' && i === 'auto' && (CERO.includes(t) || t === 'auto') && (CERO.includes(b) || b === 'auto')) return { tipo: 'si' };
  if (l.every((x) => CERO.includes(x))) return { tipo: 'no' };
  return { tipo: 'otro' };
}

// ---- Proporción (aspect-ratio) ----
export const PROPORCIONES = ['1/1', '4/3', '16/9', '4/5', '3/2'];

export function leerProporcion(v) {
  const s = sinEsp(v);
  if (!s) return { tipo: 'vacio' };
  if (s === 'auto') return { tipo: 'auto' };
  if (PROPORCIONES.includes(s)) return { tipo: 'preset', k: s };
  return { tipo: 'otro' };
}

// ---- Modelo para dibujar ----
export function modeloControl(f, v, modo = 'desktop') {
  const movil = modo === 'mobile';
  if (f.kind === 'columnas') {
    const l = leerColumnas(v);
    const opciones = Array.from({ length: COLUMNAS_MAX }, (_, i) => ({ txt: String(i + 1), val: columnasN(i + 1), on: l.tipo === 'n' && l.n === i + 1 }));
    opciones.push({ txt: 'Auto', val: columnasAuto(l.tipo === 'auto' ? l.min : 240), on: l.tipo === 'auto' });
    return { opciones, personalizado: l.tipo === 'otro', min: l.tipo === 'auto' ? l.min : null };
  }
  if (f.kind === 'anchoMax') {
    const l = leerAnchoMax(v);
    const opciones = [{ txt: 'Completo', val: movil ? 'none' : '', on: l.tipo === 'completo' }];
    for (const n of ANCHOS) opciones.push({ txt: String(n), val: `${n}px`, on: l.tipo === 'preset' && l.n === n });
    return { opciones, personalizado: l.tipo === 'otro', min: null };
  }
  if (f.kind === 'centrar') {
    const l = leerCentrar(v);
    return {
      opciones: [
        { txt: 'Centrado', val: '0 auto', on: l.tipo === 'si' },
        { txt: 'Sin centrar', val: movil ? '0' : '', on: l.tipo === 'no' || l.tipo === 'vacio' },
      ],
      personalizado: l.tipo === 'otro', min: null,
    };
  }
  if (f.kind === 'proporcion') {
    const l = leerProporcion(v);
    // Imagen: "Auto" escribe 'auto' explícito (así gana a la proporción de su grid). Hijos del grid: "Auto" = sin forzar nada.
    const autoVal = f.autoVacio ? (movil ? 'auto' : '') : 'auto';
    const opciones = PROPORCIONES.map((k) => ({ txt: k.replace('/', ':'), val: k.replace('/', ' / '), on: l.tipo === 'preset' && l.k === k }));
    opciones.push({ txt: 'Auto', val: autoVal, on: l.tipo === 'auto' || (!!f.autoVacio && l.tipo === 'vacio') });
    return { opciones, personalizado: l.tipo === 'otro', min: null };
  }
  throw new Error('kind de control desconocido: ' + f.kind);
}

export const KINDS_CONTROL = ['columnas', 'anchoMax', 'centrar', 'proporcion'];
