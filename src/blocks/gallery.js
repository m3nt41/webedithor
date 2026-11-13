// BLOQUE GALERÍA

import { n, titulo, imagen, placeholder, seccion } from './util.js';

const COLORES = ['#d9d9e3', '#e6dcf7', '#d8ecf0', '#f3e0d6', '#dfe8d4', '#f0d9e3'];
const foto = (i, w = 600, h = 450, extra = {}) =>
  imagen(placeholder(w, h, COLORES[i % COLORES.length], `Foto ${i + 1}`), `Foto ${i + 1}`, { borderRadius: '12px', objectFit: 'cover', ...extra }, `Foto ${i + 1}`);

const cabecera = (t, color) => titulo(t, 2, { fontSize: '40px', textAlign: 'center', ...(color ? { color } : {}) }, { fontSize: '30px' });

export default {
  id: 'gallery',
  label: 'Galería',
  variants: {
    cuadricula: { label: 'Cuadrícula 3', crear: () =>
      seccion('Galería', { gap: '40px', background: '#ffffff' }, [
        cabecera('Galería'),
        n('container', { name: 'Grid', styles: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }, mobile: { gridTemplateColumns: '1fr 1fr', gap: '10px' },
          children: [0, 1, 2, 3, 4, 5].map((i) => foto(i)) }),
      ]) },

    destacada: { label: 'Foto destacada', crear: () =>
      seccion('Galería', { gap: '40px', background: '#ffffff' }, [
        cabecera('Nuestro trabajo'),
        n('container', { name: 'Grid', styles: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }, mobile: { gridTemplateColumns: '1fr 1fr', gap: '10px' },
          children: [
            foto(0, 1200, 900, { gridColumn: 'span 2', gridRow: 'span 2', height: '100%' }),
            foto(1), foto(2), foto(3), foto(4),
          ] }),
      ]) },

    fila: { label: 'Fila de 4', crear: () =>
      seccion('Galería', { gap: '32px', background: '#f6f5ff' }, [
        cabecera('Momentos'),
        n('container', { name: 'Grid', styles: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }, mobile: { gridTemplateColumns: '1fr 1fr', gap: '10px' },
          children: [0, 1, 2, 3].map((i) => foto(i, 500, 620, { aspectRatio: '4 / 5' })) }),
      ]) },

    oscura: { label: 'Oscura', crear: () =>
      seccion('Galería', { gap: '40px', background: '#0b0b10', color: '#ffffff' }, [
        cabecera('Portafolio'),
        n('container', { name: 'Grid', styles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' },
          children: [0, 1, 2].map((i) => foto(i, 700, 460, { borderRadius: '4px' })) }),
      ]) },
  },
};
