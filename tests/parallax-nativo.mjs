// Parallax NATIVO (animation-timeline: view()) y su respaldo (motor JS), en Firefox real (Selenium, perfil temporal).
// Ejecutar: node tests/parallax-nativo.mjs
// Comprueba: (a) CSS.supports, (b) animation-timeline aplicado y SIN listener de scroll ni --sp del motor,
// (c) el translate cambia con el scroll y sigue la misma fórmula que el motor, (d) aviso "scroll-linked positioning
// effect" en la consola (con control: el respaldo forzado SÍ debería darlo; si no, la prueba no es concluyente),
// (e) respaldo forzado (CSS.supports y @supports apagados): el motor sigue funcionando y da lo mismo que el nativo.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { Builder } from 'selenium-webdriver';
import LogInspector from 'selenium-webdriver/bidi/logInspector.js';
import { createNode as n } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const out = join(dirname(fileURLToPath(import.meta.url)), 'out');
mkdirSync(out, { recursive: true });
const A = 100, ALTO_EL = 200, T = 1500; // recorrido, alto del elemento y su posición en el documento
const sec = (h, hijos = []) => n('section', { name: 'S', styles: { padding: '0', height: h + 'px' }, children: hijos });
const el = n('heading', { name: 'PAR', content: { text: 'PAR', level: 2 }, styles: { margin: '0', height: ALTO_EL + 'px', background: '#fecaca' } });
el.animation = { parallax: { effect: 'y', amount: A } };
const p = n('page', { name: 'P' });
p.children.push(sec(T, []), sec(ALTO_EL, [el]), sec(2500, []));
const html = exportHTML(p);

// Espía (antes del script de la página): cuenta listeners de scroll y observaciones del IntersectionObserver
const ESPIA = '<script>window.__scroll=0;window.__io=0;const _a=EventTarget.prototype.addEventListener;EventTarget.prototype.addEventListener=function(t,...r){if(t==="scroll")window.__scroll++;return _a.call(this,t,...r)};const _I=window.IntersectionObserver;window.IntersectionObserver=class extends _I{observe(e){window.__io++;return super.observe(e)}};</script>';
const conEspia = (h) => h.replace('<head>', '<head>' + ESPIA);
// Respaldo forzado: la parte CSS cree que no hay soporte y CSS.supports también
const FALSO = '<script>const _s=CSS.supports.bind(CSS);CSS.supports=(...a)=>/animation-timeline/.test(a[0])?false:_s(...a);</script>';
const forzado = (h) => conEspia(h).replaceAll('animation-timeline:view()', 'animation-timeline:vista-inexistente()').replace('<head>', '<head>' + FALSO);
writeFileSync(join(out, 'par-nativo.html'), conEspia(html));
writeFileSync(join(out, 'par-respaldo.html'), forzado(html));

