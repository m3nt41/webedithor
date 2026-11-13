// ESCENAS POR SCROLL (parte 1: la sección que se fija).
// Una SECCIÓN con "Escena por scroll" se queda pegada en pantalla mientras scrolleas, y sus hijos
// directos (con el grupo "Paso de escena", ver scenestep.js) aparecen y desaparecen por pasos.
// Datos en node.animation.scene = { steps: '2'|'3'|'4', length, top? }
//   steps  = cuántos pasos tiene la escena (el scroll se reparte en tramos iguales)
//   length = cuántas "pantallas de scroll" dura (alto del contenedor = length × 100svh)
//   top    = px que deja libres arriba (para un navbar pegado). Vacío = se mide solo.
//   transition = % de cada tramo que dura el CAMBIO entre pasos (20–80); el resto del tramo el paso queda quieto.
//            Falta = 50 (como antes de existir el campo; normalizar.js lo rellena con 50 al abrir). Por defecto en escenas nuevas: 40.
//
// CÓMO SE ARMA (el árbol NO cambia; el preview con ▶ y el exportador crean esto igual):
//   <div data-ew style="--len:3;--n:3">     contenedor alto (el que da el recorrido de scroll)
//     <section data-es class="...">          capa pegada: sticky, alto = 100svh − navbar
//       hijos apilados en la MISMA celda de un grid (grid-area:1/1), nunca position:absolute
// Todo lo de abajo vale solo con la clase .sc (la pone el motor de scroll). Con "reducir movimiento"
// o sin JS no hay .sc: el contenedor es `display:contents` y la sección sale normal, con todo visible.
// El motor (scrollmotor.js) escribe el progreso de la escena (0..1) en --ep del contenedor alto.
// --alto-v = 100svh en el export; el preview lo fija al alto real de su panel (para verse igual).

/** CSS general de las escenas (una sola vez por página). */
export const CSS_ESCENA = [
  '[data-ew]{display:contents}',
  '.sc [data-ew]{display:block;height:calc(var(--len,3) * var(--alto-v,100svh))}',
  '.sc [data-es]{position:sticky!important;top:var(--arr,0px)!important;height:calc(var(--alto-v,100svh) - var(--arr,0px))!important;min-height:0!important;box-sizing:border-box;display:grid!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr)!important;gap:0!important;overflow:hidden}',
  '.sc [data-es]>*{grid-area:1/1!important;min-width:0}',
].join('\n');

/** ¿La sección es una escena? */
export const usaEscena = (node) => node.type === 'section' && Boolean(node.animation?.scene?.steps);

/** Variables del contenedor alto: { style: '--len:3;--n:3[;--arr:64px]', auto: true si el navbar se mide solo }. */
export function varsEscena(node) {
  const g = node.animation.scene;
  const n = Math.min(4, Math.max(2, Math.round(+g.steps) || 3));
  const len = Math.max(1, +g.length || 3);
  const top = g.top === '' || g.top == null ? NaN : +g.top;
  const fijo = Number.isFinite(top);
  return { style: `--len:${len};--n:${n}` + (fijo ? `;--arr:${Math.max(0, top)}px` : ''), auto: !fijo };
}

const ALIN = { 'flex-start': 'start', center: 'center', 'flex-end': 'end' };

export default {
  id: 'scene',
  titulo: 'Escena por scroll',
  principal: 'steps',
  defaults: { steps: '3', length: 4, transition: 40 }, // escenas nuevas desde el inspector (4 pantallas para 3 pasos)
  campos: [
    { key: 'steps', label: 'Pasos', kind: 'select', options: [['', 'Ninguna'], ['2', '2 pasos'], ['3', '3 pasos'], ['4', '4 pasos']] },
    { key: 'length', label: 'Duración (pantallas de scroll)', kind: 'num', step: 0.5, min: 1 },
    { key: 'transition', label: 'Transición (% del tramo)', kind: 'num', step: 5, min: 20, max: 80, relleno: 50 }, // relleno = valor al abrir un .json sin el campo
    { key: 'top', label: 'Espacio arriba (px, vacío = medir el navbar)', kind: 'num', step: 5, min: 0 },
  ],

  // Alineación: la sección apila a los hijos en un grid de una celda. Si era flex, su alineación se traduce
  // (la dirección decide qué eje es cuál). Dirección, gap, columnas y envolver no se usan en la escena.
  css(g, sel, node) {
    if (!g?.steps) return '';
    const b = node?.styles?.base ?? {};
    let h = 'stretch';
    let v = 'start';
    if (b.display === 'flex') {
      const col = b.flexDirection === 'column';
      h = ALIN[col ? b.alignItems : b.justifyContent] ?? 'stretch';
      v = ALIN[col ? b.justifyContent : b.alignItems] ?? 'stretch';
    } else if (b.display === 'grid') {
      v = ALIN[b.alignItems] ?? 'stretch';
    }
    return `.sc ${sel}{justify-items:${h}!important;align-items:${v}!important}`;
  },
};
