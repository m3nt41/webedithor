// BLOQUE CONTACTO (WhatsApp)
// El botón apunta a https://wa.me/NUMERO (código de país + número, sin + ni espacios).
// Cambia el número desde el Inspector (campo "Enlace" del botón).

import { n, texto, boton, columna, seccion, icono, tit, lead, pequeno, etiqueta, fondoModo } from './util.js';
import { MODOS, botonTema, tarjetaTema, lado, ANCHO, AIRE } from './tema.js';

// Fila de dato de contacto: icono + texto
const dato = (m, ic, txt, nombre) =>
  n('container', { name: nombre, styles: { display: 'flex', alignItems: 'center', gap: '14px' }, children: [
    icono(ic, { width: '22px', height: '22px', color: m.acento }),
    texto(txt, { color: m.fg }, {}, 'Texto'),
  ] });

const WA = 'https://wa.me/50600000000?text=Hola%2C%20quiero%20m%C3%A1s%20informaci%C3%B3n';
const botonWa = (m, extra = {}) => boton('Escríbenos por WhatsApp', WA, { ...botonTema(m, 'm'), ...extra }, 'Botón WhatsApp');

export default {
  ancla: 'contacto',
  id: 'contact',
  label: 'Contacto WhatsApp',
  variants: {
    simple: { label: 'Centrado', crear: () => {
      const m = MODOS.claro;
      return seccion('Contacto', { gap: '24px', alignItems: 'center', textAlign: 'center', ...fondoModo(m) }, [
        tit(2, '¿Hablamos?', { fontSize: '48px' }, { fontSize: '34px' }),
        lead('Cuéntanos tu idea y te respondemos hoy mismo.', m, { maxWidth: '44ch' }),
        botonWa(m),
      ]);
    } },

    tarjeta: { label: 'Tarjeta', crear: () => {
      const m = MODOS.claro2;
      return seccion('Contacto', { alignItems: 'center', ...fondoModo(m) }, [
        columna('Tarjeta', tarjetaTema(MODOS.claro, { gap: '20px', alignItems: 'center', textAlign: 'center', padding: '64px 48px', maxWidth: '640px', width: '100%' }), [
          tit(2, 'Pide tu cotización', { fontSize: '38px' }, { fontSize: '30px' }),
          lead('Respuesta en menos de 24 horas.', MODOS.claro, { fontSize: '18px' }),
          botonWa(MODOS.claro),
          pequeno('Lun a Vie · 8:00 – 18:00', MODOS.claro, {}, 'Horario'),
        ]),
      ], { padding: `${AIRE.m} 16px` });
    } },

    dividido: { label: 'Texto + datos', crear: () => {
      const m = MODOS.claro;
      return n('section', {
        name: 'Contacto',
        styles: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '64px', alignItems: 'center', padding: `${AIRE.d} ${lado(ANCHO)}`, ...fondoModo(m) },
        mobile: { gridTemplateColumns: '1fr', padding: `${AIRE.m} 20px`, gap: '32px' },
        children: [
          columna('Mensaje', { gap: '20px' }, [
            tit(2, 'Estamos a un mensaje', { lineHeight: '1.1' }),
            lead('Escríbenos y armamos juntos tu proyecto.', m),
          ]),
          columna('Datos', tarjetaTema(m, { gap: '16px', padding: '36px' }), [
            dato(m, 'phone', '+506 0000 0000', 'Teléfono'),
            dato(m, 'mail', 'hola@tumarca.com', 'Correo'),
            dato(m, 'map-pin', 'San José, Costa Rica', 'Ubicación'),
            botonWa(m, { textAlign: 'center', marginTop: '8px' }),
          ]),
        ],
      });
    } },

    oscuro: { label: 'Oscuro', crear: () => {
      const m = MODOS.oscuro;
      return seccion('Contacto', { gap: '24px', alignItems: 'center', textAlign: 'center', ...fondoModo(m) }, [
        tit(2, 'Empecemos hoy', { fontSize: '52px' }, { fontSize: '36px' }),
        lead('Un mensaje y tu proyecto está en marcha.', m),
        botonWa(m),
      ]);
    } },
  },
};
