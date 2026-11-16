// SOMBRA EN REPOSO (clave propia `sombra`): técnica según el elemento, presets, hover que la REEMPLAZA y vuelve, móvil, editor = export = vista previa,
// seguridad y "copiar efectos no copia la sombra". Selenium en Firefox, con medición por PÍXELES (capturas de pantalla leídas con tools/png.mjs).
// Ejecutar: npm run build && node tests/sombra-reposo.mjs      (debe FALLAR sin la función y pasar con ella)
// Genera además docs/capturas-inspector/sombra-presets.png y sombra-inspector.png (con SOMBRA_CAPTURAS=1, o siempre que pase).
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Builder, By } from 'selenium-webdriver';
import { createNode as n, normalizePage, walk } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';
import { leerPng, contarNoBlancos } from '../tools/png.mjs';
import { sombraValida, sombraDeclaraciones, leerSombraUi, PRESETS_SOMBRA } from '../src/core/sombra.js';
import { copiarAnimacion } from '../src/animations/copiar.js';
import { avisoQuitados } from '../src/core/seguridad.js';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };
const P = Object.fromEntries(PRESETS_SOMBRA.map((p) => [p.k, p.val]));

// ================= Parte 1: lógica pura (Node) =================
for (const bueno of ['0 4px 12px 0 rgba(0,0,0,0.2)', '0 0 0 2px #7c5cff', '1px 2px 3px #fff, 2px 2px 2px blue', 'none', 'inset 0 0 4px red', 'red 0 1px 2px', '0 0 8px hsla(120, 50%, 50%, 0.5)']) {
  v(sombraValida(bueno), `válida: ${bueno}`);
}
for (const malo of ['0 0 0 url(https://x.com/a.png) red', '0 0 4px var(--x)', '0 0 4px red; background:red', '0 0 4px red /* x */', '0 0 4px red}', '0 0 4px rgba(0,0,0,.3', '0 0 -4px red', '0 0 4 red', '1px 1px 1px 1px 1px red',
  '0 0 4px red, 0 0 4px red, 0 0 4px red, 0 0 4px red, 0 0 4px red', '0 0 4px expression(1)', '0 0 4px \\72 ed', 'calc(1px) 0 4px red', '']) {
  v(!sombraValida(malo), `inválida: ${JSON.stringify(malo)}`);
}
v(!sombraValida('inset 0 0 4px red', { texto: true }) && !sombraValida('0 0 4px 2px red', { texto: true }) && sombraValida('0 0 4px red', { texto: true }), 'text-shadow: sin inset ni expansión');
v(JSON.stringify(sombraDeclaraciones(P.media, false)) === '{"boxShadow":"0 6px 18px 0 rgba(0,0,0,0.22)"}', 'caja -> box-shadow');
v(JSON.stringify(sombraDeclaraciones(P.media, 'texto')) === '{"textShadow":"0 6px 18px rgba(0,0,0,0.22)"}', 'texto -> text-shadow (sin expansión)');
v(JSON.stringify(sombraDeclaraciones(P.media, 'plano')) === '{"filter":"drop-shadow(0 6px 18px rgba(0,0,0,0.22))"}', 'plano -> drop-shadow');
v(sombraDeclaraciones(P.contorno, 'texto').textShadow.split(',').length === 8 && sombraDeclaraciones(P.contorno, 'plano').filter.match(/drop-shadow/g).length === 8, 'Contorno en texto/plano = 8 copias desplazadas');
v(sombraDeclaraciones('none', false).boxShadow === 'none' && sombraDeclaraciones('none', 'plano').filter === 'none', "'none' escribe none en la técnica del nodo (para pisar la de escritorio en móvil)");
v(leerSombraUi('').tipo === 'ninguna' && leerSombraUi(P.suave).k === 'suave' && leerSombraUi('3px 4px 5px 0 #123456').tipo === 'custom' && leerSombraUi('1px 1px 1px red, 2px 2px 2px blue').tipo === 'otro', 'el inspector reconoce ninguna / preset / personalizada / otra');

