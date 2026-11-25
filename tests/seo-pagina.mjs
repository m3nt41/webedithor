// SEO de la página: idioma (<html lang>), meta description y Open Graph (core/seo.js, tree.js, exporter.js, inspector).
// Parte A (Node puro): validación, exportación, escapado y "sin los campos nuevos el HTML es idéntico".
// Parte B (Firefox real sobre dist/editor.html): se escribe en Ajustes de la página y se comprueba el JSON guardado y la Vista previa (export real).
// Ejecutar: npm run build && node tests/seo-pagina.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import { createNode as n, normalizePage } from '../src/core/tree.js';
import { createBlock } from '../src/blocks/index.js';
import { exportHTML } from '../src/export/exporter.js';
import { langValido, ogImagenValida, limpiarDescripcion, metaSeoHtml } from '../src/core/seo.js';
import { leerQuitados } from '../src/core/seguridad.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let comprobaciones = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); comprobaciones++; };
const eq = (a, b, msg) => { assert.equal(a, b, msg); comprobaciones++; };
const cabeza = (html) => html.slice(0, html.indexOf('<style>'));
const copia = (o) => JSON.parse(JSON.stringify(o));

function paginaBase(content = {}) {
  const p = n('page', { name: 'Página', content: { title: 'Mi página', ...content } });
  p.children.push(createBlock('navbar', 'claro'), createBlock('hero', 'oscuro'));
  return p;
}

// ---------- Parte A: Node puro ----------
// A1. Sin los campos nuevos nada cambia: lang="es" y ninguna meta extra.
{
  const h = exportHTML(normalizePage(copia(paginaBase())));
  ok(h.includes('<html lang="es">'), 'A1: lang="es" por defecto');
  ok(!/<meta (name="description"|property="og:|name="twitter:)/.test(h), 'A1: sin meta de SEO si no hay campos');
  ok(cabeza(h).endsWith('<title>Mi página</title>\n'), 'A1: el <head> queda exactamente como antes (nada entre <title> y <style>)');
}
// A2. Con los campos: salen donde toca, en orden, y el idioma cambia.
{
  const p = normalizePage(copia(paginaBase({ description: 'Café de especialidad en San José.', ogImage: 'https://ejemplo.com/portada.jpg', lang: 'en-US' })));
  const h = exportHTML(p);
  ok(h.includes('<html lang="en-US">'), 'A2: lang propio');
  ok(h.includes('<meta name="description" content="Café de especialidad en San José.">'), 'A2: meta description');
  ok(h.includes('<meta property="og:title" content="Mi página">'), 'A2: og:title = título');
  ok(h.includes('<meta property="og:description" content="Café de especialidad en San José.">'), 'A2: og:description');
  ok(h.includes('<meta property="og:image" content="https://ejemplo.com/portada.jpg">'), 'A2: og:image');
  ok(h.includes('<meta name="twitter:card" content="summary_large_image">'), 'A2: tarjeta grande si hay imagen');
  ok(h.indexOf('<title>') < h.indexOf('name="description"') && h.indexOf('og:image') < h.indexOf('<style>'), 'A2: las meta van entre <title> y <style>');
}
// A3. Solo descripción: sin imagen no hay og:image ni tarjeta grande. Solo imagen: no hay description.
{
  const a = exportHTML(normalizePage(copia(paginaBase({ description: 'Hola' }))));
  ok(a.includes('og:description') && !a.includes('og:image') && !a.includes('twitter:card'), 'A3: solo descripción');
  const b = exportHTML(normalizePage(copia(paginaBase({ ogImage: 'http://x.com/a.png' }))));
  ok(b.includes('og:image') && !b.includes('name="description"') && !b.includes('og:description'), 'A3: solo imagen');
}
// A4. Valores hostiles: se escapan o se descartan (y se cuentan), nunca llegan crudos al HTML.
{
  const antes = leerQuitados();
  const p = normalizePage(copia(paginaBase({
    description: 'Hola "><script>alert(1)</script> & <b>x</b>',
    ogImage: 'javascript:alert(1)',
    lang: 'es"><script>alert(2)</script>',
  })));
  const h = exportHTML(p);
  ok(!h.includes('<script>alert'), 'A4: ninguna etiqueta <script> inyectada');
  ok(!/alert\(2\)/.test(h) && !h.includes('javascript:'), 'A4: ni lang ni ogImage hostiles llegan al HTML');
  ok(h.includes('<html lang="es">'), 'A4: lang inválido vuelve a es');
  ok(h.includes('content="Hola &quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt; &amp; &lt;b&gt;x&lt;/b&gt;"'), 'A4: la descripción se escapa entera');
  eq(p.content.ogImage, undefined, 'A4: ogImage inválida se descarta');
  eq(p.content.lang, undefined, 'A4: lang inválido se descarta');
  eq(leerQuitados() - antes, 2, 'A4: se cuentan los 2 valores descartados (ogImage y lang)');
}
// A5. Tipos raros, vacíos, saltos de línea y límites.
{
  const antes = leerQuitados();
  const p = normalizePage(copia(paginaBase({ description: 42, ogImage: '', lang: '' })));
  ok(!('description' in p.content) && !('ogImage' in p.content) && !('lang' in p.content), 'A5: no-string y vacíos se quitan');
  eq(leerQuitados() - antes, 1, 'A5: solo el tipo raro (42) cuenta como descartado; lo vacío es "no hay"');
  eq(limpiarDescripcion('  una\n\n línea\t con   saltos '), 'una línea con saltos', 'A5: una sola línea');
  eq(limpiarDescripcion('x'.repeat(900)).length, 500, 'A5: tope de 500 caracteres');
  eq(limpiarDescripcion('a' + String.fromCharCode(0x2028) + 'b'), 'a b', 'A5: separador de línea Unicode');
  ok(langValido('es') && langValido('pt-BR') && langValido('zh-Hant-TW') && !langValido('e') && !langValido('es_MX') && !langValido('es-') && !langValido('español'), 'A5: langValido');
  ok(ogImagenValida('https://a.com/x.png?y=1&z=2') && !ogImagenValida('/x.png') && !ogImagenValida('ftp://a.com/x') && !ogImagenValida('https://a.com/x y.png') && !ogImagenValida('https://a.com/"x'), 'A5: ogImagenValida (solo http(s) absolutas)');
  eq(metaSeoHtml({}, 'T', (s) => s), '', 'A5: sin campos, sin meta');
}
// A6. Un .json con envoltorio, importado de verdad: los campos sobreviven al ciclo guardar -> abrir -> exportar.
{
  const envoltorio = { app: 'editor-landings', version: 1, page: paginaBase({ description: 'Ciclo completo', lang: 'pt' }) };
  const vuelta = normalizePage(JSON.parse(JSON.stringify(envoltorio)).page);
  eq(vuelta.content.description, 'Ciclo completo', 'A6: description sobrevive al ciclo');
  eq(vuelta.content.lang, 'pt', 'A6: lang sobrevive al ciclo');
  eq(exportHTML(vuelta), exportHTML(normalizePage(copia(vuelta))), 'A6: normalizar dos veces no cambia el export (idempotente)');
}
console.log(`OK parte A (Node): ${comprobaciones} comprobaciones`);

