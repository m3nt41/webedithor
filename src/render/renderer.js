// RENDERER: convierte el árbol JSON en elementos DOM reales.
// Cada elemento lleva data-id para poder seleccionarlo con un clic.
// Los estilos van inline (más simple de editar en vivo). El exportador de la
// Etapa 2 los convertirá a CSS con clases.

// Qué etiqueta HTML usa cada tipo de nodo
const TAGS = { page: 'div', section: 'section', container: 'div', heading: 'h2', text: 'p', button: 'a', image: 'img' };

/** Estilos efectivos de un nodo según la vista: base + (mobile si toca). */
export function effectiveStyles(node, viewMode) {
  return viewMode === 'mobile' ? { ...node.styles.base, ...node.styles.mobile } : node.styles.base;
}

/** Construye el DOM de un nodo y sus hijos. */
export function renderNode(node, viewMode = 'desktop') {
  const tag = node.type === 'heading' ? `h${node.content.level ?? 2}` : TAGS[node.type] ?? 'div';
  const el = document.createElement(tag);
  el.dataset.id = node.id;
  el.dataset.type = node.type;

  Object.assign(el.style, effectiveStyles(node, viewMode));

  if (node.type === 'heading' || node.type === 'text' || node.type === 'button') {
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
