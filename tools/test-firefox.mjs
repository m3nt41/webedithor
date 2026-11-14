// test:firefox — Playwright con salida corta. Si Playwright no puede LANZAR Firefox (entorno), se reporta "omitido"
// (código 0 aquí; en test:todo cuenta como omitido, no como fallo). Si fallan pruebas reales: código 1 y el detalle.
// Uso: node tools/test-firefox.mjs
import { spawnSync } from 'node:child_process';

const r = spawnSync('npx', ['playwright', 'test', '-c', 'tests/playwright.config.js'], {
  encoding: 'utf8', shell: true, timeout: 90000, maxBuffer: 20 * 1024 * 1024,
});
const salida = (r.stdout || '') + (r.stderr || '');
const noLanza = /spawn UNKNOWN|browserType\.launch|Executable doesn't exist|Failed to launch/i.test(salida);

if (r.status === 0) { console.log('test:firefox ok'); process.exit(0); }
if (noLanza) {
  console.log("test:firefox omitido: Playwright no puede lanzar Firefox en este equipo (entorno, no el código)");
  process.exit(3); // 3 = omitido (test:todo lo cuenta aparte)
}
console.log(salida.split('\n').slice(-60).join('\n')); // fallo real: detalle (últimas líneas)
process.exit(1);
