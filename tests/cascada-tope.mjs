// Cascada de la animación de texto con TOPE: la cascada TOTAL (retardo de la última pieza) no pasa de 2 s,
// sin importar cuántas letras tenga el texto; los textos cortos quedan igual que antes (retardo = i x cascada).
// Se mide en Firefox real con la API de animaciones (getComputedTiming): retardo y final de cada animación.
// Ejecutar: node tests/cascada-tope.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Builder } from 'selenium-webdriver';
import { createNode as n } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';
import { opcionesFirefox } from '../tools/lib-tests.mjs';

let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };
const TOPE = 2; // s: cascada total máxima
const LARGO = 'Las animaciones de texto parten cada palabra y cada letra en su propio elemento y por eso un párrafo largo cuesta mucho más que un título corto.';
const casos = [
  // id, texto, modo, cascada, retardo propio, ¿el tope debe actuar?
  ['c21', 'Waveform quickly jumped', 'chars', 0.06, 0, false],     // 22 letras: 21 saltos x .06 = 1,26 s (igual que antes)
  ['c34', 'x'.repeat(34), 'chars', 0.06, 0, false],                // 33 saltos x .06 = 1,98 s (justo bajo el tope)
  ['c40', 'x'.repeat(40), 'chars', 0.06, 0, true],                 // 39 x .06 = 2,34 s -> topado
  ['c150', LARGO, 'chars', 0.06, 0, true],
  ['c354', (LARGO + ' ').repeat(3), 'chars', 0.06, 0, true],       // antes 21,9 s
  ['c354r', (LARGO + ' ').repeat(3), 'chars', 0.06, 0.5, true],    // con retardo propio: el retardo se suma, el tope es de la cascada
  ['w3', 'Lo que hacemos', 'words', 0.06, 0, false],
  ['w200', 'palabra '.repeat(200), 'words', 0.06, 0, true],
  ['w5g', 'uno dos tres cuatro cinco', 'words', 0.3, 0, false],    // 4 saltos x .3 = 1,2 s (cascada grande elegida, sigue igual)
  ['l3', 'a\nb\nc', 'lines', 0.06, 0, false],
];
const pagina = n('page', { name: 'P', content: { title: 'Cascada' } });
const sec = n('section', { name: 'S' });
for (const [id, texto, modo, st, de] of casos) {
  const h = n('heading', { name: id, content: { text: texto, level: 2, anchor: id } });
  h.styles.base = { fontSize: '20px', maxWidth: '900px' };
  h.animation = { text: { mode: modo, effect: 'up', trigger: 'load', duration: 0.7, delay: de, stagger: st, ease: 'suave', distance: 30, angle: -90 } };
  sec.children.push(h);
}
pagina.children.push(sec);
mkdirSync('tmp-logs', { recursive: true });
writeFileSync('tmp-logs/cascada-tope.html', exportHTML(pagina));

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.get(pathToFileURL('tmp-logs/cascada-tope.html').href);
  await new Promise((r) => setTimeout(r, 600));
  const R = await d.executeScript(`const o={};document.querySelectorAll('h2[id]').forEach(h=>{
    const L=[...h.querySelectorAll('.w')].filter(w=>!w.classList.contains('ln')||true);
    const an=h.getAnimations({subtree:true}).map(a=>a.effect.getComputedTiming());
    const dl=an.map(t=>t.delay);o[h.id]={n:an.length,ultimoRetardo:Math.max(...dl),primero:Math.min(...dl),fin:Math.max(...an.map(t=>t.endTime))};});return o;`);
  console.log(JSON.stringify(R));
  for (const [id, , modo, st, de, topado] of casos) {
    const r = R[id] * 1 || R[id];
    const cascada = r.ultimoRetardo - de * 1000; // ms
    const esperadoSinTope = (r.n - 1) * st * 1000;
    if (!topado) {
      v(Math.abs(cascada - esperadoSinTope) < 1, `${id}: sin tope, cascada ${cascada.toFixed(0)} ms = ${(r.n - 1)} x ${st} s (igual que antes)`);
    } else {
      v(cascada <= TOPE * 1000 + 1, `${id}: cascada topada en ${cascada.toFixed(0)} ms (<= ${TOPE * 1000}; sin tope serían ${esperadoSinTope.toFixed(0)} ms), ${r.n} piezas`);
      v(cascada > TOPE * 1000 * 0.98, `${id}: aprovecha el tope (${cascada.toFixed(0)} ms ~ ${TOPE * 1000})`);
      v(r.fin <= (de + TOPE + 0.7) * 1000 + 2, `${id}: la entrada completa termina a los ${(r.fin / 1000).toFixed(2)} s (<= ${(de + TOPE + 0.7).toFixed(1)} s)`);
    }
    v(Math.abs(r.primero - de * 1000) < 1, `${id}: la primera pieza empieza en ${r.primero} ms (= retardo propio)`);
  }
  console.log(`\n${ok} comprobaciones OK`);
} finally { await d.quit(); }
