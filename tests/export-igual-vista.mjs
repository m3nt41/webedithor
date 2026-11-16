// Punto C de la tarea del banco: el HTML EXPORTADO se comporta igual que la VISTA PREVIA (iframe del editor) en los tres casos nuevos:
//   (1) Letras Subir (contenedor .tw + fundido por letra), (2) Letras Zoom (will-change por letra) y (3) hover "Fondo que crece".
// Se compara, en Firefox, el export cargado como archivo contra el iframe de la Vista previa del editor compilado: HTML idéntico (salvo el script
// puente), mismo CSS calculado (contenedor, letras, pseudo-elemento), mismas animaciones (nº, retardos, duraciones) y mismas medidas de caja/texto
// en reposo y en hover con el ratón real.
// Ejecutar: npm run build && node tests/export-igual-vista.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Builder, By } from 'selenium-webdriver';
import { createNode as n } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('tmp-logs', { recursive: true });
const TD = { trigger: 'load', duration: 0.7, delay: 0.1, stagger: 0.06, ease: 'suave', distance: 30, angle: -90 };

const pagina = n('page', { name: 'Página', content: { title: 'T' } }); const sec = n('section', { name: 'Sec' });
sec.styles.base = { padding: '40px', background: '#ffffff' };
const sube = n('heading', { name: 'Sube', content: { text: 'Lo que hacemos', level: 2, anchor: 'sube' } });
sube.styles.base = { fontSize: '48px', margin: '0 0 20px' }; sube.animation = { text: { ...TD, mode: 'chars', effect: 'up' } };
const zoom = n('heading', { name: 'Zoom', content: { text: 'Galería', level: 2, anchor: 'zoom' } });
zoom.styles.base = { fontSize: '48px', margin: '0 0 20px' }; zoom.animation = { text: { ...TD, mode: 'words', effect: 'zoom' } };
const crece = n('button', { name: 'Crece', content: { text: 'Ver más', href: '#', anchor: 'crece' } });
crece.styles.base = { display: 'inline-block', padding: '16px 32px', fontSize: '18px', background: '#ffffff', color: '#111111', border: '1px solid #111111', borderRadius: '12px', margin: '20px' };
crece.animation = { hover: { effect: 'bgrow', duration: 0.25, ease: 'suave', color: '#ff0000' } };
sec.children.push(sube, zoom, crece); pagina.children.push(sec);

// Lo que se mide (en la página que sea: archivo o iframe): estructura, estilos calculados, animaciones y medidas
const MEDIR = `const q=(s)=>document.querySelector(s);const o={};
 const h=q('#sube'),z=q('#zoom'),b=q('#crece');
 const w1=h.querySelector('.w'),tw=h.querySelector('.tw'),w2=z.querySelector('.w'),pb=getComputedStyle(b,'::before');
 const anim=(el)=>[...el.querySelectorAll('.tw,.w')].map(x=>{const c=getComputedStyle(x);return [c.animationName,c.animationDelay,c.animationDuration,c.animationFillMode].join('|')}); // estático: no depende de cuánto lleve corriendo
 o.sube={tw:!!tw,twAnim:tw&&getComputedStyle(tw).animationName,twDisplay:tw&&getComputedStyle(tw).display,wAnim:getComputedStyle(w1).animationName,wWill:getComputedStyle(w1).willChange,letras:h.querySelectorAll('.w').length,anims:anim(h)};
 o.zoom={tw:!!z.querySelector('.tw'),wAnim:getComputedStyle(w2).animationName,wWill:getComputedStyle(w2).willChange,anims:anim(z)};
 o.crece={op:pb.opacity,tf:pb.transform,z:pb.zIndex,iso:getComputedStyle(b).isolation};
 o.html=h.outerHTML+z.outerHTML+b.outerHTML;
 return o;`;
