// XSS al importar un .json ajeno: el saneado de la entrada, la defensa en la salida (export) y la Vista previa en sandbox.
// Parte 1 (Node puro): un JSON normal (docs/demo-*.json, el plan de ejemplo y las 41 variantes de bloques) NO pierde ningún valor.
// Parte 2 (Firefox real sobre dist/editor.html): se importa un JSON hostil hecho a mano con "Abrir JSON" y se comprueba que
//   no se ejecuta nada (ni en el editor, ni en el .html exportado, ni en la Vista previa), que el resto de la página se conserva
//   y que sale el aviso con la cuenta exacta. Además: el iframe de la Vista previa NO es del mismo origen que el editor.
// Ejecutar: npm run build && node tests/xss-import.mjs   (debe FALLAR sin el arreglo y pasar con él)
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import { opcionesFirefox, DESCARGAS } from '../tools/lib-tests.mjs';
import { normalizePage, walk } from '../src/core/tree.js';
import { leerEntrada } from '../src/core/plan.js';
import { BLOCKS } from '../src/blocks/index.js';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };

// ================= Parte 1: lo normal pasa idéntico =================
const sinQuitar = (obj, nombre) => {
  const inf = {};
  const salida = normalizePage(obj, inf);
  v(inf.quitados === 0, `${nombre}: 0 valores quitados (quitados=${inf.quitados})`);
  return salida;
};
if (!process.env.SOLO_NAVEGADOR) { // SOLO_NAVEGADOR=1 salta la parte 1 (sirve para ver fallar la parte 2 sin el arreglo)
for (const f of ['demo-estilo.json', 'demo-parallax.json']) {
  const datos = JSON.parse(readFileSync(resolve('docs', f), 'utf8'));
  const pagina = datos.page ?? datos;
  const a = sinQuitar(pagina, f);
  // idempotente: normalizar lo ya normalizado no cambia nada (el saneado no inventa ni borra)
  assert.deepEqual(normalizePage(a, {}), a); ok++; console.log(`OK   ${f}: normalizar dos veces da lo mismo`);
}
{
  const plan = readFileSync(resolve('docs', 'plan-ejemplo.json'), 'utf8');
  const r = leerEntrada(plan, []);
  v(r.errores.length === 0 && r.secciones.length > 0, `plan-ejemplo.json se lee (${r.secciones.length} secciones)`);
  const pag = { id: 'p', type: 'page', name: 'P', styles: { base: {}, mobile: {} }, content: { title: 't' }, animation: null, children: r.secciones };
  const a = sinQuitar(pag, 'plan-ejemplo.json');
  assert.deepEqual(a.children, normalizePage(a, {}).children); ok++;
}
{
  let variantes = 0;
  for (const b of BLOCKS) for (const [k, vv] of Object.entries(b.variants)) {
    const pag = { id: 'p', type: 'page', name: 'P', styles: { base: {}, mobile: {} }, content: { title: 't' }, animation: null, children: [vv.crear()] };
    const inf = {}; normalizePage(pag, inf);
    assert.equal(inf.quitados, 0, `${b.id}/${k} perdió ${inf.quitados} valores`); variantes++;
  }
  v(variantes >= 41, `las ${variantes} variantes de bloques se importan sin perder ningún valor`);
}

}

