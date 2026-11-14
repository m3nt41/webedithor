// Genera docs/demo-estilo.json: una landing con un bloque de cada tipo, alternando claro/oscuro.
// Se abre en el editor con "Abrir JSON". Ejecutar: node tools/gen-demo-estilo.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { createBlock } from '../src/blocks/index.js';
import { createPage } from '../src/core/tree.js';

const page = createPage();
page.content.title = 'Demo de estilo';
const orden = [['navbar', 'claro'], ['hero', 'oscuro'], ['services', 'tarjetas'], ['gallery', 'oscura'], ['testimonials', 'cita'],
  ['pricing', 'oscuro'], ['scene', 'imagenes'], ['contact', 'oscuro'], ['footer', 'centrado']];
for (const [b, v] of orden) { const nodo = createBlock(b, v); delete nodo.content.alInicio; page.children.push(nodo); }
mkdirSync('docs', { recursive: true });
writeFileSync('docs/demo-estilo.json', JSON.stringify({ app: 'editor-landings', version: 1, page }, null, 2));
console.log('docs/demo-estilo.json con', page.children.length, 'bloques');
