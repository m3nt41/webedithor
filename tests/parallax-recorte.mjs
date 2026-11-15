// Parallax nativo dentro de un contenedor con "Recortar contenido" (overflow:hidden), en Firefox real (Selenium).
// Ejecutar: node tests/parallax-recorte.mjs
// Causa: un ancestro con overflow:hidden es un contenedor de scroll y view() lo toma como scroller (nunca se mueve).
// Arreglo: el export emite además `@supports (overflow:clip){.nX{overflow:clip}}` (hidden queda de respaldo).
// Comprueba POR PÍXELES (captura + canvas, como tools/medir-demo-parallax.mjs): (a) con el arreglo la franja roja se mueve
// respecto al marco, (b) el marco sigue recortando (nada rojo fuera de él), (c) control negativo: sin la regla clip NO se mueve,
// (d) la regla existe solo cuando hay parallax nativo dentro, y también en móvil, (e) aviso del inspector (ancestrosConScroll).
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { Builder } from 'selenium-webdriver';
import { createNode as n } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { ancestrosConScroll } from '../src/animations/parallax.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(out, { recursive: true });
let fallos = 0;
const ok = (c, m) => { if (c) console.log('  ✔', m); else { console.log('  ✘', m); fallos++; } };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- árbol: marco con "Recortar" (lo que escribe el inspector: styles.overflow = 'hidden') y una franja roja con parallax ----
const A = 150, MARCO = 300;
const roja = n('heading', { name: 'ROJA', content: { text: ' ', level: 2 }, styles: { margin: '100px 0 0', height: '80px', background: '#ff0000' } });
roja.animation = { parallax: { effect: 'y', amount: A } };
const marco = n('container', { name: 'MARCO', styles: { height: MARCO + 'px', overflow: 'hidden', background: '#ffffff', margin: '0 100px' }, children: [roja] });
const sec = (h, hijos = []) => n('section', { name: 'S', styles: { padding: '0', height: h + 'px', background: '#ffffff' }, children: hijos });
const p = n('page', { name: 'P' });
p.children.push(sec(1200), n('section', { name: 'M', styles: { padding: '0', background: '#ffffff' }, children: [marco] }), sec(1500));
const html = exportHTML(p);

// (d) la regla clip
const reglaClip = new RegExp(`@supports \\(overflow:clip\\)\\{\\.n\\d+\\{overflow:clip\\}\\}`);
ok(reglaClip.test(html), '(d) el export lleva @supports (overflow:clip){…overflow:clip}');
ok(/\.n\d+\{[^}]*overflow:hidden[^}]*\}/.test(html), '(d) overflow:hidden sigue como respaldo');
// sin parallax dentro no se toca
const sinPar = JSON.parse(JSON.stringify(p));
delete sinPar.children[1].children[0].children[0].animation;
ok(!/overflow:clip/.test(exportHTML(sinPar)), '(d) sin parallax dentro no se emite overflow:clip');
// parallax que no es nativo (ya tiene "Al aparecer") usa el motor: no hace falta clip
const conAparecer = JSON.parse(JSON.stringify(p));
conAparecer.children[1].children[0].children[0].animation.appear = { effect: 'fade' };
ok(!/overflow:clip/.test(exportHTML(conAparecer)), '(d) parallax con motor JS (Al aparecer) no lo necesita');
// solo recorte móvil
const movil = JSON.parse(JSON.stringify(p));
const mm = movil.children[1].children[0];
mm.styles.base.overflow = ''; mm.styles.mobile.overflow = 'hidden';
const hm = exportHTML(movil);
ok(/@media \(max-width:768px\)\{[\s\S]*@supports \(overflow:clip\)\{\.n\d+\{overflow:clip\}\}[\s\S]*\}/.test(hm), '(d) recorte solo en móvil: la regla clip va dentro del @media');
// (e) aviso del inspector
const pa = JSON.parse(JSON.stringify(p));
const marcoA = pa.children[1].children[0];
ok(ancestrosConScroll(pa, marcoA.children[0].id).length === 0, '(e) overflow:hidden NO dispara el aviso (se arregla en el export)');
marcoA.styles.base.overflow = 'auto';
ok(ancestrosConScroll(pa, marcoA.children[0].id).length === 1, '(e) overflow:auto en un ancestro SÍ dispara el aviso');
marcoA.styles.base.overflow = 'scroll';
ok(ancestrosConScroll(pa, marcoA.children[0].id).length === 1, '(e) overflow:scroll también');
marcoA.styles.base.overflow = 'visible'; marcoA.styles.mobile.overflowY = 'auto';
ok(ancestrosConScroll(pa, marcoA.children[0].id, 'desktop').length === 0 && ancestrosConScroll(pa, marcoA.children[0].id, 'mobile').length === 1, '(e) el aviso respeta escritorio/móvil');

