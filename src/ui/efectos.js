// COPIAR / PEGAR EFECTOS: acciones con aviso (toast). Las usan los botones del inspector y los atajos Ctrl+Alt+C / Ctrl+Alt+V.
// La lógica vive en store.js (copiarEfectos, pegarEfectos) y animations/copiar.js.

import { t } from '../i18n/index.js';
import { copiarEfectos, pegarEfectos, hermanosMismoTipo } from '../core/store.js';
import { toast } from './plania.js';

export function accionCopiarEfectos(id) {
  const n = copiarEfectos(id);
  if (!n) toast(t('efectos.nada'), true);
  else toast(t(n === 1 ? 'efectos.copiadoUno' : 'efectos.copiados', { n }));
}

/** Pega en `ids`. Mensaje corto: cuántos recibieron efectos y qué se omitió. */
export function accionPegarEfectos(ids) {
  const r = pegarEfectos(ids);
  if (r.sinPortapapeles) return toast(t('efectos.vacio'), true);
  const omitidos = r.omitidos.flatMap((o) => o.motivos);
  const unicos = [...new Set(omitidos)];
  if (!r.pegados) return toast(unicos.length ? t('efectos.nadaPegado', { motivos: unicos.join('; ') }) : t('efectos.sinDestino'), true);
  const base = t(r.pegados === 1 ? 'efectos.pegadoUno' : 'efectos.pegados', { n: r.pegados });
  toast(unicos.length ? `${base}. ${t('efectos.omitido', { motivos: unicos.join('; ') })}` : `${base}.`);
}

export function accionPegarEnHermanos(id) {
  const ids = hermanosMismoTipo(id);
  if (ids.length < 2) return toast(t('efectos.sinHermanos'), true);
  accionPegarEfectos(ids);
}
