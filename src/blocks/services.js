// BLOQUE SERVICIOS / BENEFICIOS
// Grid de tarjetas. repeat(auto-fit, minmax()) hace que se adapte solo a móvil.

import { createNode as n } from '../core/tree.js';

const tarjeta = (titulo, texto) =>
  n('container', {
    name: 'Tarjeta',
    styles: {
      display: 'flex', flexDirection: 'column', gap: '10px', padding: '28px',
      borderRadius: '16px', background: '#f4f4f7',
    },
    children: [
      n('heading', { name: 'Título', content: { text: titulo, level: 3 }, styles: { fontSize: '22px', margin: '0' } }),
      n('text', { name: 'Texto', content: { text: texto }, styles: { margin: '0', opacity: '0.7', lineHeight: '1.5' } }),
    ],
  });

export default {
  id: 'services',
  label: 'Servicios',
  variants: {
    tarjetas: () =>
      n('section', {
        name: 'Servicios',
        styles: { display: 'flex', flexDirection: 'column', gap: '40px', padding: '96px 32px', background: '#ffffff' },
        mobile: { padding: '56px 20px' },
        children: [
          n('heading', {
            name: 'Título',
            content: { text: 'Lo que hacemos', level: 2 },
            styles: { fontSize: '40px', margin: '0', textAlign: 'center' },
            mobile: { fontSize: '30px' },
          }),
          n('container', {
            name: 'Grid',
            styles: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' },
            children: [
              tarjeta('Diseño', 'Interfaces claras que se sienten únicas.'),
              tarjeta('Animación', 'Movimiento con intención, sin lag.'),
              tarjeta('Entrega', 'Un solo archivo listo para publicar.'),
            ],
          }),
        ],
      }),
  },
};
