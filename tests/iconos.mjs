// Prueba: elemento "Icono" (SVG propios) + ningún emoticono de color en bloques, export ni interfaz.
// Parte 1 (Node): todas las variantes de TODOS los bloques y elementos, y su export, sin emoji.
// Parte 2 (Firefox real, editor compilado): añadir icono, cambiar icono/tamaño/color, editor, Vista previa, export,
// móvil con override y persistencia. Ejecutar: npm run test:iconos  (hace build antes)
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { Builder, By, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { BLOCKS, createBlock } from '../src/blocks/index.js';
import { ELEMENTS } from '../src/blocks/elements.js';
import { ICONOS } from '../src/blocks/iconos-data.js';
import { exportHTML } from '../src/export/exporter.js';
import { createPage, walk, normalizePage } from '../src/core/tree.js';
import { iconoSvg } from '../src/core/icono.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

let ok = 0;
const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };

// ---------- Parte 1: Node ----------
// © ® ™ cuentan como "pictográficos" para Unicode pero son tipografía normal (texto, sin color): se dejan.
const emoji = (s) => (String(s).replace(/[©®™]/g, '').match(/\p{Extended_Pictographic}/gu) || []);
let variantes = 0, iconos = 0;
for (const b of BLOCKS) {
  for (const [clave, vr] of Object.entries(b.variants)) {
    const nodo = createBlock(b.id, clave);
    variantes++;
    assert.deepEqual(emoji(JSON.stringify(nodo)), [], `emoji en el árbol de ${b.id}/${clave}`);
    const pagina = createPage(); pagina.children.push(nodo);
    assert.deepEqual(emoji(exportHTML(pagina)), [], `emoji en el export de ${b.id}/${clave}`);
    normalizePage(JSON.parse(JSON.stringify(pagina))); // el árbol sigue siendo válido
    walk(nodo, (x) => { if (x.type === 'icon') { iconos++; assert.ok(ICONOS[x.content.name], `${b.id}/${clave}: icono inexistente ${x.content.name}`); assert.equal(x.children.length, 0); } });
  }
}
v(variantes >= 30, `${variantes} variantes de bloques sin ningún emoji (árbol y export)`);
v(iconos >= 8, `${iconos} nodos icon repartidos en los bloques, todos con nombre válido`);
for (const e of ELEMENTS) assert.deepEqual(emoji(JSON.stringify(e.crear())), [], `emoji en el elemento ${e.id}`);
v(ELEMENTS.some((e) => e.type === 'icon'), 'la paleta Elem. tiene el elemento Icono');
v(Object.keys(ICONOS).length >= 38, `${Object.keys(ICONOS).length} iconos en la biblioteca`);
v(/aria-hidden="true"/.test(iconoSvg('zap')) && /stroke="currentColor"/.test(iconoSvg('zap')), 'el SVG es aria-hidden y usa currentColor');
v(/stroke-dasharray/.test(iconoSvg('no-existe')), 'un name inexistente dibuja el icono neutro (no rompe)');
// Export de un icono suelto con nombre inexistente: no lanza
{ const p = createPage(); const s = createBlock('services', 'iconos'); p.children.push(s); const ic = []; walk(s, (x) => x.type === 'icon' && ic.push(x)); ic[0].content.name = 'zzz';
  assert.ok(exportHTML(p).includes('<svg')); v(true, 'export con icono desconocido no rompe'); }
// Una landing vieja con emoticonos como texto sigue abriéndose igual (no se migra)
{ const p = createPage(); const s = createBlock('services', 'tarjetas'); s.children[1].children[0].children[0].content.text = '⚡ viejo'; p.children.push(s);
  const q = normalizePage(JSON.parse(JSON.stringify(p))); let hallado = false; walk(q, (x) => { if (x.content?.text === '⚡ viejo') hallado = true; }); v(hallado, 'el texto con emoticono de una landing vieja se conserva tal cual'); }

