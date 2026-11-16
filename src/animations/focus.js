// ANIMACIÓN "AL ENFOCAR": cuando se llega con el teclado (:focus-visible). CSS puro.
// Solo tiene sentido en botones (enlaces), que son lo enfocable de la página.
// Datos en node.animation.focus = { effect, duration, ease, color }

import { EASES, transicion, camposCurva, sinSpring, DEF_CURVA, modoSombra, filtroConReposo } from './base.js';

const EFECTOS = [
  ['', 'Ninguno'],
  ['ring', 'Anillo'],
  ['glow', 'Resplandor'],
  ['grow', 'Agrandar'],
  ['bright', 'Aclarar'],
];

const REGLAS = {
  ring: (f) => `outline:3px solid ${f.color || '#7c5cff'};outline-offset:4px`,
  // sin caja visible (ver modoSombra): con texto text-shadow, sin texto drop-shadow; el halo de 4px no tiene equivalente y se aproxima con un 2º drop-shadow
  glow: (f, modo) => modo === 'texto'
    ? `outline:0;text-shadow:0 0 3px ${f.color || '#7c5cff'},0 0 10px ${f.color || '#7c5cff'}`
    : modo
      ? `outline:0;filter:drop-shadow(0 0 3px ${f.color || '#7c5cff'}) drop-shadow(0 0 10px ${f.color || '#7c5cff'})`
      : `outline:0;box-shadow:0 0 0 4px ${f.color || '#7c5cff'}55,0 0 28px ${f.color || '#7c5cff'}`,
  grow: () => 'transform:scale(1.06)',
  bright: (f, modo, node) => filtroConReposo(node, 'brightness(1.2)'),
};

export default {
  id: 'focus',
  estado: true,
  titulo: 'Al enfocar (teclado)',
  principal: 'effect',
  defaults: { effect: 'ring', duration: 0.2, ease: 'suave', ...DEF_CURVA, color: '#7c5cff' },
  campos: [
    { key: 'effect', label: 'Efecto', kind: 'select', options: EFECTOS },
    { key: 'duration', label: 'Duración (s)', kind: 'num', step: 0.05, min: 0.05, cuando: sinSpring },
    { key: 'ease', label: 'Curva', kind: 'select', options: EASES },
    ...camposCurva,
    { key: 'color', label: 'Color', kind: 'color', cuando: (g, efecto) => efecto === 'ring' || efecto === 'glow' },
  ],

  css(f, sel, node) {
    const regla = REGLAS[f?.effect];
    return regla ? `${sel}:focus-visible{${transicion(f)};${regla(f, modoSombra(node), node)}}` : '';
  },
};
