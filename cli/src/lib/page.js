// Leer una página desde un .json (el que guarda el editor con "Guardar JSON").
import { readFileSync } from 'node:fs';
import { normalizePage } from './editor.js';
import { CliError } from './errors.js';

/** Lee y valida un .json de página. Acepta el formato con envoltorio { app, version, page } o la página sola,
 *  igual que "Abrir JSON" del editor. normalizePage es el mismo validador de seguridad que usa el editor. */
export function loadPage(file) {
  let texto;
  try { texto = readFileSync(file, 'utf8'); } catch (e) { throw new CliError(`cannot read "${file}": ${e.code === 'ENOENT' ? 'file not found' : e.message}`); }
  let raw;
  try { raw = JSON.parse(texto); } catch (e) { throw new CliError(`"${file}" is not valid JSON: ${e.message}`); }
  const informe = {};
  try {
    const page = normalizePage(raw?.page ?? raw, informe);
    return { page, removed: informe.quitados ?? 0 };
  } catch (e) {
    throw new CliError(`"${file}" is not a valid WebEdiThor page: ${e.message}`);
  }
}