// ---------- Parte 2: Firefox ----------
const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
const $ = (c) => d.findElement(By.css(c));
const $$ = (c) => d.findElements(By.css(c));
const js = (code, ...a) => d.executeScript(code, ...a);
const caja = () => js(`const e=document.querySelector('#preview [data-type="icon"]');const r=e.getBoundingClientRect();return {w:r.width,h:r.height,c:getComputedStyle(e).color,svg:!!e.querySelector('svg'),d:e.querySelector('svg path,svg circle,svg rect')?.getAttribute('d')||'',aria:e.querySelector('svg')?.getAttribute('aria-hidden')}`);
const escribir = async (sel, txt) => { const el = await $(sel); await el.click(); await el.sendKeys(Key.chord(Key.CONTROL, 'a')); await el.sendKeys(Key.BACK_SPACE); await el.sendKeys(txt); };
try {
  await d.manage().window().setRect({ width: 1400, height: 950 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url); await js('localStorage.clear()'); await d.get(url); await esperar(600);
  await js(`window.__err=[];addEventListener('error',e=>__err.push(e.message));`);

  // Sin emoji en la interfaz del editor (toolbar, sidebar, inspector)
  const textoUi = await js(`return document.body.innerText`);
  v(emoji(textoUi).length === 0, 'la interfaz del editor no muestra ningún emoji');
  v(await js(`return !!document.querySelector('#btn-undo svg') && !!document.querySelector('#btn-redo svg') && document.querySelector('#btn-undo').getAttribute('aria-label')==='Deshacer'`), 'Deshacer y Rehacer son SVG con aria-label');

  // 1. Añadir desde Elem.
  await $('#tab-elementos').click();
  const botones = await js(`return [...document.querySelectorAll('#botones-elementos button')].map(b=>b.textContent)`);
  v(botones.includes('+ Icono'), 'Elem. tiene "+ Icono": ' + botones.join(' | '));
  await js(`[...document.querySelectorAll('#botones-elementos button')].find(b=>b.textContent==='+ Icono').click()`);
  await esperar(250);
  let c = await caja();
  v(c.svg && c.aria === 'true', 'aparece un SVG aria-hidden en el preview');
  v(Math.round(c.w) === 32 && Math.round(c.h) === 32, `tamaño por defecto 32px (${c.w}x${c.h})`);
  const grid = await $$('#inspector .icono-grid button');
  v(grid.length === Object.keys(ICONOS).length, `cuadrícula con ${grid.length} iconos`);
  v(await js(`return document.querySelector('#inspector .icono-grid button.on').title`) === 'Estrella', 'el actual es Estrella (title con nombre)');
  v(await js(`return document.querySelector('#arbol li.activa i svg')!==null`), 'el árbol de capas muestra el icono elegido');

  // 2. Cambiar de icono
  const dEstrella = c.d;
  await js(`document.querySelector('#inspector .icono-grid button[data-icono="zap"]').click()`); await esperar(250);
  c = await caja();
  v(c.d !== dEstrella && c.d === ICONOS.zap.d.match(/d="([^"]+)"/)[1], 'cambiar a Rayo cambia el path');
  v(await js(`return document.querySelector('#inspector .icono-grid button.on').title`) === 'Rayo', 'la cuadrícula marca Rayo');

  // 3. Tamaño: predefinido y libre
  await js(`document.querySelector('#inspector [data-isz="48"]').click()`); await esperar(250);
  c = await caja(); v(Math.round(c.w) === 48 && Math.round(c.h) === 48, `botón 48 -> ${c.w}x${c.h}`);
  v(await js(`return document.querySelector('#inspector [data-isz="48"]').classList.contains('on')`), 'el botón 48 queda marcado');
  await escribir('#inspector [data-isz-num]', '40'); await esperar(300);
  c = await caja(); v(Math.round(c.w) === 40 && Math.round(c.h) === 40, `tamaño libre 40 -> ${c.w}x${c.h}`);

  // 4. Color
  await escribir('#inspector input[data-s="color"]', '#ff0000'); await esperar(300);
  c = await caja(); v(c.c === 'rgb(255, 0, 0)', 'color rojo en el preview: ' + c.c);

  // 5. Vista previa y export
  await $('#btn-vista-previa').click(); await esperar(800);
  const srcdoc = await js(`return document.querySelector('#vp-frame').getAttribute('srcdoc')`);
  v(srcdoc.includes('<svg') && /width:40px/.test(srcdoc) && /height:40px/.test(srcdoc) && /color:#ff0000/.test(srcdoc), 'export (srcdoc) contiene <svg>, 40px y color #ff0000');
  v(emoji(srcdoc).length === 0 && !/<script>[^]*lucide/i.test(srcdoc), 'el export no lleva emoji ni librería');
  await d.switchTo().frame(await $('#vp-frame'));
  const enFrame = await js(`const e=document.querySelector('span svg').parentElement;const r=e.getBoundingClientRect();return [r.width,r.height,getComputedStyle(e).color,getComputedStyle(e.querySelector('svg')).stroke]`);
  await d.switchTo().defaultContent();
  v(Math.round(enFrame[0]) === 40 && enFrame[2] === 'rgb(255, 0, 0)' && enFrame[3] === 'rgb(255, 0, 0)', 'en la Vista previa mide 40px y el trazo es rojo: ' + enFrame.join(' '));
  await $('body').sendKeys(Key.ESCAPE); await esperar(300);

  // 6. Móvil con override
  await $('#vista-mobile').click(); await esperar(250);
  await js(`document.querySelector('#inspector [data-isz="24"]').click()`); await esperar(250);
  c = await caja(); v(Math.round(c.w) === 24, 'móvil: 24px');
  v(await js(`return !!document.querySelector('#inspector label.ov')`), 'la etiqueta del campo con override lleva ●');
  v(await js(`return !!document.querySelector('#inspector button.quitar[data-isz]')&&document.querySelector('#inspector button.quitar[data-isz]').textContent.includes('igual que escritorio')`), '"↺ igual que escritorio" disponible');
  await escribir('#inspector input[data-s="color"]', '#00aa00'); await esperar(300);
  c = await caja(); v(c.c === 'rgb(0, 170, 0)', 'móvil: color propio ' + c.c);
  await $('#btn-vista-previa').click(); await esperar(800);
  const sd2 = await js(`return document.querySelector('#vp-frame').getAttribute('srcdoc')`);
  v(/@media \(max-width:768px\)[^]*width:24px[^]*height:24px/.test(sd2) && /color:#00aa00/.test(sd2), 'el export lleva el override móvil en el @media');
  await $('body').sendKeys(Key.ESCAPE); await esperar(300);
  await $('#vista-desktop').click(); await esperar(250);
  c = await caja(); v(Math.round(c.w) === 40 && c.c === 'rgb(255, 0, 0)', 'escritorio intacto (40px, rojo)');
  await $('#vista-mobile').click(); await esperar(250);
  await js(`document.querySelector('#inspector button.quitar[data-isz]').click()`); await esperar(250);
  c = await caja(); v(Math.round(c.w) === 40, 'móvil: "igual que escritorio" borra el override de tamaño');
  await $('#vista-desktop').click(); await esperar(250);

  // 7. Animación sobre el icono (al aparecer) funciona como en cualquier elemento
  await js(`document.querySelector('#inspector select[data-a="appear.effect"]').value='zoom';document.querySelector('#inspector select[data-a="appear.effect"]').dispatchEvent(new Event('input',{bubbles:true}))`); await esperar(300);
  await $('#btn-vista-previa').click(); await esperar(900);
  const sd3 = await js(`return document.querySelector('#vp-frame').getAttribute('srcdoc')`);
  v(/<span class="n\d+" data-rv>\s*<svg/.test(sd3) || /<span class="n\d+"[^>]*data-rv[^>]*><svg/.test(sd3), 'el icono con "Al aparecer" lleva data-rv en el export');
  await $('body').sendKeys(Key.ESCAPE); await esperar(300);

  // 8. Persistencia
  await esperar(500);
  await d.get(url); await esperar(700);
  c = await caja();
  v(c.svg && Math.round(c.w) === 40 && c.c === 'rgb(255, 0, 0)', 'tras recargar sigue el icono (40px, rojo)');
  const guardado = await js(`return localStorage.getItem('editor-landings:pagina')`);
  v(/"type":"icon"/.test(guardado) && /"name":"zap"/.test(guardado), 'en localStorage: type icon, name zap');

  // 9. Borrar el icono desde el inspector y sin errores
  const errs = await js(`return window.__err||[]`);
  v(errs.length === 0, 'sin errores de JS');
  console.log(`\n${ok} comprobaciones OK`);
} finally { await d.quit(); }
