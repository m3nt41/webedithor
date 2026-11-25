// Router de la CLI: elige el comando, parsea sus opciones (node:util, sin dependencias) y maneja los errores.
// Cada comando es un módulo en ./commands con esta forma:
//   { name, summary, usage, options, run(values, positionals) -> código de salida }
import { parseArgs } from 'node:util';
import { readFileSync } from 'node:fs';
import { CliError } from './lib/errors.js';
import create from './commands/create.js';
import dev from './commands/dev.js';
import audit from './commands/audit.js';
import exportCmd from './commands/export.js';
import publish from './commands/publish.js';

const COMMANDS = [create, dev, audit, exportCmd, publish];
const version = () => JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

function helpGeneral() {
  const filas = COMMANDS.map((c) => `  ${c.name.padEnd(9)}${c.summary}`).join('\n');
  return `WebEdiThor CLI v${version()} — companion for the WebEdiThor visual editor

Usage: webedithor <command> [options]

Commands:
${filas}

Options:
  -h, --help       Show help (also: webedithor <command> --help)
  -v, --version    Show the version

The CLI complements the visual editor, it does not replace it: you design in the
editor (webedithor dev) and use the CLI to check, export and prepare the result.
`;
}

function helpComando(c) {
  return `webedithor ${c.usage}\n\n${c.summary}\n\n${c.help ?? ''}`.trimEnd() + '\n';
}

/** Ejecuta la CLI con los argumentos dados y devuelve el código de salida (0 ok, 1 fallo, 2 uso incorrecto). */
export async function main(argv) {
  const [nombre, ...resto] = argv;
  if (!nombre || nombre === 'help' || nombre === '-h' || nombre === '--help') {
    const c = COMMANDS.find((x) => x.name === resto[0]);
    console.log(c ? helpComando(c) : helpGeneral());
    return 0;
  }
  if (nombre === '-v' || nombre === '--version') { console.log(version()); return 0; }

  const cmd = COMMANDS.find((c) => c.name === nombre);
  if (!cmd) {
    console.error(`error: unknown command "${nombre}"\n\n${helpGeneral()}`);
    return 2;
  }

  try {
    const { values, positionals } = parseArgs({
      args: resto,
      allowPositionals: true,
      options: { help: { type: 'boolean', short: 'h' }, ...cmd.options },
    });
    if (values.help) { console.log(helpComando(cmd)); return 0; }
    return (await cmd.run(values, positionals)) ?? 0;
  } catch (e) {
    if (e instanceof CliError) { console.error(`error: ${e.message}`); return e.code; }
    if (e?.code?.startsWith?.('ERR_PARSE_ARGS')) { console.error(`error: ${e.message}\n\nTry: webedithor ${cmd.usage}  (--help for details)`); return 2; }
    throw e; // un bug de verdad: que se vea la traza
  }
}
