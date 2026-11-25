// Plantillas de `create`. Se construyen con los MISMOS bloques del editor (createBlock), no son copias de un JSON:
// si un bloque cambia, la plantilla se actualiza sola. Son combinaciones de bloques con el texto de ejemplo del editor.
// (Plantillas con contenido real, tipo "saas" o "portfolio", son trabajo pendiente: ver ROADMAP.md.)
import { createBlock, createPage } from './lib/editor.js';

export const TEMPLATES = {
  minimal: {
    summary: 'Navbar, hero and footer',
    blocks: [['navbar', 'claro'], ['hero', 'oscuro'], ['footer', 'simple']],
  },
  landing: {
    summary: 'Navbar, hero, services, gallery, testimonials, pricing, contact and footer',
    blocks: [['navbar', 'claro'], ['hero', 'oscuro'], ['services', 'tarjetas'], ['gallery', 'cuadricula'], ['testimonials', 'oscuro'], ['pricing', 'tres'], ['contact', 'simple'], ['footer', 'simple']],
  },
};

/** Devuelve el contenido de un page.json (con el mismo envoltorio que "Guardar JSON" del editor). */
export function buildTemplate(nombre, titulo) {
  const t = TEMPLATES[nombre];
  if (!t) throw new Error(`Unknown template "${nombre}"`);
  const page = createPage();
  page.content.title = titulo;
  for (const [bloque, variante] of t.blocks) page.children.push(createBlock(bloque, variante));
  dejarSinEnlacesRotos(page);
  return { app: 'editor-landings', version: 1, page };
}

/** El navbar y el footer traen enlaces a secciones (#servicios, #precios...) que una plantilla corta no incluye.
 *  Esos enlaces se dejan en "#" (el audit los avisa como enlace pendiente) en vez de apuntar a un ancla que no existe. */
function dejarSinEnlacesRotos(page) {
  const anclas = new Set();
  const nodos = [];
  (function recorrer(n) { nodos.push(n); if (n.content?.anchor) anclas.add(n.content.anchor); (n.children ?? []).forEach(recorrer); })(page);
  for (const n of nodos) {
    const h = n.content?.href;
    if (typeof h === 'string' && h.length > 1 && h.startsWith('#') && !anclas.has(h.slice(1))) n.content.href = '#';
  }
}
