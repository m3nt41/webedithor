// COPIAR / PEGAR EFECTOS entre nodos. Lógica pura (sin DOM, sin store): la usan store.js y los tests.
//
// Se copia SOLO node.animation (hover, press, appear, estados...). Nada de estilos, texto, contenido ni ids de nodo.
// Al pegar se clona (structuredClone) y se filtra según el nodo destino, para no dejar nunca un estado roto:
//   - grupos que no existen para ese tipo de nodo (p. ej. "Foco" fuera de un botón)  -> se omiten
//   - "Paso de escena" si el padre del destino no es una escena                       -> se omite
//   - Hover Subrayado / Fondo suave / Relleno en una imagen (no admite ::before)       -> se omite el hover
//   - Hover Relleno en texto o botón sin caja (no hay fondo que rellenar)              -> se omite el hover
//   - estados (variants) con disparo "foco" en algo que no es botón                    -> se omite ese estado

import { GRUPOS_ANIM } from './index.js';
import { normalizarAnimacion } from './normalizar.js';
import { sinCaja, esTexto } from './base.js';

const EFECTOS_CON_PSEUDO = ['underline', 'soft', 'fill', 'bgrow'];

/** Copia profunda de la animación del nodo, o null si no tiene ninguna. */
export function copiarAnimacion(nodo) {
  const a = nodo?.animation;
  if (!a || !Object.keys(a).length) return null;
  return structuredClone(a);
}

/** Nombre corto de un grupo para los avisos ("Hover (Subrayado)"). */
function etiqueta(g, datos) {
  const campo = g.campos?.find((f) => f.key === g.principal);
  const op = campo?.options?.find(([v]) => v === datos?.[g.principal]);
  return op ? `${g.titulo} (${op[1].replace(/ \(sugerido\)$/, '')})` : g.titulo;
}

/** ¿Por qué el hover de `datos` no vale en `nodo`? Devuelve el motivo o null si vale. */
function motivoHover(datos, nodo) {
  if (EFECTOS_CON_PSEUDO.includes(datos?.effect) && nodo.type === 'image') return 'las imágenes no admiten pseudo-elementos';
  if (datos?.effect === 'fill' && esTexto(nodo) && sinCaja(nodo)) return 'sin caja (fondo) no hay nada que rellenar';
  return null;
}

/** Aplica la animación copiada a un nodo destino. `padre` = el padre del destino en la página.
 *  Devuelve { anim, omitidos }: anim = lo que se puede poner (objeto, o null si no queda nada) y omitidos = lista de textos. */
export function efectosParaNodo(copiada, nodo, padre) {
  const omitidos = [];
  if (!copiada) return { anim: null, omitidos };
  const entrada = structuredClone(copiada);

  // 1) Grupos que este tipo de nodo no admite (o que no están disponibles aquí)
  for (const g of GRUPOS_ANIM) {
    if (!(g.id in entrada)) continue;
    const datos = entrada[g.id];
    const tipoOk = g.tipos.includes(nodo.type);
    const escenaOk = !g.soloEnEscena || Boolean(padre?.animation?.scene?.steps);
    if (!tipoOk || !escenaOk) { omitidos.push(etiqueta(g, datos)); delete entrada[g.id]; continue; }
    if (g.id === 'hover') {
      const motivo = motivoHover(datos, nodo);
      if (motivo) { omitidos.push(`${etiqueta(g, datos)}: ${motivo}`); delete entrada.hover; }
    }
    if (g.id === 'variants' && nodo.type !== 'button') {
      const buenos = datos.filter((s) => s.trigger !== 'focus');
      if (buenos.length !== datos.length) omitidos.push('Estados con disparo "foco" (solo botones)');
      if (buenos.length) entrada.variants = buenos; else delete entrada.variants;
    }
  }

  // 2) Validación final con la misma función que usa al abrir un .json (nunca deja campos raros)
  return { anim: normalizarAnimacion(entrada, nodo.type), omitidos };
}
