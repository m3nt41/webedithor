// MEDICIÓN del redibujado al terminar "Por letras" / "Por palabras" (puntos A y D de la tarea del banco).
// Por cada caso (modo + efecto) y cada texto ("Galería" y "Lo que hacemos") compara por píxeles el ÚLTIMO MILISEGUNDO de la
// animación contra el estado final (píxeles distintos), en Firefox (Selenium, headless) a DPR 1 y 1,25.
// Reusa PAG()/medir() de medir-final-letras.mjs (mismo método que el test texto-final-letras).
// Ejecutar: node tools/medir-capas.mjs <etiqueta>      (p. ej. "antes" o "despues"; escribe tmp-logs/capas-<etiqueta>.json)
// Límite: Firefox headless pinta por software, sin compositor/GPU; lo que depende de capas de GPU solo se ve a ojo.
import { mkdirSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { Builder } from 'selenium-webdriver';
import { opcionesFirefox } from './lib-tests.mjs';
import { PAG, medir } from './medir-final-letras.mjs';

const etiqueta = process.argv[2] || 'medida';
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
// [id, modo, efecto]: up/down = el caso V10; fade/blur = controles que ya iban bien; el resto mueven con translate/scale/rotate
export const CASOS = [
  ['chars-up', 'chars', 'up'], ['words-up', 'words', 'up'], ['chars-down', 'chars', 'down'],
  ['chars-fade', 'chars', 'fade'], ['chars-blur', 'chars', 'blur'],
  ['chars-left', 'chars', 'left'], ['chars-zoom', 'chars', 'zoom'], ['chars-rotate', 'chars', 'rotate'], ['chars-flip', 'chars', 'flip'],
];
mkdirSync('tmp-logs', { recursive: true });
const salida = { etiqueta, dprs: {} };
for (const dpr of ['1', '1.25']) {
  const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox().setPreference('layout.css.devPixelsPerPx', dpr)).build();
  try {
    await d.manage().window().setRect({ width: 1300, height: 900 });
    salida.dprs[dpr] = {};
    for (const [id, mode, effect] of CASOS) {
      const f = resolve(`tmp-logs/capas-${id}.html`); writeFileSync(f, PAG({}, { mode, effect }));
      await d.get(pathToFileURL(f).href); await esperar(700);
      const real = await d.executeScript('return devicePixelRatio');
      const R = await medir(d);
      salida.dprs[dpr][id] = Object.fromEntries(Object.entries(R).map(([t, r]) => [t, { dpr: real, anims: r.anims, ultimoMsVsFinal: r.A_vs_B.px, difMax: r.A_vs_B.max, finalVsNormal: r.B_vs_normal.px, nodos: `${r.hijosAntes}->${r.hijosDespues}` }]));
      console.log(`dpr ${real} ${id.padEnd(13)}`, Object.entries(salida.dprs[dpr][id]).map(([t, r]) => `${t}: ${r.ultimoMsVsFinal} px (anims ${r.anims}, final=normal ${r.finalVsNormal === 0 ? 'sí' : r.finalVsNormal + ' px'})`).join(' | '));
    }
  } finally { await d.quit(); }
}
writeFileSync(`tmp-logs/capas-${etiqueta}.json`, JSON.stringify(salida, null, 1));
console.log(`Guardado tmp-logs/capas-${etiqueta}.json`);