// ---------- Parte B: Firefox real ----------
const LS = 'editor-landings:pagina';
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1400, height: 1100 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(paginaBase()));
  await d.get(url); await esperar(700);
  const guardado = () => d.executeScript(`return JSON.parse(localStorage.getItem('${LS}')).content`);

  await d.findElement(By.css('#btn-pagina')).click(); await esperar(250);
  const vis = (css) => d.executeScript(`const e=document.querySelector(arguments[0]); return !!e && e.getClientRects().length>0 && !e.closest('details:not([open])')`, css);
  for (const css of ['[data-c="description"]', '[data-c="ogImage"]', '[data-c="lang"]']) ok(await vis(`#inspector ${css}`), `B1: ${css} visible en Ajustes de la página, sin abrir nada`);
  const t = await d.executeScript(`return [...document.querySelectorAll('#inspector h3')].map(h=>h.textContent)`);
  ok(t.includes('Buscadores y redes'), 'B1: existe el grupo "Buscadores y redes"');
  // leer nunca escribe: abrir la página con los campos vacíos no los guarda
  const inicial = await guardado();
  ok(!('description' in inicial) && !('ogImage' in inicial) && !('lang' in inicial), 'B1: abrir el inspector no escribe campos vacíos');

  // escribir en los tres campos
  await d.findElement(By.css('#inspector [data-c="description"]')).sendKeys('Estudio de diseño en San José.');
  await d.findElement(By.css('#inspector [data-c="ogImage"]')).sendKeys('https://ejemplo.com/portada.jpg');
  await d.findElement(By.css('#inspector [data-c="lang"]')).sendKeys('en');
  await esperar(500);
  const c1 = await guardado();
  eq(c1.description, 'Estudio de diseño en San José.', 'B2: description guardada');
  eq(c1.ogImage, 'https://ejemplo.com/portada.jpg', 'B2: ogImage guardada');
  eq(c1.lang, 'en', 'B2: lang guardado');

  // la Vista previa es el export real: sus <meta> y su lang
  await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(900);
  await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
  const r = await d.executeScript(`const m=(s)=>document.querySelector(s)?.getAttribute('content'); return { lang: document.documentElement.lang, desc: m('meta[name="description"]'), ogt: m('meta[property="og:title"]'), ogi: m('meta[property="og:image"]'), tw: m('meta[name="twitter:card"]') }`);
  await d.switchTo().defaultContent();
  eq(r.lang, 'en', 'B3: <html lang> en la vista previa');
  eq(r.desc, 'Estudio de diseño en San José.', 'B3: meta description en la vista previa');
  eq(r.ogt, 'Mi página', 'B3: og:title en la vista previa');
  eq(r.ogi, 'https://ejemplo.com/portada.jpg', 'B3: og:image en la vista previa');
  eq(r.tw, 'summary_large_image', 'B3: twitter:card en la vista previa');
  await d.actions().sendKeys('').perform(); await esperar(400); // Esc cierra la vista previa

  // vaciar los campos: vuelve el HTML de siempre (sin meta, lang="es")
  await d.findElement(By.css('#btn-pagina')).click(); await esperar(250);
  for (const k of ['description', 'ogImage', 'lang']) {
    const campo = await d.findElement(By.css(`#inspector [data-c="${k}"]`));
    await campo.clear(); await campo.sendKeys(' '); await campo.sendKeys(''); // clear no dispara 'input' en algunos casos: espacio + Retroceso sí
  }
  await esperar(500);
  await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(900);
  await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
  const v = await d.executeScript(`return { lang: document.documentElement.lang, metas: document.querySelectorAll('meta[name="description"],meta[property^="og:"],meta[name="twitter:card"]').length }`);
  await d.switchTo().defaultContent();
  eq(v.lang, 'es', 'B4: vaciado, vuelve lang="es"');
  eq(v.metas, 0, 'B4: vaciado, no queda ninguna meta de SEO');
  await d.actions().sendKeys('').perform();
  console.log('OK parte B (Firefox)');
} finally { await d.quit(); }
console.log(`OK seo-pagina: ${comprobaciones} comprobaciones`);
