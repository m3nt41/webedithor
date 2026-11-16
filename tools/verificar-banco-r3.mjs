// Verifica la ronda 3 de tools/banco-texto.html (sección 3: Elevar/Agrandar/Encoger/Inclinar) en Firefox/Selenium:
//  1) carga y existen las 11 tarjetas (4 botones cada una) con etiqueta «ronda 3»,
//  2) CSS calculado en reposo y con «Mantener» (transform, box-shadow, text-shadow, will-change, filter, ::after, ::before),
//  3) el texto de las variantes «b» no cambia de tamaño (las «a» sí),
//  4) por píxeles (último ms de la transición vs estado final) en software: cuántos píxeles del botón Grande cambian al terminar.
// Ejecutar: node tools/verificar-banco-r3.mjs   (DPR=1.25 node ... simula zoom 125 %). Log en tmp-logs/verificar-banco-r3*.log
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder } from 'selenium-webdriver';
import { leerPng } from './png.mjs';
import { opcionesFirefox } from './lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('tmp-logs', { recursive: true });
const url = pathToFileURL(resolve('tools/banco-texto.html')).href;
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(process.env.DPR ? opcionesFirefox().setPreference('layout.css.devPixelsPerPx', process.env.DPR) : opcionesFirefox()).build();
const out = [];
const log = (...a) => { const l = a.join(' '); out.push(l); console.log(l); };
const IDS = ['r3-lift-a', 'r3-lift-b', 'r3-lift-c', 'r3-lift-d', 'r3-grow-a', 'r3-grow-b', 'r3-shrink-a', 'r3-shrink-b', 'r3-tilt-a', 'r3-tilt-b'];
try {
  await d.manage().window().setRect({ width: 1400, height: 1000 });
  await d.get(url); await esperar(1500);
  const c = await d.executeScript(`return {tarjetas:document.querySelectorAll('#r3 .tarjeta').length, etiquetas:document.querySelectorAll('#r3 .tarjeta .ronda.r3').length,
    botones:document.querySelectorAll('#r3 .rb').length, todas:document.querySelectorAll('.tarjeta').length, r2:document.querySelectorAll('.tarjeta .ronda:not(.r3)').length}`);
  log('conteos', JSON.stringify(c));
  log(c.tarjetas === IDS.length && c.etiquetas === IDS.length && c.botones === IDS.length * 4 && c.todas === 14 + 11 + IDS.length && c.r2 === 12 ? 'OK conteos (10 tarjetas ronda 3, 40 botones, ronda 1 y 2 intactas)' : 'FALLO conteos');

  // 2) CSS calculado
  const css = `const r={};document.querySelectorAll('#r3 .tarjeta').forEach(t=>{r[t.id]=[...t.querySelectorAll('.rb')].map(a=>{
    const s=getComputedStyle(a),b=getComputedStyle(a,'::before'),af=getComputedStyle(a,'::after');
    return {t:s.transform,bs:s.boxShadow.slice(0,40),ts:s.textShadow.slice(0,40),wc:s.willChange,f:s.filter,pos:s.position,
      af:af.content,bt:b.transform,bo:b.opacity,bbs:b.boxShadow.slice(0,40)}})});return r`;
  await d.executeScript(`document.documentElement.style.setProperty('--k','0.01')`);
  const A = await d.executeScript(css);
  await d.executeScript(`document.querySelectorAll('#r3 .rb').forEach(a=>a.classList.add('f'))`); await esperar(500);
  const B = await d.executeScript(css);
  for (const id of IDS) for (const [i, n] of ['g', 'p', 'xl', 'st'].entries()) {
    const a = A[id][i], b = B[id][i];
    log(`${id} ${n}: transform ${a.t}→${b.t} | box-shadow→${b.bs} | text-shadow→${b.ts} | will-change ${b.wc} | filter ${b.f} | ::after ${b.af} | ::before transform→${b.bt} opacity ${a.bo}→${b.bo} sombra::before ${b.bbs}`);
  }
  // 3) texto: ancho/alto del rango de texto en reposo vs mantenido (getBoundingClientRect incluye transform)
  const txt = `const r={};document.querySelectorAll('#r3 .tarjeta').forEach(t=>{r[t.id]=[...t.querySelectorAll('.rb')].map(a=>{const q=document.createRange();q.selectNodeContents(a);const x=q.getBoundingClientRect();return [+x.width.toFixed(2),+x.height.toFixed(2)]})});return r`;
  await d.executeScript(`document.querySelectorAll('#r3 .rb').forEach(a=>a.classList.remove('f'))`); await esperar(300);
  const T0 = await d.executeScript(txt);
  await d.executeScript(`document.querySelectorAll('#r3 .rb').forEach(a=>a.classList.add('f'))`); await esperar(500);
  const T1 = await d.executeScript(txt);
  for (const id of IDS) log(`texto ${id} (Grande): ${T0[id][0]} → ${T1[id][0]}`);

  // 4) píxeles: último ms de la transición vs estado final (botón Grande)
  await d.executeScript(`document.querySelectorAll('#r3 .rb').forEach(a=>a.classList.remove('f'));document.documentElement.style.setProperty('--k','1')`); await esperar(400);
  for (const id of IDS) for (const tam of ['g', 'st']) {
    const sel = `#${id} .rb.${tam}`;
    await d.executeScript(`document.querySelector('${sel}').scrollIntoView({block:'center',behavior:'instant'})`); await esperar(300);
    await d.executeScript(`document.querySelector('${sel}').classList.add('f');return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
    const n = await d.executeScript(`const el=document.querySelector('${sel}');const an=document.getAnimations().filter(a=>a.effect&&a.effect.target===el||(a.effect&&a.effect.target&&a.effect.target.closest&&a.effect.target.closest('${sel}')===el));
      an.forEach(a=>{a.pause();a.currentTime=Math.max(0,a.effect.getComputedTiming().endTime-1)});return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(an.length))))`);
    await esperar(150);
    const rc = await d.executeScript(`const r=document.querySelector('${sel}').getBoundingClientRect();return [r.left,r.top,r.width,r.height]`);
    const fa = leerPng(await d.takeScreenshot());
    await d.executeScript(`document.getAnimations().forEach(a=>a.finish());return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`); await esperar(200);
    const fb = leerPng(await d.takeScreenshot());
    const [x0, y0, w, hh] = rc.map(Math.round);
    let cnt = 0, m = 0;
    for (let y = y0 - 40; y < y0 + hh + 40; y++) for (let x = x0 - 40; x < x0 + w + 40; x++) {
      const p = fa.px(x, y), q = fb.px(x, y); const dd = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); if (dd > 24) cnt++; if (dd > m) m = dd;
    }
    log(`píxeles ${id} ${tam}: transiciones=${n} distintos(ult. ms vs final)=${cnt} max=${m}`);
    await d.executeScript(`document.querySelector('${sel}').classList.remove('f')`); await esperar(350);
  }
  const rec = await d.findElement({ css: '#r3' });
  await d.executeScript('arguments[0].scrollIntoView({block:"start",behavior:"instant"})', rec); await esperar(300);
  writeFileSync(`tmp-logs/banco-ronda3-firefox${process.env.DPR ? '-dpr' + process.env.DPR : ''}.png`, Buffer.from(await d.takeScreenshot(), 'base64'));
} finally {
  await d.quit();
  writeFileSync(`tmp-logs/verificar-banco-r3${process.env.DPR ? '-dpr' + process.env.DPR : ''}.log`, out.join('\n') + '\n');
}
