// ANIMACIÓN "AL APARECER": el elemento entra cuando se ve en pantalla (scroll).
// Datos en node.animation.appear = { effect, duration, delay, ease, distance }

import { EFECTOS, camposComunes, campoDisparo, animEntrada, cargaInmediata, easeCss } from './base.js';

export default {
  id: 'appear',
  titulo: 'Al aparecer',
  principal: 'effect', // campo que enciende/apaga el grupo ('' = apagado)
  defaults: { effect: 'up', trigger: 'scroll', duration: 0.8, delay: 0, ease: 'suave', distance: 40, angle: -90 },
  campos: [{ key: 'effect', label: 'Efecto', kind: 'select', options: EFECTOS }, campoDisparo, ...camposComunes],

  /** CSS del grupo para el selector `sel` (la clase .in la pone el script al hacer scroll). */
  css(a, sel) {
    if (!a?.effect) return '';
    const d = a.duration ?? 0.8;
    const de = a.delay ?? 0;
    const base = `${sel}{--ad:${a.distance ?? 40}px;--ar:${a.angle ?? -90}deg;animation:${animEntrada(a.effect, d, easeCss(a.ease), `${de}s`, a)}}`;
    return cargaInmediata(a) ? base : `${base}\n${sel}.in{animation-play-state:running}`;
  },
};
