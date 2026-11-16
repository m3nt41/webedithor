// DIAGNÓSTICO (solo mide) del temblor al final de "Por letras" con varias palabras ("Lo que hacemos") vs una ("Galería").
// Congela las animaciones a 1 ms del final (A) y las termina (B); compara por píxeles contra un título normal de referencia
// y mide por palabra: caja, ancho, desplazamiento horizontal del centro de tinta (sub-píxel) y si el DOM cambió.
// Ejecutar: node tools/medir-final-letras.mjs   (Firefox/Selenium; el HTML queda en tmp-logs/final-letras.html para Chrome)
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import { createNode as n } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { leerPng } from './png.mjs';
import { opcionesFirefox } from './lib-tests.mjs';

export const TEXTOS = [['galeria', 'Galería'], ['lo-que', 'Lo que hacemos']];
/** Página de prueba: por cada texto, un título animado ("Por letras", subir, Al aparecer = scroll) y una referencia con texto normal. */
export const PAG = (extraBase = {}, extraAnim = {}) => {
  const p = n('page', { name: 'P', content: { title: 'Final letras' } });
  const s = n('section', { name: 'S' }); s.styles.base = { padding: '20px 0', background: '#ffffff' };
  for (const [id, t] of TEXTOS) {
    const a = n('heading', { name: id, content: { text: t, level: 2, anchor: 'a-' + id } });
    a.styles.base = { fontSize: '56px', color: '#111111', margin: '24px 0 0 40px', lineHeight: '1.2', ...extraBase };
    a.animation = { text: { mode: 'chars', effect: 'up', trigger: 'scroll', duration: 0.7, delay: 0, stagger: 0.06, ease: 'suave', distance: 30, angle: -90, ...extraAnim } };
    const r = n('heading', { name: id + '-ref', content: { text: t, level: 2, anchor: 'r-' + id } });
    r.styles.base = { ...a.styles.base };
    s.children.push(a, r);
  }
  p.children.push(s);
  // Las animaciones nacen PAUSADAS (así no hay carrera con el reloj): la medición las coloca a 1 ms del final y las termina.
  return exportHTML(p).replace('</body>', () => '<style id="pausa">.w,.tw{animation-play-state:paused!important}</style></body>');
};

const lum = (p) => 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2];
/** Centro de tinta (x) ponderado por oscuridad dentro de una región: da el desplazamiento con precisión sub-píxel. */
function centro(P, x0, y0, w, h) { let sw = 0, sx = 0; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const o = 255 - lum(P.px(x, y)); sw += o; sx += o * x; } return sw ? sx / sw : NaN; }
function difer(A, B, x0, y0, w, h) { let c = 0, m = 0; for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) { const p = A.px(x, y), q = B.px(x, y); const d = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2])); if (d > 24) c++; if (d > m) m = d; } return { px: c, max: m }; }

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

