// Ronda de bugs de la Etapa 7: validación de datos de scroll/escena en normalizePage y combinaciones. Ejecutar: node tests/ronda7.mjs
import assert from 'node:assert/strict';
import { normalizarAnimacion } from '../src/animations/normalizar.js';
import { createNode as n, normalizePage } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { cssPagina } from '../src/animations/index.js';
import { createBlock } from '../src/blocks/index.js';
import { readFileSync } from 'node:fs';
let ok = 0; const t = (nombre, f) => { f(); ok++; console.log('✔', nombre); };

t('parallax/scrolllink/scene/scenestep: basura se limpia y nada se cuela como CSS', () => {
  const a = normalizarAnimacion({
    parallax: { effect: 'y', amount: '40px;}body{x:y' }, scrolllink: { effect: 'evil', amount: 5 },
    scene: { steps: '9', length: 'x' }, scenestep: { effect: 'in', step: 'a;}', move: 'up', distance: -4 },
  }, 'heading');
  assert.deepEqual(a.parallax, { effect: 'y' });
  assert.equal(a.scrolllink, undefined);   // efecto desconocido: el grupo cae entero
  assert.equal(a.scene, undefined);        // scene no va en títulos
  assert.equal(a.scenestep.effect, 'in'); assert.equal(a.scenestep.step, undefined); assert.equal(a.scenestep.distance, 0);
  const s = normalizarAnimacion({ scene: { steps: 9 } }, 'section'); assert.equal(s, null);
  const s2 = normalizarAnimacion({ scene: { steps: 3, length: 0, top: '' } }, 'section'); assert.deepEqual(s2.scene, { steps: '3', length: 1, transition: 50 }); // sin el campo "Transición" se rellena con 50 (como antes), no con 40
  assert.equal(normalizarAnimacion({ scenestep: { effect: 'in' } }, 'section'), null); // paso de escena no va en secciones
  assert.equal(normalizarAnimacion({ parallax: { effect: 'y', amount: 1e999 } }, 'text').parallax.amount, undefined);
});

t('escena: Transición (% del tramo) se limita a 20–80, basura cae al valor de antes (50)', () => {
  const T = (v) => normalizarAnimacion({ scene: { steps: '3', transition: v } }, 'section').scene.transition;
  assert.equal(T(40), 40); assert.equal(T(5), 20); assert.equal(T(200), 80); assert.equal(T('x'), 50); assert.equal(T(''), 50); assert.equal(T(undefined), 50);
});

t('escena sin el campo Transición: el export es IDÉNTICO al de antes (tests/golden, hecho con el código anterior)', () => {
  const dir = new URL('./golden/', import.meta.url);
  const p = normalizePage(JSON.parse(readFileSync(new URL('escena-sin-transicion.json', dir), 'utf8'))); // pasa por el normalizador, como al abrir un .json
  assert.equal(p.children[1].animation.scene.transition, 50);
  const igual = (t) => t.replace(/\r\n/g, '\n'); // el script embebido hereda los saltos de línea de scrollmotor.js y git en Windows los puede cambiar
  assert.equal(igual(exportHTML(p)), igual(readFileSync(new URL('escena-sin-transicion.html', dir), 'utf8')));
});

t('escena: con Transición 40 el export lleva * 2.5 (y con 50 sigue * 2); preview y export usan el mismo valor', () => {
  const mk = (tr) => { const p = n('page', {}); const e = createBlock('scene', 'textos'); e.animation.scene.transition = tr; p.children.push(e); return p; };
  const h40 = exportHTML(mk(40)), h50 = exportHTML(mk(50));
  assert.ok(h40.includes('* 2.5),1)') && !h40.includes('* 2),1)'));
  assert.ok(h50.includes('* 2),1)') && !h50.includes('* 2.5)'));
  const css = cssPagina(mk(40), { scroll: true });
  assert.ok(css.includes('* 2.5),1)') && !css.includes('* 2),1)'));
  assert.ok(createBlock('scene', 'textos').animation.scene.length === 4 && createBlock('scene', 'imagenes').animation.scene.transition === 40);
});

