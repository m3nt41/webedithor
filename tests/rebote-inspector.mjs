// Rebote del inspector: durante el arrastre de un tirador el panel no debe reconstruirse (scrollTop y alto fijos,
// los nodos del DOM del inspector son los mismos) y al soltar el scroll se conserva sin animarse desde 0.
// Ejecutar: npm run build && node tests/rebote-inspector.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Origin } from 'selenium-webdriver';
import { createNode as n } from '../src/core/tree.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina';
let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };

const pagina = n('page', { name: 'Página', content: { title: 'x' } });
const sec = n('section', { name: 'Sec', styles: { padding: '40px 20px 30px' }, children: [n('heading', { name: 'Tit', content: { text: 'Hola', level: 2 } })] });
pagina.children.push(sec);

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1500, height: 600 }); // bajito: el panel necesita scroll
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);
  await d.executeScript(`document.querySelector('#preview [data-id="${sec.id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  await esperar(300);
  for (const sm of await d.findElements(By.css('#inspector details.nivel:not([open]) > summary'))) await sm.click(); // abrir los 3 niveles
  await esperar(300);
  await d.executeScript(`
    const insp = document.getElementById('inspector'), c = insp.querySelector('.insp-cuerpo');
    document.activeElement.blur();
    c.scrollTo({ top: 300, behavior: 'instant' });
    window.__ref = { c, cab: insp.querySelector('.insp-cab'), campos: [...insp.querySelectorAll('input[data-s]')].slice(0, 6) };
    window.__log = [];
    const mide = () => { const c2 = insp.querySelector('.insp-cuerpo');
      window.__log.push({ top: c2 ? c2.scrollTop : null, alto: insp.getBoundingClientRect().height, sh: c2 ? c2.scrollHeight : null,
        mismo: c2 === window.__ref.c && insp.querySelector('.insp-cab') === window.__ref.cab && window.__ref.campos.every((e) => e.isConnected) });
      requestAnimationFrame(mide); };
    requestAnimationFrame(mide);`);
  await esperar(400);
  const top0 = await d.executeScript(`return document.querySelector('#inspector .insp-cuerpo').scrollTop`);
  v(top0 > 100, `el panel tiene scroll de partida (${Math.round(top0)}px)`);

  // Arrastre del tirador de arriba (padding) en 8 pasos
  const m = await d.findElement(By.css('#preview .tir-h[data-lado="arriba"]'));
  const a = d.actions({ async: true });
  a.move({ origin: m }).press();
  await a.perform();
  await d.executeScript('window.__log.length = 0');
  const b = d.actions({ async: true });
  for (let i = 0; i < 8; i++) b.move({ x: 0, y: 6, origin: Origin.POINTER, duration: 60 });
  await b.perform();
  const durante = await d.executeScript('return window.__log.slice()');
  await d.actions({ async: true }).release().perform();
  await esperar(500);

  v(durante.length > 10, `se midieron ${durante.length} frames durante el arrastre`);
  v(durante.every((x) => x.mismo), 'durante el arrastre los nodos del inspector NO se recrean');
  v(new Set(durante.map((x) => Math.round(x.top))).size === 1, 'durante el arrastre scrollTop no cambia');
  v(new Set(durante.map((x) => Math.round(x.alto))).size === 1 && new Set(durante.map((x) => x.sh)).size === 1, 'durante el arrastre el alto del panel no cambia');

  // El valor sí se actualizó, y al soltar el scroll se conserva
  const pad = await d.executeScript(`return document.querySelector('#inspector input[data-s="padding"], #inspector input[data-s="paddingTop"]')?.value ?? null`);
  v(pad !== null && pad !== '40px 20px 30px', `el campo de padding del inspector se actualizó (${pad})`);
  const topFin = await d.executeScript(`return document.querySelector('#inspector .insp-cuerpo').scrollTop`);
  v(Math.abs(topFin - top0) < 2, `al soltar el scroll se conserva (${Math.round(top0)} → ${Math.round(topFin)})`);
  console.log(`\n${ok} comprobaciones OK`);
} finally { await d.quit(); }
