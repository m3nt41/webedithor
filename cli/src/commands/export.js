// webedithor export <page.json> [-o salida.html]
// Genera el .html estático con el MISMO exportador del editor (botón "Exportar HTML").
import { mkdirSync, writeFileSync } from 'node:fs';
import { basename, dirname, extname, resolve } from 'node:path';
import { exportHTML } from '../lib/editor.js';
import { loadPage } from '../lib/page.js';
import { CliError } from '../lib/errors.js';
import { kb } from '../lib/fmt.js';

/** Exporta una página a un archivo y devuelve { ruta, bytes, removed }. Lo usa también `publish`. */
export function exportToFile(file, salida) {
  const { page, removed } = loadPage(file);
  const html = exportHTML(page);
  const ruta = resolve(salida);
  mkdirSync(dirname(ruta), { recursive: true });
  writeFileSync(ruta, html);
  return { ruta, bytes: Buffer.byteLength(html), removed };
}

export default {
  name: 'export',
  summary: 'Export a page JSON to a single static .html file',
  usage: 'export <page.json> [-o out.html]',
  options: { out: { type: 'string', short: 'o' } },
  help: `Options:
  -o, --out <file>   Output file (default: <page name>.html in the current folder)

The output is byte-for-byte what the editor's "Exportar HTML" button produces.
Only static HTML is supported: there is no React/framework export by design.`,
  run(values, [archivo]) {
    if (!archivo) throw new CliError('missing <page.json>. Usage: webedithor export <page.json> [-o out.html]', 2);
    const salida = values.out ?? basename(archivo, extname(archivo)) + '.html';
    const { ruta, bytes, removed } = exportToFile(archivo, salida);
    console.log(`Exported ${ruta} (${kb(bytes)})`);
    if (removed) console.log(`note: ${removed} unsafe or invalid value(s) were dropped while loading the page (same as the editor does).`);
    return 0;
  },
};
