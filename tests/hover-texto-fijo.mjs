// Hover "Texto fijo" en Agrandar, Encoger e Inclinar (técnica (b) del banco: el fondo y el borde se mueven en un ::before y el texto no se transforma).
//  1) CSS (sin navegador): reglas del ::before, lo de siempre sin el interruptor, valor inválido ignorado, sin fondo ni borde -> no emite nada,
//     imagen se salta, móvil en @media (export) y en el lienzo móvil, JSON (se conserva 'si', se descarta lo raro), Copiar/pegar.
//  2) Firefox con ratón real, en el export (archivo) y en el lienzo del editor (dist): el texto no cambia de ancho ni de sitio, la caja tampoco,
//     el nodo no lleva transform, el ::before sí (scale 1.03 / .97 / rotate -1deg), en reposo se ve IGUAL que sin efecto (píxeles), en hover el color
//     sobresale (Agrandar) y respeta border-radius; la sombra del botón se queda. Control negativo: sin "Texto fijo" el texto SÍ cambia de ancho.
//  3) Inspector: el interruptor sale solo en Agrandar/Encoger/Inclinar (y no en imágenes), por defecto No, se guarda, se deshace; el aviso de Firefox
//     de Agrandar se muestra solo con No; el aviso "Necesita fondo o borde" sale solo con Sí y un botón sin fondo ni borde.
// Ejecutar: npm run build && node tests/hover-texto-fijo.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Builder, By, Key } from 'selenium-webdriver';
import { createNode as n, normalizePage, walk } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { cssPagina } from '../src/animations/index.js';
import { efectosParaNodo } from '../src/animations/copiar.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';
import { leerPng } from '../tools/png.mjs';

let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('tmp-logs', { recursive: true });

const ROJO = '#ff0000';
const CAJA = { display: 'inline-block', padding: '28px 90px', fontSize: '18px', background: ROJO, color: '#111111', border: '2px solid #00aa00', borderRadius: '24px', margin: '40px' };
const boton = (id, hover, base = CAJA, extra = {}) => {
  const b = n('button', { name: id, content: { text: 'Ver más', href: '#', anchor: id } });
  b.styles.base = { ...base };
  b.animation = { hover: { duration: 0.2, ease: 'suave', ...hover }, ...extra };
  return b;
};
const crea = (hijos) => { const p = n('page', { name: 'P', content: { title: 'T' } }); const s = n('section', { name: 'S' }); s.styles.base = { padding: '40px', background: '#ffffff' }; s.children.push(...hijos); p.children.push(s); return p; };
const cssDe = (p) => exportHTML(p).match(/<style>([\s\S]*?)<\/style>/)[1];
const EF = { grow: 'scale(1.03)', shrink: 'scale(.97)', tilt: 'rotate(-1deg)' };

