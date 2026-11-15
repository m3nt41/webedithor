// Fuga de estilos: los efectos (hover...) de la página solo valen en el lienzo, no en las filas de Capas (que también llevan data-id).
// Firefox real sobre dist/editor.html. Ejecutar: npm run build && node tests/fuga-estilos.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n, walk } from '../src/core/tree.js';
import { cssPagina } from '../src/animations/index.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina';
let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };

const boton = n('button', { name: 'Btn', content: { text: 'Pulsa', href: '#' } });
boton.animation = { hover: { effect: 'lift' } };
const pagina = n('page', { name: 'Página', content: { title: 'Mi página' } });
pagina.children.push(n('section', { name: 'Sec', children: [boton] }));

// Sin navegador: todo selector de nodo del CSS del preview cuelga de .stage
const css = cssPagina(pagina);
v(css.includes(`.stage [data-id="${boton.id}"]:hover`) && !/(^|[\n}])\[data-id=/.test(css), 'cssPagina acota los selectores a .stage');

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1400, height: 1000 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);
  const id = boton.id;

  const fila = await d.findElement(By.css(`#arbol li[data-id="${id}"]`));
  const lienzo = await d.findElement(By.css(`#preview [data-id="${id}"]`));
  const tr = (el) => d.executeScript('return getComputedStyle(arguments[0]).transform', el);
  const y = (el) => d.executeScript('return arguments[0].getBoundingClientRect().top', el);

  v((await tr(fila)) === 'none', 'fila de Capas en reposo: sin transform');
  const y0 = await y(fila);
  await d.actions({ async: true }).move({ origin: fila }).perform();
  await esperar(500);
  v((await tr(fila)) === 'none' && Math.abs((await y(fila)) - y0) < 0.5, 'hover sobre la fila de Capas: NO se mueve (transform ' + await tr(fila) + ')');
  const sombra = await d.executeScript('return getComputedStyle(arguments[0]).boxShadow + getComputedStyle(arguments[0]).filter', fila);
  v(!/rgba\(0, 0, 0, 0\.28\)/.test(sombra), 'la fila no hereda sombra del efecto');

  await d.actions({ async: true }).move({ origin: lienzo }).perform();
  await esperar(600);
  v((await tr(lienzo)) !== 'none', 'hover sobre el botón del lienzo: SÍ se eleva (' + await tr(lienzo) + ')');
  const dentro = await d.executeScript('return !!document.querySelector("#preview .stage [data-id]") || !!document.querySelector(".stage")');
  v(dentro, 'el lienzo conserva la clase .stage');

  // Ningún otro sitio de la interfaz (fuera de Capas y del lienzo) usa data-id
  const otros = await d.executeScript(`return [...document.querySelectorAll('[data-id]')].filter(e=>!e.closest('#preview')&&!e.closest('#arbol')).length`);
  v(otros === 0, 'data-id solo existe en lienzo y Capas (otros: ' + otros + ')');
  console.log(`\n${ok} comprobaciones OK`);
} finally {
  await d.quit();
}
