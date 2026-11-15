// Prueba: Marquesina (ticker). Node, sin navegador: validación (normalizePage), export (estructura, bucle, copias aria-hidden,
// dirección, pausa, reduced-motion, estática), bloque/elemento y exclusión de la guía IA.
// Ejecutar: node tests/marquesina.mjs   (la parte visual en Firefox real está en tests/marquesina-ui.mjs)
import assert from 'node:assert/strict';
import { createNode as n, createPage, normalizePage, walk } from '../src/core/tree.js';
import { BLOCKS, createBlock } from '../src/blocks/index.js';
import { ELEMENTS, createElement } from '../src/blocks/elements.js';
import { normalizarMarquesina, usaMarquesina, MQ_DEFECTO } from '../src/core/marquesina.js';
import { exportHTML } from '../src/export/exporter.js';
import { guiaIA } from '../src/core/guiaia.js';
import { construirPlan } from '../src/core/plan.js';

let ok = 0;
const t = (nombre, fn) => { fn(); ok++; console.log('OK  ', nombre); };
const pagina = (...hijos) => { const p = createPage(); p.children.push(...hijos); return p; };
const mq = (cfg, items = 3) => n('container', { name: 'Marq', content: { marquesina: cfg }, children: Array.from({ length: items }, (_, i) => n('text', { name: `t${i}`, content: { text: `Item ${i}` } })) });
const sec = (...h) => n('section', { name: 'S', children: h });
const exp = (cfg, items) => exportHTML(pagina(sec(mq(cfg, items))));

t('normalizarMarquesina: completa defaults y descarta lo raro', () => {
  assert.deepEqual(normalizarMarquesina({}), MQ_DEFECTO);
  assert.deepEqual(normalizarMarquesina({ mov: false, vel: 12, dir: 'der', pausa: false, gap: 32, copias: 6 }), { mov: false, vel: 12, dir: 'der', pausa: false, gap: 32, copias: 6 });
  const raro = normalizarMarquesina({ mov: 'si', vel: 'x', dir: 'arriba', pausa: 0, gap: -5, copias: 99 });
  assert.deepEqual(raro, { ...MQ_DEFECTO, pausa: true }, 'valores inválidos → defaults');
  assert.equal(normalizarMarquesina({ vel: 1 }).vel, 25); assert.equal(normalizarMarquesina({ vel: 500 }).vel, 25);
  assert.equal(normalizarMarquesina({ vel: '40' }).vel, 40, 'un número escrito como texto se acepta');
  assert.equal(normalizarMarquesina({ copias: 3.4 }).copias, 3);
  for (const v of [null, undefined, 5, 'x', [], true]) assert.equal(normalizarMarquesina(v), undefined);
});

t('normalizePage: valida los campos, y solo vale en contenedores; landings viejas intactas', () => {
  const p = pagina(sec(mq({ vel: 'x', dir: 'zzz', copias: 50 })));
  const r = normalizePage(JSON.parse(JSON.stringify(p)));
  assert.deepEqual(r.children[0].children[0].content.marquesina, { ...MQ_DEFECTO });
  const s = sec(); s.content.marquesina = { mov: true };
  const raro = n('container', { content: { marquesina: 'quiero' } }); const txt = n('text', { content: { text: 'a', marquesina: {} } });
  const r2 = normalizePage(JSON.parse(JSON.stringify(pagina(s, sec(raro, txt)))));
  assert.equal('marquesina' in r2.children[0].content, false, 'en una sección se descarta');
  assert.equal('marquesina' in r2.children[1].children[0].content, false, 'un valor que no es objeto se descarta');
  assert.equal('marquesina' in r2.children[1].children[1].content, false, 'en un texto se descarta');
  const vieja = normalizePage(JSON.parse(JSON.stringify(pagina(sec(n('container', { children: [n('text', { content: { text: 'hola' } })] }))))));
  assert.equal(usaMarquesina(vieja.children[0].children[0]), null);
  assert.equal(exportHTML(vieja).includes('mq-'), false, 'sin marquesina el export no lleva nada de ella');
});

t('export animado: marco, pista, K grupos (1 visible + K-1 aria-hidden/inert), sin JS', () => {
  const html = exp({ copias: 4 });
  assert.equal((html.match(/class="mq-p"/g) || []).length, 1);
  assert.equal((html.match(/class="mq-g">/g) || []).length, 1, 'una copia visible');
  assert.equal((html.match(/class="mq-g" aria-hidden="true" inert/g) || []).length, 3, 'K-1 copias ocultas');
  assert.equal((html.match(/Item 0/g) || []).length, 4, 'cada item aparece K veces');
  assert.ok(!html.includes('<script'), 'CSS puro: sin <script>');
  assert.match(html, /\.n\d+>\.mq-p\{display:flex;width:max-content;filter:opacity\(1\);animation:mq4 25s linear infinite\}/);
  assert.match(html, /@keyframes mq4\{from\{translate:0 0\}to\{translate:calc\(-100% \/ 4\) 0\}\}/, 'el bucle cierra en -100%/K exacto');
  assert.match(html, /\.mq-g\{display:flex;flex:none;align-items:center;gap:48px;padding-inline-end:48px\}/, 'padding final = separación (grupos idénticos)');
  assert.match(html, /overflow:hidden/);
});

t('las copias no repiten ids (anclas) y el original los conserva', () => {
  const m = mq({ copias: 3 }, 2); m.children[0].content.anchor = 'clientes';
  const html = exportHTML(pagina(sec(m)));
  assert.equal((html.match(/id="clientes"/g) || []).length, 1);
  assert.equal((html.match(/Item 0/g) || []).length, 3);
});

