// BLOQUE PRECIOS
// El plan recomendado se destaca invirtiendo colores (oscuro sobre claro, claro sobre oscuro): sin sombras ni badges.

import { t as tr } from '../i18n/index.js';
import { n, texto, boton, columna, seccion, icono, tit, pequeno, etiqueta, fondoModo } from './util.js';
import { MODOS, PRECIO, botonTema, tarjetaTema, padSeccion, ANCHO_TEXTO } from './tema.js';

const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', alignItems: 'stretch' };
const cabecera = (t) => tit(2, t, { textAlign: 'center' });

/** Un plan: nombre, precio, lista de ventajas y botón. destacado = colores invertidos respecto a la sección. */
const plan = (m, nombre, precio, ventajas, destacado = false) => {
  const cm = destacado ? (m === MODOS.claro || m === MODOS.claro2 ? MODOS.oscuro : MODOS.claro) : m;
  return columna('Plan', tarjetaTema(cm, { gap: '16px', padding: '36px 32px', color: cm.fg }), [
    etiqueta(nombre, cm, {}, 'Nombre'),
    texto(precio, { ...PRECIO.d }, PRECIO.m, 'Precio'),
    columna('Ventajas', { gap: '10px', flex: '1', paddingTop: '8px' }, ventajas.map((v) =>
      n('container', { name: 'Ventaja', styles: { display: 'flex', alignItems: 'center', gap: '10px' }, children: [
        icono('check', { width: '18px', height: '18px', color: cm.acento }),
        texto(v, { fontSize: '15px', color: cm.sec }, {}, 'Texto'),
      ] }))),
    boton('Elegir', '#contacto', { ...botonTema(cm, 'm', destacado ? 'primario' : 'secundario'), textAlign: 'center' }),
  ]);
};

export default {
  ancla: 'precios',
  id: 'pricing',
  label: tr('bloque.precios'),
  variants: {
    tres: { label: tr('bloque.3_planes'), crear: () => {
      const m = MODOS.claro;
      return seccion('Precios', { gap: '56px', ...fondoModo(m) }, [
        cabecera('Planes y precios'),
        n('container', { name: 'Grid', styles: GRID, children: [
          plan(m, 'Básico', '$99', ['1 sección', 'Diseño limpio', 'Entrega en 3 días']),
          plan(m, 'Pro', '$249', ['Hasta 5 secciones', 'Animaciones', 'Entrega en 5 días'], true),
          plan(m, 'Total', '$499', ['Página completa', 'Animaciones avanzadas', 'Soporte 30 días']),
        ] }),
      ]);
    } },

    dos: { label: tr('bloque.2_planes'), crear: () => {
      const m = MODOS.claro2;
      return seccion('Precios', { gap: '56px', ...fondoModo(m) }, [
        cabecera('Elige tu plan'),
        n('container', { name: 'Grid', styles: { ...GRID, maxWidth: '760px', margin: '0 auto', width: '100%' }, children: [
          plan(m, 'Mensual', '$29/mes', ['Todo incluido', 'Cancela cuando quieras']),
          plan(m, 'Anual', '$249/año', ['Todo incluido', '2 meses gratis'], true),
        ] }),
      ]);
    } },

    oscuro: { label: tr('bloque.oscuro'), crear: () => {
      const m = MODOS.oscuro;
      return seccion('Precios', { gap: '56px', ...fondoModo(m) }, [
        cabecera('Precios'),
        n('container', { name: 'Grid', styles: GRID, children: [
          plan(m, 'Starter', '$79', ['1 página', 'Hosting incluido']),
          plan(m, 'Business', '$199', ['3 páginas', 'Animaciones', 'Dominio propio'], true),
          plan(m, 'Studio', '$399', ['Páginas ilimitadas', 'Soporte prioritario']),
        ] }),
      ]);
    } },

    lista: { label: tr('bloque.lista_simple'), crear: () => {
      const m = MODOS.claro;
      const fila = (t, txt, precio) =>
        n('container', {
          name: 'Fila',
          styles: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', padding: '24px 0', borderBottom: `1px solid ${m.linea}` },
          children: [
            columna('Textos', { gap: '4px' }, [tit(3, t, { fontSize: '22px' }), pequeno(txt, m)]),
            texto(precio, { ...PRECIO.d, fontSize: '28px', color: m.fg, whiteSpace: 'nowrap' }, { fontSize: '24px' }, 'Precio'),
          ],
        });
      return seccion('Precios', { gap: '8px', padding: padSeccion(ANCHO_TEXTO), ...fondoModo(m) }, [
        cabecera('Tarifas'),
        n('container', { name: 'Espacio', styles: { height: '24px' } }),
        fila('Consulta', 'Una charla para conocer tu proyecto', 'Gratis'),
        fila('Landing', 'Una página completa y animada', '$250'),
        fila('Mantenimiento', 'Cambios y ajustes mensuales', '$40'),
      ]);
    } },
  },
};
