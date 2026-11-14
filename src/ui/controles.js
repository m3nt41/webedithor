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

// ---- Forma (border-radius) ----
// Recto 0 · Suave 6px · Redondo 12px · Pastilla 999px. "0 0 0 0" y "0px" cuentan como Recto; vacío también (no hay redondeo).
export const FORMAS = [
  { k: 'recto', txt: 'Recto', val: '0', r: 0 },
  { k: 'suave', txt: 'Suave', val: '6px', r: 6 },
  { k: 'redondo', txt: 'Redondo', val: '12px', r: 12 },
  { k: 'pastilla', txt: 'Pastilla', val: '999px', r: 999 },
];

export function leerForma(v) {
  const s = norm(v).toLowerCase();
  if (!s) return { tipo: 'vacio' };
  const partes = expandir(s.split(/\s+/));
  const unico = partes && partes.every((x) => x === partes[0]) ? partes[0] : null; // las 4 esquinas iguales
  if (unico == null) return { tipo: 'otro' };
  if (CERO.includes(unico)) return { tipo: 'forma', k: 'recto' };
  const f = FORMAS.find((x) => x.val === unico);
  return f ? { tipo: 'forma', k: f.k } : { tipo: 'otro' };
}

// ---- Tamaño de botón (padding + font-size juntos) ----
export const TAMANOS_BOTON = [
  { k: 's', txt: 'Pequeño', padding: '8px 16px', fontSize: '14px' },
  { k: 'm', txt: 'Mediano', padding: '12px 24px', fontSize: '16px' },
  { k: 'l', txt: 'Grande', padding: '16px 32px', fontSize: '18px' },
];

/** Compara padding sin importar espacios ni atajos: "8px 16px" == "8px 16px 8px 16px". */
const paddingIgual = (a, b) => {
  const x = expandir(norm(a).toLowerCase().split(/\s+/)), y = expandir(norm(b).toLowerCase().split(/\s+/));
  return !!x && !!y && x.every((p, i) => p === y[i]);
};

/** v = { padding, fontSize } efectivos. Solo es un tamaño si coinciden AMBOS; si falta alguno o no coincide, "otro". */
export function leerTamanoBoton(v) {
  const p = norm(v?.padding), f = norm(v?.fontSize).toLowerCase();
  if (!p && !f) return { tipo: 'vacio' };
  const t = TAMANOS_BOTON.find((x) => p && f && paddingIgual(p, x.padding) && f === x.fontSize);
  return t ? { tipo: 'tam', k: t.k } : { tipo: 'otro' };
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
  if (f.kind === 'forma') {
    const l = leerForma(v);
    // r = radio del dibujo SVG; todos escriben un valor explícito (en móvil '' = "igual que escritorio", así que no se puede borrar)
    const opciones = FORMAS.map((x) => ({ txt: x.txt, val: x.val, r: x.r, on: (l.tipo === 'forma' && l.k === x.k) || (l.tipo === 'vacio' && x.k === 'recto') }));
    return { opciones, personalizado: l.tipo === 'otro', min: null };
  }
  if (f.kind === 'tamanoBoton') {
    // v = { padding, fontSize }. Cada botón escribe los DOS valores a la vez (vals).
    const l = leerTamanoBoton(v);
    const opciones = TAMANOS_BOTON.map((x) => ({ txt: x.txt, k: x.k, vals: { padding: x.padding, fontSize: x.fontSize }, on: l.tipo === 'tam' && l.k === x.k }));
    return { opciones, personalizado: l.tipo === 'otro', min: null };
  }
  // Imagen de fondo: botones simples (valor vacío = el por defecto: Cubrir / centro). Todos escriben un valor explícito.
  if (f.kind === 'fondoAjuste' || f.kind === 'fondoPosicion') {
    const lista = f.kind === 'fondoAjuste' ? FONDO_AJUSTES_UI : FONDO_POSICIONES_UI;
    const actual = norm(v) || lista[0][0];
    return { opciones: lista.map(([val, txt]) => ({ txt, val, on: actual === val })), personalizado: false, min: null, sinOtro: true };
  }
  throw new Error('kind de control desconocido: ' + f.kind);
}

const FONDO_AJUSTES_UI = [['cover', 'Cubrir'], ['contain', 'Contener']];
const FONDO_POSICIONES_UI = [['center', 'Centro'], ['top', 'Arriba'], ['bottom', 'Abajo'], ['left', 'Izquierda'], ['right', 'Derecha']];
export const KINDS_BOTONES = ['fondoAjuste', 'fondoPosicion'];

export const KINDS_CONTROL = ['columnas', 'anchoMax', 'centrar', 'proporcion', 'forma', 'tamanoBoton'];
