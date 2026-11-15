// ANIMACIÓN "AL PASAR EL MOUSE": CSS puro (transition + :hover), sin JS.
// Datos en node.animation.hover = { effect, duration, ease, color }

import { EASES, transicion, camposCurva, sinSpring, DEF_CURVA, sinCaja } from './base.js';

const EFECTOS = [
  ['', 'Ninguno'],
  ['lift', 'Elevar'],
  ['grow', 'Agrandar'],
  ['shrink', 'Encoger'],
  ['tilt', 'Inclinar'],
  ['glow', 'Resplandor'],
  ['bright', 'Aclarar'],
];

// Qué cambia al hacer hover en cada efecto
// 2º parámetro: true si el elemento no tiene caja visible (ver sinCaja). Entonces la sombra
// va con filter:drop-shadow (sigue las letras) en vez de box-shadow (sigue el rectángulo).
const REGLAS = {
  lift: (h, plano) => plano
    ? 'transform:translateY(-6px);filter:drop-shadow(0 8px 10px rgba(0,0,0,.28))'
    : 'transform:translateY(-6px);box-shadow:0 14px 30px rgba(0,0,0,.28)',
  grow: () => 'transform:scale(1.06)',
  shrink: () => 'transform:scale(.95)',
  tilt: () => 'transform:rotate(-2deg) scale(1.04)',
  glow: (h, plano) => plano
    ? `filter:drop-shadow(0 0 10px ${h.color || '#7c5cff'})`
    : `box-shadow:0 0 28px ${h.color || '#7c5cff'}`,
  bright: () => 'filter:brightness(1.2)',
};

export default {
  id: 'hover',
  estado: true, // se ve siempre en el preview
  titulo: 'Al pasar el mouse',
  principal: 'effect',
  defaults: { effect: 'lift', duration: 0.25, ease: 'suave', ...DEF_CURVA, color: '#7c5cff' },
  campos: [
    { key: 'effect', label: 'Efecto', kind: 'select', options: EFECTOS },
    { key: 'duration', label: 'Duración (s)', kind: 'num', step: 0.05, min: 0.05, cuando: sinSpring },
    { key: 'ease', label: 'Curva', kind: 'select', options: EASES },
    ...camposCurva,
    { key: 'color', label: 'Color', kind: 'color', cuando: (g, efecto) => efecto === 'glow' },
  ],

  css(h, sel, node) {
    const regla = REGLAS[h?.effect];
    if (!regla) return '';
    // la transición base (para soltar) la pone cssNodo; aquí va la de entrar al estado
    return `${sel}:hover{${transicion(h)};${regla(h, sinCaja(node))}}`;
  },
};