t('velocidad, copias y dirección', () => {
  const izq = exp({ vel: 40, copias: 3 }), der = exp({ vel: 12, dir: 'der', copias: 5 });
  assert.match(izq, /animation:mq3 40s linear infinite\}/); assert.ok(izq.includes('@keyframes mq3{') && !izq.includes('@keyframes mq4'));
  assert.match(der, /animation:mq5 12s linear infinite reverse\}/); assert.ok(der.includes('@keyframes mq5{'));
  assert.equal((der.match(/aria-hidden="true" inert/g) || []).length, 4);
  const dos = exportHTML(pagina(sec(mq({ copias: 3 }), mq({ copias: 3 }), mq({ copias: 5 }))));
  assert.equal((dos.match(/@keyframes mq3\{/g) || []).length, 1, 'un @keyframes por número de copias, sin repetir');
  assert.equal((dos.match(/@keyframes mq5\{/g) || []).length, 1);
});

t('pausa al pasar el ratón: por defecto sí; apagada no emite la regla', () => {
  assert.match(exp({}), /\.n\d+:hover>\.mq-p\{animation-play-state:paused\}/);
  assert.ok(!exp({ pausa: false }).includes('animation-play-state'));
});

t('prefers-reduced-motion: quieta, centrada y sin copias', () => {
  const html = exp({});
  const bloque = html.split('@media (prefers-reduced-motion:reduce){').filter((x) => x.includes('.mq-p{animation:none'))[0];
  assert.ok(bloque, 'hay un bloque reduced-motion de la marquesina');
  assert.match(bloque, /\.mq-p\{animation:none;filter:none;width:auto;justify-content:center\}/);
  assert.match(bloque, /\.mq-g\[aria-hidden\]\{display:none\}/);
  assert.match(bloque, /flex-wrap:wrap/);
});

t('sin movimiento: una sola tira fija, sin pista, sin copias, sin animación ni keyframes', () => {
  const html = exp({ mov: false, gap: 32 });
  assert.equal((html.match(/class="mq-g">/g) || []).length, 1);
  assert.ok(!html.includes('mq-p') && !html.includes('aria-hidden') && !html.includes('@keyframes mq') && !html.includes('animation:mq'));
  assert.match(html, /\.mq-g\{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:32px\}/);
  assert.equal((html.match(/Item 0/g) || []).length, 1);
});

t('móvil: la animación no depende del ancho (sin @media propio) y la velocidad no cambia', () => {
  const html = exp({});
  assert.ok(!/@media \(max-width:768px\)\{[^}]*mq-/.test(html));
});

t('bloque: 6 variantes (3 estilos × clara/oscura), todas con marquesina válida y excluidas de la IA', () => {
  const b = BLOCKS.find((x) => x.id === 'marquesina');
  assert.deepEqual(Object.keys(b.variants), ['contornoClaro', 'contornoOscuro', 'cintaClaro', 'cintaOscuro', 'logosClaro', 'logosOscuro']);
  assert.equal(b.excluidoIA, true);
  for (const k of Object.keys(b.variants)) {
    const nodo = createBlock('marquesina', k); let cuenta = 0;
    walk(nodo, (x) => { if (usaMarquesina(x)) { cuenta++; assert.ok(x.children.length >= 5, `${k}: items suficientes`); } });
    assert.equal(cuenta, 1, k);
    const p = pagina(nodo); normalizePage(JSON.parse(JSON.stringify(p)));
    const html = exportHTML(p);
    assert.ok(html.includes('class="mq-p"') && html.includes('@keyframes mq4'), k);
  }
  // estilos: contorno = letras huecas con serif; cinta = bordes de 1px + separadores; logos = iconos del mismo tamaño en gris
  const contorno = createBlock('marquesina', 'contornoClaro').children[0].children[0];
  assert.equal(contorno.styles.base.WebkitTextFillColor, 'transparent'); assert.ok(contorno.styles.base.WebkitTextStroke.startsWith('1px '));
  assert.match(exp({}), /./);
  assert.match(exportHTML(pagina(createBlock('marquesina', 'contornoClaro'))), /-webkit-text-stroke:1px #111111/);
  const cinta = createBlock('marquesina', 'cintaOscuro').children[0];
  assert.match(cinta.styles.base.borderTop, /^1px solid/); assert.match(cinta.styles.base.borderBottom, /^1px solid/);
  assert.ok(cinta.children.some((x) => x.type === 'icon') && cinta.children.some((x) => x.type === 'text'));
  const logos = createBlock('marquesina', 'logosClaro').children[0].children;
  assert.ok(logos.every((x) => x.type === 'icon' && x.styles.base.width === '40px' && x.styles.base.height === '40px'));
  assert.equal(new Set(logos.map((x) => x.styles.base.color)).size, 1);
});

t('elemento "Marquesina" en Elem.: contenedor con content.marquesina', () => {
  assert.ok(ELEMENTS.some((e) => e.id === 'marquesina'));
  const e = createElement('marquesina');
  assert.equal(e.type, 'container'); assert.deepEqual(e.content.marquesina, { ...MQ_DEFECTO, vel: 30, gap: 40 }); assert.deepEqual(normalizarMarquesina(e.content.marquesina), e.content.marquesina);
});

t('la guía y el plan de la IA NO ofrecen la marquesina', () => {
  assert.ok(!/marquesina/i.test(guiaIA()), 'la guía no la menciona');
  const r = construirPlan({ plan: 1, titulo: 'x', secciones: [{ bloque: 'marquesina' }] });
  assert.ok(r.errores.length === 1 && /no existe/.test(r.errores[0]) && !/marquesina,/.test(r.errores[0].split('válidos:')[1] ?? ''), r.errores.join('|'));
});

console.log(`${ok} pruebas ok`);
