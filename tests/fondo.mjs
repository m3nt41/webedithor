// Imagen de fondo (secciones/contenedores) en Firefox real, sobre el editor compilado (dist/editor.html, file://).
// Ejecutar: npm run build && node tests/fondo.mjs   (o: npm run test:fondo)
// Comprueba: subir imagen grande (se reduce a <=1920 px JPEG), capa/ajuste/posición, editor, Vista previa, export,
// móvil (override y "igual que escritorio"), persistencia tras recargar, aviso de cuota llena y escape de la URL.
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n, walk } from '../src/core/tree.js';
import { createBlock } from '../src/blocks/index.js';
import { exportHTML } from '../src/export/exporter.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const FIREFOX = process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina';

const pagina = n('page', { name: 'Página' });
pagina.children.push(createBlock('hero', 'oscuro'));

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1400, height: 1100 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('editor-landings:niveles','{"esencial":true,"estilo":true,"avanzado":true}');localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(700);
  await d.executeScript(`window.__err=[];addEventListener('error',e=>__err.push(e.message));`);

  const guardada = async () => { await esperar(500); return JSON.parse(await d.executeScript(`return localStorage.getItem('${LS}')`)); };
  const hero = async () => { let r = null; walk(await guardada(), (x) => { if (x.name === 'Hero') r = x; }); return r; };
  const seleccionar = async () => {
    const id = (await hero()).id;
    await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`);
    await esperar(200);
    return id;
  };
  const estiloPreview = (id, prop) => d.executeScript(`return getComputedStyle(document.querySelector('#preview [data-id="${id}"]')).${prop}`);
  const boton = (clave, val) => d.findElement(By.css(`#inspector [data-ctl="${clave}"][data-val="${val}"]`));
  const rango = (v) => d.executeScript(`const r=document.querySelector('#inspector [data-capa]'); r.value='${v}'; r.dispatchEvent(new Event('input',{bubbles:true}));`);

  // ---- 1. Subir una imagen grande (3000x1500): se reduce a <=1920 px y JPEG ----
  const b64 = await d.executeScript(`const c=document.createElement('canvas');c.width=3000;c.height=1500;const x=c.getContext('2d');
    for(let i=0;i<60;i++){x.fillStyle='hsl('+(i*6)+',70%,50%)';x.fillRect(i*50,0,50,1500);} return c.toDataURL('image/png').split(',')[1];`);
  mkdirSync('tests/out', { recursive: true });
  const archivo = resolve('tests/out/fondo-grande.png');
  writeFileSync(archivo, Buffer.from(b64, 'base64'));

  const id = await seleccionar();
  await d.findElement(By.css('#inspector [data-fondo-file]')).sendKeys(archivo);
  await esperar(1200);
  let h = await hero();
  const src = h.styles.base.fondoImagen;
  assert.ok(src?.startsWith('data:image/jpeg'), 'la imagen subida debe quedar como JPEG: ' + src?.slice(0, 40));
  const dim = await d.executeAsyncScript(`const cb=arguments[arguments.length-1]; const i=new Image(); i.onload=()=>cb([i.naturalWidth,i.naturalHeight]); i.src=arguments[0];`, src);
  assert.deepEqual(dim, [1920, 960], 'se redimensiona a 1920 de ancho conservando la proporción: ' + dim);
  console.log(`OK subida: 3000x1500 PNG -> ${dim.join('x')} JPEG (${Math.round(src.length / 1024)} KB)`);

  // ---- 2. Capa, ajuste y posición ----
  await rango(50); await esperar(200);
  await (await boton('fondoAjuste', 'contain')).click(); await esperar(200);
  await (await boton('fondoPosicion', 'top')).click(); await esperar(200);
  h = await hero();
  assert.equal(Number(h.styles.base.fondoCapa), 50); assert.equal(h.styles.base.fondoAjuste, 'contain'); assert.equal(h.styles.base.fondoPosicion, 'top');
  const salida = await d.executeScript(`return document.querySelector('#inspector [data-capa-out]').textContent`);
  assert.equal(salida, '50%', 'el valor del deslizador se ve');
  // editor
  assert.ok((await estiloPreview(id, 'backgroundImage')).includes('linear-gradient') && (await estiloPreview(id, 'backgroundImage')).includes('url('), 'editor: gradiente + url');
  assert.equal(await estiloPreview(id, 'backgroundSize'), 'auto, contain');
  assert.equal(await estiloPreview(id, 'backgroundRepeat'), 'no-repeat');
  assert.equal(await estiloPreview(id, 'backgroundColor'), 'rgb(12, 12, 14)', 'el color queda de respaldo');
  console.log('OK editor: capa 50 % + contain + arriba, color de respaldo intacto');

  // ---- 3. Export (HTML real cargado en Firefox) ----
  const page = await guardada();
  const html = exportHTML(page);
  assert.ok(/background-image:linear-gradient\(rgba\(0,0,0,0\.5\),rgba\(0,0,0,0\.5\)\),url\("data:image\/jpeg/.test(html), 'export: gradiente + url');
  assert.ok(html.includes('background-size:auto,contain') && html.includes('background-position:center,top') && html.includes('background-repeat:no-repeat'));
  assert.ok(!/fondo-?(imagen|capa|ajuste|posicion)/i.test(html.replace(/url\("data:[^"]*"\)/, '')), 'las claves propias no salen como CSS');
  writeFileSync('tests/out/fondo.html', html);
  await d.get(pathToFileURL(resolve('tests/out/fondo.html')).href); await esperar(500);
  const s = await d.executeScript(`const e=document.querySelector('section'); const c=getComputedStyle(e); return [c.backgroundImage.includes('linear-gradient'), c.backgroundSize, c.backgroundColor]`);
  assert.equal(s[0], true); assert.equal(s[1], 'auto, contain'); assert.equal(s[2], 'rgb(12, 12, 14)');
  console.log('OK export: CSS puro, imagen sobre el color de fondo');

  // ---- 4. Vista previa del editor ----
  await d.get(url); await esperar(700);
  await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(900);
  await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
  const vp = await d.executeScript(`const c=getComputedStyle(document.querySelector('section')); return [c.backgroundImage.includes('linear-gradient'), c.backgroundSize]`);
  await d.switchTo().defaultContent();
  assert.deepEqual(vp, [true, 'auto, contain'], 'Vista previa');
  await d.findElement(By.css('#vp-ojo')).click(); await esperar(300);
  console.log('OK Vista previa: igual que el export');

  // ---- 5. Móvil: override solo en styles.mobile y "↺ igual que escritorio" ----
  await d.findElement(By.css('#vista-mobile')).click(); await esperar(200);
  await seleccionar();
  await rango(20); await esperar(200);
  h = await hero();
  assert.equal(Number(h.styles.mobile.fondoCapa), 20); assert.equal(Number(h.styles.base.fondoCapa), 50, 'escritorio intacto');
  assert.ok(await d.executeScript(`return !!document.querySelector('#inspector label.ov')`), 'marca ● de solo móvil');
  let ex = exportHTML(await guardada());
  assert.ok(/@media \(max-width:768px\)\{[\s\S]*background-image:linear-gradient\(rgba\(0,0,0,0\.2\),rgba\(0,0,0,0\.2\)\),url\(/.test(ex), 'export móvil con capa 0.2');
  await d.findElement(By.css('#inspector [data-ctl="fondoCapa"][data-val=""]')).click(); await esperar(300);
  h = await hero();
  assert.equal(h.styles.mobile.fondoCapa, undefined, '"igual que escritorio" borra el override');
  ex = exportHTML(await guardada());
  assert.ok(!/@media[\s\S]*rgba\(0,0,0,0\.2\)/.test(ex), 'sin override ya no hay regla móvil');
  await d.findElement(By.css('#vista-desktop')).click(); await esperar(200);
  console.log('OK móvil: override propio, ● y ↺ igual que escritorio');

  // ---- 6. Persistencia ----
  const antes = (await hero()).styles.base;
  await d.navigate().refresh(); await esperar(900);
  await d.executeScript(`window.__err=[];addEventListener('error',e=>__err.push(e.message));`);
  const despues = (await hero()).styles.base;
  assert.deepEqual(despues, antes, 'tras recargar se conserva todo');
  assert.ok((await estiloPreview((await hero()).id, 'backgroundImage')).includes('linear-gradient'), 'y se ve en el editor');
  console.log('OK persistencia: se guarda y se recarga');

  // ---- 7. Quitar ----
  await seleccionar();
  await d.findElement(By.css('#inspector [data-ctl="fondoImagen"][data-val=""]')).click(); await esperar(300);
  h = await hero();
  assert.equal(h.styles.base.fondoImagen, undefined);
  assert.ok(!exportHTML(await guardada()).includes('background-image'), 'sin imagen no se emite nada');
  console.log('OK quitar: sin imagen no sale nada');

  // ---- 8. URL pegada + escape ----
  await seleccionar();
  const campoUrl = await d.findElement(By.css('#inspector [data-fondo-url]'));
  const rara = 'https://x.test/a"b(c).jpg?q=1</style><script>alert(1)</script>';
  await d.executeScript(`const i=arguments[0]; i.value=arguments[1]; i.dispatchEvent(new Event('input',{bubbles:true}));`, campoUrl, rara);
  await esperar(500);
  const exr = exportHTML(await guardada());
  assert.ok(exr.includes('url("https://x.test/a\\"b(c).jpg?q=1\\3c /style>'), 'comillas y < escapados dentro de url("...")');
  assert.equal((exr.match(/<\/style>/g) || []).length, 1, 'la URL no puede cerrar el <style>');
  assert.ok(!exr.includes('<script>alert(1)'), 'no se cuela script');
  console.log('OK escape: comillas y </style> no rompen el CSS');

  // ---- 9. Cuota llena: aviso claro, no falla en silencio ----
  await d.executeScript(`try{ const t='x'.repeat(1024*1024); for(let i=0;i<200;i++) localStorage.setItem('relleno'+i, t);}catch(e){} try{ const m='x'.repeat(512); for(let j=0;j<100000;j++) localStorage.setItem('relleno_f'+j, m);}catch(e){}`);
  await rango0();
  async function rango0() {
    await seleccionar().catch(() => {});
    await d.executeScript(`const i=document.querySelector('#inspector [data-fondo-url]'); i.value='https://x.test/b.jpg?'+'y'.repeat(5000); i.dispatchEvent(new Event('input',{bubbles:true}));`);
    await esperar(800);
  }
  const visible = await d.executeScript(`const a=document.querySelector('#aviso-guardado'); return !!a && !a.hidden`);
  assert.equal(visible, true, 'debe aparecer el aviso de que no se pudo guardar');
  await d.executeScript(`Object.keys(localStorage).filter(k=>k.startsWith('relleno')).forEach(k=>localStorage.removeItem(k))`);
  await d.executeScript(`const i=document.querySelector('#inspector [data-fondo-url]'); i.value='https://x.test/c.jpg'; i.dispatchEvent(new Event('input',{bubbles:true}));`);
  await esperar(800);
  assert.equal(await d.executeScript(`return document.querySelector('#aviso-guardado').hidden`), true, 'el aviso se va cuando vuelve a guardar');
  console.log('OK cuota: aviso visible al fallar el guardado y se quita al recuperarse');

  const errores = await d.executeScript('return window.__err');
  assert.deepEqual(errores, [], 'sin errores de JS: ' + errores);
  console.log('\nTodo OK (fondo)');
} finally {
  await d.quit();
}
