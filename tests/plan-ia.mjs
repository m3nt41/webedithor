// Prueba de la lógica del camino 1 de la IA (plan, guía, extracción de JSON). Node, sin navegador.
// Ejecutar: node tests/plan-ia.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { BLOCKS, createBlock } from '../src/blocks/index.js';
import { huecosDe, construirPlan, leerEntrada, extraerJSON, enlaceValido, srcValido } from '../src/core/plan.js';
import { guiaIA, catalogoHuecos } from '../src/core/guiaia.js';
import { normalizePage, createPage, walk } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';

let ok = 0;
const t = (nombre, fn) => { fn(); ok++; console.log('OK  ', nombre); };
const heroClaro = (valores) => ({ plan: 1, titulo: 'X', secciones: [{ bloque: 'hero', variante: 'claro', valores }] });

t('la guía lista todos los bloques, variantes y huecos', () => {
  const g = guiaIA();
  for (const b of BLOCKS) {
    assert.ok(g.includes(`### ${b.id} `), `falta el bloque ${b.id}`);
    for (const k of Object.keys(b.variants)) {
      assert.ok(g.includes(`variante "${k}"`), `falta ${b.id}/${k}`);
      const total = huecosDe(createBlock(b.id, k)).length;
      const cat = catalogoHuecos().find((x) => x.bloque === b.id).variantes.find((x) => x.clave === k);
      assert.equal(cat.huecos.length, total, `${b.id}/${k}: huecos del catálogo`);
      assert.equal(cat.lineas.length, total);
    }
  }
  assert.ok(g.includes('"plan": 1') && g.includes('#contacto') && g.includes('H1') && /SOLO con un objeto JSON/.test(g));
  assert.ok(!g.includes('undefined'), 'la guía no debe contener "undefined"');
});

t('los ejemplos de la guía y docs/plan-ejemplo.json son planes válidos sin errores ni avisos', () => {
  const g = guiaIA();
  const ejemplos = g.split('## Ejemplos completos')[1].split('\n').filter((l) => l.startsWith('{'));
  assert.equal(ejemplos.length, 2);
  for (const e of ejemplos) { const r = construirPlan(JSON.parse(e)); assert.deepEqual(r.errores, []); assert.deepEqual(r.avisos, [], r.avisos.join(' | ')); assert.ok(r.nodos.length >= 2); }
  const r = construirPlan(JSON.parse(readFileSync('docs/plan-ejemplo.json', 'utf8')));
  assert.deepEqual(r.errores, []); assert.deepEqual(r.avisos, []); assert.equal(r.nodos.length, 8);
});

