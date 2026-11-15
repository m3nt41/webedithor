// Hover "Subrayado", "Color" y "Fondo suave" (texto sin mover las letras) en Firefox real, sobre el HTML exportado
// y el lienzo del editor. Subrayado: se mide POR PÍXELES (captura) de dónde crece la línea en cada Dirección, y que con entradas y salidas rápidas el transform-origin no cambia (izq, der, centro).
// Ejecutar: npm run build && node tests/hover-nuevos.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Builder, By } from 'selenium-webdriver';
import { createNode as n } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { cssNodo, GRUPOS_ANIM } from '../src/animations/index.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };

const mk = (nombre, hover, base = {}) => {
  const x = n('button', { name: nombre, content: { text: nombre, href: '#' } });
  x.styles.base = { color: '#111111', fontSize: '28px', display: 'inline-block', ...base }; x.animation = { hover }; return x;
};
const nodos = {
  Subrayado: mk('Subrayado', { effect: 'underline', lineaColor: 'otro', color: '#ff0000', duration: 1.5, ease: 'lineal' }), // sin dirección guardada = izquierda
  SubDer: mk('SubDer', { effect: 'underline', direccion: 'der', lineaColor: 'otro', color: '#ff0000', duration: 1.5, ease: 'lineal' }),
  SubCentro: mk('SubCentro', { effect: 'underline', direccion: 'centro', lineaColor: 'otro', color: '#ff0000', duration: 1.5, ease: 'lineal' }),
  SubPasa: mk('SubPasa', { effect: 'underline', direccion: 'pasa', lineaColor: 'otro', color: '#ff0000', duration: 1.5, ease: 'lineal' }),
  SubGrueso: mk('SubGrueso', { effect: 'underline', grosor: 4, separacion: 6, duration: 0.2 }),
  SubrayadoTexto: mk('SubrayadoTexto', { effect: 'underline', duration: 0.2 }),
  Color: mk('Color', { effect: 'color', color: '#00aa00', duration: 0.2 }),
  Fondo: mk('Fondo', { effect: 'soft', color: '#0000ff', duration: 0.2 }),
};
// Relleno: botón con caja (fondo oscuro, esquinas redondeadas de 40 px), relleno ROJO, 1.5 s lineal para poder capturar a medias
const caja = { background: '#111111', color: '#ffffff', borderRadius: '40px', padding: '14px 40px' };
const rl = (nombre, extra, base = {}) => mk(nombre, { effect: 'fill', color: '#ff0000', duration: 1.5, ease: 'lineal', ...extra }, { ...caja, ...base });
Object.assign(nodos, {
  RelFundido: rl('RelFundido', { modo: 'fundido', textoCambia: 'si', textoColor: '#00ff00' }),
  RelIzq: rl('RelIzq', { modo: 'barrido', dirRelleno: 'izq' }),
  RelDer: rl('RelDer', { modo: 'barrido', dirRelleno: 'der' }),
  RelArriba: rl('RelArriba', { modo: 'barrido', dirRelleno: 'arriba' }),
  RelAbajo: rl('RelAbajo', { modo: 'barrido', dirRelleno: 'abajo' }),
  RelTexto: rl('RelTexto', { modo: 'barrido', textoCambia: 'si', textoColor: '#00ff00', duration: 0.2 }),
});
const pagina = n('page', { name: 'Página', content: { title: 'Hover nuevos' } });
const sec = n('section', { name: 'Sec', children: Object.values(nodos) });
sec.styles.base = { display: 'flex', flexDirection: 'column', gap: '60px', padding: '80px', alignItems: 'flex-start', background: '#ffffff' };
pagina.children.push(sec);

