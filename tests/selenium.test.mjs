// Pruebas en tu Firefox REAL (el instalado) con Selenium + geckodriver, sobre el HTML exportado por el editor.
// Ejecutar: npm run test:selenium
// Perfil: geckodriver crea un perfil NUEVO y temporal en cada arranque y lo borra al cerrar; nunca se usa tu perfil normal.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { Builder, By, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import './generar.mjs'; // genera tests/out/*.html con el código actual del editor
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), 'out');
const FIREFOX = process.env.FIREFOX_BIN || 'C:\\Program Files\\Mozilla Firefox\\firefox.exe';
let driver;

before(async () => {
  const opts = opcionesFirefox(); // sin -profile: perfil temporal limpio
  driver = await new Builder().forBrowser('firefox').setFirefoxOptions(opts).build();
  const caps = await driver.getCapabilities();
  console.log(`   Firefox ${caps.get('browserVersion')} · perfil temporal: ${caps.get('moz:profile')}`);
  await ventana(900, 600);
});
after(async () => { await driver?.quit(); });

// Deja el área visible (innerWidth × innerHeight) con el tamaño pedido.
async function ventana(w, h) {
  await driver.manage().window().setRect({ width: w, height: h + 100 });
  for (let i = 0; i < 3; i++) {
    const [iw, ih] = await driver.executeScript('return [innerWidth, innerHeight]');
    if (iw === w && ih === h) break;
    const r = await driver.manage().window().getRect();
    await driver.manage().window().setRect({ width: r.width + (w - iw), height: r.height + (h - ih) });
  }
}
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const abrir = async (nombre) => { await driver.get(pathToFileURL(join(out, nombre + '.html')).href); await esperar(400); };
const irA = async (y) => { await driver.executeScript('window.scrollTo(0, arguments[0])', y); await esperar(450); };
const el = (texto) => driver.findElement(By.xpath(`//*[normalize-space(text())='${texto}']`));
const css = (texto, prop) => el(texto).then((e) => driver.executeScript('return getComputedStyle(arguments[0])[arguments[1]]', e, prop));
const rect = (texto) => el(texto).then((e) => driver.executeScript('const r=arguments[0].getBoundingClientRect();return {top:r.top,bottom:r.bottom}', e));
const cerca = (a, b, tol = 1.5) => assert.ok(Math.abs(a - b) <= tol, `${a} no está cerca de ${b}`);
const opts = { timeout: 60000 };

test('sticky: pegado arriba y abajo dentro de su contenedor', opts, async () => {
  await abrir('sticky');
  const vh = await driver.executeScript('return innerHeight');
  await irA(0);
  cerca((await rect('PEGADO-ABAJO')).bottom, vh - 20);
  await irA(800);
  cerca((await rect('PEGADO-ARRIBA')).top, 20);
  cerca((await rect('PEGADO-ABAJO')).bottom, vh - 20);
  await irA(3100); // el contenedor termina: ya no se quedan pegados
  assert.ok((await rect('PEGADO-ARRIBA')).top < 20);
});

// Mide qué parte del recorrido de la escena (0..1) el hijo del medio está a opacidad 1 ("quieto"): se fija --ep a mano en 201 puntos
const quieto = () => driver.executeScript(`const ew=document.querySelector('[data-ew]'),mid=ew.firstElementChild.children[1];let n=0;
  for(let i=0;i<=200;i++){ew.style.setProperty('--ep',i/200);if(+getComputedStyle(mid).opacity>=0.999)n++}return n/201`);
test('escena: con Transición 40 el paso queda quieto más tramo que con 50 (1200px y 390px)', opts, async () => {
  for (const [w, h] of [[1200, 700], [390, 800]]) {
    await ventana(w, h);
    await abrir('escena-t40'); const q40 = await quieto();
    await abrir('escena-t50'); const q50 = await quieto();
    console.log(`    ${w}px: quieto con 40 = ${q40.toFixed(3)}, con 50 = ${q50.toFixed(3)}`);
    // hijo "inout" del paso 2 (3 pasos): quieto entre 1/3 + t/3 y 2/3 → (1-t)/3: 0.200 con t=40 y 0.167 con t=50
    cerca(q40, 0.2, 0.01); cerca(q50, 1 / 6, 0.01);
    assert.ok(q40 > q50, 'con 40 debe quedar quieto más tiempo que con 50');
  }
  await ventana(900, 600);
});