// ================= Parte 2: JSON hostil =================
const nodo = (id, type, extra = {}) => ({ id, type, name: type, styles: { base: {}, mobile: {} }, content: {}, animation: null, children: [], ...extra });
const XSS = 'window.__xss=1';
const h1 = nodo('h1', 'heading', { name: 'Titulo', content: { text: 'Titulo sano', level: 2 }, styles: { base: { color: `red}</style><script>${XSS}</script>`, fontSize: '30px' }, mobile: {} } });                                  // quitados: color (1)
const h2 = nodo('h2', 'heading', { name: `<img src=x onerror=${XSS}>`, content: { text: `<img src=x onerror="${XSS}">`, level: `2><script>${XSS}</script>` } });                                                                                // level (1)
const b1 = nodo('b1', 'button', { content: { text: 'Click', href: `javascript:${XSS}` }, styles: { base: { background: `url(javascript:${XSS})`, color: '#ffffff', padding: '10px 20px' }, mobile: {} } });                   // href (1) + background (1)
const b2 = nodo('b2', 'button', { content: { text: 'Camuflado', href: `\t java\nScRiPt:${XSS}` } });                                                                                                                                        // href (1)
const t1 = nodo('t1', 'text', { content: { text: 'Texto con CSS malo' }, styles: { base: { fontFamily: '@import url(https://evil.example/x.css)', cssText: 'color:red', color: '#333333', fontSize: '18px' }, mobile: {} } });   // fontFamily (1) + cssText (1)
const t2 = nodo('t2', 'text', { content: { text: 'Texto sano' }, styles: { base: { width: '100px', backgroundColor: `expression(${XSS})`, backgroundImage: 'url(data:image/gif;base64,R0lGODlhAQABAAAAACw=)' }, mobile: { color: `red;}</style><script>${XSS}</script>` } } }); // backgroundColor (1) + mobile color (1); el data:image se conserva
const im = nodo('im', 'image', { content: { src: `javascript:${XSS}`, alt: 'foto' } });                                                                                                                                                  // src (1)
const idMalo = nodo('"]{}</style><script>window.__xss=1</script>', 'text', { content: { text: 'Id malo' } });                                                                                                                      // id (1)
// Sombras: boxShadow con url(https://…), textShadow con var(), `sombra` con una 2ª capa colada tras un ";" y filter (propiedad no permitida): 4 quitados.
// La `sombra` sana de la 2ª clave (mobile) se conserva.
const t3 = nodo('t3', 'text', { content: { text: 'Sombras malas' }, styles: { base: { boxShadow: '0 0 0 url(https://evil.example/x.png) red', textShadow: '0 0 4px var(--x)', sombra: '0 0 4px red; background:url(https://evil.example/y.png)', filter: 'drop-shadow(0 0 4px red)', color: '#222222' }, mobile: { sombra: '0 4px 12px 0 rgba(0,0,0,0.2)' } } });
const QUITADOS = 15;
const hostil = nodo('pg', 'page', { name: 'Página', content: { title: 'Hostil </title><script>window.__xss=1</script>' }, styles: { base: { fontFamily: 'system-ui, sans-serif' }, mobile: {} },
  children: [nodo('s1', 'section', { name: 'Sec', styles: { base: { padding: '20px' }, mobile: {} }, children: [h1, h2, b1, b2, t1, t2, im, idMalo, t3] })] });
let nNodos = 0; walk(hostil, () => nNodos++);

