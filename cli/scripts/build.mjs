// Construye lo que se publica en npm:  cd cli && npm run build
//   1. compila el editor (npm run build en la raíz) -> dist/editor.html
//   2. empaqueta la CLI en UN archivo (cli/dist/cli.js) con el código del editor que usa (exportador, validador, bloques) metido dentro
//   3. copia el editor compilado y la licencia junto al bundle
// Sin dependencias nuevas: usa Vite, que ya es dependencia de desarrollo del repo.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { build } from 'vite';

const CLI = resolve(fileURLToPath(new URL('..', import.meta.url)));
const RAIZ = resolve(CLI, '..');

// 1) el editor compilado (un solo .html)
const r = spawnSync('npm run build', { cwd: RAIZ, stdio: 'inherit', shell: true }); // una sola cadena: en Windows npm es un .cmd
if (r.status !== 0) { console.error('Falló "npm run build" del editor.'); process.exit(1); }
const editor = resolve(RAIZ, 'dist', 'editor.html');
if (!existsSync(editor)) { console.error('No existe dist/editor.html tras compilar.'); process.exit(1); }

// 2) el bundle de la CLI (para Node; todo adentro menos los módulos incorporados de Node)
await build({
  configFile: false,
  root: CLI,
  logLevel: 'warn',
  build: {
    ssr: 'src/cli.js',
    outDir: 'dist',
    emptyOutDir: true,
    target: 'node20',
    minify: false, // legible: es código abierto y así se puede revisar lo que se publica
    rollupOptions: { output: { format: 'es', entryFileNames: 'cli.js' } },
  },
  ssr: { noExternal: true },
});

// 3) el editor y la licencia junto al bundle
copyFileSync(editor, resolve(CLI, 'dist', 'editor.html'));
copyFileSync(resolve(RAIZ, 'LICENSE'), resolve(CLI, 'LICENSE'));
const kb = (f) => Math.round(statSync(f).size / 1024) + ' KB';
console.log(`\nListo: dist/cli.js (${kb(resolve(CLI, 'dist/cli.js'))}) y dist/editor.html (${kb(resolve(CLI, 'dist/editor.html'))})`);
