// BLOQUE GALERÍA
// Fotos de relleno en grises cálidos; todo recto y sin sombras (ver tema.js).

import { t as tr } from '../i18n/index.js';
import { n, imagen, placeholder, seccion, tit, etiqueta, fondoModo } from './util.js';
import { MODOS, colorPh, C } from './tema.js';

const foto = (i, w = 600, h = 450, extra = {}, color = colorPh(i)) =>
  imagen(placeholder(w, h, color, `Foto ${i + 1}`), `Foto ${i + 1}`, { objectFit: 'cover', ...extra }, `Foto ${i + 1}`);

const cabecera = (t) => tit(2, t, { textAlign: 'center' });

export default {
  id: 'gallery',
  label: tr('bloque.galeria'),
  variants: {
    cuadricula: { label: tr('bloque.cuadricula_3'), crear: () => {
      const m = MODOS.claro;
      return seccion('Galería', { gap: '56px', ...fondoModo(m) }, [
        cabecera('Galería'),
        n('container', { name: 'Grid', styles: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', hijosAspectRatio: '4 / 3' }, mobile: { gridTemplateColumns: '1fr 1fr', gap: '12px' },
          children: [0, 1, 2, 3, 4, 5].map((i) => foto(i)) }),
      ]);
    } },

    destacada: { label: tr('bloque.foto_destacada'), crear: () => {
      const m = MODOS.claro2;
      return seccion('Galería', { gap: '56px', ...fondoModo(m) }, [
        cabecera('Nuestro trabajo'),
        n('container', { name: 'Grid', styles: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', hijosAspectRatio: '1 / 1' }, mobile: { gridTemplateColumns: '1fr 1fr', gap: '12px' },
          children: [
            foto(0, 1200, 900, { gridColumn: 'span 2', gridRow: 'span 2', height: '100%', aspectRatio: 'auto' }),
            foto(1), foto(2), foto(3), foto(4),
          ] }),
      ]);
    } },

    fila: { label: tr('bloque.fila_de_4'), crear: () => {
      const m = MODOS.claro;
      return seccion('Galería', { gap: '48px', ...fondoModo(m) }, [
        cabecera('Momentos'),
        n('container', { name: 'Grid', styles: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', hijosAspectRatio: '4 / 5' }, mobile: { gridTemplateColumns: '1fr 1fr', gap: '12px' },
          children: [0, 1, 2, 3].map((i) => foto(i, 500, 620)) }),
      ]);
    } },

    oscura: { label: tr('bloque.oscura'), crear: () => {
      const m = MODOS.oscuro;
      return seccion('Galería', { gap: '56px', ...fondoModo(m) }, [
        cabecera('Portafolio'),
        n('container', { name: 'Grid', styles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', hijosAspectRatio: '3 / 2' },
          children: [0, 1, 2].map((i) => foto(i, 700, 460, {}, i % 2 ? C.phOscuro : colorPh(i))) }),
      ]);
    } },
  },
};
