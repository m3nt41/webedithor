// Verifica tools/banco-texto.html (ronda 2) en Firefox/Selenium: carga sin errores, existen todas las tarjetas,
// el texto de los botones NO cambia de tamaño en hover (V6 a V10) y mide el "saltito" final del bloque entero (V6 vs V13)
// comparando por píxeles el último milisegundo de la animación contra el estado final.
// Ejecutar: node tools/verificar-banco.mjs   (DPR=1.5 node ... simula zoom 150 %)
//    (Firefox de prueba headless; deja captura en tmp-logs/)
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import { leerPng } from './png.mjs';
import { opcionesFirefox } from './lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('tmp-logs', { recursive: true });
const url = pathToFileURL(resolve('tools/banco-texto.html')).href;
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(process.env.DPR ? opcionesFirefox().setPreference('layout.css.devPixelsPerPx', process.env.DPR) : opcionesFirefox()).build();
const out = [];
const log = (...a) => { const l = a.join(' '); out.push(l); console.log(l); };
try {
  await d.manage().window().setRect({ width: 1400, height: 1000 });
  await d.get(url); await esperar(1500);
  const tarj = await d.executeScript(`return {letras:document.querySelectorAll('#rej-letras .tarjeta').length,botones:document.querySelectorAll('#rej-botones .tarjeta').length,
    r2:document.querySelectorAll('.ronda').length, ids:[...document.querySelectorAll('.tarjeta')].map(t=>t.id).join(',')}`);
  log('tarjetas', JSON.stringify(tarj));
  log(tarj.letras === 14 && tarj.botones === 11 && tarj.r2 === 12 ? 'OK conteos (14 letras, 11 botones, 12 con etiqueta ronda 2)' : 'FALLO conteos');

  // Botones: tamaño del texto y de la caja en reposo vs "Mantener" (.f)
  const medidas = `const r={};document.querySelectorAll('#rej-botones .tarjeta').forEach(t=>{r[t.id]=[...t.querySelectorAll('.btn')].map(a=>{
    const q=document.createRange();q.selectNodeContents(a);const tr=q.getBoundingClientRect();const b=a.getBoundingClientRect();
    const tx=a.querySelector('.t')||a;const s=getComputedStyle(a);
    return {textoW:+tr.width.toFixed(2),textoH:+tr.height.toFixed(2),cajaW:+b.width.toFixed(2),cajaH:+b.height.toFixed(2),fs:s.fontSize}})});return r`;
  // Con --k grande las transiciones duran 2 s; se espera lo suficiente.
  await d.executeScript(`document.documentElement.style.setProperty('--k','0.01')`);
  const A = await d.executeScript(medidas);
  await d.executeScript(`document.querySelectorAll('#rej-botones .btn').forEach(a=>a.classList.add('f'))`); await esperar(500);
  const B = await d.executeScript(medidas);
  for (const id of ['b6', 'b7', 'b8', 'b9', 'b10']) {
    const f = A[id].map((a, i) => {
      const b = B[id][i];
      return `${['g', 'p', 'xl'][i]}: texto ${a.textoW}x${a.textoH}→${b.textoW}x${b.textoH} (Δ ${(b.textoW - a.textoW).toFixed(2)}x${(b.textoH - a.textoH).toFixed(2)}) caja ${a.cajaW}x${a.cajaH}→${b.cajaW}x${b.cajaH}`;
    });
    log(id, '\n   ' + f.join('\n   '));
  }
  // OJO: getBoundingClientRect incluye transform; el texto de B10 (escala 1.03 * 0.970874 = 1) debe dar Δ ≈ 0.
  await d.executeScript(`document.documentElement.style.setProperty('--k','1');document.querySelectorAll('#rej-botones .btn').forEach(a=>a.classList.remove('f'))`);

  // Saltito final del bloque entero: último ms vs estado final, por píxeles
  const lum = (p) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
  for (const id of ['v0', 'v1', 'v3', 'v6', 'v10', 'v13']) {
    await d.executeScript(`document.querySelector('#${id} .n2').scrollIntoView({block:'center',behavior:'instant'});document.querySelector('#${id} .cab button').click()`);
    const h = await d.findElement(By.css(`#${id} .n2`));
    const n = await d.executeScript(`const el=document.querySelector('#${id} .n2');const cs=document.querySelector('#${id}').getAnimations({subtree:true});
      cs.forEach(a=>{a.pause();a.currentTime=Math.max(0,a.effect.getComputedTiming().endTime-1)});return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(cs.length))))`);
    await esperar(150);
    const rc = await d.executeScript('const r=arguments[0].getBoundingClientRect();return [r.left,r.top,r.width,r.height]', h);
    const fa = leerPng(await d.takeScreenshot());
    await d.executeScript(`document.querySelector('#${id}').getAnimations({subtree:true}).forEach(a=>a.finish());return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`); await esperar(200);
    const fb = leerPng(await d.takeScreenshot());
    const [x0, y0, w, hh] = rc.map(Math.round);
    let c = 0, m = 0;
    for (let y = y0 - 4; y < y0 + hh + 4; y++) for (let x = x0 - 4; x < x0 + w + 4; x++) {
      const p = fa.px(x, y), q = fb.px(x, y); const dd = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); if (dd > 24) c++; if (dd > m) m = dd;
    }
    log(`salto final ${id}: anims=${n} píxeles distintos (ult. ms vs final)=${c} max=${m}`);
  }
  writeFileSync('tmp-logs/banco-ronda2-firefox.png', Buffer.from(await d.takeScreenshot(), 'base64'));
} finally {
  await d.quit();
  writeFileSync('tmp-logs/verificar-banco.log', out.join('\n') + '\n');
}
