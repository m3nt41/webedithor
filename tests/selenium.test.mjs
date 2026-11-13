// Pruebas en tu Firefox REAL (el instalado) con Selenium + geckodriver, sobre el HTML exportado por el editor.
// Ejecutar: npm run test:selenium
// Perfil: geckodriver crea un perfil NUEVO y temporal en cada arranque y lo borra al cerrar; nunca se usa tu perfil normal.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { Builder, By, Key } from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox.js';
import './generar.mjs'; // genera tests/out/*.html con el código actual del editor

const out = join(dirname(fileURLToPath(import.meta.url)), 'out');
const FIREFOX = process.env.FIREFOX_BIN || 'C:\\Program Files\\Mozilla Firefox\\firefox.exe';
let driver;

before(async () => {
  const opts = new firefox.Options().addArguments('-headless').setBinary(FIREFOX); // sin -profile: perfil temporal limpio
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
