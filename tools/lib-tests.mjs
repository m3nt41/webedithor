// Piezas comunes de los runners de tests (las usan test-todo.mjs y test-cambios.mjs, para no duplicar código):
//   SUITE   = la lista oficial de tests, EN ORDEN (firefox al final). Añadir un test nuevo = una línea aquí.
//   correr  = build (una vez, opcional) + un test tras otro con timeout, sin reintentos, una línea por test y un resumen.
// test:firefox sale con código 3 cuando Playwright no puede lanzar Firefox: cuenta como "omitido", no como fallo.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import firefox from 'selenium-webdriver/firefox.js';

// DESCARGAS DE LOS TESTS: el Firefox de prueba guarda lo que "descarga" (el .html exportado) en tmp-tests/ del
// proyecto, NO en la carpeta Descargas del usuario. Un único sitio: todos los tests piden sus opciones aquí.
const RAIZ = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const DESCARGAS = join(RAIZ, 'tmp-tests');

/** Vacía tmp-tests/ (solo el CONTENIDO de esa carpeta; nunca toca nada fuera de ella). */
export function vaciarDescargas() {
  mkdirSync(DESCARGAS, { recursive: true });
  for (const f of readdirSync(DESCARGAS)) rmSync(join(DESCARGAS, f), { recursive: true, force: true });
}

/** Opciones de Firefox para los tests: headless + binario + descargas a tmp-tests/ sin preguntar. */
export function opcionesFirefox() {
  mkdirSync(DESCARGAS, { recursive: true });
  return new firefox.Options().addArguments('-headless')
    .setBinary(process.env.FIREFOX_BIN || 'C:/Program Files/Mozilla Firefox/firefox.exe')
    .setPreference('browser.download.folderList', 2)
    .setPreference('browser.download.dir', DESCARGAS)
    .setPreference('browser.download.useDownloadDir', true)
    .setPreference('browser.helperApps.neverAsk.saveToDisk', 'text/html');
}

export const s = (n) => (n / 1000).toFixed(1) + 's';

export const SUITE = [ // [nombre, comando, timeout en segundos]
  ['selenium', 'node --test --test-reporter=spec tests/selenium.test.mjs', 300],
  ['ronda7', 'node tests/ronda7.mjs', 120],
  ['parallax-nativo', 'node tests/parallax-nativo.mjs', 120],
  ['parallax-recorte', 'node tests/parallax-recorte.mjs', 120],
  ['hover', 'node tests/hover.mjs', 60],
  ['hover-texto', 'node tests/hover-texto.mjs', 120],
  ['hover-borde', 'node tests/hover-borde.mjs', 120],
  ['fuga-estilos', 'node tests/fuga-estilos.mjs', 120],
  ['controles', 'node tests/controles.mjs', 60],
  ['inspector', 'node tests/inspector.mjs', 180],
  ['vistaprevia', 'node tests/vista-previa.mjs', 180],
  ['inspector-niveles', 'node tests/inspector-niveles.mjs', 180],
  ['persistencia', 'node tests/inspector-persistencia.mjs', 180],
  ['fondo', 'node tests/fondo.mjs', 180],
  ['sidebar', 'node tests/sidebar-pestanas.mjs', 180],
  ['iconos', 'node tests/iconos.mjs', 180],
  ['tema', 'node tests/tema.mjs', 60],
  ['plan-ia', 'node tests/plan-ia.mjs', 60],
  ['plan-ia-ui', 'node tests/plan-ia-ui.mjs', 180],
  ['menu-movil', 'node tests/menu-movil.mjs', 240],
  ['menu-scroll', 'node tests/menu-scroll.mjs', 240],
  ['marquesina', 'node tests/marquesina.mjs', 60],
  ['marquesina-ui', 'node tests/marquesina-ui.mjs', 240],
  ['editor-file', 'node tests/editor-file.mjs', 120],
  ['firefox', 'node tools/test-firefox.mjs', 120],
];

export const ejecutar = (cmd, seg) => {
  const t = Date.now();
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', timeout: seg * 1000, maxBuffer: 50 * 1024 * 1024 });
  return { ms: Date.now() - t, status: r.status, timeout: r.error?.code === 'ETIMEDOUT', out: (r.stdout || '') + (r.stderr || '') };
};

/** Corre `lista` (entradas de SUITE) en orden. build: true = `npm run build` una vez antes. Imprime y termina el proceso con 0/1. */
export function correr(lista, { build = true } = {}) {
  const T0 = Date.now();
  vaciarDescargas(); // al empezar
  process.on('exit', vaciarDescargas); // y al terminar (aunque salga con fallo)
  if (build) {
    const b = ejecutar('npm run build', 180);
    if (b.status !== 0) { console.log('✘ build ' + s(b.ms) + '\n' + b.out.split('\n').slice(-40).join('\n')); process.exit(1); }
    console.log('✔ build (una vez) ' + s(b.ms));
  }
  let ok = 0, omitidos = 0; const fallos = [];
  for (const [n, cmd, seg] of lista) {
    const r = ejecutar(cmd, seg);
    if (r.status === 3 && n === 'firefox') { omitidos++; console.log('– ' + n + ' ' + s(r.ms) + '  ' + r.out.trim()); continue; }
    if (r.status === 0) { ok++; console.log('✔ ' + n + ' ' + s(r.ms)); continue; }
    fallos.push(n);
    console.log('✘ ' + n + ' ' + s(r.ms) + (r.timeout ? '  (TIMEOUT ' + seg + 's)' : '  (código ' + r.status + ')'));
    console.log(r.out.split('\n').slice(-40).map((l) => '    ' + l).join('\n'));
  }
  console.log('\nResumen: ' + ok + ' ok, ' + fallos.length + ' fallidos' + (fallos.length ? ' (' + fallos.join(', ') + ')' : '') + ', ' + omitidos + ' omitido(s) — ' + s(Date.now() - T0));
  process.exit(fallos.length ? 1 : 0);
}
