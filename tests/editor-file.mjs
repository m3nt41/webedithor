// Prueba: el editor compilado (dist/editor.html) funciona abierto con doble clic (file://) en Firefox real.
// Ejecutar: npm run build && node tests/editor-file.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const opts = opcionesFirefox();
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opts).build();
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await esperar(600);
  // errores de consola/JS: los capturamos con un hook instalado antes de actuar
  await d.executeScript(`window.__err=[];addEventListener('error',e=>__err.push(e.message));addEventListener('unhandledrejection',e=>__err.push(String(e.reason)));
    window.__blobs=[];const o=URL.createObjectURL.bind(URL);URL.createObjectURL=b=>{__blobs.push(b);return o(b)};`);
  assert.ok((await d.findElements(By.css('#toolbar #btn-exportar'))).length, 'la barra del editor no se montó');
  const antes = (await d.findElements(By.css('#arbol li'))).length;
  // agregar un bloque (Hero, primera variante)
  await d.findElement(By.css('#tab-bloques')).click(); // los botones viven en la pestaña Bloques
  await d.findElement(By.css('#botones-bloques .bloque-titulo')).click();
  await d.findElement(By.css('#botones-bloques .variantes button')).click();
  await esperar(300);
  const despues = (await d.findElements(By.css('#arbol li'))).length;
  assert.ok(despues > antes, `el bloque no se agregó (${antes} -> ${despues})`);
  // localStorage guarda la página
  const guardado = await d.executeScript(`return localStorage.getItem('editor-landings:pagina')?.length || 0`);
  assert.ok(guardado > 100, 'localStorage no guardó la página');
  // exportar HTML
  await d.findElement(By.css('#btn-exportar')).click();
  await esperar(300);
  const html = await d.executeAsyncScript(`const cb=arguments[arguments.length-1];const b=__blobs.at(-1);b?b.text().then(cb):cb('')`);
  assert.ok(html.includes('<!doctype html>') || html.toLowerCase().includes('<!doctype html'), 'el export no generó HTML');
  const errs = await d.executeScript('return __err');
  assert.deepEqual(errs, [], 'errores en la página: ' + errs.join(' | '));
  console.log(`OK desde file://: bloque agregado (${antes}->${despues} capas), localStorage ${guardado} caracteres, export ${html.length} bytes, sin errores`);
} finally { await d.quit(); }
