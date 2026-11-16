// "Por letras" al terminar la animación (guardia de regresión del punto A'): en un texto de UNA palabra ("Galería") y en uno de
// VARIAS ("Lo que hacemos") el final NO cambia el texto: el DOM no se sustituye, ningún ancho/posición de letra o palabra
// cambia al terminar, el espacio entre palabras es el mismo, no hay salto de línea nuevo y el texto terminado queda IDÉNTICO
// por píxeles a un título normal. Además el ancho del texto partido es igual al normal en las fuentes del editor (en estos
// textos no hay pares de kerning, así que el kerning (punto B) NO explica ningún temblor).
// Lo que NO se arregla aquí (otra tarea): al terminar cada letra Firefox la redibuja con otro antialiasing (centro de tinta ≈0,05–0,14 px).
// Ejecutar: node tests/texto-final-letras.mjs
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Builder } from 'selenium-webdriver';
import { opcionesFirefox } from '../tools/lib-tests.mjs';
import { PAG, medir } from '../tools/medir-final-letras.mjs';
import { FUENTE } from '../src/blocks/tema.js';

let ok = 0; const v = (c, m) => { assert.ok(c, m); ok++; console.log('OK   ' + m); };
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
mkdirSync('tmp-logs', { recursive: true });
const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox()).build();
try {
  await d.manage().window().setRect({ width: 1300, height: 900 });
  for (const [nombre, fuente] of [['fuente del exportador', undefined], ['fuente de títulos del tema', FUENTE.titulo], ['fuente de texto del tema', FUENTE.cuerpo]]) {
    const f = resolve('tmp-logs/final-letras.html'); writeFileSync(f, PAG(fuente ? { fontFamily: fuente } : {}));
    await d.get(pathToFileURL(f).href); await esperar(700);
    const R = await medir(d);
    for (const [id, r] of Object.entries(R)) {
      const t = `${id} (${nombre})`;
      v(r.anims >= 7, `${t}: la medición cogió ${r.anims} animaciones de letra`);
      v(r.mutacionesDeNodos === 0 && r.hijosAntes === r.hijosDespues, `${t}: el DOM de letras no se sustituye ni se toca (${r.hijosAntes} nodos antes y después, 0 cambios de nodos)`);
      v(r.difLetraRectMax < 0.02, `${t}: ninguna letra cambia de posición ni de ancho al terminar (${r.difLetraRectMax} px)`);
      v(r.palabras.every((p) => Math.abs(p.xA - p.xB) < 0.02 && Math.abs(p.anchoA - p.anchoB) < 0.02), `${t}: cada palabra conserva su x y su ancho (incluye el espacio entre palabras)`);
      v(Math.abs(r.anchoPartido - r.anchoNormal) < 0.01, `${t}: ancho del texto partido en letras = ancho del texto normal (${r.anchoPartido} vs ${r.anchoNormal}; sin pérdida de kerning en estos textos)`);
      v(r.lineas === 1, `${t}: una sola línea (sin salto de línea nuevo)`);
      v(r.B_vs_normal.px === 0, `${t}: el texto terminado es idéntico por píxeles a un título normal (${r.B_vs_normal.px} px distintos)`);
    }
  }
  console.log(`\n${ok} comprobaciones OK`);
} finally { await d.quit(); }
