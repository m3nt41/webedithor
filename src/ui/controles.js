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

import { t as tr } from '../i18n/index.js';
import { C } from '../blocks/tema.js'; // colores del tema (acento y tinta/papel para el fallback del estilo de botón)

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
  { k: 'recto', txt: tr('forma.recto'), val: '0', r: 0 },
  { k: 'suave', txt: tr('forma.suave'), val: '6px', r: 6 },
  { k: 'redondo', txt: tr('forma.redondo'), val: '12px', r: 12 },
  { k: 'pastilla', txt: tr('forma.pastilla'), val: '999px', r: 999 },
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
  { k: 's', txt: tr('tam.chico'), padding: '8px 16px', fontSize: '14px' },
  { k: 'm', txt: tr('tam.mediano'), padding: '12px 24px', fontSize: '16px' },
  { k: 'l', txt: tr('tam.grande'), padding: '16px 32px', fontSize: '18px' },
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

// ---- Estilo de botón (background + color + border juntos) ----
// Relleno  : fondo sólido C, borde 1px del mismo color C (no se ve), texto de contraste.
// Contorno : fondo transparente, borde 1px solid C, texto C.
// Suave    : fondo = C al 14 % (color-mix con transparent), texto C, borde 1px transparente.
// Los tres llevan borde de 1px para que el botón NO cambie de tamaño al pasar de uno a otro.
// C (el color base) sale del botón actual; si no se puede deducir, el acento del tema.
export const SUAVE_PCT = 14;
export const ESTILOS_BOTON = [
  { k: 'relleno', txt: tr('estiloBoton.relleno') },
  { k: 'contorno', txt: tr('comun.contorno') },
  { k: 'suave', txt: tr('forma.suave') },
];

const TRANSPARENTE = ['', 'transparent', 'none'];
/** Normaliza un color para compararlo: minúsculas, sin espacios, #rgb -> #rrggbb. */
const normColor = (c) => {
  const s = sinEsp(c);
  return /^#[0-9a-f]{3}$/.test(s) ? '#' + [...s.slice(1)].map((x) => x + x).join('') : s;
};
/** ¿Es un color simple (hex, rgb/hsl/color-mix o nombre)? Un degradado o url() no lo es. */
const esColor = (c) => {
  const s = norm(c).toLowerCase();
  if (!s || TRANSPARENTE.includes(s) || ['inherit', 'initial', 'unset', 'currentcolor'].includes(s)) return false;
  return /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.test(s) || /^(rgba?|hsla?|color-mix)\(.*\)$/.test(s) || /^[a-z]+$/.test(s);
};
/** Color sólido: lo anterior, pero sin color-mix (un fondo así es un Suave, o algo raro). */
const esSolido = (c) => esColor(c) && !/^color-mix/i.test(norm(c));
const suaveDe = (c) => `color-mix(in srgb, ${c} ${SUAVE_PCT}%, transparent)`;
/** Si bg es "color-mix(in srgb, X 14%, transparent)" devuelve X; si no, null. */
const leerSuave = (bg) => {
  const m = /^color-mix\(\s*in\s+srgb\s*,\s*(.+?)\s+(\d+(?:\.\d+)?)%\s*,\s*transparent\s*\)$/i.exec(norm(bg));
  return m && +m[2] === SUAVE_PCT ? m[1] : null;
};
/** border -> { tipo:'ninguno' } | { tipo:'linea', w, estilo, color } | { tipo:'otro' } */
const leerBorde = (b) => {
  const s = norm(b).toLowerCase();
  if (s === '' || s === 'none' || s === '0' || s === '0px') return { tipo: 'ninguno' };
  const m = /^(\d+(?:\.\d+)?)(?:px)?\s+(solid|dashed|dotted|double)\s+(.+)$/.exec(s);
  if (!m) return { tipo: 'otro' };
  return +m[1] === 0 ? { tipo: 'ninguno' } : { tipo: 'linea', w: +m[1], estilo: m[2], color: m[3] };
};

/** v = { background, color, border } efectivos -> { tipo:'vacio' } | { tipo:'estilo', k, color } | { tipo:'otro' } */
export function leerEstiloBoton(v) {
  const bg = norm(v?.background), col = norm(v?.color), borde = leerBorde(v?.border);
  if (!bg && !col && !norm(v?.border)) return { tipo: 'vacio' };
  if (borde.tipo === 'otro') return { tipo: 'otro' };
  const transp = (c) => normColor(c) === 'transparent';
  const bordeInvisible = (c) => borde.tipo === 'ninguno' || (borde.estilo === 'solid' && (transp(borde.color) || normColor(borde.color) === normColor(c)));
  // Suave
  const sx = leerSuave(bg);
  if (sx && esColor(sx) && normColor(sx) === normColor(col) && (borde.tipo === 'ninguno' || (borde.estilo === 'solid' && borde.w === 1 && transp(borde.color)))) return { tipo: 'estilo', k: 'suave', color: sx };
  // Contorno
  if (TRANSPARENTE.includes(bg.toLowerCase()) && borde.tipo === 'linea' && borde.w === 1 && borde.estilo === 'solid' && esColor(borde.color) && normColor(borde.color) === normColor(col)) return { tipo: 'estilo', k: 'contorno', color: col };
  // Relleno
  if (esSolido(bg) && bordeInvisible(bg)) return { tipo: 'estilo', k: 'relleno', color: bg };
  return { tipo: 'otro' };
}