export async function medir(d, etiqueta = '') {
  const R = {};
  for (const [id] of TEXTOS) {
    const el = await d.findElement(By.id('a-' + id)); const ref = await d.findElement(By.id('r-' + id));
    await d.executeScript('document.documentElement.style.scrollBehavior="auto";arguments[0].scrollIntoView({block:"center",behavior:"instant"});', el); await esperar(300);
    R[id] = await d.executeScript(`const el=arguments[0],ref=arguments[1];
      window.__mut=0;new MutationObserver(m=>window.__mut+=m.filter(x=>x.type!=='attributes').length).observe(el,{subtree:true,childList:true,attributes:true,characterData:true});
      const wr=[...el.querySelectorAll('.ww')].map(w=>{const r=w.getBoundingClientRect();return [+r.left.toFixed(3),+r.width.toFixed(3)]});
      const rr=document.createRange();rr.selectNodeContents(ref);const tr=rr.getBoundingClientRect();
      const sp=[...el.childNodes].filter(x=>x.nodeType===3).map(x=>x.textContent);
      return {anchoPartido:+(()=>{const L=[...el.querySelectorAll('.w')].map(w=>w.getBoundingClientRect());return Math.max(...L.map(r=>r.right))-Math.min(...L.map(r=>r.left))})().toFixed(3),anchoNormal:+tr.width.toFixed(3),
        palabrasX:wr,fuente:getComputedStyle(el).fontFamily,lineas:new Set([...el.querySelectorAll('.w')].map(w=>w.offsetTop)).size,
        hijosAntes:el.querySelectorAll('*').length,nodosTextoEntrePalabras:JSON.stringify(sp)};`, el, ref);
    // A: todas las animaciones congeladas a 1 ms del final
    const an0 = await d.executeScript(`const el=arguments[0];el.classList.add('in');const cs=el.getAnimations({subtree:true});cs.forEach(a=>{a.pause();a.currentTime=Math.max(0,a.effect.getComputedTiming().endTime-1)});
      return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>r(cs.length))))`, el);
    await esperar(150);
    const geo = async () => d.executeScript(`const el=arguments[0];return {w:[...el.querySelectorAll('.ww')].map(w=>{const r=w.getBoundingClientRect();return [r.left,r.top,r.width,r.height]}),l:[...el.querySelectorAll('.w')].map(w=>{const r=w.getBoundingClientRect();return [r.left,r.top,r.width]}),b:(()=>{const r=el.getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()}`, el);
    const gA = await geo(); const fa = await d.takeScreenshot();
    // B: se terminan (estado final real)
    await d.executeScript('arguments[0].getAnimations({subtree:true}).forEach(a=>a.finish());return new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))', el); await esperar(150);
    const gB = await geo(); const fb = await d.takeScreenshot();
    // Referencia: el título normal, bajado a la misma posición de ventana
    await d.executeScript('arguments[0].scrollIntoView({block:"center",behavior:"instant"})', ref); await esperar(250);
    const refRect = await d.executeScript('const r=arguments[0].getBoundingClientRect();return [r.left,r.top,r.width,r.height]', ref);
    const fr = await d.takeScreenshot();
    const A = leerPng(fa), B = leerPng(fb), F = leerPng(fr);
    // Las capturas salen en píxeles de DISPOSITIVO: con zoom/DPR distinto de 1 hay que escalar las regiones (a DPR 1 no cambia nada)
    const k = await d.executeScript('return devicePixelRatio');
    const [bx, by, bw, bh] = gA.b.map((v) => Math.round(v * k)); const dy = Math.round((refRect[1] - gA.b[1]) * k);
    const Fy = { px: (x, y) => F.px(x, y + dy), w: F.w, h: F.h };
    const palabras = gA.w.map((w, i) => {
      const x0 = Math.floor(w[0] * k) - 4, ww = Math.ceil(w[2] * k) + 8;
      const cA = centro(A, x0, by, ww, bh), cB = centro(B, x0, by, ww, bh), cF = centro(Fy, x0, by, ww, bh);
      return { i, anchoA: +w[2].toFixed(3), anchoB: +gB.w[i][2].toFixed(3), xA: +w[0].toFixed(3), xB: +gB.w[i][0].toFixed(3),
        centroTintaA: +cA.toFixed(3), centroTintaB: +cB.toFixed(3), centroTintaNormal: +cF.toFixed(3), desplazaAaB: +(cB - cA).toFixed(3), desplazaBaNormal: +(cB - cF).toFixed(3) };
    });
    const dl = gA.l.map((l, i) => Math.max(Math.abs(l[0] - gB.l[i][0]), Math.abs(l[1] - gB.l[i][1]), Math.abs(l[2] - gB.l[i][2])));
    R[id] = { ...R[id], anims: an0, mutacionesDeNodos: await d.executeScript('return window.__mut'), hijosDespues: await d.executeScript('return arguments[0].querySelectorAll("*").length', el),
      difLetraRectMax: +Math.max(...dl).toFixed(4), A_vs_B: difer(A, B, bx - 4, by, bw + 8, bh), B_vs_normal: difer(B, Fy, bx - 4, by, bw + 8, bh), A_vs_normal: difer(A, Fy, bx - 4, by, bw + 8, bh), palabras };
    await d.executeScript('arguments[0].getAnimations({subtree:true}).forEach(a=>a.cancel())', el);
  }
  return R;
}

if (process.argv[1] && process.argv[1].endsWith('medir-final-letras.mjs')) {
  mkdirSync('tmp-logs', { recursive: true });
  const archivo = resolve('tmp-logs/final-letras.html'); writeFileSync(archivo, PAG());
  const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
  try {
    await d.manage().window().setRect({ width: 1300, height: 900 });
    await d.get(pathToFileURL(archivo).href); await esperar(700);
    const R = await medir(d);
    console.log(JSON.stringify(R, null, 1));
    writeFileSync('tmp-logs/final-letras.json', JSON.stringify(R, null, 1));
  } finally { await d.quit(); }
}
