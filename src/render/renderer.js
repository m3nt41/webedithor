// RENDERER: convierte el árbol JSON en elementos DOM reales.
// Cada elemento lleva data-id para poder seleccionarlo con un clic.
// Los estilos van inline (más simple de editar en vivo). El exportador
// (src/export/exporter.js) los convierte a CSS con clases.

import { anchorValido, aspectoValido, CLAVES_PROPIAS, fondoDeclaraciones } from '../core/tree.js';
import { iconoSvg, estilosIcono } from '../core/icono.js';
import { usaMenuMovil, varsMenu, necesitaAncla } from '../core/menumovil.js';

// Qué etiqueta HTML usa cada tipo de nodo (también la usa el exportador)
const TAGS = { page: 'div', section: 'section', container: 'div', heading: 'h2', text: 'p', button: 'a', image: 'img', icon: 'span' };

export function tagFor(node) {
  return node.type === 'heading' ? `h${node.content.level ?? 2}` : TAGS[node.type] ?? 'div';
}

/** Tipos cuyo texto se edita directamente. */
export const TIPOS_TEXTO = ['heading', 'text', 'button'];

/** Estilos efectivos de un nodo según la vista: base + (mobile si toca). */
export function effectiveStyles(node, viewMode) {
  return viewMode === 'mobile' ? { ...node.styles.base, ...node.styles.mobile } : node.styles.base;
}

/** Menús hamburguesa abiertos en el editor (ids de navbar). Solo en memoria: no se guarda en el JSON. */
export const estadoMenu = { abiertos: new Set() };

/** Construye el DOM de un nodo y sus hijos (modo edición: sin animaciones de scroll ni texto partido; eso se ve en la Vista previa). */
export function renderNode(node, viewMode = 'desktop') {
  const el = document.createElement(tagFor(node));
  el.dataset.id = node.id;
  el.dataset.type = node.type;
  // Ancla (content.anchor) -> id="..." solo si es válida (mismo criterio que el exportador)
  if (anchorValido(node.content?.anchor)) el.id = node.content.anchor;
  const est = effectiveStyles(node, viewMode);
  if (node.type === 'icon') { // caja con tamaño/color del nodo + el mismo SVG que usa el export
    Object.assign(el.style, estilosIcono({}));
    el.innerHTML = iconoSvg(node.content.name);
  }
  Object.assign(el.style, Object.fromEntries(Object.entries(est).filter(([k]) => !CLAVES_PROPIAS.includes(k))));
  Object.assign(el.style, fondoDeclaraciones(est)); // imagen de fondo (después del color: la imagen va encima)

  if (TIPOS_TEXTO.includes(node.type)) {
    el.textContent = node.content.text ?? '';
    if (node.type === 'button') el.setAttribute('href', node.content.href ?? '#');
  }
  if (node.type === 'image') {
    el.src = node.content.src ?? '';
    el.alt = node.content.alt ?? '';
  }

  // "Proporción de los hijos" (solo grid): las imágenes hijas directas la heredan, salvo lo que ya tengan propio
  // (en el export es la regla :where(.cls>img), aquí se hace inline porque el preview usa estilos inline)
  const hijosAspecto = node.type !== 'image' && est.display === 'grid' && aspectoValido(est.hijosAspectRatio) ? est.hijosAspectRatio.trim() : null;
  node.children.forEach((hijo) => {
    const h = renderNode(hijo, viewMode);
    if (hijosAspecto && hijo.type === 'image') {
      const own = effectiveStyles(hijo, viewMode);
      if (!own.aspectRatio) h.style.aspectRatio = hijosAspecto;
      if (!own.objectFit) h.style.objectFit = 'cover';
    }
    el.appendChild(h);
  });

  // Menú hamburguesa (vista móvil del editor): icono + panel SUPERPUESTO (como en el export). Empieza cerrado; se abre con
  // la clase .abierto (la maneja preview.js: clic en el icono o selección de un hijo del panel). Los hijos del panel van en un
  // <div class="mm-pn"> generado, sin data-id (un clic en él selecciona la barra). Las reglas viven en CSS_MENU_EDITOR (preview.js).
  if (viewMode === 'mobile' && usaMenuMovil(node)) {
    el.classList.add('mm-edit');
    Object.entries(varsMenu(est)).forEach(([k, v]) => el.style.setProperty(k, v));
    if (necesitaAncla(est)) { el.style.position = 'relative'; el.style.zIndex = '50'; } // ancla del panel
    if (estadoMenu.abiertos.has(node.id)) el.classList.add('abierto');
    const icono = document.createElement('span');
    icono.className = 'mm-btn';
    icono.setAttribute('aria-hidden', 'true');
    const panel = document.createElement('div');
    panel.className = 'mm-pn';
    [...el.children].slice(1).forEach((h) => panel.appendChild(h));
    el.append(icono, panel);
  }

  return el;
}

