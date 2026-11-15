// Hover Elevar/Resplandor en Firefox real: botón de texto sin caja -> text-shadow y NO filter; con fondo -> box-shadow;
// icono sin caja -> drop-shadow. Se comprueba en el HTML exportado y en el lienzo del editor.
// Ejecutar: npm run build && node tests/hover-texto.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Builder, By } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };

const mk = (tipo, nombre, base, anim, content) => {
  const x = n(tipo, { name: nombre, content }); x.styles.base = base; x.animation = anim; return x;
};
const LIFT = { hover: { effect: 'lift' } };
const GLOW = { hover: { effect: 'glow', color: '#ff0000' } };
const nodos = {
  liftTexto: mk('button', 'LiftTexto', {}, LIFT, { text: 'Elevar', href: '#' }),
  glowTexto: mk('button', 'GlowTexto', {}, GLOW, { text: 'Brillar', href: '#' }),
  liftCaja: mk('button', 'LiftCaja', { background: '#111', color: '#fff' }, LIFT, { text: 'Caja', href: '#' }),
  liftIcono: mk('icon', 'LiftIcono', {}, LIFT, { name: 'star' }),
};
const pagina = n('page', { name: 'Página', content: { title: 'Hover texto' } });
pagina.children.push(n('section', { name: 'Sec', children: Object.values(nodos) }));
const ids = Object.fromEntries(Object.entries(nodos).map(([k, x]) => [k, x.id]));

mkdirSync('tests/out', { recursive: true });
writeFileSync('tests/out/hover-texto.html', exportHTML(pagina));

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').setBinary(FIREFOX)).build();
// Estilo calculado de un elemento tras pasar el mouse
async function medir(sel) {
  const el = await d.findElement(By.css(sel));
  await d.executeScript('arguments[0].scrollIntoView({block:"center"})', el);
  await d.actions({ async: true }).move({ origin: el }).perform();
  await esperar(600);
  return d.executeScript(`const c=getComputedStyle(arguments[0]);return {ts:c.textShadow,f:c.filter,bs:c.boxShadow,tr:c.transform}`, el);
}
const hay = (s) => s && s !== 'none';
const revisar = async (etiqueta, sel, esperado, sube = true) => {
  const r = await medir(sel);
  if (sube) v(r.tr !== 'none', `${etiqueta}: sube/transforma (${r.tr})`);
  if (esperado === 'texto') v(hay(r.ts) && !hay(r.f) && !hay(r.bs), `${etiqueta}: text-shadow y NO filter ni box-shadow (${r.ts} | ${r.f} | ${r.bs})`);
  if (esperado === 'caja') v(hay(r.bs) && !hay(r.f) && !hay(r.ts), `${etiqueta}: box-shadow (sin filter ni text-shadow)`);
  if (esperado === 'plano') v(hay(r.f) && !hay(r.ts) && !hay(r.bs), `${etiqueta}: drop-shadow (filter) sin text-shadow`);
};
try {
  await d.manage().window().setRect({ width: 1400, height: 1000 });
  // 1) HTML exportado
  await d.get(pathToFileURL(resolve('tests/out/hover-texto.html')).href); await esperar(500);
  const sels = await d.executeScript(`return [...document.querySelectorAll('a,button,svg')].map(e=>e.tagName+'|'+(e.textContent||'').trim()+'|'+e.className)`);
  console.log('   elementos export:', JSON.stringify(sels));
  const buscar = async (texto) => {
    const els = await d.findElements(By.xpath(`//*[self::a or self::button][normalize-space()="${texto}"]`));
    return els[0];
  };
  const medirEl = async (el) => {
    await d.executeScript('arguments[0].scrollIntoView({block:"center"})', el);
    await d.actions({ async: true }).move({ origin: el }).perform(); await esperar(600);
    return d.executeScript(`const c=getComputedStyle(arguments[0]);return {ts:c.textShadow,f:c.filter,bs:c.boxShadow,tr:c.transform,tra:c.transform}`, el);
  };
  for (const [txt, modo] of [['Elevar', 'texto'], ['Brillar', 'texto'], ['Caja', 'caja']]) {
    const r = await medirEl(await buscar(txt));
    if (txt !== 'Brillar') v(r.tr !== 'none', `export ${txt}: se transforma`);
    if (modo === 'texto') v(hay(r.ts) && !hay(r.f) && !hay(r.bs), `export ${txt}: text-shadow y NO filter (${r.ts} | ${r.f})`);
    else v(hay(r.bs) && !hay(r.f) && !hay(r.ts), `export ${txt}: box-shadow`);
  }
  // el icono (svg o su contenedor) usa drop-shadow
  const ic = (await d.findElements(By.css('svg')))[0]; // el efecto va en el contenedor del svg
  const icBox = ic && await d.executeScript('return arguments[0].parentElement', ic);
  if (icBox) { const r = await medirEl(icBox); v(hay(r.f) && !hay(r.ts), `export icono: drop-shadow (${r.f})`); }
  // 2) Lienzo del editor
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('editor-landings:pagina', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(800);
  await revisar('lienzo Elevar', `#preview [data-id="${ids.liftTexto}"]`, 'texto');
  await revisar('lienzo Resplandor', `#preview [data-id="${ids.glowTexto}"]`, 'texto', false);
  await revisar('lienzo con fondo', `#preview [data-id="${ids.liftCaja}"]`, 'caja');
  console.log(`\n${ok} comprobaciones OK`);
} finally {
  await d.quit();
}
