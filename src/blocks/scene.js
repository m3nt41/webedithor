// BLOQUE ESCENA (2 variantes): sección fijada con 3 pasos que cambian al hacer scroll.
// La sección lleva animation.scene (3 pasos, 3 pantallas de scroll) y cada hijo directo lleva
// animation.scenestep (en qué paso aparece / se va). Los hijos se apilan en el mismo lugar (grid);
// por eso la alineación (centro) va en la sección y los hijos no necesitan posición.
// Solo se ve con ▶ Reproducir y en el exportado; al editar, los hijos salen uno bajo otro.
// Los pasos y la duración se cambian en el inspector ("Escena por scroll" / "Paso de escena").

import { n, titulo, texto, boton, imagen, placeholder } from './util.js';

/** Pone el "Paso de escena" a un hijo. */
const paso = (nodo, effect, step, move = 'up') => {
  nodo.animation = { scenestep: { effect, step, move, distance: 40 } };
  return nodo;
};

/** Sección escena: centrada, alto lo pone el motor (100svh). */
const escena = (name, styles, hijos) => {
  const s = n('section', {
    name,
    styles: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 32px', ...styles },
    mobile: { padding: '32px 20px' },
    children: hijos,
  });
  s.animation = { scene: { steps: '3', length: 3 } };
  return s;
};

export default {
  id: 'scene',
  label: 'Escena',
  variants: {
    textos: { label: 'Tres mensajes', crear: () =>
      escena('Escena', { background: '#0b0b10', color: '#ffffff' }, [
        paso(titulo('Primero, una idea', 2, { fontSize: '56px', fontWeight: '800', maxWidth: '16ch' }, { fontSize: '34px' }, 'Paso 1'), 'out', 2),
        paso(titulo('Luego, el diseño', 2, { fontSize: '56px', fontWeight: '800', maxWidth: '16ch' }, { fontSize: '34px' }, 'Paso 2'), 'inout', 2),
        paso(n('container', { name: 'Paso 3', styles: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }, children: [
          titulo('Y al final, tu landing', 2, { fontSize: '56px', fontWeight: '800', maxWidth: '16ch' }, { fontSize: '34px' }),
          boton('Hablemos', '#contacto'),
        ] }), 'in', 3),
      ]) },

    imagenes: { label: 'Texto + imagen', crear: () =>
      escena('Escena', { background: '#f6f5ff', color: '#14141c' }, [
        paso(texto('Mira cómo cambia mientras bajas', { fontSize: '36px', fontWeight: '700', maxWidth: '18ch' }, { fontSize: '26px' }, 'Texto inicial'), 'out', 2),
        paso(imagen(placeholder(900, 560, '#d9d9e3', 'Paso 2'), 'Paso 2', { maxWidth: '560px', borderRadius: '20px' }, 'Imagen paso 2'), 'inout', 2, 'zoom'),
        paso(imagen(placeholder(900, 560, '#c9c2f5', 'Paso 3'), 'Paso 3', { maxWidth: '560px', borderRadius: '20px' }, 'Imagen paso 3'), 'in', 3, 'zoom'),
      ]) },
  },
};
