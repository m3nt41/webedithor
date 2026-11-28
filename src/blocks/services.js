// BLOQUE SERVICIOS / BENEFICIOS
// repeat(auto-fit, minmax()) hace que el grid se adapte solo a móvil.

import { t as tr } from '../i18n/index.js';
import { n, texto, columna, seccion, icono, tit, cuerpo, etiqueta, fondoModo } from './util.js';
import { MODOS, FUENTE, tarjetaTema, padSeccion, ANCHO_TEXTO } from './tema.js';

const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' };

const tarjeta = (m, t, txt) =>
  columna('Tarjeta', tarjetaTema(m, { gap: '12px' }), [
    tit(3, t),
    cuerpo(txt, m),
  ]);

const conIcono = (m, nombreIcono, t, txt) =>
  columna('Tarjeta', tarjetaTema(m, { gap: '12px', alignItems: 'center', textAlign: 'center', padding: '36px 28px' }), [
    icono(nombreIcono, { width: '40px', height: '40px', color: m.acento }),
    tit(3, t),
    cuerpo(txt, m),
  ]);

const cabecera = (t, m, extra = {}) => tit(2, t, { textAlign: 'center', ...extra });

export default {
  ancla: 'servicios',
  id: 'services',
  label: tr('bloque.servicios'),
  variants: {
    tarjetas: { label: tr('bloque.tarjetas'), crear: () => {
      const m = MODOS.claro;
      return seccion('Servicios', { gap: '56px', ...fondoModo(m) }, [
        cabecera('Lo que hacemos', m),
        n('container', { name: 'Grid', styles: GRID, children: [
          tarjeta(m, 'Diseño', 'Interfaces claras que se sienten únicas.'),
          tarjeta(m, 'Animación', 'Movimiento con intención, sin lag.'),
          tarjeta(m, 'Entrega', 'Un solo archivo listo para publicar.'),
        ] }),
      ]);
    } },

    iconos: { label: tr('bloque.con_iconos'), crear: () => {
      const m = MODOS.claro2;
      return seccion('Servicios', { gap: '56px', ...fondoModo(m) }, [
        cabecera('Por qué elegirnos', m),
        n('container', { name: 'Grid', styles: GRID, children: [
          conIcono(m, 'zap', 'Rápido', 'Cargas en un parpadeo.'),
          conIcono(m, 'palette', 'A tu medida', 'Cada detalle según tu marca.'),
          conIcono(m, 'smartphone', 'Móvil primero', 'Se ve perfecto en cualquier pantalla.'),
        ] }),
      ]);
    } },

    oscuro: { label: tr('bloque.oscuro'), crear: () => {
      const m = MODOS.oscuro;
      return seccion('Servicios', { gap: '56px', ...fondoModo(m) }, [
        cabecera('Nuestros servicios', m),
        n('container', { name: 'Grid', styles: GRID, children: [
          tarjeta(m, 'Marca', 'Identidad que se queda en la memoria.'),
          tarjeta(m, 'Web', 'Sitios que cargan rápido y convierten.'),
          tarjeta(m, 'Contenido', 'Textos e imágenes con intención.'),
        ] }),
      ]);
    } },

    lista: { label: tr('bloque.lista_numerada'), crear: () => {
      const m = MODOS.claro;
      const fila = (num, t, txt) =>
        n('container', {
          name: 'Fila',
          styles: { display: 'grid', gridTemplateColumns: '96px 1fr', gap: '16px', alignItems: 'start', padding: '28px 0', borderBottom: `1px solid ${m.linea}` },
          mobile: { gridTemplateColumns: '56px 1fr' },
          children: [
            texto(num, { fontFamily: FUENTE.titulo, fontSize: '32px', fontWeight: '500', color: m.acento }, {}, 'Número'),
            columna('Textos', { gap: '8px' }, [tit(3, t), cuerpo(txt, m)]),
          ],
        });
      return seccion('Servicios', { gap: '16px', padding: padSeccion(ANCHO_TEXTO), ...fondoModo(m) }, [
        cabecera('Cómo trabajamos', m, { textAlign: 'left', marginBottom: '24px' }),
        fila('01', 'Conversamos', 'Entendemos tu negocio y lo que necesitas.'),
        fila('02', 'Diseñamos', 'Te mostramos una propuesta visual.'),
        fila('03', 'Publicamos', 'Entregamos tu landing lista para usar.'),
      ]);
    } },
  },
};
