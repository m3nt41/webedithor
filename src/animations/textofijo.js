// "TEXTO FIJO" para los hovers Agrandar, Encoger e Inclinar (técnica (b) del banco, sección 3 de tools/banco-texto.html).
//
// Normal: el hover escala/inclina el BOTÓN ENTERO y el texto va con él (en Firefox se ve borroso o se redibuja raro).
// Texto fijo: el nodo NO se transforma. Su fondo y su borde se pasan a un ::before (que copia el border-radius con `inherit`) y es ESE
// pseudo-elemento el que se escala o se inclina. El texto no lleva transform, scale, filter ni will-change: no cambia de tamaño.
//
// Cómo queda (z-index:-1 + isolation:isolate en el nodo: el ::before queda detrás del texto y encima de la sombra del nodo):
//   sel            { position:relative (si era static); isolation:isolate; background:transparent!important; border-color:transparent!important }
//   sel::before    { content:''; position:absolute; inset:-<ancho del borde>; border-radius:inherit; <fondo y borde copiados>; z-index:-1 }
//   sel:hover::before { transform:scale(1.03) | scale(.97) | rotate(-1deg) }
//
// El `!important` es necesario porque en el lienzo del editor el fondo y el borde van en style inline (le ganarían a la regla).
// El ancho del borde se mantiene (solo se pone transparente el color), así que la caja no cambia de tamaño ni el texto de sitio.
//
// LÍMITES (anotados en PROGRESS.md):
//  - Sin fondo ni borde visibles no hay nada que mover: `tieneFondoOBorde` es false y `cssTextoFijo` devuelve '' (el hover no hace
//    nada visible; el inspector avisa "Necesita fondo o borde"). No se rompe nada: ni se escala el texto ni se pone un fondo inventado.
//  - La sombra del nodo (box-shadow / sombra en reposo) se queda en el nodo: no se mueve ni se escala.
//  - Un "Estado" (variants) que cambie el fondo o el borde del nodo no se ve (el nodo queda transparente a la fuerza).
//  - Un nodo con `overflow:hidden` recorta el ::before cuando crece (sobresale 3 % por los lados).

import { valorCss, propiedadPermitida, valorSombraOk } from '../core/seguridad.js';
import { fondoDeclaraciones } from '../core/tree.js';
import { vacio } from './base.js';

const kebab = (k) => k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
const seguro = (k, v) => propiedadPermitida(k) && valorCss(v) !== null && valorSombraOk(k, v);

const FONDO = ['background', 'backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat'];
const LADOS = ['Top', 'Right', 'Bottom', 'Left'];
const BORDES = ['border', 'borderTop', 'borderRight', 'borderBottom', 'borderLeft', 'borderColor', 'borderWidth', 'borderStyle'];
/** ¿Toca algo del fondo o del borde? (en móvil decide si hay que re-emitir el ::before) */
export const claveDeCaja = (k) => FONDO.includes(k) || BORDES.includes(k) || k.startsWith('fondo');

/** ¿Hay un fondo (color, degradado o imagen) que pinte algo? */
const hayFondo = (est) => FONDO.slice(0, 3).some((k) => !vacio(est[k])) || String(est.fondoImagen ?? '').trim() !== '';

/** Tokens de un valor CSS separados por espacios (sin partir lo que va entre paréntesis: rgb(0, 0, 0)). */
function tokens(v) {
  const out = []; let cur = '', prof = 0;
  for (const ch of String(v ?? '').trim()) {
    if (ch === '(') prof++; else if (ch === ')') prof--;
    if (/\s/.test(ch) && prof === 0) { if (cur) out.push(cur); cur = ''; } else cur += ch;
  }
  if (cur) out.push(cur);
  return out;
}
const ES_ANCHO = /^(\d*\.?\d+(px|em|rem)|0|thin|medium|thick)$/i;
const ES_ESTILO = /^(none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset)$/i;
const ANCHO_PALABRA = { thin: '1px', medium: '3px', thick: '5px' };

/** Ancho y estilo de un borde escrito como atajo ("1px solid #111"). Sin estilo o con none/hidden el ancho real es 0. */
function atajo(v) {
  const t = tokens(v);
  const estilo = t.find((x) => ES_ESTILO.test(x));
  if (!estilo || /^(none|hidden)$/i.test(estilo)) return { ancho: '0', visible: false };
  const a = t.find((x) => ES_ANCHO.test(x)) ?? 'medium';
  const ancho = ANCHO_PALABRA[a.toLowerCase()] ?? a;
  const color = t.find((x) => x !== a && x !== estilo);
  return { ancho, visible: !/^0(px|em|rem)?$/.test(ancho) && !(color && vacio(color)) };
}