// ---- CSS sin navegador ----
const c = (k) => cssNodo(nodos[k], '.x', { scroll: false });
v(/\.x::before\{[^}]*transform:scaleX\(0\);transform-origin:left/.test(c('Subrayado')) && /\.x:hover::before\{transform:scaleX\(1\)\}/.test(c('Subrayado')), 'subrayado: por defecto (sin dirección guardada) = izquierda, origin fijo left');
v(/transform-origin:right;/.test(c('SubDer')) && /\.x:hover::before\{transform:scaleX\(1\)\}/.test(c('SubDer')), 'subrayado: derecha = origin right fijo');
v(/transform-origin:center;/.test(c('SubCentro')) && /\.x:hover::before\{transform:scaleX\(1\)\}/.test(c('SubCentro')), 'subrayado: centro = origin center fijo');
v(/transform-origin:right;/.test(c('SubPasa')) && /\.x:hover::before\{transform:scaleX\(1\);transform-origin:left\}/.test(c('SubPasa')), 'subrayado: lado a lado = el origin cambia right → left');
v(/bottom:-10px;height:4px/.test(c('SubGrueso')), 'subrayado: grosor 4 y separación 6 (bottom:-10px)');
v(/bottom:-2px;height:2px/.test(c('Subrayado')), 'subrayado: grosor 2 y separación 0 por defecto');
v(c('Subrayado').includes('background:#ff0000') && c('SubrayadoTexto').includes('background:currentColor'), 'subrayado: color elegible o el del texto');
v(!c('Subrayado').includes('::after'), 'subrayado: no toca el ::after anti-parpadeo');
v(/color:#00aa00!important/.test(c('Color')) && c('Color').includes(',color 0.2s'), 'color: color destino con transition de color');
v(/\.x::before\{[^}]*border-radius[^}]*opacity:0/.test(c('Fondo')) && /\.x:hover::before\{opacity:\.2\}/.test(c('Fondo')), 'fondo suave: pastilla con opacity y esquinas redondeadas');
// Relleno
v(/\.x:hover\{[^}]*background-color 1\.5s[^}]*;background-color:#ff0000!important;color:#00ff00!important\}/.test(c('RelFundido')) && !c('RelFundido').includes('::before'), 'relleno fundido: background-color con transition y color de texto al pasar, sin pseudo-elemento');
v(/\.x\{position:relative;isolation:isolate;overflow:clip\}/.test(c('RelIzq')) && /\.x::before\{[^}]*inset:0;background:#ff0000;transform:scaleX\(0\);transform-origin:left;transition:transform 1\.5s[^}]*z-index:-1/.test(c('RelIzq')) && /\.x:hover::before\{transform:scaleX\(1\)\}/.test(c('RelIzq')), 'relleno barrido izq: ::before inset:0 scaleX(0→1), origin left fijo, z-index:-1, isolation:isolate y overflow:clip');
v(/transform:scaleX\(0\);transform-origin:right/.test(c('RelDer')) && /transform:scaleY\(0\);transform-origin:top/.test(c('RelArriba')) && /transform:scaleY\(0\);transform-origin:bottom/.test(c('RelAbajo')), 'relleno barrido: der = origin right, arriba = scaleY origin top, abajo = scaleY origin bottom');
v(!/(^|[;{])(transform|filter):/.test(c('RelTexto').split('\n').filter((r) => /^\.x(:hover)?\{/.test(r)).join('')) && !/will-change/.test(c('RelTexto')) && /,color 0\.2s/.test(c('RelTexto')), 'relleno: sin transform, filter ni will-change sobre el texto; color con transition');
v(!c('RelIzq').includes('::after'), 'relleno: no toca el ::after anti-parpadeo');
v(!/overflow:clip/.test(cssNodo(rl('RelHid', { modo: 'barrido' }, { overflow: 'hidden' }), '.x', { scroll: false })), 'relleno: si el nodo ya recorta (overflow:hidden) no se le pisa');
const campoRel = GRUPOS_ANIM.find((g) => g.id === 'hover').campos[0];
v(campoRel.opcionesNodo(rl('Caja', {}))[1][0] === 'fill' && campoRel.opcionesNodo(nodos.Color)[1][0] === 'underline', 'inspector: "Relleno" sale primero (sugerido) en botones con caja; el subrayado sigue primero sin caja');
// reglas que caen sobre el elemento (.x y .x:hover, no los pseudo): sin declaraciones filter: / transform: / will-change
for (const k of Object.keys(nodos)) {
  const sobreTexto = c(k).split('\n').filter((r) => /^\.x(:hover)?\{/.test(r)).join('');
  v(!/will-change/.test(c(k)) && !/(^|[;{])(filter|transform):/.test(sobreTexto), `${k}: sin will-change, filter ni transform sobre el texto`);
}
// el orden de la lista: nuevos primero en texto sin caja; clásicos primero con caja
const campo = GRUPOS_ANIM.find((g) => g.id === 'hover').campos[0];
v(campo.opcionesNodo(nodos.Color)[1][0] === 'underline' && campo.opcionesNodo(mk('Caja', { effect: 'lift' }, { background: '#111' }))[2][0] === 'lift', 'inspector: nuevos primero en texto sin caja; con caja, Relleno y luego los clásicos');

mkdirSync('tests/out', { recursive: true });
writeFileSync('tests/out/hover-nuevos.html', exportHTML(pagina));
const ids = Object.fromEntries(Object.entries(nodos).map(([k, x]) => [k, x.id]));

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
// Cuenta píxeles rojos (línea) dentro de la caja del elemento (+6 px abajo) a partir de una captura
async function rojos(el) {
  const r = await d.executeScript('const b=arguments[0].getBoundingClientRect();return {x:b.left,y:b.top,w:b.width,h:b.height,dpr:devicePixelRatio}', el);
  const b64 = await d.takeScreenshot();
  // la captura se decodifica en la página con un canvas y se cuentan los píxeles rojos dentro de la caja (+6 px abajo)
  const m = await d.executeAsyncScript(`const [b64,r]=arguments;const done=arguments[arguments.length-1];
    const im=new Image();im.onload=()=>{const cv=document.createElement('canvas');cv.width=im.width;cv.height=im.height;
    const cx=cv.getContext('2d');cx.drawImage(im,0,0);let mn=1e9,mx=-1,cuenta=0,ay=1e9,by=-1;
    const x0=Math.floor(r.x*r.dpr),x1=Math.ceil((r.x+r.w)*r.dpr),y0=Math.floor(r.y*r.dpr),y1=Math.ceil((r.y+r.h+6)*r.dpr);
    const dt=cx.getImageData(x0,y0,x1-x0,y1-y0).data;
    for(let y=0;y<y1-y0;y++)for(let x=0;x<x1-x0;x++){const i=(y*(x1-x0)+x)*4;
      if(dt[i]>200&&dt[i+1]<60&&dt[i+2]<60){cuenta++;mn=Math.min(mn,x);mx=Math.max(mx,x);ay=Math.min(ay,y);by=Math.max(by,y);}}
    const q=(x,y)=>{const j=(y*(x1-x0)+x)*4;return dt[j]>200&&dt[j+1]<60&&dt[j+2]<60;};
    done({cuenta,ancho:mx<0?0:mx-mn+1,izq:mn,der:mx+1,arr:ay,aba:by+1,alto:by<0?0:by-ay+1,esq:q(1,1)});};im.src='data:image/png;base64,'+b64;`, b64, r);
  return { ...m, caja: r.w * r.dpr, cajaAlto: r.h * r.dpr, x0: Math.floor(r.x * r.dpr) };
}
const estilo = (el, pseudo) => d.executeScript(`const c=getComputedStyle(arguments[0],arguments[1]);return {color:c.color,bg:c.backgroundColor,op:c.opacity,tr:c.transform,f:c.filter,wc:c.willChange}`, el, pseudo);
async function subrayado(contexto, buscar, nombre, dir) {
  const sub = await buscar(nombre);
  await d.executeScript('arguments[0].scrollIntoView({block:"center"})', sub);
  await d.actions({ async: true }).move({ x: 3, y: 3 }).perform(); await esperar(500);
  const antes = await rojos(sub);
  await d.actions({ async: true }).move({ origin: sub }).perform();
  let medio = await rojos(sub);
  for (let i = 0; i < 6 && medio.cuenta === 0; i++) medio = await rojos(sub); // primera captura con línea visible
  await esperar(2000); const fin = await rojos(sub);
  const L = `${contexto} subrayado ${dir}`;
  v(antes.cuenta === 0, `${L}: sin línea antes del hover`);
  v(fin.cuenta > 0 && Math.abs(fin.ancho - fin.caja) <= 2, `${L}: línea roja del ancho del texto (${fin.ancho}/${fin.caja} px)`);
  const parcial = (m) => m.ancho > 0 && m.ancho < fin.ancho - 3;
  const tocaIzq = (m) => m.izq <= 2, tocaDer = (m) => m.der >= fin.ancho - 2;
  const soloIzq = (m) => tocaIzq(m) && !tocaDer(m), soloDer = (m) => tocaDer(m) && !tocaIzq(m), centro = (m) => !tocaIzq(m) && !tocaDer(m);
  const entra = { izq: soloIzq, pasa: soloIzq, der: soloDer, centro }[dir];
  v(parcial(medio) && entra(medio), `${L}: al entrar crece desde ${{ izq: 'la izquierda', pasa: 'la izquierda', der: 'la derecha', centro: 'el centro' }[dir]} (${medio.ancho} → ${fin.ancho} px, x+${medio.izq}..x+${medio.der})`);
  const t = await estilo(sub, ''); v(t.tr === 'none' && t.f === 'none' && t.wc === 'auto', `${L}: el texto sin transform, filter ni will-change`);
  await d.actions({ async: true }).move({ x: 3, y: 3 }).perform();
  const sale = await rojos(sub); await esperar(2000);
  const recoge = { izq: soloIzq, der: soloDer, pasa: soloDer, centro }[dir];
  v(parcial(sale) && recoge(sale), `${L}: al salir se recoge hacia ${{ izq: 'la izquierda', der: 'la derecha', pasa: 'la derecha', centro: 'el centro' }[dir]} (${sale.ancho} px, x+${sale.izq}..x+${sale.der})`);
  v((await rojos(sub)).cuenta === 0, `${L}: línea fuera tras salir`);
}
// Entradas y salidas rápidas (varias en ~300 ms): se lee el transform-origin del ::before en cada paso.
// En izq, der y centro no cambia nunca; en "pasa" sí (por eso la etiqueta avisa).
async function rapido(contexto, buscar) {
  for (const [nombre, fijo] of [['Subrayado', true], ['SubDer', true], ['SubCentro', true], ['SubPasa', false]]) {
    const el = await buscar(nombre);
    await d.executeScript('arguments[0].scrollIntoView({block:"center"})', el);
    await d.actions({ async: true }).move({ x: 3, y: 3 }).perform(); await esperar(2200);
    const lee = () => d.executeScript('return getComputedStyle(arguments[0],"::before").transformOrigin', el);
    const vistos = new Set([await lee()]);
    for (let i = 0; i < 4; i++) {
      await d.actions({ async: true }).move({ origin: el }).perform(); vistos.add(await lee());
      await d.actions({ async: true }).move({ x: 3, y: 3 }).perform(); vistos.add(await lee());
    }
    v(fijo ? vistos.size === 1 : vistos.size > 1, `${contexto} rápido ${nombre}: transform-origin ${fijo ? 'no cambia' : 'sí cambia (esperado)'} (${[...vistos].join(' | ')})`);
    await esperar(2200);
  }
}
// Relleno por píxeles: sin rojo antes; a medias entra por el lado correcto; al final cubre el botón y respeta el border-radius
async function relleno(contexto, buscar, nombre, dir) {
  const el = await buscar(nombre);
  await d.executeScript('arguments[0].scrollIntoView({block:"center"})', el);
  await d.actions({ async: true }).move({ x: 3, y: 3 }).perform(); await esperar(500);
  const L = `${contexto} relleno ${nombre}`;
  const antes = await rojos(el); v(antes.cuenta === 0, `${L}: sin rojo antes del hover`);
  await d.actions({ async: true }).move({ origin: el }).perform();
  let medio = await rojos(el);
  for (let i = 0; i < 6 && medio.cuenta === 0; i++) medio = await rojos(el);
  await esperar(2000); const fin = await rojos(el);
  const area = fin.caja * fin.cajaAlto;
  v(fin.cuenta / area > 0.7 && Math.abs(fin.ancho - fin.caja) <= 2 && Math.abs(fin.alto - fin.cajaAlto) <= 2, `${L}: al final el rojo cubre el botón (${Math.round(100 * fin.cuenta / area)} % del área, ${fin.ancho}x${fin.alto} de ${Math.round(fin.caja)}x${Math.round(fin.cajaAlto)})`);
  v(!fin.esq, `${L}: la esquina queda sin rojo (respeta el border-radius)`);
  if (dir !== 'fundido') {
    const tocaI = medio.izq <= 2, tocaD = medio.der >= fin.ancho - 2, tocaA = medio.arr <= 2, tocaB = medio.aba >= fin.alto - 2;
    const lado = { izq: tocaI && !tocaD, der: tocaD && !tocaI, arriba: tocaA && !tocaB, abajo: tocaB && !tocaA }[dir];
    const parcial = dir === 'izq' || dir === 'der' ? medio.ancho > 0 && medio.ancho < fin.ancho - 3 : medio.alto > 0 && medio.alto < fin.alto - 3;
    v(parcial && lado, `${L}: a medias entra desde ${dir} (${medio.ancho}x${medio.alto} → ${fin.ancho}x${fin.alto})`);
  }
  await d.actions({ async: true }).move({ x: 3, y: 3 }).perform(); await esperar(2000);
  v((await rojos(el)).cuenta === 0, `${L}: sin rojo tras salir`);
}
// Entradas y salidas rápidas: el transform-origin del ::before no cambia nunca
async function rellenoRapido(contexto, buscar) {
  for (const nombre of ['RelIzq', 'RelDer', 'RelArriba', 'RelAbajo']) {
    const el = await buscar(nombre);
    await d.executeScript('arguments[0].scrollIntoView({block:"center"})', el);
    await d.actions({ async: true }).move({ x: 3, y: 3 }).perform(); await esperar(2200);
    const lee = () => d.executeScript('return getComputedStyle(arguments[0],"::before").transformOrigin', el);
    const vistos = new Set([await lee()]);
    for (let i = 0; i < 4; i++) {
      await d.actions({ async: true }).move({ origin: el }).perform(); vistos.add(await lee());
      await d.actions({ async: true }).move({ x: 3, y: 3 }).perform(); vistos.add(await lee());
    }
    v(vistos.size === 1, `${contexto} relleno rápido ${nombre}: transform-origin no cambia (${[...vistos].join(' | ')})`);
    await esperar(2200);
  }
}
async function revisar(contexto, buscar) {
  for (const [nombre, dir] of [['RelFundido', 'fundido'], ['RelIzq', 'izq'], ['RelDer', 'der'], ['RelArriba', 'arriba'], ['RelAbajo', 'abajo']]) await relleno(contexto, buscar, nombre, dir);
  await rellenoRapido(contexto, buscar);
  const rt = await buscar('RelTexto');
  await d.actions({ async: true }).move({ origin: rt }).perform(); await esperar(600);
  const et = await estilo(rt, ''); v(et.color === 'rgb(0, 255, 0)' && et.tr === 'none' && et.f === 'none' && et.wc === 'auto', `${contexto} relleno: el texto pasa a verde sin transform, filter ni will-change (${et.color})`);
  await d.actions({ async: true }).move({ x: 3, y: 3 }).perform(); await esperar(400);
  const DIRS = { Subrayado: 'izq', SubDer: 'der', SubCentro: 'centro', SubPasa: 'pasa' };
  for (const [nombre, dir] of Object.entries(DIRS)) await subrayado(contexto, buscar, nombre, dir);
  await rapido(contexto, buscar);
  // Color
  const col = await buscar('Color');
  await d.actions({ async: true }).move({ origin: col }).perform(); await esperar(500);
  const e = await estilo(col, ''); v(e.color === 'rgb(0, 170, 0)' && e.tr === 'none', `${contexto} color: el texto pasa a verde sin transform (${e.color})`);
  // Fondo suave
  const fo = await buscar('Fondo');
  const p0 = await estilo(fo, '::before');
  await d.actions({ async: true }).move({ origin: fo }).perform(); await esperar(500);
  const p1 = await estilo(fo, '::before'); const t2 = await estilo(fo, '');
  v(+p0.op === 0 && Math.abs(+p1.op - 0.2) < 0.01 && p1.bg === 'rgb(0, 0, 255)', `${contexto} fondo suave: pastilla azul semitransparente (${p0.op} → ${p1.op})`);
  v(t2.tr === 'none' && t2.f === 'none', `${contexto} fondo suave: el texto no se mueve`);
  await d.actions({ async: true }).move({ x: 3, y: 3 }).perform();
}
try {
  await d.manage().window().setRect({ width: 1200, height: 900 });
  await d.get(pathToFileURL(resolve('tests/out/hover-nuevos.html')).href); await esperar(500);
  await revisar('export', async (t) => (await d.findElements(By.xpath(`//*[self::a or self::button][normalize-space()="${t}"]`)))[0]);
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.setItem('editor-landings:pagina', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(800);
  await revisar('lienzo', async (t) => d.findElement(By.css(`#preview [data-id="${ids[t]}"]`)));
  console.log(`\n${ok} comprobaciones OK`);
} finally {
  await d.quit();
}
