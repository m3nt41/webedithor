// BLOQUE NAVBAR (4 variantes)
// Logo (texto) + enlaces + botón de acción. Todo flex, sin menú hamburguesa ni JS:
// en móvil los enlaces pasan a una segunda fila (flex-wrap + order).
// Los enlaces apuntan a anclas (#servicios, #precios, #contacto...): cada bloque
// trae su ancla puesta (campo "Ancla (id)" del inspector).
//
// El navbar nace NORMAL (sin sticky). Para pegarlo arriba: selecciona el navbar ->
// Inspector -> "Posición" -> "Pegado" (y pon la distancia, ej. 0).

import { n, texto, boton, fondoModo } from './util.js';
import { MODOS, FUENTE, botonTema, lado, ANCHO } from './tema.js';

/** Enlaces de texto (son nodos "button" = <a>, editables como cualquier botón). */
const enlace = (t, href) =>
  n('button', { name: 'Enlace', content: { text: t, href }, styles: { color: 'inherit', textDecoration: 'none', opacity: '0.8', display: 'inline-block', fontSize: '15px', fontWeight: '400', letterSpacing: '0.02em' } });

const LINKS = [['Inicio', '#inicio'], ['Servicios', '#servicios'], ['Precios', '#precios'], ['Contacto', '#contacto']];
const grupoEnlaces = (lista, extra = {}, mobile = {}) =>
  n('container', {
    name: 'Enlaces',
    styles: { display: 'flex', alignItems: 'center', gap: '32px', ...extra },
    // móvil: segunda fila a todo el ancho (order los manda después del logo y el botón)
    mobile: { order: '3', width: '100%', justifyContent: 'center', gap: '18px', flexWrap: 'wrap', ...mobile },
    children: lista.map(([t, h]) => enlace(t, h)),
  });

const logo = (t = 'Mi Marca') => texto(t, { fontFamily: FUENTE.titulo, fontWeight: '500', fontSize: '22px', letterSpacing: '-0.01em' }, {}, 'Logo');
const cta = (t, m, variante = 'primario') => boton(t, '#contacto', botonTema(m, 'm', variante), 'Botón de acción');

/** Barra base: fila con logo a un lado, enlaces y botón; envuelve en móvil. */
const barra = (m, styles, children) =>
  n('section', {
    name: 'Navbar',
    styles: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', padding: `20px ${lado(ANCHO)}`, ...fondoModo(m), borderBottom: `1px solid ${m.linea}`, ...styles },
    mobile: { padding: '14px 20px', gap: '10px 16px' },
    children,
  });

export default {
  id: 'navbar',
  label: 'Navbar',
  alInicio: true, // al insertarlo va arriba de todo
  variants: {
    claro: { label: 'Claro', crear: () =>
      barra(MODOS.claro, {}, [logo(), grupoEnlaces(LINKS), cta('Contacto', MODOS.claro, 'secundario')]) },

    oscuro: { label: 'Oscuro', crear: () =>
      barra(MODOS.oscuro, {}, [logo(), grupoEnlaces(LINKS), cta('Hablemos', MODOS.oscuro)]) },

    centrado: { label: 'Centrado', crear: () =>
      barra(MODOS.claro2, { flexDirection: 'column', justifyContent: 'center', padding: '24px', gap: '14px' }, [
        logo(),
        grupoEnlaces(LINKS, { gap: '36px' }),
      ]) },

    boton: { label: 'Con botón', crear: () =>
      barra(MODOS.claro, {}, [logo(), grupoEnlaces(LINKS.slice(1)), cta('Cotizar ahora', MODOS.claro)]) },
  },
};
