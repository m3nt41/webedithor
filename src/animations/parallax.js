// PARALLAX: el elemento se desplaza a otra velocidad que el scroll.
// Datos en node.animation.parallax = { effect: 'y' | 'x', amount }
//   amount = recorrido en px a cada lado: positivo = más lento que el scroll (efecto de fondo),
//   negativo = más rápido. En el centro de la pantalla el elemento está en su sitio.
//
// DOS SISTEMAS (el navegador elige, nunca los dos a la vez):
//  1) NATIVO (CSS puro, sin script): `animation-timeline: view()` + @keyframes de `translate` de -amount a +amount
//     con `animation-range: cover` (0% = asoma por abajo, 100% = sale por arriba; es el mismo recorrido que mide
//     el motor JS). Va dentro de @supports (animation-timeline: view()) y de prefers-reduced-motion: no-preference.
//     Firefox lo ejecuta fuera del hilo principal (el scroll-linked por JS le da el aviso "scroll-linked positioning effect").
//  2) RESPALDO (navegadores sin soporte): clase .sc + variable --sp que escribe el motor de scroll (scrollmotor.js).
//     Va dentro de @supports not (animation-timeline: view()).
// EXCEPCIÓN: si el elemento ya usa `animation` para otra cosa (Al aparecer, estado "al cargar/entrar", cascada del
// padre), `animation` es una sola propiedad y el parallax nativo la pisaría; en ese caso se queda el sistema 2 siempre.
// Sin `will-change`: las animaciones de scroll del navegador ya se componen solas y no lo necesitan.

import { estadosEntrada } from './variants.js';

/** ¿Este nodo puede usar el parallax nativo? (no si su `animation` ya la ocupa otra animación de entrada) */
export function parallaxNativo(node, padre = null) {
  const a = node?.animation;
  if (!a?.parallax?.effect) return false;
  if (a.appear?.effect || estadosEntrada(node).length) return false;
  const st = padre?.animation?.stagger; // la cascada del padre pone su `animation` en los hijos que no tienen entrada propia
  if (st?.effect && !a.text?.mode) return false;
  return true;
}

const num = (v) => (Number.isFinite(v) ? v : 60);

export default {
  id: 'parallax',
  titulo: 'Parallax (scroll)',
  principal: 'effect',
  defaults: { effect: 'y', amount: 60 },
  campos: [
    { key: 'effect', label: 'Dirección', kind: 'select', options: [['', 'Ninguno'], ['y', 'Vertical'], ['x', 'Horizontal']] },
    { key: 'amount', label: 'Recorrido (px, negativo = más rápido)', kind: 'num', step: 5, min: -2000 },
  ],

  css(g, sel, node, { padre = null } = {}) {
    if (!g?.effect) return '';
    const A = num(g.amount ?? 60);
    const x = g.effect === 'x';
    const mov = `calc((var(--sp,.5) - .5) * ${2 * A}px)`;
    const respaldo = `.sc ${sel}{translate:${x ? `${mov} 0` : `0 ${mov}`}}`;
    if (!parallaxNativo(node, padre)) return respaldo; // sistema 2 siempre
    const kf = `par-${x ? 'x' : 'y'}-${String(A).replace('-', 'm').replace('.', 'p')}`;
    const t = (v) => (x ? `${v}px 0` : `0 ${v}px`);
    return `@supports not (animation-timeline:view()){${respaldo}}\n`
      + `@media (prefers-reduced-motion:no-preference){@supports (animation-timeline:view()){`
      + `@keyframes ${kf}{from{translate:${t(-A)}}to{translate:${t(A)}}}`
      + `${sel}{animation:${kf} linear both;animation-timeline:view();animation-range:cover 0% cover 100%}}}`;
  },
};
