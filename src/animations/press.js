// ANIMACIÓN "AL PRESIONAR": mientras se mantiene el clic / el toque (:active). CSS puro.
// Datos en node.animation.press = { effect, duration, ease }

import { EASES, transicion, camposCurva, sinSpring, DEF_CURVA, filtroConReposo } from './base.js';

const EFECTOS = [
  ['', 'Ninguno'],
  ['shrink', 'Encoger'],
  ['sink', 'Hundir'],
  ['grow', 'Agrandar'],
  ['dim', 'Oscurecer'],
  ['bright', 'Aclarar'],
];

const REGLAS = {
  shrink: 'transform:scale(.94)',
  sink: 'transform:translateY(3px) scale(.98)',
  grow: 'transform:scale(1.08)',
  dim: (n) => filtroConReposo(n, 'brightness(.8)'),
  bright: (n) => filtroConReposo(n, 'brightness(1.25)'),
};

export default {
  id: 'press',
  estado: true, // se ve siempre en el preview (como hover)
  titulo: 'Al presionar',
  principal: 'effect',
  defaults: { effect: 'shrink', duration: 0.12, ease: 'suave' },
  campos: [
    { key: 'effect', label: 'Efecto', kind: 'select', options: EFECTOS },
    { key: 'duration', label: 'Duración (s)', kind: 'num', step: 0.05, min: 0.05, cuando: sinSpring },
    { key: 'ease', label: 'Curva', kind: 'select', options: EASES },
    ...camposCurva,
  ],

  // va después de hover en el registro: si se mantiene el clic con el mouse encima, gana press
  css(p, sel, node) {
    const regla = REGLAS[p?.effect];
    return regla ? `${sel}:active{${transicion(p)};${typeof regla === 'function' ? regla(node) : regla}}` : '';
  },
};
