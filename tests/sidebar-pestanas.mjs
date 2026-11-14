// Prueba: panel izquierdo con pestañas, "Se añadirá dentro de", plegado y teclado. Firefox real, editor compilado.
// Ejecutar: npm run test:sidebar  (hace build antes)
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').setBinary(FIREFOX)).build();
const $ = (c) => d.findElement(By.css(c));
const $$ = (c) => d.findElements(By.css(c));
const sel = (id) => d.executeScript('return document.querySelector(arguments[0]).getAttribute("aria-selected")', id);
const visible = (c) => d.executeScript('const e=document.querySelector(arguments[0]);return !!e && e.offsetParent!==null && getComputedStyle(e).visibility!=="hidden"', c);
const ancho = (c) => d.executeScript('return document.querySelector(arguments[0]).getBoundingClientRect().width', c);
let ok = 0;
const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };
try {
  await d.manage().window().setRect({ width: 1300, height: 900 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url); await d.executeScript('localStorage.clear()'); await d.get(url); await esperar(600);
  await d.executeScript(`window.__err=[];addEventListener('error',e=>__err.push(e.message));`);

  // 1. Empieza en Capas, con 3 pestañas y solo su panel visible
  v((await $$('[role=tab]')).length === 3, '3 pestañas');
  v(await sel('#tab-capas') === 'true' && await visible('#arbol') && !(await visible('#botones-elementos')) && !(await visible('#botones-bloques')), 'arranca en Capas');
  v(await ancho('#sidebar') === 210, 'panel de 210px: ' + await ancho('#sidebar'));
  v(await visible('#btn-pagina'), 'engranaje de ajustes visible junto a las pestañas');

  // 2. Elementos: línea de destino
  await $('#tab-elementos').click();
  v(await visible('#botones-elementos') && !(await visible('#arbol')), 'pestaña Elem. muestra solo sus botones');
  v((await $('#hint-elemento').getText()) === 'Se añadirá al final de la página', 'sin selección: al final de la página');

  // 3. Añadir bloques sin que cambie la pestaña
  await $('#tab-bloques').click();
  const dets = await $$('#botones-bloques details');
  await dets[0].findElement(By.css('summary')).click();
  await dets[1].findElement(By.css('summary')).click();
  v(await d.executeScript('return [...document.querySelectorAll("#botones-bloques details")].filter(x=>x.open).length') === 1, 'acordeón: un solo bloque abierto a la vez');
  await dets[1].findElement(By.css('.variantes button')).click();
  await dets[1].findElement(By.css('.variantes button')).click(); // dos seguidos
  await esperar(200);
  v(await sel('#tab-bloques') === 'true', 'añadir bloques no cambia de pestaña');
  await $('#tab-capas').click();
  v((await $$('#arbol li')).length > 4, 'los bloques aparecen en Capas');

  // 4. Elemento: queda seleccionado y la línea nombra el destino
  await $('#tab-elementos').click();
  const botonesEl = await $$('#botones-elementos button');
  const etiquetas = []; for (const b of botonesEl) etiquetas.push(await b.getText());
  const iCont = etiquetas.findIndex((t) => /Contenedor/.test(t));
  await botonesEl[iCont].click(); // contenedor: queda seleccionado
  await esperar(200);
  v(await sel('#tab-elementos') === 'true', 'añadir elemento no cambia de pestaña');
  await $('#tab-capas').click();
  const nombre = await d.executeScript('return document.querySelector("#arbol li.activa span").textContent');
  await $('#tab-elementos').click();
  v((await $('#hint-elemento').getText()) === `Se añadirá dentro de: ${nombre}`, `línea "Se añadirá dentro de: ${nombre}"`);
  const iTit = etiquetas.findIndex((t) => /Título/.test(t));
  await botonesEl[iTit].click(); await esperar(200);
  const hintTit = await $('#hint-elemento').getText();
  v(hintTit.startsWith('Se añadirá dentro de: '), 'con un título seleccionado la línea apunta a su contenedor: ' + hintTit);

  // 5. Teclado: flechas
  await $('#tab-elementos').click();
  await $('#tab-elementos').sendKeys(Key.ARROW_RIGHT);
  v(await sel('#tab-bloques') === 'true' && await d.executeScript('return document.activeElement.id') === 'tab-bloques', 'flecha derecha: Elem. → Bloques (con foco)');
  await $('#tab-bloques').sendKeys(Key.ARROW_RIGHT);
  v(await sel('#tab-capas') === 'true', 'flecha derecha desde la última vuelve a Capas');
  await $('#tab-capas').sendKeys(Key.ARROW_LEFT);
  v(await sel('#tab-bloques') === 'true', 'flecha izquierda desde la primera va a Bloques');

  // 6. Plegar / desplegar con la vista previa ganando ancho
  const pw0 = await ancho('#preview');
  await $('#btn-plegar').click(); await esperar(700);
  const pw1 = await ancho('#preview');
  v(Math.abs((await ancho('#sidebar')) - 36) < 1, 'plegado: tira de 36px');
  v(pw1 > pw0 + 150, `la vista previa gana ancho (${pw0} → ${pw1})`);
  v(await visible('#btn-desplegar') && !(await visible('#btn-plegar')), 'solo queda el botón para desplegar');
  await $('#btn-desplegar').click(); await esperar(700);
  v(await ancho('#sidebar') === 210 && Math.abs((await ancho('#preview')) - pw0) < 1, 'desplegado: vuelve a 210px');
  v(await sel('#tab-bloques') === 'true', 'la pestaña activa se conserva tras plegar');

  // 7. Ajustes de la página + vista móvil + Vista previa no rompen el layout
  await $('#btn-pagina').click(); await esperar(150);
  v((await d.executeScript('return document.querySelector("#inspector").textContent')).length > 20, 'el engranaje abre los ajustes de la página');
  await $('#vista-mobile').click(); await esperar(300);
  v(await d.executeScript('const s=document.querySelector("#sidebar").getBoundingClientRect(),p=document.querySelector("#preview").getBoundingClientRect(),i=document.querySelector("#inspector").getBoundingClientRect();return s.right<=p.left+1&&p.right<=i.left+1&&document.documentElement.scrollWidth<=innerWidth'), 'vista móvil: las 3 columnas no se pisan y no hay scroll horizontal');
  await $('#btn-vista-previa').click(); await esperar(700);
  await d.actions().sendKeys(Key.ESCAPE).perform(); await esperar(300);
  v(await ancho('#sidebar') === 210, 'tras abrir/cerrar Vista previa el panel sigue en 210px');

  v(!(await d.executeScript('return localStorage.getItem("editor-landings:pagina")||""')).includes('pestana'), 'la pestaña activa no se guarda con la landing');
  const errs = await d.executeScript('return __err');
  assert.deepEqual(errs, [], 'errores JS: ' + errs.join(' | '));
  console.log(`\n${ok} comprobaciones OK, sin errores de JS`);
} finally { await d.quit(); }
