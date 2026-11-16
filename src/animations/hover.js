// ANIMACIÓN "AL PASAR EL MOUSE": CSS puro (transition + :hover), sin JS.
// Datos en node.animation.hover = { effect, duration, ease, color }

import { EASES, transicion, camposCurva, sinSpring, DEF_CURVA, modoSombra, sinCaja, esTexto, duracion, curva, filtroConReposo } from './base.js';
import { cssTextoFijo, sinFondoNiBorde } from './textofijo.js';
import { textoFijoValido } from '../core/seguridad.js';

// "Texto fijo" existe solo en los 3 hovers que escalan o inclinan el nodo entero (ver textofijo.js). Las imágenes no admiten ::before.
const FIJABLES = ['grow', 'shrink', 'tilt'];
const TRANSFORM_FIJO = { grow: 'scale(1.03)', shrink: 'scale(.97)', tilt: 'rotate(-1deg)' }; // los mismos valores que REGLAS
const fijoActivo = (h, node) => FIJABLES.includes(h?.effect) && textoFijoValido(h.textoFijo) && h.textoFijo === 'si' && node?.type !== 'image';
const cuandoFijable = (g, efecto, nodo) => FIJABLES.includes(efecto) && nodo?.type !== 'image';

// Lista completa (la usa la validación del .json). El orden mostrado depende del nodo: ver opcionesNodo.
const NUEVOS = [
  ['underline', 'Subrayado'],
  ['color', 'Color'],
  ['soft', 'Fondo suave'],
];
const RELLENO = ['fill', 'Relleno'];
// Fondo que crece (técnica V6 del banco): un ::before de color que crece detrás del texto; el texto NO cambia de tamaño ni se mueve.
const CRECE = ['bgrow', 'Fondo que crece'];
// Relleno: modos y direcciones del barrido. [transform-origin FIJO (reposo y :hover), eje]
const MODOS = [['fundido', 'Fundido'], ['barrido', 'Barrido']];
const BARRIDO = {
  izq: ['left', 'X', 'Desde la izquierda'], der: ['right', 'X', 'Desde la derecha'],
  arriba: ['top', 'Y', 'Desde arriba'], abajo: ['bottom', 'Y', 'Desde abajo'],
};
const DIR_BARRIDO = Object.entries(BARRIDO).map(([k, v]) => [k, v[2]]);
const CLASICOS = [
  ['lift', 'Elevar'],
  ['grow', 'Agrandar'],
  ['shrink', 'Encoger'],
  ['tilt', 'Inclinar'],
  ['glow', 'Resplandor'],
  ['bright', 'Aclarar'],
];
// Subrayado: [transform-origin en reposo, transform-origin en :hover (null = el mismo)]
const ORIGEN = { izq: ['left', null], der: ['right', null], centro: ['center', null], pasa: ['right', 'left'] };
const DIRECCIONES = [
  ['izq', 'Desde la izquierda'],
  ['der', 'Desde la derecha'],
  ['centro', 'Desde el centro'],
  ['pasa', 'Pasa de lado a lado (puede verse brusca con pasadas rápidas)'],
];
const EFECTOS = [['', 'Ninguno'], ...CLASICOS, ...NUEVOS, RELLENO, CRECE];

// Texto, título o botón SIN caja: los 3 efectos que no mueven las letras van primero y el primero se sugiere.
// Con caja o imagen: el orden de siempre y los nuevos al final. Solo cambia el orden de la lista, no lo guardado.
// Botón o texto CON caja: "Relleno" va primero y es el sugerido (el relleno de color solo existía como estilo permanente).
const opcionesNodo = (node) => {
  if (!esTexto(node)) return EFECTOS;
  if (sinCaja(node)) return [['', 'Ninguno'], ['underline', 'Subrayado (sugerido)'], ...NUEVOS.slice(1), ...CLASICOS, RELLENO, CRECE];
  return [['', 'Ninguno'], ['fill', 'Relleno (sugerido)'], ...CLASICOS, ...NUEVOS, CRECE];
};

