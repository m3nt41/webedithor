// Anti-parpadeo del hover: con el mouse en el borde (abajo / lado) de un botón con Elevar, Encoger o Inclinar,
// el estado :hover NO debe oscilar. Firefox real, sobre el HTML exportado y el lienzo del editor.
// Control negativo: con el ::after anulado, "Elevar" sí oscila (así se sabe que la prueba detecta el fallo).
// Ejecutar: npm run build && node tests/hover-borde.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Builder, By } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { cssNodo } from '../src/animations/index.js';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };

const base = { background: '#111', color: '#fff', padding: '14px 26px', display: 'inline-flex' };
const mk = (nombre, effect, st = base) => {
  const x = n('button', { name: nombre, content: { text: nombre, href: '#' } });
  x.styles.base = { ...st }; x.animation = { hover: { effect } }; return x;
};
const nodos = { Elevar: mk('Elevar', 'lift'), Encoger: mk('Encoger', 'shrink'), Inclinar: mk('Inclinar', 'tilt'),
  Agrandar: mk('Agrandar', 'grow'), SoloTexto: mk('SoloTexto', 'lift', { display: 'inline-flex', padding: '10px 20px' }) };
const pagina = n('page', { name: 'Página', content: { title: 'Borde' } });
pagina.children.push(n('section', { name: 'Sec', styles: { base: { display: 'flex', flexDirection: 'column', gap: '60px', padding: '60px', alignItems: 'flex-start' } }, children: Object.values(nodos) }));

// CSS sin sitio para el ::after, sin navegador
const c = (k) => cssNodo(nodos[k], '.x', { scroll: false });
v(/\.x:hover::after\{content:'';position:absolute;top:100%;left:0;right:0;height:4px\}/.test(c('Elevar')) && !/pointer-events/.test(c('Elevar')), 'lift: ::after de 4px abajo, ancho completo, sin pointer-events:none');
v(/\.x\{position:relative\}/.test(c('Elevar')), 'lift: position:relative en el estado base (nodo sin position)');
v(c('Encoger').includes('top:-2%') && c('Inclinar').includes('top:-4px'), 'shrink y tilt: ::after por todos los lados');
v(!c('Agrandar').includes('::after'), 'grow: sin ::after (no hace falta)');
const sticky = mk('S', 'lift', { ...base, position: 'sticky', top: '0' });
v(!cssNodo(sticky, '.x', { scroll: false }).includes('position:relative') && cssNodo(sticky, '.x', { scroll: false }).includes('::after'), 'con position propia: no se la pisa, pero sí lleva ::after');

mkdirSync('tests/out', { recursive: true });
writeFileSync('tests/out/hover-borde.html', exportHTML(pagina));

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').setBinary(FIREFOX)).build();
// Mueve el mouse al borde indicado y cuenta cuántas veces cambia :hover en ~1.2 s
async function oscila(el, borde) {
  await d.executeScript('arguments[0].scrollIntoView({block:"center"})', el);
  await d.actions({ async: true }).move({ x: 5, y: 5 }).perform(); // sacar el mouse de cualquier botón
  await esperar(400);
  const r = await d.executeScript('const b=arguments[0].getBoundingClientRect();return {w:b.width,h:b.height}', el);
  const x = borde === 'lado' ? Math.floor(r.w / 2) - 2 : 0;
  const y = borde === 'abajo' ? Math.floor(r.h / 2) - 2 : 0;
  await d.actions({ async: true }).move({ origin: el, x, y }).perform();
  // El navegador solo re-evalúa :hover cuando el mouse se mueve: se simula la mano temblando 1 px en el borde.
  let prev = await d.executeScript('return arguments[0].matches(":hover")', el), n = 0;
  const t0 = Date.now(); let k = 0;
  while (Date.now() - t0 < 1500) {
    await d.actions({ async: true }).move({ origin: el, x: x + (k++ % 2), y }).perform();
    await esperar(40);
    const h = await d.executeScript('return arguments[0].matches(":hover")', el);
    if (h !== prev) { n++; prev = h; }
  }
  const cambios = { n, fin: prev };
  return cambios;
}
const buscar = async (txt) => (await d.findElements(By.xpath(`//*[self::a or self::button][normalize-space()="${txt}"]`)))[0];
try {
  await d.manage().window().setRect({ width: 1400, height: 1000 });
  await d.get(pathToFileURL(resolve('tests/out/hover-borde.html')).href); await esperar(500);
  for (const [txt, borde] of [['Elevar', 'abajo'], ['SoloTexto', 'abajo'], ['Encoger', 'abajo'], ['Encoger', 'lado'], ['Inclinar', 'abajo'], ['Inclinar', 'lado']]) {
    const r = await oscila(await buscar(txt), borde);
    v(r.n <= 1 && r.fin, `export ${txt} (borde ${borde}): hover estable (cambios ${r.n}, termina en hover ${r.fin})`);
  }
  // Control negativo: sin el ::after, Elevar sí oscila
  await d.executeScript(`const s=document.createElement('style');s.id='neg';s.textContent='a::after{display:none!important}';document.head.append(s)`);
  const neg = await oscila(await buscar('Elevar'), 'abajo');
  v(neg.n >= 2, `control negativo (sin ::after) Elevar oscila: ${neg.n} cambios`);
  await d.executeScript(`document.getElementById('neg').remove()`);

  // Lienzo del editor
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('editor-landings:pagina', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(800);
  for (const [k, borde] of [['Elevar', 'abajo'], ['Encoger', 'abajo'], ['Inclinar', 'lado']]) {
    const el = await d.findElement(By.css(`#preview [data-id="${nodos[k].id}"]`));
    const r = await oscila(el, borde);
    v(r.n <= 1 && r.fin, `lienzo ${k} (borde ${borde}): hover estable (cambios ${r.n})`);
  }
  console.log(`\n${ok} comprobaciones OK`);
} finally {
  await d.quit();
}
