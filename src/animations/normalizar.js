// VALIDACIÓN de node.animation al abrir un .json o restaurar de localStorage (la usa normalizePage).
// Objetivo: que una animación mal formada NO rompa el inspector, el preview ni el exportador,
// y que ningún texto del JSON pueda colarse como CSS en el .html exportado.
//
// Reglas (sin inventar valores: lo que falta se queda faltando; el código ya usa sus por defecto):
//   - animation debe ser un objeto; si no, null. Grupos desconocidos o que no corresponden al tipo
//     del nodo (p. ej. "enfocar" en un título) se descartan.
//   - Cada grupo: objeto con su campo principal válido (si no, se descarta el grupo entero).
//     select -> debe ser una opción conocida; num -> número finito (respeta `min` y `max`); color -> texto limpio.
//     Lo inválido se borra del grupo. Campos que no existen en el grupo se descartan.
//   - variants: lista de estados. Se saltan entradas que no son objetos; cada estado recibe
//     id único, nombre ("Estado N") y disparo válido si faltan; props y tiempos se limpian igual.

import { GRUPOS_ANIM } from './index.js';
import { DISPAROS_VARIANT, CAMPOS_PROPS, CAMPOS_TIEMPO, limpio } from './variants.js';
import { newId } from '../core/tree.js';
import { valorCss, quitar } from '../core/seguridad.js';

const esObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Número finito (acepta "12" escrito como texto) o undefined. Respeta f.min si existe. */
function numero(v, f) {
  if (v === '' || v == null || typeof v === 'boolean') return undefined;
  const n = +v;
  if (!Number.isFinite(n)) return undefined;
  const conMin = f?.min != null ? Math.max(f.min, n) : n;
  return f?.max != null ? Math.min(f.max, conMin) : conMin;
}

/** Valida un valor según el campo (select/num/color/text). Devuelve el valor limpio o undefined. */
function valor(v, f) {
  if (f.kind === 'select') {
    const s = String(v ?? '');
    return f.options.some(([o]) => o === s) ? s : undefined;
  }
  if (f.kind === 'color' || f.kind === 'text') { // va al CSS: además de limpio(), nada peligroso (core/seguridad.js)
    const l = typeof v === 'string' ? limpio(v) : '';
    if (!l) return undefined;
    if (valorCss(l) === null) { quitar(); return undefined; }
    return l;
  }
  return numero(v, f);
}

/** Copia solo los campos conocidos y válidos. */
function limpiarCampos(raw, campos) {
  const out = {};
  for (const f of campos) {
    if (!(f.key in raw)) continue;
    const v = valor(raw[f.key], f);
    if (v !== undefined) out[f.key] = v;
  }
  return out;
}

function normalizarEstados(lista, tipoNodo) {
  if (!Array.isArray(lista)) return [];
  const disparos = DISPAROS_VARIANT.map(([v]) => v);
  const usados = new Set();
  const out = [];
  lista.forEach((raw) => {
    if (!esObj(raw)) return;
    let id = typeof raw.id === 'string' && raw.id.trim() ? raw.id.trim() : '';
    if (!id || usados.has(id)) id = `s${newId()}`;
    usados.add(id);
    let trigger = disparos.includes(raw.trigger) ? raw.trigger : 'hover';
    if (trigger === 'focus' && tipoNodo !== 'button') trigger = 'hover'; // solo los botones reciben foco
    out.push({
      id,
      name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : `Estado ${out.length + 1}`,
      trigger,
      ...limpiarCampos(raw, CAMPOS_TIEMPO),
      props: esObj(raw.props) ? limpiarCampos(raw.props, CAMPOS_PROPS) : {},
    });
  });
  return out;
}

/** Devuelve la animación validada (o null si no queda nada). Nunca lanza. */
export function normalizarAnimacion(anim, tipoNodo) {
  if (!esObj(anim)) return null;
  const out = {};
  for (const g of GRUPOS_ANIM) {
    if (!g.tipos.includes(tipoNodo)) continue;
    const raw = anim[g.id];
    if (g.propio) { // variants
      const lista = normalizarEstados(raw, tipoNodo);
      if (lista.length) out[g.id] = lista;
      continue;
    }
    if (!esObj(raw)) continue;
    const campoPrincipal = g.campos.find((f) => f.key === g.principal);
    if (!campoPrincipal || valor(raw[g.principal], campoPrincipal) === undefined || raw[g.principal] === '') continue;
    out[g.id] = limpiarCampos(raw, g.campos);
    // campos nuevos con `relleno`: un .json guardado antes de que existieran se comporta como antes (ej. Transición = 50)
    for (const f of g.campos) if (f.relleno != null && out[g.id][f.key] === undefined) out[g.id][f.key] = f.relleno;
  }
  return Object.keys(out).length ? out : null;
}
