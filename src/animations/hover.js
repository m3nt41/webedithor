// ANIMACIÓN "AL PASAR EL MOUSE": CSS puro (transition + :hover), sin JS.
// Datos en node.animation.hover = { effect, duration, ease, color }

import { EASES, transicion, camposCurva, sinSpring, DEF_CURVA, modoSombra } from './base.js';

const EFECTOS = [
  ['', 'Ninguno'],
  ['lift', 'Elevar'],
  ['grow', 'Agrandar'],
  ['shrink', 'Encoger'],
  ['tilt', 'Inclinar'],
  ['glow', 'Resplandor'],
  ['bright', 'Aclarar'],
];

// Qué cambia al hacer hover en cada efecto
// 2º parámetro = modoSombra: 'texto' (sin caja y con texto: text-shadow, sin capa compuesta, el texto no se
// ve borroso al moverse), 'plano' (sin caja y sin texto, p. ej. icon/image: filter:drop-shadow) o false (con caja: box-shadow).
const REGLAS = {
  lift: (h, modo) => modo === 'texto'
    ? 'transform:translateY(-6px);text-shadow:0 8px 10px rgba(0,0,0,.28)'
    : modo
      ? 'transform:translateY(-6px);filter:drop-shadow(0 8px 10px rgba(0,0,0,.28))'
      : 'transform:translateY(-6px);box-shadow:0 14px 30px rgba(0,0,0,.28)',
  grow: () => 'transform:scale(1.06)',
  shrink: () => 'transform:scale(.95)',
  tilt: () => 'transform:rotate(-2deg) scale(1.04)',
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
//  lift   -> sube 6px: franja de 6px por debajo, ancho completo.
//  shrink -> scale .95 encoge ~2.6% por lado: el ::after sobresale 3% (se encoge con el elemento).
//  tilt   -> rotate(-2deg) + scale(1.04): las esquinas se mueven unos px: margen de 6px por todos lados.
// grow, glow y bright no dejan el cursor fuera. Las imágenes (<img>) no admiten ::after: se saltan.
const ZONA = {
  lift: 'top:100%;left:0;right:0;height:6px',
  shrink: 'top:-3%;right:-3%;bottom:-3%;left:-3%',
  tilt: 'top:-6px;right:-6px;bottom:-6px;left:-6px',
};

// ¿Hace falta ponerle position:relative? Solo si hoy es estática (vacía o static) en escritorio y móvil.
const sinPosicion = (node) => [node?.styles?.base, node?.styles?.mobile]
  .every((e) => !e?.position || String(e.position).trim() === 'static');

export default {
  id: 'hover',
  estado: true, // se ve siempre en el preview
  titulo: 'Al pasar el mouse',
  principal: 'effect',
  defaults: { effect: 'lift', duration: 0.25, ease: 'suave', ...DEF_CURVA, color: '#7c5cff' },
  campos: [
    { key: 'effect', label: 'Efecto', kind: 'select', options: EFECTOS },
    { key: 'duration', label: 'Duración (s)', kind: 'num', step: 0.05, min: 0.05, cuando: sinSpring },
    { key: 'ease', label: 'Curva', kind: 'select', options: EASES },
    ...camposCurva,
    { key: 'color', label: 'Color', kind: 'color', cuando: (g, efecto) => efecto === 'glow' },
  ],

  css(h, sel, node) {
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
