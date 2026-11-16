// Inspector en 3 acordeones por tarea (Contenido / Estilo / Movimiento), Firefox real sobre dist/editor.html.
// Comprueba: Contenido y Estilo abiertos y Movimiento plegado de fábrica, que se recuerda lo que el usuario abre, que cada tipo
// muestra solo lo suyo (una sección no tiene opciones de botón) y que editar un campo de cada tipo sigue escribiendo.
// Ejecutar: npm run build && node tests/inspector-niveles.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n, walk } from '../src/core/tree.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina', LSN = 'editor-landings:niveles';

const pagina = n('page', { name: 'Página', content: { title: 'Mi página' } });
pagina.children.push(n('section', { name: 'Sec', styles: { base: { padding: '10px' } }, children: [
  n('container', { name: 'Cont', styles: { base: { padding: '5px' } }, children: [
    n('heading', { name: 'Tit', content: { text: 'Hola', level: 2 } }),
    n('text', { name: 'Txt', content: { text: 'Texto' } }),
    n('button', { name: 'Btn', content: { text: 'Pulsa', href: '#' } }),
    n('image', { name: 'Img', content: { src: '', alt: '' } }),
    n('icon', { name: 'Ico', content: { name: 'star' } }),
  ] }),
] }));

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1400, height: 1100 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.removeItem('${LSN}'); localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);

  const guardada = async () => { await esperar(450); return JSON.parse(await d.executeScript(`return localStorage.getItem('${LS}')`)); };
  const nodo = async (nombre) => { let r = null; walk(await guardada(), (x) => { if (x.name === nombre) r = x; }); return r; };
  const seleccionar = async (nombre) => {
    const id = (await nodo(nombre)).id;
    await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    await esperar(150);
  };
  const estado = () => d.executeScript(`return [...document.querySelectorAll('#inspector details.nivel')].map(x=>x.dataset.nivel+':'+(x.open?1:0)).join(' ')`);
  const titulos = () => d.executeScript(`return [...document.querySelectorAll('#inspector h3')].map(h=>h.textContent)`);
  const teclear = async (css, txt) => { const el = await d.findElement(By.css(css)); await el.click(); await el.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE); await el.sendKeys(txt); };

  // 1. De fábrica: Contenido y Estilo abiertos, Movimiento plegado; la cabecera dice nombre y tipo
  await seleccionar('Sec');
  assert.equal(await estado(), 'contenido:1 estilo:1 movimiento:0', 'estado de fábrica');
  assert.match(await d.executeScript(`return document.querySelector('#inspector .insp-cab').textContent`), /Sección/, 'cabecera con el tipo');
  assert.equal(await d.executeScript(`return document.querySelector('#inspector .insp-cab [data-name]').value`), 'Sec');

  // 2. Cada tipo muestra solo lo suyo: una sección no tiene el grupo "Botón"; un botón sí
  assert.ok(!(await titulos()).includes('Botón'), 'la sección no muestra opciones de botón');
  await seleccionar('Btn');
  assert.ok((await titulos()).includes('Botón'), 'el botón muestra su grupo');

  // 3. Se recuerda lo que el usuario abre (y sobrevive a recargar)
  await d.findElement(By.css('#inspector details.nivel-movimiento > summary')).click(); await esperar(200);
  assert.equal(await estado(), 'estilo:1 movimiento:1', 'el botón no tiene acordeón Contenido');
  assert.equal(await d.executeScript(`return localStorage.getItem('${LSN}')`), '{"contenido":true,"estilo":true,"movimiento":true}');
  await d.get(url); await esperar(700); await seleccionar('Tit');
  assert.equal(await estado(), 'estilo:1 movimiento:1', 'tras recargar (un título no tiene nada en Contenido: su texto va arriba)');
  await d.executeScript(`localStorage.setItem('${LSN}','{"contenido":true,"estilo":true,"movimiento":true}')`);
  await d.get(url); await esperar(700);

  // 4. Editar un campo de cada tipo sigue escribiendo (y leer no escribe: Undo sigue apagado al abrir)
  await seleccionar('Sec');
  assert.equal(await d.executeScript(`return document.querySelector('#btn-undo').disabled`), true, 'abrir un nodo escribió algo');
  await teclear('#inspector [data-s="padding"]', '33px');
  assert.equal((await nodo('Sec')).styles.base.padding, '33px', 'section padding');
  await seleccionar('Cont'); await teclear('#inspector [data-s="background"]', '#112233');
  assert.equal((await nodo('Cont')).styles.base.background, '#112233', 'container fondo');
  await seleccionar('Tit'); await teclear('#inspector [data-c="text"]', 'Nuevo');
  assert.equal((await nodo('Tit')).content.text, 'Nuevo', 'heading texto');
  await seleccionar('Txt'); await teclear('#inspector [data-s="fontSize"]', '19px');
  assert.equal((await nodo('Txt')).styles.base.fontSize, '19px', 'text tamaño');
  await seleccionar('Btn'); await teclear('#inspector [data-c="href"]', '#x');
  assert.equal((await nodo('Btn')).content.href, '#x', 'button enlace');
  await seleccionar('Img'); await teclear('#inspector [data-c="alt"]', 'foto');
  assert.equal((await nodo('Img')).content.alt, 'foto', 'image alt');
  await seleccionar('Ico'); await (await d.findElement(By.css('#inspector [data-icono="heart"]'))).click();
  assert.equal((await nodo('Ico')).content.name, 'heart', 'icon elegir');
  await d.findElement(By.css('#btn-pagina')).click(); await esperar(150);
  await teclear('#inspector [data-c="title"]', 'Otro título');
  assert.equal((await guardada()).content.title, 'Otro título', 'page título');

  console.log('OK inspector en acordeones: Contenido y Estilo abiertos de fábrica, se recuerda lo abierto, cada tipo muestra lo suyo y editar un campo de cada tipo escribe');
} finally { await d.quit(); }
