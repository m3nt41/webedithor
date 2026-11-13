// Controles visuales del inspector, en Firefox real sobre el editor compilado (dist/editor.html, file://).
// Ejecutar: npm run build && node tests/inspector.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n, walk } from '../src/core/tree.js';
import { createBlock } from '../src/blocks/index.js';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina';

// Dos galerías: "cuadricula" (repeat(3, 1fr), móvil '1fr 1fr', hijos 4/3) y "oscura" (auto-fit minmax(260px, 1fr)).
const pagina = n('page', { name: 'Página' });
pagina.children.push(createBlock('gallery', 'cuadricula'), createBlock('gallery', 'oscura'));
const grids = []; walk(pagina, (x) => { if (x.name === 'Grid') grids.push(x); });
const [g3, gAuto] = grids;
g3.name = 'Grid3'; gAuto.name = 'GridAuto';
// valores "raros" de un JSON viejo, para comprobar que se muestran como personalizado y NO se tocan
gAuto.styles.base.margin = '20px 0';
gAuto.styles.base.maxWidth = '900';   // sin unidad: el navegador lo ignora

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').setBinary(FIREFOX)).build();
try {
  await d.manage().window().setRect({ width: 1400, height: 1100 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);
  await d.executeScript(`window.__err=[];addEventListener('error',e=>__err.push(e.message));`);

  const guardada = async () => { await esperar(450); return JSON.parse(await d.executeScript(`return localStorage.getItem('${LS}')`)); };
  const nodo = async (nombre) => { let r = null; walk(await guardada(), (x) => { if (x.name === nombre) r = x; }); return r; };
  const est = async (nombre, modo, clave) => (await nodo(nombre)).styles[modo][clave];
  const seleccionar = async (nombre) => {
    const id = (await nodo(nombre)).id;
    await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    await esperar(150);
  };
  const boton = (clave, texto) => d.findElement(By.xpath(`//*[@id='inspector']//button[@data-ctl='${clave}' and normalize-space()='${texto}']`));
  const pulsar = async (clave, texto) => { await (await boton(clave, texto)).click(); await esperar(150); };
  const activo = async (clave) => d.executeScript(`return [...document.querySelectorAll('#inspector button[data-ctl="${clave}"].on, #inspector button[data-ctl-otro="${clave}"].on')].map(b=>b.textContent.trim())`);
  const modo = async (m) => { await d.findElement(By.css(m === 'mobile' ? '#vista-mobile' : '#vista-desktop')).click(); await esperar(150); };
  const sinHistorial = async () => d.executeScript(`return document.querySelector('#btn-undo').disabled`);
  const crudo = (clave) => d.findElement(By.css(`#inspector details.avanzado [data-s="${clave}"]`));
  // Ojo: Ctrl+A + Borrar + texto en UNA sola llamada de sendKeys pierde el texto (también en un <input> suelto: es un artefacto de geckodriver); van en llamadas separadas.
  const teclear = async (el, txt, clic = true) => { if (clic) await el.click(); await el.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE); await el.sendKeys(txt); };

  // 1. Abrir un nodo NO escribe nada (Undo sigue deshabilitado) y los valores viejos se leen bien
  await seleccionar('GridAuto');
  assert.deepEqual(await activo('gridTemplateColumns'), ['Auto'], 'auto-fit debe marcar Auto');
  assert.equal(await d.executeScript(`return document.querySelector('[data-ctl-min]').value`), '260', 'mínimo del Auto');
  assert.deepEqual(await activo('margin'), ['Otro'], 'margin "20px 0" debe ser personalizado');
  assert.deepEqual(await activo('maxWidth'), ['Otro'], 'maxWidth "900" debe ser personalizado');
  assert.equal(await d.executeScript(`return !!document.querySelector('#inspector details.avanzado[open]')`), true, 'Avanzado se abre solo con valores personalizados');
  assert.equal(await sinHistorial(), true, 'abrir el nodo escribió algo');
  assert.equal((await est('GridAuto', 'base', 'margin')), '20px 0');

  // 2. maxWidth "900" sin unidad: campo en rojo + aviso, y el valor sigue guardado (no se descarta)
  assert.ok((await (await crudo('maxWidth')).getAttribute('class')).includes('invalido'), 'maxWidth 900 debería marcarse inválido');
  assert.equal(await d.executeScript(`return !document.querySelector('#inspector [data-aviso-css]:not([hidden])') ? 'sin aviso' : 'aviso'`), 'aviso');
  assert.equal(await est('GridAuto', 'base', 'maxWidth'), '900');
  // escribir a mano "900px" quita el aviso (tecleo real)
  const mw = await crudo('maxWidth');
  await teclear(mw, '900px'); await esperar(200);
  assert.ok(!(await mw.getAttribute('class')).includes('invalido'), '900px es válido');
  assert.equal(await est('GridAuto', 'base', 'maxWidth'), '900px');
  await teclear(mw, '900', false); await esperar(200);
  assert.ok((await mw.getAttribute('class')).includes('invalido'), 'volver a 900 vuelve a avisar');

  // 3. Columnas: el botón escribe lo mismo que escribirlo a mano
  await seleccionar('Grid3');
  assert.deepEqual(await activo('gridTemplateColumns'), ['3']);
  await pulsar('gridTemplateColumns', '4');
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), 'repeat(4, 1fr)');
  assert.deepEqual(await activo('gridTemplateColumns'), ['4'], 'el botón activo se actualiza');
  const antesMano = await est('Grid3', 'base', 'gridTemplateColumns');
  const rc = await crudo('gridTemplateColumns'); // a mano: el mismo valor deja el estado idéntico
  await (await d.findElement(By.css('[data-ctl-otro="gridTemplateColumns"]'))).click(); // "Otro" abre Avanzado y enfoca el campo
  assert.equal(await d.executeScript('return document.activeElement.dataset.s'), 'gridTemplateColumns', '"Otro" debe enfocar el campo de texto');
  await teclear(rc, 'repeat(4, 1fr)', false); await esperar(200);
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), antesMano, 'botón y teclado deben guardar lo mismo');
  await pulsar('gridTemplateColumns', 'Auto');
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), 'repeat(auto-fit, minmax(240px, 1fr))');
  // el mínimo editable
  const min = await d.findElement(By.css('[data-ctl-min]'));
  await teclear(min, '300'); await esperar(200);
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), 'repeat(auto-fit, minmax(300px, 1fr))');
  assert.equal(await d.executeScript(`return document.activeElement.dataset.ctlMin`), 'gridTemplateColumns', 'escribir el mínimo no debe quitar el foco');

  // 4. Ancho máx. + Centrar (escritorio)
  await pulsar('maxWidth', '760');
  assert.equal(await est('Grid3', 'base', 'maxWidth'), '760px');
  await pulsar('margin', 'Centrado');
  assert.equal(await est('Grid3', 'base', 'margin'), '0 auto');
  assert.deepEqual(await activo('margin'), ['Centrado']);
  await pulsar('margin', 'Sin centrar');
  assert.equal(await est('Grid3', 'base', 'margin'), undefined, 'escritorio: Sin centrar quita margin');
  await pulsar('maxWidth', 'Completo');
  assert.equal(await est('Grid3', 'base', 'maxWidth'), undefined, 'escritorio: Completo quita maxWidth');

  // 5. Proporción de los hijos (Auto = quitar) y de una imagen (Auto = 'auto' explícito)
  assert.deepEqual(await activo('hijosAspectRatio'), ['4:3']);
  await pulsar('hijosAspectRatio', '16:9');
  assert.equal(await est('Grid3', 'base', 'hijosAspectRatio'), '16 / 9');
  await pulsar('hijosAspectRatio', 'Auto');
  assert.equal(await est('Grid3', 'base', 'hijosAspectRatio'), undefined);
  await seleccionar('Foto 1');
  await pulsar('aspectRatio', '3:2');
  assert.equal(await est('Foto 1', 'base', 'aspectRatio'), '3 / 2');
  await pulsar('aspectRatio', 'Auto');
  assert.equal(await est('Foto 1', 'base', 'aspectRatio'), 'auto');

  // 6. Deshacer revierte el clic de un botón
  await seleccionar('Grid3');
  await esperar(1200); // fuera de la ventana de agrupado
  const antes = await est('Grid3', 'base', 'gridTemplateColumns');
  await pulsar('gridTemplateColumns', '2');
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), 'repeat(2, 1fr)');
  await d.findElement(By.css('#btn-undo')).click(); await esperar(150);
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), antes, 'Deshacer no revirtió el clic');

  // 7. Móvil: escribe SOLO en styles.mobile; "igual que escritorio" lo borra; el heredado se ve atenuado
  await modo('mobile');
  assert.deepEqual(await activo('gridTemplateColumns'), ['2'], 'en móvil se muestra el valor propio ("1fr 1fr" = 2)');
  await pulsar('gridTemplateColumns', '1');
  assert.equal(await est('Grid3', 'mobile', 'gridTemplateColumns'), 'repeat(1, 1fr)');
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), antes, 'escritorio no debe cambiar');
  assert.equal(await d.executeScript(`return !!document.querySelector('#inspector label.ov')`), true, 'marca ● de valor propio en móvil');
  await pulsar('maxWidth', 'Completo');
  assert.equal(await est('Grid3', 'mobile', 'maxWidth'), 'none', 'móvil: Completo escribe none');
  await pulsar('margin', 'Sin centrar');
  assert.equal(await est('Grid3', 'mobile', 'margin'), '0', 'móvil: Sin centrar escribe 0');
  const reset = await d.findElement(By.xpath(`//*[@id='inspector']//button[@data-ctl='margin' and contains(.,'igual que escritorio')]`));
  await reset.click(); await esperar(150);
  assert.equal(await est('Grid3', 'mobile', 'margin'), undefined, 'el reset borra solo el override móvil');
  assert.equal(await d.executeScript(`return !!document.querySelector('#inspector [data-ctl="margin"]').closest('.botones').classList.contains('heredado')`), true, 'sin override se ve como heredado');
  await modo('desktop');

  const errs = await d.executeScript('return __err');
  assert.deepEqual(errs, [], 'errores: ' + errs.join(' | '));
  console.log('OK inspector: valores viejos se leen sin escribir, aviso de CSS inválido, Columnas/Ancho máx./Centrar/Proporción = mismo string que a mano, Deshacer, móvil/escritorio y reset');
} finally { await d.quit(); }