t('export: parallax + estado hover no deja que la transición suavice el scroll', () => {
  const p = n('page', {}); const s = n('section', {}); const h = n('heading', { content: { text: 'X', level: 2 } });
  h.animation = { parallax: { effect: 'y', amount: 50 }, variants: [{ id: 'a', name: 'h', trigger: 'hover', props: { scale: 1.1 } }] };
  s.children.push(h); p.children.push(s);
  const html = exportHTML(p);
  const base = html.match(/\.n2\{transition-property:([^;]*);/)[1];
  assert.ok(!base.split(',').includes('translate'), base);
  assert.ok(base.includes('scale'), base); // lo demás sigue transicionando
});

t('export: escena + reduced-motion y sin JS: la regla de escena vale solo con .sc', () => {
  const p = n('page', {}); const s = n('section', {}); s.animation = { scene: { steps: '2', length: 2 } };
  const h = n('heading', { content: { text: 'A', level: 2 } }); h.animation = { scenestep: { effect: 'out', step: 2, move: 'up', distance: 30 } };
  s.children.push(h); p.children.push(s);
  const html = exportHTML(p);
  for (const l of html.split('\n').filter((x) => /data-es\]/.test(x))) assert.ok(l.startsWith('.sc ') || l.startsWith('[data-ew]'), l);
  assert.ok(html.includes("matchMedia('(prefers-reduced-motion:reduce)')"));
});
t('scroll suave: solo smoothScroll === true cuenta; sin él el export no lleva script', () => {
  const mk = (v) => { const p = n('page'); p.content.smoothScroll = v; return normalizePage(JSON.parse(JSON.stringify(p))); };
  assert.equal(mk(true).content.smoothScroll, true);
  for (const v of ['true', 1, 'si', null, {}, []]) assert.equal('smoothScroll' in mk(v).content, false, String(v));
  assert.ok(!exportHTML(mk('true')).includes('scrollSuave'));
  assert.ok(!exportHTML(mk('true')).includes('Lenis'), 'apagado: Lenis no viaja en el export');
  const on = exportHTML(mk(true));
  assert.ok(on.includes('scrollSuave(') && on.includes('globalThis.Lenis'), 'encendido: Lenis va inline en el mismo .html');
  assert.ok(!/<script[^>]+src=/.test(on), 'un solo archivo: sin scripts externos');
});
t('posición: static explícito en móvil sale dentro del @media y el margen de anclas respeta cada vista', () => {
  const mk = (base, mobile) => { const p = n('page', {}); const s = n('section', { styles: base, mobile }); p.children.push(s); return exportHTML(p); };
  const pegado = { position: 'sticky', top: '0' };
  const a = mk(pegado, { position: 'static' });
  const movil = a.slice(a.indexOf('@media (max-width:768px)'));
  assert.ok(/position:static/.test(movil), 'static va dentro del @media');
  assert.ok(!a.includes('display:block}[id]{scroll-margin-top:90px}'), 'sin margen global');
  assert.ok(a.includes('@media (min-width:769px){[id]{scroll-margin-top:90px}}'), 'margen solo en escritorio');
  const b = mk(pegado, {}); // sticky en ambos: margen global, sin @media extra
  assert.ok(b.includes('img{max-width:100%;display:block}[id]{scroll-margin-top:90px}'));
  const c = mk({}, { position: 'sticky', top: '0' }); // solo móvil
  assert.ok(/@media \(max-width:768px\)[\s\S]*\[id\]\{scroll-margin-top:90px\}/.test(c));
});
t('proporción: valores inválidos se descartan al abrir un .json y nada se cuela en el export', () => {
  const pg = n('page', {}); const s = n('section', {});
  const g = n('container', { styles: { display: 'grid', hijosAspectRatio: '1 / 1;}body{x:y' }, mobile: { hijosAspectRatio: '4 / 5' } });
  const im = n('image', { content: { src: 'x', alt: '' }, styles: { aspectRatio: 'url(x)' }, mobile: { aspectRatio: 'auto' } });
  g.children.push(im); s.children.push(g); pg.children.push(s);
  const q = normalizePage(JSON.parse(JSON.stringify(pg))).children[0].children[0];
  assert.equal(q.styles.base.hijosAspectRatio, undefined); assert.equal(q.styles.mobile.hijosAspectRatio, '4 / 5');
  assert.equal(q.children[0].styles.base.aspectRatio, undefined); assert.equal(q.children[0].styles.mobile.aspectRatio, 'auto');
  const g2 = n('container', { styles: { display: 'grid', hijosAspectRatio: '4 / 3', gap: '8px' } });
  g2.children.push(n('image', { content: { src: 'x', alt: '' } })); const p2 = n('page', {}); const s2 = n('section', {}); s2.children.push(g2); p2.children.push(s2);
  const h = exportHTML(p2);
  assert.ok(h.includes(':where(.n2>img){aspect-ratio:4 / 3;object-fit:cover}'), 'regla para los hijos');
  assert.ok(!h.includes('hijos-aspect-ratio'), 'la clave interna no sale como CSS');
  assert.ok(h.includes('.n2{display:grid;gap:8px}'), h.slice(h.indexOf('.n2')));
  // invalido directo (sin pasar por el normalizador, p. ej. tecleado en el panel): no se emite
  g2.styles.base.hijosAspectRatio = '4 /'; assert.ok(!exportHTML(p2).includes(':where('));
  // sin display:grid no se aplica
  g2.styles.base.hijosAspectRatio = '4 / 3'; g2.styles.base.display = 'flex'; assert.ok(!exportHTML(p2).includes(':where('));
});
t('galería: las 4 variantes nacen con Proporción de los hijos', () => {
  for (const v of ['cuadricula', 'destacada', 'fila', 'oscura']) {
    const grid = createBlock('gallery', v).children[1];
    assert.ok(/^\d \/ \d$/.test(grid.styles.base.hijosAspectRatio), v);
  }
});
// ---- Imagen de fondo: validación al abrir un .json y hero "fondo" ----
t('fondo: valores inválidos se descartan al abrir un .json y las claves propias no salen como CSS', () => {
  const p = n('page', {}); const s = n('section', { styles: { fondoImagen: 'https://x/a.jpg', fondoAjuste: 'zoom', fondoPosicion: 'diagonal', fondoCapa: 99, background: '#111' }, mobile: { fondoCapa: '30' } });
  p.children.push(s);
  const q = normalizePage(JSON.parse(JSON.stringify(p))).children[0];
  assert.equal(q.styles.base.fondoAjuste, undefined); assert.equal(q.styles.base.fondoPosicion, undefined); assert.equal(q.styles.base.fondoCapa, undefined);
  assert.equal(q.styles.base.fondoImagen, 'https://x/a.jpg'); assert.equal(q.styles.mobile.fondoCapa, 30);
  const html = exportHTML(normalizePage(JSON.parse(JSON.stringify(p))));
  assert.ok(html.includes('background:#111;background-image:url("https://x/a.jpg");background-size:cover;background-position:center;background-repeat:no-repeat'));
  assert.ok(!/fondo/i.test(html), 'ninguna clave fondo* sale al CSS');
});
t('hero con fondo: nace con imagen, capa 45 y 90vh', () => {
  const h = createBlock('hero', 'fondo');
  assert.equal(h.styles.base.fondoCapa, 45); assert.equal(h.styles.base.minHeight, '90vh'); assert.ok(h.styles.base.fondoImagen.startsWith('data:image/svg'));
  const p = n('page', {}); p.children.push(h);
  assert.ok(exportHTML(p).includes('rgba(0,0,0,0.45)'));
});
console.log(`${ok} pruebas ok`);
