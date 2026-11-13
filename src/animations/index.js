// REGISTRO DE ANIMACIONES. Para añadir una nueva: crea su módulo en esta carpeta
// (con { id, titulo, principal, defaults, campos, css }) y añádelo a GRUPOS_ANIM.
// El inspector, el preview y el exportador la recogen solos.

import appear from './appear.js';
import hover from './hover.js';
import press from './press.js';
import focus from './focus.js';
import text from './text.js';
import stagger from './stagger.js';
import { KEYFRAMES, transicion, cargaInmediata } from './base.js';
import { walk } from '../core/tree.js';

export { splitText } from './text.js';

export const TIPOS_TEXTO = ['heading', 'text', 'button'];

/** Cada grupo y a qué tipos de nodo se aplica. */
export const GRUPOS_ANIM = [
  { ...appear, tipos: ['section', 'container', 'heading', 'text', 'button', 'image'] },
  { ...hover, tipos: ['container', 'heading', 'text', 'button', 'image'] },
  { ...press, tipos: ['container', 'heading', 'text', 'button', 'image'] }, // después de hover: gana al presionar
  { ...focus, tipos: ['button'] }, // solo los enlaces/botones reciben foco de teclado
  { ...text, tipos: TIPOS_TEXTO },
  { ...stagger, tipos: ['section', 'container'] },
];

export const DEFAULTS = Object.fromEntries(GRUPOS_ANIM.map((g) => [g.id, g.defaults]));
export const PRINCIPAL = Object.fromEntries(GRUPOS_ANIM.map((g) => [g.id, g.principal]));

/** ¿El nodo tiene una animación de entrada (appear o texto)? */
// Entradas del nodo: appear, texto y cascada de hijos (esta última solo cuenta si hay hijos)
const entradas = (node) => {
  const a = node.animation;
  return [a?.appear?.effect && a.appear, a?.text?.mode && a.text, a?.stagger?.effect && node.children?.length && a.stagger].filter(Boolean);
};
const tieneEntrada = (node) => entradas(node).length > 0;

/** ¿El nodo necesita que el script de scroll le ponga la clase .in? (las de "al cargar" no) */
export const usaScroll = (node) => entradas(node).some((g) => !cargaInmediata(g));

/** ¿Alguna animación de entrada del nodo corre al cargar? */
export const usaCarga = (node) => entradas(node).some((g) => cargaInmediata(g));

/** ¿Hay animaciones de scroll en toda la página? (el exportador decide si incluye el script) */
export function paginaUsaScroll(page) {
  let usa = false;
  walk(page, (n) => { if (usaScroll(n)) usa = true; });
  return usa;
}

/** ¿Hay animaciones de entrada (scroll o carga)? Si sí, el export lleva los @keyframes. */
export function paginaUsaEntrada(page) {
  let usa = false;
  walk(page, (n) => { if (tieneEntrada(n)) usa = true; });
  return usa;
}

/** Transición base para SOLTAR un estado (hover/press/focus): usa la del primero que exista. */
function transicionBase(anim, sel) {
  const g = GRUPOS_ANIM.find((x) => x.estado && anim[x.id]?.effect);
  return g ? `${sel}{${transicion(anim[g.id])}}` : '';
}

/** CSS de las animaciones de un nodo. */
export function cssNodo(node, sel, { scroll = true } = {}) {
  if (!node.animation) return '';
  return [transicionBase(node.animation, sel),
    ...GRUPOS_ANIM.filter((g) => scroll || g.estado).map((g) => g.css(node.animation[g.id], sel, node)),
  ].filter(Boolean).join('\n');
}

/** CSS de toda la página para el PREVIEW (selector por data-id). scroll=false → solo hover. */
export function cssPagina(page, { scroll = false } = {}) {
  const reglas = [];
  walk(page, (n) => {
    const r = cssNodo(n, `[data-id="${n.id}"]`, { scroll });
    if (r) reglas.push(r);
  });
  return (scroll ? KEYFRAMES + '\n' : '') + reglas.join('\n');
}

export { KEYFRAMES };

/** Script mínimo del exportador: pone .in cuando el elemento entra en pantalla. */
export const SCRIPT_SCROLL = `const io=new IntersectionObserver((es)=>es.forEach((e)=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15});
document.querySelectorAll('[data-rv]').forEach((el)=>io.observe(el));`;
