// REGISTRO DE BLOQUES
// Para añadir un bloque: crea su archivo en esta carpeta e impórtalo aquí.

import hero from './hero.js';
import services from './services.js';
import footer from './footer.js';

export const BLOCKS = [hero, services, footer];

/** Crea un bloque nuevo. variant opcional (por defecto la primera). */
export function createBlock(blockId, variant) {
  const bloque = BLOCKS.find((b) => b.id === blockId);
  if (!bloque) throw new Error(`Bloque desconocido: ${blockId}`);
  const fn = bloque.variants[variant] ?? Object.values(bloque.variants)[0];
  return fn();
}
