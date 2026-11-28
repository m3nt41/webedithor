// BLOQUE FOOTER

import { t as tr } from '../i18n/index.js';
import { n, texto, columna, etiqueta, cuerpo, pequeno, fondoModo } from './util.js';
import { MODOS, FUENTE, lado, ANCHO } from './tema.js';

const ANCLAS = { Inicio: '#inicio', Servicios: '#servicios', Precios: '#precios', Contacto: '#contacto' };
const enlaces = (lista) =>
  lista.map((t) => n('button', { name: 'Enlace', content: { text: t, href: ANCLAS[t] ?? '#' }, styles: { color: 'inherit', textDecoration: 'none', opacity: '0.75', display: 'inline-block', fontSize: '15px' } }));

const marca = (t = 'Mi Marca') => texto(t, { fontFamily: FUENTE.titulo, fontWeight: '500', fontSize: '22px', letterSpacing: '-0.01em' }, {}, 'Marca');

export default {
  id: 'footer',
  label: tr('bloque.footer'),
  variants: {
    simple: { label: tr('bloque.simple'), crear: () => {
      const m = MODOS.oscuro;
      return n('section', {
        name: 'Footer',
        styles: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: `40px ${lado(ANCHO)}`, ...fondoModo(m) },
        mobile: { flexDirection: 'column', textAlign: 'center', padding: '32px 20px' },
        children: [
          marca(),
          pequeno('© 2026 Todos los derechos reservados', m, {}, 'Copyright'),
        ],
      });
    } },

    columnas: { label: tr('bloque.columnas'), crear: () => {
      const m = MODOS.oscuro;
      return n('section', {
        name: 'Footer',
        styles: { display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '48px', padding: `72px ${lado(ANCHO)}`, ...fondoModo(m) },
        mobile: { gridTemplateColumns: '1fr', padding: '48px 20px', gap: '32px' },
        children: [
          columna('Marca', { gap: '12px' }, [
            marca(),
            cuerpo('Landings que se sienten vivas.', m, { maxWidth: '32ch' }, 'Lema'),
          ]),
          columna('Enlaces', { gap: '10px' }, [etiqueta('Sitio', m, {}, 'Título'), ...enlaces(['Inicio', 'Servicios', 'Precios'])]),
          columna('Contacto', { gap: '10px' }, [etiqueta('Contacto', m, {}, 'Título'), cuerpo('hola@tumarca.com', m, {}, 'Correo'), cuerpo('+506 0000 0000', m, {}, 'Teléfono')]),
        ],
      });
    } },

    centrado: { label: tr('bloque.centrado'), crear: () => {
      const m = MODOS.claro2;
      return n('section', {
        name: 'Footer',
        styles: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '18px', padding: '64px 24px', textAlign: 'center', ...fondoModo(m), borderTop: `1px solid ${m.linea}` },
        children: [
          marca(),
          n('container', { name: 'Enlaces', styles: { display: 'flex', gap: '28px', flexWrap: 'wrap', justifyContent: 'center' }, children: enlaces(['Inicio', 'Servicios', 'Contacto']) }),
          pequeno('© 2026 Todos los derechos reservados', m, {}, 'Copyright'),
        ],
      });
    } },

    minimo: { label: tr('bloque.minimo'), crear: () => {
      const m = MODOS.claro;
      return n('section', {
        name: 'Footer',
        styles: { display: 'flex', justifyContent: 'center', padding: '24px', ...fondoModo(m), borderTop: `1px solid ${m.linea}` },
        children: [pequeno('© 2026 Mi Marca', m, { fontSize: '13px' }, 'Copyright')],
      });
    } },
  },
};
