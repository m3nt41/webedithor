// SLIDERS DEL INSPECTOR (input type=range): se pueden ARRASTRAR. Recorre todos los sliders de cada tipo de nodo,
// los arrastra con acciones de puntero (mantener, mover, soltar) y comprueba:
//  - el elemento del slider es el MISMO durante todo el arrastre (no se recrea) y el panel (.insp-cuerpo) tampoco,
//  - el valor final cambia y coincide con el número junto al slider y con el árbol,
//  - el valor se refleja en el lienzo (preview),
//  - un solo Ctrl+Z deshace el arrastre COMPLETO,
//  - con teclado (flechas) el slider conserva el foco y el scroll del panel.
// Ejecutar: npm run build && node tests/sliders-arrastre.mjs      (debe FALLAR sin el arreglo y pasar con él)
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Key, Origin } from 'selenium-webdriver';
import { createNode as n } from '../src/core/tree.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina';
let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };

// PNG de 1x1 para que "Capa oscura" aparezca (solo sale si hay imagen de fondo)
const PX = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const pagina = n('page', { name: 'Página', content: { title: 'x' } });
const hijos = {
  section: n('section', { name: 'Sec', styles: { padding: '40px 20px', fondoImagen: PX, fondoCapa: '20', sombra: '0 4px 12px 0 rgba(0,0,0,0.2)' } }),
  container: n('container', { name: 'Cont', styles: { padding: '20px', sombra: '0 4px 12px 0 rgba(0,0,0,0.2)' } }),
  heading: n('heading', { name: 'Tit', content: { text: 'Hola', level: 2 }, styles: { sombra: '0 4px 12px 0 rgba(0,0,0,0.2)' } }),
  text: n('text', { name: 'Txt', content: { text: 'Texto' }, styles: { sombra: '0 4px 12px 0 rgba(0,0,0,0.2)' } }),
  button: n('button', { name: 'Btn', content: { text: 'Ok' }, styles: { sombra: '0 4px 12px 0 rgba(0,0,0,0.2)' } }),
  image: n('image', { name: 'Img', content: { src: PX, alt: 'i' }, styles: { sombra: '0 4px 12px 0 rgba(0,0,0,0.2)' } }),
  icon: n('icon', { name: 'Ico', content: { name: 'star' }, styles: { sombra: '0 4px 12px 0 rgba(0,0,0,0.2)' } }),
};
hijos.section.children.push(hijos.container);
hijos.container.children.push(hijos.heading, hijos.text, hijos.button, hijos.image, hijos.icon);
pagina.children.push(hijos.section);

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1500, height: 800 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);

  const abrirTodo = async () => {
    for (const sm of await d.findElements(By.css('#inspector details.nivel:not([open]) > summary'))) await sm.click();
    await esperar(200);
  };
  const seleccionar = async (id) => {
    await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    await esperar(300); await abrirTodo();
  };
  // La sombra personalizada tiene su slider de Opacidad; "Capa oscura" solo en la sección.
  const inventario = {};
  let total = 0;
  for (const [tipo, nodo] of Object.entries(hijos)) {
    await seleccionar(nodo.id);
    const rs = await d.executeScript(`return [...document.querySelectorAll('#inspector input[type=range]')].map((r) => r.dataset.sh ? 'sombra.' + r.dataset.sh : r.dataset.capa !== undefined ? 'capa' : 'otro')`);
    inventario[tipo] = rs;
    console.log(`INFO ${tipo}: ${rs.length} slider(s) -> ${rs.join(', ') || '(ninguno)'}`);
    v(!rs.includes('otro'), `${tipo}: todos los sliders están identificados`);

    for (let i = 0; i < rs.length; i++) {
      total++;
      const etq = `${tipo} / ${rs[i]}`;
      const sel = `#inspector input[type=range]`;
      // Referencias de partida y trazado de eventos input / reconstrucciones del panel
      await d.executeScript(`
        const r = document.querySelectorAll('${sel}')[${i}];
        const c = document.querySelector('#inspector .insp-cuerpo');
        r.scrollIntoView({ block: 'center', behavior: 'instant' });
        window.__ref = { r, c }; window.__log = [];
        r.addEventListener('input', () => { const act = document.querySelectorAll('${sel}')[${i}];
          window.__log.push({ valor: r.value, mismo: act === window.__ref.r && r.isConnected, panel: document.querySelector('#inspector .insp-cuerpo') === window.__ref.c }); });`);
      await esperar(300);
      const ini = await d.executeScript(`return +window.__ref.r.value`);
      const el = (await d.findElements(By.css(sel)))[i];
      const caja = await d.executeScript(`const b = window.__ref.r.getBoundingClientRect(); return { w: b.width, h: b.height }`);
      v(caja.w > 60 && caja.h >= 10, `${etq}: el slider tiene tamaño usable (${Math.round(caja.w)}×${Math.round(caja.h)})`);
      const pasosUndo0 = await d.executeScript(`return window.__undoDebug ? 0 : 0`);

      // Mantener en el centro, mover a la derecha en pasos, soltar
      const mover = Math.round(caja.w * 0.3);
      const a = d.actions({ async: true });
      a.move({ origin: el }).press();
      for (let k = 0; k < 6; k++) a.move({ x: Math.round(mover / 6), y: 0, origin: Origin.POINTER, duration: 60 });
      a.release();
      await a.perform();
      await esperar(300);
      const log = await d.executeScript('return window.__log.slice()');
      v(log.length >= 3, `${etq}: el arrastre produjo ${log.length} eventos input (no solo un clic)`);
      v(log.every((x) => x.mismo), `${etq}: el elemento del slider es el MISMO durante todo el arrastre`);
      v(log.every((x) => x.panel), `${etq}: el panel NO se reconstruye durante el arrastre`);
      const fin = await d.executeScript(`const r = document.querySelectorAll('${sel}')[${i}];
        const out = r.parentElement.querySelector('output');
        return { valor: +r.value, out: out.textContent, activo: document.activeElement === r };`);
      v(fin.valor !== ini, `${etq}: el valor cambió con el arrastre (${ini} → ${fin.valor})`);
      v(fin.out === `${fin.valor}%`, `${etq}: el número junto al slider coincide (${fin.out})`);

      // El valor llegó al árbol y al lienzo
      const arbol = await d.executeScript(`return JSON.parse(localStorage.getItem('${LS}'))`);
      await esperar(700); // el autoguardado es diferido
      const arb2 = await d.executeScript(`return JSON.parse(localStorage.getItem('${LS}'))`);
      const buscar = (nd, id) => nd.id === id ? nd : (nd.children ?? []).map((h) => buscar(h, id)).find(Boolean);
      const nodoArb = buscar(arb2, nodo.id);
      if (rs[i] === 'capa') {
        v(String(nodoArb.styles.base.fondoCapa) === String(fin.valor), `${etq}: el árbol guarda fondoCapa=${fin.valor}`);
        const capa = await d.executeScript(`return document.querySelector('#preview [data-id="${nodo.id}"]').outerHTML.length`);
        v(capa > 0, `${etq}: el lienzo sigue dibujando la sección`);
      } else {
        const m = /rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*([\d.]+)\)/.exec(nodoArb.styles.base.sombra ?? '') ?? /,\s*([\d.]+)\)\s*$/.exec(nodoArb.styles.base.sombra ?? '');
        v(m && Math.abs(+m[1] * 100 - fin.valor) < 1.5, `${etq}: el árbol guarda la opacidad de la sombra (${nodoArb.styles.base.sombra})`);
        const css = await d.executeScript(`const e = document.querySelector('#preview [data-id="${nodo.id}"]'); const cs = getComputedStyle(e);
          return (cs.boxShadow + ' ' + cs.textShadow + ' ' + cs.filter)`);
        const alfaLienzo = /rgba\(0, 0, 0, ([\d.]+)\)/.exec(css);
        v(alfaLienzo && Math.abs(+alfaLienzo[1] * 100 - fin.valor) < 1.5, `${etq}: el lienzo muestra la opacidad (${css.slice(0, 60)})`);
      }

      // Ctrl+Z: UN solo paso deshace el arrastre completo
      await d.executeScript(`document.activeElement.blur(); document.body.focus();`);
      await d.actions({ async: true }).keyDown(Key.CONTROL).sendKeys('z').keyUp(Key.CONTROL).perform();
      await esperar(400);
      const trasUndo = await d.executeScript(`return +document.querySelectorAll('${sel}')[${i}].value`);
      v(trasUndo === ini, `${etq}: un Ctrl+Z deshace el arrastre completo (${fin.valor} → ${trasUndo}, partida ${ini})`);
    }
  }
  v(total >= 8, `se recorrieron ${total} sliders del inspector`);

  // Teclado: flechas sobre el slider de Opacidad de la sombra; foco y scroll del panel intactos; una sola clave de gesto por ráfaga
  await seleccionar(hijos.text.id);
  await d.executeScript(`document.querySelector('#inspector input[data-sh="alfa"]').scrollIntoView({ block: 'center', behavior: 'instant' })`); await esperar(300);
  const el = await d.findElement(By.css('#inspector input[data-sh="alfa"]'));
  await el.click(); // el clic ya mueve el valor: tomamos la partida DESPUÉS
  await esperar(300);
  const top0 = await d.executeScript(`return document.querySelector('#inspector .insp-cuerpo').scrollTop`);
  const v0 = await d.executeScript(`return +document.querySelector('#inspector input[data-sh="alfa"]').value`);
  await d.executeScript(`window.__ref = document.querySelector('#inspector input[data-sh="alfa"]')`);
  await d.actions({ async: true }).sendKeys(Key.ARROW_RIGHT, Key.ARROW_RIGHT, Key.ARROW_RIGHT).perform();
  await esperar(400);
  const k = await d.executeScript(`const r = document.querySelector('#inspector input[data-sh="alfa"]');
    return { valor: +r.value, foco: document.activeElement === r, mismo: r === window.__ref, top: document.querySelector('#inspector .insp-cuerpo').scrollTop };`);
  v(k.valor === v0 + 3, `teclado: 3 flechas suben 3 puntos (${v0} → ${k.valor})`);
  v(k.foco, 'teclado: el slider conserva el foco (se reconstruye el panel al terminar cada flecha, con el foco devuelto)');
  v(Math.abs(k.top - top0) < 2, `teclado: el scroll del panel se conserva (${Math.round(top0)} → ${Math.round(k.top)})`);

  console.log(`\n${ok} comprobaciones OK`);
} finally { await d.quit(); }
