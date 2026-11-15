// Controles visuales del inspector, en Firefox real sobre el editor compilado (dist/editor.html, file://).
// Ejecutar: npm run build && node tests/inspector.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n, walk } from '../src/core/tree.js';
import { createBlock } from '../src/blocks/index.js';
import { exportHTML } from '../src/export/exporter.js';
import { botonTema, MODOS } from '../src/blocks/tema.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina';

// Dos galerías: "cuadricula" (repeat(3, 1fr), móvil '1fr 1fr', hijos 4/3) y "oscura" (auto-fit minmax(260px, 1fr)).
const pagina = n('page', { name: 'Página' });
pagina.children.push(createBlock('gallery', 'cuadricula'), createBlock('gallery', 'oscura'));
// Mini-etapa Forma/Tamaño: un botón (pastilla, padding 14px 28px = ningún tamaño) y una imagen con radio raro (4px)
pagina.children.push(n('section', { name: 'SecBtn', children: [
  n('button', { name: 'BtnTest', content: { text: 'Hola botón', href: '#' }, styles: { padding: '14px 28px', fontSize: '16px', borderRadius: '999px', background: '#7c5cff', color: '#fff' } }),
  // Estilo de botón: los dos del tema (primario = Relleno, secundario = Contorno) y uno con borde raro (3px dashed = Otro)
  n('button', { name: 'BtnPrim', content: { text: 'Prim', href: '#' }, styles: botonTema(MODOS.claro, 'm', 'primario') }),
  n('button', { name: 'BtnSec', content: { text: 'Sec', href: '#' }, styles: botonTema(MODOS.claro, 'm', 'secundario') }),
  n('button', { name: 'BtnRaro', content: { text: 'Raro', href: '#' }, styles: { padding: '12px 24px', fontSize: '16px', background: '#7c5cff', color: '#fff', border: '3px dashed #7c5cff' } }),
  n('image', { name: 'ImgRara', content: { src: '', alt: '' }, styles: { borderRadius: '4px', width: '120px', height: '80px' } }),
] }));
const grids = []; walk(pagina, (x) => { if (x.name === 'Grid') grids.push(x); });
const [g3, gAuto] = grids;
g3.name = 'Grid3'; gAuto.name = 'GridAuto';
g3.children[0].name = 'FotoG3'; // nombre único: la foto de la galería "cuadricula" trae radio 12px
// valores "raros" de un JSON viejo, para comprobar que se muestran como personalizado y NO se tocan
gAuto.styles.base.margin = '20px 0';
gAuto.styles.base.maxWidth = '900';   // sin unidad: el navegador lo ignora

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1400, height: 1100 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('editor-landings:niveles','{"esencial":true,"estilo":true,"avanzado":true}');localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);
  await d.executeScript(`window.__err=[];addEventListener('error',e=>__err.push(e.message));`);

  const guardada = async () => { await esperar(450); return JSON.parse(await d.executeScript(`return localStorage.getItem('${LS}')`)); };
  const nodo = async (nombre) => { let r = null; walk(await guardada(), (x) => { if (x.name === nombre) r = x; }); return r; };
  const est = async (nombre, modo, clave) => (await nodo(nombre)).styles[modo][clave];
  const seleccionar = async (nombre) => {
    const id = (await nodo(nombre)).id;
    await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    await esperar(150);
  };
  const boton = (clave, texto) => d.findElement(By.xpath(`//*[@id='inspector']//button[(@data-ctl='${clave}' or (@data-tam and '${clave}'='padding')) and normalize-space()='${texto}']`));
  const pulsar = async (clave, texto) => { await (await boton(clave, texto)).click(); await esperar(150); };
  const activo = async (clave) => d.executeScript(`return [...document.querySelectorAll('#inspector button[data-ctl="${clave}"].on, #inspector button[data-ctl-otro="${clave}"].on${clave === 'padding' ? ', #inspector button[data-tam].on' : ''}')].map(b=>b.textContent.trim())`);
  const modo = async (m) => { await d.findElement(By.css(m === 'mobile' ? '#vista-mobile' : '#vista-desktop')).click(); await esperar(150); };
  const sinHistorial = async () => d.executeScript(`return document.querySelector('#btn-undo').disabled`);
  const crudo = (clave) => d.findElement(By.css(`#inspector details.avanzado [data-s="${clave}"]`));
  // Ojo: Ctrl+A + Borrar + texto en UNA sola llamada de sendKeys pierde el texto (también en un <input> suelto: es un artefacto de geckodriver); van en llamadas separadas.
  const teclear = async (el, txt, clic = true) => { if (clic) await el.click(); await el.sendKeys(Key.chord(Key.CONTROL, 'a'), Key.BACK_SPACE); await el.sendKeys(txt); };

  // 1. Abrir un nodo NO escribe nada (Undo sigue deshabilitado) y los valores viejos se leen bien
  await seleccionar('GridAuto');
  assert.deepEqual(await activo('gridTemplateColumns'), ['Auto'], 'auto-fit debe marcar Auto');
  assert.equal(await d.executeScript(`return document.querySelector('[data-ctl-min]').value`), '260', 'mínimo del Auto');
  assert.deepEqual(await activo('margin'), ['Otro'], 'margin "20px 0" debe ser personalizado');
  assert.deepEqual(await activo('maxWidth'), ['Otro'], 'maxWidth "900" debe ser personalizado');
  assert.equal(await d.executeScript(`return !!document.querySelector('#inspector details.avanzado[open]')`), true, 'Avanzado se abre solo con valores personalizados');
  assert.equal(await sinHistorial(), true, 'abrir el nodo escribió algo');
  assert.equal((await est('GridAuto', 'base', 'margin')), '20px 0');

  // 2. maxWidth "900" sin unidad: campo en rojo + aviso, y el valor sigue guardado (no se descarta)
  assert.ok((await (await crudo('maxWidth')).getAttribute('class')).includes('invalido'), 'maxWidth 900 debería marcarse inválido');
  assert.equal(await d.executeScript(`return !document.querySelector('#inspector [data-aviso-css]:not([hidden])') ? 'sin aviso' : 'aviso'`), 'aviso');
  assert.equal(await est('GridAuto', 'base', 'maxWidth'), '900');
  // escribir a mano "900px" quita el aviso (tecleo real)
  const mw = await crudo('maxWidth');
  await teclear(mw, '900px'); await esperar(200);
  assert.ok(!(await mw.getAttribute('class')).includes('invalido'), '900px es válido');
  assert.equal(await est('GridAuto', 'base', 'maxWidth'), '900px');
  await teclear(mw, '900', false); await esperar(200);
  assert.ok((await mw.getAttribute('class')).includes('invalido'), 'volver a 900 vuelve a avisar');

  // 3. Columnas: el botón escribe lo mismo que escribirlo a mano
  await seleccionar('Grid3');
  assert.deepEqual(await activo('gridTemplateColumns'), ['3']);
  await pulsar('gridTemplateColumns', '4');
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), 'repeat(4, 1fr)');
  assert.deepEqual(await activo('gridTemplateColumns'), ['4'], 'el botón activo se actualiza');
  const antesMano = await est('Grid3', 'base', 'gridTemplateColumns');
  const rc = await crudo('gridTemplateColumns'); // a mano: el mismo valor deja el estado idéntico
  await (await d.findElement(By.css('[data-ctl-otro="gridTemplateColumns"]'))).click(); // "Otro" abre Avanzado y enfoca el campo
  assert.equal(await d.executeScript('return document.activeElement.dataset.s'), 'gridTemplateColumns', '"Otro" debe enfocar el campo de texto');
  await teclear(rc, 'repeat(4, 1fr)', false); await esperar(200);
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), antesMano, 'botón y teclado deben guardar lo mismo');
  await pulsar('gridTemplateColumns', 'Auto');
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), 'repeat(auto-fit, minmax(240px, 1fr))');
  // el mínimo editable
  const min = await d.findElement(By.css('[data-ctl-min]'));
  await teclear(min, '300'); await esperar(200);
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), 'repeat(auto-fit, minmax(300px, 1fr))');
  assert.equal(await d.executeScript(`return document.activeElement.dataset.ctlMin`), 'gridTemplateColumns', 'escribir el mínimo no debe quitar el foco');

  // 4. Ancho máx. + Centrar (escritorio)
  await pulsar('maxWidth', '760');
  assert.equal(await est('Grid3', 'base', 'maxWidth'), '760px');
  await pulsar('margin', 'Centrado');
  assert.equal(await est('Grid3', 'base', 'margin'), '0 auto');
  assert.deepEqual(await activo('margin'), ['Centrado']);
  await pulsar('margin', 'Sin centrar');
  assert.equal(await est('Grid3', 'base', 'margin'), undefined, 'escritorio: Sin centrar quita margin');
  await pulsar('maxWidth', 'Completo');
  assert.equal(await est('Grid3', 'base', 'maxWidth'), undefined, 'escritorio: Completo quita maxWidth');

  // 5. Proporción de los hijos (Auto = quitar) y de una imagen (Auto = 'auto' explícito)
  assert.deepEqual(await activo('hijosAspectRatio'), ['4:3']);
  await pulsar('hijosAspectRatio', '16:9');
  assert.equal(await est('Grid3', 'base', 'hijosAspectRatio'), '16 / 9');
  await pulsar('hijosAspectRatio', 'Auto');
  assert.equal(await est('Grid3', 'base', 'hijosAspectRatio'), undefined);
  await seleccionar('Foto 1');
  await pulsar('aspectRatio', '3:2');
  assert.equal(await est('Foto 1', 'base', 'aspectRatio'), '3 / 2');
  await pulsar('aspectRatio', 'Auto');
  assert.equal(await est('Foto 1', 'base', 'aspectRatio'), 'auto');

  // 6. Deshacer revierte el clic de un botón
  await seleccionar('Grid3');
  await esperar(1200); // fuera de la ventana de agrupado
  const antes = await est('Grid3', 'base', 'gridTemplateColumns');
  await pulsar('gridTemplateColumns', '2');
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), 'repeat(2, 1fr)');
  await d.findElement(By.css('#btn-undo')).click(); await esperar(150);
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), antes, 'Deshacer no revirtió el clic');

  // 7. Móvil: escribe SOLO en styles.mobile; "igual que escritorio" lo borra; el heredado se ve atenuado
  await modo('mobile');
  assert.deepEqual(await activo('gridTemplateColumns'), ['2'], 'en móvil se muestra el valor propio ("1fr 1fr" = 2)');
  await pulsar('gridTemplateColumns', '1');
  assert.equal(await est('Grid3', 'mobile', 'gridTemplateColumns'), 'repeat(1, 1fr)');
  assert.equal(await est('Grid3', 'base', 'gridTemplateColumns'), antes, 'escritorio no debe cambiar');
  assert.equal(await d.executeScript(`return !!document.querySelector('#inspector label.ov')`), true, 'marca ● de valor propio en móvil');
  await pulsar('maxWidth', 'Completo');
  assert.equal(await est('Grid3', 'mobile', 'maxWidth'), 'none', 'móvil: Completo escribe none');
  await pulsar('margin', 'Sin centrar');
  assert.equal(await est('Grid3', 'mobile', 'margin'), '0', 'móvil: Sin centrar escribe 0');
  const reset = await d.findElement(By.xpath(`//*[@id='inspector']//button[@data-ctl='margin' and contains(.,'igual que escritorio')]`));
  await reset.click(); await esperar(150);
  assert.equal(await est('Grid3', 'mobile', 'margin'), undefined, 'el reset borra solo el override móvil');
  assert.equal(await d.executeScript(`return !!document.querySelector('#inspector [data-ctl="margin"]').closest('.botones').classList.contains('heredado')`), true, 'sin override se ve como heredado');
  await modo('desktop');

  // ---- 8. Forma (borderRadius) y Tamaño de botón ----
  await seleccionar('BtnTest');
  assert.equal(await d.executeScript(`return [...document.querySelectorAll('#inspector h3')][1].textContent`), 'Botón', 'el grupo Botón es el primero de estilos (tras Contenido)');
  assert.deepEqual(await activo('borderRadius'), ['Pastilla'], '999px = Pastilla');
  assert.deepEqual(await activo('padding'), ['Otro'], 'padding 14px 28px no es ningún tamaño: Otro');
  assert.equal(await d.executeScript(`return document.querySelectorAll('#inspector button[data-ctl="borderRadius"] svg').length`), 4, 'cada forma lleva su dibujo SVG');
  assert.equal(await d.executeScript(`return document.querySelectorAll('#inspector [data-s="borderRadius"]').length`), 1, 'el campo de texto Radio existe una sola vez (en Avanzado)');
  assert.deepEqual((await nodo('BtnTest')).styles.base, { padding: '14px 28px', fontSize: '16px', borderRadius: '999px', background: '#7c5cff', color: '#fff' }, 'abrir el botón escribió algo');
  // Forma: el botón escribe lo mismo que escribirlo a mano
  await esperar(1200);
  await pulsar('borderRadius', 'Suave');
  assert.equal(await est('BtnTest', 'base', 'borderRadius'), '6px');
  assert.deepEqual(await activo('borderRadius'), ['Suave']);
  const porBoton = await est('BtnTest', 'base', 'borderRadius');
  await pulsar('borderRadius', 'Recto');
  assert.equal(await est('BtnTest', 'base', 'borderRadius'), '0');
  await (await d.findElement(By.css('[data-ctl-otro="borderRadius"]'))).click();
  await teclear(await crudo('borderRadius'), '6px', false); await esperar(200);
  assert.equal(await est('BtnTest', 'base', 'borderRadius'), porBoton, 'botón y teclado deben guardar lo mismo');
  // Tamaño: padding y fontSize juntos, en UN paso de Undo
  await seleccionar('ImgRara'); await seleccionar('BtnTest'); // redibuja el panel
  assert.deepEqual(await activo('borderRadius'), ['Suave']);
  await esperar(1200);
  await pulsar('padding', 'Mediano');
  assert.equal(await est('BtnTest', 'base', 'padding'), '12px 24px'); assert.equal(await est('BtnTest', 'base', 'fontSize'), '16px');
  await pulsar('padding', 'Grande');
  assert.equal(await est('BtnTest', 'base', 'padding'), '16px 32px'); assert.equal(await est('BtnTest', 'base', 'fontSize'), '18px');
  assert.equal(await est('BtnTest', 'base', 'borderRadius'), '6px', 'cambiar el tamaño no pisa la forma');
  assert.equal(await est('BtnTest', 'base', 'background'), '#7c5cff', 'ni otros valores');
  assert.deepEqual(await activo('padding'), ['Grande']);
  await d.findElement(By.css('#btn-undo')).click(); await esperar(150);
  assert.equal(await est('BtnTest', 'base', 'padding'), '12px 24px', 'Undo revierte padding...');
  assert.equal(await est('BtnTest', 'base', 'fontSize'), '16px', '...y fontSize en el mismo paso');
  await d.findElement(By.css('#btn-redo')).click(); await esperar(150);
  assert.equal(await est('BtnTest', 'base', 'padding'), '16px 32px');
  // un valor a mano que solo coincide en uno de los dos -> Otro
  await (await d.findElement(By.css('[data-ctl-otro="padding"]'))).click();
  await teclear(await crudo('fontSize'), '17px', false); await esperar(200);
  await seleccionar('ImgRara'); await seleccionar('BtnTest');
  assert.deepEqual(await activo('padding'), ['Otro'], 'padding de Grande + fontSize 17px = Otro');
  await pulsar('padding', 'Grande'); // lo dejamos en Grande para el export
  // Imagen: radio 4px = Otro (no se toca); una foto de bloque con 12px = Redondo
  await seleccionar('ImgRara');
  assert.deepEqual(await activo('borderRadius'), ['Otro'], 'imagen con 4px: Otro');
  assert.equal(await est('ImgRara', 'base', 'borderRadius'), '4px', 'leer no escribe');
  await pulsar('borderRadius', 'Redondo');
  assert.equal(await est('ImgRara', 'base', 'borderRadius'), '12px');
  await seleccionar('FotoG3');
  assert.deepEqual(await activo('borderRadius'), ['Recto'], 'la foto de la galería nace recta (0): Recto');
  assert.equal(await d.executeScript(`return [...document.querySelectorAll('#inspector h3')].some(h=>h.textContent==='Botón')`), false, 'el grupo Botón solo sale en botones');
  await seleccionar('SecBtn');
  assert.equal(await d.executeScript(`return !!document.querySelector('#inspector button[data-ctl="borderRadius"]')`), true, 'las secciones tienen Forma');
  assert.equal(await d.executeScript(`return !!document.querySelector('#inspector button[data-tam]')`), false, 'Tamaño de botón solo en botones');
  // Móvil: escribe SOLO en styles.mobile
  await seleccionar('BtnTest');
  const baseAntes = { p: await est('BtnTest', 'base', 'padding'), f: await est('BtnTest', 'base', 'fontSize'), r: await est('BtnTest', 'base', 'borderRadius') };
  await modo('mobile');
  await pulsar('padding', 'Pequeño');
  assert.equal(await est('BtnTest', 'mobile', 'padding'), '8px 16px'); assert.equal(await est('BtnTest', 'mobile', 'fontSize'), '14px');
  assert.equal(await est('BtnTest', 'base', 'padding'), baseAntes.p, 'escritorio no cambia'); assert.equal(await est('BtnTest', 'base', 'fontSize'), baseAntes.f);
  await pulsar('borderRadius', 'Pastilla');
  assert.equal(await est('BtnTest', 'mobile', 'borderRadius'), '999px'); assert.equal(await est('BtnTest', 'base', 'borderRadius'), baseAntes.r);
  assert.equal(await d.executeScript(`return document.querySelectorAll('#inspector label.ov').length >= 2`), true, 'marca ● en móvil');
  // Export: el mismo CSS de siempre (base + @media móvil)
  const html = exportHTML(await guardada());
  assert.ok(/padding:16px 32px/.test(html) && /border-radius:6px/.test(html) && /font-size:18px/.test(html), 'export escritorio');
  assert.ok(/@media[^{]*\{[^]*padding:8px 16px;font-size:14px/.test(html), 'export móvil');
  // Vista previa en móvil (390 px): lo mismo que el export
  await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(900);
  await d.findElement(By.css('#vp-mobile')).click(); await esperar(500);
  await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
  const vpEst = await d.executeScript(`const b=[...document.querySelectorAll('a,button')].find(x=>x.textContent.includes('Hola botón')); const c=getComputedStyle(b); return [c.paddingTop, c.borderTopLeftRadius, c.fontSize]`);
  await d.switchTo().defaultContent();
  assert.deepEqual([vpEst[0], vpEst[2]], ['8px', '14px'], 'Vista previa móvil aplica el tamaño Pequeño: ' + vpEst);
  await d.findElement(By.css('#vp-ojo')).click(); await esperar(300);
  const resetT = await d.findElement(By.xpath(`//*[@id='inspector']//button[@data-tam='' and contains(.,'igual que escritorio')]`));
  await resetT.click(); await esperar(150);
  assert.equal(await est('BtnTest', 'mobile', 'padding'), undefined); assert.equal(await est('BtnTest', 'mobile', 'fontSize'), undefined, 'el reset borra los dos');
  assert.equal(await est('BtnTest', 'base', 'padding'), baseAntes.p);
  await modo('desktop');
  console.log('OK Forma y Tamaño de botón: lectura sin escribir, botón = a mano, un paso de Undo, no pisa, móvil, export y Vista previa');

  // ---- 9. Estilo de botón (Relleno / Contorno / Suave): background + color + border juntos ----
  const pulsarEst = async (txt) => { await (await d.findElement(By.xpath(`//*[@id='inspector']//button[@data-est and normalize-space()='${txt}']`))).click(); await esperar(150); };
  const activoEst = async () => d.executeScript(`return [...document.querySelectorAll('#inspector button[data-est].on, #inspector button[data-ctl-otro="background"].on')].map(b=>b.textContent.trim())`);
  const tres = async (nombre, m) => { const s = (await nodo(nombre)).styles[m]; return { background: s.background, color: s.color, border: s.border }; };
  const TINTA = '#111111', PAPEL = '#f7f5f0';
  // 9a. Leer no escribe: el primario del tema = Relleno, el secundario = Contorno, el de borde raro = Otro
  const antesRaro = JSON.stringify((await nodo('BtnRaro')).styles);
  await seleccionar('BtnRaro');
  assert.deepEqual(await activoEst(), ['Otro'], 'borde 3px dashed = Otro');
  assert.equal(await d.executeScript(`return document.querySelectorAll('#inspector button[data-est] svg').length`), 3, 'cada estilo lleva su dibujo SVG');
  assert.equal(JSON.stringify((await nodo('BtnRaro')).styles), antesRaro, 'abrir un botón raro escribió algo');
  await (await d.findElement(By.css('[data-ctl-otro="background"]'))).click(); await esperar(100);
  assert.equal(await d.executeScript(`return document.activeElement.dataset.s`), 'background', 'Otro lleva el cursor al campo Fondo');
  assert.equal(JSON.stringify((await nodo('BtnRaro')).styles), antesRaro, 'pulsar Otro escribió algo');
  await seleccionar('BtnPrim'); assert.deepEqual(await activoEst(), ['Relleno'], 'botonTema primario');
  await seleccionar('BtnSec'); assert.deepEqual(await activoEst(), ['Contorno'], 'botonTema secundario');
  await seleccionar('BtnPrim');
  const baseP = (await nodo('BtnPrim')).styles.base;
  await esperar(1200);
  // 9b. Un clic = tres propiedades, un solo paso de Undo, sin pisar lo demás
  await pulsarEst('Suave');
  assert.deepEqual(await tres('BtnPrim', 'base'), { background: `color-mix(in srgb, ${TINTA} 14%, transparent)`, color: TINTA, border: '1px solid transparent' }, 'Suave: color base = fondo del primario');
  const sinTres = (s) => { const { background, color, border, ...r } = s; return r; };
  assert.deepEqual(sinTres((await nodo('BtnPrim')).styles.base), sinTres(baseP), 'Suave no pisa padding, forma, etc.');
  assert.deepEqual(await activoEst(), ['Suave']);
  await d.findElement(By.css('#btn-undo')).click(); await esperar(150);
  assert.deepEqual((await nodo('BtnPrim')).styles.base, baseP, 'UN Undo devuelve las tres propiedades');
  await d.findElement(By.css('#btn-redo')).click(); await esperar(150);
  assert.equal((await tres('BtnPrim', 'base')).color, TINTA);
  // ida y vuelta: el color no se pierde y el texto del Relleno es el de contraste del tema
  await pulsarEst('Contorno');
  assert.deepEqual(await tres('BtnPrim', 'base'), { background: 'transparent', color: TINTA, border: `1px solid ${TINTA}` });
  await pulsarEst('Relleno');
  assert.deepEqual(await tres('BtnPrim', 'base'), { background: TINTA, color: PAPEL, border: `1px solid ${TINTA}` }, 'Relleno = como nació');
  // pulsar el estilo activo no escribe (ni añade paso de Undo)
  const jsonAntes = JSON.stringify((await nodo('BtnPrim')).styles);
  await pulsarEst('Relleno');
  assert.equal(JSON.stringify((await nodo('BtnPrim')).styles), jsonAntes, 'pulsar el activo no escribe');
  // un botón de otro color (el del test, #7c5cff) conserva su color base
  await seleccionar('BtnTest'); assert.deepEqual(await activoEst(), ['Relleno'], '#7c5cff sin borde = Relleno');
  await pulsarEst('Contorno');
  assert.deepEqual(await tres('BtnTest', 'base'), { background: 'transparent', color: '#7c5cff', border: '1px solid #7c5cff' });
  await pulsarEst('Relleno');
  assert.equal((await tres('BtnTest', 'base')).background, '#7c5cff');
  // 9c. Móvil: solo styles.mobile, "↺ igual que escritorio" borra las tres
  await seleccionar('BtnPrim');
  const baseAntesP = JSON.stringify((await nodo('BtnPrim')).styles.base);
  await modo('mobile');
  assert.deepEqual(await activoEst(), ['Relleno'], 'en móvil hereda el estilo de escritorio');
  assert.equal(await d.executeScript(`return !!document.querySelector('#inspector [data-est]').closest('.botones').classList.contains('heredado')`), true, 'sin override se ve heredado');
  await pulsarEst('Contorno');
  assert.deepEqual(await tres('BtnPrim', 'mobile'), { background: 'transparent', color: TINTA, border: `1px solid ${TINTA}` });
  assert.equal(JSON.stringify((await nodo('BtnPrim')).styles.base), baseAntesP, 'escritorio no cambia');
  assert.equal(await d.executeScript(`return document.querySelectorAll('#inspector label.ov').length >= 1`), true, 'marca ● en móvil');
  // 9d. Export y Vista previa (móvil 390 px): Contorno; escritorio: Relleno
  const html9 = exportHTML(await guardada());
  assert.ok(/@media[^{]*\{[^]*background:transparent;[^}]*color:#111111;[^}]*border:1px solid #111111/.test(html9), 'export móvil lleva las tres');
  await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(900);
  await d.findElement(By.css('#vp-mobile')).click(); await esperar(500);
  await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
  const medir = `const b=[...document.querySelectorAll('a,button')].find(x=>x.textContent.trim()==='Prim'); const c=getComputedStyle(b); return [c.backgroundColor, c.color, c.borderTopColor, c.borderTopWidth]`;
  const vpM = await d.executeScript(medir);
  assert.deepEqual([vpM[0], vpM[1], vpM[3]], ['rgba(0, 0, 0, 0)', 'rgb(17, 17, 17)', '1px'], 'Vista previa móvil = Contorno: ' + vpM);
  await d.switchTo().defaultContent();
  await d.findElement(By.css('#vp-desktop')).click(); await esperar(500);
  await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
  const vpD = await d.executeScript(medir);
  await d.switchTo().defaultContent();
  assert.deepEqual([vpD[0], vpD[1]], ['rgb(17, 17, 17)', 'rgb(247, 245, 240)'], 'Vista previa escritorio = Relleno: ' + vpD);
  await d.findElement(By.css('#vp-ojo')).click(); await esperar(300);
  await (await d.findElement(By.xpath(`//*[@id='inspector']//button[@data-est='' and contains(.,'igual que escritorio')]`))).click(); await esperar(150);
  assert.deepEqual(await tres('BtnPrim', 'mobile'), { background: undefined, color: undefined, border: undefined }, 'el reset borra las tres');
  assert.equal(JSON.stringify((await nodo('BtnPrim')).styles.base), baseAntesP);
  await modo('desktop');
  // Suave en escritorio: export y Vista previa (el fondo atenuado funciona de verdad en el navegador)
  await pulsarEst('Suave');
  assert.ok(exportHTML(await guardada()).includes('background:color-mix(in srgb, #111111 14%, transparent)'), 'export Suave');
  await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(900);
  await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
  const vpS = await d.executeScript(medir);
  await d.switchTo().defaultContent();
  assert.ok(vpS[0] !== 'rgba(0, 0, 0, 0)' && /0\.14/.test(vpS[0]), 'Vista previa Suave: fondo al 14 %: ' + vpS[0]);
  await d.findElement(By.css('#vp-ojo')).click(); await esperar(300);
  // el grupo Estilo solo sale en botones
  await seleccionar('SecBtn');
  assert.equal(await d.executeScript(`return !!document.querySelector('#inspector button[data-est]')`), false, 'Estilo de botón solo en botones');
  console.log('OK Estilo de botón: lectura sin escribir, un paso de Undo, no pisa, móvil, export y Vista previa');

  const errs = await d.executeScript('return __err');
  assert.deepEqual(errs, [], 'errores: ' + errs.join(' | '));
  console.log('OK inspector: valores viejos se leen sin escribir, aviso de CSS inválido, Columnas/Ancho máx./Centrar/Proporción = mismo string que a mano, Deshacer, móvil/escritorio y reset');
} finally { await d.quit(); }
