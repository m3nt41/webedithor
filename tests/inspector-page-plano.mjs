// Nodo page: el inspector muestra TODO visible, sin niveles plegables ni <details> de nivel. Un nodo normal sigue con los 3 niveles.
// Firefox real sobre dist/editor.html. Ejecutar: npm run build && node tests/inspector-page-plano.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import { createNode as n, walk } from '../src/core/tree.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina', LSN = 'editor-landings:niveles';
const pagina = n('page', { name: 'Página', content: { title: 'Mi página' } });
pagina.children.push(n('section', { name: 'Sec', styles: { base: { padding: '10px' } }, children: [n('text', { name: 'Txt', content: { text: 'Hola' } })] }));

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1400, height: 1100 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.removeItem('${LSN}'); localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);

  // page: sin niveles plegables, y todo lo suyo visible sin abrir nada
  await d.findElement(By.css('#btn-pagina')).click(); await esperar(250);
  assert.equal(await d.executeScript(`return document.querySelectorAll('#inspector details.nivel').length`), 0, 'page no debe tener niveles plegables');
  const vis = (css) => d.executeScript(`const e=document.querySelector(arguments[0]); return !!e && e.getClientRects().length>0 && !e.closest('details:not([open])')`, css);
  for (const css of ['[data-c="title"]', '[data-c="smoothScroll"]', '[data-ia="copiar"]', '[data-s="fontSize"]', '[data-s="background"]', '[data-s="fontFamily"]', '[data-s="display"]']) {
    assert.ok(await vis(`#inspector ${css}`), `page: ${css} visible sin abrir nada`);
  }
  const t = await d.executeScript(`return [...document.querySelectorAll('#inspector h3')].map(h=>h.textContent)`);
  for (const h of ['Contenido', 'Landing con IA', 'Tipografía', 'Fondo y borde', 'Layout (hijos)']) assert.ok(t.includes(h), `page: falta el grupo ${h}`);

  // nodo normal: sigue con 3 niveles plegables (Esencial abierto, Estilo y Avanzado cerrados)
  const id = await d.executeScript(`return JSON.parse(localStorage.getItem('${LS}')).children[0].id`);
  await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`); await esperar(250);
  assert.equal(await d.executeScript(`return [...document.querySelectorAll('#inspector details.nivel')].map(x=>x.dataset.nivel+':'+(x.open?1:0)).join(' ')`), 'esencial:1 estilo:0 avanzado:0', 'nodo normal con niveles plegables');
  console.log('OK inspector-page-plano');
} finally { await d.quit(); }
