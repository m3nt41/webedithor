// Prueba: todas las variantes de todos los bloques y los elementos sueltos usan SOLO valores del tema
// (src/blocks/tema.js): colores del tema, fuentes del tema, esquinas rectas, sin sombras ni degradados ni
// emoticonos. Ejecutar: node tests/tema.mjs  (Node, sin navegador)
import assert from 'node:assert/strict';
import { BLOCKS, createBlock } from '../src/blocks/index.js';
import { ELEMENTS } from '../src/blocks/elements.js';
import { COLORES_TEMA, FUENTE, MODOS, TAM, C } from '../src/blocks/tema.js';
import { TAMANOS_BOTON } from '../src/ui/controles.js';
import { walk, createPage, normalizePage } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';

let ok = 0;
const t = (nombre, fn) => { fn(); ok++; console.log('OK  ', nombre); };
const emoji = (s) => String(s).replace(/[©®™]/g, '').match(/\p{Extended_Pictographic}/gu) || [];
// Sin lista blanca: ningún bloque necesita colores fuera del tema.
const FUENTES_OK = new Set([FUENTE.titulo, FUENTE.cuerpo]);

/** Todas las cadenas de estilo de un nodo (base y móvil), más los data: URI de imágenes ya decodificados. */
function valores(nodo) {
  const out = [];
  for (const est of [nodo.styles.base, nodo.styles.mobile]) for (const [k, v] of Object.entries(est)) out.push([k, String(v)]);
  if (nodo.content?.src) out.push(['src', decodeURIComponent(String(nodo.content.src))]);
  return out;
}
const todos = [];
for (const b of BLOCKS) for (const v of Object.keys(b.variants)) todos.push([`${b.id}/${v}`, createBlock(b.id, v)]);
for (const e of ELEMENTS) todos.push([`elemento ${e.id}`, e.crear()]);

t('cada bloque tiene al menos una variante clara y una oscura ', () => {
  const esOscuro = (bg) => [C.oscuro, C.oscuro2].includes(bg);
  for (const b of BLOCKS) {
    const bgs = Object.keys(b.variants).map((v) => createBlock(b.id, v).styles.base.background);
    assert.ok(bgs.some((x) => [C.papel, C.papel2].includes(x)), `${b.id}: sin variante clara`);
    assert.ok(bgs.some(esOscuro), `${b.id}: sin variante oscura`);
  }
});

t('solo colores del tema (sin hex sueltos, rgb(), hsl() ni degradados)', () => {
  for (const [id, nodo] of todos) walk(nodo, (x) => {
    for (const [k, v] of valores(x)) {
      for (const hex of v.match(/#[0-9a-fA-F]{3,8}\b/g) || []) assert.ok(COLORES_TEMA.has(hex.toLowerCase()), `${id} (${x.name}): color fuera del tema ${hex} en ${k}`);
      assert.ok(!/rgba?\(|hsla?\(|gradient/i.test(v), `${id} (${x.name}): rgb/hsl/degradado en ${k}`);
      assert.ok(!/(^| )(white|black|red|blue|green|purple|violet|pink)( |$)/i.test(v) || k === 'src', `${id}: color con nombre en ${k}`);
    }
  });
});

t('fuentes solo del tema, sin sombras y esquinas rectas', () => {
  for (const [id, nodo] of todos) walk(nodo, (x) => {
    for (const est of [x.styles.base, x.styles.mobile]) {
      if (est.fontFamily) assert.ok(FUENTES_OK.has(est.fontFamily), `${id} (${x.name}): fuente fuera del tema`);
      assert.ok(!est.boxShadow && !est.textShadow && !est.filter, `${id} (${x.name}): sombra o filtro`);
      if (est.borderRadius !== undefined) assert.ok(['0', '0px'].includes(String(est.borderRadius)), `${id} (${x.name}): borderRadius ${est.borderRadius}`);
      if (x.type === 'heading' || /Título|Precio|Cita/.test(x.name)) if (est.fontWeight) assert.ok(Number(est.fontWeight) <= 600 || x.type !== 'heading', `${id}: título demasiado grueso`);
    }
    if (x.type === 'heading') assert.ok(!['700', '800', '900'].includes(x.styles.base.fontWeight), `${id}: peso de título ${x.styles.base.fontWeight}`);
  });
});

t('botones: rectos y con un tamaño que el inspector reconoce (Mediano o Grande)', () => {
  const presets = TAMANOS_BOTON.map((p) => `${p.padding}|${p.fontSize}`);
  assert.deepEqual([TAM.m, TAM.l].map((p) => `${p.padding}|${p.fontSize}`), [presets[1], presets[2]], 'TAM del tema = presets del inspector');
  let botones = 0;
  for (const [id, nodo] of todos) walk(nodo, (x) => {
    if (x.type !== 'button') return;
    const est = x.styles.base;
    if (x.name === 'Enlace') return; // enlaces de texto del navbar/footer: no son botones con relleno
    botones++;
    assert.ok(presets.includes(`${est.padding}|${est.fontSize}`), `${id} (${x.name}): tamaño fuera de los presets (${est.padding} / ${est.fontSize})`);
  });
  assert.ok(botones >= 20, `${botones} botones revisados`);
});

t('sin emoticonos en ninguna variante ni en su export; el árbol sigue siendo válido', () => {
  for (const b of BLOCKS) for (const v of Object.keys(b.variants)) {
    const nodo = createBlock(b.id, v);
    assert.deepEqual(emoji(JSON.stringify(nodo)), [], `${b.id}/${v}`);
    const p = createPage(); p.children.push(nodo);
    assert.deepEqual(emoji(exportHTML(p)), [], `export ${b.id}/${v}`);
    normalizePage(JSON.parse(JSON.stringify(p)));
  }
});

t('modos: contraste de texto sobre fondo suficiente (>= 4.5:1 para fg y sec)', () => {
  const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
  const cr = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const [nombre, m] of Object.entries(MODOS)) {
    assert.ok(cr(m.fg, m.bg) >= 4.5, `${nombre}: fg`); assert.ok(cr(m.sec, m.bg) >= 4.5, `${nombre}: sec`);
    assert.ok(cr(m.btnFg, m.btnBg) >= 4.5, `${nombre}: botón`); assert.ok(cr(m.etiqueta, m.bg) >= 4.5, `${nombre}: etiqueta`);
  }
});

console.log(`${ok} pruebas ok`);
