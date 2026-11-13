// REGISTRO DE ANIMACIONES. Para añadir una nueva: crea su módulo en esta carpeta
// (con { id, titulo, principal, defaults, campos, css }) y añádelo a GRUPOS_ANIM.
// El inspector, el preview y el exportador la recogen solos.

import appear from './appear.js';
import hover from './hover.js';
import press from './press.js';
import focus from './focus.js';
import text from './text.js';
import stagger from './stagger.js';
import parallax from './parallax.js';
import scrolllink from './scrolllink.js';
import scene, { CSS_ESCENA, usaEscena, varsEscena } from './scene.js';
import scenestep from './scenestep.js';
import variants, { estadosEntrada, usaClic, SCRIPT_CLIC } from './variants.js';
export { motorScroll, SCRIPT_SCROLLMOTOR } from './scrollmotor.js';
import { KEYFRAMES, transicion, cargaInmediata } from './base.js';
import { walk } from '../core/tree.js';

export { splitText, esMedida, medirLineas, SCRIPT_LINEAS } from './text.js';
import { esMedida } from './text.js';

export const TIPOS_TEXTO = ['heading', 'text', 'button'];

/** Cada grupo y a qué tipos de nodo se aplica. */
export const GRUPOS_ANIM = [
  { ...appear, tipos: ['section', 'container', 'heading', 'text', 'button', 'image'] },
  { ...hover, tipos: ['container', 'heading', 'text', 'button', 'image'] },
  { ...press, tipos: ['container', 'heading', 'text', 'button', 'image'] }, // después de hover: gana al presionar
  { ...focus, tipos: ['button'] }, // solo los enlaces/botones reciben foco de teclado
  { ...text, tipos: TIPOS_TEXTO },
  { ...stagger, tipos: ['section', 'container'] },
  { ...parallax, tipos: ['section', 'container', 'heading', 'text', 'button', 'image'] }, // solo con el motor de scroll (.sc)
  { ...scrolllink, tipos: ['section', 'container', 'heading', 'text', 'button', 'image'] },
  { ...scene, tipos: ['section'] },
  // solo se muestra en el inspector si el padre es una escena (ver `soloEnEscena`)
  { ...scenestep, tipos: ['container', 'heading', 'text', 'button', 'image'], soloEnEscena: true },
  { ...variants, tipos: ['section', 'container', 'heading', 'text', 'button', 'image'] }, // al final: sus !important y su `animation` ganan
];

export { usaClic, SCRIPT_CLIC, CSS_ESCENA, usaEscena, varsEscena };

/** ¿Hay escenas por scroll en la página? */
export function paginaUsaEscena(page) {
  let usa = false;
  walk(page, (n) => { if (usaEscena(n)) usa = true; });
  return usa;
}

/** ¿Es una SECCIÓN pegada arriba (navbar)? El motor mide su alto para que las escenas lo respeten. */
export const esNavPegado = (n) => n.type === 'section' && !usaEscena(n) && n.styles.base.position === 'sticky' && !!n.styles.base.top;

/** ¿El nodo usa parallax o "ligado al scroll"? (necesita el motor de scroll: data-sc) */
export const usaScrollLink = (node) => Boolean(node.animation?.parallax?.effect || node.animation?.scrolllink?.effect);

/** ¿Hay parallax o scroll-linked en la página? (el export lleva el motor solo entonces) */
export function paginaUsaScrollLink(page) {
  let usa = false;
  walk(page, (n) => { if (usaScrollLink(n) || usaEscena(n)) usa = true; }); // las escenas también usan el motor
  return usa;
}

/** ¿Hay estados por clic en la página? (el export lleva el script mínimo solo entonces) */
export function paginaUsaClic(page) {
  let usa = false;
  walk(page, (n) => { if (usaClic(n)) usa = true; });
  return usa;
}

export const DEFAULTS = Object.fromEntries(GRUPOS_ANIM.map((g) => [g.id, g.defaults]));
export const PRINCIPAL = Object.fromEntries(GRUPOS_ANIM.map((g) => [g.id, g.principal]));

/** ¿El nodo tiene una animación de entrada (appear o texto)? */
// Entradas del nodo: appear, texto y cascada de hijos (esta última solo cuenta si hay hijos)
const entradas = (node) => {
  const a = node.animation;
  // los estados "al cargar" / "al entrar en pantalla" también cuentan (llevan su propio `trigger`)
  return [a?.appear?.effect && a.appear, a?.text?.mode && a.text, a?.stagger?.effect && node.children?.length && a.stagger, ...estadosEntrada(node)].filter(Boolean);
};
const tieneEntrada = (node) => entradas(node).length > 0;

/** ¿El nodo necesita que el script de scroll le ponga la clase .in? (las de "al cargar" no) */
export const usaScroll = (node) => entradas(node).some((g) => !cargaInmediata(g));

/** ¿Alguna animación de entrada del nodo corre al cargar? */
export const usaCarga = (node) => entradas(node).some((g) => cargaInmediata(g));

/** ¿Hay texto con "Por línea (medida)"? (solo entonces el export lleva el script de medición) */
export function paginaUsaMedida(page) {
  let usa = false;
  walk(page, (n) => { if (esMedida(n.animation?.text?.mode)) usa = true; });
  return usa;
}

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
export function cssNodo(node, sel, { scroll = true, forzar = null } = {}) {
  if (!node.animation) return '';
  return [transicionBase(node.animation, sel),
    ...GRUPOS_ANIM.filter((g) => scroll || g.estado).map((g) => g.css(node.animation[g.id], sel, node, { scroll, forzar })),
  ].filter(Boolean).join('\n');
}

/** CSS de toda la página para el PREVIEW (selector por data-id). scroll=false → solo hover.
 *  forzar = { id, estado }: muestra fijo ese estado de un nodo ("Ver este estado"). */
export function cssPagina(page, { scroll = false, forzar = null } = {}) {
  const reglas = [];
  walk(page, (n) => {
    const r = cssNodo(n, `[data-id="${n.id}"]`, { scroll, forzar });
    if (r) reglas.push(r);
  });
  return (scroll ? KEYFRAMES + '\n' + (paginaUsaEscena(page) ? CSS_ESCENA + '\n' : '') : '') + reglas.join('\n');
}

export { KEYFRAMES };

/** Script mínimo del exportador: pone .in cuando el elemento entra en pantalla. */
export const SCRIPT_SCROLL = `const io=new IntersectionObserver((es)=>es.forEach((e)=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.15});
document.querySelectorAll('[data-rv]').forEach((el)=>io.observe(el));`;
