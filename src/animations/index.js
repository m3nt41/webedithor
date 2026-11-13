// REGISTRO DE ANIMACIONES. Para añadir una nueva: crea su módulo en esta carpeta
// (con { id, titulo, principal, defaults, campos, css }) y añádelo a GRUPOS_ANIM.
// El inspector, el preview y el exportador la recogen solos.

import appear from './appear.js';
import hover from './hover.js';
import text from './text.js';
import { KEYFRAMES } from './base.js';
import { walk } from '../core/tree.js';

export { splitText } from './text.js';

export const TIPOS_TEXTO = ['heading', 'text', 'button'];

/** Cada grupo y a qué tipos de nodo se aplica. */
export const GRUPOS_ANIM = [
  { ...appear, tipos: ['section', 'container', 'heading', 'text', 'button', 'image'] },
  { ...hover, tipos: ['container', 'heading', 'text', 'button', 'image'] },
  { ...text, tipos: TIPOS_TEXTO },
];

export const DEFAULTS = Object.fromEntries(GRUPOS_ANIM.map((g) => [g.id, g.defaults]));
export const PRINCIPAL = Object.fromEntries(GRUPOS_ANIM.map((g) => [g.id, g.principal]));

/** ¿El nodo necesita que el script de scroll le ponga la clase .in? */
export const usaScroll = (node) => Boolean(node.animation?.appear?.effect || node.animation?.text?.mode);

/** ¿Hay animaciones de scroll en toda la página? (el exportador decide si incluye el script) */
export function paginaUsaScroll(page) {
  let usa = false;
  walk(page, (n) => { if (usaScroll(n)) usa = true; });
  return usa;
}

/** CSS de las animaciones de un nodo. */
export function cssNodo(node, sel, { scroll = true } = {}) {
  if (!node.animation) return '';
  return GRUPOS_ANIM.filter((g) => scroll || g.id === 'hover')
    .map((g) => g.css(node.animation[g.id], sel))
    .filter(Boolean)
    .join('\n');
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
