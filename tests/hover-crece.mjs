// Hover NUEVO "Fondo que crece" (técnica V6 del banco de comparación) + aviso de "Agrandar" en el inspector.
//  - Un ::before de color crece (scale .85 -> 1.06) y aparece (opacity 0 -> 1) DETRÁS del texto; el texto y la caja del botón NO cambian
//    de tamaño ni de sitio (se compara con "Agrandar", que sí los cambia: control negativo), sin transform/scale/will-change/filter en el texto.
//  - Se comprueba en el export (archivo) y en el lienzo del editor (dist), con el ratón real, y por píxeles que el color sobresale por los bordes.
//  - Color del texto al pasar (opcional), imágenes que se saltan, el JSON lo conserva y Copiar/pegar efectos lo respeta.
//  - Inspector: la opción existe, "Agrandar" muestra el aviso corto de Firefox y los demás efectos no; duración por defecto 0,25 s.
// Ejecutar: npm run build && node tests/hover-crece.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Builder, By } from 'selenium-webdriver';
import { createNode as n, normalizePage, walk } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { efectosParaNodo } from '../src/animations/copiar.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';
import { leerPng } from '../tools/png.mjs';

let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('tmp-logs', { recursive: true });

const COLOR = '#ff0000';
const boton = (id, hover, base = {}) => {
  const b = n('button', { name: id, content: { text: 'Ver más', href: '#', anchor: id } });
  b.styles.base = { display: 'inline-block', padding: '16px 32px', fontSize: '18px', background: '#ffffff', color: '#111111', border: '1px solid #111111', borderRadius: '12px', margin: '40px', ...base };
  b.animation = { hover: { duration: 0.2, ease: 'suave', color: COLOR, ...hover } };
  return b;
};
const crea = (hijos) => { const p = n('page', { name: 'P', content: { title: 'T' } }); const s = n('section', { name: 'S' }); s.styles.base = { padding: '40px', background: '#ffffff' }; s.children.push(...hijos); p.children.push(s); return p; };

// ---------- 1) CSS del export (sin navegador) ----------
{
  const h = exportHTML(crea([boton('crece', { effect: 'bgrow' })]));
  const css = h.match(/<style>([\s\S]*?)<\/style>/)[1];
  v(/\.n\d+::before\{content:'';position:absolute;inset:0;border-radius:inherit;background:#ff0000;opacity:0;transform:scale\(\.85\)/.test(css), 'CSS: el ::before nace transparente y encogido (scale .85) con el color elegido');
  v(/:hover::before\{opacity:1;transform:scale\(1\.06\)\}/.test(css), 'CSS: en hover pasa a opacity 1 y scale 1.06');
  v(/::before\{[^}]*z-index:-1[^}]*transition:transform 0\.2s [^;]*opacity 0\.2s/.test(css) && /isolation:isolate/.test(css), 'CSS: va detrás del texto (z-index -1 + isolation) y la transición es solo del pseudo-elemento');
  v(!/will-change|overflow:clip/.test(css), 'CSS: sin will-change y sin overflow:clip (tiene que sobresalir)');
  const sinTexto = css.replace(/::before\{[^}]*\}/g, '').replace(/:hover::before\{[^}]*\}/g, '');
  v(!/\.n\d+:hover\{[^}]*(transform|scale|filter)/.test(sinTexto), 'CSS: el botón y su texto no llevan transform ni filter en hover');
  const p2 = crea([boton('c2', { effect: 'bgrow', textoCambia: 'si', textoColor: '#00aa00' })]);
  const css2 = exportHTML(p2);
  v(/:hover\{transition:[^}]*color [^}]*;color:#00aa00!important\}/.test(css2), 'CSS: color del texto al pasar (con su transición de color) cuando se pide');
  const img = n('image', { name: 'img', content: { src: 'https://example.com/a.png', alt: 'a' } }); img.animation = { hover: { effect: 'bgrow', color: COLOR } };
  v(!/::before/.test(exportHTML(crea([img]))), 'CSS: una imagen no admite ::before y se salta');
  const normal = normalizePage(JSON.parse(JSON.stringify(crea([boton('x', { effect: 'bgrow', direccion: 'izq' })]))));
  let efecto; walk(normal, (x) => { if (x.name === 'x') efecto = x.animation?.hover?.effect; });
  v(efecto === 'bgrow', 'el JSON conserva el efecto al importar (no se descarta)');
  const orig = boton('o', { effect: 'bgrow' }); const dest = n('button', { name: 'd', content: { text: 'D', href: '#' } }); dest.styles.base = { background: '#fff' };
  const r = efectosParaNodo(JSON.parse(JSON.stringify(orig.animation)), dest, null);
  v(r.anim?.hover?.effect === 'bgrow' && !r.omitidos.length, 'Copiar/pegar efectos lo copia a otro botón con caja');
  const imgD = n('image', { name: 'i', content: { src: 'https://example.com/a.png', alt: '' } });
  v(efectosParaNodo(JSON.parse(JSON.stringify(orig.animation)), imgD, null).omitidos.length === 1, 'Copiar/pegar lo omite en una imagen (y avisa)');
}

