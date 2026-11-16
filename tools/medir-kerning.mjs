// DIAGNÓSTICO (solo mide): ¿alguna propiedad CSS conserva el kerning cuando cada letra va en su propio span?
// Mide el ancho de la misma frase como texto normal y partida en letras (con y sin ww), con varias variantes de CSS.
// Ejecutar: node tools/medir-kerning.mjs   (Firefox/Selenium headless; para Chrome se pega la parte de la página con --html)
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder } from 'selenium-webdriver';
import { opcionesFirefox } from './lib-tests.mjs';

const FRASES = ['Waveform quickly jumped', 'AVATAR To Yo', 'Lo que hacemos', 'Galería'];
const FUENTES = ['', 'Georgia, serif', 'Arial, sans-serif'];
// Variantes del CSS de las letras (.w) y de la palabra (.ww)
const V = {
  'actual (inline-block)': '.w{display:inline-block}.ww{display:inline-block;white-space:nowrap}',
  'font-kerning:normal': '.w{display:inline-block;font-kerning:normal}.ww{display:inline-block;white-space:nowrap;font-kerning:normal}',
  'text-rendering:optimizeLegibility': '.w{display:inline-block;text-rendering:optimizeLegibility}.ww{display:inline-block;white-space:nowrap;text-rendering:optimizeLegibility}',
  'text-rendering:geometricPrecision': '.w{display:inline-block;text-rendering:geometricPrecision}.ww{display:inline-block;white-space:nowrap;text-rendering:geometricPrecision}',
  'font-feature-settings:"kern"': '.w{display:inline-block;font-feature-settings:"kern" 1}.ww{display:inline-block;white-space:nowrap}',
  'letras inline (sin caja propia)': '.w{display:inline}.ww{display:inline;white-space:nowrap}',
  'letras inline-flex': '.w{display:inline-flex}.ww{display:inline-block;white-space:nowrap}',
  'letras contents': '.w{display:contents}.ww{display:inline-block;white-space:nowrap}',
};
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const partir = (t) => t.split(/\s+/).map((p) => `<span class="ww">${[...p].map((c) => `<span class="w">${esc(c)}</span>`).join('')}</span>`).join(' ');
const html = `<!doctype html><meta charset=utf-8><body style="margin:20px;font-size:56px">
${FUENTES.map((f, fi) => FRASES.map((fr, k) => `<div style="${f ? `font-family:${f}` : ''};white-space:nowrap"><span class="n" data-f="${fi}" data-k="${k}">${esc(fr)}</span></div>${Object.keys(V).map((_, vi) => `<div style="${f ? `font-family:${f}` : ''};white-space:nowrap"><span class="p" data-f="${fi}" data-k="${k}" data-v="${vi}">${partir(fr)}</span></div>`).join('')}`).join('')).join('')}
<style id="est"></style>`;
mkdirSync('tmp-logs', { recursive: true });
const archivo = resolve('tmp-logs/kerning.html'); writeFileSync(archivo, html);
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.get(pathToFileURL(archivo).href);
  const nombres = Object.keys(V); const out = {};
  for (let vi = 0; vi < nombres.length; vi++) {
    await d.executeScript('document.getElementById("est").textContent=arguments[0]', V[nombres[vi]]);
    const r = await d.executeScript(`return [...document.querySelectorAll('.p[data-v="'+arguments[0]+'"]')].map(p=>{const n=document.querySelector('.n[data-f="'+p.dataset.f+'"][data-k="'+p.dataset.k+'"]');return [p.dataset.f,p.dataset.k,n.getBoundingClientRect().width,p.getBoundingClientRect().width]})`, vi);
    out[nombres[vi]] = r;
  }
  // Opción con JS (solo medida, NO aplicada al producto): por cada letra, margen-derecho = avance kerned real - ancho de su caja,
  // sacado de un Range sobre una copia en texto normal. Solo para ver si el ancho coincide y qué cuesta.
  await d.executeScript('document.getElementById("est").textContent=arguments[0]', V['actual (inline-block)']);
  const js = await d.executeScript(`const t0=performance.now();const res=[];document.querySelectorAll('.p[data-v="0"]').forEach(p=>{
    p.querySelectorAll('.ww').forEach(ww=>{const L=[...ww.querySelectorAll('.w')];const txt=L.map(l=>l.textContent).join('');
      const c=document.createElement('span');c.style.cssText='position:absolute;visibility:hidden;white-space:nowrap';c.textContent=txt;ww.appendChild(c);
      const tn=c.firstChild;const xs=[];for(let i=0;i<=txt.length;i++){const r=document.createRange();if(i<txt.length){r.setStart(tn,i);r.setEnd(tn,i+1);xs.push(r.getBoundingClientRect().left)}else{r.setStart(tn,i-1);r.setEnd(tn,i);xs.push(r.getBoundingClientRect().right)}}
      c.remove();L.forEach((l,i)=>{const av=xs[i+1]-xs[i];const w=l.getBoundingClientRect().width;l.style.marginRight=(av-w)+'px'})});});
    const t1=performance.now();return [...document.querySelectorAll('.p[data-v="0"]')].map(p=>{const n=document.querySelector('.n[data-f="'+p.dataset.f+'"][data-k="'+p.dataset.k+'"]');return [p.dataset.f,p.dataset.k,n.getBoundingClientRect().width,p.getBoundingClientRect().width]}).concat([[ 'ms',t1-t0,0,0]])`);
  console.log('JS (margen por letra desde un Range)'.padEnd(36), js.map(([f, k, a, b]) => f === 'ms' ? `coste:${k.toFixed(1)}ms` : `f${f}k${k}:${(b - a).toFixed(2)}`).join(' '));
  console.log('Firefox', (await d.getCapabilities()).get('browserVersion'));
  for (const [nom, r] of Object.entries(out)) console.log(nom.padEnd(36), r.map(([f, k, a, b]) => `f${f}k${k}:${(b - a).toFixed(2)}`).join(' '));
} finally { await d.quit(); }
