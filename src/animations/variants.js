// VARIANTS: estados con nombre de un elemento (Etapa 6, bloque 4).
// Datos en node.animation.variants = [ { id, name, trigger, duration, delay, ease, (bx1..by2, stiffness..), props } ]
//   - "reposo" no se guarda: es el aspecto normal del elemento.
//   - props = lo que cambia ese estado (vacío = no cambia): opacity, x, y, scale, rotate, blur,
//     brightness, color, bg, borderColor, radius, shadow.
//   - Si dos estados tocan lo mismo y están activos a la vez, gana el que va MÁS ABAJO en la lista.
//
// Cómo se hace en CSS (sin JS salvo el clic):
//   hover / presionar / enfocar / clic  -> reglas :hover, :active, :focus-visible, .on con
//        `!important` + `transition`. El !important es la clave para que el variant GANE a:
//        el hover/press/focus "viejos", los estilos inline del preview y -sobre todo- a un estado
//        "al cargar"/"al entrar" que se queda en su valor final (una animación con fill-mode
//        `forwards` le gana a un :hover normal, pero NO a un :hover con !important).
//   al cargar / al entrar en pantalla -> @keyframes que solo definen el `to`, con `forwards`
//        (el `from` es el reposo del propio elemento). Al entrar en pantalla reusa la clase `.in`
//        del script de scroll que ya existía; al cargar no hace falta script.
//   clic -> un script mínimo (SCRIPT_CLIC) alterna la clase `.on`; solo viaja en el export si algún
//        estado usa el clic.

import { EASES, camposCurva, sinSpring, DEF_CURVA, curva, duracion, animEntrada } from './base.js';
import { newId } from '../core/tree.js';

export const DISPAROS_VARIANT = [
  ['hover', 'Al pasar el mouse'],
  ['press', 'Al presionar'],
  ['focus', 'Al enfocar (solo botones)'],
  ['click', 'Al hacer clic (alterna)'],
  ['load', 'Al cargar la página'],
  ['scroll', 'Al entrar en pantalla'],
];

/** Qué puede cambiar un estado. kind: num | color | text. */
export const CAMPOS_PROPS = [
  { key: 'opacity', label: 'Opacidad (0–1)', kind: 'num', step: 0.1 },
  { key: 'x', label: 'Mover X (px)', kind: 'num', step: 5 },
  { key: 'y', label: 'Mover Y (px)', kind: 'num', step: 5 },
  { key: 'scale', label: 'Escala (1 = igual)', kind: 'num', step: 0.05 },
  { key: 'rotate', label: 'Rotación (°)', kind: 'num', step: 5 },
  { key: 'blur', label: 'Desenfoque (px)', kind: 'num', step: 1 },
  { key: 'brightness', label: 'Brillo (1 = igual)', kind: 'num', step: 0.1 },
  { key: 'color', label: 'Color de texto', kind: 'color' },
  { key: 'bg', label: 'Color de fondo', kind: 'color' },
  { key: 'borderColor', label: 'Color de borde', kind: 'color' },
  { key: 'radius', label: 'Radio de borde (px)', kind: 'num', step: 2 },
  { key: 'shadow', label: 'Sombra', kind: 'text', placeholder: '0 10px 30px rgba(0,0,0,.3)' },
];

/** Campos de tiempo de cada estado (mismos que el resto de animaciones). */
export const CAMPOS_TIEMPO = [
  { key: 'duration', label: 'Duración (s)', kind: 'num', step: 0.1, min: 0.05, cuando: sinSpring },
  { key: 'delay', label: 'Retraso (s)', kind: 'num', step: 0.1, min: 0 },
  { key: 'ease', label: 'Curva', kind: 'select', options: EASES },
  ...camposCurva,
];

export const DEF_TIEMPO = { duration: 0.4, delay: 0, ease: 'suave', ...DEF_CURVA };

const numero = (v) => (v === '' || v == null || !Number.isFinite(+v) ? null : +v);
// Texto libre (color, sombra) que va dentro de una regla CSS: se quitan los caracteres que podrían romperla
const limpio = (s) => String(s ?? '').replace(/[;{}<>!\\]/g, '').trim();

/** props -> declaraciones CSS ("a:1;b:2"). imp=true añade !important (los @keyframes no lo admiten). */
export function declaraciones(p = {}, imp = false) {
  const i = imp ? ' !important' : '';
  const d = [];
  const o = numero(p.opacity);
  if (o != null) d.push(`opacity:${o}${i}`);
  const x = numero(p.x), y = numero(p.y);
  if (x != null || y != null) d.push(`translate:${x ?? 0}px ${y ?? 0}px${i}`);
  const sc = numero(p.scale);
  if (sc != null) d.push(`scale:${sc}${i}`);
  const r = numero(p.rotate);
  if (r != null) d.push(`rotate:${r}deg${i}`);
  const f = [];
  const bl = numero(p.blur), br = numero(p.brightness);
  if (bl != null) f.push(`blur(${bl}px)`);
  if (br != null) f.push(`brightness(${br})`);
  if (f.length) d.push(`filter:${f.join(' ')}${i}`);
  const txt = (k, css) => { const v = limpio(p[k]); if (v) d.push(`${css}:${v}${i}`); };
  txt('color', 'color');
  txt('bg', 'background-color');
  txt('borderColor', 'border-color');
  const rad = numero(p.radius);
  if (rad != null) d.push(`border-radius:${rad}px${i}`);
  txt('shadow', 'box-shadow');
  return d.join(';');
}