// ---------- 2) Firefox: ratón real sobre el export y sobre el lienzo ----------
const medida = (d, sel) => d.executeScript(`const e=document.querySelector(arguments[0]);const r=e.getBoundingClientRect();const g=document.createRange();g.selectNodeContents(e);const t=g.getBoundingClientRect();
  const cs=getComputedStyle(e),b=getComputedStyle(e,'::before');
  return {caja:[r.left,r.top,r.width,r.height].map(x=>+x.toFixed(3)),texto:[t.left,t.top,t.width,t.height].map(x=>+x.toFixed(3)),
    textoTransform:cs.transform,textoScale:cs.scale,textoFilter:cs.filter,textoWill:cs.willChange,
    bTransform:b.transform,bOpacity:+b.opacity,bContent:b.content}`, sel);
const mover = (d, el, x = 0, y = 0) => d.actions({ async: true }).move({ origin: el, x, y }).perform();
const fuera = (d) => d.actions({ async: true }).move({ x: 3, y: 3 }).perform();
const comp = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 0.01);

async function probar(d, etiqueta, selCrece, selGrow, selBase) {
  const el = await d.findElement(By.css(selCrece)); const eg = await d.findElement(By.css(selGrow));
  await d.executeScript('document.documentElement.style.scrollBehavior="auto";arguments[0].scrollIntoView({block:"center",behavior:"instant"})', el); await esperar(300);
  await fuera(d); await esperar(500);
  const r0 = await medida(d, selCrece);
  v(r0.bOpacity === 0 && /matrix\(0?\.85, 0, 0, 0?\.85/.test(r0.bTransform), `${etiqueta}: en reposo el fondo está transparente y a escala .85 (${r0.bTransform}, opacidad ${r0.bOpacity})`);
  const R = await d.executeScript(`const r=arguments[0].getBoundingClientRect();return [Math.floor(r.left),Math.floor(r.top),Math.ceil(r.width),Math.ceil(r.height)]`, el);
  const cap0 = await d.takeScreenshot();
  await mover(d, el); await esperar(700);
  const r1 = await medida(d, selCrece); const cap1 = await d.takeScreenshot();
  v(r1.bOpacity === 1 && /matrix\(1\.06, 0, 0, 1\.06/.test(r1.bTransform), `${etiqueta}: en hover el fondo es opaco y a escala 1.06 (${r1.bTransform})`);
  v(comp(r0.caja, r1.caja), `${etiqueta}: la caja del botón no cambia de tamaño ni de sitio (${r0.caja.join(', ')})`);
  v(comp(r0.texto, r1.texto), `${etiqueta}: el texto no cambia de tamaño ni de sitio (${r0.texto.join(', ')})`);
  v(r1.textoTransform === 'none' && r1.textoScale === 'none' && r1.textoFilter === 'none' && r1.textoWill === 'auto', `${etiqueta}: el texto no lleva transform, scale, filter ni will-change`);
  // por píxeles: con el fondo rojo, sobresale por la izquierda del botón (a 2 px del borde) y en reposo ahí es blanco
  const A = leerPng(cap0), B = leerPng(cap1); const k = await d.executeScript('return devicePixelRatio');
  const px = (P, x, y) => P.px(Math.round(x * k), Math.round(y * k));
  const [x0, y0, w, h] = R; const fx = x0 - 3, fy = y0 + h / 2;
  const roj = (p) => p[0] > 200 && p[1] < 80 && p[2] < 80;
  v(!roj(px(A, fx, fy)) && roj(px(B, fx, fy)), `${etiqueta}: por píxeles, el color aparece fuera del borde del botón solo con el hover (el fondo crece más allá de la caja)`);
  v(roj(px(B, x0 + 6, y0 + h / 2 - 20)) || roj(px(B, x0 + 6, y0 + 6)), `${etiqueta}: y cubre el interior del botón`);
  await fuera(d); await esperar(700);
  const r2 = await medida(d, selCrece);
  v(r2.bOpacity === 0 && comp(r0.caja, r2.caja), `${etiqueta}: al salir vuelve a reposo`);
  // control negativo: Agrandar SÍ cambia caja/texto, así que la comparación de arriba distingue
  const g0 = await medida(d, selGrow); await mover(d, eg); await esperar(700); const g1 = await medida(d, selGrow);
  v(!comp(g0.texto, g1.texto) || !comp(g0.caja, g1.caja), `${etiqueta}: control negativo: Agrandar sí cambia la caja o el texto (${g0.texto[2]} -> ${g1.texto[2]} de ancho de texto)`);
  await fuera(d); await esperar(500);
}

const pagina = crea([boton('crece', { effect: 'bgrow' }), boton('grow', { effect: 'grow' })]);
const f = resolve('tmp-logs/hover-crece.html'); writeFileSync(f, exportHTML(pagina));
let d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1300, height: 900 });
  await d.get(pathToFileURL(f).href); await esperar(500);
  await probar(d, 'export', '#crece', '#grow');
} finally { await d.quit(); }

