// COSTE de `will-change` por pieza (técnica V11) con un texto largo "Por letras": memoria (reportes de memoria de Firefox, de todos los
// procesos) y tiempo de fotograma durante la animación y al hacer scroll con la animación ya terminada.
// Compara, para N letras: SIN will-change (como antes) y CON will-change (translate/scale + opacity en cada letra), efecto Zoom.
// Ejecutar: node tools/medir-coste-capas.mjs   -> tmp-logs/coste-capas.json
// Límite: Firefox headless pinta por software (sin GPU): la memoria de capas de GPU y el pintado real en tu pantalla NO se miden aquí;
// lo que sale es el coste de las estructuras de capas/imagenes del motor y la carga del hilo principal en software.
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import { createNode as n } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { opcionesFirefox } from './lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const BASE = 'Las animaciones de texto parten cada palabra y cada letra en su propio elemento y por eso un párrafo largo cuesta mucho más que un título corto. ';
const texto = (N) => BASE.repeat(Math.ceil(N / BASE.length)).slice(0, N).trim();

function pagina(N, conWillChange) {
  const p = n('page', { name: 'P', content: { title: 'Coste' } }); const s = n('section', { name: 'S' });
  const h = n('heading', { name: 'h', content: { text: texto(N), level: 2, anchor: 'h' } });
  h.styles.base = { fontSize: '28px', maxWidth: '1100px', margin: '30px 40px' };
  h.animation = { text: { mode: 'chars', effect: 'zoom', trigger: 'load', duration: 0.7, delay: 0, stagger: 0.06, ease: 'suave', distance: 30, angle: -90 } };
  s.children.push(h);
  // relleno para poder hacer scroll
  const rel = n('container', { name: 'relleno' }); rel.styles.base = { height: '3000px' }; s.children.push(rel);
  p.children.push(s);
  let html = exportHTML(p);
  // El tope real (TOPE_CAPAS) quitaría el will-change: aquí se fuerza el CSS de cada variante a mano para medir sus dos extremos.
  html = html.replace(/will-change:[^;]*;/g, '').replace('</head>', () => `<style id="exp">${conWillChange ? '.n2 .w{will-change:scale,opacity}' : ''}</style></head>`);
  return html;
}

const SCRIPT_MEM = `const cb=arguments[arguments.length-1];
const mgr=Cc["@mozilla.org/memory-reporter-manager;1"].getService(Ci.nsIMemoryReporterManager);
const out={};let total=0;
mgr.getReports((proc,path,kind,units,amount)=>{
  const bajo=path.toLowerCase();
  const rel=bajo.indexOf('gfx')>=0||bajo.indexOf('layers')>=0||bajo.indexOf('webrender')>=0||bajo.indexOf('display-list')>=0||bajo.indexOf('layout')>=0||bajo.indexOf('images')>=0||bajo.indexOf('resident-unique')>=0;
  if(!rel||units!==0)return; // units 0 = bytes
  const k=path.split('/').slice(0,3).join('/');out[k]=(out[k]||0)+amount;
},null,()=>cb(out),null,false);`;

const SCRIPT_FRAMES = `const cb=arguments[arguments.length-1];const ms=arguments[0],scroll=arguments[1];const dts=[];let last=performance.now(),t0=last;
(function f(now){dts.push(now-last);last=now;if(scroll)scrollTo(0,Math.min(2500,(now-t0)/ms*2500));if(now-t0<ms)requestAnimationFrame(f);else{scrollTo(0,0);dts.shift();dts.sort((a,b)=>a-b);
cb({frames:dts.length,med:dts[Math.floor(dts.length/2)],p95:dts[Math.floor(dts.length*.95)],max:dts[dts.length-1],largos:dts.filter(x=>x>20).length})}})(last);`;

mkdirSync('tmp-logs', { recursive: true });
const R = {};
for (const N of [100, 354, 1000]) for (const conWC of [false, true]) {
  const f = resolve(`tmp-logs/coste-${N}-${conWC ? 'con' : 'sin'}.html`); writeFileSync(f, pagina(N, conWC));
  const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).setFirefoxService(new firefox.ServiceBuilder().addArguments('--allow-system-access')).build();
  try {
    await d.manage().window().setRect({ width: 1300, height: 900 });
    const clave = `${N} letras ${conWC ? 'CON' : 'SIN'} will-change`;
    await d.get(pathToFileURL(f).href);
    // fotogramas DURANTE la animación (arranca al cargar: 0,7 s + cascada de hasta 2 s)
    const anim = await d.executeAsyncScript(SCRIPT_FRAMES, 2800, false);
    await esperar(1500);
    const info = await d.executeScript('const w=[...document.querySelectorAll(".w")];return {letras:w.length,will:getComputedStyle(w[0]).willChange}');
    const scroll = await d.executeAsyncScript(SCRIPT_FRAMES, 2000, true);
    // memoria (contexto chrome) con la página quieta
    await esperar(800);
    await d.setContext(firefox.Context.CHROME);
    const mem = await d.executeAsyncScript(SCRIPT_MEM);
    await d.setContext(firefox.Context.CONTENT);
    R[clave] = { ...info, animacion: anim, scrollConAnimacionTerminada: scroll, mem };
    console.log(clave.padEnd(30), `will-change=${info.will}`.padEnd(26), `anim p95 ${anim.p95.toFixed(1)} ms (largos ${anim.largos})`.padEnd(30), `scroll p95 ${scroll.p95.toFixed(1)} ms (largos ${scroll.largos})`);
  } finally { await d.quit(); }
}
// Diferencias de memoria CON - SIN, por categoría (solo las que cambian más de 16 KB)
const dif = {};
for (const N of [100, 354, 1000]) {
  const a = R[`${N} letras SIN will-change`].mem, b = R[`${N} letras CON will-change`].mem; const ks = new Set([...Object.keys(a), ...Object.keys(b)]);
  dif[N] = Object.fromEntries([...ks].map((k) => [k, (b[k] || 0) - (a[k] || 0)]).filter(([, v]) => Math.abs(v) > 16384).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 8));
  console.log(`\nMemoria CON - SIN (${N} letras), bytes:`, JSON.stringify(dif[N]));
}
writeFileSync('tmp-logs/coste-capas.json', JSON.stringify({ R, dif }, null, 1));
console.log('\nGuardado tmp-logs/coste-capas.json');
