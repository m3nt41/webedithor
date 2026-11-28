// Prueba del mecanismo de traducción (src/i18n): elección de idioma, respaldo en español,
// datos entre llaves y que fuera del navegador siempre sea español. Ejecutar: node tests/i18n.mjs  (Node, sin navegador)
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createPage } from '../src/core/tree.js';
import { createBlock } from '../src/blocks/index.js';
import { exportHTML } from '../src/export/exporter.js';
import { fileURLToPath } from 'node:url';
import { BASE, IDIOMAS, elegirIdioma, crearT, idioma, t as traducir, guardarIdioma } from '../src/i18n/index.js';

let ok = 0;
const t = (nombre, fn) => { fn(); ok++; console.log('OK  ', nombre); };
const dos = { es: {}, en: {} };

t('gana el idioma guardado', () => {
  assert.equal(elegirIdioma('en', 'es-MX', dos), 'en');
  assert.equal(elegirIdioma('es', 'en-US', dos), 'es');
});
t('sin guardado se usa el del navegador (sin la región)', () => {
  assert.equal(elegirIdioma(null, 'en-US', dos), 'en');
  assert.equal(elegirIdioma(null, 'EN', dos), 'en');
});
t('un idioma que no tenemos, un valor raro o nada -> español', () => {
  assert.equal(elegirIdioma(null, 'fr-FR', dos), BASE);
  assert.equal(elegirIdioma('zz', undefined, dos), BASE);
  assert.equal(elegirIdioma('__proto__', 'constructor', dos), BASE);
});
t('un guardado que no tenemos no tapa al navegador', () => {
  assert.equal(elegirIdioma('de', 'en-GB', dos), 'en');
});

const tr = crearT({ 'a.hola': 'Hello', 'a.n': '{n} effects in {m}' }, { 'a.hola': 'Hola', 'a.solo': 'Solo en español' });
t('traduce con el idioma activo', () => assert.equal(tr('a.hola'), 'Hello'));
t('si falta la clave, respaldo en español', () => assert.equal(tr('a.solo'), 'Solo en español'));
t('si no está en ningún lado, devuelve la clave (también las de Object)', () => {
  assert.equal(tr('a.nada'), 'a.nada');
  assert.equal(tr('toString'), 'toString');
});
t('rellena los datos entre llaves y deja los que faltan', () => {
  assert.equal(tr('a.n', { n: 0, m: 2 }), '0 effects in 2');
  assert.equal(tr('a.n', { n: 3 }), '3 effects in {m}');
  assert.equal(tr('a.n'), '{n} effects in {m}');
});
t('un dato con $ se escribe literal', () => assert.equal(tr('a.n', { n: '$&', m: '$1' }), '$& effects in $1'));

t('fuera del navegador es español y no intenta guardar', () => {
  assert.equal(idioma, BASE);
  assert.equal(typeof traducir, 'function');
  assert.equal(guardarIdioma('es'), false);
});
t('todos los idiomas registrados tienen solo claves que existen en español y textos', () => {
  for (const [codigo, textos] of Object.entries(IDIOMAS)) {
    for (const [clave, texto] of Object.entries(textos)) {
      assert.ok(Object.hasOwn(IDIOMAS[BASE], clave), `${codigo}: sobra la clave ${clave}`);
      assert.equal(typeof texto, 'string', `${codigo}: ${clave} no es texto`);
    }
  }
});

t('todos los idiomas tienen EXACTAMENTE las claves de español, con los mismos datos entre llaves', () => {
  const huecos = (s) => [...s.matchAll(/\{\w+\}/g)].map((m) => m[0]).sort().join();
  for (const [codigo, textos] of Object.entries(IDIOMAS)) {
    assert.deepEqual(Object.keys(textos).sort(), Object.keys(IDIOMAS[BASE]).sort(), codigo);
    for (const [clave, texto] of Object.entries(textos)) {
      assert.equal(huecos(texto), huecos(IDIOMAS[BASE][clave]), `${codigo}: ${clave}: datos distintos`);
      assert.ok(texto.trim(), `${codigo}: ${clave} vacío`);
      // muchos textos van dentro de atributos HTML: una comilla doble que el español no tiene los rompería
      if (!IDIOMAS[BASE][clave].includes('"')) assert.ok(!texto.includes('"'), `${codigo}: ${clave} tiene comillas dobles (usa “ ”)`);
      assert.ok(!/<[a-z/]/i.test(texto), `${codigo}: ${clave} lleva HTML`);
    }
  }
});
t('toda clave escrita en el código existe en español', () => {
  const archivos = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? archivos(`${d}/${e.name}`) : [`${d}/${e.name}`]));
  const raiz = fileURLToPath(new URL('../src', import.meta.url));
  const faltan = [];
  for (const f of archivos(raiz)) {
    if (!f.endsWith('.js') || f.includes('/i18n/') || f.includes('lenis')) continue;
    const code = readFileSync(f, 'utf8');
    // t('a.b'), tr('a.b') y las dos ramas de t(cond ? 'a.b' : 'a.c')
    for (const m of code.matchAll(/(?<![\w.])(?:t|tr)\((?:[^()'`]*\? )?'([a-zA-Z]+\.\w+)'(?: : '([a-zA-Z]+\.\w+)')?/g)) {
      for (const k of [m[1], m[2]]) if (k && !Object.hasOwn(IDIOMAS[BASE], k)) faltan.push(`${f.slice(raiz.length)}: ${k}`);
    }
  }
  assert.deepEqual(faltan, []);
});

t('la guía de IA en inglés sale en inglés y respeta el mismo tope de longitud (17 900)', () => {
  // proceso aparte: el idioma se decide una sola vez al cargar, así que se finge un navegador en inglés
  const codigo = `globalThis.window = { localStorage: { getItem: () => 'en' }, navigator: { language: 'en' } };
    const { guiaIA } = await import('./src/core/guiaia.js'); process.stdout.write(guiaIA());`;
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', codigo], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(r.stdout.startsWith('# Guide to building'), r.stdout.slice(0, 80));
  assert.ok(r.stdout.length <= 17900, `mide ${r.stdout.length}`);
  assert.ok(!/## Reglas|botón ≤|· fondo /.test(r.stdout), 'quedan restos en español');
});

t('el menú hamburguesa exportado habla el idioma de la página', () => {
  const pagina = createPage();
  pagina.children.push(createBlock('navbar'));
  const normal = exportHTML(pagina);
  assert.ok(normal.includes('aria-label="Abrir menú"') && normal.includes("'Cerrar menú':'Abrir menú'"), 'sin idioma: español, como siempre');
  for (const lang of ['es', 'es-CR']) { pagina.content.lang = lang; assert.ok(exportHTML(pagina).includes('Cerrar menú'), lang); }
  for (const lang of ['en', 'en-US', 'fr']) {
    pagina.content.lang = lang;
    const html = exportHTML(pagina);
    assert.ok(html.includes('aria-label="Open menu"') && html.includes("'Close menu':'Open menu'") && !html.includes('menú\''), lang);
  }
});

console.log(`\n${ok} comprobaciones OK`);
