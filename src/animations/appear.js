// ANIMACIÓN "AL APARECER": el elemento entra cuando se ve en pantalla (scroll).
// Datos en node.animation.appear = { effect, duration, delay, ease, distance }

import { EFECTOS, camposComunes, easeCss } from './base.js';

export default {
  id: 'appear',
  titulo: 'Al aparecer (scroll)',
  principal: 'effect', // campo que enciende/apaga el grupo ('' = apagado)
  defaults: { effect: 'up', duration: 0.8, delay: 0, ease: 'suave', distance: 40 },
  campos: [{ key: 'effect', label: 'Efecto', kind: 'select', options: EFECTOS }, ...camposComunes],

  /** CSS del grupo para el selector `sel` (la clase .in la pone el script al hacer scroll). */
  css(a, sel) {
    if (!a?.effect) return '';
    const d = a.duration ?? 0.8;
    const de = a.delay ?? 0;
    return `${sel}{--ad:${a.distance ?? 40}px;animation:a-${a.effect} ${d}s ${easeCss(a.ease)} ${de}s backwards paused}
${sel}.in{animation-play-state:running}`;
  },
};
