// PASO DE ESCENA: qué hace un hijo directo de una sección con "Escena por scroll" (ver scene.js).
// Datos en node.animation.scenestep = { effect, step, move, distance }
//   effect: 'in' aparece en su paso y se queda · 'out' está desde el inicio y se va en su paso ·
//           'inout' aparece en su paso y se va al llegar el siguiente
//   step: número de paso (1..pasos de la escena). El cambio ocupa la primera mitad de ese tramo de scroll.
//   move: movimiento que acompaña al fundido (nada, subir, bajar, izquierda, derecha o zoom)
//   distance: px del movimiento (o % de zoom)
// CSS puro sobre --ep (progreso de la escena, lo escribe el motor de scroll) y --n (nº de pasos). La duración del cambio
// dentro de cada tramo la fija la escena padre ("Transición (% del tramo)"); aquí se hornea en el número, igual en escritorio y móvil.
// Las reglas solo valen dentro de una escena (`.sc [data-es] > hijo`): fuera de una escena no hacen nada.
// La opacidad va con !important para que preview y exportado coincidan (la opacidad propia del elemento se ignora).
import { t } from '../i18n/index.js';


// Progreso del cambio del paso j (0..1). `k` = 1 / (fracción del tramo que dura el cambio): con 50 % es 2 (como siempre).
const Q = (j, k = '2') => `clamp(0,calc((var(--ep,0) * var(--n,3) - ${j - 1}) * ${k}),1)`;

/** Factor k de la escena padre: campo "Transición (% del tramo)" de scene.js. Falta o inválido = 50 % -> '2' (export idéntico al de antes). */
export function factorTransicion(padre) {
  const pct = +padre?.animation?.scene?.transition;
  if (!Number.isFinite(pct) || pct === 50) return '2';
  return String(+(100 / Math.min(80, Math.max(20, pct))).toFixed(4));
}

export default {
  id: 'scenestep',
  titulo: t('anim.paso_de_escena'),
  principal: 'effect',
  defaults: { effect: 'in', step: 2, move: 'up', distance: 40 },
  campos: [
    { key: 'effect', label: t('anim.que_hace'), kind: 'select', options: [['', t('anim.ninguno')], ['in', t('anim.aparece_en_el_paso')], ['out', t('anim.se_va_en_el_paso')], ['inout', t('anim.aparece_y_se_va_en_el_siguiente')]] },
    { key: 'step', label: t('anim.paso'), kind: 'num', step: 1, min: 1 },
    { key: 'move', label: t('anim.movimiento'), kind: 'select', options: [['', t('anim.solo_fundido')], ['up', t('anim.subir')], ['down', t('anim.bajar')], ['left', t('anim.izquierda')], ['right', t('anim.derecha')], ['zoom', t('anim.zoom')]] },
    { key: 'distance', label: t('anim.distancia_px_o_zoom'), kind: 'num', step: 5, min: 0, cuando: (g) => !!g?.move },
  ],

  css(g, sel, node, op = {}) {
    if (!g?.effect) return '';
    const kk = factorTransicion(op.padre);
    const k = Math.max(1, Math.round(+g.step || 2));
    const d = Math.max(0, +(g.distance ?? 40));
    const qi = g.effect === 'out' ? '1' : Q(k, kk); // entrada
    const qo = g.effect === 'out' ? Q(k, kk) : g.effect === 'inout' ? Q(k + 1, kk) : '0'; // salida
    // recorrido: llega desde (1-qi)·d y se va hasta -qo·d
    const off = `calc((1 - var(--qi)) * ${d}px - var(--qo) * ${d}px)`;
    const mov = {
      up: `translate:0 ${off}`,
      down: `translate:0 calc(-1 * ${off})`,
      left: `translate:${off} 0`,
      right: `translate:calc(-1 * ${off}) 0`,
      zoom: `scale:calc((1 - (1 - var(--qi)) * ${Math.min(0.9, d / 100)}) * (1 + var(--qo) * ${Math.min(0.9, d / 100)}))`,
    }[g.move] ?? '';
    return `.sc [data-es] > ${sel}{--qi:${qi};--qo:${qo};opacity:calc(var(--qi) * (1 - var(--qo)))!important;${mov}}`;
  },
};
