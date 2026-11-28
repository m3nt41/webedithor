// ANIMACIÓN "AL APARECER": el elemento entra cuando se ve en pantalla (scroll).
// Datos en node.animation.appear = { effect, duration, delay, ease, distance }

import { t } from '../i18n/index.js';
import { EFECTOS, camposComunes, campoDisparo, animEntrada, cargaInmediata, curva, duracion, DEF_CURVA } from './base.js';

export default {
  id: 'appear',
  titulo: t('anim.al_aparecer'),
  principal: 'effect', // campo que enciende/apaga el grupo ('' = apagado)
  defaults: { effect: 'up', trigger: 'scroll', duration: 0.8, delay: 0, ease: 'suave', ...DEF_CURVA, distance: 40, angle: -90 },
  campos: [{ key: 'effect', label: t('anim.efecto'), kind: 'select', options: EFECTOS }, campoDisparo, ...camposComunes],

  /** CSS del grupo para el selector `sel` (la clase .in la pone el script al hacer scroll). */
  css(a, sel) {
    if (!a?.effect) return '';
    const d = duracion(a, 0.8);
    const de = a.delay ?? 0;
    const base = `${sel}{--ad:${a.distance ?? 40}px;--ar:${a.angle ?? -90}deg;animation:${animEntrada(a.effect, d, curva(a), `${de}s`, a)}}`;
    return cargaInmediata(a) ? base : `${base}\n${sel}.in{animation-play-state:running}`;
  },
};
