// Pruebas en Firefox REAL sobre el HTML exportado por el editor (ver tests/generar.mjs).
import { test, expect } from '@playwright/test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const out = join(dirname(fileURLToPath(import.meta.url)), 'out');
const abrir = async (page, nombre) => { await page.goto(pathToFileURL(join(out, nombre + '.html')).href); await page.waitForLoadState('load'); };
const irA = async (page, y) => { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(350); };
const rect = (page, texto) => page.getByText(texto, { exact: true }).evaluate((e) => { const r = e.getBoundingClientRect(); return { top: r.top, bottom: r.bottom }; });
const css = (page, texto, prop) => page.getByText(texto, { exact: true }).evaluate((e, p) => getComputedStyle(e)[p], prop);

test('sticky: pegado arriba y abajo dentro de su contenedor', async ({ page }) => {
  await abrir(page, 'sticky');
  const vh = page.viewportSize().height;
  await irA(page, 0);
  expect((await rect(page, 'PEGADO-ABAJO')).bottom).toBeCloseTo(vh - 20, 0); // abajo: ya pegado sin haber scrolleado
  await irA(page, 800);
  expect((await rect(page, 'PEGADO-ARRIBA')).top).toBeCloseTo(20, 0);
  expect((await rect(page, 'PEGADO-ABAJO')).bottom).toBeCloseTo(vh - 20, 0);
  await irA(page, 3100); // el contenedor termina: ya no se quedan pegados
  expect((await rect(page, 'PEGADO-ARRIBA')).top).toBeLessThan(20);
});

test('parallax: se mueve distinto al scroll (con scroll real)', async ({ page }) => {
  await abrir(page, 'scroll');
  expect(await page.evaluate(() => document.documentElement.className)).toContain('sc'); // el motor arrancó
  const t = [];
  for (const y of [800, 1300, 1900]) { await irA(page, y); await page.waitForTimeout(300); t.push(parseFloat((await css(page, 'PARALLAX', 'translate')).split(' ')[1] ?? '0')); }
  console.log('   parallax translateY a scroll 800/1300/1900:', t.map((v) => v.toFixed(1)).join(' / '));
  expect(t[0]).toBeLessThan(t[1]);
  expect(t[1]).toBeLessThan(t[2]);
  expect(t[0]).toBeLessThan(-80);
  expect(t[2]).toBeGreaterThan(40);
});

test('scroll-linked: opacidad y zoom ligados al scroll', async ({ page }) => {
  await abrir(page, 'scroll');
  await irA(page, 800); await page.waitForTimeout(300);
  const o0 = +(await css(page, 'LIGADO', 'opacity')); const z0 = +(await css(page, 'LIGADO-ZOOM', 'scale'));
  await irA(page, 1500); await page.waitForTimeout(400);
  const o1 = +(await css(page, 'LIGADO', 'opacity')); const z1 = +(await css(page, 'LIGADO-ZOOM', 'scale'));
  console.log(`   opacidad ${o0}→${o1}, zoom ${z0}→${z1}`);
  expect(o0).toBeLessThan(0.2); expect(o1).toBeGreaterThan(0.95);
  expect(z0).toBeLessThan(0.7); expect(z1).toBeGreaterThan(0.95);
});

test('press: mantener el clic aplica el estado', async ({ page }) => {
  await abrir(page, 'estados');
  const b = page.getByText('BTN-PRESS', { exact: true });
  const antes = await b.evaluate((e) => getComputedStyle(e).transform);
  await b.hover(); await page.mouse.down(); await page.waitForTimeout(400);
  const durante = await b.evaluate((e) => getComputedStyle(e).transform);
  await page.mouse.up(); await page.waitForTimeout(400);
  const despues = await b.evaluate((e) => getComputedStyle(e).transform);
  console.log(`   transform: ${antes} → ${durante} → ${despues}`);
  expect(antes).toBe('none');
  expect(durante).toContain('1.08');
  expect(despues).toBe('none');
});

