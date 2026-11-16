// Interruptor de tiradores + elementos chicos. Firefox real sobre dist/editor.html (Selenium).
// Comprueba: (1) en un texto chico (tipo etiqueta "NUEVO", ~40x14 px) ningún tirador se solapa con otro, con el texto ni con
// el botón "Margen"; (2) botón "Tiradores" con estado visible (aria-pressed + clase + contraste) y atajo T; (3) apagado = ni un
// tirador en el DOM pero el espaciado se edita por el inspector; (4) el estado se conserva al recargar; (5) Vista previa y export
// no llevan tiradores.
// Ejecutar: npm run build && node tests/tiradores-interruptor.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Key } from 'selenium-webdriver';
import { createNode as n, walk } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina';
let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };
const igual = (a, b, m) => { assert.deepEqual(a, b, m); ok++; console.log('OK   ' + m); };

const pagina = n('page', { name: 'Página', content: { title: 'Mi página' } });
pagina.children.push(n('section', { name: 'Sec', styles: { padding: '60px 40px' }, children: [
  n('text', { name: 'Etiqueta', content: { text: 'NUEVO' }, styles: { margin: '2px', fontSize: '11px', fontWeight: '700', lineHeight: '14px', width: 'fit-content' } }),
  n('text', { name: 'Etiqueta0', content: { text: 'NUEVO' }, styles: { margin: '0', fontSize: '11px', lineHeight: '14px', width: 'fit-content' } }),
  n('heading', { name: 'Grande', content: { text: 'Un título bien grande para el caso normal', level: 2 }, styles: { margin: '20px 0', fontSize: '48px', lineHeight: '1.2' } }),
] }));
v(!/tir-/.test(exportHTML(pagina)), 'el export no contiene tiradores (ni "tir-")');

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1500, height: 1000 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.removeItem('editor-landings:tiradores'); localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);

  const guardada = async () => { await esperar(450); return JSON.parse(await d.executeScript(`return localStorage.getItem('${LS}')`)); };
  const nodo = async (nombre) => { let r = null; walk(await guardada(), (x) => { if (x.name === nombre) r = x; }); return r; };
  const seleccionar = async (nombre) => {
    const id = (await nodo(nombre)).id;
    await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    await esperar(300);
    return id;
  };
  const cajas = (id) => d.executeScript(`
    const r = (e) => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
    const bt = document.querySelector('#preview .tir-modo');
    return { el: r(document.querySelector('#preview .stage [data-id="${id}"]')),
      hs: [...document.querySelectorAll('#preview .tir-h')].map(r), boton: bt ? r(bt) : null };`);
  const cruzan = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const sinSolapes = (c, m) => {
    v(c.hs.length === 4, m + ': hay 4 tiradores');
    let choque = null;
    c.hs.forEach((a, i) => {
      if (cruzan(a, c.el)) choque = `el tirador ${i} toca el elemento`;
      c.hs.forEach((b, j) => { if (j > i && cruzan(a, b)) choque = `el tirador ${i} toca al ${j}`; });
      if (c.boton && cruzan(a, c.boton)) choque = `el tirador ${i} toca el botón`;
    });
    if (c.boton && cruzan(c.boton, c.el)) choque = 'el botón tapa el elemento';
    v(!choque, m + ': ningún tirador ni el botón se solapan entre sí ni con el elemento' + (choque ? ' — ' + choque : ''));
  };

  // ---- 1. Elemento chico ----
  for (const nombre of ['Etiqueta', 'Etiqueta0']) {
    const id = await seleccionar(nombre);
    const c = await cajas(id);
    v(c.el.w < 60 && c.el.h <= 16, `${nombre} mide ${Math.round(c.el.w)}x${Math.round(c.el.h)} px (chico)`);
    sinSolapes(c, nombre);
  }
  // modo padding en un elemento chico también
  await d.findElement(By.css('#preview .tir-modo')).click(); await esperar(250);
  sinSolapes(await cajas((await nodo('Etiqueta0')).id), 'Etiqueta0 en modo padding');
  // el caso normal (elemento grande) sigue pegado al borde: el tirador de arriba está en el borde exterior del margen
  const idG = await seleccionar('Grande');
  const g = await cajas(idG);
  v(g.hs.length === 4 && Math.abs((g.hs[0].y + g.hs[0].h / 2) - (g.el.y - 20)) <= 1.5, 'elemento grande: el tirador de arriba sigue en el borde exterior del margen (sin cambios)');

  // ---- 2. Botón / estado / atajo ----
  const estado = () => d.executeScript(`const b=document.querySelector('#btn-tiradores');return {p:b.getAttribute('aria-pressed'),a:b.classList.contains('activo'),t:b.title}`);
  const contraste = (forzar) => d.executeScript(`const b=document.querySelector('#btn-tiradores');const f=arguments[0];if(f)b.classList.add('activo');const c=getComputedStyle(b);
    const lum=(s)=>{const m=s.match(/[\\d.]+/g).map(Number).slice(0,3).map(x=>{x/=255;return x<=.03928?x/12.92:Math.pow((x+.055)/1.055,2.4)});return .2126*m[0]+.7152*m[1]+.0722*m[2]};
    const a=lum(c.color),k=lum(c.backgroundColor);if(f)b.classList.remove('activo');return (Math.max(a,k)+.05)/(Math.min(a,k)+.05)`, forzar);
  let e = await estado();
  v(e.p === 'true' && e.a && /encendidos/.test(e.t), 'por defecto: botón Tiradores encendido (aria-pressed, clase activo, título)');
  await d.findElement(By.css('#btn-tiradores')).click(); await esperar(250);
  e = await estado();
  v(e.p === 'false' && !e.a && /apagados/.test(e.t), 'clic: botón apagado (aria-pressed=false, sin clase activo, título)');
  const cOff = await contraste(false);
  v(cOff >= 4.5, `contraste del botón apagado ${cOff.toFixed(1)}:1 (mínimo 4.5)`);
  const cOn = await contraste(true);
  v(cOn >= 4.5, `contraste del botón encendido ${cOn.toFixed(1)}:1 (mínimo 4.5)`);

  // ---- 3. Apagado: nada en el DOM, pero el espaciado se edita por el inspector ----
  const total = () => d.executeScript(`return { h: document.querySelectorAll('.tir-h').length, hijos: document.querySelector('#preview .tir-capa').children.length, cualquiera: document.querySelectorAll('[class*="tir-"]:not(.tir-capa)').length }`);
  const nada = { h: 0, hijos: 0, cualquiera: 0 };
  igual(await total(), nada, 'apagado: no hay ningún tirador, sombra, etiqueta ni botón de modo en el DOM');
  await seleccionar('Grande');
  igual(await total(), nada, 'apagado: al seleccionar otro nodo tampoco aparece nada');
  const campo = await d.findElement(By.css('#inspector [data-s="margin"]'));
  await campo.click(); await campo.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE); await campo.sendKeys('33px 0'); await esperar(300);
  igual((await nodo('Grande')).styles.base.margin, '33px 0', 'apagado: el margen se sigue editando desde el inspector');
  igual(await total(), nada, 'apagado: editar por el inspector no hace reaparecer tiradores');

  // ---- 4. Persistencia ----
  igual(await d.executeScript(`return localStorage.getItem('editor-landings:tiradores')`), '0', 'se guardó "0" en localStorage');
  await d.get(url); await esperar(900);
  e = await estado();
  v(e.p === 'false' && !e.a, 'tras recargar sigue apagado');
  await seleccionar('Etiqueta');
  igual(await total(), nada, 'tras recargar apagado: sin tiradores aunque haya selección');

  // ---- 5. Atajo T ----
  await d.findElement(By.css('#preview')).click().catch(() => {});
  await d.executeScript(`document.activeElement && document.activeElement.blur()`);
  await d.actions({ async: true }).sendKeys('t').perform(); await esperar(300);
  e = await estado();
  v(e.p === 'true' && e.a, 'atajo T enciende');
  v((await total()).h === 4, 'encendido por atajo: vuelven los 4 tiradores');
  await d.actions({ async: true }).sendKeys('t').perform(); await esperar(300);
  igual((await estado()).p, 'false', 'atajo T apaga');
  await d.actions({ async: true }).sendKeys('t').perform(); await esperar(300);
  await seleccionar('Etiqueta');
  const inp = await d.findElement(By.css('#inspector textarea'));
  await inp.click(); await inp.sendKeys('t'); await esperar(200);
  igual((await estado()).p, 'true', 'T dentro de un campo de texto escribe y no alterna el interruptor');
  await d.get(url); await esperar(900);
  v((await estado()).a, 'tras recargar encendido vuelve encendido');

  // ---- 6. Vista previa: sin tiradores con el interruptor en cualquier estado ----
  for (const apagar of [false, true]) {
    if (apagar) { await d.findElement(By.css('#btn-tiradores')).click(); await esperar(200); }
    await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(900);
    const srcdoc = await d.executeScript(`return document.querySelector('#vista-previa iframe')?.getAttribute('srcdoc') || ''`);
    v(srcdoc.length > 200 && !/tir-/.test(srcdoc), `la Vista previa (iframe) no contiene tiradores con el interruptor ${apagar ? 'apagado' : 'encendido'}`);
    await d.actions({ async: true }).sendKeys(Key.ESCAPE).perform(); await esperar(300);
  }
  console.log(`\n${ok} comprobaciones OK`);
} finally { await d.quit(); }