test('posición: sticky en escritorio (1200px) y Normal explícito en móvil (390px)', opts, async () => {
  await ventana(1200, 700);
  await abrir('posicion');
  assert.equal(await css('POS-MOVIL-NORMAL', 'position'), 'sticky');
  await irA(800);
  cerca((await rect('POS-MOVIL-NORMAL')).top, 10); // pegado a 10px del borde
  await ventana(390, 700);
  await abrir('posicion');
  assert.equal(await css('POS-MOVIL-NORMAL', 'position'), 'static');
  await irA(800);
  assert.ok((await rect('POS-MOVIL-NORMAL')).top < 0, 'en móvil se va con el scroll'); // ya no se queda pegado
  await ventana(900, 600);
});

test('parallax: se mueve distinto al scroll (con scroll real)', opts, async () => {
  await abrir('scroll');
  assert.match(await driver.executeScript('return document.documentElement.className'), /sc/); // el motor arrancó
  const t = [];
  for (const y of [800, 1300, 1900]) { await irA(y); await esperar(300); t.push(parseFloat(((await css('PARALLAX', 'translate')) ?? '').split(' ')[1] ?? '0')); }
  console.log('   parallax translateY a scroll 800/1300/1900:', t.map((v) => v.toFixed(1)).join(' / '));
  assert.ok(t[0] < t[1] && t[1] < t[2]);
  assert.ok(t[0] < -80 && t[2] > 40);
});

test('scroll-linked: opacidad y zoom ligados al scroll', opts, async () => {
  await abrir('scroll');
  await irA(800); await esperar(300);
  const o0 = +(await css('LIGADO', 'opacity')); const z0 = +(await css('LIGADO-ZOOM', 'scale'));
  await irA(1500); await esperar(400);
  const o1 = +(await css('LIGADO', 'opacity')); const z1 = +(await css('LIGADO-ZOOM', 'scale'));
  console.log(`   opacidad ${o0}→${o1}, zoom ${z0}→${z1}`);
  assert.ok(o0 < 0.2 && o1 > 0.95 && z0 < 0.7 && z1 > 0.95);
});

test('press: mantener el clic aplica el estado', opts, async () => {
  await abrir('estados');
  const b = await el('BTN-PRESS');
  const tr = () => driver.executeScript('return getComputedStyle(arguments[0]).transform', b);
  const antes = await tr();
  // objeto de acciones NUEVO en cada paso: reutilizarlo repite las pulsaciones anteriores
  await driver.actions({ async: true }).move({ origin: b }).press().perform(); await esperar(400);
  const durante = await tr();
  await driver.actions({ async: true }).release().perform(); await esperar(400);
  const despues = await tr();
  console.log(`   transform: ${antes} → ${durante} → ${despues}`);
  assert.equal(antes, 'none');
  assert.ok(durante.includes('1.08'), durante);
  assert.equal(despues, 'none');
});

test('focus: Tab muestra el anillo (:focus-visible)', opts, async () => {
  await abrir('estados');
  // Tab hasta que el foco llegue a BTN-FOCUS (máx. 5 pulsaciones), anotando el orden por el que pasa
  const orden = [];
  for (let i = 0; i < 5; i++) {
    await driver.actions({ async: true }).sendKeys(Key.TAB).perform(); await esperar(250);
    const t = await driver.executeScript('return document.activeElement.textContent.trim()');
    orden.push(t);
    if (t === 'BTN-FOCUS') break;
  }
  console.log('   orden del foco con Tab:', orden.join(' → '));
  await esperar(300);
  const f = await el('BTN-FOCUS');
  assert.equal(await driver.executeScript('return document.activeElement === arguments[0]', f), true, 'el Tab debía llegar a BTN-FOCUS');
  const o = await driver.executeScript('const s=getComputedStyle(arguments[0]);return s.outlineStyle+" "+s.outlineColor', f);
  console.log('   outline:', o);
  assert.ok(o.includes('solid') && o.includes('rgb(255, 0, 0)'), o);
  const otro = await css('BTN-PRESS', 'outlineColor');
  assert.ok(!otro.includes('rgb(255, 0, 0)'));
});

