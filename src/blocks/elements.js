// ELEMENTOS SUELTOS (los que se añaden dentro de una sección o contenedor)
// Cada uno es { id, label, type, crear }. Para añadir otro: una entrada aquí.

import { t } from '../i18n/index.js';
import { n, texto, boton, imagen, placeholder, icono, tit } from './util.js';
import { C, CUERPO, AIRE, colorPh, MODOS } from './tema.js';
import { cintaTira } from './marquesina.js';

export const ELEMENTS = [
  { id: 'section', label: t('bloque.seccion_vacia'), type: 'section', crear: () =>
    n('section', {
      name: 'Sección',
      styles: { display: 'flex', flexDirection: 'column', gap: '16px', padding: `${AIRE.m} 32px`, minHeight: '120px', background: C.papel, color: C.tinta },
      mobile: { padding: '40px 20px' },
    }) },
  { id: 'container', label: t('bloque.contenedor'), type: 'container', crear: () =>
    n('container', {
      name: 'Contenedor',
      styles: { display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', minHeight: '60px' },
    }) },
  { id: 'heading', label: t('bloque.titulo'), type: 'heading', crear: () => tit(2, 'Nuevo título', { fontSize: '32px' }, { fontSize: '26px' }) },
  { id: 'text', label: t('bloque.texto'), type: 'text', crear: () => texto('Escribe aquí tu texto.', { ...CUERPO.d, color: C.gris }) },
  { id: 'button', label: t('bloque.boton'), type: 'button', crear: () => boton('Botón', '#') },
  { id: 'image', label: t('bloque.imagen'), type: 'image', crear: () => imagen(placeholder(800, 500, colorPh(0)), 'Imagen') },
  { id: 'icon', label: t('bloque.icono'), type: 'icon', crear: () => icono('star') },
  { id: 'marquesina', label: t('bloque.marquesina'), type: 'container', crear: () => cintaTira(MODOS.claro) },
];

export function createElement(id) {
  const e = ELEMENTS.find((x) => x.id === id);
  if (!e) throw new Error(`Elemento desconocido: ${id}`);
  return e.crear();
}
