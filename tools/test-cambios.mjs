// npm run test:cambios — corre SOLO los tests relacionados con lo que cambió (para mini-etapas).
// Archivos cambiados = `git diff --name-only HEAD` + los sin seguimiento (`git ls-files --others --exclude-standard`).
// El criterio vive en tools/mapa-tests.mjs. Primero se imprime qué cambió y qué se va a correr.
//
// Reglas:
//   - Nada cambiado                    -> lo dice y sale.
//   - Solo docs / PROGRESS / CLAUDE... -> no corre nada.
//   - Archivo de src/ fuera del mapa   -> suite completa (lo dice en una línea). Igual si es compartido (TODOS)
//                                         o es un archivo de la raíz (package.json, vite.config.js...).
//   - tests/<x>.mjs cambiado           -> corre ese test; tools/ según el mapa.
// Opciones (para probar el mapa sin tocar archivos):
//   --archivos=a,b   usa esa lista en vez de git      --ver   solo muestra el criterio, no corre nada
import { spawnSync } from 'node:child_process';
import { SUITE, correr } from './lib-tests.mjs';
import { MAPA, TODOS, esSoloDocs } from './mapa-tests.mjs';

const args = process.argv.slice(2);
const ver = args.includes('--ver');
const forzados = args.find((a) => a.startsWith('--archivos='))?.slice(11);

const git = (a) => spawnSync('git', a, { encoding: 'utf8' }).stdout.split('\n').map((l) => l.trim().replace(/\\/g, '/')).filter(Boolean);
const cambiados = forzados != null
  ? forzados.split(',').map((x) => x.trim()).filter(Boolean)
  : [...new Set([...git(['diff', '--name-only', 'HEAD']), ...git(['ls-files', '--others', '--exclude-standard'])])].sort();

const nombres = SUITE.map(([n]) => n);

/** tests/<archivo> -> el test de SUITE cuyo comando lo ejecuta (o null si no es ninguno). */
const testDeArchivo = (ruta) => SUITE.find(([, cmd]) => cmd.split(/\s+/).includes(ruta))?.[0] ?? null;

/** Entrada del mapa que corresponde a `ruta`: el archivo exacto, o la carpeta más larga que la contiene. */
function buscar(ruta) {
  if (ruta in MAPA) return MAPA[ruta];
  const carpetas = Object.keys(MAPA).filter((k) => k.endsWith('/') && ruta.startsWith(k)).sort((a, b) => b.length - a.length);
  return carpetas.length ? MAPA[carpetas[0]] : undefined;
}

/** -> { tests: [nombres] | 'TODOS', motivo } para un archivo. null = no hace falta correr nada. */
function criterio(ruta) {
  const m = buscar(ruta);
  if (m === TODOS) return { tests: TODOS, motivo: 'compartido' };
  if (m) return m.length ? { tests: m, motivo: 'mapa' } : null;
  if (esSoloDocs(ruta)) return null;
  if (ruta.startsWith('tests/')) {
    const t = testDeArchivo(ruta);
    return t ? { tests: [t], motivo: 'su propio test' } : { tests: TODOS, motivo: 'archivo de tests/ sin test propio' };
  }
  if (ruta.startsWith('src/')) return { tests: TODOS, motivo: 'NO está en el mapa (tools/mapa-tests.mjs)' };
  return { tests: TODOS, motivo: ruta.startsWith('tools/') ? 'herramienta fuera del mapa' : 'archivo de configuración/raíz' };
}

if (!cambiados.length) { console.log('test:cambios: no hay nada cambiado (git diff HEAD y archivos nuevos vacíos). No corro nada.'); process.exit(0); }

console.log('Archivos cambiados (' + cambiados.length + '):');
const elegidos = new Set(); let todos = false; const motivosTodos = [];
for (const f of cambiados) {
  const c = criterio(f);
  if (!c) { console.log('  ' + f + '  ->  (sin tests: docs o sin test propio)'); continue; }
  if (c.tests === TODOS) { todos = true; motivosTodos.push(f + ' (' + c.motivo + ')'); console.log('  ' + f + '  ->  SUITE COMPLETA — ' + c.motivo); continue; }
  c.tests.forEach((t) => elegidos.add(t));
  console.log('  ' + f + '  ->  ' + c.tests.join(', '));
}

for (const t of elegidos) if (!nombres.includes(t)) { console.log('\n✘ El mapa nombra un test que no existe en SUITE: ' + t); process.exit(1); }

const lista = todos ? SUITE : SUITE.filter(([n]) => elegidos.has(n)); // SUITE ya va en orden, firefox al final
if (!lista.length) { console.log('\nSolo cambió documentación: no corro ningún test.'); process.exit(0); }
console.log('\n' + (todos
  ? 'Corro la SUITE COMPLETA por: ' + motivosTodos.join('; ')
  : 'Corro ' + lista.length + ' test(s): ' + lista.map(([n]) => n).join(', ')));
if (ver) { console.log('(--ver: no se ejecuta nada)'); process.exit(0); }

// Sin build si todos los elegidos son de Node puro (no leen dist/editor.html)
const PUROS = ['ronda7', 'controles', 'tema', 'plan-ia'];
correr(lista, { build: !lista.every(([n]) => PUROS.includes(n)) });
