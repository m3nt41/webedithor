// BLOQUE HERO
// Cada bloque exporta { id, label, variants }. variants = { clave: { label, crear } };
// crear() devuelve un árbol de nodos NUEVO (ids nuevos) cada vez que se llama.

import { n, titulo, texto, boton, imagen, placeholder, columna, seccion } from './util.js';

const CENTRADO = { alignItems: 'center', justifyContent: 'center', gap: '24px', minHeight: '80vh', textAlign: 'center' };

export default {
  ancla: 'inicio',
  id: 'hero',
  label: 'Hero',
  variants: {
    oscuro: { label: 'Oscuro', crear: () =>
      seccion('Hero', { ...CENTRADO, padding: '96px 32px', background: '#0b0b10', color: '#ffffff' }, [
        titulo('Tu idea, en una landing inolvidable', 1, { fontSize: '64px', lineHeight: '1.05', maxWidth: '14ch', fontWeight: '800' }, { fontSize: '38px' }),
        texto('Diseño a medida, animaciones suaves y cero complicaciones.', { fontSize: '20px', maxWidth: '48ch', opacity: '0.75' }, { fontSize: '17px' }, 'Subtítulo'),
        boton('Hablemos', '#contacto'),
      ], { padding: '64px 20px', minHeight: '70vh' }) },

    claro: { label: 'Claro', crear: () =>
      seccion('Hero', { ...CENTRADO, padding: '96px 32px', background: '#f6f5ff', color: '#14141c' }, [
        texto('NUEVO', { fontSize: '13px', letterSpacing: '0.2em', fontWeight: '700', color: '#7c5cff' }, {}, 'Etiqueta'),
        titulo('Hacemos que tu marca se note', 1, { fontSize: '60px', lineHeight: '1.05', maxWidth: '16ch', fontWeight: '800' }, { fontSize: '36px' }),
        texto('Una landing clara, rápida y pensada para convertir visitas en clientes.', { fontSize: '19px', maxWidth: '50ch', opacity: '0.7' }, {}, 'Subtítulo'),
        n('container', { name: 'Botones', styles: { display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }, children: [
          boton('Empezar', '#contacto'),
          boton('Ver más', '#servicios', { background: 'transparent', color: '#14141c', border: '2px solid #14141c' }, 'Botón secundario'),
        ] }),
      ], { padding: '64px 20px', minHeight: '70vh' }) },

    dividido: { label: 'Texto + imagen', crear: () =>
      n('section', {
        name: 'Hero',
        styles: {
          display: 'grid', gridTemplateColumns: '1fr 1fr', alignItems: 'center', gap: '48px',
          padding: '80px 48px', minHeight: '70vh', background: '#ffffff', color: '#14141c',
        },
        mobile: { gridTemplateColumns: '1fr', padding: '48px 20px', gap: '28px' },
        children: [
          columna('Textos', { gap: '20px', alignItems: 'flex-start' }, [
            titulo('Todo lo que tu negocio necesita', 1, { fontSize: '52px', lineHeight: '1.08', fontWeight: '800' }, { fontSize: '34px' }),
            texto('Un hero en dos columnas: mensaje a la izquierda, imagen a la derecha.', { fontSize: '18px', opacity: '0.7', lineHeight: '1.5' }, {}, 'Subtítulo'),
            boton('Cotizar', '#contacto'),
          ]),
          imagen(placeholder(800, 640), 'Imagen principal', { borderRadius: '20px' }),
        ],
      }) },

    degradado: { label: 'Degradado', crear: () =>
      seccion('Hero', {
        ...CENTRADO, padding: '110px 32px', color: '#ffffff',
        background: 'linear-gradient(135deg, #7c5cff 0%, #ff5c9d 100%)',
      }, [
        titulo('Hazlo con estilo', 1, { fontSize: '68px', lineHeight: '1.02', fontWeight: '800' }, { fontSize: '40px' }),
        texto('Colores que se recuerdan y un mensaje directo.', { fontSize: '20px', maxWidth: '44ch', opacity: '0.9' }, {}, 'Subtítulo'),
        boton('Quiero la mía', '#contacto', { background: '#ffffff', color: '#7c5cff' }),
      ], { padding: '72px 20px', minHeight: '70vh' }) },
  },
};
