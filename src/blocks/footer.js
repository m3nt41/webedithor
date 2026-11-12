// BLOQUE FOOTER

import { createNode as n } from '../core/tree.js';

export default {
  id: 'footer',
  label: 'Footer',
  variants: {
    simple: () =>
      n('section', {
        name: 'Footer',
        styles: {
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
          padding: '32px', background: '#0b0b10', color: '#ffffff',
        },
        mobile: { flexDirection: 'column', textAlign: 'center' },
        children: [
          n('text', { name: 'Marca', content: { text: 'Mi Marca' }, styles: { margin: '0', fontWeight: '700' } }),
          n('text', { name: 'Copyright', content: { text: '© 2026 Todos los derechos reservados' }, styles: { margin: '0', opacity: '0.6', fontSize: '14px' } }),
        ],
      }),
  },
};
