// Prueba en Firefox real de la interfaz en inglés: arranca en el idioma del navegador, recorre los paneles de
// cada tipo de elemento con las animaciones encendidas y busca texto en español o claves sin traducir; el selector
// de la barra cambia a español y se recuerda. Ejecutar: node tests/i18n-ui.mjs  (necesita dist/editor.html: npm run build)
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import { opcionesFirefox } from '../tools/lib-tests.mjs';
import es from '../src/i18n/es.js';
import en from '../src/i18n/en.js';

// Textos de es.js que en inglés son otra cosa: ninguno puede verse con la interfaz en inglés.
const enValores = new Set(Object.values(en));
const SOLO_ES = new Set(Object.keys(es).filter((k) => es[k] !== en[k] && !enValores.has(es[k])).map((k) => es[k]));

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox().setPreference('intl.accept_languages', 'en-US, en')).build();
let ok = 0;
const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };
const js = (c, ...a) => d.executeScript(c, ...a);
const clic = async (css) => { await d.findElement(By.css(css)).click(); await esperar(150); };

// Todo el texto de la INTERFAZ (no la página que se edita, ni lo que son datos: nombres de capas, valores, JSON).
const TEXTOS = `
  const fuera = '.stage, #arbol span, pre, textarea, #sel-idioma, #hint-elemento';
  const out = new Set();
  for (const raiz of document.querySelectorAll('#toolbar, #sidebar, #inspector, #vista-previa, dialog, #toast-ia, .tir-capa, #aviso-pestanas, #aviso-guardado')) {
    const w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) if (!n.parentElement.closest(fuera) && n.textContent.trim()) out.add(n.textContent.trim());
    for (const el of [raiz, ...raiz.querySelectorAll('*')]) {
      if (el.closest('.stage, #arbol span, #sel-idioma')) continue;
      for (const a of ['title', 'aria-label', 'placeholder']) if (el.getAttribute(a)) out.add(el.getAttribute(a));
    }
  }
  for (const el of document.querySelectorAll('#sidebar, #preview, #inspector')) out.add(el.getAttribute('aria-label') || '');
  return [...out];`;
const SOSPECHOSO = /[áéíóúñ¿¡]|(?<![\w-])(el|los|las|del|con|sin|para|una|que|al|por|texto|fondo|borde|ancho|alto|igual|quitar|otro|ninguno|efecto|bloque|capa)(?![\w-])/i;
const CLAVE = /^[a-z]+\.[a-zA-Z_0-9]+$/;
const malos = new Map();
const revisar = async (donde) => {
  for (const s of await js(TEXTOS)) if ((SOLO_ES.has(s) || SOSPECHOSO.test(s.replace('(Del)', '')) || CLAVE.test(s)) && !malos.has(s)) malos.set(s, donde); // (Del) = la tecla
};
const abrirTodo = () => js(`document.querySelectorAll('#inspector details').forEach((x) => { x.open = true; })`);

