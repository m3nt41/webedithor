// BASE COMPARTIDA de las animaciones: efectos de entrada, curvas (easings) y @keyframes.
// "Aparecer" (appear.js) y "Texto" (text.js) usan los mismos efectos.
//
// Truco: los keyframes solo definen el estado INICIAL (from). Con
// `animation-fill-mode: backwards` + `paused`, el elemento se ve en ese estado
// inicial hasta que recibe la clase .in; al terminar vuelve a su estilo normal.
// Así no pelea con el hover (que usa transform/transition).

import { t as tr } from '../i18n/index.js';
import { haySombra, sombraDeclaraciones, filtroReposo } from '../core/sombra.js';

export const EFECTOS = [
  ['', tr('anim.ninguna')],
  ['fade', tr('anim.aparecer_fade')],
  ['up', tr('anim.subir')],
  ['down', tr('anim.bajar')],
  ['left', tr('anim.desde_la_izquierda')],
  ['right', tr('anim.desde_la_derecha')],
  ['zoom', tr('anim.zoom')],
  ['blur', tr('anim.desenfoque')],
  ['flip', tr('anim.voltear')],
  ['rotate', tr('anim.rotar')],
];

// Qué dispara la entrada: al entrar en pantalla (scroll) o apenas carga la página.
export const DISPAROS = [
  ['scroll', tr('anim.al_entrar_en_pantalla')],
  ['load', tr('anim.al_cargar_la_pagina')],
];
export const cargaInmediata = (a) => a?.trigger === 'load';

/** Animación de entrada: en "load" corre sola; en "scroll" espera la clase .in (paused). */
export const animEntrada = (efecto, d, curva, retraso, a) =>
  `a-${efecto} ${d}s ${curva} ${retraso} backwards${cargaInmediata(a) ? '' : ' paused'}`;

export const EASES = [
  ['suave', tr('anim.suave')],
  ['spring', tr('anim.rebote_fijo')],
  ['springreal', tr('anim.spring_rigidez_amortiguacion_masa')],
  ['bezier', tr('anim.cubic_bezier_editable')],
  ['rapido', tr('anim.rapido_al_inicio')],
  ['lineal', tr('anim.lineal')],
];

// "spring" = curva con rebote hecha con linear() (CSS puro, sin JS).
const CURVAS = {
  suave: 'cubic-bezier(.22,1,.36,1)',
  rapido: 'cubic-bezier(.16,1,.3,1)',
  lineal: 'linear',
  spring:
    'linear(0,.009,.035 2.1%,.141,.281 6.7%,.723 12.9%,.938 16.7%,1.017,1.077,1.121,1.149 24.3%,1.159,1.163,1.161,1.154 29.9%,1.129 32.8%,1.051 39.6%,1.017 43.1%,.991,.977 51%,.974 53.8%,.975 57.1%,.997 69.8%,1.003 76.9%,1.004 83.8%,1)',
};

export const easeCss = (e) => CURVAS[e] ?? CURVAS.suave;

// ---- Curvas editables ----
// Valores por defecto de los parámetros (cada grupo los añade a sus defaults).
export const DEF_CURVA = { bx1: 0.22, by1: 1, bx2: 0.36, by2: 1, stiffness: 170, damping: 26, mass: 1 };
const num = (v, d) => (Number.isFinite(+v) && v !== '' && v != null ? +v : d);
const r3 = (n) => Math.round(n * 1000) / 1000;

/**
 * Spring real (oscilador amortiguado: x'' = -(k/m)x - (c/m)x'). Se calcula la respuesta
 * exacta de 0 a 1 y se muestrea como `linear()` de CSS (sigue siendo CSS puro).
 * La duración NO se elige: es el tiempo que tarda el spring en asentarse.
 * Devuelve { css, dur }. Límite: no es interrumpible como un spring de verdad.
 */
export function resorte(g) {
  const k = Math.max(1, num(g?.stiffness, DEF_CURVA.stiffness));
  const c = Math.max(0.1, num(g?.damping, DEF_CURVA.damping));
  const m = Math.max(0.1, num(g?.mass, DEF_CURVA.mass));
  const w0 = Math.sqrt(k / m);
  const z = c / (2 * Math.sqrt(k * m));
  // x(t) = desplazamiento restante (1 → 0); el progreso es 1 - x
  const x = (t) => {
    if (z < 1) {
      const wd = w0 * Math.sqrt(1 - z * z);
      return Math.exp(-z * w0 * t) * (Math.cos(wd * t) + ((z * w0) / wd) * Math.sin(wd * t));
    }
    if (z === 1) return (1 + w0 * t) * Math.exp(-w0 * t);
    const s = Math.sqrt(z * z - 1);
    const r1 = -w0 * (z - s), r2 = -w0 * (z + s);
    return (r2 * Math.exp(r1 * t) - r1 * Math.exp(r2 * t)) / (r2 - r1);
  };
  // tiempo de asentado: la última vez que se aleja más de 0.2 % del destino (máx. 5 s)
  let dur = 0.1;
  for (let t = 0; t <= 5; t += 1 / 120) if (Math.abs(x(t)) > 0.002) dur = t;
  dur = Math.min(5, Math.max(0.1, dur + 1 / 120));
  const n = Math.min(120, Math.max(20, Math.ceil(dur * 60)));
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(i === 0 ? 0 : i === n ? 1 : r3(1 - x((dur * i) / n)));
  return { css: `linear(${pts.join(',')})`, dur: r3(dur) };
}

