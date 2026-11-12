// BLOQUE HERO
// Cada bloque exporta { id, label, variants }. Cada variante es una función
// que devuelve un árbol de nodos NUEVO (con ids nuevos) cada vez que se llama.
// Etapa 1: una variante. En la Etapa 6 se agregan más aquí.

import { createNode as n } from '../core/tree.js';

export default {
  id: 'hero',
  label: 'Hero',
  variants: {
    oscuro: () =>
      n('section', {
        name: 'Hero',
        styles: {
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '24px', minHeight: '80vh', padding: '96px 32px', textAlign: 'center',
          background: '#0b0b10', color: '#ffffff',
        },
        mobile: { padding: '64px 20px', minHeight: '70vh' },
        children: [
          n('heading', {
            name: 'Título',
            content: { text: 'Tu idea, en una landing inolvidable', level: 1 },
            styles: { fontSize: '64px', lineHeight: '1.05', maxWidth: '14ch', margin: '0', fontWeight: '800' },
            mobile: { fontSize: '38px' },
          }),
          n('text', {
            name: 'Subtítulo',
            content: { text: 'Diseño a medida, animaciones suaves y cero complicaciones.' },
            styles: { fontSize: '20px', maxWidth: '48ch', margin: '0', opacity: '0.75' },
            mobile: { fontSize: '17px' },
          }),
          n('button', {
            name: 'Botón',
            content: { text: 'Hablemos', href: '#contacto' },
            styles: {
              display: 'inline-block', padding: '14px 28px', borderRadius: '999px',
              background: '#7c5cff', color: '#fff', textDecoration: 'none', fontWeight: '600',
            },
          }),
        ],
      }),
  },
};
