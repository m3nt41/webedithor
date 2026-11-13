// REGISTRO DE BLOQUES
// Para añadir un bloque: crea su archivo en esta carpeta e impórtalo aquí.
// Cada bloque: { id, label, variants: { clave: { label, crear } } }.

import hero from './hero.js';
import services from './services.js';
import gallery from './gallery.js';
import testimonials from './testimonials.js';
import pricing from './pricing.js';
import contact from './contact.js';
import footer from './footer.js';
import navbar from './navbar.js';

export const BLOCKS = [navbar, hero, services, gallery, testimonials, pricing, contact, footer];

/** Crea un bloque nuevo. variant opcional (por defecto la primera). */
export function createBlock(blockId, variant) {
  const bloque = BLOCKS.find((b) => b.id === blockId);
  if (!bloque) throw new Error(`Bloque desconocido: ${blockId}`);
  const v = bloque.variants[variant] ?? Object.values(bloque.variants)[0];
  const nodo = v.crear();
  // Ancla por defecto del bloque (para que los enlaces #contacto, #precios... funcionen)
  if (bloque.ancla) nodo.content.anchor = bloque.ancla;
  // Marca para que addElement lo ponga arriba de todo (el navbar)
  if (bloque.alInicio) nodo.content.alInicio = true;
  return nodo;
}
