// Resaltado del acordeón activo del inspector (Contenido / Estilo / Movimiento), Firefox real sobre dist/editor.html.
//  - El acordeón ABIERTO tiene marcador (barra de acento a la izquierda, chevron girado, título más grueso y fondo distinto); el CERRADO no.
//  - El marcador NO depende solo del color: la barra (existe/no existe), el chevron (otra transformación) y el peso del título cambian.
//  - Con un campo enfocado dentro, ese acordeón queda marcado "en uso" (etiqueta de texto); los demás no.
//  - Contraste (WCAG 2.1): texto del título ≥ 4,5:1 (criterio 1.4.3, nivel AA) en abierto y en cerrado; barra y chevron ≥ 3:1 frente al
//    fondo del panel (criterio 1.4.11, componentes de interfaz). Usar el color como único medio queda descartado por el 1.4.1.
//  - Lo abierto se recuerda entre sesiones (y lo guardado con los nombres viejos Esencial/Avanzado se migra).
// Ejecutar: npm run build && node tests/inspector-acordeon.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder, By } from 'selenium-webdriver';
import { createNode as n, walk } from '../src/core/tree.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
const LS = 'editor-landings:pagina', LSN = 'editor-landings:niveles';
const pagina = n('page', { name: 'Página', content: { title: 'Mi página' } });
pagina.children.push(n('section', { name: 'Sec', styles: { padding: '10px' }, children: [n('container', { name: 'Cont' }), n('button', { name: 'Btn', content: { text: 'Pulsa', href: '#' } })] }));