/** Color base C: el del estilo actual; si es "otro", el fondo sólido, o el borde, o el texto; si no hay nada, el acento del tema. */
export function colorBaseBoton(v) {
  const l = leerEstiloBoton(v);
  if (l.tipo === 'estilo') return l.color;
  const bg = norm(v?.background), col = norm(v?.color), borde = leerBorde(v?.border);
  if (esSolido(bg)) return bg;
  if (borde.tipo === 'linea' && esColor(borde.color)) return borde.color;
  if (esColor(col)) return col;
  return C.acento;
}

/** Luminancia relativa (0-1) de #rgb/#rrggbb/rgb(); null si no se puede leer. */
function luminancia(c) {
  const s = normColor(c);
  let r, g, b;
  let m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/.exec(s);
  if (m) [r, g, b] = m.slice(1).map((x) => parseInt(x, 16));
  else if ((m = /^rgba?\((\d+),(\d+),(\d+)/.exec(s))) [r, g, b] = m.slice(1).map(Number);
  else return null;
  const lin = (x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Texto para un fondo sólido: el del tema (oscuro o papel) con más contraste. Si no se puede medir, papel. */
export function textoSobre(c) {
  const L = luminancia(c);
  if (L == null) return C.papel;
  const contr = (l2) => (Math.max(L, l2) + 0.05) / (Math.min(L, l2) + 0.05);
  return contr(luminancia(C.oscuro)) >= contr(luminancia(C.papel)) ? C.oscuro : C.papel;
}

/** Las tres propiedades que escribe el estilo k, partiendo del botón actual v. */
export function valoresEstiloBoton(k, v) {
  const c = colorBaseBoton(v);
  if (k === 'relleno') return { background: c, color: textoSobre(c), border: `1px solid ${c}` };
  if (k === 'contorno') return { background: 'transparent', color: c, border: `1px solid ${c}` };
  if (k === 'suave') return { background: suaveDe(c), color: c, border: '1px solid transparent' };
  return { background: '', color: '', border: '' }; // k vacío = quitar las tres
}

// ---- Modelo para dibujar ----
export function modeloControl(f, v, modo = 'desktop') {
  if (f.kind === 'estiloBoton') {
    // v = { background, color, border }. Cada botón escribe las TRES a la vez (vals); el clic en el activo no escribe nada.
    const l = leerEstiloBoton(v);
    const opciones = ESTILOS_BOTON.map((x) => ({ txt: x.txt, k: x.k, vals: valoresEstiloBoton(x.k, v), on: l.tipo === 'estilo' && l.k === x.k }));
    return { opciones, personalizado: l.tipo === 'otro', min: null };
  }
  const movil = modo === 'mobile';
  if (f.kind === 'columnas') {
    const l = leerColumnas(v);
    const opciones = Array.from({ length: COLUMNAS_MAX }, (_, i) => ({ txt: String(i + 1), val: columnasN(i + 1), on: l.tipo === 'n' && l.n === i + 1 }));
    opciones.push({ txt: tr('comun.auto'), val: columnasAuto(l.tipo === 'auto' ? l.min : 240), on: l.tipo === 'auto' });
    return { opciones, personalizado: l.tipo === 'otro', min: l.tipo === 'auto' ? l.min : null };
  }
  if (f.kind === 'anchoMax') {
    const l = leerAnchoMax(v);
    const opciones = [{ txt: tr('control.completo'), val: movil ? 'none' : '', on: l.tipo === 'completo' }];
    for (const n of ANCHOS) opciones.push({ txt: String(n), val: `${n}px`, on: l.tipo === 'preset' && l.n === n });
    return { opciones, personalizado: l.tipo === 'otro', min: null };
  }
  if (f.kind === 'centrar') {
    const l = leerCentrar(v);
    return {
      opciones: [
        { txt: tr('control.centrado'), val: '0 auto', on: l.tipo === 'si' },
        { txt: tr('control.sinCentrar'), val: movil ? '0' : '', on: l.tipo === 'no' || l.tipo === 'vacio' },
      ],
      personalizado: l.tipo === 'otro', min: null,
    };
  }
  if (f.kind === 'proporcion') {
    const l = leerProporcion(v);
    // Imagen: "Auto" escribe 'auto' explícito (así gana a la proporción de su grid). Hijos del grid: "Auto" = sin forzar nada.
    const autoVal = f.autoVacio ? (movil ? 'auto' : '') : 'auto';
    const opciones = PROPORCIONES.map((k) => ({ txt: k.replace('/', ':'), val: k.replace('/', ' / '), on: l.tipo === 'preset' && l.k === k }));
    opciones.push({ txt: tr('comun.auto'), val: autoVal, on: l.tipo === 'auto' || (!!f.autoVacio && l.tipo === 'vacio') });
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

const FONDO_AJUSTES_UI = [['cover', tr('control.cubrir')], ['contain', tr('control.contener')]];
const FONDO_POSICIONES_UI = [['center', tr('comun.centro')], ['top', tr('comun.arriba')], ['bottom', tr('comun.abajo')], ['left', tr('comun.izquierda')], ['right', tr('comun.derecha')]];
export const KINDS_BOTONES = ['fondoAjuste', 'fondoPosicion'];

export const KINDS_CONTROL = ['columnas', 'anchoMax', 'centrar', 'proporcion', 'forma', 'tamanoBoton'];
