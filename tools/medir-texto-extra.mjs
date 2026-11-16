// DIAGNÓSTICO (solo mide): comprobaciones extra en Firefox: (1) ¿el cambio al terminar es de antialiasing? (cromaticidad de los bordes),
// (2) texto partido vs texto plano (posición/anchura/píxeles), (3) experimento will-change sobre el CSS real, (4) repetibilidad.
// Ejecutar: node tools/medir-texto-extra.mjs  (necesita tmp-logs/medicion.html generado por medir-texto.mjs)
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Builder, By } from 'selenium-webdriver';
import { leerPng } from './png.mjs';
import { opcionesFirefox } from './lib-tests.mjs';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const archivo = resolve('tmp-logs/medicion.html');
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
const shot = async (id) => (await d.findElement(By.id(id))).takeScreenshot();
const stats = (b64) => { const P = leerPng(b64); let color = 0, borde = 0; for (let y = 0; y < P.h; y++) for (let x = 0; x < P.w; x++) { const p = P.px(x, y); if (p[0] < 250 || p[1] < 250 || p[2] < 250) { borde++; if (Math.max(p[0], p[1], p[2]) - Math.min(p[0], p[1], p[2]) > 12) color++; } } return { w: P.w, h: P.h, pxTinta: borde, pxConColor: color }; };
const dif = (a, b) => { const A = leerPng(a), B = leerPng(b); if (A.w !== B.w || A.h !== B.h) return 'tamaños distintos'; let n = 0, mx = 0; for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) { const p = A.px(x, y), q = B.px(x, y); const m = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); if (m > 24) n++; if (m > mx) mx = m; } return { pxDistintos: n, difMax: mx }; };
const par = async (id) => {
  const A = await d.executeAsyncScript('const cb=arguments[arguments.length-1];M.congelar(arguments[0]).then(cb)', id); await esperar(150); const a = await shot(id);
  await d.executeAsyncScript('const cb=arguments[arguments.length-1];M.terminar(arguments[0]).then(cb)', id); await esperar(150); const b = await shot(id);
  return { a, b, A: stats(a), B: stats(b), AvsB: dif(a, b) };
};
const R = {};
try {
  await d.manage().window().setRect({ width: 1300, height: 900 });
  await d.get(pathToFileURL(archivo).href); await esperar(900);
  // (1) y (4)
  for (const id of ['c-up', 'c-up', 'c-up', 'c-fade', 'v-css', 'v-css', 'v-css', 'v-transform', 'v-willchange', 'ap-up']) {
    const r = await par(id); (R['an_' + id] ||= []).push({ AvsB: r.AvsB, tintaColorA: r.A, tintaColorB: r.B });
    await d.executeScript('M.limpiar(arguments[0])', id);
  }
  // (2) partido vs plano: estado final (terminado) de c-up y w-up y lm-up vs ref-plano
  const ref = await shot('ref-plano');
  for (const id of ['c-up', 'w-up', 'c-fade', 'l-up']) {
    await d.executeScript('document.getElementById(arguments[0]).scrollIntoView({block:"center",behavior:"instant"});document.getElementById(arguments[0]).getAnimations({subtree:true}).forEach(a=>a.finish())', id); await esperar(200);
    const s = await shot(id);
    const anch = await d.executeScript('const e=document.getElementById(arguments[0]);const r=document.createRange();r.selectNodeContents(e);const q=r.getBoundingClientRect();return {ancho:+q.width.toFixed(2),alto:+q.height.toFixed(2)}', id);
    R['split_' + id] = { vsPlano: dif(ref, s), anch };
  }
  R.split_ref = await d.executeScript('const e=document.getElementById("ref-plano");const r=document.createRange();r.selectNodeContents(e);const q=r.getBoundingClientRect();return {ancho:+q.width.toFixed(2),alto:+q.height.toFixed(2)}');
  // (3) will-change sobre el CSS real: .w{will-change:translate,opacity}; A vs B y B vs plano
  await d.get(pathToFileURL(archivo).href); await esperar(900);
  await d.executeScript('const s=document.createElement("style");s.textContent=".w{will-change:translate,opacity}";document.head.appendChild(s)');
  for (const id of ['c-up', 'w-up']) { const r = await par(id); R['wc_' + id] = { AvsB: r.AvsB, A: r.A, B: r.B, BvsPlano: dif(ref, r.b) }; }
  writeFileSync(resolve('tmp-logs/medicion-firefox-extra.json'), JSON.stringify(R, null, 1));
  console.log(JSON.stringify(R));
} finally { await d.quit(); }
