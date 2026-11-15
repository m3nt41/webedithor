// Copiar / pegar efectos (Selenium en Firefox sobre dist/editor.html).
// Cubre: lógica pura (filtros), Ctrl+Alt+C / Ctrl+Alt+V, "Pegar en hermanos", copias independientes, estilos base intactos,
// un solo Ctrl+Z por pegado, imagen que omite el hover Subrayado con aviso, y el export con el efecto en todos.
// Ejecutar: npm run build && node tests/copiar-efectos.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Key } from 'selenium-webdriver';
import { createNode as n, findNode } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { efectosParaNodo, copiarAnimacion } from '../src/animations/copiar.js';
import { normalizarAnimacion } from '../src/animations/normalizar.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina';
let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };

const enlace = (t) => n('button', { name: t, content: { text: t, href: '#' }, styles: { color: 'inherit', fontSize: '15px' } });
const [b1, b2, b3, b4] = ['Uno', 'Dos', 'Tres', 'Cuatro'].map(enlace);
b1.animation = { hover: { effect: 'underline', direccion: 'der', grosor: 3, duration: 0.3 }, appear: { effect: 'fade' } };
const img = n('image', { name: 'Foto', content: { src: 'https://example.com/a.png', alt: 'a' } });
const vacio = n('button', { name: 'Sin efectos', content: { text: 'x', href: '#' } });
const links = n('container', { name: 'Links', children: [b1, b2, b3, b4, vacio] });
const tit = n('heading', { name: 'Titulo', content: { text: 'Hola', level: 2 } });
const nav = n('section', { name: 'Nav', children: [links, img, tit] });
const pagina = n('page', { name: 'Página', content: { title: 'x' } });
pagina.children.push(nav);

