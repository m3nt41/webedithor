// Genera docs/guia-ia.md (la misma guía que copia el botón "Copiar guía para IA") y docs/plan-ejemplo.json.
// Uso: node tools/gen-guia-ia.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { guiaIA } from '../src/core/guiaia.js';
import { ejemplosPlan } from '../src/core/guiaia-ejemplos.js';

mkdirSync('docs', { recursive: true });
writeFileSync('docs/guia-ia.md', guiaIA());

// Plan de ejemplo: el primero de la guía (cafetería, landing completa de 8 secciones con todos los textos propios).
writeFileSync('docs/plan-ejemplo.json', JSON.stringify(ejemplosPlan()[0], null, 2) + '\n');
console.log('docs/guia-ia.md y docs/plan-ejemplo.json generados');