// ---- contraste WCAG 2.1 (luminancia relativa y razón, fórmulas del criterio 1.4.3) ----
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const razon = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const rgb = (s) => s.match(/[\d.]+/g).slice(0, 3).map(Number);

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1400, height: 1100 });
  const url = pathToFileURL(resolve('dist/editor.html')).href;
  await d.get(url);
  await d.executeScript(`localStorage.removeItem('${LSN}'); localStorage.setItem('${LS}', arguments[0])`, JSON.stringify(pagina));
  await d.get(url); await esperar(800);
  let btn = null; walk(pagina, (x) => { if (x.name === 'Btn') btn = x; });
  const sel = async (id) => { await d.executeScript(`document.querySelector('#preview [data-id="${id}"]').dispatchEvent(new MouseEvent('click',{bubbles:true}))`, id); await esperar(200); };
  await sel(btn.id);

  // Datos visuales de un acordeón: lo que cambia entre abierto y cerrado
  const visual = (nivel) => d.executeScript(`
    const det = document.querySelector('#inspector details.nivel[data-nivel="'+arguments[0]+'"]');
    const sm = det.querySelector(':scope > summary');
    const cs = getComputedStyle(sm), dt = getComputedStyle(det), ch = getComputedStyle(sm, '::before'), pie = getComputedStyle(sm, '::after');
    // fondo efectivo: el primer ancestro con color no transparente
    let fondo = cs.backgroundColor, el = sm;
    while ((/rgba\\(.*, 0\\)|transparent/.test(fondo)) && el.parentElement) { el = el.parentElement; fondo = getComputedStyle(el).backgroundColor; }
    return { abierto: det.open, texto: cs.color, fondo, peso: cs.fontWeight, barra: dt.borderLeftColor, barraAncho: dt.borderLeftWidth, chevron: ch.transform, enUso: pie.content };`, nivel);
  const fondoPanel = await d.executeScript(`return getComputedStyle(document.querySelector('#inspector')).backgroundColor`);

  // 1) De fábrica: Estilo abierto y Movimiento cerrado (el botón no tiene acordeón Contenido: su texto y enlace van arriba)
  assert.equal(await d.executeScript(`return !!document.querySelector('#inspector details.nivel[data-nivel="contenido"]')`), false, 'un botón no tiene nada en Contenido: su texto y enlace van arriba');
  const ab = await visual('estilo'), ce = await visual('movimiento');
  assert.equal(ab.abierto, true); assert.equal(ce.abierto, false);

  // 2) El abierto tiene marcador; el cerrado no — y no solo por el color
  assert.notEqual(ab.barraAncho, '0px', 'abierto: barra de acento');
  assert.ok(/rgb\(/.test(ab.barra) && !/, 0\)/.test(ab.barra), 'abierto: barra con color visible');
  assert.ok(/, 0\)|rgba\(0, 0, 0, 0\)/.test(ce.barra), `cerrado: sin barra visible (${ce.barra})`);
  assert.notEqual(ab.chevron, ce.chevron, 'el chevron gira (otra forma, no solo otro color)');
  assert.ok(+ab.peso > +ce.peso, `el título abierto es más grueso (${ab.peso} vs ${ce.peso})`);
  assert.notEqual(ab.fondo, ce.fondo, 'el título abierto tiene otro fondo');
  assert.notEqual(ab.texto, ce.texto, 'el título abierto tiene otro color');

  // 3) Contraste WCAG: texto ≥ 4,5:1 (1.4.3) y barra/chevron ≥ 3:1 (1.4.11)
  const rAb = razon(rgb(ab.texto), rgb(ab.fondo)), rCe = razon(rgb(ce.texto), rgb(ce.fondo));
  const rBarra = razon(rgb(ab.barra), rgb(fondoPanel));
  console.log(`  contraste: título abierto ${rAb.toFixed(2)}:1 · cerrado ${rCe.toFixed(2)}:1 · barra ${rBarra.toFixed(2)}:1`);
  assert.ok(rAb >= 4.5, `texto abierto ${rAb}`); assert.ok(rCe >= 4.5, `texto cerrado ${rCe}`);
  assert.ok(rBarra >= 3, `barra vs fondo del panel ${rBarra}`);
  // el chevron usa currentColor (el color del título): mismo contraste que el texto, ya comprobado ≥ 4,5 ≥ 3

  // 4) Sin foco dentro: nadie está "en uso"
  await d.executeScript('document.activeElement && document.activeElement.blur()');
  assert.equal((await visual('estilo')).enUso, 'none', 'sin foco dentro, Estilo no está en uso');

  // 5) Foco en un campo de Estilo: Estilo "en uso"; Movimiento (cerrado) no
  const campo = await d.findElement(By.css('#inspector details.nivel[data-nivel="estilo"] [data-s="border"]'));
  await campo.click(); await esperar(120);
  const uso = await visual('estilo');
  assert.equal(uso.enUso, '"en uso"', `Estilo debe quedar "en uso" (${uso.enUso})`);
  assert.equal((await visual('movimiento')).enUso, 'none', 'Movimiento no está en uso');
  assert.notEqual(uso.barra, ab.barra, 'la barra "en uso" es más clara que la de abierto');
  assert.ok(razon(rgb(uso.barra), rgb(fondoPanel)) >= 3, 'barra en uso ≥ 3:1');

  // 6) Abrir Movimiento y enfocar un campo suyo: pasa a "en uso" y Estilo deja de estarlo
  await d.findElement(By.css('#inspector details.nivel[data-nivel="movimiento"] > summary')).click(); await esperar(150);
  await d.executeScript('document.querySelector("#inspector details.nivel[data-nivel=movimiento] select").focus()'); await esperar(150);
  assert.equal((await visual('movimiento')).enUso, '"en uso"', 'Movimiento "en uso" al enfocar su campo');
  assert.equal((await visual('estilo')).enUso, 'none', 'Estilo deja de estar en uso');

  // 7) Se recuerda lo abierto; los nombres viejos (Esencial/Avanzado) se migran
  assert.equal(await d.executeScript(`return localStorage.getItem('${LSN}')`), '{"contenido":true,"estilo":true,"movimiento":true}', 'lo abierto se guarda con los nombres nuevos');
  await d.executeScript(`localStorage.setItem('${LSN}','{"esencial":false,"estilo":true,"avanzado":true}')`);
  await d.get(url); await esperar(800); await sel(btn.id);
  const estados = await d.executeScript(`return [...document.querySelectorAll('#inspector details.nivel')].map(x=>x.dataset.nivel+':'+(x.open?1:0)).join(' ')`);
  assert.equal(estados, 'estilo:1 movimiento:1', 'lo guardado como esencial/avanzado se migra a contenido/movimiento');
  await sel((() => { let c = null; walk(pagina, (x) => { if (x.name === 'Cont') c = x; }); return c.id; })());
  assert.equal(await d.executeScript(`return [...document.querySelectorAll('#inspector details.nivel')].map(x=>x.dataset.nivel+':'+(x.open?1:0)).join(' ')`), 'contenido:0 estilo:1 movimiento:1', 'contenedor: Contenido (ancla) cerrado según lo migrado');

  console.log('OK resaltado del acordeón: abierto con barra, chevron girado, título grueso y fondo propio; cerrado sin nada; "en uso" con el foco dentro; contraste ≥ 4,5:1 (texto) y ≥ 3:1 (barra); se recuerda y migra lo guardado');
} finally { await d.quit(); }