test('estado por clic: alterna al hacer clic', opts, async () => {
  await abrir('estados');
  const b = await el('BTN-CLIC');
  const est = () => driver.executeScript('const s=getComputedStyle(arguments[0]);return {on:arguments[0].classList.contains("on"),bg:s.backgroundColor,scale:s.scale}', b);
  await b.click(); await esperar(500);
  const on = await est();
  assert.deepEqual(on, { on: true, bg: 'rgb(0, 170, 0)', scale: '1.3' });
  await b.click(); await esperar(500);
  assert.equal((await est()).bg, 'rgb(124, 92, 255)');
  assert.ok(!/#.+/.test(await driver.getCurrentUrl())); // el href="#" no navega
});

test('texto por línea (medida): re-mide al achicar la ventana', opts, async () => {
  await abrir('lineas');
  await esperar(400);
  const cuenta = () => driver.executeScript(`const w=[...document.querySelectorAll('[data-lm] .w')];
    return [new Set(w.map((x)=>x.style.getPropertyValue('--i'))).size, new Set(w.map((x)=>x.offsetTop)).size]`);
  const a = await cuenta();
  await ventana(300, 600); await esperar(800);
  const b = await cuenta();
  console.log(`   ancho 900: ${a[0]} grupos --i / ${a[1]} líneas reales · ancho 300: ${b[0]} / ${b[1]}`);
  assert.equal(a[0], a[1]); assert.equal(b[0], b[1]); assert.ok(b[0] > a[0]);
  await ventana(900, 600);
});

test('escena por scroll: sticky + grid + pasos', opts, async () => {
  await abrir('escena');
  const d = await driver.executeScript(`const ew=document.querySelector('[data-ew]'),c=ew.firstElementChild;
    return {vh:innerHeight,ewH:ew.offsetHeight,capaH:c.offsetHeight,nav:document.querySelector('[data-nav]').offsetHeight,grid:getComputedStyle(c).display,sc:document.documentElement.className}`);
  console.log('   ', JSON.stringify(d));
  assert.match(d.sc, /sc/); assert.equal(d.grid, 'grid');
  assert.equal(d.ewH, 3 * d.vh); assert.equal(d.capaH, d.vh - d.nav);
  const top0 = await driver.executeScript('const e=document.querySelector("[data-ew]");return e.getBoundingClientRect().top+scrollY');
  const range = d.ewH - d.capaH;
  const res = [];
  for (const f of [0.05, 0.4, 0.6, 0.95]) {
    await irA(top0 - d.nav + range * f); await esperar(300);
    res.push(await driver.executeScript(`const ew=document.querySelector('[data-ew]'),c=ew.firstElementChild;
      return {ep:+(+ew.style.getPropertyValue('--ep')).toFixed(2),top:Math.round(c.getBoundingClientRect().top),op:[...c.children].map((k)=>+(+getComputedStyle(k).opacity).toFixed(2))}`));
  }
  console.log('   ', JSON.stringify(res));
  res.forEach((r) => assert.equal(r.top, d.nav)); // la capa queda pegada justo debajo del navbar
  assert.deepEqual(res[0].op, [1, 0, 0]);
  assert.ok(res[1].op[0] > 0 && res[1].op[1] > 0); // fundido cruzado
  assert.deepEqual(res[2].op, [0, 1, 0]);
  assert.ok(res[3].op[2] > 0.8);
});

test('parallax + estado hover en el mismo elemento: el scroll no se suaviza con transición', opts, async () => {
  await abrir('combo');
  const tp = await css('PARALLAX-HOVER', 'transitionProperty');
  assert.ok(!tp.split(',').map((x) => x.trim()).includes('translate'), tp);
  assert.ok(tp.includes('scale'), tp); // lo demás sí transiciona
  await irA(1100); await esperar(100); // sin esperar a ninguna transición: debe estar ya en su sitio
  const y = parseFloat(((await css('PARALLAX-HOVER', 'translate')) ?? '').split(' ')[1] ?? '0');
  await esperar(600);
  const y2 = parseFloat(((await css('PARALLAX-HOVER', 'translate')) ?? '').split(' ')[1] ?? '0');
  cerca(y, y2, 3);
});

// ---------- Scroll suave (Etapa 7, bloque 4) ----------
const rueda = async (dy, x = 450, y = 520) => { await driver.actions({ async: true }).scroll(x, y, 0, dy).perform(); };
const sy = () => driver.executeScript('return scrollY');
// Registra el defaultPrevented de cada golpe de rueda (el listener se añade DESPUÉS del script de la página, así lo ve ya decidido)
const espiarRueda = () => driver.executeScript('window.__w=[];addEventListener("wheel",(e)=>__w.push({p:e.defaultPrevented,m:e.deltaMode,dy:e.deltaY}))');
const golpes = () => driver.executeScript('return window.__w');
const internoRect = () => driver.executeScript('const e=[...document.querySelectorAll("div")].find(d=>getComputedStyle(d).overflowY==="auto");const b=e.getBoundingClientRect();return {x:Math.round(b.left+b.width/2),y:Math.round(b.top+b.height/2)}');

test('scroll suave: apagado no viaja el script; encendido sí', opts, async () => {
  const off = readFileSync(join(out, 'suave-off.html'), 'utf8'), on = readFileSync(join(out, 'suave.html'), 'utf8');
  assert.ok(!off.includes('scrollSuave') && !off.includes('wheel'));
  assert.ok(on.includes('scrollSuave') && on.includes('wheel'));
  await abrir('suave-off'); await espiarRueda(); await rueda(300); await esperar(600);
  assert.equal((await golpes()).some((g) => g.p), false); // sin interruptor nadie intercepta la rueda
});

test('scroll suave: la rueda se desliza con inercia y llega al destino', opts, async () => {
  await abrir('suave'); await espiarRueda(); await irA(0);
  await rueda(300);
  const lecturas = [];
  for (let i = 0; i < 10; i++) { lecturas.push(await sy()); await esperar(40); }
  await esperar(1500);
  const fin = await sy(), g = await golpes();
  console.log('   lecturas:', lecturas.map((v) => Math.round(v)).join(','), '→ final', Math.round(fin), '· golpes', JSON.stringify(g));
  assert.ok(g[0].p, 'la rueda de mouse se intercepta');
  assert.ok(lecturas.some((v) => v > 0 && v < fin - 5), 'pasa por valores intermedios (no salta de golpe)');
  assert.ok(fin > 100, `llegó lejos (${fin})`);
});

test('scroll suave: un scroll interno queda nativo', opts, async () => {
  await abrir('suave'); await espiarRueda(); await irA(0);
  const r = await internoRect();
  await driver.executeScript('window.__w.length=0');
  await rueda(100, r.x, r.y); await esperar(800);
  assert.equal((await golpes()).at(-1).p, false, 'sobre un scroll interno no se intercepta');
  assert.ok(await driver.executeScript('return [...document.querySelectorAll("div")].find(d=>getComputedStyle(d).overflowY==="auto").scrollTop') > 0, 'el contenedor interno se movió');
  assert.equal(await sy(), 0, 'la página no se movió');
});

test('scroll suave: el teclado cancela el deslizamiento', opts, async () => {
  await abrir('suave'); await irA(0);
  await rueda(800); await esperar(60);
  await driver.actions().sendKeys(Key.END).perform();
  await esperar(1200);
  const [y, max] = await driver.executeScript('return [scrollY, document.documentElement.scrollHeight-innerHeight]');
  cerca(y, max, 2); // quedó abajo del todo; el deslizamiento no lo devolvió a su destino
});

test('scroll suave: un ancla cancela y respeta el scroll-margin del navbar', opts, async () => {
  await abrir('suave'); await irA(0);
  await rueda(300); await esperar(80);
  await (await el('IR-FIN')).click();
  await esperar(1500);
  const top = await driver.executeScript('return document.getElementById("fin").getBoundingClientRect().top');
  cerca(top, 90, 2); // [id]{scroll-margin-top:90px}: la sección queda justo debajo del navbar y nada tira de vuelta
});

test('scroll suave: convive con parallax y sticky', opts, async () => {
  await abrir('suave'); await irA(0);
  assert.match(await driver.executeScript('return document.documentElement.className'), /sc/);
  for (let i = 0; i < 6; i++) await rueda(200);
  await esperar(1800);
  const y = await sy();
  const nav = await driver.executeScript('return document.querySelector("section").getBoundingClientRect().top');
  const t = parseFloat(((await css('PARALLAX-SUAVE', 'translate')) ?? '').split(' ')[1] ?? '0');
  console.log('   scrollY', Math.round(y), 'nav top', nav, 'parallax', t);
  assert.ok(y > 600); assert.equal(Math.round(nav), 0); // navbar sticky sigue pegado
  assert.ok(t !== 0, 'el parallax responde al scroll de la rueda');
});

test('scroll suave: convive con escenas por scroll', opts, async () => {
  await abrir('escena-suave');
  const d = await driver.executeScript('return {nav:document.querySelector("[data-nav]").offsetHeight,ew:document.querySelector("[data-ew]").getBoundingClientRect().top+scrollY}');
  await irA(Math.max(0, d.ew - d.nav + 10));
  for (let i = 0; i < 4; i++) await rueda(200);
  await esperar(1800);
  const r = await driver.executeScript('const ew=document.querySelector("[data-ew]");return {top:Math.round(ew.firstElementChild.getBoundingClientRect().top),ep:+(+ew.style.getPropertyValue("--ep"))}');
  console.log('   ', JSON.stringify(r));
  assert.equal(r.top, d.nav); assert.ok(r.ep > 0.05);
});

test('scroll suave: con "reducir movimiento" no intercepta (Firefox con ui.prefersReducedMotion=1)', opts, async () => {
  const o = opcionesFirefox();
  o.setPreference('ui.prefersReducedMotion', 1);
  const d2 = await new Builder().forBrowser('firefox').setFirefoxOptions(o).build();
  try {
    await d2.manage().window().setRect({ width: 900, height: 700 });
    await d2.get(pathToFileURL(join(out, 'suave.html')).href); await esperar(500);
    assert.equal(await d2.executeScript('return matchMedia("(prefers-reduced-motion:reduce)").matches'), true, 'el perfil de prueba sí emula reducir movimiento');
    await d2.executeScript('window.__w=[];addEventListener("wheel",(e)=>__w.push(e.defaultPrevented))');
    await d2.actions({ async: true }).scroll(450, 300, 0, 300).perform(); await esperar(800);
    assert.equal((await d2.executeScript('return __w')).some(Boolean), false);
  } finally { await d2.quit(); }
});

test('scroll suave (Lenis): termina en un valor estable y sin retroceder', opts, async () => {
  await abrir('suave'); await irA(0);
  await driver.executeScript(`window.__y=[];window.__r=true;const l=()=>{__y.push(scrollY);if(window.__r)requestAnimationFrame(l)};requestAnimationFrame(l)`);
  await rueda(300); await esperar(2500);
  const ys = await driver.executeScript('window.__r=false;return window.__y');
  const mov = ys.slice(ys.findIndex((v) => v > 0));
  const fin = mov.at(-1);
  console.log('   final', fin, '· últimos frames:', mov.slice(-8).map((v) => +v.toFixed(2)).join(','));
  for (let i = 1; i < mov.length; i++) assert.ok(mov[i] >= mov[i - 1] - 0.01, `retrocede en el frame ${i}: ${mov[i - 1]} → ${mov[i]}`);
  assert.ok(fin > 100, `llegó lejos (${fin})`);
  assert.ok(mov.slice(-10).every((v) => Math.abs(v - fin) < 0.01), 'los últimos frames están quietos (valor estable)');
});

// Proporción de los hijos (grid): mide el ancho/alto reales de cada foto en escritorio y en móvil
const razon = (id) => driver.executeScript('const r=document.querySelector(`img[alt="${arguments[0]}"]`).getBoundingClientRect();return r.width/r.height', id);
test('proporción de los hijos: fotos de tamaños distintos quedan parejas y la que tiene proporción propia mantiene la suya', opts, async () => {
  await ventana(1000, 700);
  await abrir('proporcion');
  for (const id of ['f1', 'f2', 'f3']) cerca(await razon(id), 1, 0.02); // 1 / 1 en escritorio
  cerca(await razon('f4'), 16 / 9, 0.02); // la suya propia
  assert.equal(await driver.executeScript('return getComputedStyle(document.querySelector(\'img[alt="f1"]\')).objectFit'), 'cover');
  await ventana(390, 700); // móvil: el override de la proporción (4 / 3) y una columna
  await abrir('proporcion');
  for (const id of ['f1', 'f2', 'f3']) cerca(await razon(id), 4 / 3, 0.02);
  cerca(await razon('f4'), 16 / 9, 0.02);
  await ventana(900, 600);
});
