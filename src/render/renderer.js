// RENDERER: convierte el árbol JSON en elementos DOM reales.
// Cada elemento lleva data-id para poder seleccionarlo con un clic.
// Los estilos van inline (más simple de editar en vivo). El exportador
// (src/export/exporter.js) los convierte a CSS con clases.

import { anchorValido } from '../core/tree.js';

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

/** Construye el DOM de un nodo y sus hijos (modo edición: sin animaciones de scroll ni texto partido; eso se ve en la Vista previa). */
export function renderNode(node, viewMode = 'desktop') {
  const el = document.createElement(tagFor(node));
  el.dataset.id = node.id;
  el.dataset.type = node.type;
  // Ancla (content.anchor) -> id="..." solo si es válida (mismo criterio que el exportador)
  if (anchorValido(node.content?.anchor)) el.id = node.content.anchor;
  Object.assign(el.style, effectiveStyles(node, viewMode));

  if (TIPOS_TEXTO.includes(node.type)) {
    el.textContent = node.content.text ?? '';
    if (node.type === 'button') el.setAttribute('href', node.content.href ?? '#');
  }
  if (node.type === 'image') {
    el.src = node.content.src ?? '';
    el.alt = node.content.alt ?? '';
  }

  node.children.forEach((hijo) => el.appendChild(renderNode(hijo, viewMode)));

  return el;
}