// ---------- 1) CSS (sin navegador) ----------
if (!process.env.SOLO_NAV) { // SOLO_NAV=1 salta esta parte (para comprobar que la parte del navegador también falla sin el cambio)
  for (const [ef, tf] of Object.entries(EF)) {
    const css = cssDe(crea([boton('x', { effect: ef, textoFijo: 'si' })]));
    v(/\.n\d+\{position:relative;isolation:isolate;background:transparent!important;border-color:transparent!important\}/.test(css), `${ef}: el nodo queda transparente a la fuerza (!important, el lienzo lleva el fondo inline) y aislado`);
    v(css.includes(`:hover::before{transform:${tf}}`), `${ef}: en hover solo se mueve el ::before (${tf})`);
    v(/::before\{content:'';position:absolute;border-radius:inherit;z-index:-1;pointer-events:none;transition:transform 0\.2s [^;]*;background:#ff0000;border:2px solid #00aa00;top:-2px;right:-2px;bottom:-2px;left:-2px\}/.test(css), `${ef}: el ::before copia fondo y borde, hereda el border-radius y sale -2px (el ancho del borde)`);
    v(!/\.n\d+:hover\{[^}]*(transform|scale|rotate)/.test(css) && !/::after/.test(css) && !/will-change|filter:/.test(css), `${ef}: el nodo no lleva transform en hover, ni ::after de zona, ni will-change ni filter`);
  }
  // sin el interruptor, o con 'no': exactamente lo de siempre
  const viejo = cssDe(crea([boton('x', { effect: 'grow' })]));
  v(/\.n\d+:hover\{[^}]*transform:scale\(1\.03\)/.test(viejo) && !/::before/.test(viejo), 'sin el interruptor (páginas guardadas): Agrandar sigue escalando el nodo entero');
  v(cssDe(crea([boton('x', { effect: 'grow', textoFijo: 'no' })])) === viejo, "con 'no': CSS idéntico al de siempre");
  for (const raro of ['<script>', 'SI', 1, true, '', null, { a: 1 }]) {
    const css = cssDe(crea([boton('x', { effect: 'grow', textoFijo: raro })]));
    v(css === viejo, `valor raro (${JSON.stringify(raro)}): se ignora y queda lo de siempre`);
  }
  // otros efectos no cambian aunque lleven textoFijo
  const lift = cssDe(crea([boton('x', { effect: 'lift', textoFijo: 'si' })]));
  v(lift === cssDe(crea([boton('x', { effect: 'lift' })])), 'Elevar ignora el interruptor (no se tocó)');
  // sin fondo ni borde: no emite nada del efecto
  const libre = cssDe(crea([boton('x', { effect: 'grow', textoFijo: 'si' }, { padding: '16px 32px', margin: '40px', color: '#111' })]));
  v(!/::before|scale\(1\.03\)|isolation/.test(libre), 'sin fondo ni borde: no emite ni ::before ni scale (el efecto no hace nada, el texto no se toca)');
  const sombraSola = cssDe(crea([boton('x', { effect: 'grow', textoFijo: 'si' }, { padding: '16px 32px', boxShadow: '0 4px 8px rgba(0,0,0,.3)' })]));
  v(!/::before/.test(sombraSola), 'una sombra sola no cuenta como caja (no hay nada que mover)');
  const trans = cssDe(crea([boton('x', { effect: 'grow', textoFijo: 'si' }, { padding: '16px 32px', background: 'transparent', border: '0' })]));
  v(!/::before/.test(trans), 'fondo transparente y border 0: tampoco cuenta');
  // solo borde
  const soloBorde = cssDe(crea([boton('x', { effect: 'grow', textoFijo: 'si' }, { padding: '16px 32px', border: '3px solid #111' })]));
  v(/::before\{[^}]*border:3px solid #111;top:-3px/.test(soloBorde) && !/::before\{[^}]*background:/.test(soloBorde), 'solo borde: el ::before lleva el borde (y no inventa fondo)');
  // imagen
  const img = n('image', { name: 'img', content: { src: 'https://example.com/a.png', alt: 'a' } }); img.animation = { hover: { effect: 'grow', textoFijo: 'si' } };
  const cssImg = cssDe(crea([img]));
  v(!/::before/.test(cssImg) && /transform:scale\(1\.03\)/.test(cssImg), 'imagen: sin ::before; se queda con el Agrandar de siempre');
  // móvil
  const m = boton('m', { effect: 'shrink', textoFijo: 'si' }); m.styles.mobile = { background: '#0000ff' };
  const cssM = cssDe(crea([m]));
  v(/@media \(max-width:768px\)\{\.n\d+::before\{display:block;background:#0000ff;/.test(cssM), 'export: si el móvil cambia el fondo, el ::before lo cambia en un @media (768 px)');
  const pm = crea([m]); const idM = pm.children[0].children[0].id;
  v(/background:#0000ff/.test(cssPagina(pm, { viewMode: 'mobile' })) && !/@media/.test(cssPagina(pm, { viewMode: 'mobile' })), 'lienzo móvil: usa el fondo móvil sin @media');
  v(/background:#ff0000/.test(cssPagina(pm, { viewMode: 'desktop' })), 'lienzo escritorio: usa el fondo de escritorio');
  void idM;
  // imagen de fondo del editor (fondoImagen) y degradado: se copian al ::before
  const fi = boton('fi', { effect: 'grow', textoFijo: 'si' }, { padding: '20px', fondoImagen: 'https://example.com/f.jpg', fondoCapa: 40 });
  v(/::before\{[^}]*background-image:linear-gradient\(rgba\(0,0,0,0\.4\)[^}]*url\("https:\/\/example\.com\/f\.jpg"\)/.test(cssDe(crea([fi]))), 'la imagen de fondo del editor (con capa oscura) se copia al ::before');
  // seguridad: un valor peligroso en el fondo NO llega al ::before
  const mal = boton('mal', { effect: 'grow', textoFijo: 'si' }, { padding: '20px', background: 'red;}</style><script>alert(1)</script>', border: '1px solid #000' });
  const cssMal = cssDe(crea([mal]));
  v(!/<script|alert\(|<\/style>/.test(cssMal) && /::before\{[^}]*border:1px solid #000/.test(cssMal), 'seguridad: un fondo con código no pasa al ::before (el borde bueno sí)');
  // JSON
  const ida = JSON.parse(JSON.stringify(crea([boton('j', { effect: 'tilt', textoFijo: 'si' })])));
  let hv; walk(normalizePage(ida), (x) => { if (x.name === 'j') hv = x.animation?.hover; });
  v(hv?.effect === 'tilt' && hv.textoFijo === 'si', "el JSON conserva textoFijo:'si' al importar");
  const mala = JSON.parse(JSON.stringify(crea([boton('j', { effect: 'tilt', textoFijo: '<img onerror=x>' })])));
  walk(normalizePage(mala), (x) => { if (x.name === 'j') hv = x.animation?.hover; });
  v(hv?.effect === 'tilt' && hv.textoFijo === undefined, 'un valor raro se descarta al importar (el hover se conserva)');
  // Copiar/pegar
  const orig = boton('o', { effect: 'shrink', textoFijo: 'si' }); const dest = n('button', { name: 'd', content: { text: 'D', href: '#' } }); dest.styles.base = { background: '#fff' };
  const r = efectosParaNodo(JSON.parse(JSON.stringify(orig.animation)), dest, null);
  v(r.anim?.hover?.textoFijo === 'si' && !r.omitidos.length, 'Copiar/pegar efectos lleva el interruptor');
}

// ---------- 2) Firefox: ratón real en el export y en el lienzo ----------
const mover = (d, el) => d.actions({ async: true }).move({ origin: el }).perform();
const fuera = (d) => d.actions({ async: true }).move({ x: 3, y: 3 }).perform();
const medida = (d, sel) => d.executeScript(`const e=document.querySelector(arguments[0]);const r=e.getBoundingClientRect();const g=document.createRange();g.selectNodeContents(e);const t=g.getBoundingClientRect();
  const cs=getComputedStyle(e),b=getComputedStyle(e,'::before');
  return {caja:[r.left,r.top,r.width,r.height].map(x=>+x.toFixed(3)),texto:[t.left,t.top,t.width,t.height].map(x=>+x.toFixed(3)),
    nodoTransform:cs.transform,nodoScale:cs.scale,nodoRotate:cs.rotate,nodoFilter:cs.filter,nodoWill:cs.willChange,sombra:cs.boxShadow,
    bTransform:b.transform,bContent:b.content}`, sel);
const comp = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 0.01);
const roj = (p) => p[0] > 200 && p[1] < 80 && p[2] < 80;
const mat = (s) => { const m = /matrix\(([^)]+)\)/.exec(s || ''); return m ? m[1].split(',').map(Number) : null; };

async function probar(d, etiqueta, S) {
  const k = await d.executeScript('return devicePixelRatio');
  for (const [ef, tf] of Object.entries(EF)) {
    const sel = S[ef], selV = S[ef + 'Viejo'];
    const el = await d.findElement(By.css(sel));
    await d.executeScript('document.documentElement.style.scrollBehavior="auto";arguments[0].scrollIntoView({block:"center",behavior:"instant"})', el); await esperar(300);
    await fuera(d); await esperar(500);
    const r0 = await medida(d, sel);
    const R = await d.executeScript(`const r=arguments[0].getBoundingClientRect();return [Math.floor(r.left),Math.floor(r.top),Math.ceil(r.width),Math.ceil(r.height)]`, el);
    const cap0 = await d.takeScreenshot();
    await mover(d, el); await esperar(700);
    const r1 = await medida(d, sel); const cap1 = await d.takeScreenshot();
    // el ::before se mueve; el nodo y el texto no
    const mb = mat(r1.bTransform);
    const buscado = ef === 'grow' ? [1.03, 0, 0, 1.03] : ef === 'shrink' ? [0.97, 0, 0, 0.97] : [Math.cos(-Math.PI / 180), Math.sin(-Math.PI / 180), -Math.sin(-Math.PI / 180), Math.cos(-Math.PI / 180)];
    v(mb && buscado.every((x, i) => Math.abs(mb[i] - x) < 0.001), `${etiqueta} ${ef}: en hover el ::before lleva ${tf} (${r1.bTransform})`);
    v(r0.bTransform === 'none', `${etiqueta} ${ef}: en reposo el ::before no está transformado`);
    v(r1.nodoTransform === 'none' && r1.nodoScale === 'none' && r1.nodoRotate === 'none' && r1.nodoFilter === 'none' && r1.nodoWill === 'auto', `${etiqueta} ${ef}: el botón y su texto no llevan transform, scale, rotate, filter ni will-change`);
    v(comp(r0.texto, r1.texto), `${etiqueta} ${ef}: el texto no cambia de ancho ni de sitio en hover (${r0.texto.join(', ')})`);
    v(comp(r0.caja, r1.caja), `${etiqueta} ${ef}: la caja del botón tampoco (${r0.caja.join(', ')})`);
    // por píxeles
    const A = leerPng(cap0), B = leerPng(cap1);
    const px = (P, x, y) => P.px(Math.round(x * k), Math.round(y * k));
    const [x0, y0, w, h] = R;
    v(roj(px(A, x0 + w / 2, y0 + 8)) && roj(px(B, x0 + w / 2, y0 + 8)), `${etiqueta} ${ef}: el fondo rojo se ve en reposo y en hover (el nodo transparente no lo borra)`);
    // esquina redondeada (radio 24): el píxel pegado a la esquina no es rojo ni en reposo ni en hover
    v(!roj(px(A, x0 + 2, y0 + 2)) && !roj(px(B, x0 + 2, y0 + 2)), `${etiqueta} ${ef}: respeta el border-radius (la esquina no se pinta)`);
    if (ef === 'grow') {
      // 3 % de ~290 px = ~4 px por lado: fuera del borde de reposo ahora hay color (verde del borde o rojo)
      const fx = x0 - 3, fy = y0 + h / 2; const col = (p) => !(p[0] > 240 && p[1] > 240 && p[2] > 240); // algo que no es el blanco de la página
      v(!col(px(A, fx, fy)) && col(px(B, fx, fy)), `${etiqueta} grow: por píxeles, el botón crece hacia afuera en hover (a 3 px del borde de reposo solo hay color con el hover)`);
    }
    // reposo = igual que el MISMO botón con el fondo y el borde puestos a la manera de siempre (se apaga el ::before con un <style> y se pinta en el nodo):
    // misma posición exacta, así que las esquinas redondeadas y el texto se comparan sin ruido de subpíxeles
    await d.executeScript('arguments[0].scrollIntoView({block:"center",behavior:"instant"})', el); await esperar(250); await fuera(d); await esperar(500);
    const R2 = await d.executeScript(`const r=arguments[0].getBoundingClientRect();return [Math.floor(r.left),Math.floor(r.top),Math.ceil(r.width),Math.ceil(r.height)]`, el);
    const C = leerPng(await d.takeScreenshot());
    await d.executeScript(`const s=document.createElement('style');s.id='apagar-fijo';s.textContent=arguments[0]+'{background:${ROJO}!important;border-color:#00aa00!important}'+arguments[0]+'::before{display:none!important}';document.head.appendChild(s)`, sel); await esperar(300);
    const Cn = leerPng(await d.takeScreenshot());
    await d.executeScript(`document.getElementById('apagar-fijo').remove()`); await esperar(200);
    let dif = 0, tot = 0;
    for (let yy = 0; yy < R2[3]; yy++) for (let xx = 0; xx < R2[2]; xx++) { tot++; const a = px(C, R2[0] + xx, R2[1] + yy), b = px(Cn, R2[0] + xx, R2[1] + yy); if (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) > 40) dif++; }
    v(dif / tot < 0.002, `${etiqueta} ${ef}: en reposo se ve igual que con el fondo y el borde puestos a la manera de siempre (${dif} de ${tot} píxeles distintos, esquinas redondeadas incluidas)`);
    // control negativo: SIN Texto fijo el texto SÍ cambia (Agrandar/Encoger) o gira (Inclinar mueve la caja de texto)
    const ev = await d.findElement(By.css(selV));
    const v0 = await medida(d, selV); await mover(d, ev); await esperar(700); const v1 = await medida(d, selV);
    v(!comp(v0.texto, v1.texto), `${etiqueta} ${ef}: control negativo: sin Texto fijo el texto SÍ cambia (${v0.texto.map((x) => +x.toFixed(2)).join(', ')} -> ${v1.texto.map((x) => +x.toFixed(2)).join(', ')})`);
    await fuera(d); await esperar(600);
    const r2 = await medida(d, sel);
    v(r2.bTransform === 'none' && comp(r0.caja, r2.caja), `${etiqueta} ${ef}: al salir vuelve a reposo`);
  }
  // convivencia: sombra del botón se queda, no se mueve ni desaparece con el hover; el texto sigue fijo con otro estado de press
  const sel = S.sombra; const el = await d.findElement(By.css(sel));
  await d.executeScript('arguments[0].scrollIntoView({block:"center",behavior:"instant"})', el); await esperar(250); await fuera(d); await esperar(400);
  const s0 = await medida(d, sel); await mover(d, el); await esperar(700); const s1 = await medida(d, sel);
  v(s0.sombra !== 'none' && s0.sombra === s1.sombra, `${etiqueta}: la sombra del botón se queda igual en hover (${s0.sombra})`);
  v(comp(s0.texto, s1.texto) && mat(s1.bTransform) && Math.abs(mat(s1.bTransform)[0] - 1.03) < 0.001, `${etiqueta}: con sombra (y un efecto «Al presionar» configurado) el texto sigue fijo y el fondo crece en hover`);
  await fuera(d); await esperar(500);
}

const mk = (id, ef, fijo, extra = {}) => boton(id, { effect: ef, ...(fijo ? { textoFijo: 'si' } : {}) }, CAJA, extra);
const conSombra = boton('sombra', { effect: 'grow', textoFijo: 'si' }, { ...CAJA, boxShadow: '0 6px 14px rgba(0,0,0,.35)' }, { press: { effect: 'shrink', duration: 0.12, ease: 'suave' } });
const pagina = crea([mk('grow', 'grow', true), mk('shrink', 'shrink', true), mk('tilt', 'tilt', true), mk('growViejo', 'grow', false), mk('shrinkViejo', 'shrink', false), mk('tiltViejo', 'tilt', false), conSombra]);
const S = (pref) => ({ grow: `${pref('grow')}`, shrink: `${pref('shrink')}`, tilt: `${pref('tilt')}`, growViejo: pref('growViejo'), shrinkViejo: pref('shrinkViejo'), tiltViejo: pref('tiltViejo'), sombra: pref('sombra') });

const f = resolve('tmp-logs/hover-texto-fijo.html'); writeFileSync(f, exportHTML(pagina));
let d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1400, height: 1000 });
  await d.get(pathToFileURL(f).href); await esperar(500);
  await probar(d, 'export', S((id) => '#' + id));
} finally { await d.quit(); }

// ---------- 3) Editor (dist): lienzo + inspector ----------
d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1600, height: 1000 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  const libre = n('button', { name: 'libre', content: { text: 'Libre', href: '#', anchor: 'libre' } }); libre.styles.base = { padding: '16px 32px', margin: '40px' };
  const lift = boton('lift', { effect: 'lift' });
  const imgN = n('image', { name: 'foto', content: { src: 'https://example.com/a.png', alt: 'a' } }); imgN.animation = { hover: { effect: 'grow' } };
  const base = crea([...pagina.children[0].children, libre, lift, imgN]);
  const ids = {}; walk(base, (x) => { ids[x.name] = x.id; });
  await d.get(url);
  await d.executeScript(`localStorage.setItem('editor-landings:niveles','{"contenido":true,"estilo":true,"movimiento":true}');localStorage.setItem('editor-landings:pagina', arguments[0])`, JSON.stringify(base));
  await d.get(url); await esperar(900);
  await probar(d, 'lienzo', S((id) => `#preview [data-id="${ids[id]}"]`));

  // Inspector
  const sel = async (id) => { await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`); await esperar(250); };
  const campo = () => d.executeScript(`const s=document.querySelector('#inspector select[data-a="hover.textoFijo"]');return s?{valor:s.value,opciones:[...s.options].map(o=>o.textContent),etiqueta:s.closest('.campo').querySelector('label').textContent}:null`);
  const notas = () => d.executeScript(`return [...document.querySelectorAll('#inspector p.modo')].map(p=>p.textContent.trim())`);
  await sel(ids.growViejo);
  let c = await campo();
  v(c && c.etiqueta === 'Texto fijo' && c.valor === 'no' && c.opciones.join('|') === 'No|Sí', `inspector: Agrandar sin el dato guardado muestra "Texto fijo" en No (${JSON.stringify(c)})`);
  let ns = await notas();
  v(ns.filter((t) => /Firefox/.test(t)).length === 1 && /Texto fijo/.test(ns.find((t) => /Firefox/.test(t))), 'inspector: con No sigue el aviso de Firefox, ahora sugiriendo «Texto fijo»');
  v(!ns.some((t) => /Necesita fondo o borde/.test(t)), 'inspector: con No no sale "Necesita fondo o borde"');
  await sel(ids.shrinkViejo); v(!!(await campo()), 'inspector: Encoger lo tiene');
  await sel(ids.tiltViejo); v(!!(await campo()), 'inspector: Inclinar lo tiene');
  await sel(ids.lift); v(!(await campo()), 'inspector: Elevar no lo tiene');
  await sel(ids.foto); v(!(await campo()), 'inspector: una imagen con Agrandar no lo tiene');
  // activarlo en un botón con caja
  await sel(ids.growViejo);
  await d.executeScript(`const s=document.querySelector('#inspector select[data-a="hover.textoFijo"]');s.value='si';s.dispatchEvent(new Event('input',{bubbles:true}))`); await esperar(500);
  const lee = async (nombre) => { const g = JSON.parse(await d.executeScript(`return localStorage.getItem('editor-landings:pagina')`)); let r; walk(g, (x) => { if (x.name === nombre) r = x; }); return r; };
  v((await lee('growViejo')).animation.hover.textoFijo === 'si', "inspector: elegir Sí guarda textoFijo:'si'");
  ns = await notas();
  v(!ns.some((t) => /Firefox/.test(t)) && !ns.some((t) => /Necesita fondo o borde/.test(t)), 'inspector: con Sí y con caja no sale ningún aviso');
  const css = await d.executeScript(`return [...document.querySelectorAll('style')].map(s=>s.textContent).join('\\n')`);
  v(css.includes(`.stage [data-id="${ids.growViejo}"]::before`) && css.includes(`.stage [data-id="${ids.growViejo}"]:hover::before{transform:scale(1.03)}`), 'lienzo: al elegir Sí el CSS del lienzo pasa al ::before');
  await d.executeScript(`document.body.focus()`);
  await d.actions({ async: true }).keyDown(Key.CONTROL).sendKeys('z').keyUp(Key.CONTROL).perform(); await esperar(700);
  v((await lee('growViejo')).animation.hover.textoFijo !== 'si', 'inspector: Ctrl+Z deshace el interruptor');
  // botón sin fondo ni borde: aviso
  await sel(ids.libre);
  await d.executeScript(`const s=document.querySelector('#inspector select[data-a="hover.effect"]');s.value='grow';s.dispatchEvent(new Event('input',{bubbles:true}))`); await esperar(500);
  await d.executeScript(`const s=document.querySelector('#inspector select[data-a="hover.textoFijo"]');s.value='si';s.dispatchEvent(new Event('input',{bubbles:true}))`); await esperar(500);
  ns = await notas();
  v(ns.filter((t) => /^Necesita fondo o borde/.test(t)).length === 1, 'inspector: Sí en un botón sin fondo ni borde muestra "Necesita fondo o borde"');
  // y no se rompe: el lienzo de ese botón no tiene ::before ni transform en hover, el texto no cambia
  const el = await d.findElement(By.css(`#preview [data-id="${ids.libre}"]`));
  await d.executeScript('arguments[0].scrollIntoView({block:"center",behavior:"instant"})', el); await esperar(250); await fuera(d); await esperar(400);
  const l0 = await medida(d, `#preview [data-id="${ids.libre}"]`); await mover(d, el); await esperar(700); const l1 = await medida(d, `#preview [data-id="${ids.libre}"]`);
  v(comp(l0.texto, l1.texto) && comp(l0.caja, l1.caja) && l1.nodoTransform === 'none' && l1.bContent === 'none', 'sin fondo ni borde: en hover no pasa nada (texto, caja y nodo quietos, sin ::before) y no hay errores');
  // al ponerle un fondo desde el inspector, el aviso desaparece y el efecto funciona
  await d.executeScript(`const i=document.querySelector('#inspector [data-s="background"]');if(i){i.value='#ff0000';i.dispatchEvent(new Event('input',{bubbles:true}))}`); await esperar(600);
  ns = await notas();
  v(!ns.some((t) => /Necesita fondo o borde/.test(t)), 'inspector: al ponerle fondo el aviso desaparece');
} finally { await d.quit(); }
console.log(`\n${ok} comprobaciones OK`);