/** Estados del nodo que de verdad cambian algo (los vacíos no generan CSS ni scripts). */
export const estadosActivos = (node) => (node?.animation?.variants ?? []).filter((s) => declaraciones(s.props));

/** Estados que corren una sola vez y se quedan (al cargar / al entrar en pantalla). */
export const estadosEntrada = (node) => estadosActivos(node).filter((s) => s.trigger === 'load' || s.trigger === 'scroll');

/** ¿El nodo tiene algún estado por clic? (necesita el script mínimo) */
export const usaClic = (node) => estadosActivos(node).some((s) => s.trigger === 'click');

/** Estado nuevo con valores por defecto (nombre "Estado N"). */
export function crearEstado(lista) {
  return { id: `s${newId()}`, name: `Estado ${lista.length + 1}`, trigger: 'hover', ...DEF_TIEMPO, props: { scale: 1.05 } };
}

// Todo lo que un estado puede transicionar (incluye lo que usan hover/press/focus, para no pisarlos)
const PROPS_TRANS = 'opacity,translate,scale,rotate,filter,color,background-color,border-color,border-radius,box-shadow,transform,outline-color,outline-offset';
const SEL_ESTADO = { hover: ':hover', press: ':active', focus: ':focus-visible', click: '.on' };
const seguro = (s) => String(s).replace(/[^\w-]/g, '');

/** Script mínimo del export: el clic alterna .on. Solo se incluye si hay estados por clic. */
export const SCRIPT_CLIC = `document.querySelectorAll('[data-vc]').forEach((el)=>el.addEventListener('click',(e)=>{el.classList.toggle('on');const h=el.getAttribute('href');if(h===''||h==='#')e.preventDefault()}));`;

export default {
  id: 'variants',
  estado: true, // hover/press/focus se ven siempre en el preview; el resto solo con ▶ Reproducir
  propio: true, // el inspector lo dibuja con su propia sección (lista de estados), no con el formato genérico
  titulo: 'Estados (variants)',
  principal: null,
  defaults: {},
  campos: [],

  /** CSS de los estados del nodo. opts.scroll=false (edición) → solo los estados interactivos;
   *  opts.forzar = { id, estado } → aplica ese estado fijo (botón "Ver este estado"). */
  css(lista, sel, node, opts = {}) {
    if (!Array.isArray(lista)) return '';
    const { scroll = true, forzar } = opts;
    const activos = lista.filter((s) => declaraciones(s.props));
    const out = [];

    const trTiempo = (s, retraso) =>
      `transition-property:${PROPS_TRANS};transition-duration:${duracion(s, DEF_TIEMPO.duration)}s;transition-timing-function:${curva(s)};transition-delay:${retraso}s`;

    // ---- Interactivos: hover, presionar, enfocar, clic ----
    const inter = activos.filter((s) => SEL_ESTADO[s.trigger] && (scroll || s.trigger !== 'click'));
    if (inter.length) {
      out.push(`${sel}{${trTiempo(inter[0], 0)}}`); // para SOLTAR: usa el tiempo del primero (sin retraso)
      if (inter.some((s) => s.trigger === 'click')) out.push(`${sel}{cursor:pointer}`);
      // en el orden de la lista: a igual especificidad, el de más abajo gana
      for (const s of inter) out.push(`${sel}${SEL_ESTADO[s.trigger]}{${declaraciones(s.props, true)};${trTiempo(s, s.delay ?? 0)}}`);
    }

    // ---- Una vez y se quedan: al cargar / al entrar en pantalla ----
    const una = scroll ? activos.filter((s) => s.trigger === 'load' || s.trigger === 'scroll') : [];
    if (una.length) {
      const items = [];
      // si el elemento también tiene "Al aparecer", su animación va en la misma lista (`animation` es una sola propiedad)
      const ap = node?.animation?.appear;
      if (ap?.effect) items.push(animEntrada(ap.effect, duracion(ap, 0.8), curva(ap), `${ap.delay ?? 0}s`, ap));
      for (const s of una) {
        const nombre = `v-${seguro(node.id)}-${seguro(s.id)}`;
        // solo el `to`: el `from` es el reposo del elemento. `forwards` lo deja en el estado,
        // y por eso los estados interactivos llevan !important (ver arriba).
        out.push(`@keyframes ${nombre}{to{${declaraciones(s.props, false)}}}`);
        items.push(`${nombre} ${duracion(s, DEF_TIEMPO.duration)}s ${curva(s)} ${s.delay ?? 0}s forwards${s.trigger === 'scroll' ? ' paused' : ''}`);
      }
      out.push(`${sel}{animation:${items.join(',')}}`);
      if (una.some((s) => s.trigger === 'scroll')) out.push(`${sel}.in{animation-play-state:running}`);
    }

    // ---- "Ver este estado" (solo editor): fuerza ese estado en el preview ----
    if (forzar && node && forzar.id === node.id) {
      const d = declaraciones(lista.find((s) => s.id === forzar.estado)?.props, true);
      if (d) out.push(`${sel}{${d}}`);
    }
    return out.join('\n');
  },
};