mkdirSync(DESCARGAS, { recursive: true });
const archivoJson = resolve(DESCARGAS, 'xss-import.json');
writeFileSync(archivoJson, JSON.stringify({ app: 'editor-landings', version: 1, page: hostil }));
const exportado = resolve(DESCARGAS, 'landing.html');
if (existsSync(exportado)) rmSync(exportado);

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
const js = (s, ...a) => d.executeScript(s, ...a);
try {
  await d.manage().window().setRect({ width: 1400, height: 1000 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url); await esperar(600);
  await js('localStorage.clear()');
  await d.get(url); await esperar(600);

  // --- Abrir JSON ---
  await d.findElement(By.css('#archivo-json')).sendKeys(archivoJson);
  await esperar(900);
  v((await js('return typeof window.__xss')) === 'undefined', 'editor: window.__xss indefinido tras importar');
  v((await js('return document.querySelectorAll("[onerror]").length')) === 0, 'editor: ningún elemento con onerror en el DOM');
  v((await js('return [...document.scripts].filter(s=>s.textContent.includes("__xss")).length')) === 0, 'editor: ningún <script> con el payload');

  // --- Aviso con la cuenta ---
  const toast = await js('const t=document.getElementById("toast-ia"); return t && !t.hidden ? t.textContent : ""');
  const cuenta = +(/quitaron (\d+) valores/.exec(toast)?.[1] ?? NaN);
  v(cuenta === QUITADOS, `aviso con la cuenta exacta: "${toast}" (esperado ${QUITADOS})`);

  // --- El resto de la página se conserva (autoguardado en localStorage) ---
  await esperar(700);
  const guardado = await js(`return localStorage.getItem('editor-landings:pagina')`);
  const pg = JSON.parse(guardado);
  let nGuardados = 0; walk(pg, () => nGuardados++);
  v(nGuardados === nNodos, `se conservan los ${nNodos} nodos (${nGuardados})`);
  const hallar = (id) => { let r = null; walk(pg, (n) => { if (n.id === id) r = n; }); return r; };
  v(hallar('h1').styles.base.fontSize === '30px' && hallar('h1').styles.base.color === undefined, 'h1: fontSize sano se queda y el color malo se quita');
  v(hallar('h1').content.text === 'Titulo sano' && hallar('t2').content.text === 'Texto sano', 'los textos sanos se conservan');
  v(hallar('t2').styles.base.width === '100px' && /^url\(data:image\/gif/.test(hallar('t2').styles.base.backgroundImage), 't2: width y url(data:image/…) se conservan');
  v(hallar('t1').styles.base.color === '#333333' && hallar('t1').styles.base.cssText === undefined && hallar('t1').styles.base.fontFamily === undefined, 't1: lo sano se queda; cssText y @import se van');
  v(hallar('b1').styles.base.padding === '10px 20px' && hallar('b1').content.href === undefined, 'b1: padding se queda; href javascript: se quita');
  v(hallar('b2').content.href === undefined && hallar('im').content.src === undefined, 'href camuflado y src javascript: quitados');
  v(hallar('h2').content.level === undefined && hallar('h2').content.text.includes('<img'), 'h2: level malo quitado; el texto con <img> se guarda como TEXTO');
  const s3 = hallar('t3').styles;
  v(s3.base.boxShadow === undefined && s3.base.textShadow === undefined && s3.base.sombra === undefined && s3.base.filter === undefined && s3.base.color === '#222222', 't3: boxShadow con url(), textShadow con var(), sombra con ";" y filter se descartan; el color sano se queda');
  v(s3.mobile.sombra === '0 4px 12px 0 rgba(0,0,0,0.2)', 't3: la sombra sana (mobile) se conserva');
  const ids = []; walk(pg, (n) => ids.push(n.id));
  v(!ids.some((i) => /[^A-Za-z0-9_-]/.test(i)), 'ningún id con caracteres raros');
  v(!/javascript:|<script|@import|expression\(/i.test(JSON.stringify(pg).replace(/"text":"[^"]*"|"name":"[^"]*"|"title":"[^"]*"/g, '')), 'el JSON guardado no trae nada peligroso fuera de textos');

  // --- Export: se descarga el .html y se abre ---
  await d.findElement(By.css('#btn-exportar')).click();
  for (let i = 0; i < 40 && !existsSync(exportado); i++) await esperar(150);
  await esperar(300);
  v(existsSync(exportado), 'se descargó landing.html');
  const html = readFileSync(exportado, 'utf8');
  v(!/javascript:/i.test(html), 'export: sin "javascript:"');
  v(!html.includes(`<script>${XSS}`) && !html.includes(`</style><script>`) && !/<script[^>]*>[^<]*__xss/i.test(html), 'export: sin <script> con el payload ni cierre de <style>');
  v(!/@import|expression\(/i.test(html), 'export: sin @import ni expression(');
  v(!/<img src=x/i.test(html) && html.includes('&lt;img src=x onerror='), 'export: el <img onerror> viaja como texto escapado (&lt;img…), no como etiqueta');
  v(html.includes('Titulo sano') && html.includes('width:100px'), 'export: lo sano sigue ahí');
  await d.get(pathToFileURL(exportado).href); await esperar(600);
  v((await js('return typeof window.__xss')) === 'undefined', 'export abierto: window.__xss indefinido');
  v((await js('return document.querySelectorAll("script,[onerror]").length')) === 0, 'export abierto: sin <script> ni onerror');
  await d.get(url); await esperar(700);

  // --- Vista previa ---
  await d.findElement(By.css('#btn-vista-previa')).click();
  for (let i = 0; i < 30 && !(await js('const f=document.querySelector("#vp-frame"); return !!f && f.classList.contains("listo")')); i++) await esperar(150);
  await esperar(500);
  v((await js('return typeof window.__xss')) === 'undefined', 'vista previa: window.__xss indefinido en el editor');
  const sb = await js('return document.querySelector("#vp-frame").getAttribute("sandbox")');
  v(sb !== null && sb.split(/\s+/).includes('allow-scripts') && !sb.split(/\s+/).includes('allow-same-origin'), `iframe con sandbox "allow-scripts" SIN allow-same-origin (sandbox="${sb}")`);
  v((await js('try{ const f=document.querySelector("#vp-frame"); return f.contentDocument === null ? "nulo" : "accesible"; }catch(e){ return "bloqueado"; }')) !== 'accesible', 'el editor NO puede leer el documento del iframe (origen distinto)');
  await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
  try {
    v((await js('return typeof window.__xss')) === 'undefined', 'vista previa: window.__xss indefinido DENTRO del iframe');
    v((await js('return document.body.innerText.includes("Titulo sano")')) === true, 'vista previa: la página se ve (lo sano se conserva)');
  } finally { await d.switchTo().defaultContent(); }

  // --- El sandbox aísla de verdad: un script hostil dentro del iframe no toca el editor ---
  const tituloAntes = await js('return document.title');
  await js(`localStorage.removeItem('pwn');
    document.querySelector('#vp-frame').srcdoc = '<script>try{parent.document.title="PWNED"}catch(e){} try{parent.localStorage.setItem("pwn","1")}catch(e){} try{parent.__xss=1}catch(e){}<\\/script><p>hostil</p>';`);
  await esperar(1200);
  v((await js('return document.title')) === tituloAntes, 'script en la preview: NO cambia el título del editor');
  v((await js(`return localStorage.getItem('pwn')`)) === null, 'script en la preview: NO escribe en el localStorage del editor');
  v((await js('return typeof window.__xss')) === 'undefined', 'script en la preview: NO toca window del editor');

  console.log(`\n${ok} comprobaciones OK`);
} finally {
  await d.quit();
}
