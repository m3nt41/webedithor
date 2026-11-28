// Genera docs/assets/demo.gif (el GIF del README): graba el HTML exportado de la landing de muestra
// (docs/demo-estrella.json) en Firefox real, cuadro a cuadro, y lo arma con ffmpeg (tiene que estar en el PATH).
//   node tools/gen-gif-readme.mjs
// El tiempo lo lleva este script: en cada cuadro pausa las animaciones y las avanza 1/FPS segundos, así el GIF
// sale fluido aunque cada captura tarde lo que tarde. Para cambiar el recorrido, edita GUION.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Builder } from 'selenium-webdriver';
import { opcionesFirefox } from './lib-tests.mjs';
import { normalizePage } from '../src/core/tree.js';
import { exportHTML } from '../src/export/exporter.js';

const FPS = 12;
const VISTA = { ancho: 1200, alto: 750 };
const ANCHO_GIF = 720;
const COLORES = 128;
const SALIDA = resolve('docs/assets/demo.gif');
// [segundos, hasta qué scroll en px]: cada tramo va con aceleración y frenado; repetir el mismo scroll = quieto
const GUION = [
  [2.2, 0], // portada entrando
  [1.2, 900], [0.9, 900], // cinta y manifiesto
  [0.7, 1560], [4.2, 3900], // la escena de "Proceso", paso a paso
  [1.0, 4640], [0.6, 4640], [1.8, 5600], // trabajos
  [1.2, 6180], [1.4, 6420], // palabras gigantes
];

const dir = mkdtempSync(join(tmpdir(), 'gif-webedithor-'));
const html = join(dir, 'demo.html');
writeFileSync(html, exportHTML(normalizePage(JSON.parse(readFileSync(resolve('docs/demo-estrella.json'), 'utf8')).page)));

const d = await new Builder().forBrowser('firefox').setFirefoxOptions(opcionesFirefox().setPreference('layout.css.devPixelsPerPx', '1.0')).build();
let n = 0;
try {
  await d.manage().window().setRect({ width: VISTA.ancho, height: VISTA.alto });
  const [dw, dh] = await d.executeScript('return [outerWidth - innerWidth, outerHeight - innerHeight]');
  await d.manage().window().setRect({ width: VISTA.ancho + dw, height: VISTA.alto + dh });
  await d.get(pathToFileURL(html).href);

  let desde = 0;
  for (const [segundos, hasta] of GUION) {
    const cuadros = Math.round(segundos * FPS);
    for (let i = 1; i <= cuadros; i++) {
      const p = i / cuadros;
      const suave = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
      await d.executeAsyncScript(`
        const [y, dt, listo] = arguments;
        scrollTo({ top: y, behavior: 'instant' });
        requestAnimationFrame(() => requestAnimationFrame(() => {
          window.__vistas ??= new WeakSet();
          for (const a of document.getAnimations()) {
            if (a.timeline !== document.timeline) continue; // las ligadas al scroll las mueve el propio scroll
            if (!window.__vistas.has(a)) { window.__vistas.add(a); a.pause(); a.currentTime = 0; continue; }
            if (a.playState === 'finished') continue;
            const fin = a.effect.getComputedTiming().endTime;
            const t = a.currentTime + dt;
            if (t >= fin) a.finish(); else a.currentTime = t;
          }
          requestAnimationFrame(() => listo());
        }));`, Math.round(desde + (hasta - desde) * suave), 1000 / FPS);
      writeFileSync(join(dir, `f${String(n++).padStart(4, '0')}.png`), await d.takeScreenshot(), 'base64');
    }
    desde = hasta;
  }
} finally {
  await d.quit();
}

mkdirSync(resolve('docs/assets'), { recursive: true });
const filtro = `scale=${ANCHO_GIF}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=${COLORES}:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle`;
const r = spawnSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', join(dir, 'f%04d.png'), '-vf', filtro, '-loop', '0', SALIDA], { encoding: 'utf8' });
if (r.status !== 0) { console.error(r.error?.message ?? r.stderr); process.exit(1); }
console.log(`docs/assets/demo.gif: ${n} cuadros, ${(n / FPS).toFixed(1)} s, ${(statSync(SALIDA).size / 1048576).toFixed(2)} MB`);
if (process.argv.includes('--dejar-cuadros')) console.log('cuadros en ' + dir);
else rmSync(dir, { recursive: true, force: true });
