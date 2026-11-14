// Genera docs/guia-ia.md (la misma guía que copia el botón "Copiar guía para IA") y docs/plan-ejemplo.json.
// Uso: node tools/gen-guia-ia.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { guiaIA } from '../src/core/guiaia.js';
import { BLOCKS } from '../src/blocks/index.js';

mkdirSync('docs', { recursive: true });
writeFileSync('docs/guia-ia.md', guiaIA());

// Plan de ejemplo: una landing completa (primera variante de cada bloque habitual, con textos propios en el hero).
const v = (id) => Object.keys(BLOCKS.find((b) => b.id === id).variants)[0];
const plan = { plan: 1, titulo: 'Casa Almendro', secciones: [
  { bloque: 'navbar', variante: v('navbar'), valores: { 1: 'Casa Almendro' } },
  { bloque: 'hero', variante: 'claro', valores: { 1: 'Hospedaje', 2: 'Una casa tranquila a minutos de la playa', 3: 'Habitaciones luminosas, desayuno casero y atención personal durante toda tu estancia.', 4: { texto: 'Reservar', enlace: '#contacto' }, 5: { texto: 'Ver habitaciones', enlace: '#servicios' } } },
  { bloque: 'services', variante: v('services') },
  { bloque: 'gallery', variante: v('gallery') },
  { bloque: 'testimonials', variante: v('testimonials') },
  { bloque: 'pricing', variante: v('pricing') },
  { bloque: 'contact', variante: v('contact') },
  { bloque: 'footer', variante: v('footer') },
] };
writeFileSync('docs/plan-ejemplo.json', JSON.stringify(plan, null, 2) + '\n');
console.log('docs/guia-ia.md y docs/plan-ejemplo.json generados');
