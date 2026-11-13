// BASE COMPARTIDA de las animaciones: efectos de entrada, curvas (easings) y @keyframes.
// "Aparecer" (appear.js) y "Texto" (text.js) usan los mismos efectos.
//
// Truco: los keyframes solo definen el estado INICIAL (from). Con
// `animation-fill-mode: backwards` + `paused`, el elemento se ve en ese estado
// inicial hasta que recibe la clase .in; al terminar vuelve a su estilo normal.
// Así no pelea con el hover (que usa transform/transition).

export const EFECTOS = [
  ['', 'Ninguna'],
  ['fade', 'Aparecer (fade)'],
  ['up', 'Subir'],
  ['down', 'Bajar'],
  ['left', 'Desde la izquierda'],
  ['right', 'Desde la derecha'],
  ['zoom', 'Zoom'],
  ['blur', 'Desenfoque'],
  ['flip', 'Voltear'],
  ['rotate', 'Rotar'],
];

// Qué dispara la entrada: al entrar en pantalla (scroll) o apenas carga la página.
export const DISPAROS = [
  ['scroll', 'Al entrar en pantalla'],
  ['load', 'Al cargar la página'],
];
export const cargaInmediata = (a) => a?.trigger === 'load';

/** Animación de entrada: en "load" corre sola; en "scroll" espera la clase .in (paused). */
export const animEntrada = (efecto, d, curva, retraso, a) =>
  `a-${efecto} ${d}s ${curva} ${retraso} backwards${cargaInmediata(a) ? '' : ' paused'}`;

export const EASES = [
  ['suave', 'Suave'],
  ['spring', 'Rebote (spring)'],
  ['rapido', 'Rápido al inicio'],
  ['lineal', 'Lineal'],
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

/** `transition` para los estados hover/press/focus (transform, sombra, filtro y contorno). */
export const transicion = (g) => {
  const t = `${g.duration ?? 0.2}s ${easeCss(g.ease)}`;
  return `transition:transform ${t},box-shadow ${t},filter ${t},outline-color ${t},outline-offset ${t}`;
};

/** Todos los @keyframes (una sola vez por página). --ad = distancia en px. */
export const KEYFRAMES = `@keyframes a-fade{from{opacity:0}}
@keyframes a-up{from{opacity:0;translate:0 var(--ad,40px)}}
@keyframes a-down{from{opacity:0;translate:0 calc(var(--ad,40px)*-1)}}
@keyframes a-left{from{opacity:0;translate:calc(var(--ad,40px)*-1) 0}}
@keyframes a-right{from{opacity:0;translate:var(--ad,40px) 0}}
@keyframes a-zoom{from{opacity:0;scale:.8}}
@keyframes a-blur{from{opacity:0;filter:blur(12px)}}
@keyframes a-flip{from{opacity:0;transform:perspective(600px) rotateX(-70deg)}}
@keyframes a-rotate{from{opacity:0;rotate:var(--ar,-90deg)}}`;

/** Campos comunes (duración, retraso, curva, distancia). */
export const camposComunes = [
  { key: 'duration', label: 'Duración (s)', kind: 'num', step: 0.1, min: 0.1 },
  { key: 'delay', label: 'Retraso (s)', kind: 'num', step: 0.1, min: 0 },
  { key: 'ease', label: 'Curva', kind: 'select', options: EASES },
  { key: 'distance', label: 'Distancia (px)', kind: 'num', step: 5, min: 0, cuando: (g, efecto) => ['up', 'down', 'left', 'right'].includes(efecto) },
  { key: 'angle', label: 'Ángulo (°)', kind: 'num', step: 5, min: -720, cuando: (g, efecto) => efecto === 'rotate' },
];
export const campoDisparo = { key: 'trigger', label: 'Se dispara', kind: 'select', options: DISPAROS };
