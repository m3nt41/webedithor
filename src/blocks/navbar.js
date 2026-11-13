// BLOQUE NAVBAR (4 variantes)
// Logo (texto) + enlaces + botón de acción. Todo flex, sin menú hamburguesa ni JS:
// en móvil los enlaces pasan a una segunda fila (flex-wrap + order).
// Los enlaces apuntan a anclas (#servicios, #precios, #contacto...): cada bloque
// trae su ancla puesta (campo "Ancla (id)" del inspector).
//
// PEGADO ARRIBA: el navbar nace con position:sticky; top:0; z-index:50.
// Para quitarlo: selecciona el navbar -> Inspector -> "Posición" -> "Normal".

import { n, texto, boton } from './util.js';

const PEGADO = { position: 'sticky', top: '0', zIndex: '50' };

/** Enlaces de texto (son nodos "button" = <a>, editables como cualquier botón). */
const enlace = (t, href, color = 'inherit') =>
  n('button', { name: 'Enlace', content: { text: t, href }, styles: { color, textDecoration: 'none', opacity: '0.8', display: 'inline-block', fontSize: '15px', fontWeight: '500' } });

const LINKS = [['Inicio', '#inicio'], ['Servicios', '#servicios'], ['Precios', '#precios'], ['Contacto', '#contacto']];
const grupoEnlaces = (lista, extra = {}, mobile = {}) =>
  n('container', {
    name: 'Enlaces',
    styles: { display: 'flex', alignItems: 'center', gap: '28px', ...extra },
    // móvil: segunda fila a todo el ancho (order los manda después del logo y el botón)
    mobile: { order: '3', width: '100%', justifyContent: 'center', gap: '18px', flexWrap: 'wrap', ...mobile },
    children: lista.map(([t, h]) => enlace(t, h)),
  });

const logo = (t = 'Mi Marca') => texto(t, { fontWeight: '800', fontSize: '20px' }, {}, 'Logo');
const cta = (t, extra = {}) => boton(t, '#contacto', { padding: '10px 20px', fontSize: '15px', ...extra }, 'Botón de acción');

/** Barra base: fila con logo a un lado, enlaces y botón; envuelve en móvil. */
const barra = (styles, children) =>
  n('section', {
    name: 'Navbar',
    styles: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', padding: '16px 40px', ...PEGADO, ...styles },
    mobile: { padding: '12px 20px', gap: '10px 16px' },
    children,
  });

export default {
  id: 'navbar',
  label: 'Navbar',
  alInicio: true, // al insertarlo va arriba de todo
  variants: {
    claro: { label: 'Claro', crear: () =>
      barra({ background: '#ffffff', color: '#14141c', borderBottom: '1px solid #e3e3ea' }, [
        logo(), grupoEnlaces(LINKS), cta('Contacto', { background: 'transparent', color: '#14141c', border: '2px solid #14141c' }),
      ]) },

    oscuro: { label: 'Oscuro', crear: () =>
      barra({ background: '#0b0b10', color: '#ffffff' }, [
        logo(), grupoEnlaces(LINKS), cta('Hablemos'),
      ]) },

    centrado: { label: 'Centrado', crear: () =>
      barra({ flexDirection: 'column', justifyContent: 'center', background: '#f6f5ff', color: '#14141c', padding: '18px 24px', gap: '12px' }, [
        logo(),
        grupoEnlaces(LINKS, { gap: '32px' }),
      ]) },

    boton: { label: 'Con botón', crear: () =>
      barra({ background: 'rgba(255,255,255,0.85)', color: '#14141c', backdropFilter: 'blur(10px)', padding: '14px 40px' }, [
        logo(), grupoEnlaces(LINKS.slice(1)), cta('Cotizar ahora', { padding: '12px 26px', fontWeight: '700' }),
      ]) },
  },
};
