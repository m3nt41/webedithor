// BLOQUE TESTIMONIOS

import { n, titulo, texto, imagen, placeholder, columna, seccion } from './util.js';

const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' };
const cabecera = (t) => titulo(t, 2, { fontSize: '40px', textAlign: 'center' }, { fontSize: '30px' });

const opinion = (cita, autor, rol, extra = {}) =>
  columna('Testimonio', { gap: '16px', padding: '28px', borderRadius: '16px', background: '#f4f4f7', ...extra }, [
    texto(`“${cita}”`, { fontSize: '18px', lineHeight: '1.5' }, {}, 'Cita'),
    columna('Autor', { gap: '2px' }, [
      texto(autor, { fontWeight: '700' }, {}, 'Nombre'),
      texto(rol, { opacity: '0.6', fontSize: '14px' }, {}, 'Cargo'),
    ]),
  ]);

export default {
  id: 'testimonials',
  label: 'Testimonios',
  variants: {
    tarjetas: { label: 'Tarjetas', crear: () =>
      seccion('Testimonios', { gap: '40px', background: '#ffffff' }, [
        cabecera('Lo que dicen de nosotros'),
        n('container', { name: 'Grid', styles: GRID, children: [
          opinion('Quedó mejor de lo que imaginaba. Súper rápido.', 'Ana Mora', 'Dueña de cafetería'),
          opinion('Mis clientes ahora me escriben directo por WhatsApp.', 'Luis Rojas', 'Fotógrafo'),
          opinion('Se ve profesional y carga volando en el celular.', 'Sofía Vega', 'Estilista'),
        ] }),
      ]) },

    cita: { label: 'Cita grande', crear: () =>
      seccion('Testimonio', { gap: '24px', alignItems: 'center', textAlign: 'center', background: '#f6f5ff' }, [
        texto('“Pasamos de tener una página olvidada a recibir clientes cada semana.”', { fontSize: '34px', lineHeight: '1.3', maxWidth: '24ch', fontWeight: '700' }, { fontSize: '24px' }, 'Cita'),
        texto('Carla Jiménez · Directora, Estudio Aurora', { opacity: '0.65' }, {}, 'Autor'),
      ]) },

    avatares: { label: 'Con foto', crear: () => {
      const persona = (i, cita, nombre) =>
        columna('Testimonio', { gap: '14px', alignItems: 'center', textAlign: 'center', padding: '24px' }, [
          imagen(placeholder(160, 160, ['#e6dcf7', '#d8ecf0', '#f3e0d6'][i], nombre[0]), nombre, { width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }, 'Foto'),
          texto(`“${cita}”`, { lineHeight: '1.5' }, {}, 'Cita'),
          texto(nombre, { fontWeight: '700' }, {}, 'Nombre'),
        ]);
      return seccion('Testimonios', { gap: '40px', background: '#ffffff' }, [
        cabecera('Clientes felices'),
        n('container', { name: 'Grid', styles: GRID, children: [
          persona(0, 'Atención de primera.', 'María León'),
          persona(1, 'Entregaron antes de lo prometido.', 'Pablo Soto'),
          persona(2, 'Lo recomiendo sin dudar.', 'Daniela Cruz'),
        ] }),
      ]);
    } },

    oscuro: { label: 'Oscuro', crear: () =>
      seccion('Testimonios', { gap: '40px', background: '#0b0b10', color: '#ffffff' }, [
        cabecera('Opiniones'),
        n('container', { name: 'Grid', styles: GRID, children: [
          opinion('Una experiencia impecable de principio a fin.', 'Marco Díaz', 'Emprendedor', { background: '#17171f' }),
          opinion('Entendieron justo lo que quería transmitir.', 'Elena Pérez', 'Abogada', { background: '#17171f' }),
        ] }),
      ]) },
  },
};
