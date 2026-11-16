// UNDO DESPUÉS DE USAR UN SLIDER (Opacidad de sombra / Capa oscura).
// Reproduce el bug: con el foco en el slider, Ctrl+Z no llegaba al editor (el atajo ignora INPUT) y, al deshacer,
// el slider no se actualizaba (el panel no se reconstruye mientras tiene el foco), así que no se veía qué se deshacía.
// Mide: pasos de historial por toque/arrastre/flechas, si Ctrl+Z llega con el foco en el slider, y que el slider refleje el árbol.
// Ejecutar: npm run build && node tests/undo-sliders.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Key, Origin } from 'selenium-webdriver';
import { createNode as n } from '../src/core/tree.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina';
let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };
const PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const pagina = n('page', { name: 'Página', content: { title: 'x' } });
const sec = n('section', { name: 'Sec', styles: { padding: '40px 20px', fondoImagen: PX, fondoCapa: '20' } });
const txt = n('text', { name: 'Txt', content: { text: 'Texto' }, styles: { sombra: '0 4px 12px 0 rgba(0,0,0,0.5)' } });
sec.children.push(txt); pagina.children.push(sec);

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1500, height: 800 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  const cargar = async () => {
    await d.get(url);
    await d.executeScript(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
    await d.get(url); await esperar(700);
  };
  // Pasos de Undo disponibles = clics en el botón Deshacer hasta que se deshabilita (el botón no depende del foco). Se rehacen después.
  const pasosUndo = async () => {
    let c = 0;
    while (!(await d.executeScript(`return document.querySelector('#btn-undo').disabled`)) && c < 200) { await d.executeScript(`document.querySelector('#btn-undo').click()`); c++; }
    for (let i = 0; i < c; i++) await d.executeScript(`document.querySelector('#btn-redo').click()`);
    return c;
  };
  const abrirTodo = async () => { for (const sm of await d.findElements(By.css('#inspector details.nivel:not([open]) > summary'))) await sm.click(); await esperar(200); };
  const seleccionar = async (id) => {
    await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    await esperar(300); await abrirTodo();
  };
  // Estado observable: slider (valor y número) + árbol (alfa de la sombra o fondoCapa) + si el slider tiene el foco
  const estado = (selSlider, nodoId, capa) => d.executeScript(`
    const r = document.querySelector(arguments[0]); const out = r.parentElement.querySelector('output');
    const buscar = (nd, id) => nd.id === id ? nd : (nd.children ?? []).map((h) => buscar(h, id)).find(Boolean);
    return new Promise((res) => setTimeout(() => {
      const arb = JSON.parse(localStorage.getItem('${LS}')); const nd = buscar(arb, arguments[1]);
      const m = /,\\s*([\\d.]+)\\)\\s*$/.exec(nd.styles.base.sombra ?? '');
      res({ slider: +r.value, num: out.textContent, arbol: arguments[2] ? +nd.styles.base.fondoCapa : (m ? Math.round(+m[1] * 100) : null), foco: document.activeElement === r });
    }, 700));`, selSlider, nodoId, capa);
  const ctrlZ = async () => { await d.actions({ async: true }).keyDown(Key.CONTROL).sendKeys('z').keyUp(Key.CONTROL).perform(); await esperar(300); };

  const casos = [
    { etq: 'Opacidad de sombra', nodo: txt, sel: '#inspector input[data-sh="alfa"]', capa: false },
    { etq: 'Capa oscura', nodo: sec, sel: '#inspector input[data-capa]', capa: true },
  ];
  for (const c of casos) {
    await cargar(); await seleccionar(c.nodo.id);
    await d.executeScript(`document.querySelector('${c.sel}').scrollIntoView({block:'center',behavior:'instant'})`); await esperar(200);
    const base = await pasosUndo();
    const el = await d.findElement(By.css(c.sel));
    const caja = await d.executeScript(`const b = document.querySelector('${c.sel}').getBoundingClientRect(); return b.width`);

    // 1) Arrastre largo: debe ser UN paso
    const a = d.actions({ async: true });
    a.move({ origin: el }).press();
    for (let k = 0; k < 8; k++) a.move({ x: Math.round(caja * 0.05), y: 0, origin: Origin.POINTER, duration: 40 });
    a.release(); await a.perform(); await esperar(400);
    const trasArrastre = await pasosUndo();
    console.log(`INFO ${c.etq}: pasos de historial antes=${base}, tras arrastre=${trasArrastre}`);
    v(trasArrastre - base === 1, `${c.etq}: un arrastre largo crea 1 paso de historial (creó ${trasArrastre - base})`);
    const e1 = await estado(c.sel, c.nodo.id, c.capa);
    console.log('INFO tras arrastre', JSON.stringify(e1));

    // 2) Ctrl+Z con el foco EN el slider: debe deshacer y el slider debe reflejarlo
    const foco = await d.executeScript(`const r = document.querySelector('${c.sel}'); r.focus(); return document.activeElement === r`);
    v(foco, `${c.etq}: el slider tiene el foco antes de Ctrl+Z`);
    await ctrlZ();
    const e2 = await estado(c.sel, c.nodo.id, c.capa);
    console.log('INFO tras Ctrl+Z (foco en slider)', JSON.stringify(e2));
    v(e2.arbol !== e1.arbol, `${c.etq}: Ctrl+Z con el foco en el slider deshace en el árbol (${e1.arbol} → ${e2.arbol})`);
    v(e2.slider === e2.arbol, `${c.etq}: el slider muestra lo que hay en el árbol tras deshacer (slider ${e2.slider}, árbol ${e2.arbol})`);
    v(e2.num === `${e2.arbol}%`, `${c.etq}: el número junto al slider coincide (${e2.num})`);

    // 3) Clic simple sin mover: máximo 1 paso, y ninguno si el valor no cambia
    await cargar(); await seleccionar(c.nodo.id);
    await d.executeScript(`document.querySelector('${c.sel}').scrollIntoView({block:'center',behavior:'instant'})`); await esperar(200);
    const b2 = await pasosUndo();
    const el2 = await d.findElement(By.css(c.sel));
    await d.actions({ async: true }).move({ origin: el2 }).press().release().perform(); await esperar(400);
    const t2 = await pasosUndo();
    v(t2 - b2 <= 1, `${c.etq}: un clic simple crea como mucho 1 paso (creó ${t2 - b2})`);

    // 4) Flechas: cada flecha = 1 paso (documentado); 3 flechas -> 3 Ctrl+Z (foco en el slider) deshacen 3 pasos, uno a uno, viéndose en el slider
    await cargar(); await seleccionar(c.nodo.id);
    await d.executeScript(`document.querySelector('${c.sel}').scrollIntoView({block:'center',behavior:'instant'})`); await esperar(200);
    await d.executeScript(`document.querySelector('${c.sel}').focus()`);
    const b3 = await pasosUndo();
    const v0 = (await estado(c.sel, c.nodo.id, c.capa));
    await d.actions({ async: true }).sendKeys(Key.ARROW_RIGHT, Key.ARROW_RIGHT, Key.ARROW_RIGHT).perform(); await esperar(400);
    const t3 = await pasosUndo();
    console.log(`INFO ${c.etq}: 3 flechas -> pasos nuevos=${t3 - b3}`);
    const secuencia = [];
    for (let i = 0; i < 3; i++) {
      await d.executeScript(`const r = document.querySelector('${c.sel}'); if (document.activeElement !== r) r.focus()`);
      await ctrlZ();
      const e = await estado(c.sel, c.nodo.id, c.capa); secuencia.push(e);
    }
    console.log('INFO flechas, Ctrl+Z uno a uno (foco en slider):', JSON.stringify(secuencia.map((e) => [e.slider, e.arbol])));
    v(secuencia[2].arbol === v0.arbol, `${c.etq}: 3 Ctrl+Z (foco en slider) devuelven al valor inicial ${v0.arbol} (llegó a ${secuencia[2].arbol})`);
    v(secuencia.every((e) => e.slider === e.arbol), `${c.etq}: tras cada Ctrl+Z el slider refleja el árbol`);

    // 5) Ctrl+Z con el foco FUERA del slider (en el body): sigue funcionando
    await cargar(); await seleccionar(c.nodo.id);
    await d.executeScript(`document.querySelector('${c.sel}').scrollIntoView({block:'center',behavior:'instant'})`); await esperar(200);
    const el5 = await d.findElement(By.css(c.sel));
    const i5 = await estado(c.sel, c.nodo.id, c.capa);
    await d.actions({ async: true }).move({ origin: el5 }).press().move({ x: 40, y: 0, origin: Origin.POINTER, duration: 80 }).release().perform(); await esperar(400);
    const m5 = await estado(c.sel, c.nodo.id, c.capa);
    await d.executeScript(`document.activeElement.blur(); document.body.focus()`);
    await ctrlZ();
    const f5 = await estado(c.sel, c.nodo.id, c.capa);
    v(m5.arbol !== i5.arbol && f5.arbol === i5.arbol, `${c.etq}: Ctrl+Z con el foco fuera del slider deshace (${m5.arbol} → ${f5.arbol}, partida ${i5.arbol})`);
    v(f5.slider === f5.arbol, `${c.etq}: y el slider refleja el árbol (${f5.slider})`);
  }

  // Comparación: un campo sin slider (setStyle con caja de texto) crea 1 paso por escritura agrupada
  console.log(`\n${ok} comprobaciones OK`);
} finally { await d.quit(); }
