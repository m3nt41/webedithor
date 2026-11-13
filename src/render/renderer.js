// RENDERER: convierte el árbol JSON en elementos DOM reales.
// Cada elemento lleva data-id para poder seleccionarlo con un clic.
// Los estilos van inline (más simple de editar en vivo). El exportador
// (src/export/exporter.js) los convierte a CSS con clases.

import { splitText, usaScroll } from '../animations/index.js';

// Qué etiqueta HTML usa cada tipo de nodo (también la usa el exportador)
const TAGS = { page: 'div', section: 'section', container: 'div', heading: 'h2', text: 'p', button: 'a', image: 'img' };

export function tagFor(node) {
  return node.type === 'heading' ? `h${node.content.level ?? 2}` : TAGS[node.type] ?? 'div';
}

/** Tipos cuyo texto se edita directamente. */
export const TIPOS_TEXTO = ['heading', 'text', 'button'];

/** Estilos efectivos de un nodo según la vista: base + (mobile si toca). */
export function effectiveStyles(node, viewMode) {
  return viewMode === 'mobile' ? { ...node.styles.base, ...node.styles.mobile } : node.styles.base;
}

/** Construye el DOM de un nodo y sus hijos.
 *  opts.play = true → modo "reproducir animaciones": marca data-rv y parte el
 *  texto animado en palabras/letras (si no, el texto queda como texto plano). */
export function renderNode(node, viewMode = 'desktop', opts = {}) {
  const el = document.createElement(tagFor(node));
  el.dataset.id = node.id;
  el.dataset.type = node.type;
  if (opts.play && usaScroll(node)) el.dataset.rv = '';

  Object.assign(el.style, effectiveStyles(node, viewMode));

  if (TIPOS_TEXTO.includes(node.type)) {
    const modo = node.animation?.text?.mode;
    if (opts.play && modo) el.append(...textoPartido(node.content.text, modo));
    else el.textContent = node.content.text ?? '';
    if (node.type === 'button') el.setAttribute('href', node.content.href ?? '#');
  }
  if (node.type === 'image') {
    el.src = node.content.src ?? '';
    el.alt = node.content.alt ?? '';
  }

  node.children.forEach((hijo) => el.appendChild(renderNode(hijo, viewMode, opts)));
  return el;
}

/** Texto -> lista de nodos DOM con <span class="w" style="--i:N"> por palabra/letra. */
function textoPartido(texto, modo) {
  const span = (clase, s, i) => {
    const e = document.createElement('span');
    e.className = clase;
    if (i != null) e.style.setProperty('--i', i);
    if (s != null) e.textContent = s;
    return e;
  };
  return splitText(texto, modo).map((p) => {
    if (p.t === 'br') return document.createElement('br');
    if (p.t === 'sp') return document.createTextNode(' ');
    if (!p.chars) return span('w', p.units[0].s, p.units[0].i);
    const ww = span('ww');
    p.units.forEach((u) => ww.appendChild(span('w', u.s, u.i)));
    return ww;
  });
}