/** Curva CSS de un grupo de animación (lee g.ease y, si hace falta, sus parámetros). */
export function curva(g) {
  if (g?.ease === 'bezier') {
    const cl = (v) => Math.min(1, Math.max(0, v)); // x debe estar entre 0 y 1; y puede pasarse (rebote)
    const { bx1, by1, bx2, by2 } = DEF_CURVA;
    return `cubic-bezier(${r3(cl(num(g.bx1, bx1)))},${r3(num(g.by1, by1))},${r3(cl(num(g.bx2, bx2)))},${r3(num(g.by2, by2))})`;
  }
  if (g?.ease === 'springreal') return resorte(g).css;
  return easeCss(g?.ease);
}

/** Duración en segundos: la del campo, o la calculada si la curva es un spring real. */
export const duracion = (g, def) => (g?.ease === 'springreal' ? resorte(g).dur : num(g?.duration, def));

/** Campos de la curva editable (bezier / spring real); van justo después del select "Curva". */
export const camposCurva = [
  { key: 'bx1', label: tr('anim.bezier_x1_0_1'), kind: 'num', step: 0.05, min: 0, cuando: (g) => g.ease === 'bezier' },
  { key: 'by1', label: tr('anim.bezier_y1'), kind: 'num', step: 0.05, min: -3, cuando: (g) => g.ease === 'bezier' },
  { key: 'bx2', label: tr('anim.bezier_x2_0_1'), kind: 'num', step: 0.05, min: 0, cuando: (g) => g.ease === 'bezier' },
  { key: 'by2', label: tr('anim.bezier_y2'), kind: 'num', step: 0.05, min: -3, cuando: (g) => g.ease === 'bezier' },
  { key: 'stiffness', label: tr('anim.rigidez'), kind: 'num', step: 10, min: 1, cuando: (g) => g.ease === 'springreal' },
  { key: 'damping', label: tr('anim.amortiguacion'), kind: 'num', step: 1, min: 0.1, cuando: (g) => g.ease === 'springreal' },
  { key: 'mass', label: tr('anim.masa'), kind: 'num', step: 0.1, min: 0.1, cuando: (g) => g.ease === 'springreal' },
];
/** Con spring real la duración sale de la física: el campo "Duración" se oculta. */
export const sinSpring = (g) => g.ease !== 'springreal';

/** `transition` para los estados hover/press/focus (transform, sombra, filtro y contorno). */
export const transicion = (g) => {
  const t = `${duracion(g, 0.2)}s ${curva(g)}`;
  const fill = g?.effect === 'fill';
  // color: solo el hover "Color" o el Relleno con texto cambiante (no cambia el CSS de lo ya guardado)
  const color = g?.effect === 'color' || ((fill || g?.effect === 'bgrow') && g.textoCambia === 'si') ? `,color ${t}` : '';
  const fondo = fill && g.modo !== 'barrido' ? `,background-color ${t}` : '';
  return `transition:transform ${t},box-shadow ${t},text-shadow ${t},filter ${t},outline-color ${t},outline-offset ${t}${color}${fondo}`;
};

// ¿Un valor CSS "no pinta nada"? (vacío, none, transparent, 0, alfa 0)
export const vacio = (v) => {
  const s = String(v ?? '').trim().toLowerCase();
  return !s || s === 'none' || s === 'transparent' || s === 'hidden' || /^0(px|em|rem)?$/.test(s)
    || /^rgba?\([^)]*[,/]\s*0(\.0+)?\s*\)$/.test(s) || /^#([0-9a-f]{3}0|[0-9a-f]{6}00)$/.test(s);
};

/** ¿El elemento NO tiene caja visible (sin fondo, sin imagen de fondo, sin borde y sin sombra propia)?
 *  Mira base Y mobile: si cualquiera de los dos pinta algo, cuenta como "con caja".
 *  Hover/focus la usan para elegir drop-shadow (sigue las letras) en vez de box-shadow (sigue la caja). */
