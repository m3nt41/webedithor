// npm run test:todo — toda la suite en secuencia, salida compacta (una línea por test) y un resumen.
// Construye UNA sola vez (los tests de Firefox leen dist/editor.html) y llama a los scripts directamente,
// sin el `npm run build &&` que llevan algunos scripts de package.json. Sin reintentos automáticos.
// test:firefox va al final; si Playwright no puede lanzar Firefox cuenta como "omitido" (código 3), no como fallo.
import { spawnSync } from 'node:child_process';

const s = (n) => (n / 1000).toFixed(1) + 's';
const SUITE = [ // [nombre, comando, timeout en segundos]
  ['selenium', 'node --test --test-reporter=spec tests/selenium.test.mjs', 300],
  ['ronda7', 'node tests/ronda7.mjs', 120],
  ['controles', 'node tests/controles.mjs', 60],
  ['inspector', 'node tests/inspector.mjs', 180],
  ['vistaprevia', 'node tests/vista-previa.mjs', 180],
  ['persistencia', 'node tests/inspector-persistencia.mjs', 180],
  ['fondo', 'node tests/fondo.mjs', 180],
  ['sidebar', 'node tests/sidebar-pestanas.mjs', 180],
  ['iconos', 'node tests/iconos.mjs', 180],
  ['tema', 'node tests/tema.mjs', 60],
  ['plan-ia', 'node tests/plan-ia.mjs', 60],
  ['plan-ia-ui', 'node tests/plan-ia-ui.mjs', 180],
  ['menu-movil', 'node tests/menu-movil.mjs', 240],
  ['menu-scroll', 'node tests/menu-scroll.mjs', 240],
  ['editor-file', 'node tests/editor-file.mjs', 120],
  ['firefox', 'node tools/test-firefox.mjs', 120],
];
const ejecutar = (cmd, seg) => {
  const t = Date.now();
  const r = spawnSync(cmd, { shell: true, encoding: 'utf8', timeout: seg * 1000, maxBuffer: 50 * 1024 * 1024 });
  return { ms: Date.now() - t, status: r.status, timeout: r.error?.code === 'ETIMEDOUT', out: (r.stdout || '') + (r.stderr || '') };
};

const T0 = Date.now();
const b = ejecutar('npm run build', 180);
if (b.status !== 0) { console.log('✘ build ' + s(b.ms) + '\n' + b.out.split('\n').slice(-40).join('\n')); process.exit(1); }
console.log('✔ build (una vez) ' + s(b.ms));

let ok = 0, omitidos = 0; const fallos = [];
for (const [n, cmd, seg] of SUITE) {
  const r = ejecutar(cmd, seg);
  if (r.status === 3 && n === 'firefox') { omitidos++; console.log('– ' + n + ' ' + s(r.ms) + '  ' + r.out.trim()); continue; }
  if (r.status === 0) { ok++; console.log('✔ ' + n + ' ' + s(r.ms)); continue; }
  fallos.push(n);
  console.log('✘ ' + n + ' ' + s(r.ms) + (r.timeout ? '  (TIMEOUT ' + seg + 's)' : '  (código ' + r.status + ')'));
  console.log(r.out.split('\n').slice(-40).map((l) => '    ' + l).join('\n'));
}
console.log('\nResumen: ' + ok + ' ok, ' + fallos.length + ' fallidos' + (fallos.length ? ' (' + fallos.join(', ') + ')' : '') + ', ' + omitidos + ' omitido(s) — ' + s(Date.now() - T0));
process.exit(fallos.length ? 1 : 0);
