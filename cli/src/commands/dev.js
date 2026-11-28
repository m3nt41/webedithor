// webedithor dev [--port 5180] [--open]
// Sirve el editor compilado (dist/editor.html) en http://127.0.0.1:<puerto>. Solo sirve ese archivo.
// OJO: el editor guarda en el navegador (localStorage) y no puede escribir en tu carpeta: usa "Guardar JSON".
import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { CliError } from '../lib/errors.js';

// Dónde buscar el editor compilado, por orden:
//  1. WEBEDITHOR_EDITOR (para pruebas o para usar otro build)
//  2. editor.html junto al bundle: así viaja en el paquete de npm (dist/cli.js + dist/editor.html)
//  3. dist/editor.html en la raíz del repo, al correr desde un clon (cli/src/commands -> raíz)
// Las rutas van en variables para que el empaquetador no las trate como recursos.
const JUNTO_AL_BUNDLE = './editor.html';
const RAIZ_DEL_REPO = '../../../';
function editorPath() {
  if (process.env.WEBEDITHOR_EDITOR) return resolve(process.env.WEBEDITHOR_EDITOR);
  const candidatos = [
    fileURLToPath(new URL(JUNTO_AL_BUNDLE, import.meta.url)),
    resolve(fileURLToPath(new URL(RAIZ_DEL_REPO, import.meta.url)), 'dist', 'editor.html'),
  ];
  return candidatos.find((c) => existsSync(c)) ?? candidatos[1];
}

function abrirNavegador(url) {
  const [cmd, args] = process.platform === 'win32' ? ['cmd', ['/c', 'start', '', url]] : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]];
  spawn(cmd, args, { stdio: 'ignore', detached: true }).on('error', () => {}).unref();
}

export default {
  name: 'dev',
  summary: 'Serve the visual editor locally',
  usage: 'dev [--port 5180] [--open]',
  options: { port: { type: 'string', short: 'p' }, open: { type: 'boolean' } },
  help: `Options:
  -p, --port <n>   Port (default: 5180)
      --open       Open the editor in your default browser

Serves the compiled editor (dist/editor.html, built with "npm run build" in the repository).
The editor stores your page in the browser; use "Save JSON" / "Open JSON" to move it to and from your project folder.`,
  run(values) {
    const puerto = Number(values.port ?? 5180);
    if (!Number.isInteger(puerto) || puerto < 1 || puerto > 65535) throw new CliError(`invalid port "${values.port}"`, 2);
    const archivo = editorPath();
    if (!existsSync(archivo)) throw new CliError(`the compiled editor was not found at ${archivo}.\nBuild it first from the repository root:  npm run build`);

    const servidor = createServer((req, res) => {
      const ruta = (req.url ?? '/').split('?')[0];
      if (req.method !== 'GET' || (ruta !== '/' && ruta !== '/editor.html')) { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found'); return; }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(readFileSync(archivo)); // se relee: un build nuevo se ve al recargar
    });

    return new Promise((fin) => {
      servidor.once('error', (e) => {
        fin(e.code === 'EADDRINUSE'
          ? (console.error(`error: port ${puerto} is already in use. Try: webedithor dev --port ${puerto + 1}`), 1)
          : (console.error(`error: ${e.message}`), 1));
      });
      servidor.listen(puerto, '127.0.0.1', () => {
        const url = `http://127.0.0.1:${puerto}`;
        console.log(`Editor running at ${url}  (Ctrl+C to stop)`);
        console.log('Reminder: your page lives in the browser. Use "Save JSON" to save it into your project folder.');
        if (values.open) abrirNavegador(url);
      });
      process.once('SIGINT', () => { servidor.close(); fin(0); });
      process.once('SIGTERM', () => { servidor.close(); fin(0); });
    });
  },
};