writeFileSync(join(out, 'par-recorte.html'), html);
// control negativo: el export de antes del arreglo (sin la regla clip)
writeFileSync(join(out, 'par-recorte-sin-clip.html'), html.replace(new RegExp(reglaClip.source, 'g'), ''));

const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await driver.manage().window().setRect({ width: 900, height: 700 });
  console.log('\nFirefox', (await driver.getCapabilities()).get('browserVersion'));
  // Mide por píxeles: centro Y de lo rojo dentro del marco (relativo a su borde superior) y cuánto rojo cae FUERA del marco
  const medir = async (archivo) => {
    await driver.get(pathToFileURL(join(out, archivo)).href); await esperar(500);
    const sup = await driver.executeScript("return CSS.supports('animation-timeline','view()') && CSS.supports('overflow','clip')");
    const filas = [];
    for (let y = 900; y <= 1500; y += 100) {
      await driver.executeScript('window.scrollTo(0,arguments[0])', y); await esperar(400);
      const marcoR = await driver.executeScript("const e=[...document.querySelectorAll('div')].find(d=>d.querySelector(':scope > h2'));const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom}");
      const png = await driver.takeScreenshot();
      const r = await driver.executeAsyncScript(`const A=arguments,cb=A[A.length-1];const im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);const d=x.getImageData(0,0,c.width,c.height).data;const k=im.width/innerWidth;const m=A[0];let s=0,n=0,fuera=0;for(let yy=0;yy<c.height;yy++){for(let xx=0;xx<c.width;xx++){const i=(yy*c.width+xx)*4;if(d[i]>230&&d[i+1]<40&&d[i+2]<40){const cy=yy/k;if(cy>=m.top&&cy<=m.bottom){s+=cy;n++}else if(cy<m.top-1||cy>m.bottom+1)fuera++}}}cb({cy:n>50?s/n-m.top:null,fuera})};im.src='data:image/png;base64,'+A[1]`, marcoR, png);
      filas.push({ y, ...r });
    }
    return { sup, filas };
  };
  const vis = (f) => f.filter((x) => x.cy !== null).map((x) => x.cy);
  const rango = (v) => (v.length ? Math.max(...v) - Math.min(...v) : 0);

  console.log('\nCON EL ARREGLO (overflow:clip)');
  const a = await medir('par-recorte.html');
  const va = vis(a.filas);
  console.log('  soporte nativo + clip:', a.sup, '· centro de la franja respecto al marco por paso:', va.map((v) => v.toFixed(0)).join(' '));
  ok(a.sup, '(a) este Firefox soporta animation-timeline y overflow:clip');
  ok(va.length >= 4 && rango(va) > 40, `(a) la franja se mueve dentro del marco por píxeles (rango ${rango(va).toFixed(1)} px)`);
  ok(a.filas.every((x) => x.fuera < 20), `(b) el marco recorta: nada rojo fuera de él (máx ${Math.max(...a.filas.map((x) => x.fuera))} px)`);

  console.log('\nCONTROL NEGATIVO (sin la regla clip, solo overflow:hidden)');
  const b = await medir('par-recorte-sin-clip.html');
  const vb = vis(b.filas);
  console.log('  centro de la franja por paso:', vb.map((v) => v.toFixed(0)).join(' '));
  ok(rango(vb) < 5, `(c) con overflow:hidden NO se mueve (rango ${rango(vb).toFixed(1)} px): el test detecta el bug`);
} finally {
  await driver.quit();
}
console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo en verde');
process.exit(fallos ? 1 : 0);
