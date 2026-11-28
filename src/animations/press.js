// ANIMACIÓN "AL PRESIONAR": mientras se mantiene el clic / el toque (:active). CSS puro.
// Datos en node.animation.press = { effect, duration, ease }

import { t } from '../i18n/index.js';
import { EASES, transicion, camposCurva, sinSpring, DEF_CURVA, filtroConReposo } from './base.js';

const EFECTOS = [
  ['', t('anim.ninguno')],
  ['shrink', t('anim.encoger')],
  ['sink', t('anim.hundir')],
  ['grow', t('anim.agrandar')],
  ['dim', t('anim.oscurecer')],
  ['bright', t('anim.aclarar')],
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
  titulo: t('anim.al_presionar'),
  principal: 'effect',
  defaults: { effect: 'shrink', duration: 0.12, ease: 'suave' },
  campos: [
    { key: 'effect', label: t('anim.efecto'), kind: 'select', options: EFECTOS },
    { key: 'duration', label: t('anim.duracion_s'), kind: 'num', step: 0.05, min: 0.05, cuando: sinSpring },
    { key: 'ease', label: t('anim.curva'), kind: 'select', options: EASES },
    ...camposCurva,
  ],

  // va después de hover en el registro: si se mantiene el clic con el mouse encima, gana press
  css(p, sel, node) {
    const regla = REGLAS[p?.effect];
    return regla ? `${sel}:active{${transicion(p)};${typeof regla === 'function' ? regla(node) : regla}}` : '';
  },
};
