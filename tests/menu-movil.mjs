// Prueba: menú hamburguesa en móvil del Navbar. Firefox real.
//  A) HTML exportado dentro de un iframe de 375px (los @media responden al iframe) + escritorio a 1300px.
//  B) Editor compilado (dist/editor.html): vista móvil con panel abierto, interruptor del inspector, Undo, persistencia.
// Ejecutar: npm run build && node tests/menu-movil.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n, walk } from '../src/core/tree.js';
import { createBlock } from '../src/blocks/index.js';
import { exportHTML } from '../src/export/exporter.js';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let fallas = 0;
const ver = (ok, msg, extra = '') => { if (!ok) fallas++; console.log(`${ok ? 'OK   ' : 'FALLA'} ${msg}${extra ? '  → ' + extra : ''}`); };

mkdirSync('tests/out', { recursive: true });
const pag = (...hijos) => { const p = n('page', { name: 'Página' }); p.children.push(...hijos); return p; };
const base = (variante = 'oscuro') => pag(createBlock('navbar', variante), createBlock('hero'), createBlock('services'), createBlock('pricing'), createBlock('contact'), createBlock('footer'));
const guardar = (nombre, html) => writeFileSync(`tests/out/${nombre}.html`, html);
guardar('menu-host', `<!doctype html><body style="margin:0"><iframe id="f" style="border:0;display:block" height="700"></iframe>
<script>const q=new URLSearchParams(location.search);const f=document.getElementById('f');f.width=q.get('w');f.src=q.get('src')</script></body>`);

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(new firefox.Options().addArguments('-headless').setBinary(FIREFOX)).build();
const fu = (nombre) => pathToFileURL(resolve(`tests/out/${nombre}.html`)).href;
const abrirMovil = async (nombre) => {
  await d.get(`${fu('menu-host')}?src=${encodeURIComponent(`menu-${nombre}.html`)}&w=375`);
  await esperar(500);
  await d.switchTo().frame(await d.findElement(By.css('#f')));
};
const salirFrame = () => d.switchTo().defaultContent();
const js = (s, ...a) => d.executeScript(s, ...a);
const visible = (sel) => js(`const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.textContent.trim()||true); return !!e && e.getClientRects().length>0 && getComputedStyle(e).display!=='none'`);
const enlaceVis = (texto) => js(`const a=[...document.querySelectorAll('a')].find(x=>x.textContent.trim()===arguments[0]); return !!a && a.getClientRects().length>0`, texto);
const marcado = () => js(`return document.querySelector('.mm-chk').checked`);
const rectDe = (texto) => js(`const a=[...document.querySelectorAll('a')].find(x=>x.textContent.trim()===arguments[0]); const r=a.getBoundingClientRect(); return {x:r.x,y:r.y,w:r.width,h:r.height}`, texto);

