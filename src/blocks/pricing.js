// BLOQUE PRECIOS

import { n, titulo, texto, boton, columna, seccion, icono } from './util.js';

const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', alignItems: 'stretch' };
const cabecera = (t) => titulo(t, 2, { fontSize: '40px', textAlign: 'center' }, { fontSize: '30px' });

/** Un plan: nombre, precio, lista de ventajas y botón. destacado = color de acento. */
const plan = (nombre, precio, ventajas, { destacado = false, oscuro = false } = {}) => {
  const fondo = destacado ? '#7c5cff' : oscuro ? '#17171f' : '#f4f4f7';
  const color = destacado || oscuro ? '#ffffff' : '#14141c';
  return columna('Plan', { gap: '14px', padding: '32px 28px', borderRadius: '20px', background: fondo, color }, [
    texto(nombre, { fontWeight: '700', fontSize: '16px', opacity: '0.85' }, {}, 'Nombre'),
    texto(precio, { fontSize: '44px', fontWeight: '800' }, {}, 'Precio'),
    columna('Ventajas', { gap: '8px', flex: '1' }, ventajas.map((v) => n('container', { name: 'Ventaja', styles: { display: 'flex', alignItems: 'center', gap: '8px', opacity: '0.85' }, children: [icono('check', { width: '18px', height: '18px' }), texto(v, {}, {}, 'Texto')] }))),
    boton('Elegir', '#contacto', destacado ? { background: '#ffffff', color: '#7c5cff', textAlign: 'center' } : { textAlign: 'center' }),
  ]);
};

export default {
  ancla: 'precios',
  id: 'pricing',
  label: 'Precios',
  variants: {
    tres: { label: '3 planes', crear: () =>
      seccion('Precios', { gap: '40px', background: '#ffffff' }, [
        cabecera('Planes y precios'),
        n('container', { name: 'Grid', styles: GRID, children: [
          plan('Básico', '$99', ['1 sección', 'Diseño limpio', 'Entrega en 3 días']),
          plan('Pro', '$249', ['Hasta 5 secciones', 'Animaciones', 'Entrega en 5 días'], { destacado: true }),
          plan('Total', '$499', ['Página completa', 'Animaciones avanzadas', 'Soporte 30 días']),
        ] }),
      ]) },

    dos: { label: '2 planes', crear: () =>
      seccion('Precios', { gap: '40px', background: '#f6f5ff' }, [
        cabecera('Elige tu plan'),
        n('container', { name: 'Grid', styles: { ...GRID, maxWidth: '760px', margin: '0 auto', width: '100%' }, children: [
          plan('Mensual', '$29/mes', ['Todo incluido', 'Cancela cuando quieras']),
          plan('Anual', '$249/año', ['Todo incluido', '2 meses gratis'], { destacado: true }),
        ] }),
      ]) },

    oscuro: { label: 'Oscuro', crear: () =>
      seccion('Precios', { gap: '40px', background: '#0b0b10', color: '#ffffff' }, [
        cabecera('Precios'),
        n('container', { name: 'Grid', styles: GRID, children: [
          plan('Starter', '$79', ['1 página', 'Hosting incluido'], { oscuro: true }),
          plan('Business', '$199', ['3 páginas', 'Animaciones', 'Dominio propio'], { destacado: true }),
          plan('Studio', '$399', ['Páginas ilimitadas', 'Soporte prioritario'], { oscuro: true }),
        ] }),
      ]) },

    lista: { label: 'Lista simple', crear: () => {
      const fila = (t, txt, precio) =>
        n('container', {
          name: 'Fila',
          styles: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '20px 0', borderBottom: '1px solid #e3e3ea' },
          children: [
            columna('Textos', { gap: '4px' }, [titulo(t, 3, { fontSize: '20px' }), texto(txt, { opacity: '0.65', fontSize: '15px' })]),
            texto(precio, { fontSize: '24px', fontWeight: '800', color: '#7c5cff', whiteSpace: 'nowrap' }, {}, 'Precio'),
          ],
        });
      return seccion('Precios', { gap: '24px', background: '#ffffff', maxWidth: '760px', margin: '0 auto', width: '100%' }, [
        cabecera('Tarifas'),
        fila('Consulta', 'Una charla para conocer tu proyecto', 'Gratis'),
        fila('Landing', 'Una página completa y animada', '$250'),
        fila('Mantenimiento', 'Cambios y ajustes mensuales', '$40'),
      ]);
    } },
  },
};