const driver = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox().enableBidi()).build();
let fallos = 0;
const ok = (c, m) => { if (c) console.log('  ✔', m); else { console.log('  ✘', m); fallos++; } };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  await driver.manage().window().setRect({ width: 900, height: 700 });
  for (let i = 0; i < 3; i++) {
    const [w, h] = await driver.executeScript('return [innerWidth, innerHeight]');
    if (w === 900 && h === 600) break;
    const r = await driver.manage().window().getRect();
    await driver.manage().window().setRect({ width: r.width + (900 - w), height: r.height + (600 - h) });
  }
  const vh = await driver.executeScript('return innerHeight');
  console.log('Firefox', (await driver.getCapabilities()).get('browserVersion'), '· alto de ventana', vh);

  const avisos = [];
  const log = await LogInspector(driver);
  await log.onConsoleEntry((e) => avisos.push(String(e.text)));
  await log.onJavascriptLog((e) => avisos.push(String(e.text)));

  const esperado = (y) => A * (2 * ((vh - (T - y)) / (vh + ALTO_EL)) - 1);
  const buscar = "const e=[...document.querySelectorAll('h2')].find(h=>h.textContent==='PAR');";
  const medir = async (archivo) => {
    avisos.length = 0;
    await driver.get(pathToFileURL(join(out, archivo)).href); await esperar(500);
    const r = {};
    r.supports = await driver.executeScript("return CSS.supports('animation-timeline','view()')");
    r.cs = await driver.executeScript(buscar + "const c=getComputedStyle(e);return {tl:c.animationTimeline,name:c.animationName,wc:c.willChange,sp:e.style.getPropertyValue('--sp'),attrs:[...e.attributes].map(a=>a.name).join(' ')}");
    r.cls = await driver.executeScript('return document.documentElement.className');
    r.listeners = await driver.executeScript('return [window.__scroll, window.__io]');
    r.t = [];
    for (const y of [T - vh + 50, T - vh / 2, T - 100, T + ALTO_EL - 50]) { // de "asoma" a "casi sale"
      await driver.executeScript('window.scrollTo(0,arguments[0])', y); await esperar(500);
      const v = await driver.executeScript(buscar + 'return getComputedStyle(e).translate');
      r.t.push({ y, v: parseFloat(v.split(' ')[1] ?? '0') });
    }
    r.avisos = avisos.filter((x) => /scroll-linked/i.test(x));
    return r;
  };

  console.log('\nNATIVO');
  const a = await medir('par-nativo.html');
  console.log('  atributos:', a.cs.attrs, '· animation-timeline:', a.cs.tl, '· class html:', JSON.stringify(a.cls), '· listeners scroll/IO:', a.listeners.join('/'));
  ok(a.supports === true, '(a) CSS.supports("animation-timeline","view()") es true');
  ok(/view/.test(a.cs.tl), '(b) animation-timeline aplicado: ' + a.cs.tl);
  ok(a.listeners[0] === 0 && a.listeners[1] === 0, '(b) el motor no registró listener de scroll ni IntersectionObserver');
  ok(a.cs.sp === '' && !/\bsc\b/.test(a.cls), '(b) el motor no escribió --sp ni puso .sc');
  ok(a.cs.wc === 'auto', '(5) sin will-change: ' + a.cs.wc);
  console.log('  translateY por scroll:', a.t.map((x) => `${x.y | 0}→${x.v.toFixed(1)} (esp ${esperado(x.y).toFixed(1)})`).join(' · '));
  ok(a.t.every((x, i) => i === 0 || x.v > a.t[i - 1].v), '(c) el translate crece al hacer scroll');
  ok(a.t.every((x) => Math.abs(x.v - esperado(x.y)) < 3), '(c) coincide con la fórmula del motor (±3 px)');
  ok(a.avisos.length === 0, '(d) sin aviso "scroll-linked positioning effect" (mensajes de consola leídos con BiDi)');

  console.log('\nRESPALDO FORZADO (sin soporte simulado)');
  const b = await medir('par-respaldo.html');
  console.log('  atributos:', b.cs.attrs, '· animation-timeline:', b.cs.tl, '· class html:', JSON.stringify(b.cls), '· listeners scroll/IO:', b.listeners.join('/'));
  console.log('  translateY por scroll:', b.t.map((x) => `${x.y | 0}→${x.v.toFixed(1)}`).join(' · '));
  ok(b.supports === false, '(e) CSS.supports simulado = false');
  ok(b.cs.tl === 'auto' && b.cs.name === 'none', '(e) sin animación nativa en el respaldo');
  ok(b.listeners[0] >= 1 && b.listeners[1] >= 1 && /\bsc\b/.test(b.cls), '(e) el motor sí registró listener e IntersectionObserver y puso .sc');
  ok(b.t.every((x) => Math.abs(x.v - esperado(x.y)) < 3), '(e) el motor mueve el elemento con la misma fórmula');
  ok(a.t.every((x, i) => Math.abs(x.v - b.t[i].v) < 3), '(e) nativo y respaldo dan el mismo resultado (±3 px)');
  console.log('  (d-control) avisos "scroll-linked" que da el respaldo:', b.avisos.length, b.avisos.length ? '→ la comprobación (d) del nativo es válida' : '→ (d) NO es concluyente: la consola no lo mostró ni en el respaldo');
} finally {
  await driver.quit();
}

// (4) "Reducir movimiento" real (Firefox con ui.prefersReducedMotion=1): ni animación nativa ni motor; el elemento queda en su sitio
console.log('\nREDUCIR MOVIMIENTO');
const d2 = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox().setPreference('ui.prefersReducedMotion', 1)).build();
try {
  await d2.manage().window().setRect({ width: 900, height: 700 });
  await d2.get(pathToFileURL(join(out, 'par-nativo.html')).href); await esperar(400);
  await d2.executeScript('window.scrollTo(0,1000)'); await esperar(500);
  const r = await d2.executeScript("const e=[...document.querySelectorAll('h2')].find(h=>h.textContent==='PAR');const c=getComputedStyle(e);return [matchMedia('(prefers-reduced-motion:reduce)').matches,c.animationName,c.translate]");
  ok(r[0] === true && r[1] === 'none' && /^(none|0px)/.test(r[2]), '(4) con reducir movimiento: sin animación y sin translate (' + r.join(' | ') + ')');
} finally {
  await d2.quit();
}
console.log(fallos ? `\n${fallos} fallo(s)` : '\nTodo en verde');
process.exit(fallos ? 1 : 0);