try {
  await d.manage().window().setRect({ width: 1300, height: 900 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url); await js('localStorage.clear()'); await d.get(url); await esperar(600);

  v((await js('return document.documentElement.lang')) === 'en', 'navegador en inglés: <html lang="en">');
  v((await d.findElement(By.css('#btn-exportar')).getText()) === 'Export HTML', 'la barra arranca en inglés');
  v((await js('return document.getElementById("sel-idioma").value')) === 'en', 'el selector marca English');
  await revisar('arranque vacío');

  // Paleta: todos los bloques y elementos
  for (const tab of ['bloques', 'elementos', 'capas']) { await clic(`#tab-${tab}`); await revisar('pestaña ' + tab); }
  // Un bloque de cada tipo con partes distintas del inspector + todos los elementos sueltos
  await js(`const t = [...document.querySelectorAll('.bloque')]; for (const b of t) b.querySelector('.variantes button').click();`);
  await esperar(500);
  await js(`document.querySelectorAll('#botones-elementos button').forEach((b) => b.click())`);
  await esperar(500);
  await revisar('con bloques');

  // Una fila de capas por cada combinación de tipo y nombre: se revisa apagado y con las animaciones encendidas
  await clic('#tab-capas');
  const ids = await js(`const p = JSON.parse(localStorage.getItem('editor-landings:pagina') || 'null'); const vistos = new Map();
    const ir = (n, nivel) => { const k = n.type + '|' + n.name + '|' + Boolean(n.content?.marquesina) + '|' + Boolean(n.animation?.scene); if (!vistos.has(k)) vistos.set(k, n.id); n.children.forEach((h) => ir(h)); };
    p.children.forEach((n) => ir(n)); return [...vistos.values()];`);
  v(ids.length > 15, `hay ${ids.length} elementos distintos que revisar`);
  for (const id of ids) {
    const fila = await d.findElements(By.css(`#arbol li[data-id="${id}"]`));
    if (!fila.length) continue;
    await js('arguments[0].click()', fila[0]); await esperar(80);
    await abrirTodo(); await revisar('inspector ' + id);
    // enciende cada grupo de animación (primer efecto de su lista) y añade un estado
    const grupos = await js(`return [...document.querySelectorAll('#inspector select[data-a]')].map((s) => s.dataset.a)`);
    for (const a of grupos) {
      await js(`const s = document.querySelector('#inspector select[data-a="' + arguments[0] + '"]'); if (!s || s.value) return;
        const o = [...s.options].find((x) => x.value); if (!o) return; s.value = o.value; s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true }));`, a);
      await esperar(60); await abrirTodo(); await revisar(`animación ${a}`);
    }
    await js(`document.querySelector('#inspector [data-vact="add"]')?.click()`); await esperar(80); await abrirTodo(); await revisar('estados ' + id);
  }

  await clic('#vista-mobile'); await abrirTodo(); await revisar('vista móvil'); await clic('#vista-desktop');
  await clic('#btn-pagina'); await abrirTodo(); await revisar('ajustes de la página');
  await clic('[data-ia="pegar"]'); await revisar('diálogo de plan');
  await js(`document.querySelector('#dlg-plan-txt').value = '{"plan":1,"secciones":[{"bloque":"zz"}]}'`);
  await clic('#dlg-plan-ok'); await revisar('error del plan'); await clic('#dlg-plan-cancel');
  await clic('#btn-vista-previa'); await revisar('vista previa'); await clic('#vp-ojo');

  if (malos.size) console.log([...malos].map(([s, donde]) => `  SOBRA  ${JSON.stringify(s)}  (${donde})`).join('\n'));
  v(malos.size === 0, 'no queda texto en español ni claves sin traducir en la interfaz');

  // La barra cabe sin desbordar en una ventana mediana (los textos en inglés y el selector)
  await d.manage().window().setRect({ width: 1100, height: 800 }); await esperar(200);
  v(await js('const b = document.getElementById("toolbar"); return b.scrollWidth <= b.clientWidth + 1'), 'la barra no se desborda a 1100 px de ancho');

  // Selector: cambia a español, recarga y se recuerda aunque el navegador esté en inglés
  const antes = await js('return localStorage.getItem("editor-landings:pagina")');
  await js(`const s = document.getElementById('sel-idioma'); s.value = 'es'; s.dispatchEvent(new Event('change', { bubbles: true }));`);
  await esperar(900);
  v((await d.findElement(By.css('#btn-exportar')).getText()) === 'Exportar HTML', 'selector en Español: la interfaz cambia');
  v((await js('return document.documentElement.lang')) === 'es' && (await js('return localStorage.getItem("editor-landings:idioma")')) === 'es', 'la elección queda guardada');
  v((await js('return localStorage.getItem("editor-landings:pagina")')) === antes, 'cambiar de idioma no toca la página guardada');
  await d.get(url); await esperar(600);
  v((await d.findElement(By.css('#btn-exportar')).getText()) === 'Exportar HTML', 'al volver a abrir sigue en español');

  console.log(`\n${ok} comprobaciones OK`);
} finally {
  await d.quit();
}