const MEDIDAS = `const r=(e)=>{const g=e.getBoundingClientRect();return [g.left,g.top,g.width,g.height].map(x=>+x.toFixed(2))};const b=document.querySelector('#crece');const t=document.createRange();t.selectNodeContents(b);const tr=t.getBoundingClientRect();
 const pb=getComputedStyle(b,'::before');return {caja:r(b),texto:[tr.left,tr.top,tr.width,tr.height].map(x=>+x.toFixed(2)),op:pb.opacity,tf:pb.transform}`;

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1400, height: 1000 });
  // ---- A) el export como archivo ----
  const f = resolve('tmp-logs/export-igual.html'); writeFileSync(f, exportHTML(pagina));
  await d.get(pathToFileURL(f).href); await esperar(500);
  await d.executeScript('document.querySelectorAll("#sube,#zoom").forEach(e=>e.getAnimations({subtree:true}).forEach(a=>a.pause()))');
  const E = await d.executeScript(MEDIR);
  await d.actions({ async: true }).move({ x: 3, y: 3 }).perform(); await esperar(400);
  const E0 = await d.executeScript(MEDIDAS);
  await d.actions({ async: true }).move({ origin: await d.findElement(By.css('#crece')) }).perform(); await esperar(700);
  const E1 = await d.executeScript(MEDIDAS);

  // ---- B) la Vista previa del editor (iframe) ----
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('editor-landings:pagina', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(900);
  await d.findElement(By.css('#btn-vista-previa')).click(); await esperar(1200);
  const srcdoc = await d.executeScript(`return document.querySelector('#vp-frame').getAttribute('srcdoc')`);
  const PUENTE = /<script>\naddEventListener\('keydown'[\s\S]*?<\/script>/;
  const sinScripts = (h) => h.replace(/\r\n/g, '\n').replace(/<script>[\s\S]*?<\/script>/g, '<script/>');
  v(sinScripts(srcdoc.replace(PUENTE, '')) === sinScripts(exportHTML(pagina)), 'la Vista previa lleva exactamente el HTML del export (salvo el script puente)');
  await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
  await d.executeScript('document.querySelectorAll("#sube,#zoom").forEach(e=>e.getAnimations({subtree:true}).forEach(a=>a.pause()))');
  const P = await d.executeScript(MEDIR);
  await d.switchTo().defaultContent();
  await d.actions({ async: true }).move({ x: 3, y: 3 }).perform(); await esperar(400);
  const marco = await d.findElement(By.css('#vp-frame'));
  await d.switchTo().frame(marco); const P0 = await d.executeScript(MEDIDAS);
  const c = await d.executeScript('const r=document.querySelector("#crece").getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]');
  await d.switchTo().defaultContent();
  const mr = await d.executeScript('const r=document.querySelector("#vp-frame").getBoundingClientRect();return [r.left,r.top]');
  await d.actions({ async: true }).move({ x: Math.round(mr[0] + c[0]), y: Math.round(mr[1] + c[1]) }).perform();
  await esperar(700); await d.switchTo().frame(marco);
  const P1 = await d.executeScript(MEDIDAS); await d.switchTo().defaultContent();

  // ---- comparación ----
  v(E.html === P.html, 'mismo HTML de los tres elementos en el export y en la Vista previa');
  v(E.sube.tw && P.sube.tw && E.sube.twAnim === 'a-subir' && P.sube.twAnim === 'a-subir' && E.sube.twDisplay === P.sube.twDisplay, `Letras Subir: contenedor .tw con a-subir en los dos (${P.sube.twAnim}, ${P.sube.twDisplay})`);
  v(E.sube.wAnim === 'a-fade' && P.sube.wAnim === 'a-fade' && E.sube.wWill === 'auto' && P.sube.wWill === 'auto', 'Letras Subir: cada letra solo hace fundido y sin will-change, en los dos');
  v(JSON.stringify(E.sube.anims) === JSON.stringify(P.sube.anims) && E.sube.anims.length === E.sube.letras + 1, `Letras Subir: mismas ${E.sube.anims.length} animaciones (contenedor + letras) con los mismos nombres, retardos y duraciones`);
  v(!E.zoom.tw && !P.zoom.tw && E.zoom.wAnim === 'a-zoom' && P.zoom.wAnim === 'a-zoom' && E.zoom.wWill === 'scale, opacity' && P.zoom.wWill === 'scale, opacity', `Palabras Zoom: sin contenedor y con will-change "${P.zoom.wWill}", en los dos`);
  v(JSON.stringify(E.zoom.anims) === JSON.stringify(P.zoom.anims), 'Palabras Zoom: mismas animaciones');
  v(JSON.stringify(E.crece) === JSON.stringify(P.crece), `Fondo que crece (CSS calculado en reposo): igual en los dos (${JSON.stringify(P.crece)})`);
  v(JSON.stringify(E0) === JSON.stringify(P0) || (E0.op === P0.op && E0.tf === P0.tf && E0.caja[2] === P0.caja[2] && E0.texto[2] === P0.texto[2]), 'Fondo que crece: misma caja, mismo texto y mismo pseudo-elemento en reposo');
  v(E1.op === '1' && P1.op === '1' && E1.tf === P1.tf && /matrix\(1\.06/.test(P1.tf), `Fondo que crece: en hover los dos llegan a opacidad 1 y ${P1.tf}`);
  v(E1.caja[2] === E0.caja[2] && P1.caja[2] === P0.caja[2] && E1.texto[2] === E0.texto[2] && P1.texto[2] === P0.texto[2], 'Fondo que crece: ni la caja ni el texto cambian de ancho al hover, ni en el export ni en la Vista previa');
} finally { await d.quit(); }
console.log(`\n${ok} comprobaciones OK`);
