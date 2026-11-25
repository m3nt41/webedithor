// webedithor create <carpeta> [--template minimal|landing]
// Crea una carpeta de proyecto con un page.json inicial (el mismo formato que "Guardar JSON" del editor).
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { TEMPLATES, buildTemplate } from '../templates.js';
import { CliError } from '../lib/errors.js';

const LEEME = (titulo) => `# ${titulo}

A WebEdiThor project. The page lives in \`page.json\`.

\`\`\`bash
webedithor dev                          # open the visual editor
                                        # then "Abrir JSON" -> page.json, edit, "Guardar JSON" over page.json
webedithor audit page.json              # accessibility, links, heavy assets, basic SEO
webedithor export page.json -o dist/index.html
webedithor publish page.json --to static   # prepares ./site, ready to upload to any static host
\`\`\`

The editor keeps your work in the browser, so remember to save the JSON back into this folder.
`;

export default {
  name: 'create',
  summary: 'Create a project folder from a template',
  usage: 'create <folder> [--template minimal|landing]',
  options: { template: { type: 'string', short: 't' }, list: { type: 'boolean' } },
  help: `Options:
  -t, --template <name>   Template to start from (default: landing)
      --list              List the available templates

Templates are built from the editor's own blocks, so they match what you see in the editor.
${Object.entries(TEMPLATES).map(([n, t]) => `  ${n.padEnd(9)}${t.summary}`).join('\n')}`,
  run(values, [carpeta]) {
    if (values.list) {
      for (const [n, t] of Object.entries(TEMPLATES)) console.log(`${n.padEnd(9)}${t.summary}`);
      return 0;
    }
    if (!carpeta) throw new CliError('missing <folder>. Usage: webedithor create <folder> [--template minimal|landing]', 2);
    const plantilla = values.template ?? 'landing';
    if (!TEMPLATES[plantilla]) throw new CliError(`unknown template "${plantilla}". Available: ${Object.keys(TEMPLATES).join(', ')}`, 2);

    const destino = resolve(carpeta);
    if (existsSync(destino) && readdirSync(destino).length) throw new CliError(`"${carpeta}" already exists and is not empty. Nothing was written.`);
    mkdirSync(destino, { recursive: true });

    const titulo = basename(destino).replace(/[-_]+/g, ' ').replace(/^./, (c) => c.toUpperCase());
    writeFileSync(join(destino, 'page.json'), JSON.stringify(buildTemplate(plantilla, titulo), null, 2) + '\n');
    writeFileSync(join(destino, 'README.md'), LEEME(titulo));
    writeFileSync(join(destino, '.gitignore'), 'dist/\nsite/\n');

    console.log(`Created ${destino} from the "${plantilla}" template:\n  page.json  README.md  .gitignore\n\nNext:\n  cd ${carpeta}\n  webedithor dev`);
    return 0;
  },
};
