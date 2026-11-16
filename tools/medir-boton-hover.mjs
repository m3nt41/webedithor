// DIAGNÓSTICO (solo mide) del botón "Ver más" con hover que lo agranda: ¿cómo se ve el texto DURANTE la transición y al terminar,
// y qué técnica de escala deja el texto más nítido? Firefox (Selenium, ratón real), headless.
// Por variante: deja correr la transición EN VIVO y captura el botón a varios instantes; lo compara con un
// "gemelo estático" (mismo botón, sin transición, con el mismo transform/tamaño calculado en ese instante, que Firefox dibuja
// nítido a esa escala). Diferencia grande = el texto en vuelo se ve distinto (borroso) de como se verá quieto. También mide el salto entre
// el último instante en vuelo y el estado final (el "se redibuja al terminar") y la posición de cada letra.
// Ejecutar: node tools/medir-boton-hover.mjs [dpr]   (la página queda en tmp-logs/boton-hover.html para Chrome)
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import { createNode as n } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { botonTema, MODOS } from '../src/blocks/tema.js';
import { leerPng } from './png.mjs';
import { opcionesFirefox } from './lib-tests.mjs';

// Transición LENTA y LINEAL (20 s): así la escala casi no cambia mientras se hace la captura (≈0,1 s) y se puede comparar con un
// gemelo estático. (Congelar la transición con pause() NO sirve: una animación pausada se dibuja como estática y da 0 px siempre.)
const DUR = 20;
export const VARIANTES = {
  'actual: transform:scale(1.03)': { css: '', trans: 'transform' },
  'scale (propiedad individual)': { css: '#V:hover{transform:none;scale:1.03}', trans: 'scale' },
  'actual + will-change SOLO en hover': { css: '#V:hover{will-change:transform}', trans: 'transform' },
  'actual + text-rendering:geometricPrecision': { css: '#V{text-rendering:geometricPrecision}', trans: 'transform' },
  'actual + translateZ(0)': { css: '#V:hover{transform:scale(1.03) translateZ(0)}', trans: 'transform' },
  'font-size + padding (+3 %)': { css: '#V:hover{transform:none;font-size:18.54px;padding:16.48px 32.96px}', trans: 'font-size,padding' },
  'zoom:1.03': { css: '#V:hover{transform:none;zoom:1.03}', trans: 'zoom' },
  'referencia: will-change PERMANENTE': { css: '#V{will-change:transform}', trans: 'transform' },
};
const ESTILOS = { secundario: ['secundario', 'Contorno (Ver más del hero)'], primario: ['primario', 'Relleno oscuro'] };

