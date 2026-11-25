// webedithor publish <page.json> [--to static] [--out site]
// Exporta la página y deja una carpeta lista para subir. NO sube nada (sin red, sin tokens): ver adapters/index.js.
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { exportHTML } from '../lib/editor.js';
import { loadPage } from '../lib/page.js';
import { CliError } from '../lib/errors.js';
import { ADAPTERS } from '../adapters/index.js';

export default {
  name: 'publish',
  summary: 'Prepare a folder ready to deploy (does not upload anything)',
  usage: 'publish <page.json> [--to static] [--out site]',
  options: { to: { type: 'string' }, out: { type: 'string', short: 'o' }, list: { type: 'boolean' } },
  help: `Options:
      --to <target>   Where you plan to host it (default: static)
  -o, --out <dir>     Output folder (default: site)
      --list          List the available targets

This command only prepares files. It makes no network calls and needs no account or token.
Targets are adapters (cli/src/adapters/index.js); more hosts can be added there.
${Object.entries(ADAPTERS).map(([n, a]) => `  ${n.padEnd(14)}${a.summary}`).join('\n')}`,
  run(values, [archivo]) {
    if (values.list) {
      for (const [n, a] of Object.entries(ADAPTERS)) console.log(`${n.padEnd(14)}${a.summary}`);
      return 0;
    }
    if (!archivo) throw new CliError('missing <page.json>. Usage: webedithor publish <page.json> [--to static] [--out site]', 2);
    const destino = values.to ?? 'static';
    const adaptador = ADAPTERS[destino];
    if (!adaptador) throw new CliError(`unknown target "${destino}". Available: ${Object.keys(ADAPTERS).join(', ')}`, 2);

    const { page } = loadPage(archivo);
    const outDir = resolve(values.out ?? 'site');
    mkdirSync(outDir, { recursive: true });
    const { files, next } = adaptador.prepare({ html: exportHTML(page), outDir });
    console.log(`Prepared ${outDir} for "${destino}":\n  ${files.join('\n  ')}\n\nNext:\n${next.map((s) => `  - ${s}`).join('\n')}`);
    console.log('\nTip: run "webedithor audit" first.');
    return 0;
  },
};
