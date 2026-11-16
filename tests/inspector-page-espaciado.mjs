// Vista plana de "Ajustes de página": sin grupos repetidos y sin nada que desborde ni toque el borde derecho (ancho normal y mínimo).
// Firefox real sobre dist/editor.html. Ejecutar: npm run build && node tests/inspector-page-espaciado.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import { createNode as n } from '../src/core/tree.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina';
const pagina = n('page', { name: 'Página', content: { title: 'Mi página' }, styles: { base: { color: '#ffffff', background: '#0b0b10', fontSize: '16px' } } });
pagina.children.push(n('section', { name: 'Sec', children: [n('text', { name: 'Txt', content: { text: 'Hola' } })] }));

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.manage().window().setRect({ width: 1400, height: 700 }); // bajo a propósito: el cuerpo tiene scroll (barra visible)
  await d.get(url);
  await d.executeScript(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);
  await d.findElement(By.css('#btn-pagina')).click(); await esperar(250);

  // 1) ningún título de grupo repetido
  const t = await d.executeScript(`return [...document.querySelectorAll('#inspector h3')].map(h=>h.textContent)`);
  assert.deepEqual(t.filter((x, i) => t.indexOf(x) !== i), [], `títulos repetidos en la vista de página: ${t.join(' | ')}`);

  // 2) en ancho normal y en ancho mínimo de ventana: nada desborda ni pasa del borde derecho del cuerpo (descontando la barra de scroll)
  for (const ancho of [1400, 700]) {
    await d.manage().window().setRect({ width: ancho, height: 700 }); await esperar(250);
    const r = await d.executeScript(`
      const cuerpo = document.querySelector('#inspector .insp-cuerpo');
      const limite = cuerpo.getBoundingClientRect().left + cuerpo.clientWidth; // borde derecho útil (sin barra)
      const malos = [];
      for (const e of document.querySelectorAll('#inspector, #inspector *')) {
        if (e.closest('pre') || e.closest('details:not([open])') && e.tagName !== 'DETAILS' && e.tagName !== 'SUMMARY') continue;
        if (e.getClientRects().length === 0) continue;
        const caja = e.getBoundingClientRect();
        const desborda = !['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(e.tagName) && e.scrollWidth > e.clientWidth + 0.5 && getComputedStyle(e).overflowX === 'visible' && e.clientWidth > 0;
        if (desborda || caja.right > limite + 0.5) malos.push(e.tagName + '.' + e.className + ' ' + (e.dataset.s || e.dataset.c || e.textContent.slice(0, 20)) + ' right=' + caja.right.toFixed(1) + ' lim=' + limite.toFixed(1) + ' sw=' + e.scrollWidth + ' cw=' + e.clientWidth);
      }
      return { malos, barra: cuerpo.scrollHeight > cuerpo.clientHeight, ancho: document.querySelector('#inspector').clientWidth };`);
    assert.ok(r.barra, 'la barra de scroll debe estar visible en este test');
    assert.deepEqual(r.malos, [], `desbordes con ventana ${ancho}px (panel ${r.ancho}px)`);
  }
  // 3) el cuerpo plano no pega sus campos al borde: relleno lateral >= 12px
  const pad = await d.executeScript(`return parseFloat(getComputedStyle(document.querySelector('#inspector .nivel-plano')).paddingRight)`);
  assert.ok(pad >= 12, `relleno derecho del cuerpo plano ${pad}px < 12px`);
  // 4) los h3 de la vista plana tienen el mismo tamaño y peso que los de un nivel de un nodo normal
  const h3 = () => d.executeScript(`const h=document.querySelector('#inspector h3'); const s=getComputedStyle(h); return s.fontSize+' '+s.fontWeight`);
  const plano = await h3();
  const id = await d.executeScript(`return JSON.parse(localStorage.getItem('${LS}')).children[0].id`);
  await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`); await esperar(250);
  await d.executeScript(`document.querySelectorAll('#inspector details.nivel').forEach(x=>x.open=true)`); await esperar(100);
  assert.equal(plano, await h3(), 'h3 de la vista plana distinto al de un nivel normal');
  console.log('OK inspector-page-espaciado');
} finally { await d.quit(); }