// ---- Lógica pura ----
{
  const copia = copiarAnimacion(b1);
  v(copia && copia !== b1.animation && copia.hover !== b1.animation.hover, 'copiarAnimacion clona en profundidad');
  v(copiarAnimacion(vacio) === null, 'un nodo sin efectos no copia nada');
  const aImg = efectosParaNodo(copia, img, nav);
  v(!aImg.anim.hover && aImg.anim.appear && aImg.omitidos.length === 1 && /Subrayado/.test(aImg.omitidos[0]), 'imagen: omite Subrayado, conserva appear');
  const relleno = { hover: { effect: 'fill', modo: 'fundido', color: '#f00' } };
  const sinCaja = efectosParaNodo(relleno, enlace('t'), links);
  v(!sinCaja.anim && sinCaja.omitidos.length === 1, 'Relleno sobre botón sin caja se omite');
  const conCaja = n('button', { name: 'c', styles: { backgroundColor: '#000' } });
  v(efectosParaNodo(relleno, conCaja, links).anim?.hover?.effect === 'fill', 'Relleno sobre botón con caja se pega');
  const focoEnTitulo = efectosParaNodo({ focus: { effect: 'ring' } }, n('heading'), nav);
  v(!focoEnTitulo.anim && focoEnTitulo.omitidos.length === 1, 'Foco sobre un título (no admite) se omite');
}

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
const leerPagina = async () => JSON.parse(await d.executeScript(`return localStorage.getItem('${LS}')`));
const pagLimpia = (p) => JSON.stringify(p, (k, x) => (k === 'animation' ? undefined : x));
/** Espera a que el autoguardado refleje un cambio (compara con el JSON anterior). */
const esperarGuardado = async (antes) => { for (let i = 0; i < 40; i++) { await esperar(100); const a = JSON.stringify(await leerPagina()); if (a !== antes) return; } };
const seleccionar = async (id) => { await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`); await esperar(250); await d.executeScript('document.activeElement && document.activeElement.blur()'); };
const atajo = async (letra) => { await d.actions({ async: true }).keyDown(Key.CONTROL).keyDown(Key.ALT).sendKeys(letra).keyUp(Key.ALT).keyUp(Key.CONTROL).perform(); await esperar(300); };
const toast = () => d.executeScript(`const t=document.getElementById('toast-ia'); return t && !t.hidden ? t.textContent : ''`);
// Lo pegado pasa por la validación (rellena campos por defecto), así que se compara con b1 normalizada y con claves ordenadas
const canon = (x) => JSON.stringify(x, (k, val) => (val && typeof val === 'object' && !Array.isArray(val) ? Object.fromEntries(Object.entries(val).sort()) : val));
const ESPERADO = canon(normalizarAnimacion(b1.animation, 'button'));
const animDe = (p, id) => findNode(p, id).animation;

try {
  await d.manage().window().setRect({ width: 1500, height: 900 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);

  // Los botones del inspector existen
  await seleccionar(b1.id);
  for (const sm of await d.findElements(By.css('#inspector details.nivel:not([open]) > summary'))) await sm.click();
  await esperar(200);
  const botones = await d.executeScript(`return [...document.querySelectorAll('#inspector [data-efectos]')].map(b => b.textContent)`);
  v(botones.length === 3 && /Copiar efectos/.test(botones[0]) && /Pegar efectos/.test(botones[1]), `el inspector tiene "Copiar efectos" y "Pegar efectos" (${botones.join(' | ')})`);

  // 1) Copiar de b1 con Ctrl+Alt+C
  await atajo('c');
  v(/Efectos copiados/.test(await toast()), 'Ctrl+Alt+C avisa "Efectos copiados"');

  // 2) Pegar en b2 con Ctrl+Alt+V
  await seleccionar(b2.id);
  let antes = JSON.stringify(await leerPagina());
  await atajo('v');
  await esperarGuardado(antes);
  let p = await leerPagina();
  v(/pegados en 1 elemento/.test(await toast()), 'Ctrl+Alt+V avisa "Efectos pegados en 1 elemento"');
  v(canon(animDe(p, b2.id)) === ESPERADO, 'b2 recibió hover + appear con todos sus campos');

  // 3) Pegar en hermanos del mismo tipo desde b3 (b2, b3, b4, "Sin efectos"; se salta b1 = origen) con UN clic
  await seleccionar(b3.id);
  const estadoAntes = await leerPagina();
  antes = JSON.stringify(estadoAntes);
  const btnHermanos = await d.findElement(By.css('#inspector [data-efectos="hermanos"]'));
  await btnHermanos.click();
  await esperarGuardado(antes);
  p = await leerPagina();
  const toastH = await toast();
  v(/pegados en 4 elementos/.test(toastH), `"Pegar en hermanos" avisa "Efectos pegados en 4 elementos" (${toastH})`);
  for (const id of [b2.id, b3.id, b4.id, vacio.id]) v(canon(animDe(p, id)) === ESPERADO, `${findNode(p, id).name} tiene el efecto`);
  // estilos base, texto y ids intactos
  const mismos = [b1, b2, b3, b4, vacio].every((o) => { const nuevo = findNode(p, o.id); return JSON.stringify(nuevo.styles) === JSON.stringify(o.styles) && JSON.stringify(nuevo.content) === JSON.stringify(o.content) && nuevo.name === o.name; });
  v(mismos, 'estilos, contenido y nombres de todos los botones quedaron intactos');
  v(canon(animDe(p, b1.id)) === canon(b1.animation), 'el origen (b1) no cambió');

  // 4) Independencia: cambiar el grosor de b3 desde el inspector no cambia b2, b4 ni b1
  await d.executeScript(`const i=document.querySelector('#inspector [data-a="hover.grosor"]'); i.value='4'; i.dispatchEvent(new Event('input',{bubbles:true}))`);
  antes = JSON.stringify(await leerPagina());
  await esperarGuardado(antes);
  p = await leerPagina();
  v(animDe(p, b3.id).hover.grosor === 4 && animDe(p, b2.id).hover.grosor === 3 && animDe(p, b4.id).hover.grosor === 3 && animDe(p, b1.id).hover.grosor === 3, 'cambiar b3 no cambia b1, b2 ni b4 (copias independientes)');

  // 5) Un solo Ctrl+Z revierte todo el pegado en hermanos (primero el cambio de grosor, luego el pegado)
  await d.findElement(By.css('#btn-undo')).click(); await esperar(1500); // revierte el grosor (espera a que se guarde)
  await d.findElement(By.css('#btn-undo')).click(); // revierte el pegado en hermanos (¡uno solo!)
  await esperar(1500);
  p = await leerPagina();
  v(canon(animDe(p, b2.id)) === ESPERADO, 'tras UN undo, b2 conserva lo pegado antes (con el atajo)');
  v(!animDe(p, b3.id) && !animDe(p, b4.id) && !animDe(p, vacio.id), 'tras UN undo, b3, b4 y "Sin efectos" vuelven a no tener efectos');
  await d.findElement(By.css('#btn-redo')).click(); await esperar(1500); // rehacer para el export
  await d.findElement(By.css('#btn-redo')).click(); await esperar(1500);
  p = await leerPagina();
  v(animDe(p, b3.id)?.hover?.grosor === 4, 'redo rehace el grosor 4 (el pegado se rehízo con un solo paso)');

  // 6) Imagen: hover Subrayado omitido con aviso; appear sí se pega
  await seleccionar(img.id);
  antes = JSON.stringify(await leerPagina());
  await atajo('v');
  await esperarGuardado(antes);
  p = await leerPagina();
  const toastI = await toast();
  v(/pegados en 1 elemento/.test(toastI) && /Omitido/.test(toastI) && /Subrayado/.test(toastI), `la imagen avisa lo omitido (${toastI})`);
  const aImg = animDe(p, img.id);
  v(aImg && aImg.appear?.effect === 'fade' && !aImg.hover, 'la imagen tiene appear pero NO hover Subrayado');

  // 7) Copiar de un nodo sin efectos: avisa y no machaca el portapapeles
  await seleccionar(tit.id);
  await atajo('c');
  v(/no tiene efectos/.test(await toast()), 'copiar de un título sin efectos avisa "no tiene efectos"');

  // 8) Export: el navbar lleva el subrayado en b1, b2, b3, b4 y "Sin efectos" (5), y NO en la imagen
  const html = exportHTML(await leerPagina());
  const hov = (html.match(/:hover::before\{transform:scaleX\(1\)\}/g) || []).length;
  v(hov === 5, `el export lleva el hover en los 5 botones (${hov})`);
  console.log(`\n${ok} comprobaciones OK`);
} finally { await d.quit(); }
