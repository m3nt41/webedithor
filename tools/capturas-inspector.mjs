// Capturas del panel derecho (inspector) para cada tipo de nodo, con los 3 niveles abiertos y con todo plegado.
// Uso: npm run build && node tools/capturas-inspector.mjs   → docs/capturas-inspector/<tipo>-abierto.png y <tipo>-plegado.png
// Selenium en Firefox (perfil temporal, headless). No toca el editor de m3nt41.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Builder, By } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { walk } from '../src/core/tree.js';
import { createBlock } from '../src/blocks/index.js';
import { createNode as n } from '../src/core/tree.js';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const MOVIL = process.argv.includes('--movil');
const SALIDA = resolve('docs/capturas-inspector');
mkdirSync(SALIDA, { recursive: true });

const pagina = n('page', { name: 'Página' });
pagina.children.push(createBlock('hero', 'centrado'), createBlock('services', 'tarjetas'), createBlock('gallery', 'cuadricula'), createBlock('marquesina', 'clasica'));
const elegir = (tipo, pred = () => true) => { let r = null; walk(pagina, (x) => { if (!r && x.type === tipo && pred(x)) r = x; }); return r; };
const iconoNodo = n('icon', { name: 'Icono demo', content: { name: 'star' } });
pagina.children[1].children.push(iconoNodo);
const casos = [
  ['page', pagina], ['section', pagina.children[0]], ['container', elegir('container')], ['heading', elegir('heading')],
  ['text', elegir('text')], ['button', elegir('button')], ['image', elegir('image')], ['icon', iconoNodo],
];

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').setBinary(FIREFOX)).build();
try {
  await d.manage().window().setRect({ width: 1400, height: 1000 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('editor-landings:pagina', arguments[0]); localStorage.removeItem('editor-landings:niveles')`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);
  if (MOVIL) { await d.findElement(By.css('#vista-mobile')).click(); await esperar(200); }
  const seleccionar = async (id) => {
    if (id === pagina.id) await d.findElement(By.css('#btn-pagina')).click(); // la página se abre con el botón de Ajustes
    else await d.executeScript(`document.querySelector('#preview [data-id="${id}"]')?.dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    await esperar(200);
  };
  const niveles = (v) => d.executeScript(`document.querySelectorAll('#inspector details.nivel').forEach(x=>x.open=${v})`);
  const foto = async (nombre) => {
    // El panel mide el alto de la ventana: para ver TODO el contenido se alarga la ventana hasta que el cuerpo entre sin scroll
    const alto = await d.executeScript(`const c=document.querySelector('#inspector .insp-cuerpo'); const cab=document.querySelector('#inspector .insp-cab'); return c.scrollHeight+(cab?cab.offsetHeight:0)+44+8`);
    await d.manage().window().setRect({ width: 1400, height: Math.min(Math.max(alto + 90, 500), 4000) });
    await esperar(200);
    const el = await d.findElement(By.css('#inspector'));
    writeFileSync(`${SALIDA}/${nombre}.png`, await el.takeScreenshot(), 'base64');
  };
  const sufijo = MOVIL ? '-movil' : '';
  for (const [tipo, nodo] of casos) {
    await d.manage().window().setRect({ width: 1400, height: 1000 });
    await seleccionar(nodo.id);
    await niveles(true); await esperar(150); await foto(`${tipo}-abierto${sufijo}`);
    await d.manage().window().setRect({ width: 1400, height: 1000 });
    await niveles(false); await esperar(150); await foto(`${tipo}-plegado${sufijo}`);
    console.log('captura', tipo);
  }
  const err = await d.executeScript('return window.__err || []');
  if (err.length) console.log('errores JS:', err);
} finally { await d.quit(); }
