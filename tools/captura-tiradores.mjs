// Captura del caso real: texto pequeño tipo etiqueta ("NUEVO", ~40x14 px) con margen seleccionado.
// Uso: node tools/captura-tiradores.mjs antes|despues   (necesita dist/editor.html al día; guarda en docs/capturas-inspector/)
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { writeFileSync } from 'node:fs';
import { Builder } from 'selenium-webdriver';
import { createNode as n, walk } from '../src/core/tree.js';
import { opcionesFirefox } from './lib-tests.mjs';

const nombre = process.argv[2] === 'despues' ? 'despues' : 'antes';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina';
const pagina = n('page', { name: 'Página', content: { title: 'Etiqueta' } });
pagina.children.push(n('section', { name: 'Sec', styles: { padding: '60px 40px' }, children: [
  n('text', { name: 'Etiqueta', content: { text: 'NUEVO' }, styles: { margin: '2px', fontSize: '11px', fontWeight: '700', lineHeight: '14px', width: 'fit-content' } }),
] }));
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1300, height: 800 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);
  const id = await d.executeScript(`return JSON.parse(localStorage.getItem('${LS}')).children[0].children[0].id`);
  await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  await esperar(400);
  const r = await d.executeScript(`const r=document.querySelector('#preview [data-id="${id}"]').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}`);
  console.log('tamaño del texto:', r);
  // zoom: recorte ampliado con CSS zoom no afecta; captura de la ventana entera y recorte lo hace el lector
  const png = await d.takeScreenshot();
  writeFileSync(`docs/capturas-inspector/tiradores-etiqueta-${nombre}.png`, png, 'base64');
} finally { await d.quit(); }