export function pagina(estilo = 'secundario') {
  const p = n('page', { name: 'P', content: { title: 'Botón hover' } });
  const s = n('section', { name: 'S' }); s.styles.base = { padding: '30px 0', background: '#ffffff' };
  const css = [];
  Object.entries(VARIANTES).forEach(([nombre, v], i) => {
    const b = n('button', { name: nombre, content: { text: 'Ver más', href: '#', anchor: 'v' + i } });
    b.styles.base = { ...botonTema(MODOS.claro, 'l', ESTILOS[estilo][0]), margin: '28px 0 0 60px' };
    b.animation = { hover: { effect: 'grow' } };
    s.children.push(b);
    const id = '#v' + i;
    css.push(`${id},${id}:hover{transition-property:${v.trans}!important;transition-duration:${DUR}s!important;transition-timing-function:linear!important}`, v.css.replace(/#V/g, id));
  });
  p.children.push(s);
  return exportHTML(p).replace('</body>', () => `<style id="var">${css.join('\n')}</style></body>`);
}

const lum = (q) => 0.299 * q[0] + 0.587 * q[1] + 0.114 * q[2];
function comparar(A, B, reg) {
  let c = 0, mx = 0, suma = 0, nA = 0, nB = 0;
  for (let y = reg.y; y < reg.y + reg.h; y++) for (let x = reg.x; x < reg.x + reg.w; x++) {
    const p = A.px(x, y), q = B.px(x, y); const m = Math.max(Math.abs(p[0] - q[0]), Math.abs(p[1] - q[1]), Math.abs(p[2] - q[2]));
    if (m > 24) c++; if (m > mx) mx = m; suma += m;
  }
  const nit = (P) => { let s = 0; for (let y = reg.y; y < reg.y + reg.h - 1; y++) for (let x = reg.x; x < reg.x + reg.w - 1; x++) s += Math.abs(lum(P.px(x, y)) - lum(P.px(x + 1, y))) + Math.abs(lum(P.px(x, y)) - lum(P.px(x, y + 1))); return Math.round(s); };
  return { px: c, max: mx, media: +(suma / (reg.w * reg.h)).toFixed(3), nitA: nit(A), nitB: nit(B) };
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

if (process.argv[1] && process.argv[1].endsWith('medir-boton-hover.mjs')) {
  const dpr = process.argv[2] || '-1.0';
  const solo = process.env.VAR ? process.env.VAR.split(',').map(Number) : null; // índices de variantes
  const estilos = process.env.ESTILO ? [process.env.ESTILO] : ['secundario'];
  mkdirSync('tmp-logs', { recursive: true });
  const T = [3000, 10000, 19700]; // ms de transición en los que se captura (el último = "casi al terminar")
  const salida = {};
  const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox().setPreference('layout.css.devPixelsPerPx', dpr)).build();
  const LETRAS = `const el=arguments[0];const tn=[...el.childNodes].find(x=>x.nodeType===3);const L=[];for(let k=0;k<tn.length;k++){const q=document.createRange();q.setStart(tn,k);q.setEnd(tn,k+1);const r=q.getBoundingClientRect();L.push([r.left,r.top,r.width])}`;
  try {
    await d.manage().window().setRect({ width: 1100, height: 900 });
    for (const estilo of estilos) {
      const f = resolve(`tmp-logs/boton-hover-${estilo}.html`); writeFileSync(f, pagina(estilo));
      await d.get(pathToFileURL(f).href); await esperar(600);
      salida[estilo] = {};
      const nombres = Object.keys(VARIANTES);
      for (let i = 0; i < nombres.length; i++) {
        if (solo && !solo.includes(i)) continue;
        const nombre = nombres[i];
        const el = await d.findElement(By.id('v' + i));
        await d.executeScript('arguments[0].scrollIntoView({block:"center",behavior:"instant"})', el);
        await d.actions({ async: true }).move({ x: 3, y: 3 }).perform(); await esperar(400);
        const r0 = await d.executeScript('const r=arguments[0].getBoundingClientRect();return [r.left,r.top,r.width,r.height]', el);
        const reg = { x: Math.floor(r0[0] - 14), y: Math.floor(r0[1] - 14), w: Math.ceil(r0[2] + 28), h: Math.ceil(r0[3] + 28) };
        const dp = await d.executeScript('return devicePixelRatio');
        // 1) EN VIVO: entra el ratón y se captura a varios instantes de la transición (sin pausar)
        await d.actions({ async: true }).move({ origin: el }).perform();
        const vivo = [];
        for (const t of T) {
          for (;;) { const ct = await d.executeScript('const a=arguments[0].getAnimations().find(a=>a.transitionProperty);return a?a.currentTime:-1', el); if (ct >= t || ct < 0) break; await esperar(Math.max(20, Math.min(400, (t - ct) - 60))); }
          const antes = await d.executeScript(`const c=getComputedStyle(arguments[0]);return {ct:(arguments[0].getAnimations().find(a=>a.transitionProperty)||{}).currentTime,tr:c.transform,sc:c.scale,fs:c.fontSize,pd:c.padding,zm:c.zoom}`, el);
          const png = leerPng(await d.takeScreenshot());
          const despues = await d.executeScript(`${LETRAS};const c=getComputedStyle(el);return {ct:(el.getAnimations().find(a=>a.transitionProperty)||{}).currentTime,tr:c.transform,sc:c.scale,fs:c.fontSize,pd:c.padding,zm:c.zoom,L}`, el);
          vivo.push({ t, antes, despues, png });
        }
        // 2) fin real: se deja terminar
        await d.executeScript('arguments[0].getAnimations().forEach(a=>a.finish())', el); await esperar(400);
        const fin = leerPng(await d.takeScreenshot());
        const rf = await d.executeScript('const r=arguments[0].getBoundingClientRect();return [r.left,r.top,r.width,r.height]', el);
        const Lfin = await d.executeScript(`${LETRAS};return L`, el);
        // 3) gemelos estáticos: mismos valores calculados (los de DESPUÉS de la captura), sin transición
        const R = { dpr: dp, instantes: {} };
        for (const v of vivo) {
          const o = v.despues;
          await d.executeScript(`const el=arguments[0],o=arguments[1];el.getAnimations().forEach(a=>a.cancel());const s=(k,x)=>el.style.setProperty(k,x,'important');s('transition','none');
            s('transform',o.tr);if(o.sc&&o.sc!=='none')s('scale',o.sc);s('font-size',o.fs);s('padding',o.pd);if(o.zm&&o.zm!=='1')s('zoom',o.zm);
            return new Promise(res=>requestAnimationFrame(()=>requestAnimationFrame(res)))`, el, o); await esperar(200);
          const quieto = leerPng(await d.takeScreenshot());
          const Lq = await d.executeScript(`${LETRAS};return L`, el);
          await d.executeScript(`const el=arguments[0];['transition','transform','scale','font-size','padding','zoom'].forEach(p=>el.style.removeProperty(p))`, el);
          const dl = o.L.map((l, k) => Math.max(Math.abs(l[0] - Lq[k][0]), Math.abs(l[1] - Lq[k][1]), Math.abs(l[2] - Lq[k][2])));
          const c = comparar(v.png, quieto, reg);
          R.instantes[v.t] = { ctAntes: Math.round(v.antes.ct), ctDespues: Math.round(v.despues.ct), transform: o.tr, vivoVsQuieto: c, dLetraMax: +Math.max(...dl).toFixed(3) };
        }
        // salto de "al terminar": último instante en vivo vs estado final
        const ult = vivo.at(-1);
        R.alTerminar = { casiFinalVsFinal: comparar(ult.png, fin, reg), cajaReposo: r0.map((x) => +x.toFixed(2)), cajaFinal: rf.map((x) => +x.toFixed(2)) };
        salida[estilo][nombre] = R;
        const a = R.instantes[T[0]].vivoVsQuieto, b = R.instantes[T[1]].vivoVsQuieto, c3 = R.instantes[T[2]].vivoVsQuieto, z = R.alTerminar.casiFinalVsFinal;
        console.log(`${estilo.padEnd(10)} ${nombre.padEnd(44)} vivo vs quieto px: ${a.px}/${b.px}/${c3.px} | casi-final→final: ${z.px} (máx ${z.max}) | letra máx ${R.instantes[T[1]].dLetraMax} px | caja ${r0[2].toFixed(2)}→${rf[2].toFixed(2)} | dpr ${dp}`);
        await d.actions({ async: true }).move({ x: 3, y: 3 }).perform(); await esperar(200);
        await d.executeScript(`arguments[0].getAnimations().forEach(a=>a.cancel())`, el);
      }
    }
    writeFileSync(`tmp-logs/boton-hover-dpr${dpr}.json`, JSON.stringify(salida, null, 1));
  } finally { await d.quit(); }
}