/** Ancho (como texto CSS) de cada lado del borde [arriba, derecha, abajo, izquierda] y si se ve algún lado. */
export function bordeDe(est) {
  const w = ['0', '0', '0', '0']; let visible = false;
  const poner = (i, a) => { w[i] = a.ancho; if (a.visible) visible = true; };
  if (est.border != null && !vacio(est.border)) { const a = atajo(est.border); for (let i = 0; i < 4; i++) poner(i, a); }
  // borderWidth + borderStyle por separado (1 a 4 valores, como CSS)
  if (est.borderWidth != null && est.borderStyle != null && !/^(none|hidden)$/i.test(String(est.borderStyle).trim()) && !vacio(est.borderStyle)) {
    const t = tokens(est.borderWidth).map((x) => ANCHO_PALABRA[x.toLowerCase()] ?? x);
    const [a, b = a, c = a, d = b] = t;
    [a, b, c, d].forEach((x, i) => { if (x) { w[i] = x; if (!/^0(px|em|rem)?$/.test(x)) visible = true; } });
  }
  LADOS.forEach((l, i) => { const v = est['border' + l]; if (v != null && String(v).trim() !== '') { w[i] = '0'; const a = atajo(v); poner(i, a); } });
  return { ancho: w, visible };
}

/** ¿Tiene un fondo o un borde visible? (lo único que Texto fijo sabe mover). Un box-shadow o un outline solos NO cuentan. */
export const tieneFondoOBorde = (est) => !!est && (hayFondo(est) || bordeDe(est).visible);

/** Qué estilos efectivos usar: en el lienzo móvil, base+móvil; en el export, base (y el móvil va en un @media). */
const mezcla = (node) => ({ ...(node?.styles?.base || {}), ...(node?.styles?.mobile || {}) });

/** ¿Hay que avisar "Necesita fondo o borde"? (no tiene ni en escritorio ni en móvil). Lo usa el inspector. */
export const sinFondoNiBorde = (node) => !tieneFondoOBorde(node?.styles?.base) && !tieneFondoOBorde(mezcla(node));

/** Declaraciones del ::before para unos estilos efectivos: fondo y borde copiados + su posición (inset negativo = ancho del borde). */
function piezas(est) {
  const d = [];
  for (const k of FONDO) if (k in est && !vacio(est[k]) && seguro(k, est[k])) d.push(`${kebab(k)}:${est[k]}`);
  for (const k of BORDES) if (k in est && seguro(k, est[k])) d.push(`${kebab(k)}:${est[k]}`);
  // la imagen de fondo del editor (fondoImagen + capa oscura): la genera tree.js, es la misma fuente que usan el lienzo y el export
  for (const [k, v] of Object.entries(fondoDeclaraciones(est))) d.push(`${kebab(k)}:${v}`);
  const { ancho } = bordeDe(est);
  const neg = (a) => (a === '0' ? '0' : /^\d*\.?\d+(px|em|rem)$/i.test(a) ? '-' + a : `calc(-1 * ${a})`);
  return `${d.join(';')};top:${neg(ancho[0])};right:${neg(ancho[1])};bottom:${neg(ancho[2])};left:${neg(ancho[3])}`;
}

/**
 * CSS del hover con Texto fijo. `transformHover` = lo que se aplica al ::before ('scale(1.03)', 'scale(.97)' o 'rotate(-1deg)').
 * `t` = '0.2s curva'. `viewMode` = 'mobile' | 'desktop' en el lienzo del editor; null en el export (ahí el móvil va en un @media).
 * Devuelve '' si no hay fondo ni borde (ver límites arriba).
 */
export function cssTextoFijo(node, sel, transformHover, t, viewMode, sinPosicion, breakpoint = 768) {
  const base = node?.styles?.base || {};
  const efectivo = mezcla(node);
  const lienzoMovil = viewMode === 'mobile';
  const estPrincipal = lienzoMovil ? efectivo : base;
  const hayPrincipal = tieneFondoOBorde(estPrincipal);
  // en el export: ¿el móvil cambia fondo o borde y hay caja en móvil?
  const movilCambia = !viewMode && Object.keys(node?.styles?.mobile || {}).some(claveDeCaja);
  const hayMovil = movilCambia && tieneFondoOBorde(efectivo);
  if (!hayPrincipal && !hayMovil) return '';
  const pos = sinPosicion ? 'position:relative;' : '';
  const reglas = [
    `${sel}{${pos}isolation:isolate;background:transparent!important;border-color:transparent!important}`,
    `${sel}::before{content:'';position:absolute;border-radius:inherit;z-index:-1;pointer-events:none;transition:transform ${t};${hayPrincipal ? piezas(estPrincipal) : 'display:none'}}`,
    `${sel}:hover::before{transform:${transformHover}}`,
  ];
  if (movilCambia) {
    reglas.push(`@media (max-width:${breakpoint}px){${sel}::before{${hayMovil ? 'display:block;' + piezas(efectivo) : 'display:none'}}}`);
  }
  return reglas.join('\n');
}
