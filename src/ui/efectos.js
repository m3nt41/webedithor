// COPIAR / PEGAR EFECTOS: acciones con aviso (toast). Las usan los botones del inspector y los atajos Ctrl+Alt+C / Ctrl+Alt+V.
// La lógica vive en store.js (copiarEfectos, pegarEfectos) y animations/copiar.js.

import { copiarEfectos, pegarEfectos, hermanosMismoTipo } from '../core/store.js';
import { toast } from './plania.js';

export function accionCopiarEfectos(id) {
  const n = copiarEfectos(id);
  if (!n) toast('Este elemento no tiene efectos que copiar.', true);
  else toast(`Efectos copiados (${n} ${n === 1 ? 'grupo' : 'grupos'}).`);
}

/** Pega en `ids`. Mensaje corto: cuántos recibieron efectos y qué se omitió. */
export function accionPegarEfectos(ids) {
  const r = pegarEfectos(ids);
  if (r.sinPortapapeles) return toast('No hay efectos copiados. Copia primero (Ctrl+Alt+C).', true);
  const omitidos = r.omitidos.flatMap((o) => o.motivos);
  const unicos = [...new Set(omitidos)];
  if (!r.pegados) return toast(unicos.length ? `No se pegó nada. Omitido: ${unicos.join('; ')}.` : 'No hay otros elementos donde pegar.', true);
  const base = `Efectos pegados en ${r.pegados} ${r.pegados === 1 ? 'elemento' : 'elementos'}`;
  toast(unicos.length ? `${base}. Omitido: ${unicos.join('; ')}.` : `${base}.`);
}

export function accionPegarEnHermanos(id) {
  const ids = hermanosMismoTipo(id);
  if (ids.length < 2) return toast('Este elemento no tiene hermanos del mismo tipo.', true);
  accionPegarEfectos(ids);
}
