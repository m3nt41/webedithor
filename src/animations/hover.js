// ANIMACIÓN "AL PASAR EL MOUSE": CSS puro (transition + :hover), sin JS.
// Datos en node.animation.hover = { effect, duration, ease, color }

import { EASES, transicion, camposCurva, sinSpring, DEF_CURVA, modoSombra, sinCaja, esTexto, duracion, curva } from './base.js';

// Lista completa (la usa la validación del .json). El orden mostrado depende del nodo: ver opcionesNodo.
const NUEVOS = [
  ['underline', 'Subrayado'],
  ['color', 'Color'],
  ['soft', 'Fondo suave'],
];
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
const EFECTOS = [['', 'Ninguno'], ...CLASICOS, ...NUEVOS];

// Texto, título o botón SIN caja: los 3 efectos que no mueven las letras van primero y el primero se sugiere.
// Con caja o imagen: el orden de siempre y los nuevos al final. Solo cambia el orden de la lista, no lo guardado.
const opcionesNodo = (node) => (esTexto(node) && sinCaja(node)
  ? [['', 'Ninguno'], ['underline', 'Subrayado (sugerido)'], ...NUEVOS.slice(1), ...CLASICOS]
  : EFECTOS);

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
  bright: () => 'filter:brightness(1.2)',
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

export default {
  id: 'hover',
  estado: true, // se ve siempre en el preview
  titulo: 'Al pasar el mouse',
  principal: 'effect',
  defaults: { effect: 'lift', duration: 0.2, ease: 'suave', ...DEF_CURVA, color: '#7c5cff', lineaColor: 'texto', direccion: 'izq', grosor: 2, separacion: 0 },
  campos: [
    { key: 'effect', label: 'Efecto', kind: 'select', options: EFECTOS, opcionesNodo },
    { key: 'direccion', label: 'Dirección', kind: 'select', options: DIRECCIONES, cuando: (g, efecto) => efecto === 'underline' },
    { key: 'grosor', label: 'Grosor (px)', kind: 'num', step: 1, min: 1, max: 4, cuando: (g, efecto) => efecto === 'underline' },
    { key: 'separacion', label: 'Separación del texto (px)', kind: 'num', step: 1, min: 0, max: 8, cuando: (g, efecto) => efecto === 'underline' },
    { key: 'lineaColor', label: 'Color de la línea', kind: 'select', options: [['texto', 'El del texto'], ['otro', 'Otro color']], cuando: (g, efecto) => efecto === 'underline' },
    { key: 'duration', label: 'Duración (s)', kind: 'num', step: 0.05, min: 0.05, cuando: sinSpring },
    { key: 'ease', label: 'Curva', kind: 'select', options: EASES },
    ...camposCurva,
    { key: 'color', label: 'Color', kind: 'color', cuando: (g, efecto) => ['glow', 'color', 'soft'].includes(efecto) || (efecto === 'underline' && g?.lineaColor === 'otro') },
  ],

  css(h, sel, node) {
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
    return [extra[0], `${sel}:hover{${transicion(h)};${regla(h, modoSombra(node))}}`, extra[1]].filter(Boolean).join('\n');
  },
};
