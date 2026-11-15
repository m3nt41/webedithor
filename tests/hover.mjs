// Hover "Elevar"/"Resplandor" y focus "Resplandor": drop-shadow si el elemento no tiene caja visible, box-shadow si la tiene.
// Ejecutar: node tests/hover.mjs
import assert from 'node:assert/strict';
import { createNode as n } from '../src/core/tree.js';
import { cssNodo } from '../src/animations/index.js';
import { sinCaja } from '../src/animations/base.js';
let ok = 0; const t = (nombre, f) => { f(); ok++; console.log('✔', nombre); };

// Nodo con un estilo base/mobile y una animación; devuelve el CSS de ese nodo
const css = (base, anim, mobile = {}, tipo = 'button') => {
  const x = n(tipo, { content: { text: 'Enlace' } });
  x.styles.base = base; x.styles.mobile = mobile; x.animation = anim;
  return cssNodo(x, '.n1', { scroll: false });
};
const LIFT = { hover: { effect: 'lift' } };
const GLOW = { hover: { effect: 'glow', color: '#ff0000' } };
const caja = (c) => c.includes('box-shadow:0 14px 30px') && !c.includes('drop-shadow');
const plano = (c) => c.includes('drop-shadow') && !c.includes(';box-shadow:');
const texto = (c) => c.includes('text-shadow:') && !c.includes('drop-shadow') && !c.includes(';box-shadow:') && !c.includes(';filter:');

t('lift: transparente (sin estilos) -> drop-shadow, sin box-shadow', () => {
  const c = css({}, LIFT);
  assert.ok(texto(c), c); assert.ok(c.includes('translateY(-6px)'), c);
});
t('lift: fondo transparente explícito / borde 0 / sin imagen cuentan como transparente', () => {
  assert.ok(texto(css({ background: 'transparent', border: 'none' }, LIFT)));
  assert.ok(texto(css({ backgroundColor: 'rgba(0,0,0,0)', border: '0', fondoImagen: '' }, LIFT)));
});
t('lift: con fondo -> box-shadow de siempre, idéntico al anterior', () => {
  const c = css({ background: '#111' }, LIFT);
  assert.ok(caja(c), c);
  assert.ok(c.includes(':hover{transition:') && c.includes(';transform:translateY(-6px);box-shadow:0 14px 30px rgba(0,0,0,.28)}'), c);
  assert.ok(caja(css({ backgroundColor: '#fff' }, LIFT)));
});
t('lift: con borde visible -> box-shadow', () => {
  assert.ok(caja(css({ border: '1px solid #fff' }, LIFT)));
  assert.ok(caja(css({ borderBottom: '2px solid red' }, LIFT)));
});
t('lift: con fondoImagen o backgroundImage -> box-shadow', () => {
  assert.ok(caja(css({ fondoImagen: 'data:image/png;base64,AAAA' }, LIFT)));
  assert.ok(caja(css({ backgroundImage: 'linear-gradient(red,blue)' }, LIFT)));
});
t('lift: con box-shadow propio -> box-shadow', () => {
  assert.ok(caja(css({ boxShadow: '0 2px 4px #000' }, LIFT)));
});
t('glow: transparente -> drop-shadow con el color; con fondo -> box-shadow', () => {
  const p = css({}, GLOW);
  assert.ok(texto(p) && p.includes('text-shadow:0 0 10px #ff0000'), p);
  const c = css({ background: '#222' }, GLOW);
  assert.ok(c.includes('box-shadow:0 0 28px #ff0000') && !c.includes('drop-shadow'), c);
});
t('móvil: si solo móvil tiene fondo o borde, cuenta como con caja (y al revés)', () => {
  assert.ok(caja(css({}, LIFT, { background: '#000' })));
  assert.ok(caja(css({}, LIFT, { border: '1px solid red' })));
  assert.ok(texto(css({ color: '#fff' }, LIFT, { color: '#000' }))); // solo color de texto: sigue sin caja
});
t('otros efectos no cambian (grow/shrink/tilt/bright)', () => {
  assert.ok(css({}, { hover: { effect: 'grow' } }).includes('transform:scale(1.06)'));
  assert.ok(css({ background: '#000' }, { hover: { effect: 'bright' } }).includes('filter:brightness(1.2)'));
});
t('focus glow: transparente -> drop-shadow; con fondo -> box-shadow; ring sigue con outline', () => {
  const p = css({}, { focus: { effect: 'glow', color: '#00ff00' } });
  assert.ok(texto(p) && p.includes('text-shadow:0 0 3px #00ff00,0 0 10px #00ff00'), p);
  const c = css({ background: '#000' }, { focus: { effect: 'glow', color: '#00ff00' } });
  assert.ok(c.includes('box-shadow:0 0 0 4px #00ff0055,0 0 28px #00ff00') && !c.includes('drop-shadow'), c);
  const r = css({}, { focus: { effect: 'ring', color: '#00ff00' } });
  assert.ok(r.includes('outline:3px solid #00ff00') && !r.includes('drop-shadow'), r);
});
t('sin caja y sin texto (icon, image): drop-shadow, no text-shadow', () => {
  for (const tipo of ['icon', 'image']) {
    const l = css({}, LIFT, {}, tipo), g = css({}, GLOW, {}, tipo);
    assert.ok(plano(l) && !l.includes('text-shadow:0'), l);
    assert.ok(plano(g) && g.includes('drop-shadow(0 0 10px #ff0000)'), g);
  }
  const f = css({}, { focus: { effect: 'glow', color: '#00ff00' } }, {}, 'image');
  assert.ok(f.includes('drop-shadow') && !f.includes('text-shadow:0'), f);
});
t('heading y text sin caja: text-shadow; la transición incluye text-shadow', () => {
  for (const tipo of ['heading', 'text']) assert.ok(texto(css({}, LIFT, {}, tipo)));
  assert.ok(css({}, LIFT).includes('text-shadow 0.25s') || /text-shadow [^,;]+/.test(css({}, LIFT)), css({}, LIFT));
});
t('sinCaja: nodo sin estilos y nodo undefined son planos', () => {
  assert.equal(sinCaja(n('text', {})), true);
  assert.equal(sinCaja(undefined), true);
});
console.log(`\n${ok} tests OK`);