// Qué cambia al hacer hover en cada efecto
// 2º parámetro = modoSombra: 'texto' (sin caja y con texto: text-shadow, sin capa compuesta, el texto no se
// ve borroso al moverse), 'plano' (sin caja y sin texto, p. ej. icon/image: filter:drop-shadow) o false (con caja: box-shadow).
const REGLAS = {
  lift: (h, modo) => modo === 'texto'
    ? 'transform:translateY(-4px);text-shadow:0 8px 10px rgba(0,0,0,.28)'
    : modo
      ? 'transform:translateY(-4px);filter:drop-shadow(0 8px 10px rgba(0,0,0,.28))'
      : 'transform:translateY(-4px);box-shadow:0 14px 30px rgba(0,0,0,.28)',
  grow: () => 'transform:scale(1.03)',
  shrink: () => 'transform:scale(.97)',
  tilt: () => 'transform:rotate(-1deg)',
  glow: (h, modo) => modo === 'texto'
    ? `text-shadow:0 0 10px ${h.color || '#7c5cff'}`
    : modo
      ? `filter:drop-shadow(0 0 10px ${h.color || '#7c5cff'})`
      : `box-shadow:0 0 28px ${h.color || '#7c5cff'}`,
  bright: (h, modo, node) => filtroConReposo(node, 'brightness(1.2)'), // conserva el drop-shadow en reposo (modo plano)
};

// ZONA DE HOVER EXTRA (anti-parpadeo). Si el efecto mueve el elemento y el cursor estaba en el borde,
// al moverse el cursor queda fuera, el hover se apaga, el elemento vuelve, se reactiva... sin parar.
// Solución en CSS puro: un ::after transparente (hijo del elemento, así se mueve con él y cuenta como parte
// del hover) que cubre la zona original. Sin pointer-events:none, para que reciba el cursor.
//  lift   -> sube 4px: franja de 4px por debajo, ancho completo.
//  shrink -> scale .97 encoge ~1.5% por lado: el ::after sobresale 2% (se encoge con el elemento).
//  tilt   -> rotate(-1deg) sin scale: las esquinas se mueven unos px: margen de 4px por todos lados.
// grow, glow y bright no dejan el cursor fuera. Las imágenes (<img>) no admiten ::after: se saltan.
const ZONA = {
  lift: 'top:100%;left:0;right:0;height:4px',
  shrink: 'top:-2%;right:-2%;bottom:-2%;left:-2%',
  tilt: 'top:-4px;right:-4px;bottom:-4px;left:-4px',
};

// ¿Hace falta ponerle position:relative? Solo si hoy es estática (vacía o static) en escritorio y móvil.
const sinPosicion = (node) => [node?.styles?.base, node?.styles?.mobile]
  .every((e) => !e?.position || String(e.position).trim() === 'static');

// ¿El nodo no recorta por sí mismo? (overflow vacío o visible en escritorio y móvil). Si ya recorta (hidden, clip, auto…) no se toca.
const sinOverflow = (node) => [node?.styles?.base, node?.styles?.mobile]
  .every((e) => !e?.overflow || String(e.overflow).trim() === 'visible');