export function sinCaja(node) {
  for (const est of [node?.styles?.base, node?.styles?.mobile]) {
    for (const [k, v] of Object.entries(est || {})) {
      if (k === 'background' || k === 'backgroundColor') { if (!vacio(v)) return false; }
      else if (k === 'backgroundImage') { if (!vacio(v)) return false; }
      else if (k === 'fondoImagen') { if (String(v ?? '').trim()) return false; }
      else if (k === 'boxShadow') { if (!vacio(v)) return false; }
      // sombra en reposo: en un contenedor/sección ES su caja (box-shadow), así hover/focus la reemplazan con box-shadow y no con drop-shadow.
      // En texto, icono e imagen NO cuenta (es justo lo que decide la técnica: text-shadow / drop-shadow).
      else if (k === 'sombra') { if ((node?.type === 'container' || node?.type === 'section') && haySombra(v)) return false; }
      else if (/^border(Top|Right|Bottom|Left)?$/.test(k)) { if (!vacio(v) && !/\b(none|hidden)\b/i.test(String(v)) && !/^0/.test(String(v).trim())) return false; }
      else if (/^border(Top|Right|Bottom|Left)?(Width|Style)$/.test(k)) { if (!vacio(v)) return false; }
    }
  }
  return true;
}

/** ¿El contenido del nodo es texto (heading, text, button)? Con sinCaja decide la sombra:
 *  texto -> text-shadow (no crea capa compuesta, el texto se queda nítido al moverse);
 *  icon/image/otros -> filter:drop-shadow (sigue la forma). */
export const esTexto = (node) => ['heading', 'text', 'button'].includes(node?.type);

/** Modo de sombra para hover/focus: 'texto' | 'plano' | false (con caja: box-shadow). */
export const modoSombra = (node) => (sinCaja(node) ? (esTexto(node) ? 'texto' : 'plano') : false);

/** Declaraciones CSS de la sombra en reposo de un nodo para unos estilos (base, o base+móvil ya mezclados).
 *  La técnica sale de modoSombra: text-shadow | drop-shadow (filter) | box-shadow. {} si no hay sombra. */
export const declaracionesSombra = (node, est) => (est && 'sombra' in est ? sombraDeclaraciones(est.sombra, modoSombra(node)) : {});

/** filter de un efecto (brillo...) CONSERVANDO el drop-shadow en reposo si el nodo lo usa (modo 'plano'): el filter del
 *  estado reemplaza al de reposo, así que se suman. Lift y glow no lo necesitan: su sombra REEMPLAZA a la de reposo a propósito. */
export function filtroConReposo(node, filtro) {
  const est = { ...node?.styles?.base, ...node?.styles?.mobile };
  const rep = modoSombra(node) === 'plano' ? filtroReposo(est.sombra) : '';
  return `filter:${rep ? rep + ' ' : ''}${filtro}`;
}

/** Todos los @keyframes (una sola vez por página). --ad = distancia en px. */
export const KEYFRAMES = `@keyframes a-fade{from{opacity:0}}
@keyframes a-up{from{opacity:0;translate:0 var(--ad,40px)}}
@keyframes a-down{from{opacity:0;translate:0 calc(var(--ad,40px)*-1)}}
@keyframes a-left{from{opacity:0;translate:calc(var(--ad,40px)*-1) 0}}
@keyframes a-right{from{opacity:0;translate:var(--ad,40px) 0}}
@keyframes a-zoom{from{opacity:0;scale:.8}}
@keyframes a-blur{from{opacity:0;filter:blur(12px)}}
@keyframes a-flip{from{opacity:0;transform:perspective(600px) rotateX(-70deg)}}
@keyframes a-rotate{from{opacity:0;rotate:var(--ar,-90deg)}}
@keyframes a-subir{from{translate:0 var(--ad,40px)}}
@keyframes a-bajar{from{translate:0 calc(var(--ad,40px)*-1)}}`;

/** Campos comunes (duración, retraso, curva, distancia). */
export const camposComunes = [
  { key: 'duration', label: tr('anim.duracion_s'), kind: 'num', step: 0.1, min: 0.1, cuando: sinSpring },
  { key: 'delay', label: tr('anim.retraso_s'), kind: 'num', step: 0.1, min: 0 },
  { key: 'ease', label: tr('anim.curva'), kind: 'select', options: EASES },
  ...camposCurva,
  { key: 'distance', label: tr('anim.distancia_px'), kind: 'num', step: 5, min: 0, cuando: (g, efecto) => ['up', 'down', 'left', 'right'].includes(efecto) },
  { key: 'angle', label: tr('anim.angulo'), kind: 'num', step: 5, min: -720, cuando: (g, efecto) => efecto === 'rotate' },
];
export const campoDisparo = { key: 'trigger', label: tr('anim.se_dispara'), kind: 'select', options: DISPAROS };
