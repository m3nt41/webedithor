// CASCADA ENTRE HIJOS: los elementos de un contenedor/sección entran uno tras otro.
// CSS puro: cada hijo recibe su animación con un retraso = retraso + posición × cascada
// (se escribe una regla :nth-child(k) por hijo; el editor conoce cuántos hay al exportar).
// Los hijos que ya tienen su propia animación de entrada (Al aparecer / texto) se respetan
// y NO entran en la cascada.
// Datos en node.animation.stagger = { effect, trigger, duration, delay, step, ease, distance, angle }

import { EFECTOS, camposComunes, campoDisparo, animEntrada, cargaInmediata, curva, duracion, DEF_CURVA } from './base.js';

const tieneEntradaPropia = (n) => Boolean(n.animation?.appear?.effect || n.animation?.text?.mode);

export default {
  id: 'stagger',
  titulo: 'Cascada de hijos',
  principal: 'effect',
  defaults: { effect: 'up', trigger: 'scroll', duration: 0.7, delay: 0, step: 0.12, ease: 'suave', ...DEF_CURVA, distance: 40, angle: -90 },
  campos: [
    { key: 'effect', label: 'Efecto', kind: 'select', options: EFECTOS },
    campoDisparo,
    { key: 'step', label: 'Cascada entre hijos (s)', kind: 'num', step: 0.01, min: 0 },
    ...camposComunes,
  ],

  /** `nodo` = el contenedor; sus hijos deciden qué reglas :nth-child se escriben. */
  css(s, sel, nodo) {
    if (!s?.effect || !nodo?.children?.length) return '';
    const d = duracion(s, 0.7);
    const de = s.delay ?? 0;
    const paso = s.step ?? 0.12;
    const carga = cargaInmediata(s);
    const reglas = [];
    const corriendo = [];
    nodo.children.forEach((h, k) => {
      if (tieneEntradaPropia(h)) return; // su animación manda
      const hijo = `${sel} > :nth-child(${k + 1})`;
      const anim = animEntrada(s.effect, d, curva(s), `calc(${de}s + ${k}*${paso}s)`, s);
      reglas.push(`${hijo}{--ad:${s.distance ?? 40}px;--ar:${s.angle ?? -90}deg;animation:${anim}}`);
      corriendo.push(`${sel}.in > :nth-child(${k + 1})`);
    });
    if (!reglas.length) return '';
    return carga ? reglas.join('\n') : `${reglas.join('\n')}\n${corriendo.join(',')}{animation-play-state:running}`;
  },
};
