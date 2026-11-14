// Prueba en Firefox real del camino 1 de la IA: copiar guía, pegar plan, Reemplazar / Añadir, un solo Undo, error visible.
// Ejecutar: node tests/plan-ia-ui.mjs  (necesita dist/editor.html: npm run build)
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { readFileSync } from 'node:fs';
import { Builder, By, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').setBinary(FIREFOX)).build();
const $ = (c) => d.findElement(By.css(c));
const $$ = (c) => d.findElements(By.css(c));
let ok = 0;
const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };
const secciones = () => d.executeScript('return JSON.parse(localStorage.getItem("editor-landings:pagina")).children.length');
const guardado = () => d.executeScript('return JSON.parse(localStorage.getItem("editor-landings:pagina"))');
const pegar = async (texto, modo) => {
  await $('#btn-pagina').click(); await esperar(150);
  await $('[data-ia="pegar"]').click(); await esperar(150);
  await d.executeScript('document.querySelector("#dlg-plan-txt").value = arguments[0]', texto);
  if (modo === 'anadir') await $('input[name="dlg-plan-modo"][value="anadir"]').click();
  await $('#dlg-plan-ok').click(); await esperar(300);
};
const plan = readFileSync('docs/plan-ejemplo.json', 'utf8');

try {
  await d.manage().window().setRect({ width: 1300, height: 900 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url); await d.executeScript('localStorage.clear()'); await d.get(url); await esperar(600);
  await d.executeScript(`window.__err=[];addEventListener('error',e=>__err.push(e.message));`);

  // 1. Los dos botones viven en Ajustes de la página, no en la barra de arriba
  v((await $$('#toolbar [data-ia]')).length === 0, 'la barra de arriba no tiene botones de IA');
  await $('#btn-pagina').click(); await esperar(150);
  v((await $('[data-ia="copiar"]').getText()).includes('Copiar guía para IA') && (await $('[data-ia="pegar"]').getText()).includes('Pegar plan o JSON'), 'Ajustes de la página: botones "Copiar guía para IA" y "Pegar plan o JSON"');

  // 2. Copiar guía: el portapapeles tiene el texto (se pega en un textarea con Ctrl+V)
  await $('[data-ia="copiar"]').click(); await esperar(300);
  v(await d.executeScript('const t=document.getElementById("toast-ia");return !!t&&!t.hidden&&/Guía copiada/.test(t.textContent)'), 'aparece el aviso "Guía copiada"');
  await d.executeScript('const t=document.createElement("textarea");t.id="zona-pegar";t.style.cssText="position:fixed;top:60px;left:300px;width:300px;height:80px;z-index:9999";document.body.append(t);t.focus()');
  await $('#zona-pegar').sendKeys(Key.chord(Key.CONTROL, 'v')); await esperar(300);
  const pegado = await d.executeScript('return document.getElementById("zona-pegar").value');
  const guiaDoc = readFileSync('docs/guia-ia.md', 'utf8');
  v(pegado.length > 1000 && pegado === guiaDoc, `el portapapeles tiene la guía completa (${pegado.length} caracteres, igual a docs/guia-ia.md)`);
  await d.executeScript('document.getElementById("zona-pegar").remove()');

  // 3. Pegar el plan de ejemplo con ruido de chat (``` y texto alrededor), Reemplazar
  await pegar('Claro, aquí tienes:\n```json\n' + plan + '\n```\nAvísame si quieres cambios.', 'reemplazar');
  v(await d.executeScript('return !document.getElementById("dlg-plan")'), 'el diálogo se cierra al aplicar sin avisos');
  v((await secciones()) === 8, 'Reemplazar: la página tiene las 8 secciones del plan');
  const g1 = await guardado();
  v(g1.content.title === 'Casa Almendro', 'el título del plan pasa a la página');
  const textos = await d.executeScript('return [...document.querySelectorAll(".stage h1,.stage h2")].map(e=>e.textContent).join("|")');
  v(textos.includes('Una casa tranquila a minutos de la playa'), 'la landing se ve en el preview con el texto del plan');
  const fondo = await d.executeScript('const s=document.querySelector(".stage section");return getComputedStyle(document.querySelectorAll(".stage section")[1]).fontFamily');
  v(/Georgia|Palatino|serif/i.test(fondo), 'tiene el tema (tipografía serif del tema) aplicado');

  // 4. Un solo Undo vuelve a la página vacía
  await $('#btn-undo').click(); await esperar(300);
  v((await secciones()) === 0, 'un solo Undo deshace todo el plan');
  await $('#btn-redo').click(); await esperar(300);
  v((await secciones()) === 8, 'Redo lo recupera');

  // 5. Añadir al final: +2 secciones con ids distintos y un solo Undo
  const mini = JSON.stringify({ plan: 1, secciones: [{ bloque: 'hero', variante: 'oscuro', valores: { 1: 'Añadido uno' } }, { bloque: 'footer' }] });
  await pegar(mini, 'anadir');
  v((await secciones()) === 10, 'Añadir al final: 8 + 2 = 10 secciones');
  const g2 = await guardado();
  v(g2.children[8].children.some((h) => h.content?.text === 'Añadido uno'), 'las nuevas quedan al final, en orden');
  const ids = new Set(); let dup = false; const rec = (n) => { if (ids.has(n.id)) dup = true; ids.add(n.id); n.children.forEach(rec); }; rec(g2);
  v(!dup, 'sin ids repetidos');
  v(g2.content.title === 'Casa Almendro', 'Añadir no cambia el título');
  await $('#btn-undo').click(); await esperar(300);
  v((await secciones()) === 8, 'un solo Undo quita las dos añadidas');

  // 6. Plan roto: error visible y no cambia nada
  const antes = await d.executeScript('return localStorage.getItem("editor-landings:pagina")');
  await pegar(JSON.stringify({ plan: 1, secciones: [{ bloque: 'hero' }, { bloque: 'inventado' }, { bloque: 'footer', variante: 'zzz' }] }), 'reemplazar');
  const msg = await d.executeScript('const m=document.getElementById("dlg-plan-msg");return m&&!m.hidden?m.textContent:null');
  v(!!msg && /No se aplicó nada/.test(msg) && /Sección 2/.test(msg) && /"inventado"/.test(msg) && /Sección 3/.test(msg) && /"zzz"/.test(msg), 'error visible en lenguaje claro, con la sección y el bloque/variante: ' + msg?.slice(0, 90));
  v(await d.executeScript('return !!document.getElementById("dlg-plan")?.open'), 'el diálogo sigue abierto para corregir');
  v((await d.executeScript('return localStorage.getItem("editor-landings:pagina")')) === antes, 'no cambió nada de la página');
  await d.executeScript('document.querySelector("#dlg-plan-txt").value = "esto no es json"');
  await $('#dlg-plan-ok').click(); await esperar(200);
  v(/ningún JSON/.test(await $('#dlg-plan-msg').getText()), 'texto sin JSON: mensaje claro');

  // 7. Aviso (hueco inexistente): se aplica y muestra el aviso; "Listo" cierra
  await $('#dlg-plan-cancel').click(); await esperar(200);
  await pegar(JSON.stringify({ plan: 1, secciones: [{ bloque: 'hero', variante: 'oscuro', valores: { 1: 'Con aviso', 77: 'x' } }] }), 'reemplazar');
  v(/hueco "77" no existe/.test(await $('#dlg-plan-msg').getText()), 'hueco inexistente: se aplica y muestra el aviso');
  v((await secciones()) === 1, 'con avisos igual se aplicó');
  await $('#dlg-plan-ok').click(); await esperar(200);
  v(await d.executeScript('return !document.getElementById("dlg-plan")'), '"Listo" cierra el diálogo');

  // 8. JSON de página completa (el mismo de Abrir JSON), Reemplazar
  const pag = await guardado();
  await pegar(JSON.stringify(pag), 'reemplazar');
  v((await secciones()) === 1, 'JSON de página completa: se acepta');
  await pegar(JSON.stringify(pag), 'anadir');
  v((await secciones()) === 2, 'JSON de página completa + Añadir al final');

  // 9. Esc cierra el diálogo sin cambiar nada; sin errores JS
  await $('#btn-pagina').click(); await $('[data-ia="pegar"]').click(); await esperar(150);
  await $('#dlg-plan-txt').sendKeys(Key.ESCAPE); await esperar(200);
  v(await d.executeScript('return !document.getElementById("dlg-plan")'), 'Esc cierra el diálogo');
  v((await d.executeScript('return window.__err.length')) === 0, 'sin errores de JS');
  console.log(`\n${ok} comprobaciones OK`);
} catch (e) {
  console.error('FALLO:', e.message);
  process.exitCode = 1;
} finally {
  await d.quit();
}
