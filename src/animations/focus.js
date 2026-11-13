// ANIMACIÓN "AL ENFOCAR": cuando se llega con el teclado (:focus-visible). CSS puro.
// Solo tiene sentido en botones (enlaces), que son lo enfocable de la página.
// Datos en node.animation.focus = { effect, duration, ease, color }

import { EASES, transicion } from './base.js';

const EFECTOS = [
  ['', 'Ninguno'],
  ['ring', 'Anillo'],
  ['glow', 'Resplandor'],
  ['grow', 'Agrandar'],
  ['bright', 'Aclarar'],
];

const REGLAS = {
  ring: (f) => `outline:3px solid ${f.color || '#7c5cff'};outline-offset:4px`,
  glow: (f) => `outline:0;box-shadow:0 0 0 4px ${f.color || '#7c5cff'}55,0 0 28px ${f.color || '#7c5cff'}`,
  grow: () => 'transform:scale(1.06)',
  bright: () => 'filter:brightness(1.2)',
};

export default {
  id: 'focus',
  estado: true,
  titulo: 'Al enfocar (teclado)',
  principal: 'effect',
  defaults: { effect: 'ring', duration: 0.2, ease: 'suave', color: '#7c5cff' },
  campos: [
    { key: 'effect', label: 'Efecto', kind: 'select', options: EFECTOS },
    { key: 'duration', label: 'Duración (s)', kind: 'num', step: 0.05, min: 0.05 },
    { key: 'ease', label: 'Curva', kind: 'select', options: EASES },
    { key: 'color', label: 'Color', kind: 'color', cuando: (g, efecto) => efecto === 'ring' || efecto === 'glow' },
  ],

  css(f, sel) {
    const regla = REGLAS[f?.effect];
    return regla ? `${sel}:focus-visible{${transicion(f)};${regla(f)}}` : '';
  },
};