test('focus: Tab muestra el anillo (:focus-visible)', async ({ page }) => {
  await abrir(page, 'estados');
  await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.waitForTimeout(400);
  const f = page.getByText('BTN-FOCUS', { exact: true });
  expect(await f.evaluate((e) => document.activeElement === e)).toBe(true);
  const o = await f.evaluate((e) => { const s = getComputedStyle(e); return `${s.outlineStyle} ${s.outlineColor}`; });
  console.log('   outline:', o);
  expect(o).toContain('solid'); expect(o).toContain('rgb(255, 0, 0)');
  // y NO se ve en el botón de al lado
  expect(await page.getByText('BTN-PRESS', { exact: true }).evaluate((e) => getComputedStyle(e).outlineColor)).not.toContain('rgb(255, 0, 0)');
});

test('estado por clic: alterna al hacer clic', async ({ page }) => {
  await abrir(page, 'estados');
  const b = page.getByText('BTN-CLIC', { exact: true });
  await b.click(); await page.waitForTimeout(500);
  expect(await b.evaluate((e) => e.classList.contains('on'))).toBe(true);
  expect(await b.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(0, 170, 0)');
  expect(await b.evaluate((e) => getComputedStyle(e).scale)).toBe('1.3');
  await b.click(); await page.waitForTimeout(500);
  expect(await b.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe('rgb(124, 92, 255)');
  expect(page.url()).not.toMatch(/#.+/); // el href="#" no navega
});

test('texto por línea (medida): re-mide al achicar la ventana', async ({ page }) => {
  await abrir(page, 'lineas');
  await page.waitForTimeout(400);
  const lineas = () => page.evaluate(() => new Set([...document.querySelectorAll('[data-lm] .w')].map((w) => w.style.getPropertyValue('--i'))).size);
  const real = () => page.evaluate(() => new Set([...document.querySelectorAll('[data-lm] .w')].map((w) => w.offsetTop)).size); // líneas visuales reales
  const a = [await lineas(), await real()];
  await page.setViewportSize({ width: 300, height: 600 }); await page.waitForTimeout(700);
  const b = [await lineas(), await real()];
  console.log(`   ancho 900: ${a[0]} grupos --i / ${a[1]} líneas reales · ancho 300: ${b[0]} / ${b[1]}`);
  expect(a[0]).toBe(a[1]); expect(b[0]).toBe(b[1]);
  expect(b[0]).toBeGreaterThan(a[0]);
});

test('escena por scroll: sticky + grid + pasos', async ({ page }) => {
  await abrir(page, 'escena');
  const d = await page.evaluate(() => {
    const ew = document.querySelector('[data-ew]'); const capa = ew.firstElementChild;
    return { vh: innerHeight, ewH: ew.offsetHeight, capaH: capa.offsetHeight, arr: ew.style.getPropertyValue('--arr'), nav: document.querySelector('[data-nav]').offsetHeight, grid: getComputedStyle(capa).display, sc: document.documentElement.className };
  });
  console.log('   ', JSON.stringify(d));
  expect(d.sc).toContain('sc'); expect(d.grid).toBe('grid');
  expect(d.ewH).toBe(3 * d.vh);
  expect(d.capaH).toBe(d.vh - d.nav);
  const top0 = await page.evaluate(() => { const e = document.querySelector('[data-ew]'); return e.getBoundingClientRect().top + scrollY; });
  const range = d.ewH - d.capaH;
  const res = [];
  for (const f of [0.05, 0.4, 0.6, 0.95]) {
    await irA(page, top0 - d.nav + range * f); await page.waitForTimeout(300);
    res.push(await page.evaluate(() => { const ew = document.querySelector('[data-ew]'); const c = ew.firstElementChild; return { ep: +(+ew.style.getPropertyValue('--ep')).toFixed(2), top: Math.round(c.getBoundingClientRect().top), op: [...c.children].map((k) => +(+getComputedStyle(k).opacity).toFixed(2)) }; }));
  }
  console.log('   ', JSON.stringify(res));
  res.forEach((r) => expect(r.top).toBe(d.nav)); // la capa queda pegada justo debajo del navbar
  expect(res[0].op).toEqual([1, 0, 0]);
  expect(res[1].op[1]).toBeGreaterThan(0); expect(res[1].op[0]).toBeGreaterThan(0); // fundido cruzado
  expect(res[2].op).toEqual([0, 1, 0]);
  expect(res[3].op[2]).toBeGreaterThan(0.8);
});
