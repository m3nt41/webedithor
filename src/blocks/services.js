// BLOQUE SERVICIOS / BENEFICIOS
// repeat(auto-fit, minmax()) hace que el grid se adapte solo a móvil.

import { n, titulo, texto, columna, seccion } from './util.js';

const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' };

const tarjeta = (t, txt, extra = {}) =>
  columna('Tarjeta', { gap: '10px', padding: '28px', borderRadius: '16px', background: '#f4f4f7', ...extra }, [
    titulo(t, 3, { fontSize: '22px' }),
    texto(txt, { opacity: '0.7', lineHeight: '1.5' }),
  ]);

const conIcono = (icono, t, txt, extra = {}) =>
  columna('Tarjeta', { gap: '10px', padding: '28px', alignItems: 'center', textAlign: 'center', ...extra }, [
    texto(icono, { fontSize: '44px' }, {}, 'Icono'),
    titulo(t, 3, { fontSize: '22px' }),
    texto(txt, { opacity: '0.7', lineHeight: '1.5' }),
  ]);

const cabecera = (t, extra = {}) => titulo(t, 2, { fontSize: '40px', textAlign: 'center', ...extra }, { fontSize: '30px' });

export default {
  id: 'services',
  label: 'Servicios',
  variants: {
    tarjetas: { label: 'Tarjetas', crear: () =>
      seccion('Servicios', { gap: '40px', background: '#ffffff' }, [
        cabecera('Lo que hacemos'),
        n('container', { name: 'Grid', styles: GRID, children: [
          tarjeta('Diseño', 'Interfaces claras que se sienten únicas.'),
          tarjeta('Animación', 'Movimiento con intención, sin lag.'),
          tarjeta('Entrega', 'Un solo archivo listo para publicar.'),
        ] }),
      ]) },

    iconos: { label: 'Con iconos', crear: () =>
      seccion('Servicios', { gap: '40px', background: '#ffffff' }, [
        cabecera('Por qué elegirnos'),
        n('container', { name: 'Grid', styles: GRID, children: [
          conIcono('⚡', 'Rápido', 'Cargas en un parpadeo.'),
          conIcono('🎨', 'A tu medida', 'Cada detalle según tu marca.'),
          conIcono('📱', 'Móvil primero', 'Se ve perfecto en cualquier pantalla.'),
        ] }),
      ]) },

    oscuro: { label: 'Oscuro', crear: () =>
      seccion('Servicios', { gap: '40px', background: '#0b0b10', color: '#ffffff' }, [
        cabecera('Nuestros servicios'),
        n('container', { name: 'Grid', styles: GRID, children: [
          tarjeta('Marca', 'Identidad que se queda en la memoria.', { background: '#17171f' }),
          tarjeta('Web', 'Sitios que cargan rápido y convierten.', { background: '#17171f' }),
          tarjeta('Contenido', 'Textos e imágenes con intención.', { background: '#17171f' }),
        ] }),
      ]) },

    lista: { label: 'Lista numerada', crear: () => {
      const fila = (num, t, txt) =>
        n('container', {
          name: 'Fila',
          styles: { display: 'grid', gridTemplateColumns: '80px 1fr', gap: '16px', alignItems: 'start', padding: '24px 0', borderBottom: '1px solid #e3e3ea' },
          mobile: { gridTemplateColumns: '56px 1fr' },
          children: [
            texto(num, { fontSize: '36px', fontWeight: '800', color: '#7c5cff' }, {}, 'Número'),
            columna('Textos', { gap: '6px' }, [titulo(t, 3, { fontSize: '22px' }), texto(txt, { opacity: '0.7', lineHeight: '1.5' })]),
          ],
        });
      return seccion('Servicios', { gap: '24px', background: '#ffffff', maxWidth: '860px', margin: '0 auto', width: '100%' }, [
        cabecera('Cómo trabajamos', { textAlign: 'left' }),
        fila('01', 'Conversamos', 'Entendemos tu negocio y lo que necesitas.'),
        fila('02', 'Diseñamos', 'Te mostramos una propuesta visual.'),
        fila('03', 'Publicamos', 'Entregamos tu landing lista para usar.'),
      ]);
    } },
  },
};
