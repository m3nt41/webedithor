// Investigación: ¿un valor escrito en un campo de texto del inspector se pierde o se revierte?
// Firefox real, editor compilado (dist/editor.html, file://), escribiendo con teclas reales (sendKeys).
// Ejecutar: npm run build && node tests/inspector-persistencia.mjs
// No aborta al primer fallo: imprime cada observación (OK / FALLA) para ver TODO lo que pasa.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n, walk } from '../src/core/tree.js';
import { createBlock } from '../src/blocks/index.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina';

const pagina = n('page', { name: 'Página' });
pagina.children.push(createBlock('navbar', 'oscuro'), createBlock('gallery', 'oscura'), createBlock('footer'));

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
let fallas = 0;
const ver = (ok, msg, extra = '') => { if (!ok) fallas++; console.log(`${ok ? 'OK   ' : 'FALLA'} ${msg}${extra ? '  → ' + extra : ''}`); };
const url = pathToFileURL(resolve('dist/editor.html')).href;

// ---- utilidades ----
const guardada = async () => JSON.parse(await d.executeScript(`return localStorage.getItem('${LS}')`));
const buscar = (pag, nombre) => { let r = null; walk(pag, (x) => { if (!r && x.name === nombre) r = x; }); return r; };
const estilo = async (nombre, modo, clave) => (buscar(await guardada(), nombre)?.styles?.[modo] ?? {})[clave];
const seleccionar = async (nombre) => {
  const id = buscar(await guardada(), nombre).id;
  await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
  await esperar(150);
};
const campo = (clave) => d.findElement(By.css(`#inspector [data-s="${clave}"]`));
/** Escribe de verdad, tecla por tecla: borra lo que haya y teclea. */
const abrirAvanzado = (clave) => d.executeScript(`const c=document.querySelector('#inspector [data-s="${clave}"]'); const g=c&&c.closest('details'); if(g) g.open=true;`);
const escribir = async (clave, texto) => {
  await abrirAvanzado(clave);
  const c = await campo(clave);
  await c.click();
  await c.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE);
  await c.sendKeys(texto);
};
const valorCampo = async (clave) => (await campo(clave)).getAttribute('value');
const elegirOpcion = async (clave, texto) => {
  const s = await campo(clave);
  await s.click();
  await (await s.findElement(By.xpath(`.//option[normalize-space()='${texto}']`))).click();
};
const cargar = async (pag) => {
  await d.get(url);
  await d.executeScript(`localStorage.setItem('editor-landings:niveles','{"esencial":true,"estilo":true,"avanzado":true}');localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pag));
  await d.get(url); await esperar(700);
};
const recargar = async () => { await d.navigate().refresh(); await esperar(700); };
const modo = async (m) => { await d.findElement(By.css(m === 'mobile' ? '#vista-mobile' : '#vista-desktop')).click(); await esperar(150); };

try {
  await d.manage().window().setRect({ width: 1400, height: 1000 });
  await cargar(pagina);

  // ===== 1. Escribir en Margen y Ancho máx. del Grid, esperar al autoguardado =====
  await seleccionar('Grid');
  await escribir('margin', '0 auto');
  await escribir('maxWidth', '900px');
  await esperar(500);
  ver(await estilo('Grid', 'base', 'margin') === '0 auto', '1a. Grid.margin guardado tras escribir "0 auto"', String(await estilo('Grid', 'base', 'margin')));
  ver(await estilo('Grid', 'base', 'maxWidth') === '900px', '1b. Grid.maxWidth guardado tras escribir "900px"', String(await estilo('Grid', 'base', 'maxWidth')));

  // ===== 2. Tocar otro elemento y volver =====
  await seleccionar('Footer').catch(() => {});
  await seleccionar('Galería'); await seleccionar('Grid');
  ver(await valorCampo('margin') === '0 auto', '2a. al volver, el campo Margen muestra "0 auto"', await valorCampo('margin'));
  ver(await estilo('Grid', 'base', 'margin') === '0 auto', '2b. y sigue guardado');

  // ===== 3. Escritorio/Móvil =====
  await modo('mobile'); await modo('desktop');
  ver(await valorCampo('margin') === '0 auto', '3a. tras Móvil→Escritorio el campo sigue en "0 auto"', await valorCampo('margin'));
  await modo('mobile');
  await escribir('margin', '0');   // override móvil
  await esperar(400);
  await modo('desktop');
  ver(await estilo('Grid', 'base', 'margin') === '0 auto', '3b. escribir en móvil NO toca el margin de escritorio', String(await estilo('Grid', 'base', 'margin')));
  ver(await estilo('Grid', 'mobile', 'margin') === '0', '3c. y el de móvil queda en styles.mobile', String(await estilo('Grid', 'mobile', 'margin')));

  // ===== 4. Vista previa abrir/cerrar =====
  await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(600);
  await d.findElement(By.css('#vp-ojo')).click(); await esperar(200);
  ver(await estilo('Grid', 'base', 'margin') === '0 auto' && await estilo('Grid', 'base', 'maxWidth') === '900px', '4. tras abrir/cerrar Vista previa, siguen guardados');

  // ===== 5. Ctrl+Z / Ctrl+Y con el foco fuera de los campos =====
  await seleccionar('Grid');
  await escribir('gap', '33px'); await esperar(400);
  await d.findElement(By.css('#preview')).click().catch(() => {});
  await d.actions().keyDown(Key.CONTROL).sendKeys('z').keyUp(Key.CONTROL).perform(); await esperar(300);
  const trasUndo = await estilo('Grid', 'base', 'gap');
  console.log('      (gap tras Ctrl+Z:', trasUndo, ')');
  await d.actions().keyDown(Key.CONTROL).sendKeys('y').keyUp(Key.CONTROL).perform(); await esperar(400);
  ver(await estilo('Grid', 'base', 'gap') === '33px', '5a. Ctrl+Y devuelve el gap a 33px', String(await estilo('Grid', 'base', 'gap')));
  ver(await estilo('Grid', 'base', 'margin') === '0 auto' && await estilo('Grid', 'base', 'maxWidth') === '900px', '5b. margin y maxWidth intactos tras Ctrl+Z / Ctrl+Y');

  // ===== 6. Recarga =====
  await recargar();
  ver(await estilo('Grid', 'base', 'margin') === '0 auto' && await estilo('Grid', 'base', 'maxWidth') === '900px', '6. tras recargar, margin y maxWidth siguen');

  // ===== 7. Recarga antes de que termine el autoguardado (300 ms) =====
  await seleccionar('Grid');
  await escribir('padding', '11px');
  await recargar();   // sin esperar
  ver(await estilo('Grid', 'base', 'padding') === '11px', '7. recarga inmediata tras escribir (ventana de 300 ms)', String(await estilo('Grid', 'base', 'padding')));

  // ===== 8. Un select ANTES de escribir en un campo de texto (bandera "forzar") =====
  await seleccionar('Grid');
  await elegirOpcion('display', 'Fila o columna');
  await esperar(200);
  await elegirOpcion('display', 'Cuadrícula');
  await esperar(200);
  await abrirAvanzado('margin');
  const c = await campo('margin');
  await c.click();
  await c.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE);
  await c.sendKeys('0 auto');
  await esperar(500);
  ver(await estilo('Grid', 'base', 'margin') === '0 auto', '8a. tras usar un select, escribir "0 auto" en Margen se guarda completo', String(await estilo('Grid', 'base', 'margin')));
  ver(await valorCampo('margin') === '0 auto', '8b. el campo sigue mostrando lo escrito', await valorCampo('margin'));
  const foco = await d.executeScript(`return document.activeElement?.dataset?.s || document.activeElement?.tagName`);
  ver(foco === 'margin', '8c. el foco sigue en el campo mientras se escribe', String(foco));

  // ===== 9. Navbar: Posición → Normal, luego tocar cosas =====
  await seleccionar('Navbar');
  ver(await estilo('Navbar', 'base', 'position') === undefined, '9a. (partida) el navbar nace normal (sin sticky)', String(await estilo('Navbar', 'base', 'position')));
  await elegirOpcion('position', 'Se queda fijo'); await esperar(400);
  ver(await estilo('Navbar', 'base', 'position') === 'sticky', '9a2. Posición → Pegado lo pega', String(await estilo('Navbar', 'base', 'position')));
  await elegirOpcion('position', 'Normal'); await esperar(400);
  ver(await estilo('Navbar', 'base', 'position') === undefined, '9b. Posición → Normal borra position de styles.base', String(await estilo('Navbar', 'base', 'position')));
  ver(await estilo('Navbar', 'base', 'top') === undefined && await estilo('Navbar', 'base', 'zIndex') === undefined, '9b2. Normal también borra el top/zIndex automáticos', `${await estilo('Navbar', 'base', 'top')} / ${await estilo('Navbar', 'base', 'zIndex')}`);
  // Pegado escribe top:0 y zIndex:50 (escritorio)
  await elegirOpcion('position', 'Se queda fijo'); await esperar(400);
  ver(await estilo('Navbar', 'base', 'top') === '0' && await estilo('Navbar', 'base', 'zIndex') === '50', '9e. Pegado (escritorio) escribe top:0 y zIndex:50', `${await estilo('Navbar', 'base', 'top')} / ${await estilo('Navbar', 'base', 'zIndex')}`);
  // Undo deshace todo de una vez
  await d.findElement(By.css('#btn-undo')).click(); await esperar(450);
  ver(await estilo('Navbar', 'base', 'position') === undefined && await estilo('Navbar', 'base', 'top') === undefined && await estilo('Navbar', 'base', 'zIndex') === undefined, '9f. un solo Undo quita position, top y zIndex');
  await d.findElement(By.css('#btn-redo')).click(); await esperar(450);
  ver(await estilo('Navbar', 'base', 'position') === 'sticky' && await estilo('Navbar', 'base', 'top') === '0' && await estilo('Navbar', 'base', 'zIndex') === '50', '9g. un solo Redo los devuelve');
  // En la Vista previa el navbar se queda pegado al hacer scroll
  await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(700);
  await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
  const yNav = await d.executeScript(`const se=document.scrollingElement; const rel=document.createElement('div'); rel.style.height='3000px'; document.body.appendChild(rel); se.scrollTop=400; const nv=document.body.querySelector('[data-id], section, nav'); return new Promise(r=>setTimeout(()=>r([se.scrollTop, Math.round(nv.getBoundingClientRect().top), se.scrollHeight]),300))`);
  await d.switchTo().defaultContent();
  await d.findElement(By.css('#vp-ojo')).click(); await esperar(200);
  ver(yNav[0] > 0 && yNav[1] === 0, '9h. Vista previa: tras hacer scroll el navbar sigue en top:0', JSON.stringify(yNav));
  // Si el usuario escribe su propio top, no se borra al volver a Normal ni se pisa al volver a Pegado
  await escribir('top', '12px'); await esperar(400);
  await elegirOpcion('position', 'Normal'); await esperar(400);
  ver(await estilo('Navbar', 'base', 'top') === '12px', '9j. Normal no borra el top escrito a mano', String(await estilo('Navbar', 'base', 'top')));
  await elegirOpcion('position', 'Se queda fijo'); await esperar(400);
  ver(await estilo('Navbar', 'base', 'top') === '12px', '9i. Pegado no pisa un top que ya existía', String(await estilo('Navbar', 'base', 'top')));
  await escribir('top', ''); await esperar(300);
  await elegirOpcion('position', 'Normal'); await esperar(400);
  // Móvil
  await modo('mobile');
  await elegirOpcion('position', 'Se queda fijo'); await esperar(400);
  ver(await estilo('Navbar', 'mobile', 'position') === 'sticky' && await estilo('Navbar', 'mobile', 'top') === '0' && await estilo('Navbar', 'mobile', 'zIndex') === '50', '9k. Pegado (móvil) escribe top:0 y zIndex:50 en mobile', JSON.stringify((buscar(await guardada(), 'Navbar')).styles.mobile));
  await elegirOpcion('position', 'Igual que escritorio'); await esperar(400);
  ver(Object.keys(buscar(await guardada(), 'Navbar').styles.mobile).filter((k) => ['position', 'top', 'zIndex'].includes(k)).length === 0, '9l. "Igual que escritorio" borra position, top y zIndex de mobile');
  await modo('desktop');
  await modo('mobile'); await modo('desktop');
  await seleccionar('Grid'); await seleccionar('Navbar');
  await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(600);
  await d.findElement(By.css('#vp-ojo')).click(); await esperar(200);
  ver(await estilo('Navbar', 'base', 'position') === undefined, '9c. tras móvil/escritorio, otra selección y Vista previa, position sigue sin sticky', String(await estilo('Navbar', 'base', 'position')));
  await recargar();
  ver(await estilo('Navbar', 'base', 'position') === undefined, '9d. tras recargar, position sigue sin sticky', String(await estilo('Navbar', 'base', 'position')));

  // ===== 10. Dos pestañas del editor (mismo almacenamiento): la que quedó con datos viejos pisa a la otra =====
  const pestA = await d.getWindowHandle();
  await d.switchTo().newWindow('tab');
  await d.get(url); await esperar(700);                    // pestaña B: carga el estado actual (navbar SIN sticky)
  await d.switchTo().window(pestA);
  await seleccionar('Navbar');
  await elegirOpcion('position', 'Se queda fijo'); await esperar(500);   // A: vuelve a poner sticky y se guarda
  const pestB = (await d.getAllWindowHandles()).find((h) => h !== pestA);
  await d.switchTo().window(pestB);
  await seleccionar('Grid');
  await escribir('gap', '77px'); await esperar(500);        // B (con navbar viejo, sin sticky) guarda TODA la página
  ver(await d.executeScript(`return !document.getElementById('aviso-pestanas').hidden`), '10a. la pestaña B muestra el aviso de cambios de otra pestaña');
  await d.switchTo().window(pestA);
  ver(await d.executeScript(`return document.getElementById('aviso-pestanas').hidden`), '10b. la pestaña A (la que guardó) NO muestra aviso');
  await recargar();
  const posTrasDosPestanas = await estilo('Navbar', 'base', 'position');
  ver(posTrasDosPestanas === 'sticky', '10. con 2 pestañas abiertas, el cambio de la pestaña A (sticky) sobrevive a un guardado de la pestaña B', String(posTrasDosPestanas));

  console.log(fallas ?`\n${fallas} observación(es) FALLARON` : '\nTodo guardado correctamente');
} finally { await d.quit(); }
process.exit(fallas ? 1 : 0);