export default {
  id: 'hover',
  estado: true, // se ve siempre en el preview
  titulo: 'Al pasar el mouse',
  principal: 'effect',
  defaults: { effect: 'lift', duration: 0.2, ease: 'suave', ...DEF_CURVA, textoFijo: 'no', color: '#7c5cff', lineaColor: 'texto', direccion: 'izq', grosor: 2, separacion: 0, modo: 'fundido', dirRelleno: 'izq', textoCambia: 'no', textoColor: '#ffffff' },
  campos: [
    { key: 'effect', label: 'Efecto', kind: 'select', options: EFECTOS, opcionesNodo },
    { key: 'direccion', label: 'Dirección', kind: 'select', options: DIRECCIONES, cuando: (g, efecto) => efecto === 'underline' },
    { key: 'grosor', label: 'Grosor (px)', kind: 'num', step: 1, min: 1, max: 4, cuando: (g, efecto) => efecto === 'underline' },
    { key: 'separacion', label: 'Separación del texto (px)', kind: 'num', step: 1, min: 0, max: 8, cuando: (g, efecto) => efecto === 'underline' },
    { key: 'lineaColor', label: 'Color de la línea', kind: 'select', options: [['texto', 'El del texto'], ['otro', 'Otro color']], cuando: (g, efecto) => efecto === 'underline' },
    { key: 'modo', label: 'Modo', kind: 'select', options: MODOS, cuando: (g, efecto) => efecto === 'fill' },
    { key: 'dirRelleno', label: 'Dirección del barrido', kind: 'select', options: DIR_BARRIDO, cuando: (g, efecto) => efecto === 'fill' && g?.modo === 'barrido' },
    { key: 'textoCambia', label: 'Color del texto al pasar', kind: 'select', options: [['no', 'Sin cambio'], ['si', 'Cambiar']], cuando: (g, efecto) => efecto === 'fill' || efecto === 'bgrow' },
    { key: 'textoColor', label: 'Color del texto', kind: 'color', cuando: (g, efecto) => (efecto === 'fill' || efecto === 'bgrow') && g?.textoCambia === 'si' },
    // Texto fijo (Agrandar, Encoger, Inclinar): el fondo y el borde se mueven en un ::before y el texto no se transforma. Por defecto No.
    { key: 'textoFijo', label: 'Texto fijo', kind: 'select', options: [['no', 'No'], ['si', 'Sí']], cuando: cuandoFijable },
    // Aviso corto (se pinta con el triángulo de aviso): Agrandar usa scale y en Firefox el texto escalado puede verse raro (se oculta con Texto fijo)
    { kind: 'nota', cuando: (g, efecto, nodo) => efecto === 'grow' && !fijoActivo(g, nodo), texto: 'En Firefox el texto puede verse raro al agrandarse. Activa «Texto fijo» (el texto no cambia) o usa «Fondo que crece».' },
    // Texto fijo sin nada que mover: el efecto no se ve (no se escala el texto ni se inventa un fondo)
    { kind: 'nota', cuando: (g, efecto, nodo) => fijoActivo(g, nodo) && sinFondoNiBorde(nodo), texto: 'Necesita fondo o borde: sin ellos no hay nada que mover y el efecto no se ve. Ponle un fondo o un borde, o desactiva «Texto fijo».' },
    { key: 'duration', label: 'Duración (s)', kind: 'num', step: 0.05, min: 0.05, cuando: sinSpring },
    { key: 'ease', label: 'Curva', kind: 'select', options: EASES },
    ...camposCurva,
    { key: 'color', label: 'Color de relleno', kind: 'color', cuando: (g, efecto) => efecto === 'fill' || efecto === 'bgrow' },
    { key: 'color', label: 'Color', kind: 'color', cuando: (g, efecto) => ['glow', 'color', 'soft'].includes(efecto) || (efecto === 'underline' && g?.lineaColor === 'otro') },
  ],

  css(h, sel, node, ctx) {
    // Texto fijo: el nodo no se transforma; su fondo y borde se mueven en un ::before (sin fondo ni borde no hace nada: '').
    if (fijoActivo(h, node)) {
      return cssTextoFijo(node, sel, TRANSFORM_FIJO[h.effect], `${duracion(h, 0.2)}s ${curva(h)}`, ctx?.viewMode, sinPosicion(node));
    }
    // Subrayado y Fondo suave: un ::before (el ::after queda libre para la zona anti-parpadeo). No mueven ni escalan el texto:
    // el transform / opacity va solo en el pseudo-elemento. Técnica: transform-origin que cambia en :hover
    // (30secondsofcode.org/css/s/hover-underline-animation). Las imágenes (<img>) no admiten pseudo-elementos.
    if (h?.effect === 'underline' || h?.effect === 'soft') {
      if (node?.type === 'image') return '';
      const t = `${duracion(h, 0.2)}s ${curva(h)}`;
      const c = h.color || '#7c5cff';
      const pos = sinPosicion(node) ? 'position:relative;' : '';
      if (h.effect === 'underline') {
        const col = h.lineaColor === 'otro' ? c : 'currentColor';
        // Dirección: en las 3 primeras el transform-origin es el MISMO en reposo y en :hover (no salta con pasadas rápidas).
        // Solo 'pasa' lo cambia (entra por la izquierda, sale por la derecha). Sin dirección guardada = 'izq'.
        const dir = ORIGEN[h.direccion] ? h.direccion : 'izq';
        const grosor = Math.min(4, Math.max(1, Number(h.grosor) || 2));
        const sep = Math.min(8, Math.max(0, Number(h.separacion) || 0));
        const [origen, origenHover] = ORIGEN[dir];
        const hover = `transform:scaleX(1)${origenHover ? `;transform-origin:${origenHover}` : ''}`;
        return [pos && `${sel}{${pos}}`,
          `${sel}::before{content:'';position:absolute;left:0;right:0;bottom:-${grosor + sep}px;height:${grosor}px;background:${col};transform:scaleX(0);transform-origin:${origen};transition:transform ${t};pointer-events:none}`,
          `${sel}:hover::before{${hover}}`].filter(Boolean).join('\n');
      }
      return [`${sel}{${pos}isolation:isolate}`,
        `${sel}::before{content:'';position:absolute;top:-.2em;right:-.5em;bottom:-.2em;left:-.5em;border-radius:.4em;background:${c};opacity:0;z-index:-1;transition:opacity ${t};pointer-events:none}`,
        `${sel}:hover::before{opacity:.2}`].join('\n');
    }
    // Relleno (botones y texto con caja). Texto: color de texto opcional con transition (color se añade en base.js).
    //  fundido: background-color con transition. barrido: ::before inset:0 con scaleX/Y(0→1) y transform-origin FIJO
    //  (igual en reposo y :hover, no salta con pasadas rápidas), z-index:-1 + isolation:isolate en el nodo (el texto queda
    //  encima), y overflow:clip en el nodo (recorta con su border-radius sin ser contenedor de scroll: no rompe el parallax).
    //  Sin will-change, filter ni transform sobre el texto. Las imágenes no admiten ::before y se saltan.
    if (h?.effect === 'fill') {
      if (node?.type === 'image') return '';
      const c = h.color || '#7c5cff';
      const txt = h.textoCambia === 'si' ? `;color:${h.textoColor || '#ffffff'}!important` : '';
      if (h.modo !== 'barrido') return `${sel}:hover{${transicion(h)};background-color:${c}!important${txt}}`;
      const [origen, eje] = BARRIDO[h.dirRelleno] || BARRIDO.izq;
      const t = `${duracion(h, 0.25)}s ${curva(h)}`;
      const pos = sinPosicion(node) ? 'position:relative;' : '';
      return [`${sel}{${pos}isolation:isolate${sinOverflow(node) ? ';overflow:clip' : ''}}`,
        `${sel}::before{content:'';position:absolute;inset:0;background:${c};transform:scale${eje}(0);transform-origin:${origen};transition:transform ${t};z-index:-1;pointer-events:none}`,
        `${sel}:hover::before{transform:scale${eje}(1)}`,
        txt && `${sel}:hover{${transicion(h)}${txt}}`].filter(Boolean).join('\n');
    }
    // Fondo que crece (técnica V6 del banco de comparación): un ::before de color con z-index:-1 (isolation:isolate en el nodo: queda por
    //  encima del fondo del nodo y por debajo del texto) que pasa de scale(.85) y transparente a scale(1.06) y opaco. SOLO el pseudo-elemento
    //  se escala: el texto no lleva transform, ni scale, ni will-change, ni filter, así que no cambia de tamaño ni se mueve (en Firefox, un scale
    //  sobre el texto puede verse raro: es justo lo que evita). Sin overflow:clip (tiene que sobresalir). Las imágenes no admiten ::before y se saltan.
    if (h?.effect === 'bgrow') {
      if (node?.type === 'image') return '';
      const t = `${duracion(h, 0.25)}s ${curva(h)}`;
      const c = h.color || '#7c5cff';
      const pos = sinPosicion(node) ? 'position:relative;' : '';
      const txt = h.textoCambia === 'si' ? `;color:${h.textoColor || '#ffffff'}!important` : '';
      return [`${sel}{${pos}isolation:isolate}`,
        `${sel}::before{content:'';position:absolute;inset:0;border-radius:inherit;background:${c};opacity:0;transform:scale(.85);z-index:-1;pointer-events:none;transition:transform ${t},opacity ${t}}`,
        `${sel}:hover::before{opacity:1;transform:scale(1.06)}`,
        txt && `${sel}:hover{${transicion(h)}${txt}}`].filter(Boolean).join('\n');
    }
    // Color: cambia el color del texto con transition (la de color se añade en base.js). !important porque en el
    // lienzo el color del nodo va en style inline.
    if (h?.effect === 'color') return `${sel}:hover{${transicion(h)};color:${h.color || '#7c5cff'}!important}`;
    const regla = REGLAS[h?.effect];
    if (!regla) return '';
    // la transición base (para soltar) la pone cssNodo; aquí va la de entrar al estado
    const zona = ZONA[h.effect];
    const extra = zona && node?.type !== 'image'
      ? [sinPosicion(node) ? `${sel}{position:relative}` : '',
        `${sel}:hover::after{content:'';position:absolute;${zona}}`]
      : [];
    return [extra[0], `${sel}:hover{${transicion(h)};${regla(h, modoSombra(node), node)}}`, extra[1]].filter(Boolean).join('\n');
  },
};