// seguridad al importar: lo malo se descarta con cuenta; lo bueno pasa idéntico
{
  const pg = n('page', { name: 'P', content: { title: 't' } });
  const x = n('text', { name: 'X', content: { text: 'x' } });
  x.styles.base = { sombra: '0 0 4px red; background:url(https://evil.example/a.png)', boxShadow: '0 0 0 url(https://evil.example/x.png) red', textShadow: '0 0 4px var(--x)', color: '#111111' };
  x.styles.mobile = { sombra: P.suave };
  const y = n('text', { name: 'Y', content: { text: 'y' } });
  y.styles.base = { sombra: P.media, boxShadow: '0 2px 4px #000' };
  pg.children.push(n('section', { name: 'S', children: [x, y] }));
  const inf = {}; const sano = normalizePage(JSON.parse(JSON.stringify(pg)), inf);
  v(inf.quitados === 3 && avisoQuitados(inf.quitados).includes('3 valores'), `3 sombras malas descartadas con aviso (quitados=${inf.quitados})`);
  const [sx, sy] = sano.children[0].children;
  v(sx.styles.base.color === '#111111' && !('sombra' in sx.styles.base) && !('boxShadow' in sx.styles.base) && !('textShadow' in sx.styles.base) && sx.styles.mobile.sombra === P.suave, 'solo se va lo malo; lo sano se queda');
  v(sy.styles.base.sombra === P.media && sy.styles.base.boxShadow === '0 2px 4px #000', 'sombras sanas pasan idénticas');
  const html = exportHTML(JSON.parse(JSON.stringify(Object.assign(pg, { children: [] }))));
  v(!/filter/.test(html), 'export sin nodos con sombra: ningún filter');
}

// copiar efectos NO copia la sombra en reposo (es estilo, no efecto)
{
  const x = n('button', { name: 'B', content: { text: 'b', href: '#' } });
  x.styles.base = { sombra: P.media, background: '#111111' };
  x.animation = { hover: { effect: 'lift' } };
  const c = copiarAnimacion(x);
  v(c && c.hover && !JSON.stringify(c).includes('sombra') && !JSON.stringify(c).includes('rgba(0,0,0,0.22)'), 'copiarAnimacion: se copia el hover y NO la sombra en reposo');
}

// ================= Parte 2: páginas de prueba =================
const IMG = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect x="18" y="18" width="24" height="24" fill="#d22"/></svg>');
const mk = (tipo, nombre, base, extra = {}) => { const x = n(tipo, { name: nombre, content: extra.content }); x.styles.base = base; if (extra.mobile) x.styles.mobile = extra.mobile; if (extra.anim) x.animation = extra.anim; return x; };
const CAJA = { width: '140px', height: '70px', background: '#e8e8f0' };
const casos = {};
for (const k of ['suave', 'media', 'elevada', 'contorno']) casos[`caja-${k}`] = mk('container', `caja-${k}`, { ...CAJA, sombra: P[k] });
casos['caja-sin'] = mk('container', 'caja-sin', { ...CAJA });
casos['texto-con'] = mk('heading', 'texto-con', { fontSize: '44px', color: '#222222', sombra: P.media }, { content: { text: 'Sombra', level: 2 } });
casos['texto-sin'] = mk('heading', 'texto-sin', { fontSize: '44px', color: '#222222' }, { content: { text: 'Sombra', level: 2 } });
casos['icono-con'] = mk('icon', 'icono-con', { width: '64px', color: '#222222', sombra: P.media }, { content: { name: 'star' } });
casos['icono-sin'] = mk('icon', 'icono-sin', { width: '64px', color: '#222222' }, { content: { name: 'star' } });
casos['img-con'] = mk('image', 'img-con', { width: '60px', height: '60px', sombra: P.elevada }, { content: { src: IMG, alt: '' } });
casos['img-sin'] = mk('image', 'img-sin', { width: '60px', height: '60px' }, { content: { src: IMG, alt: '' } });
// hover: la sombra del efecto REEMPLAZA a la de reposo
const LIFT = { hover: { effect: 'lift' } };
casos['h-caja'] = mk('container', 'h-caja', { ...CAJA, sombra: P.media }, { anim: LIFT });
casos['h-texto'] = mk('heading', 'h-texto', { fontSize: '44px', color: '#222222', sombra: P.media }, { content: { text: 'Hover', level: 2 }, anim: LIFT });
casos['h-icono'] = mk('icon', 'h-icono', { width: '64px', color: '#222222', sombra: P.media }, { content: { name: 'star' }, anim: LIFT });
casos['h-glow'] = mk('container', 'h-glow', { ...CAJA, sombra: P.suave }, { anim: { hover: { effect: 'glow', color: '#ff0000' } } });
casos['h-bright'] = mk('icon', 'h-bright', { width: '64px', color: '#222222', sombra: P.media }, { content: { name: 'star' }, anim: { hover: { effect: 'bright' } } });
// móvil: quitarla / cambiarla
casos['m-quitar'] = mk('container', 'm-quitar', { ...CAJA, sombra: P.media }, { mobile: { sombra: 'none' } });
casos['m-cambiar'] = mk('container', 'm-cambiar', { ...CAJA, sombra: P.media }, { mobile: { sombra: P.elevada } });
// con caja por fondo: un texto con fondo usa box-shadow
casos['texto-caja'] = mk('text', 'texto-caja', { padding: '10px 20px', background: '#e8e8f0', color: '#222222', sombra: P.media }, { content: { text: 'Con fondo' } });

