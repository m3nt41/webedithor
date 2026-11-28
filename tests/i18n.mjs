// Prueba del mecanismo de traducción (src/i18n): elección de idioma, respaldo en español,
// datos entre llaves y que fuera del navegador siempre sea español. Ejecutar: node tests/i18n.mjs  (Node, sin navegador)
import assert from 'node:assert/strict';
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

console.log(`\n${ok} comprobaciones OK`);
