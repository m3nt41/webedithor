// ELEMENTO "ICONO": UNA sola función genera el SVG para el editor, la Vista previa y el export
// (igual que fondoDeclaraciones en tree.js). Sin JS: es SVG inline.
// El nodo es un <span> (caja con width/height y color) y adentro va el <svg> al 100%.

import { ICONOS } from '../blocks/iconos-data.js';

export const ICONO_DEFECTO = 'star';
export const TAMANOS_ICONO = [20, 24, 32, 48, 64];
export const TAMANO_ICONO_DEFECTO = 32;

// Icono neutro (cuadrado de puntos) para cuando el name no existe: no rompe nada
const NEUTRO = '<rect width="18" height="18" x="3" y="3" rx="2" stroke-dasharray="3 3"/>';

/** ¿Existe este icono en la biblioteca? */
export const existeIcono = (name) => typeof name === 'string' && Object.hasOwn(ICONOS, name);

/** SVG inline de un icono. `tam` (px) opcional: sin él mide el 100% de su caja.
 *  aria-hidden por defecto (es decorativo). */
export function iconoSvg(name, tam = null) {
  const d = existeIcono(name) ? ICONOS[name].d : NEUTRO;
  const medida = tam ? `${tam}` : '100%';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${medida}" height="${medida}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${d}</svg>`;
}

/** Estilos mínimos de la caja del icono (por debajo de lo que tenga el nodo): así un icono sin
 *  width/height (JSON a mano) igual se ve de 32px. */
export function estilosIcono(st) {
  return { display: 'inline-flex', flex: 'none', width: `${TAMANO_ICONO_DEFECTO}px`, height: `${TAMANO_ICONO_DEFECTO}px`, ...st };
}