const pagina = n('page', { name: 'Página', content: { title: 'Sombra reposo' } });
for (const [k, x] of Object.entries(casos)) {
  pagina.children.push(n('section', { name: 'S-' + k, children: [x] }));
  pagina.children.at(-1).styles.base = { padding: '90px 40px', display: 'flex', justifyContent: 'center', background: '#ffffff' };
}
const ids = Object.fromEntries(Object.entries(casos).map(([k, x]) => [k, x.id]));
mkdirSync('tests/out', { recursive: true });
const html = exportHTML(pagina);
writeFileSync('tests/out/sombra-reposo.html', html);
v(!/will-change/.test(html), 'export sin will-change');
v(html.includes(':hover::after{content:\'\'') , 'el ::after anti-parpadeo del lift se conserva');

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
const js = (s, ...a) => d.executeScript(s, ...a);
try {
  await d.manage().window().setRect({ width: 1200, height: 900 });
  await d.get(pathToFileURL(resolve('tests/out/sombra-reposo.html')).href); await esperar(500);
  const css = (sel) => js(`const c=getComputedStyle(document.querySelector(arguments[0]));return {bs:c.boxShadow,ts:c.textShadow,f:c.filter,tp:c.transitionProperty}`, sel);
  const clase = async (k) => js(`return document.querySelectorAll('section')[arguments[0]].firstElementChild.className.split(' ')[0]`, Object.keys(casos).indexOf(k));
  const sel = async (k) => '.' + await clase(k);
  const hay = (s) => s && s !== 'none';

  // píxeles: foto de la pantalla y cuenta de no blancos alrededor
  async function pixeles(k, { fuera = false, zonaImg = false } = {}) {
    const s = await sel(k);
    await js('document.querySelector(arguments[0]).scrollIntoView({block:"center"})', s); await esperar(150);
    await d.actions({ async: true }).move({ x: 2, y: 2 }).perform(); await esperar(250);
    const r = await js(`const r=document.querySelector(arguments[0]).getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,dpr:window.devicePixelRatio}`, s);
    const png = leerPng(await d.takeScreenshot());
    const e = r.dpr, M = 60 * e, R = { x: Math.round(r.x * e), y: Math.round(r.y * e), w: Math.round(r.w * e), h: Math.round(r.h * e) };
    if (zonaImg) { // dentro de la caja de la imagen pero FUERA del cuadrado rojo central (18..42 de 60)
      const cx = R.x + Math.round(R.w * 0.3), cy = R.y + Math.round(R.h * 0.3), cw = Math.round(R.w * 0.4), ch = Math.round(R.h * 0.4);
      return contarNoBlancos(png, R.x, R.y, R.x + R.w, R.y + R.h, { x: cx, y: cy, w: cw, h: ch });
    }
    return contarNoBlancos(png, R.x - M, R.y - M, R.x + R.w + M, R.y + R.h + M, fuera ? R : null);
  }

  // --- caja: box-shadow, presets con píxeles de sombra alrededor y sin sombra no ---
  const sin = await pixeles('caja-sin', { fuera: true });
  v(sin === 0, `caja sin sombra: 0 píxeles fuera de la caja (${sin})`);
  for (const k of ['suave', 'media', 'elevada', 'contorno']) {
    const c = await css(await sel(`caja-${k}`));
    const px = await pixeles(`caja-${k}`, { fuera: true });
    v(hay(c.bs) && !hay(c.ts) && !hay(c.f), `preset ${k} en caja: box-shadow (${c.bs}) y nada de text-shadow ni filter`);
    v(px > 100, `preset ${k} en caja: hay píxeles de sombra alrededor (${px})`);
  }
  // --- texto sin caja: text-shadow ---
  const tcon = await css(await sel('texto-con'));
  v(hay(tcon.ts) && !hay(tcon.bs) && !hay(tcon.f), `texto sin caja -> text-shadow, sin box-shadow ni filter (${tcon.ts})`);
  const pTCon = await pixeles('texto-con'), pTSin = await pixeles('texto-sin');
  v(pTCon > pTSin + 300, `texto con sombra tiene más píxeles que sin ella (${pTCon} vs ${pTSin})`);
  // --- icono plano: drop-shadow ---
  const icon = await css(await sel('icono-con'));
  v(/drop-shadow/.test(icon.f) && !hay(icon.bs) && !hay(icon.ts), `icono plano -> filter: drop-shadow (${icon.f})`);
  const pICon = await pixeles('icono-con'), pISin = await pixeles('icono-sin');
  v(pICon > pISin + 300, `icono con sombra tiene más píxeles que sin ella (${pICon} vs ${pISin})`);
  // --- imagen con transparencia: la sombra sigue la SILUETA (drop-shadow), no la caja ---
  const im = await css(await sel('img-con'));
  v(/drop-shadow/.test(im.f) && !hay(im.bs), `imagen sin caja -> drop-shadow (${im.f})`);
  const zCon = await pixeles('img-con', { zonaImg: true }), zSin = await pixeles('img-sin', { zonaImg: true });
  v(zSin === 0 && zCon > 100, `imagen transparente: la sombra cae dentro de su caja, alrededor del cuadrado opaco (con=${zCon}, sin=${zSin})`);
  // --- texto CON caja (fondo) -> box-shadow ---
  const tc = await css(await sel('texto-caja'));
  v(hay(tc.bs) && !hay(tc.ts) && !hay(tc.f), 'texto con fondo -> box-shadow (la técnica cambia sola con la caja)');

  // --- hover: reemplaza y vuelve ---
  async function hover(k, prop) {
    const s = await sel(k);
    await js('document.querySelector(arguments[0]).scrollIntoView({block:"center"})', s); await esperar(150);
    const leer = async () => (await css(s))[prop];
    await d.actions({ async: true }).move({ x: 2, y: 2 }).perform(); await esperar(500);
    const reposo = await leer();
    const el = await d.findElement(By.css(s));
    await d.actions({ async: true }).move({ origin: el }).perform(); await esperar(600);
    const sobre = await leer();
    await d.actions({ async: true }).move({ x: 2, y: 2 }).perform(); await esperar(600);
    return { reposo, sobre, vuelta: await leer(), tp: (await css(s)).tp };
  }
  let h = await hover('h-caja', 'bs');
  v(hay(h.reposo) && h.reposo.includes('0.22'), `lift en caja: reposo con su sombra (${h.reposo})`);
  v(h.sobre.includes('0.28') && !h.sobre.includes('0.22'), `lift en caja: la del efecto REEMPLAZA a la de reposo (${h.sobre})`);
  v(h.vuelta === h.reposo, 'lift en caja: al salir vuelve a la de reposo');
  v(h.tp.includes('box-shadow'), `transición suave: box-shadow en transition-property en reposo (${h.tp})`);
  h = await hover('h-texto', 'ts');
  v(h.reposo.includes('0.22') && h.sobre.includes('0.28') && !h.sobre.includes('0.22') && h.vuelta === h.reposo, `lift en texto: text-shadow reemplazada y restaurada (${h.reposo} -> ${h.sobre})`);
  h = await hover('h-icono', 'f');
  v(h.reposo.includes('0.22') && h.sobre.includes('0.28') && !h.sobre.includes('0.22') && h.vuelta === h.reposo, `lift en icono: drop-shadow reemplazada y restaurada`);
  h = await hover('h-glow', 'bs');
  v(h.reposo.includes('0.15') && h.sobre.includes('255, 0, 0') && !h.sobre.includes('0.15') && h.vuelta === h.reposo, `glow en caja: reemplaza y restaura (${h.sobre})`);
  h = await hover('h-bright', 'f');
  v(/drop-shadow/.test(h.sobre) && /brightness/.test(h.sobre) && h.vuelta === h.reposo, `bright en icono: conserva la sombra y suma el brillo (${h.sobre})`);

  // --- móvil: el @media la quita o la cambia ---
  await d.manage().window().setRect({ width: 500, height: 900 }); await esperar(400);
  const mq = await css(await sel('m-quitar')), mc = await css(await sel('m-cambiar'));
  v(!hay(mq.bs), `móvil: 'none' quita la sombra de escritorio (${mq.bs})`);
  v(mc.bs.includes('0.3') && !mc.bs.includes('0.22'), `móvil: la sombra cambia a la de móvil (${mc.bs})`);
  const movilExport = { quitar: mq.bs, cambiar: mc.bs };
  await d.manage().window().setRect({ width: 1200, height: 900 }); await esperar(400);
  const eq = await css(await sel('m-quitar')), ec = await css(await sel('m-cambiar'));
  v(hay(eq.bs) && ec.bs.includes('0.22'), 'escritorio: la sombra base sigue ahí');

  const exVals = {}; // lo que calcula el export (se compara luego con el lienzo del editor)
  for (const k of ['caja-media', 'texto-con', 'icono-con', 'img-con', 'texto-caja']) exVals[k] = await css(await sel(k));

  // --- captura de los presets (página de muestra) ---
  const muestra = n('page', { name: 'Presets', content: { title: 'Presets de sombra' } });
  const fila = n('container', { name: 'fila' }); fila.styles.base = { display: 'flex', gap: '40px', padding: '50px', background: '#ffffff', alignItems: 'center', flexWrap: 'wrap' };
  for (const p of PRESETS_SOMBRA) {
    const col = n('container', { name: p.txt }); col.styles.base = { display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' };
    const caja = mk('container', 'c', { ...CAJA, ...(p.val ? { sombra: p.val } : {}) });
    const txt = mk('heading', 't', { fontSize: '28px', color: '#222222', ...(p.val ? { sombra: p.val } : {}) }, { content: { text: p.txt, level: 3 } });
    const ico = mk('icon', 'i', { width: '48px', color: '#222222', ...(p.val ? { sombra: p.val } : {}) }, { content: { name: 'star' } });
    col.children.push(caja, txt, ico); fila.children.push(col);
  }
  muestra.children.push(n('section', { name: 'S', children: [fila] }));
  writeFileSync('tests/out/sombra-presets.html', exportHTML(muestra));
  await d.manage().window().setRect({ width: 1100, height: 520 });
  await d.get(pathToFileURL(resolve('tests/out/sombra-presets.html')).href); await esperar(500);
  writeFileSync('docs/capturas-inspector/sombra-presets.png', await d.takeScreenshot(), 'base64');
  await d.manage().window().setRect({ width: 1200, height: 900 });

  // ================= Parte 3: el editor (lienzo, inspector, Vista previa) =================
  const LS = 'editor-landings:pagina';
  const urlEd = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(urlEd);
  await js(`localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(urlEd); await esperar(800);
  const liEd = (k) => `#preview [data-id="${ids[k]}"]`;
  const cssEd = (k) => css(liEd(k));
  for (const k of ['caja-media', 'texto-con', 'icono-con', 'img-con', 'texto-caja']) {
    const ed = await cssEd(k); const ex = exVals[k];
    v(ed.bs === ex.bs && ed.ts === ex.ts && ed.f === ex.f, `${k}: lienzo del editor = export (bs=${ed.bs} ts=${ed.ts} f=${ed.f})`);
  }
  // hover en el lienzo del editor también reemplaza
  {
    await js('document.querySelector(arguments[0]).scrollIntoView({block:"center"})', liEd('h-caja')); await esperar(150);
    const el = await d.findElement(By.css(liEd('h-caja')));
    await d.actions({ async: true }).move({ origin: el }).perform(); await esperar(600);
    const s = (await cssEd('h-caja')).bs;
    v(s.includes('0.28') && !s.includes('0.22'), `editor: el hover reemplaza la sombra de reposo (${s})`);
    await d.actions({ async: true }).move({ x: 2, y: 2 }).perform(); await esperar(600);
    v((await cssEd('h-caja')).bs.includes('0.22'), 'editor: al salir vuelve a la de reposo');
  }
  // vista móvil del editor
  await js('document.querySelector("#vista-mobile").click()'); await esperar(500);
  v(!hay((await cssEd('m-quitar')).bs), 'editor (móvil): la sombra se quita con el override de móvil');
  v((await cssEd('m-cambiar')).bs === movilExport.cambiar, `editor (móvil) = export en móvil (${(await cssEd('m-cambiar')).bs})`);
  await js('document.querySelector("#vista-desktop").click()'); await esperar(400);

  // Vista previa (iframe con el export real)
  await js('document.querySelector("#btn-vista-previa").click()');
  for (let i = 0; i < 30 && !(await js('const f=document.querySelector("#vp-frame"); return !!f && f.classList.contains("listo")')); i++) await esperar(150);
  await esperar(500);
  await d.switchTo().frame(await d.findElement(By.css('#vp-frame')));
  const vp = await js(`const el=[...document.querySelectorAll('div')].find(e=>e.offsetWidth===140&&e.offsetHeight===70&&getComputedStyle(e).boxShadow!=='none');return el?getComputedStyle(el).boxShadow:null`);
  v(vp && vp.includes('0.15'), `Vista previa: la caja trae su sombra (${vp})`);
  await d.switchTo().defaultContent();
  await js('document.querySelector("#btn-vista-previa").click()'); await esperar(300);
  await d.get(urlEd); await esperar(800);

  // Inspector: presets, Personalizada, números, móvil
  const lee = async (k, modo = 'base') => js(`const p=JSON.parse(localStorage.getItem('${LS}'));let r;const w=(n)=>{if(n.id==='${ids[k]}')r=n;n.children.forEach(w)};w(p);return r.styles['${modo}'].sombra`);
  const ver = async (k) => { await js('document.querySelector(arguments[0]).scrollIntoView({block:"center"});document.querySelector(arguments[0]).dispatchEvent(new MouseEvent("click",{bubbles:true}))', liEd(k)); await esperar(400); };
  const btn = (val) => `#inspector [data-ctl="sombra"][data-val="${val}"]`;
  await ver('caja-sin');
  v(await js('return !!document.querySelector(\'#inspector [data-ctl="sombra"]\')'), 'inspector: aparece el campo Sombra con sus presets');
  const nombres = await js('return [...document.querySelectorAll(\'#inspector [data-ctl="sombra"]:not(.quitar)\')].map(b=>b.textContent)');
  v(['Ninguna', 'Suave', 'Media', 'Elevada', 'Contorno'].every((x) => nombres.includes(x)), `inspector: presets ${nombres.join(' · ')}`);
  v(await js('return !!document.querySelector(\'#inspector details.nivel[data-nivel="estilo"] [data-ctl="sombra"]\')'), 'inspector: Sombra vive en el acordeón Estilo');
  for (const k of ['suave', 'media', 'elevada', 'contorno']) {
    await js('document.querySelector(arguments[0]).click()', btn(P[k])); await esperar(450);
    v((await lee('caja-sin')) === P[k], `inspector: preset ${k} escribe su valor`);
    v(await js('return !!document.querySelector(\'#inspector [data-sombra-ed]\')'), `inspector: con ${k} salen los números y el color`);
  }
  await js('document.querySelector(\'#inspector [data-sh="blur"]\').value="33";document.querySelector(\'#inspector [data-sh="blur"]\').dispatchEvent(new Event("input",{bubbles:true}))'); await esperar(350);
  v(/^0px 0px 33px 2px #7c5cff$/.test(await lee('caja-sin')), `inspector: cambiar el desfoque reescribe la sombra (${await lee('caja-sin')})`);
  await js('document.querySelector(\'#inspector [data-sh="alfa"]\').value="40";document.querySelector(\'#inspector [data-sh="alfa"]\').dispatchEvent(new Event("input",{bubbles:true}))'); await esperar(350);
  v(/rgba\(124,92,255,0\.4\)$/.test(await lee('caja-sin')), `inspector: la opacidad del color (${await lee('caja-sin')})`);
  await js('document.querySelector(arguments[0]).click()', '#inspector button.quitar[data-ctl="sombra"]'); await esperar(450);
  v((await lee('caja-sin')) == null, `inspector: quitar borra la sombra (${await lee('caja-sin')})`);
  await js('document.querySelector("[data-sh-custom]").click()'); await esperar(450);
  v(/^0px 4px 14px 0px rgba\(0,0,0,0\.25\)$/.test(await lee('caja-sin')) || (await lee('caja-sin')) === '0 4px 14px 0 rgba(0,0,0,0.25)', `inspector: Personalizada parte de un valor sano (${await lee('caja-sin')})`);
  // texto sin caja: no ofrece "Expansión" salvo en el contorno
  await ver('texto-sin');
  await js('document.querySelector(arguments[0]).click()', btn(P.media)); await esperar(450);
  v(!(await js('return !!document.querySelector(\'#inspector [data-sh="spread"]\')')), 'inspector: en texto sin caja no hay "Expansión" (no aplica)');
  await ver('caja-sin');
  // móvil: Ninguna escribe 'none' solo en mobile; quitar = igual que escritorio
  await js('document.querySelector(arguments[0]).click()', btn(P.media)); await esperar(450);
  await js('document.querySelector("#vista-mobile").click()'); await esperar(500);
  await js('document.querySelector(arguments[0]).click()', btn('none')); await esperar(450);
  v((await lee('caja-sin', 'mobile')) === 'none' && (await lee('caja-sin')) === P.media, "inspector (móvil): Ninguna escribe 'none' solo en mobile");
  v(!hay((await cssEd('caja-sin')).bs), 'lienzo (móvil): la sombra desaparece');
  await js('document.querySelector(arguments[0]).click()', '#inspector button.quitar[data-ctl="sombra"]'); await esperar(450);
  v((await lee('caja-sin', 'mobile')) == null && hay((await cssEd('caja-sin')).bs), 'inspector (móvil): "igual que escritorio" borra el override');
  await js('document.querySelector("#vista-desktop").click()'); await esperar(400);
  // captura del inspector con la sombra elegida
  await ver('caja-sin');
  await js('document.querySelector(arguments[0]).click()', btn(P.elevada)); await esperar(450);
  await js('document.querySelector(\'#inspector [data-sh="x"]\')?.scrollIntoView({block:"center"})'); await esperar(200);
  writeFileSync('docs/capturas-inspector/sombra-inspector.png', await (await d.findElement(By.css('#inspector'))).takeScreenshot(), 'base64');
} finally { await d.quit(); }
console.log(`\n${ok} comprobaciones OK`);