// ---------- 3) Editor (dist): lienzo + inspector ----------
d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1500, height: 1000 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  const base = crea([boton('crece', { effect: 'bgrow' }), boton('grow', { effect: 'grow' }), (() => { const b = n('button', { name: 'libre', content: { text: 'Libre', href: '#', anchor: 'libre' } }); b.styles.base = { padding: '16px 32px', margin: '40px' }; return b; })()]);
  const ids = {}; walk(base, (x) => { ids[x.name] = x.id; });
  await d.get(url);
  await d.executeScript(`localStorage.setItem('editor-landings:niveles','{"contenido":true,"estilo":true,"movimiento":true}');localStorage.setItem('editor-landings:pagina', arguments[0])`, JSON.stringify(base));
  await d.get(url); await esperar(900);
  await probar(d, 'lienzo del editor', `#preview [data-id="${ids.crece}"]`, `#preview [data-id="${ids.grow}"]`);
  // Inspector
  const sel = async (id) => { await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`); await esperar(250); };
  const opciones = () => d.executeScript(`return [...document.querySelectorAll('#inspector select[data-a="hover.effect"] option')].map(o=>o.textContent)`);
  const notaGrow = () => d.executeScript(`return [...document.querySelectorAll('#inspector p.modo')].map(p=>p.textContent).filter(t=>/Firefox/.test(t))`);
  await sel(ids.grow);
  const ng = await notaGrow();
  v(ng.length === 1 && /En Firefox el texto puede verse raro al agrandarse/.test(ng[0]), `inspector: Agrandar muestra el aviso corto ("${ng[0]?.trim()}")`);
  await sel(ids.crece);
  v((await notaGrow()).length === 0, 'inspector: "Fondo que crece" no muestra el aviso de Agrandar');
  v((await opciones()).includes('Fondo que crece'), 'inspector: la opción "Fondo que crece" existe en el hover de un botón con caja');
  v(await d.executeScript(`return !!document.querySelector('#inspector [data-a="hover.color"]') && !!document.querySelector('#inspector [data-a="hover.textoCambia"]')`), 'inspector: con Fondo que crece salen "Color de relleno" y "Color del texto al pasar"');
  await sel(ids.libre);
  v((await opciones()).includes('Fondo que crece'), 'inspector: la opción también está en un botón sin caja');
  // elegirla desde el inspector: se guarda y la duración por defecto es 0,25 s
  await d.executeScript(`const s=document.querySelector('#inspector select[data-a="hover.effect"]');s.value='bgrow';s.dispatchEvent(new Event('input',{bubbles:true}))`); await esperar(500);
  const g = JSON.parse(await d.executeScript(`return localStorage.getItem('editor-landings:pagina')`));
  let libre; walk(g, (x) => { if (x.name === 'libre') libre = x; });
  v(libre.animation?.hover?.effect === 'bgrow' && libre.animation.hover.duration === 0.25, `inspector: elegirlo lo guarda con duración 0,25 s (${JSON.stringify(libre.animation?.hover)})`);
  // deshacer
  await d.executeScript(`document.body.focus()`);
  await d.actions({ async: true }).keyDown('').sendKeys('z').keyUp('').perform(); await esperar(700);
  const g2 = JSON.parse(await d.executeScript(`return localStorage.getItem('editor-landings:pagina')`));
  let libre2; walk(g2, (x) => { if (x.name === 'libre') libre2 = x; });
  v(libre2.animation?.hover?.effect !== 'bgrow', 'inspector: Ctrl+Z deshace la elección del efecto');
} finally { await d.quit(); }
console.log(`\n${ok} comprobaciones OK`);
