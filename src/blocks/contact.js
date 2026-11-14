// BLOQUE CONTACTO (WhatsApp)
// El botón apunta a https://wa.me/NUMERO (código de país + número, sin + ni espacios).
// Cambia el número desde el Inspector (campo "Enlace" del botón).

import { n, titulo, texto, boton, columna, seccion, icono } from './util.js';

// Fila de dato de contacto: icono + texto
const dato = (ic, txt, nombre) =>
  n('container', { name: nombre, styles: { display: 'flex', alignItems: 'center', gap: '12px' }, children: [
    icono(ic, { width: '22px', height: '22px', color: '#7c5cff' }),
    texto(txt, {}, {}, 'Texto'),
  ] });

const WA = 'https://wa.me/50600000000?text=Hola%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n';
const botonWa = (extra = {}) => boton('Escríbenos por WhatsApp', WA, { background: '#25d366', color: '#063d1b', ...extra }, 'Botón WhatsApp');

export default {
  ancla: 'contacto',
  id: 'contact',
  label: 'Contacto WhatsApp',
  variants: {
    simple: { label: 'Centrado', crear: () =>
      seccion('Contacto', { gap: '20px', alignItems: 'center', textAlign: 'center', background: '#ffffff' }, [
        titulo('¿Hablamos?', 2, { fontSize: '44px' }, { fontSize: '32px' }),
        texto('Cuéntanos tu idea y te respondemos hoy mismo.', { fontSize: '18px', opacity: '0.7', maxWidth: '44ch' }, {}, 'Subtítulo'),
        botonWa(),
      ]) },

    tarjeta: { label: 'Tarjeta', crear: () =>
      seccion('Contacto', { alignItems: 'center', background: '#f6f5ff' }, [
        columna('Tarjeta', { gap: '18px', alignItems: 'center', textAlign: 'center', padding: '56px 40px', borderRadius: '28px', background: '#ffffff', maxWidth: '640px', width: '100%' }, [
          titulo('Pide tu cotización', 2, { fontSize: '36px' }, { fontSize: '28px' }),
          texto('Respuesta en menos de 24 horas.', { opacity: '0.65' }, {}, 'Subtítulo'),
          botonWa(),
          texto('Lun a Vie · 8:00 – 18:00', { fontSize: '14px', opacity: '0.5' }, {}, 'Horario'),
        ]),
      ], { padding: '56px 16px' }) },

    dividido: { label: 'Texto + datos', crear: () =>
      n('section', {
        name: 'Contacto',
        styles: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px', alignItems: 'center', padding: '96px 48px', background: '#ffffff' },
        mobile: { gridTemplateColumns: '1fr', padding: '56px 20px', gap: '28px' },
        children: [
          columna('Mensaje', { gap: '16px' }, [
            titulo('Estamos a un mensaje', 2, { fontSize: '44px', lineHeight: '1.1' }, { fontSize: '32px' }),
            texto('Escríbenos y armamos juntos tu proyecto.', { fontSize: '18px', opacity: '0.7' }, {}, 'Subtítulo'),
          ]),
          columna('Datos', { gap: '14px', padding: '32px', borderRadius: '20px', background: '#f4f4f7' }, [
            dato('phone', '+506 0000 0000', 'Teléfono'),
            dato('mail', 'hola@tumarca.com', 'Correo'),
            dato('map-pin', 'San José, Costa Rica', 'Ubicación'),
            botonWa({ textAlign: 'center' }),
          ]),
        ],
      }) },

    oscuro: { label: 'Oscuro', crear: () =>
      seccion('Contacto', { gap: '20px', alignItems: 'center', textAlign: 'center', background: '#0b0b10', color: '#ffffff' }, [
        titulo('Empecemos hoy', 2, { fontSize: '48px' }, { fontSize: '34px' }),
        texto('Un mensaje y tu proyecto está en marcha.', { fontSize: '18px', opacity: '0.7' }, {}, 'Subtítulo'),
        botonWa(),
      ]) },
  },
};
