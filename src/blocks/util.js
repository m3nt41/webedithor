// ATAJOS PARA ARMAR BLOQUES Y ELEMENTOS
// Funciones cortas que devuelven nodos nuevos. Las usan los bloques (hero, precios...)
// y los elementos sueltos (elements.js). Así cada variante queda corta y legible.

import { createNode as n } from '../core/tree.js';

export { n };

/** Imagen de relleno (SVG gris con texto) para que se vea algo sin subir fotos. */
export function placeholder(w = 800, h = 500, color = '#d9d9e3', texto = 'Imagen') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<rect width="100%" height="100%" fill="${color}"/>`
    + `<text x="50%" y="50%" fill="#7a7a8c" font-family="sans-serif" font-size="${Math.round(h / 10)}" text-anchor="middle" dominant-baseline="middle">${texto}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Título. level = 1..4. */
export const titulo = (text, level = 2, styles = {}, mobile = {}, name = 'Título') =>
  n('heading', { name, content: { text, level }, styles: { margin: '0', ...styles }, mobile });

/** Párrafo. */
export const texto = (text, styles = {}, mobile = {}, name = 'Texto') =>
  n('text', { name, content: { text }, styles: { margin: '0', ...styles }, mobile });

/** Botón (es un enlace con aspecto de botón). */
export const boton = (text, href = '#', styles = {}, name = 'Botón') =>
  n('button', {
    name,
    content: { text, href },
    styles: {
      display: 'inline-block', padding: '14px 28px', borderRadius: '999px', background: '#7c5cff',
      color: '#fff', textDecoration: 'none', fontWeight: '600', ...styles,
    },
  });

/** Imagen. */
export const imagen = (src, alt = '', styles = {}, name = 'Imagen') =>
  n('image', { name, content: { src, alt }, styles: { width: '100%', ...styles } });

/** Contenedor flex en columna (el más usado). */
export const columna = (name, styles, children, mobile = {}) =>
  n('container', { name, styles: { display: 'flex', flexDirection: 'column', ...styles }, mobile, children });

/** Sección con el padding habitual (móvil más estrecho). */
export const seccion = (name, styles, children, mobile = {}) =>
  n('section', {
    name,
    styles: { display: 'flex', flexDirection: 'column', padding: '96px 32px', ...styles },
    mobile: { padding: '56px 20px', ...mobile },
    children,
  });