t('el script tools/gen-guia-ia.mjs genera docs/guia-ia.md igual que guiaIA()', () => {
  const r = spawnSync(process.execPath, ['tools/gen-guia-ia.mjs'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(existsSync('docs/guia-ia.md') && existsSync('docs/plan-ejemplo.json'));
  assert.equal(readFileSync('docs/guia-ia.md', 'utf8'), guiaIA());
});

t('un plan válido produce el árbol esperado (textos, botón con enlace, orden, título)', () => {
  const r = construirPlan({ plan: 1, titulo: 'Mi Café', secciones: [
    { bloque: 'hero', variante: 'claro', valores: { 1: 'Nuevo', 2: 'Café bueno', 4: { texto: 'Reservar', enlace: '#precios' } } },
    { bloque: 'footer' },
  ] });
  assert.deepEqual([r.errores, r.avisos], [[], []]);
  assert.equal(r.titulo, 'Mi Café');
  assert.equal(r.nodos.length, 2);
  const [h] = r.nodos;
  assert.equal(h.name, 'Hero'); assert.equal(h.content.anchor, 'inicio');
  const hu = huecosDe(h);
  assert.equal(hu[0].content.text, 'Nuevo'); assert.equal(hu[1].content.text, 'Café bueno'); assert.equal(hu[1].content.level, 1);
  assert.equal(hu[2].content.text.length > 10, true, 'hueco 3 no mencionado conserva su texto por defecto');
  assert.deepEqual([hu[3].content.text, hu[3].content.href], ['Reservar', '#precios']);
  assert.equal(hu[4].content.href, '#servicios', 'botón no mencionado conserva su enlace');
  assert.equal(r.nodos[1].name.toLowerCase().includes('foot') || r.nodos[1].type === 'section', true);
  // el resultado es una página válida que se exporta
  const p = createPage(); p.children = r.nodos;
  assert.doesNotThrow(() => normalizePage(JSON.parse(JSON.stringify(p))));
  assert.ok(exportHTML(p).includes('Café bueno'));
});

t('un valor de botón como texto va a content.text; imágenes con src/alt; iconos y estilos no se tocan', () => {
  const r = construirPlan(heroClaro({ 4: 'Quiero' }));
  assert.equal(huecosDe(r.nodos[0])[3].content.text, 'Quiero');
  const ref = createBlock('hero', 'dividido');
  const r2 = construirPlan({ plan: 1, secciones: [{ bloque: 'hero', variante: 'dividido', valores: { 4: { src: 'https://x.test/a.jpg', alt: 'Foto' } } }] });
  assert.deepEqual(r2.avisos, []);
  const img = huecosDe(r2.nodos[0])[3];
  assert.deepEqual([img.type, img.content.src, img.content.alt], ['image', 'https://x.test/a.jpg', 'Foto']);
  assert.deepEqual(r2.nodos[0].styles.base, ref.styles.base);
  const sinIds = (n) => { const c = structuredClone(n); walk(c, (x) => { x.id = '_'; if (x.type === 'image') x.content = {}; if (x.type === 'heading' || x.type === 'text' || x.type === 'button') x.content = {}; }); return c; };
  assert.deepEqual(sinIds(r2.nodos[0]), sinIds(ref), 'estilos, animación y estructura intactos');
});

t('huecos inexistentes dan aviso (no fallan) y el resto se aplica', () => {
  const r = construirPlan(heroClaro({ 2: 'Hola', 99: 'x', 0: 'y', abc: 'z' }));
  assert.deepEqual(r.errores, []);
  assert.equal(r.avisos.length, 3);
  assert.ok(r.avisos.every((a) => /Sección 1/.test(a) && /no existe/.test(a)));
  assert.equal(huecosDe(r.nodos[0])[1].content.text, 'Hola');
});

t('valores raros dan aviso: tipo equivocado, enlace javascript:, src inválido, objeto en título', () => {
  const r = construirPlan(heroClaro({ 4: { texto: 'Ok', enlace: 'javascript:alert(1)' }, 2: { enlace: '#a' }, 1: 5 }));
  assert.deepEqual(r.errores, []);
  const hu = huecosDe(r.nodos[0]);
  assert.equal(hu[3].content.text, 'Ok'); assert.equal(hu[3].content.href, '#contacto', 'el enlace peligroso se descarta');
  assert.ok(r.avisos.some((a) => /hueco 4/.test(a) && /no es válido/.test(a)));
  assert.ok(r.avisos.some((a) => /hueco 2/.test(a) && /solo vale en botones/.test(a)));
  assert.ok(r.avisos.some((a) => /hueco 1/.test(a) && /texto o un objeto/.test(a)));
  assert.equal(enlaceValido('#x') && enlaceValido('https://a.com/x') && enlaceValido('mailto:a@b.c') && enlaceValido('tel:+506'), true);
  assert.equal(enlaceValido('javascript:x') || enlaceValido('data:text/html,x') || enlaceValido(''), false);
  assert.equal(srcValido('https://a.com/i.png') && srcValido('data:image/png;base64,AA'), true);
  assert.equal(srcValido('javascript:x') || srcValido('data:text/html,x'), false);
});

t('bloque o variante inválidos dan error claro y no se construye nada', () => {
  let r = construirPlan({ plan: 1, secciones: [{ bloque: 'hero' }, { bloque: 'inventado' }, { bloque: 'footer', variante: 'zzz' }] });
  assert.equal(r.nodos.length, 0);
  assert.equal(r.errores.length, 2);
  assert.match(r.errores[0], /Sección 2: el bloque "inventado" no existe\. Bloques válidos: navbar,/);
  assert.match(r.errores[1], /Sección 3 \(footer\): la variante "zzz" no existe\. Variantes válidas: /);
  assert.match(construirPlan({ plan: 1, secciones: [] }).errores[0], /secciones/);
  assert.match(construirPlan({ plan: 2 }).errores[0], /"plan": 1/);
  assert.match(construirPlan({ plan: 1, secciones: [{ bloque: 'hero', valores: [1] }] }).errores[0], /"valores" debe ser un objeto/);
});

t('extraerJSON tolera ``` y texto antes/después, y llaves dentro de strings', () => {
  const plan = { plan: 1, titulo: 'A } { B', secciones: [{ bloque: 'hero', variante: 'oscuro' }] };
  const j = JSON.stringify(plan);
  for (const txt of [j, '```json\n' + j + '\n```', 'Claro, aquí está:\n```\n' + j + '\n```\n¿Algo más?', 'Hola {no json} luego ' + j + ' fin', '  \n' + JSON.stringify(plan, null, 2)]) {
    assert.deepEqual(extraerJSON(txt), plan, txt.slice(0, 30));
  }
  assert.equal(extraerJSON('sin json'), null);
  assert.equal(extraerJSON('{ roto'), null);
  assert.equal(extraerJSON(null), null);
  const e = leerEntrada('```json\n' + j + '\n```');
  assert.equal(e.tipo, 'plan'); assert.equal(e.titulo, 'A } { B'); assert.equal(e.secciones.length, 1);
});

t('el formato de página completa (el mismo de Abrir JSON) sigue funcionando', () => {
  const p = createPage(); p.content.title = 'Completa'; p.children = [createBlock('hero', 'oscuro'), createBlock('footer')];
  const e = leerEntrada('Aquí va:\n```json\n' + JSON.stringify(p) + '\n```');
  assert.equal(e.tipo, 'pagina'); assert.deepEqual(e.errores, []);
  assert.equal(e.secciones.length, 2); assert.equal(e.titulo, 'Completa'); assert.equal(e.pagina.type, 'page');
  const mala = leerEntrada(JSON.stringify({ type: 'page', id: 'x', children: [{ type: 'heading' }] }));
  assert.equal(mala.tipo, 'pagina'); assert.match(mala.errores[0], /Anidado inválido/);
  const nada = leerEntrada('{"hola": 1}'); assert.match(nada.errores[0], /ni una página/);
  assert.match(leerEntrada('nada de json').errores[0], /ningún JSON/);
});

console.log(`\n${ok} pruebas OK`);
