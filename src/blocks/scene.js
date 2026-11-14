// BLOQUE ESCENA (2 variantes): sección fijada con 3 pasos que cambian al hacer scroll.
// La sección lleva animation.scene (3 pasos, 3 pantallas de scroll) y cada hijo directo lleva
// animation.scenestep (en qué paso aparece / se va). Los hijos se apilan en el mismo lugar (grid);
// por eso la alineación (centro) va en la sección y los hijos no necesitan posición.
// Solo se ve en la Vista previa y en el exportado; al editar, los hijos salen uno bajo otro.
// Los pasos y la duración se cambian en el inspector ("Escena por scroll" / "Paso de escena").

import { n, texto, boton, imagen, placeholder, tit, fondoModo } from './util.js';
import { MODOS, CITA, botonTema, colorPh } from './tema.js';

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
  s.animation = { scene: { steps: '3', length: 4, transition: 40 } }; // 3 pasos: 4 pantallas (≈1 por paso); cambio = 40 % del tramo, 60 % quieto
  return s;
};

const t56 = (text, name) => tit(2, text, { fontSize: '56px', maxWidth: '16ch' }, { fontSize: '34px' }, name);

export default {
  id: 'scene',
  label: 'Escena',
  variants: {
    textos: { label: 'Tres mensajes', crear: () => {
      const m = MODOS.oscuro;
      return escena('Escena', fondoModo(m), [
        paso(t56('Primero, una idea', 'Paso 1'), 'out', 2),
        paso(t56('Luego, el diseño', 'Paso 2'), 'inout', 2),
        paso(n('container', { name: 'Paso 3', styles: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }, children: [
          tit(2, 'Y al final, tu landing', { fontSize: '56px', maxWidth: '16ch' }, { fontSize: '34px' }),
          boton('Hablemos', '#contacto', botonTema(m, 'l')),
        ] }), 'in', 3),
      ]);
    } },

    imagenes: { label: 'Texto + imagen', crear: () => {
      const m = MODOS.claro2;
      return escena('Escena', fondoModo(m), [
        paso(texto('Mira cómo cambia mientras bajas', { ...CITA.d, maxWidth: '18ch' }, CITA.m, 'Texto inicial'), 'out', 2),
        paso(imagen(placeholder(900, 560, colorPh(0), 'Paso 2'), 'Paso 2', { maxWidth: '560px' }, 'Imagen paso 2'), 'inout', 2, 'zoom'),
        paso(imagen(placeholder(900, 560, colorPh(3), 'Paso 3'), 'Paso 3', { maxWidth: '560px' }, 'Imagen paso 3'), 'in', 3, 'zoom'),
      ]);
    } },
  },
};
