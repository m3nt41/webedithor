// ATAJOS PARA ARMAR BLOQUES Y ELEMENTOS
// Funciones cortas que devuelven nodos nuevos. Las usan los bloques (hero, precios...)
// y los elementos sueltos (elements.js). Así cada variante queda corta y legible.

import { createNode as n } from '../core/tree.js';
import { C, MODOS, H1, H2, H3, LEAD, CUERPO, PEQUENO, ETIQUETA, AIRE, RECTO, padSeccion, botonTema, colorPh } from './tema.js';

export { n };

/** Imagen de relleno (SVG gris con texto) para que se vea algo sin subir fotos. */
export function placeholder(w = 800, h = 500, color = colorPh(0), texto = 'Imagen') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">`
    + `<rect width="100%" height="100%" fill="${color}"/>`
    + `<text x="50%" y="50%" fill="${C.phTexto}" font-family="sans-serif" font-size="${Math.round(h / 10)}" text-anchor="middle" dominant-baseline="middle">${texto}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/** Título. level = 1..4. */
export const titulo = (text, level = 2, styles = {}, mobile = {}, name = 'Título') =>
  n('heading', { name, content: { text, level }, styles: { margin: '0', ...styles }, mobile });

/** Párrafo. */
export const texto = (text, styles = {}, mobile = {}, name = 'Texto') =>
  n('text', { name, content: { text }, styles: { margin: '0', ...styles }, mobile });

/** Botón (es un enlace con aspecto de botón). Por defecto: primario, Mediano, modo claro (ver tema.js). */
export const boton = (text, href = '#', styles = {}, name = 'Botón') =>
  n('button', { name, content: { text, href }, styles: { ...botonTema(MODOS.claro, 'm'), ...styles } });

/** Imagen. */
export const imagen = (src, alt = '', styles = {}, name = 'Imagen') =>
  n('image', { name, content: { src, alt }, styles: { width: '100%', borderRadius: RECTO, ...styles } });

/** Contenedor flex en columna (el más usado). */
export const columna = (name, styles, children, mobile = {}) =>
  n('container', { name, styles: { display: 'flex', flexDirection: 'column', ...styles }, mobile, children });

/** Sección con el padding habitual (móvil más estrecho). */
export const seccion = (name, styles, children, mobile = {}) =>
  n('section', {
    name,
    styles: { display: 'flex', flexDirection: 'column', padding: padSeccion(), ...styles },
    mobile: { padding: `${AIRE.m} 20px`, ...mobile },
    children,
  });

/** Icono (SVG de la biblioteca iconos-data.js). Tamaño = width/height; color = color (hereda del padre si no se pone). */
export const icono = (name = 'star', styles = {}, nombre = 'Icono') =>
  n('icon', { name: nombre, content: { name }, styles: { width: '32px', height: '32px', ...styles } });

/** Fondo + color de texto de un modo del tema (claro, claro2, oscuro, oscuro2). */
export const fondoModo = (m) => ({ background: m.bg, color: m.fg });

// ---- Atajos con la tipografía del tema (m = modo de color: MODOS.claro, MODOS.oscuro...) ----
const NIVELES = { 1: H1, 2: H2, 3: H3 };
/** Título con la escala del tema. nivel 1..3. */
export const tit = (nivel, text, extra = {}, extraMovil = {}, name = 'Título') =>
  titulo(text, nivel, { ...NIVELES[nivel].d, ...extra }, { ...NIVELES[nivel].m, ...extraMovil }, name);
/** Texto de entrada (subtítulo grande, gris del modo). */
export const lead = (text, m, extra = {}, extraMovil = {}, name = 'Subtítulo') =>
  texto(text, { ...LEAD.d, color: m.sec, ...extra }, { ...LEAD.m, ...extraMovil }, name);
/** Texto de cuerpo (gris del modo). */
export const cuerpo = (text, m, extra = {}, name = 'Texto') =>
  texto(text, { ...CUERPO.d, color: m.sec, ...extra }, { ...CUERPO.m }, name);
/** Texto pequeño (gris del modo). */
export const pequeno = (text, m, extra = {}, name = 'Texto') =>
  texto(text, { ...PEQUENO.d, color: m.sec, ...extra }, {}, name);
/** Etiqueta / eyebrow: mayúsculas con letter-spacing amplio. */
export const etiqueta = (text, m, extra = {}, name = 'Etiqueta') =>
  texto(text, { ...ETIQUETA.d, color: m.etiqueta, ...extra }, {}, name);