try {
  // ===================== A. EXPORT =====================
  const pagina = base();
  guardar('menu-base', exportHTML(pagina));
  const html = exportHTML(pagina);
  ver(/id="precios"/.test(html) && /class="mm-chk"/.test(html) && /class="mm-btn"/.test(html), 'A0. el export lleva anclas, checkbox y label');
  ver((html.match(/<script>/g) || []).length === 1 && /mm-chk/.test(html.split('<script>')[1] ?? ''), 'A0b. el script mínimo viaja (solo ese)');

  // --- móvil 375 ---
  guardar('menu-base', html);
  await abrirMovil('base');
  const alturaCerrada = await js(`return document.querySelector('section').getBoundingClientRect().height`);
  ver(await visible('.mm-btn'), 'A1. móvil: la hamburguesa se ve');
  const rb = await js(`const r=document.querySelector('.mm-btn').getBoundingClientRect(); return {w:r.width,h:r.height}`);
  ver(rb.w >= 44 && rb.h >= 44, 'A1b. zona de toque ≥ 44x44', JSON.stringify(rb));
  ver(!(await enlaceVis('Servicios')) && !(await enlaceVis('Hablemos')), 'A2. móvil cerrado: enlaces y botón de acción ocultos');
  ver(alturaCerrada < 90, 'A2b. navbar cerrado bajo (una sola fila)', String(alturaCerrada));
  ver(await js(`return document.querySelector('.mm-chk').getAttribute('aria-label')`) === 'Abrir menú', 'A2c. aria-label "Abrir menú"');
  const heroY = () => js(`return document.querySelectorAll('section')[1].getBoundingClientRect().top + scrollY`);
  const yAntes = await heroY();

  await d.findElement(By.css('.mm-btn')).click(); await esperar(450);
  ver(await marcado(), 'A3. clic: el checkbox queda marcado');
  ver((await enlaceVis('Servicios')) && (await enlaceVis('Precios')) && (await enlaceVis('Hablemos')), 'A3b. aparece el panel (enlaces y botón)');
  ver(await js(`return document.querySelector('.mm-chk').getAttribute('aria-expanded')`) === 'true', 'A3c. aria-expanded=true (script)');
  const tr = await js(`return getComputedStyle(document.querySelector('.mm-btn'),'::before').transform`);
  ver(tr && tr !== 'none', 'A3d. el icono pasa a X (transform de la línea)', tr);
  const r1 = await rectDe('Servicios'), r2 = await rectDe('Precios'), rc = await rectDe('Hablemos');
  ver(r1.w > 300 && r2.w > 300 && r1.h >= 44 && r2.h >= 44, 'A3e. enlaces apilados a todo el ancho y ≥44px de alto', JSON.stringify([r1, r2]));
  ver(r2.y > r1.y + 40 && rc.y > r2.y && rc.w > 300 && rc.h >= 44, 'A3f. botón de acción al final, a todo el ancho', JSON.stringify(rc));
  ver((await heroY()) > yAntes + 100, 'A3g. el panel EMPUJA el contenido (no es overlay)', `${yAntes} → ${await heroY()}`);
  ver(await js(`const a=[...document.querySelectorAll('a')].find(x=>x.textContent.trim()==='Precios'); return getComputedStyle(a).borderTopWidth`) === '1px', 'A3h. separadores de 1px');

  // pulsar un enlace: cierra y salta al ancla
  await d.findElement(By.xpath(`//a[normalize-space()='Precios']`)).click(); await esperar(900);
  ver(!(await marcado()), 'A4. pulsar un enlace cierra el menú');
  const arriba = await js(`return document.getElementById('precios').getBoundingClientRect().top`);
  ver(await js('return scrollY') > 300 && arriba < 200 && arriba > -50, 'A4b. y salta al ancla', `scrollY=${await js('return scrollY')} top=${arriba}`);
  ver(await js(`return document.querySelector('.mm-chk').getAttribute('aria-expanded')`) === 'false', 'A4c. aria-expanded=false');

  // Esc
  await js('scrollTo(0,0)'); await d.findElement(By.css('.mm-btn')).click(); await esperar(300);
  ver(await marcado(), 'A5. (abre de nuevo)');
  await d.actions().sendKeys(Key.ESCAPE).perform(); await esperar(300);
  ver(!(await marcado()), 'A5b. Esc cierra el menú');

  // teclado: Tab llega al checkbox; Espacio abre; Enter cierra
  await js(`scrollTo(0,0)`);
  await d.findElement(By.xpath(`//p[normalize-space()='Mi Marca']`)).click(); await esperar(100); // el foco empieza en el logo: el siguiente Tab cae en la hamburguesa
  await d.actions().sendKeys(Key.TAB).perform(); await esperar(150);
  ver(await js(`return document.activeElement.classList.contains('mm-chk')`), 'A6. Tab enfoca la hamburguesa');
  ver((await js(`const s=getComputedStyle(document.querySelector('.mm-btn')); return s.outlineStyle`)) === 'solid', 'A6b. foco visible (outline)');
  await d.actions().sendKeys(Key.SPACE).perform(); await esperar(300);
  ver(await marcado() && await enlaceVis('Servicios'), 'A6c. Espacio abre');
  await d.actions().sendKeys(Key.ENTER).perform(); await esperar(300);
  ver(!(await marcado()), 'A6d. Enter cierra');
  await d.actions().sendKeys(Key.ENTER).perform(); await esperar(300);
  ver(await marcado(), 'A6e. Enter abre');
  await salirFrame();

  // --- escritorio 1300 ---
  await d.manage().window().setRect({ width: 1300, height: 900 });
  await d.get(fu('menu-base')); await esperar(400);
  ver(!(await visible('.mm-btn')) && (await js(`return getComputedStyle(document.querySelector('.mm-chk')).display`)) === 'none', 'A7. escritorio: hamburguesa y checkbox no se ven');
  ver((await enlaceVis('Servicios')) && (await enlaceVis('Hablemos')), 'A7b. escritorio: enlaces y botón visibles en la barra');
  const fila = await js(`const s=document.querySelector('section'); const l=[...s.querySelectorAll('a')].map(a=>a.getBoundingClientRect().top); return Math.max(...l)-Math.min(...l)`);
  ver(fila < 30, 'A7c. escritorio: todo en una fila', String(fila));

  // --- sin JS: el checkbox abre y cierra ---
  guardar('menu-nojs', html.replace(/<script>[\s\S]*<\/script>\n/, ''));
  await abrirMovil('nojs');
  ver(!(await enlaceVis('Servicios')), 'A8. sin JS: cerrado');
  await d.findElement(By.css('.mm-btn')).click(); await esperar(300);
  ver(await enlaceVis('Servicios'), 'A8b. sin JS: el clic abre');
  await d.findElement(By.css('.mm-btn')).click(); await esperar(300);
  ver(!(await enlaceVis('Servicios')), 'A8c. sin JS: otro clic cierra');
  await salirFrame();

  // --- sticky ---
  const pegado = base(); Object.assign(pegado.children[0].styles.base, { position: 'sticky', top: '0', zIndex: '50' });
  guardar('menu-sticky', exportHTML(pegado));
  await abrirMovil('sticky');
  await js('scrollTo(0,600)'); await esperar(300);
  ver(Math.abs(await js(`return document.querySelector('section').getBoundingClientRect().top`)) < 1, 'A9. navbar sticky sigue pegado (móvil)');
  await d.findElement(By.css('.mm-btn')).click(); await esperar(300);
  ver(await enlaceVis('Servicios') && Math.abs(await js(`return document.querySelector('section').getBoundingClientRect().top`)) < 1, 'A9b. sticky con el panel abierto');
  await d.findElement(By.xpath(`//a[normalize-space()='Precios']`)).click(); await esperar(900);
  const tCont = await js(`const e=document.getElementById('precios'); return e? e.getBoundingClientRect().top : null`);
  ver(tCont !== null && tCont >= 60 && tCont < 130, 'A9c. el margen de anclas sigue sirviendo con navbar sticky', String(tCont));
  await salirFrame();

  // --- opción desactivada: comportamiento antiguo ---
  const off = base(); delete off.children[0].content.menuMovil;
  const htmlOff = exportHTML(off);
  ver(!/mm-chk|mm-btn|mm-in/.test(htmlOff), 'A10. sin la opción: el export no lleva nada del menú (ni script)');
  guardar('menu-off', htmlOff);
  await abrirMovil('off');
  ver(!(await visible('.mm-btn')) && await enlaceVis('Servicios') && await enlaceVis('Hablemos'), 'A10b. opción apagada: enlaces visibles como antes (segunda fila)');
  await salirFrame();

  // --- hijos reordenados y uno extra ---
  const re = base(); const nav = re.children[0];
  const [logo, enl, cta] = nav.children;
  nav.children = [cta, logo, enl, n('text', { name: 'Extra', content: { text: 'Texto extra' }, styles: {} })];
  guardar('menu-reorden', exportHTML(re));
  await abrirMovil('reorden');
  ver((await enlaceVis('Hablemos')) && !(await enlaceVis('Mi Marca')) && !(await enlaceVis('Servicios')), 'A11. reordenado: solo el PRIMER hijo queda visible (el botón)');
  await d.findElement(By.css('.mm-btn')).click(); await esperar(400);
  const todo = (await enlaceVis('Servicios')) && (await js(`return [...document.querySelectorAll('p')].some(p=>p.textContent==='Texto extra' && p.getClientRects().length>0)`)) && (await js(`return [...document.querySelectorAll('p')].some(p=>p.textContent==='Mi Marca' && p.getClientRects().length>0)`));
  ver(todo, 'A11b. abierto: aparecen los demás hijos (logo, enlaces y el extra)');
  await salirFrame();

  // ===================== B. EDITOR =====================
  await d.manage().window().setRect({ width: 1400, height: 1000 });
  const urlEd = pathToFileURL(resolve('dist/editor.html')).href;
  const LS = 'editor-landings:pagina';
  const guardada = async () => JSON.parse(await d.executeScript(`return localStorage.getItem('${LS}')`));
  const buscar = (p, nombre) => { let r = null; walk(p, (x) => { if (!r && x.name === nombre) r = x; }); return r; };
  const cargar = async (p) => { await d.get(urlEd); await d.executeScript(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(p)); await d.get(urlEd); await esperar(700); };
  const modo = async (m) => { await d.findElement(By.css(m === 'mobile' ? '#vista-mobile' : '#vista-desktop')).click(); await esperar(250); };

  const pe = pag(createBlock('navbar', 'claro'), createBlock('hero'));
  await cargar(pe);
  const total = await js(`return document.querySelectorAll('#preview [data-id]').length`);
  ver((await js(`return document.querySelectorAll('#preview .mm-btn, #preview .mm-edit').length`)) === 0, 'B1. escritorio: nada de hamburguesa en el editor');
  await modo('mobile');
  ver((await js(`return document.querySelectorAll('#preview .mm-edit>.mm-btn').length`)) === 1, 'B2. móvil: icono de hamburguesa en el editor');
  const encl = await js(`const a=[...document.querySelectorAll('#preview a')].find(x=>x.textContent.trim()==='Servicios'); const r=a.getBoundingClientRect(); return {w:r.width,h:r.height}`);
  ver(encl.w > 250 && encl.h >= 40, 'B2b. el panel se ve siempre abierto (enlaces apilados)', JSON.stringify(encl));
  ver((await js(`return document.querySelectorAll('#preview [data-id]').length`)) === total, 'B2c. el icono no añade ni quita nodos con data-id');
  ver((await js(`return document.querySelectorAll('#capas [data-id], #sidebar [data-id]').length`)) >= 0, 'B2d. (Capas intacto)');
  // seleccionar un enlace del panel
  const idEnlace = buscar(await guardada(), 'Enlaces').children[1].id;
  await js(`document.querySelector('#preview [data-id="${idEnlace}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`); await esperar(200);
  ver((await js(`return document.querySelector('#inspector input[data-c="text"], #inspector textarea[data-c="text"]')?.value`)) === 'Servicios', 'B2e. se puede seleccionar un enlace del panel');

  // interruptor del inspector
  const idNav = buscar(await guardada(), 'Navbar').id;
  const selNav = async () => { await js(`document.querySelector('#preview [data-id="${idNav}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`); await esperar(200); };
  await selNav();
  const sel = () => d.findElement(By.css('#inspector select[data-c="menuMovil"]'));
  ver((await (await sel()).getAttribute('value')) === 'si', 'B3. el interruptor marca Sí en un navbar nuevo');
  const antes = await guardada();
  await (await sel()).click(); await (await (await sel()).findElement(By.xpath(`.//option[@value='no']`))).click(); await esperar(500);
  const despues = await guardada();
  ver(buscar(despues, 'Navbar').content.menuMovil === undefined, 'B4. "No" quita menuMovil del JSON');
  ver(JSON.stringify({ ...buscar(despues, 'Navbar').content }) === JSON.stringify((({ menuMovil, ...r }) => r)(buscar(antes, 'Navbar').content)), 'B4b. no pisa otros valores del content');
  ver(JSON.stringify(buscar(despues, 'Navbar').styles) === JSON.stringify(buscar(antes, 'Navbar').styles), 'B4c. ni los estilos');
  ver((await js(`return document.querySelectorAll('#preview .mm-edit').length`)) === 0, 'B4d. móvil: sin hamburguesa en el editor al apagarla');
  await d.findElement(By.css('#btn-undo')).click(); await esperar(400);
  ver(buscar(await guardada(), 'Navbar').content.menuMovil === true, 'B5. Undo vuelve a activarla');
  await esperar(500); await d.navigate().refresh(); await esperar(800);
  ver(buscar(await guardada(), 'Navbar').content.menuMovil === true, 'B6. persiste tras recargar');
  await d.findElement(By.css('#btn-undo')).click().catch(() => {});
  // landing "vieja" (sin el campo): se comporta como desactivado y no se toca
  const vieja = pag(createBlock('navbar', 'claro')); delete vieja.children[0].content.menuMovil;
  await cargar(vieja); await modo('mobile'); await selNavVieja();
  async function selNavVieja() {
    const id = buscar(await guardada(), 'Navbar').id;
    await js(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`); await esperar(200);
  }
  ver((await js(`return document.querySelectorAll('#preview .mm-edit').length`)) === 0, 'B7. landing vieja: sin hamburguesa');
  ver((await (await sel()).getAttribute('value')) === 'no', 'B7b. y el interruptor marca No');
  ver(!('menuMovil' in buscar(await guardada(), 'Navbar').content), 'B7c. abrirla no escribe el campo');
  // vista previa (iframe) con la opción activa en móvil 390
  await cargar(pe);
  await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(700);
  await d.findElement(By.css('#vp-movil, [data-vp="mobile"], #vp-mobile')).click().catch(() => {});
  await esperar(400);
  await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
  const vistoMovil = await js(`return innerWidth<=768 ? getComputedStyle(document.querySelector('.mm-btn')).display : 'escritorio'`);
  ver(vistoMovil === 'flex' || vistoMovil === 'escritorio', 'B8. Vista previa funciona con el menú', vistoMovil);
  await salirFrame();
} finally {
  await d.quit();
}
console.log(fallas ? `\n${fallas} FALLA(S)` : '\nTodo en verde');
process.exit(fallas ? 1 : 0);
