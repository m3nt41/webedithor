// BLOQUE FOOTER

import { n, texto, columna } from './util.js';

const ANCLAS = { Inicio: '#inicio', Servicios: '#servicios', Precios: '#precios', Contacto: '#contacto' };
const enlaces = (lista, color = 'inherit') =>
  lista.map((t) => n('button', { name: 'Enlace', content: { text: t, href: ANCLAS[t] ?? '#' }, styles: { color, textDecoration: 'none', opacity: '0.75', display: 'inline-block' } }));

export default {
  id: 'footer',
  label: 'Footer',
  variants: {
    simple: { label: 'Simple', crear: () =>
      n('section', {
        name: 'Footer',
        styles: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '32px', background: '#0b0b10', color: '#ffffff' },
        mobile: { flexDirection: 'column', textAlign: 'center' },
        children: [
          texto('Mi Marca', { fontWeight: '700' }, {}, 'Marca'),
          texto('© 2026 Todos los derechos reservados', { opacity: '0.6', fontSize: '14px' }, {}, 'Copyright'),
        ],
      }) },

    columnas: { label: 'Columnas', crear: () =>
      n('section', {
        name: 'Footer',
        styles: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '40px', padding: '56px 48px', background: '#0b0b10', color: '#ffffff' },
        mobile: { gridTemplateColumns: '1fr', padding: '40px 20px', gap: '28px' },
        children: [
          columna('Marca', { gap: '10px' }, [
            texto('Mi Marca', { fontWeight: '800', fontSize: '22px' }, {}, 'Marca'),
            texto('Landings que se sienten vivas.', { opacity: '0.6', maxWidth: '32ch' }, {}, 'Lema'),
          ]),
          columna('Enlaces', { gap: '8px' }, [texto('Sitio', { fontWeight: '700' }, {}, 'Título'), ...enlaces(['Inicio', 'Servicios', 'Precios'])]),
          columna('Contacto', { gap: '8px' }, [texto('Contacto', { fontWeight: '700' }, {}, 'Título'), texto('hola@tumarca.com', { opacity: '0.75' }, {}, 'Correo'), texto('+506 0000 0000', { opacity: '0.75' }, {}, 'Teléfono')]),
        ],
      }) },

    centrado: { label: 'Centrado', crear: () =>
      n('section', {
        name: 'Footer',
        styles: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', padding: '48px 24px', background: '#f4f4f7', color: '#14141c', textAlign: 'center' },
        children: [
          texto('Mi Marca', { fontWeight: '800', fontSize: '22px' }, {}, 'Marca'),
          n('container', { name: 'Enlaces', styles: { display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }, children: enlaces(['Inicio', 'Servicios', 'Contacto']) }),
          texto('© 2026 Todos los derechos reservados', { opacity: '0.55', fontSize: '14px' }, {}, 'Copyright'),
        ],
      }) },

    minimo: { label: 'Mínimo', crear: () =>
      n('section', {
        name: 'Footer',
        styles: { display: 'flex', justifyContent: 'center', padding: '20px', background: '#ffffff', color: '#14141c', borderTop: '1px solid #e3e3ea' },
        children: [texto('© 2026 Mi Marca', { opacity: '0.55', fontSize: '13px' }, {}, 'Copyright')],
      }) },
  },
};
