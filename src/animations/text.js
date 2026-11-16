// ANIMACIÓN DE TEXTO: el texto se parte en palabras o letras y cada una entra
// con un pequeño retraso respecto a la anterior (cascada). CSS puro; el JS
// solo pone la clase .in al hacer scroll (igual que "aparecer").
// Datos en node.animation.text = { mode, effect, duration, delay, stagger, ease, distance }

import { EFECTOS, camposComunes, campoDisparo, animEntrada, cargaInmediata, curva, duracion, DEF_CURVA } from './base.js';

/** Cascada total máxima (s) entre la primera y la última pieza de un texto partido. Un título de hasta ~34 letras
 *  (33 saltos x 0,06 s) queda igual que siempre; un párrafo largo ya no tarda decenas de segundos. */
export const TOPE_CASCADA = 2;

export default {
  id: 'text',
  titulo: 'Animación de texto',
  principal: 'mode',
  defaults: { mode: 'words', effect: 'up', trigger: 'scroll', duration: 0.7, delay: 0, stagger: 0.06, ease: 'suave', ...DEF_CURVA, distance: 30, angle: -90 },
  campos: [
    { key: 'mode', label: 'Partir por', kind: 'select', options: [['', 'Ninguna'], ['words', 'Palabras'], ['chars', 'Letras'], ['lines', 'Por línea (mis saltos)'], ['linesm', 'Por línea (medida)']] },
    { key: 'effect', label: 'Efecto', kind: 'select', options: EFECTOS.slice(1) },
    campoDisparo,
    { key: 'stagger', label: 'Cascada (s)', kind: 'num', step: 0.01, min: 0 },
    ...camposComunes,
  ],

  css(t, sel) {
    if (!t?.mode) return '';
    const efecto = t.effect || 'up';
    const d = duracion(t, 0.7);
    const de = t.delay ?? 0;
    const st = t.stagger ?? 0.06;
    // Retardo de cada pieza = i x cascada, pero la cascada TOTAL (de la primera a la última pieza) nunca pasa de
    // TOPE_CASCADA s: la cascada efectiva es min(cascada, TOPE / nº de saltos). --g (nº de saltos) lo pone el
    // exportador en el elemento. En 'linesm' --i cuenta líneas (pocas), así que no lleva tope.
    const paso = t.mode === 'linesm' ? `${st}s` : `min(${st}s, ${TOPE_CASCADA}s / var(--g, 1))`;
    const base = `${sel} .w{display:inline-block;--ad:${t.distance ?? 30}px;--ar:${t.angle ?? -90}deg;animation:${animEntrada(efecto, d, curva(t), `calc(${de}s + var(--i)*${paso})`, t)}}
${sel} .ww{display:inline-block;white-space:nowrap}${t.mode === 'lines' ? `
${sel} .ln{display:block}` : ''}`;
    return cargaInmediata(t) ? base : `${base}\n${sel}.in .w{animation-play-state:running}`;
  },
};

/**
 * Parte un texto en piezas para animarlo. Devuelve una lista de:
 *   { t:'br' } | { t:'sp' } | { t:'w', chars:bool, units:[{ s, i }] } | { t:'ln', s, i }
 * `i` = posición en la cascada (variable CSS --i). Lo usan el preview y el exportador.
 * Modos: words, chars, lines (cada línea escrita por el usuario = una pieza; { t:'ln', s:'' } = línea vacía
 * sin animar) y linesm (como words; el script de medición reasigna --i por línea visual).
 */
export function splitText(texto, mode) {
  const piezas = [];
  let i = 0;
  const lineas = String(texto ?? '').split('\n');
  if (mode === 'lines') {
    lineas.forEach((linea) => piezas.push(linea.trim() ? { t: 'ln', s: linea, i: i++ } : { t: 'ln', s: '', i: -1 }));
    return piezas;
  }
  lineas.forEach((linea, n) => {
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

/** Nº de saltos de la cascada (última posición `i`, mínimo 1): lo escribe el exportador como --g. */
export function saltosCascada(texto, mode) {
  let max = 1;
  for (const p of splitText(texto, mode)) {
    if (p.t === 'w') for (const u of p.units) max = Math.max(max, u.i);
    else if (p.t === 'ln') max = Math.max(max, p.i);
  }
  return max;
}

export const esMedida = (mode) => mode === 'linesm';

/**
 * Medición de líneas (modo "Por línea (medida)"). Función AUTÓNOMA (no usa nada de fuera):
 * el exportador la mete tal cual en un <script>, y el preview la llama directo.
 * Agrupa las palabras (.w) de cada [data-lm] por su posición vertical y pone --i = nº de línea.
 * offsetTop ignora transforms, así que da igual si la animación está a medias.
 */
export function medirLineas(raiz) {
  raiz.querySelectorAll('[data-lm]').forEach((el) => {
    let linea = -1, ultimo = null;
    el.querySelectorAll('.w').forEach((w) => {
      if (ultimo === null || Math.abs(w.offsetTop - ultimo) > 2) { linea++; ultimo = w.offsetTop; }
      if (w.style.getPropertyValue('--i') !== String(linea)) w.style.setProperty('--i', linea);
    });
  });
}

/** Script del exportador: mide al cargar, al redimensionar y cuando terminan de cargar las fuentes. */
export const SCRIPT_LINEAS = `const medir=${medirLineas.toString()};let tm;const run=()=>{cancelAnimationFrame(tm);tm=requestAnimationFrame(()=>medir(document))};
medir(document);addEventListener('resize',run);if(document.fonts&&document.fonts.ready)document.fonts.ready.then(run);`;
