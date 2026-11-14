// ELEMENTOS SUELTOS (los que se añaden dentro de una sección o contenedor)
// Cada uno es { id, label, type, crear }. Para añadir otro: una entrada aquí.

import { n, titulo, texto, boton, imagen, placeholder, icono } from './util.js';

export const ELEMENTS = [
  { id: 'section', label: 'Sección vacía', type: 'section', crear: () =>
    n('section', {
      name: 'Sección',
      styles: { display: 'flex', flexDirection: 'column', gap: '16px', padding: '64px 32px', minHeight: '120px' },
      mobile: { padding: '40px 20px' },
    }) },
  { id: 'container', label: 'Contenedor', type: 'container', crear: () =>
    n('container', {
      name: 'Contenedor',
      styles: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', minHeight: '60px' },
    }) },
  { id: 'heading', label: 'Título', type: 'heading', crear: () => titulo('Nuevo título', 2, { fontSize: '32px' }) },
  { id: 'text', label: 'Texto', type: 'text', crear: () => texto('Escribe aquí tu texto.', { lineHeight: '1.5' }) },
  { id: 'button', label: 'Botón', type: 'button', crear: () => boton('Botón', '#') },
  { id: 'image', label: 'Imagen', type: 'image', crear: () => imagen(placeholder(), 'Imagen', { borderRadius: '12px' }) },
  { id: 'icon', label: 'Icono', type: 'icon', crear: () => icono('star') },
];

export function createElement(id) {
  const e = ELEMENTS.find((x) => x.id === id);
  if (!e) throw new Error(`Elemento desconocido: ${id}`);
  return e.crear();
}
