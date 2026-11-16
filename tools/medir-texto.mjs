// DIAGNÓSTICO (solo mide, no cambia nada): animaciones de texto y hovers de texto en Firefox real (Selenium, headless).
// Por cada caso: captura del elemento con la animación a 1 ms de su final (A) y ya terminada (B) y compara por píxeles;
// además mide posiciones por letra, corrida real (fotogramas) y hovers. Resultado: tmp-logs/medicion-firefox.json (+ capturas).
// Ejecutar: node tools/medir-texto.mjs   (el servidor de Vite NO hace falta: usa un archivo local)
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Builder, By } from 'selenium-webdriver';
import { leerPng } from './png.mjs';
import { opcionesFirefox } from './lib-tests.mjs';
import { paginaMedicion, CASOS_TEXTO, CASOS_HOVER, CASOS_HOVER_CHARS, VARIANTES } from './medir-texto-lib.mjs';

const OUT = resolve('tmp-logs'); const CAP = join(OUT, 'medicion-capturas'); mkdirSync(CAP, { recursive: true });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const html = paginaMedicion(); const archivo = join(OUT, 'medicion.html'); writeFileSync(archivo, html);

const lum = (p) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
/** Compara dos PNG (base64) del mismo elemento: píxeles que cambian (>24 en algún canal), cambio máximo y nitidez (gradiente) de cada una. */
function comparar(a64, b64, reg = null) {
  const A0 = leerPng(a64), B0 = leerPng(b64);
  const rec = (P) => (reg ? { w: reg.w, h: reg.h, px: (x, y) => P.px(reg.x + x, reg.y + y) } : P);
  const A = rec(A0), B = rec(B0);
  if (A.w !== B.w || A.h !== B.h) return { tamano: `${A.w}x${A.h} vs ${B.w}x${B.h}` };
  let dist = 0, max = 0, suma = 0;
  const nit = (P) => { let s = 0; for (let y = 0; y < P.h - 1; y += 1) for (let x = 0; x < P.w - 1; x += 1) s += Math.abs(lum(P.px(x, y)) - lum(P.px(x + 1, y))) + Math.abs(lum(P.px(x, y)) - lum(P.px(x, y + 1))); return Math.round(s); };
  for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
    const p = A.px(x, y), q = B.px(x, y); const m = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]));
    if (m > 24) dist++; if (m > max) max = m; suma += m;
  }
  return { w: A.w, h: A.h, pxDistintos: dist, difMax: max, difMedia: +(suma / (A.w * A.h)).toFixed(3), nitidezA: nit(A), nitidezB: nit(B) };
}

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
const R = { navegador: null, final: {}, real: {}, hover: {}, hoverFrames: {}, variantes: {}, coste: {} };
const shot = async (id) => (await d.findElement(By.id(id))).takeScreenshot();
try {
  await d.manage().window().setRect({ width: 1300, height: 900 });
  await d.get(pathToFileURL(archivo).href); await esperar(800);
  R.navegador = await d.executeScript('return M.info()'); R.navegador.version = (await d.getCapabilities()).get('browserVersion');
  console.log('Firefox', R.navegador.version, 'dpr', R.navegador.dpr);

  const cargar = async () => { await d.get(pathToFileURL(archivo).href); await esperar(900); };
  // ---- 2) (primero, con la página recién cargada) Corrida REAL ----
  // ---- 2) Corrida REAL (sin congelar): intervalos entre fotogramas y salto al final ----
  for (const id of [...CASOS_TEXTO.map((c) => c[0]), 'v-css', 'v-waapi', 'v-raf', 'n-40', 'n-150', 'n-400']) {
    const r = await d.executeAsyncScript('const cb=arguments[arguments.length-1];M.real(arguments[0],300).then(cb)', id);
    R.real[id] = r; console.log('real', id.padEnd(10), JSON.stringify(r));
    await d.executeScript('M.limpiar(arguments[0])', id); await esperar(150);
  }

  await cargar();
  // ---- 1) FINAL de cada animación de texto: A (a 1 ms del final) vs B (terminada) ----
  const ids = [...CASOS_TEXTO.map((c) => c[0]), ...VARIANTES.filter((v) => v !== 'v-raf'), 'v-raf'];
  for (const id of ids) {
    const A = await d.executeAsyncScript('const cb=arguments[arguments.length-1];M.congelar(arguments[0]).then(cb)', id);
    await esperar(150); const a = await shot(id);
    const B = await d.executeAsyncScript('const cb=arguments[arguments.length-1];M.terminar(arguments[0]).then(cb)', id);
    await esperar(150); const b = await shot(id);
    writeFileSync(join(CAP, `firefox-${id}-A.png`), a, 'base64'); writeFileSync(join(CAP, `firefox-${id}-B.png`), b, 'base64');
    const pix = comparar(a, b);
    const dr = await d.executeScript('return M.delta(arguments[0],arguments[1])', A.rects, B.rects);
    R.final[id] = { anims: A.anims, ...pix, deltaRectMaxPx: +dr.toFixed(3) };
    console.log(id.padEnd(12), JSON.stringify(R.final[id]));
    await d.executeScript('M.limpiar(arguments[0])', id);
  }

  await cargar();
  // ---- 3) HOVER sobre texto: reposo -> hover (transición terminada) -> reposo; por píxeles + estilo + fotogramas ----
  await d.executeScript('M.pausar(false)'); await esperar(3500); // los casos "al cargar" (letras) terminan solos
  for (const [id] of [...CASOS_HOVER, ...CASOS_HOVER_CHARS]) {
    const el = await d.findElement(By.id(id));
    await d.executeScript('document.documentElement.style.scrollBehavior="auto";arguments[0].scrollIntoView({block:"center",behavior:"instant"})', el); await esperar(900);
    const rr = await d.executeScript('const r=arguments[0].getBoundingClientRect();return {x:Math.max(0,Math.floor(r.left-24)),y:Math.max(0,Math.floor(r.top-30)),w:Math.ceil(r.width+48),h:Math.ceil(r.height+60)}', el);
    const ven = async () => d.takeScreenshot();
    await d.actions({ async: true }).move({ x: 5, y: 5 }).perform(); await esperar(600);
    const r0 = await ven();
    await d.executeScript('M.frames.ini()');
    await d.actions({ async: true }).move({ origin: el, x: 20, y: 0 }).perform(); await esperar(700);
    const fr = await d.executeScript('return M.frames.fin()');
    const est = await d.executeScript('return M.estilo(arguments[0])', id);
    const h = await ven();
    await d.actions({ async: true }).move({ x: 5, y: 5 }).perform(); await esperar(700);
    const r1 = await ven();
    writeFileSync(join(CAP, `firefox-${id}-reposo.png`), r0, 'base64'); writeFileSync(join(CAP, `firefox-${id}-hover.png`), h, 'base64');
    R.hover[id] = { reposoVsHover: comparar(r0, h, rr), reposoVsVuelta: comparar(r0, r1, rr), estiloHover: est, fotogramas: fr };
    console.log('hover', id.padEnd(10), 'residuo tras salir:', R.hover[id].reposoVsVuelta.pxDistintos, '| nitidez reposo/hover', R.hover[id].reposoVsHover.nitidezA, R.hover[id].reposoVsHover.nitidezB, '| dif px', R.hover[id].reposoVsHover.pxDistintos, '| fr', JSON.stringify(fr));
  }
  writeFileSync(join(OUT, 'medicion-firefox.json'), JSON.stringify(R, null, 1));
  console.log('\nGuardado tmp-logs/medicion-firefox.json');
} finally { await d.quit(); }
