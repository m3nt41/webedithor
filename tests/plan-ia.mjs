// Prueba de la lógica del camino 1 de la IA (plan, guía, extracción de JSON). Node, sin navegador.
// Ejecutar: node tests/plan-ia.mjs
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { BLOCKS, createBlock } from '../src/blocks/index.js';
import { huecosDe, construirPlan, leerEntrada, extraerJSON, enlaceValido, srcValido, fondoValido, avisosEnlaces } from '../src/core/plan.js';
import { guiaIA, catalogoHuecos, limite } from '../src/core/guiaia.js';
import { ejemplosPlan } from '../src/core/guiaia-ejemplos.js';
import { normalizePage, createPage, walk } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';

let ok = 0;
const t = (nombre, fn) => { fn(); ok++; console.log('OK  ', nombre); };
const heroClaro = (valores) => ({ plan: 1, titulo: 'X', secciones: [{ bloque: 'hero', variante: 'claro', valores }] });

t('la guía lista todos los bloques, variantes y huecos', () => {
  const g = guiaIA();
  for (const b of BLOCKS.filter((x) => !x.excluidoIA)) {
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
  assert.deepEqual(ejemplos.map((e) => JSON.parse(e)), ejemplosPlan(), 'la guía incluye los ejemplos de guiaia-ejemplos.js');
  const doc = JSON.parse(readFileSync('docs/plan-ejemplo.json', 'utf8'));
  assert.deepEqual(doc, ejemplosPlan()[0]);
  const r = construirPlan(doc);
  assert.deepEqual(r.errores, []); assert.deepEqual(r.avisos, []); assert.equal(r.nodos.length, 8);
});

t('ejemplos: se aplican con el importador, rellenan TODOS los textos (solo las imágenes se omiten) y sus enlaces #ancla existen', () => {
  for (const plan of ejemplosPlan()) {
    const entrada = leerEntrada(JSON.stringify(plan));
    assert.deepEqual(entrada.errores, [], plan.titulo);
    assert.deepEqual(entrada.avisos, [], `${plan.titulo}: ${entrada.avisos.join(' | ')}`); // incluye enlaces rotos
    plan.secciones.forEach((s, i) => {
      const ref = huecosDe(createBlock(s.bloque, s.variante));
      const nodos = huecosDe(entrada.secciones[i]);
      ref.forEach((h, k) => {
        const clave = String(k + 1);
        if (h.type === 'image') return; // las imágenes pueden omitirse
        const ctx = `${plan.titulo} · ${s.bloque}/${s.variante} · hueco ${clave} (${h.name})`;
        assert.ok(clave in s.valores, `${ctx}: sin rellenar`);
        const nuevo = nodos[k].content.text;
        assert.ok(typeof nuevo === 'string' && nuevo.trim(), `${ctx}: vacío`);
        if (h.type !== 'button' && String(h.content.text).length > 3) assert.notEqual(nuevo, h.content.text, `${ctx}: conserva el texto de ejemplo`);
        assert.ok(nuevo.length <= limite(h), `${ctx}: «${nuevo}» pasa del límite ${limite(h)}`);
      });
    });
    assert.ok(!JSON.stringify(plan).includes('Mi Marca') && !JSON.stringify(plan).includes('tumarca'), 'sin textos de marca de ejemplo');
    // todos los enlaces del navbar y del footer son #anclas de secciones que SÍ existen en el plan
    const anclas = new Set(entrada.secciones.map((x) => x.content.anchor).filter(Boolean));
    let enlaces = 0;
    for (const sec of entrada.secciones.filter((x) => ['Navbar', 'Footer'].includes(x.name))) {
      walk(sec, (x) => { if (x.type === 'button') { enlaces++; assert.ok(x.content.href.startsWith('#') && anclas.has(x.content.href.slice(1)), `${plan.titulo}: «${x.content.text}» → ${x.content.href} no existe`); } });
    }
    assert.ok(enlaces >= 7, 'el navbar y el footer del ejemplo tienen enlaces');
  }
});

t('cada variante de la guía tiene etiqueta de tono (claro/oscuro/acento) y las del fondo lo indican', () => {
  const g = guiaIA();
  let n = 0;
  for (const b of catalogoHuecos()) for (const v of b.variantes) {
    n++;
    assert.ok(['claro', 'oscuro', 'acento'].includes(v.tono), `${b.bloque}/${v.clave}: tono ${v.tono}`);
    assert.ok(g.includes(`- variante "${v.clave}" (${v.etiqueta}) · fondo ${v.tono}`), `${b.bloque}/${v.clave}: sin etiqueta en la guía`);
  }
  assert.equal(g.split('\n').filter((l) => /^- variante .* · fondo (claro|oscuro|acento)/.test(l)).length, n, 'todas las líneas de variante llevan etiqueta');
  const tono = (b, k) => catalogoHuecos().find((x) => x.bloque === b).variantes.find((x) => x.clave === k).tono;
  assert.deepEqual([tono('navbar', 'claro'), tono('navbar', 'oscuro'), tono('hero', 'claro')], ['claro', 'oscuro', 'claro']);
  // «admite fondo» solo en variantes que traen fondoImagen
  const conFondo = g.split('\n').filter((l) => l.startsWith('- variante') && l.includes('admite fondo'));
  assert.equal(conFondo.length, 1); assert.match(conFondo[0], /variante "fondo"/);
});

t('la guía trae las reglas nuevas (todos los huecos, enlaces navbar/footer, cantidades fijas, WhatsApp, alternar fondos)', () => {
  const g = guiaIA();
  for (const re of [/Rellena TODOS los huecos de texto de cada sección que uses/, /Solo las imágenes pueden omitirse/, /no se pueden quitar ni añadir/, /#inicio solo existe si hay hero/, /Las cantidades son fijas por variante/, /https:\/\/wa\.me\/506NÚMERO/, /no inventes uno/, /Alterna fondo claro y oscuro/, /"fondo" \(opcional/]) assert.match(g, re);
  assert.equal((g.match(/enlace por defecto/g) || []).length, 1, 'el texto sobre el enlace por defecto va una sola vez, no en cada hueco');
  assert.equal((g.match(/\{"src":/g) || []).length, 1, 'el formato de imagen se explica una sola vez');
});

t('la guía es corta (≥30 % menos que los 25 582 caracteres anteriores) y sigue listando todos los huecos numerados', () => {
  const g = guiaIA();
  assert.ok(g.length <= 17900, `la guía mide ${g.length} caracteres (máximo 17 900 = 30 % menos que los 25 582 de antes)`);
  for (const b of catalogoHuecos()) for (const v of b.variantes) {
    v.lineas.forEach((l, i) => { assert.ok(g.includes(l), `falta la línea ${b.bloque}/${v.clave}/${i + 1}`); assert.ok(l.startsWith(`  ${i + 1} `)); });
  }
});

t('"fondo" en una sección del plan: solo http(s) o ruta; ajuste y capa de la variante no se tocan; lo demás se descarta con aviso', () => {
  const ref = createBlock('hero', 'fondo').styles.base;
  const r = construirPlan({ plan: 1, secciones: [{ bloque: 'hero', variante: 'fondo', fondo: ' https://x.test/f.jpg ' }, { bloque: 'hero', variante: 'oscuro', fondo: '/img/f.jpg' }] });
  assert.deepEqual([r.errores, r.avisos], [[], []]);
  const b0 = r.nodos[0].styles.base;
  assert.equal(b0.fondoImagen, 'https://x.test/f.jpg');
  assert.deepEqual([b0.fondoAjuste, b0.fondoPosicion, b0.fondoCapa], [ref.fondoAjuste, ref.fondoPosicion, ref.fondoCapa]);
  assert.equal(r.nodos[1].styles.base.fondoImagen, '/img/f.jpg');
  assert.equal(r.nodos[1].styles.base.fondoCapa, undefined, 'no se inventa capa en variantes sin ella');
  const pag = createPage(); pag.children = r.nodos;
  assert.ok(exportHTML(pag).includes('https://x.test/f.jpg'));
  for (const malo of ['javascript:alert(1)', 'data:image/png;base64,AA', 'ftp://x.test/a', '', 5, null, 'foto.jpg', '//x.com/a.jpg']) {
    const x = construirPlan({ plan: 1, secciones: [{ bloque: 'hero', variante: 'fondo', fondo: malo }] });
    assert.deepEqual(x.errores, []); assert.equal(x.avisos.length, 1, String(malo)); assert.match(x.avisos[0], /"fondo" debe ser/);
    assert.equal(x.nodos[0].styles.base.fondoImagen, ref.fondoImagen, 'se conserva el fondo de la variante');
  }
  assert.equal(fondoValido('https://a.com/x.png') && fondoValido('/a/b.jpg'), true);
});

t('enlaces rotos: aviso por cada botón #ancla sin sección con ese ancla (plan y página; "añadir" cuenta las existentes)', () => {
  const e = leerEntrada(JSON.stringify({ plan: 1, secciones: [{ bloque: 'navbar' }, { bloque: 'hero', variante: 'claro' }] }));
  assert.deepEqual(e.errores, []);
  const rotos = e.avisos.filter((a) => /apunta a/.test(a));
  assert.ok(rotos.includes('El enlace «Servicios» apunta a #servicios y no hay sección con ese ancla.'), e.avisos.join(' | '));
  assert.ok(rotos.some((a) => /«Precios» apunta a #precios/.test(a)) && rotos.some((a) => /«Contacto» apunta a #contacto/.test(a)));
  assert.ok(!rotos.some((a) => /#inicio/.test(a)), 'hay hero, así que #inicio existe');
  // con las secciones que faltan no hay avisos de enlaces
  const completo = leerEntrada(JSON.stringify({ plan: 1, secciones: ['navbar', 'hero', 'services', 'pricing', 'contact'].map((bloque) => ({ bloque })) }));
  assert.deepEqual(completo.avisos, []);
  // "añadir": el destino puede estar en lo que ya había
  const sueltas = JSON.stringify({ plan: 1, secciones: [{ bloque: 'hero', variante: 'oscuro' }] });
  assert.equal(leerEntrada(sueltas).avisos.length, 1);
  assert.deepEqual(leerEntrada(sueltas, [createBlock('contact', 'simple')]).avisos, []);
  // página completa (el mismo JSON de "Abrir JSON")
  const p = createPage(); p.children = [createBlock('hero', 'oscuro'), createBlock('footer', 'columnas')];
  const ep = leerEntrada(JSON.stringify(p));
  assert.equal(ep.tipo, 'pagina'); assert.ok(ep.avisos.some((a) => /«Servicios» apunta a #servicios/.test(a)));
  assert.deepEqual(avisosEnlaces([createBlock('hero', 'oscuro'), createBlock('contact', 'simple')]), []);
  // "#" suelto no es un ancla que comprobar
  const b = createBlock('hero', 'oscuro'); huecosDe(b)[2].content.href = '#';
  assert.deepEqual(avisosEnlaces([b]), []);
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
