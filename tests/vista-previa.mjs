// Prueba: "Vista previa" del editor (capa con iframe = HTML exportado). Firefox real, editor compilado (dist/editor.html, file://).
// Ejecutar: npm run build && node tests/vista-previa.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n } from '../src/core/tree.js';
import { createBlock } from '../src/blocks/index.js';
import { exportHTML } from '../src/export/exporter.js';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const pagina = n('page', { name: 'Página' });
pagina.children.push(createBlock('navbar', 'oscuro'), createBlock('hero'), createBlock('pricing'), createBlock('scene', 'textos'), createBlock('footer'));
// ancla de prueba en el pie para comprobar que un enlace # se queda dentro del iframe
const pie = pagina.children[pagina.children.length - 1];
pie.content = { ...(pie.content || {}), anchor: 'pie' };
pagina.children[0].children.push(n('button', { name: 'IrAlPie', content: { text: 'IrAlPie', href: '#pie' } }));

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').setBinary(FIREFOX)).build();
try {
  await d.manage().window().setRect({ width: 1300, height: 1000 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript('localStorage.setItem("editor-landings:pagina", arguments[0])', JSON.stringify(pagina));
  await d.get(url);
  await esperar(800);
  await d.executeScript(`window.__err=[];addEventListener('error',e=>__err.push(e.message));`);

  const guardadoAntes = await d.executeScript(`return localStorage.getItem('editor-landings:pagina')`);
  const abierta = async () => (await d.findElements(By.css('#vista-previa'))).length === 1;
  const abrir = async () => { await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(700); };
  const enFrame = async (fn) => { await d.switchTo().frame(await d.findElement(By.css('#vp-frame'))); try { return await fn(); } finally { await d.switchTo().defaultContent(); } };

  // 1. Abre y el iframe contiene el export actual (la página que guarda el editor)
  const paginaEditor = JSON.parse(guardadoAntes);
  await abrir();
  assert.ok(await abierta(), 'la capa no se abrió');
  const srcdoc = await d.executeScript(`return document.querySelector('#vp-frame').getAttribute('srcdoc')`);
  // Los <script> se comparan aparte: en el editor compilado van minificados (function.toString), en Node no; el resto (HTML y CSS) debe ser idéntico.
  const sinScripts = (h) => h.replace(/\r\n/g, '\n').replace(/<script>[\s\S]*<\/script>/, '<script/>');
  const esperado = exportHTML(paginaEditor);
  assert.equal(sinScripts(srcdoc), sinScripts(esperado), 'el iframe no contiene el export actual');
  assert.equal((srcdoc.match(/<script>/g) || []).length, (esperado.match(/<script>/g) || []).length, 'distinto número de scripts');
  assert.equal(await enFrame(() => d.executeScript('return innerWidth')) > 1000, true, 'escritorio: el iframe debería ser ancho');

  // 2. Scroll normal dentro del iframe y ancla # sin salir del iframe
  await enFrame(async () => { await d.executeScript('scrollTo(0,300)'); await esperar(300); assert.ok(await d.executeScript('return scrollY') > 100, 'no hay scroll en el iframe'); });
  await enFrame(async () => {
    await d.executeScript('scrollTo(0,0)'); await esperar(200);
    const b = await d.findElement(By.xpath(`//a[normalize-space(text())='IrAlPie']`));
    await b.click(); await esperar(800);
    assert.ok(await d.executeScript('return scrollY') > 300, 'el ancla # no desplazó el iframe');
    assert.ok(/^about:srcdoc/.test(await d.executeScript('return location.href')), 'el ancla sacó al iframe de srcdoc: ' + await d.executeScript('return location.href'));
  });
  assert.ok(await abierta(), 'el ancla cerró la capa');
  assert.ok(/editor\.html/.test(await d.getCurrentUrl()), 'el ancla navegó la ventana del editor');

  // 3. Móvil: 390px de ancho real dentro del iframe y alto de la ventana
  await d.findElement(By.css('#vp-mobile')).click(); await esperar(400);
  const m = await d.executeScript(`const r=document.querySelector('#vp-frame').getBoundingClientRect(),e=document.querySelector('.vp-escenario').getBoundingClientRect();return {w:r.width,h:r.height,hEsc:e.height,x:r.left+r.width/2,cx:innerWidth/2}`);
  assert.equal(m.w, 390, 'móvil: el iframe no mide 390px'); assert.ok(Math.abs(m.h - m.hEsc) < 1, 'móvil: no ocupa el alto'); assert.ok(Math.abs(m.x - m.cx) < 2, 'móvil: no está centrado');
  assert.equal(await enFrame(() => d.executeScript('return innerWidth')), 390, 'móvil: innerWidth dentro del iframe');
  await d.findElement(By.css('#vp-desktop')).click(); await esperar(300);
  assert.equal((await d.executeScript(`return document.querySelector('#vp-frame').getBoundingClientRect().width`)) > 1000, true, 'volver a escritorio');

  // 4. Esc cierra con el foco en el editor...
  await d.findElement(By.css('body')).sendKeys(Key.ESCAPE); await esperar(300);
  assert.equal(await abierta(), false, 'Esc no cerró (foco en el editor)');
  // ...y con el foco dentro del iframe
  await abrir();
  await enFrame(async () => { await d.findElement(By.css('body')).sendKeys(Key.ESCAPE); });
  await esperar(300);
  assert.equal(await abierta(), false, 'Esc no cerró (foco en el iframe)');
  // ...y el botón Cerrar
  await abrir(); await d.findElement(By.css('#vp-cerrar')).click(); await esperar(200);
  assert.equal(await abierta(), false, 'Cerrar no cerró');

  // 5. ↻ Reiniciar: recarga el iframe desde el inicio (scroll 0), conserva el modo Móvil, y el editor queda tal cual
  assert.equal(await d.executeScript(`return localStorage.getItem('editor-landings:pagina')`), guardadoAntes, 'la página del editor cambió');
  assert.equal(await d.executeScript(`return !document.querySelector('#btn-play')&&!document.querySelector('#etiqueta-play')`), true, 'el botón ▶ Reproducir no debería existir');
  await abrir();
  await enFrame(async () => { await d.executeScript('window.__marca=1;scrollTo(0,600)'); await esperar(300); assert.ok(await d.executeScript('return scrollY') > 100, 'sin scroll antes de reiniciar'); });
  await d.findElement(By.css('#vp-reiniciar')).click(); await esperar(900);
  await enFrame(async () => {
    assert.equal(await d.executeScript('return window.__marca||0'), 0, '↻ no recargó el iframe');
    assert.equal(await d.executeScript('return scrollY'), 0, '↻ no volvió a scroll 0');
  });
  assert.ok(await abierta(), '↻ cerró la capa');
  // en Móvil: reinicia y sigue en 390px
  await d.findElement(By.css('#vp-mobile')).click(); await esperar(300);
  await d.findElement(By.css('#vp-reiniciar')).click(); await esperar(900);
  assert.equal(await enFrame(() => d.executeScript('return innerWidth')), 390, '↻ perdió el modo Móvil');
  assert.equal(await d.executeScript(`return document.querySelector('#vp-mobile').getAttribute('aria-pressed')`), 'true', '↻ cambió el botón de modo');
  await d.findElement(By.css('#vp-cerrar')).click(); await esperar(200);
  const errs = await d.executeScript('return __err');
  assert.deepEqual(errs, [], 'errores: ' + errs.join(' | '));
  console.log('OK vista previa: export idéntico en srcdoc, scroll y ancla # dentro del iframe, móvil 390px, Esc (editor e iframe) y Cerrar, ↻ Reiniciar (recarga, scroll 0, conserva Móvil) y editor intacto');
} finally { await d.quit(); }
