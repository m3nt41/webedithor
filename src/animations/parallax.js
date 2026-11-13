// PARALLAX: el elemento se desplaza a otra velocidad que el scroll.
// CSS (propiedad `translate`) + variable --sp que escribe el motor de scroll (scrollmotor.js).
// Las reglas solo valen con la clase .sc (la pone el script; con "reducir movimiento" o sin JS no existe).
// Datos en node.animation.parallax = { effect: 'y' | 'x', amount }
//   amount = recorrido en px a cada lado: positivo = más lento que el scroll (efecto de fondo),
//   negativo = más rápido. En el centro de la pantalla el elemento está en su sitio.

export default {
  id: 'parallax',
  titulo: 'Parallax (scroll)',
  principal: 'effect',
  defaults: { effect: 'y', amount: 60 },
  campos: [
    { key: 'effect', label: 'Dirección', kind: 'select', options: [['', 'Ninguno'], ['y', 'Vertical'], ['x', 'Horizontal']] },
    { key: 'amount', label: 'Recorrido (px, negativo = más rápido)', kind: 'num', step: 5, min: -2000 },
  ],

  css(g, sel) {
    if (!g?.effect) return '';
    const px = 2 * (g.amount ?? 60);
    const mov = `calc((var(--sp,.5) - .5) * ${px}px)`;
    return `.sc ${sel}{translate:${g.effect === 'x' ? `${mov} 0` : `0 ${mov}`};will-change:translate}`;
  },
};
