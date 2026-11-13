// ANIMACIÓN DE TEXTO: el texto se parte en palabras o letras y cada una entra
// con un pequeño retraso respecto a la anterior (cascada). CSS puro; el JS
// solo pone la clase .in al hacer scroll (igual que "aparecer").
// Datos en node.animation.text = { mode, effect, duration, delay, stagger, ease, distance }

import { EFECTOS, camposComunes, easeCss } from './base.js';

export default {
  id: 'text',
  titulo: 'Animación de texto',
  principal: 'mode',
  defaults: { mode: 'words', effect: 'up', duration: 0.7, delay: 0, stagger: 0.06, ease: 'suave', distance: 30 },
  campos: [
    { key: 'mode', label: 'Partir por', kind: 'select', options: [['', 'Ninguna'], ['words', 'Palabras'], ['chars', 'Letras']] },
    { key: 'effect', label: 'Efecto', kind: 'select', options: EFECTOS.slice(1) },
    { key: 'stagger', label: 'Cascada (s)', kind: 'num', step: 0.01, min: 0 },
    ...camposComunes,
  ],

  css(t, sel) {
    if (!t?.mode) return '';
    const efecto = t.effect || 'up';
    const d = t.duration ?? 0.7;
    const de = t.delay ?? 0;
    const st = t.stagger ?? 0.06;
    return `${sel} .w{display:inline-block;--ad:${t.distance ?? 30}px;animation:a-${efecto} ${d}s ${easeCss(t.ease)} calc(${de}s + var(--i)*${st}s) backwards paused}
${sel} .ww{display:inline-block;white-space:nowrap}
${sel}.in .w{animation-play-state:running}`;
  },
};

/**
 * Parte un texto en piezas para animarlo. Devuelve una lista de:
 *   { t:'br' } | { t:'sp' } | { t:'w', chars:bool, units:[{ s, i }] }
 * `i` = posición en la cascada (variable CSS --i). Lo usan el preview y el exportador.
 */
export function splitText(texto, mode) {
  const piezas = [];
  let i = 0;
  String(texto ?? '').split('\n').forEach((linea, n) => {
    if (n > 0) piezas.push({ t: 'br' });
    linea.split(/\s+/).filter(Boolean).forEach((palabra, k) => {
      if (k > 0) piezas.push({ t: 'sp' });
      const chars = mode === 'chars';
      const units = (chars ? [...palabra] : [palabra]).map((s) => ({ s, i: i++ }));
      piezas.push({ t: 'w', chars, units });
    });
  });
  return piezas;
}
