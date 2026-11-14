// BLOQUE HERO
// Cada bloque exporta { id, label, variants }. variants = { clave: { label, crear } };
// crear() devuelve un árbol de nodos NUEVO (ids nuevos) cada vez que se llama.
// Estilo: ver tema.js (claras: oscuro/claro alternables; botones Grande en el hero).

import { n, boton, imagen, placeholder, columna, seccion, tit, lead, etiqueta, fondoModo } from './util.js';
import { C, MODOS, botonTema, colorPh, AIRE, lado, ANCHO } from './tema.js';

const CENTRADO = { alignItems: 'center', justifyContent: 'center', gap: '28px', minHeight: '80vh', textAlign: 'center' };
const MOVIL = { padding: `${AIRE.m} 20px`, minHeight: '70vh' };

const filaBotones = (m) =>
  n('container', { name: 'Botones', styles: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }, children: [
    boton('Empezar', '#contacto', botonTema(m, 'l'), 'Botón'),
    boton('Ver más', '#servicios', botonTema(m, 'l', 'secundario'), 'Botón secundario'),
  ] });

export default {
  ancla: 'inicio',
  id: 'hero',
  label: 'Hero',
  variants: {
    oscuro: { label: 'Oscuro', crear: () => {
      const m = MODOS.oscuro;
      return seccion('Hero', { ...CENTRADO, ...fondoModo(m) }, [
        tit(1, 'Tu idea, en una landing inolvidable', { maxWidth: '16ch', fontSize: '72px' }, { fontSize: '42px' }),
        lead('Diseño a medida, animaciones suaves y cero complicaciones.', m, { maxWidth: '48ch' }),
        boton('Hablemos', '#contacto', botonTema(m, 'l')),
      ], MOVIL);
    } },

    claro: { label: 'Claro', crear: () => {
      const m = MODOS.claro;
      return seccion('Hero', { ...CENTRADO, ...fondoModo(m) }, [
        etiqueta('Nuevo', m),
        tit(1, 'Hacemos que tu marca se note', { maxWidth: '18ch' }),
        lead('Una landing clara, rápida y pensada para convertir visitas en clientes.', m, { maxWidth: '50ch' }),
        filaBotones(m),
      ], MOVIL);
    } },

    dividido: { label: 'Texto + imagen', crear: () => {
      const m = MODOS.claro2;
      return n('section', {
        name: 'Hero',
        styles: {
          display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: '64px',
          padding: `96px ${lado(ANCHO)}`, minHeight: '70vh', ...fondoModo(m),
        },
        mobile: { gridTemplateColumns: '1fr', padding: '56px 20px', gap: '32px' },
        children: [
          columna('Textos', { gap: '24px', alignItems: 'flex-start' }, [
            tit(1, 'Todo lo que tu negocio necesita', { fontSize: '56px' }, { fontSize: '38px' }),
            lead('Un hero en dos columnas: mensaje a la izquierda, imagen a la derecha.', m),
            boton('Cotizar', '#contacto', botonTema(m, 'l')),
          ]),
          imagen(placeholder(800, 640, colorPh(0)), 'Imagen principal'),
        ],
      });
    } },

    // Hero con imagen de fondo + capa oscura (campos fondoImagen/fondoCapa: CSS puro en el export)
    fondo: { label: 'Con fondo', crear: () => {
      const m = MODOS.oscuro;
      return seccion('Hero', {
        alignItems: 'center', justifyContent: 'center', gap: '28px', textAlign: 'center',
        minHeight: '90vh', padding: `${AIRE.d} 32px`, ...fondoModo(m),
        fondoImagen: placeholder(1600, 900, C.phOscuro, 'Tu imagen de fondo'), fondoAjuste: 'cover', fondoPosicion: 'center', fondoCapa: 45,
      }, [
        tit(1, 'Un lugar que se queda en la memoria', { maxWidth: '18ch', fontSize: '68px' }, { fontSize: '40px' }),
        lead('Sube tu foto en el panel "Fondo e imagen" y ajusta la capa oscura para que el texto se lea.', MODOS.oscuro, { maxWidth: '46ch', color: C.textoClaro }),
        boton('Reservar', '#contacto', botonTema(m, 'l')),
      ], { ...MOVIL, minHeight: '80vh' });
    } },

    // Antes "degradado" (violeta-rosa): ahora editorial oscuro con una línea de acento
    degradado: { label: 'Acento', crear: () => {
      const m = MODOS.oscuro2;
      return seccion('Hero', {
        ...CENTRADO, alignItems: 'flex-start', textAlign: 'left', ...fondoModo(m),
        borderTop: `1px solid ${C.acento}`,
      }, [
        tit(1, 'Hazlo con estilo', { fontSize: '72px', maxWidth: '12ch' }, { fontSize: '44px' }),
        lead('Un mensaje directo, con espacio para respirar.', m, { maxWidth: '44ch' }),
        boton('Quiero la mía', '#contacto', botonTema(m, 'l')),
      ], MOVIL);
    } },
  },
};
