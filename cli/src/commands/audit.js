// webedithor audit <page.json> [--json] [--strict] [--check-external]
// Revisa accesibilidad, enlaces, recursos pesados y SEO básico de una página.
import { exportHTML } from '../lib/editor.js';
import { loadPage } from '../lib/page.js';
import { CliError } from '../lib/errors.js';
import { rojo, amarillo, gris, negrita, verde } from '../lib/fmt.js';
import { checkAccesibilidad, checkEnlaces, checkRecursos, checkSeo } from '../audit/checks.js';
import { checkExternos } from '../audit/externos.js';

const ORDEN = { error: 0, warn: 1, info: 2 };
const ETIQUETA = { error: () => rojo('ERROR'), warn: () => amarillo('WARN '), info: () => gris('info ') };

/** Ejecuta todas las comprobaciones y devuelve { findings, summary }. Función pura (salvo --check-external). */
export async function auditPage(page, { checkExternal = false } = {}) {
  const html = exportHTML(page);
  const enlaces = checkEnlaces(page);
  const recursos = checkRecursos(page, html);
  const findings = [...checkAccesibilidad(page), ...enlaces.hallazgos, ...recursos.hallazgos, ...checkSeo(html)];
  let externas = 0;
  if (checkExternal) {
    const r = await checkExternos(enlaces.externos, recursos.imagenesExternas);
    findings.push(...r.hallazgos);
    externas = r.comprobadas;
  }
  findings.sort((a, b) => ORDEN[a.level] - ORDEN[b.level]);
  const cuenta = (l) => findings.filter((f) => f.level === l).length;
  return { findings, summary: { errors: cuenta('error'), warnings: cuenta('warn'), info: cuenta('info'), externalChecked: externas } };
}

export default {
  name: 'audit',
  summary: 'Check accessibility, links, heavy assets and basic SEO',
  usage: 'audit <page.json> [--json] [--strict] [--check-external]',
  options: {
    json: { type: 'boolean' },
    strict: { type: 'boolean' },
    'check-external': { type: 'boolean' },
  },
  help: `Options:
  --json             Print the result as JSON (for CI and scripts)
  --strict           Treat warnings as failures (exit code 1)
  --check-external   Also request the external links and images found in the page
                     (the only option that uses the network; it only contacts those URLs)

Exit code: 0 = no errors, 1 = errors found (or warnings with --strict), 2 = bad usage.

Notes: it audits the page JSON (the source of truth) plus the HTML the editor would export.
Contrast is approximate: only plain hex / rgb() colors are compared, gradients and images are skipped.`,
  async run(values, [archivo]) {
    if (!archivo) throw new CliError('missing <page.json>. Usage: webedithor audit <page.json>', 2);
    const { page, removed } = loadPage(archivo);
    if (values['check-external'] && !values.json) console.error('Checking external URLs...');
    const { findings, summary } = await auditPage(page, { checkExternal: values['check-external'] });
    const fallo = summary.errors > 0 || (values.strict && summary.warnings > 0);

    if (values.json) {
      console.log(JSON.stringify({ file: archivo, summary, findings }, null, 2));
      return fallo ? 1 : 0;
    }
    console.log(negrita(`WebEdiThor audit — ${archivo}`));
    if (removed) console.log(gris(`(${removed} unsafe or invalid value(s) were dropped while loading, as the editor does)`));
    if (!findings.length) console.log(verde('\nNothing to report.'));
    for (const f of findings) console.log(`  ${ETIQUETA[f.level]()}  ${gris(`[${f.area}/${f.rule}]`)} ${f.message}`);
    const partes = [`${summary.errors} error(s)`, `${summary.warnings} warning(s)`, `${summary.info} note(s)`];
    console.log(`\n${partes.join(', ')}${summary.externalChecked ? `, ${summary.externalChecked} external URL(s) checked` : ''}`);
    return fallo ? 1 : 0;
  },
};
