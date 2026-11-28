// BLOQUE TESTIMONIOS

import { t as tr } from '../i18n/index.js';
import { n, texto, imagen, placeholder, columna, seccion, tit, cuerpo, pequeno, etiqueta, fondoModo } from './util.js';
import { MODOS, CITA, tarjetaTema, colorPh } from './tema.js';

const GRID = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px' };
const cabecera = (t) => tit(2, t, { textAlign: 'center' });

const opinion = (m, cita, autor, rol) =>
  columna('Testimonio', tarjetaTema(m, { gap: '24px' }), [
    texto(`“${cita}”`, { ...CITA.d, fontSize: '22px', lineHeight: '1.45' }, { fontSize: '20px' }, 'Cita'),
    columna('Autor', { gap: '2px', borderTop: `1px solid ${m.linea}`, paddingTop: '16px' }, [
      texto(autor, { fontWeight: '500' }, {}, 'Nombre'),
      pequeno(rol, m, {}, 'Cargo'),
    ]),
  ]);

export default {
  id: 'testimonials',
  label: tr('bloque.testimonios'),
  variants: {
    tarjetas: { label: tr('bloque.tarjetas'), crear: () => {
      const m = MODOS.claro;
      return seccion('Testimonios', { gap: '56px', ...fondoModo(m) }, [
        cabecera('Lo que dicen de nosotros'),
        n('container', { name: 'Grid', styles: GRID, children: [
          opinion(m, 'Quedó mejor de lo que imaginaba. Súper rápido.', 'Ana Mora', 'Dueña de cafetería'),
          opinion(m, 'Mis clientes ahora me escriben directo por WhatsApp.', 'Luis Rojas', 'Fotógrafo'),
          opinion(m, 'Se ve profesional y carga volando en el celular.', 'Sofía Vega', 'Estilista'),
        ] }),
      ]);
    } },

    cita: { label: tr('bloque.cita_grande'), crear: () => {
      const m = MODOS.claro2;
      return seccion('Testimonio', { gap: '28px', alignItems: 'center', textAlign: 'center', ...fondoModo(m) }, [
        texto('“Pasamos de tener una página olvidada a recibir clientes cada semana.”', { ...CITA.d, maxWidth: '24ch' }, CITA.m, 'Cita'),
        etiqueta('Carla Jiménez · Directora, Estudio Aurora', m, {}, 'Autor'),
      ]);
    } },

    avatares: { label: tr('bloque.con_foto'), crear: () => {
      const m = MODOS.claro;
      const persona = (i, cita, nombre) =>
        columna('Testimonio', { gap: '16px', alignItems: 'center', textAlign: 'center', padding: '24px' }, [
          imagen(placeholder(160, 160, colorPh(i), nombre[0]), nombre, { width: '80px', height: '80px', objectFit: 'cover' }, 'Foto'),
          cuerpo(`“${cita}”`, m, {}, 'Cita'),
          texto(nombre, { fontWeight: '500' }, {}, 'Nombre'),
        ]);
      return seccion('Testimonios', { gap: '56px', ...fondoModo(m) }, [
        cabecera('Clientes felices'),
        n('container', { name: 'Grid', styles: GRID, children: [
          persona(0, 'Atención de primera.', 'María León'),
          persona(1, 'Entregaron antes de lo prometido.', 'Pablo Soto'),
          persona(2, 'Lo recomiendo sin dudar.', 'Daniela Cruz'),
        ] }),
      ]);
    } },

    oscuro: { label: tr('bloque.oscuro'), crear: () => {
      const m = MODOS.oscuro;
      return seccion('Testimonios', { gap: '56px', ...fondoModo(m) }, [
        cabecera('Opiniones'),
        n('container', { name: 'Grid', styles: GRID, children: [
          opinion(m, 'Una experiencia impecable de principio a fin.', 'Marco Díaz', 'Emprendedor'),
          opinion(m, 'Entendieron justo lo que quería transmitir.', 'Elena Pérez', 'Abogada'),
        ] }),
      ]);
    } },
  },
};
